'use client'

import { ExternalLink, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@umanex/ui/components/ui/card'
import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { ScoreBadge } from './ScoreBadge'
import { StatusActies } from './StatusActies'
import { PlanBadge } from './plan/PlanBadge'
import type { Company, ItemStatus } from '@/lib/db/schema'
import type { KboVermoeden } from '@/lib/kbo/spiegel'

type LeadCardProps = {
  company: Company
  /**
   * Wat KBO vermoedelijk over dit bedrijf zegt, of null. Nadrukkelijk een vermoeden: de
   * koppeling loopt over een genormaliseerde naam, en gemeten over 27 leads koppelde er één
   * van de twaalf naar een tandartspraktijk. Vandaar dat de kaart de officiële naam, de
   * gemeente én de hoofdactiviteit toont — genoeg om een misser te zien — en niets van wat
   * er al stond overschrijft.
   */
  vermoeden: KboVermoeden | null
  isNew: boolean
  onStatusChange: (status: ItemStatus) => void
  /** Springt naar het Vacatures-tabblad met dit bedrijf als zoekterm. */
  onToonVacatures: (bedrijf: string) => void
  /** Opent het opvolgingspaneel. De API kende leads al; de kaart had de knop niet. */
  onOpvolging: () => void
  /** De voorbereidingsacties waaraan dit bedrijf hangt. Leeg = geen merkteken. */
  planKeys: string[]
}

export function LeadCard({
  company,
  vermoeden,
  isNew,
  onStatusChange,
  onToonVacatures,
  onOpvolging,
  planKeys,
}: LeadCardProps) {
  const signals = JSON.parse(company.signals) as string[]
  const breakdown = JSON.parse(company.scoreBreakdown) as Record<string, number>

  return (
    <Card className="transition-shadow hover:shadow-md" data-item={`lead-${company.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
              <h3 className="truncate text-sm font-semibold">{company.companyName}</h3>
              {isNew && (
                <Badge size="sm" variant="default" className="shrink-0">
                  nieuw
                </Badge>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {signals.map((signal) => (
                <Badge size="sm" key={signal} variant="outline" >
                  {signal}
                </Badge>
              ))}
            </div>
          </div>
          <ScoreBadge score={company.leadScore} opbouw={breakdown} soort="Leadscore" />
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
          {/* "deze" wees in een knoppenlijst naar niets, en na "Afwijzen" van de vorige kaart naar
              het verkeerde bedrijf. De naam begint met de zichtbare tekst en noemt het bedrijf. */}
          <button
            type="button"
            onClick={() => onToonVacatures(company.companyName)}
            aria-label={`toon deze vacatures van ${company.companyName}`}
            className={cn('rounded-sm text-foreground underline-offset-2 hover:underline', focusRing)}
            data-toon-vacatures
          >
            toon deze vacatures
          </button>
        </div>

        {vermoeden && (
          <p className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-l-2 border-border pl-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">KBO?</span>
            <span className="truncate">{vermoeden.kboNaam ?? '—'}</span>
            {vermoeden.gemeente && <span>· {vermoeden.gemeente}</span>}
            {vermoeden.labels.length > 0 && <span>· {vermoeden.labels.join(', ')}</span>}
            <span className="tabular-nums">· {vermoeden.nummer}</span>
          </p>
        )}

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
              className={cn(
                'flex items-center gap-1 rounded-sm transition-colors hover:text-foreground',
                focusRing
              )}
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
          <StatusActies
            endpoint={`/api/leads/${company.id}`}
            status={company.leadStatus as ItemStatus}
            naam={company.companyName}
            onStatusChange={onStatusChange}
          />
          <span className="flex items-center gap-2">
            <PlanBadge keys={planKeys} />
            <button
              type="button"
              onClick={onOpvolging}
              className={cn('rounded-md border px-2 py-1 text-2xs', focusRing)}
            >
              Opvolging
            </button>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
