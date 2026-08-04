import { calculateMonths, computeAnchorState } from '../lib/cashflow/calculator';
import type { AnchorState } from '../lib/cashflow/calculator';
import type {
  ExpenseItem,
  IncomeItem,
  MonthData,
  RecurringItem,
  RecurringSettlement,
  ReservationItem,
  ReservationPayment,
  ReservationPotBalance,
  ReservationSettlement,
} from '../lib/cashflow/types';

let failures = 0;
let checks = 0;

function near(a: number, b: number, tol = 0.005): boolean {
  return Math.abs(a - b) < tol;
}

function check(name: string, actual: number, expected: number) {
  checks++;
  if (!near(actual, expected)) {
    failures++;
    console.log(`  FAIL  ${name}: verwacht ${expected.toFixed(2)}, kreeg ${actual.toFixed(2)}`);
  } else {
    console.log(`  ok    ${name} = ${actual.toFixed(2)}`);
  }
}

function checkBool(name: string, actual: boolean, expected: boolean) {
  checks++;
  if (actual !== expected) {
    failures++;
    console.log(`  FAIL  ${name}: verwacht ${expected}, kreeg ${actual}`);
  } else {
    console.log(`  ok    ${name} = ${actual}`);
  }
}

/**
 * Onafhankelijke herberekening van het eindsaldo uit de rauwe maanddata — de toetssteen
 * voor `lib/cashflow/subtotals.ts`. Leest bewust niet `m.subtotals`, anders zou de check
 * de implementatie tegen zichzelf houden.
 *
 * Ankermaand: het beginsaldo is het echte banksaldo, dus een betaalde kost is er al af en
 * de tot dan opgebouwde potten zitten er nog in. Latere maanden: het beginsaldo is een
 * projectie, dus vertrekt élke kost — betaald gemarkeerd of niet — en is de opbouw in een
 * eerdere maand al afgetrokken.
 */
function recomputeEindsaldo(m: MonthData, isFirst: boolean): number {
  const paidFromPot = (p: ReservationPotBalance) =>
    p.paymentsThisMonth.reduce((s, pay) => s + pay.fromReservation, 0);

  const recurring =
    m.recurringItems.reduce((s, item) => {
      const settlement = m.recurringSettlements.find((st) => st.recurringId === item.id);
      if (settlement?.paid) return isFirst ? s : s + settlement.actualAmount;
      return s + (item.frequency === 'yearly' ? item.amount / 12 : item.amount);
    }, 0) +
    m.deferredItems.reduce((s, d) => {
      if (d.paid) return isFirst ? s : s + d.paidAmount;
      return s + d.amount;
    }, 0);

  const expenses = m.expenseItems.reduce((s, i) => (i.paid && isFirst ? s : s + i.amount), 0);

  const cash = isFirst
    ? m.reservationPots
        .filter((p) => !p.finalized)
        .reduce((s, p) => s + p.paymentsThisMonth.reduce((ps, pay) => ps + pay.fromCash, 0), 0)
    : m.reservationPayments.reduce((s, pay) => s + pay.fromCash, 0);

  // Een budget is een inschatting: in de ankermaand resteert wat je nog niet opmaakte,
  // in een latere maand staat de volledige inschatting nog te vertrekken.
  const budgets = m.reservationPots
    .filter((p) => p.potType === 'maandelijks_budget' && (!isFirst || !p.finalized))
    .reduce((s, p) => s + p.provisionThisMonth - (isFirst ? paidFromPot(p) : 0), 0);

  const provisions =
    m.reservationPots
      .filter((p) => p.potType === 'spaardoel' && (!isFirst || !p.finalized))
      .reduce(
        (s, p) =>
          s +
          (isFirst
            ? p.deferredFromPrevious + p.provisionThisMonth - paidFromPot(p)
            : p.provisionThisMonth - p.releasedThisMonth),
        0,
      ) + m.deferredReservationItems.reduce((s, d) => s + d.amount, 0);

  return (m.startBalance + m.totalIncome) - (recurring + expenses + cash + budgets + provisions);
}

type Scenario = {
  anchor: string;
  startBalance: number;
  income: Array<[string, number]>;
  recurring: Array<[string, number]>;
  expenses?: Array<[string, number, boolean]>;
  reservations: ReservationItem[];
  count?: number;
};

