import { sqliteTable, text, integer, real, index, primaryKey, uniqueIndex } from 'drizzle-orm/sqlite-core'

// 7: de bedrijfsplan-tabellen (plan_actions en zes andere). Documentair — er hangt geen
// migratielogica aan; de DDL is idempotent en draait bij elke connectie.
export const SCHEMA_VERSION = 7

export type ItemStatus = 'new' | 'saved' | 'dismissed' | 'contacted'

export const jobs = sqliteTable(
  'jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    postcode: integer('postcode').notNull(),
    // Plaatsnaam van de bron. Adzuna levert geen postcode, dus draagt dit veld daar de
    // plaatsinfo — en daarmee de plaats-component van de dedupe-sleutel.
    city: text('city'),
    region: text('region').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    postedAt: text('posted_at').notNull(),
    dedupeHash: text('dedupe_hash').notNull(),
    score: integer('score').notNull().default(0),
    scoreBreakdown: text('score_breakdown').notNull().default('{}'),
    jobStatus: text('job_status').notNull().default('new'),
    firstSeenAt: text('first_seen_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
  },
  (table) => ({
    dedupeHashIdx: uniqueIndex('jobs_dedupe_hash_idx').on(table.dedupeHash),
  })
)

export const companies = sqliteTable(
  'companies',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    companyName: text('company_name').notNull(),
    postcode: integer('postcode').notNull(),
    region: text('region').notNull(),
    naceCode: text('nace_code'),
    url: text('url'),
    signals: text('signals').notNull().default('[]'),
    // Waarop de lead rust. Nullable met opzet: een lead van vóór deze kolommen is niet
    // "0 vacatures" maar "nog niet geteld", en dat verschil hoort zichtbaar te blijven.
    vacatureAantal: integer('vacature_aantal'),
    designVacatures: integer('design_vacatures'),
    devVacatures: integer('dev_vacatures'),
    leadScore: integer('lead_score').notNull().default(0),
    scoreBreakdown: text('score_breakdown').notNull().default('{}'),
    rechtsgrond: text('rechtsgrond').notNull().default('gerechtvaardigd belang'),
    optOut: integer('opt_out', { mode: 'boolean' }).notNull().default(false),
    dedupeHash: text('dedupe_hash').notNull(),
    leadStatus: text('lead_status').notNull().default('new'),
    firstSeenAt: text('first_seen_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
  },
  (table) => ({
    dedupeHashIdx: uniqueIndex('companies_dedupe_hash_idx').on(table.dedupeHash),
  })
)

/**
 * Kleine key/value-opslag voor instellingen die in de app bewerkbaar zijn.
 *
 * Bewust key/value en geen kolom per instelling: er is er vandaag één (de zoekopdracht) en
 * een tabel met één kolom die telkens moet migreren is duurder dan een rij erbij.
 */
export const prospectStatus = sqliteTable('prospect_status', {
  /** Ondernemingsnummer zonder punten, zoals de KBO-spiegel het bewaart. */
  enterpriseNumber: text('enterprise_number').primaryKey(),
  status: text('status').notNull().default('new'),
  /** Dezelfde rem als op `companies`: zonder deze kolom gold de opt-out alleen voor leads. */
  optOut: integer('opt_out', { mode: 'boolean' }).notNull().default(false),
  updatedAt: text('updated_at').notNull(),
})

/**
 * Prospects uit een aangeleverde CSV — de derde herkomst.
 *
 * De sleutel is bewust dezelfde als die van `prospectStatus`: het ondernemingsnummer
 * zonder punten. Daardoor werkt de statuslaag zonder één regel wijziging, en valt een
 * bedrijf dat in beide bronnen zit vanzelf samen in plaats van te verdubbelen.
 */
export const csvProspects = sqliteTable('csv_prospects', {
  /** Ondernemingsnummer zonder punten, genormaliseerd met `kboNummer` bij de import. */
  enterpriseNumber: text('enterprise_number').primaryKey(),
  name: text('name').notNull(),
  naceLabel: text('nace_label'),
  city: text('city'),
  /** Decimaal: het geleverde bestand draagt 35.8 — een jaargemiddelde, geen hoofdtelling. */
  employeeCount: real('employee_count'),
  ebitda: real('ebitda'),
  valuationMultiple: real('valuation_multiple'),
  enterpriseValue: real('enterprise_value'),
  equityValue: real('equity_value'),
  /** Uit welk bestand deze rij komt, en wanneer hij voor het laatst is ingelezen. */
  bestandsnaam: text('bestandsnaam').notNull(),
  importedAt: text('imported_at').notNull(),
})

