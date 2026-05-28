import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { adzunaSource } from '@/lib/sources/adzuna'
import { kboSource } from '@/lib/sources/kbo'
import { scoreJob, scoreLead, jobDedupeHash, leadDedupeHash } from '@/lib/matching'
import { regionForPostcode } from '@/lib/regions'
import type { RegionCode } from '@/lib/regions'

const ALL_REGIONS: RegionCode[] = ['WVL', 'OVL', 'BRU']

const JOB_SOURCES = [adzunaSource] as const
const LEAD_SOURCES = [kboSource] as const

type SourceStatus = {
  ok: boolean
  count?: number
  error?: string
}

export async function POST() {
  const startedAt = new Date().toISOString()

  const inserted = await db
    .insert(schema.syncRuns)
    .values({ startedAt, status: 'running' })
    .returning()

  const syncRunId = inserted[0]?.id
  if (syncRunId === undefined) {
    return NextResponse.json({ ok: false, error: 'Failed to create sync run' }, { status: 500 })
  }

  const stats = {
    jobsAdded: 0,
    jobsUpdated: 0,
    leadsAdded: 0,
    leadsUpdated: 0,
    sourceStatuses: {} as Record<string, SourceStatus>,
  }

  // Run all job sources in parallel; one failure does not abort others
  const jobSourceResults = await Promise.allSettled(
    JOB_SOURCES.map((s) => s.fetch({ regions: ALL_REGIONS }))
  )

  for (let i = 0; i < jobSourceResults.length; i++) {
    const source = JOB_SOURCES[i]
    const result = jobSourceResults[i]
    if (!source || !result) continue

    if (result.status === 'rejected') {
      stats.sourceStatuses[source.name] = { ok: false, error: String(result.reason) }
      continue
    }

    const normalized = result.value.map((job) => ({
      ...job,
      region: regionForPostcode(job.postcode) ?? job.region,
    }))

    for (const job of normalized) {
      const hash = jobDedupeHash(job)
      const { score, breakdown } = scoreJob(job)
      const now = new Date().toISOString()

      const existing = await db.query.jobs.findFirst({
        where: eq(schema.jobs.dedupeHash, hash),
      })

      if (existing) {
        await db
          .update(schema.jobs)
          .set({ score, scoreBreakdown: JSON.stringify(breakdown), lastSeenAt: now })
          .where(eq(schema.jobs.dedupeHash, hash))
        stats.jobsUpdated++
      } else {
        await db.insert(schema.jobs).values({
          externalId: job.externalId,
          source: job.source,
          title: job.title,
          company: job.company,
          postcode: job.postcode,
          region: job.region,
          url: job.url,
          description: job.description,
          postedAt: job.postedAt,
          dedupeHash: hash,
          score,
          scoreBreakdown: JSON.stringify(breakdown),
          firstSeenAt: now,
          lastSeenAt: now,
        })
        stats.jobsAdded++
      }
    }

    stats.sourceStatuses[source.name] = { ok: true, count: normalized.length }
  }

  // Run all lead sources in parallel
  const leadSourceResults = await Promise.allSettled(
    LEAD_SOURCES.map((s) => s.fetch({ regions: ALL_REGIONS }))
  )

  for (let i = 0; i < leadSourceResults.length; i++) {
    const source = LEAD_SOURCES[i]
    const result = leadSourceResults[i]
    if (!source || !result) continue

    if (result.status === 'rejected') {
      stats.sourceStatuses[source.name] = { ok: false, error: String(result.reason) }
      continue
    }

    for (const lead of result.value) {
      const hash = leadDedupeHash(lead)
      const { score, breakdown } = scoreLead(lead)
      const now = new Date().toISOString()

      const existing = await db.query.companies.findFirst({
        where: eq(schema.companies.dedupeHash, hash),
      })

      if (existing) {
        await db
          .update(schema.companies)
          .set({
            leadScore: score,
            scoreBreakdown: JSON.stringify(breakdown),
            signals: JSON.stringify(lead.signals),
            lastSeenAt: now,
          })
          .where(eq(schema.companies.dedupeHash, hash))
        stats.leadsUpdated++
      } else {
        await db.insert(schema.companies).values({
          externalId: lead.externalId,
          source: lead.source,
          companyName: lead.companyName,
          postcode: lead.postcode,
          region: lead.region,
          naceCode: lead.naceCode,
          url: lead.url,
          signals: JSON.stringify(lead.signals),
          leadScore: score,
          scoreBreakdown: JSON.stringify(breakdown),
          dedupeHash: hash,
          firstSeenAt: now,
          lastSeenAt: now,
        })
        stats.leadsAdded++
      }
    }

    stats.sourceStatuses[source.name] = { ok: true, count: result.value.length }
  }

  const finishedAt = new Date().toISOString()

  await db
    .update(schema.syncRuns)
    .set({
      finishedAt,
      status: 'done',
      jobsAdded: stats.jobsAdded,
      jobsUpdated: stats.jobsUpdated,
      leadsAdded: stats.leadsAdded,
      leadsUpdated: stats.leadsUpdated,
      sourceStatuses: JSON.stringify(stats.sourceStatuses),
    })
    .where(eq(schema.syncRuns.id, syncRunId))

  return NextResponse.json({ ok: true, syncRunId, ...stats, finishedAt })
}
