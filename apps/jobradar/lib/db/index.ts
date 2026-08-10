import 'server-only'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { SCHEMA_DDL, pasKolomMigratiesToe } from './ddl'

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

  // Eén bron voor het schema: `ddl.ts` draagt hem, zodat de suite hetzelfde schema
  // kan opzetten op een :memory:-database in plaats van deze te openen.
  sqlite.exec(SCHEMA_DDL)
  pasKolomMigratiesToe(sqlite)

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
