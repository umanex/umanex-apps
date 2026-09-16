import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptyInvoiceDraft, invoiceFromDraft, invoiceStatus, ledgerState, projectCash } from './invoice-draft.ts';
import { invoice, project } from './testing.ts';

test('standaard: 30 dagen termijn, 21 % btw, meteen in de prognose', () => {
  assert.deepEqual(emptyInvoiceDraft('2027-01-15'), {
    label: '', kind: 'termijn', date: '2027-01-15', amountExVat: '', vatRate: '21', dueDate: '2027-02-14', expectedPaymentDate: '', toLedger: true,
  });
});

test('geldig: Belgische notatie, lege verwachte datum blijft onbekend', () => {
  const r = invoiceFromDraft({ ...emptyInvoiceDraft('2027-01-15'), label: '2027-004', amountExVat: '4.000' });
  assert.equal(r.ok, true);
  if (r.ok) assert.deepEqual([r.invoice.amountExVat, r.invoice.vatRate, r.invoice.expectedPaymentDate, r.invoice.paidOn, r.toLedger], [4_000, 21, null, null, true]);
});

test('geweigerd: geen omschrijving, bedrag 0, btw buiten 0–100, vervaldatum vóór de factuurdatum', () => {
  const r = invoiceFromDraft({ ...emptyInvoiceDraft('2027-01-15'), amountExVat: '0', vatRate: '121', dueDate: '2027-01-01' });
  assert.deepEqual(Object.keys(!r.ok ? r.errors : {}).sort(), ['amountExVat', 'dueDate', 'label', 'vatRate']);
});

test('stand tegenover de prognose: in een (afgesloten) maand, niet, of betaald en weg', () => {
  const posten = [{ id: 'i1', monthKey: '2027-02', label: 'x', amount: 4_840, received: false }];
  const open = new Set<string>();
  assert.deepEqual(ledgerState(invoice({ id: 'f', incomeItemId: 'i1' }), posten, open), { kind: 'in-prognose', monthKey: '2027-02', frozen: false });
  assert.deepEqual(ledgerState(invoice({ id: 'f', incomeItemId: 'i1' }), posten, new Set(['2027-02'])), { kind: 'in-prognose', monthKey: '2027-02', frozen: true });
  assert.deepEqual(ledgerState(invoice({ id: 'f', incomeItemId: 'weg' }), posten, open), { kind: 'niet-in-prognose' });
  assert.deepEqual(ledgerState(invoice({ id: 'f', paidOn: '2027-02-10' }), posten, open), { kind: 'betaald-uit-prognose' });
});

test('status: vervallen hangt aan de vervaldatum, niet aan de verwachte betaaldatum', () => {
  assert.deepEqual(invoiceStatus(invoice({ id: 'f', dueDate: '2027-02-14', expectedPaymentDate: '2027-03-30' }), '2027-03-01'), { kind: 'vervallen', since: '2027-02-14' });
  assert.deepEqual(invoiceStatus(invoice({ id: 'f', dueDate: '2027-02-14' }), '2027-02-14'), { kind: 'open', due: '2027-02-14' });
  assert.deepEqual(invoiceStatus(invoice({ id: 'f', paidOn: '2027-02-20' }), '2027-03-01'), { kind: 'betaald', on: '2027-02-20' });
});

test('cash per project: een betaling verplaatst van openstaand naar ontvangen, het gefactureerde blijft', () => {
  const p = project({ id: 'p', invoices: [invoice({ id: 'a', amountExVat: 4_000 }), invoice({ id: 'b', amountExVat: 1_000, paidOn: '2027-02-01', paidAmount: 1_200 })] });
  assert.deepEqual(projectCash(p), { invoiced: 6_050, received: 1_200, outstanding: 4_840, count: 2 });
});
