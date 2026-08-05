import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { format } from 'date-fns';
import { emptyData } from '../lib/cashflow/normalize';
import type { CashflowData, CashflowStore, MonthSnapshot } from '../lib/cashflow/types';

const currentMonth = () => format(new Date(), 'yyyy-MM');

/**
 * Leest precies het deel van de store dat naar `cashflow_state.data` gaat. Alles wat hier
 * niet in staat wordt niet bewaard — `anchorMonth` is sessie-gebonden en `monthSnapshots`
 * gaat naar zijn eigen tabel.
 */
export function selectCashflowData(state: CashflowStore): CashflowData {
  return {
    referenceBalance: state.referenceBalance,
    referenceMonth: state.referenceMonth,
    balanceOverrides: state.balanceOverrides,
    expenseItems: state.expenseItems,
    incomeItems: state.incomeItems,
    recurringItems: state.recurringItems,
    recurringSettlements: state.recurringSettlements,
    reservationSettlements: state.reservationSettlements,
    reservations: state.reservations,
    reservationPayments: state.reservationPayments,
    recurringDefers: state.recurringDefers,
    reservationDefers: state.reservationDefers,
    historyStartMonth: state.historyStartMonth,
    reopenedMonths: state.reopenedMonths,
    lastSeenMonth: state.lastSeenMonth,
  };
}

