import type { MonthData, ReservationPotBalance } from './types';

/**
 * Netto tekort van één maand: wat eruit ging min wat erin kwam.
 *
 * Bewust niet afgeleid uit `subtotals`. Die koppen antwoorden in de ankermaand op een
 * andere vraag — "wat moet er nog van je huidige banksaldo af" — en dragen daar de
 * volledige opgebouwde stand van elke provisiepot in plaats van de storting van die ene
 * maand. Elke afgesloten maand is per constructie zo'n ankermaand (`useAutoCloseMonth`
 * rekent één maand vanaf zijn eigen ankerstaat door), dus zou de runway systematisch een
 * tekort melden ter grootte van je opgebouwde provisies.
 *
 * Hier meten we daarom stromen: wat er deze maand aan kosten vertrekt, tegenover wat er
 * binnenkwam. De buffer blijft erbuiten — hij neemt per constructie op wat er overblijft
 * en vult aan wat er tekort is, dus zou elke maand op nul uitkomen als hij meetelde.
 * Precies die beweging is wat de runway moet verklaren.
 */
export function netBurn(data: MonthData): number {
  // Een budget telt volledig mee, ook onbesteed: het prudente model gaat ervan uit dat
  // het opgaat. Een provisie telt met de storting van deze maand, verminderd met wat een
  // finalisatie weer vrijgeeft.
  // Wat een pot niet kan dragen, komt van de rekening: een betaling boven het potsaldo is
  // een echte uitstroom en hoort dus in de burn. `subtotals.ts` boekt hem als `teveel`;
  // zonder deze term meldt een maand met zo'n betaling een te gunstige stroom, en dan
  // sluit de bufferstand van de vorige maand plus die stroom niet meer op de nieuwe stand.
  const teveel = (p: ReservationPotBalance): number =>
    Math.max(
      0,
      p.paymentsThisMonth.reduce((s, pay) => s + pay.fromReservation, 0) -
        (p.deferredFromPrevious + p.provisionThisMonth),
    );

  // De bufferpot doet niet mee met `potFlow`: zijn storting is per constructie het restant van
  // de maand, dus die meetellen zou elke maand op nul uitkomen. Een opname is iets anders. Dat
  // geld is nooit als kost geboekt — de storting bleef immers buiten de burn — dus het vertrekt
  // pas op het moment dat het betaald wordt, en dan is het een echte uitstroom.
  //
  // Niet alleen het `teveel`: gemeten op 2026-09-14 is het gat precies de volle opname. Een
  // betaling van €500 uit een pot van €12.000 gaf een beweging van −1.000 tegenover een
  // positieverschil van −1.500; een betaling van €20.000 uit diezelfde pot gaf −1.000 tegenover
  // −21.000. Het `teveel` verklaart in dat tweede geval maar €8.000 van de €20.000.
  const bufferFlow = (p: ReservationPotBalance): number =>
    p.paymentsThisMonth.reduce((s, pay) => s + pay.fromReservation, 0);

  const potFlow = (p: ReservationPotBalance): number =>
    p.potType === 'maandelijks_budget'
      ? p.provisionThisMonth
      : p.provisionThisMonth - p.releasedThisMonth + teveel(p);

  const costs =
    data.totalRecurring +
    data.totalExpenses +
    data.totalReservationCashPayments +
    data.reservationPots.reduce((s, p) => s + (p.isDeficitBuffer ? bufferFlow(p) : potFlow(p)), 0) +
    data.deferredReservationAmount;

  return costs - data.totalIncome;
}
