import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashOutlook } from './outlook.ts';
import { buildWeeklyCashPlan } from '../bureau/weekly-cash.ts';
import { emptyBureau } from '../bureau/normalize.ts';
import { month, pot, subtotals } from '../bureau/testing.ts';
import type { MonthData } from './types.ts';

/**
 * Vandaag woensdag 13 januari 2027 (W02). Januari, februari en maart eindigen binnen dertien weken.
 * Januari is de ankermaand: zijn subtotalen dragen standen ("wat moet er nog van het banksaldo af"),
 * februari en maart dragen stromen. De kaart mag die twee nooit van elkaar aftrekken.
 */
const ASOF = '2027-01-13';

type MaandOpzet = {
  bank?: boolean;
  start?: number;
  inkomsten?: number;
  vast?: number;
  eenmalig?: number;
  budgetten?: number;
  provisies?: number;
  potten?: MonthData['reservationPots'];
  buffer?: number;
};

function maak(monthKey: string, o: MaandOpzet): MonthData {
  const start = o.start ?? 0;
  const inkomsten = o.inkomsten ?? 0;
  return month(monthKey, {
    startBalance: start,
    totalIncome: inkomsten,
    reservationPots: o.potten ?? [],
    subtotals: subtotals({
      basis: o.bank ? 'bank' : 'vrij',
      incoming: start + inkomsten,
      recurring: o.vast ?? 0,
      oneOff: o.eenmalig ?? 0,
      budgets: o.budgetten ?? 0,
      provisions: o.provisies ?? 0,
      buffer: o.buffer ?? 0,
    }),
  });
}

function plan(months: MonthData[]) {
  return buildWeeklyCashPlan({ asOf: ASOF, months, incomeItems: [], bureau: emptyBureau() });
}

test('het laagste punt is de laagste Buffer, met vrij en bufferpot ernaast', () => {
  const jan = maak('2027-01', { bank: true, start: 5_000, vast: 1_000 });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 500, vast: 1_000 });
  const uit = cashOutlook(plan([jan, feb]), [jan, feb]);
  assert.equal(uit.kind, 'ok');
  if (uit.kind !== 'ok') return;
  assert.deepEqual([uit.maandKey, uit.buffer, uit.vrij, uit.bufferPot, uit.gedekt], ['2027-02', 3_500, 3_500, 0, true]);
});

test('oorzaak: grootste verschil tussen twee maanden op vrije basis, op de eigen inkomsten', () => {
  // Februari en maart hebben allebei 1.000 vaste kosten; maart mist 500 inkomsten en betaalt 200 meer
  // eenmalig. Het grootste verschil is dus inkomsten −500 — niet het doorgerolde saldo, dat veel
  // groter is (februari eindigt op 3.300, maart opent daarmee).
  const jan = maak('2027-01', { bank: true, start: 5_000, vast: 1_000 });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 500, vast: 1_000, eenmalig: 200 });
  const mrt = maak('2027-03', { start: feb.endBalance, inkomsten: 0, vast: 1_000, eenmalig: 400 });
  const uit = cashOutlook(plan([jan, feb, mrt]), [jan, feb, mrt]);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-03');
  assert.deepEqual(uit.kind === 'ok' ? uit.oorzaak : null, { soort: 'verschil', kop: 'inkomsten', delta: -500, vorigeMaand: '2027-02' });
});

test('tegenproef: een grotere sprong in een kostenkop wint van de inkomsten', () => {
  const jan = maak('2027-01', { bank: true, start: 5_000, vast: 1_000 });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 500, vast: 1_000 });
  const mrt = maak('2027-03', { start: feb.endBalance, inkomsten: 0, vast: 1_000, provisies: 3_000 });
  assert.deepEqual(cashOutlook(plan([jan, feb, mrt]), [jan, feb, mrt]).kind === 'ok' ? (cashOutlook(plan([jan, feb, mrt]), [jan, feb, mrt]) as { oorzaak: unknown }).oorzaak : null, {
    soort: 'verschil',
    kop: 'provisies',
    delta: 3_000,
    vorigeMaand: '2027-02',
  });
});

test('over de ankergrens wordt niet vergeleken: een gelijke huur mag geen stijging heten', () => {
  // De review van 2026-09-17: de huur van januari staat al afgevinkt, dus de ankerkop toont 0 terwijl
  // februari er 2.000 draagt. Een verschil daartussen zou "vaste uitgaven € 2.000 hoger" melden voor
  // een bedrag dat elke maand gelijk is — en de nieuwe verzekering van 1.000 verzwijgen.
  const jan = maak('2027-01', { bank: true, start: 10_000, inkomsten: 3_000, vast: 0 });
  const feb = maak('2027-02', { start: jan.endBalance, vast: 2_000, eenmalig: 1_000 });
  const uit = cashOutlook(plan([jan, feb]), [jan, feb]);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-02');
  assert.deepEqual(uit.kind === 'ok' ? uit.oorzaak : null, { soort: 'grootste-kost', kop: 'vast', bedrag: 2_000, nogTeBetalen: false });
});

