import type { RegionCode } from '../regions'
import type { Zoekopdracht } from '../settings'

export type RawJob = {
  externalId: string
  title: string
  company: string
  /** 0 = onbekend. Adzuna levert geen postcode; daar draagt `city` de plaatsinfo. */
  postcode: number
  /** Plaatsnaam zoals de bron hem geeft. `null` als de bron er geen levert. */
  city: string | null
  region: RegionCode
  url: string
  source: string
  description: string
  postedAt: string
}

export type RawLead = {
  externalId: string
  companyName: string
  postcode: number
  region: RegionCode
  naceCode: string | null
  url?: string
  source: string
  signals: string[]
}

/**
 * Wat een bron teruggeeft: de rijen én wat er onderweg misging.
 *
 * De waarschuwingen zijn geen decoratie. Een bron haalt per regio op, en één regio die
 * faalt mag de andere niet meeslepen — vóór deze vorm zat de `throw` in de regio-lus en
 * gooide een 429 op Brussel ook de al opgehaalde Vlaamse resultaten weg. Hetzelfde geldt
 * voor afkappingen: een pagineringsplafond dat stil dichtklapt, leest als volledige dekking.
 */
export type SourceResult<T> = {
  items: T[]
  warnings: string[]
}

/**
 * `zoek` is optioneel zodat een bron die er niets mee doet hem kan negeren, en zodat een
 * aanroeper zonder database (een test, een telling) de standaard krijgt.
 */
export type FetchParams = { regions: RegionCode[]; zoek?: Zoekopdracht }

export interface JobSource {
  name: string
  fetch(params: FetchParams): Promise<SourceResult<RawJob>>
}

export interface LeadSource {
  name: string
  fetch(params: FetchParams): Promise<SourceResult<RawLead>>
}
