import { format } from 'date-fns';
import type {
  BalanceOverride,
  CashflowData,
  MonthSnapshot,
  RecurringDefer,
  ReservationItem,
  ReservationSettlement,
} from './types';

/**
 * Verhoog bij elke schema-uitbreiding van `CashflowData` en vang het nieuwe veld hier af.
 * Wordt meegeschreven naar `cashflow_state.store_version`, zodat een verouderde client
 * zichtbaar is zonder het document te parsen.
 */
export const STORE_VERSION = 14;

const currentMonth = () => format(new Date(), 'yyyy-MM');

/**
 * Maakt van een willekeurig document een bruikbare `CashflowData`.
 *
 * Dit was eerder de `migrate`-stap van zustand/persist. Die rol blijft nodig: het
 * document komt nu uit Postgres in plaats van uit localStorage, maar het blijft
 * ongetypeerde jsonb waarvan geen enkel veld gegarandeerd is. Eén ontbrekende array is
 * genoeg om de calculator te laten crashen op `.filter` van undefined.
 */
export function normalizeData(input: unknown): CashflowData {
  const s = (input ?? {}) as Record<string, unknown>;

  // Model 1 kende alleen startBalance; model 2 splitste dat in een saldo mét de maand
  // waarop het slaat. Oude documenten dragen het eerste veld nog.
  const referenceBalance =
    typeof s.referenceBalance === 'number'
      ? s.referenceBalance
      : typeof s.startBalance === 'number'
        ? s.startBalance
        : 0;

  const historyStartMonth =
    typeof s.historyStartMonth === 'string' ? s.historyStartMonth : currentMonth();

  return {
    referenceBalance,
    referenceMonth: typeof s.referenceMonth === 'string' ? s.referenceMonth : currentMonth(),
    balanceOverrides: Array.isArray(s.balanceOverrides)
      ? (s.balanceOverrides as BalanceOverride[]).filter(Boolean)
      : [],
    expenseItems: Array.isArray(s.expenseItems) ? s.expenseItems : [],
    incomeItems: Array.isArray(s.incomeItems) ? s.incomeItems : [],
    recurringItems: Array.isArray(s.recurringItems) ? s.recurringItems : [],
    reservations: Array.isArray(s.reservations)
      ? (s.reservations as ReservationItem[]).filter(Boolean).map((r) => ({
          ...r,
          type: r.type ?? 'spaardoel',
          // Alleen een spaardoel kan buffer zijn: een maandelijks budget reset elke maand
          // en heeft geen saldo om een tekort uit op te vangen.
          coversDeficit: (r.type ?? 'spaardoel') === 'spaardoel' && (r.coversDeficit ?? false),
        }))
      : [],
    reservationPayments: Array.isArray(s.reservationPayments) ? s.reservationPayments : [],
    recurringDefers: Array.isArray(s.recurringDefers)
      ? (s.recurringDefers as RecurringDefer[]).filter(Boolean).map((d) => ({
          ...d,
          paid: d.paid ?? false,
          paidAmount: d.paidAmount ?? 0,
        }))
      : [],
    recurringSettlements: Array.isArray(s.recurringSettlements) ? s.recurringSettlements : [],
    reservationSettlements: Array.isArray(s.reservationSettlements)
      ? (s.reservationSettlements as ReservationSettlement[])
          .filter(Boolean)
          .map((rs) => ({ ...rs, finalized: rs.finalized ?? false }))
      : [],
    reservationDefers: Array.isArray(s.reservationDefers) ? s.reservationDefers : [],
    historyStartMonth,
    reopenedMonths: Array.isArray(s.reopenedMonths) ? s.reopenedMonths : [],
  };
}

/**
 * Snapshots komen uit hun eigen tabel en worden per rij genormaliseerd. Een snapshot van
 * vóór `historyStartMonth` is geen historie maar een reconstructie en wordt geweerd.
 *
 * De buffer-kop in `subtotals` is er pas sinds het sweep-model. Een bevroren maand van
 * daarvóór telde de bufferstorting mee in `provisions`, dus is 0 hier het juiste
 * antwoord: `netBurn` valt daarmee terug op de oude formule en de waterfall rekent niet
 * met `undefined`. Een snapshot mag verder niet aangepast worden — dat is precies wat
 * bevriezen betekent.
 */
export function normalizeSnapshots(
  rows: MonthSnapshot[],
  historyStartMonth: string,
): MonthSnapshot[] {
  return rows
    .filter((snap) => Boolean(snap) && snap.monthKey >= historyStartMonth)
    .map((snap) =>
      typeof snap.data?.subtotals?.buffer === 'number'
        ? snap
        : {
            ...snap,
            data: { ...snap.data, subtotals: { ...snap.data.subtotals, buffer: 0 } },
          },
    );
}

/** De lege beginstand voor een gebruiker die nog geen document heeft. */
export function emptyData(): CashflowData {
  return normalizeData({});
}
