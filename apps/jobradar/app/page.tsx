import { desc, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { DashboardClient } from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
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

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardClient
        jobs={jobs}
        companies={companies}
        previousSyncAt={previousSyncAt}
      />
    </main>
  )
}
