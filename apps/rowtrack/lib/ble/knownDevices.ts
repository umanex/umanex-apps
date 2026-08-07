import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Het laatst gebruikte toestel per type, lokaal bewaard.
 *
 * Lokaal en niet in het Supabase-profiel: een BLE-id is op iOS een per-app UUID die
 * het besturingssysteem toekent, dus hij betekent niets op een andere telefoon.
 * Meenemen naar de server zou een waarde synchroniseren die daar nooit werkt.
 *
 * Bewust één toestel per type in plaats van een lijst — dat dekt de dagelijkse
 * situatie (dezelfde trainer, dezelfde band) zonder een beheer-UI te vragen. Een
 * ander toestel kiezen overschrijft simpelweg wat hier staat.
 */

export type DeviceKind = 'rower' | 'hr';

export type KnownDevice = {
  id: string;
  /** Voor de UI: "verbinden met Rower 5210" leest beter dan een UUID. */
  name: string | null;
};

const KEY: Record<DeviceKind, string> = {
  rower: 'rowtrack.knownDevice.rower',
  hr: 'rowtrack.knownDevice.hr',
};

export async function loadKnownDevice(kind: DeviceKind): Promise<KnownDevice | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY[kind]);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as KnownDevice;
    // Een opslag zonder id is onbruikbaar; behandel hem als afwezig in plaats van
    // hem later als connect-doel door te geven.
    return typeof parsed?.id === 'string' && parsed.id.length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function saveKnownDevice(kind: DeviceKind, device: KnownDevice): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY[kind], JSON.stringify(device));
  } catch {
    // Onthouden is een gemak, geen voorwaarde: bij een schrijffout verbindt de
    // volgende keer gewoon via een scan.
  }
}

export async function forgetKnownDevice(kind: DeviceKind): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY[kind]);
  } catch {
    // no-op
  }
}
