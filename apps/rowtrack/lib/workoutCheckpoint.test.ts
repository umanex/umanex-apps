/**
 * Tegenproef voor het herstelpunt: wat er bewaard wordt, wanneer, en wat ervan terugkomt.
 *
 * De kern is dat een herstelde rit door exact dezelfde rij-bouwer loopt als een gewone. Deze
 * suite toetst dat door een echte sessie te vullen, hem door het herstelpunt te halen en de
 * uitkomst te vergelijken met de rij die dezelfde sessie rechtstreeks oplevert.
 *
 * Draaien: `node --test lib/workoutCheckpoint.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkpointHasHealthData,
  checkpointSummary,
  checkpointToRowInput,
  isWorthRecovering,
  parseCheckpoint,
  stripCheckpointHealthData,
  shouldWriteCheckpoint,
  CHECKPOINT_INTERVAL_S,
  CHECKPOINT_VERSION,
  type Checkpoint,
} from './workoutCheckpoint.ts';
import { createSession, step, type Session } from './sessionAccumulator.ts';
import { buildWorkoutRow } from './workoutRow.ts';
import { EMPTY_BASELINE } from './personalRecords.ts';
import type { RowerMetrics } from './ble/types.ts';

const LEEG: RowerMetrics = {
  strokeRate: null, strokeCount: null, totalDistance: null, instantaneousPace: null,
  averagePace: null, instantaneousPower: null, averagePower: null, resistanceLevel: null,
  heartRate: null, metabolicEquivalent: null, elapsedTime: null, remainingTime: null,
};

/** Een sessie zoals hij er na een paar minuten roeien uitziet. */
function geredenSessie(): Session {
  const s = createSession();
  for (let i = 1; i <= 120; i++) {
    step(s, {
      ...LEEG,
      instantaneousPower: 180 + (i % 5),
      strokeRate: 26,
      instantaneousPace: 118,
      strokeCount: i * 2,
      totalDistance: i * 5,
      elapsedTime: i,
      heartRate: 140,
    }, 142, { weightKg: 75, collectHr: true });
  }
  return s;
}

const maakCheckpoint = (over: Partial<Checkpoint> = {}): Checkpoint => ({
  version: CHECKPOINT_VERSION,
  userId: 'u1',
  startedAt: '2026-09-16T18:00:00.000Z',
  session: geredenSessie(),
  goal: null,
  goalReached: false,
  splits: [],
  healthGranted: true,
  prBaseline: EMPTY_BASELINE,
  savedAt: '2026-09-16T18:02:00.000Z',
  ...over,
});

test('de cadans: elke tien toestelseconden, en de eerste telt al mee', () => {
  assert.equal(shouldWriteCheckpoint(-1, 0), false, 'op nul valt er nog niets te bewaren');
  assert.equal(shouldWriteCheckpoint(-1, 1), false);
  assert.equal(shouldWriteCheckpoint(-1, CHECKPOINT_INTERVAL_S - 1), true,
    'de eerste beurt komt zodra er iets staat — lastWritten is -1');
  assert.equal(shouldWriteCheckpoint(10, 19), false);
  assert.equal(shouldWriteCheckpoint(10, 20), true);
  // Een bevroren klok (pauze op de erg) levert geen schrijfbeurten op.
  assert.equal(shouldWriteCheckpoint(20, 20), false);
});

test('een niet-eindige tijd levert geen schrijfbeurt op', () => {
  // Beide zijn onzin uit een kapot pakket, en een herstelpunt met zo'n duur erin zou later een
  // rit opleveren die niemand kan lezen. Niets bewaren is dan beter dan iets verkeerds.
  assert.equal(shouldWriteCheckpoint(-1, NaN), false);
  assert.equal(shouldWriteCheckpoint(-1, Infinity), false);
  // Positieve controle op dezelfde plek: een gewone waarde schrijft wél.
  assert.equal(shouldWriteCheckpoint(-1, 12), true);
});

test('een herstelpunt overleeft JSON en komt terug zoals het wegging', () => {
  const cp = maakCheckpoint();
  const terug = parseCheckpoint(JSON.stringify(cp));
  assert.ok(terug);
  assert.equal(terug.userId, cp.userId);
  assert.equal(terug.startedAt, cp.startedAt);
  assert.equal(terug.session.seconds, cp.session.seconds);
  assert.equal(terug.session.distanceMeters, cp.session.distanceMeters);
  assert.equal(terug.session.samples.length, cp.session.samples.length);
  assert.deepEqual(terug.session.watts, cp.session.watts);
});

test('een half of ouder herstelpunt wordt niets, geen halve rit', () => {
  assert.equal(parseCheckpoint(null), null);
  assert.equal(parseCheckpoint('{kapot'), null);
  assert.equal(parseCheckpoint('[]'), null);
  const cp = maakCheckpoint();
  assert.equal(parseCheckpoint(JSON.stringify({ ...cp, version: 0 })), null, 'oudere vorm');
  assert.equal(parseCheckpoint(JSON.stringify({ ...cp, userId: '' })), null);
  assert.equal(parseCheckpoint(JSON.stringify({ ...cp, startedAt: '' })), null);
  assert.equal(parseCheckpoint(JSON.stringify({ ...cp, session: undefined })), null);
  const zonderSamples = { ...cp, session: { ...cp.session, samples: undefined } };
  assert.equal(parseCheckpoint(JSON.stringify(zonderSamples)), null);
});

