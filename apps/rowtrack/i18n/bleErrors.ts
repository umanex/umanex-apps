import type { RowerBleError } from '@/lib/ble/types';
import { t } from './index';

/**
 * Vertaalt een roeitrainer-BLE-error-code naar de user-facing melding.
 * `scan_failed`/`connect_failed` tonen het rauwe BLE-detail wanneer aanwezig
 * (bestaand gedrag); de overige codes hebben een vaste vertaling.
 */
export function rowerErrorMessage(error: RowerBleError): string {
  switch (error.code) {
    case 'bluetooth_off':
      return t.errors.rower.bluetoothOff;
    case 'bluetooth_unauthorized':
      return t.errors.rower.bluetoothUnauthorized;
    case 'permission_denied':
      return t.errors.rower.permissionDenied;
    case 'rower_not_found':
      return t.errors.rower.rowerNotFound;
    case 'scan_error':
      return t.errors.rower.scanError(error.detail ?? '');
    case 'scan_failed':
      return error.detail ?? t.errors.rower.scanFailed;
    case 'connect_failed':
      return error.detail ?? t.errors.rower.connectFailed;
    case 'no_data':
      return t.errors.rower.noData;
    case 'connection_lost':
      return t.errors.rower.connectionLost;
  }
}
