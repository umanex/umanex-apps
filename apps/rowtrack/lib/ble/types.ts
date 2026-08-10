export type ConnectionStatus =
  | 'idle'
  | 'scanning'
  | 'connecting'
  | 'discovering'
  | 'connected'
  | 'disconnecting'
  | 'reconnecting'
  | 'error';

// De services emitteren error-CODES, geen user-facing zinnen — de vertaling
// gebeurt aan de UI-kant (i18n/bleErrors.ts). `detail` draagt het rauwe
// BLE-stack-bericht mee waar dat getoond of gelogd wordt.

export type RowerBleErrorCode =
  | 'bluetooth_off'
  | 'bluetooth_unauthorized'
  | 'permission_denied'
  | 'rower_not_found'
  | 'scan_error'
  | 'scan_failed'
  | 'connect_failed'
  | 'no_data'
  | 'connection_lost';

export interface RowerBleError {
  code: RowerBleErrorCode;
  detail?: string;
}

// HR-fouten blokkeren de rit niet, maar bereiken de gebruiker wél — `ble-context`
// vertaalt ze naar `hrError` en de toestellen-rij toont ze.
export type HrBleErrorCode =
  | 'bluetooth_off'
  | 'permission_denied'
  | 'hr_not_found'
  | 'scan_error'
  | 'scan_failed'
  | 'connect_failed'
  | 'connection_lost'
  | 'hr_no_data';

export interface HrBleError {
  code: HrBleErrorCode;
  detail?: string;
}

export interface RowerMetrics {
  strokeRate: number | null;
  strokeCount: number | null;
  totalDistance: number | null;
  instantaneousPace: number | null;
  averagePace: number | null;
  instantaneousPower: number | null;
  averagePower: number | null;
  resistanceLevel: number | null;
  heartRate: number | null;
  metabolicEquivalent: number | null;
  elapsedTime: number | null;
  remainingTime: number | null;
}

// 'waiting' = de verbinding staat en we luisteren, maar er is nog geen hartslag
// binnengekomen. Zonder die tussenstand betekende 'connected' alleen dat er een
// GATT-link was — waar dat waar kan zijn terwijl de band niets meet.
export type HRStatus = 'idle' | 'scanning' | 'waiting' | 'connected' | 'error';

/** Een toestel uit een scan, klaar om in de keuzelijst te tonen. */
export interface FoundDevice {
  id: string;
  name: string;
  rssi: number;
}

/** @deprecated Gebruik `FoundDevice` — de lijst is niet langer HR-only. */
export type HRFoundDevice = FoundDevice;

export interface BleContextValue {
  status: ConnectionStatus;
  deviceName: string | null;
  metrics: RowerMetrics | null;
  error: string | null;
  startScan: () => void;
  disconnect: (opts?: { auto?: boolean }) => void;
  // HR monitor
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  hrBpm: number | null;
  /** Laatste HR-fout in leesbare vorm, of null. Verdween voorheen in een dev-log. */
  hrError: string | null;
  startHRScan: () => void;
  stopHR: (opts?: { auto?: boolean }) => void;
  // Keuzelijst, gedeeld door beide types
  devices: FoundDevice[];
  /** Welk type staat te kiezen, of null wanneer de lijst dicht is. */
  picking: 'rower' | 'hr' | null;
  selectDevice: (deviceId: string) => void;
  cancelSelection: () => void;
  /** Verbindt met de toestellen van vorige keer; stil wanneer dat niet lukt. */
  autoConnect: (opts?: { hr?: boolean }) => Promise<void>;
}

export type DataSource = 'ble';
