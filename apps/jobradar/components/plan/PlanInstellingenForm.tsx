'use client'

import { useState } from 'react'
import { AlertTriangle, Check } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { Input } from '@umanex/ui/components/ui/input'
import { NativeSelect } from '@umanex/ui/components/ui/native-select'
import { jarenVoorStart, type PlanInstellingen } from '@/lib/plan/types'

type PlanInstellingenFormProps = {
  begin: PlanInstellingen
}


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
  /**
   * De laatst bewaarde stand, niet de stand van bij het laden.
   *
   * Tegen `begin` vergeleken bleef Opslaan na een bewaring actief, en zette je daarna de
   * oorspronkelijke waarde terug, dan werd Opslaan uitgeschakeld terwijl de database de
   * tussenwaarde droeg — die was dan niet meer terug te zetten zonder te herladen.
   */
  const [opgeslagen, setOpgeslagen] = useState(begin)
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const [melding, setMelding] = useState<string | null>(null)

  const huidig = `${jaar}-${maand}`
  const gewijzigd =
    huidig !== opgeslagen.lancering ||
    Number(urenPerDag) !== opgeslagen.urenPerDag ||
    Number(focusLimiet) !== opgeslagen.focusLimiet

  /** "Opgeslagen." hoort bij de bewaarde stand; naast nieuwe invoer zegt hij iets onwaars. */
  const wijzig = (zet: (waarde: string) => void, waarde: string) => {
    zet(waarde)
    setMelding(null)
  }

  const opslaan = async () => {
    // `aria-disabled` en niet `disabled`: een knop die de focus heeft en disabled wordt, geeft die
    // focus af aan `body`. Dat gebeurde twee keer per bewaring — bij het versturen, en opnieuw
    // na het antwoord, omdat er dan niets meer gewijzigd is.
    if (bezig || !gewijzigd) return
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
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean
        error?: string
        instellingen?: PlanInstellingen
      } | null
      if (!res.ok || !data?.ok) {
        setFout(data?.error ?? `Mislukt (HTTP ${res.status})`)
        return
      }
      // Wat de server bewaarde, niet wat we stuurden: hij rondt de uren af op twee decimalen.
      const bewaard = data.instellingen ?? {
        lancering: huidig,
        urenPerDag: Number(urenPerDag),
        focusLimiet: Number(focusLimiet),
      }
      setOpgeslagen(bewaard)
      setJaar(bewaard.lancering.slice(0, 4))
      setMaand(bewaard.lancering.slice(5, 7))
      setUrenPerDag(String(bewaard.urenPerDag))
      setFocusLimiet(String(bewaard.focusLimiet))
      setMelding('Opgeslagen.')
    } catch {
      setFout('Geen antwoord van de server.')
    } finally {
      setBezig(false)
    }
  }

  // De lijst zelf staat in `lib/plan/types.ts` — pure functie, getoetst in de scenario-suite.
  const jaren = jarenVoorStart(new Date().getFullYear(), Number(jaar) || undefined)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="plan-maand" className="text-2xs">
            Beoogde start
          </Label>
          <div className="flex gap-2">
            <NativeSelect
              size="sm"
              id="plan-maand"
              value={maand}
              disabled={bezig}
              onChange={(e) => wijzig(setMaand, e.target.value)}
              className="cursor-pointer"
            >
              {MAANDEN.map((m, i) => (
                <option key={m} value={String(i + 1).padStart(2, '0')}>
                  {m}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              size="sm"
              aria-label="Jaar van de start"
              value={jaar}
              disabled={bezig}
              onChange={(e) => wijzig(setJaar, e.target.value)}
              className="cursor-pointer tabular-nums"
            >
              {jaren.map((j) => (
                <option key={j} value={String(j)}>
                  {j}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-uren" className="text-2xs">
            Uren per werkdag
          </Label>
          <Input
            size="sm"
            id="plan-uren"
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={urenPerDag}
            disabled={bezig}
            onChange={(e) => wijzig(setUrenPerDag, e.target.value)}
            className="w-20 tabular-nums"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="plan-focus" className="text-2xs">
            Hoeveel acties tegelijk
          </Label>
          <Input
            size="sm"
            id="plan-focus"
            type="number"
            min="1"
            max="10"
            step="1"
            value={focusLimiet}
            disabled={bezig}
            onChange={(e) => wijzig(setFocusLimiet, e.target.value)}
            className="w-20 tabular-nums"
          />
        </div>
      </div>

      <p className="text-2xs text-muted-foreground">
        Inzet wordt in uren bewaard; de dagen ernaast volgen uit dit getal. De focuslimiet is een
        rem, geen slot — een vierde actie starten kan met een vastgelegde reden.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {/* Geen `size="sm"`: dit is de primaire actie van een sectie op /instellingen, en die
            staat daar op dezelfde hoogte als de primaire actie van de sectie erboven. */}
        <Button
          onClick={opslaan}
          aria-disabled={bezig || !gewijzigd}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
          data-planinstellingen-actie="opslaan"
        >
          {bezig ? 'Bezig…' : 'Opslaan'}
        </Button>
        {fout && (
          <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {fout}
          </p>
        )}
        {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
            niet betrouwbaar voorgelezen. Leeg neemt hij geen breedte in. */}
        <p
          role="status"
          className="flex items-start gap-2 text-sm text-muted-foreground"
          data-planinstellingen-melding
        >
          {melding && (
            <>
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
              {melding}
            </>
          )}
        </p>
      </div>
    </div>
  )
}
