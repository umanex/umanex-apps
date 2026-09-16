/**
 * De rij die naar `workouts` gaat, opgebouwd uit de eindwaarden van een rit.
 *
 * WAAROM DIT EEN EIGEN MODULE IS. Deze opbouw stond in `saveWorkout` en had precies één
 * aanroeper. Sinds de rit lokaal wordt vastgelegd vóór de insert (F1) en sinds een
 * onderbroken rit alsnog uit zijn herstelpunt opgeslagen kan worden (F5), zijn er twee — en
 * twee kopieën van deze afrondings- en null-regels zouden binnen een maand uit elkaar lopen.
 * Eén bouwer, twee aanroepers.
 *
 * En hij is puur, dus `node --test lib/workoutRow.test.ts` kan hem draaien. Dat was hij als
 * onderdeel van een React-callback niet: de enige manier om deze regels te toetsen was met
 * een erg en een hartslagband erbij.
 */
import { bestTimeForDistance, type Sample } from './bestDistanceTime.ts';
import { mean, type Acc } from './sessionAccumulator.ts';
import { buildPrEntries, type PrBaseline, type PrEntry } from './personalRecords.ts';
import type { SplitEntry } from '../types/workout.ts';

/**
 * Minimum aantal BLE-ticks voordat een rit een record mág zijn.
 *
 * Komt van de vroegere live-check: een sprintje van een paar seconden heeft een hoog
 * gemiddeld vermogen en zou anders een onverslaanbaar record neerzetten — de historiek bevat
 * zulke ritten al (34 m op 2026-07-16).
 */
export const MIN_PR_TICKS = 10;

/** Het doel van de rit — alleen wat de rij ervan nodig heeft. */
export type RowGoal = { type: string; target: number };

export type WorkoutRowInput = {
  userId: string;
  /** ISO-tijd. Samen met `userId` de identiteit van de rit, ook in de unieke index. */
  startedAt: string;
  seconds: number;
  distanceMeters: number;
  calories: number;
  resistanceLevel: number | null;
  /** Aantal verwerkte BLE-ticks — enkel voor de PR-drempel. */
  ticks: number;
  watts: Acc;
  spm: Acc;
  split: Acc;
  heartRate: Acc;
  maxWatts: number;
  maxSpm: number;
  maxHeartRate: number;
  /** `Infinity` betekent: geen enkele split gemeten. */
  bestSplit: number;
  totalStrokes: number;
  samples: readonly Sample[];
  goal: RowGoal | null;
  goalReached: boolean;
  splits: readonly SplitEntry[];
  /** Zonder toestemming gaat de hartslag er hier uit — aan de bron, niet pas bij het tonen. */
  healthGranted: boolean;
  /** De staande records van vóór deze rit, zodat een record zich nooit tegen zichzelf meet. */
  prBaseline: PrBaseline;
};

export type BuiltWorkoutRow = {
  row: Record<string, unknown> & { user_id: string; started_at: string };
  /** De records die deze rit brak — voedt zowel de samenvatting als `workouts.pr_metrics`. */
  prEntries: PrEntry[];
};

/**
 * Het afgeronde gemiddelde, of null wanneer er niets geteld is.
 *
 * `mean` komt uit `sessionAccumulator.ts` — één implementatie, want twee zouden binnen een
 * maand in afronding of in hun nul-geval uit elkaar lopen. Het afronden gebeurt hier, want dat
 * hoort bij de integer-kolom en niet bij het rekenen.
 */
function afgerondGemiddelde(acc: Acc): number | null {
  const gemiddelde = mean(acc);
  return gemiddelde != null ? Math.round(gemiddelde) : null;
}

/**
 * Bouwt de rij én de PR-lijst uit de eindwaarden van één rit.
 *
 * Alle waarden die in integer-kolommen landen worden afgerond: de rauwe BLE- en max-waarden
 * kunnen floats zijn (bv. max_spm 45,5) en Postgres weigert die anders met
 * "invalid input syntax for type integer".
 */
export function buildWorkoutRow(input: WorkoutRowInput): BuiltWorkoutRow {
  const avgWatts = afgerondGemiddelde(input.watts);
  const avgSplit = afgerondGemiddelde(input.split);
  const distance = Math.round(input.distanceMeters);

  // Exacte beste 2000m uit de {tijd, afstand}-tijdreeks (two-pointer + interpolatie).
  // null wanneer de sessie < 2000m was.
  const best2k = bestTimeForDistance(input.samples, 2000);

  // Samples compact als [t, d]- of [t, d, hr]-tuples. Zonder toestemming valt het derde
  // element weg; anders zou de hartslag alsnog in de database belanden en is de toestemming
  // een schermpje zonder gevolg.
  const sampleTuples = input.samples.length > 0
    ? input.samples.map((s) => (input.healthGranted && s.hr != null ? [s.t, s.d, s.hr] : [s.t, s.d]))
    : null;

  // Eén beoordeling, op de eindwaarden die de gebruiker ook in de samenvatting ziet.
  const prEntries = input.ticks < MIN_PR_TICKS ? [] : buildPrEntries(
    {
      avg_watts: avgWatts,
      avg_split_seconds: avgSplit,
      distance_meters: distance,
      best_2k_seconds: best2k,
    },
    input.prBaseline,
  );

  const row = {
    user_id: input.userId,
    started_at: input.startedAt,
    duration_seconds: Math.round(input.seconds),
    distance_meters: distance,
    avg_watts: avgWatts,
    avg_spm: afgerondGemiddelde(input.spm),
    avg_split_seconds: avgSplit,
    calories: Math.round(input.calories),
    max_watts: input.maxWatts > 0 ? Math.round(input.maxWatts) : null,
    max_spm: input.maxSpm > 0 ? Math.round(input.maxSpm) : null,
    best_split: Number.isFinite(input.bestSplit) ? Math.round(input.bestSplit) : null,
    avg_heart_rate: input.healthGranted ? afgerondGemiddelde(input.heartRate) : null,
    max_heart_rate: input.healthGranted && input.maxHeartRate > 0
      ? Math.round(input.maxHeartRate)
      : null,
    resistance_level: input.resistanceLevel != null ? Math.round(input.resistanceLevel) : null,
    goal_type: input.goal?.type ?? null,
    goal_target: input.goal?.target ?? null,
    goal_reached: input.goal ? input.goalReached : null,
    splits: input.splits.length > 0 ? [...input.splits] : null,
    // `is_pr` blijft de goedkope filter; `pr_metrics` draagt de reden. Ze komen uit dezelfde
    // lijst, dus ze kunnen niet uit elkaar lopen.
    is_pr: prEntries.length > 0 || null,
    pr_metrics: prEntries.length > 0 ? prEntries : null,
    samples: sampleTuples,
    best_2k_seconds: best2k,
    total_strokes: input.totalStrokes > 0 ? input.totalStrokes : null,
  };

  return { row, prEntries };
}
