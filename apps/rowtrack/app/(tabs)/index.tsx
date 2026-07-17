import { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { loadPendingWorkout, clearPendingWorkout } from '@/lib/pendingWorkout';
import { EmptyState, ErrorState, KpiSingle, Button, WorkoutCard, GoalSheet } from '@/components';
import { GoalProgressCard } from '@/components/GoalProgressCard';
import { Subtitle } from '@/components/Subtitle';
import { usePeriodGoal } from '@/lib/hooks/usePeriodGoal';
import { t } from '@/i18n';
import {
  bg,
  fg,
  accent,
  border,
  typeStyles,
  space,
  fontFamily,
  fontSize,
  letterSpacing,
} from '@/constants';

type HomeWorkout = {
  id: string;
  started_at: string;
  duration_seconds: number | null;
  distance_meters: number | null;
  avg_watts: number | null;
  avg_spm: number | null;
  avg_split_seconds: number | null;
  calories: number | null;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t.home.greetingMorning;
  if (hour < 18) return t.home.greetingAfternoon;
  return t.home.greetingEvening;
}


function fmtPrDistance(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const km = m / 1000;
    return { value: km % 1 === 0 ? `${km}` : `${km.toFixed(1)}`, unit: 'km' };
  }
  return { value: `${m}`, unit: 'm' };
}

function fmtPr2k(sec: number): { value: string; unit: string } {
  const total = Math.round(sec); // round first so 7:59.7 → 8:00, never "7:60"
  const m = Math.floor(total / 60);
  const s = total % 60;
  return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'min' };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [workouts, setWorkouts] = useState<HomeWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutsError, setWorkoutsError] = useState(false);

  const { goalProgress, records, refetch: refetchGoal } = usePeriodGoal(user?.id);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Eerder mislukte (offline) workout-opslag alsnog wegschrijven vóór we lezen,
    // zodat een gedrainede rit meteen in de lijst verschijnt (security-audit P2-4).
    const pending = await loadPendingWorkout();
    if (pending && pending.user_id === user.id) {
      const { error: drainError } = await supabase.from('workouts').insert(pending);
      if (drainError) reportError(drainError, { where: 'home.drainPendingWorkout' });
      else await clearPendingWorkout();
    }

    const [profileRes, workoutsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single(),
      supabase
        .from('workouts')
        .select('id, started_at, duration_seconds, distance_meters, avg_watts, avg_spm, avg_split_seconds, calories')
        .order('started_at', { ascending: false })
        .limit(3),
    ]);

    if (profileRes.error) reportError(profileRes.error, { where: 'home.fetchProfile' });
    if (profileRes.data?.display_name) {
      setDisplayName(profileRes.data.display_name);
    }

    // Leesfout onderscheiden van "geen workouts" (security-audit P2-2).
    if (workoutsRes.error) {
      reportError(workoutsRes.error, { where: 'home.fetchWorkouts' });
      setWorkoutsError(true);
    } else {
      setWorkoutsError(false);
      setWorkouts((workoutsRes.data ?? []) as HomeWorkout[]);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchData(), refetchGoal()]);
    setRefreshing(false);
  }, [fetchData, refetchGoal]);

  const handleWorkoutPress = useCallback((id: string) => {
    router.push(`/(tabs)/history/${id}`);
  }, [router]);

  const greeting = getGreeting();
  const name = displayName || t.home.nameFallback;

  const hasPrRecords =
    records.longestDistance != null ||
    records.best2k != null;

  return (
    <>
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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <Button
          variant="primary"
          size="lg"
          title={t.home.startButton}
          icon="arrow-forward"
          iconPosition="trailing"
          onPress={() => router.push('/(tabs)/workout')}
        />
      </View>

      {/* Goal progress */}
      {goalProgress && (
        <GoalProgressCard
          progress={goalProgress}
          // Wijzigen opent de doel-bottomsheet in-place (gedeelde GoalSheet, geen redirect).
          onEdit={() => setGoalSheetOpen(true)}
        />
      )}

      {/* PR + Recent sections */}
      <View style={styles.body}>
        {hasPrRecords && (
          <View style={styles.prSection}>
            <Subtitle label={t.home.prSectionTitle} />
            <View style={styles.prRow}>
              {records.longestDistance != null && (() => {
                const { value, unit } = fmtPrDistance(records.longestDistance!);
                return (
                  <KpiSingle
                    style={styles.prCell}
                    value={value}
                    unit={unit}
                    label={t.home.prMaxDistance}
                  />
                );
              })()}
              {records.best2k != null && (() => {
                const { value, unit } = fmtPr2k(records.best2k!);
                return (
                  <KpiSingle
                    style={styles.prCell}
                    value={value}
                    unit={unit}
                    label={t.home.prBest2k}
                  />
                );
              })()}
            </View>
          </View>
        )}

        <View style={[styles.recentSection, hasPrRecords && styles.recentSectionBorder]}>
          <Subtitle
            label={t.home.recentTitle}
            action={{ label: t.home.allAction, onPress: () => router.push('/(tabs)/history') }}
          />

          {loading ? (
            <ActivityIndicator color={accent.default} style={styles.loader} />
          ) : workoutsError ? (
            <ErrorState onRetry={fetchData} />
          ) : workouts.length === 0 ? (
            <EmptyState
              icon="water-outline"
              title={t.home.emptyTitle}
            />
          ) : (
            <View style={styles.workoutList}>
              {workouts.map((w, i) => (
                <WorkoutCard
                  key={w.id}
                  workout={w}
                  onPress={handleWorkoutPress}
                  index={i}
                />
              ))}
            </View>
          )}
        </View>
      </View>
    </ScrollView>

    <GoalSheet
      visible={goalSheetOpen}
      currentGoal={goalProgress?.goal ?? null}
      userId={user?.id}
      onClose={() => setGoalSheetOpen(false)}
      onSaved={refetchGoal}
    />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  content: {
    paddingTop: space['28'],
    paddingBottom: space['32'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space['20'],
    paddingBottom: space['28'],
  },
  // Eyebrow boven de naam (Figma 16:159): Albert Sans SemiBold 13, 20% tracking, uppercase,
  // uitgelijnd met de naam. (Was Source Serif italic — week af van het design.)
  greeting: {
    fontFamily: fontFamily.albertSansSemiBold,
    fontSize: fontSize['13'],
    letterSpacing: letterSpacing.wide * fontSize['13'],
    textTransform: 'uppercase',
    color: fg.secondary,
  },
  name: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },

  // Body
  body: {
    paddingHorizontal: space['20'],
    paddingTop: space['28'],
    paddingBottom: space['28'],
  },

  // PR section
  prSection: {
    gap: space['16'],
    paddingBottom: space['28'],
  },
  prRow: {
    flexDirection: 'row',
    gap: space['16'],
  },
  prCell: {
    flex: 1,
  },

  // Recent section
  recentSection: {
    gap: space['16'],
  },
  recentSectionBorder: {
    borderTopWidth: 1,
    borderTopColor: border.strong,
    paddingTop: space['28'],
  },
  loader: {
    paddingVertical: space['40'],
  },

  // Recente-trainingen-lijst — full-bleed zebra-tiles (gedeelde WorkoutCard). De negatieve
  // marge laat de tiles edge-to-edge lopen binnen de horizontaal gepadde sectie.
  workoutList: {
    marginHorizontal: -space['20'],
  },
});
