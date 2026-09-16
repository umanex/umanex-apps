import { test } from 'node:test';
import assert from 'node:assert/strict';
import { entryDays, projectProfitability, yieldSummary } from './profitability.ts';
import { project, timeEntry } from './testing.ts';

const klantwerk = (id: string, hours: number, hoursPerDayAtEntry = 8, projectId = 'p1') =>
  timeEntry({ id, category: 'klantwerk', projectId, hours, hoursPerDayAtEntry });

test('A en B: prijs 12k + uitbreiding 3k, 6 dagen besteed + 4 dagen verwacht, 2k externe kosten', () => {
  const p = project({
    id: 'p1', fixedPriceExVat: 12_000, expectedRemainingOwnHours: 32,
    extensions: [{ id: 'x', label: 'Extra', approvedOn: '2027-02-01', amount: 3_000, extraBudgetedHours: null }],
    externalCosts: [{ id: 'e', label: 'Freelancer', expected: 2_000, actual: null }],
  });
  const r = projectProfitability(p, [klantwerk('t1', 24), klantwerk('t2', 24)], 8);
  assert.equal(r.totalDays, 10);
  assert.deepEqual(r.A, { kind: 'ok', value: 1_500 });
  assert.deepEqual(r.B, { kind: 'ok', value: 1_300 });
});

test('externe kosten verlagen B en niet A, en tellen niet als eigen dagen', () => {
  const zonder = project({ id: 'p1', fixedPriceExVat: 10_000, expectedRemainingOwnHours: 40 });
  const met = { ...zonder, externalCosts: [{ id: 'e', label: 'Freelancer 3 dagen', expected: 1_500, actual: null }] };
  const a = projectProfitability(zonder, [klantwerk('t', 40)], 8);
  const b = projectProfitability(met, [klantwerk('t', 40)], 8);
  assert.deepEqual([a.A, b.A], [{ kind: 'ok', value: 1_000 }, { kind: 'ok', value: 1_000 }]);
  assert.deepEqual([a.B, b.B], [{ kind: 'ok', value: 1_000 }, { kind: 'ok', value: 850 }]);
  assert.equal(a.totalDays, b.totalDays, 'freelancerdagen tellen niet als eigen capaciteit');
});

test('nul uren en geen raming: onvoldoende gegevens, geen deling door nul', () => {
  const r = projectProfitability(project({ id: 'p1', expectedRemainingOwnHours: null }), [], 8);
  assert.equal(r.A.kind, 'onvoldoende-gegevens');
  assert.match((r.A as { reason: string }).reason, /resterende uren ontbreken/);
  assert.equal(r.B.kind, 'onvoldoende-gegevens');
});

test('uren geregistreerd maar raming ontbreekt: ook onvoldoende — een halve noemer geeft een te mooi bedrag', () => {
  const r = projectProfitability(project({ id: 'p1', expectedRemainingOwnHours: null }), [klantwerk('t', 16)], 8);
  assert.equal(r.A.kind, 'onvoldoende-gegevens');
  assert.equal(r.spentDays, 2);
});

test('raming nul en nog geen uren: onvoldoende gegevens', () => {
  const r = projectProfitability(project({ id: 'p1', expectedRemainingOwnHours: 0 }), [], 8);
  assert.match((r.A as { reason: string }).reason, /nog geen uren/);
});

test('afgerond project: werkelijke uren (niets resterend) en werkelijke kosten', () => {
  const p = project({ id: 'p1', status: 'afgerond', fixedPriceExVat: 9_000, expectedRemainingOwnHours: 80, externalCosts: [{ id: 'e', label: 'Onderzoek', expected: 500, actual: 900 }] });
  const r = projectProfitability(p, [klantwerk('t', 48)], 8);
  assert.deepEqual([r.remainingDays, r.totalDays, r.external.basis, r.external.amount], [0, 6, 'werkelijk', 900]);
  assert.deepEqual(r.A, { kind: 'ok', value: 1_500 });
  assert.deepEqual(r.B, { kind: 'ok', value: 1_350 });
});

test('afgerond met een ontbrekende werkelijke kost: B onvoldoende, A wel', () => {
  const p = project({ id: 'p1', status: 'afgerond', fixedPriceExVat: 9_000, externalCosts: [{ id: 'e', label: 'Licentie', expected: 500, actual: null }] });
  const r = projectProfitability(p, [klantwerk('t', 48)], 8);
  assert.equal(r.A.kind, 'ok');
  assert.match((r.B as { reason: string }).reason, /Licentie/);
});

test('een gewijzigde uur-per-daginstelling verandert de dagen van eerdere registraties niet', () => {
  const oud = klantwerk('t1', 16, 8);
  const nieuw = klantwerk('t2', 14, 7);
  assert.deepEqual([entryDays(oud), entryDays(nieuw)], [2, 2]);
  const p = project({ id: 'p1', expectedRemainingOwnHours: 0, status: 'afgerond' });
  assert.equal(projectProfitability(p, [oud, nieuw], 7).spentDays, 4, 'de huidige instelling (7) herrekent de oude registratie niet');
});

test('alleen klantwerk op dit project telt', () => {
  const p = project({ id: 'p1', expectedRemainingOwnHours: 0, status: 'afgerond' });
  const r = projectProfitability(p, [klantwerk('a', 8), klantwerk('b', 8, 8, 'p2'), { ...klantwerk('c', 8), category: 'verkoop' as const, projectId: null }], 8);
  assert.equal(r.spentHours, 8);
});

test('uitloop: besteed + resterend tegenover begroot plus goedgekeurde extra uren', () => {
  const p = project({ id: 'p1', budgetedOwnHours: 80, expectedRemainingOwnHours: 30, extensions: [{ id: 'x', label: 'x', approvedOn: '2027-01-01', amount: 0, extraBudgetedHours: 10 }] });
  const r = projectProfitability(p, [klantwerk('t', 70)], 8);
  assert.deepEqual(r.hours, { budgeted: 90, expectedTotal: 100, ratio: 1.11, overrun: 10 });
});

test('samenvatting: gewogen naar dagen, projecten zonder gegevens bij naam apart', () => {
  const rows = [
    projectProfitability(project({ id: 'p1', fixedPriceExVat: 10_000, expectedRemainingOwnHours: 0, status: 'afgerond' }), [klantwerk('a', 80)], 8),
    projectProfitability(project({ id: 'p2', fixedPriceExVat: 3_000, expectedRemainingOwnHours: 0, status: 'afgerond' }), [klantwerk('b', 16, 8, 'p2')], 8),
    projectProfitability(project({ id: 'p3', expectedRemainingOwnHours: null }), [], 8),
  ];
  const s = yieldSummary(rows);
  assert.deepEqual(s.A, { kind: 'ok', value: 1_083.33 }, '13.000 ÷ 12 dagen, niet het gemiddelde van 1.000 en 1.500');
  assert.equal(s.included, 2);
  assert.deepEqual(s.insufficient.map((i) => i.projectId), ['p3']);
  assert.equal(yieldSummary([]).A.kind, 'onvoldoende-gegevens');
});
