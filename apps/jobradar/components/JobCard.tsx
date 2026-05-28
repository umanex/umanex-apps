'use client'

import { ExternalLink } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@umanex/ui/components/ui/card'
import { Badge } from '@umanex/ui/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@umanex/ui/components/ui/tooltip'
import { ScoreBadge } from './ScoreBadge'
import type { Job } from '@/lib/db/schema'

type JobCardProps = {
  job: Job
  isNew: boolean
}

export function JobCard({ job, isNew }: JobCardProps) {
  const breakdown = JSON.parse(job.scoreBreakdown) as Record<string, number>
  const hasBreakdown = Object.keys(breakdown).length > 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold">{job.title}</h3>
              {isNew && (
                <Badge variant="default" className="shrink-0 text-[10px]">
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
          <span className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5">{job.region}</span>
            <span>{job.postcode}</span>
            <span className="rounded bg-muted px-1.5 py-0.5">{job.source}</span>
          </span>
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            Bekijk <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
