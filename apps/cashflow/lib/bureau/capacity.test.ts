import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { PlannedWork } from './types.ts';
import { weekCapacity, yearCapacity } from './capacity.ts';
import { defaultGoals } from './goals.ts';
import { emptyBureau } from './normalize.ts';
import { timeEntry } from './testing.ts';

const goals = defaultGoals(2027);
const plan = (id: string, over: Partial<PlannedWork>): PlannedWork => ({ id, periodKind: 'week', periodKey: '2027-W10', category: 'klantwerk', projectId: 'p1', days: 2, ...over });

test('I4 — besteed en gepland overlappen niet: registraties t/m vandaag, planning in periodes die nog lopen, verlopen planning apart', () => {
  const b = emptyBureau();
  // Vandaag = woensdag 10 maart 2027 (week 10).
  b.timeEntries.push(timeEntry({ id: 't1', date: '2027-03-08', category: 'klantwerk', projectId: 'p1', hours: 16 }));
  b.timeEntries.push(timeEntry({ id: 't2', date: '2027-03-12', category: 'klantwerk', projectId: 'p1', hours: 8 })); // toekomst
  b.plannedWork.push(plan('w10', { periodKey: '2027-W10', days: 2 })); // lopende week = resterend
  b.plannedWork.push(plan('w08', { periodKey: '2027-W08', days: 3 })); // voorbij
  const c = yearCapacity(b, goals, 2027, '2027-03-10');
  const klant = c.categories.find((x) => x.category === 'klantwerk')!;
  assert.deepEqual([klant.spentDays, klant.plannedDays, klant.committedDays], [2, 2, 4]);
  assert.equal(c.stalePlannedDays, 3);
  assert.equal(c.futureEntries, 1);
  assert.equal(c.unallocatedClientDays, 124);
});

test('overschrijding: eerst uit de buffer, daarboven overbelasting', () => {
  const b = emptyBureau();
  b.plannedWork.push(plan('m', { periodKind: 'month', periodKey: '2027-06', category: 'verkoop', days: 43 }));
  const c = yearCapacity(b, goals, 2027, '2027-03-10');
  assert.deepEqual([c.buffer.absorbedDays, c.buffer.remainingDays, c.overbookedDays], [3, 7, 0]);
  b.plannedWork[0]!.days = 54;
  const d = yearCapacity(b, goals, 2027, '2027-03-10');
  assert.deepEqual([d.buffer.absorbedDays, d.buffer.remainingDays, d.overbookedDays], [10, 0, 4]);
});

test('een week over de jaarwissel telt per dag in het juiste jaar', () => {
  const b = emptyBureau();
  b.plannedWork.push(plan('w53', { periodKey: '2026-W53', days: 7 })); // ma 28 dec – zo 3 jan
  const j26 = yearCapacity(b, defaultGoals(2026), 2026, '2026-12-01');
  const j27 = yearCapacity(b, goals, 2027, '2026-12-01');
  assert.equal(j26.categories[0]!.plannedDays, 4);
  assert.equal(j27.categories[0]!.plannedDays, 3);
});

test('dagen volgen de uren per dag van de registratie, niet de huidige instelling', () => {
  const b = emptyBureau();
  b.timeEntries.push(timeEntry({ id: 'a', date: '2027-01-05', category: 'administratie', hours: 16, hoursPerDayAtEntry: 8 }));
  b.timeEntries.push(timeEntry({ id: 'b', date: '2027-01-06', category: 'administratie', hours: 14, hoursPerDayAtEntry: 7 }));
  const c = yearCapacity(b, { ...goals, hoursPerDay: 6 }, 2027, '2027-02-01');
  assert.equal(c.categories.find((x) => x.category === 'administratie')!.spentDays, 4);
});

test('zonder registraties of planning: geen gegevens, alles vrij', () => {
  const c = yearCapacity(emptyBureau(), goals, 2027, '2027-03-10');
  assert.deepEqual([c.hasEntries, c.hasPlans, c.totals.freeDays, c.overbookedDays], [false, false, 190, 0]);
});

test('week: plafond uit de doelen, overboeking erboven, maandplanning apart', () => {
  const b = emptyBureau();
  b.timeEntries.push(timeEntry({ id: 't', date: '2027-03-08', category: 'klantwerk', projectId: 'p1', hours: 16 }));
  b.plannedWork.push(plan('w', { periodKey: '2027-W10', days: 4 }));
  b.plannedWork.push(plan('m', { periodKind: 'month', periodKey: '2027-03', days: 5, projectId: 'p2' }));
  const [w] = weekCapacity(b, goals, ['2027-W10'], '2027-03-10');
  assert.deepEqual([w!.spentDays, w!.plannedDays, w!.loadDays, w!.ceilingDays, w!.overbookedDays, w!.monthPlannedDays], [2, 4, 6, 5, 1, 5]);
  assert.deepEqual(w!.byProject, [{ projectId: 'p1', spentDays: 2, plannedDays: 4 }]);
});

test('een voorbije week draagt geen planning meer, alleen registraties', () => {
  const b = emptyBureau();
  b.timeEntries.push(timeEntry({ id: 't', date: '2027-03-01', category: 'verkoop', hours: 8 }));
  b.plannedWork.push(plan('w', { periodKey: '2027-W09', days: 4 }));
  const [w] = weekCapacity(b, goals, ['2027-W09'], '2027-03-10');
  assert.deepEqual([w!.spentDays, w!.plannedDays], [1, 0]);
});
