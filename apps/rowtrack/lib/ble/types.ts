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

// HR-fouten zijn non-blocking en bereiken de UI niet (alleen dev-log).
export type HrBleErrorCode =
  | 'bluetooth_off'
  | 'permission_denied'
  | 'hr_not_found'
  | 'scan_error'
  | 'scan_failed'
  | 'connect_failed'
  | 'connection_lost';

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

export type HRStatus = 'idle' | 'scanning' | 'connected' | 'error';

export interface HRFoundDevice {
  id: string;
  name: string;
  rssi: number;
}

export interface BleContextValue {
  status: ConnectionStatus;
  deviceName: string | null;
  metrics: RowerMetrics | null;
  error: string | null;
  startScan: () => void;
  disconnect: () => void;
  // HR monitor
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  hrBpm: number | null;
  startHRScan: () => void;
  stopHR: () => void;
  hrDevices: HRFoundDevice[];
  hrSelecting: boolean;
  selectHRDevice: (deviceId: string) => void;
  cancelHRSelection: () => void;
}

export type DataSource = 'ble';
