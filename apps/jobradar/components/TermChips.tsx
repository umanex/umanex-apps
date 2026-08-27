'use client'

import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { splitsTermen, normaliseerZinsnedes } from '@/lib/settings'

type TermChipsProps = {
  label: string
  beschrijving: string
  termen: string[]
  onChange: (termen: string[]) => void
  disabled?: boolean
  /**
   * `woorden` splitst op spaties — dat is hoe `what_or` werkt. `zinsnede` doet dat juist
   * niet: die gaat als geheel naar `what_phrase`, en opdelen zou hem terugveranderen in
   * losse woorden.
   */
  modus?: 'woorden' | 'zinsnede'
  max?: number
}

/**
 * Termen als losse chips, omdat ze in de bron ook los zijn.
 *
 * Wie "product designer" typt krijgt twee chips. Dat is geen strengheid maar eerlijkheid:
 * `what_or` matcht per woord, dus die spatie ís een scheiding. Precies dat onzichtbare
 * gedrag maakte één woord goed voor 743 van de 1222 opgehaalde vacatures.
 */
export function TermChips({
  label,
  beschrijving,
  termen,
  onChange,
  disabled = false,
  modus = 'woorden',
  max,
}: TermChipsProps) {
  const [invoer, setInvoer] = useState('')
  const veldId = useId()
  const hulpId = useId()

  const vol = max !== undefined && termen.length >= max

  function voegToe() {
    if (!invoer.trim() || vol) return
    const nieuw =
      modus === 'zinsnede' ? normaliseerZinsnedes([...termen, invoer]) : splitsTermen([...termen, invoer])
    if (nieuw.length !== termen.length) onChange(max === undefined ? nieuw : nieuw.slice(0, max))
    setInvoer('')
  }

  return (
    <div className="space-y-2">
      <div>
        <label htmlFor={veldId} className="text-sm font-medium">
          {label}
        </label>
        <p id={hulpId} className="text-sm text-muted-foreground">
          {beschrijving}
          {max !== undefined && (
            <span className="tabular-nums"> — {termen.length} van {max} gebruikt.</span>
          )}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-md border border-input p-2">
        {termen.length === 0 && <span className="px-1 text-sm text-muted-foreground">Nog geen termen</span>}

        {termen.map((term) => (
          <span
            key={term}
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-sm tabular-nums"
          >
            {term}
            <button
              type="button"
              onClick={() => onChange(termen.filter((t) => t !== term))}
              disabled={disabled}
              aria-label={`${term} verwijderen`}
              className={cn(
                'rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50',
                focusRing
              )}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          id={veldId}
          aria-describedby={hulpId}
          value={invoer}
          disabled={disabled || vol}
          onChange={(e) => setInvoer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || (e.key === ',' && modus === 'woorden')) {
              e.preventDefault()
              voegToe()
            }
            // Backspace in een leeg veld haalt de laatste chip weg — de gebruikelijke greep.
            if (e.key === 'Backspace' && invoer === '' && termen.length > 0) {
              onChange(termen.slice(0, -1))
            }
          }}
          onBlur={voegToe}
          placeholder={vol ? 'maximum bereikt' : modus === 'zinsnede' ? 'combinatie toevoegen…' : 'term toevoegen…'}
          className={cn(
            'min-w-[10rem] flex-1 rounded-sm bg-transparent px-1 py-1 text-sm placeholder:text-muted-foreground disabled:opacity-50',
            focusRing
          )}
        />

        <Button type="button" size="sm" variant="secondary" onClick={voegToe} disabled={disabled || vol || !invoer.trim()}>
          Toevoegen
        </Button>
      </div>
    </div>
  )
}
