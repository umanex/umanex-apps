import type { Metadata } from 'next'
import { desc, eq } from 'drizzle-orm'
import { getDb } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { DashboardClient } from '@/components/DashboardClient'
import { berekenDekking } from '@/lib/coverage'
import { koppelBedrijven, type KboVermoeden } from '@/lib/kbo/spiegel'
import { leesKoppelingenPerBedrijf } from '@/lib/plan/lees'
import type { RegionCode } from '@/lib/regions'
import { leesStand } from '@/lib/triage'

export const dynamic = 'force-dynamic'

// Een eigen titel per route: Next kondigt een client-navigatie alleen aan wanneer `document.title`
// verandert (app-router-announcer.js in 15.5.25), en met één titel voor alle routes gebeurde dat nooit.
export const metadata: Metadata = {
  title: 'Radar — JobRadar',
}

export default async function HomePage({
  searchParams,
}: {
  /**
   * De filterstand: `?tab=leads&zoek=Acme` (de sprong vanuit het bedrijfsplan) en sinds
   * 2026-09-17 ook `status`, `regio` en `score`.
   *
   * Server-side gelezen en als beginwaarde doorgegeven, niet via `useSearchParams`: dat zou
   * een Suspense-grens vragen rond een client-component die al de hele pagina is.
   */
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ruw = await searchParams
  // Een parameter die twee keer in de URL staat, komt als array binnen; de eerste telt.
  const stand = leesStand({
    get: (naam) => {
      const w = ruw[naam]
      return Array.isArray(w) ? (w[0] ?? null) : (w ?? null)
    },
  })
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
  //
  // Een spiegel die wél bestaat maar niet opent (een mislukte ATTACH, een onleesbaar bestand) gooit
  // in `open()`. Zonder deze vangst viel het hele dashboard op de foutpagina, terwijl de koppeling
  // een verrijking is: dan een lege map, en de leadkaarten zeggen waarom.
  let vermoedens: Record<string, KboVermoeden> = {}
  let spiegelFout = false
  try {
    vermoedens = Object.fromEntries(
      koppelBedrijven(companies.map((c) => ({ naam: c.companyName, regio: c.region as RegionCode })))
    )
  } catch (e) {
    console.error('[jobradar] KBO-spiegel niet te openen; dashboard zonder koppelingen', e)
    spiegelFout = true
  }

  // Welke bedrijven aan een voorbereidingsactie hangen. Eén kleine query; de kaart toont er
  // een merkteken mee en hoeft er niets voor op te halen.
  const koppelingen = leesKoppelingenPerBedrijf(db)

  return (
    <main className="w-full mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <DashboardClient
        jobs={jobs}
        companies={companies}
        previousSyncAt={previousSyncAt}
        dekking={dekking}
        vermoedens={vermoedens}
        koppelingen={koppelingen}
        initialStand={stand}
        spiegelFout={spiegelFout}
      />
    </main>
  )
}
