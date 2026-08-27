/**
 * Invarianten op de schema-migratie naar versie 6 (classificatie, geclassificeerd_op, werknemers).
 *
 * Deze suite bestaat omdat een kolom-migratie stil kan falen op precies de plek waar het pijn
 * doet: een bestaande database. `SCHEMA_DDL` draait met `CREATE TABLE IF NOT EXISTS`, dus op een
 * tabel die al bestaat doet hij niets — de nieuwe kolommen komen daar uitsluitend van
 * `pasKolomMigratiesToe`. Een verse database toetsen bewijst dus niets over de database van de
 * gebruiker, en juist daar staan zijn 26 bedrijven in.
 *
 * Daarom toetst deze suite beide kanten: het verse pad én het migratiepad, met een oude tabel die
 * hier expliciet opgebouwd wordt zoals hij vóór versie 6 was.
 *
 * Draait op `:memory:`. Geen bestand, geen netwerk, per constructie onbereikbaar voor de
 * database van de gebruiker.
 *
 * Draaien: node --import ./scripts/ts-resolve.mjs scripts/schema-scenarios.ts
 */
import Database from 'better-sqlite3'
import { SCHEMA_DDL, pasKolomMigratiesToe } from '../lib/db/ddl'
import { SCHEMA_VERSION } from '../lib/db/schema'

let geslaagd = 0
let gezakt = 0

function check(naam: string, voorwaarde: boolean, detail = ''): void {
  if (voorwaarde) geslaagd++
  else {
    gezakt++
    console.error(`  FAIL  ${naam}${detail ? ` — ${detail}` : ''}`)
  }
}

type ColInfo = { name: string }

const kolommen = (db: InstanceType<typeof Database>, tabel: string): string[] =>
  (db.prepare(`PRAGMA table_info(${tabel})`).all() as ColInfo[]).map((c) => c.name)

const indexen = (db: InstanceType<typeof Database>, tabel: string): string[] =>
  (db.prepare(`PRAGMA index_list(${tabel})`).all() as { name: string }[]).map((i) => i.name)

const NIEUWE_KOLOMMEN = ['classificatie', 'geclassificeerd_op', 'werknemers'] as const

/**
 * De companies-tabel zoals hij vóór versie 6 bestond. Bewust letterlijk overgeschreven en niet
 * afgeleid uit SCHEMA_DDL: als iemand de DDL aanpast moet deze suite blijven meten wat er met
 * een échte oude database gebeurt, niet met een nieuwe die toevallig ook oud heet.
 */
const OUDE_COMPANIES_DDL = `
  CREATE TABLE companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    external_id TEXT NOT NULL,
    source TEXT NOT NULL,
    company_name TEXT NOT NULL,
    postcode INTEGER NOT NULL,
    region TEXT NOT NULL,
    nace_code TEXT,
    url TEXT,
    signals TEXT NOT NULL DEFAULT '[]',
    vacature_aantal INTEGER,
    design_vacatures INTEGER,
    dev_vacatures INTEGER,
    lead_score INTEGER NOT NULL DEFAULT 0,
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    rechtsgrond TEXT NOT NULL DEFAULT 'gerechtvaardigd belang',
    opt_out INTEGER NOT NULL DEFAULT 0,
    dedupe_hash TEXT NOT NULL,
    lead_status TEXT NOT NULL DEFAULT 'new',
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE TABLE jobs (
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
`

function verseDb(): InstanceType<typeof Database> {
  const db = new Database(':memory:')
  db.exec(SCHEMA_DDL)
  pasKolomMigratiesToe(db)
  return db
}

