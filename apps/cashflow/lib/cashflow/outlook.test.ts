import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cashOutlook } from './outlook.ts';
import { buildWeeklyCashPlan } from '../bureau/weekly-cash.ts';
import { emptyBureau } from '../bureau/normalize.ts';
import { month, pot, subtotals } from '../bureau/testing.ts';
import type { MonthData } from './types.ts';

/**
 * Vandaag woensdag 13 januari 2027 (W02). Januari en februari eindigen op een zondag, dus beide
 * maandeinden vallen binnen de horizon.
 *
 * Januari (anker, bank 5.000): vast 1.000 → Vrij 4.000, geen pot.
 * Februari: vast 1.000, inkomsten 500 → Vrij 3.500. Het laagste punt is dus februari.
 */
const ASOF = '2027-01-13';

function scenario(over: { febRecurring?: number; febIncoming?: number; febProvisions?: number; janPot?: number } = {}) {
  const januari: MonthData = month('2027-01', {
    startBalance: 5_000,
    reservationPots: over.janPot === undefined ? [] : [pot({ reservationId: 'buffer', isDeficitBuffer: true, potBalance: over.janPot })],
    subtotals: subtotals({ basis: 'bank', incoming: 5_000, recurring: 1_000, buffer: over.janPot ?? 0 }),
  });
  const februari: MonthData = month('2027-02', {
    startBalance: januari.endBalance,
    totalIncome: over.febIncoming ?? 500,
    subtotals: subtotals({
      basis: 'vrij',
      incoming: januari.endBalance + (over.febIncoming ?? 500),
      recurring: over.febRecurring ?? 1_000,
      provisions: over.febProvisions ?? 0,
    }),
  });
  const months = [januari, februari];
  return { months, plan: buildWeeklyCashPlan({ asOf: ASOF, months, incomeItems: [], bureau: emptyBureau() }) };
}

test('het laagste punt is de laagste Buffer, met vrij en bufferpot ernaast', () => {
  const { plan, months } = scenario();
  const uit = cashOutlook(plan, months);
  assert.equal(uit.kind, 'ok');
  if (uit.kind !== 'ok') return;
  assert.deepEqual([uit.maandKey, uit.buffer, uit.vrij, uit.bufferPot, uit.gedekt], ['2027-02', 3_500, 3_500, 0, true]);
});

test('oorzaak: de kop met het grootste verschil tegenover de maand ervóór', () => {
  // Februari: vaste kosten 1.000 → 1.400 (+400), inkomsten 4.000 → 4.700 (+700 door een hoger vorig saldo
  // plus 500 inkomsten). Inkomsten winnen, en dat is precies het verschil dat de daling verklaart.
  const { plan, months } = scenario({ febRecurring: 1_400 });
  const uit = cashOutlook(plan, months);
  assert.deepEqual(uit.kind === 'ok' ? uit.oorzaak : null, { soort: 'verschil', kop: 'inkomsten', delta: -500, vorigeMaand: '2027-01' });
});

test('tegenproef: een grotere sprong in een andere kop wint, en de kaart noemt die', () => {
  // Zelfde scenario, maar met 3.000 provisies in februari: dat verschil (+3.000) is groter dan de 500
  // van de inkomsten. Kiest de functie nog steeds "inkomsten", dan kijkt ze niet naar de koppen.
  const { plan, months } = scenario({ febProvisions: 3_000 });
  assert.deepEqual(cashOutlook(plan, months).kind === 'ok' ? (cashOutlook(plan, months) as { oorzaak: unknown }).oorzaak : null, {
    soort: 'verschil',
    kop: 'provisies',
    delta: 3_000,
    vorigeMaand: '2027-01',
  });
});

test('is het laagste punt de eerste maand, dan is er geen vorige maand: de grootste kostenkop', () => {
  // Februari krijgt 4.000 inkomsten erbij, dus januari (4.000) is het laagste punt. Januari heeft
  // alleen vaste kosten; die worden genoemd, zonder vergelijking met een maand die er niet is.
  const { plan, months } = scenario({ febIncoming: 4_000 });
  const uit = cashOutlook(plan, months);
  assert.equal(uit.kind === 'ok' ? uit.maandKey : null, '2027-01');
  assert.deepEqual(uit.kind === 'ok' ? uit.oorzaak : null, { soort: 'grootste-kost', kop: 'vast', bedrag: 1_000 });
});

test('een tekort leest als niet gedekt; een bufferpot telt mee in de Buffer', () => {
  const { plan, months } = scenario({ febRecurring: 9_000 });
  const uit = cashOutlook(plan, months);
  assert.equal(uit.kind === 'ok' ? uit.gedekt : null, false);
  assert.equal(uit.kind === 'ok' ? uit.buffer : null, -4_500);

  // Dezelfde opstelling, nu veegt januari 2.000 naar de bufferpot: Vrij zakt naar 2.000, maar de
  // Buffer blijft 4.000 — het geld is niet weg, het staat in de pot. Februari opent dus op 2.000.
  const metPot = scenario({ janPot: 2_000 });
  assert.deepEqual(metPot.plan.monthEnds[0], { monthKey: '2027-01', closingFree: 2_000, bufferPot: 2_000, buffer: 4_000 });
  const potUit = cashOutlook(metPot.plan, metPot.months);
  assert.deepEqual(potUit.kind === 'ok' ? [potUit.maandKey, potUit.vrij, potUit.buffer] : null, ['2027-02', 1_500, 1_500]);
});

test('leeg document en geen maand binnen de horizon hebben hun eigen uitkomst, geen € 0', () => {
  const leeg = buildWeeklyCashPlan({ asOf: ASOF, months: [], incomeItems: [], bureau: emptyBureau() });
  assert.deepEqual(cashOutlook(leeg, []), { kind: 'leeg' });

  // Eén maand die binnen de horizon begínt maar erbuiten eindigt: 13 weken vanaf 13 januari lopen tot
  // 11 april, dus april draagt wel regels (zijn kosten vallen in de eerste aprilweek) maar geen einde.
  const april = month('2027-04', { startBalance: 1_000, subtotals: subtotals({ basis: 'bank', incoming: 1_000, recurring: 100 }) });
  const plan = buildWeeklyCashPlan({ asOf: ASOF, months: [april], incomeItems: [], bureau: emptyBureau() });
  assert.equal(plan.weeks.some((w) => w.lines.length > 0), true, 'het plan is niet leeg');
  assert.deepEqual(plan.monthEnds, []);
  assert.deepEqual(cashOutlook(plan, [april]), { kind: 'geen-maand' });
});
