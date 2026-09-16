import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomeItem, MonthData } from '../cashflow/types.ts';
import { buildWeeklyCashPlan, lowestFree, verifyReconciliation, type WeeklyCashPlan } from './weekly-cash.ts';
import { defaultGoals } from './goals.ts';
import { emptyBureau } from './normalize.ts';
import { invoice, month, pot, project, subtotals } from './testing.ts';
import type { BureauData, Invoice } from './types.ts';

/**
 * Handgerekend scenario, vandaag woensdag 10 maart 2027 (week 10). Dertien weken: W10 t/m W22.
 *
 * Maart (anker, bank 10.000): losse post 2.000 · factuurpost 4.840 op 20 maart · vast 2.500 ·
 * eenmalig 300 · budget 400 · provisiepot met 3.000 stand + 500 storting · bufferpot met 1.000
 * stand + 200. Eindsaldo 8.940. Vrij bij de start: 10.000 − 4.000 = 6.000.
 * April: post 1.000, vast 2.500, budget 400, provisie 500, buffer 200 → 6.340.
 * Mei: vast 2.500 → 3.840. Juni: post 900 (laatste week W26, buiten de horizon), vast 2.500 → 2.240.
 */
const ASOF = '2027-03-10';

function scenario(over: { invoices?: Invoice[]; extraIncome?: IncomeItem[]; bureau?: Partial<BureauData> } = {}) {
  const post = (id: string, monthKey: string, amount: number, label = id): IncomeItem => ({ id, monthKey, label, amount, received: false });
  const maartPosten = [post('post-a', '2027-03', 2_000), post('post-f', '2027-03', 4_840, 'Termijn 1'), ...(over.extraIncome ?? []).filter((i) => i.monthKey === '2027-03')];
  const inkomen = (items: IncomeItem[]) => items.reduce((s, i) => s + i.amount, 0);
  const maartIn = inkomen(maartPosten);

  const maart: MonthData = month('2027-03', {
    startBalance: 10_000,
    totalIncome: maartIn,
    incomeItems: maartPosten,
    reservationPots: [
      pot({ reservationId: 'provisie', deferredFromPrevious: 3_000, provisionThisMonth: 500 }),
      pot({ reservationId: 'buffer', deferredFromPrevious: 1_000, provisionThisMonth: 200, isDeficitBuffer: true }),
    ],
    subtotals: subtotals({ basis: 'bank', incoming: 10_000 + maartIn, recurring: 2_500, oneOff: 300, budgets: 400, provisions: 3_500, buffer: 1_200 }),
  });
  const volgende = (monthKey: string, start: number, items: IncomeItem[], kosten: { recurring?: number; budgets?: number; provisions?: number; buffer?: number }) =>
    month(monthKey, {
      startBalance: start,
      totalIncome: inkomen(items),
      incomeItems: items,
      subtotals: subtotals({ basis: 'vrij', incoming: start + inkomen(items), ...kosten }),
    });
  const april = volgende('2027-04', maart.endBalance, [post('post-b', '2027-04', 1_000), ...(over.extraIncome ?? []).filter((i) => i.monthKey === '2027-04')], { recurring: 2_500, budgets: 400, provisions: 500, buffer: 200 });
  const mei = volgende('2027-05', april.endBalance, [], { recurring: 2_500 });
  const juni = volgende('2027-06', mei.endBalance, [post('post-j', '2027-06', 900)], { recurring: 2_500 });

  const bureau: BureauData = { ...emptyBureau(), ...over.bureau };
  bureau.projects = [project({ id: 'p', invoices: over.invoices ?? [invoice({ id: 'f', label: 'Termijn 1', dueDate: '2027-03-25', expectedPaymentDate: '2027-03-20', incomeItemId: 'post-f' })] })];
  const months = [maart, april, mei, juni];
  const incomeItems = [...months.flatMap((m) => m.incomeItems), ...(over.extraIncome ?? []).filter((i) => i.monthKey < '2027-03')];
  return { plan: buildWeeklyCashPlan({ asOf: ASOF, months, incomeItems, bureau }), months };
}

