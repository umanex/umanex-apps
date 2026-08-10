export type RegionCode = 'WVL' | 'OVL' | 'BRU'

export const REGIONS: Record<
  RegionCode,
  {
    label: string
    postcodeMin: number
    postcodeMax: number
    nisCode: number
    adzunaAnchor: { place: string; radiusKm: number }
    /**
     * Wat Adzuna in `location.area[1]` zet voor deze regio. Gemeten op de live API
     * (2026-08-10): "West-Vlaanderen (Provincie)", "Oost-Vlaanderen (Provincie)",
     * "Brussel (Regio)". Niet afgeleid — de exacte spelling komt uit de respons zelf.
     */
    adzunaAreas: string[]
  }
> = {
  WVL: {
    label: 'West-Vlaanderen',
    postcodeMin: 8000,
    postcodeMax: 8999,
    nisCode: 30000,
    adzunaAnchor: { place: 'Brugge', radiusKm: 30 },
    adzunaAreas: ['West-Vlaanderen'],
  },
  OVL: {
    label: 'Oost-Vlaanderen',
    postcodeMin: 9000,
    postcodeMax: 9999,
    nisCode: 40000,
    adzunaAnchor: { place: 'Gent', radiusKm: 25 },
    adzunaAreas: ['Oost-Vlaanderen'],
  },
  BRU: {
    label: 'Brussel',
    postcodeMin: 1000,
    postcodeMax: 1299,
    nisCode: 21000,
    adzunaAnchor: { place: 'Brussel', radiusKm: 15 },
    adzunaAreas: ['Brussel', 'Bruxelles'],
  },
}

export const ALL_REGIONS: RegionCode[] = ['WVL', 'OVL', 'BRU']

export function regionForPostcode(pc: number): RegionCode | null {
  for (const [code, region] of Object.entries(REGIONS) as [RegionCode, (typeof REGIONS)[RegionCode]][]) {
    if (pc >= region.postcodeMin && pc <= region.postcodeMax) return code
  }
  return null
}

/**
 * Zoekt de regio bij een Adzuna `location.area`-lijst.
 *
 * Dit bestaat omdat de zoekstraal rond een anker de provinciegrens overschrijdt: een
 * query op Gent (25 km) levert vacatures in Dentergem (West-Vlaanderen), en een query op
 * Brussel (15 km) levert er in Vlaams-Brabant. Wie de regio van de lús overneemt, stempelt
 * die vacatures verkeerd — gemeten op de live API: 7 van de 50 Brusselse resultaten lagen
 * buiten het Brussels Gewest.
 *
 * `null` betekent "buiten de drie geconfigureerde regio's" en is een geldig antwoord: de
 * beller hoort die vacature te laten vallen en te tellen, niet alsnog ergens onder te
 * schuiven.
 *
 * Vlaams-Brabant is bewust géén vierde regio (beslissing Jeroen, 2026-08-10). De
 * Brussel-straal levert er vacatures uit — de bron meldt dat als waarschuwing — en die
 * vallen dus weg. Dat is de bedoeling, geen gat om later dicht te lopen.
 */
export function regionForArea(area: readonly string[] | undefined): RegionCode | null {
  if (!area?.length) return null
  for (const [code, region] of Object.entries(REGIONS) as [RegionCode, (typeof REGIONS)[RegionCode]][]) {
    for (const naam of region.adzunaAreas) {
      if (area.some((a) => a.toLowerCase().includes(naam.toLowerCase()))) return code
    }
  }
  return null
}
