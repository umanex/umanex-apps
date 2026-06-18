'use client';

type SectionBarProps = {
  label: string;
  subtotaal?: string;
  subtotaalColor?: 'red' | 'green';
  // showPaid: undefined = geen filter toggle (inkomsten), anders split button
  showPaid?: boolean;
  onFilterToggle?: () => void;
  onAdd: () => void;
  addAriaLabel?: string;
};

export function SectionBar({
  label,
  subtotaal,
  subtotaalColor = 'red',
  showPaid,
  onFilterToggle,
  onAdd,
  addAriaLabel = 'Toevoegen',
}: SectionBarProps) {
  const hasFilter = showPaid !== undefined && onFilterToggle !== undefined;

  return (
    <div className="flex items-center justify-between pl-2 bg-[var(--umanexNeutral100)] rounded-[4px] shrink-0 w-full">
      <span className="text-sm font-semibold text-[var(--umanexNeutral800)] whitespace-nowrap shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-2 shrink-0">
        {subtotaal && (
          <span
            className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
              subtotaalColor === 'green'
                ? 'text-emerald-600'
                : 'text-[var(--umanexPrimary500)]'
            }`}
          >
            {subtotaal}
          </span>
        )}
        <div className="flex items-center">
          {hasFilter && (
            <button
              onClick={onFilterToggle}
              className="bg-[var(--umanexNeutral800)] h-7 px-4 rounded-l-[4px] text-[13px] text-[var(--umanexNeutral50)] leading-none whitespace-nowrap"
              aria-label={showPaid ? 'Filter: alles zichtbaar — klik voor openstaand' : 'Filter: openstaand — klik voor alles'}
            >
              {showPaid ? 'Alle' : 'Open'}
            </button>
          )}
          <button
            onClick={onAdd}
            className={`bg-emerald-600 size-7 flex items-center justify-center text-[var(--umanexNeutral50)] text-[19px] leading-none ${
              hasFilter ? 'rounded-r-[4px]' : 'rounded-[4px]'
            }`}
            aria-label={addAriaLabel}
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
