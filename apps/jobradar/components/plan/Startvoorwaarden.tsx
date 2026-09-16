'use client'

import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PlanStatusPill } from './PlanStatusPill'
import { maandLabel } from '@/lib/plan/inzet'
import type { ActieStatus, Startvoorwaarde, Startvoorwaarden as Voorwaarden } from '@/lib/plan/types'

type StartvoorwaardenProps = {
  voorwaarden: Voorwaarden
  lancering: string
  onOpenActie: (key: string) => void
  onOpenBeslissing: (key: string) => void
}

function Rij({ v, onOpen }: { v: Startvoorwaarde; onOpen: (key: string) => void }) {
  return (
    // `flex-wrap`: op 400 px passen de code, de titel en de statuspil niet op één regel, en
    // de rij duwde de hele pagina uit (gemeten: scrollWidth 429 bij 400 beschikbaar). Getest
    // in de browser met de kandidaten ernaast — `min-width: 0` op de knop of op de span
    // hielp níét, afbreken wél. De pil zakt dan naar een tweede regel in plaats van de titel
    // tot een paar tekens te knippen.
    <li className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="tabular-nums text-muted-foreground">{v.key}</span>
        <button
          type="button"
          onClick={() => onOpen(v.key)}
          // `min-w-0` naast `truncate`: een flex-item krijgt standaard `min-width: auto` en
          // krimpt dus níét onder zijn tekst, waardoor `truncate` nooit in werking treedt en
          // de rij de hele pagina uitduwt. Gemeten op 400 px: min-content 413 px voor de
          // langste titel (A06), tegen 368 px beschikbaar.
          className={cn(
            'min-w-0 truncate rounded-sm text-left underline-offset-2 hover:underline',
            focusRing
          )}
        >
          {v.titel}
        </button>
      </span>
      <PlanStatusPill status={v.status as ActieStatus} />
    </li>
  )
}

/**
 * Wat er klaar moet zijn vóór de start, en wat er beoordeeld moet worden.
 *
 * Een aflees-lijst, geen conclusie. De app mag niet zelf besluiten dat het bedrijf financieel
 * of juridisch klaar is — ook niet wanneer alle acht harde voorwaarden gereed staan. Daarom
 * is het startbesluit een eigen record dat je invult, en zegt de voetnoot dat met zoveel
 * woorden.
 */
export function Startvoorwaarden({
  voorwaarden,
  lancering,
  onOpenActie,
  onOpenBeslissing,
}: StartvoorwaardenProps) {
  const besluit = voorwaarden.startbesluit
  const genomen = (besluit?.beslissing ?? '').trim() !== ''

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Startvoorwaarden voor {maandLabel(lancering)}</h3>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Hard — moeten gereed zijn ({voorwaarden.hardGereed} van {voorwaarden.hard.length})
        </p>
        <ul className="space-y-1">
          {voorwaarden.hard.map((v) => (
            <Rij key={v.key} v={v} onOpen={onOpenActie} />
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">
          Bewijs — moet de verkoopverwachting kunnen onderbouwen ({voorwaarden.bewijsGereed} van{' '}
          {voorwaarden.bewijs.length} gereed)
        </p>
        <ul className="space-y-1">
          {voorwaarden.bewijs.map((v) => (
            <Rij key={v.key} v={v} onOpen={onOpenActie} />
          ))}
        </ul>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Niet vereist voor de start</p>
        <ul className="space-y-1">
          {voorwaarden.nietVereist.map((v) => (
            <Rij key={v.key} v={v} onOpen={onOpenActie} />
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-sm">
        <span>
          Startbesluit:{' '}
          {genomen ? (
            <>
              <span className="font-medium">{besluit?.beslissing}</span>
              <span className="tabular-nums text-muted-foreground">
                {' '}
                ({besluit?.beslistOp ?? 'zonder datum'})
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">nog niet genomen</span>
          )}
        </span>
        {besluit && (
          <Button size="sm" variant="outline" onClick={() => onOpenBeslissing(besluit.key)}>
            {genomen ? 'Bekijk' : 'Leg vast'}
          </Button>
        )}
      </div>
      <p className="text-2xs text-muted-foreground">
        Het startbesluit wordt nooit afgeleid. Ook met alle harde voorwaarden gereed blijft het
        een handeling — deze app stelt niet vast dat je financieel of juridisch klaar bent.
      </p>
    </section>
  )
}
