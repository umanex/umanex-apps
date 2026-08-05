import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Bewust hard falen tijdens de build in plaats van een lege client die pas in de
  // browser stukloopt: zonder deze twee is er geen enkele bron van data. Next inlineert
  // NEXT_PUBLIC-waardes tijdens de build, dus dit vangt een misconfigureerde deploy vóór
  // hij live gaat. CI zet placeholders (zie .github/workflows/ci.yml) omdat die build
  // enkel compileert en niets deployt.
  throw new Error(
    'Ontbrekende Supabase env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY). ' +
      'Zet ze in apps/cashflow/.env.local.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // De sessie mag wél lokaal blijven staan — dat is een token, geen cashflowdata.
    // Zonder dit zou elke refresh opnieuw inloggen vragen.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
