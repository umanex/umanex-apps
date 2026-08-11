import type { FetchParams, JobSource, RawJob, SourceResult } from './types'
import { standaardZoekopdracht, type Zoekopdracht } from '../settings'
import { REGIONS, regionForArea, type RegionCode } from '../regions'
import { ADZUNA_JOB_FIXTURES } from './fixtures/adzuna-jobs'
import { ADZUNA_SEARCH } from '../config/profile'

type AdzunaItem = {
  id: string
  title: string
  company?: { display_name?: string }
  location?: { display_name?: string; area?: string[] }
  /** Bewust ongebruikt — zie `vacatureUrl`. Staat er om de API-vorm te documenteren. */
  redirect_url?: string
  description?: string
  created: string
}

type AdzunaResponse = {
  results?: AdzunaItem[]
  count?: number
}

/** Alleen bij een expliciete vlag — zie `kbo.ts` voor waarom een ontbrekende sleutel dat niet is. */
const isMockMode = () => process.env.JOBRADAR_MOCK === '1'

const heeftSleutels = () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY)

/**
 * Eén deelvraag aan de bron: óf de losse woorden samen, óf één exacte zinsnede.
 *
 * Ze zijn niet te combineren. `what_or` en `what_phrase` in hetzelfde verzoek geven de
 * dóórsnede, niet de vereniging — gemeten op 2026-08-11: `what_or=UX` (14 treffers) plus
 * `what_phrase=design system` (1) leverde 1. Vandaar een verzoek per zinsnede.
 */
export type Deelvraag = { soort: 'woorden'; woorden: string[] } | { soort: 'zinsnede'; zinsnede: string }

export function deelvragen(zoek: Zoekopdracht): Deelvraag[] {
  return [
    { soort: 'woorden' as const, woorden: zoek.termen },
    ...zoek.zinsnedes.map((zinsnede) => ({ soort: 'zinsnede' as const, zinsnede })),
  ]
}

export function bouwUrl(
  regio: RegionCode,
  pagina: number,
  vraag: Deelvraag,
  uitsluiten: readonly string[],
  opties: { perPagina?: number } = {}
): string {
  const anchor = REGIONS[regio].adzunaAnchor
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_SEARCH.country}/search/${pagina}`
  )
  url.searchParams.set('app_id', process.env.ADZUNA_APP_ID!)
  url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY!)
  if (vraag.soort === 'woorden') url.searchParams.set('what_or', vraag.woorden.join(' '))
  else url.searchParams.set('what_phrase', vraag.zinsnede)
  url.searchParams.set('where', anchor.place)
  url.searchParams.set('distance', String(anchor.radiusKm))
  url.searchParams.set('results_per_page', String(opties.perPagina ?? ADZUNA_SEARCH.resultatenPerPagina))
  url.searchParams.set('max_days_old', String(ADZUNA_SEARCH.maxDagenOud))
  if (uitsluiten.length) url.searchParams.set('what_exclude', uitsluiten.join(' '))
  return url.toString()
}

/**
 * De pagina waar de vacature écht staat.
 *
 * Niet `item.redirect_url`. Dat is Adzuna's klik-tracking-link (`/land/ad/<id>?se=…`) en die
 * geeft **"Pagina niet gevonden"** wanneer je hem koud opent — geverifieerd in Chrome op
 * 2026-08-10 met een verse link uit de API. Elke "Bekijk"-knop in het dashboard liep daarop
 * dood, waardoor de vacatures verzonnen léken terwijl ze bestonden.
 *
 * `/details/<id>` toont dezelfde vacature wél volledig, inclusief bedrijf, plaats en status.
 */
function vacatureUrl(id: string): string {
  return `https://${ADZUNA_SEARCH.siteHost}/details/${encodeURIComponent(id)}`
}

/**
 * Zet één Adzuna-item om, of `null` als het buiten de geconfigureerde regio's valt.
 *
 * De regio komt uit `location.area`, niet uit de regio waarvoor we zochten. Een anker met
 * straal loopt over de provinciegrens: de Gent-query (25 km) levert vacatures in Dentergem
 * (West-Vlaanderen) en de Brussel-query (15 km) er in Vlaams-Brabant. De lus-regio erop
 * plakken maakt van elk van die vacatures een leugen in de dataset.
 */
