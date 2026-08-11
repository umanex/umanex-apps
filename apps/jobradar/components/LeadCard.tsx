'use client'

import { ExternalLink, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@umanex/ui/components/ui/card'
import { Badge } from '@umanex/ui/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@umanex/ui/components/ui/tooltip'
import { ScoreBadge } from './ScoreBadge'
import { StatusDropdown } from './StatusDropdown'
import type { Company, ItemStatus } from '@/lib/db/schema'

type LeadCardProps = {
  company: Company
  isNew: boolean
  onStatusChange: (status: ItemStatus) => void
  /** Springt naar het Vacatures-tabblad met dit bedrijf als zoekterm. */
  onToonVacatures: (bedrijf: string) => void
}

export function LeadCard({ company, isNew, onStatusChange, onToonVacatures }: LeadCardProps) {
  const signals = JSON.parse(company.signals) as string[]
  const breakdown = JSON.parse(company.scoreBreakdown) as Record<string, number>
  const hasBreakdown = Object.keys(breakdown).length > 0

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold">{company.companyName}</h3>
              {isNew && (
                <Badge variant="default" className="shrink-0 text-2xs">
                  nieuw
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {signals.map((signal) => (
                <Badge key={signal} variant="outline" className="text-2xs">
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <ScoreBadge score={company.leadScore} />
              </span>
            </TooltipTrigger>
            {hasBreakdown && (
              <TooltipContent className="max-w-[220px]">
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
        {/* Waarop het signaal rust. Zonder dit is de kaart een bewering zonder bewijs —
            de tellingen werden al berekend en vervolgens weggegooid (UX-audit, P1). */}
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {company.vacatureAantal === null ? (
            // Twee verschillende toestanden die allebei op null uitkomen. Zonder dit
            // onderscheid leest een lead die zijn signaal verloor als een lead die nog
            // geteld moet worden — en dat is het tegenovergestelde.
            <span>{signals.length === 0 ? '— geen signaal meer' : '— nog niet geteld'}</span>
          ) : (
            <span className="tabular-nums">
              {company.vacatureAantal} {company.vacatureAantal === 1 ? 'vacature' : 'vacatures'} ·{' '}
              {company.designVacatures ?? 0} design · {company.devVacatures ?? 0} dev
            </span>
          )}
          <button
            type="button"
            onClick={() => onToonVacatures(company.companyName)}
            className="rounded text-foreground underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            toon deze vacatures
          </button>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="rounded bg-muted px-1.5 py-0.5">{company.region}</span>
            {/* Een uit vacatures afgeleide lead heeft zelden een postcode — Adzuna levert er
                geen. Zonder deze guard stond er een kale "0" op elke zulke kaart. */}
            {company.postcode > 0 && <span>{company.postcode}</span>}
            {company.naceCode && (
              <span className="rounded bg-muted px-1.5 py-0.5">{company.naceCode}</span>
            )}
          </span>
          {company.url && (
            <a
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-2 border-t pt-2">
          <StatusDropdown
            itemId={company.id}
            status={company.leadStatus as ItemStatus}
            type="lead"
            onStatusChange={onStatusChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
