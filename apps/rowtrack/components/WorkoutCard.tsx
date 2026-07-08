import { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Dot } from './Dot';
import { formatTimerFull } from '@/lib/formatters';
import { fg, accent, border, space, typeStyles } from '@/constants';
import type { WorkoutSummary } from '@/types/workout';

const NL_MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'] as const;

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return 'Vandaag';
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return 'Gisteren';
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtMetersVU(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return { value: `${t}.${String(r).padStart(3, '0')}`, unit: 'm' };
  }
  return { value: `${m}`, unit: 'm' };
}

export type WorkoutCardProps = {
  workout: WorkoutSummary;
  onPress: (id: string) => void;
  isLast?: boolean;
}

export const WorkoutCard = memo(function WorkoutCard({
  workout: w,
  onPress,
  isLast = false,
}: WorkoutCardProps) {
  const durStr = formatTimerFull(w.duration_seconds);
  const durUnit = w.duration_seconds >= 3600 ? 'uur' : '';
  const dist = w.distance_meters != null ? fmtMetersVU(w.distance_meters) : null;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onPress(w.id)}
      style={[styles.row, isLast && styles.rowLast]}
    >
      <View style={styles.left}>
        <Text style={styles.date}>{fmtDate(w.started_at)}</Text>
        <View style={styles.statsRow}>
          <View style={styles.durGroup}>
            <Text style={styles.value}>{durStr}</Text>
            {!!durUnit && <Text style={styles.unit}>{durUnit}</Text>}
          </View>
          {w.calories != null && (
            <>
              <View style={styles.dotWrapper}>
                <Dot />
              </View>
              <View style={styles.caloriesGroup}>
                <Text style={styles.value}>{w.calories}</Text>
                <Text style={styles.unit}>kcal</Text>
              </View>
            </>
          )}
        </View>
      </View>
      <View style={styles.right}>
        {dist != null && (
          <View style={styles.distRow}>
            <Text style={styles.distValue}>{dist.value}</Text>
            <Text style={styles.distUnit}>{dist.unit}</Text>
          </View>
        )}
        <Text style={styles.arrow}>→</Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space['20'],
    paddingVertical: space['4'],
    borderBottomWidth: 1,
    borderBottomColor: border.default,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flex: 1,
    gap: space['6'],
  },
  date: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['6'],
  },
  value: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
  dotWrapper: {
    paddingBottom: 3,
  },
  durGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  caloriesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  unit: {
    ...typeStyles.kpiUnit,
    color: fg.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['8'],
  },
  distRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  distValue: {
    ...typeStyles.kpiValue,
    color: fg.onAccent,
  },
  distUnit: {
    ...typeStyles.kpiUnit,
    color: fg.onAccent,
  },
  arrow: {
    ...typeStyles.kpiValue,
    color: accent.default,
  },
});
