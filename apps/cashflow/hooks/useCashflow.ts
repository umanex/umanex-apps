'use client';

import { useEffect, useRef } from 'react';
import { addMonths, format } from 'date-fns';
import { useCashflowStore } from '../store/cashflow';
import { calculateMonths, computeAnchorState } from '../lib/cashflow/calculator';
import type { AnchorState } from '../lib/cashflow/calculator';
import type { MonthData, MonthKey } from '../lib/cashflow/types';
import { buildSnapshot, snapshotMap } from '../lib/cashflow/snapshot';

/**
 * Ruimt uitstellen op die nergens meer meetellen. Draait eenmalig na het laden, door
 * DataGate.
 *
 * Een uitstel is pas afgehandeld wanneer beide maanden vastliggen: de maand waaruit de
 * post vertrok én de maand waar hij toekwam. Zolang één van beide nog doorgerekend wordt,
 * draagt het uitstel daar nog gewicht.
 *
 * Eerder was de grens "vóór de huidige maand", en dat is te ruim: deze functie draait vóór
 * de automatische afsluiting, dus een uitgestelde kost die in de vorige maand toekwam werd
 * weggegooid net vóór die maand bevroren werd. De kost verdween dan uit het snapshot én
 * uit de hele keten erna.
 */
export function cleanupStaleData() {
  const state = useCashflowStore.getState();
  const frozen = new Set(state.monthSnapshots.map((s) => s.monthKey));
  const vastgelegd = (monthKey: string) =>
    monthKey < state.historyStartMonth || frozen.has(monthKey);
  const afgehandeld = (d: { fromMonth: string; toMonth: string }) =>
    vastgelegd(d.fromMonth) && vastgelegd(d.toMonth);

  const staleRecurringDefers = state.recurringDefers.filter(afgehandeld);
  staleRecurringDefers.forEach((d) => state.removeRecurringDefer(d.id));

  const staleReservationDefers = state.reservationDefers.filter(afgehandeld);
  staleReservationDefers.forEach((d) => state.removeReservationDefer(d.id));

  // RecurringSettlements: bewaar enkel de huidige maand
  // Oudere settlements zijn historiek en worden niet verwijderd —
  // ze beinvloeden de berekening niet (calculator filtert op monthKey)
  // maar ze blijven beschikbaar als referentie.

  const cleaned = staleRecurringDefers.length + staleReservationDefers.length;
  if (cleaned > 0 && process.env.NODE_ENV === 'development') {
    console.info(
      `[cashflow] cleanup: ${staleRecurringDefers.length} recurring defers, ` +
      `${staleReservationDefers.length} reservation defers verwijderd`
    );
  }
}

/**
 * Vroegste maand waarvoor er iets bekend is. Verder terug navigeren toont enkel lege
 * maanden, dus daar ligt de ondergrens van het venster.
 */
export function useEarliestDataMonth(): MonthKey {
  // Verder terug dan het startpunt van de historie is er niets waargenomen; wat je daar
  // zou zien is een herberekening uit je huidige gegevens, geen verleden.
  return useCashflowStore((s) => s.historyStartMonth);
}

/**
 * `anchorOverride` laat een scherm rekenen vanaf een eigen maand in plaats van vanaf het
 * venster waar de gebruiker naartoe genavigeerd is. De analyse gebruikt dat: die hoort
 * altijd over vandaag te gaan, ook als je op de prognosepagina terugbladert.
 */