function run(s: Scenario): MonthData[] {
  const incomeItems: IncomeItem[] = s.income.map(([monthKey, amount], i) => ({
    id: `inc-${i}`, monthKey, label: `inkomen ${i}`, amount, received: false,
  }));
  const recurringItems: RecurringItem[] = s.recurring.map(([startMonth, amount], i) => ({
    id: `rec-${i}`, label: `vaste kost ${i}`, amount, type: 'expense', frequency: 'monthly', startMonth,
  }));
  const expenseItems: ExpenseItem[] = (s.expenses ?? []).map(([monthKey, amount, paid], i) => ({
    id: `exp-${i}`, monthKey, label: `uitgave ${i}`, amount, paid,
  }));
  return calculateMonths(
    s.anchor, s.startBalance, expenseItems, incomeItems, recurringItems,
    s.reservations, [], [], [], [], [], s.count ?? 3,
  );
}

function bufferPot(m: MonthData) {
  return m.reservationPots.find((p) => p.isDeficitBuffer);
}

function invariant(months: MonthData[], label: string) {
  months.forEach((m, i) => {
    check(`${label} · eindsaldo-invariant ${m.monthKey}`, recomputeEindsaldo(m, i === 0), m.endBalance);
    // De kaart toont `subtotals`; die moet hetzelfde getal geven als de doorrol.
    check(`${label} · kaart == doorrol ${m.monthKey}`, m.subtotals.endBalance, m.endBalance);
  });
  // Doorrol: eindsaldo maand N == startsaldo maand N+1
  for (let i = 0; i < months.length - 1; i++) {
    check(`${label} · doorrol ${months[i]!.monthKey}→${months[i + 1]!.monthKey}`,
      months[i + 1]!.startBalance, months[i]!.endBalance);
  }
}

const BUFFER: ReservationItem = {
  id: 'buffer', label: 'Buffer', monthlyAmount: 200, startMonth: '2025-01', type: 'spaardoel', coversDeficit: true,
};
const BUFFER_OFF: ReservationItem = { ...BUFFER, coversDeficit: false };

// ── S1: geen buffer gemarkeerd → gedrag ongewijzigd ─────────────────────────────
console.log('\nS1 — geen buffer gemarkeerd (regressie-baseline)');
{
  const cfg: Scenario = {
    anchor: '2026-03', startBalance: 3000,
    income: [['2026-03', 2000], ['2026-04', 2000], ['2026-05', 2000]],
    recurring: [['2025-01', 2400]],
    reservations: [BUFFER_OFF],
  };
  const off = run(cfg);
  checkBool('S1 · geen pot gemarkeerd als buffer', off.every((m) => !bufferPot(m)), true);
  checkBool('S1 · geen coverage', off.every((m) => m.reservationPots.every((p) => p.deficitCoverage === null)), true);
  invariant(off, 'S1');
}

// ── S2: tekort met ruime pot → eindsaldo exact 0 ────────────────────────────────
// Historische pot t/m 2026-02: startMonth 2025-01 → 14 maanden × 200 = 2800.
console.log('\nS2 — tekort, pot ruim voldoende');
{
  const months = run({
    anchor: '2026-03', startBalance: 3000,
    income: [['2026-03', 1000]],
    recurring: [['2025-01', 1500]],
    reservations: [BUFFER],
    count: 1,
  });
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  // E(0) maand 0 = 3000 + 1000 − 1500 − (2800 + 0) = −300 → coverage −300
  check('S2 · coverage', p.deficitCoverage!, -300);
  check('S2 · eindsaldo', m0.endBalance, 0);
  check('S2 · uncovered', p.deficitUncovered, 0);
  invariant(months, 'S2');
}

// ── S3: tekort groter dan pot → begrensd, rest blijft rood ──────────────────────
console.log('\nS3 — tekort groter dan potsaldo');
{
  const smallBuffer: ReservationItem = { ...BUFFER, monthlyAmount: 50, startMonth: '2026-01' };
  // Historisch t/m 2026-02: 2 maanden × 50 = 100
  const months = run({
    anchor: '2026-03', startBalance: 1000,
    income: [['2026-03', 1000]],
    recurring: [['2025-01', 2500]],
    reservations: [smallBuffer],
    count: 1,
  });
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  // E(0) = 1000 + 1000 − 2500 − 100 = −600, cap = −100 → coverage −100, eind = −500
  check('S3 · coverage begrensd tot potsaldo', p.deficitCoverage!, -100);
  check('S3 · eindsaldo blijft negatief', m0.endBalance, -500);
  check('S3 · uncovered', p.deficitUncovered, 500);
  check('S3 · potsaldo landt op 0', p.provisionThisMonth + p.deferredFromPrevious, 0);
  invariant(months, 'S3');
}

