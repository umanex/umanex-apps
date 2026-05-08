import { View, Text, StyleSheet } from 'react-native';
import { bg, fg, accent, typeStyles, componentRadius } from '@/constants';

type KPIProps = {
  label: string;
  value: string;
  highlighted?: boolean;
  compact?: boolean;
};

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
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
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
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  value: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  valueHighlighted: {
    color: accent.default,
  },
});
