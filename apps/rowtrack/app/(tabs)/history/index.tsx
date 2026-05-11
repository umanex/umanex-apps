import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EmptyState, Segment, WorkoutCard } from '@/components';
import { formatDuration } from '@/lib/formatters';
import {
  bg,
  fg,
  accent,
  border,
  space,
  typeStyles,
  fontFamily,
  fontSize,
  componentRadius,
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
          tintColor={accent.default}
        />
      }
    >
      <Text style={styles.title}>Historiek</Text>

      {/* Segment filter */}
      <View style={styles.segmentContainer}>
        {FILTERS.map(({ key, label }) => (
          <Segment
            key={key}
            label={label}
            active={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </View>

      {/* KPI row */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{totalWorkouts}</Text>
          <Text style={styles.kpiLabel}>AANTAL{'\n'}TRAININGEN</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>{totalKm.toFixed(1).replace('.', ',')}</Text>
          <Text style={styles.kpiLabel}>TOTALE{'\n'}AFSTAND</Text>
        </View>
        <View style={styles.kpiTile}>
          <Text style={styles.kpiValue}>
            {avgDurSec > 0 ? formatDuration(Math.round(avgDurSec)) : '—'}
          </Text>
          <Text style={styles.kpiLabel}>GEM.{'\n'}DUUR</Text>
        </View>
      </View>

      {/* Workout lijst */}
      {loading ? (
        <ActivityIndicator color={accent.default} style={styles.loader} />
      ) : workouts.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="Geen workouts in deze periode."
        />
      ) : (
        <View style={styles.workoutList}>
          {workouts.map((w, i) => (
            <WorkoutCard
              key={w.id}
              workout={w}
              onPress={handleWorkoutPress}
              isLast={i === workouts.length - 1}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  content: {
    paddingTop: space['20'],
    paddingHorizontal: space['20'],
    paddingBottom: space['40'],
    gap: space['20'],
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },

  // Segment filter
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    padding: 4,
    height: 52,
  },

  // KPI row
  kpiRow: {
    flexDirection: 'row',
    gap: space['12'],
  },
  kpiTile: {
    flex: 1,
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    paddingHorizontal: space['8'],
    paddingVertical: space['12'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['4'],
  },
  kpiValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['22'],
    color: fg.primary,
  },
  kpiLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
    textAlign: 'center',
  },

  loader: {
    paddingVertical: space['40'],
  },
  workoutList: {
    gap: space['12'],
  },
});
