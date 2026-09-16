import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSignals, type SignalInputs } from './signals.ts';
import { defaultGoals } from './goals.ts';
import { emptyBureau } from './normalize.ts';
import { yearRevenue } from './revenue.ts';
import { yearCapacity, weekCapacity } from './capacity.ts';
import { clientConcentration } from './concentration.ts';
import { projectProfitability } from './profitability.ts';
import { overdueActions, withoutNextAction } from './pipeline.ts';
import { buildWeeklyCashPlan } from './weekly-cash.ts';
import { weeksFrom } from './periods.ts';
import { month, opportunity, project, subtotals, timeEntry } from './testing.ts';
import type { BureauData, BusinessGoals, Milestone } from './types.ts';

const ASOF = '2027-03-10';
const m = (id: string, amount: number, over: Partial<Milestone> = {}): Milestone => ({ id, label: id, plannedMonth: '2027-06', amount, realizedOn: null, realizedAmount: null, extensionId: null, ...over });

function build(bureau: BureauData, opts: { goals?: BusinessGoals | null; endBalance?: number } = {}): SignalInputs {
  const goals = opts.goals === undefined ? (bureau.goals['2027'] ?? null) : opts.goals;
  const start = 1_000;
  const eind = opts.endBalance ?? 500;
  const maart = month('2027-03', { startBalance: start, subtotals: subtotals({ basis: 'bank', incoming: start, recurring: start - eind }) });
  const cash = buildWeeklyCashPlan({ asOf: ASOF, months: [maart], incomeItems: [], bureau });
  return {
    year: 2027,
    asOf: ASOF,
    goals,
    revenue: yearRevenue(bureau, 2027, goals, ASOF),
    capacity: goals ? yearCapacity(bureau, goals, 2027, ASOF) : null,
    weeks: goals ? weekCapacity(bureau, goals, weeksFrom(ASOF, 13), ASOF) : null,
    cash,
    concentration: clientConcentration(bureau, 2027, 'prognose', 'klant', goals?.maxClientShare ?? null),
    projects: bureau.projects,
    profitability: bureau.projects.map((p) => projectProfitability(p, bureau.timeEntries, 8)),
    overdueActions: overdueActions(bureau.opportunities, ASOF, goals?.signals.overdueSalesAction.graceDays ?? 0),
    withoutNextAction: withoutNextAction(bureau.opportunities),
    goalDeviations: goals ? { days: 0, quarters: 0 } : null,
    money: (n) => `€${n}`,
    days: (n) => `${n} d`,
    percent: (s) => `${Math.round(s * 100)} %`,
    weekLabel: (w) => w,
  };
}

const ids = (i: SignalInputs) => computeSignals(i).signals.map((s) => s.id);

function gezond(): BureauData {
  const b = emptyBureau();
  b.goals['2027'] = { ...defaultGoals(2027), revenueTarget: 100_000 };
  b.clients = [{ id: 'a', name: 'Alfa', groupId: null }, { id: 'b', name: 'Beta', groupId: null }, { id: 'c', name: 'Gamma', groupId: null }, { id: 'd', name: 'Delta', groupId: null }];
  b.projects = ['a', 'b', 'c', 'd'].map((c) => project({ id: `p-${c}`, clientId: c, budgetedOwnHours: 80, expectedRemainingOwnHours: 40, milestones: [m(`${c}1`, 25_000, { realizedOn: '2027-02-01' })] }));
  b.opportunities = [opportunity({ id: 'o', stage: 'gesprek', nextAction: { text: 'Bellen', date: '2027-03-12' } })];
  return b;
}

test('gezond bureau: geen signalen, en niets uitgeschakeld', () => {
  const r = computeSignals(build(gezond()));
  assert.deepEqual(r.signals.map((s) => s.id), []);
  assert.deepEqual(r.disabled, []);
});

test('geen doelen: onzeker, nooit stil in orde — en geen concentratie- of omzetgatsignaal zonder limiet of doel', () => {
  const b = gezond();
  b.goals = {};
  b.projects[0]!.milestones = [m('x', 90_000, { realizedOn: '2027-02-01' })];
  const r = ids(build(b, { goals: null }));
  assert.ok(r.includes('geen-doelen'));
  assert.equal(r.some((x) => x.startsWith('klantconcentratie') || x === 'omzetgat'), false);
});

