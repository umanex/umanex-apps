import type { FetchParams, LeadSource, RawLead, SourceResult } from './types'
import type { RegionCode } from '../regions'
import { KBO_COMPANY_FIXTURES } from './fixtures/kbo-companies'

/**
 * Alleen bij een expliciete vlag. Een ontbrekende sleutel is géén reden om fixtures te
 * serveren: dat zette tien verzonnen bedrijven in de echte database, met namen die op
 * bestaande bedrijven lijken, en het was aan niets te zien. Opgeruimde mock-rijen kwamen
 * bij de eerstvolgende sync gewoon terug.
 */
const isMockMode = () => process.env.JOBRADAR_MOCK === '1'

export const kboSource: LeadSource = {
  name: 'kbo',

  async fetch({ regions }: FetchParams): Promise<SourceResult<RawLead>> {
    if (isMockMode()) {
      return {
        items: KBO_COMPANY_FIXTURES.filter((lead) => regions.includes(lead.region)),
        warnings: ['kbo: MOCK-MODUS — dit zijn verzonnen bedrijven, geen echte'],
      }
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