export function normaliseerAdzunaItem(item: AdzunaItem): RawJob | null {
  const regio = regionForArea(item.location?.area)
  if (!regio) return null

  return {
    externalId: String(item.id),
    title: item.title,
    company: item.company?.display_name ?? 'Onbekend',
    postcode: 0, // Adzuna levert geen postcode — gemeten op de live respons.
    city: item.location?.display_name ?? null,
    region: regio,
    url: vacatureUrl(String(item.id)),
    source: 'adzuna',
    description: item.description ?? '',
    postedAt: item.created,
  }
}

const wacht = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Eén verzoek, met een pauze vooraf en een herkansing bij 429.
 *
 * Adzuna stuurt geen limiet-headers, dus we kunnen niet vooruit kijken — alleen netjes
 * doseren en, als het toch misgaat, even wachten en het nog eens proberen. Zonder dit stopte
 * één 429 de hele regio bij die pagina en kwam de rest pas de vólgende sync binnen.
 *
 * `injecteerFetch` bestaat alleen om de suite dit pad te laten uitrijden zonder netwerk en
 * zonder echte wachttijden.
 */
export async function haalMetGeduld(
  url: string,
  opties: { pauzeMs?: number; retries?: number; retryPauzeMs?: number; fetcher?: typeof fetch } = {}
): Promise<Response> {
  const pauze = opties.pauzeMs ?? ADZUNA_SEARCH.pauzeMs
  const retries = opties.retries ?? ADZUNA_SEARCH.retriesBij429
  const retryPauze = opties.retryPauzeMs ?? ADZUNA_SEARCH.retryPauzeMs
  const doe = opties.fetcher ?? fetch

  let res = await (async () => {
    if (pauze > 0) await wacht(pauze)
    return doe(url, { headers: { Accept: 'application/json' } })
  })()

  for (let poging = 0; poging < retries && res.status === 429; poging++) {
    // Lineair oplopend: 2s, dan 4s. Exponentieel is hier overdreven — het gaat om een
    // handvol verzoeken, niet om een verkeersstorm.
    await wacht(retryPauze * (poging + 1))
    res = await doe(url, { headers: { Accept: 'application/json' } })
  }

  return res
}

export type Telling = {
  regio: RegionCode
  /**
   * De som over alle deelvragen — een **bovengrens**, geen aantal. Een vacature die zowel op
   * een los woord als op een zinsnede matcht, telt hier twee keer; de sync bewaart hem één
   * keer. Het scherm hoort dat te zeggen zodra er meer dan één deelvraag is.
   */
  treffers: number
  /** Waar zodra één deelvraag het plafond raakt — het plafond geldt per deelvraag. */
  afgekapt: boolean
  /** Of de som dubbels kan bevatten, d.w.z. of er meer dan één deelvraag was. */
  bovengrens: boolean
  fout?: string
}

/**
 * Telt hoeveel treffers een zoekopdracht in één regio zou opleveren, zonder ze op te halen.
 *
 * Eén verzoek met `results_per_page=1`: we willen het getal uit `count`, niet de rijen. Zo
 * kost een test drie aanroepen in plaats van de negen tot vijftien van een sync — en dat
 * telt, want Adzuna stuurt geen limiet-headers mee, dus een 429 is het enige signaal dat je
 * te vaak vraagt.
 *
 * Gooit niet: een gefaalde telling is een uitkomst, geen uitzondering.
 */
