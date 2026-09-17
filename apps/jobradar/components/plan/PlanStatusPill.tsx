import { Badge } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { STATUS_LABEL, type ActieStatus } from '@/lib/plan/types'

type PlanStatusPillProps = {
  status: ActieStatus
  className?: string
}

/**
 * De status van één actie.
 *
 * Alleen de opgeslagen status — niet "geblokkeerd". Dat is een afgeleide toestand en staat
 * daarom als aparte chip naast de pil: zou hij hier meedoen, dan zou de pil soms iets tonen
 * dat niet in de database staat en dus niet te wijzigen is waar je hem ziet.
 */
const VARIANT: Record<ActieStatus, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'> = {
  niet_gestart: 'outline',
  bezig: 'default',
  wacht_op_input: 'warning',
  gereed: 'success',
  uitgesteld: 'secondary',
  vervallen: 'outline',
}

export function PlanStatusPill({ status, className }: PlanStatusPillProps) {
  return (
    <Badge size="sm"
      variant={VARIANT[status]}
      className={cn('', status === 'vervallen' && 'text-muted-foreground', className)}
    >
      {STATUS_LABEL[status]}
    </Badge>
  )
}
