import type { HRStatus } from '@/lib/ble/types';
import { accent, status } from '@/constants';
import { t } from '@/i18n';
import { DeviceRow } from './DeviceRow';

type HrStatusBarProps = {
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function HrStatusBar({ hrStatus, hrDeviceName, onConnect, onDisconnect }: HrStatusBarProps) {
  const isScanning = hrStatus === 'scanning';
  const isConnected = hrStatus === 'connected';

  if (isConnected) {
    return (
      <DeviceRow
        icon="heart"
        iconColor={status.success}
        label={hrDeviceName || t.devices.hrConnected}
        action={t.devices.disconnect}
        onPress={onDisconnect}
      />
    );
  }

  if (isScanning) {
    return (
      <DeviceRow
        icon="heart"
        iconColor={accent.default}
        label={t.devices.heartRateMonitor}
        action={t.devices.searching}
        onPress={onConnect}
        loading
        actionDisabled
      />
    );
  }

  return (
    <DeviceRow
      icon="heart"
      iconColor={accent.default}
      label={t.devices.heartRateMonitor}
      action={t.devices.connect}
      onPress={onConnect}
    />
  );
}