/** Waar een contactmoment aan hangt. Zie het commentaar bij de tabel in `ddl.ts`. */
export type SubjectType = 'lead' | 'prospect'

/** De kanalen waarlangs contact loopt. Vaste enum, geen vrije tekst. */
export const KANALEN = ['mail', 'linkedin', 'telefoon', 'in-persoon'] as const
export type Kanaal = (typeof KANALEN)[number]

export const contactMoments = sqliteTable(
  'contact_moments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    subjectType: text('subject_type').notNull(),
    /** `companies.id` als tekst voor een lead, het ondernemingsnummer voor een prospect. */
    subjectKey: text('subject_key').notNull(),
    datum: text('datum').notNull(),
    kanaal: text('kanaal').notNull(),
    notitie: text('notitie'),
    /** De grond zoals die gold op het moment van opslaan, niet zoals hij nu is. */
    rechtsgrond: text('rechtsgrond').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    subjectIdx: index('contact_moments_subject_idx').on(table.subjectType, table.subjectKey),
  })
)

export const nextActions = sqliteTable(
  'next_actions',
  {
    subjectType: text('subject_type').notNull(),
    subjectKey: text('subject_key').notNull(),
    datum: text('datum').notNull(),
    omschrijving: text('omschrijving').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.subjectType, table.subjectKey] }),
  })
)

/**
 * Coördinaten per onderneming, eenmalig opgehaald.
 *
 * `lat`/`lon` zijn nullable en `mislukt_reden` gevuld wanneer de bron niets vond: dat is een
 * uitkomst om te bewaren, niet een gat om opnieuw te bevragen.
 */
export const geocodeCache = sqliteTable('geocode_cache', {
  enterpriseNumber: text('enterprise_number').primaryKey(),
  lat: real('lat'),
  lon: real('lon'),
  /** Wat de bron werkelijk vond: `huisnummer`, `straat` of `gemeente`. */
  precisie: text('precisie'),
  bron: text('bron').notNull(),
  opgehaaldAt: text('opgehaald_at').notNull(),
  misluktReden: text('mislukt_reden'),
})

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export type Setting = typeof settings.$inferSelect

export const syncRuns = sqliteTable('sync_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull(),
  finishedAt: text('finished_at'),
  status: text('status').notNull().default('running'),
  jobsAdded: integer('jobs_added').notNull().default(0),
  jobsUpdated: integer('jobs_updated').notNull().default(0),
  leadsAdded: integer('leads_added').notNull().default(0),
  leadsUpdated: integer('leads_updated').notNull().default(0),
  sourceStatuses: text('source_statuses').notNull().default('{}'),
})

export type Job = typeof jobs.$inferSelect
export type Company = typeof companies.$inferSelect
export type SyncRun = typeof syncRuns.$inferSelect
export type ProspectStatus = typeof prospectStatus.$inferSelect
export type CsvProspect = typeof csvProspects.$inferSelect
export type ContactMoment = typeof contactMoments.$inferSelect
export type NextAction = typeof nextActions.$inferSelect
export type GeocodeRij = typeof geocodeCache.$inferSelect

/**
 * Het bedrijfsplan 2027.
 *
 * De statussen zijn een TS-union met een `as const`-lijst ernaast, zoals `KANALEN`: SQLite
 * bewaart tekst en kent de verzameling niet, dus de lijst is de enige plek waar hij bestaat.
 * `geblokkeerd` staat er bewust NIET bij — dat is een afgeleide toestand uit de
 * afhankelijkheden (`lib/plan/afleiding.ts`). Een opgeslagen blokkade zou handmatig
 * synchroon gehouden moeten worden met een andere rij, en veroudert dus stil.
 */
export const ACTIE_STATUSSEN = [
  'niet_gestart',
  'bezig',
  'wacht_op_input',
  'gereed',
  'uitgesteld',
  'vervallen',
] as const
export type ActieStatus = (typeof ACTIE_STATUSSEN)[number]

/** Waar een actie vandaan komt. `seed` is de startinhoud en kan niet verwijderd worden. */
export const ACTIE_BRONNEN = ['seed', 'eigen', 'idee'] as const
export type ActieBron = (typeof ACTIE_BRONNEN)[number]

export const IDEE_STATUSSEN = ['open', 'opgenomen', 'verworpen'] as const
export type IdeeStatus = (typeof IDEE_STATUSSEN)[number]