test('in de ankermaand: de provisiekop wordt gecorrigeerd voor wat er al opzij staat', () => {
  // Kop 9.000 = 8.000 opgebouwde stand + 1.000 storting. Zou de stand meetellen, dan won "provisies
  // € 9.000" van de huur; de storting van 1.000 is wat deze maand werkelijk vertrekt.
  const potten = [pot({ reservationId: 'btw', deferredFromPrevious: 8_000, provisionThisMonth: 1_000, potBalance: 9_000 })];
  const jan = maak('2027-01', { bank: true, start: 20_000, inkomsten: 3_000, vast: 2_000, provisies: 9_000, potten });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 20_000, vast: 2_000 });
  const uit = cashOutlook(plan([jan, feb]), [jan, feb]);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-01');
  assert.deepEqual(uit.kind === 'ok' ? uit.oorzaak : null, { soort: 'grootste-kost', kop: 'vast', bedrag: 2_000, nogTeBetalen: true });
});

test('de bufferpot komt nooit als post op de kaart: hij staat er al als bezit', () => {
  // Bufferpot met 10.000 stand; de buffer-kop van de ankermaand draagt die stand. Als post genoemd,
  // zou hetzelfde geld twee keer op de kaart staan — als Buffer bovenaan en als grootste uitgave.
  const potten = [pot({ reservationId: 'buffer', isDeficitBuffer: true, deferredFromPrevious: 10_000, potBalance: 10_000 })];
  const jan = maak('2027-01', { bank: true, start: 20_000, inkomsten: 3_000, vast: 2_000, buffer: 10_000, potten });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 23_000, vast: 2_000 });
  const uit = cashOutlook(plan([jan, feb]), [jan, feb]);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-01');
  const oorzaak = uit.kind === 'ok' ? uit.oorzaak : null;
  assert.equal(oorzaak?.soort === 'grootste-kost' ? oorzaak.kop : null, 'vast');
  assert.equal(uit.kind === 'ok' ? uit.bufferPot : null, 10_000);
});

test('een tekort leest als niet gedekt; een bufferpot telt mee in de Buffer', () => {
  const jan = maak('2027-01', { bank: true, start: 5_000, vast: 1_000 });
  const feb = maak('2027-02', { start: jan.endBalance, inkomsten: 500, vast: 9_000 });
  const uit = cashOutlook(plan([jan, feb]), [jan, feb]);
  assert.equal(uit.kind === 'ok' ? uit.gedekt : null, false);
  assert.equal(uit.kind === 'ok' ? uit.buffer : null, -4_500);

  const potten = [pot({ reservationId: 'buffer', isDeficitBuffer: true, potBalance: 2_000 })];
  const janPot = maak('2027-01', { bank: true, start: 5_000, vast: 1_000, buffer: 2_000, potten });
  const febPot = maak('2027-02', { start: janPot.endBalance, inkomsten: 500, vast: 1_000 });
  const metPot = cashOutlook(plan([janPot, febPot]), [janPot, febPot]);
  assert.deepEqual(plan([janPot, febPot]).monthEnds[0], { monthKey: '2027-01', closingFree: 2_000, bufferPot: 2_000, buffer: 4_000 });
  assert.deepEqual(metPot.kind === 'ok' ? [metPot.maandKey, metPot.vrij, metPot.buffer, metPot.heeftBufferpot] : null, ['2027-02', 1_500, 1_500, true]);
});

test('een pot die pas ná het laagste punt begint, hoort niet in de brug', () => {
  // Het laagste punt ligt in februari; de bufferpot bestaat pas in maart. De kaart toont dan geen
  // brugregel — net als de footers op datzelfde scherm, die "Geen buffer" melden.
  const potten = [pot({ reservationId: 'buffer', isDeficitBuffer: true, potBalance: 500 })];
  const jan = maak('2027-01', { bank: true, start: 5_000, vast: 1_000 });
  const feb = maak('2027-02', { start: jan.endBalance, vast: 1_000 });
  const mrt = maak('2027-03', { start: feb.endBalance, inkomsten: 5_000, vast: 1_000, buffer: 500, potten });
  const uit = cashOutlook(plan([jan, feb, mrt]), [jan, feb, mrt]);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-02');
  assert.equal(uit.kind === 'ok' ? uit.heeftBufferpot : null, false);
});

test('leeg document en geen maand binnen de horizon hebben hun eigen uitkomst, geen € 0', () => {
  assert.deepEqual(cashOutlook(plan([]), []), { kind: 'leeg' });

  // Eén maand die binnen de horizon begínt maar erbuiten eindigt: 13 weken vanaf 13 januari lopen tot
  // 11 april, dus april draagt wel regels maar geen maandeinde. Vanuit de app onbereikbaar (het venster
  // begint altijd bij de ankermaand); de tak bestaat voor een los aangeroepen venster.
  const april = maak('2027-04', { bank: true, start: 1_000, vast: 100 });
  const p = plan([april]);
  assert.equal(p.weeks.some((w) => w.lines.length > 0), true, 'het plan is niet leeg');
  assert.deepEqual(p.monthEnds, []);
  assert.deepEqual(cashOutlook(p, [april]), { kind: 'geen-maand' });
});