// ── S4: geen tekort → normale storting, geen coverage ───────────────────────────
console.log('\nS4 — geen tekort');
{
  const months = run({
    anchor: '2026-03', startBalance: 10000,
    income: [['2026-03', 3000]],
    recurring: [['2025-01', 1000]],
    reservations: [BUFFER],
    count: 1,
  });
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  checkBool('S4 · geen coverage', p.deficitCoverage === null, true);
  check('S4 · normale storting', p.provisionThisMonth, 200);
  // 10000 + 3000 − 1000 − (2800 + 200) = 9000
  check('S4 · eindsaldo', m0.endBalance, 9000);
  invariant(months, 'S4');
}

// ── S5: meerdere maanden — pot depleteert, blijft nooit negatief ────────────────
console.log('\nS5 — meerdere tekortmaanden op rij');
{
  const months = run({
    anchor: '2026-03', startBalance: 3000,
    income: [['2026-03', 1000], ['2026-04', 1000], ['2026-05', 1000], ['2026-06', 1000]],
    recurring: [['2025-01', 1800]],
    reservations: [BUFFER],
    count: 4,
  });
  months.forEach((m, i) => {
    const p = bufferPot(m)!;
    const potNa = p.deferredFromPrevious + p.provisionThisMonth;
    console.log(
      `  maand ${m.monthKey}: start ${m.startBalance.toFixed(2)} · coverage ${p.deficitCoverage === null ? '—' : p.deficitCoverage.toFixed(2)}` +
      ` · pot voor ${p.deferredFromPrevious.toFixed(2)} → na ${potNa.toFixed(2)} · eind ${m.endBalance.toFixed(2)}`,
    );
    checks++;
    if (potNa < -0.005) { failures++; console.log(`  FAIL  potsaldo negatief in ${m.monthKey}`); }
    else console.log(`  ok    potsaldo niet-negatief in ${m.monthKey}`);
    void i;
  });
  invariant(months, 'S5');
}

// ── S6: maand 0 en latere maand geven hetzelfde bij identieke situatie ──────────
console.log('\nS6 — maand 0 vs latere maand, identieke situatie');
{
  // Pot start pas in de ankermaand, dus geen historische pot; maand 0 en maand 1
  // hebben dan dezelfde structuur op de doorgerolde balans na.
  const fresh: ReservationItem = { ...BUFFER, startMonth: '2026-03' };
  const months = run({
    anchor: '2026-03', startBalance: 1000,
    income: [['2026-03', 1000], ['2026-04', 1000]],
    recurring: [['2025-01', 1500]],
    reservations: [fresh],
    count: 2,
  });
  const [m0, m1] = months as [MonthData, MonthData];
  // m0: E(0) = 1000 + 1000 − 1500 − 0 = 500 ≥ 0 en E(p) = 500 − 200 = 300 > 0 → normale storting
  check('S6 · m0 eindsaldo', m0.endBalance, 300);
  checkBool('S6 · m0 geen coverage', bufferPot(m0)!.deficitCoverage === null, true);
  // m1: start 300, E(0) = 300 + 1000 − 1500 = −200 → coverage −200 (pot heeft 200) → eind 0
  check('S6 · m1 coverage', bufferPot(m1)!.deficitCoverage!, -200);
  check('S6 · m1 eindsaldo', m1.endBalance, 0);
  invariant(months, 'S6');
}

// ── S7: verlaagde storting i.p.v. opname (E(0) ≥ 0, E(p) < 0) ──────────────────
console.log('\nS7 — verlaagde storting in plaats van opname');
{
  const fresh: ReservationItem = { ...BUFFER, startMonth: '2026-03', monthlyAmount: 200 };
  const months = run({
    anchor: '2026-03', startBalance: 1000,
    income: [['2026-03', 1000]],
    recurring: [['2025-01', 1950]],
    reservations: [fresh],
    count: 1,
  });
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  // E(0) = 1000 + 1000 − 1950 = 50 ; E(200) = −150 < 0 → coverage = 50
  check('S7 · coverage is verlaagde storting', p.deficitCoverage!, 50);
  check('S7 · eindsaldo', m0.endBalance, 0);
  check('S7 · uncovered', p.deficitUncovered, 0);
  invariant(months, 'S7');
}

