/**
 * Vangnet voor PostgREST-foutcode `PGRST303` ("JWT issued at future").
 *
 * Wat er gebeurt: GoTrue stempelt `iat` met zijn eigen klok, PostgREST toetst die
 * tegen de zijne, en tussen die twee zit soms een fractie van een seconde. Valt een
 * request in dat venster — in de praktijk vlak na een token-refresh, dus meteen bij
 * het openen van de app — dan weigert PostgREST een token dat een tel later gewoon
 * geldig is. De client kan daar niets aan doen: het token wordt server-side gemaakt
 * én server-side getoetst, dus de klok van het toestel speelt geen rol.
 *
 * Bewust een patch: de root cause is klokafwijking binnen Supabase en die ligt buiten
 * deze codebase. Wat hier wél hoort is dat één zo'n weigering geen scherm meer stuk
 * maakt. Gemeten 2026-08-28 op home: van twee queries in dezelfde `Promise.all`, met
 * hetzelfde token, faalde alleen `profiles` en slaagde `workouts` — de afwijking was
 * dus kleiner dan het gat tussen twee gelijktijdige requests. Vandaar één poging
 * extra na een korte pauze, en geen lus: is de afwijking groter dan dit, dan is het
 * geen ruis meer maar een storing die zichtbaar hoort te zijn.
 */
const JWT_ISSUED_AT_FUTURE = 'PGRST303';

/** Ruim boven de sub-seconde-afwijking die hierboven gemeten is, ruim onder een refresh-cyclus. */
const RETRY_DELAY_MS = 1_000;

type Result<T> = { data: T | null; error: { code?: string } | null };

/**
 * Draait `run` opnieuw wanneer PostgREST het token als "nog niet geldig" afwees.
 *
 * `run` moet de query élke keer opnieuw opbouwen — een al opgebouwde postgrest-js
 * builder is een thenable die zijn resultaat vasthoudt, dus een tweede `await` op
 * hetzelfde object doet geen tweede request. Zelfde contract als
 * `selectWithPrMetrics` in `prColumn.ts`.
 */
export async function retryOnClockSkew<T>(
  run: () => PromiseLike<Result<T>>,
  /**
   * Gemeld, niet als schermfout behandeld: wordt dit vaak, dan is het geen ruis meer
   * en moet het opvallen zonder dat iemand eerst een bug hoeft te reproduceren. Als
   * parameter i.p.v. een import van `monitoring`, zodat deze module vrij blijft van
   * path-alias en RN-imports — dat is precies wat hem in de `node:test`-suite houdt
   * (zie het Verify-pad in `apps/rowtrack/CLAUDE.md`).
   */
  onTransient?: (error: { code?: string }) => void,
  /** Alleen om de wachttijd in een test weg te nemen; productiecode geeft hem niet mee. */
  delayMs: number = RETRY_DELAY_MS,
): Promise<Result<T>> {
  const first = await run();
  if (first.error?.code !== JWT_ISSUED_AT_FUTURE) return first;

  onTransient?.(first.error);

  await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
  return run();
}
