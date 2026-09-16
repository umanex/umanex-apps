import AsyncStorage from '@react-native-async-storage/async-storage';
import { reportError } from '@/lib/monitoring';
import {
  parseCheckpoint,
  stripCheckpointHealthData,
  CHECKPOINT_KEY,
  CHECKPOINT_VERSION,
  type Checkpoint,
} from '@/lib/workoutCheckpoint';
import type { Session } from '@/lib/sessionAccumulator';
import type { SplitEntry } from '@/types/workout';
import type { PrBaseline } from '@/lib/personalRecords';
import type { RowGoal } from '@/lib/workoutRow';

/**
 * De opslagkant van het herstelpunt. De regels staan in `lib/workoutCheckpoint.ts`.
 *
 * Eén sleutel, want er kan maar één rit tegelijk lopen. Overschrijven is hier juist de
 * bedoeling: het nieuwste punt is het beste punt.
 */

export type CheckpointInput = {
  userId: string;
  startedAt: string;
  session: Session;
  goal: RowGoal | null;
  goalReached: boolean;
  splits: readonly SplitEntry[];
  healthGranted: boolean;
  prBaseline: PrBaseline;
};

/**
 * Schrijft een herstelpunt weg. Geeft terug of dat gelukt is.
 *
 * `session.startedAt` gaat er bewust uit: dat is een `Date`, en die overleeft JSON niet als
 * Date. De starttijd staat al als ISO-string op het herstelpunt zelf — één bron, en de vorm
 * die de rij-bouwer toch nodig heeft.
 */
export async function saveCheckpoint(input: CheckpointInput): Promise<boolean> {
  const { startedAt: _weg, ...sessieZonderDatum } = input.session;
  const cp: Checkpoint = {
    version: CHECKPOINT_VERSION,
    userId: input.userId,
    startedAt: input.startedAt,
    session: sessieZonderDatum as Session,
    goal: input.goal,
    goalReached: input.goalReached,
    splits: [...input.splits],
    healthGranted: input.healthGranted,
    prBaseline: input.prBaseline,
    savedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(cp));
    return true;
  } catch (e) {
    reportError(e, { where: 'activeWorkoutStore.save' });
    return false;
  }
}

export async function loadCheckpoint(): Promise<Checkpoint | null> {
  try {
    return parseCheckpoint(await AsyncStorage.getItem(CHECKPOINT_KEY));
  } catch (e) {
    reportError(e, { where: 'activeWorkoutStore.load' });
    return null;
  }
}

/**
 * Haalt de gezondheidsgegevens uit een lopend herstelpunt.
 *
 * Draait bij het intrekken van de toestemming, naast het schoonvegen van de wachtrij. Het punt
 * zelf blijft staan: de rit is niet weg, alleen de hartslag.
 */
export async function stripHealthDataFromCheckpoint(): Promise<void> {
  try {
    const cp = parseCheckpoint(await AsyncStorage.getItem(CHECKPOINT_KEY));
    if (!cp) return;
    await AsyncStorage.setItem(CHECKPOINT_KEY, JSON.stringify(stripCheckpointHealthData(cp)));
  } catch (e) {
    reportError(e, { where: 'activeWorkoutStore.stripHealth' });
  }
}

/**
 * Wist het herstelpunt.
 *
 * Draait zodra de rit een thuis heeft — in de wachtrij of op de server — en wanneer de
 * gebruiker een onderbroken rit weggooit. Bij het INTREKKEN van de toestemming wordt hij niet
 * gewist maar gestript: de rit is dan niet weg, alleen de hartslag.
 */
export async function clearCheckpoint(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CHECKPOINT_KEY);
  } catch (e) {
    reportError(e, { where: 'activeWorkoutStore.clear' });
  }
}
