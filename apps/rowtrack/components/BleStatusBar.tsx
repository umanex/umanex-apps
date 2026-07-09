import type { ConnectionStatus } from '@/lib/ble/types';
import { accent, status } from '@/constants';
import { DeviceRow } from './DeviceRow';

type BleStatusBarProps = {
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function BleStatusBar({ bleStatus, deviceName, onConnect, onDisconnect }: BleStatusBarProps) {
  const isConnecting = bleStatus === 'scanning' || bleStatus === 'connecting' || bleStatus === 'discovering';
  const isConnected = bleStatus === 'connected';
  const isError = bleStatus === 'error';

  if (isConnected) {
    return (
      <DeviceRow
        icon="dot"
        iconColor={status.success}
        label={deviceName || 'Verbonden'}
        action="Verbreken"
        onPress={onDisconnect}
      />
    );
  }

  if (isConnecting) {
    return (
      <DeviceRow
        icon="dot"
        iconColor={accent.default}
        label="Roeitrainer"
        action="Verbinden…"
        onPress={onConnect}
        loading
        actionDisabled
      />
    );
  }

  if (isError) {
    return (
      <DeviceRow
        icon="dot"
        iconColor={status.error}
        label="Roeitrainer"
        action="Opnieuw"
        onPress={onConnect}
      />
    );
  }

  return (
    <DeviceRow
      icon="dot"
      iconColor={accent.default}
      label="Roeitrainer"
      action="Verbinden"
      onPress={onConnect}
    />
  );
}
