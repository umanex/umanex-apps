import 'server-only'
import { existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { kboDatum } from './csv'
import { bouwProspectSql, NACE_LABEL, PAGINA_GROOTTE, type ProspectFilter, type ProspectRij } from './universum'
import { zoekOnderneming } from './koppeling'
import type { RegionCode } from '../regions'

/**
 * Leestoegang tot de KBO-spiegel.
 *
 * De spiegel is optioneel en wegwerpbaar: hij staat niet in git, wordt door
 * `pnpm --filter jobradar kbo:sync` gevuld en bij elke `--full` overschreven. De app moet
 * daarom zónder hem werken — een ontbrekende spiegel is een lege toestand mét uitleg, geen
 * crash en geen stille nul. Dat onderscheid is het hele punt: "geen prospects" en "geen
 * database" zien er in een lijst identiek uit en betekenen iets heel anders.
 */

const PAD = () => process.env.KBO_DB_PATH ?? join(process.cwd(), '.data', 'kbo.db')

export type SpiegelStaat =
  | { soort: 'ontbreekt'; pad: string }
  | { soort: 'ok'; snapshot: string | null; extract: string | null; ouderdomDagen: number | null }

export type ProspectResultaat = {
  staat: SpiegelStaat
  rijen: ProspectRij[]
  totaal: number
  pagina: number
  paginas: number
}

let verbinding: Database.Database | null = null

function open(): Database.Database | null {
  const pad = PAD()
  if (!existsSync(pad)) return null
  if (!verbinding) verbinding = new Database(pad, { readonly: true, fileMustExist: true })
  return verbinding
}

function staatVan(db: Database.Database, vandaag: string): SpiegelStaat {
  const lees = (sleutel: string) =>
    (db.prepare('SELECT waarde FROM kbo_meta WHERE sleutel = ?').get(sleutel) as { waarde?: string } | undefined)
      ?.waarde ?? null

  const snapshotRuw = lees('SnapshotDate')
  // kbo_meta bewaart de waarde zoals KBO hem schrijft (DD-MM-YYYY), niet ISO. Rechtstreeks
  // vergelijken zou "28-08-2026" naast "2026-08-29" leggen en altijd verouderd melden.
  const snapshot = snapshotRuw ? kboDatum(snapshotRuw) : null
  const ouderdom =
    snapshot === null ? null : Math.floor((Date.parse(vandaag) - Date.parse(snapshot)) / 86_400_000)

  return { soort: 'ok', snapshot, extract: lees('ExtractNumber'), ouderdomDagen: ouderdom }
}

export function haalProspects(filter: ProspectFilter, vandaag: string): ProspectResultaat {
  const db = open()
  if (!db) {
    return { staat: { soort: 'ontbreekt', pad: PAD() }, rijen: [], totaal: 0, pagina: 1, paginas: 0 }
  }

  const telling = bouwProspectSql(filter, { tellen: true })
  const totaal = (db.prepare(telling.sql).get(...telling.params) as { n: number }).n

  const lijst = bouwProspectSql(filter)
  const rijen = db.prepare(lijst.sql).all(...lijst.params) as ProspectRij[]

  return {
    staat: staatVan(db, vandaag),
    rijen,
    totaal,
    pagina: Math.max(1, Math.trunc(filter.pagina || 1)),
    paginas: Math.max(1, Math.ceil(totaal / PAGINA_GROOTTE)),
  }
}

export type KboVermoeden = {
  nummer: string
  kboNaam: string | null
  gemeente: string | null
  labels: string[]
  viaRegio: boolean
}

/**
 * Zoekt bij elk bedrijf het ondernemingsnummer, plus genoeg context om de gok na te kijken.
 *
 * Het is nadrukkelijk een vermóéden. Gemeten over de 27 echte leads: 12 gekoppeld, 0
 * dubbelzinnig, 15 niet gevonden — en één van die twaalf ("Smile Group") wees naar een
 * tandartspraktijk. De naam was uniek in KBO; uniek is niet juist. Daarom geeft deze functie
 * niet alleen het nummer terug maar ook de officiële naam, de gemeente en de hoofdactiviteit:
 * met die drie herken je een misser in één oogopslag.
 *
 * Bij het renderen aanroepen kost niets — 0,1 ms per opzoeking — en wat niet opgeslagen wordt,
 * kan niet verouderen ten opzichte van de spiegel.
 */
export function koppelBedrijven(
  bedrijven: { naam: string; regio?: RegionCode }[]
): Map<string, KboVermoeden> {
  const db = open()
  const uit = new Map<string, KboVermoeden>()
  if (!db) return uit

  const naamVan = db.prepare(
    `SELECT Denomination AS d FROM denomination
      WHERE EntityNumber = ? AND TypeOfDenomination = '001'
      ORDER BY (Language = '2') DESC LIMIT 1`
  )
  const adresVan = db.prepare(
    `SELECT Zipcode AS z, MunicipalityNL AS m FROM address WHERE EntityNumber = ? LIMIT 1`
  )
  const naceVan = db.prepare(
    `SELECT DISTINCT NaceCode AS c FROM activity
      WHERE EntityNumber = ? AND NaceVersion = '2025' AND Classification = 'MAIN'`
  )

  for (const bedrijf of bedrijven) {
    if (uit.has(bedrijf.naam)) continue
    const gevonden = zoekOnderneming(db, bedrijf.naam, bedrijf.regio)
    if (gevonden.soort !== 'gevonden') continue

    const adres = adresVan.get(gevonden.nummer) as { z?: string; m?: string } | undefined
    const codes = (naceVan.all(gevonden.nummer) as { c: string }[]).map((r) => r.c)
    uit.set(bedrijf.naam, {
      nummer: gevonden.nummer,
      kboNaam: ((naamVan.get(gevonden.nummer) as { d?: string } | undefined)?.d ?? null),
      gemeente: adres?.m ?? null,
      // Alleen de codes uit onze selectie krijgen een label; de rest toont zijn cijfers, want
      // juist een code buiten de selectie (86230 — tandartsen) verraadt een foute koppeling.
      labels: codes.map((c) => NACE_LABEL[c] ?? c),
      viaRegio: gevonden.viaRegio,
    })
  }

  return uit
}
