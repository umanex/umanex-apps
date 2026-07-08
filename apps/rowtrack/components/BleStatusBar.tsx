import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import type { ConnectionStatus } from '@/lib/ble/types';
import { bg, fg, accent, border, status, typeStyles, componentRadius } from '@/constants';

type BleStatusBarProps = {
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  bleError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function BleStatusBar({ bleStatus, deviceName, bleError, onConnect, onDisconnect }: BleStatusBarProps) {
  const isConnecting = bleStatus === 'scanning' || bleStatus === 'connecting' || bleStatus === 'discovering';
  const isConnected = bleStatus === 'connected';
  const isError = bleStatus === 'error';

  let dotColor: string = fg.quaternary;
  let label = 'Roeitrainer';

  if (isConnecting) {
    dotColor = accent.default;
    label = 'Verbinden...';
  } else if (isConnected) {
    dotColor = status.success;
    label = deviceName || 'Verbonden';
  } else if (isError) {
    dotColor = status.error;
    label = 'Verbinding mislukt';
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          {isConnecting ? (
            <ActivityIndicator size="small" color={accent.default} />
          ) : (
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
          )}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      {!isConnecting && !isConnected && !isError && (
        <TouchableOpacity style={styles.actionPanel} onPress={onConnect} activeOpacity={0.8}>
          <Text style={styles.actionText}>Verbind</Text>
        </TouchableOpacity>
      )}

      {isConnected && (
        <TouchableOpacity style={styles.actionPanel} onPress={onDisconnect} activeOpacity={0.8}>
          <Text style={styles.actionText}>Verbreek</Text>
        </TouchableOpacity>
      )}

      {isError && (
        <TouchableOpacity style={styles.actionPanel} onPress={onConnect} activeOpacity={0.8}>
          <Text style={styles.actionText}>Opnieuw</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    borderWidth: 1,
    borderColor: border.default,
    height: 48,
    paddingLeft: 16,
    overflow: 'hidden',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconContainer: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
  actionPanel: {
    height: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: bg.raised,
    borderLeftWidth: 1,
    borderLeftColor: border.strong,
  },
  actionText: {
    ...typeStyles.textLink,
    color: accent.default,
  },
});
