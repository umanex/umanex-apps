import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EmptyState, WorkoutCard } from '@/components';
import { formatDuration } from '@/lib/formatters';
import {
  background,
  brand,
  text as textColors,
  display,
  space,
  fontFamily,
  fontSize,
  radii,
} from '@/constants';
import type { WorkoutSummary } from '@/types/workout';

type HistoryFilter = 'week' | 'maand' | 'jaar' | 'alle';

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: 'week',  label: 'Week'  },
  { key: 'maand', label: 'Maand' },
  { key: 'jaar',  label: 'Jaar'  },
  { key: 'alle',  label: 'Alle'  },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<HistoryFilter>('week');
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWorkouts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from('workouts')
      .select('id, started_at, duration_seconds, distance_meters, avg_watts, avg_spm, avg_split_seconds, calories')
      .order('started_at', { ascending: false });

    const now = new Date();
    if (filter === 'week') {
      const from = new Date(now);
      from.setDate(from.getDate() - 7);
      query = query.gte('started_at', from.toISOString());
    } else if (filter === 'maand') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      query = query.gte('started_at', from.toISOString());
    } else if (filter === 'jaar') {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      query = query.gte('started_at', from.toISOString());
    }

    const { data } = await query;
    setWorkouts((data ?? []) as WorkoutSummary[]);
    setLoading(false);
  }, [user, filter]);

  useEffect(() => {
    fetchWorkouts();
  }, [fetchWorkouts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWorkouts();
    setRefreshing(false);
  }, [fetchWorkouts]);

  const handleWorkoutPress = useCallback((id: string) => {
    router.push(`/(tabs)/history/${id}`);
  }, [router]);

  // --- KPI berekeningen ---
  const totalWorkouts = workouts.length;
  const totalKm = workouts.reduce((s, w) => s + w.distance_meters, 0) / 1000;
  const avgDurSec =
    workouts.length > 0
      ? workouts.reduce((s, w) => s + w.duration_seconds, 0) / workouts.length
      : 0;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={brand.primary}
        />
      }
    >
      <Text style={styles.title}>Historiek</Text>

      {/* Segment filter */}
      <View style={styles.segmentContainer}>
        {FILTERS.map(({ key, label }) => {
          const active = filter === key;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.segment, active && styles.segmentActive]}
              onPress={() => setFilter(key)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{totalWorkouts}</Text>
          <Text style={styles.kpiLabel}>WORKOUTS</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{totalKm.toFixed(1).replace('.', ',')}</Text>
          <Text style={styles.kpiLabel}>KM TOTAAL</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>
            {avgDurSec > 0 ? formatDuration(Math.round(avgDurSec)) : '—'}
          </Text>
          <Text style={styles.kpiLabel}>GEM. DUUR</Text>
        </View>
      </View>

      {/* Workout lijst */}
      {loading ? (
        <ActivityIndicator color={brand.primary} style={styles.loader} />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Geen workouts in deze periode."
        />
      ) : (
        <View style={styles.workoutList}>
          {workouts.map((w) => (
            <WorkoutCard key={w.id} workout={w} onPress={handleWorkoutPress} />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const C_TEXT_MUTED = '#47556E';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.base,
  },
  content: {
    paddingHorizontal: space['5'],
    paddingBottom: space[10],
    gap: space[4],
  },
  title: {
    ...display.sm,
    color: textColors.primary,
    paddingTop: space[4],
  },

  // Segment filter
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: background.surface,
    borderRadius: 10,
    padding: 4,
    height: 52,
  },
  segment: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  segmentActive: {
    backgroundColor: brand.primary,
  },
  segmentText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['13'],
    color: textColors.secondary,
  },
  segmentTextActive: {
    color: '#0A0A0F',
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: background.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  kpiValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: textColors.primary,
  },
  kpiLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 11,
    color: C_TEXT_MUTED,
    letterSpacing: 0.55,
  },

  loader: {
    paddingVertical: space[10],
  },
  workoutList: {
    gap: space[2],
  },
});
