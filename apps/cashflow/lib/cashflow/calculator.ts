import type {
  MonthKey,
  MonthData,
  ExpenseItem,
  IncomeItem,
  RecurringItem,
  RecurringDefer,
  RecurringSettlement,
  ReservationItem,
  ReservationPayment,
  ReservationPotBalance,
  ReservationSettlement,
  ReservationDefer,
  BalanceOverride,
} from './types';
import { addMonths, format, parseISO, differenceInMonths } from 'date-fns';

function getMonthsInRange(anchorMonth: MonthKey, count: number): MonthKey[] {
  const base = parseISO(`${anchorMonth}-01`);
  return Array.from({ length: count }, (_, i) =>
    format(addMonths(base, i), 'yyyy-MM'),
  );
}

export function calcPotBalance(
  reservation: ReservationItem,
  payments: ReservationPayment[],
  settlements: ReservationSettlement[],
  upToMonth: MonthKey,
): number {
  if (upToMonth < reservation.startMonth) return 0;

  // Maandelijks budget: enkel de huidige maand telt — pot reset aan het einde van elke maand
  if (reservation.type === 'maandelijks_budget') {
    const settlement = settlements.find(
      (s) => s.reservationId === reservation.id && s.monthKey === upToMonth,
    );
    const provision = settlement ? settlement.effectiveAmount : reservation.monthlyAmount;
    const paid = payments
      .filter((p) => p.reservationId === reservation.id && p.monthKey === upToMonth)
      .reduce((s, p) => s + p.fromReservation, 0);
    return provision - paid;
  }

  const start = parseISO(`${reservation.startMonth}-01`);
  const end = parseISO(`${upToMonth}-01`);
  const monthCount = differenceInMonths(end, start) + 1;
  let accumulated = 0;
  for (let i = 0; i < monthCount; i++) {
    const mk = format(addMonths(start, i), 'yyyy-MM');
    const settlement = settlements.find(
      (s) => s.reservationId === reservation.id && s.monthKey === mk,
    );
    accumulated += (settlement && !settlement.finalized)
      ? settlement.effectiveAmount
      : reservation.monthlyAmount;
  }
  const paid = payments
    .filter((p) => p.reservationId === reservation.id && p.monthKey <= upToMonth)
    .reduce((s, p) => s + p.fromReservation, 0);
  return accumulated - paid;
}

