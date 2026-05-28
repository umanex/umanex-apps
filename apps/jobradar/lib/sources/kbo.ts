import type { LeadSource, RawLead } from './types'
import type { RegionCode } from '../regions'
import { KBO_COMPANY_FIXTURES } from './fixtures/kbo-companies'

const isMockMode = () =>
  process.env.JOBRADAR_MOCK === '1' || !process.env.KBO_API_KEY

export const kboSource: LeadSource = {
  name: 'kbo',

  async fetch({ regions }: { regions: RegionCode[] }): Promise<RawLead[]> {
    if (isMockMode()) {
      return KBO_COMPANY_FIXTURES.filter((lead) => regions.includes(lead.region))
    }

    // Real KBO API path — implement when access is granted
    throw new Error('KBO live mode not yet implemented — set JOBRADAR_MOCK=1')
  },
}
