// Gespiegeld uit `constants.ts`: dit bestand blijft zonder runtime-imports zodat het
// onder `node --test` draait (zelfde reden als hrLink.ts — Node's type-stripping lost
// een extensieloos `./constants` niet op). De test toetst de spiegel tegen de bron.
const FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';
const ROWER_NAME_PREFIX = 'Rower';

/**
 * Naar volledig 128-bit, lowercase — zelfde logica als ble-plx' `fullUUID`, hier
 * herhaald omdat die module React Native importeert en dit bestand ook onder
 * `node --test` moet draaien.
 */
export function normalizeUuid(uuid: string): string {
  if (uuid.length === 4) return '0000' + uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb';
  if (uuid.length === 8) return uuid.toLowerCase() + '-0000-1000-8000-00805f9b34fb';
  return uuid.toLowerCase();
}

/**
 * Of een scan-treffer een kandidaat-roeier is.
 *
 * Primair criterium is de geadverteerde FTMS service UUID — FTMS v1.0 §3 verplicht
 * die in de advertising data, dus elke spec-conforme machine matcht ongeacht
 * merknaam. De naam-prefix blijft als vangnet voor toestellen die de UUID niet
 * adverteren (of de Apollo XL hem adverteert is nog niet op het toestel
 * vastgesteld — zie de `adv:`-regel in de scan-log). Een vals-positief (fiets,
 * loopband) is acceptabel: die verschijnt hooguit in de keuzelijst, en de
 * connect-fase eist alsnog de Rower Data characteristic.
 */
export function isRowerCandidate(dev: {
  name?: string | null;
  localName?: string | null;
  serviceUUIDs?: string[] | null;
}): boolean {
  if (dev.serviceUUIDs?.some((u) => normalizeUuid(u) === FTMS_SERVICE_UUID)) return true;
  return Boolean(
    dev.name?.startsWith(ROWER_NAME_PREFIX) || dev.localName?.startsWith(ROWER_NAME_PREFIX),
  );
}