export const useCashflowStore = create<CashflowStore>()(
  immer((set) => ({
    ...emptyData(),
    // Nooit bewaard: bij elke app-start is dit de huidige maand.
    anchorMonth: currentMonth(),
    monthSnapshots: [] as MonthSnapshot[],

    hydrate: (data, snapshots) =>
      set((state) => {
        Object.assign(state, data);
        state.monthSnapshots = snapshots;
        state.anchorMonth = currentMonth();
      }),

    closeMonth: (snapshot) =>
      set((state) => {
        state.monthSnapshots = state.monthSnapshots.filter(
          (s) => s.monthKey !== snapshot.monthKey,
        );
        state.monthSnapshots.push(snapshot);
        // Opnieuw afsluiten heft een eerdere heropening op.
        state.reopenedMonths = state.reopenedMonths.filter((m) => m !== snapshot.monthKey);
      }),

    markMonthSeen: (monthKey) =>
      set((state) => {
        // Alleen vooruit: terugbladeren naar een oude maand betekent niet dat je de app
        // toen open had.
        if (monthKey > state.lastSeenMonth) state.lastSeenMonth = monthKey;
      }),

    reopenMonth: (monthKey) =>
      set((state) => {
        state.monthSnapshots = state.monthSnapshots.filter((s) => s.monthKey !== monthKey);
        if (!state.reopenedMonths.includes(monthKey)) state.reopenedMonths.push(monthKey);
      }),

    setReferenceBalance: (balance, month) =>
      set((state) => {
        state.referenceBalance = balance;
        state.referenceMonth = month;
      }),

    upsertBalanceOverride: (monthKey, balance) =>
      set((state) => {
        const existing = state.balanceOverrides.find((o) => o.monthKey === monthKey);
        if (existing) {
          existing.balance = balance;
        } else {
          state.balanceOverrides.push({ id: crypto.randomUUID(), monthKey, balance });
        }
      }),

    removeBalanceOverride: (monthKey) =>
      set((state) => {
        state.balanceOverrides = state.balanceOverrides.filter((o) => o.monthKey !== monthKey);
      }),

    setAnchorMonth: (month) =>
      set((state) => { state.anchorMonth = month; }),

    addExpenseItem: (item) =>
      set((state) => { state.expenseItems.push(item); }),

    updateExpenseItem: (id, patch) =>
      set((state) => {
        const item = state.expenseItems.find((i) => i.id === id);
        if (item) Object.assign(item, patch);
      }),

    removeExpenseItem: (id) =>
      set((state) => {
        state.expenseItems = state.expenseItems.filter((i) => i.id !== id);
      }),

    addIncomeItem: (item) =>
      set((state) => { state.incomeItems.push(item); }),

    updateIncomeItem: (id, patch) =>
      set((state) => {
        const item = state.incomeItems.find((i) => i.id === id);
        if (item) Object.assign(item, patch);
      }),

    removeIncomeItem: (id) =>
      set((state) => { state.incomeItems = state.incomeItems.filter((i) => i.id !== id); }),

    addRecurringItem: (item) =>
      set((state) => { state.recurringItems.push(item); }),

    updateRecurringItem: (id, patch) =>
      set((state) => {
        const item = state.recurringItems.find((i) => i.id === id);
        if (item) Object.assign(item, patch);
      }),

    removeRecurringItem: (id) =>
      set((state) => {
        state.recurringItems = state.recurringItems.filter((i) => i.id !== id);
        state.recurringDefers = state.recurringDefers.filter((d) => d.recurringId !== id);
        state.recurringSettlements = state.recurringSettlements.filter((s) => s.recurringId !== id);
      }),

    addReservation: (item) =>
      set((state) => { state.reservations.push(item); }),

    updateReservation: (id, patch) =>
      set((state) => {
        const item = state.reservations.find((r) => r.id === id);
        if (!item) return;
        Object.assign(item, patch);
        // Enkel een spaardoel kan buffer zijn — een maandelijks budget reset elke
        // maand en heeft geen saldo om een tekort uit op te vangen.
        if (item.type !== 'spaardoel') item.coversDeficit = false;
      }),

    setDeficitBuffer: (id, enabled) =>
      set((state) => {
        // Maximaal één bufferpot: een tekort over meerdere potten verdelen is
        // ondefinieerd, dus markeren zet de vlag elders uit.
        for (const r of state.reservations) {
          r.coversDeficit = enabled && r.id === id;
        }
      }),

    removeReservation: (id) =>
      set((state) => {
        state.reservations = state.reservations.filter((r) => r.id !== id);
        state.reservationPayments = state.reservationPayments.filter(
          (p) => p.reservationId !== id,
        );
        state.reservationDefers = state.reservationDefers.filter(
          (d) => d.reservationId !== id,
        );
        state.reservationSettlements = state.reservationSettlements.filter(
          (s) => s.reservationId !== id,
        );
      }),

    addReservationPayment: (payment) =>
      set((state) => { state.reservationPayments.push(payment); }),

    updateReservationPayment: (id, patch) =>
      set((state) => {
        const payment = state.reservationPayments.find((p) => p.id === id);
        if (payment) Object.assign(payment, patch);
      }),

    removeReservationPayment: (id) =>
      set((state) => {
        state.reservationPayments = state.reservationPayments.filter((p) => p.id !== id);
      }),

    upsertReservationSettlement: (reservationId, monthKey, effectiveAmount) =>
      set((state) => {
        const existing = state.reservationSettlements.find(
          (s) => s.reservationId === reservationId && s.monthKey === monthKey,
        );
        if (existing) {
          existing.effectiveAmount = effectiveAmount;
          existing.finalized = false;
        } else {
          state.reservationSettlements.push({
            id: crypto.randomUUID(),
            reservationId,
            monthKey,
            effectiveAmount,
            finalized: false,
          });
        }
      }),

    finalizeReservation: (reservationId, monthKey, effectiveAmount) =>
      set((state) => {
        const existing = state.reservationSettlements.find(
          (s) => s.reservationId === reservationId && s.monthKey === monthKey,
        );
        if (existing) {
          existing.effectiveAmount = effectiveAmount;
          existing.finalized = true;
        } else {
          state.reservationSettlements.push({
            id: crypto.randomUUID(),
            reservationId,
            monthKey,
            effectiveAmount,
            finalized: true,
          });
        }
      }),

    removeReservationSettlement: (reservationId, monthKey) =>
      set((state) => {
        state.reservationSettlements = state.reservationSettlements.filter(
          (s) => !(s.reservationId === reservationId && s.monthKey === monthKey),
        );
      }),

    addRecurringDefer: (defer) =>
      set((state) => { state.recurringDefers.push(defer); }),

    removeRecurringDefer: (id) =>
      set((state) => {
        state.recurringDefers = state.recurringDefers.filter((d) => d.id !== id);
      }),

    settleRecurringDefer: (id, paid, paidAmount) =>
      set((state) => {
        const defer = state.recurringDefers.find((d) => d.id === id);
        if (defer) {
          defer.paid = paid;
          defer.paidAmount = paidAmount;
        }
      }),

    addReservationDefer: (defer) =>
      set((state) => { state.reservationDefers.push(defer); }),

    removeReservationDefer: (id) =>
      set((state) => {
        state.reservationDefers = state.reservationDefers.filter((d) => d.id !== id);
      }),

    upsertRecurringSettlement: (recurringId, monthKey, paid, actualAmount) =>
      set((state) => {
        const existing = state.recurringSettlements.find(
          (s) => s.recurringId === recurringId && s.monthKey === monthKey,
        );
        if (existing) {
          existing.paid = paid;
          existing.actualAmount = actualAmount;
        } else {
          state.recurringSettlements.push({
            id: crypto.randomUUID(),
            recurringId,
            monthKey,
            paid,
            actualAmount,
          });
        }
      }),

    removeRecurringSettlement: (recurringId, monthKey) =>
      set((state) => {
        state.recurringSettlements = state.recurringSettlements.filter(
          (s) => !(s.recurringId === recurringId && s.monthKey === monthKey),
        );
      }),
  })),
);
