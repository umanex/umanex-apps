import type { RowerBleError, HrBleError } from '@/lib/ble/types';
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
    // `||` (niet `??`): een lege BLE-message valt terug op de vaste melding,
    // net als het oude `bleErr.message || 'Verbinding mislukt'`-pad.
    case 'scan_failed':
      return error.detail || t.errors.rower.scanFailed;
    case 'connect_failed':
      return error.detail || t.errors.rower.connectFailed;
    case 'no_data':
      return t.errors.rower.noData;
    case 'connection_lost':
      return t.errors.rower.connectionLost;
  }
}

/**
 * Idem voor de hartslagmeter. Deze meldingen bereikten de gebruiker voorheen niet:
 * de provider logde ze enkel in `__DEV__`, dus een mislukte scan zag eruit als een
 * dode knop.
 */
export function hrErrorMessage(error: HrBleError): string {
  switch (error.code) {
    case 'bluetooth_off':
      return t.errors.hr.bluetoothOff;
    case 'permission_denied':
      return t.errors.hr.permissionDenied;
    case 'hr_not_found':
      return t.errors.hr.hrNotFound;
    case 'scan_error':
      return t.errors.hr.scanError(error.detail ?? '');
    case 'scan_failed':
      return error.detail || t.errors.hr.scanFailed;
    case 'connect_failed':
      return error.detail || t.errors.hr.connectFailed;
    case 'connection_lost':
      return t.errors.hr.connectionLost;
  }
}
