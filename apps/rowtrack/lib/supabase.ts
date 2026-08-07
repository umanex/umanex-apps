import 'react-native-url-polyfill/auto'
import { createClient } from '@supabase/supabase-js'
import { secureStorageAdapter } from './secureStorage'

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
})