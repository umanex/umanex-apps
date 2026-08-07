import { supabase } from './client';

/**
 * PostgREST-codes die zeggen dat het tóken niet deugde, niet het verzoek.
 *
 * PGRST303 ("JWT issued at future") is de venijnigste van de twee: PostgREST toetst de
 * `iat`-claim zonder speling, en op hosted Supabase munt GoTrue het token terwijl
 * PostgREST het valideert — twee aparte services. Loopt de klok van de muntende node een
 * seconde voor, dan is dat al genoeg. Het is voorbijgaand en verdwijnt zodra er een vers
 * token is, maar níet door hetzelfde verzoek te herhalen: dat stuurt exact hetzelfde
 * token opnieuw en krijgt gegarandeerd dezelfde fout terug.
 */
const AUTH_ERROR_CODES = new Set(['PGRST301', 'PGRST303']);

/**
 * Herkent een fout die aan het token ligt en dus zin heeft om te herstellen.
 *
 * Kijkt niet alleen naar `code`: een 401 van de gateway komt binnen zonder PostgREST-code,
 * en dan is de melding het enige aanknopingspunt.
 */
export function isAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const shape = error as { code?: unknown; status?: unknown; message?: unknown };

  if (typeof shape.code === 'string' && AUTH_ERROR_CODES.has(shape.code)) return true;
  if (shape.status === 401) return true;

  return typeof shape.message === 'string' && /\bJWT\b/i.test(shape.message);
}

/**
 * Haalt een vers token op.
 *
 * Geeft `false` terug als het niet lukte — dan is de sessie zelf op, of het netwerk ligt
 * eruit. In beide gevallen helpt nog eens proberen met hetzelfde token niet, en is de
 * oorspronkelijke fout informatiever dan wat de refresh zelf teruggeeft.
 */
export async function refreshSession(): Promise<boolean> {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    return !error && Boolean(data.session);
  } catch {
    return false;
  }
}

/**
 * Draait `run`, en probeert het één keer opnieuw met een verse sessie als het tóken de
 * blokkade was.
 *
 * Herhalen is hier veilig omdat PostgREST een ongeldig token aan de poort weigert: de query
 * heeft dan niet gedraaid, dus er staat niets half geschreven. Voor andere fouten — een
 * revisieconflict, een RLS-weigering, een netwerkstoring — gaat de fout ongemoeid door;
 * daarvoor is een verse sessie geen antwoord en zou herhalen alleen schade verbergen.
 *
 * Eén herkansing, geen lus: helpt een vers token niet, dan zit het probleem elders.
 */
export async function withAuthRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    if (!isAuthError(error)) throw error;
    if (!(await refreshSession())) throw error;
    return await run();
  }
}
