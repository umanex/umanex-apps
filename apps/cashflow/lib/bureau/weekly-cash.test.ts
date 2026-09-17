import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { IncomeItem, MonthData } from '../cashflow/types.ts';
import { buildWeeklyCashPlan, lowestFree, lowestMonthEnd, reservedAtStart, verifyReconciliation, type WeeklyCashPlan } from './weekly-cash.ts';
import { defaultGoals } from './goals.ts';
import { round2 } from './money.ts';
import { emptyBureau } from './normalize.ts';
import { lastWeekOfMonth, weekRange } from './periods.ts';
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

test('reconciliatie-tegenproef: één cent in één week is al een verschil', () => {
  const { plan } = scenario();
  const kapot: WeeklyCashPlan = { ...plan, reconciliation: plan.reconciliation.map((r, i) => (i === 1 ? { ...r, placed: r.placed + 0.01, delta: r.delta - 0.01 } : r)) };
  assert.deepEqual(verifyReconciliation(kapot).map((r) => r.monthKey), ['2027-04']);
});

test('reserveringen gaan in de ankermaand één keer af: vrij bij de start = bank − potstand', () => {
  const { plan } = scenario();
  assert.deepEqual(plan.position, { bank: 10_000, reserved: 4_000, provisions: 3_000, buffer: 1_000, free: 6_000 });
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

test('maandeinden: de eindsaldi van de rekenkern, alleen voor maanden die binnen de horizon eindigen', () => {
  const { plan, months } = scenario();
  // Horizon W10–W22 eindigt op zondag 6 juni 2027: juni valt erbuiten, ook al begint hij erin.
  assert.deepEqual(plan.monthEnds, [
    { monthKey: '2027-03', closingFree: 8_940, bufferPot: 0, buffer: 8_940 },
    { monthKey: '2027-04', closingFree: 6_340, bufferPot: 0, buffer: 6_340 },
    { monthKey: '2027-05', closingFree: 3_840, bufferPot: 0, buffer: 3_840 },
  ]);
  assert.deepEqual(plan.monthEnds.map((m) => m.closingFree), months.slice(0, 3).map((m) => m.endBalance));
  assert.deepEqual(lowestMonthEnd(plan), { monthKey: '2027-05', closingFree: 3_840, bufferPot: 0, buffer: 3_840 });
});

test('kopgetal en weektabel verschillen: de week trekt de kosten van een maand vóór haar inkomsten mee', () => {
  const { plan } = scenario();
  const week = lowestFree(plan)!;
  const maand = lowestMonthEnd(plan)!;
  // W22 (31 mei–6 jun) draagt juni's vaste kosten maar niet juni's losse post van 900 (laatste week van juni).
  assert.equal(week.weekKey, '2027-W22');
  assert.equal(week.closingFree, 3_840 - 2_500);
  assert.ok(week.closingFree < maand.closingFree);
});

test('horizongrens: een maand die precies op de laatste zondag eindigt, telt mee', () => {
  // 2 november 2026 → W45 t/m 2027-W04 (25–31 jan): januari 2027 eindigt op zondag 31 januari.
  // Gezocht, niet gegokt: 2026 heeft 53 ISO-weken, dus "13 weken verder" valt niet op een rond getal.
  const asOf = '2026-11-02';
  const keten = ['2026-11', '2026-12', '2027-01', '2027-02'];
  let start = 1_000;
  const months = keten.map((k, i) => {
    const m = month(k, { startBalance: start, subtotals: subtotals({ basis: i === 0 ? 'bank' : 'vrij', incoming: start, recurring: 100 }) });
    start = m.endBalance;
    return m;
  });
  const plan = buildWeeklyCashPlan({ asOf, months, incomeItems: [], bureau: emptyBureau() });
  assert.equal(plan.weeks.at(-1)!.to, '2027-01-31');
  assert.deepEqual(plan.monthEnds.map((m) => m.monthKey), ['2026-11', '2026-12', '2027-01']);
});

/**
 * Bufferpot die in de ankermaand een tekort dekt (stap 0, 2026-09-17). Gemeten op het echte document:
 * "In potten" op /bureau/cash (16.043) en de Provisies-kop van de Prognose (18.521) verschillen met
 * exact de bufferstand bij de start (3.284). Een definitieverschil, geen dubbeltelling:
 *
 *   In potten      = provisiestand + bufferstand          (reservedAtStart)
 *   Provisies-kop  = provisiestand + stortingen deze maand (subtotals.provisions)
 *
 * (a) is een eigen assert omdat `engineMovement` en de geplaatste regels allebei aan `reservedAtStart`
 * hangen: laat je de bufferpot eruit, dan verschuiven ze samen en blijft `verifyReconciliation` leeg.
 * De bestaande scenario's laten de buffer alleen groeien; een bufferregel die nooit negatief wordt,
 * valt pas hier om.
 *
 * Handgerekend, vandaag woensdag 13 januari 2027 (W02). Januari en februari 2027 eindigen op een
 * zondag (W04, W08), dus de laatste week van elke maand sluit precies op het maandeinde.
 * Januari (anker, bank 10.000): losse post 1.500 · vast 7.500 · budget 500 · provisiepot 3.000 stand
 * + 800 · bufferpot 2.000 stand. De sweep neemt de hele pot op, 300 blijft ongedekt: eindsaldo −300.
 * De opname valt in de week van het tekort, bij de kosten (beslissing 2026-09-17).
 * Februari: post 9.000, vast 2.500, provisie 800 → 5.400 over, dat de buffer opbouwt → 0.
 */
const ASOF_BUFFER = '2027-01-13';
const ANKER = '2027-01';
const PROVISIESTAND = 3_000;
const BUFFERSTAND = 2_000;

function bufferScenario() {
  const post = (id: string, monthKey: string, amount: number): IncomeItem => ({ id, monthKey, label: id, amount, received: false });
  const janPost = post('post-jan', '2027-01', 1_500);
  const febPost = post('post-feb', '2027-02', 9_000);

  const januari: MonthData = month('2027-01', {
    startBalance: 10_000,
    totalIncome: 1_500,
    incomeItems: [janPost],
    reservationPots: [
      pot({ reservationId: 'provisie', deferredFromPrevious: PROVISIESTAND, provisionThisMonth: 800, potBalance: 3_800 }),
      // De sweep heeft de pot leeggehaald: storting = −stand, eindstand 0, geen kost.
      pot({ reservationId: 'buffer', deferredFromPrevious: BUFFERSTAND, provisionThisMonth: -BUFFERSTAND, potBalance: 0, isDeficitBuffer: true, autoContribution: -BUFFERSTAND }),
      // Een budget draagt geen stand: het mag nooit in "In potten" belanden.
      pot({ reservationId: 'budget', potType: 'maandelijks_budget', provisionThisMonth: 500, potBalance: 500 }),
    ],
    subtotals: subtotals({ basis: 'bank', incoming: 11_500, recurring: 7_500, budgets: 500, provisions: PROVISIESTAND + 800, buffer: 0 }),
  });
  const februari: MonthData = month('2027-02', {
    startBalance: januari.endBalance,
    totalIncome: 9_000,
    incomeItems: [febPost],
    subtotals: subtotals({ basis: 'vrij', incoming: januari.endBalance + 9_000, recurring: 2_500, provisions: 800, buffer: 5_400 }),
  });
  const months = [januari, februari];
  const plan = buildWeeklyCashPlan({ asOf: ASOF_BUFFER, months, incomeItems: [janPost, febPost], bureau: emptyBureau() });
  return { plan, months };
}

/**
 * De drie uitspraken als één meetfunctie, zodat de test en de tegenproef exact hetzelfde meten.
 * Leeg = alles sluit aan; anders per uitspraak de naam en het verschil.
 */
function aansluiting(plan: WeeklyCashPlan, anker: MonthData): Array<{ check: string; delta: number }> {
  const out: Array<{ check: string; delta: number }> = [];
  const noteer = (check: string, actual: number, expected: number) => {
    const delta = round2(actual - expected);
    if (delta !== 0) out.push({ check, delta });
  };
  const laatste = lastWeekOfMonth(anker.monthKey);
  const week = plan.weeks.find((w) => w.weekKey === laatste);
  const bufferRegels = plan.weeks.flatMap((w) => w.lines.map((l) => ({ w: w.weekKey, l }))).filter(({ l }) => l.monthKey === anker.monthKey && l.source === 'buffer');

  // (a) In potten = provisiestand + bufferstand — tegen de handgerekende standen, niet tegen reservedAtStart.
  noteer('a:in-potten', plan.position.reserved, PROVISIESTAND + BUFFERSTAND);
  noteer('a:vrij', plan.position.free, anker.startBalance - PROVISIESTAND - BUFFERSTAND);
  // Het weekmodel trekt stand + nieuwe provisie af; de Prognose-kop is stand + storting. Het verschil is de bufferstand.
  const provisieRegel = plan.weeks.flatMap((w) => w.lines).find((l) => l.monthKey === anker.monthKey && l.source === 'provisies')?.amount ?? 0;
  noteer('a:verschil-met-prognosekop', plan.position.reserved - provisieRegel - anker.subtotals.provisions, BUFFERSTAND);

  // (b) De bufferstand komt terug in de week van het tekort — de eerste week van de ankermaand, bij de
  // kosten — en de laatste week sluit op het maandeinde.
  noteer('b:bufferregel-aantal', bufferRegels.length, 1);
  noteer('b:bufferregel-bedrag', bufferRegels[0]?.l.amount ?? 0, BUFFERSTAND - anker.subtotals.buffer);
  noteer('b:bufferregel-in-eerste-week', bufferRegels.filter(({ w }) => w === plan.weeks[0]?.weekKey).length, 1);
  noteer('b:laatste-week-sluit-op-maandeinde', week?.closingFree ?? Number.NaN, anker.endBalance);

  // (c) De weken tellen per maand op tot de rekenkern.
  for (const r of verifyReconciliation(plan)) out.push({ check: `c:reconciliatie:${r.monthKey}`, delta: r.delta });
  return out;
}

test('bufferpot met stand en tekort in de ankermaand: in potten, bufferregel en reconciliatie sluiten aan', () => {
  const { plan, months } = bufferScenario();
  const [januari] = months;
  // Voorwaarde van het scenario: de laatste week van januari eindigt op 31 januari.
  assert.equal(weekRange(lastWeekOfMonth(ANKER)).to, '2027-01-31');
  assert.deepEqual(reservedAtStart(januari!), { provisions: PROVISIESTAND, buffer: BUFFERSTAND }, 'het budget telt niet mee');
  assert.deepEqual(plan.position, { bank: 10_000, reserved: 5_000, provisions: PROVISIESTAND, buffer: BUFFERSTAND, free: 5_000 });
  assert.deepEqual(aansluiting(plan, januari!), []);
  // De maandbewegingen zelf, handgerekend: januari −300 − (10.000 − 5.000); februari 0 − (−300).
  assert.deepEqual(plan.reconciliation.map((r) => [r.monthKey, r.engineMovement, r.delta]), [
    ['2027-01', -5_300, 0],
    ['2027-02', 300, 0],
  ]);
});

test('timing (beslissing 2026-09-17): de opname uit de bufferpot valt in de week van het tekort', () => {
  // Tot deze datum kwam de pot pas in de laatste week vrij, en stonden W02 en W03 op −3.800 terwijl
  // de rekenkern hem in dezelfde maand al gebruikt. Nu dekt hij het tekort in de week dat het ontstaat:
  // 5.000 vrij − 8.800 kosten + 2.000 uit de pot = −1.800, tot de losse post van 1.500 in W04 binnenkomt.
  // Het verschil met vroeger is precies de bufferstand.
  const { plan } = bufferScenario();
  const einde = Object.fromEntries(plan.weeks.slice(0, 3).map((w) => [w.weekKey, w.closingFree]));
  assert.deepEqual(einde, { '2027-W02': -1_800, '2027-W03': -1_800, '2027-W04': -300 });
});

/**
 * Kopgetal op de Buffer, niet op Vrij. Januari: alles wat overblijft landt in de bufferpot, dus Vrij
 * € 0 en Buffer € 1.000. Februari: geen pot, Vrij en Buffer € 100. Het laagste punt is februari;
 * op Vrij gerekend zou het januari zijn — de maand waarin het er het best voor staat.
 */
function potVolScenario() {
  const januari = month('2027-01', {
    startBalance: 1_000,
    reservationPots: [pot({ reservationId: 'buffer', isDeficitBuffer: true, provisionThisMonth: 1_000, potBalance: 1_000 })],
    subtotals: subtotals({ basis: 'bank', incoming: 1_000, buffer: 1_000 }),
  });
  const februari = month('2027-02', { startBalance: 0, totalIncome: 100, subtotals: subtotals({ basis: 'vrij', incoming: 100 }) });
  return buildWeeklyCashPlan({ asOf: ASOF_BUFFER, months: [januari, februari], incomeItems: [], bureau: emptyBureau() });
}

test('maandeinden dragen Vrij én Buffer; het laagste punt kiest op de Buffer', () => {
  const plan = potVolScenario();
  assert.deepEqual(plan.monthEnds, [
    { monthKey: '2027-01', closingFree: 0, bufferPot: 1_000, buffer: 1_000 },
    { monthKey: '2027-02', closingFree: 100, bufferPot: 0, buffer: 100 },
  ]);
  assert.equal(lowestMonthEnd(plan)?.monthKey, '2027-02');
});

test('tegenproef: op Vrij gerekend wijst het laagste punt de maand met de volle pot aan', () => {
  const plan = potVolScenario();
  const opVrij = plan.monthEnds.reduce((min, m) => (m.closingFree < min.closingFree ? m : min));
  assert.equal(opVrij.monthKey, '2027-01', 'het scenario onderscheidt Vrij van Buffer');
  assert.notEqual(opVrij.monthKey, lowestMonthEnd(plan)?.monthKey);
});

test('tegenproef: één cent verschil op elke uitspraak wordt gezien, en alleen die', () => {
  const { plan, months } = bufferScenario();
  const januari = months[0]!;
  const laatste = lastWeekOfMonth(ANKER);

  // (a) één cent meer in potten.
  const a: WeeklyCashPlan = { ...plan, position: { ...plan.position, reserved: plan.position.reserved + 0.01 } };
  assert.deepEqual(aansluiting(a, januari).map((x) => [x.check, x.delta]), [
    ['a:in-potten', 0.01],
    ['a:verschil-met-prognosekop', 0.01],
  ]);

  // (b) de laatste week sluit één cent naast het maandeinde.
  const b: WeeklyCashPlan = { ...plan, weeks: plan.weeks.map((w) => (w.weekKey === laatste ? { ...w, closingFree: w.closingFree - 0.01 } : w)) };
  assert.deepEqual(aansluiting(b, januari).map((x) => [x.check, x.delta]), [['b:laatste-week-sluit-op-maandeinde', -0.01]]);

  // (c) één cent in één week van januari.
  const c: WeeklyCashPlan = { ...plan, reconciliation: plan.reconciliation.map((r) => (r.monthKey === ANKER ? { ...r, placed: r.placed + 0.01, delta: round2(r.delta - 0.01) } : r)) };
  assert.deepEqual(aansluiting(c, januari).map((x) => [x.check, x.delta]), [['c:reconciliatie:2027-01', -0.01]]);
});

test('tegenproef: een bufferstand die één cent naast de handwaarde ligt, ziet alleen (a) — de reconciliatie is er blind voor', () => {
  const { months } = bufferScenario();
  const [januari, februari] = months;
  const scheef: MonthData = {
    ...januari!,
    reservationPots: januari!.reservationPots.map((p) => (p.isDeficitBuffer ? { ...p, deferredFromPrevious: BUFFERSTAND + 0.01 } : p)),
  };
  const plan = buildWeeklyCashPlan({ asOf: ASOF_BUFFER, months: [scheef, februari!], incomeItems: [...scheef.incomeItems, ...februari!.incomeItems], bureau: emptyBureau() });
  assert.deepEqual(verifyReconciliation(plan), [], 'engineMovement en de regels verschuiven samen');
  assert.deepEqual(aansluiting(plan, scheef).map((x) => x.check), ['a:in-potten', 'a:vrij', 'a:verschil-met-prognosekop', 'b:bufferregel-bedrag']);
});
