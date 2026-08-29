import 'server-only'
import { existsSync } from 'fs'
import { join } from 'path'
import Database from 'better-sqlite3'
import { kboDatum } from './csv'
import { bouwProspectSql, PAGINA_GROOTTE, type ProspectFilter, type ProspectRij } from './universum'

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

/** Vanaf hier noemen we de spiegel verouderd. De bron levert elke dag een nieuwe extract. */
export const VEROUDERD_NA_DAGEN = 7

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

/** Alleen de staat, zonder query — voor een scherm dat wil melden dat de spiegel ontbreekt. */
export function leesStaat(vandaag: string): SpiegelStaat {
  const db = open()
  return db ? staatVan(db, vandaag) : { soort: 'ontbreekt', pad: PAD() }
}
