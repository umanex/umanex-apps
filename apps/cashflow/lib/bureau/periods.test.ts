import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addMonthKey,
  firstWeekOfMonth,
  isoWeekKey,
  lastWeekOfMonth,
  maxWeek,
  monthsBetween,
  monthsCovering,
  quarterOf,
  weekMonthCells,
  weekRange,
  weeksFrom,
} from './periods.ts';

test('ISO-week: 1 januari 2027 is week 53 van 2026 (de donderdag bepaalt het jaar)', () => {
  assert.equal(isoWeekKey('2027-01-01'), '2026-W53');
  assert.equal(isoWeekKey('2027-01-04'), '2027-W01');
  assert.equal(isoWeekKey('2026-12-31'), '2026-W53');
});

test('weekRange loopt van maandag t/m zondag', () => {
  assert.deepEqual(weekRange('2027-W05'), { from: '2027-02-01', to: '2027-02-07' });
  assert.deepEqual(weekRange('2026-W53'), { from: '2026-12-28', to: '2027-01-03' });
});

test('een week over de maandwissel splitst in twee cellen met de juiste dagen', () => {
  // 2027-W04: ma 25 jan t/m zo 31 jan → één cel. 2027-W05 begint op 1 feb → één cel.
  assert.deepEqual(weekMonthCells('2027-W04').map((c) => [c.monthKey, c.days]), [['2027-01', 7]]);
  // 2027-W09: ma 1 mrt → geen wissel. 2027-W13: ma 29 mrt t/m zo 4 apr → 3 + 4.
  assert.deepEqual(weekMonthCells('2027-W13').map((c) => [c.monthKey, c.days]), [['2027-03', 3], ['2027-04', 4]]);
  const total = weekMonthCells('2026-W53').reduce((s, c) => s + c.days, 0);
  assert.equal(total, 7);
});

test('weeksFrom geeft opeenvolgende, oplopende sleutels over de jaarwissel', () => {
  const w = weeksFrom('2026-12-30', 3);
  assert.deepEqual(w, ['2026-W53', '2027-W01', '2027-W02']);
  for (let i = 1; i < w.length; i++) assert.ok(w[i]! > w[i - 1]!, 'stringvolgorde is chronologisch');
});

test('13 weken raken 4 of 5 maanden — nooit hardcoden', () => {
  // Week van 15 feb 2027 (W07, ma 15 feb) + 12 weken → t/m zo 16 mei: feb, mrt, apr, mei.
  assert.deepEqual(monthsCovering('2027-02-15', 13), ['2027-02', '2027-03', '2027-04', '2027-05']);
  // Week van 31 jan 2027 is W04 (25–31 jan) + 12 weken → t/m zo 25 apr: jan, feb, mrt, apr.
  assert.equal(monthsCovering('2027-01-31', 13).length, 4);
  // Week van 30 dec 2026 (W53, 28 dec – 3 jan) + 12 → t/m zo 28 mrt: dec, jan, feb, mrt.
  assert.deepEqual(monthsCovering('2026-12-30', 13), ['2026-12', '2027-01', '2027-02', '2027-03']);
  // Vijf maanden: week van 29 mrt 2027 (W13, 29 mrt – 4 apr) + 12 → t/m zo 27 jun: mrt t/m jun = 4.
  // Een horizon die aan beide kanten een maand raakt: week van 30 jun 2027 (W26, 28 jun – 4 jul) + 12 → t/m 26 sep.
  assert.deepEqual(monthsCovering('2027-06-30', 13), ['2027-06', '2027-07', '2027-08', '2027-09']);
  assert.deepEqual(monthsCovering('2027-07-31', 13), ['2027-07', '2027-08', '2027-09', '2027-10']);
});

test('eerste en laatste week van een maand', () => {
  assert.equal(firstWeekOfMonth('2027-02'), '2027-W05');
  assert.equal(lastWeekOfMonth('2027-02'), '2027-W08'); // zo 28 feb
  assert.equal(maxWeek('2027-W05', '2026-W53'), '2027-W05');
});

test('maanden en kwartalen', () => {
  assert.deepEqual(monthsBetween('2026-11', '2027-02'), ['2026-11', '2026-12', '2027-01', '2027-02']);
  assert.deepEqual(monthsBetween('2027-03', '2027-02'), []);
  assert.equal(addMonthKey('2026-12', 1), '2027-01');
  assert.equal(addMonthKey('2027-01', -1), '2026-12');
  assert.deepEqual(['2027-01', '2027-03', '2027-04', '2027-12'].map(quarterOf), [1, 1, 2, 4]);
});
