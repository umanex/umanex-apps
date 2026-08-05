import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Een voltooide workout die niet naar Supabase kon (offline / write-failure)
 * wordt lokaal bewaard en bij een volgende gelegenheid opnieuw geprobeerd —
 * zodat een rit niet stil verloren gaat (security-audit P2-4).
 *
 * Bewust één slot (de meest recente niet-opgeslagen workout). Een echte queue
 * van meerdere pending ritten is overkill voor deze app: je slaat er één op,
 * navigeert weg, en de volgende home-focus druint hem af.
 */
const KEY = 'rowtrack.pendingWorkout';

// De insert-payload voor de `workouts`-tabel (incl. user_id). Los getypeerd zodat
// deze helper niet aan de workout-kolomvorm vastzit.
export type PendingWorkout = Record<string, unknown> & { user_id?: string };

export async function savePendingWorkout(row: PendingWorkout): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(row));
  } catch {
    // Bewust stil: dit is al de fallback-tak van een mislukte opslag.
  }
}

export async function loadPendingWorkout(): Promise<PendingWorkout | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PendingWorkout) : null;
  } catch {
    return null;
  }
}

export async function clearPendingWorkout(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}
