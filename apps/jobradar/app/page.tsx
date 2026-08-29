import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { DashboardClient } from '@/components/DashboardClient'
import { berekenDekking } from '@/lib/coverage'
import { koppelBedrijven } from '@/lib/kbo/spiegel'
import type { RegionCode } from '@/lib/regions'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const db = getDb()
  const [jobs, companies, syncRuns] = await Promise.all([
    db.query.jobs.findMany({ orderBy: (j, { desc: d }) => [d(j.score)] }),
    db.query.companies.findMany({ orderBy: (c, { desc: d }) => [d(c.leadScore)] }),
    db.query.syncRuns.findMany({
      where: eq(schema.syncRuns.status, 'done'),
      orderBy: [desc(schema.syncRuns.startedAt)],
      limit: 2,
    }),
  ])

  // Items first seen after this timestamp are "new"
  const previousSyncAt = syncRuns[1]?.startedAt ?? '1970-01-01T00:00:00.000Z'

  // Op de huidige classificatie, niet op wat bij de sync gold — zie lib/coverage.ts.
  const dekking = berekenDekking(jobs)

  // Bij het renderen koppelen, niet bij de sync: 0,1 ms per opzoeking, en wat niet opgeslagen
  // wordt kan niet verouderen ten opzichte van de spiegel. Zonder spiegel is dit een lege map
  // en verandert er niets aan de kaarten.
  const vermoedens = Object.fromEntries(
    koppelBedrijven(companies.map((c) => ({ naam: c.companyName, regio: c.region as RegionCode })))
  )

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardClient
        jobs={jobs}
        companies={companies}
        previousSyncAt={previousSyncAt}
        dekking={dekking}
        vermoedens={vermoedens}
      />
    </main>
  )
}