export function calculateMonths(
  anchorMonth: MonthKey,
  startBalance: number,
  expenseItems: ExpenseItem[],
  incomeItems: IncomeItem[],
  recurringItems: RecurringItem[],
  reservations: ReservationItem[],
  reservationPayments: ReservationPayment[],
  recurringDefers: RecurringDefer[],
  recurringSettlements: RecurringSettlement[],
  reservationDefers: ReservationDefer[],
  reservationSettlements: ReservationSettlement[],
  count = 3,
  adjustFirstMonth = false,
): MonthData[] {
  const months = getMonthsInRange(anchorMonth, count);
  const result: MonthData[] = [];
  let runningBalance = startBalance;
  const potBalanceMap = new Map<string, number>();
  const deferredRemainingMap = new Map<string, number>();

  // Initialiseer spaardoel-potten met historisch saldo vóór het berekeningsvenster.
  // deferredRemainingMap = cumulatieve uitstaande provisies = potbalans voor spaardoelen.
  const prevMonth = format(addMonths(parseISO(`${anchorMonth}-01`), -1), 'yyyy-MM');
  for (const res of reservations) {
    if (res.type === 'spaardoel' && res.startMonth <= prevMonth) {
      const historical = calcPotBalance(res, reservationPayments, reservationSettlements, prevMonth);
      potBalanceMap.set(res.id, historical);
      deferredRemainingMap.set(res.id, historical);
    }
  }

  let monthIndex = 0;
  for (const monthKey of months) {
    const monthExpenseItems = expenseItems.filter((i) => i.monthKey === monthKey);
    const monthIncomeItems = incomeItems.filter((i) => i.monthKey === monthKey);
    const allActiveRecurring = recurringItems.filter((i) => i.startMonth <= monthKey);

    const departingDeferIds = new Set(
      recurringDefers.filter((d) => d.fromMonth === monthKey).map((d) => d.recurringId),
    );
    const monthRecurringItems = allActiveRecurring.filter((i) => !departingDeferIds.has(i.id));

    const arrivingDefers = recurringDefers.filter((d) => d.toMonth === monthKey);
    const deferredItems = arrivingDefers.flatMap((d) => {
      const ri = recurringItems.find((i) => i.id === d.recurringId && i.startMonth <= d.fromMonth);
      if (!ri) return [];
      const amount = ri.frequency === 'yearly' ? ri.amount / 12 : ri.amount;
      const paid = d.paid ?? false;
      const paidAmount = paid ? (d.paidAmount ?? amount) : amount;
      return [{ deferId: d.id, recurringId: d.recurringId, label: ri.label, amount, fromMonth: d.fromMonth, paid, paidAmount }];
    });

    const totalIncome = monthIncomeItems.reduce((s, i) => s + i.amount, 0);

    // Recurring: gebruik actualAmount als betaald, anders begroot
    const totalNormalRecurring = monthRecurringItems.reduce((s, item) => {
      const budgeted = item.frequency === 'yearly' ? item.amount / 12 : item.amount;
      const settlement = recurringSettlements.find(
        (st) => st.recurringId === item.id && st.monthKey === monthKey,
      );
      return s + (settlement?.paid ? settlement.actualAmount : budgeted);
    }, 0);

    const deferredRecurringAmount = deferredItems.reduce((s, d) => s + (d.paid ? d.paidAmount : d.amount), 0);
    const totalRecurring = totalNormalRecurring + deferredRecurringAmount;

    const activeReservations = reservations.filter((r) => r.startMonth <= monthKey);

    const departingReservationDeferIds = new Set(
      reservationDefers.filter((d) => d.fromMonth === monthKey).map((d) => d.reservationId),
    );
    const billableReservations = activeReservations.filter(
      (r) => !departingReservationDeferIds.has(r.id),
    );

    const arrivingReservationDefers = reservationDefers.filter((d) => d.toMonth === monthKey);
    const deferredReservationItems = arrivingReservationDefers.flatMap((d) => {
      const res = reservations.find((r) => r.id === d.reservationId);
      if (!res) return [];
      return [{
        deferId: d.id,
        reservationId: d.reservationId,
        label: res.label,
        amount: res.monthlyAmount,
        fromMonth: d.fromMonth,
      }];
    });
    const deferredReservationAmount = deferredReservationItems.reduce((s, d) => s + d.amount, 0);

    const getEffectiveAmount = (res: ReservationItem): number => {
      const settlement = reservationSettlements.find(
        (s) => s.reservationId === res.id && s.monthKey === monthKey,
      );
      return settlement ? settlement.effectiveAmount : res.monthlyAmount;
    };

    const getDeferred = (resId: string) => deferredRemainingMap.get(resId) ?? 0;
    const getTotalProvision = (res: ReservationItem) => res.monthlyAmount + getDeferred(res.id);
    const getProvisionThisMonth = (res: ReservationItem): number => {
      const settlement = reservationSettlements.find(
        (s) => s.reservationId === res.id && s.monthKey === monthKey,
      );
      if (settlement?.finalized) {
        return res.type === 'maandelijks_budget' ? settlement.effectiveAmount : res.monthlyAmount;
      }
      return settlement ? settlement.effectiveAmount : res.monthlyAmount;
    };

    for (const res of billableReservations) {
      potBalanceMap.set(res.id, (potBalanceMap.get(res.id) ?? 0) + getProvisionThisMonth(res));
    }
    for (const d of arrivingReservationDefers) {
      const res = reservations.find((r) => r.id === d.reservationId);
      if (res) potBalanceMap.set(res.id, (potBalanceMap.get(res.id) ?? 0) + getEffectiveAmount(res));
    }

    const monthReservationPayments = reservationPayments.filter((p) => p.monthKey === monthKey);
    for (const payment of monthReservationPayments) {
      potBalanceMap.set(
        payment.reservationId,
        (potBalanceMap.get(payment.reservationId) ?? 0) - payment.fromReservation,
      );
    }
    // Als er cash bijbetaald werd, is de pot volledig benut — saldo naar 0
    for (const payment of monthReservationPayments) {
      if (payment.fromCash > 0) {
        potBalanceMap.set(payment.reservationId, 0);
      }
    }

    // Maandelijks budget: onbesteed provisie-saldo terugstorten naar vrij saldo
    const releasedPerPot = new Map<string, number>();
    let releasedBudgetAmount = 0;
    for (const res of billableReservations) {
      if (res.type === 'maandelijks_budget') {
        const balance = potBalanceMap.get(res.id) ?? 0;
        if (balance > 0) {
          releasedPerPot.set(res.id, balance);
          releasedBudgetAmount += balance;
          potBalanceMap.set(res.id, 0);
        } else {
          releasedPerPot.set(res.id, 0);
        }
      }
    }

    const totalReservationDeductions =
      billableReservations.reduce((s, r) => s + getProvisionThisMonth(r), 0) + deferredReservationAmount - releasedBudgetAmount;
    const totalReservationCashPayments = monthReservationPayments.reduce((s, p) => s + p.fromCash, 0);

    const reservationPots: ReservationPotBalance[] = billableReservations.map((r) => {
      const settlement = reservationSettlements.find(
        (s) => s.reservationId === r.id && s.monthKey === monthKey,
      );
      return {
        reservationId: r.id,
        label: r.label,
        monthlyAmount: r.monthlyAmount,
        effectiveAmount: settlement ? settlement.effectiveAmount : r.monthlyAmount,
        hasSettlement: !!settlement,
        finalized: settlement?.finalized ?? false,
        potBalance: potBalanceMap.get(r.id) ?? 0,
        paymentsThisMonth: monthReservationPayments.filter((p) => p.reservationId === r.id),
        provisionThisMonth: getProvisionThisMonth(r),
        deferredFromPrevious: getDeferred(r.id),
        potType: r.type,
        releasedThisMonth: releasedPerPot.get(r.id) ?? 0,
      };
    });

    const monthSettlements = recurringSettlements.filter((s) => s.monthKey === monthKey);

    // --- BESCHIKBAAR / OPENSTAAND / EINDSALDO ---
    //
    // Betaald/gereserveerd = al effectief van het saldo weg:
    //   - betaalde vaste kosten (actualAmount)
    //   - uitgestelde recurring die deze maand toekomen
    //   - spaarpot stortingen (altijd weg, gaan naar pot)
    //   - cash betalingen uit potten (bovenop de storting)
    //   - betaalde expense items
    //
    // Openstaand = nog te betalen:
    //   - onbetaalde vaste kosten
    //   - onbetaalde expense items
    //
    // Invariant: Beschikbaar - Openstaand = Eindsaldo
    //   = runningBalance + income - betaald - onbetaald
    //   = runningBalance + income - alle kosten  ✓

    const paidRecurringAmount = monthRecurringItems.reduce((s, item) => {
      const settlement = recurringSettlements.find(
        (st) => st.recurringId === item.id && st.monthKey === monthKey,
      );
      return s + (settlement?.paid ? settlement.actualAmount : 0);
    }, 0);

    const totalExpenses = monthExpenseItems.reduce((s, i) => s + i.amount, 0);
    const paidExpenses = monthExpenseItems.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
    const unpaidExpenses = monthExpenseItems.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0);

    // Spaarpot stortingen zijn altijd "betaald" (geld gaat naar de pot)
    // en horen in paidThisMonth, NIET in openstaand
    const paidThisMonth =
      paidRecurringAmount +
      deferredRecurringAmount +
      totalReservationDeductions +   // ← was missing: spaarpot stortingen
      totalReservationCashPayments +
      paidExpenses;

    const availableBudget = runningBalance + totalIncome - paidThisMonth;

    const unpaidRecurringAmount = monthRecurringItems.reduce((s, item) => {
      const settlement = recurringSettlements.find(
        (st) => st.recurringId === item.id && st.monthKey === monthKey,
      );
      if (settlement?.paid) return s;
      return s + (item.frequency === 'yearly' ? item.amount / 12 : item.amount);
    }, 0);

    // Openstaand bevat GEEN spaarpot stortingen meer — die zitten in paidThisMonth
    const totalOutstandingCosts = unpaidRecurringAmount + unpaidExpenses;

    const endBalance = availableBudget - totalOutstandingCosts;

    // Met adjustFirstMonth: effectiveEndBalance = display-formule zodat het als startsaldo volgende maand dient.
    // Maand 0: deferred + provisie per pot; maand 1+: alleen provisie (deferred gereset na maand 0).
    const unpaidDeferredAmount = deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0);
    const effectiveEndBalance = adjustFirstMonth
      ? (() => {
          const isFinalized = (r: ReservationItem) =>
            reservationSettlements.some(
              (ss) => ss.reservationId === r.id && ss.monthKey === monthKey && ss.finalized,
            );
          const spaarpotDeduction = (monthIndex === 0)
            ? billableReservations.reduce((s, r) => isFinalized(r) ? s : s + getDeferred(r.id) + getProvisionThisMonth(r), 0) + deferredReservationAmount
            : billableReservations.reduce((s, r) => isFinalized(r) ? s : s + getProvisionThisMonth(r), 0) + deferredReservationAmount;
          return runningBalance + totalIncome - unpaidRecurringAmount - unpaidDeferredAmount - unpaidExpenses - spaarpotDeduction;
        })()
      : endBalance;

    result.push({
      monthKey,
      startBalance: runningBalance,
      endBalance: effectiveEndBalance,
      totalIncome,
      totalRecurring,
      totalReservationDeductions,
      totalReservationCashPayments,
      availableBudget,
      totalOutstandingCosts,
      expenseItems: monthExpenseItems,
      totalExpenses,
      incomeItems: monthIncomeItems,
      recurringItems: monthRecurringItems,
      reservationSettlements: reservationSettlements.filter((s) => s.monthKey === monthKey),
      reservationPots,
      reservationPayments: monthReservationPayments,
      deferredRecurringAmount,
      deferredItems,
      deferredReservationAmount,
      deferredReservationItems,
      recurringSettlements: monthSettlements,
    });

    const totalPotCarryForward = billableReservations.reduce((s, r) => {
      const settlement = reservationSettlements.find(
        (ss) => ss.reservationId === r.id && ss.monthKey === monthKey,
      );
      if (settlement?.finalized && r.type === 'maandelijks_budget') return s;
      const paymentsForPot = monthReservationPayments.filter((p) => p.reservationId === r.id);
      const paidFromReservation = paymentsForPot.reduce((s2, p) => s2 + p.fromReservation, 0);
      const totalInvoiced = paymentsForPot.reduce((s2, p) => s2 + p.invoiceAmount, 0);
      const deferred = r.type === 'maandelijks_budget' ? 0 : getDeferred(r.id);
      const allInvoiced = paymentsForPot.length > 0 && totalInvoiced >= getProvisionThisMonth(r) + deferred;
      if (allInvoiced) return s;
      return s + Math.max(0, getProvisionThisMonth(r) - Math.max(0, paidFromReservation - deferred));
    }, 0);

    const openstaandCarryForward =
      unpaidRecurringAmount +
      unpaidDeferredAmount +
      unpaidExpenses +
      totalPotCarryForward +
      deferredReservationAmount;

    for (const res of billableReservations) {
      if (res.type === 'maandelijks_budget') {
        deferredRemainingMap.set(res.id, 0);
        continue;
      }
      const paidFromReservation = monthReservationPayments
        .filter((p) => p.reservationId === res.id)
        .reduce((s, p) => s + p.fromReservation, 0);
      const remaining = getProvisionThisMonth(res) + getDeferred(res.id) - paidFromReservation;
      deferredRemainingMap.set(res.id, remaining > 0 ? remaining : 0);
    }

    runningBalance = effectiveEndBalance;
    monthIndex++;
  }

  return result;
}

