import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { focusRing } from '../../lib/focus';

/** Dezelfde twee maten als `Input`: `default` 40px (`size.control-md`), `sm` 36px (`size.control-sm`). */
export const nativeSelectVariants = cva(
  'peer flex w-full appearance-none rounded-md border border-input bg-background py-control-y pl-control-x pr-9 text-sm disabled:cursor-not-allowed disabled:opacity-50',
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

export type NativeSelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> &
  VariantProps<typeof nativeSelectVariants> & {
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
  ({ className, wrapperClassName, size, children, ...props }, ref) => (
    <div data-slot="native-select-wrapper" className={cn('relative w-full', wrapperClassName)}>
      <select
        data-slot="native-select"
        className={cn(nativeSelectVariants({ size }), focusRing, className)}
        ref={ref}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        data-slot="native-select-icon"
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground peer-disabled:opacity-50"
      />
    </div>
  ),
);
NativeSelect.displayName = 'NativeSelect';