// ── S8: buffer naast een tweede spaardoel — enkel de buffer beweegt ─────────────
console.log('\nS8 — buffer naast een gewoon spaardoel');
{
  const ander: ReservationItem = {
    id: 'vakantie', label: 'Vakantie', monthlyAmount: 100, startMonth: '2026-03', type: 'spaardoel',
  };
  const fresh: ReservationItem = { ...BUFFER, startMonth: '2026-03' };
  const months = run({
    anchor: '2026-03', startBalance: 1000,
    income: [['2026-03', 1000]],
    recurring: [['2025-01', 2000]],
    reservations: [fresh, ander],
    count: 1,
  });
  const m0 = months[0]!;
  const buf = bufferPot(m0)!;
  const other = m0.reservationPots.find((p) => p.reservationId === 'vakantie')!;
  // Pot start deze maand op 0 → er valt niets op te nemen; enkel de storting vervalt.
  // E(0) = 1000 + 1000 − 2000 − 100 (vakantie) = −100, cap = 0 → coverage 0, eind −100.
  check('S8 · coverage begrensd tot lege pot', buf.deficitCoverage!, 0);
  check('S8 · ander spaardoel ongemoeid', other.provisionThisMonth, 100);
  checkBool('S8 · ander spaardoel geen coverage', other.deficitCoverage === null, true);
  check('S8 · eindsaldo', m0.endBalance, -100);
  check('S8 · uncovered', buf.deficitUncovered, 100);
  invariant(months, 'S8');
}

// ── S8b: buffer mét opgebouwd saldo naast een gewoon spaardoel ─────────────────
console.log('\nS8b — buffer met saldo naast een gewoon spaardoel');
{
  const ander: ReservationItem = {
    id: 'vakantie', label: 'Vakantie', monthlyAmount: 100, startMonth: '2026-03', type: 'spaardoel',
  };
  const months = run({
    anchor: '2026-03', startBalance: 3000,
    income: [['2026-03', 1000]],
    recurring: [['2025-01', 2000]],
    reservations: [BUFFER, ander],
    count: 1,
  });
  const m0 = months[0]!;
  const buf = bufferPot(m0)!;
  const other = m0.reservationPots.find((p) => p.reservationId === 'vakantie')!;
  // E(0) = 3000 + 1000 − 2000 − 2800 (bufferpot) − 100 (vakantie) = −900, pot 2800 → coverage −900
  check('S8b · buffer coverage', buf.deficitCoverage!, -900);
  check('S8b · ander spaardoel ongemoeid', other.provisionThisMonth, 100);
  check('S8b · eindsaldo', m0.endBalance, 0);
  check('S8b · potsaldo na opname', buf.deferredFromPrevious + buf.deficitCoverage!, 1900);
  invariant(months, 'S8b');
}

// ── S9: betaling uit de bufferpot in dezelfde maand — cap houdt er rekening mee ──
console.log('\nS9 — betaling uit de bufferpot in de tekortmaand');
{
  const buf: ReservationItem = { ...BUFFER, monthlyAmount: 200, startMonth: '2026-05' };
  // Pot t/m 2026-07: 3 maanden × 200 = 600
  const months = calculateMonths(
    '2026-08', 0,
    [{ id: 'e1', monthKey: '2026-08', label: 'kost', amount: 500, paid: false }],
    [], [], [buf],
    [{ id: 'pay1', reservationId: 'buffer', monthKey: '2026-08', label: 'factuur', invoiceAmount: 300, fromReservation: 300, fromCash: 0 }],
    [], [], [], [], 3,
  );
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  // Beschikbaar = 600 − 300 betaald = 300 → opname max −300, pot landt op 0
  check('S9 · opname begrensd door betaling', p.deficitCoverage!, -300);
  check('S9 · potsaldo niet negatief', p.potBalance, 0);
  checkBool('S9 · potsaldo blijft ≥ 0 in latere maanden',
    months.every((m) => (bufferPot(m)?.potBalance ?? 0) >= -0.005), true);
  invariant(months, 'S9');
}

