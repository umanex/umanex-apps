import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core'

export const SCHEMA_VERSION = 1

export const jobs = sqliteTable(
  'jobs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    externalId: text('external_id').notNull(),
    source: text('source').notNull(),
    title: text('title').notNull(),
    company: text('company').notNull(),
    postcode: integer('postcode').notNull(),
    region: text('region').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    postedAt: text('posted_at').notNull(),
    dedupeHash: text('dedupe_hash').notNull(),
    score: integer('score').notNull().default(0),
    scoreBreakdown: text('score_breakdown').notNull().default('{}'),
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
    leadScore: integer('lead_score').notNull().default(0),
    scoreBreakdown: text('score_breakdown').notNull().default('{}'),
    rechtsgrond: text('rechtsgrond').notNull().default('gerechtvaardigd belang'),
    optOut: integer('opt_out', { mode: 'boolean' }).notNull().default(false),
    dedupeHash: text('dedupe_hash').notNull(),
    firstSeenAt: text('first_seen_at').notNull(),
    lastSeenAt: text('last_seen_at').notNull(),
  },
  (table) => ({
    dedupeHashIdx: uniqueIndex('companies_dedupe_hash_idx').on(table.dedupeHash),
  })
)

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
