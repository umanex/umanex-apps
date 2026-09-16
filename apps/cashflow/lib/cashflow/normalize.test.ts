/**
 * `normalizeData` na de uitbreiding met `bureau` (store-versie 16).
 *
 * De faalklasse die dit bewaakt: `sync.ts` schrijft alleen de sleutels weg die `emptyData()`
 * teruggeeft. Een sleutel die hier ontbreekt, wordt nooit opgeslagen — zonder foutmelding.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORE_VERSION, emptyData, normalizeData } from './normalize.ts';
import { emptyBureau, normalizeBureau } from '../bureau/normalize.ts';

/** Een realistisch v15-document: alle vijftien sleutels, geen `bureau`. */
const V15 = {
  referenceBalance: 22078.72,
  referenceMonth: '2026-08',
  balanceOverrides: [{ id: 'o1', monthKey: '2026-09', balance: 18000 }],
  expenseItems: [{ id: 'e1', monthKey: '2026-09', label: 'Laptop', amount: 1899, paid: false }],
  incomeItems: [{ id: 'i1', monthKey: '2026-09', label: 'Luminus', amount: 13794, received: false }],
  recurringItems: [{ id: 'r1', label: 'Huur', amount: 950, type: 'expense', frequency: 'monthly', startMonth: '2026-01' }],
  recurringSettlements: [{ id: 's1', recurringId: 'r1', monthKey: '2026-09', paid: true, actualAmount: 950 }],
  reservationSettlements: [{ id: 'rs1', reservationId: 'p1', monthKey: '2026-09', effectiveAmount: 3000, finalized: false }],
  reservations: [{ id: 'p1', label: 'BTW', monthlyAmount: 3000, startMonth: '2026-01', type: 'spaardoel', coversDeficit: false }],
  reservationPayments: [{ id: 'pay1', reservationId: 'p1', monthKey: '2026-09', label: 'Aangifte', invoiceAmount: 8000, fromReservation: 8000, fromCash: 0 }],
  recurringDefers: [{ id: 'd1', recurringId: 'r1', fromMonth: '2026-09', toMonth: '2026-10', paid: false, paidAmount: 0 }],
  reservationDefers: [{ id: 'rd1', reservationId: 'p1', fromMonth: '2026-10', toMonth: '2026-11' }],
  historyStartMonth: '2026-08',
  reopenedMonths: ['2026-08'],
  lastSeenMonth: '2026-09',
};

test('STORE_VERSION is 16', () => {
  assert.equal(STORE_VERSION, 16);
});

test('emptyData draagt 16 sleutels, waaronder bureau — anders slaat sync het nooit op', () => {
  const keys = Object.keys(emptyData());
  assert.equal(keys.length, 16);
  assert.ok(keys.includes('bureau'));
  assert.deepEqual(emptyData().bureau, emptyBureau());
});

test('een v15-document laadt: alle vijftien bestaande sleutels onveranderd, bureau leeg', () => {
  const out = normalizeData(structuredClone(V15));
  for (const [key, value] of Object.entries(V15)) {
    assert.deepEqual(out[key as keyof typeof out], value, `sleutel ${key} veranderde`);
  }
  assert.deepEqual(out.bureau, emptyBureau());
});

test('bureau dat geen object is valt terug op de lege vorm', () => {
  for (const garbage of [42, 'x', null, [], true]) {
    assert.deepEqual(normalizeData({ ...V15, bureau: garbage }).bureau, emptyBureau());
  }
});

test('een lijst die geen array is wordt leeg, en een record zonder id valt weg', () => {
  const b = normalizeBureau({
    projects: 'geen lijst',
    timeEntries: [null, { hours: 3 }, { id: 't1', date: '2027-01-04', category: 'verkoop', hours: 2, hoursPerDayAtEntry: 8, label: null, note: '' }],
  });
  assert.deepEqual(b.projects, []);
  assert.equal(b.timeEntries.length, 1);
  assert.equal(b.timeEntries[0]?.id, 't1');
});

test('onbekende enumwaarden: stadium naar contact, label en aanbod naar null — nooit een verzonnen waarde', () => {
  const b = normalizeBureau({
    opportunities: [{ id: 'o1', stage: 'bijna-binnen', offerType: 'website', createdAt: '2027-01-02' }],
    timeEntries: [{ id: 't1', date: '2027-01-04', category: 'verkoop', hours: 2, label: 'feest' }],
  });
  assert.equal(b.opportunities[0]?.stage, 'contact');
  assert.equal(b.opportunities[0]?.offerType, null);
  assert.equal(b.timeEntries[0]?.label, null);
});

test('een kans zonder historie krijgt precies één overgang: zijn huidige stadium op zijn aanmaakdatum', () => {
  const b = normalizeBureau({ opportunities: [{ id: 'o1', stage: 'voorstel', createdAt: '2027-02-01' }] });
  assert.deepEqual(b.opportunities[0]?.history, [{ stage: 'voorstel', on: '2027-02-01', reason: null }]);
});

test('doelen: ontbrekende velden uit de startwaarden, ingestelde waarden blijven staan — ook als ze niet optellen', () => {
  const b = normalizeBureau({ goals: { '2027': { revenueTarget: 150000, days: { total: 180, perCategory: { klantwerk: 130 } } }, abc: {} } });
  const g = b.goals['2027'];
  assert.ok(g);
  assert.equal(g.revenueTarget, 150000);
  assert.equal(g.days.total, 180);
  assert.equal(g.days.perCategory.klantwerk, 130);
  assert.equal(g.days.perCategory.verkoop, 40); // aangevuld
  assert.equal(g.year, 2027);
  assert.equal(Object.keys(b.goals).length, 1, 'een sleutel die geen jaar is valt weg');
});

test('een uur-per-daginstelling van 0 of negatief is geen rekenconventie en valt terug op 8', () => {
  const b = normalizeBureau({ goals: { '2027': { hoursPerDay: 0 } }, timeEntries: [{ id: 't', date: '2027-01-04', category: 'verkoop', hours: 4, hoursPerDayAtEntry: -1 }] });
  assert.equal(b.goals['2027']?.hoursPerDay, 8);
  assert.equal(b.timeEntries[0]?.hoursPerDayAtEntry, 8);
});
