import type { JobSource, RawJob } from './types'
import type { RegionCode } from '../regions'
import { ADZUNA_JOB_FIXTURES } from './fixtures/adzuna-jobs'

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

    // Real API path — implement when keys are available
    const results: RawJob[] = []

    for (const region of regions) {
      const { REGIONS } = await import('../regions')
      const anchor = REGIONS[region].adzunaAnchor
      const url = new URL(
        `https://api.adzuna.com/v1/api/jobs/be/search/1`
      )
      url.searchParams.set('app_id', process.env.ADZUNA_APP_ID!)
      url.searchParams.set('app_key', process.env.ADZUNA_APP_KEY!)
      url.searchParams.set('what', 'UX designer frontend')
      url.searchParams.set('where', anchor.place)
      url.searchParams.set('distance', String(anchor.radiusKm))
      url.searchParams.set('results_per_page', '50')
      url.searchParams.set('content-type', 'application/json')

      const res = await fetch(url.toString())
      if (!res.ok) throw new Error(`Adzuna ${region}: HTTP ${res.status}`)

      const data = await res.json()
      for (const item of data.results ?? []) {
        results.push({
          externalId: String(item.id),
          title: item.title,
          company: item.company?.display_name ?? 'Onbekend',
          postcode: 0, // parse from location
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
