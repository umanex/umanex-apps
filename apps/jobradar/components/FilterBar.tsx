'use client'

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
  regions: RegionCode[]
  minScore: number
  statusFilter: ItemStatus | ''
  onRegionsChange: (regions: RegionCode[]) => void
  onMinScoreChange: (score: number) => void
  onStatusFilterChange: (status: ItemStatus | '') => void
}

export function FilterBar({
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