export function useAnchorState(anchorOverride?: MonthKey): AnchorState {
  const referenceBalance = useCashflowStore((s) => s.referenceBalance);
  const referenceMonth = useCashflowStore((s) => s.referenceMonth);
  const storeAnchor = useCashflowStore((s) => s.anchorMonth);
  const anchorMonth = anchorOverride ?? storeAnchor;
  const expenseItems = useCashflowStore((s) => s.expenseItems);
  const incomeItems = useCashflowStore((s) => s.incomeItems);
  const recurringItems = useCashflowStore((s) => s.recurringItems);
  const reservations = useCashflowStore((s) => s.reservations);
  const reservationPayments = useCashflowStore((s) => s.reservationPayments);
  const recurringDefers = useCashflowStore((s) => s.recurringDefers);
  const recurringSettlements = useCashflowStore((s) => s.recurringSettlements);
  const reservationDefers = useCashflowStore((s) => s.reservationDefers);
  const reservationSettlements = useCashflowStore((s) => s.reservationSettlements);
  const balanceOverrides = useCashflowStore((s) => s.balanceOverrides);
  const monthSnapshots = useCashflowStore((s) => s.monthSnapshots);

  return computeAnchorState(
    referenceBalance,
    referenceMonth,
    anchorMonth,
    expenseItems,
    incomeItems,
    recurringItems,
    reservations,
    reservationPayments,
    recurringDefers,
    recurringSettlements,
    reservationDefers,
    reservationSettlements,
    balanceOverrides,
    monthSnapshots,
  );
}

/**
 * Wat de app zelf uitrekent als beginsaldo, zonder een handmatige correctie. Het scherm
 * vergelijkt daartegen om te weten óf er gecorrigeerd is — vergeleek het met het
 * werkelijke beginsaldo, dan zou een bestaande correctie altijd "gelijk" lezen.
 */
export function useComputedStartBalance(): number {
  return useAnchorState().computedStartBalance;
}

export function useMonths(count = 3, anchorOverride?: MonthKey): MonthData[] {
  const storeAnchor = useCashflowStore((s) => s.anchorMonth);
  const anchorMonth = anchorOverride ?? storeAnchor;
  const expenseItems = useCashflowStore((s) => s.expenseItems);
  const incomeItems = useCashflowStore((s) => s.incomeItems);
  const recurringItems = useCashflowStore((s) => s.recurringItems);
  const reservations = useCashflowStore((s) => s.reservations);
  const reservationPayments = useCashflowStore((s) => s.reservationPayments);
  const recurringDefers = useCashflowStore((s) => s.recurringDefers);
  const recurringSettlements = useCashflowStore((s) => s.recurringSettlements);
  const reservationDefers = useCashflowStore((s) => s.reservationDefers);
  const reservationSettlements = useCashflowStore((s) => s.reservationSettlements);
  const monthSnapshots = useCashflowStore((s) => s.monthSnapshots);
  const { startBalance, potBalances } = useAnchorState(anchorMonth);

  return calculateMonths(
    anchorMonth,
    startBalance,
    expenseItems,
    incomeItems,
    recurringItems,
    reservations,
    reservationPayments,
    recurringDefers,
    recurringSettlements,
    reservationDefers,
    reservationSettlements,
    count,
    potBalances,
    snapshotMap(monthSnapshots),
  );
}

/**
 * Sluit de maand die net voorbij is automatisch af, één keer per sessie.
 *
 * Bewust alleen die ene maand. Zou de app bij het eerste gebruik alle oudere maanden
 * bevriezen, dan legt hij een herberekening vast als historie — precies wat een snapshot
 * moet voorkomen. Drie rails daarbij: vóór de referentiemaand is er geen echt banksaldo om
 * van te vertrekken, een maand die je bewust heropend hebt blijft open, en een maand die
 * de app nooit gezien heeft wordt niet bevroren.
 *
 * Die derde rail is het verschil tussen historie en reconstructie. Sloeg je een maand
 * over, dan is de kolom die de app voor die maand tekent volledig afgeleid uit je huidige
 * gegevens; die bevriezen zou een gok als vastgelegd verleden bewaren. Zo'n maand blijft
 * als "reconstructie" staan, met de handmatige Afsluiten-knop als uitweg.
 */
