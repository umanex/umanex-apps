/**
 * Invarianten op de KBO-leeslaag.
 *
 * De faalmodus die deze suite bewaakt is stil: een CSV-parser die een komma of een quote
 * verkeerd leest, gooit niets — hij schuift de kolommen op en levert een rij die er goed
 * uitziet. Gemeten in één dagdelta: 6 270 velden met een komma binnen quotes en 33 velden
 * met een geëscapete quote. Eén verkeerde aanname daar zet een NACE-code in het
 * classificatieveld en niemand ziet het.
 *
 * De scherpste check hier is `chunkgroottes`: dezelfde invoer in stukjes van 1 tot 7 bytes
 * moet exact dezelfde rijen opleveren. De parser is een toestandsmachine over brokken, en
 * een quote die precies op een brokgrens valt is de klassieke breuk — met een 313 MB
 * bestand ligt elke grens ergens.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/kbo-scenarios.ts
 */
import { existsSync, readdirSync, createReadStream } from 'node:fs'
import { join } from 'node:path'
import { csvRijen, csvObjecten, kboDatum, kboNummer } from '../lib/kbo/csv'

let geslaagd = 0
let gezakt = 0
const notities: string[] = []

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

function notitie(tekst: string): void {
  notities.push(tekst)
}

/** Levert een string als async-iterable in brokken van n tekens. */
async function* inBrokken(tekst: string, n: number): AsyncGenerator<string> {
  for (let i = 0; i < tekst.length; i += n) yield tekst.slice(i, i + n)
}

async function rijen(tekst: string, brokgrootte = 1024): Promise<string[][]> {
  const uit: string[][] = []
  for await (const r of csvRijen(inBrokken(tekst, brokgrootte))) uit.push(r)
  return uit
}

const gelijk = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

