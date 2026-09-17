/**
 * De filterstand van het dashboard, als pure functies.
 *
 * Los van React en van Next, zodat `scripts/triage-scenarios.ts` de rondreis door de URL over de
 * hele filterruimte kan toetsen. Die rondreis is het punt: een stand die niet terugkomt na een
 * herlaadbeurt, is een filter dat je elke ochtend opnieuw instelt — precies wat de critique van
 * 2026-09-17 opmerkte.
 */
import type { ItemStatus } from './db/schema'
import type { RegionCode } from './regions'

/**
 * Onder deze vacaturescore wordt een vacature een compacte rij in plaats van een kaart.
 *
 * Gekozen door Jeroen op 2026-09-17, op de gemeten verdeling: 309 van 334 vacatures scoorden
 * onder 5, de overige 25 tussen 10 en 45. Er zat niets tussen 5 en 9 — dit is de breuk in de
 * data, niet een rond getal. Geldt alleen voor de vacaturescore: de leadscore is een andere schaal.
 */
export const LAGE_SCORE_GRENS = 10

export const ALLE_REGIOS: readonly RegionCode[] = ['WVL', 'OVL', 'BRU']

/** `open` = alles behalve afgewezen; `alle` = geen statusfilter. */
export type StatusFilter = 'open' | 'alle' | ItemStatus

const STATUS_FILTERS: readonly StatusFilter[] = ['open', 'alle', 'new', 'saved', 'dismissed', 'contacted']

export type Tab = 'jobs' | 'leads' | 'prospects'
const TABS: readonly Tab[] = ['jobs', 'leads', 'prospects']

export type TriageStand = {
  status: StatusFilter
  regios: RegionCode[]
  minScore: number
  tab: Tab
  zoek: string
  /**
   * `bedrijf` wanneer de zoekterm van een doorklik vanaf een lead komt: dan matcht de lijst op de
   * bedrijfssleutel en niet op vrije tekst in titel of bedrijf. Zonder dit veld in de URL gaf
   * herladen na een doorklik stil een andere lijst (design-review 2026-09-17).
   */
  via: 'bedrijf' | ''
  /**
   * Alleen wat bij de laatste sync binnenkwam — dezelfde voorwaarde als de badge "nieuw" op een kaart
   * (`isNieuw`). Los van de status: "nieuw" is wanneer iets binnenkwam, "niet beoordeeld" is wat je
   * ermee deed. Tot 2026-09-17 heetten die twee op hetzelfde scherm allebei "nieuw", en "+N vacatures"
   * filterde daardoor op de status in plaats van op de sync.
   */
  nieuw: boolean
}

export const STANDAARD: TriageStand = {
  status: 'open',
  regios: [...ALLE_REGIOS],
  minScore: 0,
  tab: 'jobs',
  zoek: '',
  via: '',
  nieuw: false,
}

/**
 * Kwam dit item binnen bij de laatste sync? `vorigeSyncAt` is de start van de sync dáárvoor; met maar
 * één sync is dat 1970 en is alles nieuw. ISO-tijdstempels, dus een stringvergelijking is de chronologie.
 *
 * Eén functie voor de badge én het filter: twee kopieën van deze vergelijking kunnen stil uiteenlopen,
 * en dan toont het vinkje andere kaarten dan die met de badge.
 */
export function isNieuw(eerstGezienAt: string, vorigeSyncAt: string): boolean {
  return eerstGezienAt >= vorigeSyncAt
}

/** Wat een vacature of lead moet hebben om door de filters te komen (de zoekterm uitgezonderd). */
export type Filterbaar = { regio: string; score: number; status: string; eerstGezienAt: string }

/**
 * De filters van het dashboard behalve de zoekterm, als één pure voorwaarde. De zoekterm blijft in de
 * component: bij een doorklik matcht hij op de bedrijfssleutel, en die hangt aan `normaliseerBedrijf`.
 */
export function pastBijFilters(
  item: Filterbaar,
  stand: Pick<TriageStand, 'status' | 'regios' | 'minScore' | 'nieuw'>,
  vorigeSyncAt: string
): boolean {
  return (
    (stand.regios as readonly string[]).includes(item.regio) &&
    item.score >= stand.minScore &&
    pastBijStatus(item.status, stand.status) &&
    (!stand.nieuw || isNieuw(item.eerstGezienAt, vorigeSyncAt))
  )
}