test('negatieve cash: kritiek onder de vloer, niet erboven; uitgeschakeld = weg én geteld', () => {
  assert.ok(ids(build(gezond(), { endBalance: -200 })).includes('cash-negatief'));
  assert.equal(ids(build(gezond(), { endBalance: 200 })).includes('cash-negatief'), false);
  const b = gezond();
  b.goals['2027']!.signals.negativeCash = { enabled: true, floor: 500 };
  assert.ok(ids(build(b, { endBalance: 200 })).includes('cash-negatief'), 'vloer 500, stand 200');
  b.goals['2027']!.signals.negativeCash.enabled = false;
  const r = computeSignals(build(b, { endBalance: -200 }));
  assert.equal(r.signals.some((s) => s.id === 'cash-negatief'), false);
  assert.deepEqual(r.disabled, ['negativeCash']);
});

test('klantconcentratie op de vooruitblik, met noemer en limiet in de tekst', () => {
  const b = gezond();
  b.projects[0]!.milestones.push(m('a2', 60_000));
  const s = computeSignals(build(b)).signals.find((x) => x.id === 'klantconcentratie:a');
  assert.ok(s);
  assert.match(s!.detail, /noemer €160000/);
  assert.match(s!.detail, /limiet 30 %/);
});

test('verkoopacties: over tijd pas na de marge; open kans zonder actie is info', () => {
  const b = gezond();
  b.opportunities = [opportunity({ id: 'o', stage: 'voorstel', company: 'Vonk', nextAction: { text: 'Opvolgen', date: '2027-03-07' } }), opportunity({ id: 'z', stage: 'gesprek' })];
  assert.ok(ids(build(b)).includes('verkoopactie-achterstallig'));
  b.goals['2027']!.signals.overdueSalesAction.graceDays = 5;
  const r = computeSignals({ ...build(b), overdueActions: overdueActions(b.opportunities, ASOF, 5) });
  assert.equal(r.signals.some((s) => s.id === 'verkoopactie-achterstallig'), false);
  assert.equal(r.signals.find((s) => s.id === 'kans-zonder-actie')?.level, 'info');
});

test('projectuitloop boven de ratio; zonder raming onzeker', () => {
  const b = gezond();
  b.timeEntries = [timeEntry({ id: 't', category: 'klantwerk', projectId: 'p-a', hours: 60, date: '2027-03-01' })];
  const r = ids(build(b));
  assert.ok(r.includes('project-overschrijding:p-a'), '60 besteed + 40 resterend = 100 tegen 80');
  b.projects[1]!.expectedRemainingOwnHours = null;
  assert.ok(ids(build(b)).includes('project-zonder-raming'));
});

test('omzetgat: geen vrije klantdagen = kritiek; zonder mijlpalen onzeker in plaats van een gat van het hele doel', () => {
  const b = gezond();
  b.goals['2027']!.revenueTarget = 150_000;
  b.goals['2027']!.days.perCategory.klantwerk = 0;
  const kritiek = computeSignals(build(b)).signals.find((s) => s.id === 'omzetgat');
  assert.equal(kritiek?.level, 'kritiek');
  const leeg = gezond();
  leeg.projects = [];
  leeg.clients = [];
  const r = ids(build(leeg));
  assert.ok(r.includes('omzet-onbekend'));
  assert.equal(r.includes('omzetgat'), false);
});

test('volgorde: kritiek eerst, info laatst — ook als een onzeker signaal eerder ontstaat', () => {
  const b = gezond();
  b.goals = {};
  b.opportunities.push(opportunity({ id: 'z', stage: 'gesprek' }));
  const signalen = computeSignals(build(b, { goals: null, endBalance: -1 })).signals;
  assert.deepEqual(signalen.map((s) => s.id).slice(0, 2), ['cash-negatief', 'geen-doelen'], 'geen-doelen wordt eerst aangemaakt, cash-negatief hoort ervoor');
  const levels = signalen.map((s) => s.level);
  assert.deepEqual(levels, [...levels].sort((x, y) => ['kritiek', 'let-op', 'onzeker', 'info'].indexOf(x) - ['kritiek', 'let-op', 'onzeker', 'info'].indexOf(y)));
  assert.equal(levels[0], 'kritiek');
});
