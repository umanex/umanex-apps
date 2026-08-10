import type { LeadSource, RawLead, SourceResult } from './types'
import type { RegionCode } from '../regions'
import { KBO_COMPANY_FIXTURES } from './fixtures/kbo-companies'

const isMockMode = () =>
  process.env.JOBRADAR_MOCK === '1' || !process.env.KBO_API_KEY

export const kboSource: LeadSource = {
  name: 'kbo',

  async fetch({ regions }: { regions: RegionCode[] }): Promise<SourceResult<RawLead>> {
    if (isMockMode()) {
      return { items: KBO_COMPANY_FIXTURES.filter((lead) => regions.includes(lead.region)), warnings: [] }
    }

    // Real KBO API path — implement when access is granted.
    // Geen throw meer: de bron levert nul rijen mét een leesbare reden. Een throw hier
    // maakte van een niet-gebouwde bron een gefaalde sync, en dat leest als een storing.
    return {
      items: [],
      warnings: ['kbo: live-modus bestaat nog niet — zet JOBRADAR_MOCK=1 voor fixtures'],
    }
  },
}
