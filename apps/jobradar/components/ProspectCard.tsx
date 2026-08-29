'use client'

import { ExternalLink, Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@umanex/ui/components/ui/card'
import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { StatusDropdown } from './StatusDropdown'
import { NACE_LABEL, leeftijdInJaren } from '@/lib/kbo/universum'
import type { ItemStatus } from '@/lib/db/schema'

export type Prospect = {
  nummer: string
  naam: string
  handelsnaam: string | null
  opgericht: string | null
  postcode: string | null
  gemeente: string | null
  codes: string | null
  website: string | null
  werkgever: number
  status: ItemStatus
}

type ProspectCardProps = {
  prospect: Prospect
  /** Er kwamen vacatures van dit ondernemingsnummer binnen: dit is óók een lead. */
  heeftVacatures: boolean
  vandaag: string
  onStatusChange: (status: ItemStatus) => void
}

/** `0417238867` → `0417.238.867`, de vorm waarin een ondernemingsnummer geschreven wordt. */
function metPunten(nummer: string): string {
  return nummer.length === 10 ? `${nummer.slice(0, 4)}.${nummer.slice(4, 7)}.${nummer.slice(7)}` : nummer
}

/**
 * Een prospect is géén lead: er is geen vacature, dus ook geen signaal en geen score. Wat de
 * kaart toont is wat KBO wél weet — activiteit, leeftijd, plaats — plus een website bij de
 * 6% die er een heeft. Bewust geen scorepil: een getal suggereert een rangschikking die de
 * data niet draagt.
 */
export function ProspectCard({ prospect, heeftVacatures, vandaag, onStatusChange }: ProspectCardProps) {
  const codes = (prospect.codes ?? '').split(',').filter(Boolean)
  const jaren = leeftijdInJaren(prospect.opgericht, vandaag)
  const jaartal = prospect.opgericht?.slice(0, 4) ?? null

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <h3 className="truncate text-sm font-semibold">{prospect.naam}</h3>
              {heeftVacatures && (
                <Badge variant="default" className="shrink-0 text-2xs">
                  heeft vacatures
                </Badge>
              )}
            </div>
            {prospect.handelsnaam && prospect.handelsnaam !== prospect.naam && (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{prospect.handelsnaam}</p>
            )}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {codes.map((code) => (
                <Badge key={code} variant="outline" className="text-2xs">
                  {NACE_LABEL[code] ?? code}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {jaartal && (
            <span className="tabular-nums">
              {jaartal}
              {jaren !== null && ` · ${jaren} jaar`}
            </span>
          )}
          {!prospect.werkgever && <span>geen personeel bekend</span>}
          <span className="tabular-nums">{metPunten(prospect.nummer)}</span>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            {prospect.postcode && <span className="rounded bg-muted px-1.5 py-0.5 tabular-nums">{prospect.postcode}</span>}
            {prospect.gemeente && <span className="truncate">{prospect.gemeente}</span>}
          </span>
          {prospect.website && (
            <a
              href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn('flex items-center gap-1 rounded-sm transition-colors hover:text-foreground', focusRing)}
            >
              Website <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <div className="mt-2 border-t pt-2">
          <StatusDropdown
            endpoint={`/api/prospects/${prospect.nummer}`}
            status={prospect.status}
            onStatusChange={onStatusChange}
          />
        </div>
      </CardContent>
    </Card>
  )
}
