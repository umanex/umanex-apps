import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

/**
 * Meerregelig tekstveld. Zelfde rand, vulling, padding en focus als `Input`, zodat een
 * formulier met beide geen twee vormen draagt.
 *
 * De maat gaat hier niet over hoogte maar over padding en ondergrens: de hoogte van een textarea
 * komt van `rows` en van wat de gebruiker typt. `default` houdt de vloer van 80px (`min-h-20`) en de
 * padding van een veld; `sm` haalt die vloer weg en zet de verticale padding op `spacing.item-y`
 * (6px), zodat een veld van twee regels compact blijft — de vorm die jobradar tot 2026-09-17 met
 * `py-1` nabouwde.
 */
export const textareaVariants = cva(
  'flex w-full rounded-md border border-input bg-background px-control-x text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        default: 'min-h-20 py-control-y',
        sm: 'min-h-0 py-item-y',
      },
    },
    defaultVariants: { size: 'default' },
  }
);

export type TextareaProps = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> &
  VariantProps<typeof textareaVariants>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, size, ...props }, ref) => (
  <textarea
    data-slot="textarea"
    className={cn(textareaVariants({ size }), focusRing, className)}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
