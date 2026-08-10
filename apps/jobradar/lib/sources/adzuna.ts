import type { JobSource, RawJob, SourceResult } from './types'
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

const isMockMode = () =>
  process.env.JOBRADAR_MOCK === '1' ||
  !process.env.ADZUNA_APP_ID ||
  !process.env.ADZUNA_APP_KEY

function bouwUrl(regio: RegionCode, pagina: number): string {
  const anchor = REGIONS[regio].adzunaAnchor
  const url = new URL(
    `https://api.adzuna.com/v1/api/jobs/${ADZUNA_SEARCH.country}/search/${pagina}`
  )
  url.searchParams.set('app_id', process.env.ADZUNA_APP_ID!)
  url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY!)
  url.searchParams.set('what_or', ADZUNA_SEARCH.whatOr)
  url.searchParams.set('where', anchor.place)
  url.searchParams.set('distance', String(anchor.radiusKm))
  url.searchParams.set('results_per_page', String(ADZUNA_SEARCH.resultatenPerPagina))
  url.searchParams.set('max_days_old', String(ADZUNA_SEARCH.maxDagenOud))
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

/** Haalt één regio volledig op. Gooit niet: de uitkomst draagt zijn eigen fouten. */
async function haalRegio(regio: RegionCode): Promise<SourceResult<RawJob>> {
  const items: RawJob[] = []
  const warnings: string[] = []
  let buitenRegio = 0
  let totaalBijBron: number | undefined

  for (let pagina = 1; pagina <= ADZUNA_SEARCH.maxPaginas; pagina++) {
    let data: AdzunaResponse
    try {
      const res = await fetch(bouwUrl(regio, pagina), { headers: { Accept: 'application/json' } })
      if (!res.ok) {
        warnings.push(`${regio}: HTTP ${res.status} op pagina ${pagina} — regio deels opgehaald`)
        break
      }
      data = (await res.json()) as AdzunaResponse
    } catch (err) {
      warnings.push(`${regio}: ${err instanceof Error ? err.message : String(err)} op pagina ${pagina}`)
      break
    }

    if (totaalBijBron === undefined) totaalBijBron = data.count
    const batch = data.results ?? []

    for (const item of batch) {
      const job = normaliseerAdzunaItem(item)
      if (job) items.push(job)
      else buitenRegio++
    }

    // Laatste pagina: de bron gaf er minder terug dan we vroegen.
    if (batch.length < ADZUNA_SEARCH.resultatenPerPagina) return afronden()
  }

  return afronden()

  function afronden(): SourceResult<RawJob> {
    // Geen stille afkapping: wie het plafond raakt, hoort dat te weten.
    const opgehaald = items.length + buitenRegio
    if (totaalBijBron !== undefined && totaalBijBron > opgehaald) {
      warnings.push(
        `${regio}: ${opgehaald} van ${totaalBijBron} vacatures opgehaald ` +
          `(plafond ${ADZUNA_SEARCH.maxPaginas} pagina's × ${ADZUNA_SEARCH.resultatenPerPagina})`
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

  async fetch({ regions }: { regions: RegionCode[] }): Promise<SourceResult<RawJob>> {
    if (isMockMode()) {
      return { items: ADZUNA_JOB_FIXTURES.filter((job) => regions.includes(job.region)), warnings: [] }
    }

    // Per regio afzonderlijk, en fouten reizen mee in plaats van de hele bron te vellen.
    const perRegio = await Promise.all(regions.map((regio) => haalRegio(regio)))

    return {
      items: perRegio.flatMap((r) => r.items),
      warnings: perRegio.flatMap((r) => r.warnings),
    }
  },
}
