'use client'

import { Badge, badgeVariants } from '@umanex/ui/components/ui/badge'
import { cn } from '@umanex/ui/lib/utils'
import { focusRing } from '@umanex/ui/lib/focus'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@umanex/ui/components/ui/tooltip'

type ScoreBadgeProps = {
  score: number
  className?: string
  /**
   * De punten per onderdeel. Met inhoud wordt de pil een knop die de opbouw toont, zonder blijft
   * het een kale pil — er is dan niets om te openen.
   */
  opbouw?: Record<string, number>
  /** Het soort score, voor de naam van die knop: "Score 45, opbouw tonen". */
  soort?: string
}

/**
 * De scorepil, en op de kaarten de ingang naar de opbouw.
 *
 * De opbouw hing aan een kale `<span>` als tooltip-trigger. Radix opent op focus (react-tooltip
 * 1.2.8, `onFocus`), maar een span krijgt geen focus, dus alleen de muis kwam erbij (fase 3,
 * 2026-09-17). Nu is de trigger zelf de knop, met de klassen van de Badge erop: een Badge is een
 * `<div>`, en die in een `<button>` nesten is geen geldige HTML.
 *
 * Eén component voor vacature- én leadkaart, zodat de twee triggers niet uit elkaar lopen.
 */
export function ScoreBadge({ score, className, opbouw, soort = 'Score' }: ScoreBadgeProps) {
  const variant =
    score >= 61 ? 'success' : score >= 31 ? 'warning' : 'secondary'
  const onderdelen = Object.entries(opbouw ?? {})

  if (onderdelen.length === 0) {
    return (
      <Badge variant={variant} className={cn('tabular-nums', className)}>
        {score}
      </Badge>
    )
  }

  return (
    <Tooltip>
      {/* De naam draagt het zichtbare getal, zodat wie "45" uitspreekt de knop ook vindt. */}
      {/* `focus:ring-0 focus:ring-offset-0`: badgeVariants draagt een ring op `:focus`, bedoeld voor
          een niet-interactieve pil, en op een knop gaf die ook bij een muisklik een ring. tailwind-merge
          vervangt ze hier; de ring van `focusRing` op `:focus-visible` staat later in de CSS en blijft.

          `preventDefault` in onClick: Radix sluit de tooltip na een klik (`composeEventHandlers` in
          react-tooltip 1.2.8), tenzij de klik al defaultPrevented is. Enter en Spatie zijn ook een
          klik, dus wie de opbouw met het toetsenbord opende, zag hem bij activeren weer verdwijnen. */}
      <TooltipTrigger
        type="button"
        aria-label={`${soort} ${score}, opbouw tonen`}
        onClick={(e) => e.preventDefault()}
        className={cn(
          badgeVariants({ variant }),
          'tabular-nums',
          focusRing,
          'focus:ring-0 focus:ring-offset-0',
          className
        )}
        data-score-opbouw
      >
        {score}
      </TooltipTrigger>
      <TooltipContent className="max-w-56">
        <ul className="space-y-1 text-xs">
          {onderdelen.map(([key, val]) => (
            <li key={key} className="flex justify-between gap-4">
              <span>{key}</span>
              <span className="tabular-nums font-medium">+{val}</span>
            </li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  )
}
