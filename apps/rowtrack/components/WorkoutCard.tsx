import { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dot } from './Dot';
import { t } from '@/i18n';
import { bg, fg, accent, space, typeStyles } from '@/constants';

function fmtDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  if (isToday) return t.dates.today;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();
  if (isYesterday) return t.dates.yesterday;
  return `${d.getDate()} ${t.dates.monthsShort[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtDuration(sec: number | null): { value: string; unit: string } | null {
  if (sec == null) return null;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  if (h > 0) return { value: `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, unit: t.units.hourLong };
  return { value: `${m}:${String(s).padStart(2, '0')}`, unit: t.units.minuteShort };
}

function fmtMetersVU(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return { value: `${t}.${String(r).padStart(3, '0')}`, unit: 'm' };
  }
  return { value: `${m}`, unit: 'm' };
}

/** Minimale rij-data — zowel WorkoutSummary (historiek) als HomeWorkout (home) voldoen. */
export type WorkoutRowData = {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  calories: number | null;
};

export type WorkoutCardProps = {
  workout: WorkoutRowData;
  onPress: (id: string) => void;
  /** Rij-index voor zebra-striping — oneven rijen (1, 3, …) krijgen de raised tile. */
  index: number;
};

// Full-bleed zebra-tile trainingsrij (Figma "Workout / Variant2"). Gedeeld door de home-
// en historiek-lijst. De parent zorgt dat de rij edge-to-edge staat: home legt een
// negatieve marge op de lijst-container, de historiek-FlatList-content is al full-bleed.
export const WorkoutCard = memo(function WorkoutCard({
  workout: w,
  onPress,
  index,
}: WorkoutCardProps) {
  const dur = fmtDuration(w.duration_seconds);
  const dist = w.distance_meters != null ? fmtMetersVU(w.distance_meters) : null;

  return (
    <Pressable
      onPress={() => onPress(w.id)}
      style={({ pressed }) => [
        styles.row,
        index % 2 === 1 && styles.rowAlt,
        pressed && styles.rowPressed,
      ]}
    >
      <View style={styles.left}>
        <Text style={styles.date}>{fmtDate(w.started_at)}</Text>
        <View style={styles.statsRow}>
          {dur != null && (
            <View style={styles.durGroup}>
              <Text style={styles.value}>{dur.value}</Text>
              <Text style={styles.unit}>{dur.unit}</Text>
            </View>
          )}
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
        <Ionicons name="arrow-forward" size={16} color={accent.default} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space['20'],
    paddingVertical: space['12'],
    paddingHorizontal: space['20'],
  },
  // Zebra-striping: oneven rijen krijgen de raised tile; idem bij press.
  rowAlt: {
    backgroundColor: bg.raised,
  },
  rowPressed: {
    backgroundColor: bg.raised,
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
  durGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  value: {
    ...typeStyles.kpiValue,
    color: fg.primary,
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
    alignItems: 'center',
    gap: 2,
  },
  dotWrapper: {
    paddingBottom: 3,
  },
  caloriesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
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
});
