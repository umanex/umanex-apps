/**
 * Streaming CSV-lezer voor de KBO-extracts.
 *
 * Waarom niet `split(',')`: gemeten op de dagdelta van 2026-08-29 dragen 6 270 velden in
 * `code.csv` een komma bínnen de aanhalingstekens, en 30 velden dáár plus 3 in
 * `denomination_insert.csv` bevatten een dubbele quote als escape (`""`). Een naïeve split
 * schuift daar stil de kolommen op — de rij landt, met de verkeerde waarden in de
 * verkeerde velden. Dat is precies het soort fout dat pas maanden later opvalt.
 *
 * Waarom niet een csv-dependency: dit is de enige plek die het nodig heeft, en de
 * grammatica is klein genoeg om volledig te toetsen (`scripts/kbo-scenarios.ts`).
 *
 * Waarom streaming: de Full-extract is 313 MB gecomprimeerd. De grootste CSV erin telt
 * miljoenen rijen; die past niet als string in het geheugen.
 *
 * Embedded newlines binnen een veld komen in de gemeten delta niet voor, maar worden wél
 * afgehandeld: een parser die ze niet kent, breekt de rij in tweeën en de fout wordt dan
 * een verkeerd veld in plaats van een foutmelding.
 */

/** Leest tekst-brokken en levert rijen als losse velden, RFC 4180. */
export async function* csvRijen(bron: AsyncIterable<Buffer | string>): AsyncGenerator<string[]> {
  let veld = ''
  let rij: string[] = []
  let inQuotes = false
  let quoteGezien = false
  let ietsGezien = false

  for await (const brok of bron) {
    const tekst = typeof brok === 'string' ? brok : brok.toString('utf8')

    for (const c of tekst) {
      if (inQuotes) {
        if (quoteGezien) {
          quoteGezien = false
          if (c === '"') {
            veld += '"' // "" binnen quotes is één letterlijke quote
            continue
          }
          inQuotes = false
          // geen continue: dit teken hoort bij de ongequote afhandeling hieronder
        } else if (c === '"') {
          quoteGezien = true
          continue
        } else {
          veld += c
          continue
        }
      }

      if (c === '"') {
        inQuotes = true
        ietsGezien = true
      } else if (c === ',') {
        rij.push(veld)
        veld = ''
        ietsGezien = true
      } else if (c === '\n') {
        if (ietsGezien || veld !== '' || rij.length) {
          rij.push(veld)
          yield rij
        }
        rij = []
        veld = ''
        ietsGezien = false
      } else if (c !== '\r') {
        veld += c
        ietsGezien = true
      }
    }
  }

  // Laatste rij zonder afsluitende newline.
  if (ietsGezien || veld !== '' || rij.length) {
    rij.push(veld)
    yield rij
  }
}

/**
 * Zelfde bron, maar als objecten op de kopregel — en met de telling als harde grens.
 *
 * De kolomtelling is de goedkoopste tegenproef die er is: wijkt een rij af van de kop, dan
 * is er iets misgegaan in het parsen óf in de bron, en beide moeten luid zijn. Zonder deze
 * controle levert een verschoven rij gewoon `undefined` in het laatste veld.
 */
export async function* csvObjecten(
  bron: AsyncIterable<Buffer | string>,
  herkomst: string
): AsyncGenerator<Record<string, string>> {
  let kop: string[] | null = null
  let nr = 0

  for await (const rij of csvRijen(bron)) {
    nr++
    if (kop === null) {
      kop = rij
      continue
    }
    if (rij.length !== kop.length) {
      throw new Error(
        `[kbo] ${herkomst}: rij ${nr} heeft ${rij.length} velden, de kopregel ${kop.length}.\n` +
          `  Kop: ${kop.join(' | ')}\n  Rij: ${rij.join(' | ').slice(0, 200)}`
      )
    }
    const uit: Record<string, string> = {}
    for (let i = 0; i < kop.length; i++) uit[kop[i]!] = rij[i]!
    yield uit
  }
}

/**
 * KBO schrijft datums als `DD-MM-YYYY`. SQLite sorteert en vergelijkt alleen ISO correct,
 * en `2026-08-29` versus `29-08-2026` is precies het soort verschil dat pas opvalt wanneer
 * een filter op "sinds" stil de verkeerde helft teruggeeft.
 *
 * Een lege waarde is geen fout — StartDate en DateStrikingOff zijn vaak leeg. Alles wat
 * gevuld is maar niet past, is dat wél: stil `null` teruggeven zou de fout wegmoffelen.
 */
export function kboDatum(waarde: string): string | null {
  const s = waarde.trim()
  if (s === '') return null
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s)
  if (!m) throw new Error(`[kbo] onverwacht datumformaat: "${waarde}" (verwacht DD-MM-YYYY)`)
  return `${m[3]}-${m[2]}-${m[1]}`
}

/** `0417.238.867` → `0417238867`. De punten zijn opmaak; de sleutel is het cijfer. */
export function kboNummer(waarde: string): string {
  return waarde.replace(/\./g, '').trim()
}
