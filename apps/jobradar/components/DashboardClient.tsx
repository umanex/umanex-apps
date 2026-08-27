'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs'
import { TooltipProvider } from '@umanex/ui/components/ui/tooltip'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { FilterBar } from './FilterBar'
import { SyncButton } from './SyncButton'
import { CoverageBar } from './CoverageBar'
import { JobCard } from './JobCard'
import { LeadCard } from './LeadCard'
import type { Job, Company, ItemStatus } from '@/lib/db/schema'
import { normaliseerBedrijf } from '@/lib/matching'
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

  /**
   * Bij een doorklik matchen we op de bedrijfssleutel, niet op de vrije zoektekst.
   *
   * De telling op de kaart groepeert via `normaliseerBedrijf`; het zoekveld kijkt ook naar
   * titels. Dat liep uiteen: "Volvo Group" toonde 3 op de kaart en 6 na de klik, want een
   * uitzendkantoor zet de klantnaam in de titel. Twee getallen die elkaar tegenspreken op
   * één klik afstand, terwijl herleidbaarheid het hele punt van die knop is.
   */
  const bedrijfsSleutel = viaLead ? normaliseerBedrijf(zoek) : null
  const raaktJob = (titel: string, bedrijf: string) =>
    bedrijfsSleutel !== null ? normaliseerBedrijf(bedrijf) === bedrijfsSleutel : raakt(titel, bedrijf)

  const zoekveldRef = useRef<HTMLInputElement>(null)

  const toonVacaturesVan = (bedrijf: string) => {
    setZoek(bedrijf)
    setViaLead(true)
    setTab('jobs')
    // Het leadpaneel unmount bij het wisselen van tabblad, dus de knop verdwijnt onder de
    // focus vandaan en die valt terug op body. De focus verhuist mee naar het zoekveld, dat
    // nu de bedrijfsnaam draagt en waar je hem ook weer kunt wissen.
    requestAnimationFrame(() => zoekveldRef.current?.focus())
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
      raaktJob(j.title, j.company)
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
              className={cn(
                'rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Instellingen
            </Link>
            <SyncButton />
          </div>
        </div>

        <CoverageBar dekking={dekking} />

        <FilterBar
          veldRef={zoekveldRef}
          zoek={zoek}
          onZoekChange={wijzigZoek}
          regions={regions}
          minScore={minScore}
          statusFilter={statusFilter}
          onRegionsChange={setRegions}
          onMinScoreChange={setMinScore}
          onStatusFilterChange={setStatusFilter}
        />

        {/* Na een doorklik verandert de lijst zonder dat er iets verplaatst; zonder dit hoort
            een schermlezergebruiker niet wat er gebeurde. */}
        <p aria-live="polite" className="sr-only">
          {viaLead
            ? `${filteredJobs.length} ${filteredJobs.length === 1 ? 'vacature' : 'vacatures'} van ${zoek}`
            : ''}
        </p>

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
            {/* Het tabblad draagt het label al zichtbaar en Radix hangt het paneel er via
                aria-labelledby aan; wat ontbrak was het NIVEAU. Zonder deze h2 sprong de
                koppen-outline van h1 naar 327 kaart-h3's (ux-audit 2026-08-11, P3). */}
            <h2 className="sr-only">Vacatures</h2>
            {filteredJobs.length === 0 ? (
              <EmptyState
                message={
                  // Geen diagnose die niet gecontroleerd is. Er zijn twee toestanden en het
                  // verschil is meetbaar: staat het bedrijf wél in de database, dan filteren
                  // regio, score of status het weg. Staat het er niet, dan is dat het antwoord.
                  bedrijfsSleutel !== null
                    ? jobs.some((j) => normaliseerBedrijf(j.company) === bedrijfsSleutel)
                      ? `Geen vacatures van "${zoek}" binnen je huidige filters — pas regio, status of minimumscore aan.`
                      : `Er staan geen vacatures van "${zoek}" in de database.`
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
            <h2 className="sr-only">Leads</h2>
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
