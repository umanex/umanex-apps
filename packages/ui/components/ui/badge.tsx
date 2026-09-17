import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { focusRing } from '../../lib/focus'

/**
 * Twee assen: `variant` (rol) en `size` (maat).
 *
 * De maat is een as en geen override. Consumenten schreven `className="text-2xs"` — 96 keer
 * (80 in jobradar, 14 in cashflow, 2 in het dashboard, gemeten 2026-09-17): de compacte badge
 * bestond dus al, alleen niet in de bibliotheek, dus ook niet in Figma en niet in een story.
 * `sm` is exact wat die override deed — alleen de tekstmaat, dezelfde padding — zodat de
 * overstap in fase 4b niets aan het beeld verandert.
 *
 * `whitespace-nowrap`: een badge is een label, geen alinea. Zonder deze klasse brak "wacht op
 * input" in een smalle kolom over twee regels en duwde hij de rij die hem draagt hoger.
 *
 * `focusRing` en niet de eigen `focus:`-klassen: die waren `focus:` (dus ook bij een muisklik)
 * en stonden hier terwijl een `div` geen focus krijgt. jobradar zet `badgeVariants` sinds
 * 2026-09-17 op een focusbare knop (de scoreopbouw), en neutraliseerde de ring daar lokaal.
 */
export const badgeVariants = cva(
  cn(
    'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-semibold transition-colors',
    focusRing
  ),
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-success text-success-foreground hover:bg-success/80',
        warning: 'border-transparent bg-warning text-warning-foreground hover:bg-warning/80',
      },
      size: {
        default: 'text-xs',
        sm: 'text-2xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div data-slot="badge" className={cn(badgeVariants({ variant, size }), className)} {...props} />
}
