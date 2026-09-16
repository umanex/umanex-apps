import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { secureStorageAdapter } from './secureStorage'
import { fetchWithDeadline, SUPABASE_REQUEST_TIMEOUT_MS } from './supabaseFetch'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY). ' +
    'For EAS builds: run `eas env:create --environment <preview|production>`.'
  )
}

/**
 * De sleutel waaronder de sessie in de beveiligde opslag staat. Byte-identiek aan
 * wat supabase-js zelf zou afleiden (`sb-<project-ref>-auth-token`), maar hier
 * expliciet gezet zodat wij hem kennen: het verwijder-pad moet de sessie desnoods
 * zonder netwerk kunnen wissen, en dat kan niet met een sleutel die we moeten raden.
 */
export const AUTH_STORAGE_KEY = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Versleutelde token-opslag (Keychain/Keystore) i.p.v. platte AsyncStorage.
    storage: secureStorageAdapter,
    storageKey: AUTH_STORAGE_KEY,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    // Eén deadline voor élke round-trip. `global.fetch` gaat naar PostgREST, Storage en
    // Functions én naar de auth-client (gemeten in @supabase/supabase-js@2.105.3,
    // dist/index.mjs:385 en :392), dus dit is de enige plek waar hij hoeft te staan — geen
    // 24 losse aanroepen die er één kunnen vergeten. Het waaróm staat in supabaseFetch.ts.
    //
    // Laat-gebonden (een pijl in plaats van `fetch` zelf): het globale `fetch` van React
    // Native wordt door `setUpXHR` pas tijdens het opstarten gezet, en een module-load die
    // de functie nú vastpakt zou een andere kunnen vangen dan de app straks gebruikt.
    fetch: fetchWithDeadline((input, init) => fetch(input, init), SUPABASE_REQUEST_TIMEOUT_MS),
  },
})