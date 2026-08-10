import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { adzunaSource } from '@/lib/sources/adzuna'
import { kboSource } from '@/lib/sources/kbo'
import { deriveLeadsFromJobs } from '@/lib/signals'
import { upsertJob, upsertLead } from '@/lib/sync/upsert'
import { ALL_REGIONS, regionForPostcode } from '@/lib/regions'
import type { RawJob } from '@/lib/sources/types'

const JOB_SOURCES = [adzunaSource] as const
const LEAD_SOURCES = [kboSource] as const

type SourceStatus = {
  ok: boolean
  count?: number
  error?: string
  warnings?: string[]
}

export async function POST() {
  const db = getDb()
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

  try {
    // ── Vacatures ────────────────────────────────────────────────────────────
    const jobSourceResults = await Promise.allSettled(
      JOB_SOURCES.map((s) => s.fetch({ regions: ALL_REGIONS }))
    )

    // Bewaard omdat de signaal-afleiding hieronder over álle bronnen samen rekent: een
    // bedrijf dat bij bron A een dev-vacature post en bij bron B een designvacature, is
    // geen lead. Per bron afleiden zou dat verschil niet zien.
    const alleJobs: RawJob[] = []

    for (let i = 0; i < jobSourceResults.length; i++) {
      const source = JOB_SOURCES[i]
      const result = jobSourceResults[i]
      if (!source || !result) continue

      if (result.status === 'rejected') {
        stats.sourceStatuses[source.name] = { ok: false, error: String(result.reason) }
        continue
      }

      const { items, warnings } = result.value
      const normalized = items.map((job) => ({
        ...job,
        region: regionForPostcode(job.postcode) ?? job.region,
      }))
      alleJobs.push(...normalized)

      for (const job of normalized) {
        const { added } = await upsertJob(db, job)
        if (added) stats.jobsAdded++
        else stats.jobsUpdated++
      }

      stats.sourceStatuses[source.name] = {
        ok: true,
        count: normalized.length,
        ...(warnings.length ? { warnings } : {}),
      }
    }

    // ── Leads uit externe bronnen ────────────────────────────────────────────
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

      const { items, warnings } = result.value
      for (const lead of items) {
        const { added } = await upsertLead(db, lead, { afgeleid: false })
        if (added) stats.leadsAdded++
        else stats.leadsUpdated++
      }

      stats.sourceStatuses[source.name] = {
        ok: true,
        count: items.length,
        ...(warnings.length ? { warnings } : {}),
      }
    }

    // ── Leads afgeleid uit de vacatures van deze run ─────────────────────────
    const afgeleideLeads = deriveLeadsFromJobs(alleJobs, new Date())
    for (const lead of afgeleideLeads) {
      const { added } = await upsertLead(db, lead, { afgeleid: true })
      if (added) stats.leadsAdded++
      else stats.leadsUpdated++
    }
    stats.sourceStatuses['vacatures'] = { ok: true, count: afgeleideLeads.length }

    await db
      .update(schema.syncRuns)
      .set({
        finishedAt: new Date().toISOString(),
        status: 'done',
        jobsAdded: stats.jobsAdded,
        jobsUpdated: stats.jobsUpdated,
        leadsAdded: stats.leadsAdded,
        leadsUpdated: stats.leadsUpdated,
        sourceStatuses: JSON.stringify(stats.sourceStatuses),
      })
      .where(eq(schema.syncRuns.id, syncRunId))

    return NextResponse.json({ ok: true, syncRunId, ...stats, finishedAt: new Date().toISOString() })
  } catch (err) {
    // Zonder deze tak bleef de rij eeuwig op 'running' staan en filterde het dashboard
    // (`status = 'done'`) hem stil weg — een mislukte sync zag er dan uit als geen sync.
    const boodschap = err instanceof Error ? err.message : String(err)
    await db
      .update(schema.syncRuns)
      .set({
        finishedAt: new Date().toISOString(),
        status: 'error',
        jobsAdded: stats.jobsAdded,
        jobsUpdated: stats.jobsUpdated,
        leadsAdded: stats.leadsAdded,
        leadsUpdated: stats.leadsUpdated,
        sourceStatuses: JSON.stringify({ ...stats.sourceStatuses, _fout: boodschap }),
      })
      .where(eq(schema.syncRuns.id, syncRunId))

    return NextResponse.json({ ok: false, syncRunId, error: boodschap }, { status: 500 })
  }

}
