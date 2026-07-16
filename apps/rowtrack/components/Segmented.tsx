import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { bg, fg, accent, border, space, radii, fontFamily, fontSize } from '@/constants';

export type SegmentedOption<T extends string> = { value: T; label: string };

export type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
};

/**
 * Gedeeld segmented control (track: bg.base + border.strong, actief = 0.20 accent-pill +
 * border + SemiBold accent-tekst). Eén bron voor het Geslacht-veld én de PERIODE/TYPE-tabs
 * in de doel-sheet, zodat ze niet kunnen driften.
 */
export function Segmented<T extends string>({ options, value, onChange }: SegmentedProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.btn, active && styles.btnActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.btnText, active && styles.btnTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Track: bg.base + border.strong, 4px padding (Figma 52:9155).
  row: {
    flexDirection: 'row',
    backgroundColor: bg.base,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.strong,
    padding: space['4'],
  },
  btn: {
    flex: 1,
    height: space['44'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  btnActive: {
    // TODO: accent.selected-token (0.20) ontbreekt nog — zelfde hardcode als Chip/GoalSegments.
    backgroundColor: 'rgba(240, 84, 84, 0.20)',
    borderWidth: 1,
    borderColor: accent.default,
    borderRadius: radii.xs, // 4 = track-radius (8) − padding (4): pill nest exact.
  },
  btnText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.tertiary,
  },
  btnTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: accent.default,
  },
});
