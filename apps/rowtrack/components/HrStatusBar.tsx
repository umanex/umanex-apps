import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import type { HRStatus } from '@/lib/ble/types';
import { bg, fg, accent, border, status, typeStyles, componentRadius } from '@/constants';

type HrStatusBarProps = {
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
};

export function HrStatusBar({ hrStatus, hrDeviceName, onConnect, onDisconnect }: HrStatusBarProps) {
  const isScanning = hrStatus === 'scanning';
  const isConnected = hrStatus === 'connected';

  let heartColor: string = fg.quaternary;
  let label = 'Hartslagmeter';

  if (isScanning) {
    heartColor = accent.default;
    label = 'Zoeken...';
  } else if (isConnected) {
    heartColor = status.success;
    label = hrDeviceName || 'HR verbonden';
  }

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <View style={styles.iconContainer}>
          {isScanning ? (
            <ActivityIndicator size="small" color={accent.default} />
          ) : (
            <Text style={[styles.heart, { color: heartColor }]}>♥</Text>
          )}
        </View>
        <Text style={styles.label}>{label}</Text>
      </View>

      {!isScanning && !isConnected && (
        <TouchableOpacity style={styles.actionPanel} onPress={onConnect} activeOpacity={0.8}>
          <Text style={styles.actionText}>Verbind</Text>
        </TouchableOpacity>
      )}

      {isConnected && (
        <TouchableOpacity style={styles.actionPanel} onPress={onDisconnect} activeOpacity={0.8}>
          <Text style={styles.actionMuted}>Verbreek</Text>
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
  heart: {
    fontSize: 14,
    lineHeight: 16,
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
  actionMuted: {
    ...typeStyles.textLink,
    color: fg.tertiary,
  },
});
