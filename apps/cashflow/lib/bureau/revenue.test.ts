import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Milestone } from './types.ts';
import { bucketMilestones, coverage, neededPerRemainingDay, yearRevenue } from './revenue.ts';
import { addInvoice, markInvoicePaid, realizeMilestone } from './mutations.ts';
import { defaultGoals } from './goals.ts';
import { draft, invoice, opportunity, project } from './testing.ts';

const ms = (id: string, plannedMonth: string, amount: number, extra: Partial<Milestone> = {}): Milestone => ({
  id, label: id, plannedMonth, amount, realizedOn: null, realizedAmount: null, extensionId: null, ...extra,
});

const goals2027 = { ...defaultGoals(2027), revenueTarget: 50_000, quarterTargets: [10_000, 10_000, 15_000, 15_000] as [number, number, number, number] };

test('voorschot → realisatie → betaling: omzet volgt alleen de mijlpaal, de factuur en de betaling blijven apart', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', fixedPriceExVat: 12_000, milestones: [ms('m1', '2027-02', 4_000), ms('m2', '2027-03', 4_000), ms('m3', '2027-06', 4_000)] }));

  const t0 = yearRevenue(d.bureau, 2027, goals2027, '2027-01-10');
  assert.deepEqual([t0.realized, t0.remainingSigned], [0, 12_000], 'getekend, niets gerealiseerd');

  addInvoice(d, 'p1', invoice({ id: 'f1', kind: 'voorschot', date: '2027-01-15', amountExVat: 4_000, dueDate: '2027-02-14' }), { incomeItemId: 'i1', label: 'Voorschot' });
  const t1 = yearRevenue(d.bureau, 2027, goals2027, '2027-01-20');
  assert.deepEqual([t1.realized, t1.remainingSigned], [0, 12_000], 'een voorschot is geen omzet');
  assert.deepEqual([t1.invoiced.exVat, t1.invoiced.inclVat, t1.outstanding.inclVat], [4_000, 4_840, 4_840]);

  realizeMilestone(d, 'p1', 'm1', '2027-02-28', null);
  const t2 = yearRevenue(d.bureau, 2027, goals2027, '2027-03-01');
  assert.deepEqual([t2.realized, t2.remainingSigned, t2.signedInYear], [4_000, 8_000, 12_000], 'gerealiseerd en resterend overlappen niet');
  assert.equal(t2.outstanding.overdue.count, 1, 'vervallen op 14 februari');

  markInvoicePaid(d, 'p1', 'f1', '2027-03-03', 4_840);
  const t3 = yearRevenue(d.bureau, 2027, goals2027, '2027-03-04');
  assert.deepEqual([t3.realized, t3.remainingSigned], [4_000, 8_000], 'een betaling voegt geen omzet toe');
  assert.deepEqual([t3.received.amount, t3.outstanding.inclVat], [4_840, 0]);
});

test('project over twee boekjaren: een decembermijlpaal die in januari gerealiseerd wordt, telt één keer, in januari', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', plannedStart: '2027-10', plannedEnd: '2028-02', milestones: [ms('m1', '2027-12', 6_000), ms('m2', '2028-02', 6_000)] }));
  assert.deepEqual([yearRevenue(d.bureau, 2027, null, '2027-11-01').remainingSigned, yearRevenue(d.bureau, 2028, null, '2027-11-01').remainingSigned], [6_000, 6_000]);
  realizeMilestone(d, 'p1', 'm1', '2028-01-08', null);
  const j27 = yearRevenue(d.bureau, 2027, null, '2028-01-09');
  const j28 = yearRevenue(d.bureau, 2028, null, '2028-01-09');
  assert.deepEqual([j27.realized, j27.remainingSigned], [0, 0], '2027 draagt hem niet meer');
  assert.deepEqual([j28.realized, j28.remainingSigned], [6_000, 6_000]);
  assert.equal(j27.signedInYear + j28.signedInYear, 12_000, 'over de jaren samen precies de prijs');
});

test('gedeeltelijk gerealiseerde opdracht met afwijkend gerealiseerd bedrag', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', milestones: [ms('m1', '2027-02', 4_000, { realizedOn: '2027-02-20', realizedAmount: 3_500 }), ms('m2', '2027-05', 8_000)] }));
  const r = yearRevenue(d.bureau, 2027, null, '2027-03-01');
  assert.deepEqual([r.realized, r.remainingSigned], [3_500, 8_000]);
});

test('een goedgekeurde uitbreiding verhoogt de prijs en, met haar mijlpaal, het resterend getekende', () => {
  const p = project({ id: 'p1', fixedPriceExVat: 12_000, milestones: [ms('m1', '2027-02', 12_000)] });
  const d = draft();
  d.bureau.projects.push(p);
  assert.equal(coverage(d.bureau.projects[0]!).delta, 0);
  d.bureau.projects[0]!.extensions.push({ id: 'x1', label: 'Extra scherm', approvedOn: '2027-03-01', amount: 3_000, extraBudgetedHours: 16 });
  assert.equal(coverage(d.bureau.projects[0]!).delta, 3_000, 'zonder mijlpaal is de uitbreiding zichtbaar niet ingepland');
  d.bureau.projects[0]!.milestones.push(ms('m2', '2027-04', 3_000, { extensionId: 'x1' }));
  assert.equal(coverage(d.bureau.projects[0]!).delta, 0);
  assert.equal(yearRevenue(d.bureau, 2027, null, '2027-03-02').remainingSigned, 15_000);
});

