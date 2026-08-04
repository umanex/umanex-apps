'use client';

import { addMonth, getMonthLabel } from '../../lib/cashflow/recurring';
import type { MonthKey } from '../../lib/cashflow/types';

type MonthNavigatorProps = {
  /** Eerste maand van het zichtbare venster. */
  anchorMonth: MonthKey;
  /** Ondergrens: verder terug is er niets bekend. */
  earliestMonth: MonthKey;
  /** De maand waarin we vandaag zitten — het vertrekpunt waar "Vandaag" naartoe springt. */
  currentMonth: MonthKey;
  monthCount: number;
  onNavigate: (monthKey: MonthKey) => void;
};

export function MonthNavigator({
  anchorMonth,
  earliestMonth,
  currentMonth,
  monthCount,
  onNavigate,
}: MonthNavigatorProps) {
  const canGoBack = anchorMonth > earliestMonth;
  const isOnCurrent = anchorMonth === currentMonth;
  const lastMonth = addMonth(anchorMonth, monthCount - 1);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center">
        <button
          onClick={() => onNavigate(addMonth(anchorMonth, -1))}
          disabled={!canGoBack}
          aria-label="Een maand terug"
          className="h-9 w-9 flex items-center justify-center rounded-l-md border border-input bg-background text-sm hover:bg-muted transition-colors disabled:opacity-40 disabled:hover:bg-background"
        >
          ←
        </button>
        <button
          onClick={() => onNavigate(addMonth(anchorMonth, 1))}
          aria-label="Een maand vooruit"
          className="h-9 w-9 flex items-center justify-center rounded-r-md border border-l-0 border-input bg-background text-sm hover:bg-muted transition-colors"
        >
          →
        </button>
      </div>

      <p className="text-sm text-muted-foreground whitespace-nowrap" aria-live="polite">
        {getMonthLabel(anchorMonth)} — {getMonthLabel(lastMonth)}
      </p>

      {!isOnCurrent && (
        <button
          onClick={() => onNavigate(currentMonth)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors whitespace-nowrap"
        >
          Vandaag
        </button>
      )}
    </div>
  );
}