/** Een database zoals die van de gebruiker: oud schema, met een echte rij erin. */
function oudeDbMetRij(): InstanceType<typeof Database> {
  const db = new Database(':memory:')
  db.exec(OUDE_COMPANIES_DDL)
  db.prepare(
    `INSERT INTO companies
       (external_id, source, company_name, postcode, region, signals, lead_score,
        dedupe_hash, lead_status, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    'vacatures:cegeka',
    'vacatures',
    'Cegeka',
    9000,
    'OVL',
    '["dev-vacature zonder design"]',
    42,
    'hash-cegeka',
    'contacted',
    '2026-08-01T00:00:00.000Z',
    '2026-08-10T00:00:00.000Z'
  )
  return db
}

// ── Het verse pad ────────────────────────────────────────────────────────────
{
  const db = verseDb()
  const cols = kolommen(db, 'companies')

  check('SCHEMA_VERSION staat op 6', SCHEMA_VERSION === 6, String(SCHEMA_VERSION))
  for (const kolom of NIEUWE_KOLOMMEN) {
    check(`verse database draagt ${kolom}`, cols.includes(kolom), cols.join(', '))
  }
  check(
    'verse database draagt de classificatie-index',
    indexen(db, 'companies').includes('companies_classificatie_idx'),
    indexen(db, 'companies').join(', ')
  )
  db.close()
}

// ── De ECHTE openingsvolgorde op een bestaande database ──────────────────────
//
// Dit blok bestaat omdat de vorige versie van deze suite hem miste. Ze riep
// `pasKolomMigratiesToe` los aan op een handgebouwde oude tabel, en toetste daarmee de FUNCTIE
// in plaats van de VOLGORDE. `lib/db/index.ts` draait eerst SCHEMA_DDL en dán de migraties — en
// een CREATE INDEX op een nog-niet-bestaande kolom in SCHEMA_DDL liet elke bestaande database
// omvallen bij het openen, dus vóór er iets gelezen kon worden. Groen in de suite, stuk in
// productie: precies het gat dat een suite hoort te dichten.
{
  const db = oudeDbMetRij()
  let gooide: string | null = null
  try {
    db.exec(SCHEMA_DDL)
    pasKolomMigratiesToe(db)
  } catch (e) {
    gooide = e instanceof Error ? e.message : String(e)
  }
  check('SCHEMA_DDL + migraties op een bestaande database gooit niet', gooide === null, gooide ?? '')
  check(
    'en de kolommen staan er daarna',
    NIEUWE_KOLOMMEN.every((k) => kolommen(db, 'companies').includes(k)),
    kolommen(db, 'companies').join(', ')
  )
  check(
    'en de index ook',
    indexen(db, 'companies').includes('companies_classificatie_idx'),
    indexen(db, 'companies').join(', ')
  )
  let tweede: string | null = null
  try {
    db.exec(SCHEMA_DDL)
    pasKolomMigratiesToe(db)
  } catch (e) {
    tweede = e instanceof Error ? e.message : String(e)
  }
  check('en een tweede opening ook niet', tweede === null, tweede ?? '')
  db.close()
}

// ── Het migratiepad: een bestaande database van vóór versie 6 ────────────────
{
  const db = oudeDbMetRij()
  const voor = kolommen(db, 'companies')

  // Positieve controle op de opstelling zelf: zonder dit zou "de kolom is er na migratie"
  // ook groen zijn als hij er al vóór stond, en meet de suite niets.
  for (const kolom of NIEUWE_KOLOMMEN) {
    check(`opstelling: ${kolom} ontbreekt vóór de migratie`, !voor.includes(kolom), voor.join(', '))
  }

  pasKolomMigratiesToe(db)
  const na = kolommen(db, 'companies')

  for (const kolom of NIEUWE_KOLOMMEN) {
    check(`migratie voegt ${kolom} toe aan een bestaande tabel`, na.includes(kolom), na.join(', '))
  }
  check(
    'migratie legt ook de index aan op een bestaande tabel',
    indexen(db, 'companies').includes('companies_classificatie_idx'),
    indexen(db, 'companies').join(', ')
  )

  // De rij die er al stond moet de migratie ongeschonden doorkomen — dit is waarom de suite
  // bestaat. Zijn echte database draagt 26 van deze rijen.
  const rij = db.prepare('SELECT * FROM companies WHERE dedupe_hash = ?').get('hash-cegeka') as
    | Record<string, unknown>
    | undefined
  check('de bestaande rij overleeft de migratie', rij !== undefined)
  check('naam ongewijzigd', rij?.company_name === 'Cegeka', String(rij?.company_name))
  check('lead_status ongewijzigd', rij?.lead_status === 'contacted', String(rij?.lead_status))
  check('lead_score ongewijzigd', rij?.lead_score === 42, String(rij?.lead_score))
  check(
    'signalen ongewijzigd',
    rij?.signals === '["dev-vacature zonder design"]',
    String(rij?.signals)
  )

  // Null, niet leeg en niet nul. "Nog niet beoordeeld" en "niet geteld" moeten zichtbaar
  // verschillen van een oordeel en van een telling van nul.
  check('classificatie is null op een bestaande rij', rij?.classificatie === null, String(rij?.classificatie))
  check('geclassificeerd_op is null', rij?.geclassificeerd_op === null, String(rij?.geclassificeerd_op))
  check('werknemers is null, niet 0', rij?.werknemers === null, String(rij?.werknemers))

  // Idempotent: de migratie draait bij élke verbinding, dus een tweede keer mag niet gooien.
  let tweedeKeerGooide = false
  try {
    pasKolomMigratiesToe(db)
  } catch {
    tweedeKeerGooide = true
  }
  check('tweemaal migreren gooit niet', !tweedeKeerGooide)
  check('en verandert het kolommenaantal niet', kolommen(db, 'companies').length === na.length)

  db.close()
}

// ── De drie assen blijven gescheiden ─────────────────────────────────────────
{
  const db = verseDb()
  db.prepare(
    `INSERT INTO companies
       (external_id, source, company_name, postcode, region, dedupe_hash,
        lead_status, lead_score, classificatie, first_seen_at, last_seen_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run('kbo-1', 'kbo', 'Dienstverlener NV', 8000, 'WVL', 'h1', 'contacted', 88, 'dienstverlener', 'x', 'x')

  const rij = db.prepare('SELECT * FROM companies WHERE dedupe_hash = ?').get('h1') as Record<
    string,
    unknown
  >
  // Het geval dat bewijst dat de assen los staan: een dienstverlener met een hoge score die
  // al gecontacteerd is. Kan alleen bestaan als het drie kolommen zijn.
  check('een dienstverlener kan gecontacteerd zijn', rij.lead_status === 'contacted')
  check('en tegelijk hoog scoren', rij.lead_score === 88)
  check('zonder dat de classificatie meebeweegt', rij.classificatie === 'dienstverlener')

  db.close()
}

// ── Tegenproef ───────────────────────────────────────────────────────────────
if (process.env.SCENARIO_SELFTEST === '1') {
  check('tegenproef: deze check hoort te falen', false, 'geïnjecteerd door SCENARIO_SELFTEST=1')
}

const totaal = geslaagd + gezakt
console.log(`${geslaagd}/${totaal} checks geslaagd`)
process.exit(gezakt > 0 ? 1 : 0)
