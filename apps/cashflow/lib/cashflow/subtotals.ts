import type {
  ExpenseItem,
  IncomeItem,
  MonthSubtotals,
  RecurringItem,
  RecurringSettlement,
  ReservationPotBalance,
} from './types';

/**
 * De kernformule van één maand, op één plek.
 *
 *   eindsaldo = beschikbaar − vast − eenmalig − budgetten − provisies
 *
 * Zowel de doorrol naar de volgende maand als de weergave op de maandkaart leest deze
 * uitkomst. Stond de formule op meerdere plaatsen, dan liepen het getoonde eindsaldo en
 * het doorgerolde beginsaldo uit elkaar zodra er in een toekomstige maand iets als
 * betaald gemarkeerd stond.
 */

function paidFromPot(pot: ReservationPotBalance): number {
  return pot.paymentsThisMonth.reduce((s, p) => s + p.fromReservation, 0);
}

function cashFromPot(pot: ReservationPotBalance): number {
  return pot.paymentsThisMonth.reduce((s, p) => s + p.fromCash, 0);
}

export interface MonthSubtotalInput {
  startBalance: number;
  totalIncome: number;
  /** Vaste kosten van deze maand zonder betaalde afrekening. */
  unpaidRecurring: number;
  /** Vaste kosten van deze maand mét betaalde afrekening (het werkelijke bedrag). */
  paidRecurring: number;
  unpaidExpenses: number;
  paidExpenses: number;
  /** Uitgestelde vaste kosten die deze maand toekomen, gesplitst op de betaalvlag. */
  unpaidDeferredRecurring: number;
  paidDeferredRecurring: number;
  reservationPots: ReservationPotBalance[];
  /**
   * Élke cash-bijbetaling van deze maand, ook bij een pot die deze maand niet aangerekend
   * wordt (vertrokken via een uitstel, of nog niet gestart). Zie de opmerking bij
   * `cashOverflow` hieronder — de ankermaand telt bewust alleen de getoonde potten.
   */
  totalCashPayments: number;
  /** Uitgestelde stortingen die deze maand toekomen. */
  deferredReservationAmount: number;
  /**
   * De ankermaand vertrekt van het échte banksaldo. Wat daar al betaald is, is er al af,
   * en de tot dan opgebouwde potten zitten er nog in — beide moeten dus anders behandeld
   * worden dan in een latere maand, die van een geprojecteerd vrij saldo vertrekt.
   */
  isFirstMonth: boolean;
}

export function computeMonthSubtotals(input: MonthSubtotalInput): MonthSubtotals {
  const { isFirstMonth, reservationPots } = input;

  // Ankermaand: het beginsaldo is het banksaldo van vandaag, dus een betaalde kost is er
  // al af en telt niet nog eens mee. Latere maanden: het beginsaldo is een projectie waar
  // nog niets van afgetrokken is — daar vertrekt élke kost, betaald gemarkeerd of niet.
  const recurring = isFirstMonth
    ? input.unpaidRecurring + input.unpaidDeferredRecurring
    : input.unpaidRecurring + input.paidRecurring +
      input.unpaidDeferredRecurring + input.paidDeferredRecurring;

  // Ankermaand: alleen de bijbetalingen bij een pot die deze maand aangerekend én niet
  // gefinaliseerd is. Latere maanden: élke bijbetaling van die maand. Dat verschil is
  // bestaand gedrag, hier bewust ongemoeid gelaten — een bijbetaling bij een
  // gefinaliseerde of uitgestelde pot telt in de ankermaand dus niet mee. Genoteerd als
  // openstaand punt voor fase 1; nu vastleggen zou een tweede gedragswijziging in een
  // refactor smokkelen.
  const cashOverflow = isFirstMonth
    ? reservationPots.filter((p) => !p.finalized).reduce((s, p) => s + cashFromPot(p), 0)
    : input.totalCashPayments;

  const oneOff =
    (isFirstMonth ? input.unpaidExpenses : input.unpaidExpenses + input.paidExpenses) + cashOverflow;

  const budgets = reservationPots
    .filter((p) => p.potType === 'maandelijks_budget' && (!isFirstMonth || !p.finalized))
    .reduce((s, p) => s + p.provisionThisMonth - paidFromPot(p), 0);

  // Ankermaand: de volledige resterende provisie moet uit het banksaldo, inclusief wat er
  // in eerdere maanden al opgebouwd werd (`deferredFromPrevious`). Latere maanden: die
  // opbouw is er in een eerdere maand al afgetrokken, dus telt enkel de nieuwe storting,
  // verminderd met wat een finalisatie deze maand vrijgeeft.
  const provisions =
    reservationPots
      .filter((p) => p.potType === 'spaardoel' && (!isFirstMonth || !p.finalized))
      .reduce(
        (s, p) =>
          s +
          (isFirstMonth
            ? p.deferredFromPrevious + p.provisionThisMonth - paidFromPot(p)
            : p.provisionThisMonth - p.releasedThisMonth),
        0,
      ) + input.deferredReservationAmount;

  const incoming = input.startBalance + input.totalIncome;
  const costs = recurring + oneOff + budgets + provisions;

  return { incoming, recurring, oneOff, budgets, provisions, costs, endBalance: incoming - costs };
}

