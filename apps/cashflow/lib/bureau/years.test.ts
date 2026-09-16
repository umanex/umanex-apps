import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectableYears } from './years.ts';
import { emptyBureau } from './normalize.ts';
import { defaultGoals } from './goals.ts';
import { project, timeEntry } from './testing.ts';

test('zonder gegevens: dit jaar en volgend jaar', () => {
  assert.deepEqual(selectableYears(emptyBureau(), 2026), { min: 2026, max: 2027 });
});

test('registraties en plannen rekken het bereik op, in beide richtingen', () => {
  const b = emptyBureau();
  b.timeEntries.push(timeEntry({ id: 't', date: '2025-11-03' }));
  b.projects.push(project({ id: 'p', contractDate: '2026-02-01', plannedStart: '2026-03', plannedEnd: '2028-06' }));
  b.goals['2029'] = defaultGoals(2029);
  assert.deepEqual(selectableYears(b, 2026), { min: 2025, max: 2029 });
});

test('een lege of onleesbare datum verschuift niets', () => {
  const b = emptyBureau();
  b.projects.push(project({ id: 'p', contractDate: '', plannedStart: '', plannedEnd: 'x' }));
  assert.deepEqual(selectableYears(b, 2026), { min: 2026, max: 2027 });
});
