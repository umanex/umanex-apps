import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { accent, fg, typeStyles, radii, space } from '@/constants';

export type TabItemProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function TabItem({ label, active, onPress }: TabItemProps) {
  return (
    <TouchableOpacity
      style={[styles.base, active && styles.active]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={active ? styles.labelActive : styles.labelDefault} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space['20'],
    paddingVertical: space['6'],
    borderRadius: radii.sm,
  },
  active: {
    backgroundColor: 'rgba(240, 84, 84, 0.20)',
    borderWidth: 1,
    borderColor: accent.default,
    borderRadius: radii.xs,
    paddingVertical: space['8'],
  },
  labelActive: {
    ...typeStyles.segmentActive,
    color: accent.default,
  },
  labelDefault: {
    ...typeStyles.segmentInactive,
    color: fg.tertiary,
  },
});
