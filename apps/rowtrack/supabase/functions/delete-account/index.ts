// Supabase Edge Function — verwijdert het account van de aanroepende gebruiker.
//
// Waarom server-side: `auth.admin.deleteUser` vereist de service-role-key, en die
// mag nooit in een client-bundle staan. De functie is daarom het enige pad waarlangs
// een gebruiker zichzelf kan verwijderen (AVG art. 17 + Apple Guideline 5.1.1(v)).
//
// Beveiliging:
//   - De user-id komt uitsluitend uit de geverifieerde JWT. De request body wordt
//     genegeerd — een meegestuurde `user_id` doet niets. Zonder die regel zou elke
//     ingelogde gebruiker elk ander account kunnen wissen.
//   - De service-role-client wordt pas gemaakt nádat de JWT geldig bleek, en zijn
//     key verlaat de functie nooit (ook niet in een foutmelding).
//   - `verify_jwt` staat standaard aan op Edge Functions; de expliciete `getUser()`
//     hieronder is de tweede laag, niet de enige.
//
// Cascade: `auth.users` → `profiles` → `workouts` → `workout_intervals` hangen aan
// elkaar met ON DELETE CASCADE, dus deze ene delete ruimt alle gebruikersdata op.
// Het periode-doel zit als kolommen op `profiles` en verdwijnt dus mee.
//
// Deployen (Jeroen, eenmalig):
//   supabase functions deploy delete-account --project-ref vvncomyfmvuzyicqhnzj
// De drie env-vars hieronder injecteert Supabase zelf — geen secrets in te stellen.

import { createClient } from 'jsr:@supabase/supabase-js@2';

type Json = Record<string, unknown>;

// De app (React Native) doet niet aan CORS, maar een preflight vanuit een
// browser-context mag hier niet stilletjes op stuk lopen.
// `apikey` en `x-client-info` staan erbij omdat supabase-js die altijd meestuurt:
// zonder die twee blokkeert de browser de preflight en vertrekt de POST nooit.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Leest een env-var onder de huidige of de oudere naam. */
function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = Deno.env.get(name);
    if (value) return value;
  }
  return undefined;
}

Deno.serve(async (req) => {
  // 204 is een null-body status: een Response met body gooit een TypeError in de
  // Fetch-spec, waardoor elke preflight een kale 500 zónder CORS-headers zou krijgen.
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return json(401, { error: 'unauthorized' });
  }

  const url = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY');
  const serviceKey = env('SUPABASE_SERVICE_ROLE_KEY', 'SB_SECRET_KEY');

  if (!url || !anonKey || !serviceKey) {
    // Bewust geen detail in de response: welke key ontbreekt is server-informatie.
    console.error('delete-account: ontbrekende env-vars', {
      url: !!url,
      anonKey: !!anonKey,
      serviceKey: !!serviceKey,
    });
    return json(500, { error: 'server_misconfigured' });
  }

  // Stap 1 — identiteit vaststellen met de anon-key + het token van de beller.
  const caller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: { user }, error: userError } = await caller.auth.getUser();
  if (userError || !user) {
    return json(401, { error: 'unauthorized' });
  }

  // Stap 2 — pas nu de admin-client. Hard delete (geen soft delete): het account
  // en al zijn data moeten écht weg, anders is art. 17 niet ingevuld.
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete-account: deleteUser faalde', user.id, deleteError.message);
    return json(500, { error: 'delete_failed' });
  }

  console.log('delete-account: verwijderd', user.id);
  return json(200, { deleted: true });
});