test('alleen een rit met iets erin wordt aangeboden', () => {
  const cp = maakCheckpoint();
  assert.ok(isWorthRecovering(cp, 'u1'));
  assert.equal(isWorthRecovering(cp, 'iemand-anders'), false, 'niet van deze gebruiker');
  assert.equal(isWorthRecovering(null, 'u1'), false);

  const leeg = maakCheckpoint({ session: createSession() });
  assert.equal(isWorthRecovering(leeg, 'u1'), false, '0 m en 0 s is geen rit');
});

test('de samenvatting voor de vraag toont hele meters en seconden', () => {
  const cp = maakCheckpoint();
  const { distanceMeters, seconds } = checkpointSummary(cp);
  assert.ok(Number.isInteger(distanceMeters));
  assert.ok(Number.isInteger(seconds));
  assert.equal(distanceMeters, 595);
  assert.equal(seconds, 119);
});

test('een herstelde rit levert dezelfde rij op als een gewone afronding', () => {
  // Dít is waarom `buildWorkoutRow` een eigen module is: het herstelpad en het normale pad
  // mogen niet uit elkaar lopen. Zelfde sessie, twee wegen, één uitkomst.
  const sessie = geredenSessie();
  const cp = maakCheckpoint({ session: sessie });

  const viaHerstel = buildWorkoutRow(checkpointToRowInput(cp));
  const rechtstreeks = buildWorkoutRow({
    userId: cp.userId,
    startedAt: cp.startedAt,
    seconds: sessie.seconds,
    distanceMeters: sessie.distanceMeters,
    calories: Math.round(sessie.kcal),
    resistanceLevel: null,
    ticks: sessie.packets,
    watts: sessie.watts,
    spm: sessie.spm,
    split: sessie.split,
    heartRate: sessie.heartRate,
    maxWatts: sessie.maxWatts,
    maxSpm: sessie.maxSpm,
    maxHeartRate: sessie.maxHeartRate,
    bestSplit: sessie.bestSplit,
    totalStrokes: sessie.totalStrokes,
    samples: sessie.samples,
    goal: null,
    goalReached: false,
    splits: [],
    healthGranted: true,
    prBaseline: EMPTY_BASELINE,
  });

  assert.deepEqual(viaHerstel.row, rechtstreeks.row);
});

test('een herstelpunt zonder toestemming draagt geen hartslag de rij in', () => {
  const cp = maakCheckpoint({ healthGranted: false });
  const { row } = buildWorkoutRow(checkpointToRowInput(cp));
  assert.equal(row.avg_heart_rate, null);
  assert.equal(row.max_heart_rate, null);
  assert.ok((row.samples as number[][]).every((s) => s.length === 2));

  // Positieve controle: mét toestemming staat hij er wél, uit dezelfde sessie.
  const met = buildWorkoutRow(checkpointToRowInput(maakCheckpoint()));
  assert.equal(met.row.avg_heart_rate, 142);
});

test('de identiteit van de rit blijft die van het herstelpunt', () => {
  // Zou hij hier vernieuwd worden, dan zou een herstelde rit náást de eventueel al bewaarde
  // versie belanden in plaats van erop — de unieke index werkt op user_id + started_at.
  const cp = maakCheckpoint();
  const invoer = checkpointToRowInput(cp);
  assert.equal(invoer.startedAt, '2026-09-16T18:00:00.000Z');
  assert.equal(invoer.userId, 'u1');
});

test('intrekken haalt de hartslag uit een lopend herstelpunt', () => {
  const cp = maakCheckpoint();
  assert.ok(checkpointHasHealthData(cp), 'positieve controle: er ís iets om weg te halen');

  const schoon = stripCheckpointHealthData(cp);
  assert.equal(schoon.healthGranted, false);
  assert.equal(schoon.session.heartRate.count, 0);
  assert.equal(schoon.session.maxHeartRate, 0);
  assert.ok(schoon.session.samples.every((x) => x.hr === undefined));
  assert.ok(!checkpointHasHealthData(schoon));

  // De rit zelf blijft: afstand, duur en vermogen zijn geen gezondheidsgegevens.
  assert.equal(schoon.session.distanceMeters, cp.session.distanceMeters);
  assert.equal(schoon.session.seconds, cp.session.seconds);
  assert.deepEqual(schoon.session.watts, cp.session.watts);
  assert.equal(schoon.session.samples.length, cp.session.samples.length);

  // En de rij die eruit komt draagt hem ook niet meer.
  const { row } = buildWorkoutRow(checkpointToRowInput(schoon));
  assert.equal(row.avg_heart_rate, null);
  assert.equal(row.max_heart_rate, null);
});
