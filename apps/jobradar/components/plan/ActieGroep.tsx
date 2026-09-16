'use client'

import { ActieRij } from './ActieRij'
import type { ActieStatus, ActieWeergave } from '@/lib/plan/types'

type ActieGroepProps = {
  titel: string
  /** Rechts van de kop, bv. "2 van 3". Leeg laten wanneer een telling niets toevoegt. */
  telling?: string
  acties: ActieWeergave[]
  variant: 'bezig' | 'beschikbaar' | 'geblokkeerd' | 'uitgesteld'
  /** Wat er staat als de groep leeg is. Een diagnose, geen "niets gevonden". */
  leeg: string
  vandaag: string
  bezig: boolean
  onOpen: (key: string) => void
  onStatus: (key: string, status: ActieStatus) => void
  onVolgendeStap?: (key: string, tekst: string) => void
}

/** Een getitelde lijst acties. De sectie draagt de kop; de rijen zijn lijstitems. */
export function ActieGroep({
  titel,
  telling,
  acties,
  variant,
  leeg,
  vandaag,
  bezig,
  onOpen,
  onStatus,
  onVolgendeStap,
}: ActieGroepProps) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">
        {titel}
        {telling && (
          <span className="ml-2 font-normal tabular-nums text-muted-foreground">{telling}</span>
        )}
      </h3>
      {acties.length === 0 ? (
        <p className="text-sm text-muted-foreground">{leeg}</p>
      ) : (
        <ol className="space-y-3">
          {acties.map((a) => (
            <ActieRij
              key={a.key}
              actie={a}
              variant={variant}
              vandaag={vandaag}
              bezig={bezig}
              onOpen={onOpen}
              onStatus={onStatus}
              onVolgendeStap={onVolgendeStap}
            />
          ))}
        </ol>
      )}
    </section>
  )
}
