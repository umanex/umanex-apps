/**
 * Leest de KBO Open Data-dump en levert kandidaat-leads.
 *
 * Dit is de importer-kant van wat `scripts/kbo-meting.ts` alleen telt. De filters zijn hier
 * geen keuzes maar gevolgen, en elk heeft een reden die je in de code moet kunnen terugvinden:
 *
 *  - HOOFDACTIVITEIT       een boekhoudkantoor met softwareontwikkeling als nevenactiviteit is
 *                          geen softwarebedrijf. Gemeten: 197.473 van de 659.520 rijen zijn SECO.
 *  - ONDERNEMINGSNUMMER    activity.csv mengt ondernemingen en vestigingseenheden in dezelfde
 *                          kolom. Zonder scheiding tel je vestigingen als bedrijven.
 *  - ÉÉN NACE-VERSIE       dezelfde entiteit staat in 2003, 2008 én 2025 naast elkaar.
 *  - RECHTSPERSOON         licentie art. 2.2 verbiedt direct marketing op persoonsgegevens, en
 *                          van een eenmanszaak is álles persoonsgegeven. Gemeten: dat filtert
 *                          13.937 van de 56.311 weg, en die vallen sowieso buiten de doelgroep.
 *  - MAATSCHAPPELIJKE ZETEL  REGO, en niet doorgehaald; anders krijg je oude adressen mee.
 *
 * Het personeelsbestand zit hier NIET in — dat staat bij de NBB, niet bij de KBO. Elke rij komt
 * dus terug met `werknemers: undefined`: deze bron zegt er niets over. Dat is iets anders dan
 * `null`, wat betekent dat het opgevraagd is en niet gevonden.
 */
import { join } from 'node:path'
import type { RawLead } from './types'
import type { RegionCode } from '../regions'
import { REGIONS } from '../regions'
import {
  leesCsv, normaliseerNummer, isOndernemingsnummer, schoonWebadres,
  leesBelgischePostcode, isBelgischAdres,
} from './kbo-csv'

/** NACE-divisies die de doelgroep afbakenen, als kale prefix zonder punt. */
export const NACE_PREFIXEN = ['62', '582', '63'] as const

/** De versie waarop gefilterd wordt. Eén kiezen is verplicht; mengen telt dubbel. */
export const NACE_VERSIE = '2025'

/** TypeOfEnterprise uit enterprise.csv: 1 is natuurlijk persoon, 2 is rechtspersoon. */
const RECHTSPERSOON = '2'

export type DumpOpties = {
  regions: RegionCode[]
  /** Overschrijfbaar zodat een suite een andere versie kan uitrijden. */
  naceVersie?: string
}

export type DumpStatistiek = {
  snapshot: string | null
  extract: string | null
  naceKandidaten: number
  rechtspersonen: number
  metZetel: number
  binnenRegios: number
  metWebadres: number
  perRegio: Record<string, number>
}

export type DumpResultaat = {
  leads: RawLead[]
  statistiek: DumpStatistiek
  warnings: string[]
}

const regioVoorPostcode = (postcode: number, toegestaan: RegionCode[]): RegionCode | null => {
  for (const code of toegestaan) {
    const r = REGIONS[code]
    if (postcode >= r.postcodeMin && postcode <= r.postcodeMax) return code
  }
  return null
}

