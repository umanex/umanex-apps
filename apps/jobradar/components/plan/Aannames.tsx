'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

type AannamesProps = {
  tekst: string
  isStandaard: boolean
  bezig: boolean
  /** Geeft terug of het verzoek slaagde, zodat de bevestiging pas na het antwoord komt. */
  onBewaar: (tekst: string) => Promise<boolean>
  onHerstel: () => Promise<boolean>
}

/**
 * De planningsaannames achter het aanbod.
 *
 * Eén bewerkbare tekst, met het label "voorlopig" altijd zichtbaar — ook ingeklapt. Zodra de
 * app met deze getallen zou rekenen, worden ze een systeemregel die niets meer kan
 * tegenspreken; als tekst blijven ze wat ze zijn: iets om naast je offerte te leggen.
 */
export function Aannames({ tekst, isStandaard, bezig, onBewaar, onHerstel }: AannamesProps) {
  const [waarde, setWaarde] = useState(tekst)
  const [melding, setMelding] = useState('')
  const gewijzigd = waarde !== tekst

  // Het veld volgt wat de server bewaarde. Zonder dit bleef na "Herstel de standaard" de eigen
  // tekst staan naast "Dit is de standaard.", met Opslaan actief — één klik draaide het herstel
  // terug. Zelfde oorzaak na Opslaan: de server bewaart de tekst getrimd, dus met witruimte
  // achteraan bleef `gewijzigd` waar. Alleen bij een ándere tekst: een mutatie elders in het plan
  // levert dezelfde string en laat onbewaarde invoer hier staan.
  useEffect(() => setWaarde(tekst), [tekst])

  // De knoppen zijn `aria-disabled`, niet `disabled`, dus Enter en Spatie komen er nog door: de guard
  // draagt dezelfde voorwaarde als het attribuut.
  const bewaar = async () => {
    if (bezig || !gewijzigd) return
    setMelding('')
    if (await onBewaar(waarde)) setMelding('Planningsaannames opgeslagen.')
  }

  const herstel = async () => {
    if (bezig || isStandaard) return
    setMelding('')
    if (await onHerstel()) setMelding('Standaard planningsaannames hersteld.')
  }

  return (
    <details className="rounded-md border p-3">
      <summary className={cn('cursor-pointer rounded-sm', focusRing)}>
        <h3 className="inline text-sm font-semibold">Planningsaannames</h3>
        <Badge variant="warning" className="ml-2 text-2xs">
          voorlopig, nog te toetsen
        </Badge>
      </summary>
      <textarea
        aria-label="Planningsaannames"
        rows={12}
        value={waarde}
        maxLength={8000}
        disabled={bezig}
        onChange={(e) => {
          setWaarde(e.target.value)
          setMelding('')
        }}
        className={cn(
          'mt-2 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs text-foreground disabled:opacity-50',
          focusRing
        )}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {/* `aria-disabled` en geen `disabled`: na Herstel is dit de standaard en na Opslaan is er
            niets gewijzigd, en een knop die onder de focus uitgeschakeld wordt, geeft die focus af
            aan `body`. */}
        <Button
          size="sm"
          aria-disabled={bezig || !gewijzigd}
          onClick={() => void bewaar()}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Opslaan
        </Button>
        <Button
          size="sm"
          variant="outline"
          aria-disabled={bezig || isStandaard}
          onClick={() => void herstel()}
          className="aria-disabled:pointer-events-none aria-disabled:opacity-50"
        >
          Herstel de standaard
        </Button>
        {isStandaard && <span className="text-2xs text-muted-foreground">Dit is de standaard.</span>}
      </div>
      {/* Altijd gerenderd, ook leeg: een live-regio die pas met zijn inhoud verschijnt, wordt
          niet betrouwbaar voorgelezen. */}
      <p aria-live="polite" className="sr-only" data-aannames-melding>
        {melding}
      </p>
    </details>
  )
}
