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
  MonthSubtotals,
} from './types';
import { addMonths, format, parseISO, differenceInMonths } from 'date-fns';
import { collectCashOverflowItems, computeMonthSubtotals } from './subtotals';

function getMonthsInRange(anchorMonth: MonthKey, count: number): MonthKey[] {
  const base = parseISO(`${anchorMonth}-01`);
  return Array.from({ length: count }, (_, i) =>
    format(addMonths(base, i), 'yyyy-MM'),
  );
}

/**
 * Uitkomst van één maandberekening voor een gegeven buffer-storting. De maand wordt
 * meermaals doorgerekend om de bufferopname te bepalen (zie `evaluateMonth`), dus deze
 * berekening mag niets muteren — de nieuwe potstanden komen als resultaat terug.
 */
type MonthEvaluation = {
  endBalance: number;
  subtotals: MonthSubtotals;
  availableBudget: number;
  totalReservationDeductions: number;
  reservationPots: ReservationPotBalance[];
  nextPotBalances: Map<string, number>;
  nextDeferred: Map<string, number>;
};

/** Onder deze drempel is een saldo afrondingsruis, geen echt tekort. */
const EPSILON = 0.005;

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

  // Spaardoel: een gefinaliseerde maand sluit de pot af — het restsaldo is
  // vrijgegeven en de opbouw herstart in de maand erna. Alleen maanden en
  // betalingen ná de laatst gefinaliseerde maand tellen nog mee.
  const lastFinalized = settlements
    .filter((s) => s.reservationId === reservation.id && s.finalized && s.monthKey <= upToMonth)
    .reduce<MonthKey | null>((max, s) => (max === null || s.monthKey > max ? s.monthKey : max), null);
  if (lastFinalized === upToMonth) return 0;

  const start = parseISO(`${reservation.startMonth}-01`);
  const end = parseISO(`${upToMonth}-01`);
  const monthCount = differenceInMonths(end, start) + 1;
  let accumulated = 0;
  for (let i = 0; i < monthCount; i++) {
    const mk = format(addMonths(start, i), 'yyyy-MM');
    if (lastFinalized !== null && mk <= lastFinalized) continue;
    const settlement = settlements.find(
      (s) => s.reservationId === reservation.id && s.monthKey === mk,
    );
    accumulated += settlement ? settlement.effectiveAmount : reservation.monthlyAmount;
  }
  const paid = payments
    .filter(
      (p) =>
        p.reservationId === reservation.id &&
        p.monthKey <= upToMonth &&
        (lastFinalized === null || p.monthKey > lastFinalized),
    )
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
  /**
   * Potstanden aan het begin van de ankermaand. Nodig zodra een bufferpot in het
   * verleden een opname deed: die opname is afgeleid en staat dus niet in de store,
   * waardoor `calcPotBalance` (die enkel stortingen en betalingen optelt) de pot
   * opnieuw zou vullen. De aanroeper levert hier de doorgerolde stand aan.
   */
  initialPotBalances?: Map<string, number>,
): MonthData[] {
  const months = getMonthsInRange(anchorMonth, count);
  const result: MonthData[] = [];
  let runningBalance = startBalance;
  let monthIndex = 0;
  const potBalanceMap = new Map<string, number>();
  const deferredRemainingMap = new Map<string, number>();

  // Initialiseer spaardoel-potten met historisch saldo vóór het berekeningsvenster.
  // deferredRemainingMap = cumulatieve uitstaande provisies = potbalans voor spaardoelen.
  const prevMonth = format(addMonths(parseISO(`${anchorMonth}-01`), -1), 'yyyy-MM');
  for (const res of reservations) {
    if (res.type === 'spaardoel' && res.startMonth <= prevMonth) {
      const historical =
        initialPotBalances?.get(res.id) ??
        calcPotBalance(res, reservationPayments, reservationSettlements, prevMonth);
      potBalanceMap.set(res.id, historical);
      deferredRemainingMap.set(res.id, historical);
    }
  }

  // Bufferpot: vangt een negatief eindsaldo op. Enkel een spaardoel kan buffer zijn —
  // een maandelijks budget reset elke maand en heeft dus geen saldo om uit te putten.
  const bufferId =
    reservations.find((r) => r.coversDeficit && r.type === 'spaardoel')?.id ?? null;

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

    const paidDeferredRecurring = deferredItems
      .filter((d) => d.paid)
      .reduce((s, d) => s + d.paidAmount, 0);
    const unpaidDeferredRecurring = deferredItems
      .filter((d) => !d.paid)
      .reduce((s, d) => s + d.amount, 0);
    const deferredRecurringAmount = paidDeferredRecurring + unpaidDeferredRecurring;
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

    // Een uitgestelde storting die deze maand toekomt, wordt aan de pot gecrediteerd —
    // dus telt hij ook mee in de stand die naar volgende maand doorrolt.
    const arrivingCredit = new Map<string, number>();
    for (const d of arrivingReservationDefers) {
      const res = reservations.find((r) => r.id === d.reservationId);
      if (res) {
        arrivingCredit.set(res.id, (arrivingCredit.get(res.id) ?? 0) + getEffectiveAmount(res));
      }
    }

    const monthReservationPayments = reservationPayments.filter((p) => p.monthKey === monthKey);
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

    const unpaidRecurringAmount = monthRecurringItems.reduce((s, item) => {
      const settlement = recurringSettlements.find(
        (st) => st.recurringId === item.id && st.monthKey === monthKey,
      );
      if (settlement?.paid) return s;
      return s + (item.frequency === 'yearly' ? item.amount / 12 : item.amount);
    }, 0);

    // Openstaand bevat GEEN spaarpot stortingen meer — die zitten in paidThisMonth
    const totalOutstandingCosts = unpaidRecurringAmount + unpaidExpenses;

    // Prudent budget-model: onbesteed maandbudget wordt NIET teruggestort naar het
    // vrije saldo — we nemen aan dat het budget besteed wordt. De kost van een budget
    // = provisie − betaald uit pot, identiek in de huidige én toekomstige maanden (en
    // aan de sectie-kop die dat via displayContribution al toont). Een betaling uit een
    // budget verhoogt zo, net als bij een provisie, het eindsaldo van die maand.
    const budgetPaidFromReservation = billableReservations
      .filter((r) => r.type === 'maandelijks_budget')
      .reduce(
        (s, r) =>
          s +
          monthReservationPayments
            .filter((p) => p.reservationId === r.id)
            .reduce((ps, p) => ps + p.fromReservation, 0),
        0,
      );

    const totalReservationCashPayments = monthReservationPayments.reduce((s, p) => s + p.fromCash, 0);

    const isFirstMonth = monthIndex === 0;

    /**
     * Rekent de maand door voor een gegeven buffer-storting. `bufferProvision === null`
     * betekent: gebruik de normale storting (settlement of maandbedrag). Zuiver — muteert
     * potBalanceMap/deferredRemainingMap niet, zodat dezelfde maand meermaals doorgerekend
     * kan worden om de bufferopname op te lossen.
     */
    const evaluateMonth = (bufferProvision: number | null): MonthEvaluation => {
      const getProvisionThisMonth = (res: ReservationItem): number => {
        if (bufferProvision !== null && res.id === bufferId) return bufferProvision;
        const settlement = reservationSettlements.find(
          (s) => s.reservationId === res.id && s.monthKey === monthKey,
        );
        return settlement ? settlement.effectiveAmount : res.monthlyAmount;
      };

      const potBalances = new Map(potBalanceMap);
      for (const res of billableReservations) {
        potBalances.set(res.id, (potBalances.get(res.id) ?? 0) + getProvisionThisMonth(res));
      }
      for (const [resId, credit] of arrivingCredit) {
        potBalances.set(resId, (potBalances.get(resId) ?? 0) + credit);
      }

      for (const payment of monthReservationPayments) {
        potBalances.set(
          payment.reservationId,
          (potBalances.get(payment.reservationId) ?? 0) - payment.fromReservation,
        );
      }
      // Als er cash bijbetaald werd, is de pot volledig benut — saldo naar 0
      for (const payment of monthReservationPayments) {
        if (payment.fromCash > 0) {
          potBalances.set(payment.reservationId, 0);
        }
      }

      // Gefinaliseerde spaardoelen: de pot is afgesloten, het restsaldo
      // (overgedragen + storting − betaald uit pot) valt vrij in deze maand.
      // Netto kost van de afsluitmaand = betaald − overgedragen, onafhankelijk
      // van de storting — over de hele cyclus is de kost dan exact wat betaald is.
      const spaardoelReleases = new Map<string, number>();
      for (const res of billableReservations) {
        if (res.type !== 'spaardoel') continue;
        const settlement = reservationSettlements.find(
          (s) => s.reservationId === res.id && s.monthKey === monthKey,
        );
        if (!settlement?.finalized) continue;
        const paidFromReservation = monthReservationPayments
          .filter((p) => p.reservationId === res.id)
          .reduce((s, p) => s + p.fromReservation, 0);
        const remaining = getProvisionThisMonth(res) + getDeferred(res.id) - paidFromReservation;
        spaardoelReleases.set(res.id, remaining > 0 ? remaining : 0);
      }
      const totalSpaardoelReleased = Array.from(spaardoelReleases.values()).reduce((s, v) => s + v, 0);

      // Zie de toelichting bij `budgets` in subtotals.ts: een betaling uit een budget
      // verlaagt de kost alleen in de ankermaand, waar ze al van het banksaldo af is.
      const totalReservationDeductions =
        billableReservations.reduce((s, r) => s + getProvisionThisMonth(r), 0) +
        deferredReservationAmount -
        (isFirstMonth ? budgetPaidFromReservation : 0) -
        totalSpaardoelReleased;

      const reservationPots: ReservationPotBalance[] = billableReservations.map((r) => {
        const settlement = reservationSettlements.find(
          (s) => s.reservationId === r.id && s.monthKey === monthKey,
        );
        const paymentsThisMonth = monthReservationPayments.filter((p) => p.reservationId === r.id);
        const paidFromReservation = paymentsThisMonth.reduce((s, p) => s + p.fromReservation, 0);
        const provision = getProvisionThisMonth(r);
        const deferred = getDeferred(r.id);
        const displayContribution = r.type === 'maandelijks_budget' && isFirstMonth
          ? provision - paidFromReservation
          : provision;
        return {
          reservationId: r.id,
          label: r.label,
          monthlyAmount: r.monthlyAmount,
          effectiveAmount: settlement ? settlement.effectiveAmount : r.monthlyAmount,
          hasSettlement: !!settlement,
          finalized: settlement?.finalized ?? false,
          // Een gefinaliseerde spaarpot is deze maand leeggemaakt: het restsaldo is al
          // in het vrije saldo terechtgekomen, dus staat er niets meer gereserveerd.
          potBalance: (potBalances.get(r.id) ?? 0) - (spaardoelReleases.get(r.id) ?? 0),
          paymentsThisMonth,
          provisionThisMonth: provision,
          deferredFromPrevious: deferred,
          potType: r.type,
          releasedThisMonth: spaardoelReleases.get(r.id) ?? 0,
          displayContribution,
          isDeficitBuffer: r.id === bufferId,
          deficitCoverage: null,
          deficitUncovered: 0,
        };
      });

      // Spaarpot stortingen zijn altijd "betaald" (geld gaat naar de pot)
      // en horen in paidThisMonth, NIET in openstaand
      const paidThisMonth =
        paidRecurringAmount +
        deferredRecurringAmount +
        totalReservationDeductions +   // ← was missing: spaarpot stortingen
        totalReservationCashPayments +
        paidExpenses;

      const availableBudget = runningBalance + totalIncome - paidThisMonth;

      // Eén formule voor kaart én doorrol — zie lib/cashflow/subtotals.ts.
      const subtotals = computeMonthSubtotals({
        startBalance: runningBalance,
        totalIncome,
        unpaidRecurring: unpaidRecurringAmount,
        paidRecurring: paidRecurringAmount,
        unpaidExpenses,
        paidExpenses,
        unpaidDeferredRecurring,
        paidDeferredRecurring,
        reservationPots,
        totalCashPayments: totalReservationCashPayments,
        deferredReservationAmount,
        isFirstMonth,
      });
      const endBalance = subtotals.endBalance;

      // Doorrol naar de volgende maand. Niet-billable potten behouden hun stand,
      // vandaar een kopie van de bestaande maps als vertrekpunt.
      const nextDeferred = new Map(deferredRemainingMap);
      const nextPotBalances = new Map(potBalances);
      for (const res of billableReservations) {
        if (res.type === 'maandelijks_budget') {
          // Een budget rolt niet door: wat je niet opmaakt blijft op je rekening staan in
          // plaats van gereserveerd te blijven. Volgende maand start dus weer op nul.
          nextDeferred.set(res.id, 0);
          nextPotBalances.set(res.id, 0);
          continue;
        }
        // Gefinaliseerde spaardoel-maand: pot is afgesloten, restsaldo is
        // vrijgegeven — opbouw herstart de volgende maand op nul.
        if (spaardoelReleases.has(res.id)) {
          nextDeferred.set(res.id, 0);
          nextPotBalances.set(res.id, 0);
          continue;
        }
        const paidFromReservation = monthReservationPayments
          .filter((p) => p.reservationId === res.id)
          .reduce((s, p) => s + p.fromReservation, 0);
        const remaining =
          getProvisionThisMonth(res) + getDeferred(res.id) +
          (arrivingCredit.get(res.id) ?? 0) - paidFromReservation;
        nextDeferred.set(res.id, remaining > 0 ? remaining : 0);
      }
      // Een pot die deze maand niet aangerekend wordt (vertrokken via een uitstel) maar
      // wél een uitgestelde storting ontvangt, moet die storting toch bijgeschreven zien.
      for (const [resId, credit] of arrivingCredit) {
        if (billableReservations.some((r) => r.id === resId)) continue;
        const paidFromReservation = monthReservationPayments
          .filter((p) => p.reservationId === resId)
          .reduce((s, p) => s + p.fromReservation, 0);
        const remaining = getDeferred(resId) + credit - paidFromReservation;
        nextDeferred.set(resId, remaining > 0 ? remaining : 0);
      }

      return {
        endBalance,
        subtotals,
        availableBudget,
        totalReservationDeductions,
        reservationPots,
        nextPotBalances,
        nextDeferred,
      };
    };

    // --- BUFFER: tekortdekking ---
    //
    // Het eindsaldo is lineair in de buffer-storting x: E(x) = E(0) − x. Komt de maand
    // met de normale storting negatief uit, dan is de storting die het eindsaldo exact
    // op €0 zet dus x = E(0) — negatief bij een echte opname, verlaagd-positief wanneer
    // het volstaat om minder te storten. De opname kan nooit groter zijn dan wat er in
    // de pot zit; het restant blijft als negatief eindsaldo zichtbaar staan.
    let evaluation = evaluateMonth(null);
    let bufferCoverage: number | null = null;
    let bufferUncovered = 0;

    const bufferIsBillable = bufferId !== null && billableReservations.some((r) => r.id === bufferId);
    const bufferIsFinalized =
      bufferId !== null &&
      reservationSettlements.some(
        (s) => s.reservationId === bufferId && s.monthKey === monthKey && s.finalized,
      );

    if (bufferId !== null && bufferIsBillable && !bufferIsFinalized && evaluation.endBalance < -EPSILON) {
      // Wat de pot deze maand echt kan missen: het overgedragen saldo plus een
      // uitgestelde storting die nu toekomt, minus wat er deze maand al uit betaald is.
      // Nooit negatief — een overtrokken pot leent niets uit.
      const paidFromBuffer = monthReservationPayments
        .filter((p) => p.reservationId === bufferId)
        .reduce((s, p) => s + p.fromReservation, 0);
      const potAvailable = Math.max(
        0,
        getDeferred(bufferId) + (arrivingCredit.get(bufferId) ?? 0) - paidFromBuffer,
      );
      // De buffer mag de maand nooit slechter maken dan de normale storting al doet,
      // dus is die storting de bovengrens.
      const bufferSettlement = reservationSettlements.find(
        (s) => s.reservationId === bufferId && s.monthKey === monthKey,
      );
      const normalProvision = bufferSettlement
        ? bufferSettlement.effectiveAmount
        : (reservations.find((r) => r.id === bufferId)?.monthlyAmount ?? 0);
      const target = Math.min(
        normalProvision,
        Math.max(evaluateMonth(0).endBalance, -potAvailable),
      );
      const covered = evaluateMonth(target);
      bufferCoverage = target;
      bufferUncovered = covered.endBalance < -EPSILON ? -covered.endBalance : 0;
      evaluation = covered;
    }

    const {
      endBalance,
      subtotals,
      availableBudget,
      totalReservationDeductions,
      nextPotBalances,
      nextDeferred,
    } = evaluation;

    const reservationPots =
      bufferCoverage === null
        ? evaluation.reservationPots
        : evaluation.reservationPots.map((p) =>
            p.reservationId === bufferId
              ? { ...p, deficitCoverage: bufferCoverage, deficitUncovered: bufferUncovered }
              : p,
          );

    result.push({
      monthKey,
      startBalance: runningBalance,
      endBalance,
      subtotals,
      cashOverflowItems: collectCashOverflowItems(reservationPots, isFirstMonth),
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

    for (const [id, balance] of nextPotBalances) potBalanceMap.set(id, balance);
    for (const [id, remaining] of nextDeferred) deferredRemainingMap.set(id, remaining);

    runningBalance = endBalance;
    monthIndex++;
  }

  return result;
}

/**
 * Toestand aan het begin van de ankermaand: het banksaldo én de potstanden die de
 * ankerberekening als vertrekpunt moet gebruiken. Beide komen uit dezelfde
 * voorwaartse simulatie — een tweede reconstructie zou uit de pas lopen zodra een
 * bufferpot een afgeleide opname deed (die staat immers niet in de store).
 */
export type AnchorState = {
  startBalance: number;
  potBalances: Map<string, number>;
};

export function computeAnchorState(
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
): AnchorState {
  const anchorPrevMonth = format(addMonths(parseISO(`${anchorMonth}-01`), -1), 'yyyy-MM');

  // Zonder simulatie is de historische opbouw het enige dat we hebben. Vóór de
  // referentiemaand is er ook niets gesimuleerd, dus is dit daar de juiste bron.
  const historicalPotBalances = (): Map<string, number> => {
    const map = new Map<string, number>();
    for (const r of reservations) {
      if (r.type !== 'spaardoel' || r.startMonth > anchorPrevMonth) continue;
      map.set(r.id, calcPotBalance(r, reservationPayments, reservationSettlements, anchorPrevMonth));
    }
    return map;
  };

  // Directe override voor anchorMonth heeft prioriteit voor het saldo — de potstanden
  // komen nog steeds uit de simulatie, want die staan los van het banksaldo.
  const anchorOverride = balanceOverrides.find((o) => o.monthKey === anchorMonth);

  if (anchorMonth <= referenceMonth) {
    return {
      startBalance: anchorOverride ? anchorOverride.balance : referenceBalance,
      potBalances: historicalPotBalances(),
    };
  }

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
  if (monthCount <= 0) {
    return {
      startBalance: anchorOverride ? anchorOverride.balance : effectiveBalance,
      potBalances: historicalPotBalances(),
    };
  }

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

  const anchorMonthData = months[monthCount];

  // `deferredFromPrevious` van de ankermaand in de simulatie IS de potstand aan het
  // begin van die maand — inclusief elke bufferopname onderweg. Potten die niet in de
  // simulatie voorkomen (bv. vertrokken via een uitstel) vallen terug op de historiek.
  const potBalances = historicalPotBalances();
  for (const p of anchorMonthData?.reservationPots ?? []) {
    if (p.potType === 'spaardoel') potBalances.set(p.reservationId, p.deferredFromPrevious);
  }

  if (anchorOverride) return { startBalance: anchorOverride.balance, potBalances };

  // months[monthCount].startBalance is het doorgerolde VRIJE saldo aan het begin
  // van anchorMonth (de opgebouwde spaarpotten zijn er in de voorgaande maand-0
  // al uitgehaald). De ankermaand-berekening (calculateMonths maand 0) verwacht
  // echter een BANKsaldo en trekt de opgebouwde spaarpot opnieuw af. Zonder
  // correctie wordt de volledige pot dus dubbel afgetrokken. We tellen daarom de
  // opgebouwde spaarpot t/m de maand vóór anchorMonth terug op — exact hetzelfde
  // bedrag als calculateMonths initialiseert in deferredRemainingMap.
  //
  // Potten die de ankermaand verlaten (uitstel) of er gefinaliseerd worden, slaat
  // maand-0 over; die tellen we dus ook niet terug. Beide groepen vallen vanzelf weg:
  // vertrokken potten staan niet in reservationPots, gefinaliseerde filteren we hier.
  const rolledFreeBalance = anchorMonthData?.startBalance ?? effectiveBalance;
  const reservedAtAnchorStart = (anchorMonthData?.reservationPots ?? [])
    .filter((p) => p.potType === 'spaardoel' && !p.finalized)
    .reduce((sum, p) => sum + p.deferredFromPrevious, 0);

  return { startBalance: rolledFreeBalance + reservedAtAnchorStart, potBalances };
}

/** Alleen het banksaldo aan het begin van de ankermaand. Zie `computeAnchorState`. */
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
  return computeAnchorState(
    referenceBalance, referenceMonth, anchorMonth, expenseItems, incomeItems,
    recurringItems, reservations, reservationPayments, recurringDefers,
    recurringSettlements, reservationDefers, reservationSettlements, balanceOverrides,
  ).startBalance;
}
