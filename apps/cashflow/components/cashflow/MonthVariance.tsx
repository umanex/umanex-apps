'use client';

import { formatAmount, formatSigned } from '../../lib/cashflow/recurring';
import { monthVariance } from '../../lib/cashflow/variance';
import type { MonthData } from '../../lib/cashflow/types';

type MonthVarianceProps = {
  data: MonthData;
};

/**
 * Begroot naast werkelijk voor een afgesloten maand. Toont alleen categorieën die
 * afweken — een tabel vol nullen zegt niets. Feitelijk geformuleerd, zonder oordeel:
 * het getal en waar het vandaan komt, meer niet.
 */
export function MonthVariance({ data }: MonthVarianceProps) {
  const rows = monthVariance(data);

  return (
    <div className="rounded-[4px] border border-[var(--umanexNeutral200)] bg-[var(--umanexBaseWhite)] px-3 py-2">
      <p className="text-[13px] font-semibold text-[var(--umanexNeutral800)] mb-1.5">
        Begroot tegenover werkelijk
      </p>

      {rows.length === 0 ? (
        <p className="text-[13px] text-[var(--umanexNeutral500)]">
          Deze maand liep gelijk met de begroting.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={row.label} className="flex items-baseline justify-between gap-2">
              <span className="text-[13px] text-[var(--umanexNeutral600)] truncate min-w-0">
                {row.label}
              </span>
              <span className="flex items-baseline gap-2 shrink-0 tabular-nums">
                <span className="text-[11px] text-[var(--umanexNeutral500)]">
                  {formatAmount(row.budgeted)} →
                </span>
                <span className="text-[13px] text-[var(--umanexNeutral800)]">
                  {formatAmount(row.actual)}
                </span>
                <span
                  className={`text-[13px] font-semibold ${
                    row.difference > 0 ? 'text-finance-negative' : 'text-finance-positive'
                  }`}
                >
                  {formatSigned(row.difference, 'out')}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
