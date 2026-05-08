import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { bg, fg, accent, border, typeStyles } from '@/constants';

type ChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : styles.chipDefault]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.label, active ? styles.labelActive : styles.labelDefault]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 16,
  },
  chipActive: {
    backgroundColor: accent.muted,
    borderWidth: 1,
    borderColor: accent.default,
  },
  chipDefault: {
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
  },
  label: {
    ...typeStyles.kpiValue,
  },
  labelActive: {
    color: accent.default,
  },
  labelDefault: {
    color: fg.secondary,
  },
});
