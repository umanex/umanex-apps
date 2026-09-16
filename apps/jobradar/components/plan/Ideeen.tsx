'use client'

import { useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import { PRIORITEITEN, type PlanIdee, type Prioriteit } from '@/lib/plan/types'

type IdeeenProps = {
  ideeen: PlanIdee[]
  bezig: boolean
  onToevoegen: (titel: string) => void
  onOpnemen: (id: number, prioriteit: Prioriteit) => void
  onVerwerpen: (id: number) => void
  onVerwijderen: (id: number) => void
  onOpenActie: (key: string) => void
}

const INVOER = 'rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50'

/**
 * De ideeënlijst.
 *
 * Bewust buiten het plan: een idee dat als actie bestaat, telt mee in elke telling en in elke
 * voortgangsbalk. Opnemen vraagt daarom een expliciete keuze van de prioriteitsgroep — dat is
 * de enige weg waarop een idee een actie wordt, en hij is nooit een neveneffect.
 */
export function Ideeen({
  ideeen,
  bezig,
  onToevoegen,
  onOpnemen,
  onVerwerpen,
  onVerwijderen,
  onOpenActie,
}: IdeeenProps) {
  const [titel, setTitel] = useState('')
  const [opnemen, setOpnemen] = useState<number | null>(null)
  const [prioriteit, setPrioriteit] = useState<string>('')

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">Ideeën</h3>
      <p className="text-2xs text-muted-foreground">
        Wat hier staat telt niet mee in het plan tot je het opneemt.
      </p>

      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          aria-label="Nieuw idee"
          value={titel}
          maxLength={120}
          disabled={bezig}
          placeholder="Waar denk je aan?"
          onChange={(e) => setTitel(e.target.value)}
          className={cn('min-w-0 flex-1', INVOER, focusRing)}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={bezig || titel.trim() === ''}
          onClick={() => {
            onToevoegen(titel.trim())
            setTitel('')
          }}
        >
          Voeg toe
        </Button>
      </div>

      {ideeen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nog geen ideeën. Wat hier belandt telt niet mee in het plan tot je het opneemt.
        </p>
      ) : (
        <ul className="space-y-3">
          {ideeen.map((i) => (
            <li key={i.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{i.titel}</span>
                {i.status === 'opgenomen' && (
                  <Badge variant="success" className="text-2xs">
                    opgenomen als {i.opgenomenAls}
                  </Badge>
                )}
                {i.status === 'verworpen' && (
                  <Badge variant="outline" className="text-2xs text-muted-foreground">
                    verworpen
                  </Badge>
                )}
              </div>
              {i.notitie && <p className="mt-1 text-sm text-muted-foreground">{i.notitie}</p>}

              {i.status === 'open' && opnemen !== i.id && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => setOpnemen(i.id)}>
                    Opnemen in plan
                  </Button>
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => onVerwerpen(i.id)}>
                    Verwerp
                  </Button>
                  <Button size="sm" variant="outline" disabled={bezig} onClick={() => onVerwijderen(i.id)}>
                    Verwijder
                  </Button>
                </div>
              )}

              {opnemen === i.id && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Prioriteitsgroep"
                    value={prioriteit}
                    disabled={bezig}
                    onChange={(e) => setPrioriteit(e.target.value)}
                    className={cn('min-w-0 flex-1 cursor-pointer', INVOER, focusRing)}
                  >
                    <option value="">Kies een prioriteitsgroep…</option>
                    {PRIORITEITEN.map((p) => (
                      <option key={p} value={p}>
                        {p}. {PRIORITEIT_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={bezig || prioriteit === ''}
                    onClick={() => {
                      onOpnemen(i.id, Number(prioriteit) as Prioriteit)
                      setOpnemen(null)
                      setPrioriteit('')
                    }}
                  >
                    Bevestig
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setOpnemen(null)}>
                    Annuleer
                  </Button>
                </div>
              )}

              {i.status === 'opgenomen' && i.opgenomenAls && (
                <button
                  type="button"
                  onClick={() => onOpenActie(i.opgenomenAls as string)}
                  className={cn(
                    'mt-2 rounded-sm text-xs text-muted-foreground transition-colors hover:text-foreground',
                    focusRing
                  )}
                >
                  Open {i.opgenomenAls}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
