/**
 * Tegenproef voor de rekenkern van een rit — een pakketreeks door de accumulator, zonder erg
 * en zonder hartslagband.
 *
 * De twee gemeten gevallen uit de functionele review staan er als eigen test in: een
 * hartslag-update mag de roeigemiddelden niet verschuiven (F7), en een toestelteller die
 * opnieuw begint mag de rit niet achteruit laten lopen (F9). Beide hebben hun tegenproef
 * ernaast — zonder die is niet te zien of de opstelling het defect überhaupt kán opwekken.
 *
 * Draaien: `node --test lib/sessionAccumulator.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSession,
  mean,
  readCounter,
  step,
  takeSplitInterval,
  emptyCounter,
} from './sessionAccumulator.ts';
import type { RowerMetrics } from './ble/types.ts';

const LEEG: RowerMetrics = {
  strokeRate: null,
  strokeCount: null,
  totalDistance: null,
  instantaneousPace: null,
  averagePace: null,
  instantaneousPower: null,
  averagePower: null,
  resistanceLevel: null,
  heartRate: null,
  metabolicEquivalent: null,
  elapsedTime: null,
  remainingTime: null,
};

const pakket = (over: Partial<RowerMetrics>): RowerMetrics => ({ ...LEEG, ...over });
const OPTIES = { weightKg: 75, collectHr: true };

test('F7: het gemeten geval — 100 W en 200 W geven 150 W', () => {
  const s = createSession();
  step(s, pakket({ instantaneousPower: 100 }), null, OPTIES);
  step(s, pakket({ instantaneousPower: 200 }), null, OPTIES);
  assert.equal(mean(s.watts), 150);
  assert.equal(s.watts.count, 2);
});

test('F7: een hartslag-update tussendoor verschuift het gemiddelde niet', () => {
  // De hook roept `step` alléén aan voor een nieuw roeipakket; een hartslag-update leidt tot
  // een nieuwe waarde in `hr`, niet tot een extra stap. Dezelfde reeks, drie hartslagen.
  const s = createSession();
  step(s, pakket({ instantaneousPower: 100 }), 140, OPTIES);
  step(s, pakket({ instantaneousPower: 200 }), 145, OPTIES);
  assert.equal(mean(s.watts), 150, 'de roeigemiddelden zijn niet met de hartslag meegeschoven');
  assert.equal(s.heartRate.count, 2, 'hartslag wordt op de cadans van de pakketten bemonsterd');
  assert.equal(mean(s.heartRate), 142.5);
});

test('F7 tegenproef: hetzelfde pakket twee keer stappen geeft wél 167 W', () => {
  // Dit is wat er vóór de fix gebeurde: het effect draaide opnieuw op een hartslag-update en
  // telde het laatste roeipakket nog een keer mee. Zonder deze test is niet te zien dat de
  // opstelling het defect kán opwekken.
  const s = createSession();
  const tweede = pakket({ instantaneousPower: 200 });
  step(s, pakket({ instantaneousPower: 100 }), null, OPTIES);
  step(s, tweede, null, OPTIES);
  step(s, tweede, null, OPTIES); // de dubbele telling
  assert.equal(Math.round(mean(s.watts)!), 167);
});

test('F9: het gemeten geval — een teller die opnieuw begint laat de afstand niet dalen', () => {
  const s = createSession();
  step(s, pakket({ totalDistance: 500, elapsedTime: 100 }), null, OPTIES);
  step(s, pakket({ totalDistance: 520, elapsedTime: 104 }), null, OPTIES);
  assert.equal(s.distanceMeters, 20);

  // De erg gaat uit en aan: de teller herstart op 3.
  step(s, pakket({ totalDistance: 3, elapsedTime: 1 }), null, OPTIES);
  assert.equal(s.distanceMeters, 20, 'de nieuwe reeks telt bovenop wat er stond');
  assert.ok(s.seconds >= 4, 'ook de tijd gaat niet achteruit');

  step(s, pakket({ totalDistance: 23, elapsedTime: 5 }), null, OPTIES);
  assert.equal(s.distanceMeters, 40);
});

test('F9 tegenproef: zonder resetdetectie zou de afstand negatief worden', () => {
  // De oude rekenwijze, letterlijk: huidige lezing min de lezing bij de start.
  const startLezing = 500;
  assert.equal(3 - startLezing, -497, 'dít is wat er op het scherm zou komen te staan');
  // En de nieuwe, op dezelfde lezingen.
  const c = emptyCounter();
  readCounter(c, 500);
  readCounter(c, 520);
  assert.equal(readCounter(c, 3), 20);
});

test('F9: een pakket zonder afstandsveld na de reset breekt de reeks niet', () => {
  // `mergeMetrics` in ble-service houdt oude velden vast, dus na een reconnect kan er een
  // pakket binnenkomen waarin de afstand ontbreekt of nog de oude waarde draagt.
  const s = createSession();
  step(s, pakket({ totalDistance: 500, elapsedTime: 100 }), null, OPTIES);
  step(s, pakket({ totalDistance: 520, elapsedTime: 104 }), null, OPTIES);
  step(s, pakket({ elapsedTime: 105 }), null, OPTIES); // geen afstand
  assert.equal(s.distanceMeters, 20);
  step(s, pakket({ totalDistance: 10, elapsedTime: 2 }), null, OPTIES);
  assert.equal(s.distanceMeters, 20);
});

test('de samples blijven monotoon over een tellerreset heen', () => {
  const s = createSession();
  for (let i = 0; i <= 5; i++) {
    step(s, pakket({ totalDistance: 100 + i * 5, elapsedTime: 10 + i }), null, OPTIES);
  }
  for (let i = 0; i <= 5; i++) {
    step(s, pakket({ totalDistance: i * 5, elapsedTime: i }), null, OPTIES);
  }
  assert.ok(s.samples.length >= 2);
  for (let i = 1; i < s.samples.length; i++) {
    assert.ok(s.samples[i].t >= s.samples[i - 1].t, `t daalt op index ${i}`);
    assert.ok(s.samples[i].d >= s.samples[i - 1].d, `d daalt op index ${i}`);
  }
});

test('slagen gaan nooit achteruit, ook niet bij een reset', () => {
  const s = createSession();
  step(s, pakket({ strokeCount: 40 }), null, OPTIES);
  step(s, pakket({ strokeCount: 62 }), null, OPTIES);
  assert.equal(s.totalStrokes, 22);
  step(s, pakket({ strokeCount: 2 }), null, OPTIES);
  assert.equal(s.totalStrokes, 22);
  step(s, pakket({ strokeCount: 5 }), null, OPTIES);
  assert.equal(s.totalStrokes, 25);
});

test('zonder toestemming komt er geen hartslag binnen, uit welke bron ook', () => {
  const zonder = createSession();
  const opties = { weightKg: 75, collectHr: false };
  // Beide bronnen tegelijk: de band én de hartslag van de erg zelf.
  step(zonder, pakket({ totalDistance: 5, elapsedTime: 1, heartRate: 150 }), 148, opties);
  assert.equal(zonder.heartRate.count, 0);
  assert.equal(zonder.maxHeartRate, 0);
  assert.ok(zonder.samples.every((x) => x.hr === undefined), 'geen derde element in de samples');

  // Positieve controle op dezelfde invoer: mét toestemming staat hij er wél.
  const met = createSession();
  step(met, pakket({ totalDistance: 5, elapsedTime: 1, heartRate: 150 }), 148, OPTIES);
  assert.equal(met.heartRate.count, 1);
  assert.equal(mean(met.heartRate), 148, 'de band wint van de hartslag van de erg');
  assert.equal(met.samples[0].hr, 148);
});

test('de erg-hartslag is de terugval, niet de eerste keuze', () => {
  const s = createSession();
  step(s, pakket({ totalDistance: 5, elapsedTime: 1, heartRate: 150 }), null, OPTIES);
  assert.equal(mean(s.heartRate), 150);
});

test('twee idle-packets zetten de live-waarden op nul, één niet', () => {
  const s = createSession();
  step(s, pakket({ instantaneousPower: 180, strokeRate: 26, instantaneousPace: 120, totalDistance: 100 }), null, OPTIES);

  // Eén idle-packet mét bewegende afstand: een recovery, geen stilstand.
  const eerste = step(s, pakket({ totalDistance: 105 }), null, OPTIES);
  assert.equal(eerste.wattsSmoothed, undefined, 'nog niet genuld');

  const tweede = step(s, pakket({ totalDistance: 110 }), null, OPTIES);
  assert.equal(tweede.wattsSmoothed, 0);
  assert.equal(tweede.spmSmoothed, 0);
  // Split níet op 0 — dat zou "oneindig snel" betekenen.
  assert.equal(tweede.splitSmoothed, Infinity);
});

test('een stilstaand vliegwiel nult meteen, zonder op een tweede packet te wachten', () => {
  const s = createSession();
  step(s, pakket({ instantaneousPower: 180, strokeRate: 26, totalDistance: 100 }), null, OPTIES);
  // Zelfde afstand als het vorige packet: de teller staat stil, dus dit is écht stilstand.
  const uit = step(s, pakket({ totalDistance: 100 }), null, OPTIES);
  assert.equal(uit.wattsSmoothed, 0);
});

test('het split-interval leest en leegt in één handeling', () => {
  const s = createSession();
  step(s, pakket({ instantaneousPower: 100 }), null, OPTIES);
  step(s, pakket({ instantaneousPower: 200 }), null, OPTIES);

  assert.equal(takeSplitInterval(s), 150);
  assert.equal(takeSplitInterval(s), undefined, 'leeg na het lezen');
  // De sessiesom blijft staan: alleen het interval wordt geleegd.
  assert.equal(mean(s.watts), 150);
  assert.equal(s.watts.count, 2);
});

test('het aantal pakketten telt roeimetingen, geen hartslagen', () => {
  const s = createSession();
  step(s, pakket({ instantaneousPower: 100 }), 140, OPTIES);
  step(s, pakket({ instantaneousPower: 110 }), 141, OPTIES);
  assert.equal(s.packets, 2);
});

test('calorieën tellen per interval op, niet per pakket', () => {
  const s = createSession();
  // Twee seconden roeien levert nog geen interval op.
  step(s, pakket({ instantaneousPower: 200, elapsedTime: 0, totalDistance: 0 }), null, OPTIES);
  const vroeg = step(s, pakket({ instantaneousPower: 200, elapsedTime: 2, totalDistance: 8 }), null, OPTIES);
  assert.equal(vroeg.calories, undefined);

  const laat = step(s, pakket({ instantaneousPower: 200, elapsedTime: 6, totalDistance: 24 }), null, OPTIES);
  assert.ok(typeof laat.calories === 'number' && laat.calories > 0);
});