// ── S10: overtrokken pot — buffer stort nooit méér dan normaal ──────────────────
console.log('\nS10 — overtrokken pot mag de maand niet verslechteren');
{
  const buf: ReservationItem = { ...BUFFER, monthlyAmount: 100, startMonth: '2026-01' };
  const months = calculateMonths(
    '2026-04', 500,
    [{ id: 'e1', monthKey: '2026-04', label: 'kost', amount: 1000, paid: false }],
    [], [], [buf],
    [{ id: 'pay1', reservationId: 'buffer', monthKey: '2026-02', label: 'factuur', invoiceAmount: 500, fromReservation: 500, fromCash: 0 }],
    [], [], [], [], 1,
  );
  const zonder = calculateMonths(
    '2026-04', 500,
    [{ id: 'e1', monthKey: '2026-04', label: 'kost', amount: 1000, paid: false }],
    [], [], [{ ...buf, coversDeficit: false }],
    [{ id: 'pay1', reservationId: 'buffer', monthKey: '2026-02', label: 'factuur', invoiceAmount: 500, fromReservation: 500, fromCash: 0 }],
    [], [], [], [], 1,
  );
  const m0 = months[0]!;
  const p = bufferPot(m0)!;
  checkBool('S10 · storting niet hoger dan normaal', p.provisionThisMonth <= 100 + 0.005, true);
  checkBool('S10 · buffer maakt het niet slechter', m0.endBalance >= zonder[0]!.endBalance - 0.005, true);
  invariant(months, 'S10');
}

// ── S11: ankermaand schuift op — potstand mag niet heropleven ───────────────────
console.log('\nS11 — doorrol over de ankermaand heen (P0-regressie)');
{
  const buf: ReservationItem = { ...BUFFER, monthlyAmount: 400, startMonth: '2025-10' };
  const expenses: ExpenseItem[] = [{ id: 'e1', monthKey: '2026-01', label: 'kost', amount: 900, paid: false }];

  const anchorState = (anchor: string, pots: ReservationItem[]) =>
    computeAnchorState(1000, '2026-01', anchor, expenses, [], [], pots, [], [], [], [], [], []);
  const window = (anchor: string, pots: ReservationItem[], state: AnchorState) =>
    calculateMonths(anchor, state.startBalance, expenses, [], [], pots, [], [], [], [], [], 2, state.potBalances);

  // Zicht vanaf januari: pot 1200 in, opname −1100, eindsaldo 0, pot 100 over.
  const jan = anchorState('2026-01', [buf]);
  const janMonths = window('2026-01', [buf], jan);
  const janBuf = bufferPot(janMonths[0]!)!;
  check('S11 · januari opname', janBuf.deficitCoverage!, -1100);
  check('S11 · januari eindsaldo', janMonths[0]!.endBalance, 0);
  check('S11 · pot na januari', janBuf.potBalance, 100);

  // Eén maand later schuift het anker op zonder dat er data verandert.
  const feb = anchorState('2026-02', [buf]);
  check('S11 · banksaldo bij start februari', feb.startBalance, 100);
  check('S11 · potstand bij start februari', feb.potBalances.get('buffer') ?? -1, 100);

  // Controle: zonder buffer moeten beide vensters ook overeenkomen (bestaand gedrag).
  const off: ReservationItem[] = [{ ...buf, coversDeficit: false }];
  const janOff = anchorState('2026-01', off);
  const janOffMonths = window('2026-01', off, janOff);
  const febOff = anchorState('2026-02', off);
  check('S11 · controle zonder buffer', febOff.startBalance, janOffMonths[0]!.endBalance
    + (janOffMonths[1]!.reservationPots.find((p) => p.reservationId === 'buffer')?.deferredFromPrevious ?? 0));
}

// ── S12: uitgestelde storting die toekomt telt mee in de potstand ───────────────
console.log('\nS12 — uitgestelde storting crediteert de pot');
{
  const pot: ReservationItem = {
    id: 'auto', label: 'Auto', monthlyAmount: 100, startMonth: '2026-03', type: 'spaardoel',
  };
  const months = calculateMonths(
    '2026-03', 5000, [], [], [], [pot], [], [], [],
    [{ id: 'd1', reservationId: 'auto', fromMonth: '2026-03', toMonth: '2026-04' }],
    [], 3,
  );
  const april = months[1]!;
  const mei = months[2]!;
  const aprilPot = april.reservationPots.find((p) => p.reservationId === 'auto');
  const meiPot = mei.reservationPots.find((p) => p.reservationId === 'auto')!;
  // April: eigen storting 100 + uitgestelde 100 → pot 200, dus mei start op 200.
  check('S12 · pot in april', aprilPot?.potBalance ?? 0, 200);
  check('S12 · overgedragen naar mei', meiPot.deferredFromPrevious, 200);
  invariant(months, 'S12');
}