const week = (plan: WeeklyCashPlan, key: string) => plan.weeks.find((w) => w.weekKey === key)!;
const alleRegels = (plan: WeeklyCashPlan) => plan.weeks.flatMap((w) => w.lines);

test('reconciliatie: per maand tellen de weken exact op tot de maandbeweging van de rekenkern', () => {
  const { plan } = scenario();
  assert.deepEqual(verifyReconciliation(plan), []);
  assert.deepEqual(plan.reconciliation.map((r) => [r.monthKey, r.engineMovement, r.beyondHorizon]), [
    ['2027-03', 2_940, 0],
    ['2027-04', -2_600, 0],
    ['2027-05', -2_500, 0],
    ['2027-06', -1_600, 900],
  ]);
  assert.equal(plan.weeks.length, 13);
  assert.equal(plan.weeks[0]!.weekKey, '2027-W10');
  assert.equal(plan.weeks[12]!.weekKey, '2027-W22');
});

test('reconciliatie-tegenproef: een weggevallen regel wordt gezien', () => {
  const { plan } = scenario();
  const w = week(plan, '2027-W13');
  const kapot: WeeklyCashPlan = {
    ...plan,
    weeks: plan.weeks.map((x) => (x === w ? { ...x, lines: x.lines.filter((l) => l.source !== 'post') } : x)),
  };
  kapot.reconciliation = plan.reconciliation.map((r) => {
    const placed = kapot.weeks.flatMap((x) => x.lines).filter((l) => l.monthKey === r.monthKey).reduce((a, l) => a + l.amount, 0);
    return { ...r, placed, delta: r.engineMovement - placed - r.unplaced - r.beyondHorizon };
  });
  assert.deepEqual(verifyReconciliation(kapot).map((r) => r.monthKey), ['2027-03'], 'W13 draagt de losse post van maart; april valt in W17');
});

test('reserveringen gaan in de ankermaand één keer af: vrij bij de start = bank − potstand', () => {
  const { plan } = scenario();
  assert.deepEqual(plan.position, { bank: 10_000, reserved: 4_000, free: 6_000 });
  const w10 = week(plan, '2027-W10');
  assert.equal(w10.openingFree, 6_000);
  assert.equal(w10.outflows, 3_200, 'vast, eenmalig en budget van maart, naar deze week want de eerste week van maart is voorbij');
  assert.equal(w10.toReserved, 500, 'alleen de nieuwe storting — de stand van 3.000 zit al in de opening');
  assert.equal(w10.closingFree, 2_300);
  assert.equal(week(plan, '2027-W13').lines.find((l) => l.source === 'buffer')?.amount, -200);
});

test('de laatste week van maart sluit op het eindsaldo van de rekenkern', () => {
  const { plan, months } = scenario();
  // W13 draagt ook april's eerste-week-kosten (1 april valt in W13); trek die eraf.
  const w13 = week(plan, '2027-W13');
  const april = w13.lines.filter((l) => l.monthKey === '2027-04').reduce((a, l) => a + l.amount, 0);
  assert.equal(w13.closingFree - april, months[0]!.endBalance);
});

test('factuur mét gekoppelde post: één ontvangstregel, op de verwachte betaaldatum', () => {
  const { plan } = scenario();
  const regels = alleRegels(plan).filter((l) => l.amount === 4_840);
  assert.equal(regels.length, 1);
  assert.deepEqual([regels[0]!.source, regels[0]!.dated, week(plan, '2027-W11').receipts], ['factuur', true, 4_840]);
});

