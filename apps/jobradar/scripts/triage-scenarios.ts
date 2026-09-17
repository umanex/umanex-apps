/**
 * Invarianten op de filterstand van het dashboard (`lib/triage.ts`).
 *
 * Over de hele filterruimte, niet een paar voorbeelden: elke combinatie van status, regio's en
 * score, met en zonder tab en zoekterm. De rondreis door de URL is wat de gebruiker merkt — een
 * stand die bij herladen niet terugkomt, stel je elke ochtend opnieuw in.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/triage-scenarios.ts
 */
import {
  ALLE_REGIOS,
  LAGE_SCORE_GRENS,
  STANDAARD,
  leesStand,
  pastBijStatus,
  schrijfStand,
  splitsOpScore,
  type StatusFilter,
  type Tab,
  type TriageStand,
} from '../lib/triage'
import type { RegionCode } from '../lib/regions'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

const gelijk = (a: TriageStand, b: TriageStand) => JSON.stringify(a) === JSON.stringify(b)

// ── 1. Rondreis over de hele filterruimte ────────────────────────────────────
{
  const statussen: StatusFilter[] = ['open', 'alle', 'new', 'saved', 'dismissed', 'contacted']
  const tabs: Tab[] = ['jobs', 'leads', 'prospects']
  const zoektermen = ['', 'Acme Software', 'a&b=c?d', ' spatie ', 'Vandenbroucke/Ürün']
  const regioSets: RegionCode[][] = []
  for (let m = 0; m < 1 << ALLE_REGIOS.length; m++) regioSets.push(ALLE_REGIOS.filter((_, i) => m & (1 << i)))
  let n = 0
  for (const status of statussen)
    for (const regios of regioSets)
      for (let minScore = 0; minScore <= 100; minScore += 5)
        for (const tab of tabs)
          for (const zoek of zoektermen)
           for (const via of ['', 'bedrijf'] as const) {
            const stand: TriageStand = { status, regios, minScore, tab, zoek, via }
            // Door een echte URL, niet alleen door URLSearchParams: zo reist de codering mee.
            const url = new URL(`http://x/?${schrijfStand(stand)}`)
            const terug = leesStand(url.searchParams)
            if (!gelijk(stand, terug)) check(`rondreis ${JSON.stringify(stand)}`, false, JSON.stringify(terug))
            else geslaagd++
            n++
          }
  console.log(`  1: ${n} standen door de URL heen en terug`)
  check('1: de ruimte is niet leeg', n === 6 * 8 * 21 * 3 * 5 * 2, String(n))
}

// ── 2. De standaard schrijft niets ───────────────────────────────────────────
{
  check('2: de standaard geeft een lege querystring', schrijfStand(STANDAARD).toString() === '', schrijfStand(STANDAARD).toString())
  check('2: een lege querystring geeft de standaard', gelijk(leesStand(new URLSearchParams('')), STANDAARD))
  check('2: de standaard is Open, alle regio\'s, score 0', STANDAARD.status === 'open' && STANDAARD.regios.length === 3 && STANDAARD.minScore === 0)
}