export async function leesKboDump(map: string, opties: DumpOpties): Promise<DumpResultaat> {
  const versie = opties.naceVersie ?? NACE_VERSIE
  const pad = (naam: string) => join(map, naam)
  const warnings: string[] = []

  // meta.csv — de extractdatum is verplicht bij bronvermelding (licentie art. 2.8).
  let snapshot: string | null = null
  let extract: string | null = null
  await leesCsv(pad('meta.csv'), (r) => {
    if (r.Variable === 'SnapshotDate') snapshot = r.Value ?? null
    if (r.Variable === 'ExtractNumber') extract = r.Value ?? null
  })
  if (snapshot === null) warnings.push('kbo: geen SnapshotDate in meta.csv — bronvermelding wordt onvolledig')

  // activity.csv — de kandidaten, en meteen hun NACE-code.
  const nace = new Map<string, string>()
  await leesCsv(pad('activity.csv'), (r) => {
    if (r.NaceVersion !== versie) return
    if ((r.Classification || '').toUpperCase() !== 'MAIN') return
    const code = normaliseerNummer(r.NaceCode)
    if (!NACE_PREFIXEN.some((p) => code.startsWith(p))) return
    const nummer = normaliseerNummer(r.EntityNumber)
    if (!isOndernemingsnummer(nummer)) return
    if (!nace.has(nummer)) nace.set(nummer, code)
  })
  const naceKandidaten = nace.size

  // enterprise.csv — alleen rechtspersonen.
  const rechtspersonen = new Set<string>()
  await leesCsv(pad('enterprise.csv'), (r) => {
    const nummer = normaliseerNummer(r.EnterpriseNumber)
    if (!nace.has(nummer)) return
    if (r.TypeOfEnterprise !== RECHTSPERSOON) return
    rechtspersonen.add(nummer)
  })

  // address.csv — maatschappelijke zetel, niet doorgehaald, binnen de gevraagde regio's.
  const adres = new Map<string, { postcode: number; regio: RegionCode }>()
  const perRegio: Record<string, number> = {}
  let metZetel = 0
  let buitenland = 0
  let onleesbarePostcode = 0
  await leesCsv(pad('address.csv'), (r) => {
    const nummer = normaliseerNummer(r.EntityNumber)
    if (!rechtspersonen.has(nummer)) return
    if (r.TypeOfAddress !== 'REGO') return
    if (r.DateStrikingOff) return
    // Twee onafhankelijke guards op "is dit België". Zie leesBelgischePostcode: zonder deze
    // kwamen 64 buitenlandse zetels als Belgische prospect binnen.
    if (!isBelgischAdres(r)) {
      buitenland++
      return
    }
    const postcode = leesBelgischePostcode(r.Zipcode)
    if (postcode === null) {
      onleesbarePostcode++
      return
    }
    metZetel++
    const regio = regioVoorPostcode(postcode, opties.regions)
    if (regio === null) return
    adres.set(nummer, { postcode, regio })
    perRegio[regio] = (perRegio[regio] ?? 0) + 1
  })

  // denomination.csv — de naam. Voorkeur voor de maatschappelijke benaming (TypeOfDenomination
  // '001'); een handelsnaam is een tweede keuze en beter dan niets.
  const naam = new Map<string, string>()
  const handelsnaam = new Map<string, string>()
  await leesCsv(pad('denomination.csv'), (r) => {
    const nummer = normaliseerNummer(r.EntityNumber)
    if (!adres.has(nummer)) return
    const waarde = (r.Denomination || '').trim()
    if (waarde === '') return
    if (r.TypeOfDenomination === '001') {
      if (!naam.has(nummer)) naam.set(nummer, waarde)
    } else if (!handelsnaam.has(nummer)) handelsnaam.set(nummer, waarde)
  })

  // contact.csv — het webadres, uitsluitend op ondernemingsniveau.
  const web = new Map<string, string>()
  await leesCsv(pad('contact.csv'), (r) => {
    if ((r.ContactType || '').toUpperCase() !== 'WEB') return
    const nummer = normaliseerNummer(r.EntityNumber)
    if (!adres.has(nummer)) return
    const schoon = schoonWebadres(r.Value ?? '')
    if (schoon !== null && !web.has(nummer)) web.set(nummer, schoon)
  })

  const leads: RawLead[] = []
  let zonderNaam = 0
  for (const [nummer, plek] of adres) {
    const bedrijfsnaam = naam.get(nummer) ?? handelsnaam.get(nummer)
    if (!bedrijfsnaam) {
      zonderNaam++
      continue
    }
    leads.push({
      externalId: `kbo:${nummer}`,
      companyName: bedrijfsnaam,
      postcode: plek.postcode,
      region: plek.regio,
      naceCode: nace.get(nummer) ?? null,
      url: web.get(nummer),
      source: 'kbo',
      signals: [],
      // De KBO weet dit niet. `undefined` en niet `null`: deze bron doet er geen uitspraak over.
      werknemers: undefined,
    })
  }
  if (buitenland > 0) warnings.push(`kbo: ${buitenland} zetels met een buitenlands adres overgeslagen`)
  if (onleesbarePostcode > 0) {
    warnings.push(`kbo: ${onleesbarePostcode} zetels met een niet-Belgische postcodevorm overgeslagen`)
  }
  if (zonderNaam > 0) {
    warnings.push(`kbo: ${zonderNaam} ondernemingen zonder benaming overgeslagen`)
  }

  return {
    leads,
    warnings,
    statistiek: {
      snapshot,
      extract,
      naceKandidaten,
      rechtspersonen: rechtspersonen.size,
      metZetel,
      binnenRegios: adres.size,
      metWebadres: web.size,
      perRegio,
    },
  }
}
