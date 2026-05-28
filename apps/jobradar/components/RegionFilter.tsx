'use client'

import { Checkbox } from '@umanex/ui/components/ui/checkbox'
import { Label } from '@umanex/ui/components/ui/label'
import { REGIONS } from '@/lib/regions'
import type { RegionCode } from '@/lib/regions'

type RegionFilterProps = {
  selected: RegionCode[]
  onChange: (regions: RegionCode[]) => void
}

const ALL_REGIONS = Object.entries(REGIONS) as [RegionCode, (typeof REGIONS)[RegionCode]][]

export function RegionFilter({ selected, onChange }: RegionFilterProps) {
  function toggle(code: RegionCode) {
    onChange(
      selected.includes(code)
        ? selected.filter((r) => r !== code)
        : [...selected, code]
    )
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm font-medium text-muted-foreground">Regio</span>
      {ALL_REGIONS.map(([code, region]) => (
        <div key={code} className="flex items-center gap-1.5">
          <Checkbox
            id={`region-${code}`}
            checked={selected.includes(code)}
            onCheckedChange={() => toggle(code)}
          />
          <Label htmlFor={`region-${code}`} className="text-sm cursor-pointer">
            {region.label}
          </Label>
        </div>
      ))}
    </div>
  )
}
