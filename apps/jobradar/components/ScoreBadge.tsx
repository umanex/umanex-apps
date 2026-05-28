import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'

type ScoreBadgeProps = {
  score: number
  className?: string
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  const variant =
    score >= 61 ? 'success' : score >= 31 ? 'warning' : 'secondary'

  return (
    <Badge variant={variant} className={cn('tabular-nums', className)}>
      {score}
    </Badge>
  )
}
