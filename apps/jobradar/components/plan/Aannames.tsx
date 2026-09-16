'use client'

import { useState } from 'react'
import { Badge } from '@umanex/ui/components/ui/badge'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

type AannamesProps = {
  tekst: string
  isStandaard: boolean
  bezig: boolean
  onBewaar: (tekst: string) => void
  onHerstel: () => void
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
  const gewijzigd = waarde !== tekst

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
        onChange={(e) => setWaarde(e.target.value)}
        className={cn(
          'mt-2 w-full rounded-md border bg-background px-2 py-1 font-mono text-xs text-foreground disabled:opacity-50',
          focusRing
        )}
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={bezig || !gewijzigd} onClick={() => onBewaar(waarde)}>
          Opslaan
        </Button>
        <Button size="sm" variant="outline" disabled={bezig || isStandaard} onClick={onHerstel}>
          Herstel de standaard
        </Button>
        {isStandaard && <span className="text-2xs text-muted-foreground">Dit is de standaard.</span>}
      </div>
    </details>
  )
}
