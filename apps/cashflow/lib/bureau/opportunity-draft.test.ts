import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  conversionDraft,
  conversionFromDraft,
  draftFromOpportunity,
  emptyOpportunityDraft,
  opportunityFromDraft,
  suggestedNextStage,
  validateStageChange,
} from './opportunity-draft.ts';
import { emptyBureau } from './normalize.ts';
import { convertOpportunity, moveOpportunityStage } from './mutations.ts';
import { draft, opportunity } from './testing.ts';
import { STAGES } from './types.ts';

const geldig = () => ({ ...emptyOpportunityDraft(), company: 'Vonk' });

test('alleen het bedrijf is verplicht; lege velden blijven onbekend, niet 0', () => {
  const r = opportunityFromDraft(geldig(), emptyBureau());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.fields.expectedValue, null);
    assert.deepEqual(r.fields.budget, { status: 'onbekend', amount: null });
    assert.equal(r.fields.expectedExecution, null);
    assert.equal(r.fields.nextAction, null);
    assert.equal(r.stage, 'contact');
  }
  const leeg = opportunityFromDraft(emptyOpportunityDraft(), emptyBureau());
  assert.deepEqual(Object.keys(!leeg.ok ? leeg.errors : {}), ['company']);
});

test('half ingevuld wordt geweigerd: actie zonder datum, periode zonder einde, einde vóór start', () => {
  const r = opportunityFromDraft({ ...geldig(), nextActionText: 'Bellen', executionStart: '2027-05' }, emptyBureau());
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ['executionEnd', 'nextActionDate']);
  const omgekeerd = opportunityFromDraft({ ...geldig(), executionStart: '2027-05', executionEnd: '2027-03' }, emptyBureau());
  assert.match((!omgekeerd.ok && omgekeerd.errors.executionEnd) || '', /vóór de start/);
  const datumZonderTekst = opportunityFromDraft({ ...geldig(), nextActionDate: '2027-03-01' }, emptyBureau());
  assert.deepEqual(Object.keys(!datumZonderTekst.ok ? datumZonderTekst.errors : {}), ['nextActionText']);
});

test('onleesbare bedragen geven een melding, en een nieuwe kans kan niet gesloten starten', () => {
  const r = opportunityFromDraft({ ...geldig(), expectedValue: 'veel', budgetAmount: '-5', stage: 'gewonnen' }, emptyBureau());
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ['budgetAmount', 'expectedValue', 'stage']);
});

test('bedrijf met de naam van een bestaande klant koppelt eraan; een onbekende naam maakt geen klant', () => {
  const b = emptyBureau();
  b.clients.push({ id: 'c1', name: 'Vonk BV', groupId: null });
  const r = opportunityFromDraft({ ...geldig(), company: ' vonk bv' }, b);
  assert.equal(r.ok && r.fields.clientId, 'c1');
  const nieuw = opportunityFromDraft({ ...geldig(), company: 'Andere' }, b);
  assert.equal(nieuw.ok && nieuw.fields.clientId, null);
  assert.equal(b.clients.length, 1);
});

test('kans → concept → velden is verliesvrij', () => {
  const o = opportunity({
    id: 'o', company: 'Vonk', contact: 'An', trigger: { description: 'Nieuw product', source: 'LinkedIn', date: '2027-01-02' },
    need: 'Twee teams, geen gedeelde componenten', offerType: 'design-system', budget: { status: 'geschat', amount: 40_000 },
    expectedValue: 38_500.5, decisionMakerInvolved: true, expectedDecisionDate: '2027-02-15',
    expectedExecution: { start: '2027-03', end: '2027-08' }, nextAction: { text: 'Voorstel sturen', date: '2027-02-01' }, stage: 'gesprek',
  });
  const r = opportunityFromDraft(draftFromOpportunity(o), emptyBureau());
  assert.equal(r.ok, true);
  if (r.ok) {
    const { id: _id, stage: _s, history: _h, projectId: _p, createdAt: _c, outcomeReason: _r, ...verwacht } = o;
    assert.deepEqual(r.fields, verwacht);
  }
});

test('stadiumwissel: niet naar hetzelfde, niet vóór de vorige overgang, verloren vraagt een reden', () => {
  const o = opportunity({ id: 'o', stage: 'voorstel', history: [{ stage: 'contact', on: '2027-01-05', reason: null }, { stage: 'voorstel', on: '2027-02-10', reason: null }] });
  const zelfde = validateStageChange({ stage: 'voorstel', on: '2027-03-01', reason: '' }, o);
  assert.deepEqual(Object.keys(!zelfde.ok ? zelfde.errors : {}), ['stage']);
  const vroeg = validateStageChange({ stage: 'verloren', on: '2027-02-01', reason: ' ' }, o);
  assert.deepEqual(Object.keys(!vroeg.ok ? vroeg.errors : {}).sort(), ['on', 'reason']);
  assert.deepEqual(validateStageChange({ stage: 'gewonnen', on: '2027-02-10', reason: '' }, o), { ok: true, reason: null });
  assert.deepEqual(validateStageChange({ stage: 'geparkeerd', on: '2027-03-01', reason: ' Volgend jaar ' }, o), { ok: true, reason: 'Volgend jaar' });
});

test('omzetting: vooringevuld uit de kans, bestaande klant op naam, anders een nieuwe — en één project', () => {
  const d = draft();
  d.bureau.clients.push({ id: 'c1', name: 'Vonk', groupId: null });
  const o = opportunity({ id: 'o', company: 'Vonk', stage: 'voorstel', expectedValue: 18_000, offerType: 'workflowtraject', expectedExecution: { start: '2027-04', end: '2027-06' }, need: 'Onboarding' });
  d.bureau.opportunities.push(o);
  moveOpportunityStage(d, 'o', 'gewonnen', '2027-03-01', null);

  const cd = conversionDraft(d.bureau.opportunities[0]!, d.bureau, '2027-03-01');
  assert.deepEqual(cd, { clientName: 'Vonk', name: '', offerType: 'workflowtraject', fixedPriceExVat: '18000', plannedStart: '2027-04', plannedEnd: '2027-06', scope: 'Onboarding' });
  assert.equal(conversionFromDraft(cd, d.bureau).ok, false, 'zonder projectnaam geen project');

  const r = conversionFromDraft({ ...cd, name: 'Onboarding herzien' }, d.bureau);
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.equal(r.input.clientId, 'c1');
  assert.equal(r.input.newClientName, null);
  assert.equal(convertOpportunity(d, 'o', r.input, { projectId: 'p1', clientId: 'nieuw' }, '2027-03-01'), 'ok');
  assert.equal(convertOpportunity(d, 'o', r.input, { projectId: 'p2', clientId: 'nieuw2' }, '2027-03-01'), 'al-omgezet');
  assert.equal(d.bureau.projects.length, 1);
  assert.equal(d.bureau.clients.length, 1, 'geen tweede klant voor een bestaande naam');

  const anders = conversionFromDraft({ ...cd, name: 'X', clientName: 'Nieuwe klant' }, d.bureau);
  assert.equal(anders.ok && anders.input.newClientName, 'Nieuwe klant');
});

test('voorgesteld volgend stadium: nooit het huidige', () => {
  for (const s of STAGES) assert.notEqual(suggestedNextStage(s), s);
  assert.equal(suggestedNextStage('voorstel'), 'gewonnen');
});
