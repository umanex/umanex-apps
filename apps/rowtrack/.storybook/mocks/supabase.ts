/**
 * Storybook-mock voor `@/lib/supabase`.
 *
 * WAAROM DIT BESTAAT. `lib/supabase.ts` gooit bij module-load zodra
 * EXPO_PUBLIC_SUPABASE_URL/ANON_KEY ontbreken — dezelfde valkuil die
 * apps/rowtrack/CLAUDE.md → Verify-pad al beschrijft voor een verse tree. Gemeten op
 * 2026-09-07: zonder deze mock gooide de smoke-story en rendeerde géén van de 34
 * componenten, met één console-fout als enige signaal.
 *
 * WAAROM GEEN ECHTE SLEUTELS. Een Storybook met werkende credentials zou bij elke story de
 * productiedatabase aanspreken. De componentlaag hoort zonder backend te tonen wat ze toont.
 *
 * VULBAAR SINDS FASE 1 (2026-09-09). De drie data-schermen (`profile`, `history/index`,
 * `history/[id]`) vallen zonder rijen in hun empty state, en dan meet de bouwspec een scherm
 * dat de gebruiker zelden ziet. Een story zet daarom `parameters.supabase`:
 *
 *     parameters: { supabase: { session: true, tabellen: { workouts: [ … ] } } }
 *
 * Zonder die parameter blijft het gedrag exact zoals het was — `{ data: null, error: null }`
 * en geen sessie — zodat elke bestaande story ongewijzigd rendert.
 *
 * EEN SESSIE IS GEEN APARTE MOCK. `lib/auth-context.tsx` haalt zijn gebruiker uit
 * `supabase.auth.getSession()`, dus een sessie hier geeft de échte `AuthProvider` een
 * ingelogde gebruiker. Een tweede mock voor de context zou dezelfde waarheid een tweede keer
 * opschrijven.
 */

export type SupabaseStoryData = {
  /** `true` geeft een generieke ingelogde gebruiker; een object overschrijft de velden. */
  session?: boolean | { id?: string; email?: string };
  /** Rijen per tabelnaam. Wat er niet in staat, blijft `null`. */
  tabellen?: Record<string, unknown[]>;
  /**
   * Laat de auth-aanroepen falen, zodat de FOUTVORM van een auth-scherm een render-pad krijgt.
   *
   * De drie auth-schermen hadden tot 2026-09-14 alleen een leeg formulier als story: hun
   * tweede zichtbare vorm zit in `useState` ná een submit, en die is van buitenaf niet te
   * zetten. Met deze vlag plus een `play` die het formulier invult en verstuurt, doorloopt de
   * story de ÉCHTE foutweg van het scherm — geen prop, geen `__DEV__`-tak, geen productiecode
   * die van stories weet.
   *
   * De status hoort erbij: `isOfflineAuthError` in `lib/auth.ts` leest `status === undefined`
   * als "verzoek nooit aangekomen", dus een foutobject zonder status levert altijd de
   * offline-zin op — ook wanneer je de inhoudelijke fout wilde tonen (gemeten).
   */
  authFout?: 'ongeldig' | 'bestaat-al' | 'offline';
};

let data: SupabaseStoryData = {};

/** Door de preview-decorator gezet, vóór de story rendert. */
export function __setSupabaseData(d: SupabaseStoryData | undefined) {
  data = d ?? {};
}

/**
 * De drie auth-fouten, in de vorm die GoTrue echt teruggeeft. Zonder `authFout` slaagt de
 * aanroep met een lege uitkomst: geen enkele bestaande story verstuurt een formulier, dus dat
 * verandert aan geen enkele render iets.
 */
const AUTH_FOUTEN = {
  ongeldig: { name: 'AuthApiError', status: 400, code: 'invalid_credentials', message: 'Invalid login credentials' },
  'bestaat-al': { name: 'AuthApiError', status: 400, code: 'user_already_exists', message: 'User already registered' },
  offline: { name: 'AuthRetryableFetchError', status: 0, message: 'Failed to fetch' },
} as const;

const authAntwoord = async () => ({
  data: { user: null, session: null },
  error: data.authFout ? AUTH_FOUTEN[data.authFout] : null,
});

const gebruiker = () => {
  if (!data.session) return null;
  const eigen = typeof data.session === 'object' ? data.session : {};
  return {
    id: eigen.id ?? '00000000-0000-4000-8000-000000000001',
    email: eigen.email ?? 'roeier@storybook.test',
    app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-01-01T00:00:00Z',
  };
};

/**
 * De keten is tegelijk thenable, zodat `await supabase.from(t).select(..).eq(..).order(..)`
 * op het antwoord eindigt ongeacht hoeveel schakels ertussen zitten. `single()` en
 * `maybeSingle()` geven de EERSTE rij: dat is wat `history/[id]` verwacht, en zonder dat
 * onderscheid krijgt dat scherm een array waar het een object leest.
 */
function keten(tabel: string, enkel = false): any {
  const rijen = data.tabellen?.[tabel] ?? null;
  const antwoord = () => ({
    data: enkel ? (rijen?.[0] ?? null) : rijen,
    error: enkel && !rijen?.length ? { code: 'PGRST116', message: 'geen rijen' } : null,
  });
  return new Proxy(
    { then: (resolve: (a: unknown) => void) => resolve(antwoord()) },
    {
      get: (doel: any, prop) => {
        if (prop in doel) return doel[prop];
        if (prop === 'single' || prop === 'maybeSingle') return () => keten(tabel, true);
        return () => keten(tabel, enkel);
      },
    },
  );
}

export const AUTH_STORAGE_KEY = 'sb-storybook-auth-token';

export const supabase: any = {
  from: (tabel: string) => keten(tabel),
  rpc: () => keten('__rpc'),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}), unsubscribe: () => {} }),
  removeChannel: () => {},
  auth: {
    getSession: async () => ({ data: { session: data.session ? { user: gebruiker() } : null }, error: null }),
    getUser: async () => ({ data: { user: gebruiker() }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => authAntwoord(),
    signUp: async () => authAntwoord(),
    resetPasswordForEmail: async () => authAntwoord(),
  },
};
