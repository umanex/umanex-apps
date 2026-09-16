/**
 * Tegenproef voor de wachtrij-regels.
 *
 * Het gemeten scenario van de functionele review (F1) staat er als eigen test in: twee ritten
 * offline na elkaar, en de eerste mag niet door de tweede overschreven worden. Met het oude
 * enkele slot was dat gegarandeerd wél zo — daarom toetst die test de sleutels en niet het
 * gedrag van een opslag-dubbel: de sleutel ís het mechanisme.
 *
 * Draaien: `node --test lib/workoutQueue.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  byQueuedAt,
  classifyInsert,
  hasHealthData,
  isSameWorkout,
  keyBelongsTo,
  migrateLegacySlot,
  parseQueued,
  queueKey,
  stripHealthData,
  QUEUE_PREFIX,
  UNDEFINED_COLUMN,
  UNIQUE_VIOLATION,
  type PendingWorkout,
} from './workoutQueue.ts';

const rit = (user: string, started: string, extra: Record<string, unknown> = {}): PendingWorkout => ({
  user_id: user,
  started_at: started,
  distance_meters: 2000,
  duration_seconds: 600,
  ...extra,
});

test('het gemeten geval: twee offline ritten krijgen elk hun eigen sleutel', () => {
  const a = rit('u1', '2026-09-15T18:00:00.000Z');
  const b = rit('u1', '2026-09-15T19:30:00.000Z');

  const ka = queueKey(a);
  const kb = queueKey(b);
  assert.ok(ka && kb);
  // Vóór F1 deelden beide ritten één sleutel en verving B dus A. Dít is de fix.
  assert.notEqual(ka, kb);
  assert.ok(ka.startsWith(QUEUE_PREFIX));
});

test('dezelfde rit levert dezelfde sleutel, ook na een tweede poging', () => {
  const a = rit('u1', '2026-09-15T18:00:00.000Z');
  const opnieuw = rit('u1', '2026-09-15T18:00:00.000Z', { attempts: 2 });
  assert.equal(queueKey(a), queueKey(opnieuw));
  assert.ok(isSameWorkout(a, opnieuw));
});

test('twee gebruikers op één toestel raken elkaars ritten niet', () => {
  const mijn = queueKey(rit('u1', '2026-09-15T18:00:00.000Z'))!;
  const jouw = queueKey(rit('u2', '2026-09-15T18:00:00.000Z'))!;
  assert.notEqual(mijn, jouw);
  assert.ok(keyBelongsTo(mijn, 'u1'));
  assert.ok(!keyBelongsTo(mijn, 'u2'));
  // En geen prefix-verwarring tussen een id en een id dat ermee begint.
  assert.ok(!keyBelongsTo(queueKey(rit('u12', '2026-09-15T18:00:00.000Z'))!, 'u1'));
});

test('een rij zonder identiteit komt niet in de wachtrij', () => {
  assert.equal(queueKey({ started_at: '2026-09-15T18:00:00.000Z' }), null);
  assert.equal(queueKey({ user_id: 'u1' }), null);
  assert.equal(queueKey({ user_id: '', started_at: 'x' }), null);
});

test('het oude enkele slot verhuist naar de wachtrij', () => {
  const oud = JSON.stringify(rit('u1', '2026-09-15T18:00:00.000Z'));
  const item = migrateLegacySlot(oud, '2026-09-16T08:00:00.000Z');
  assert.ok(item);
  assert.equal(item.row.user_id, 'u1');
  assert.equal(item.attempts, 0);
  assert.equal(item.queuedAt, '2026-09-16T08:00:00.000Z');
});

test('een onbruikbaar oud slot wordt genegeerd in plaats van de migratie te breken', () => {
  assert.equal(migrateLegacySlot(null, 'nu'), null);
  assert.equal(migrateLegacySlot('{kapot', 'nu'), null);
  assert.equal(migrateLegacySlot('[]', 'nu'), null);
  // Kon in de oude vorm bestaan: de drain toetste `user_id` pas bij het lezen.
  assert.equal(migrateLegacySlot(JSON.stringify({ distance_meters: 100 }), 'nu'), null);
});

test('intrekken haalt de hartslag uit een wachtende rit', () => {
  const met = rit('u1', '2026-09-15T18:00:00.000Z', {
    avg_heart_rate: 142,
    max_heart_rate: 171,
    samples: [[0, 0, 90], [1, 4, 92], [2, 9, 95]],
  });
  assert.ok(hasHealthData(met), 'positieve controle: er ís iets om weg te halen');

  const zonder = stripHealthData(met);
  assert.equal(zonder.avg_heart_rate, null);
  assert.equal(zonder.max_heart_rate, null);
  assert.deepEqual(zonder.samples, [[0, 0], [1, 4], [2, 9]]);
  assert.ok(!hasHealthData(zonder));
  // De rit zelf blijft: afstand en duur zijn geen gezondheidsgegevens.
  assert.equal(zonder.distance_meters, 2000);
  assert.equal(zonder.duration_seconds, 600);
  // En de identiteit blijft, anders raakt de rit zijn plek in de wachtrij kwijt.
  assert.equal(queueKey(zonder), queueKey(met));
});

test('strippen van een rit zonder hartslag verandert niets wezenlijks', () => {
  const zonder = rit('u1', '2026-09-15T18:00:00.000Z', { samples: [[0, 0], [1, 4]] });
  assert.ok(!hasHealthData(zonder));
  const na = stripHealthData(zonder);
  assert.deepEqual(na.samples, [[0, 0], [1, 4]]);
  assert.equal(na.avg_heart_rate, null);
});

test('de drain leest een insert-uitkomst zoals bedoeld', () => {
  assert.equal(classifyInsert(null, true), 'klaar');
  // De rij stond er al — bijvoorbeeld doordat de app werd afgesloten tussen een geslaagde
  // insert en het opruimen van de wachtrij. Dan is afdruinen wel degelijk klaar.
  assert.equal(classifyInsert({ code: UNIQUE_VIOLATION }, true), 'klaar');
  assert.equal(classifyInsert({ code: UNDEFINED_COLUMN }, true), 'zonder-pr-metrics');
  // Zonder pr_metrics in de rij is 42703 géén reden om het nog eens te proberen: dan
  // ontbreekt een ándere kolom en levert een tweede poging exact dezelfde fout.
  assert.equal(classifyInsert({ code: UNDEFINED_COLUMN }, false), 'weigering');
  // Lege code = het verzoek haalde de server niet (postgrest-js bij een verworpen fetch, en
  // onze eigen deadline). De volgende rit heeft dan ook geen kans.
  assert.equal(classifyInsert({ code: '' }, true), 'offline');
  assert.equal(classifyInsert({}, true), 'offline');
  assert.equal(classifyInsert({ code: '42501' }, true), 'weigering');
});

test('de oudste rit gaat eerst', () => {
  const a = { row: rit('u1', 'a'), queuedAt: '2026-09-15T18:00:00.000Z', attempts: 0 };
  const b = { row: rit('u1', 'b'), queuedAt: '2026-09-15T19:00:00.000Z', attempts: 0 };
  const zonder = { row: rit('u1', 'c'), queuedAt: '', attempts: 0 };

  assert.deepEqual([b, a].sort(byQueuedAt).map((x) => x.row.started_at), ['a', 'b']);
  // Een item zonder tijdstempel achteraan: vooraan zou het de oudste échte rit verdringen.
  assert.deepEqual([zonder, b, a].sort(byQueuedAt).map((x) => x.row.started_at), ['a', 'b', 'c']);
});

test('een opgeslagen item komt terug zoals het wegging', () => {
  const item = { row: rit('u1', '2026-09-15T18:00:00.000Z'), queuedAt: 'nu', attempts: 2 };
  const terug = parseQueued(JSON.stringify(item));
  assert.deepEqual(terug, item);
});

test('kapotte opslag levert niets in plaats van een half item', () => {
  assert.equal(parseQueued(null), null);
  assert.equal(parseQueued('{kapot'), null);
  assert.equal(parseQueued('"tekst"'), null);
  assert.equal(parseQueued(JSON.stringify({ queuedAt: 'nu' })), null);
  // Een item waarvan de rij zijn identiteit mist, kan nergens meer heen.
  assert.equal(parseQueued(JSON.stringify({ row: { distance_meters: 1 }, queuedAt: 'nu' })), null);
});
