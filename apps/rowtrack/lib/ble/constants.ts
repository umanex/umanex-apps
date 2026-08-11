/** FTMS Service UUID (Fitness Machine Service) */
export const FTMS_SERVICE_UUID = '00001826-0000-1000-8000-00805f9b34fb';

/** Rower Data Characteristic UUID (0x2AD1) — primary, per FTMS spec */
export const ROWER_DATA_UUID = '00002ad1-0000-1000-8000-00805f9b34fb';

/** Rower Data Characteristic UUID (0x2ACC) — fallback */
export const ROWER_DATA_ALT_UUID = '00002acc-0000-1000-8000-00805f9b34fb';

/** FTMS Control Point Characteristic UUID (0x2AD9) — write 0x01 to RESET session */
export const FTMS_CONTROL_POINT_UUID = '00002ad9-0000-1000-8000-00805f9b34fb';

/**
 * Device name prefix — fallback naast de geadverteerde FTMS UUID, voor toestellen
 * die de UUID niet in hun advertisement zetten. De Fluid Rower Apollo XL
 * adverteert als "Rower XXXX"; zie `rowerCandidate.ts`.
 */
export const ROWER_NAME_PREFIX = 'Rower';

/** Scan timeout in milliseconds */
export const SCAN_TIMEOUT_MS = 15_000;

/** Reconnect delay in milliseconds */
export const RECONNECT_DELAY_MS = 2_000;

/** Maximum reconnect attempts before giving up */
export const MAX_RECONNECT_ATTEMPTS = 3;
