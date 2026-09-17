'use client'

import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@umanex/ui/components/ui/card'
import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@umanex/ui/components/ui/tooltip'
import { ScoreBadge } from './ScoreBadge'
import { StatusActies } from './StatusActies'
import { LAGE_SCORE_GRENS } from '@/lib/triage'
import type { Job, ItemStatus } from '@/lib/db/schema'

type JobCardProps = {
  job: Job
  isNew: boolean
  /** Uit wanneer alle vacatures uit één bron komen: dan zegt "adzuna" op elke kaart niets. */
  toonBron: boolean
  onStatusChange: (status: ItemStatus) => void
}

export function JobCard({ job, isNew, toonBron, onStatusChange }: JobCardProps) {
  const breakdown = JSON.parse(job.scoreBreakdown) as Record<string, number>
  const hasBreakdown = Object.keys(breakdown).length > 0

  return (
    <Card className="transition-shadow hover:shadow-md" data-item={`job-${job.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{job.title}</h3>
              {/* Outline en alleen vanaf de scoregrens: de gevulde badge was het luidste element
                  op de kaart, ook op een score 0 (critique 2026-09-17). */}
              {isNew && job.score >= LAGE_SCORE_GRENS && (
                <Badge variant="outline" className="shrink-0 text-2xs" data-nieuw>
                  nieuw
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{job.company}</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ScoreBadge score={job.score} />
              </span>
            </TooltipTrigger>
            {hasBreakdown && (
              <TooltipContent className="max-w-[200px]">
                <ul className="space-y-1 text-xs">
                  {Object.entries(breakdown).map(([key, val]) => (
                    <li key={key} className="flex justify-between gap-4">
                      <span>{key}</span>
                      <span className="tabular-nums font-medium">+{val}</span>
                    </li>
                  ))}
                </ul>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {/* Op één regel: "Brussel Hoofdstad" brak over twee regels en duwde de rij uit elkaar. */}
          <span className="flex min-w-0 items-center gap-2 whitespace-nowrap" data-meta>
            <span className="rounded bg-muted px-1.5 py-0.5">{job.region}</span>
            {/* Adzuna levert geen postcode — die stond hier als een kale "0" op elke kaart. */}
            {(job.city || job.postcode > 0) && <span className="min-w-0 truncate">{job.city ?? job.postcode}</span>}
            {toonBron && <span className="rounded bg-muted px-1.5 py-0.5" data-bron>{job.source}</span>}
          </span>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'flex items-center gap-1 rounded-sm transition-colors hover:text-foreground',
              focusRing
            )}
          >
            Bekijk <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        <div className="mt-2 border-t pt-2">
          <StatusActies
            endpoint={`/api/jobs/${job.id}`}
            status={job.jobStatus as ItemStatus}
            naam={job.title}
            onStatusChange={onStatusChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
