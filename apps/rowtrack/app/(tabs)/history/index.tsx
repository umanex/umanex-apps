import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { BottomFade, EmptyState, ErrorState, KpiSingle, Segmented, WorkoutCard } from '@/components';
import { formatTimerFull, formatDistanceDynamic } from '@/lib/formatters';
import { t } from '@/i18n';
import {
  bg,
  fg,
  accent,
  border,
  space,
  typeStyles,
} from '@/constants';
import type { WorkoutSummary } from '@/types/workout';

type HistoryFilter = 'week' | 'month' | 'year' | 'all';

const FILTERS: { value: HistoryFilter; label: string }[] = [
  { value: 'week',  label: t.history.filterWeek  },
  { value: 'month', label: t.history.filterMonth },
  { value: 'year',  label: t.history.filterYear  },
  { value: 'all',   label: t.history.filterAll   },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [filter, setFilter] = useState<HistoryFilter>('week');
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

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
    } else if (filter === 'month') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 1);
      query = query.gte('started_at', from.toISOString());
    } else if (filter === 'year') {
      const from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
      query = query.gte('started_at', from.toISOString());
    }

    // Leesfout onderscheiden van "geen data": een netwerk-/backendfout mag niet
    // als lege lijst renderen (security-audit P2-2).
    const { data, error: queryError } = await query;
    if (queryError) {
      reportError(queryError, { where: 'history.fetchWorkouts', filter });
      setError(true);
    } else {
      setError(false);
      setWorkouts((data ?? []) as WorkoutSummary[]);
    }
    setLoading(false);
  }, [user, filter]);

  // Refetch bij focus (ook bij terugkeer uit de detail na een delete), zodat een
  // verwijderde workout niet stale in de lijst blijft staan.
  useFocusEffect(
    useCallback(() => {
      fetchWorkouts();
    }, [fetchWorkouts]),
  );

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
  const totalCalories = workouts.reduce((s, w) => s + (w.calories ?? 0), 0);

  // Header: titel + segment-filter + KPI-band. Als ListHeaderComponent van de
  // FlatList, zodat de lijst gevirtualiseerd rendert (P2-5) i.p.v. alle rijen
  // tegelijk in een ScrollView.
  const listHeader = (
    <>
      <Text style={styles.title} accessibilityRole="header">{t.history.title}</Text>

      {/* Segment filter */}
      <Segmented
        variant="band"
        style={styles.segmentContainer}
        options={FILTERS}
        value={filter}
        onChange={setFilter}
      />

      {/* KPI container — full width, bg.raised, border top+bottom */}
      <View style={styles.kpiContainer}>
        <View style={[styles.kpiGridRow, styles.kpiGridRowBordered]}>
          <KpiSingle
            value={formatTimerFull(totalDurSec)}
            label={t.kpi.totalDuration}
            style={styles.kpiCell}
          />
          <KpiSingle
            value={totalDistFormatted.value}
            unit={totalDistFormatted.unit}
            label={t.kpi.totalDistance}
            style={styles.kpiCell}
          />
        </View>
        <View style={styles.kpiGridRow}>
          <KpiSingle
            value={`${totalCalories}`}
            unit="kcal"
            label={t.kpi.totalEnergy}
            style={styles.kpiCell}
          />
          <KpiSingle
            value={`${totalWorkouts}`}
            unit=""
            label={t.kpi.totalWorkouts}
            style={styles.kpiCell}
          />
        </View>
      </View>
    </>
  );

  const listEmpty = loading ? (
    <ActivityIndicator color={accent.default} style={styles.loader} />
  ) : error ? (
    <ErrorState onRetry={fetchWorkouts} />
  ) : (
    <EmptyState icon="time-outline" title={t.history.emptyTitle} />
  );

  return (
    <View style={styles.screen}>
      <FlatList
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.content}
        data={workouts}
        keyExtractor={(w) => w.id}
        renderItem={({ item, index }) => (
          <WorkoutCard
            workout={item}
            onPress={handleWorkoutPress}
            index={index}
          />
        )}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accent.default}
          />
        }
      />
      <BottomFade />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: bg.base,
  },
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  // Sectie-afstanden via marginBottom/marginTop per blok (segments 28 onder de titel,
  // KPI-band flush eronder) i.p.v. een uniforme gap — spiegelt de detail-flow.
  content: {
    paddingTop: space['20'],
    paddingBottom: space['40'],
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
    paddingHorizontal: space['20'],
    paddingTop: space['8'],
  },

  // Segment filter — positionering; de band-visual (bg.elevated, top/bottom-divider,
  // full-bleed) zit in Segmented variant="band". 28 boven, flush tegen de KPI-band eronder.
  segmentContainer: {
    marginTop: space['28'],
  },

  // KPI container — full-width bg.raised stripe, flush onder de segments. Bottom-only
  // border (Figma KPI Row sides [0,1,0,0]); de segments-onderrand vormt de bovenlijn.
  kpiContainer: {
    backgroundColor: bg.raised,
    borderBottomWidth: 1,
    borderColor: border.default,
    paddingHorizontal: space['20'],
    marginBottom: space['16'],
  },
  kpiGridRow: {
    flexDirection: 'row',
    paddingVertical: space['16'],
    gap: space['20'],
  },
  kpiGridRowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
  },
  kpiCell: {
    flex: 1,
  },

  loader: {
    paddingVertical: space['40'],
  },
});
