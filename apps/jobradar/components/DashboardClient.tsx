'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { FilterBar } from './FilterBar'
import { SyncButton } from './SyncButton'
import { CoverageBar } from './CoverageBar'
import { JobCard } from './JobCard'
import { LeadCard } from './LeadCard'
import type { Job, Company, ItemStatus } from '@/lib/db/schema'
import type { RegionCode } from '@/lib/regions'
import type { Dekking } from '@/lib/coverage'

type DashboardClientProps = {
  jobs: Job[]
  companies: Company[]
  previousSyncAt: string
  dekking: Dekking
}

const ALL_REGIONS: RegionCode[] = ['WVL', 'OVL', 'BRU']

export function DashboardClient({
  jobs: initialJobs,
  companies: initialCompanies,
  previousSyncAt,
  dekking,
}: DashboardClientProps) {
  const [jobs, setJobs] = useState(initialJobs)
  const [companies, setCompanies] = useState(initialCompanies)
  const [regions, setRegions] = useState<RegionCode[]>(ALL_REGIONS)
  const [minScore, setMinScore] = useState(0)
  const [statusFilter, setStatusFilter] = useState<ItemStatus | ''>('')
  const [zoek, setZoek] = useState('')
  // Controlled, want de doorklik vanaf een lead moet het tabblad kunnen zetten.
  const [tab, setTab] = useState('jobs')
  // Onthouden of de huidige zoekterm van een doorklik komt: dan verdient een lege lijst
  // een andere uitleg dan een gewone mistreffer.
  const [viaLead, setViaLead] = useState(false)

  // Gewone substring, geen regex — een zoekterm met een haakje erin is een zoekterm, geen patroon.
  const term = zoek.trim().toLowerCase()
  const raakt = (...velden: string[]) => term === '' || velden.some((v) => v.toLowerCase().includes(term))

  const toonVacaturesVan = (bedrijf: string) => {
    setZoek(bedrijf)
    setViaLead(true)
    setTab('jobs')
  }

  const wijzigZoek = (waarde: string) => {
    setZoek(waarde)
    setViaLead(false)
  }

  const filteredJobs = jobs
    .filter((j) =>
      regions.includes(j.region as RegionCode) &&
      j.score >= minScore &&
      (statusFilter === '' || j.jobStatus === statusFilter) &&
      raakt(j.title, j.company)
    )
    .sort((a, b) => b.score - a.score)

  const filteredCompanies = companies
    .filter((c) =>
      regions.includes(c.region as RegionCode) &&
      c.leadScore >= minScore &&
      (statusFilter === '' || c.leadStatus === statusFilter) &&
      raakt(c.companyName)
    )
    .sort((a, b) => b.leadScore - a.leadScore)

  const handleJobStatusChange = (id: number, status: ItemStatus) => {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, jobStatus: status } : j)))
  }

  const handleLeadStatusChange = (id: number, status: ItemStatus) => {
    setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, leadStatus: status } : c)))
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">JobRadar</h1>
          <div className="flex items-center gap-4">
            <Link
              href="/instellingen"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Instellingen
            </Link>
            <SyncButton />
          </div>
        </div>

        <CoverageBar dekking={dekking} />

        <FilterBar
          zoek={zoek}
          onZoekChange={wijzigZoek}
          regions={regions}
          minScore={minScore}
          statusFilter={statusFilter}
          onRegionsChange={setRegions}
          onMinScoreChange={setMinScore}
          onStatusFilterChange={setStatusFilter}
        />

        <Tabs value={tab} onValueChange={setTab}>
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
              <EmptyState
                message={
                  viaLead
                    ? `Geen vacatures van "${zoek}" in de lijst. De lead is gebaseerd op vacatures die intussen uit het venster van 30 dagen kunnen zijn gelopen — een sync haalt de huidige op.`
                    : term
                      ? `Geen vacatures gevonden voor "${zoek}".`
                      : "Geen vacatures gevonden. Druk op 'Sync nu' om data op te halen."
                }
              />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isNew={job.firstSeenAt >= previousSyncAt}
                    onStatusChange={(status) => handleJobStatusChange(job.id, status)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="leads">
            {filteredCompanies.length === 0 ? (
              <EmptyState
                message={
                  term
                    ? `Geen leads gevonden voor "${zoek}".`
                    : "Geen leads gevonden. Druk op 'Sync nu' om data op te halen."
                }
              />
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredCompanies.map((company) => (
                  <LeadCard
                    key={company.id}
                    company={company}
                    isNew={company.firstSeenAt >= previousSyncAt}
                    onStatusChange={(status) => handleLeadStatusChange(company.id, status)}
                onToonVacatures={toonVacaturesVan}
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
