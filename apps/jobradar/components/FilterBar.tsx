'use client'

import { Search, X } from 'lucide-react'
import { Checkbox } from '@umanex/ui/components/ui/checkbox'
import { Label } from '@umanex/ui/components/ui/label'
import { Slider } from '@umanex/ui/components/ui/slider'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { RegionFilter } from './RegionFilter'
import type { RegionCode } from '@/lib/regions'
import type { StatusFilter } from '@/lib/triage'

// Open eerst, en als standaard: afgewezen werk hoort niet mee te scrollen bij het openen. Open
// is alles behalve afgewezen — ook gecontacteerd, want dat is lopend werk (zie `pastBijStatus`).
// `new` heet "Niet beoordeeld" en niet "Nieuw": "nieuw" is op dit scherm de badge voor wat bij de
// laatste sync binnenkwam, en dat is het vinkje hieronder. Eén woord voor twee dingen liet "+N
// vacatures" tot 2026-09-17 op de verkeerde as filteren. De waarde in de URL blijft `new`.
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'alle', label: 'Alle statussen' },
  { value: 'new', label: 'Niet beoordeeld' },
  { value: 'saved', label: 'Opgeslagen' },
  { value: 'dismissed', label: 'Afgewezen' },
  { value: 'contacted', label: 'Gecontacteerd' },
]

type FilterBarProps = {
  veldRef?: React.Ref<HTMLInputElement>
  zoek: string
  onZoekChange: (zoek: string) => void
  regions: RegionCode[]
  minScore: number
  statusFilter: StatusFilter
  onRegionsChange: (regions: RegionCode[]) => void
  onMinScoreChange: (score: number) => void
  onStatusFilterChange: (status: StatusFilter) => void
  /** Null = niet van toepassing op dit tabblad (Prospects komen uit de KBO-spiegel, niet uit een sync). */
  alleenNieuw: boolean | null
  onAlleenNieuwChange: (aan: boolean) => void
}

export function FilterBar({
  veldRef,
  zoek,
  onZoekChange,
  regions,
  minScore,
  statusFilter,
  onRegionsChange,
  onMinScoreChange,
  onStatusFilterChange,
  alleenNieuw,
  onAlleenNieuwChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <RegionFilter selected={regions} onChange={onRegionsChange} />

      {/* Geen debounce: er wordt gefilterd op rijen die al in het geheugen staan, dus er is
          niets om te vertragen. */}
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute left-2 h-4 w-4 text-muted-foreground" aria-hidden />
        <input
          ref={veldRef}
          type="search"
          value={zoek}
          onChange={(e) => onZoekChange(e.target.value)}
          aria-label="Zoek op titel of bedrijf"
          placeholder="Zoek op titel of bedrijf"
          className={cn(
            'w-56 rounded-md border border-input bg-background py-1 pl-8 pr-8 text-sm text-foreground',
            focusRing
          )}
        />
        {zoek && (
          <button
            type="button"
            onClick={() => onZoekChange('')}
            aria-label="Zoekterm wissen"
            className={cn('absolute right-1 rounded-sm p-1 text-muted-foreground hover:text-foreground', focusRing)}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <select
        value={statusFilter}
        aria-label="Status"
        onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        // `outline-none` zonder vervanging maakte de focus hier onzichtbaar — geen
        // afwijkende vorm maar helemaal geen indicator (gemeten, ux-audit-vervolg).
        className={cn(
          'cursor-pointer rounded-md border bg-background px-2 py-1 text-sm text-foreground',
          focusRing
        )}
      >
        {STATUS_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {alleenNieuw !== null && (
        <div className="flex items-center gap-1.5">
          <Checkbox
            id="alleen-nieuw"
            checked={alleenNieuw}
            onCheckedChange={(v) => onAlleenNieuwChange(v === true)}
            data-alleen-nieuw
          />
          <Label htmlFor="alleen-nieuw" className="cursor-pointer whitespace-nowrap text-sm">
            Alleen nieuw bij de laatste sync
          </Label>
        </div>
      )}
      <div className="flex items-center gap-3 sm:ml-auto">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          Min. score
        </span>
        <Slider
          value={[minScore]}
          onValueChange={([v]) => onMinScoreChange(v ?? 0)}
          min={0}
          max={100}
          step={5}
          className="w-32"
        />
        <span className="w-8 text-right text-sm tabular-nums">{minScore}</span>
      </div>
    </div>
  )
}
