import { View, Text, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants';

interface KPIProps {
  label: string;
  value: string;
  highlighted?: boolean;
  compact?: boolean;
}

export function KPI({ label, value, highlighted = false, compact = false }: KPIProps) {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, highlighted && styles.valueHighlighted]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  containerCompact: {
    height: 54,
    paddingVertical: 10,
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: '#AAAAAA',
    letterSpacing: 1,
  },
  value: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 28,
    color: '#FFFFFF',
  },
  valueHighlighted: {
    color: '#00E5FF',
  },
});
