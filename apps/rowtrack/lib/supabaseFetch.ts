/**
 * Een deadline op élke Supabase-round-trip.
 *
 * WAAROM DIT BESTAAT. "Laden" was een eindtoestand. De BLE-laag draagt vier benoemde
 * deadlines (`ADAPTER_READY_TIMEOUT_MS`, `SCAN_TIMEOUT_MS`, `KNOWN_CONNECT_TIMEOUT_MS`,
 * `HR_DATA_TIMEOUT_MS`) en legt in `ble-service.ts` uit waarom: zonder timer bleef een rij
 * voorgoed op "Zoeken…" staan, zonder fout en zonder uitgang. De Supabase-kant had er precies
 * één — `DELETE_TIMEOUT_MS` op de Edge Function (`lib/auth.ts:52`) — en dus bleef élk scherm
 * dat op een hangende verbinding wachtte in zijn laadtoestand hangen: Home, de historiek, de
 * doelkaart, het opslaan van een rit. Een verbinding die openstaat zonder te antwoorden is
 * iets anders dan offline zijn: er komt nooit een fout, dus er is nooit een ErrorState.
 *
 * DE NAAM VAN DE FOUT IS GEEN STIJLKEUZE. Gemeten in de geïnstalleerde bron
 * (`@supabase/postgrest-js@2.105.3`, `dist/index.mjs`): de builder hertest een mislukte fetch
 * zelf, tot `DEFAULT_MAX_RETRIES = 3` keer, maar alléén voor `RETRYABLE_METHODS`
 * (GET/HEAD/OPTIONS) — en hij slaat dat hertesten over zodra de fout `name === 'AbortError'`
 * of `code === 'ABORT_ERR'` draagt (`:268`). Een deadline-fout onder een ándere naam zou een
 * hangende leesactie dus niet op 20 s maar op vier pogingen van 20 s zetten, en precies de
 * toestand verlengen die deze module moet beëindigen. Vandaar `name = 'AbortError'`, met de
 * reden in `message` en `deadlineMs`.
 *
 * WAT DE TWEE LAGEN ERVAN MAKEN, ook op de bron getoetst:
 * - PostgREST (`:291-330`): `{ error: { message: 'AbortError: …', code: '', hint: 'Request was
 *   aborted (timeout or manual cancellation)' }, status: 0 }`. Een afgebroken insert levert dus
 *   géén `23505`, en een rit die lokaal geparkeerd staat blijft daar staan.
 * - Auth (`@supabase/auth-js@2.105.3`, `dist/module/lib/fetch.js:106-113`): elke afgewezen
 *   fetch wordt `AuthRetryableFetchError` met status 0 — precies wat `isOfflineAuthError`
 *   (`lib/auth.ts:86`) al herkent. De sessie blijft staan; een afgebroken token-refresh logt
 *   niemand uit.
 *
 * WAAROM `AbortController` EN NIET `AbortSignal.timeout`. React Native levert
 * `AbortController` via de polyfill `abort-controller@3.0.0` (`react-native/Libraries/Core/
 * setUpXHR.js:38`), en die kent `AbortSignal.timeout`/`any` niet; `abort()` neemt daar
 * bovendien géén reden aan. Vandaar een eigen vlag in plaats van `abort(reason)`.
 *
 * WAAR DE DEADLINE OPHOUDT. De timer wordt vrijgegeven zodra `fetch` zijn Response oplevert.
 * Op het toestel dekt dat de hele round-trip: RN's fetch is `whatwg-fetch@3.6.20` bovenop
 * XMLHttpRequest, en die lost zijn promise pas op bij `xhr.onload` — dus mét body. In Node
 * (waar de tests draaien) wordt de body gestreamd en valt het uitlezen ervan erbuiten; dat is
 * een verschil in de meetomgeving, niet in de app.
 *
 * Puur en zonder imports, zodat `node --test lib/supabaseFetch.test.ts` hem kan draaien.
 */

/**
 * De deadline voor elke Supabase-aanroep. Gelijk aan `DELETE_TIMEOUT_MS` (`lib/auth.ts:52`):
 * die zet zijn eigen timeout op de Edge Function-invoke, en als deze korter was zou hij die
 * altijd vóór zijn — dan zou de aanroeper zijn eigen deadline nooit zien afgaan.
 */
export const SUPABASE_REQUEST_TIMEOUT_MS = 20_000;

/** De fout die een verstreken deadline oplevert. Zie de kop voor waarom `name` 'AbortError' is. */
export class RequestDeadlineError extends Error {
  readonly deadlineMs: number;

  constructor(deadlineMs: number) {
    super(`Geen antwoord binnen ${deadlineMs} ms`);
    this.name = 'AbortError';
    this.deadlineMs = deadlineMs;
  }
}

/**
 * Was dit een verstreken deadline, of een afbreking door de aanroeper zelf?
 *
 * Duck-typing, net als `isOfflineAuthError`: `instanceof` is onbetrouwbaar zodra een
 * subklasse van `Error` door een transpiler is gegaan, en de fout reist hier bovendien door
 * twee bibliotheeklagen voor een aanroeper hem ziet.
 */
export function isDeadlineError(error: unknown): boolean {
  const e = (error ?? {}) as { name?: string; deadlineMs?: unknown };
  return e.name === 'AbortError' && typeof e.deadlineMs === 'number';
}

/** Precies zoveel van `fetch` als deze module aanraakt — geen DOM-afhankelijkheid nodig. */
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/**
 * Wikkelt een `fetch` in een deadline. Geef het resultaat aan `createClient` mee als
 * `global.fetch`, dan geldt hij voor élke round-trip: PostgREST, Storage, Functions én de
 * auth-client (gemeten in `@supabase/supabase-js@2.105.3`, `dist/index.mjs:385` en `:392`).
 *
 * Een `signal` die de aanroeper zelf meegeeft blijft werken: beide kunnen afbreken, en alleen
 * de deadline wordt naar `RequestDeadlineError` vertaald. Een afbreking door de aanroeper
 * reist onveranderd door, zodat die niet als "server antwoordde niet" leest.
 */
export function fetchWithDeadline(base: FetchLike, deadlineMs: number): FetchLike {
  return async (input, init) => {
    const controller = new AbortController();
    let verstreken = false;

    const timer = setTimeout(() => {
      verstreken = true;
      controller.abort();
    }, deadlineMs);

    const vanAanroeper = init?.signal ?? undefined;
    const doorAanroeper = () => controller.abort();
    if (vanAanroeper) {
      if (vanAanroeper.aborted) controller.abort();
      else vanAanroeper.addEventListener('abort', doorAanroeper);
    }

    try {
      return await base(input, { ...init, signal: controller.signal });
    } catch (error) {
      // Alleen ónze deadline wordt hertaald. Brak de aanroeper af, of gooide het netwerk een
      // echte fout, dan blijft die fout precies wat hij was.
      if (verstreken) throw new RequestDeadlineError(deadlineMs);
      throw error;
    } finally {
      clearTimeout(timer);
      vanAanroeper?.removeEventListener('abort', doorAanroeper);
    }
  };
}
