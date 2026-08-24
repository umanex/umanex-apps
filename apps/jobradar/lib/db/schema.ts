import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const SCHEMA_VERSION = 6

export type ItemStatus = 'new' | 'saved' | 'dismissed' | 'contacted'

/**
 * De derde as, en met opzet géén waarde van `ItemStatus`.
 *
 * `lead_status` zegt waar een bedrijf in de pijplijn staat, `lead_score` hoe interessant het is,
 * en dit zegt wát voor bedrijf het is. Dat zijn drie onafhankelijke dingen: een dienstverlener
 * kan een hoge score hebben én gecontacteerd zijn. Ze in één kolom proppen is precies de
 * faalklasse die in `LEARNINGS.md` vastligt — daar vielen de vacaturescore en de classificatie
 * al eens samen.
 *
 * `null` betekent "nog niet beoordeeld" en is dus geen vijfde waarde: een bedrijf zonder oordeel
 * is iets anders dan een bedrijf waarover getwijfeld is.
 */
export type Classificatie =
  | 'product'
  | 'dienstverlener'
  /**
   * Doet allebei: een eigen softwareproduct én consultancy. Met opzet géén vorm van `twijfel`,
   * want die twee dragen verschillende informatie — `twijfel` is "ik kon niet beslissen en moet
   * hierop terugkomen", `beide` is "ik heb beslist". En een bedrijf dat allebei doet ís een
   * prospect, want het heeft een eigen product. Samennemen maakt de tweede ronde onbruikbaar.
   */
  | 'beide'
  | 'geen-prospect'
  | 'twijfel'

/** De volgorde waarin ze in de tool staan; de index is meteen de sneltoets. */
export const CLASSIFICATIES: readonly Classificatie[] = [
  'product',
  'dienstverlener',
  'beide',
  'geen-prospect',
  'twijfel',
] as const

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
    /**
     * Het handmatige oordeel product-versus-dienstverlener. Nullable: geen enkele bron levert
     * dit, het ontstaat pas doordat iemand naar de website kijkt.
     */
    classificatie: text('classificatie').$type<Classificatie>(),
    /** Wanneer het oordeel gezet is — draagt de hervatbare labelsessie. */
    geclassificeerdOp: text('geclassificeerd_op'),
    /**
     * Personeelsbestand. Nullable met dezelfde reden als `vacatureAantal`: een bedrijf zonder
     * jaarrekening in de bron is niet "0 werknemers" maar "niet geteld", en dat verschil bepaalt
     * of het binnen de doelband van 20-150 valt of buiten het bereik van de meting.
     */
    werknemers: integer('werknemers'),
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
