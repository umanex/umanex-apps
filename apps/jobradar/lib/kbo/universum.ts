/**
 * De prospect-selectie als één verklaring.
 *
 * Waarom hier en niet in de query: de selectie is een productbeslissing, geen technisch
 * detail. Wie wil weten wat een prospect ís, leest dit bestand — niet een WHERE-clausule
 * die verspreid staat over een route, een component en een script. De TC-EBC
 * `briefings/2026-08-29-feature-kbo-prospects.tcebc.md` draagt het waarom.
 *
 * Bewust géén databaseverbinding in dit bestand: het bouwt SQL en parameters, meer niet.
 * Daardoor kan de scenario-suite de selectie toetsen zonder een spiegel van 3,6 GB.
 */
import { REGIONS, type RegionCode } from '../regions'

/**
 * NACE 2025, hoofdactiviteit. Keuze van Jeroen op 2026-08-29, gemeten op extract 466:
 * 62100 (4.667) · 62200 (8.902) · 62900 (923) · 58290 (356) · 63910 (331) · 58210 (30).
 * De unie is 14.613 en niet de optelsom 15.209, want 97 ondernemingen dragen er twee.
 *
 * 62200 is met bijna twee derde de grootste groep en tegelijk de minst product-achtige
 * (consultancy en beheer van computerfaciliteiten). Die eruit halen levert 6.107 over —
 * één regel hier, mocht het tabblad daarnaar vragen.
 */
export const PROSPECT_NACE = ['62100', '62200', '62900', '58290', '63910', '58210'] as const

/**
 * Verkorte NL-labels voor de kaart. De officiële omschrijvingen uit `code.csv` zijn tot
 * negentig tekens lang ("Activiteiten op het gebied van computerconsultancy en beheer van
 * computerfaciliteiten") en breken de kaartlayout. Alleen de zes uit de selectie staan hier;
 * een code buiten de selectie komt niet op een prospectkaart.
 */
export const NACE_LABEL: Record<string, string> = {
  '62100': 'Programmatuur ontwerpen',
  '62200': 'IT-consultancy en beheer',
  '62900': 'Overige IT-diensten',
  '58290': 'Software uitgeven',
  '63910': 'Webportalen',
  '58210': 'Computerspellen uitgeven',
}

/** De extracts dragen 2003, 2008 én 2025 naast elkaar. 2025 is de vigerende. */
export const NACE_VERSIE = '2025'

/**
 * KBO registreert deze activiteitengroep alleen bij werkgevers. Het is het enige signaal in
 * de dataset dat "heeft personeel" zegt — er is geen personeelsaantal. Van de 14.613 heeft
 * er 2.903 zo'n registratie; de rest is eenmanszaak of vennootschap zonder loonlijst.
 */
export const RSZ_GROEP = '006'

/** Zetel-adres. Gemeten: ondernemingen hebben er precies één, en altijd van dit type. */
export const ZETEL = 'REGO'

export const NAAM = '001'
export const HANDELSNAAM = '003'
export const NEDERLANDS = '2'

export const PAGINA_GROOTTE = 60

export type ProspectFilter = {
  regions: RegionCode[]
  zoek?: string
  /** De RSZ-zeef. Standaard aan; zonder hem is het tabblad grotendeels eenmanszaken. */
  alleenWerkgevers: boolean
  /** 1-gebaseerd. */
  pagina: number
}

export type ProspectRij = {
  nummer: string
  naam: string
  handelsnaam: string | null
  opgericht: string | null
  postcode: string | null
  gemeente: string | null
  /** Komma-gescheiden NACE-codes uit de selectie; de kaart splitst ze. */
  codes: string | null
  website: string | null
  werkgever: number
}

/** `(zip BETWEEN ? AND ? OR …)` voor de gekozen regio's, plus de parameters. */
function regioClausule(regions: RegionCode[]): { sql: string; params: number[] } {
  const gekozen = regions.filter((r) => r in REGIONS)
  if (!gekozen.length) {
    // Geen enkele regio gekozen betekent nul resultaten, niet "alles". Een filter dat bij
    // een lege keuze de hele set teruggeeft, is precies andersom dan een gebruiker verwacht.
    return { sql: '0', params: [] }
  }
  const delen: string[] = []
  const params: number[] = []
  for (const code of gekozen) {
    delen.push('(CAST(ad.Zipcode AS INTEGER) BETWEEN ? AND ?)')
    params.push(REGIONS[code].postcodeMin, REGIONS[code].postcodeMax)
  }
  return { sql: `(${delen.join(' OR ')})`, params }
}

