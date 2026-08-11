'use client'

import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@umanex/ui/components/ui/button'
import { splitsTermen } from '@/lib/settings'

type TermChipsProps = {
  label: string
  beschrijving: string
  termen: string[]
  onChange: (termen: string[]) => void
  disabled?: boolean
}

/**
 * Termen als losse chips, omdat ze in de bron ook los zijn.
 *
 * Wie "product designer" typt krijgt twee chips. Dat is geen strengheid maar eerlijkheid:
 * `what_or` matcht per woord, dus die spatie ís een scheiding. Precies dat onzichtbare
 * gedrag maakte één woord goed voor 743 van de 1222 opgehaalde vacatures.
 */
export function TermChips({ label, beschrijving, termen, onChange, disabled = false }: TermChipsProps) {
  const [invoer, setInvoer] = useState('')
  const veldId = useId()
  const hulpId = useId()

  function voegToe() {
    const nieuw = splitsTermen([...termen, invoer])
    if (nieuw.length !== termen.length) onChange(nieuw)
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
              className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        <input
          id={veldId}
          aria-describedby={hulpId}
          value={invoer}
          disabled={disabled}
          onChange={(e) => setInvoer(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              voegToe()
            }
            // Backspace in een leeg veld haalt de laatste chip weg — de gebruikelijke greep.
            if (e.key === 'Backspace' && invoer === '' && termen.length > 0) {
              onChange(termen.slice(0, -1))
            }
          }}
          onBlur={voegToe}
          placeholder="term toevoegen…"
          className="min-w-[10rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
        />

        <Button type="button" size="sm" variant="secondary" onClick={voegToe} disabled={disabled || !invoer.trim()}>
          Toevoegen
        </Button>
      </div>
    </div>
  )
}
