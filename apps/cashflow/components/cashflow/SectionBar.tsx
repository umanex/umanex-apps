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
    <div className="flex items-center justify-between gap-2 pl-2 bg-[var(--umanexNeutral100)] rounded-[4px] shrink-0 w-full">
      <span className="text-sm font-semibold text-[var(--umanexNeutral800)] truncate min-w-0">
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {amount !== undefined && (
          <span
            className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
              direction === 'neutral' || isZero
                ? 'text-[var(--umanexNeutral800)]'
                : inflow
                  ? 'text-emerald-700'
                  : 'text-[var(--umanexPrimary700)]'
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
                className="bg-[var(--umanexNeutral800)] h-7 px-4 rounded-l-[4px] text-[13px] text-[var(--umanexNeutral50)] leading-none whitespace-nowrap disabled:opacity-30"
                aria-label={showPaid ? 'Filter: alles zichtbaar — klik voor openstaand' : 'Filter: openstaand — klik voor alles'}
              >
                {showPaid ? 'Alle' : 'Open'}
              </button>
            )}
            {onAdd && (
              <button
                onClick={onAdd}
                className={`bg-emerald-700 size-7 flex items-center justify-center text-[var(--umanexNeutral50)] text-[19px] leading-none disabled:opacity-30 ${
                  hasFilter ? 'rounded-r-[4px]' : 'rounded-[4px]'
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
