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

export function bouwUrl(
  regio: RegionCode,
  pagina: number,
  zoek: Zoekopdracht,
  opties: { perPagina?: number } = {}
): string {
  const anchor = REGIONS[regio].adzunaAnchor
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_SEARCH.country}/search/${pagina}`
  )
  url.searchParams.set('app_id', process.env.ADZUNA_APP_ID!)
  url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY!)
  url.searchParams.set('what_or', zoek.termen.join(' '))
  url.searchParams.set('where', anchor.place)
  url.searchParams.set('distance', String(anchor.radiusKm))
  url.searchParams.set('results_per_page', String(opties.perPagina ?? ADZUNA_SEARCH.resultatenPerPagina))
  url.searchParams.set('max_days_old', String(ADZUNA_SEARCH.maxDagenOud))
  if (zoek.uitsluiten.length) url.searchParams.set('what_exclude', zoek.uitsluiten.join(' '))
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

export type Telling = { regio: RegionCode; treffers: number; afgekapt: boolean; fout?: string }

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
export async function telTreffers(regio: RegionCode, zoek: Zoekopdracht): Promise<Telling> {
  const plafond = ADZUNA_SEARCH.maxPaginas * ADZUNA_SEARCH.resultatenPerPagina
  try {
    const res = await fetch(bouwUrl(regio, 1, zoek, { perPagina: 1 }), {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      return { regio, treffers: 0, afgekapt: false, fout: res.status === 429 ? 'Adzuna: te veel verzoeken' : `Adzuna: HTTP ${res.status}` }
    }
    const data = (await res.json()) as { count?: unknown }
    const treffers = typeof data?.count === 'number' ? data.count : 0
    return { regio, treffers, afgekapt: treffers > plafond }
  } catch (err) {
    return { regio, treffers: 0, afgekapt: false, fout: err instanceof Error ? err.message : String(err) }
  }
}

/** Haalt één regio volledig op. Gooit niet: de uitkomst draagt zijn eigen fouten. */
async function haalRegio(regio: RegionCode, zoek: Zoekopdracht): Promise<SourceResult<RawJob>> {
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
      const res = await fetch(bouwUrl(regio, pagina, zoek), { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        warnings.push(`${regio}: HTTP ${res.status} op pagina ${pagina} — regio deels opgehaald`)
        afgebrokenDoorFout = true
        break
      }
      data = (await res.json()) as AdzunaResponse
    } catch (err) {
      warnings.push(`${regio}: ${err instanceof Error ? err.message : String(err)} op pagina ${pagina}`)
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
          ? `${regio}: ${opgehaald} van ${totaalBijBron} vacatures opgehaald ` +
            `(plafond ${ADZUNA_SEARCH.maxPaginas} pagina's × ${ADZUNA_SEARCH.resultatenPerPagina})`
          : `${regio}: ${opgehaald} vacatures opgehaald en het plafond geraakt ` +
            `(${ADZUNA_SEARCH.maxPaginas} pagina's); de bron meldde geen totaal, dus er kan meer zijn`
      )
    }
    if (buitenRegio > 0) {
      warnings.push(`${regio}: ${buitenRegio} vacatures buiten de regio laten vallen (zoekstraal loopt over de grens)`)
    }
    return { items, warnings }
  }
}

export const adzunaSource: JobSource = {
  name: 'adzuna',

  async fetch({ regions, zoek = standaardZoekopdracht() }: FetchParams): Promise<SourceResult<RawJob>> {
    if (isMockMode()) {
      return { items: ADZUNA_JOB_FIXTURES.filter((job) => regions.includes(job.region)), warnings: ['adzuna: MOCK-MODUS — dit zijn verzonnen vacatures, geen echte'] }
    }

    // Geen sleutels en geen mock-vlag: niets ophalen en dat zeggen. Stil fixtures serveren
    // zou verzonnen vacatures als echte in de database zetten.
    if (!heeftSleutels()) {
      return { items: [], warnings: ['adzuna: ADZUNA_APP_ID/ADZUNA_APP_KEY ontbreken — niets opgehaald'] }
    }

    // Per regio afzonderlijk, en fouten reizen mee in plaats van de hele bron te vellen.
    const perRegio = await Promise.all(regions.map((regio) => haalRegio(regio, zoek)))
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
