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

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Versleutelde token-opslag (Keychain/Keystore) i.p.v. platte AsyncStorage.
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})