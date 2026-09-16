/**
 * De regels van de wachtrij met nog-niet-gesynchroniseerde ritten.
 *
 * WAAROM EEN WACHTRIJ EN GEEN SLOT. Er was één sleutel, bewust: "een echte queue van meerdere
 * pending ritten is overkill voor deze app — je slaat er één op, navigeert weg, en de volgende
 * home-focus druint hem af". Die redenering gaat uit van een netwerk dat terugkomt vóór de
 * volgende rit. Doet het dat niet, dan overschrijft rit B rit A en is A weg (functionele
 * review F1): twee ritten offline achter elkaar, en de eerste bestaat nergens meer. Eén
 * sleutel per rit lost dat op zonder dat er ergens een lijst gelezen-en-teruggeschreven hoeft
 * te worden — dat laatste zou zijn eigen race hebben.
 *
 * DE IDENTITEIT IS `user_id|started_at`. Dezelfde sleutel als de unieke index in
 * `supabase/migrations/add_workouts_unique_started_at.sql`. Dat is niet toevallig handig maar
 * de kern: de database wijst een tweede poging op dezelfde rit af met `23505`, en dat is
 * precies het signaal dat hij er al staat en uit de wachtrij mag.
 *
 * Puur en zonder imports, zodat `node --test lib/workoutQueue.test.ts` hem kan draaien. De
 * opslag zelf staat in `lib/pendingWorkout.ts`.
 */

/** Postgres unique_violation — de rit stond er al. */
export const UNIQUE_VIOLATION = '23505';
/** Postgres: kolom bestaat niet — hier alleen `pr_metrics`. */
export const UNDEFINED_COLUMN = '42703';

/** Het sleutelvoorvoegsel in AsyncStorage. Eén sleutel per rit, gevonden via `getAllKeys()`. */
export const QUEUE_PREFIX = 'rowtrack.workoutQueue.';

/** De oude sleutel met het enkele slot. Wordt eenmalig overgezet en daarna verwijderd. */
export const LEGACY_KEY = 'rowtrack.pendingWorkout';

// De insert-payload voor de `workouts`-tabel (incl. user_id). Los getypeerd zodat deze
// module niet aan de workout-kolomvorm vastzit.
export type PendingWorkout = Record<string, unknown> & { user_id?: string };

/** Een rit in de wachtrij, met wat we van zijn pogingen weten. */
export type QueuedWorkout = {
  row: PendingWorkout;
  /** ISO-tijd van het moment dat hij in de wachtrij kwam — bepaalt de volgorde bij afdruinen. */
  queuedAt: string;
  /** Aantal mislukte inserts. Alleen voor diagnose; niets geeft op basis hiervan op. */
  attempts: number;
};

/**
 * De opslagsleutel van een rit, of `null` wanneer zijn identiteit onvolledig is.
 *
 * Zonder `user_id` of `started_at` is er geen identiteit, en dan is er ook geen manier om hem
 * later terug te vinden of te ontdubbelen. Zo'n rij hoort niet in de wachtrij: hij zou er
 * onder een sleutel belanden die met elke volgende rit botst.
 */
export function queueKey(row: PendingWorkout): string | null {
  const user = row.user_id;
  const started = row.started_at;
  if (typeof user !== 'string' || !user) return null;
  if (typeof started !== 'string' || !started) return null;
  return `${QUEUE_PREFIX}${user}|${started}`;
}

/** Hoort deze sleutel bij deze gebruiker? Leest het voorvoegsel, niet de inhoud. */
export function keyBelongsTo(key: string, userId: string): boolean {
  return key.startsWith(`${QUEUE_PREFIX}${userId}|`);
}

/** Dezelfde rit? Gebruiker plus starttijd, net als de unieke index. */
export function isSameWorkout(a: PendingWorkout, b: PendingWorkout): boolean {
  return a.user_id === b.user_id && a.started_at === b.started_at;
}

/**
 * Haalt de gezondheidsgegevens uit een rij: gemiddelde en maximale hartslag, en het derde
 * element van elk sample.
 *
 * Spiegelt wat `revoke_health_consent()` server-side doet (zie
 * `supabase/migrations/add_health_consent.sql`). Die functie raakt alleen Postgres — een rit
 * die lokaal op synchronisatie wacht bleef daardoor staan mét hartslag en werd later alsnog
 * ingestuurd, ná het intrekken. Vandaar dezelfde bewerking aan deze kant.
 */
