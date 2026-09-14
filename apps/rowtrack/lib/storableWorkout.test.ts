/**
 * Tegenproef voor `isWorthSaving`, beide kanten: ritten die bewaard MOETEN worden, en de
 * vorm die tot 2026-09-14 door de guard heen kwam.
 *
 * Het derde geval is geen verzonnen invoer maar de rit die het BACKLOG-item aanwees:
 * 2026-08-22 12:40:57, 0 m, 0 s, één sample, gemiddelde hartslag 90. Die had één tick — een
 * hartslagpakket — en passeerde daarmee de oude `tickCount`-guard.
 *
 * Draaien: `node --test lib/storableWorkout.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isWorthSaving } from './storableWorkout.ts';

test('een echte rit wordt bewaard', () => {
  assert.equal(isWorthSaving(5000, 1124), true);
  // De kortste rit die nog iets toont: één meter, één seconde.
  assert.equal(isWorthSaving(1, 1), true);
});

test('de rit uit de historiek van 2026-08-22 wordt niet bewaard', () => {
  // 0 m, 0 s — mét hartslagdata, dus mét ticks. Dit is het geval dat de oude guard miste.
  assert.equal(isWorthSaving(0, 0), false);
});

test('één van beide op nul is ook geen rit', () => {
  // Op de erg zitten zonder te trekken: de klok loopt, de afstand niet.
  assert.equal(isWorthSaving(0, 90), false);
  // Omgekeerd kan in de praktijk niet, maar de regel hoort symmetrisch te zijn.
  assert.equal(isWorthSaving(120, 0), false);
});

test('afronden gebeurt zoals het opslagpad het doet', () => {
  // 0,4 m landt als 0 in de integer-kolom; dan is de rit ná opslag leeg en hoort hij hier
  // al leeg te heten. 0,6 m rondt naar 1 en is dus wél iets.
  assert.equal(isWorthSaving(0.4, 30), false);
  assert.equal(isWorthSaving(0.6, 30), true);
});

test('een kapot pakket levert geen rit op', () => {
  assert.equal(isWorthSaving(NaN, 30), false);
  assert.equal(isWorthSaving(1000, NaN), false);
  assert.equal(isWorthSaving(Infinity, 30), false);
});
