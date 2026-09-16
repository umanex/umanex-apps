'use client'

import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { BESLISMOMENT_LABEL, type BeslissingWeergave } from '@/lib/plan/types'

type BeslismomentenProps = {
  beslissingen: BeslissingWeergave[]
  /** Compact voor het overzicht; volledig op het eigen tabblad. */
  compact?: boolean
  onOpen: (key: string) => void
}

/**
 * De beslismomenten.
 *
 * "Klaar voor beoordeling" is een afgeleide stand en geen goedkeuring — de pil zegt dat er
 * iets te beoordelen valt, niet dat het besloten is. Dat onderscheid is de reden dat
 * beslismomenten een eigen tabel hebben in plaats van een afgeleide van de acties.
 */
export function Beslismomenten({ beslissingen, compact = false, onOpen }: BeslismomentenProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Beslismomenten</h3>
      <ol className="space-y-3">
        {beslissingen.map((b) => (
          <li key={b.key} className="rounded-md border p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm tabular-nums text-muted-foreground">{b.key}</span>
              <button
                type="button"
                onClick={() => onOpen(b.key)}
                className={cn(
                  'rounded-sm text-left text-sm font-semibold underline-offset-2 hover:underline',
                  focusRing
                )}
              >
                {b.titel}
              </button>
              <Badge
                variant={
                  b.afgeleid === 'beslist'
                    ? 'success'
                    : b.afgeleid === 'klaar_voor_beoordeling'
                      ? 'warning'
                      : 'outline'
                }
                className="text-2xs"
              >
                {BESLISMOMENT_LABEL[b.afgeleid]}
                {b.afgeleid === 'klaar_voor_beoordeling' && ' — geen goedkeuring'}
              </Badge>
            </div>

            {!compact && b.vraag && (
              <p className="mt-1 text-sm text-muted-foreground">{b.vraag}</p>
            )}

            {b.totaal > 0 && (
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {b.gereed} van {b.totaal} gekoppelde acties gereed
                {!compact && b.acties.length > 0 && `: ${b.acties.join(', ')}`}
              </p>
            )}

            {b.beslissing && (
              <p className="mt-2 text-sm">
                <span className="font-medium">{b.beslissing}</span>
                <span className="tabular-nums text-muted-foreground">
                  {' '}
                  ({b.beslistOp ?? 'zonder datum'})
                </span>
              </p>
            )}
            {!compact && b.onderbouwing && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                {b.onderbouwing}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
