import 'server-only'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

type DbClient = ReturnType<typeof createClient>

let client: DbClient | undefined

function createClient() {
  const dbPath = process.env.JOBRADAR_DB_PATH ?? join(process.cwd(), '.data', 'jobradar.db')

  // De map van het gekozen pad, niet altijd `<cwd>/.data` — anders wijst JOBRADAR_DB_PATH
  // ergens heen waar de map nooit wordt aangemaakt en `new Database()` eronder omvalt.
  mkdirSync(dirname(dbPath), { recursive: true })

  const sqlite = new Database(dbPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')

  // Auto-initialize schema on first run (idempotent via IF NOT EXISTS)
  sqlite.exec(`
  CREATE TABLE IF NOT EXISTS jobs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL,
    source TEXT NOT NULL,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    postcode INTEGER NOT NULL,
    city TEXT,
    region TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    posted_at TEXT NOT NULL,
    dedupe_hash TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    job_status TEXT NOT NULL DEFAULT 'new',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedupe_hash_idx ON jobs (dedupe_hash);
  CREATE INDEX IF NOT EXISTS jobs_source_external_idx ON jobs (source, external_id);

  CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL,
    source TEXT NOT NULL,
    company_name TEXT NOT NULL,
    postcode INTEGER NOT NULL,
    region TEXT NOT NULL,
    nace_code TEXT,
    url TEXT,
    signals TEXT NOT NULL DEFAULT '[]',
    lead_score INTEGER NOT NULL DEFAULT 0,
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    rechtsgrond TEXT NOT NULL DEFAULT 'gerechtvaardigd belang',
    opt_out INTEGER NOT NULL DEFAULT 0,
    dedupe_hash TEXT NOT NULL,
    lead_status TEXT NOT NULL DEFAULT 'new',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS companies_dedupe_hash_idx ON companies (dedupe_hash);
  CREATE INDEX IF NOT EXISTS companies_source_external_idx ON companies (source, external_id);

  CREATE TABLE IF NOT EXISTS sync_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    jobs_added INTEGER NOT NULL DEFAULT 0,
    jobs_updated INTEGER NOT NULL DEFAULT 0,
    leads_added INTEGER NOT NULL DEFAULT 0,
    leads_updated INTEGER NOT NULL DEFAULT 0,
    source_statuses TEXT NOT NULL DEFAULT '{}'
  );
`)

  // Migrations for existing databases (idempotent via PRAGMA table_info check).
  // De CREATE TABLE hierboven draagt deze kolommen inmiddels zelf; deze checks zijn er
  // voor databases die van vóór die kolom dateren.
  type ColInfo = { name: string }
  const jobCols = (sqlite.prepare('PRAGMA table_info(jobs)').all() as ColInfo[]).map((c) => c.name)
  if (!jobCols.includes('job_status')) {
    sqlite.exec("ALTER TABLE jobs ADD COLUMN job_status TEXT NOT NULL DEFAULT 'new'")
  }
  if (!jobCols.includes('city')) {
    sqlite.exec('ALTER TABLE jobs ADD COLUMN city TEXT')
  }
  const companyCols = (sqlite.prepare('PRAGMA table_info(companies)').all() as ColInfo[]).map((c) => c.name)
  if (!companyCols.includes('lead_status')) {
    sqlite.exec("ALTER TABLE companies ADD COLUMN lead_status TEXT NOT NULL DEFAULT 'new'")
  }

  return drizzle(sqlite, { schema })
}

/**
 * Lazily opens the SQLite connection on first use and memoizes it per process.
 * Kept lazy so importing this module has no side effects — otherwise
 * `next build` opens the database while collecting page data, and parallel
 * build workers racing to create the same file throw
 * `SqliteError: database is locked`.
 */
export function getDb() {
  if (!client) client = createClient()
  return client
}