test('een voorstel is geen getekend werk; open kansen staan apart, ongewogen', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'voorstel', expectedValue: 20_000, expectedExecution: { start: '2027-04', end: '2027-06' } }));
  d.bureau.opportunities.push(opportunity({ id: 'o2', stage: 'gesprek', expectedValue: null, expectedDecisionDate: '2027-05-01' }));
  d.bureau.opportunities.push(opportunity({ id: 'o3', stage: 'verloren', expectedValue: 50_000, expectedExecution: { start: '2027-01', end: '2027-12' } }));
  const r = yearRevenue(d.bureau, 2027, goals2027, '2027-03-01');
  assert.deepEqual([r.realized, r.remainingSigned, r.signedInYear], [0, 0, 0]);
  assert.deepEqual(r.unsigned, { total: 20_000, count: 2, withoutValue: 1 });
  assert.equal(r.stillToSell, 50_000, 'het voorstel verkleint de verkoopopdracht niet');
});

test('boven doel: nog te verkopen is 0, en het bedrag boven doel staat apart — nooit een negatieve opdracht', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', milestones: [ms('m1', '2027-02', 60_000, { realizedOn: '2027-02-02' })] }));
  const r = yearRevenue(d.bureau, 2027, goals2027, '2027-03-01');
  assert.deepEqual([r.stillToSell, r.aboveTarget], [0, 10_000]);
});

test('zonder doelen bestaat er geen nog te verkopen', () => {
  const r = yearRevenue(draft().bureau, 2027, null, '2027-03-01');
  assert.deepEqual([r.target, r.stillToSell, r.aboveTarget, r.hasMilestones], [null, null, null, false]);
});

test('kwartalen splitsen op de maand van realisatie of planning', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', milestones: [ms('m1', '2027-01', 1_000, { realizedOn: '2027-04-01' }), ms('m2', '2027-08', 2_000)] }));
  const q = yearRevenue(d.bureau, 2027, goals2027, '2027-05-01').byQuarter;
  assert.deepEqual(q.map((x) => [x.q, x.target, x.realized, x.remainingSigned]), [[1, 10_000, 0, 0], [2, 10_000, 1_000, 0], [3, 15_000, 0, 2_000], [4, 15_000, 0, 0]]);
});

test('geannuleerd project: resterende waarde valt weg, gerealiseerde blijft', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', status: 'geannuleerd', milestones: [ms('m1', '2027-02', 4_000, { realizedOn: '2027-02-10' }), ms('m2', '2027-05', 8_000)] }));
  const r = yearRevenue(d.bureau, 2027, null, '2027-06-01');
  assert.deepEqual([r.realized, r.remainingSigned], [4_000, 0]);
});

test('een mijlpaal zonder geldige maand valt in geen jaar, maar wordt geteld', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', milestones: [ms('m1', '', 4_000)] }));
  assert.equal(bucketMilestones(d.bureau).buckets.length, 0);
  assert.equal(yearRevenue(d.bureau, 2027, null, '2027-01-01').undatedMilestones, 1);
});

test('omzet per vrije klantdag: deling alleen als er dagen zijn — nul dagen is een melding, geen Infinity', () => {
  assert.deepEqual(neededPerRemainingDay(10_000, 0), { kind: 'geen-capaciteit', gap: 10_000 });
  assert.deepEqual(neededPerRemainingDay(10_000, -2), { kind: 'geen-capaciteit', gap: 10_000 });
  assert.deepEqual(neededPerRemainingDay(10_000, 8), { kind: 'ok', gap: 10_000, days: 8, perDay: 1_250 });
  assert.deepEqual(neededPerRemainingDay(0, 8), { kind: 'geen-gat' });
  assert.deepEqual(neededPerRemainingDay(null, 8), { kind: 'geen-doel' });
});

test('I1 — invariant: per jaar is gerealiseerd + resterend gelijk aan de som van de mijlpalen met dat jaar als attributie', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', milestones: [ms('a', '2026-11', 1_111), ms('b', '2027-03', 2_222, { realizedOn: '2027-01-15', realizedAmount: 2_000 }), ms('c', '2028-01', 3_333)] }));
  d.bureau.projects.push(project({ id: 'p2', status: 'afgerond', milestones: [ms('d', '2027-06', 4_444, { realizedOn: '2026-12-31' })] }));
  const { buckets } = bucketMilestones(d.bureau);
  for (const jaar of [2026, 2027, 2028]) {
    const r = yearRevenue(d.bureau, jaar, null, '2027-01-01');
    const verwacht = buckets.filter((b) => b.year === jaar).reduce((s, b) => s + b.amount, 0);
    assert.equal(r.signedInYear, Math.round(verwacht * 100) / 100, `jaar ${jaar}`);
  }
  assert.equal(buckets.length, 4, 'elke mijlpaal precies één keer');
});
