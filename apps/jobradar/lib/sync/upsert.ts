import { and, eq, ne } from 'drizzle-orm'
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import * as schema from '../db/schema'
import { scoreJob, scoreLead, jobDedupeHash, leadDedupeHash, kiesDedupeHash } from '../matching'
import { mergeSignalen, mergeBronSignalen, sorteerSignalen } from '../signals'
import type { RawJob, RawLead } from '../sources/types'

/**
 * Deze functies staan bewust náást de route en niet erin.
 *
 * In de handler waren ze closures over `db` en dus door geen enkele test aan te roepen —
 * `scripts/signal-scenarios.ts` importeerde `route.ts` niet. Daardoor was precies het stuk
 * dat een sync kan laten crashen (de dedupe-sleutel bij het bijwerken) ongedekt, terwijl de
 * pure functie eronder wél drie checks had. Hier kan een suite ze op een `:memory:`-database
 * uitrijden, zonder Next, zonder netwerk en zonder ook maar in de buurt van echte data te komen.
 */
export type JobradarDb = BetterSQLite3Database<typeof schema>

export async function upsertJob(db: JobradarDb, job: RawJob): Promise<{ added: boolean }> {
  const hash = jobDedupeHash(job)
  const { score, breakdown } = scoreJob(job)
  const now = new Date().toISOString()

  const bestaand =
    (await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.source, job.source), eq(schema.jobs.externalId, job.externalId)),
    })) ?? (await db.query.jobs.findFirst({ where: eq(schema.jobs.dedupeHash, hash) }))

  if (bestaand) {
    // Een andere rij kan de nieuwe sleutel al dragen; dan houdt deze de zijne.
    const bezet = await db.query.jobs.findFirst({
      where: and(eq(schema.jobs.dedupeHash, hash), ne(schema.jobs.id, bestaand.id)),
    })

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
        dedupeHash: kiesDedupeHash(hash, bestaand.dedupeHash, !bezet),
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

export async function upsertLead(
  db: JobradarDb,
  lead: RawLead,
  opties: { afgeleid: boolean }
): Promise<{ added: boolean }> {
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
    const bezet = await db.query.companies.findFirst({
      where: and(eq(schema.companies.dedupeHash, hash), ne(schema.companies.id, bestaand.id)),
    })
    const huidige = veiligParseSignalen(bestaand.signals)
    const signals = opties.afgeleid
      ? mergeSignalen(huidige, lead.signals)
      : mergeBronSignalen(huidige, lead.signals)
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
        dedupeHash: kiesDedupeHash(hash, bestaand.dedupeHash, !bezet),
        lastSeenAt: now,
      })
      .where(eq(schema.companies.id, bestaand.id))
    return { added: false }
  }

  // Zelfde normalisatie als op het UPDATE-pad, anders verschilt de opgeslagen JSON tussen
  // de eerste en de tweede sync terwijl de inhoud gelijk is.
  const nieuweSignalen = sorteerSignalen(lead.signals)
  const { score, breakdown } = scoreLead({ signals: nieuweSignalen })
  await db.insert(schema.companies).values({
    externalId: lead.externalId,
    source: lead.source,
    companyName: lead.companyName,
    postcode: lead.postcode,
    region: lead.region,
    naceCode: lead.naceCode,
    url: lead.url,
    signals: JSON.stringify(nieuweSignalen),
    leadScore: score,
    scoreBreakdown: JSON.stringify(breakdown),
    dedupeHash: hash,
    firstSeenAt: now,
    lastSeenAt: now,
  })
  return { added: true }
}

/** Eén corrupte rij mag de sync niet vellen; een onleesbare signaallijst telt als leeg. */
export function veiligParseSignalen(rauw: string): string[] {
  try {
    const parsed = JSON.parse(rauw)
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : []
  } catch {
    return []
  }
}
