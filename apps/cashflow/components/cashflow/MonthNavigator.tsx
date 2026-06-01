'use client';

import { format, addMonths, parseISO } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useCashflowStore } from '../../store/cashflow';
import { useCashflowActions } from '../../hooks/useCashflow';

export function MonthNavigator() {
  const anchorMonth = useCashflowStore((s) => s.anchorMonth);
  const { setAnchorMonth } = useCashflowActions();
  const today = format(new Date(), 'yyyy-MM');

  const shift = (delta: number) => {
    const next = format(addMonths(parseISO(`${anchorMonth}-01`), delta), 'yyyy-MM');
    setAnchorMonth(next);
  };

  const label = format(parseISO(`${anchorMonth}-01`), 'MMMM yyyy', { locale: nl });

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => shift(-1)}
        aria-label="Vorige maand"
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors"
      >
        ←
      </button>
      <span className="text-sm font-medium w-32 text-center capitalize">{label}</span>
      <button
        onClick={() => shift(1)}
        aria-label="Volgende maand"
        className="inline-flex items-center justify-center h-9 w-9 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors"
      >
        →
      </button>
      {anchorMonth !== today && (
        <button
          onClick={() => setAnchorMonth(today)}
          className="ml-1 inline-flex items-center h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-muted transition-colors"
        >
          Vandaag
        </button>
      )}
    </div>
  );
}
