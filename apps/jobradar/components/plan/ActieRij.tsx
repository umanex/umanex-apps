'use client'

import { useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PlanStatusPill } from './PlanStatusPill'
import { STATUS_LABEL_INLINE, type ActieStatus, type ActieWeergave } from '@/lib/plan/types'

type ActieRijProps = {
  actie: ActieWeergave
  /** Welke bediening deze rij krijgt; de lijst waarin hij staat bepaalt dat. */
  variant: 'bezig' | 'beschikbaar' | 'geblokkeerd' | 'lijst' | 'uitgesteld'
  vandaag: string
  bezig: boolean
  onOpen: (key: string) => void
  onStatus: (key: string, status: ActieStatus) => void
  onVolgendeStap?: (key: string, tekst: string) => void
}

/**
 * Eén actie als rij.
 *
 * De titel is een `button` en geen kop: in een lijst van 22 zou elke titel een `h4` worden en
 * de kopstructuur van de pagina vullen met ruis waar een schermlezer doorheen moet. De rij is
 * een item in een lijst; de sectie eromheen draagt de kop.
 *
 * De rij draagt hoogstens één handeling, afgeleid uit de uitvoerbaarheid: Start op een
 * beschikbare actie, Afronden… op een lopende. Afronden vraagt bewijs, dus die knop opent het
 * paneel op de afrond-sectie in plaats van iets te versturen.
 */
export function ActieRij({
  actie,
  variant,
  vandaag,
  bezig,
  onOpen,
  onStatus,
  onVolgendeStap,
}: ActieRijProps) {
  const [stapBewerken, setStapBewerken] = useState(false)
  const [stap, setStap] = useState(actie.volgendeStap ?? '')

  const herbekijkVerlopen =
    actie.status === 'uitgesteld' && actie.herbekijkOp !== null && actie.herbekijkOp <= vandaag

  return (
    <li data-actie={actie.key} className="rounded-md border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm tabular-nums text-muted-foreground">{actie.key}</span>
            <button
              type="button"
              onClick={() => onOpen(actie.key)}
              className={cn(
                'rounded-sm text-left text-sm font-semibold underline-offset-2 hover:underline',
                focusRing
              )}
            >
              {actie.titel}
            </button>
            {actie.signalen.map((s) => (
              <Badge
                key={`${s.soort}-${s.key}`}
                variant={s.soort === 'afhankelijkheid_vervallen' ? 'destructive' : 'warning'}
                className="text-2xs font-normal"
              >
                {s.tekst}
              </Badge>
            ))}
            {herbekijkVerlopen && (
              <Badge variant="warning" className="text-2xs">
                herbekijkdatum verstreken
              </Badge>
            )}
          </div>

          {variant === 'bezig' && stapBewerken ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="text"
                aria-label={`Volgende stap van ${actie.key}`}
                value={stap}
                maxLength={300}
                disabled={bezig}
                onChange={(e) => setStap(e.target.value)}
                className={cn(
                  'min-w-0 flex-1 rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50',
                  focusRing
                )}
              />
              <Button
                size="sm"
                disabled={bezig}
                onClick={() => {
                  onVolgendeStap?.(actie.key, stap)
                  setStapBewerken(false)
                }}
              >
                Bewaar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={bezig}
                onClick={() => {
                  setStap(actie.volgendeStap ?? '')
                  setStapBewerken(false)
                }}
              >
                Annuleer
              </Button>
            </div>
          ) : actie.volgendeStap !== null || variant === 'bezig' ? (
            // Alleen een lopende actie meldt dat er geen volgende stap is: daar is het een
            // opdracht ("bepaal hem"). Op 22 niet-gestarte rijen was dezelfde zin ruis die las
            // als achterstand — gemeten in de critique van 2026-09-17.
            <p className="mt-1 text-sm">
              {actie.volgendeStap ?? (
                <span className="text-muted-foreground">Geen volgende stap</span>
              )}
              {variant === 'bezig' && (
                <button
                  type="button"
                  onClick={() => setStapBewerken(true)}
                  className={cn(
                    'ml-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                    focusRing
                  )}
                >
                  Wijzig
                </button>
              )}
            </p>
          ) : null}

          {actie.blokkade.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Waarop ${actie.key} wacht`}>
              {actie.blokkade.map((b) => (
                <li key={b.key}>
                  {/* Met de titel: "wacht op A05" vroeg je te onthouden wat A05 was. */}
                  <Badge variant={b.hard ? 'destructive' : 'outline'} className="text-2xs font-normal">
                    {b.hard
                      ? `${b.key} · ${b.titel} is vervallen — verwijder of vervang de afhankelijkheid`
                      : `wacht op ${b.key} · ${b.titel} (${STATUS_LABEL_INLINE[b.status]})`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}

          {variant === 'uitgesteld' && actie.wachtreden && (
            <p className="mt-1 text-sm text-muted-foreground">Aanleiding: {actie.wachtreden}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
          {actie.inzet.uren !== null && <span className="tabular-nums">{actie.inzet.tekst}</span>}
          {/* In het overzicht zegt de groepskop de status al; in de Acties-tab, gegroepeerd
              per prioriteit, niet. */}
          {variant === 'lijst' && <PlanStatusPill status={actie.status as ActieStatus} />}
          {/* Eén handeling, en alleen de handeling die hier kán. De status-select stond op elke
              rij, ook op een geblokkeerde, en maakte van "start" een optie in een randloze
              dropdown. Status kiezen gebeurt nu in het paneel. */}
          {actie.uitvoerbaarheid === 'beschikbaar' && (
            <Button
              size="sm"
              variant="outline"
              disabled={bezig}
              aria-label={`Start ${actie.key}`}
              onClick={() => onStatus(actie.key, 'bezig')}
            >
              Start
            </Button>
          )}
          {actie.uitvoerbaarheid === 'actief' && (
            <Button
              size="sm"
              variant="outline"
              disabled={bezig}
              aria-haspopup="dialog"
              aria-label={`Afronden ${actie.key}`}
              onClick={() => onStatus(actie.key, 'gereed')}
            >
              Afronden…
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
