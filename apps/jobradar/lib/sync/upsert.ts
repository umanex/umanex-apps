import { and, eq, ne, notInArray } from 'drizzle-orm'
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
        // Alleen schrijven wanneer de bron ze levert: een externe bron mag de tellingen van
        // een eerdere afleiding niet wissen met niets.
        ...(lead.tellingen
          ? {
              vacatureAantal: lead.tellingen.totaal,
              designVacatures: lead.tellingen.design,
              devVacatures: lead.tellingen.dev,
            }
          : {}),
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
    vacatureAantal: lead.tellingen?.totaal ?? null,
    designVacatures: lead.tellingen?.design ?? null,
    devVacatures: lead.tellingen?.dev ?? null,
    dedupeHash: hash,
    firstSeenAt: now,
    lastSeenAt: now,
  })
  return { added: true }
}

/**
 * Haalt de afgeleide signalen weg bij leads die deze run niet meer afgeleid werden.
 *
 * Zonder dit houdt een lead zijn score en signalen ook nadat de afleiding hem niet meer
 * oplevert. De rij blijft staan — een status die jij erop gezet hebt is van jou — maar de
 * bewering verdwijnt, en daarmee de score. Wat een externe bron ooit zei blijft wél staan.
 *
 * **Wanneer dit in de praktijk vuurt.** Sinds de afleiding over álle opgeslagen vacatures
 * loopt, blijft een bedrijf afgeleid zolang zijn vacatures in de database staan — en er is
 * vandaag geen enkel pad dat vacatures verwijdert. Dit vuurt dus alleen na een handmatige
 * opruiming, of wanneer een bedrijf onder de drempels zakt doordat de classificatie
 * verandert. Dat is zeldzaam, en het is geen reden om de guard weg te laten: hij is er voor
 * het moment dat verlopen vacatures wél opgeruimd worden.
 */
export async function verouderdeLeadsOpruimen(
  db: JobradarDb,
  actueleExternalIds: readonly string[]
): Promise<number> {
  const verouderd = await db.query.companies.findMany({
    where:
      actueleExternalIds.length > 0
        ? and(eq(schema.companies.source, 'vacatures'), notInArray(schema.companies.externalId, [...actueleExternalIds]))
        : eq(schema.companies.source, 'vacatures'),
  })

  let opgeruimd = 0
  for (const rij of verouderd) {
    const huidige = veiligParseSignalen(rij.signals)
    const resterend = mergeSignalen(huidige, [])
    if (resterend.length === huidige.length) continue
    const { score, breakdown } = scoreLead({ signals: resterend })
    await db
      .update(schema.companies)
      .set({
        signals: JSON.stringify(resterend),
        leadScore: score,
        scoreBreakdown: JSON.stringify(breakdown),
        vacatureAantal: null,
        designVacatures: null,
        devVacatures: null,
      })
      .where(eq(schema.companies.id, rij.id))
    opgeruimd++
  }
  return opgeruimd
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
