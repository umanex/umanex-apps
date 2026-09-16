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
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS companies_dedupe_hash_idx ON companies (dedupe_hash);
  CREATE INDEX IF NOT EXISTS companies_source_external_idx ON companies (source, external_id);

  -- Statussen van KBO-prospects. Bewust hier en niet in kbo.db: die spiegel is
  -- wegwerpbaar en wordt bij elke --full overschreven, dus alles wat jij erover beslist
  -- zou dan mee verdwijnen. De sleutel is het ondernemingsnummer zonder punten.
  CREATE TABLE IF NOT EXISTS prospect_status (
    enterprise_number TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'new',
    -- Dezelfde rem als op companies. Zonder deze kolom zou de opt-out-controle bij het
    -- vastleggen van een contactmoment stil alleen voor leads gelden, en dat is precies
    -- een guard die compleet lijkt en het niet is.
    opt_out INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );

  -- Prospects uit een aangeleverde CSV: de derde herkomst, naast de vacature-leads en
  -- de KBO-spiegel. Dezelfde sleutel als prospect_status, zodat een status zonder mapping
  -- op beide bronnen slaat. De negen kolommen zijn de CSV zoals ze is; afleiden gebeurt
  -- bij het renderen, net als bij de KBO-koppeling — wat niet opgeslagen wordt, kan niet
  -- verouderen. De bedragen staan als REAL en niet als INTEGER: employee_count draagt
  -- decimalen (35.8 in het geleverde bestand) omdat het een gemiddelde over een jaar is.
  CREATE TABLE IF NOT EXISTS csv_prospects (
    enterprise_number TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    nace_label TEXT,
    city TEXT,
    employee_count REAL,
    ebitda REAL,
    valuation_multiple REAL,
    enterprise_value REAL,
    equity_value REAL,
    bestandsnaam TEXT NOT NULL,
    imported_at TEXT NOT NULL
  );

  -- Sorteren op omvang is de reden dat deze bron bestaat; zonder index betaalt elke
  -- pagina een volledige scan over de tabel.
  CREATE INDEX IF NOT EXISTS csv_prospects_employee_idx ON csv_prospects (employee_count);

  -- Contactmomenten. De sleutel is bewust samengesteld en niet het ondernemingsnummer:
  -- de companies-tabel draagt geen nummer-kolom, de KBO-koppeling gebeurt bij het renderen, en
  -- daarvan zijn 12 van de 27 leads gekoppeld en 15 niet gevonden — één van die twaalf
  -- naar een tandartspraktijk. Alles op het nummer sleutelen verliest dus stil 15 leads
  -- en hangt één historiek aan het verkeerde bedrijf.
  --
  -- rechtsgrond staat op het moment zelf en niet alleen op het bedrijf: die kan later
  -- wijzigen, en een register wil weten op welke grond je tóén contacteerde.
  CREATE TABLE IF NOT EXISTS contact_moments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    datum TEXT NOT NULL,
    kanaal TEXT NOT NULL,
    notitie TEXT,
    rechtsgrond TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS contact_moments_subject_idx
    ON contact_moments (subject_type, subject_key, datum DESC);

  -- Eén volgende actie per bedrijf, niet meerdere: dit veld bestaat om de lijst te
  -- sorteren, en twee open acties maken die sleutel dubbelzinnig.
  CREATE TABLE IF NOT EXISTS next_actions (
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    datum TEXT NOT NULL,
    omschrijving TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (subject_type, subject_key)
  );

  -- Coordinaten per onderneming. KBO levert adressen maar geen lat/lon, dus die worden
  -- eenmalig opgehaald en hier bewaard. In jobradar.db en niet in de spiegel: die wordt bij
  -- elke --full overschreven, en een geocode-run kost tijd en het geduld van een publieke
  -- dienst -- dat gooi je niet weg bij een sync.
  --
  -- mislukt_reden is niet hetzelfde als een ontbrekende rij: "niet gevonden" is een
  -- uitkomst die je wilt bewaren, anders vraagt elke volgende run hem opnieuw op.
  CREATE TABLE IF NOT EXISTS geocode_cache (
    enterprise_number TEXT PRIMARY KEY,
    lat REAL,
    lon REAL,
    precisie TEXT,
    bron TEXT NOT NULL,
    opgehaald_at TEXT NOT NULL,
    mislukt_reden TEXT
  );

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

  -- Het bedrijfsplan 2027. De sleutel is de code uit de opdracht (A01, B01, START) en geen
  -- autoincrement: de opdracht, de export en de gebruiker spreken in die codes, en een
  -- herstart of een tweede seed-run mag er nooit een tweede A01 naast zetten.
  --
  -- Geen FOREIGN KEY, net als de rest van dit schema: de :memory:-suites zetten geen
  -- PRAGMA foreign_keys, dus een gedrag dat alleen in productie bestaat zou ongetoetst
  -- blijven. 'verwijderActie' ruimt de kanten en de koppelingen zelf op.
  --
  -- 'versie' is de enige optimistic lock in deze app. Reden: dit is het eerste model waar
  -- twee schermen (het plan en een geopend paneel) dezelfde rij bewerken, en een stille
  -- overschrijving kost hier bewijs in plaats van een statusje.
  CREATE TABLE IF NOT EXISTS plan_actions (
    key TEXT PRIMARY KEY,
    titel TEXT NOT NULL,
    prioriteit INTEGER NOT NULL,
    volgorde INTEGER NOT NULL,
    beschrijving TEXT,
    resultaat TEXT,
    status TEXT NOT NULL DEFAULT 'niet_gestart',
    volgende_stap TEXT,
    gereedcriterium TEXT,
    bewijs TEXT,
    afgerond_op TEXT,
    -- NULL is onbekend, nooit 0: een inschatting van nul uren bestaat niet, en 0 zou in
    -- elke som meetellen alsof het gemeten was.
    inschatting_uren REAL,
    resterend_uren REAL,
    eigenaar TEXT NOT NULL DEFAULT 'Jeroen',
    streefdatum TEXT,
    wachtreden TEXT,
    herbekijk_op TEXT,
    links TEXT NOT NULL DEFAULT '[]',
    -- Wat er al bestaat buiten de app om: "er is een conceptaanbod". Bewust niet hetzelfde
    -- als bewijs -- context zegt waar je vertrekt, bewijs zegt dat je klaar bent.
    context TEXT,
    focus_uitzondering TEXT,
    start_uitzondering TEXT,
    bron TEXT NOT NULL DEFAULT 'eigen',
    versie INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS plan_actions_prioriteit_idx ON plan_actions (prioriteit, volgorde);

  -- Afhankelijkheden als kanten, niet als lijst in een kolom. "Geblokkeerd" wordt hieruit
  -- afgeleid en nergens opgeslagen: een opgeslagen blokkade veroudert stil zodra de andere
  -- actie van status wisselt.
  CREATE TABLE IF NOT EXISTS plan_dependencies (
    action_key TEXT NOT NULL,
    depends_on_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (action_key, depends_on_key)
  );

  CREATE INDEX IF NOT EXISTS plan_dependencies_depends_idx ON plan_dependencies (depends_on_key);

  -- Beslismomenten B01-B03 en het startbesluit (soort 'start'). "Klaar voor beoordeling" is
  -- afgeleid uit de gekoppelde acties; beslissing en beslist_op worden uitsluitend door de
  -- gebruiker geschreven. Alle acties gereed betekent dat er iets te beoordelen valt, niet
  -- dat het goedgekeurd is.
  CREATE TABLE IF NOT EXISTS plan_decisions (
    key TEXT PRIMARY KEY,
    soort TEXT NOT NULL,
    volgorde INTEGER NOT NULL,
    titel TEXT NOT NULL,
    vraag TEXT,
    acties TEXT NOT NULL DEFAULT '[]',
    beslissing TEXT,
    beslist_op TEXT,
    onderbouwing TEXT,
    vervolgacties TEXT,
    versie INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Ideeen staan buiten het plan tot je ze opneemt. Daarom een eigen tabel en geen actie met
  -- een status erbij: een idee dat als actie bestaat, telt mee in elke telling.
  CREATE TABLE IF NOT EXISTS plan_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titel TEXT NOT NULL,
    notitie TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    opgenomen_als TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Koppeling naar bedrijven via dezelfde polymorfe sleutel als contact_moments, om dezelfde
  -- reden: companies draagt geen ondernemingsnummer. Geen kopie van bedrijfsgegevens -- de
  -- naam wordt bij het lezen opgezocht, zodat er geen tweede registratie ontstaat.
  CREATE TABLE IF NOT EXISTS plan_links (
    action_key TEXT NOT NULL,
    subject_type TEXT NOT NULL,
    subject_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (action_key, subject_type, subject_key)
  );

  CREATE INDEX IF NOT EXISTS plan_links_subject_idx ON plan_links (subject_type, subject_key);

  -- De wijzigingen die ertoe doen: status, afhankelijkheden, gereedcriterium, bewijs,
  -- beslissingen en de uitzonderingen op de focusregel. Geen cascade bij verwijderen: een
  -- verwijderde eigen actie laat zijn spoor na, anders verdwijnt juist de uitleg.
  CREATE TABLE IF NOT EXISTS plan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    onderwerp_type TEXT NOT NULL,
    onderwerp_key TEXT NOT NULL,
    veld TEXT NOT NULL,
    oud TEXT,
    nieuw TEXT,
    reden TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS plan_history_onderwerp_idx
    ON plan_history (onderwerp_type, onderwerp_key, id);
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
  for (const kolom of ['vacature_aantal', 'design_vacatures', 'dev_vacatures']) {
    if (!companyCols.includes(kolom)) sqlite.exec(`ALTER TABLE companies ADD COLUMN ${kolom} INTEGER`)
  }

  // `prospect_status` bestond vóór deze kolom, dus een bestaande database krijgt hem hier.
  const prospectCols = kolommen('prospect_status')
  if (prospectCols.length && !prospectCols.includes('opt_out')) {
    sqlite.exec('ALTER TABLE prospect_status ADD COLUMN opt_out INTEGER NOT NULL DEFAULT 0')
  }
}
