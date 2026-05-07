import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { fontFamily } from '@/constants';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

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
    backgroundColor: 'rgba(0,229,255,0.12)',
    borderWidth: 1,
    borderColor: '#00E5FF',
  },
  chipDefault: {
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  label: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
  },
  labelActive: {
    color: '#00E5FF',
  },
  labelDefault: {
    color: '#94A3B8',
  },
});
