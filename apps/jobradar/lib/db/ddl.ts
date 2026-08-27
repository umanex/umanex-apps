/**
 * De DDL en de kolom-migraties, los van `index.ts`.
 *
 * Dat bestand begint met `import 'server-only'`, dus alles erin is buiten Next niet aan te
 * roepen — en daarmee was er geen manier om de sync-logica tegen een echt schema te toetsen
 * zonder de database van de gebruiker te openen. Hiermee kan een suite een `:memory:`-database
 * opzetten die byte-voor-byte hetzelfde schema draagt als de echte.
 */
export const SCHEMA_DDL = `
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
    vacature_aantal INTEGER,
    design_vacatures INTEGER,
    dev_vacatures INTEGER,
    lead_score INTEGER NOT NULL DEFAULT 0,
    score_breakdown TEXT NOT NULL DEFAULT '{}',
    rechtsgrond TEXT NOT NULL DEFAULT 'gerechtvaardigd belang',
    opt_out INTEGER NOT NULL DEFAULT 0,
    dedupe_hash TEXT NOT NULL,
    lead_status TEXT NOT NULL DEFAULT 'new',
    classificatie TEXT,
    geclassificeerd_op TEXT,
    werknemers INTEGER,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS companies_dedupe_hash_idx ON companies (dedupe_hash);
  CREATE INDEX IF NOT EXISTS companies_source_external_idx ON companies (source, external_id);

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

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
`

type ColInfo = { name: string }

/** Voegt kolommen bij die van ná de eerste versie van een tabel dateren. Idempotent. */
export function pasKolomMigratiesToe(sqlite: {
  prepare(sql: string): { all(): unknown[] }
  exec(sql: string): unknown
}): void {
  const kolommen = (tabel: string) =>
    (sqlite.prepare(`PRAGMA table_info(${tabel})`).all() as ColInfo[]).map((c) => c.name)

  const jobCols = kolommen('jobs')
  if (!jobCols.includes('job_status')) {
    sqlite.exec("ALTER TABLE jobs ADD COLUMN job_status TEXT NOT NULL DEFAULT 'new'")
  }
  if (!jobCols.includes('city')) {
    sqlite.exec('ALTER TABLE jobs ADD COLUMN city TEXT')
  }

  const companyCols = kolommen('companies')
  if (!companyCols.includes('lead_status')) {
    sqlite.exec("ALTER TABLE companies ADD COLUMN lead_status TEXT NOT NULL DEFAULT 'new'")
  }
  for (const kolom of ['vacature_aantal', 'design_vacatures', 'dev_vacatures', 'werknemers']) {
    if (!companyCols.includes(kolom)) sqlite.exec(`ALTER TABLE companies ADD COLUMN ${kolom} INTEGER`)
  }
  for (const kolom of ['classificatie', 'geclassificeerd_op']) {
    if (!companyCols.includes(kolom)) sqlite.exec(`ALTER TABLE companies ADD COLUMN ${kolom} TEXT`)
  }
  // De index staat HIER en niet in SCHEMA_DDL, en dat is geen stijlkeuze.
  //
  // `index.ts` draait eerst SCHEMA_DDL en dan deze functie. Op een bestaande database doet
  // `CREATE TABLE IF NOT EXISTS` niets, dus daar bestaat de kolom pas ná de ALTER hierboven.
  // Stond de CREATE INDEX in SCHEMA_DDL, dan draaide hij vóór die ALTER en viel elke bestaande
  // database om op `no such column: classificatie` — bij het openen, dus vóór er ook maar iets
  // gelezen kon worden. GEMETEN: precies dat gebeurde op een database van vóór versie 6.
  //
  // Draagt het labelscherm: "geef me het volgende bedrijf zonder oordeel" is de enige query die
  // per toetsaanslag draait, en zonder index scant die de hele tabel.
  sqlite.exec('CREATE INDEX IF NOT EXISTS companies_classificatie_idx ON companies (classificatie)')
}
