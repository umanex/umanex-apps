import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { formatDuration } from '@/lib/formatters';
import { background, brand, text as textColors, fontFamily } from '@/constants';
import type { WorkoutSummary } from '@/types/workout';

const NL_MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'] as const;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMeters(m: number): string {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return `${t}.${String(r).padStart(3, '0')} m`;
  }
  return `${m} m`;
}

export interface WorkoutCardProps {
  workout: WorkoutSummary;
  onPress: (id: string) => void;
}

export const WorkoutCard = memo(function WorkoutCard({
  workout: w,
  onPress,
}: WorkoutCardProps) {
  const subtitle = [
    formatDuration(w.duration_seconds),
    w.calories != null ? `${w.calories} kcal` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(w.id)}
      style={styles.card}
    >
      <View style={styles.left}>
        <Text style={styles.date}>{fmtDate(w.started_at)}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.distance}>{fmtMeters(w.distance_meters)}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    height: 68,
    backgroundColor: background.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flex: 1,
    gap: 2,
  },
  date: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: textColors.primary,
  },
  subtitle: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: textColors.secondary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  distance: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: brand.primary,
  },
  chevron: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 20,
    color: '#47556E',
  },
});
