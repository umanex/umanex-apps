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

// SecureStore's grens is 2048 BYTES, niet tekens. 1800 laat marge voor de
// keychain-overhead en houdt de rekensom weg bij de rand.
const CHUNK_BYTES = 1800;

// SecureStore-keys mogen enkel [A-Za-z0-9._-] bevatten.
function sanitize(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, '_');
}

/** Aantal UTF-8 bytes van één code point. */
function utf8Size(codePoint: number): number {
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

/**
 * Splitst een waarde in stukken van hoogstens `maxBytes` UTF-8 bytes, zonder ooit
 * midden in een teken te knippen.
 *
 * De vorige versie sneed op `value.length` — JS-tekens, niet bytes. Dat brak op twee
 * manieren, beide bevestigd met een probe:
 *   1. Eén accentteken telt voor 1 maar weegt 2 bytes: 2000 tekens werd 4000 bytes,
 *      het dubbele van de grens.
 *   2. `slice()` knipt op UTF-16 code units. Valt een surrogaatpaar (emoji) precies
 *      op de grens, dan gaat de helft in chunk A en de helft in chunk B. Elk halfje
 *      is op zichzelf geen geldige UTF-8, dus de sprong over de native bridge maakt
 *      er een replacement-teken van — en de weer samengevoegde sessie is stil corrupt
 *      (JSON.parse faalt → gebruiker wordt zonder aanwijsbare reden uitgelogd).
 *
 * `for...of` itereert over code points, dus een surrogaatpaar blijft per constructie
 * heel. Vandaag is de Supabase-sessieblob puur ASCII en raakt geen van beide je; dat
 * verandert zodra er ooit een naam of emoji in de user_metadata belandt.
 */
function chunkByUtf8Bytes(value: string, maxBytes: number): string[] {
  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of value) {
    const size = utf8Size(char.codePointAt(0)!);
    if (currentBytes > 0 && currentBytes + size > maxBytes) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += size;
  }
  if (current.length > 0) chunks.push(current);

  return chunks;
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
    // AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: leesbaar na de eerste unlock sinds boot, óók
    // wanneer het toestel daarna weer vergrendeld is. De GoTrue auto-refresh tick draait
    // op de achtergrond en las de token met de default WHEN_UNLOCKED-accessibility niet
    // bij een gelockt scherm → "User interaction is not allowed". `THIS_DEVICE_ONLY` houdt
    // het item bovendien uit device-backups (versterkt het anti-diefstal-doel van deze
    // wrapper). Accessibility wordt op WRITE gezet: bestaande items schuiven mee bij de
    // eerstvolgende token-write (refresh terwijl ontgrendeld, of re-login).
    const opts = { keychainAccessible: ss!.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };
    const chunks = chunkByUtf8Bytes(value, CHUNK_BYTES);
    await removeChunks(base); // oude staat opruimen vóór herschrijven

    // 0 chunks = lege string; die hoort als gewone enkele waarde opgeslagen te
    // worden, niet als "geen chunks" (dat leest terug als afwezig).
    if (chunks.length <= 1) {
      await ss!.setItemAsync(base, value, opts);
      return;
    }

    // Chunks eerst, `__n` als laatste: breekt het schrijven halverwege af, dan telt
    // de waarde als afwezig (eenmalig opnieuw inloggen) in plaats van als compleet
    // maar afgekapt (stille corruptie).
    for (let i = 0; i < chunks.length; i++) {
      await ss!.setItemAsync(`${base}__${i}`, chunks[i], opts);
    }
    await ss!.setItemAsync(`${base}__n`, String(chunks.length), opts);
  },

  removeItem: async (key: string): Promise<void> => {
    if (!(await useSecureStore())) return AsyncStorage.removeItem(key);
    await removeChunks(sanitize(key));
  },
};