const naamSubquery = (type: string) =>
  `(SELECT d.Denomination FROM denomination d
     WHERE d.EntityNumber = e.EnterpriseNumber AND d.TypeOfDenomination = '${type}'
     ORDER BY (d.Language = '${NEDERLANDS}') DESC LIMIT 1)`

/**
 * Bouwt de selectie. `tellen` levert dezelfde WHERE met een COUNT ervoor — twee queries uit
 * één verklaring, zodat de teller en de lijst niet uiteen kunnen lopen.
 */
export function bouwProspectSql(
  filter: ProspectFilter,
  opties: { tellen?: boolean } = {}
): { sql: string; params: unknown[] } {
  // Parameters zijn positioneel, en de SELECT-lijst staat vóór de WHERE in de string.
  // Twee aparte lijsten die pas aan het eind samenkomen, want anders hangt de volgorde af
  // van de volgorde waarin dit bestand toevallig geschreven is.
  const selectParams: unknown[] = []
  const params: unknown[] = []
  const waar: string[] = ["e.Status = 'AC'"]

  const codes = PROSPECT_NACE
  waar.push(
    `EXISTS (SELECT 1 FROM activity a
       WHERE a.EntityNumber = e.EnterpriseNumber
         AND a.NaceVersion = ?
         AND a.Classification = 'MAIN'
         AND a.NaceCode IN (${codes.map(() => '?').join(', ')}))`
  )
  params.push(NACE_VERSIE, ...codes)

  const regio = regioClausule(filter.regions)
  waar.push(regio.sql)
  params.push(...regio.params)

  if (filter.alleenWerkgevers) {
    waar.push(`EXISTS (SELECT 1 FROM activity r WHERE r.EntityNumber = e.EnterpriseNumber AND r.ActivityGroup = ?)`)
    params.push(RSZ_GROEP)
  }

  const term = filter.zoek?.trim()
  if (term) {
    waar.push(
      `EXISTS (SELECT 1 FROM denomination dz
         WHERE dz.EntityNumber = e.EnterpriseNumber AND dz.Denomination LIKE ? COLLATE NOCASE)`
    )
    params.push(`%${term}%`)
  }

  const van = `FROM enterprise e
      JOIN address ad ON ad.EntityNumber = e.EnterpriseNumber AND ad.TypeOfAddress = '${ZETEL}'
     WHERE ${waar.join('\n       AND ')}`

  if (opties.tellen) {
    return { sql: `SELECT COUNT(*) AS n ${van}`, params }
  }

  // De codes verschijnen een tweede keer, nu in de SELECT-lijst.
  selectParams.push(...codes)

  const pagina = Math.max(1, Math.trunc(filter.pagina || 1))
  const paginaParams = [PAGINA_GROOTTE, (pagina - 1) * PAGINA_GROOTTE]

  return {
    sql: `SELECT e.EnterpriseNumber AS nummer,
             ${naamSubquery(NAAM)} AS naam,
             ${naamSubquery(HANDELSNAAM)} AS handelsnaam,
             e.StartDate AS opgericht,
             ad.Zipcode AS postcode,
             ad.MunicipalityNL AS gemeente,
             (SELECT group_concat(DISTINCT a2.NaceCode) FROM activity a2
               WHERE a2.EntityNumber = e.EnterpriseNumber
                 AND a2.NaceVersion = '${NACE_VERSIE}' AND a2.Classification = 'MAIN'
                 AND a2.NaceCode IN (${codes.map(() => '?').join(', ')})) AS codes,
             (SELECT c.Value FROM contact c
               WHERE c.EntityNumber = e.EnterpriseNumber AND c.ContactType = 'WEB' LIMIT 1) AS website,
             EXISTS (SELECT 1 FROM activity r
               WHERE r.EntityNumber = e.EnterpriseNumber AND r.ActivityGroup = '${RSZ_GROEP}') AS werkgever
        ${van}
        ORDER BY e.StartDate DESC, e.EnterpriseNumber
        LIMIT ? OFFSET ?`,
    params: [...selectParams, ...params, ...paginaParams],
  }
}

/** Jaren sinds oprichting, of null wanneer KBO geen datum heeft. */
export function leeftijdInJaren(opgericht: string | null, vandaag: string): number | null {
  if (!opgericht) return null
  const start = Date.parse(opgericht)
  const nu = Date.parse(vandaag)
  if (Number.isNaN(start) || Number.isNaN(nu)) return null
  return Math.floor((nu - start) / (365.2425 * 24 * 60 * 60 * 1000))
}
