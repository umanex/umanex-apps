/**
 * De overgangen die dubbeltelling of verweesde gegevens kunnen veroorzaken.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { MonthSnapshot } from '../cashflow/types.ts';
import {
  addInvoice,
  addMonthlyMilestones,
  addTimeEntry,
  convertOpportunity,
  linkInvoiceToExistingIncome,
  linkInvoiceToLedger,
  markInvoicePaid,
  moveOpportunityStage,
  onIncomeItemRemoved,
  removeClient,
  removeExtension,
  removeInvoice,
  removeProject,
  unmarkInvoicePaid,
  updateInvoice,
  updateTimeEntry,
} from './mutations.ts';
import { defaultGoals } from './goals.ts';
import { draft, invoice, month, opportunity, project, subtotals, timeEntry } from './testing.ts';

const frozen = (monthKey: string): MonthSnapshot => ({
  monthKey,
  closedAt: `${monthKey}-28T12:00:00Z`,
  data: month(monthKey, { subtotals: subtotals({ basis: 'bank' }) }),
  reserved: 0,
  buffer: 0,
});

const withProject = () => {
  const d = draft();
  d.bureau.clients.push({ id: 'klant-a', name: 'Vonk', groupId: null });
  d.bureau.projects.push(project({ id: 'p1' }));
  return d;
};

// ── Factuur ⇄ inkomstenpost ───────────────────────────────────────────────────

test('factuur met prognose-koppeling maakt één post incl. btw in de maand van de vervaldatum', () => {
  const d = withProject();
  const r = addInvoice(d, 'p1', invoice({ id: 'f1', amountExVat: 4_000, dueDate: '2027-02-14' }), { incomeItemId: 'i1', label: 'Factuur Vonk' });
  assert.equal(r, 'ok');
  assert.deepEqual(d.incomeItems, [{ id: 'i1', monthKey: '2027-02', label: 'Factuur Vonk', amount: 4_840, received: false }]);
  assert.equal(d.bureau.projects[0]?.invoices[0]?.incomeItemId, 'i1');
});

test('een verwachte betaaldatum wint van de vervaldatum voor de maand van de post', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', dueDate: '2027-02-14', expectedPaymentDate: '2027-03-05' }), { incomeItemId: 'i1', label: 'F' });
  assert.equal(d.incomeItems[0]?.monthKey, '2027-03');
});

test('voorschot → betaling: de post verdwijnt, de factuur is betaald, er staat nergens een tweede ontvangst', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', kind: 'voorschot' }), { incomeItemId: 'i1', label: 'Voorschot' });
  const r = markInvoicePaid(d, 'p1', 'f1', '2027-02-10', 4_840);
  assert.equal(r, 'verwijderd');
  assert.equal(d.incomeItems.length, 0, 'de post telt niet meer als te ontvangen');
  const inv = d.bureau.projects[0]?.invoices[0];
  assert.equal(inv?.paidOn, '2027-02-10');
  assert.equal(inv?.incomeItemId, null);
});

test('betaald in een afgesloten maand: de post blijft staan en dat wordt gemeld', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', dueDate: '2027-02-14' }), { incomeItemId: 'i1', label: 'F' });
  d.monthSnapshots.push(frozen('2027-02'));
  const r = markInvoicePaid(d, 'p1', 'f1', '2027-03-02', 4_840);
  assert.equal(r, 'afgesloten-maand');
  assert.equal(d.incomeItems.length, 1);
  assert.equal(d.bureau.projects[0]?.invoices[0]?.incomeItemId, 'i1', 'de koppeling blijft — de post bestaat nog');
});

test('betaald ongedaan maken zet de post terug in de maand van de verwachte betaaldatum', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', expectedPaymentDate: '2027-03-05' }), { incomeItemId: 'i1', label: 'F' });
  markInvoicePaid(d, 'p1', 'f1', '2027-03-04', 4_840);
  const r = unmarkInvoicePaid(d, 'p1', 'f1', { incomeItemId: 'i2', label: 'F' });
  assert.equal(r, 'ok');
  assert.deepEqual(d.incomeItems.map((i) => [i.id, i.monthKey, i.amount]), [['i2', '2027-03', 4_840]]);
  assert.equal(d.bureau.projects[0]?.invoices[0]?.paidOn, null);
});

test('een al betaalde factuur maakt geen post aan, ook niet via koppelen', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', paidOn: '2027-01-20', paidAmount: 4_840 }), { incomeItemId: 'i1', label: 'F' });
  assert.equal(d.incomeItems.length, 0);
  assert.equal(linkInvoiceToLedger(d, 'p1', 'f1', 'i2', 'F'), 'betaald');
  assert.equal(d.incomeItems.length, 0);
});

test('tweemaal koppelen maakt geen tweede post', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1' }), null);
  assert.equal(linkInvoiceToLedger(d, 'p1', 'f1', 'i1', 'F'), 'ok');
  assert.equal(linkInvoiceToLedger(d, 'p1', 'f1', 'i2', 'F'), 'al-gekoppeld');
  assert.equal(d.incomeItems.length, 1);
});

test('een post in een afgesloten maand wordt niet aangemaakt', () => {
  const d = withProject();
  d.monthSnapshots.push(frozen('2027-02'));
  assert.equal(addInvoice(d, 'p1', invoice({ id: 'f1', dueDate: '2027-02-14' }), { incomeItemId: 'i1', label: 'F' }), 'afgesloten-maand');
  assert.equal(d.incomeItems.length, 0);
  assert.equal(d.bureau.projects[0]?.invoices.length, 1, 'de factuur zelf staat er wel');
});

test('factuur wijzigen houdt de post in een open maand gelijk; in een afgesloten maand niet', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', dueDate: '2027-02-14' }), { incomeItemId: 'i1', label: 'F' });
  updateInvoice(d, 'p1', 'f1', { amountExVat: 5_000, expectedPaymentDate: '2027-04-01' });
  assert.deepEqual([d.incomeItems[0]?.monthKey, d.incomeItems[0]?.amount], ['2027-04', 6_050]);
  d.monthSnapshots.push(frozen('2027-04'));
  updateInvoice(d, 'p1', 'f1', { amountExVat: 9_000 });
  assert.equal(d.incomeItems[0]?.amount, 6_050, 'een bevroren maand verandert niet');
});

test('een post verwijderen op de prognose ontkoppelt de factuur', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1' }), { incomeItemId: 'i1', label: 'F' });
  d.incomeItems = d.incomeItems.filter((i) => i.id !== 'i1');
  onIncomeItemRemoved(d, 'i1');
  assert.equal(d.bureau.projects[0]?.invoices[0]?.incomeItemId, null);
});

test('een factuur verwijderen neemt haar post in een open maand mee', () => {
  const d = withProject();
  d.incomeItems.push({ id: 'los', monthKey: '2027-02', label: 'Andere inkomst', amount: 100, received: false });
  addInvoice(d, 'p1', invoice({ id: 'f1' }), { incomeItemId: 'i1', label: 'F' });
  removeInvoice(d, 'p1', 'f1');
  assert.deepEqual(d.incomeItems.map((i) => i.id), ['los'], 'alleen de gekoppelde post verdwijnt');
});

// ── Projecten en mijlpalen ────────────────────────────────────────────────────

test('maandmijlpalen: één per maand, samen precies de goedgekeurde prijs incl. uitbreiding', () => {
  const d = draft();
  d.bureau.projects.push(project({
    id: 'p1', plannedStart: '2027-01', plannedEnd: '2027-03', fixedPriceExVat: 10_000,
    extensions: [{ id: 'x1', label: 'Extra', approvedOn: '2027-01-10', amount: 1_000, extraBudgetedHours: null }],
  }));
  assert.equal(addMonthlyMilestones(d, 'p1', ['m1', 'm2', 'm3'], (m) => `Capaciteit ${m}`), 'ok');
  const ms = d.bureau.projects[0]!.milestones;
  assert.deepEqual(ms.map((m) => m.plannedMonth), ['2027-01', '2027-02', '2027-03']);
  assert.equal(Math.round(ms.reduce((s, m) => s + m.amount, 0) * 100) / 100, 11_000);
  assert.deepEqual(ms.map((m) => m.amount), [3_666.67, 3_666.67, 3_666.66], 'afrondingsverschil in de laatste maand');
});

test('maandmijlpalen weigert bij bestaande mijlpalen of te weinig ids', () => {
  const d = draft();
  d.bureau.projects.push(project({ id: 'p1', plannedStart: '2027-01', plannedEnd: '2027-03' }));
  assert.equal(addMonthlyMilestones(d, 'p1', ['m1'], () => ''), 'ids-tekort');
  assert.equal(d.bureau.projects[0]?.milestones.length, 0);
  d.bureau.projects[0]!.milestones.push({ id: 'x', label: '', plannedMonth: '2027-01', amount: 1, realizedOn: null, realizedAmount: null, extensionId: null });
  assert.equal(addMonthlyMilestones(d, 'p1', ['a', 'b', 'c'], () => ''), 'heeft-mijlpalen');
  assert.equal(d.bureau.projects[0]?.milestones.length, 1);
});

test('een uitbreiding intrekken neemt haar mijlpalen mee, de andere niet', () => {
  const d = draft();
  d.bureau.projects.push(project({
    id: 'p1',
    extensions: [{ id: 'x1', label: 'Extra', approvedOn: '2027-01-10', amount: 3_000, extraBudgetedHours: 20 }],
    milestones: [
      { id: 'm1', label: 'Basis', plannedMonth: '2027-02', amount: 12_000, realizedOn: null, realizedAmount: null, extensionId: null },
      { id: 'm2', label: 'Extra', plannedMonth: '2027-05', amount: 3_000, realizedOn: null, realizedAmount: null, extensionId: 'x1' },
    ],
  }));
  assert.equal(removeExtension(d, 'p1', 'x1'), 'ok');
  assert.deepEqual(d.bureau.projects[0]?.milestones.map((m) => m.id), ['m1']);
});

test('een uitbreiding met een gerealiseerde mijlpaal intrekken wordt geweigerd — geleverde omzet blijft', () => {
  const d = draft();
  d.bureau.projects.push(project({
    id: 'p1',
    extensions: [{ id: 'x1', label: 'Extra', approvedOn: '2027-01-10', amount: 5_000, extraBudgetedHours: null }],
    milestones: [{ id: 'm2', label: 'Extra', plannedMonth: '2027-04', amount: 5_000, realizedOn: '2027-04-20', realizedAmount: null, extensionId: 'x1' }],
  }));
  assert.equal(removeExtension(d, 'p1', 'x1'), 'heeft-gerealiseerd');
  assert.equal(d.bureau.projects[0]?.extensions.length, 1);
  assert.equal(d.bureau.projects[0]?.milestones.length, 1);
});

test('een post komt nooit in een voorbije maand: een datum in het verleden zet hem in de huidige', () => {
  const d = withProject();
  addInvoice(d, 'p1', invoice({ id: 'f1', date: '2027-01-05', dueDate: '2027-02-04' }), { incomeItemId: 'i1', label: 'F', notBefore: '2027-03' });
  assert.equal(d.incomeItems[0]?.monthKey, '2027-03');
  updateInvoice(d, 'p1', 'f1', { expectedPaymentDate: '2027-01-15' }, '2027-03');
  assert.equal(d.incomeItems[0]?.monthKey, '2027-03', 'een verwachte datum in het verleden verplaatst de post niet naar januari');
  updateInvoice(d, 'p1', 'f1', { expectedPaymentDate: '2027-05-15' }, '2027-03');
  assert.equal(d.incomeItems[0]?.monthKey, '2027-05');
  markInvoicePaid(d, 'p1', 'f1', '2027-03-10', 4_840);
  unmarkInvoicePaid(d, 'p1', 'f1', { incomeItemId: 'i2', label: 'F', notBefore: '2027-06' });
  assert.equal(d.incomeItems.find((i) => i.id === 'i2')?.monthKey, '2027-06');
});

test('koppelen aan een bestaande post: geen tweede post, en een post hangt aan hoogstens één factuur', () => {
  const d = withProject();
  d.incomeItems.push({ id: 'hand', monthKey: '2027-04', label: 'Vonk termijn (met de hand)', amount: 1_210, received: false });
  addInvoice(d, 'p1', invoice({ id: 'f1', amountExVat: 1_000 }), null);
  addInvoice(d, 'p1', invoice({ id: 'f2', amountExVat: 1_000 }), null);
  assert.equal(linkInvoiceToExistingIncome(d, 'p1', 'f1', 'hand'), 'ok');
  assert.equal(d.incomeItems.length, 1);
  assert.equal(linkInvoiceToExistingIncome(d, 'p1', 'f2', 'hand'), 'post-bezet');
  assert.equal(linkInvoiceToExistingIncome(d, 'p1', 'f1', 'hand'), 'al-gekoppeld');
  assert.equal(linkInvoiceToExistingIncome(d, 'p1', 'f2', 'bestaat-niet'), 'geen-post');
  assert.equal(markInvoicePaid(d, 'p1', 'f1', '2027-04-10', 1_210), 'verwijderd');
  assert.equal(d.incomeItems.length, 0, 'betaald haalt de gekoppelde post weg, zoals bij een aangemaakte');
});

test('een project met uren kan niet weg; zonder uren gaat het weg mét planning en posten, en de kans verliest zijn verwijzing', () => {
  const d = withProject();
  d.bureau.timeEntries.push(timeEntry({ id: 't1', category: 'klantwerk', projectId: 'p1' }));
  assert.equal(removeProject(d, 'p1'), 'heeft-uren');
  assert.equal(d.bureau.projects.length, 1);

  d.bureau.timeEntries = [];
  addInvoice(d, 'p1', invoice({ id: 'f1' }), { incomeItemId: 'i1', label: 'F' });
  d.bureau.plannedWork.push({ id: 'w1', periodKind: 'week', periodKey: '2027-W05', category: 'klantwerk', projectId: 'p1', days: 2 });
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'gewonnen', projectId: 'p1' }));
  assert.equal(removeProject(d, 'p1'), 'ok');
  assert.equal(d.bureau.projects.length, 0);
  assert.equal(d.incomeItems.length, 0);
  assert.equal(d.bureau.plannedWork.length, 0);
  assert.equal(d.bureau.opportunities[0]?.projectId, null);
});

test('een klant met een project kan niet weg', () => {
  const d = withProject();
  assert.equal(removeClient(d, 'klant-a'), 'in-gebruik');
  assert.equal(d.bureau.clients.length, 1);
});

// ── Tijd ──────────────────────────────────────────────────────────────────────

test('klantwerk zonder project wordt geweigerd en schrijft niets', () => {
  const d = withProject();
  assert.equal(addTimeEntry(d, { id: 't1', date: '2027-01-05', category: 'klantwerk', projectId: null, hours: 3, label: null, note: '' }), 'project-ontbreekt');
  assert.equal(addTimeEntry(d, { id: 't1', date: '2027-01-05', category: 'klantwerk', projectId: 'bestaat-niet', hours: 3, label: null, note: '' }), 'project-onbekend');
  assert.equal(d.bureau.timeEntries.length, 0);
});

test('uren buiten (0, 24] worden geweigerd', () => {
  const d = draft();
  for (const hours of [0, -1, 24.5, Number.NaN]) {
    assert.equal(addTimeEntry(d, { id: 't', date: '2027-01-05', category: 'verkoop', projectId: null, hours, label: null, note: '' }), 'uren-ongeldig');
  }
  assert.equal(d.bureau.timeEntries.length, 0);
});

test('een registratie legt de uren per dag van dat jaar vast, en een latere wijziging raakt haar niet', () => {
  const d = withProject();
  d.bureau.goals['2027'] = { ...defaultGoals(2027), hoursPerDay: 8 };
  addTimeEntry(d, { id: 't1', date: '2027-01-05', category: 'klantwerk', projectId: 'p1', hours: 6, label: null, note: '' });
  d.bureau.goals['2027'] = { ...defaultGoals(2027), hoursPerDay: 7 };
  addTimeEntry(d, { id: 't2', date: '2027-01-06', category: 'klantwerk', projectId: 'p1', hours: 7, label: null, note: '' });
  updateTimeEntry(d, 't1', { hours: 4 });
  assert.deepEqual(d.bureau.timeEntries.map((e) => [e.id, e.hours, e.hoursPerDayAtEntry]), [['t1', 4, 8], ['t2', 7, 7]]);
});

test('een niet-klantwerk-registratie bewaart geen project, ook als er een meegegeven wordt', () => {
  const d = withProject();
  addTimeEntry(d, { id: 't1', date: '2027-01-05', category: 'verkoop', projectId: 'p1', hours: 2, label: null, note: '' });
  assert.equal(d.bureau.timeEntries[0]?.projectId, null);
});

// ── Kans → project ────────────────────────────────────────────────────────────

const convertInput = { name: 'Vonk — workflow', offerType: 'workflowtraject' as const, fixedPriceExVat: 18_000, plannedStart: '2027-03', plannedEnd: '2027-05', scope: '', clientId: null, newClientName: 'Vonk' };

test('een gewonnen kans wordt precies één project, met klant en wederzijdse verwijzing', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'gewonnen' }));
  const r = convertOpportunity(d, 'o1', convertInput, { projectId: 'p1', clientId: 'c1' }, '2027-02-20');
  assert.equal(r, 'ok');
  assert.equal(d.bureau.projects.length, 1);
  assert.equal(d.bureau.projects[0]?.opportunityId, 'o1');
  assert.equal(d.bureau.opportunities[0]?.projectId, 'p1');
  assert.deepEqual(d.bureau.clients, [{ id: 'c1', name: 'Vonk', groupId: null }]);
  assert.equal(d.bureau.projects[0]?.milestones.length, 0, 'geen verzonnen omzetplanning');
});

test('tweede conversie: al-omgezet, geen tweede project en geen tweede klant', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'gewonnen' }));
  convertOpportunity(d, 'o1', convertInput, { projectId: 'p1', clientId: 'c1' }, '2027-02-20');
  const r = convertOpportunity(d, 'o1', convertInput, { projectId: 'p2', clientId: 'c2' }, '2027-02-21');
  assert.equal(r, 'al-omgezet');
  assert.equal(d.bureau.projects.length, 1);
  assert.equal(d.bureau.clients.length, 1);
});

test('een project dat al naar de kans verwijst blokkeert conversie, ook als de kans zijn verwijzing kwijt is', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'gewonnen', projectId: null }));
  d.bureau.projects.push(project({ id: 'p0', opportunityId: 'o1' }));
  assert.equal(convertOpportunity(d, 'o1', convertInput, { projectId: 'p1', clientId: 'c1' }, '2027-02-20'), 'al-omgezet');
  assert.equal(d.bureau.projects.length, 1);
});

test('een voorstel is geen getekend werk: conversie geweigerd', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'voorstel', expectedValue: 20_000 }));
  assert.equal(convertOpportunity(d, 'o1', convertInput, { projectId: 'p1', clientId: 'c1' }, '2027-02-20'), 'niet-gewonnen');
  assert.equal(d.bureau.projects.length, 0);
});

test('stadiumwissel voegt toe aan de historie en herschrijft haar nooit; verliesreden wordt bewaard', () => {
  const d = draft();
  d.bureau.opportunities.push(opportunity({ id: 'o1', stage: 'contact', createdAt: '2027-01-02' }));
  moveOpportunityStage(d, 'o1', 'gesprek', '2027-01-10', null);
  moveOpportunityStage(d, 'o1', 'gesprek', '2027-01-11', null); // geen wissel, geen regel
  moveOpportunityStage(d, 'o1', 'verloren', '2027-02-01', 'Budget naar volgend jaar');
  const o = d.bureau.opportunities[0]!;
  assert.deepEqual(o.history.map((h) => [h.stage, h.on]), [['contact', '2027-01-02'], ['gesprek', '2027-01-10'], ['verloren', '2027-02-01']]);
  assert.equal(o.outcomeReason, 'Budget naar volgend jaar');
});
