'use client'

import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import type { PlanInstellingen } from '@/lib/plan/types'

type PlanInstellingenFormProps = {
  begin: PlanInstellingen
}

const INVOER = 'rounded-md border bg-background px-2 py-1 text-sm text-foreground disabled:opacity-50'

const MAANDEN = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
]

/**
 * De instellingen van het bedrijfsplan.
 *
 * De lancering staat als twee selects en niet als `input[type=month]`: die laatste bestaat
 * niet in Safari en Firefox op desktop en valt daar terug op een vrij tekstveld — een veld
 * dat er op één browser goed uitziet en op de andere iets anders doet.
 */
export function PlanInstellingenForm({ begin }: PlanInstellingenFormProps) {
  const [jaar, setJaar] = useState(begin.lancering.slice(0, 4))
  const [maand, setMaand] = useState(begin.lancering.slice(5, 7))
  const [urenPerDag, setUrenPerDag] = useState(String(begin.urenPerDag))
  const [focusLimiet, setFocusLimiet] = useState(String(begin.focusLimiet))
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)

  const huidig = `${jaar}-${maand}`
  const gewijzigd =
    huidig !== begin.lancering ||
    Number(urenPerDag) !== begin.urenPerDag ||
    Number(focusLimiet) !== begin.focusLimiet

  const opslaan = async () => {
    setBezig(true)
    setFout(null)
    setMelding(null)
    try {
      const res = await fetch('/api/plan', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          instellingen: {
            lancering: huidig,
            urenPerDag: Number(urenPerDag),
            focusLimiet: Number(focusLimiet),
          },
        }),
      })
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !data?.ok) {
        setFout(data?.error ?? `Mislukt (HTTP ${res.status})`)
        return
      }
      setMelding('Opgeslagen.')
    } catch {
      setFout('Geen antwoord van de server.')
    } finally {
      setBezig(false)
    }
  }

  const jaren = [2026, 2027, 2028, 2029]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="plan-maand" className="text-2xs">
            Beoogde start
          </Label>
          <div className="flex gap-2">
            <select
              id="plan-maand"
              value={maand}
              disabled={bezig}
              onChange={(e) => setMaand(e.target.value)}
              className={cn('cursor-pointer', INVOER, focusRing)}
            >
              {MAANDEN.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>
                  {m}
                </option>
              ))}
            </select>
            <select
              aria-label="Jaar van de start"
              value={jaar}
              disabled={bezig}
              onChange={(e) => setJaar(e.target.value)}
              className={cn('cursor-pointer tabular-nums', INVOER, focusRing)}
            >
              {jaren.map((j) => (
                <option key={j} value={String(j)}>
                  {j}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-uren" className="text-2xs">
            Uren per werkdag
          </Label>
          <input
            id="plan-uren"
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={urenPerDag}
            disabled={bezig}
            onChange={(e) => setUrenPerDag(e.target.value)}
            className={cn('w-20 tabular-nums', INVOER, focusRing)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-focus" className="text-2xs">
            Hoeveel acties tegelijk
          </Label>
          <input
            id="plan-focus"
            type="number"
            min="1"
            max="10"
            step="1"
            value={focusLimiet}
            disabled={bezig}
            onChange={(e) => setFocusLimiet(e.target.value)}
            className={cn('w-20 tabular-nums', INVOER, focusRing)}
          />
        </div>
      </div>

      <p className="text-2xs text-muted-foreground">
        Inzet wordt in uren bewaard; de dagen ernaast volgen uit dit getal. De focuslimiet is een
        rem, geen slot — een vierde actie starten kan met een vastgelegde reden.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={opslaan} disabled={bezig || !gewijzigd}>
          {bezig ? 'Bezig…' : 'Opslaan'}
        </Button>
        {fout && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {fout}
          </p>
        )}
        {melding && (
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0" />
            {melding}
          </p>
        )}
      </div>
    </div>
  )
}
