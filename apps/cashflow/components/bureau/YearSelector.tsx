'use client';

import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { useBureau, useBureauYear } from '../../hooks/useBureau';
import { selectableYears } from '../../lib/bureau/years';

/** Boekjaar kiezen, in de vorm van `MonthNavigator`. */
export function YearSelector() {
  const [year, setYear] = useBureauYear();
  const currentYear = new Date().getFullYear();
  const { min, max } = selectableYears(useBureau(), currentYear);
  const knop = cn(
    'flex h-9 w-9 items-center justify-center border border-input bg-background text-sm transition-colors hover:bg-muted disabled:opacity-40 disabled:hover:bg-background',
    focusRing,
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <button onClick={() => setYear(year - 1)} disabled={year <= min} aria-label="Een jaar terug" className={cn(knop, 'rounded-l-md')}>
          ←
        </button>
        <button onClick={() => setYear(year + 1)} disabled={year >= max} aria-label="Een jaar vooruit" className={cn(knop, 'rounded-r-md border-l-0')}>
          →
        </button>
      </div>
      <p className="whitespace-nowrap text-sm text-muted-foreground" aria-live="polite">
        Boekjaar <span className="font-medium text-foreground tabular-nums">{year}</span>
      </p>
      {year !== currentYear && (
        <button
          onClick={() => setYear(currentYear)}
          className={cn('h-9 whitespace-nowrap rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-muted', focusRing)}
        >
          Dit jaar
        </button>
      )}
    </div>
  );
}
