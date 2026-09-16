import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientConcentration } from './concentration.ts';
import { emptyBureau } from './normalize.ts';
import { project } from './testing.ts';
import type { Milestone } from './types.ts';

const mijlpaal = (id: string, amount: number, over: Partial<Milestone> = {}): Milestone => ({
  id, label: id, plannedMonth: '2027-05', amount, realizedOn: null, realizedAmount: null, extensionId: null, ...over,
});

function bureau() {
  const b = emptyBureau();
  b.clients = [
    { id: 'a', name: 'Alfa', groupId: 'g' },
    { id: 'b', name: 'Beta', groupId: 'g' },
    { id: 'c', name: 'Gamma', groupId: null },
  ];
  b.clientGroups = [{ id: 'g', name: 'Holding AB' }];
  b.projects = [
    project({ id: 'a1', clientId: 'a', milestones: [mijlpaal('a1-1', 30_000, { realizedOn: '2027-02-10' }), mijlpaal('a1-2', 10_000)] }),
    project({ id: 'a2', clientId: 'a', milestones: [mijlpaal('a2-1', 10_000, { realizedOn: '2027-03-01' })] }),
    project({ id: 'b1', clientId: 'b', milestones: [mijlpaal('b1-1', 20_000, { realizedOn: '2027-04-01' })] }),
    project({ id: 'c1', clientId: 'c', milestones: [mijlpaal('c1-1', 40_000, { realizedOn: '2027-01-15' }), mijlpaal('c1-2', 90_000), mijlpaal('c1-3', 5_000, { realizedOn: '2026-12-20' })] }),
  ];
  return b;
}

test('gerealiseerd: meerdere projecten van één klant tellen samen, met de noemer erbij', () => {
  const c = clientConcentration(bureau(), 2027, 'gerealiseerd', 'klant', 0.3);
  assert.equal(c.denominator, 100_000, '30k + 10k (Alfa) + 20k (Beta) + 40k (Gamma); 2026 en resterend tellen niet');
  assert.deepEqual(c.rows.map((r) => [r.label, r.amount, r.share, r.aboveLimit]), [
    ['Alfa', 40_000, 0.4, true],
    ['Gamma', 40_000, 0.4, true],
    ['Beta', 20_000, 0.2, false],
  ]);
});

test('prognose is een aparte basis met een eigen noemer: gerealiseerd plus resterend in het jaar', () => {
  const c = clientConcentration(bureau(), 2027, 'prognose', 'klant', 0.3);
  assert.equal(c.denominator, 200_000);
  assert.deepEqual(c.rows.map((r) => [r.label, r.amount]), [['Gamma', 130_000], ['Alfa', 50_000], ['Beta', 20_000]]);
  assert.equal(c.rows[0]!.share, 0.65);
});

test('per groep: klanten in een groep tellen als één; een klant zonder groep staat alleen', () => {
  const c = clientConcentration(bureau(), 2027, 'gerealiseerd', 'groep', 0.5);
  assert.deepEqual(c.rows.map((r) => [r.label, r.amount, r.clientIds.sort(), r.aboveLimit]), [
    ['Holding AB', 60_000, ['a', 'b'], true],
    ['Gamma', 40_000, ['c'], false],
  ]);
});

test('noemer 0: geen aandeel, geen 0 %; een geannuleerd project houdt alleen zijn gerealiseerde deel', () => {
  const leeg = clientConcentration(emptyBureau(), 2027, 'gerealiseerd', 'klant', 0.3);
  assert.deepEqual([leeg.denominator, leeg.rows], [0, []]);
  const b = bureau();
  b.projects.find((p) => p.id === 'c1')!.status = 'geannuleerd';
  const c = clientConcentration(b, 2027, 'prognose', 'klant', null);
  assert.equal(c.rows.find((r) => r.label === 'Gamma')!.amount, 40_000);
  assert.equal(c.rows.every((r) => r.aboveLimit === false), true, 'zonder limiet is niets boven de limiet');
});
