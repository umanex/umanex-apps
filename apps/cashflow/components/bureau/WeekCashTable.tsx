'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { Button } from '@umanex/ui/components/ui/button';
import { cn } from '@umanex/ui/lib/utils';
import { focusRing } from '@umanex/ui/lib/focus';
import { formatAmount, getMonthLabel } from '../../lib/cashflow/recurring';
import type { CashLine, CashLineSource, WeekRow } from '../../lib/bureau/weekly-cash';
import { dateLabel, weekLabel } from '../../lib/bureau/format';
import { firstWeekOfMonth } from '../../lib/bureau/periods';

const BRON: Record<CashLineSource, string> = {
  factuur: 'Factuur',
  post: 'Inkomstenpost',
  'vaste-kosten': 'Vaste kosten',
  eenmalig: 'Eenmalige uitgaven',
  budgetten: 'Budgetten',
  provisies: 'Naar provisies',
  buffer: 'Buffer',
};

function regel(l: CashLine, week: WeekRow): string {
  if (l.dated && l.on) return `op ${dateLabel(l.on)}`;
  const maand = getMonthLabel(l.monthKey).toLowerCase();
  if (l.source === 'factuur') return `factuurdatum in een andere maand — laatste week van ${maand}`;
  if (l.source === 'post') return `losse post — laatste week van ${maand}`;
  if (l.source === 'buffer') return `maandeinde ${maand}`;
  return firstWeekOfMonth(l.monthKey) === week.weekKey ? `eerste week van ${maand}` : `${maand} — de eerste week is voorbij, dus deze week`;
}

/**
 * Dertien weken vrije cash. Per week de opening, wat binnenkomt, wat vertrekt, wat naar de potten
 * gaat, en het einde; de regels eronder tonen waar elk bedrag vandaan komt en waarom het in die
 * week staat.
 */
export function WeekCashTable({ weeks }: { weeks: WeekRow[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const wissel = (w: string) => setOpen((s) => { const n = new Set(s); if (n.has(w)) n.delete(w); else n.add(w); return n; });

  return (
    <div data-scroll-x className="overflow-x-auto rounded-xl border border-accent bg-card">
      <table className="w-full min-w-[44rem] text-dense">
        <caption className="px-3 pt-3 text-left text-sm text-muted-foreground">
          13 weken vanaf deze week, vrije cash incl. btw. Facturen op hun verwachte betaaldatum; losse inkomsten in de laatste week van hun maand; kosten en provisies in de eerste (nooit vóór deze week); buffer op maandeinde. De cashbehoefte uit de doelen telt niet mee.
        </caption>
        <thead className="border-b border-border">
          <tr>
            {['Week', 'Opening vrij', 'Ontvangsten', 'Uitgaven', 'Naar potten', 'Einde vrij', 'Regels'].map((h, i) => (
              <th key={h} scope="col" className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', i === 0 ? 'text-left' : 'text-right')}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((w, i) => {
            const isOpen = open.has(w.weekKey);
            const detailId = `week-regels-${w.weekKey}`;
            return (
              <Fragment key={w.weekKey}>
                <tr data-cash-week={w.weekKey} data-from={w.from} data-to={w.to} className={cn('border-b border-border', i % 2 === 1 && 'bg-muted')}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">{weekLabel(w.weekKey)}</th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(w.openingFree)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(w.receipts)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(w.outflows)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatAmount(w.toReserved)}</td>
                  <td className={cn('px-3 py-1.5 text-right font-medium tabular-nums', w.closingFree < 0 && 'text-finance-negative')} data-closing-free={w.closingFree}>
                    {formatAmount(w.closingFree)}
                    {w.closingFree < 0 && <span className="block text-xs font-normal">tekort</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    {w.lines.length > 0 ? (
                      <Button size="sm" variant="ghost" aria-expanded={isOpen} aria-controls={detailId} onClick={() => wissel(w.weekKey)} aria-label={`${isOpen ? 'Verberg' : 'Toon'} ${w.lines.length} regels van ${weekLabel(w.weekKey)}`}>
                        {isOpen ? 'Verberg' : `${w.lines.length} tonen`}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">geen</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr id={detailId} className="border-b border-border">
                    <td colSpan={7} className="px-3 py-2">
                      <ul className="space-y-1">
                        {w.lines.map((l, j) => (
                          <li key={`${l.source}-${l.monthKey}-${j}`} className="flex flex-wrap items-baseline justify-between gap-x-4 text-xs" data-cash-line={l.source}>
                            <span className="min-w-0">
                              <span className="font-medium">{BRON[l.source]}</span>
                              {l.label !== BRON[l.source] && (
                                <>
                                  {' · '}
                                  {l.invoice ? (
                                    <Link href={`/bureau/projecten/${l.invoice.projectId}`} className={cn('rounded-sm underline underline-offset-2', focusRing)}>
                                      {l.label}
                                    </Link>
                                  ) : (
                                    l.label
                                  )}
                                </>
                              )}
                              <span className="text-muted-foreground"> · {regel(l, w)}</span>
                            </span>
                            <span className="tabular-nums">{formatAmount(l.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
