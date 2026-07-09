import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { bg, fg, accent, border, fontFamily, fontSize, radii } from '@/constants';

type ChipProps = {
  value: string;
  unit?: string;
  active: boolean;
  onPress: () => void;
};

export function Chip({ value, unit, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active ? styles.chipActive : styles.chipDefault]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.row}>
        <Text style={[styles.value, active ? styles.textActive : styles.textDefault]}>
          {value}
        </Text>
        {unit ? (
          <Text style={[styles.unit, active ? styles.textActive : styles.textDefault]}>
            {unit}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    paddingHorizontal: 8,
  },
  chipActive: {
    // TODO: token voor de 0.20 accent-selectie-fill ontbreekt (accent.muted = 0.12).
    // Gelijkgetrokken met GoalSegments' actieve segment tot er een token bestaat.
    backgroundColor: 'rgba(240, 84, 84, 0.20)',
    borderWidth: 1,
    borderColor: accent.default,
  },
  chipDefault: {
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  value: {
    fontFamily: fontFamily.sourceSerifRegular,
    fontSize: fontSize['16'],
    lineHeight: fontSize['16'],
    letterSpacing: -0.4,
  },
  unit: {
    fontFamily: fontFamily.sourceSerifItalic,
    fontSize: fontSize['16'],
    lineHeight: fontSize['16'],
  },
  textActive: {
    color: accent.default,
  },
  textDefault: {
    color: fg.secondary,
  },
});
