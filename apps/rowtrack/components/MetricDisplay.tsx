import { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  accent,
  fg,
  label,
  mono,
  fontFamily,
  fontSize,
  space,
} from '@/constants';

export type MetricDisplayProps = {
  value: string | number;
  label: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const MetricDisplay = memo(function MetricDisplay({
  value,
  label: metricLabel,
  unit,
  size = 'sm',
}: MetricDisplayProps) {
  return (
    <View style={sizeStyles[size].container}>
      <Text style={sizeStyles[size].value}>{value}</Text>
      {unit && <Text style={sizeStyles[size].unit}>{unit}</Text>}
      <Text style={sizeStyles[size].label}>{metricLabel}</Text>
    </View>
  );
});

const sizeStyles = {
  sm: StyleSheet.create({
    container: {
      gap: space.px,
    },
    value: {
      ...mono.md,
      color: fg.primary,
    },
    unit: {
      ...mono.sm,
      color: fg.secondary,
    },
    label: {
      ...label.caps,
      color: fg.tertiary,
      fontSize: fontSize['10'],
    },
  }),
  md: StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: space['4'],
    },
    value: {
      fontFamily: fontFamily.monoMedium,
      fontSize: fontSize['20'],
      lineHeight: fontSize['20'] * 1.1,
      color: accent.default,
    },
    unit: {
      ...mono.sm,
      color: fg.secondary,
    },
    label: {
      ...label.caps,
      color: fg.tertiary,
      fontSize: fontSize['10'],
    },
  }),
  lg: StyleSheet.create({
    container: {
      alignItems: 'center',
      gap: space.px,
    },
    value: {
      fontFamily: fontFamily.monoMedium,
      fontSize: fontSize['36'],
      lineHeight: fontSize['36'] * 1.1,
      color: fg.primary,
    },
    unit: {
      ...mono.sm,
      color: fg.secondary,
    },
    label: {
      ...label.caps,
      color: fg.tertiary,
      marginTop: space['4'],
    },
  }),
};
