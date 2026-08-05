'use client';

import { formatSigned, isInflow, type AmountDirection } from '../../lib/cashflow/recurring';

type SectionBarProps = {
  label: string;
  /** Stapbedrag van deze ledger-regel. Weglaten voor een regel zonder totaal. */
  amount?: number;
  /** Bepaalt teken en kleur; `neutral` voor een saldo zoals het beginsaldo. */
  direction?: AmountDirection;
  // showPaid: undefined = geen filter toggle (inkomsten), anders split button
  showPaid?: boolean;
  onFilterToggle?: () => void;
  onAdd?: () => void;
  addAriaLabel?: string;
};

export function SectionBar({
  label,
  amount,
  direction = 'out',
  showPaid,
  onFilterToggle,
  onAdd,
  addAriaLabel = 'Toevoegen',
}: SectionBarProps) {
  const hasFilter = showPaid !== undefined && onFilterToggle !== undefined;
  const inflow = amount === undefined ? false : isInflow(amount, direction);
  const isZero = amount !== undefined && Math.abs(amount) < 0.005;

  return (
    <div className="flex items-center justify-between gap-2 pl-2 bg-muted rounded-sm shrink-0 w-full">
      <span className="text-sm font-semibold text-foreground truncate min-w-0">
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {amount !== undefined && (
          <span
            className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
              direction === 'neutral' || isZero
                ? 'text-foreground'
                : inflow
                  ? 'text-finance-positive'
                  : 'text-finance-negative'
            }`}
          >
            {formatSigned(amount, direction)}
          </span>
        )}
        {(hasFilter || onAdd) && (
          <div className="flex items-center">
            {hasFilter && (
              <button
                onClick={onFilterToggle}
                className="bg-foreground h-7 px-4 rounded-l-sm text-[13px] text-background leading-none whitespace-nowrap disabled:opacity-30"
                aria-label={showPaid ? 'Filter: alles zichtbaar — klik voor openstaand' : 'Filter: openstaand — klik voor alles'}
              >
                {showPaid ? 'Alle' : 'Open'}
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className={`bg-finance-positive size-7 flex items-center justify-center text-background text-[19px] leading-none disabled:opacity-30 ${
                  hasFilter ? 'rounded-r-sm' : 'rounded-sm'
                }`}
                aria-label={addAriaLabel}
              >
                +
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
