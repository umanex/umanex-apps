import { test } from 'node:test';
import assert from 'node:assert/strict';
import { draftFromProject, emptyProjectDraft, findClientByName, projectFromDraft } from './project-draft.ts';
import { emptyBureau } from './normalize.ts';
import { project } from './testing.ts';

const geldig = () => ({ ...emptyProjectDraft('2027-01-10'), clientName: 'Vonk', name: 'Productdiagnose', fixedPriceExVat: '3.550' });

test('een geldig concept wordt velden; lege uren blijven onbekend, niet 0', () => {
  const r = projectFromDraft(geldig());
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.fields.fixedPriceExVat, 3_550);
    assert.equal(r.fields.budgetedOwnHours, null);
    assert.equal(r.fields.expectedRemainingOwnHours, null);
    assert.equal(r.clientName, 'Vonk');
  }
});

test('verplichte velden en een einde vóór de start worden geweigerd', () => {
  const r = projectFromDraft({ ...geldig(), clientName: ' ', name: '', fixedPriceExVat: '', plannedStart: '2027-05', plannedEnd: '2027-03' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ['clientName', 'fixedPriceExVat', 'name', 'plannedEnd']);
});

test('onleesbare uren of prijs: melding, geen 0', () => {
  const r = projectFromDraft({ ...geldig(), fixedPriceExVat: 'veel', expectedRemainingOwnHours: 'een paar' });
  assert.equal(r.ok, false);
  assert.match((!r.ok && r.errors.fixedPriceExVat) || '', /Geen bedrag/);
  assert.match((!r.ok && r.errors.expectedRemainingOwnHours) || '', /Geen getal/);
});

test('klant op naam: hoofdletters en randspaties maken geen tweede klant', () => {
  const b = emptyBureau();
  b.clients.push({ id: 'c1', name: 'Vonk BV', groupId: null });
  assert.equal(findClientByName(b, '  vonk bv '), 'c1');
  assert.equal(findClientByName(b, 'Vonk'), null);
});

test('project → concept → velden is verliesvrij', () => {
  const b = emptyBureau();
  b.clients.push({ id: 'klant-a', name: 'Vonk', groupId: null });
  const p = project({ id: 'p1', budgetedOwnHours: 64, expectedRemainingOwnHours: 7.5, scope: 'Twee flows', blockers: 'Wacht op data' });
  const r = projectFromDraft(draftFromProject(p, b));
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.deepEqual([r.fields.budgetedOwnHours, r.fields.expectedRemainingOwnHours, r.fields.fixedPriceExVat, r.clientName], [64, 7.5, 12_000, 'Vonk']);
    assert.equal(r.fields.blockers, 'Wacht op data');
  }
});
