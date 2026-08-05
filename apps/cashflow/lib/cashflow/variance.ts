import type { MonthData } from './types';

/**
 * Begroot naast werkelijk voor één maand.
 *
 * Alleen waar het model écht twee bedragen kent: een vaste uitgave heeft een begroot
 * bedrag en een afgerekend bedrag, en een pot heeft een maandbedrag naast wat er die
 * maand daadwerkelijk in of uit ging. Voor inkomsten en eenmalige uitgaven is er één
 * bedrag — daar zegt de betaald/ontvangen-vlag of het gebeurd is, niet een tweede getal.
 */
export interface CategoryVariance {
  label: string;
  budgeted: number;
  actual: number;
  /** `actual − budgeted`. Positief betekent duurder uitgevallen dan begroot. */
  difference: number;
}

const EPSILON = 0.005;

function budgetedRecurring(item: { amount: number; frequency: 'monthly' | 'yearly' }): number {
  return item.frequency === 'yearly' ? item.amount / 12 : item.amount;
}

export function monthVariance(data: MonthData): CategoryVariance[] {
  const rows: CategoryVariance[] = [];

  // Vaste uitgaven: begroot bedrag tegenover het afgerekende bedrag. Een uitgestelde
  // kost die deze maand toekwam telt mee, want die hoorde bij deze maand.
  const recurringBudgeted =
    data.recurringItems.reduce((s, i) => s + budgetedRecurring(i), 0) +
    data.deferredItems.reduce((s, d) => s + d.amount, 0);

  const recurringActual =
    data.recurringItems.reduce((s, item) => {
      const settlement = data.recurringSettlements.find((st) => st.recurringId === item.id);
      return s + (settlement?.paid ? settlement.actualAmount : budgetedRecurring(item));
    }, 0) +
    data.deferredItems.reduce((s, d) => s + (d.paid ? d.paidAmount : d.amount), 0);

  rows.push({
    label: 'Vaste uitgaven',
    budgeted: recurringBudgeted,
    actual: recurringActual,
    difference: recurringActual - recurringBudgeted,
  });

  // Potten: het maandbedrag tegenover wat er die maand echt in ging. De bufferpot valt
  // hier bewust buiten: zijn storting is volledig afgeleid uit wat er overblijft, dus
  // heeft hij geen begroot bedrag om tegen af te zetten — het verschil zou enkel ruis zijn.
  for (const [type, label] of [
    ['maandelijks_budget', 'Maandelijkse budgetten'],
    ['spaardoel', 'Provisies'],
  ] as const) {
    const pots = data.reservationPots.filter((p) => p.potType === type && !p.isDeficitBuffer);
    if (pots.length === 0) continue;
    const budgeted = pots.reduce((s, p) => s + p.monthlyAmount, 0);
    const actual = pots.reduce((s, p) => s + p.provisionThisMonth, 0);
    rows.push({ label, budgeted, actual, difference: actual - budgeted });
  }

  return rows.filter((r) => Math.abs(r.difference) > EPSILON);
}
