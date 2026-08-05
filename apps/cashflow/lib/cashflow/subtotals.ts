import type { MonthSubtotals, ReservationPotBalance } from './types';

/**
 * De kernformule van één maand, op één plek.
 *
 *   eindsaldo = beschikbaar − vast − eenmalig − budgetten − provisies − buffer
 *
 * De buffer is de laatste kop: hij neemt op wat er na alle andere kosten overblijft,
 * waardoor het eindsaldo met een actieve bufferpot per constructie op €0 landt (of
 * negatief blijft zodra de pot het tekort niet meer dekt).
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

  // Ankermaand: een geregistreerde bijbetaling is al van het echte banksaldo af, net als
  // een betaalde vaste kost of uitgave. Ze telt hier dus niet nog eens mee. Deed ze dat
  // wel, dan sprak de ankermaand zichzelf tegen: de pot-poot van diezelfde betaling wordt
  // hieronder wél als "al gebeurd" behandeld (de provisiekost gaat er met `paidFromPot`
  // vanaf), waardoor het cash-deel er twee keer af ging. Latere maanden vertrekken van een
  // projectie waar nog niets van betaald is — daar telt élke bijbetaling.
  const cashOverflow = isFirstMonth ? 0 : input.totalCashPayments;

  const oneOff =
    (isFirstMonth ? input.unpaidExpenses : input.unpaidExpenses + input.paidExpenses) + cashOverflow;

  // Een budget is een inschatting van wat die maand vertrekt, geen opzijgezet geld: wat
  // je niet opmaakt blijft gewoon op je rekening staan (in tegenstelling tot een provisie,
  // die doorrolt). In de ankermaand is een betaling uit het budget al van je banksaldo af,
  // dus resteert enkel het onbestede deel. In een latere maand is er nog niets vertrokken
  // en blijft de volledige inschatting staan — een geboekte betaling zit daar al in.
  const budgets = reservationPots
    .filter((p) => p.potType === 'maandelijks_budget' && (!isFirstMonth || !p.finalized))
    .reduce((s, p) => s + p.provisionThisMonth - (isFirstMonth ? paidFromPot(p) : 0), 0);

  // Ankermaand: de volledige resterende provisie moet uit het banksaldo, inclusief wat er
  // in eerdere maanden al opgebouwd werd (`deferredFromPrevious`). Latere maanden: die
  // opbouw is er in een eerdere maand al afgetrokken, dus telt enkel de nieuwe storting,
  // verminderd met wat een finalisatie deze maand vrijgeeft.
  //
  // Beide takken kennen een ondergrens. Zonder die grens levert een betaling die groter is
  // dan de pot in de ankermaand een negatieve kost op — geld dat niet bestaat — en gaat
  // hetzelfde teveel in een latere maand juist nooit van het saldo af. Wat een pot niet
  // kan dragen, komt van de rekening, en dat is precies de tweede term hieronder.
  const spaardoelCost = (p: ReservationPotBalance): number => {
    const beschikbaar = p.deferredFromPrevious + p.provisionThisMonth;
    const teveel = Math.max(0, paidFromPot(p) - beschikbaar);
    return isFirstMonth
      ? Math.max(0, beschikbaar - paidFromPot(p))
      : p.provisionThisMonth - p.releasedThisMonth + teveel;
  };

  const spaardoelen = reservationPots.filter(
    (p) => p.potType === 'spaardoel' && (!isFirstMonth || !p.finalized),
  );

  // De bufferpot is dezelfde soort kost, maar krijgt een eigen kop: hij staat niet als
  // ledgerregel in de Provisies-sectie maar in de footer. `deferredReservationAmount`
  // blijft bij de provisies — een uitgestelde storting is enkel nog historisch mogelijk,
  // want de bufferrij is niet meer versleepbaar.
  const provisions =
    spaardoelen.filter((p) => !p.isDeficitBuffer).reduce((s, p) => s + spaardoelCost(p), 0) +
    input.deferredReservationAmount;

  const buffer = spaardoelen
    .filter((p) => p.isDeficitBuffer)
    .reduce((s, p) => s + spaardoelCost(p), 0);

  const incoming = input.startBalance + input.totalIncome;
  const costs = recurring + oneOff + budgets + provisions + buffer;

  return {
    incoming,
    recurring,
    oneOff,
    budgets,
    provisions,
    buffer,
    costs,
    endBalance: incoming - costs,
  };
}

/** Cash-bijbetalingen bovenop een pot, als losse regels voor de uitgavensectie. */
export function collectCashOverflowItems(
  reservationPots: ReservationPotBalance[],
  isFirstMonth: boolean,
): Array<{ label: string; amount: number }> {
  // In de ankermaand is de bijbetaling al van het banksaldo af en telt ze niet meer als
  // kost. Ze hier dan tóch als regel tonen zou de sectie laten optellen tot een ander
  // bedrag dan de kop — de betaling blijft zichtbaar op de potrij zelf.
  if (isFirstMonth) return [];
  return reservationPots
    .flatMap((p) =>
      p.paymentsThisMonth
        .filter((pay) => pay.fromCash > 0)
        .map((pay) => ({ label: pay.label, amount: pay.fromCash })),
    );
}

// ── Sectiekoppen ──────────────────────────────────────────────────────────────
//
// De ledger-regels tonen de kostensubtotalen hierboven, dus tellen de zichtbare regels
// per constructie op tot het eindsaldo. Vóór fase 1 rekende elke sectie zijn eigen kop
// uit op basis van wat er nog openstond; die liepen in ~10% van de maanden niet op tot
// het totaal (gefinaliseerde pot in een toekomstige maand, of een toekomende uitgestelde
// storting). Die tweede reeks formules is daarmee verdwenen.

/**
 * Verschil tussen het bedrag dat op dit moment in een veld getypt wordt en de opgeslagen
 * storting. Alleen daarmee beweegt de kop van een pot-subgroep mee vóór het opslaan. In
 * de ankermaand telt een override niet mee: daar toont de kop de resterende provisie,
 * niet de storting.
 */
export function pendingOverrideDelta(
  activePots: ReservationPotBalance[],
  overrides: Record<string, number>,
  isCurrentMonth: boolean,
): number {
  if (isCurrentMonth) return 0;
  return activePots.reduce((s, p) => {
    const override = overrides[p.reservationId];
    return override === undefined ? s : s + (override - p.displayContribution);
  }, 0);
}
