'use client'

import { Slider } from '@umanex/ui/components/ui/slider'
import { RegionFilter } from './RegionFilter'
import type { RegionCode } from '@/lib/regions'

type FilterBarProps = {
  regions: RegionCode[]
  minScore: number
  onRegionsChange: (regions: RegionCode[]) => void
  onMinScoreChange: (score: number) => void
}

export function FilterBar({
  regions,
  minScore,
  onRegionsChange,
  onMinScoreChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
      <RegionFilter selected={regions} onChange={onRegionsChange} />
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
