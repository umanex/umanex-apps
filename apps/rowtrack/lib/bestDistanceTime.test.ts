/**
 * Tegenproef voor `bestTimeForDistance` — de rekenkern achter elk afstandsrecord (2000 m nu,
 * 500 m / 1 km / 5 km zodra die er zijn). Hij is de enige van de drie modules uit het
 * BACKLOG-item die `node --test` vandaag kan laden: hij heeft geen enkele import.
 *
 * Twee kanten per eigenschap, want een test die alleen bevestigt dat er een getal uit komt,
 * meet niets: elk geval hieronder heeft een uitkomst die met de hand na te rekenen is, en
 * daarnaast een geval waarin de module `null` HOORT te geven.
 *
 * Draaien: `node --test lib/bestDistanceTime.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestTimeForDistance, samplesFromTuples, type Sample } from './bestDistanceTime.ts';

/** Constante snelheid: `meters` per seconde over `seconden`, één sample per seconde. */
const gelijkmatig = (seconden: number, mPerSec: number): Sample[] =>
  Array.from({ length: seconden + 1 }, (_, i) => ({ t: i, d: i * mPerSec }));

test('constante snelheid: de tijd volgt rechtstreeks uit de snelheid', () => {
  // 5 m/s over 600 s = 3000 m. 2000 m kost dan exact 400 s, waar het venster ook ligt.
  const r = bestTimeForDistance(gelijkmatig(600, 5), 2000);
  assert.ok(r !== null);
  assert.ok(Math.abs(r - 400) < 1e-6, `verwacht 400, kreeg ${r}`);
});

test('te korte sessie geeft null, geen nul', () => {
  // 1500 m gevaren, 2000 m gevraagd. Nul zou hier als een wereldrecord lezen.
  assert.equal(bestTimeForDistance(gelijkmatig(300, 5), 2000), null);
  assert.equal(bestTimeForDistance([], 2000), null);
  assert.equal(bestTimeForDistance([{ t: 0, d: 0 }], 2000), null);
});

test('het snelste venster wordt gevonden, niet het eerste', () => {
  // Eerst 1000 m traag (2 m/s, 500 s), dan 2000 m snel (5 m/s, 400 s), dan weer traag.
  const s: Sample[] = [];
  let t = 0, d = 0;
  for (let i = 0; i < 500; i++) { s.push({ t: t++, d }); d += 2; }
  for (let i = 0; i < 400; i++) { s.push({ t: t++, d }); d += 5; }
  for (let i = 0; i < 200; i++) { s.push({ t: t++, d }); d += 2; }
  s.push({ t, d });
  const r = bestTimeForDistance(s, 2000);
  assert.ok(r !== null);
  // Het snelle stuk is exact 2000 m in 400 s. Een venster dat het trage deel meeneemt is trager.
  assert.ok(Math.abs(r - 400) < 1, `verwacht ~400, kreeg ${r}`);
});

test('interpolatie: het doel hoeft niet op een sample te vallen', () => {
  // Samples om de 7 meter — 2000 valt nooit precies op een punt.
  const s: Sample[] = Array.from({ length: 400 }, (_, i) => ({ t: i * 1.4, d: i * 7 }));
  const r = bestTimeForDistance(s, 2000);
  assert.ok(r !== null);
  // 7 m per 1,4 s = 5 m/s, dus 2000 m = 400 s. Interpolatie hoort dat exact te halen.
  assert.ok(Math.abs(r - 400) < 1e-6, `verwacht 400, kreeg ${r}`);
});

test('een BLE-dropout wordt niet overspannen', () => {
  // 1000 m gevaren, dan 60 s stilte waarin het toestel 1500 m verder springt, dan 1000 m.
  // Een venster dat het gat overspant zou 2000 m in bijna geen tijd "halen".
  const s: Sample[] = [];
  for (let i = 0; i <= 200; i++) s.push({ t: i, d: i * 5 });      // 1000 m in 200 s
  for (let i = 0; i <= 200; i++) s.push({ t: 260 + i, d: 2500 + i * 5 }); // sprong
  const r = bestTimeForDistance(s, 2000);
  // Geen enkele ononderbroken run haalt 2000 m: beide runs zijn 1000 m.
  assert.equal(r, null);
});

test('samplesFromTuples leest beide tuple-vormen', () => {
  assert.deepEqual(samplesFromTuples([[0, 0], [1, 5]]), [{ t: 0, d: 0 }, { t: 1, d: 5 }]);
  assert.deepEqual(samplesFromTuples([[0, 0, 120]]), [{ t: 0, d: 0, hr: 120 }]);
  assert.deepEqual(samplesFromTuples(null), []);
  assert.deepEqual(samplesFromTuples(undefined), []);
});

test('een doel van nul of negatief is geen vraag', () => {
  assert.equal(bestTimeForDistance(gelijkmatig(600, 5), 0), null);
  assert.equal(bestTimeForDistance(gelijkmatig(600, 5), -100), null);
});
