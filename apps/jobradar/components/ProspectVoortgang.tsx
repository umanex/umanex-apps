'use client'

import type { Voortgang } from '@/lib/prospects'

type Props = {
  voortgang: Voortgang
  wachtrijLengte: number
}

/**
 * De balk staat op *afgehandeld*, niet op "heeft een label".
 *
 * Anders loopt hij naar 100% terwijl er nog een stapel twijfelgevallen ligt, en meldt de tool
 * klaar te zijn zonder dat te zijn. De twijfelstapel staat er daarom apart naast in plaats van
 * meegeteld.
 */
export function ProspectVoortgang({ voortgang, wachtrijLengte }: Props) {
  const { afgehandeld, totaal, percentage, twijfel } = voortgang
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
        <span className="font-medium tabular-nums">
          {afgehandeld.toLocaleString('nl-BE')} / {totaal.toLocaleString('nl-BE')} beoordeeld
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {wachtrijLengte.toLocaleString('nl-BE')} in de wachtrij
          {twijfel > 0 && <> · {twijfel.toLocaleString('nl-BE')} op twijfel</>}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Voortgang labelen"
      >
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}
