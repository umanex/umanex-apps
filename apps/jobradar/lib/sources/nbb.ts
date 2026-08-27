/**
 * Client voor de CBSO-webservices van de Nationale Bank — de bron van het personeelsbestand.
 *
 * De KBO levert NACE-codes maar geen personeelsaantallen; die staan in de jaarrekeningen bij de
 * Balanscentrale, rubriek 9087. Dat is de tweede helft van de trechter: 56.311 ondernemingen met
 * IT als hoofdactiviteit worden er ongeveer 545 zodra je op 20-150 werknemers filtert.
 *
 * Drie producten zijn gratis volgens de algemene voorwaarden: Authentic Data Query, Authentic
 * Data Extracts en Authentic Archive Data. Improved Data (de door de NBB uit PDF's ge-OCR'de
 * neerleggingen) kost 3.300 euro per jaar en zit hier bewust niet in.
 *
 * WAT GEMETEN IS EN WAT NIET (2026-08-26, anoniem tegen de UAT-portal).
 *
 * De twee endpoint-paden en de drie headers staan in de API-definitie precies zoals ze hier
 * hardgecodeerd zijn: `GET /legalEntity/{legalEntityId}/references` en
 * `GET /deposit/{referenceNumber}/accountingData`, met `X-Request-Id` als verplichte header.
 *
 * Het **Reference-object hééft een publiek schema** — dit bestand beweerde eerder van niet, en
 * dat was nooit tegen de dienst zelf getoetst. De referentielijst is een array van objecten met
 * `ReferenceNumber`, `DepositDate` (ISO-datum), `ExerciseDates{StartDate,EndDate}`,
 * `EnterpriseNumber`, `AccountingDataURL` en nog een tiental velden. `kiesRecentsteReferentie`
 * blijft vormonafhankelijk als vangnet, maar wordt in `scripts/nbb-scenarios.ts` nu getoetst
 * tegen díe gedocumenteerde vorm en niet alleen tegen bedachte vormen.
 *
 * Voor **accountingData geldt het omgekeerde**: de spec beschrijft het antwoord als
 * `type: string, format: binary` en zegt niets over de jsonxbrl-structuur. Daar is de
 * rubriekzoeker op nummer dus wél de juiste keuze — zie `nbb-rubriek.ts`.
 *
 * Wat nog ongemeten is: een échte respons. Dat vraagt een subscription key, ook op de UAT.
 * Draai `scripts/nbb-probe.ts` zodra je er een hebt.
 *
 * TWEE ROUTES NAAR HETZELFDE CIJFER, en de keuze is nog niet gemaakt — bewust hier genoteerd
 * zodat hij niet stilzwijgend valt op het moment dat de filter gebouwd wordt.
 *
 *   a) *per onderneming* — wat deze module doet. Twee verzoeken per bedrijf, dus voor de 15.725
 *      KBO-kandidaten in het slechtste geval 31.450 calls. Gericht, hervatbaar, en je haalt
 *      alleen op wat je nodig hebt. Vraagt wel een cache: dit twee keer draaien is zonde.
 *   b) *per dag* — het Extracts-product heeft `GET /batch/{date}/references` en
 *      `GET /batch/{date}/accountingData`, dus de neerleggingen van één dag in één verzoek.
 *      Een jaar aan werkdagen is ~250 calls in plaats van tienduizenden, maar je haalt heel
 *      België binnen en filtert zelf, en je moet ver genoeg terug om elk bedrijf te raken.
 *
 * Welke goedkoper is hangt af van de quota en de payloadgrootte, en geen van beide is bekend
 * zonder key. Meet dat vóór je kiest; route (a) is de default omdat hij eenvoudiger is, niet
 * omdat hij bewezen beter is.
 */
import type { SourceResult } from './types'
import { leesPersoneel } from './nbb-rubriek'

/**
 * Productie en de testomgeving.
 *
 * De UAT vraagt **geen contract en geen CLIENT_ID** — "it is not necessary to complete the order
 * form", en het gebruik is gratis. Maar hij vraagt wél een subscription key: registreer op
 * https://developer.uat2.cbso.nbb.be/ en abonneer op *NBB CBSO Web Services - Authentic Data*
 * — zo heet het product in de portal; de NBB-website noemt het "Authentic Data Query". Zonder die key
 * antwoordt de gateway 401 `Access denied due to missing subscription key`, en met een verzonnen
 * key 401 `invalid subscription key` — allebei gemeten op 2026-08-26. Dit bestand beweerde eerder
 * dat de UAT elk client-nummer accepteert; dat verwart het CLIENT_ID van de productie-aanvraag
 * met de API-sleutel, en het klopt voor geen van beide omgevingen.
 */
