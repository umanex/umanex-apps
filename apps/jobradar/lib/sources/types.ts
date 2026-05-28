import type { RegionCode } from '../regions'

export type RawJob = {
  externalId: string
  title: string
  company: string
  postcode: number
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
  naceCode: string
  url?: string
  source: string
  signals: string[]
}

export interface JobSource {
  name: string
  fetch(params: { regions: RegionCode[] }): Promise<RawJob[]>
}

export interface LeadSource {
  name: string
  fetch(params: { regions: RegionCode[] }): Promise<RawLead[]>
}
