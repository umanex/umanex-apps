/**
 * Wie mag de gedeelde BLE-scan stoppen?
 *
 * `BleManager` uit react-native-ble-plx is een procesbrede singleton (`static
 * sharedInstance`): `RowerBleService` en `HRBleService` doen elk `new BleManager()`
 * maar krijgen hetzelfde object, met één native scan en één scan-subscription. Twee
 * diensten die denken dat ze hun eigen scanner hebben, delen er dus één.
 *
 * Gevolg zonder coördinatie: de roeier-dienst stopt bij een `disconnect()` de scan
 * die de hartslag-dienst net gestart is. Die meldt dan "geen hartslagmeter gevonden"
 * terwijl de band gewoon uitzendt — een stille misrapportage die je aan niets ziet.
 *
 * Deze module is de gedeelde waarheid over eigenaarschap. Elke dienst claimt vlak
 * vóór `startDeviceScan()` en stopt alleen wanneer ze nog eigenaar is. Bewust
 * minimaal: het regelt wie mag stoppen, niet wie mag starten. Dat een tweede
 * `startDeviceScan()` de eerste scan overschrijft is een aparte, oudere kwestie —
 * die vraagt een echte arbiter en staat als opvolging in HANDOFF.md.
 */

let owner: symbol | null = null;

/** Neemt de scan over. De vorige eigenaar verliest hem — dat doet ble-plx toch al. */
export function claimScan(token: symbol): void {
  owner = token;
}

export function ownsScan(token: symbol): boolean {
  return owner === token;
}

export function releaseScan(token: symbol): void {
  if (owner === token) owner = null;
}