export async function telTreffers(
  regio: RegionCode,
  zoek: Zoekopdracht,
  netwerk?: FetchParams['netwerk']
): Promise<Telling> {
  const plafond = ADZUNA_SEARCH.maxPaginas * ADZUNA_SEARCH.resultatenPerPagina
  const vragen = deelvragen(zoek)
  let treffers = 0
  let afgekapt = false

  for (const vraag of vragen) {
    try {
      const res = await haalMetGeduld(bouwUrl(regio, 1, vraag, zoek.uitsluiten, { perPagina: 1 }), netwerk)
      if (!res.ok) {
        return {
          regio,
          treffers: 0,
          afgekapt: false,
          bovengrens: false,
          fout: res.status === 429 ? 'Adzuna: te veel verzoeken' : `Adzuna: HTTP ${res.status}`,
        }
      }
      const data = (await res.json()) as { count?: unknown }
      const n = typeof data?.count === 'number' ? data.count : 0
      treffers += n
      // Per deelvraag toetsen. De som tegen een meegroeiende drempel leggen zette de
      // waarschuwing uit zodra je een zinsnede toevoegde — drie zinsnedes die níets vinden
      // verhoogden de drempel met 750 en verborgen daarmee een afkapping van de woordenvraag.
      if (n > plafond) afgekapt = true
    } catch (err) {
      return { regio, treffers: 0, afgekapt: false, bovengrens: false, fout: err instanceof Error ? err.message : String(err) }
    }
  }

  return { regio, treffers, afgekapt, bovengrens: vragen.length > 1 }
}

/** Haalt één regio volledig op. Gooit niet: de uitkomst draagt zijn eigen fouten. */
async function haalDeelvraag(
  regio: RegionCode,
  vraag: Deelvraag,
  uitsluiten: readonly string[],
  netwerk: FetchParams['netwerk']
): Promise<SourceResult<RawJob>> {
  const etiket = vraag.soort === 'woorden' ? regio : `${regio} "${vraag.zinsnede}"`
  const items: RawJob[] = []
  const warnings: string[] = []
  let buitenRegio = 0
  let totaalBijBron: number | undefined
  // Of de laatste pagina vol was. Alleen dán kan er nog meer achter het plafond zitten —
  // en dit weten we óók wanneer de bron geen `count` meestuurt.
  let laatstePaginaVol = false
  // Afgebroken door een fout is iets anders dan afgekapt door het plafond. Zonder dit
  // onderscheid kreeg een 429 op pagina 3 er een plafond-waarschuwing bij, en die wijst
  // de oorzaak naar de verkeerde knop.
  let afgebrokenDoorFout = false

  for (let pagina = 1; pagina <= ADZUNA_SEARCH.maxPaginas; pagina++) {
    let data: AdzunaResponse
    try {
      const res = await haalMetGeduld(bouwUrl(regio, pagina, vraag, uitsluiten), netwerk)
      if (!res.ok) {
        warnings.push(
          res.status === 429
            ? `${etiket}: Adzuna weigerde na ${ADZUNA_SEARCH.retriesBij429} herkansingen (429) op pagina ${pagina} — deels opgehaald`
            : `${etiket}: HTTP ${res.status} op pagina ${pagina} — deels opgehaald`
        )
        afgebrokenDoorFout = true
        break
      }
      data = (await res.json()) as AdzunaResponse
    } catch (err) {
      warnings.push(`${etiket}: ${err instanceof Error ? err.message : String(err)} op pagina ${pagina}`)
      afgebrokenDoorFout = true
      break
    }

    // `data` kan alles zijn wat de bron stuurt — ook `null` (een body van letterlijk "null"
    // parset daartoe). Dit staat buiten de try hierboven, dus een blinde `data.count` gooide
    // een TypeError die aan haalRegio ontsnapte en de héle bron velde, per-regio-afhandeling
    // en al.
    const geldig = data && typeof data === 'object' ? data : {}
    if (totaalBijBron === undefined && typeof geldig.count === 'number') totaalBijBron = geldig.count
    const batch = Array.isArray(geldig.results) ? geldig.results : []
    laatstePaginaVol = batch.length >= ADZUNA_SEARCH.resultatenPerPagina

    for (const item of batch) {
      const job = normaliseerAdzunaItem(item)
      if (job) items.push(job)
      else buitenRegio++
    }

    // Laatste pagina: de bron gaf er minder terug dan we vroegen.
    if (!laatstePaginaVol) return afronden()
  }

  return afronden()

  function afronden(): SourceResult<RawJob> {
    // Geen stille afkapping: wie het plafond raakt, hoort dat te weten. De volle laatste
    // pagina is het signaal dat werkt zónder `count` — hing de guard daar alleen aan, dan
    // zweeg hij precies wanneer de bron zijn totaal niet meestuurt.
    const opgehaald = items.length + buitenRegio
    if (laatstePaginaVol && !afgebrokenDoorFout) {
      warnings.push(
        totaalBijBron !== undefined
          ? `${etiket}: ${opgehaald} van ${totaalBijBron} vacatures opgehaald ` +
            `(plafond ${ADZUNA_SEARCH.maxPaginas} pagina's × ${ADZUNA_SEARCH.resultatenPerPagina})`
          : `${etiket}: ${opgehaald} vacatures opgehaald en het plafond geraakt ` +
            `(${ADZUNA_SEARCH.maxPaginas} pagina's); de bron meldde geen totaal, dus er kan meer zijn`
      )
    }
    if (buitenRegio > 0) {
      warnings.push(`${etiket}: ${buitenRegio} vacatures buiten de regio laten vallen (zoekstraal loopt over de grens)`)
    }
    return { items, warnings }
  }
}

