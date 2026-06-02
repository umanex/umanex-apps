import type { JobSource, RawJob } from './types'
import { REGIONS, type RegionCode } from '../regions'
import { ADZUNA_JOB_FIXTURES } from './fixtures/adzuna-jobs'
import { ADZUNA_SEARCH } from '../config/profile'

type AdzunaItem = {
  id: string
  title: string
  company: { display_name: string }
  redirect_url: string
  description: string
  created: string
}

type AdzunaResponse = {
  results: AdzunaItem[]
  count: number
}

const isMockMode = () =>
  process.env.JOBRADAR_MOCK === '1' ||
  !process.env.ADZUNA_APP_ID ||
  !process.env.ADZUNA_APP_KEY

export const adzunaSource: JobSource = {
  name: 'adzuna',

  async fetch({ regions }: { regions: RegionCode[] }): Promise<RawJob[]> {
    if (isMockMode()) {
      return ADZUNA_JOB_FIXTURES.filter((job) => regions.includes(job.region))
    }

    const results: RawJob[] = []

    for (const region of regions) {
      const anchor = REGIONS[region].adzunaAnchor
      const url = new URL('https://api.adzuna.com/v1/api/jobs/be/search/1')
      url.searchParams.set('app_id', process.env.ADZUNA_APP_ID!)
      url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY!)
      url.searchParams.set('what_or', ADZUNA_SEARCH.whatOr)
      url.searchParams.set('where', anchor.place)
      url.searchParams.set('distance', String(anchor.radiusKm))
      url.searchParams.set('results_per_page', '50')

      const res = await fetch(url.toString(), {
        headers: { Accept: 'application/json' },
      })
      if (!res.ok) throw new Error(`Adzuna ${region}: HTTP ${res.status}`)

      const data = (await res.json()) as AdzunaResponse
      for (const item of data.results ?? []) {
        results.push({
          externalId: String(item.id),
          title: item.title,
          company: item.company?.display_name ?? 'Onbekend',
          postcode: 0,
          region,
          url: item.redirect_url,
          source: 'adzuna',
          description: item.description ?? '',
          postedAt: item.created,
        })
      }
    }

    return results
  },
}
