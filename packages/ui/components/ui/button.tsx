import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

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
        sm: 'h-control-sm rounded-md px-control-x',
        lg: 'h-control-lg rounded-md px-8',
        icon: 'h-control-md w-control-md',
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
