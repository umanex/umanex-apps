import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { fg, accent, space, typeStyles } from '@/constants';

type SegmentProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

export function Segment({ label, active, onPress }: SegmentProps) {
  return (
    <TouchableOpacity
      style={[styles.base, active && styles.active]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[active ? styles.labelActive : styles.labelDefault]}>
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
    paddingHorizontal: space['16'],
  },
  active: {
    backgroundColor: accent.default,
    borderRadius: 8,
  },
  labelActive: {
    ...typeStyles.segmentActive,
    color: fg.primary,
  },
  labelDefault: {
    ...typeStyles.segmentInactive,
    color: fg.secondary,
  },
});
