'use client'

import { Label } from '@umanex/ui/components/ui/label'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import { PRIORITEIT_LABEL } from '@/lib/plan/seed-inhoud'
import { ACTIE_STATUSSEN, PRIORITEITEN, STATUS_LABEL } from '@/lib/plan/types'

export type PlanFilterStand = {
  prioriteit: string
  status: string
  uitvoerbaarheid: string
  eigenaar: string
}

type PlanFiltersProps = {
  waarde: PlanFilterStand
  eigenaars: string[]
  getoond: number
  totaal: number
  onChange: (stand: PlanFilterStand) => void
}

const SELECT = cn(
  'cursor-pointer rounded-md border bg-background px-2 py-1 text-sm text-foreground'
)

/** Filteren op prioriteit, status, uitvoerbaarheid en eigenaar. Dezelfde schil als FilterBar. */
export function PlanFilters({ waarde, eigenaars, getoond, totaal, onChange }: PlanFiltersProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="filter-prioriteit" className="text-2xs">
          Prioriteit
        </Label>
        <select
          id="filter-prioriteit"
          value={waarde.prioriteit}
          onChange={(e) => onChange({ ...waarde, prioriteit: e.target.value })}
          className={cn(SELECT, focusRing)}
        >
          <option value="">Alle prioriteiten</option>
          {PRIORITEITEN.map((p) => (
            <option key={p} value={String(p)}>
              {p}. {PRIORITEIT_LABEL[p]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-status" className="text-2xs">
          Status
        </Label>
        <select
          id="filter-status"
          value={waarde.status}
          onChange={(e) => onChange({ ...waarde, status: e.target.value })}
          className={cn(SELECT, focusRing)}
        >
          <option value="">Alle statussen</option>
          {ACTIE_STATUSSEN.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-uitvoerbaarheid" className="text-2xs">
          Uitvoerbaarheid
        </Label>
        <select
          id="filter-uitvoerbaarheid"
          value={waarde.uitvoerbaarheid}
          onChange={(e) => onChange({ ...waarde, uitvoerbaarheid: e.target.value })}
          className={cn(SELECT, focusRing)}
        >
          <option value="">Alles</option>
          <option value="actief">Bezig</option>
          <option value="beschikbaar">Beschikbaar</option>
          <option value="geblokkeerd">Geblokkeerd</option>
          <option value="wacht">Wacht op input</option>
          <option value="uitgesteld">Uitgesteld</option>
          <option value="gereed">Gereed</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="filter-eigenaar" className="text-2xs">
          Eigenaar
        </Label>
        <select
          id="filter-eigenaar"
          value={waarde.eigenaar}
          onChange={(e) => onChange({ ...waarde, eigenaar: e.target.value })}
          className={cn(SELECT, focusRing)}
        >
          <option value="">Iedereen</option>
          {eigenaars.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm tabular-nums text-muted-foreground sm:ml-auto">
        {getoond} van {totaal} acties
      </p>
    </div>
  )
}
