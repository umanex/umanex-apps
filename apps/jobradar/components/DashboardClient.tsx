'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { FilterBar } from './FilterBar'
import { SyncButton } from './SyncButton'
import { JobCard } from './JobCard'
import { LeadCard } from './LeadCard'
import type { Job, Company } from '@/lib/db/schema'
import type { RegionCode } from '@/lib/regions'

type DashboardClientProps = {
  jobs: Job[]
  companies: Company[]
  previousSyncAt: string
}

const ALL_REGIONS: RegionCode[] = ['WVL', 'OVL', 'BRU']

export function DashboardClient({ jobs, companies, previousSyncAt }: DashboardClientProps) {
  const [regions, setRegions] = useState<RegionCode[]>(ALL_REGIONS)
  const [minScore, setMinScore] = useState(0)

  const filteredJobs = jobs
    .filter((j) => regions.includes(j.region as RegionCode) && j.score >= minScore)
    .sort((a, b) => b.score - a.score)

  const filteredCompanies = companies
    .filter((c) => regions.includes(c.region as RegionCode) && c.leadScore >= minScore)
    .sort((a, b) => b.leadScore - a.leadScore)

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">JobRadar</h1>
          <SyncButton />
        </div>

        <FilterBar
          regions={regions}
          minScore={minScore}
          onRegionsChange={setRegions}
          onMinScoreChange={setMinScore}
        />

        <Tabs defaultValue="jobs">
          <TabsList>
            <TabsTrigger value="jobs">
              Vacatures
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {filteredJobs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="leads">
              Leads
              <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-xs tabular-nums">
                {filteredCompanies.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            {filteredJobs.length === 0 ? (
              <EmptyState message="Geen vacatures gevonden. Druk op 'Sync nu' om data op te halen." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isNew={job.firstSeenAt >= previousSyncAt}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            {filteredCompanies.length === 0 ? (
              <EmptyState message="Geen leads gevonden. Druk op 'Sync nu' om data op te halen." />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <LeadCard
                    key={company.id}
                    company={company}
                    isNew={company.firstSeenAt >= previousSyncAt}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
      <p className="text-sm">{message}</p>
    </div>
  )
}
