/**
 * Tegenproef voor `personalRecords` — beide kanten, cf. de guard-regel: gevallen die een
 * record moeten opleveren én gevallen waarin de module moet zwijgen. De fixture is de
 * echte ritgeschiedenis van augustus 2026 (afgeknot tot de velden die meedoen), zodat een
 * regressie zich meteen tegen waargenomen data verantwoordt.
 *
 * Draaien: `node --test lib/personalRecords.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPrEntries,
  derivePrHistory,
  extendBaseline,
  EMPTY_BASELINE,
  parsePrEntries,
  primaryEntry,
  beatsRecord,
  PR_METRICS,
  type PrCandidate,
} from './personalRecords.ts';

/** Echte ritten, oud → nieuw. */
const HISTORIEK: PrCandidate[] = [
  { id: 'r0730', started_at: '2026-07-30T18:27:07Z', distance_meters: 10000, best_2k_seconds: 544, avg_watts: 127, avg_split_seconds: 140 },
  { id: 'r0802', started_at: '2026-08-02T18:31:48Z', distance_meters: 11000, best_2k_seconds: 536, avg_watts: 135, avg_split_seconds: 137 },
  { id: 'r0806', started_at: '2026-08-06T18:36:12Z', distance_meters: 10000, best_2k_seconds: 535.75, avg_watts: 140, avg_split_seconds: 135 },
  { id: 'r0812', started_at: '2026-08-12T19:38:29Z', distance_meters: 10000, best_2k_seconds: 554.667, avg_watts: 126, avg_split_seconds: 140 },
  { id: 'r0816', started_at: '2026-08-16T18:43:20Z', distance_meters: 12500, best_2k_seconds: 539.5, avg_watts: 138, avg_split_seconds: 136 },
  { id: 'r0820', started_at: '2026-08-20T06:53:33Z', distance_meters: 10386, best_2k_seconds: 532.5, avg_watts: 142, avg_split_seconds: 134 },
  { id: 'r0822', started_at: '2026-08-22T12:42:11Z', distance_meters: 10000, best_2k_seconds: 534.75, avg_watts: 143, avg_split_seconds: 135 },
];

const baselineTot = (tot: string) =>
  HISTORIEK.filter((w) => w.started_at < tot).reduce(
    (acc, w) => extendBaseline(acc, w, w.started_at),
    EMPTY_BASELINE,
  );

test('de rit van 22 augustus is een record op gemiddeld vermogen, en op niets anders', () => {
  const rit = HISTORIEK[HISTORIEK.length - 1];
  const entries = buildPrEntries(rit, baselineTot(rit.started_at));

  assert.equal(entries.length, 1);
  assert.equal(entries[0].metric, 'watts');
  assert.equal(entries[0].value, 143);
  assert.equal(entries[0].previous, 142);
  assert.equal(entries[0].previous_at, '2026-08-20T06:53:33Z');
});

test('de zwijg-kant: een rit die niets verbetert levert geen enkele entry', () => {
  const rit = HISTORIEK[3]; // 12 augustus — slechter op alle vier
  assert.deepEqual(buildPrEntries(rit, baselineTot(rit.started_at)), []);
});

test('de eerste rit ooit is geen record — er is niets verslagen', () => {
  assert.deepEqual(buildPrEntries(HISTORIEK[0], EMPTY_BASELINE), []);
});

test('lager is beter voor tijd-metrics, hoger voor de rest', () => {
  assert.ok(beatsRecord('best2k', 532.5, 535.75));
  assert.ok(!beatsRecord('best2k', 540, 535.75));
  assert.ok(beatsRecord('split', 134, 135));
  assert.ok(!beatsRecord('split', 136, 135));
  assert.ok(beatsRecord('watts', 143, 142));
  assert.ok(!beatsRecord('watts', 141, 142));
  assert.ok(beatsRecord('distance', 12500, 12000));
  assert.ok(!beatsRecord('distance', 10000, 12000));
});

test('een rit kan meerdere records tegelijk breken', () => {
  const rit = HISTORIEK[5]; // 20 augustus: 2k 532,5 · watt 142 · split 134
  const metrics = buildPrEntries(rit, baselineTot(rit.started_at)).map((e) => e.metric);
  assert.deepEqual(metrics, ['best2k', 'watts', 'split']);
});

test('ontbrekende en onbruikbare metingen tellen niet mee als record', () => {
  const baseline = baselineTot('2026-08-22T00:00:00Z');
  // Nul en negatief zijn geen prestatie maar een ontbrekende meting; zonder deze poort
  // wordt "0 seconden op de 2000m" het onverslaanbare record van de app.
  const leeg: PrCandidate = {
    id: 'leeg', started_at: '2026-08-22T13:00:00Z',
    distance_meters: 0, best_2k_seconds: 0, avg_watts: null, avg_split_seconds: null,
  };
  assert.deepEqual(buildPrEntries(leeg, baseline), []);
});