// ── S13: betaald gemarkeerd in een toekomstige maand telt tóch als kost ─────────
console.log('\nS13 — betaalde post in een toekomstige maand');
{
  const huur: RecurringItem = {
    id: 'huur', label: 'Huur', amount: 500, type: 'expense', frequency: 'monthly', startMonth: '2026-03',
  };

  // April staat als betaald gemarkeerd. Het geld moet nog steeds vertrekken: het
  // beginsaldo van april is een projectie waar niets van afgetrokken is.
  const later: RecurringSettlement[] = [
    { id: 's1', recurringId: 'huur', monthKey: '2026-04', paid: true, actualAmount: 500 },
  ];
  const months = calculateMonths('2026-03', 5000, [], [], [huur], [], [], [], later, [], [], 3);
  check('S13 · eindsaldo april', months[1]!.endBalance, 4000);
  check('S13 · kaart toont hetzelfde', months[1]!.subtotals.endBalance, 4000);
  check('S13 · beginsaldo mei', months[2]!.startBalance, 4000);
  invariant(months, 'S13');

  // Spiegelbeeld: in de ankermaand is een betaalde kost al van het banksaldo af en mag
  // ze er niet nog eens af.
  const anchor: RecurringSettlement[] = [
    { id: 's2', recurringId: 'huur', monthKey: '2026-03', paid: true, actualAmount: 500 },
  ];
  const anchorMonths = calculateMonths('2026-03', 5000, [], [], [huur], [], [], [], anchor, [], [], 3);
  check('S13 · ankermaand telt betaalde kost niet dubbel', anchorMonths[0]!.endBalance, 5000);
  invariant(anchorMonths, 'S13b');
}

// ── S14: budget is een inschatting, geen opzijgezet geld ───────────────────────
console.log('\nS14 — budget: betaling in een toekomstige maand');
{
  const budget: ReservationItem = {
    id: 'boodschappen', label: 'Boodschappen', monthlyAmount: 300,
    startMonth: '2026-03', type: 'maandelijks_budget',
  };
  const betaling: ReservationPayment[] = [{
    id: 'p1', reservationId: 'boodschappen', monthKey: '2026-04', label: 'Winkel',
    invoiceAmount: 180, fromReservation: 180, fromCash: 0,
  }];
  const months = calculateMonths('2026-03', 1000, [], [], [], [budget], betaling, [], [], [], [], 3);
  const potIn = (i: number) =>
    months[i]!.reservationPots.find((p) => p.reservationId === 'boodschappen')!;

  // April is een prognose: er is nog niets vertrokken, dus blijft de volle inschatting
  // staan. Zou de geboekte betaling de kost verlagen, dan maakt uitgeven je rijker.
  check('S14 · kost april', months[0]!.endBalance - months[1]!.endBalance, 300);
  check('S14 · potstand april', potIn(1).potBalance, 120);
  // Wat je niet opmaakt blijft op je rekening staan in plaats van door te rollen.
  check('S14 · potstand mei rolt niet door', potIn(2).potBalance, 300);
  invariant(months, 'S14');
}

// ── S15: gefinaliseerde spaarpot staat leeg in de afsluitmaand ─────────────────
console.log('\nS15 — spaarpot afsluiten');
{
  const pot: ReservationItem = {
    id: 'btw', label: 'Btw', monthlyAmount: 300, startMonth: '2026-03', type: 'spaardoel',
  };
  const settlements: ReservationSettlement[] = [{
    id: 's1', reservationId: 'btw', monthKey: '2026-05', effectiveAmount: 300, finalized: true,
  }];
  const months = calculateMonths('2026-03', 1000, [], [], [], [pot], [], [], [], [], settlements, 4);
  const potIn = (i: number) => months[i]!.reservationPots.find((p) => p.reservationId === 'btw')!;

  check('S15 · opbouw tot april', potIn(1).potBalance, 600);
  // Het restsaldo valt vrij in het eindsaldo; wat er nog gereserveerd zou staan is nul.
  check('S15 · potstand in de afsluitmaand', potIn(2).potBalance, 0);
  check('S15 · vrij saldo na vrijgave', months[2]!.endBalance, 1000);
  check('S15 · opbouw herstart in juni', potIn(3).potBalance, 300);
  invariant(months, 'S15');
}

console.log(`\n${checks - failures}/${checks} checks geslaagd${failures ? ` — ${failures} FOUT` : ''}`);
process.exit(failures ? 1 : 0);
