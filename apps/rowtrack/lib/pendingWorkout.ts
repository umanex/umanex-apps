import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';

/**
 * Een voltooide workout die niet naar Supabase kon (offline / write-failure)
 * wordt lokaal bewaard en bij een volgende gelegenheid opnieuw geprobeerd —
 * zodat een rit niet stil verloren gaat (security-audit P2-4).
 *
 * Bewust één slot (de meest recente niet-opgeslagen workout). Een echte queue
 * van meerdere pending ritten is overkill voor deze app: je slaat er één op,
 * navigeert weg, en de volgende home-focus druint hem af.
 *
 * Deze module is de enige eigenaar van dat slot: wie wil afdruinen roept
 * `drainPendingWorkout` aan en schrijft niet zelf. Zonder die ene eigenaar konden
 * twee gelijktijdige lees-paden dezelfde rit allebei inserten (twee rijen, alle
 * KPI-totalen dubbel) en kon een geslaagde opslag de slot van een ándere,
 * nog-niet-opgeslagen rit wissen.
 */
const KEY = 'rowtrack.pendingWorkout';

/** Postgres unique_violation — de rit stond er al. */
export const UNIQUE_VIOLATION = '23505';

// De insert-payload voor de `workouts`-tabel (incl. user_id). Los getypeerd zodat
// deze helper niet aan de workout-kolomvorm vastzit.
export type PendingWorkout = Record<string, unknown> & { user_id?: string };

/**
 * Identiteit van een rit: gebruiker + starttijd. Dezelfde sleutel als de unique
 * index in `supabase/migrations/add_workouts_unique_started_at.sql`.
 */
function isSameWorkout(a: PendingWorkout, b: PendingWorkout): boolean {
  return a.user_id === b.user_id && a.started_at === b.started_at;
}

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

/**
 * Wist de slot alleen wanneer die nog altijd `row` bevat. Blind wissen kostte
 * eerder een volledige rit: slaagde de opslag van rit B terwijl rit A nog in de
 * slot stond te wachten op een nieuwe poging, dan verdween A geruisloos.
 */
export async function clearPendingWorkout(row: PendingWorkout): Promise<void> {
  try {
    const current = await loadPendingWorkout();
    if (!current || !isSameWorkout(current, row)) return;
    await AsyncStorage.removeItem(KEY);
  } catch {
    // no-op
  }
}

// Eén lopende drain per app-instantie. De app kent één ingelogde gebruiker
// tegelijk, dus een enkele in-flight promise volstaat als wederzijdse uitsluiting.
let drainInFlight: Promise<void> | null = null;

/**
 * Schrijft een eerder mislukte rit alsnog weg. Re-entrant-veilig: gelijktijdige
 * aanroepen (home-focus + pull-to-refresh, of een auth-event dat de focus-effect
 * opnieuw laat vuren) delen één poging in plaats van elk een eigen insert te doen.
 *
 * Faalt de insert, dan blijft de rit in de slot staan voor een volgende poging.
 */
export function drainPendingWorkout(userId: string): Promise<void> {
  if (!drainInFlight) {
    drainInFlight = runDrain(userId)
      // De drain is een backstop: hij mag het lees-pad dat hem aanroept nooit
      // afbreken, anders blijft dat scherm op laden hangen.
      .catch((e) => reportError(e, { where: 'pendingWorkout.drain' }))
      .finally(() => {
        drainInFlight = null;
      });
  }
  return drainInFlight;
}

async function runDrain(userId: string): Promise<void> {
  const pending = await loadPendingWorkout();
  if (!pending || pending.user_id !== userId) return;

  const { error } = await supabase.from('workouts').insert(pending);

  // Een unique violation betekent dat de rij er al staat — bijvoorbeeld doordat de
  // app werd afgesloten tussen een geslaagde insert en het wissen van de slot. Dan
  // is afdruinen wel degelijk klaar en mag de slot weg.
  if (error && error.code !== UNIQUE_VIOLATION) {
    reportError(error, { where: 'pendingWorkout.drain' });
    return;
  }
  await clearPendingWorkout(pending);
}
