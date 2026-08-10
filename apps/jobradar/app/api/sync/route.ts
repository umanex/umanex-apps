import { NextResponse } from 'next/server'
import { and, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { adzunaSource } from '@/lib/sources/adzuna'
import { kboSource } from '@/lib/sources/kbo'
import { scoreJob, scoreLead, jobDedupeHash, leadDedupeHash } from '@/lib/matching'
import { deriveLeadsFromJobs, mergeSignalen } from '@/lib/signals'
import { ALL_REGIONS, regionForPostcode } from '@/lib/regions'
import type { RawJob, RawLead } from '@/lib/sources/types'

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
        const { added } = await upsertJob(job)
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
        const { added } = await upsertLead(lead, { afgeleid: false })
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
      const { added } = await upsertLead(lead, { afgeleid: true })
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

  /**
   * Zoekt de bestaande rij op bron-identiteit, met de dedupe-hash als tweede kans.
   *
   * De hash alleen volstond niet. Hij is opgebouwd uit titel + bedrijf + plaats, dus een
   * bron die de titel bijwerkt ("UX Designer" → "UX Designer (m/v)") maakt een nieuwe rij
   * aan — met status `new`, waardoor een zelf gezette status uit de feed verdwijnt. De
   * bron-id is stabiel waar de hash dat niet is; de hash blijft eronder liggen om dezelfde
   * vacature over twéé bronnen heen te herkennen.
   */
  async function upsertJob(job: RawJob): Promise<{ added: boolean }> {
    const hash = jobDedupeHash(job)
    const { score, breakdown } = scoreJob(job)
    const now = new Date().toISOString()

    const bestaand =
      (await db.query.jobs.findFirst({
        where: and(eq(schema.jobs.source, job.source), eq(schema.jobs.externalId, job.externalId)),
      })) ?? (await db.query.jobs.findFirst({ where: eq(schema.jobs.dedupeHash, hash) }))

    if (bestaand) {
      // `jobStatus` staat er bewust niet bij: die is van de gebruiker, niet van de bron.
      await db
        .update(schema.jobs)
        .set({
          title: job.title,
          company: job.company,
          postcode: job.postcode,
          city: job.city,
          region: job.region,
          url: job.url,
          description: job.description,
          dedupeHash: hash,
          score,
          scoreBreakdown: JSON.stringify(breakdown),
          lastSeenAt: now,
        })
        .where(eq(schema.jobs.id, bestaand.id))
      return { added: false }
    }

    await db.insert(schema.jobs).values({
      externalId: job.externalId,
      source: job.source,
      title: job.title,
      company: job.company,
      postcode: job.postcode,
      city: job.city,
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
    return { added: true }
  }

  async function upsertLead(lead: RawLead, opties: { afgeleid: boolean }): Promise<{ added: boolean }> {
    const hash = leadDedupeHash(lead)
    const now = new Date().toISOString()

    const bestaand =
      (await db.query.companies.findFirst({
        where: and(
          eq(schema.companies.source, lead.source),
          eq(schema.companies.externalId, lead.externalId)
        ),
      })) ?? (await db.query.companies.findFirst({ where: eq(schema.companies.dedupeHash, hash) }))

    if (bestaand) {
      const huidige = veiligParseSignalen(bestaand.signals)
      // Een afgeleide run vervangt alleen de afgeleide signalen; een externe bron levert
      // zijn eigen set en laat de afgeleide staan.
      const signals = opties.afgeleid
        ? mergeSignalen(huidige, lead.signals)
        : mergeSignalen(lead.signals, huidige.filter((s) => !lead.signals.includes(s)))
      const { score, breakdown } = scoreLead({ signals })

      await db
        .update(schema.companies)
        .set({
          companyName: lead.companyName,
          region: lead.region,
          ...(lead.postcode > 0 ? { postcode: lead.postcode } : {}),
          ...(lead.naceCode ? { naceCode: lead.naceCode } : {}),
          ...(lead.url ? { url: lead.url } : {}),
          signals: JSON.stringify(signals),
          leadScore: score,
          scoreBreakdown: JSON.stringify(breakdown),
          dedupeHash: hash,
          lastSeenAt: now,
        })
        .where(eq(schema.companies.id, bestaand.id))
      return { added: false }
    }

    const { score, breakdown } = scoreLead(lead)
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
    return { added: true }
  }
}

/** Eén corrupte rij mag de sync niet vellen; een onleesbare signaallijst telt als leeg. */
function veiligParseSignalen(rauw: string): string[] {
  try {
    const parsed = JSON.parse(rauw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}
