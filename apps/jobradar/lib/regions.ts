export type RegionCode = 'WVL' | 'OVL' | 'BRU'

export const REGIONS: Record<
  RegionCode,
  {
    label: string
    postcodeMin: number
    postcodeMax: number
    nisCode: number
    adzunaAnchor: { place: string; radiusKm: number }
  }
> = {
  WVL: {
    label: 'West-Vlaanderen',
    postcodeMin: 8000,
    postcodeMax: 8999,
    nisCode: 30000,
    adzunaAnchor: { place: 'Brugge', radiusKm: 30 },
  },
  OVL: {
    label: 'Oost-Vlaanderen',
    postcodeMin: 9000,
    postcodeMax: 9999,
    nisCode: 40000,
    adzunaAnchor: { place: 'Gent', radiusKm: 25 },
  },
  BRU: {
    label: 'Brussel',
    postcodeMin: 1000,
    postcodeMax: 1299,
    nisCode: 21000,
    adzunaAnchor: { place: 'Brussel', radiusKm: 15 },
  },
}

export function regionForPostcode(pc: number): RegionCode | null {
  for (const [code, region] of Object.entries(REGIONS) as [RegionCode, (typeof REGIONS)[RegionCode]][]) {
    if (pc >= region.postcodeMin && pc <= region.postcodeMax) return code
  }
  return null
}
