/**
 * Overgangsmaatregel rond `workouts.pr_metrics`.
 *
 * De kolom komt via een migratie die met de hand in de SQL Editor gedraaid wordt
 * (`supabase/migrations/add_workout_pr_metrics.sql`). Tussen het uitrollen van deze
 * app-versie en die migratie zit dus een venster, en in dat venster antwoordt PostgREST op
 * élke select met `pr_metrics` met foutcode 42703. De schermen die zo'n select doen —
 * home, historiek, detail — vertalen een leesfout terecht naar een ErrorState, dus zonder
 * dit vangnet toont de app geen enkele rit meer. Een ontbrekende badge is aanvaardbaar;
 * een lege historiek niet.
 *
 * Bewust een patch, met een eindpunt: zodra de migratie overal gedraaid is, kan dit bestand
 * weg en gaat `, pr_metrics` gewoon in de select-strings.
 */

const UNDEFINED_COLUMN = '42703';

/** Zodra één query bewijst dat de kolom ontbreekt, vragen de volgende er niet meer om. */
let available = true;

/** De kolomstaart voor een select — leeg wanneer de kolom (nog) niet bestaat. */
export function prMetricsColumn(): string {
  return available ? ', pr_metrics' : '';
}

export function prMetricsAvailable(): boolean {
  return available;
}

/** Aangeroepen zodra een insert of select op de ontbrekende kolom struikelt. */
export function markPrMetricsMissing(): void {
  available = false;
}

type Result<T> = { data: T | null; error: { code?: string } | null };

/**
 * Wat de query-builder teruggeeft. `data` blijft `unknown`: postgrest-js leidt de rij-vorm
 * af uit de select-string als literal, en die is hier per definitie dynamisch. De
 * aanroeper legt de vorm vast met dezelfde cast die hij vóór deze helper ook al deed.
 */
type RawResult = { data: unknown; error: { code?: string } | null };

/**
 * Draait een select en herhaalt hem zónder `pr_metrics` wanneer die kolom niet bestaat.
 * De aanroeper krijgt de kolomstaart binnen en plakt hem achter zijn eigen select-string,
 * zodat filters, ordering en `.single()` van de aanroeper blijven.
 */
export async function selectWithPrMetrics<T>(
  run: (extraColumns: string) => PromiseLike<RawResult>,
): Promise<Result<T>> {
  const first = (await run(prMetricsColumn())) as Result<T>;
  if (first.error?.code !== UNDEFINED_COLUMN) return first;
  markPrMetricsMissing();
  return (await run('')) as Result<T>;
}
