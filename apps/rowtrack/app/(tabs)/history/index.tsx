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
import { EmptyState, KpiSingle, TabItem, WorkoutCard } from '@/components';
import { formatTimerFull, formatSplit, formatDistanceDynamic } from '@/lib/formatters';
import {
  bg,
  fg,
  accent,
  border,
  radii,
  space,
  typeStyles,
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
  const totalDurSec = workouts.reduce((s, w) => s + w.duration_seconds, 0);
  const totalDistM = workouts.reduce((s, w) => s + w.distance_meters, 0);
  const totalDistFormatted = formatDistanceDynamic(totalDistM);
  const splitsWithData = workouts.filter(w => w.avg_split_seconds != null);
  const avgSplitSec = splitsWithData.length > 0
    ? splitsWithData.reduce((s, w) => s + (w.avg_split_seconds ?? 0), 0) / splitsWithData.length
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
      <Text style={styles.title} accessibilityRole="header">Historiek</Text>

      {/* Segment filter */}
      <View style={styles.segmentContainer}>
        {FILTERS.map(({ key, label }) => (
          <TabItem
            key={key}
            label={label}
            active={filter === key}
            onPress={() => setFilter(key)}
          />
        ))}
      </View>

      {/* KPI container — full width, bg.raised, border top+bottom */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiGridRow, styles.kpiGridRowBordered]}>
          <KpiSingle
            value={formatTimerFull(totalDurSec)}
            unit={totalDurSec >= 3600 ? 'uur' : 'min'}
            label={'TOTALE\nDUUR'}
            style={styles.kpiCell}
          />
          <KpiSingle
            value={totalDistFormatted.value}
            unit={totalDistFormatted.unit}
            label={'TOTALE\nAFSTAND'}
            style={styles.kpiCell}
          />
        </View>
        <View style={styles.kpiGridRow}>
          <KpiSingle
            value={avgSplitSec > 0 ? formatSplit(Math.round(avgSplitSec)) : '—'}
            unit={avgSplitSec > 0 ? '/500m' : ''}
            label={'GEMIDDELDE\nSPLIT'}
            style={styles.kpiCell}
          />
          <KpiSingle
            value={`${totalWorkouts}`}
            unit=""
            label={'AANTAL\nTRAININGEN'}
            style={styles.kpiCell}
          />
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
    paddingBottom: space['40'],
    gap: space['28'],
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
    paddingHorizontal: space['20'],
    paddingTop: space['8'],
  },

  // Segment filter
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.strong,
    borderRadius: radii.sm,
    padding: space['4'],
    height: 52,
    marginHorizontal: space['20'],
  },

  // KPI container — full-width bg.raised stripe
  kpiContainer: {
    backgroundColor: bg.raised,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: border.default,
    paddingHorizontal: space['20'],
  },
  kpiGridRow: {
    flexDirection: 'row',
    paddingVertical: space['16'],
  },
  kpiGridRowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
  },
  kpiCell: {
    flex: 1,
    paddingHorizontal: space['4'],
  },

  loader: {
    paddingVertical: space['40'],
  },
  workoutList: {
    gap: space['8'],
    paddingHorizontal: space['20'],
  },
});
