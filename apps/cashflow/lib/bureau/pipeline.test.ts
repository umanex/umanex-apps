import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversions, openPipeline, overdueActions, periodOf, presentableRate, qualification, stageCounts, winRate, withoutNextAction } from './pipeline.ts';
import { opportunity } from './testing.ts';

const Q1 = { from: '2027-01-01', to: '2027-03-31' };

test('kwalificatie noemt wat ontbreekt, bij naam', () => {
  assert.deepEqual(qualification(opportunity({ id: 'o' })), { qualified: false, missing: ['behoefte', 'budgetruimte', 'beslisser', 'tijdspad'] });
  const volledig = opportunity({
    id: 'o', need: 'Twee productteams zonder gedeelde componenten', budget: { status: 'besproken', amount: 25_000 },
    decisionMakerInvolved: true, expectedDecisionDate: '2027-04-15',
  });
  assert.deepEqual(qualification(volledig), { qualified: true, missing: [] });
  assert.deepEqual(qualification({ ...volledig, budget: { status: 'onbekend', amount: 25_000 } }).missing, ['budgetruimte'], 'een bedrag met status onbekend is geen besproken ruimte');
  assert.deepEqual(qualification({ ...volledig, expectedDecisionDate: null, expectedExecution: { start: '2027-05', end: '2027-07' } }).missing, [], 'een uitvoeringsperiode is ook een tijdspad');
});

test('conversies: noemer uit de historie in de periode, teller ooit bereikt, geen ratio bij noemer 0', () => {
  const opps = [
    opportunity({ id: 'a', history: [{ stage: 'contact', on: '2027-01-02', reason: null }, { stage: 'gesprek', on: '2027-01-10', reason: null }, { stage: 'voorstel', on: '2027-02-01', reason: null }, { stage: 'gewonnen', on: '2027-04-02', reason: null }] }),
    opportunity({ id: 'b', history: [{ stage: 'gesprek', on: '2027-02-10', reason: null }, { stage: 'verloren', on: '2027-03-01', reason: 'Geen budget' }] }),
    opportunity({ id: 'c', history: [{ stage: 'gesprek', on: '2026-12-20', reason: null }, { stage: 'voorstel', on: '2027-01-15', reason: null }] }),
  ];
  const [gv, vg] = conversions(opps, Q1);
  assert.deepEqual(gv, { from: 'gesprek', to: 'voorstel', denominator: 2, numerator: 1, rate: 0.5 }, 'c had zijn gesprek vóór Q1 en telt niet in de noemer');
  assert.deepEqual(vg, { from: 'voorstel', to: 'gewonnen', denominator: 2, numerator: 1, rate: 0.5 }, 'a is gewonnen ná Q1: telt, want de teller is "ooit"');
  assert.deepEqual(conversions([], Q1)[0], { from: 'gesprek', to: 'voorstel', denominator: 0, numerator: 0, rate: null });
});

test('win rate: alleen beslissingen op een voorstel in de periode, geparkeerd telt niet', () => {
  const opps = [
    opportunity({ id: 'w', history: [{ stage: 'voorstel', on: '2027-01-05', reason: null }, { stage: 'gewonnen', on: '2027-02-01', reason: null }] }),
    opportunity({ id: 'l', history: [{ stage: 'voorstel', on: '2027-01-05', reason: null }, { stage: 'verloren', on: '2027-03-01', reason: 'Intern opgelost' }] }),
    opportunity({ id: 'p', history: [{ stage: 'voorstel', on: '2027-01-05', reason: null }, { stage: 'geparkeerd', on: '2027-03-01', reason: 'Volgend jaar' }] }),
    opportunity({ id: 'z', history: [{ stage: 'gesprek', on: '2027-01-05', reason: null }, { stage: 'verloren', on: '2027-02-01', reason: 'Geen match' }] }),
  ];
  assert.deepEqual(winRate(opps, Q1), { won: 1, lost: 1, decided: 2, rate: 0.5 });
});

test('aantallen per stadium in de periode, en de stand nu', () => {
  const opps = [opportunity({ id: 'a', stage: 'voorstel', createdAt: '2027-02-01', history: [{ stage: 'contact', on: '2027-02-01', reason: null }, { stage: 'voorstel', on: '2027-03-01', reason: null }] })];
  const c = stageCounts(opps, Q1);
  assert.deepEqual([c.entered.contact, c.entered.voorstel, c.entered.gewonnen, c.openNow.voorstel, c.created], [1, 1, 0, 1, 1]);
});

test('verlopen acties: alleen open kansen, na de marge, oudste eerst', () => {
  const opps = [
    opportunity({ id: 'a', stage: 'gesprek', nextAction: { text: 'Bellen', date: '2027-03-01' } }),
    opportunity({ id: 'b', stage: 'voorstel', nextAction: { text: 'Opvolgen', date: '2027-03-08' } }),
    opportunity({ id: 'c', stage: 'verloren', nextAction: { text: 'n.v.t.', date: '2027-01-01' } }),
    opportunity({ id: 'd', stage: 'contact', nextAction: null }),
  ];
  assert.deepEqual(overdueActions(opps, '2027-03-10', 0).map((x) => [x.opportunity.id, x.daysOverdue]), [['a', 9], ['b', 2]]);
  assert.deepEqual(overdueActions(opps, '2027-03-10', 3).map((x) => x.opportunity.id), ['a']);
  assert.deepEqual(withoutNextAction(opps).map((o) => o.id), ['d']);
});

test('open pijplijn: ongewogen waarde, voorstellen en kansen zonder waarde apart', () => {
  const opps = [
    opportunity({ id: 'a', stage: 'voorstel', expectedValue: 20_000 }),
    opportunity({ id: 'b', stage: 'gesprek', expectedValue: null }),
    opportunity({ id: 'c', stage: 'gewonnen', expectedValue: 50_000 }),
  ];
  assert.deepEqual(openPipeline(opps), { count: 2, proposals: 1, value: 20_000, withoutValue: 1, qualified: 0 });
});

test('periode: jaar en kwartaal, met de echte laatste dag', () => {
  assert.deepEqual(periodOf(2027, null), { from: '2027-01-01', to: '2027-12-31' });
  assert.deepEqual(periodOf(2027, 2), { from: '2027-04-01', to: '2027-06-30' });
  assert.deepEqual(periodOf(2027, 4), { from: '2027-10-01', to: '2027-12-31' });
});

test('een percentage pas vanaf vijf in de noemer; daaronder alleen de breuk', () => {
  assert.equal(presentableRate({ rate: 0.5, denominator: 2 }), null);
  assert.equal(presentableRate({ rate: 0.4, denominator: 5 }), 0.4);
  assert.equal(presentableRate({ rate: null, denominator: 0 }), null);
});
