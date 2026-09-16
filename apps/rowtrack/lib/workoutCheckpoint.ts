/**
 * Het herstelpunt van een lopende rit.
 *
 * WAAROM DIT BESTAAT. De actieve fase, de metingen en de tijdreeks leefden uitsluitend in het
 * geheugen. De lokale wachtrij dekt alleen een VOLTOOIDE rit; wordt de app halverwege
 * afgesloten of crasht hij, dan start hij weer in idle en is er niets — geen rit, geen vraag,
 * geen spoor (functionele review F5). Voor wie net veertig minuten heeft geroeid is dat het
 * duurste moment om niets te bewaren.
 *
 * WAT HET WÉL EN NIET DOET. Het herstelpunt laat je de onderbroken rit alsnog opslaan of
 * weggooien. Doorroeien met behoud van de totalen zit er bewust niet in: daarvoor moet de
 * verbinding opnieuw staan én moeten de tellers van de erg opnieuw gebaselined worden, en dat
 * is een eigen feature met een eigen toestelronde.
 *
 * De inhoud is de sessie zoals `sessionAccumulator` hem bijhoudt, plus wat er verder voor de
 * rij nodig is. Daardoor loopt herstellen door exact dezelfde `buildWorkoutRow` als een
 * normale afronding — één rij-bouwer, dus een herstelde rit kan niet anders afgerond worden
 * dan een gewone.
 *
 * Puur en zonder `@/`-alias, zodat `node --test lib/workoutCheckpoint.test.ts` hem draait.
 */
import type { Session } from './sessionAccumulator.ts';
import type { SplitEntry } from '../types/workout.ts';
import type { PrBaseline } from './personalRecords.ts';
import type { RowGoal, WorkoutRowInput } from './workoutRow.ts';
import { isWorthSaving } from './storableWorkout.ts';

/** De opslagsleutel. Eén rit tegelijk — er kan er ook maar één lopen. */
export const CHECKPOINT_KEY = 'rowtrack.activeWorkout';

/**
 * Om de hoeveel TOESTELseconden er een herstelpunt geschreven wordt.
 *
 * Toestelseconden en niet wandklok: de erg bevriest zijn klok bij een pauze, dus tijdens een
 * pauze wordt er niets geschreven — er verandert dan ook niets. Tien seconden is wat je bij
 * een crash hoogstens kwijt bent; bij ~1 Hz aan pakketten is dat één schrijfactie per tien
 * pakketten, en de reeks groeit lineair (een uur roeien ≈ 3 600 punten ≈ 40 KB per schrijfbeurt).
 */
export const CHECKPOINT_INTERVAL_S = 10;

/** Verhoog dit zodra de vorm verandert; een ouder herstelpunt wordt dan genegeerd. */
export const CHECKPOINT_VERSION = 1;

export type Checkpoint = {
  version: number;
  userId: string;
  /** ISO-tijd. Samen met `userId` de identiteit van de rit, ook in de unieke index. */
  startedAt: string;
  session: Session;
  goal: RowGoal | null;
  goalReached: boolean;
  splits: SplitEntry[];
  healthGranted: boolean;
  prBaseline: PrBaseline;
  /** Wanneer dit punt geschreven is — puur voor diagnose. */
  savedAt: string;
};

/**
 * Moet er nu een herstelpunt geschreven worden?
 *
 * `lastWritten` is de toestelseconde van de vorige schrijfbeurt, `-1` wanneer er nog niets
 * geschreven is. De eerste seconde telt al: een rit die na acht seconden crasht hoort ook iets
 * achter te laten.
 */
export function shouldWriteCheckpoint(lastWritten: number, seconds: number): boolean {
  if (!Number.isFinite(seconds) || seconds <= 0) return false;
  return seconds >= lastWritten + CHECKPOINT_INTERVAL_S;
}

/** Wat het herstelpunt over de rit zegt, voor de vraag aan de gebruiker. */
export function checkpointSummary(cp: Checkpoint): { distanceMeters: number; seconds: number } {
  return {
    distanceMeters: Math.round(cp.session.distanceMeters),
    seconds: Math.round(cp.session.seconds),
  };
}

/**
 * Is deze onderbroken rit het aanbieden waard?
 *
 * Dezelfde regel als bij het opslaan (`isWorthSaving`): bij nul afstand of nul duur is er
 * niets te tonen, en dan is de vraag "wil je hem bewaren?" alleen maar verwarrend.
 */
