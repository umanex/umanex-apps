'use client'

import { useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import {
  ACTIE_STATUSSEN,
  STATUS_KLEUR,
  STATUS_LABEL,
  type ActieStatus,
  type ActieWeergave,
} from '@/lib/plan/types'

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
 * `gereed` staat niet in de status-select. Afronden vraagt bewijs, en dat vraag je niet in een
 * dropdown — het paneel opent op de afrond-sectie.
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

  const keuzes = ACTIE_STATUSSEN.filter((s) => s !== 'gereed' || actie.status === 'gereed')
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
          ) : (
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
          )}

          {actie.blokkade.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1" aria-label={`Waarop ${actie.key} wacht`}>
              {actie.blokkade.map((b) => (
                <li key={b.key}>
                  <Badge variant={b.hard ? 'destructive' : 'outline'} className="text-2xs font-normal">
                    {b.reden}
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
          <span className="tabular-nums">
            {actie.inzet.uren === null ? 'inzet onbekend' : actie.inzet.tekst}
          </span>
          {/* De select ís de statusweergave, met de rol als kleur — zelfde vorm als
              `StatusDropdown` op het dashboard. Een pil ernaast toonde hetzelfde woord twee
              keer; dat stond er even en viel op in de eerste opname. */}
          <select
            aria-label={`Status van ${actie.key}`}
            value={actie.status}
            disabled={bezig}
            onChange={(e) => onStatus(actie.key, e.target.value as ActieStatus)}
            className={cn(
              'cursor-pointer rounded-sm border-none bg-transparent text-xs font-medium disabled:opacity-50',
              STATUS_KLEUR[actie.status as ActieStatus],
              focusRing
            )}
          >
            {keuzes.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
          {/* Afronden is een aparte knop en geen optie in de select.
              Twee redenen, allebei zichtbaar in de opname: een select-optie hoort een wáárde
              te zijn en deze was een opdracht (hij opent een paneel, hij zet geen status), en
              een native select is zo breed als zijn langste optie — "Gereed — met bewijs…"
              maakte er honderd lege pixels van op alle 22 rijen, met een chevron hard tegen
              de rand die leest als "klap deze rij open". */}
          {actie.status !== 'gereed' && (
            <button
              type="button"
              disabled={bezig}
              onClick={() => onStatus(actie.key, 'gereed')}
              className={cn(
                'rounded-sm underline-offset-2 hover:text-foreground hover:underline disabled:opacity-50',
                focusRing
              )}
            >
              Afronden…
            </button>
          )}
        </div>
      </div>
    </li>
  )
}
