import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Supabase auth-storage adapter bovenop expo-secure-store (iOS Keychain /
 * Android Keystore) i.p.v. platte AsyncStorage — zodat de sessie- + refresh-JWT
 * versleuteld at-rest staan (security-audit P2-1). Op een gecompromitteerd
 * (rooted/jailbroken) toestel of via een device-backup zijn tokens in
 * AsyncStorage anders leesbaar → sessie-diefstal.
 *
 * SecureStore weigert/waarschuwt bij een value > 2048 bytes; Supabase's
 * sessie-blob (access + refresh JWT) overschrijdt dat, dus splitsen we grote
 * waarden in chunks onder aparte keys, met een `<key>__n` meta-key die het
 * aantal chunks bewaart.
 *
 * Degradeert veilig: web heeft geen SecureStore, en een build die de native
 * SecureStore-module mist (bv. een dev-client van vóór deze install) valt terug
 * op AsyncStorage i.p.v. de auth te breken. **Belangrijk:** expo-secure-store
 * roept `requireNativeModule('ExpoSecureStore')` aan op module-load, dus een
 * *static* `import` crasht al bij het laden (Metro evalueert imports eager, vóór
 * enige try/catch). Daarom laden we de module **lazy via `require()` binnen een
 * try/catch** — enkel dan is de "native module ontbreekt"-fout opvangbaar.
 * Draai `expo run:ios --device` / prebuild om de versleutelde opslag te
 * activeren; tot dan draait de app op de AsyncStorage-fallback.
 *
 * NB: bestaande sessies (voorheen in AsyncStorage) worden op een rebuilt client
 * niet in SecureStore gevonden → gebruikers loggen éénmalig opnieuw in. Bewust
 * geen migratie gebouwd (overkill voor deze app).
 */

type SecureStoreModule = typeof import('expo-secure-store');

const CHUNK_SIZE = 2000; // tekens, ruim onder de 2048-byte SecureStore-grens

// SecureStore-keys mogen enkel [A-Za-z0-9._-] bevatten.
function sanitize(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

// Lazy-geladen native module + gecachete beschikbaarheids-beslissing, zodat de
// keuze binnen een app-sessie consistent blijft (een write naar SecureStore en
// een latere read uit AsyncStorage zou de sessie verliezen).
let ss: SecureStoreModule | null = null;
let backendPromise: Promise<boolean> | null = null;

function useSecureStore(): Promise<boolean> {
  if (!backendPromise) {
    backendPromise = (async () => {
      if (Platform.OS === 'web') return false;
      try {
        // require() (niet static import) → evalueert hier, binnen de try, zodat
        // een ontbrekende native module opvangbaar is i.p.v. de app te crashen.
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const mod = require('expo-secure-store') as SecureStoreModule;
        await mod.getItemAsync('__rowtrack_probe__'); // werpt als native module ontbreekt
        ss = mod;
        return true;
      } catch {
        return false; // native module ontbreekt / web → AsyncStorage-fallback
      }
    })();
  }
  return backendPromise;
}

async function getChunkCount(base: string): Promise<number> {
  const meta = await ss!.getItemAsync(`${base}__n`);
  return meta ? parseInt(meta, 10) || 0 : 0;
}

async function removeChunks(base: string): Promise<void> {
  const n = await getChunkCount(base);
  await ss!.deleteItemAsync(base).catch(() => {});
  await ss!.deleteItemAsync(`${base}__n`).catch(() => {});
  for (let i = 0; i < n; i++) {
    await ss!.deleteItemAsync(`${base}__${i}`).catch(() => {});
  }
}

export const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (!(await useSecureStore())) return AsyncStorage.getItem(key);
    const base = sanitize(key);
    const n = await getChunkCount(base);
    // n === 0: ofwel afwezig, ofwel een enkele niet-gechunkte waarde onder `base`.
    if (n === 0) return ss!.getItemAsync(base);
    let out = '';
    for (let i = 0; i < n; i++) {
      const part = await ss!.getItemAsync(`${base}__${i}`);
      if (part == null) return null; // incompleet → als afwezig behandelen
      out += part;
    }
    return out;
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (!(await useSecureStore())) return AsyncStorage.setItem(key, value);
    const base = sanitize(key);
    await removeChunks(base); // oude staat opruimen vóór herschrijven
    if (value.length <= CHUNK_SIZE) {
      await ss!.setItemAsync(base, value);
      return;
    }
    const n = Math.ceil(value.length / CHUNK_SIZE);
    for (let i = 0; i < n; i++) {
      await ss!.setItemAsync(
        `${base}__${i}`,
        value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE),
      );
    }
    await ss!.setItemAsync(`${base}__n`, String(n));
  },

  removeItem: async (key: string): Promise<void> => {
    if (!(await useSecureStore())) return AsyncStorage.removeItem(key);
    await removeChunks(sanitize(key));
  },
};