const BASIS = {
  productie: 'https://ws.cbso.nbb.be',
  uat: 'https://ws.uat2.cbso.nbb.be',
} as const

export type NbbOmgeving = keyof typeof BASIS

export type NbbConfig = {
  sleutel: string
  omgeving: NbbOmgeving
}

/**
 * Leest de configuratie uit de omgeving. Ontbreekt de sleutel, dan is dat geen fout maar een
 * niet-geconfigureerde bron — dezelfde keuze als in `kbo.ts`, waar een throw van een
 * niet-gebouwde bron een gefaalde sync maakte en dat als storing las.
 */
export function leesConfig(
  /** Een kale record en niet `NodeJS.ProcessEnv`: deze functie leest twee sleutels, en het
   * volledige ProcessEnv-type eisen dwingt elke aanroeper tot een cast zonder iets te winnen. */
  env: Record<string, string | undefined> = process.env
): NbbConfig | null {
  const sleutel = env.NBB_CBSO_KEY
  if (!sleutel) return null
  const omgeving: NbbOmgeving = env.NBB_CBSO_OMGEVING === 'productie' ? 'productie' : 'uat'
  return { sleutel, omgeving }
}

/** Injecteerbaar zodat de suite de verzoekopbouw kan toetsen zonder netwerk. */
export type FetchImpl = (url: string, init: { headers: Record<string, string> }) => Promise<{
  ok: boolean
  status: number
  json(): Promise<unknown>
  text(): Promise<string>
}>

/**
 * De X-Request-Id is verplicht en moet per verzoek uniek zijn. Injecteerbaar, want een suite
 * die een header wil vergelijken kan geen willekeurige waarde verwachten.
 */
export type IdGenerator = () => string

