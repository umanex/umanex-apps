'use client'

import { ActieRij } from './ActieRij'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import { PRIORITEITEN, type ActieStatus, type ActieWeergave } from '@/lib/plan/types'

type ActieLijstProps = {
  acties: ActieWeergave[]
  vandaag: string
  bezig: boolean
  onOpen: (key: string) => void
  onStatus: (key: string, status: ActieStatus) => void
}

/** Alle acties, gegroepeerd per prioriteit. De groepskop is de enige kop in deze lijst. */
export function ActieLijst({ acties, vandaag, bezig, onOpen, onStatus }: ActieLijstProps) {
  if (acties.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center gap-2 py-12 text-center text-muted-foreground">
        <p className="text-sm">Geen acties binnen deze filters — zet een filter terug op Alle.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p aria-live="polite" className="sr-only">
        {acties.length} acties getoond
      </p>
      {PRIORITEITEN.map((p) => {
        const groep = acties.filter((a) => a.prioriteit === p)
        if (groep.length === 0) return null
        return (
          <section key={p} className="space-y-2">
            <h3 className="text-sm font-semibold">
              {p}. {PRIORITEIT_LABEL[p]}
              <span className="ml-2 font-normal tabular-nums text-muted-foreground">
                {groep.length}
              </span>
            </h3>
            <ol className="space-y-3">
              {groep.map((a) => (
                <ActieRij
                  key={a.key}
                  actie={a}
                  variant="lijst"
                  vandaag={vandaag}
                  bezig={bezig}
                  onOpen={onOpen}
                  onStatus={onStatus}
                />
              ))}
            </ol>
          </section>
        )
      })}
    </div>
  )
}