/**
 * Past een item bij het statusfilter?
 *
 * `open` sluit alleen afgewezen uit, niet "gecontacteerd": een lead die je gecontacteerd hebt is
 * lopend werk, en hem bij het openen verbergen zou de opvolging onzichtbaar maken.
 */
export function pastBijStatus(status: string, filter: StatusFilter): boolean {
  if (filter === 'alle') return true
  if (filter === 'open') return status !== 'dismissed'
  return status === filter
}

type Params = { get(naam: string): string | null }

/**
 * De stand uit een querystring. Elke onbekende of kapotte waarde valt terug op de standaard: een
 * oude bladwijzer of een half getypte URL hoort een werkend dashboard te geven, geen fout.
 */
export function leesStand(params: Params): TriageStand {
  const status = params.get('status')
  const regio = params.get('regio')
  const score = params.get('score')
  const tab = params.get('tab')
  const zoek = params.get('zoek')
  const via = params.get('via')
  const nieuw = params.get('nieuw')

  let regios = [...STANDAARD.regios]
  if (regio === 'geen') regios = []
  else if (regio !== null) {
    const gekozen = regio.split(',').filter((r): r is RegionCode => (ALLE_REGIOS as readonly string[]).includes(r))
    // In de vaste volgorde en zonder dubbels, zodat twee URL's die hetzelfde zeggen ook dezelfde
    // stand geven. Leeg na het filteren = de waarde was onzin, dus de standaard.
    const uniek = ALLE_REGIOS.filter((r) => gekozen.includes(r))
    if (uniek.length > 0) regios = uniek
  }

  const n = score === null ? NaN : Number(score)
  const minScore = Number.isInteger(n) && n >= 0 && n <= 100 && n % 5 === 0 ? n : STANDAARD.minScore

  return {
    status: status !== null && (STATUS_FILTERS as readonly string[]).includes(status) ? (status as StatusFilter) : STANDAARD.status,
    regios,
    minScore,
    tab: tab !== null && (TABS as readonly string[]).includes(tab) ? (tab as Tab) : STANDAARD.tab,
    zoek: zoek ?? STANDAARD.zoek,
    via: via === 'bedrijf' ? 'bedrijf' : STANDAARD.via,
    // Alleen `1` zet het aan: een oude bladwijzer met `nieuw=true` of `nieuw=ja` valt terug, zoals elke
    // andere onbekende waarde.
    nieuw: nieuw === '1',
  }
}

/** De querystring voor een stand. Wat op zijn standaard staat, laat hij weg. */
export function schrijfStand(stand: TriageStand): URLSearchParams {
  const p = new URLSearchParams()
  if (stand.tab !== STANDAARD.tab) p.set('tab', stand.tab)
  if (stand.zoek !== STANDAARD.zoek) p.set('zoek', stand.zoek)
  if (stand.via !== STANDAARD.via) p.set('via', stand.via)
  if (stand.status !== STANDAARD.status) p.set('status', stand.status)
  const regios = ALLE_REGIOS.filter((r) => stand.regios.includes(r))
  if (regios.length === 0) p.set('regio', 'geen')
  else if (regios.length !== ALLE_REGIOS.length) p.set('regio', regios.join(','))
  if (stand.minScore !== STANDAARD.minScore) p.set('score', String(stand.minScore))
  if (stand.nieuw !== STANDAARD.nieuw) p.set('nieuw', '1')
  return p
}

/**
 * Splitst een gefilterde vacaturelijst in kaarten en lage-scorerijen.
 *
 * Beide helften behouden de volgorde van de invoer; de aanroeper sorteert. Samen zijn ze precies
 * de invoer — geen vacature verdwijnt tussen twee weergaven.
 */
export function splitsOpScore<T extends { score: number }>(
  lijst: readonly T[],
  grens = LAGE_SCORE_GRENS
): { kaarten: T[]; laag: T[] } {
  const kaarten: T[] = []
  const laag: T[] = []
  for (const item of lijst) (item.score >= grens ? kaarten : laag).push(item)
  return { kaarten, laag }
}