export function stripHealthData(row: PendingWorkout): PendingWorkout {
  const samples = row.samples;
  return {
    ...row,
    avg_heart_rate: null,
    max_heart_rate: null,
    samples: Array.isArray(samples)
      ? samples.map((s) => (Array.isArray(s) ? s.slice(0, 2) : s))
      : samples,
  };
}

/** Draagt deze rij nog gezondheidsgegevens? Enige lezer: de tegenproef. */
export function hasHealthData(row: PendingWorkout): boolean {
  if (row.avg_heart_rate != null || row.max_heart_rate != null) return true;
  const samples = row.samples;
  return Array.isArray(samples) && samples.some((s) => Array.isArray(s) && s.length > 2);
}

/**
 * Zet het oude enkele slot om naar een wachtrij-item.
 *
 * `null` wanneer er niets stond of wanneer de inhoud geen bruikbare identiteit heeft — een
 * rij zonder `user_id` kon in de oude vorm bestaan (de drain toetste dat pas bij het lezen),
 * en die kan hier niet onder een sleutel landen.
 */
export function migrateLegacySlot(raw: string | null, now: string): QueuedWorkout | null {
  if (!raw) return null;
  let row: unknown;
  try {
    row = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!row || typeof row !== 'object' || Array.isArray(row)) return null;
  const pending = row as PendingWorkout;
  if (queueKey(pending) === null) return null;
  return { row: pending, queuedAt: now, attempts: 0 };
}

/** Leest een opgeslagen wachtrij-item terug; `null` wanneer er niets bruikbaars staat. */
export function parseQueued(raw: string | null): QueuedWorkout | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const item = parsed as Partial<QueuedWorkout>;
  if (!item.row || typeof item.row !== 'object') return null;
  if (queueKey(item.row as PendingWorkout) === null) return null;
  return {
    row: item.row as PendingWorkout,
    queuedAt: typeof item.queuedAt === 'string' ? item.queuedAt : '',
    attempts: typeof item.attempts === 'number' ? item.attempts : 0,
  };
}

/** Oudste eerst. Een rit zonder tijdstempel gaat achteraan, niet vooraan. */
export function byQueuedAt(a: QueuedWorkout, b: QueuedWorkout): number {
  if (a.queuedAt === b.queuedAt) return 0;
  if (!a.queuedAt) return 1;
  if (!b.queuedAt) return -1;
  return a.queuedAt < b.queuedAt ? -1 : 1;
}

/** Wat de drain met een insert-uitkomst moet doen. */
export type DrainVerdict =
  /** De rij staat er (nieuw of al aanwezig) — uit de wachtrij. */
  | 'klaar'
  /** `pr_metrics` bestaat niet — opnieuw proberen zonder die kolom. */
  | 'zonder-pr-metrics'
  /** Het verzoek haalde de server niet — stoppen, de rest lukt nu ook niet. */
  | 'offline'
  /** De server weigerde hem inhoudelijk — laten staan en door naar de volgende. */
  | 'weigering';

/**
 * Wat betekent deze insert-uitkomst?
 *
 * "Offline" wordt herkend aan een LEGE foutcode. Dat is geen gok maar de vorm die PostgREST
 * teruggeeft zodra de fetch zelf verwerpt (gemeten in `@supabase/postgrest-js@2.105.3`,
 * `dist/index.mjs:291-330`: `code: ''`, `status: 0`) — en dat geldt ook voor onze eigen
 * deadline uit `lib/supabaseFetch.ts`. Het verschil met een weigering telt: bij offline heeft
 * de vólgende rit ook geen kans, dus dan stopt de drain in plaats van de hele wachtrij door
 * een dood netwerk te duwen.
 */
export function classifyInsert(error: { code?: string } | null, hadPrMetrics: boolean): DrainVerdict {
  if (!error) return 'klaar';
  if (error.code === UNIQUE_VIOLATION) return 'klaar';
  if (error.code === UNDEFINED_COLUMN && hadPrMetrics) return 'zonder-pr-metrics';
  if (!error.code) return 'offline';
  return 'weigering';
}
