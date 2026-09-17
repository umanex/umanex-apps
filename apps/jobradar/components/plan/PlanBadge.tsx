import Link from 'next/link'
import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'

type PlanBadgeProps = {
  /** De acties waaraan dit bedrijf hangt. */
  keys: string[]
}

/**
 * Het merkteken op een bedrijfskaart: hangt dit bedrijf aan het voorbereidingsplan?
 *
 * Toont hoogstens twee keys en daarna een telling. Een kaart is smal, en een rij van vijf
 * codes leest als ruis in plaats van als signaal.
 */
export function PlanBadge({ keys }: PlanBadgeProps) {
  if (keys.length === 0) return null
  const label = keys.length <= 2 ? keys.join(' · ') : `${keys[0]} +${keys.length - 1}`

  return (
    <Link
      href={`/plan?actie=${keys[0]}`}
      aria-label={`Bedrijfsplan: gekoppeld aan ${keys.join(', ')}`}
      className={cn('rounded-full', focusRing)}
    >
      <Badge size="sm" variant="outline" className="shrink-0 tabular-nums">
        {label}
      </Badge>
    </Link>
  )
}