export const planActions = sqliteTable(
  'plan_actions',
  {
    /** `A01`…`A22` uit de opdracht; `E01` en verder voor eigen acties, in een eigen reeks. */
    key: text('key').primaryKey(),
    titel: text('titel').notNull(),
    prioriteit: integer('prioriteit').notNull(),
    volgorde: integer('volgorde').notNull(),
    beschrijving: text('beschrijving'),
    resultaat: text('resultaat'),
    status: text('status').notNull().default('niet_gestart'),
    volgendeStap: text('volgende_stap'),
    gereedcriterium: text('gereedcriterium'),
    bewijs: text('bewijs'),
    afgerondOp: text('afgerond_op'),
    /** NULL is onbekend, nooit 0. Zie het commentaar bij de tabel in `ddl.ts`. */
    inschattingUren: real('inschatting_uren'),
    resterendUren: real('resterend_uren'),
    eigenaar: text('eigenaar').notNull().default('Jeroen'),
    streefdatum: text('streefdatum'),
    wachtreden: text('wachtreden'),
    herbekijkOp: text('herbekijk_op'),
    /** JSON-lijst `[{ label, url }]`. Geparsed met try/catch, zoals `signals`. */
    links: text('links').notNull().default('[]'),
    context: text('context'),
    focusUitzondering: text('focus_uitzondering'),
    startUitzondering: text('start_uitzondering'),
    bron: text('bron').notNull().default('eigen'),
    versie: integer('versie').notNull().default(1),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    prioriteitIdx: index('plan_actions_prioriteit_idx').on(table.prioriteit, table.volgorde),
  })
)

export const planDependencies = sqliteTable(
  'plan_dependencies',
  {
    actionKey: text('action_key').notNull(),
    dependsOnKey: text('depends_on_key').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.actionKey, table.dependsOnKey] }),
    dependsIdx: index('plan_dependencies_depends_idx').on(table.dependsOnKey),
  })
)

/** `beslismoment` voor B01–B03, `start` voor het startbesluit van januari 2027. */
export type BeslissingSoort = 'beslismoment' | 'start'

export const planDecisions = sqliteTable('plan_decisions', {
  key: text('key').primaryKey(),
  soort: text('soort').notNull(),
  volgorde: integer('volgorde').notNull(),
  titel: text('titel').notNull(),
  vraag: text('vraag'),
  /** JSON-lijst van actie-keys waarop dit beslismoment rust. */
  acties: text('acties').notNull().default('[]'),
  beslissing: text('beslissing'),
  beslistOp: text('beslist_op'),
  onderbouwing: text('onderbouwing'),
  vervolgacties: text('vervolgacties'),
  versie: integer('versie').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const planIdeas = sqliteTable('plan_ideas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  titel: text('titel').notNull(),
  notitie: text('notitie'),
  status: text('status').notNull().default('open'),
  /** De key van de actie die uit dit idee ontstond, wanneer het opgenomen is. */
  opgenomenAls: text('opgenomen_als'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const planLinks = sqliteTable(
  'plan_links',
  {
    actionKey: text('action_key').notNull(),
    subjectType: text('subject_type').notNull(),
    /** `companies.id` als tekst voor een lead, het ondernemingsnummer voor een prospect. */
    subjectKey: text('subject_key').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.actionKey, table.subjectType, table.subjectKey] }),
    subjectIdx: index('plan_links_subject_idx').on(table.subjectType, table.subjectKey),
  })
)

export const planHistory = sqliteTable(
  'plan_history',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    onderwerpType: text('onderwerp_type').notNull(),
    onderwerpKey: text('onderwerp_key').notNull(),
    veld: text('veld').notNull(),
    oud: text('oud'),
    nieuw: text('nieuw'),
    reden: text('reden'),
    createdAt: text('created_at').notNull(),
  },
  (table) => ({
    onderwerpIdx: index('plan_history_onderwerp_idx').on(
      table.onderwerpType,
      table.onderwerpKey,
      table.id
    ),
  })
)

export type PlanActie = typeof planActions.$inferSelect
export type PlanAfhankelijkheid = typeof planDependencies.$inferSelect
export type PlanBeslissing = typeof planDecisions.$inferSelect
export type PlanIdee = typeof planIdeas.$inferSelect
export type PlanKoppeling = typeof planLinks.$inferSelect
export type PlanHistorie = typeof planHistory.$inferSelect