// ── 3. Kapotte waarden vallen terug, zonder fout ─────────────────────────────
{
  const kapot = [
    ['status=verzonnen', 'status', STANDAARD.status],
    ['status=', 'status', STANDAARD.status],
    ['regio=XYZ', 'regios', STANDAARD.regios],
    ['regio=,,', 'regios', STANDAARD.regios],
    ['score=abc', 'minScore', 0],
    ['score=-5', 'minScore', 0],
    ['score=105', 'minScore', 0],
    ['score=7', 'minScore', 0],
    ['score=12.5', 'minScore', 0],
    ['score=Infinity', 'minScore', 0],
    ['tab=constructor', 'tab', 'jobs'],
    ['tab=__proto__', 'tab', 'jobs'],
  ] as const
  for (const [qs, veld, verwacht] of kapot) {
    let stand: TriageStand | null = null
    try {
      stand = leesStand(new URLSearchParams(qs))
    } catch (e) {
      check(`3 ${qs}: gooit niet`, false, String(e))
      continue
    }
    check(`3 ${qs}: ${veld} valt terug`, JSON.stringify(stand[veld]) === JSON.stringify(verwacht), JSON.stringify(stand[veld]))
  }
  // Positieve kant: een geldige waarde wordt wél gelezen — anders slagen de gevallen hierboven
  // ook bij een lezer die alles negeert.
  const geldig = leesStand(new URLSearchParams('status=dismissed&regio=BRU,WVL&score=25&tab=leads&zoek=x&via=bedrijf'))
  check('3: geldige waarden worden gelezen', geldig.status === 'dismissed' && geldig.minScore === 25 && geldig.tab === 'leads' && geldig.zoek === 'x' && geldig.via === 'bedrijf', JSON.stringify(geldig))
  check('3: via=onzin valt terug op leeg', leesStand(new URLSearchParams('via=onzin')).via === '')
  check('3: regio\'s in vaste volgorde, zonder dubbels', JSON.stringify(leesStand(new URLSearchParams('regio=BRU,WVL,BRU')).regios) === '["WVL","BRU"]')
  check('3: regio=geen is een lege selectie', leesStand(new URLSearchParams('regio=geen')).regios.length === 0)
}

// ── 4. Open betekent alles behalve afgewezen ─────────────────────────────────
{
  const statussen = ['new', 'saved', 'dismissed', 'contacted']
  check('4: open laat nieuw, opgeslagen en gecontacteerd door', ['new', 'saved', 'contacted'].every((s) => pastBijStatus(s, 'open')))
  check('4: open sluit afgewezen uit', !pastBijStatus('dismissed', 'open'))
  check('4: alle laat alles door', statussen.every((s) => pastBijStatus(s, 'alle')))
  for (const f of statussen) {
    check(`4: filter ${f} laat alleen ${f} door`, statussen.every((s) => pastBijStatus(s, f as StatusFilter) === (s === f)))
  }
}

// ── 5. Splitsen op score: een partitie, zonder verlies ───────────────────────
{
  check('5: de grens is 10', LAGE_SCORE_GRENS === 10)
  let lijsten = 0
  for (let lengte = 0; lengte <= 40; lengte += 4) {
    // Deterministisch pseudo-willekeurig, met de randen 9, 10 en 11 er zeker in.
    const lijst = Array.from({ length: lengte }, (_, i) => ({ id: i, score: [0, 5, 9, 10, 11, 45, (i * 37) % 101][i % 7] as number }))
      .sort((a, b) => b.score - a.score)
    const { kaarten, laag } = splitsOpScore(lijst)
    const ids = [...kaarten, ...laag].map((x) => x.id).sort((a, b) => a - b)
    check(`5 [${lengte}]: samen precies de invoer`, JSON.stringify(ids) === JSON.stringify(lijst.map((x) => x.id).sort((a, b) => a - b)))
    check(`5 [${lengte}]: disjunct`, kaarten.every((k) => !laag.includes(k)))
    check(`5 [${lengte}]: kaarten ≥ grens, laag < grens`, kaarten.every((k) => k.score >= 10) && laag.every((l) => l.score < 10))
    check(`5 [${lengte}]: volgorde behouden`, [kaarten, laag].every((d) => d.every((x, i) => i === 0 || d[i - 1]!.score >= x.score)))
    lijsten++
  }
  const rand = splitsOpScore([{ score: 9 }, { score: 10 }])
  check('5: 10 is een kaart, 9 een rij', rand.kaarten.length === 1 && rand.kaarten[0]!.score === 10 && rand.laag[0]!.score === 9)
  console.log(`  5: ${lijsten} lijsten gesplitst`)
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('zelftest: deze check hoort te falen', false, 'opzettelijk')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
