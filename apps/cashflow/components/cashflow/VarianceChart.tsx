'use client';

import { useState } from 'react';
import { formatAmount, formatCurrency, formatSigned, getMonthLabel } from '../../lib/cashflow/recurring';
import { monthVariance } from '../../lib/cashflow/variance';
import { TREND_THRESHOLD } from '../../lib/cashflow/analysis';
import type { MonthSnapshot } from '../../lib/cashflow/types';

type VarianceChartProps = {
  snapshots: MonthSnapshot[];
};

type Row = { label: string; budgeted: number; actual: number; difference: number };

/** Telt de afwijkingen van alle afgesloten maanden op per categorie. */
function aggregate(snapshots: MonthSnapshot[]): Row[] {
  const totals = new Map<string, Row>();
  for (const snap of snapshots) {
    for (const row of monthVariance(snap.data)) {
      const current = totals.get(row.label) ?? {
        label: row.label, budgeted: 0, actual: 0, difference: 0,
      };
      totals.set(row.label, {
        label: row.label,
        budgeted: current.budgeted + row.budgeted,
        actual: current.actual + row.actual,
        difference: current.difference + row.difference,
      });
    }
  }
  return [...totals.values()];
}

/**
 * Bullet chart per categorie: een dunne balk voor het begrote bedrag met daarop een
 * dikkere balk voor het werkelijke. Few's bullet graph — compact, en je leest het
 * verschil zonder een tweede as nodig te hebben.
 */
export function VarianceChart({ snapshots }: VarianceChartProps) {
  const [showTable, setShowTable] = useState(false);
  const rows = aggregate(snapshots);

  if (snapshots.length < TREND_THRESHOLD) {
    const nog = TREND_THRESHOLD - snapshots.length;
    return (
      <section className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
        <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">
          Begroot tegenover werkelijk
        </h2>
        <p className="mt-2 text-sm text-[var(--umanexNeutral500)]">
          Nog {nog} {nog === 1 ? 'afgesloten maand' : 'afgesloten maanden'} nodig om
          afwijkingen over meerdere maanden te kunnen vergelijken.
        </p>
      </section>
    );
  }

  const max = Math.max(...rows.flatMap((r) => [r.budgeted, r.actual]), 1);
  const months = snapshots.length;

  return (
    <section className="rounded-xl border border-[var(--umanexPrimary50)] bg-card p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-[var(--umanexNeutral800)]">
            Begroot tegenover werkelijk
          </h2>
          <p className="text-sm text-[var(--umanexNeutral500)]">
            Opgeteld over {months} afgesloten {months === 1 ? 'maand' : 'maanden'} — de
            dunne balk is begroot, de dikke werkelijk
          </p>
        </div>
        <button
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="shrink-0 h-8 px-3 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {showTable ? 'Verberg tabel' : 'Toon tabel'}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--umanexNeutral500)]">
          Geen enkele categorie week af van de begroting.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-4">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-[var(--umanexNeutral800)] truncate min-w-0">{row.label}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-[var(--umanexNeutral500)] text-xs">
                    {formatCurrency(row.budgeted)} →{' '}
                  </span>
                  <span className="text-[var(--umanexNeutral800)]">{formatCurrency(row.actual)}</span>{' '}
                  <span
                    className={`font-semibold ${
                      row.difference > 0 ? 'text-[var(--umanexFinanceNegative)]' : 'text-[var(--umanexFinancePositive)]'
                    }`}
                  >
                    {formatSigned(row.difference, 'out')}
                  </span>
                </span>
              </div>

              <div
                className="mt-1.5 relative h-4"
                role="img"
                aria-label={`${row.label}: begroot ${formatAmount(row.budgeted)}, werkelijk ${formatAmount(row.actual)}`}
              >
                {/* Begroot: dunne baan als referentie. */}
                <div
                  className="absolute inset-y-0 my-auto h-4 rounded-[2px] bg-[var(--umanexNeutral200)]"
                  style={{ width: `${(row.budgeted / max) * 100}%` }}
                />
                {/* Werkelijk: dikke balk erbovenop, ingekleurd naar de richting. */}
                <div
                  className={`absolute inset-y-0 my-auto h-2 rounded-[2px] ${
                    row.difference > 0 ? 'bg-[var(--umanexFinanceNegativeSurface)]' : 'bg-[var(--umanexFinancePositive)]'
                  }`}
                  style={{ width: `${(row.actual / max) * 100}%` }}
                />
                {/* Streepje op het begrote bedrag: de doellijn van een bullet graph. */}
                <div
                  className="absolute inset-y-0 w-0.5 bg-[var(--umanexNeutral800)]"
                  style={{ left: `calc(${(row.budgeted / max) * 100}% - 1px)` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {showTable && rows.length > 0 && (
        <table className="mt-4 w-full text-sm">
          <caption className="sr-only">Begroot tegenover werkelijk per categorie</caption>
          <thead>
            <tr className="text-left text-[var(--umanexNeutral500)]">
              <th scope="col" className="font-medium py-1">Categorie</th>
              <th scope="col" className="font-medium py-1">Begroot</th>
              <th scope="col" className="font-medium py-1">Werkelijk</th>
              <th scope="col" className="font-medium py-1">Verschil</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-[var(--umanexNeutral200)]">
                <td className="py-1">{row.label}</td>
                <td className="py-1 tabular-nums">{formatAmount(row.budgeted)}</td>
                <td className="py-1 tabular-nums">{formatAmount(row.actual)}</td>
                <td className="py-1 tabular-nums">{formatSigned(row.difference, 'out')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="mt-3 text-xs text-[var(--umanexNeutral500)]">
        Alleen maanden die je hebt afgesloten tellen mee
        {snapshots.length > 0 &&
          `: ${getMonthLabel(snapshots[0]!.monthKey)} tot ${getMonthLabel(snapshots[snapshots.length - 1]!.monthKey)}`}
        .
      </p>
    </section>
  );
}