export function useAutoCloseMonth(): void {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const state = useCashflowStore.getState();
    const thisMonth = format(new Date(), 'yyyy-MM');
    const prevMonth = format(addMonths(new Date(), -1), 'yyyy-MM');
    // Eerst lezen, dan pas vastleggen dat we deze maand gezien hebben — anders zou de
    // rail hieronder altijd zichzelf goedkeuren.
    const lastSeen = state.lastSeenMonth;
    state.markMonthSeen(thisMonth);

    if (prevMonth < state.historyStartMonth) return;
    if (state.reopenedMonths.includes(prevMonth)) return;
    if (state.monthSnapshots.some((s) => s.monthKey === prevMonth)) return;
    if (lastSeen < prevMonth) return;

    const hasData =
      state.incomeItems.some((i) => i.monthKey === prevMonth) ||
      state.expenseItems.some((i) => i.monthKey === prevMonth) ||
      state.recurringItems.some((i) => i.startMonth <= prevMonth) ||
      state.reservations.some((r) => r.startMonth <= prevMonth);
    if (!hasData) return;

    const anchor = computeAnchorState(
      state.referenceBalance, state.referenceMonth, prevMonth, state.expenseItems,
      state.incomeItems, state.recurringItems, state.reservations, state.reservationPayments,
      state.recurringDefers, state.recurringSettlements, state.reservationDefers,
      state.reservationSettlements, state.balanceOverrides, state.monthSnapshots,
    );
    const [data] = calculateMonths(
      prevMonth, anchor.startBalance, state.expenseItems, state.incomeItems,
      state.recurringItems, state.reservations, state.reservationPayments,
      state.recurringDefers, state.recurringSettlements, state.reservationDefers,
      state.reservationSettlements, 1, anchor.potBalances,
    );
    if (data) state.closeMonth(buildSnapshot(data, new Date().toISOString()));
  }, []);
}

export function useCashflowActions() {
  return {
    setReferenceBalance: useCashflowStore((s) => s.setReferenceBalance),
    upsertBalanceOverride: useCashflowStore((s) => s.upsertBalanceOverride),
    removeBalanceOverride: useCashflowStore((s) => s.removeBalanceOverride),
    setAnchorMonth: useCashflowStore((s) => s.setAnchorMonth),
    addIncomeItem: useCashflowStore((s) => s.addIncomeItem),
    updateIncomeItem: useCashflowStore((s) => s.updateIncomeItem),
    removeIncomeItem: useCashflowStore((s) => s.removeIncomeItem),
    addRecurringItem: useCashflowStore((s) => s.addRecurringItem),
    updateRecurringItem: useCashflowStore((s) => s.updateRecurringItem),
    removeRecurringItem: useCashflowStore((s) => s.removeRecurringItem),
    addExpenseItem: useCashflowStore((s) => s.addExpenseItem),
    updateExpenseItem: useCashflowStore((s) => s.updateExpenseItem),
    removeExpenseItem: useCashflowStore((s) => s.removeExpenseItem),
    addRecurringDefer: useCashflowStore((s) => s.addRecurringDefer),
    removeRecurringDefer: useCashflowStore((s) => s.removeRecurringDefer),
    settleRecurringDefer: useCashflowStore((s) => s.settleRecurringDefer),
    upsertRecurringSettlement: useCashflowStore((s) => s.upsertRecurringSettlement),
    removeRecurringSettlement: useCashflowStore((s) => s.removeRecurringSettlement),
    addReservationDefer: useCashflowStore((s) => s.addReservationDefer),
    removeReservationDefer: useCashflowStore((s) => s.removeReservationDefer),
    upsertReservationSettlement: useCashflowStore((s) => s.upsertReservationSettlement),
    removeReservationSettlement: useCashflowStore((s) => s.removeReservationSettlement),
    finalizeReservation: useCashflowStore((s) => s.finalizeReservation),
    closeMonth: useCashflowStore((s) => s.closeMonth),
    reopenMonth: useCashflowStore((s) => s.reopenMonth),
  };
}

export function useReservationActions() {
  return {
    addReservation: useCashflowStore((s) => s.addReservation),
    updateReservation: useCashflowStore((s) => s.updateReservation),
    removeReservation: useCashflowStore((s) => s.removeReservation),
    setDeficitBuffer: useCashflowStore((s) => s.setDeficitBuffer),
    addReservationPayment: useCashflowStore((s) => s.addReservationPayment),
    updateReservationPayment: useCashflowStore((s) => s.updateReservationPayment),
    removeReservationPayment: useCashflowStore((s) => s.removeReservationPayment),
  };
}
