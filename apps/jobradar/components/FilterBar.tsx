'use client'

import { Search, X } from 'lucide-react'
import { Slider } from '@umanex/ui/components/ui/slider'
import { RegionFilter } from './RegionFilter'
import type { RegionCode } from '@/lib/regions'
import type { ItemStatus } from '@/lib/db/schema'

const STATUS_OPTIONS: { value: ItemStatus | ''; label: string }[] = [
  { value: '', label: 'Alle statussen' },
  { value: 'new', label: 'Nieuw' },
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
  statusFilter: ItemStatus | ''
  onRegionsChange: (regions: RegionCode[]) => void
  onMinScoreChange: (score: number) => void
  onStatusFilterChange: (status: ItemStatus | '') => void
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
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
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
          className="w-56 rounded border border-input bg-background py-1 pl-8 pr-8 text-sm text-foreground outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        />
        {zoek && (
          <button
            type="button"
            onClick={() => onZoekChange('')}
            aria-label="Zoekterm wissen"
            className="absolute right-1 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value as ItemStatus | '')}
        className="cursor-pointer rounded border bg-background px-2 py-1 text-sm text-foreground outline-none"
      >
        {STATUS_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
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
