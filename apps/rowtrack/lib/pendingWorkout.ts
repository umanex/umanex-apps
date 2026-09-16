import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import {
  byQueuedAt,
  classifyInsert,
  keyBelongsTo,
  migrateLegacySlot,
  parseQueued,
  queueKey,
  stripHealthData,
  LEGACY_KEY,
  QUEUE_PREFIX,
  UNIQUE_VIOLATION,
  type PendingWorkout,
  type QueuedWorkout,
} from '@/lib/workoutQueue';

/**
 * De lokale wachtrij met voltooide ritten die nog niet in Supabase staan.
 *
 * DE VOLGORDE IS OMGEKEERD SINDS 2026-09-16. Tot dan werd een rit pas lokaal bewaard nádat de
 * insert had gefaald. Tussen "de gebruiker stopt" en "de server antwoordt" bestond er dus geen
 * enkele kopie: sluit de app in dat venster af, en de rit is weg (functionele review F1). Nu
 * gaat hij eerst de wachtrij in en daarna naar de server — lokaal eerst, altijd.
 *
 * EN HET IS EEN WACHTRIJ, GEEN SLOT. Er was één sleutel, met het argument dat je er toch maar
 * één tegelijk hebt. Twee ritten offline achter elkaar overschreven elkaar dan. De regels van
 * de wachtrij — de sleutel, het strippen, het lezen van een insert-uitkomst — staan in
 * `lib/workoutQueue.ts` en zijn daar getoetst; deze module is de AsyncStorage-kant.
 *
 * Deze module is de enige eigenaar van die opslag: wie wil afdruinen roept
 * `drainPendingWorkouts` aan en schrijft niet zelf. Zonder die ene eigenaar konden twee
 * gelijktijdige lees-paden dezelfde rit allebei inserten (twee rijen, alle KPI-totalen dubbel).
 */

export { UNIQUE_VIOLATION } from '@/lib/workoutQueue';
export type { PendingWorkout } from '@/lib/workoutQueue';

/**
 * Boven dit aantal wachtende ritten is synchronisatie niet traag maar stuk.
 *
 * Geen limiet en geen opruimdrempel — er wordt niets weggegooid. Alleen een melding, want een
 * wachtrij die blijft groeien is precies het soort stille toestand waar `reportError` voor is.
 */
const MELD_VANAF = 20;

/** Alle wachtrij-sleutels van deze gebruiker, oudste rit eerst. */
async function alleSleutels(userId: string): Promise<string[]> {
  const keys = await AsyncStorage.getAllKeys();
  return keys.filter((k) => keyBelongsTo(k, userId));
}

/**
 * Zet het oude enkele slot om naar de wachtrij. Idempotent: is hij er niet (meer), dan gebeurt
 * er niets. Draait bij elke lees-actie, want de app kan geüpgraded zijn terwijl er een rit in
 * het oude slot stond en die mag niet verdampen.
 */
async function migreerOudSlot(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LEGACY_KEY);
    if (!raw) return;
    const item = migrateLegacySlot(raw, new Date().toISOString());
    if (item) {
      const key = queueKey(item.row);
      // Alleen schrijven als er nog niets onder die sleutel staat: een nieuwere versie van
      // dezelfde rit hoort niet overschreven te worden door de oude kopie.
      if (key && (await AsyncStorage.getItem(key)) === null) {
        await AsyncStorage.setItem(key, JSON.stringify(item));
      }
    }
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch (e) {
    reportError(e, { where: 'pendingWorkout.migreerOudSlot' });
  }
}

/**
 * Legt een voltooide rit lokaal vast. Geeft terug of dat gelukt is.
 *
 * De uitkomst is niet cosmetisch: hierop rust de belofte "de rit is bewaard", en die mag het
 * scherm alleen doen wanneer het waar is. Een schrijffout werd hier tot 2026-09-16 stil
 * ingeslikt ("dit is al de fallback-tak van een mislukte opslag") — maar in de nieuwe volgorde
 * is dit geen fallback meer, het is de eerste en enige kopie.
 */
export async function enqueueWorkout(row: PendingWorkout): Promise<boolean> {
  const key = queueKey(row);
  if (!key) {
    reportError(new Error('rit zonder user_id of started_at kan niet in de wachtrij'), {
      where: 'pendingWorkout.enqueue',
    });
    return false;
  }
  const item: QueuedWorkout = { row, queuedAt: new Date().toISOString(), attempts: 0 };
  try {
    await AsyncStorage.setItem(key, JSON.stringify(item));
    return true;
  } catch (e) {
    reportError(e, { where: 'pendingWorkout.enqueue' });
    return false;
  }
}

/** Haalt een rit uit de wachtrij — alleen zijn eigen sleutel, nooit die van een andere rit. */
export async function removeQueued(row: PendingWorkout): Promise<void> {
  const key = queueKey(row);
  if (!key) return;
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    reportError(e, { where: 'pendingWorkout.removeQueued' });
  }
}

/** De wachtende ritten van deze gebruiker, oudste eerst. */
export async function listQueued(userId: string): Promise<QueuedWorkout[]> {
  await migreerOudSlot();
  try {
    const keys = await alleSleutels(userId);
    const paren = await AsyncStorage.multiGet(keys);
    const items = paren
      .map(([, raw]) => parseQueued(raw ?? null))
      .filter((x): x is QueuedWorkout => x !== null)
      .sort(byQueuedAt);
    if (items.length >= MELD_VANAF) {
      reportError(new Error(`${items.length} ritten wachten op synchronisatie`), {
        where: 'pendingWorkout.listQueued',
      });
    }
    return items;
  } catch (e) {
    reportError(e, { where: 'pendingWorkout.listQueued' });
    return [];
  }
}