test('achterstallige factuur zonder verwachte datum: apart, in geen enkele week, wel in de reconciliatie', () => {
  const { plan } = scenario({
    extraIncome: [{ id: 'post-oud', monthKey: '2027-03', label: 'Slot', amount: 731.17, received: false }],
    invoices: [
      invoice({ id: 'f', label: 'Termijn 1', dueDate: '2027-03-25', expectedPaymentDate: '2027-03-20', incomeItemId: 'post-f' }),
      invoice({ id: 'oud', label: 'Slot', dueDate: '2027-03-01', expectedPaymentDate: null, incomeItemId: 'post-oud' }),
    ],
  });
  assert.equal(alleRegels(plan).some((l) => l.amount === 731.17), false);
  assert.deepEqual(plan.unplaced.map((u) => [u.invoiceId, u.reason, u.inForecast, u.amount]), [['oud', 'achterstallig-zonder-datum', true, 731.17]]);
  assert.deepEqual(verifyReconciliation(plan), []);
  assert.equal(plan.reconciliation[0]!.unplaced, 731.17);
});

test('verlopen verwachte datum, factuur zonder post, post in een voorbije maand: elk apart gemeld', () => {
  const { plan } = scenario({
    extraIncome: [
      { id: 'post-laat', monthKey: '2027-03', label: 'Laat', amount: 100, received: false },
      { id: 'post-feb', monthKey: '2027-02', label: 'Feb', amount: 250, received: false },
    ],
    invoices: [
      invoice({ id: 'f', label: 'Termijn 1', dueDate: '2027-03-25', expectedPaymentDate: '2027-03-20', incomeItemId: 'post-f' }),
      invoice({ id: 'laat', dueDate: '2027-02-20', expectedPaymentDate: '2027-03-05', incomeItemId: 'post-laat' }),
      invoice({ id: 'los', amountExVat: 1_000, vatRate: 21, dueDate: '2027-04-10', incomeItemId: null }),
      invoice({ id: 'feb', dueDate: '2027-02-28', incomeItemId: 'post-feb' }),
      invoice({ id: 'betaald', dueDate: '2027-02-01', paidOn: '2027-02-03', paidAmount: 4_840, incomeItemId: null }),
    ],
  });
  const reden = Object.fromEntries(plan.unplaced.map((u) => [u.invoiceId, [u.reason, u.inForecast, u.amount]]));
  assert.deepEqual(reden, {
    laat: ['verwachte-datum-verstreken', true, 100],
    los: ['niet-in-prognose', false, 1_210],
    feb: ['post-in-verleden', false, 250],
  });
  assert.deepEqual(verifyReconciliation(plan), [], 'wat niet in de rekenkern zit, verschuift de reconciliatie niet');
});

test('factuurdatum in een andere maand dan de post: gemeld, en volgens de maandregel ingepland', () => {
  const { plan } = scenario({
    extraIncome: [{ id: 'post-apr', monthKey: '2027-04', label: 'Mei-betaling', amount: 500, received: false }],
    invoices: [
      invoice({ id: 'f', label: 'Termijn 1', dueDate: '2027-03-25', expectedPaymentDate: '2027-03-20', incomeItemId: 'post-f' }),
      invoice({ id: 'mis', label: 'Mei-betaling', dueDate: '2027-05-10', expectedPaymentDate: '2027-05-05', incomeItemId: 'post-apr' }),
    ],
  });
  assert.deepEqual(plan.mismatches.map((m) => [m.invoiceId, m.invoiceMonth, m.itemMonth]), [['mis', '2027-05', '2027-04']]);
  const regel = alleRegels(plan).find((l) => l.invoice?.invoiceId === 'mis');
  assert.deepEqual([regel?.dated, week(plan, '2027-W17').lines.includes(regel!)], [false, true]);
  assert.deepEqual(verifyReconciliation(plan), []);
});

test('de cashbehoefte uit de doelen komt in geen enkele weekregel', () => {
  const goals = defaultGoals(2027);
  const { plan } = scenario({ bureau: { goals: { '2027': goals } } });
  assert.equal(alleRegels(plan).some((l) => Math.abs(l.amount) === goals.monthlyCashNeed), false);
  assert.equal([...alleRegels(plan), ...plan.beyondHorizon].some((l) => /cashbehoefte/i.test(l.label)), false);
});

test('laagste vrije stand in de horizon', () => {
  const { plan } = scenario();
  const laagste = lowestFree(plan)!;
  assert.equal(laagste.closingFree, Math.min(...plan.weeks.map((w) => w.closingFree)));
});
