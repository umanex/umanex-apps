/**
 * Tegenproef voor de rij die naar `workouts` gaat.
 *
 * Toetst het CONTRACT, niet de vorm: elk geval hieronder is een manier waarop deze rij eerder
 * fout ging of fout kán gaan, niet een herhaling van de uitdrukking die hem bouwt. Een test
 * die de implementatie overschrijft bevestigt alleen zichzelf.
 *
 * Draaien: `node --test lib/workoutRow.test.ts` vanuit apps/rowtrack.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWorkoutRow, MIN_PR_TICKS, type WorkoutRowInput } from './workoutRow.ts';
import { EMPTY_BASELINE, type PrBaseline } from './personalRecords.ts';

const BASIS: WorkoutRowInput = {
  userId: 'u1',
  startedAt: '2026-09-15T18:00:00.000Z',
  seconds: 600,
  distanceMeters: 2000,
  calories: 120,
  resistanceLevel: 5,
  ticks: 60,
  watts: { sum: 0, count: 0 },
  spm: { sum: 0, count: 0 },
  split: { sum: 0, count: 0 },
  heartRate: { sum: 0, count: 0 },
  maxWatts: 0,
  maxSpm: 0,
  maxHeartRate: 0,
  bestSplit: Infinity,
  totalStrokes: 0,
  samples: [],
  goal: null,
  goalReached: false,
  splits: [],
  healthGranted: true,
  prBaseline: EMPTY_BASELINE,
};

const maak = (over: Partial<WorkoutRowInput> = {}) => buildWorkoutRow({ ...BASIS, ...over });

test('elk gemiddelde deelt door zijn eigen teller, niet door het aantal ticks', () => {
  // De faalklasse van 2026-08-17: delen door `tickCount` telt ook de packets waarin het veld
  // ontbrak, en drukt het gemiddelde met de duty-cycle omlaag. Hier telt watts 2 van de 60.
  const { row } = maak({
    ticks: 60,
    watts: { sum: 300, count: 2 },
    spm: { sum: 60, count: 3 },
    split: { sum: 300, count: 2 },
  });
  assert.equal(row.avg_watts, 150, 'niet 300/60 = 5');
  assert.equal(row.avg_spm, 20);
  assert.equal(row.avg_split_seconds, 150);
});

test('een teller op nul geeft null, geen deling door nul', () => {
  const { row } = maak();
  assert.equal(row.avg_watts, null);
  assert.equal(row.avg_spm, null);
  assert.equal(row.avg_split_seconds, null);
  assert.equal(row.avg_heart_rate, null);
});

test('alles wat in een integer-kolom landt is afgerond', () => {
  // Postgres weigert een float in een integer-kolom met "invalid input syntax for type
  // integer" — een rit die daarop strandt is een verloren rit.
  const { row } = maak({
    seconds: 600.7,
    distanceMeters: 2000.4,
    calories: 119.6,
    resistanceLevel: 5.5,
    maxSpm: 45.5,
    maxWatts: 212.3,
    bestSplit: 111.8,
    maxHeartRate: 170.4,
    heartRate: { sum: 141.6, count: 1 },
  });
  for (const veld of ['duration_seconds', 'distance_meters', 'calories', 'resistance_level',
    'max_spm', 'max_watts', 'best_split', 'max_heart_rate', 'avg_heart_rate'] as const) {
    assert.ok(Number.isInteger(row[veld]), `${veld} is geen geheel getal: ${row[veld]}`);
  }
  assert.equal(row.distance_meters, 2000);
  assert.equal(row.max_spm, 46);
});

test('zonder gemeten split is best_split null en niet oneindig', () => {
  assert.equal(maak({ bestSplit: Infinity }).row.best_split, null);
  assert.equal(maak({ bestSplit: NaN }).row.best_split, null);
  assert.equal(maak({ bestSplit: 111 }).row.best_split, 111);
});

test('zonder toestemming gaat de hartslag eruit — ook uit de samples', () => {
  const metHr = {
    heartRate: { sum: 284, count: 2 },
    maxHeartRate: 171,
    samples: [{ t: 0, d: 0, hr: 140 }, { t: 1, d: 4, hr: 144 }],
  };
  // Positieve controle: mét toestemming staat hij er wél, anders meet de test niets.
  const wel = maak({ ...metHr, healthGranted: true }).row;
  assert.equal(wel.avg_heart_rate, 142);
  assert.equal(wel.max_heart_rate, 171);
  assert.deepEqual(wel.samples, [[0, 0, 140], [1, 4, 144]]);

  const niet = maak({ ...metHr, healthGranted: false }).row;
  assert.equal(niet.avg_heart_rate, null);
  assert.equal(niet.max_heart_rate, null);
  assert.deepEqual(niet.samples, [[0, 0], [1, 4]], 'het derde element valt weg');
});

test('een korte rit kan geen record neerzetten', () => {
  // Een sprintje van een paar seconden heeft een hoog gemiddeld vermogen en zou anders een
  // onverslaanbaar record neerzetten; de historiek bevat zulke ritten al (34 m, 2026-07-16).
  const baseline: PrBaseline = {
    ...EMPTY_BASELINE,
    watts: { value: 100, at: '2026-01-01T00:00:00.000Z' },
  };
  const sterk = { watts: { sum: 400, count: 2 }, prBaseline: baseline };

  const kort = maak({ ...sterk, ticks: MIN_PR_TICKS - 1 });
  assert.deepEqual(kort.prEntries, []);
  assert.equal(kort.row.is_pr, null);

  // Positieve controle op dezelfde waarden: één tick meer en het record telt wél.
  const lang = maak({ ...sterk, ticks: MIN_PR_TICKS });
  assert.equal(lang.prEntries.length, 1);
  assert.equal(lang.prEntries[0].metric, 'watts');
  assert.equal(lang.prEntries[0].previous, 100);
  assert.equal(lang.row.is_pr, true);
});

test('is_pr is waar of null, nooit onwaar', () => {
  // De kolom is een goedkope filter: `.eq('is_pr', true)` moet werken en een `false` zou
  // elke rit een rij in die index geven.
  assert.equal(maak().row.is_pr, null);
  assert.equal(maak().row.pr_metrics, null);
});

test('lege lijsten worden null, niet een lege array', () => {
  const leeg = maak().row;
  assert.equal(leeg.splits, null);
  assert.equal(leeg.samples, null);
  assert.equal(leeg.total_strokes, null);
  assert.equal(leeg.max_watts, null);
  assert.equal(leeg.max_spm, null);

  const gevuld = maak({ splits: [{ distance: 500, split: 110 }], totalStrokes: 212 }).row;
  assert.deepEqual(gevuld.splits, [{ distance: 500, split: 110 }]);
  assert.equal(gevuld.total_strokes, 212);
});

test('de doelvelden staan er alle drie of geen van drie', () => {
  // `workouts_goal_consistency` (add_workout_goals.sql) weigert een halve set: goal_type,
  // goal_target en goal_reached zijn samen gevuld of samen null.
  const zonder = maak({ goal: null, goalReached: true }).row;
  assert.equal(zonder.goal_type, null);
  assert.equal(zonder.goal_target, null);
  assert.equal(zonder.goal_reached, null, 'zonder doel is "bereikt" geen feit maar onzin');

  const met = maak({ goal: { type: 'distance', target: 5000 }, goalReached: true }).row;
  assert.equal(met.goal_type, 'distance');
  assert.equal(met.goal_target, 5000);
  assert.equal(met.goal_reached, true);
});

test('de identiteit van de rit komt ongewijzigd door', () => {
  // Gebruiker plus starttijd zijn de sleutel van de wachtrij én de unieke index. Verandert
  // er hier iets, dan kan dezelfde rit twee keer in de database landen.
  const { row } = maak();
  assert.equal(row.user_id, 'u1');
  assert.equal(row.started_at, '2026-09-15T18:00:00.000Z');
});

test('de beste 2000m komt uit de tijdreeks, niet uit een gemiddelde', () => {
  // 2000 m in exact 400 s bij constante snelheid.
  const samples = Array.from({ length: 401 }, (_, i) => ({ t: i, d: i * 5 }));
  const { row } = maak({ samples, distanceMeters: 2000, seconds: 400 });
  assert.ok(typeof row.best_2k_seconds === 'number');
  assert.ok(Math.abs((row.best_2k_seconds as number) - 400) < 1);

  // Een rit korter dan 2000 m heeft er geen: null, geen verzonnen getal.
  const kort = maak({ samples: samples.slice(0, 100), distanceMeters: 495 }).row;
  assert.equal(kort.best_2k_seconds, null);
});