export function computeHistoricalBalance(
  referenceBalance: number,
  referenceMonth: MonthKey,
  anchorMonth: MonthKey,
  expenseItems: ExpenseItem[],
  incomeItems: IncomeItem[],
  recurringItems: RecurringItem[],
  reservations: ReservationItem[],
  reservationPayments: ReservationPayment[],
  recurringDefers: RecurringDefer[],
  recurringSettlements: RecurringSettlement[],
  reservationDefers: ReservationDefer[],
  reservationSettlements: ReservationSettlement[],
  balanceOverrides: BalanceOverride[],
): number {
  // Directe override voor anchorMonth heeft prioriteit
  const anchorOverride = balanceOverrides.find((o) => o.monthKey === anchorMonth);
  if (anchorOverride) return anchorOverride.balance;

  if (anchorMonth <= referenceMonth) return referenceBalance;

  // Meest recente override vóór anchorMonth fungeert als effectief referentiepunt
  const priorOverrides = balanceOverrides
    .filter((o) => o.monthKey >= referenceMonth && o.monthKey < anchorMonth)
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey));

  const pivot = priorOverrides[0];
  const effectiveBalance = pivot ? pivot.balance : referenceBalance;
  const effectiveMonth = pivot ? pivot.monthKey : referenceMonth;

  const monthCount = differenceInMonths(
    parseISO(`${anchorMonth}-01`),
    parseISO(`${effectiveMonth}-01`),
  );
  if (monthCount <= 0) return effectiveBalance;

  // Gebruik calculateMonths voor consistente carry-forward formule.
  // We vragen monthCount+1 maanden; de laatste maand IS anchorMonth
  // en diens startBalance is de forward-berekende balans die we nodig hebben.
  const months = calculateMonths(
    effectiveMonth,
    effectiveBalance,
    expenseItems,
    incomeItems,
    recurringItems,
    reservations,
    reservationPayments,
    recurringDefers,
    recurringSettlements,
    reservationDefers,
    reservationSettlements,
    monthCount + 1,
  );

  return months[monthCount]?.startBalance ?? effectiveBalance;
}
