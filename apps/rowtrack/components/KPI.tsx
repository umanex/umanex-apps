import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { bg, fg, accent, border, typeStyles, radii, space } from '@/constants';

type KPIProps = {
  label: string;
  value: string;
  highlighted?: boolean;
  compact?: boolean;
  onPress?: () => void;
  loading?: boolean;
};

export function KPI({ label, value, highlighted = false, compact = false, onPress, loading = false }: KPIProps) {
  const content = (
    <>
      <Text style={[styles.label, compact && styles.labelCompact]}>{label}</Text>
      {loading ? (
        <ActivityIndicator size="small" color={fg.secondary} />
      ) : (
        <Text style={[styles.value, highlighted && styles.valueHighlighted, compact && styles.valueCompact]}>{value}</Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={[styles.container, compact && styles.containerCompact]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: bg.elevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.default,
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space['18'],
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
  labelCompact: {
    color: fg.secondary,
  },
  value: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  valueCompact: {
    ...typeStyles.kpiValue,
  },
  valueHighlighted: {
    color: accent.default,
  },
});
