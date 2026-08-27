/**
 * De CSV-laag van de KBO Open Data-dump.
 *
 * Gedeeld door het meetscript (`scripts/kbo-meting.ts`) en de importer
 * (`lib/sources/kbo-dump.ts`). Stond eerst inline in het meetscript; bij de tweede consument
 * is dupliceren duurder dan extraheren, en juist een CSV-parser met eigen quote-afhandeling
 * is het soort code dat stil uit elkaar groeit.
 *
 * Formaat volgens het cookbook: komma-gescheiden, tekst tussen dubbele quotes, decimaalpunt is
 * een punt, datums dd-mm-yyyy, en een lege waarde is een onmiddellijk volgend scheidingsteken.
 */
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'

/**
 * Splitst één CSV-regel. Splitsen op ',' is fout: een waarde mag zelf een komma bevatten
 * zolang ze tussen quotes staat. Verdubbelde quotes ("") zijn een ontsnapte quote.
 */
export function splitsCsv(regel: string): string[] {
  const velden: string[] = []
  let huidig = ''
  let inQuote = false
  for (let i = 0; i < regel.length; i++) {
    const c = regel[i]!
    if (inQuote) {
      if (c === '"') {
        if (regel[i + 1] === '"') {
          huidig += '"'
          i++
        } else inQuote = false
      } else huidig += c
    } else if (c === '"') inQuote = true
    else if (c === ',') {
      velden.push(huidig)
      huidig = ''
    } else huidig += c
  }
  velden.push(huidig)
  return velden
}

/**
 * Ondernemings- en vestigingsnummers staan als 9999.999.999 in het bestand. Zonder deze
 * normalisatie faalt elke join stil — en stil, want beide kanten blijven gewoon strings.
 */
export const normaliseerNummer = (s: string | undefined | null): string => (s ?? '').replace(/\D/g, '')

/**
 * Ondernemingsnummers beginnen met 0 of 1, vestigingsnummers met 2.
 *
 * `activity.csv` en `contact.csv` dragen beide soorten in een kolom die in allebei de gevallen
 * `EntityNumber` heet. GEMETEN op extract 429: van de 659.520 activiteitsrijen in NACE
 * 62/582/63 versie 2025 waren er 485.031 vestigingen en 174.489 ondernemingen. Wie dat niet
 * scheidt, telt vestigingen als bedrijven — dat gaf 266.178 "bedrijven" tegenover de 35.696 die
 * Eurostat voor heel NACE J62 in België telt.
 */
export const isOndernemingsnummer = (nummer: string): boolean =>
  nummer.length >= 9 && (nummer[0] === '0' || nummer[0] === '1')

/**
 * Streamt een CSV en roept `perRij` aan met een object op kolomnaam. De kop komt uit regel 1.
 *
 * Streamt met opzet in plaats van in te lezen: `activity.csv` is 1,5 GB en past niet in het
 * geheugen van een gewone node-run.
 */
export async function leesCsv(
  pad: string,
  perRij: (rij: Record<string, string>) => void
): Promise<number> {
  const rl = createInterface({
    input: createReadStream(pad, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  })
  let kop: string[] | null = null
  let n = 0
  for await (const regel of rl) {
    if (regel.trim() === '') continue
    const velden = splitsCsv(regel)
    if (kop === null) {
      kop = velden.map((k) => k.trim())
      continue
    }
    const rij: Record<string, string> = {}
    for (let i = 0; i < kop.length; i++) rij[kop[i]!] = velden[i] ?? ''
    perRij(rij)
    n++
  }
  return n
}

/**
 * Ruimt een webadres uit `contact.csv` op.
 *
 * De waarden zijn vuil — dat is niet vermoed maar af te lezen aan de omzetter van de Belgische
 * overheid zelf (Fedict/BOSA lod-cbe): er staan meerdere URL's in één veld gescheiden door een
 * spatie, het schema ontbreekt vaak, en er zitten misvormingen in zoals `www:`.
 */
export function schoonWebadres(waarde: string): string | null {
  const eerste = (waarde ?? '').trim().split(/\s+/)[0] ?? ''
  if (eerste.length < 5) return null
  const zonderKapot = eerste.replace(/^www:/i, 'www.')
  if (/^https?:\/\//i.test(zonderKapot)) return zonderKapot
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(zonderKapot)) return `https://${zonderKapot}`
  return null
}

/**
 * Leest een Belgische postcode uit het ruwe veld, of geeft `null`.
 *
 * STRIKT vier cijfers, en dat is geen netheid maar een correctheidseis. `address.csv` bevat ook
 * buitenlandse zetels, met hun eigen postcodeformaat. Wie de niet-cijfers wegstript en de rest
 * als getal leest, haalt uit het Amsterdamse `1077CZ` de waarde 1077 — pal in het Brusselse
 * bereik 1000-1299. GEMETEN op extract 429: dat zette 64 buitenlandse ondernemingen als
 * Belgische prospect in de lijst, waaronder tien Amsterdamse en één Luxemburgse als
 * West-Vlaams. Een Belgische postcode is exact vier cijfers; al de rest is een ander land.
 */
export function leesBelgischePostcode(ruw: string | undefined | null): number | null {
  const schoon = (ruw ?? '').trim()
  if (!/^[0-9]{4}$/.test(schoon)) return null
  const n = Number(schoon)
  return n >= 1000 && n <= 9999 ? n : null
}

/**
 * Of een adresrij een Belgisch adres is. De land-kolommen zijn leeg voor België en gevuld voor
 * de rest — een tweede, onafhankelijke controle naast de postcodevorm. Twee guards omdat één
 * van de twee kan wegvallen: een leeg land met een buitenlandse postcode komt voor, en
 * omgekeerd ook.
 */
export const isBelgischAdres = (rij: Record<string, string>): boolean =>
  (rij.CountryNL ?? '').trim() === '' && (rij.CountryFR ?? '').trim() === ''