/**
 * Alle deelvragen voor één regio, serieel. Dubbels tussen de deelvragen — een vacature die
 * zowel op "UX" als op de zinsnede "user experience" matcht — worden hier al opgeruimd.
 */
async function haalRegio(
  regio: RegionCode,
  zoek: Zoekopdracht,
  netwerk: FetchParams['netwerk']
): Promise<SourceResult<RawJob>> {
  const items: RawJob[] = []
  const warnings: string[] = []
  const gezien = new Set<string>()

  for (const vraag of deelvragen(zoek)) {
    const uit = await haalDeelvraag(regio, vraag, zoek.uitsluiten, netwerk)
    warnings.push(...uit.warnings)
    for (const job of uit.items) {
      if (gezien.has(job.externalId)) continue
      gezien.add(job.externalId)
      items.push(job)
    }
  }

  return { items, warnings }
}

export const adzunaSource: JobSource = {
  name: 'adzuna',

  async fetch({ regions, zoek = standaardZoekopdracht(), netwerk }: FetchParams): Promise<SourceResult<RawJob>> {
    if (isMockMode()) {
      return { items: ADZUNA_JOB_FIXTURES.filter((job) => regions.includes(job.region)), warnings: ['adzuna: MOCK-MODUS — dit zijn verzonnen vacatures, geen echte'] }
    }

    // Geen sleutels en geen mock-vlag: niets ophalen en dat zeggen. Stil fixtures serveren
    // zou verzonnen vacatures als echte in de database zetten.
    if (!heeftSleutels()) {
      return { items: [], warnings: ['adzuna: ADZUNA_APP_ID/ADZUNA_APP_KEY ontbreken — niets opgehaald'] }
    }

    // Serieel, niet parallel. Drie regio's tegelijk was het burst-patroon dat de 429's
    // uitlokte; een sync mag rustig een paar seconden trager zijn. Fouten reizen nog steeds
    // mee in plaats van de hele bron te vellen.
    const perRegio: SourceResult<RawJob>[] = []
    for (const regio of regions) {
      perRegio.push(await haalRegio(regio, zoek, netwerk))
    }
    const warnings = perRegio.flatMap((r) => r.warnings)

    // De ankers overlappen fysiek — Brugge (30 km) en Gent (25 km) delen Tielt, Deinze,
    // Waregem en Aalter — dus dezelfde vacature komt uit twee queries terug. De database
    // vangt dat later op via (source, external_id), maar de signaal-afleiding krijgt de
    // rauwe lijst: daar telde één vacature dubbel en haalde een bedrijf zijn drempels
    // met kopieën van zichzelf.
    const gezien = new Set<string>()
    const items: RawJob[] = []
    let dubbel = 0
    for (const job of perRegio.flatMap((r) => r.items)) {
      if (gezien.has(job.externalId)) {
        dubbel++
        continue
      }
      gezien.add(job.externalId)
      items.push(job)
    }
    if (dubbel > 0) {
      warnings.push(`${dubbel} vacatures kwamen uit meerdere regio-queries terug (overlappende zoekstralen)`)
    }

    return { items, warnings }
  },
}
