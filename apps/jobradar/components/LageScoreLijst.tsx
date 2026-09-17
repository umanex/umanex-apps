'use client'

import { useId, useState } from 'react'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { ScoreBadge } from './ScoreBadge'
import { StatusActies } from './StatusActies'
import { LAGE_SCORE_GRENS } from '@/lib/triage'
import type { ItemStatus, Job } from '@/lib/db/schema'

type LageScoreLijstProps = {
  vacatures: Job[]
  onStatusChange: (id: number, status: ItemStatus) => void
}

/**
 * Vacatures onder de scoregrens, als compacte rijen in een ingeklapte sectie.
 *
 * Gemeten op 2026-09-17: 309 van 334 vacatures scoorden onder 5. Als kaart kregen ze hetzelfde
 * gewicht — en een luidere "nieuw"-badge — dan de 25 die ertoe deden, en triage betekende scrollen
 * langs serveurs en vendeuses. Weglaten zou de eerlijkheid van de dekkingsbalk breken; terugtreden
 * doet dat niet. Daarom: aanwezig, geteld, dicht.
 */
export function LageScoreLijst({ vacatures, onStatusChange }: LageScoreLijstProps) {
  const [open, setOpen] = useState(false)
  const lijstId = useId()

  if (vacatures.length === 0) return null

  return (
    <section className="mt-6 space-y-2" data-lage-score>
      <h3 className="text-sm font-semibold">
        <Button
          variant="ghost"
          size="sm"
          aria-expanded={open}
          aria-controls={lijstId}
          onClick={() => setOpen((o) => !o)}
          className="-ml-3 h-auto py-0 font-semibold"
        >
          <ChevronRight aria-hidden className={cn('transition-transform', open && 'rotate-90')} />
          Score onder {LAGE_SCORE_GRENS}
          {/* Met eenheid: een kaal getal in de toegankelijke naam zei niet wát er geteld werd. */}
          <span className="font-normal tabular-nums text-muted-foreground" data-telling>
            · {vacatures.length} {vacatures.length === 1 ? 'vacature' : 'vacatures'}
          </span>
        </Button>
      </h3>
      <ul id={lijstId} hidden={!open} className="divide-y rounded-lg border">
        {vacatures.map((job) => (
          <li key={job.id} data-vacature={job.id} data-item={`job-${job.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-0.5 text-sm">
            <ScoreBadge score={job.score} />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-medium">{job.title}</span>
              <span className="text-muted-foreground"> · {job.company}</span>
            </span>
            <span className="text-xs text-muted-foreground">{job.region}</span>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Bekijk ${job.title}`}
              className={cn(
                'flex items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Bekijk <ExternalLink aria-hidden className="h-3 w-3" />
            </a>
            <StatusActies
              endpoint={`/api/jobs/${job.id}`}
              status={job.jobStatus as ItemStatus}
              naam={job.title}
              onStatusChange={(s) => onStatusChange(job.id, s)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
