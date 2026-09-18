import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

/**
 * Vier tekstmaten en twee icoonmaten, alle zes op een rol uit de layoutlaag: `default` is
 * `size.control-md` (40px), `sm` is `size.control-sm` (36px), `lg` `size.control-lg` (44px),
 * `xs` `size.control-xs` (28px).
 *
 * `xs` bestaat omdat de ledger van cashflow zijn knoppen tot 2026-09-18 zelf op maat zette
 * (`h-7 px-2 text-dense rounded-sm`, 22 plekken gemeten): 28px is de dichtste rij die daar
 * leesbaar bleef, en de kleinste maat die de bibliotheek kende was 36px. `icon-xs` is de
 * vierkante variant ervan — de `+`-knop van `SectionBar` staat er vandaag als `size-7`.
 *
 * De tekstmaat blijft in de basis staan en `xs` overschrijft hem. Dat werkt sinds `cn()` de
 * stappen van de typeschaal kent — vóór die fix mergede `text-dense` als kléur en at het de
 * `text-primary-foreground` van de variant op. Zie `lib/utils.ts`.
 */
export const buttonVariants = cva(
  // De focus-klassen komen uit de gedeelde constante, zodat een link in app-code
  // dezelfde ring krijgt als deze knop. Zelfde klassenset als voorheen; alleen de
  // volgorde in het attribuut verschuift, en die heeft geen CSS-effect.
  `inline-flex items-center justify-center gap-inline whitespace-nowrap rounded-md text-sm font-medium transition-colors ${focusRing} disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-control-md px-4 py-control-y',
        xs: 'h-control-xs gap-1.5 rounded-sm px-2 text-dense',
        sm: 'h-control-sm rounded-md px-control-x',
        lg: 'h-control-lg rounded-md px-8',
        icon: 'h-control-md w-control-md',
        'icon-xs': 'h-control-xs w-control-xs gap-1.5 rounded-sm text-dense',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

/**
 * `asChild` rendert het enige kind met de knopklassen in plaats van een eigen `<button>` —
 * een link die eruitziet als een knop (`<Button asChild><a href="…" /></Button>`). Tot
 * 2026-09-16 stond de prop in het type zonder Slot, waardoor hij als onbekend attribuut op de
 * `<button>` belandde en het kind gewoon ín de knop renderde.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
