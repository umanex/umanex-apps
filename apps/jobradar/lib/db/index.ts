import 'server-only'
import { join } from 'path'
import { mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const dbPath = process.env.JOBRADAR_DB_PATH ?? join(process.cwd(), '.data', 'jobradar.db')

mkdirSync(join(process.cwd(), '.data'), { recursive: true })

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
    region TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT,
    posted_at TEXT NOT NULL,
    dedupe_hash TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS jobs_dedupe_hash_idx ON jobs (dedupe_hash);

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
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS companies_dedupe_hash_idx ON companies (dedupe_hash);

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

export const db = drizzle(sqlite, { schema })
