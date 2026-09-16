import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultGoals, goalsConsistency, goalsFor, hoursPerDayFor, registeredOutflow, revenuePerDayTarget } from './goals.ts';
import { emptyBureau } from './normalize.ts';
import { month, subtotals } from './testing.ts';

test('de startwaarden sluiten: 128 + 40 + 12 + 10 + buffer 10 = 200, kwartalen = jaardoel', () => {
  const c = goalsConsistency(defaultGoals(2027), null);
  assert.equal(c.days.sumCategories, 190);
  assert.equal(c.days.deviation, 0);
  assert.deepEqual(c.quarters, { sum: 200_000, target: 200_000, deviation: 0 });
});

test('dagbudgetten die niet optellen tonen het verschil en laten de ingestelde waarden staan', () => {
  const g = defaultGoals(2027);
  g.days.perCategory.klantwerk = 130;
  const c = goalsConsistency(g, null);
  assert.equal(c.days.deviation, 2);
  assert.equal(g.days.total, 200, 'het totaal is niet bijgesteld');
  assert.equal(g.days.perCategory.klantwerk, 130, 'de categorie is niet bijgesteld');
});

test('kwartalen die niet optellen tonen het verschil, zonder correctie', () => {
  const g = defaultGoals(2027);
  g.quarterTargets = [40_000, 55_000, 45_000, 50_000];
  const c = goalsConsistency(g, null);
  assert.deepEqual(c.quarters, { sum: 190_000, target: 200_000, deviation: -10_000 });
  assert.equal(g.revenueTarget, 200_000);
  assert.equal(goalsConsistency({ ...g, quarterTargets: null }, null).quarters, null);
});

test('geregistreerde uitstroom middelt alleen stroommaanden en laat buffer en ankermaand weg', () => {
  const months = [
    // Ankermaand: posities, geen stromen — mag het gemiddelde niet raken.
    month('2027-01', { subtotals: subtotals({ basis: 'bank', incoming: 20_000, recurring: 99_999, provisions: 99_999 }) }),
    month('2027-02', { subtotals: subtotals({ basis: 'vrij', incoming: 12_000, recurring: 4_000, oneOff: 1_000, budgets: 2_000, provisions: 4_000, buffer: 1_000 }) }),
    month('2027-03', { subtotals: subtotals({ basis: 'vrij', incoming: 12_000, recurring: 4_000, oneOff: 3_000, budgets: 2_000, provisions: 4_000, buffer: 500 }) }),
  ];
  const r = registeredOutflow(months);
  assert.ok(r);
  assert.deepEqual(r.months, ['2027-02', '2027-03']);
  assert.deepEqual(r.perMonth, { recurring: 4_000, oneOff: 2_000, budgets: 2_000, provisions: 4_000, total: 12_000 });
});

test('zonder stroommaand is de geregistreerde uitstroom onbekend, niet nul', () => {
  assert.equal(registeredOutflow([month('2027-01', { subtotals: subtotals({ basis: 'bank' }) })]), null);
  const c = goalsConsistency(defaultGoals(2027), null);
  assert.equal(c.cashNeed.deviation, null);
  assert.equal(c.cashNeed.assumed, 11_000);
});

test('cashbehoefte wordt vergeleken met de geregistreerde uitstroom, nooit opgeteld', () => {
  const r = registeredOutflow([month('2027-02', { subtotals: subtotals({ basis: 'vrij', recurring: 10_000, provisions: 2_257 }) })]);
  const c = goalsConsistency(defaultGoals(2027), r);
  assert.equal(c.cashNeed.deviation, 11_000 - 12_257);
  assert.equal(r?.perMonth.total, 12_257, 'de aanname zit niet in de geregistreerde som');
});

test('doel omzet per dag: expliciet wint, anders omzetdoel ÷ klantwerkdagen, bij 0 dagen onbekend', () => {
  const g = defaultGoals(2027);
  assert.equal(revenuePerDayTarget(g), 1_562.5);
  assert.equal(revenuePerDayTarget({ ...g, targetRevenuePerDay: 1_200 }), 1_200);
  const zonderDagen = defaultGoals(2027);
  zonderDagen.days.perCategory.klantwerk = 0;
  assert.equal(revenuePerDayTarget(zonderDagen), null);
});

test('doelen van een jaar zonder instelling zijn null, niet stil de startwaarden; uren per dag valt terug op 8', () => {
  const b = emptyBureau();
  assert.equal(goalsFor(b, 2027), null);
  assert.equal(hoursPerDayFor(b, 2027), 8);
  b.goals['2027'] = { ...defaultGoals(2027), hoursPerDay: 7 };
  assert.equal(hoursPerDayFor(b, 2027), 7);
  assert.equal(hoursPerDayFor(b, 2028), 8);
});
