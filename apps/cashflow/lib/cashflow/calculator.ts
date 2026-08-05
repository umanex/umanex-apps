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
  MonthSnapshot,
} from './types';
import { addMonths, format, parseISO, differenceInMonths } from 'date-fns';
import { collectCashOverflowItems, computeMonthSubtotals } from './subtotals';
import { latestSnapshotBefore } from './snapshot';

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

/**
 * Potstand uit de stamdata, zonder simulatie: opgebouwde stortingen min wat eruit betaald
 * is. Terugval voor alles wat buiten een doorgerekend venster valt.
 *
 * `defers` hoort erbij omdat een uitgestelde storting anders gewoon meegeteld wordt: de
 * reconstructie zou dan een maand opbouw tonen die de berekening nooit gedaan heeft, en
 * die twee lopen dan uiteen over het bedrag dat je uitstelde.
 */
export function calcPotBalance(
  reservation: ReservationItem,
  payments: ReservationPayment[],
  settlements: ReservationSettlement[],
  upToMonth: MonthKey,
  defers: ReservationDefer[] = [],
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

  const ownDefers = defers.filter((d) => d.reservationId === reservation.id);
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
    const amount = settlement ? settlement.effectiveAmount : reservation.monthlyAmount;
    // Uitgesteld vanuit deze maand: de storting gebeurt hier niet. Uitgesteld naar deze
    // maand: hij komt hier alsnog toe. Beide kanten tellen, zodat de reconstructie
    // hetzelfde zegt als de doorrekening.
    if (!ownDefers.some((d) => d.fromMonth === mk)) accumulated += amount;
    accumulated += ownDefers.filter((d) => d.toMonth === mk).length * amount;
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
  /**
   * Afgesloten maanden. Een maand met een snapshot wordt niet doorgerekend maar
   * overgenomen: historie mag niet verschuiven wanneer stamdata wijzigt.
   */
  snapshots?: Map<MonthKey, MonthSnapshot>,
): MonthData[] {
  const months = getMonthsInRange(anchorMonth, count);
  const result: MonthData[] = [];
  let runningBalance = startBalance;
  let monthIndex = 0;
  const potBalanceMap = new Map<string, number>();
  const deferredRemainingMap = new Map<string, number>();

  // Bufferpot: neemt het vrije saldo van elke maand op en vangt een tekort weer op.
  // Enkel een spaardoel kan buffer zijn — een maandelijks budget reset elke maand en
  // heeft dus geen saldo om in op te bouwen of uit te putten.
  const bufferId =
    reservations.find((r) => r.coversDeficit && r.type === 'spaardoel')?.id ?? null;

  // Uitstel en afrekening zijn beslissingen over een storting die je zelf kiest. De
  // bufferstorting is volledig afgeleid, dus zijn ze er betekenisloos geworden — en
  // gevaarlijk: een uitstel haalt de pot uit de maand en een finalisatie zet de sweep
  // stil, allebei zonder dat de gebruiker er nog een rij voor ziet om het terug te
  // draaien. Zulke resten uit het oude model negeren we, in plaats van ze te laten
  // doorwerken op een waarde die niemand meer kan bewerken.
  const activeReservationDefers =
    bufferId === null ? reservationDefers : reservationDefers.filter((d) => d.reservationId !== bufferId);
  const activeSettlements =
    bufferId === null
      ? reservationSettlements
      : reservationSettlements.filter((s) => s.reservationId !== bufferId);

  // Initialiseer spaardoel-potten met historisch saldo vóór het berekeningsvenster.
  // deferredRemainingMap = cumulatieve uitstaande provisies = potbalans voor spaardoelen.
  //
  // Levert de aanroeper een map aan, dan is die leidend — óók wanneer een pot er niet in
  // staat. Vullen we een ontbrekende sleutel stil aan met `calcPotBalance`, dan rekent de
  // maandberekening met een stand die de aanroeper nooit in zijn banksaldo verwerkt heeft,
  // en verdwijnt of verschijnt er geld naargelang welke bron je leest.
  const prevMonth = format(addMonths(parseISO(`${anchorMonth}-01`), -1), 'yyyy-MM');
  for (const res of reservations) {
    if (res.type === 'spaardoel' && res.startMonth <= prevMonth) {
      const historical = initialPotBalances
        ? (initialPotBalances.get(res.id) ?? 0)
        : calcPotBalance(res, reservationPayments, activeSettlements, prevMonth, activeReservationDefers);
      potBalanceMap.set(res.id, historical);
      deferredRemainingMap.set(res.id, historical);
    }
  }

  for (const monthKey of months) {
    // Afgesloten maand: overnemen zoals ze bevroren is, en de volgende maand daarop
    // laten voortbouwen. Geen herberekening — dat is precies wat een snapshot voorkomt.
    const snapshot = snapshots?.get(monthKey);
    if (snapshot) {
      result.push(snapshot.data);
      runningBalance = snapshot.data.endBalance;
      for (const pot of snapshot.data.reservationPots) {
        potBalanceMap.set(pot.reservationId, pot.potBalance);
        deferredRemainingMap.set(
          pot.reservationId,
          pot.potType === 'spaardoel' ? pot.potBalance : 0,
        );
      }
      monthIndex++;
      continue;
    }

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
      activeReservationDefers.filter((d) => d.fromMonth === monthKey).map((d) => d.reservationId),
    );
    const billableReservations = activeReservations.filter(
      (r) => !departingReservationDeferIds.has(r.id),
    );

    const arrivingReservationDefers = activeReservationDefers.filter((d) => d.toMonth === monthKey);
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
      const settlement = activeSettlements.find(
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

    /**
     * Is er deze maand cash bijbetaald bovenop deze pot? Dan is de pot volledig benut en
     * staat er niets meer in — zowel voor de getoonde stand als voor de doorrol en voor
     * de ruimte die de buffer kan uitlenen. Eén bron voor die drie, want liepen ze uit
     * elkaar, dan kon de pot ongemerkt negatief worden.
     */
    const hasCashOverflow = (resId: string): boolean =>
      monthReservationPayments.some((p) => p.reservationId === resId && p.fromCash > 0);
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
        const settlement = activeSettlements.find(
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
        if (hasCashOverflow(payment.reservationId)) {
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
        const settlement = activeSettlements.find(
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
        const settlement = activeSettlements.find(
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
          autoContribution: null,
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
        // Cash bijbetaald: de pot is volledig benut en staat hierboven al op 0. Diezelfde
        // regel moet ook de doorrol halen, anders zegt `potBalance` 0 terwijl de
        // doorgerolde stand nog een saldo draagt — en dat saldo is precies wat de buffer
        // als opnameruimte leest. De twee maps liepen daardoor uiteen en de pot kon
        // ongemerkt onder nul zakken.
        if (hasCashOverflow(res.id)) {
          nextDeferred.set(res.id, 0);
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
        if (hasCashOverflow(resId)) {
          nextDeferred.set(resId, 0);
          continue;
        }
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

    // --- BUFFER: het vrije saldo van de maand ---
    //
    // Het eindsaldo is lineair in de buffer-storting x: E(x) = E(0) − x. De buffer neemt
    // op wat er overblijft, dus is x = E(0) de storting die het eindsaldo exact op €0
    // zet — positief bij een overschot (opbouw), negatief bij een tekort (opname). Het
    // maandbedrag van de pot speelt geen rol: de waarde is volledig afgeleid. Een opname
    // kan nooit groter zijn dan wat er in de pot zit; het restant blijft als negatief
    // eindsaldo zichtbaar staan en rolt door naar de volgende maand.
    let evaluation = evaluateMonth(null);
    let bufferContribution: number | null = null;
    let bufferUncovered = 0;

    const bufferIsBillable = bufferId !== null && billableReservations.some((r) => r.id === bufferId);
    const bufferIsFinalized =
      bufferId !== null &&
      activeSettlements.some(
        (s) => s.reservationId === bufferId && s.monthKey === monthKey && s.finalized,
      );

    if (bufferId !== null && bufferIsBillable && !bufferIsFinalized) {
      // Wat de pot deze maand echt kan missen: het overgedragen saldo plus een
      // uitgestelde storting die nu toekomt, minus wat er deze maand al uit betaald is.
      // Nooit negatief — een overtrokken pot leent niets uit.
      const paidFromBuffer = monthReservationPayments
        .filter((p) => p.reservationId === bufferId)
        .reduce((s, p) => s + p.fromReservation, 0);
      const potAvailable = hasCashOverflow(bufferId)
        ? 0
        : Math.max(
            0,
            getDeferred(bufferId) + (arrivingCredit.get(bufferId) ?? 0) - paidFromBuffer,
          );
      const target = Math.max(evaluateMonth(0).endBalance, -potAvailable);
      const swept = evaluateMonth(target);
      bufferContribution = target;
      bufferUncovered = swept.endBalance < -EPSILON ? -swept.endBalance : 0;
      evaluation = swept;
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
      bufferContribution === null
        ? evaluation.reservationPots
        : evaluation.reservationPots.map((p) =>
            p.reservationId === bufferId
              ? { ...p, autoContribution: bufferContribution, deficitUncovered: bufferUncovered }
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
      reservationSettlements: activeSettlements.filter((s) => s.monthKey === monthKey),
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
  /** Waar de berekening mee vertrekt: een handmatige correctie wint van de afleiding. */
  startBalance: number;
  /**
   * Wat de app zelf zou uitrekenen, zonder de correctie van de gebruiker. Nodig om te
   * kunnen zien óf er gecorrigeerd is: zonder dit tweede getal vergelijkt het scherm de
   * correctie met zichzelf, en dan leest elke bevestiging als "gelijk aan berekend" —
   * waarna de correctie stilletjes verdwijnt.
   */
  computedStartBalance: number;
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
  snapshots: MonthSnapshot[] = [],
): AnchorState {
  const anchorPrevMonth = format(addMonths(parseISO(`${anchorMonth}-01`), -1), 'yyyy-MM');

  /**
   * Potstanden aan het begin van de ankermaand, uit een doorgerekend venster.
   *
   * `deferredFromPrevious` van de ankermaand is de exacte beginstand, inclusief elke
   * afgeleide bufferopname onderweg. Maar een pot die de ankermaand overslaat — vertrokken
   * via een uitstel — staat daar niet in, en dan is de eindstand van de maand ervóór de
   * juiste bron. Vandaar twee lagen: eerst wat de vorige maand overhoudt, daarna wat de
   * ankermaand zelf meldt. Eén laag volstond niet, en dat is precies waar een uitgestelde
   * pot zijn opbouw kwijtraakte.
   */
  const potBalancesFromWindow = (
    beforeAnchor: MonthData | undefined,
    atAnchor: MonthData | undefined,
    base: Map<string, number>,
  ): Map<string, number> => {
    const map = new Map(base);
    for (const p of beforeAnchor?.reservationPots ?? []) {
      if (p.potType === 'spaardoel') map.set(p.reservationId, p.potBalance);
    }
    for (const p of atAnchor?.reservationPots ?? []) {
      if (p.potType === 'spaardoel') map.set(p.reservationId, p.deferredFromPrevious);
    }
    return map;
  };

  // Zonder simulatie is de historische opbouw het enige dat we hebben. Vóór de
  // referentiemaand is er ook niets gesimuleerd, dus is dit daar de juiste bron. Ook de
  // basis van de snapshot-takken: een pot die de afgesloten maand oversloeg staat niet in
  // dat snapshot, en zonder deze bodem zou hij helemaal uit de map vallen.
  const historicalPotBalances = (): Map<string, number> => {
    const map = new Map<string, number>();
    for (const r of reservations) {
      if (r.type !== 'spaardoel' || r.startMonth > anchorPrevMonth) continue;
      map.set(r.id, calcPotBalance(r, reservationPayments, reservationSettlements, anchorPrevMonth, reservationDefers));
    }
    return map;
  };

  // Een pot die de ankermaand via een uitstel verlaat, wordt die maand nergens
  // aangerekend. Zijn saldo hoort dus ook niet in het banksaldo dat maand 0 als
  // vertrekpunt krijgt — anders lijkt dat geld vrij besteedbaar. De potstanden die we
  // teruggeven bevatten hem wél: hij houdt zijn opbouw voor de maanden erna.
  const bufferPotId = reservations.find((r) => r.coversDeficit && r.type === 'spaardoel')?.id ?? null;
  const departingAtAnchor = new Set(
    reservationDefers
      .filter((d) => d.fromMonth === anchorMonth && d.reservationId !== bufferPotId)
      .map((d) => d.reservationId),
  );

  /**
   * Het banksaldo is het vrije saldo plus wat er in de spaardoelen zit — dat staat samen
   * op de rekening. Bewust afgeleid uit dezelfde map als degene die we teruggeven: kwamen
   * de twee uit verschillende bronnen, dan verdween er geld zodra één pot in de ene bron
   * wél en in de andere niet voorkwam.
   */
  const bankFromFree = (freeBalance: number, pots: Map<string, number>): number =>
    freeBalance +
    [...pots.entries()]
      .filter(([id]) => !departingAtAnchor.has(id))
      .reduce((sum, [, v]) => sum + v, 0);

  /** Meest recente saldocorrectie in een venster, of `undefined`. */
  const latestOverrideIn = (after: MonthKey | null, before: MonthKey) =>
    balanceOverrides
      .filter((o) => o.monthKey < before && (after === null || o.monthKey > after))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];

  // Is er een afgesloten maand vóór het venster, dan is die het vertrekpunt: alles
  // daarvóór is al vastgelegd en hoeft niet opnieuw doorgerekend te worden.
  const lastClosed = latestSnapshotBefore(snapshots, anchorMonth);

  if (lastClosed) {
    const closedPots = historicalPotBalances();
    for (const pot of lastClosed.data.reservationPots) {
      if (pot.potType === 'spaardoel') closedPots.set(pot.reservationId, pot.potBalance);
    }
    const override = balanceOverrides.find((o) => o.monthKey === anchorMonth);
    // Vanaf de maand ná de afsluiting tot de ankermaand kan er nog niet-afgesloten
    // ruimte zitten; die rekenen we vooruit door met dezelfde motor.
    const gap = differenceInMonths(parseISO(`${anchorMonth}-01`), parseISO(`${lastClosed.monthKey}-01`));
    const snapshotsByMonth = new Map(snapshots.map((s) => [s.monthKey, s]));

    const bridgeFrom = (from: MonthKey, balance: number, pots: Map<string, number>, count: number) =>
      calculateMonths(
        from, balance, expenseItems, incomeItems, recurringItems, reservations,
        reservationPayments, recurringDefers, recurringSettlements, reservationDefers,
        reservationSettlements, count, pots, snapshotsByMonth,
      );

    // Heb je ná de afsluiting zelf een banksaldo gecorrigeerd, dan is dat een waarneming
    // van de echte rekening en dus jonger nieuws dan de afsluiting. De correctie vervangt
    // dan het saldo, maar níét de bevroren potstanden: die zijn historie en blijven staan.
    // Vandaar twee etappes — eerst tot aan de correctie voor de potten, dan verder met het
    // gecorrigeerde saldo.
    const pivot = latestOverrideIn(lastClosed.monthKey, anchorMonth);
    if (pivot && !override) {
      const toPivot = differenceInMonths(parseISO(`${pivot.monthKey}-01`), parseISO(`${lastClosed.monthKey}-01`));
      const legOne = bridgeFrom(lastClosed.monthKey, lastClosed.data.startBalance, closedPots, toPivot + 1);
      const pivotPots = potBalancesFromWindow(legOne[toPivot - 1], legOne[toPivot], closedPots);

      const pivotToAnchor = differenceInMonths(parseISO(`${anchorMonth}-01`), parseISO(`${pivot.monthKey}-01`));
      const legTwo = bridgeFrom(pivot.monthKey, pivot.balance, pivotPots, pivotToAnchor + 1);
      const anchorData = legTwo[pivotToAnchor];
      const pots = potBalancesFromWindow(legTwo[pivotToAnchor - 1], anchorData, pivotPots);
      const computed = anchorData ? bankFromFree(anchorData.startBalance, pots) : pivot.balance;
      return { startBalance: computed, computedStartBalance: computed, potBalances: pots };
    }

    if (gap <= 1) {
      // `endBalance` van een snapshot is het VRIJE saldo; maand 0 verwacht een BANKsaldo.
      const computed = bankFromFree(lastClosed.data.endBalance, closedPots);
      return {
        startBalance: override ? override.balance : computed,
        computedStartBalance: computed,
        potBalances: closedPots,
      };
    }
    const bridged = bridgeFrom(lastClosed.monthKey, lastClosed.data.startBalance, closedPots, gap + 1);
    const anchorData = bridged[gap];
    if (!anchorData) {
      const computed = bankFromFree(lastClosed.data.endBalance, closedPots);
      return {
        startBalance: override ? override.balance : computed,
        computedStartBalance: computed,
        potBalances: closedPots,
      };
    }
    const bridgedPots = potBalancesFromWindow(bridged[gap - 1], anchorData, closedPots);
    const computed = bankFromFree(anchorData.startBalance, bridgedPots);
    return {
      startBalance: override ? override.balance : computed,
      computedStartBalance: computed,
      potBalances: bridgedPots,
    };
  }

  // Directe override voor anchorMonth heeft prioriteit voor het saldo — de potstanden
  // komen nog steeds uit de simulatie, want die staan los van het banksaldo.
  const anchorOverride = balanceOverrides.find((o) => o.monthKey === anchorMonth);

  if (anchorMonth <= referenceMonth) {
    return {
      startBalance: anchorOverride ? anchorOverride.balance : referenceBalance,
      computedStartBalance: referenceBalance,
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
      computedStartBalance: effectiveBalance,
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

  // Potten die de simulatie niet kent, vallen terug op de historische opbouw.
  const potBalances = potBalancesFromWindow(
    months[monthCount - 1],
    anchorMonthData,
    historicalPotBalances(),
  );

  const computed = bankFromFree(anchorMonthData?.startBalance ?? effectiveBalance, potBalances);
  if (anchorOverride) {
    return { startBalance: anchorOverride.balance, computedStartBalance: computed, potBalances };
  }

  // months[monthCount].startBalance is het doorgerolde VRIJE saldo aan het begin van
  // anchorMonth: de opgebouwde spaarpotten zijn er in de voorgaande maanden al uitgehaald.
  // De ankermaand-berekening (calculateMonths maand 0) verwacht echter een BANKsaldo en
  // trekt die opbouw opnieuw af, dus tellen we hem hier terug op — élke pot, ook een
  // gefinaliseerde. Die staat aan het begin van de maand nog gewoon op de rekening; dat
  // maand 0 hem daarna niet meer als gereserveerd rekent, is precies wat een finalisatie
  // betekent en niet een reden om het geld nergens meer te tellen.
  return { startBalance: computed, computedStartBalance: computed, potBalances };
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
