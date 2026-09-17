import * as React from 'react';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * Meerregelig tekstveld. Zelfde rand, vulling, padding en focus als `Input`, zodat een
 * formulier met beide geen twee vormen draagt; alleen de hoogte groeit mee (`min-h-20`).
 */
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => (
  <textarea
    data-slot="textarea"
    className={cn(
      'flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
      focusRing,
      className,
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = 'Textarea';