const standaardId: IdGenerator = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.round(Math.random() * 1e9)}`

export function bouwHeaders(config: NbbConfig, accept: string, id: string): Record<string, string> {
  return {
    'NBB-CBSO-Subscription-Key': config.sleutel,
    'X-Request-Id': id,
    Accept: accept,
  }
}

export const url = {
  /** Alle neerleggingen van één onderneming. `legalEntityId` is het kale ondernemingsnummer. */
  referenties: (c: NbbConfig, ondernemingsnummer: string) =>
    `${BASIS[c.omgeving]}/authentic/legalEntity/${ondernemingsnummer}/references`,
  /** De boekhoudkundige gegevens van één neerlegging. */
  gegevens: (c: NbbConfig, referentienummer: string) =>
    `${BASIS[c.omgeving]}/authentic/deposit/${referentienummer}/accountingData`,
}

export const ACCEPT = {
  json: 'application/json',
  jsonxbrl: 'application/x.jsonxbrl',
} as const

export type PersoneelResultaat = {
  ondernemingsnummer: string
  vte: number | null
  reden: 'gevonden' | 'rubriek-ontbreekt' | 'vorm-niet-herkend' | 'geen-neerlegging' | 'fout'
  detail?: string
}

/**
 * Haalt het personeelsbestand van één onderneming op: eerst de lijst neerleggingen, dan de
 * boekhoudkundige gegevens van de meest recente, dan rubriek 9087 daaruit.
 *
 * Gooit niet. Elke uitkomst — ook een 404 of een onherkenbare vorm — komt terug als een rij met
 * een reden, zodat één onbereikbaar bedrijf een run van duizenden niet omvergooit.
 */
export async function haalPersoneel(
  ondernemingsnummer: string,
  config: NbbConfig,
  opties: { fetchImpl?: FetchImpl; maakId?: IdGenerator } = {}
): Promise<PersoneelResultaat> {
  const doe = opties.fetchImpl ?? (globalThis.fetch as unknown as FetchImpl)
  const maakId = opties.maakId ?? standaardId
  const nummer = ondernemingsnummer.replace(/\D/g, '')

  try {
    const refUrl = url.referenties(config, nummer)
    const refRes = await doe(refUrl, { headers: bouwHeaders(config, ACCEPT.json, maakId()) })
    if (!refRes.ok) {
      return {
        ondernemingsnummer: nummer,
        vte: null,
        reden: refRes.status === 404 ? 'geen-neerlegging' : 'fout',
        detail: `${refRes.status} op ${refUrl}`,
      }
    }
    const referenties = await refRes.json()
    const referentie = kiesRecentsteReferentie(referenties)
    if (referentie === null) {
      return { ondernemingsnummer: nummer, vte: null, reden: 'geen-neerlegging' }
    }

    const datUrl = url.gegevens(config, referentie)
    const datRes = await doe(datUrl, { headers: bouwHeaders(config, ACCEPT.jsonxbrl, maakId()) })
    if (!datRes.ok) {
      return { ondernemingsnummer: nummer, vte: null, reden: 'fout', detail: `${datRes.status} op ${datUrl}` }
    }
    const gegevens = await datRes.json()
    const gelezen = leesPersoneel(gegevens)
    return {
      ondernemingsnummer: nummer,
      vte: gelezen.vte,
      reden: gelezen.reden,
      detail:
        gelezen.reden === 'vorm-niet-herkend'
          ? 'geen enkele rubriekcode herkend — vergelijk een echte respons met nbb-rubriek.ts'
          : gelezen.reden === 'rubriek-ontbreekt'
            ? `gezien: ${gelezen.gezieneCodes.slice(0, 12).join(', ')}`
            : undefined,
    }
  } catch (e) {
    return { ondernemingsnummer: nummer, vte: null, reden: 'fout', detail: String(e) }
  }
}

/**
 * Kiest de meest recente neerlegging uit de referentie-respons.
 *
 * Vormonafhankelijk om dezelfde reden als de rubriekzoeker: het Reference-object heeft geen
 * publiek schema. Zoekt naar een referentienummer en een datum onder elke redelijke sleutelnaam,
 * en valt terug op de eerste als er geen datum te vinden is.
 */
export function kiesRecentsteReferentie(data: unknown): string | null {
  const rijen: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : data && typeof data === 'object'
      ? Object.values(data as Record<string, unknown>).flatMap((v) =>
          Array.isArray(v) ? (v as Record<string, unknown>[]) : []
        )
      : []

  const kandidaten = rijen
    .filter((r) => r && typeof r === 'object')
    .map((r) => {
      const nummer = zoekSleutel(r, ['referencenumber', 'reference', 'depositnumber', 'id'])
      const datum = zoekSleutel(r, ['depositdate', 'date', 'periodenddate', 'exercisedate', 'enddate'])
      return { nummer: typeof nummer === 'string' || typeof nummer === 'number' ? String(nummer) : null, datum: typeof datum === 'string' ? datum : null }
    })
    .filter((k): k is { nummer: string; datum: string | null } => k.nummer !== null)

  if (kandidaten.length === 0) return null
  const metDatum = kandidaten.filter((k) => k.datum !== null)
  if (metDatum.length === 0) return kandidaten[0]!.nummer
  metDatum.sort((a, b) => sorteerbareDatum(b.datum!) - sorteerbareDatum(a.datum!))
  return metDatum[0]!.nummer
}

function zoekSleutel(obj: Record<string, unknown>, namen: string[]): unknown {
  for (const sleutel of Object.keys(obj)) {
    if (namen.includes(sleutel.toLowerCase())) return obj[sleutel]
  }
  return undefined
}

/** dd-mm-yyyy en yyyy-mm-dd komen allebei voor in Belgische bronnen. */
function sorteerbareDatum(s: string): number {
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return Number(iso[1]! + iso[2]! + iso[3]!)
  const be = s.match(/^(\d{2})-(\d{2})-(\d{4})/)
  if (be) return Number(be[3]! + be[2]! + be[1]!)
  return 0
}

/**
 * De bron zoals de sync hem aanroept. Zonder sleutel: nul rijen mét een leesbare reden,
 * precies zoals `kbo.ts` het doet.
 */
export const nbbBron = {
  name: 'nbb',
  async personeelVoor(
    nummers: string[],
    opties: { config?: NbbConfig | null; fetchImpl?: FetchImpl; maakId?: IdGenerator } = {}
  ): Promise<SourceResult<PersoneelResultaat>> {
    const config = opties.config === undefined ? leesConfig() : opties.config
    if (!config) {
      return {
        items: [],
        warnings: ['nbb: geen NBB_CBSO_KEY gezet — zet hem, of gebruik de UAT-omgeving zonder contract'],
      }
    }
    const items: PersoneelResultaat[] = []
    for (const nummer of nummers) {
      items.push(await haalPersoneel(nummer, config, opties))
    }
    const warnings: string[] = []
    const nietHerkend = items.filter((i) => i.reden === 'vorm-niet-herkend').length
    if (nietHerkend > 0) {
      warnings.push(
        `nbb: ${nietHerkend} van ${items.length} responsen had geen herkenbare rubriekvorm — ` +
          'dat is een parserprobleem, geen bedrijf zonder personeel'
      )
    }
    const fouten = items.filter((i) => i.reden === 'fout').length
    if (fouten > 0) warnings.push(`nbb: ${fouten} verzoeken faalden`)
    return { items, warnings }
  },
}