export function isWorthRecovering(cp: Checkpoint | null, userId: string): cp is Checkpoint {
  if (!cp) return false;
  if (cp.version !== CHECKPOINT_VERSION) return false;
  if (cp.userId !== userId) return false;
  return isWorthSaving(cp.session.distanceMeters, cp.session.seconds);
}

/**
 * Leest een opgeslagen herstelpunt terug.
 *
 * Streng: alles wat niet compleet is, wordt niets. Een half herstelpunt zou een rit opleveren
 * met verzonnen getallen erin, en dat is erger dan de rit kwijt zijn — dan weet je tenminste
 * dát je hem kwijt bent.
 */
export function parseCheckpoint(raw: string | null): Checkpoint | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const cp = parsed as Partial<Checkpoint>;
  if (cp.version !== CHECKPOINT_VERSION) return null;
  if (typeof cp.userId !== 'string' || !cp.userId) return null;
  if (typeof cp.startedAt !== 'string' || !cp.startedAt) return null;
  if (!cp.session || typeof cp.session !== 'object') return null;
  const s = cp.session as Partial<Session>;
  if (typeof s.seconds !== 'number' || typeof s.distanceMeters !== 'number') return null;
  if (!Array.isArray(s.samples)) return null;
  return {
    version: CHECKPOINT_VERSION,
    userId: cp.userId,
    startedAt: cp.startedAt,
    session: cp.session as Session,
    goal: cp.goal ?? null,
    goalReached: cp.goalReached === true,
    splits: Array.isArray(cp.splits) ? cp.splits : [],
    healthGranted: cp.healthGranted === true,
    prBaseline: (cp.prBaseline ?? {}) as PrBaseline,
    savedAt: typeof cp.savedAt === 'string' ? cp.savedAt : '',
  };
}

/**
 * Haalt de gezondheidsgegevens uit een herstelpunt.
 *
 * Draait bij het intrekken van de toestemming. `healthGranted` op `false` zetten zou al genoeg
 * zijn voor de RIJ — `buildWorkoutRow` filtert de hartslag er dan uit — maar de gemeten
 * waarden zouden daarmee nog steeds onversleuteld op het toestel blijven staan. Vandaar ook de
 * accumulator en de samples zelf.
 */
export function stripCheckpointHealthData(cp: Checkpoint): Checkpoint {
  return {
    ...cp,
    healthGranted: false,
    session: {
      ...cp.session,
      heartRate: { sum: 0, count: 0 },
      maxHeartRate: 0,
      samples: cp.session.samples.map(({ t, d }) => ({ t, d })),
    },
  };
}

/** Draagt dit herstelpunt nog gezondheidsgegevens? Enige lezer: de tegenproef. */
export function checkpointHasHealthData(cp: Checkpoint): boolean {
  return cp.session.heartRate.count > 0
    || cp.session.maxHeartRate > 0
    || cp.session.samples.some((s) => s.hr != null);
}

/**
 * Zet een herstelpunt om naar de invoer voor `buildWorkoutRow`.
 *
 * De live-waarden komen hier uit de sessie en niet uit het scherm — dat scherm bestaat niet
 * meer. Dat is precies waarom de sessie ze zelf bijhoudt.
 */
export function checkpointToRowInput(cp: Checkpoint): WorkoutRowInput {
  const s = cp.session;
  return {
    userId: cp.userId,
    startedAt: cp.startedAt,
    seconds: s.seconds,
    distanceMeters: s.distanceMeters,
    calories: Math.round(s.kcal),
    // De weerstand staat niet in de sessie: hij is een momentopname van het toestel en geen
    // accumulator. Liever leeg dan een waarde van tien seconden geleden als feit opschrijven.
    resistanceLevel: null,
    ticks: s.packets,
    watts: s.watts,
    spm: s.spm,
    split: s.split,
    heartRate: s.heartRate,
    maxWatts: s.maxWatts,
    maxSpm: s.maxSpm,
    maxHeartRate: s.maxHeartRate,
    bestSplit: s.bestSplit,
    totalStrokes: s.totalStrokes,
    samples: s.samples,
    goal: cp.goal,
    goalReached: cp.goalReached,
    splits: cp.splits,
    healthGranted: cp.healthGranted,
    prBaseline: cp.prBaseline,
  };
}