/** Hoeveel ritten wachten er nog? Voor het uitlog-pad, dat erover moet kunnen waarschuwen. */
export async function countQueued(userId: string): Promise<number> {
  try {
    return (await alleSleutels(userId)).length;
  } catch {
    return 0;
  }
}

/**
 * Wist de hele wachtrij van dit toestel. Enkel voor een volledige lokale reset — uitloggen en
 * account verwijderen. Overal elders geldt `removeQueued`, die alleen de rit weghaalt die hij
 * bij naam kent; blind wissen kost daar een rit.
 */
export async function purgePendingWorkout(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const van_ons = keys.filter((k) => k.startsWith(QUEUE_PREFIX) || k === LEGACY_KEY);
    if (van_ons.length) await AsyncStorage.multiRemove(van_ons);
  } catch (e) {
    // Geen `reportError`: dit draait op het uitlog-pad, waar de melding toch niemand meer
    // bereikt, en een gooiende opruiming mag het uitloggen zelf niet tegenhouden.
  }
}

/**
 * Haalt de gezondheidsgegevens uit élke wachtende rit.
 *
 * Draait bij het intrekken van de toestemming. `revoke_health_consent()` raakt alleen
 * Postgres; zonder deze stap wordt een lokaal geparkeerde rit later alsnog mét hartslag
 * ingestuurd — ná het intrekken (functionele review F4).
 */
export async function stripHealthDataFromQueue(): Promise<void> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(QUEUE_PREFIX));
    const paren = await AsyncStorage.multiGet(keys);
    const schoon: [string, string][] = [];
    for (const [key, raw] of paren) {
      const item = parseQueued(raw ?? null);
      if (!item) continue;
      schoon.push([key, JSON.stringify({ ...item, row: stripHealthData(item.row) })]);
    }
    if (schoon.length) await AsyncStorage.multiSet(schoon);
  } catch (e) {
    reportError(e, { where: 'pendingWorkout.stripHealthDataFromQueue' });
  }
}

// Eén lopende drain per app-instantie. De app kent één ingelogde gebruiker tegelijk, dus een
// enkele in-flight promise volstaat als wederzijdse uitsluiting.
let drainInFlight: Promise<void> | null = null;

/**
 * Schrijft wachtende ritten alsnog weg. Re-entrant-veilig: gelijktijdige aanroepen
 * (home-focus + pull-to-refresh, of een auth-event dat de focus-effect opnieuw laat vuren)
 * delen één poging in plaats van elk een eigen insert te doen.
 */
export function drainPendingWorkouts(
  userId: string,
  opts: { healthGranted: boolean },
): Promise<void> {
  if (!drainInFlight) {
    drainInFlight = runDrain(userId, opts)
      // De drain is een backstop: hij mag het lees-pad dat hem aanroept nooit afbreken,
      // anders blijft dat scherm op laden hangen.
      .catch((e) => reportError(e, { where: 'pendingWorkout.drain' }))
      .finally(() => {
        drainInFlight = null;
      });
  }
  return drainInFlight;
}

async function runDrain(userId: string, opts: { healthGranted: boolean }): Promise<void> {
  const items = await listQueued(userId);
  if (!items.length) return;

  for (const item of items) {
    // Zonder toestemming gaat de hartslag er alsnog uit. `stripHealthDataFromQueue` doet dit
    // al bij het intrekken; dit is de tweede grendel, voor een rit die tussen die twee
    // momenten in de wachtrij belandde.
    const row = opts.healthGranted ? item.row : stripHealthData(item.row);
    const hadPrMetrics = 'pr_metrics' in row && row.pr_metrics != null;

    // Elke poging bouwt de query opnieuw op: een al opgebouwde postgrest-js builder is een
    // thenable die zijn resultaat vasthoudt, dus een tweede `await` op hetzelfde object doet
    // géén tweede request. Zelfde contract als `retryOnClockSkew` en `selectWithPrMetrics`.
    let { error } = await supabase.from('workouts').insert(row);
    let verdict = classifyInsert(error, hadPrMetrics);

    if (verdict === 'zonder-pr-metrics') {
      // Dezelfde overgangsmaatregel als in `saveWorkout`: een rit die hier wachtte mag niet
      // stranden op `pr_metrics` wanneer die kolom nog niet gemigreerd is. Liever de rit
      // zonder PR-detail dan een rit die eeuwig in de wachtrij blijft staan.
      const { pr_metrics: _weg, ...zonder } = row;
      ({ error } = await supabase.from('workouts').insert(zonder));
      verdict = classifyInsert(error, false);
    }

    if (verdict === 'klaar') {
      await removeQueued(item.row);
      continue;
    }

    if (verdict === 'offline') {
      // Het verzoek haalde de server niet. De volgende rit heeft nu ook geen kans, dus
      // stoppen in plaats van de hele wachtrij door een dood netwerk duwen.
      return;
    }

    // Inhoudelijk geweigerd: laten staan, de poging tellen, en door naar de volgende — één
    // onverteerbare rit mag de rest niet blokkeren.
    reportError(error, { where: 'pendingWorkout.drain', started_at: item.row.started_at });
    await bewaarPoging(item);
  }
}

/** Legt een mislukte poging vast op het item zelf, zodat diagnose niet op een gok rust. */
async function bewaarPoging(item: QueuedWorkout): Promise<void> {
  const key = queueKey(item.row);
  if (!key) return;
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ ...item, attempts: item.attempts + 1 }));
  } catch {
    // De rit staat er nog; alleen de teller loopt niet op. Geen reden om iets af te breken.
  }
}
