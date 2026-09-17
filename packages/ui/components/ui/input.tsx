import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

/**
 * Twee maten, beide op een rol uit de layoutlaag: `default` is `size.control-md` (40px), `sm` is
 * `size.control-sm` (36px).
 *
 * `sm` bestaat omdat de panelen van jobradar hun velden tot 2026-09-17 zelf compact maakten
 * (`px-2 py-1 text-sm`, gemeten 28–30px): 47 velden met de maat in app-code, naast een primitive
 * die alleen 40px kende. Eén maat in de bibliotheek is beter dan 47 overrides, en 36px is de stap
 * die de schaal al heeft — de velden worden dus 6 tot 8px hoger dan vroeger (keuze Jeroen).
 */
export const inputVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-control-x py-control-y text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'h-control-md',
        sm: 'h-control-sm',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size, ...props }, ref) => {
    return (
      <input
        type={type}
        data-slot="input"
        className={cn(inputVariants({ size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';
