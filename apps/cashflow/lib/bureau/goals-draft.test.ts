import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultGoals } from './goals.ts';
import { draftFromGoals, draftSums, goalsFromDraft } from './goals-draft.ts';

test('startwaarden → formulier → doelen is verliesvrij', () => {
  const g = { ...defaultGoals(2027), targetMarginPerDay: 1_100 };
  const r = goalsFromDraft(2027, draftFromGoals(g));
  assert.equal(r.ok, true);
  assert.deepEqual(r.ok && r.goals, g);
});

test('een leeg verplicht veld blokkeert en wordt niet 0', () => {
  const d = draftFromGoals(defaultGoals(2027));
  d.revenueTarget = '';
  const r = goalsFromDraft(2027, d);
  assert.equal(r.ok, false);
  assert.equal(!r.ok && r.errors.revenueTarget, 'Vul een waarde in.');
});

test('onleesbare invoer krijgt een melding met een voorbeeld', () => {
  const d = draftFromGoals(defaultGoals(2027));
  d.monthlyCashNeed = 'elfduizend';
  const r = goalsFromDraft(2027, d);
  assert.match((!r.ok && r.errors.monthlyCashNeed) || '', /Geen getal/);
});

test('kwartalen: alle vier of geen — drie ingevuld is een fout, geen stille nul', () => {
  const d = draftFromGoals(defaultGoals(2027));
  d.quarters = ['40.000', '55.000', '45.000', ''];
  const r = goalsFromDraft(2027, d);
  assert.equal(r.ok, false);
  assert.match((!r.ok && r.errors.quarters) || '', /3 van 4/);
  d.quarters = ['', '', '', ''];
  const leeg = goalsFromDraft(2027, d);
  assert.equal(leeg.ok && leeg.goals.quarterTargets, null);
});

test('grenzen: uren per dag, dagen per week, klantaandeel, overschrijding', () => {
  const d = draftFromGoals(defaultGoals(2027));
  Object.assign(d, { hoursPerDay: '0', daysPerWeek: '8', maxClientShare: '120', projectOverrunPercent: '90', overdueGraceDays: '1,5' });
  const r = goalsFromDraft(2027, d);
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ['daysPerWeek', 'hoursPerDay', 'maxClientShare', 'overdueGraceDays', 'projectOverrunPercent']);
});

test('percentages worden fracties, en een negatieve cashvloer mag', () => {
  const d = draftFromGoals(defaultGoals(2027));
  Object.assign(d, { maxClientShare: '35', projectOverrunPercent: '110', negativeCashFloor: '−2.000' });
  const r = goalsFromDraft(2027, d);
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.goals.maxClientShare, 0.35);
    assert.equal(r.goals.signals.projectOverrun.ratio, 1.1);
    assert.equal(r.goals.signals.negativeCash.floor, -2_000);
  }
});

test('somregels: tonen het verschil zolang alles leesbaar is, en null zodra één veld dat niet is', () => {
  const d = draftFromGoals(defaultGoals(2027));
  d.daysPerCategory.klantwerk = '130';
  assert.deepEqual(draftSums(d).days, { sum: 202, total: 200, deviation: 2 });
  assert.deepEqual(draftSums(d).quarters, { sum: 200_000, target: 200_000, deviation: 0 });
  d.daysBuffer = '1';
  d.daysBuffer = 'x';
  assert.equal(draftSums(d).days, null);
});
