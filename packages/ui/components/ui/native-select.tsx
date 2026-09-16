import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

export type NativeSelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  /** Klassen voor de omhulling — daar zet je de breedte. `className` gaat naar de select zelf. */
  wrapperClassName?: string;
};

/**
 * De keuzelijst van het platform, in de vorm van `Input`.
 *
 * Bewust native in plaats van een Radix-listbox: het toetsenbord, de screenreader en de
 * mobiele keuzelijst komen van het besturingssysteem, en er is geen extra dependency nodig.
 * De opties zijn gewone `<option>`-kinderen. Het pijltje is decoratie (`aria-hidden`).
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, NativeSelectProps>(
  ({ className, wrapperClassName, children, ...props }, ref) => (
    <div className={cn('relative w-full', wrapperClassName)}>
      <select
        className={cn(
          'peer flex h-10 w-full appearance-none rounded-md border border-input bg-background py-2 pl-3 pr-9 text-sm disabled:cursor-not-allowed disabled:opacity-50',
          focusRing,
          className,
        )}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