/** Cash-bijbetalingen bovenop een pot, als losse regels voor de uitgavensectie. */
export function collectCashOverflowItems(
  reservationPots: ReservationPotBalance[],
  isFirstMonth: boolean,
): Array<{ label: string; amount: number }> {
  return reservationPots
    .filter((p) => !isFirstMonth || !p.finalized)
    .flatMap((p) =>
      p.paymentsThisMonth
        .filter((pay) => pay.fromCash > 0)
        .map((pay) => ({ label: pay.label, amount: pay.fromCash })),
    );
}

// ── Sectiekoppen ──────────────────────────────────────────────────────────────
//
// Wat een sectiebalk toont is bewust iets anders dan wat de sectie kost: de koppen
// vatten samen wat er nog openstaat, zodat ze aansluiten bij de zichtbare rijen (de
// Open/Alle-filter). Ze tellen daardoor niet op tot `costs` hierboven — gemeten op 300
// gegenereerde scenario's wijkt de som af in ~10% van de maanden, telkens door een
// gefinaliseerde pot in een toekomstige maand of door een toekomende uitgestelde
// storting. Fase 1 (running-subtotal-ledger) beslist welke van de twee de sectiekop
// wordt; tot dan blijft de weergave zoals ze was.

export function incomeSectionTotal(startBalance: number, items: IncomeItem[]): number {
  return startBalance + items.reduce((s, i) => s + i.amount, 0);
}

export function recurringSectionTotal(
  items: RecurringItem[],
  settlements: RecurringSettlement[],
  deferredItems: Array<{ amount: number; paid: boolean }>,
): number {
  const unpaid = items.filter(
    (item) => !settlements.find((s) => s.recurringId === item.id && s.paid),
  );
  return (
    unpaid.reduce((s, item) => s + (item.frequency === 'yearly' ? item.amount / 12 : item.amount), 0) +
    deferredItems.filter((d) => !d.paid).reduce((s, d) => s + d.amount, 0)
  );
}

export function expenseSectionTotal(
  items: ExpenseItem[],
  cashOverflowItems: Array<{ amount: number }>,
): number {
  return (
    items.filter((i) => !i.paid).reduce((s, i) => s + i.amount, 0) +
    cashOverflowItems.reduce((s, i) => s + i.amount, 0)
  );
}

/**
 * Kop van een pot-subgroep. `overrides` bevat bedragen die de gebruiker aan het typen is
 * maar nog niet opgeslagen heeft; in de ankermaand telt zo'n override niet mee, want daar
 * toont de kop de resterende provisie in plaats van de storting.
 */
export function potSectionTotal(
  activePots: ReservationPotBalance[],
  overrides: Record<string, number>,
  isCurrentMonth: boolean,
): number {
  return activePots.reduce((s, p) => {
    if (isCurrentMonth) {
      if (p.potType === 'maandelijks_budget') return s + p.provisionThisMonth - paidFromPot(p);
      if (p.potType === 'spaardoel') {
        return s + p.deferredFromPrevious + p.provisionThisMonth - paidFromPot(p);
      }
    }
    return s + (overrides[p.reservationId] ?? p.displayContribution);
  }, 0);
}