test('derivePrHistory kent elke rit zijn eigen records toe, ongesorteerde invoer inbegrepen', () => {
  const geschud = [...HISTORIEK].reverse();
  const map = derivePrHistory(geschud);

  assert.deepEqual(map.get('r0822')?.map((e) => e.metric), ['watts']);
  assert.deepEqual(map.get('r0816')?.map((e) => e.metric), ['distance']);
  assert.equal(map.has('r0812'), false);
  // De eerste rit is een vertrekpunt, geen record.
  assert.equal(map.has('r0730'), false);
});

test('de afleiding rekent standaard met de drie metrics die de app destijds gebruikte', () => {
  // 20 augustus brak 2K, watt én split. De afleiding (voor ritten zonder pr_metrics) mag
  // de 2K niet meetellen: `is_pr` kwam toen uit drie metrics, dus "3 records" zou een
  // reden toevoegen die de app nooit gevierd heeft.
  const legacy = derivePrHistory(HISTORIEK);
  assert.deepEqual(legacy.get('r0820')?.map((e) => e.metric), ['watts', 'split']);
  // Mét de volledige set telt de 2000m wél mee — dat is wat nieuwe ritten opslaan.
  const volledig = derivePrHistory(HISTORIEK, PR_METRICS);
  assert.deepEqual(volledig.get('r0820')?.map((e) => e.metric), ['best2k', 'watts', 'split']);
});

test('sorteren gebeurt zonder collatie: een fractieloze tijdstempel komt niet achteraan', () => {
  // Postgres laat de milliseconden weg zodra ze nul zijn, dus '…:00+00:00' en
  // '…:00.735+00:00' staan naast elkaar in één historiek. `localeCompare` zet de
  // fractieloze ná de andere (ICU ziet '.' en '+' als leestekens), waardoor de nieuwste
  // rit als eerste behandeld wordt en per definitie geen record kan zijn.
  const seed: PrCandidate = {
    id: 'seed', started_at: '2026-08-05T17:30:00+00:00',
    distance_meters: 500, best_2k_seconds: null, avg_watts: 100, avg_split_seconds: 150,
  };
  const later: PrCandidate = {
    id: 'later', started_at: '2026-08-05T17:30:00.735+00:00',
    distance_meters: 1000, best_2k_seconds: null, avg_watts: 200, avg_split_seconds: 120,
  };
  const map = derivePrHistory([seed, later]);
  assert.deepEqual(map.get('later')?.map((e) => e.metric), ['distance', 'watts', 'split']);
  assert.equal(map.has('seed'), false);
});

test('de afleiding meldt wat er gebeurde, ook waar de app het destijds niet vlagde', () => {
  // 30 juli brak het 2K-record (544 s tegen 550 s uit een oudere rit) maar draagt
  // is_pr = NULL: 2K telde toen niet mee. De module meldt het record; het filteren op
  // is_pr hoort in de UI, niet hier. Deze test bewaakt die rolverdeling.
  const metJuli: PrCandidate[] = [
    { id: 'r0710', started_at: '2026-07-10T19:04:08Z', distance_meters: 10011, best_2k_seconds: null, avg_watts: 131, avg_split_seconds: 139 },
    { id: 'r0715', started_at: '2026-07-15T19:26:10Z', distance_meters: 7515, best_2k_seconds: 550, avg_watts: 128, avg_split_seconds: 139 },
    HISTORIEK[0],
  ];
  assert.deepEqual(
    derivePrHistory(metJuli, PR_METRICS).get('r0730')?.map((e) => e.metric),
    ['best2k'],
  );
});

test('primaryEntry volgt de prioriteitsvolgorde, niet de invoervolgorde', () => {
  const entries = buildPrEntries(HISTORIEK[5], baselineTot(HISTORIEK[5].started_at));
  assert.equal(primaryEntry(entries)?.metric, 'best2k');
  assert.equal(primaryEntry([]), null);
});

test('parsePrEntries laat rommel vallen zonder om te vallen', () => {
  assert.deepEqual(parsePrEntries(null), []);
  assert.deepEqual(parsePrEntries('geen array'), []);
  assert.deepEqual(parsePrEntries([{ metric: 'onbekend', value: 1 }]), []);
  assert.deepEqual(parsePrEntries([{ metric: 'watts', value: 'veel' }]), []);
  assert.deepEqual(
    parsePrEntries([{ metric: 'watts', value: 143, previous: 142, previous_at: '2026-08-20T06:53:33Z' }]),
    [{ metric: 'watts', value: 143, previous: 142, previous_at: '2026-08-20T06:53:33Z' }],
  );
  // Een entry zonder herkomst blijft bruikbaar: de badge toont dan de waarde zonder
  // vergelijking, in plaats van de hele rij te laten vallen.
  assert.deepEqual(parsePrEntries([{ metric: 'distance', value: 12500 }]), [
    { metric: 'distance', value: 12500, previous: null, previous_at: null },
  ]);
});