// ── 1. De grammatica ─────────────────────────────────────────────────────────
{
  check('kale velden', gelijk(await rijen('a,b\n1,2\n'), [['a', 'b'], ['1', '2']]))

  check(
    'komma binnen quotes blijft één veld',
    gelijk(await rijen('"x","y,z"\n'), [['x', 'y,z']]),
    JSON.stringify(await rijen('"x","y,z"\n'))
  )

  check('"" is één letterlijke quote', gelijk(await rijen('"a""b"\n'), [['a"b']]))

  check('lege velden tellen mee', gelijk(await rijen('a,,c\n'), [['a', '', 'c']]))

  check('leeg gequoot veld', gelijk(await rijen('"",""\n'), [['', '']]))

  check('CRLF', gelijk(await rijen('a,b\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]))

  check(
    'newline binnen quotes breekt de rij niet',
    gelijk(await rijen('"regel1\nregel2",x\n'), [['regel1\nregel2', 'x']])
  )

  check('laatste rij zonder newline', gelijk(await rijen('a,b\n1,2'), [['a', 'b'], ['1', '2']]))

  check('lege regels aan het eind leveren geen rij', gelijk(await rijen('a\n\n'), [['a']]))

  // Precies de vorm die KBO gebruikt: gequote tekst naast een kale datum.
  check(
    'gemengde quoting zoals in enterprise_insert',
    gelijk(await rijen('"0417.238.867","AC","050","2","014",,29-01-1977\n'), [
      ['0417.238.867', 'AC', '050', '2', '014', '', '29-01-1977'],
    ])
  )
}

// ── 2. Brokgrenzen ───────────────────────────────────────────────────────────
// Dit is de tegenproef op de toestandsmachine zelf: het resultaat mag niet afhangen van
// wáár de stream toevallig geknipt wordt.
{
  const lastig = '"Category","Code"\n"Nace2008","Handel, groot- en kleinhandel"\n"x","a""b"\n"y","regel\nover twee"\n'
  const referentie = await rijen(lastig, 4096)
  let allemaalGelijk = true
  for (let n = 1; n <= 7; n++) {
    if (!gelijk(await rijen(lastig, n), referentie)) {
      allemaalGelijk = false
      check(`brokgrootte ${n} geeft hetzelfde resultaat`, false, JSON.stringify(await rijen(lastig, n)))
    }
  }
  check('chunkgroottes 1..7 leveren identieke rijen', allemaalGelijk)
  check('referentie heeft de verwachte 4 rijen', referentie.length === 4, `${referentie.length}`)
}

// ── 3. Objecten en de kolomtelling als harde grens ───────────────────────────
{
  const uit: Record<string, string>[] = []
  for await (const o of csvObjecten(inBrokken('a,b\n1,2\n3,4\n', 3), 'test')) uit.push(o)
  check('csvObjecten mapt op de kopregel', gelijk(uit, [{ a: '1', b: '2' }, { a: '3', b: '4' }]))

  let gegooid = false
  try {
    for await (const _ of csvObjecten(inBrokken('a,b\n1,2,3\n', 3), 'test')) void _
  } catch {
    gegooid = true
  }
  check('een rij met te veel velden gooit', gegooid)

  let gegooid2 = false
  try {
    for await (const _ of csvObjecten(inBrokken('a,b\n1\n', 3), 'test')) void _
  } catch {
    gegooid2 = true
  }
  check('een rij met te weinig velden gooit', gegooid2)
}

// ── 4. Datums en nummers ─────────────────────────────────────────────────────
{
  check('DD-MM-YYYY wordt ISO', kboDatum('29-01-1977') === '1977-01-29')
  check('leeg is null, geen fout', kboDatum('') === null)
  check('spaties tellen als leeg', kboDatum('   ') === null)

  for (const slecht of ['1977-01-29', '29/01/1977', '9-1-1977', 'gisteren']) {
    let gooit = false
    try {
      kboDatum(slecht)
    } catch {
      gooit = true
    }
    check(`"${slecht}" wordt geweigerd i.p.v. stil null`, gooit)
  }

  check('ondernemingsnummer zonder punten', kboNummer('0417.238.867') === '0417238867')
  check('nummer zonder punten blijft gelijk', kboNummer('0417238867') === '0417238867')
}

// ── 5. Tegen de échte extract, als die lokaal staat ──────────────────────────
// `.data/` is gitignored, dus in CI bestaat deze map niet. Dan slaat dit blok over — mét
// een notitie, want een overgeslagen meting die er groen uitziet is erger dan geen meting.
{
  const map = join(process.cwd(), '.data/kbo/update')
  if (!existsSync(map)) {
    notitie(`echte-extract-controle overgeslagen: ${map} bestaat niet (verwacht in CI)`)
  } else {
    const bestanden = readdirSync(map).filter((b) => b.endsWith('.csv'))
    check('er staan CSV-bestanden in de uitgepakte delta', bestanden.length > 0, `${bestanden.length}`)

    for (const naam of bestanden) {
      const pad = join(map, naam)
      let kop: string[] | null = null
      let rijenGeteld = 0
      let scheef = 0
      for await (const rij of csvRijen(createReadStream(pad))) {
        if (kop === null) {
          kop = rij
          continue
        }
        rijenGeteld++
        if (rij.length !== kop.length) scheef++
      }
      check(`${naam}: elke rij heeft ${kop?.length ?? 0} velden`, scheef === 0, `${scheef} scheve rijen`)
      check(`${naam}: minstens één datarij gelezen`, rijenGeteld > 0 || naam.includes('_delete'), `${rijenGeteld}`)
    }
  }
}

// ── Zelftest ─────────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('ZELFTEST: deze check hoort te falen', false, 'ingespoten door SCENARIO_SELFTEST=1')
}

for (const n of notities) console.log(`  • ${n}`)
console.log(`${geslaagd}/${geslaagd + gezakt} checks geslaagd`)
process.exit(gezakt ? 1 : 0)
