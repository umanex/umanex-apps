import { useCallback, useState } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { EmptyState, Dot } from '@/components';
import { GoalProgressCard } from '@/components/GoalProgressCard';
import { Subtitle } from '@/components/Subtitle';
import { usePeriodGoal } from '@/lib/hooks/usePeriodGoal';
import {
  bg,
  fg,
  accent,
  border,
  typeStyles,
  space,
  componentRadius,
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

const NL_MONTHS = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'] as const;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Goedemorgen,';
  if (hour < 18) return 'Goedemiddag,';
  return 'Goedenavond,';
}

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

function fmtDuration(sec: number | null): string | null {
  if (sec == null) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function fmtMetersVU(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return { value: `${t}.${String(r).padStart(3, '0')}`, unit: 'm' };
  }
  return { value: `${m}`, unit: 'm' };
}

function fmtPrDistance(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const km = m / 1000;
    return { value: km % 1 === 0 ? `${km}` : `${km.toFixed(1)}`, unit: 'km' };
  }
  return { value: `${m}`, unit: 'm' };
}

function fmtPrDuration(sec: number): { value: string; unit: string } {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return { value: `${h}u${m > 0 ? ` ${m}` : ''}`, unit: 'min' };
  return { value: `${m}`, unit: 'min' };
}

function fmtPrSplit(sec: number): { value: string; unit: string } {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return { value: `${m}:${String(s).padStart(2, '0')}`, unit: '/500m' };
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [workouts, setWorkouts] = useState<HomeWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { goalProgress, records, refetch: refetchGoal } = usePeriodGoal(user?.id);

  const fetchData = useCallback(async () => {
    if (!user) return;

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

    if (profileRes.data?.display_name) {
      setDisplayName(profileRes.data.display_name);
    }
    setWorkouts((workoutsRes.data ?? []) as HomeWorkout[]);
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
  const name = displayName || 'roeier';

  const hasPrRecords =
    records.longestDistance != null ||
    records.longestDuration != null;

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
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting}</Text>
          <Text style={styles.name}>{name}</Text>
        </View>
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/(tabs)/workout')}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>Start</Text>
          <Text style={styles.startButtonArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Goal progress */}
      {goalProgress && (
        <GoalProgressCard
          progress={goalProgress}
          onEdit={() => router.push('/(tabs)/profile')}
        />
      )}

      {/* PR block */}
      {hasPrRecords && (
        <View style={styles.prSection}>
          <Subtitle label="Persoonlijke records" />
          <View style={styles.prRow}>
            {records.longestDistance != null && (() => {
              const { value, unit } = fmtPrDistance(records.longestDistance!);
              return (
                <View style={styles.prCell}>
                  <View style={styles.prValueRow}>
                    <Text style={styles.prValue}>{value}</Text>
                    <Text style={styles.prUnit}>{unit}</Text>
                  </View>
                  <Text style={styles.prLabel}>{'Maximale\nafstand'}</Text>
                </View>
              );
            })()}
            {records.longestDuration != null && (() => {
              const { value, unit } = fmtPrDuration(records.longestDuration!);
              return (
                <View style={styles.prCell}>
                  <View style={styles.prValueRow}>
                    <Text style={styles.prValue}>{value}</Text>
                    <Text style={styles.prUnit}>{unit}</Text>
                  </View>
                  <Text style={styles.prLabel}>{'Beste tijd\n2000m'}</Text>
                </View>
              );
            })()}
          </View>
        </View>
      )}

      {/* Recent workouts */}
      <View style={styles.section}>
        <Subtitle
          label="Recente trainingen"
          action={{
            label: 'alle',
            onPress: () => router.push('/(tabs)/history'),
          }}
        />

        {loading ? (
          <ActivityIndicator color={accent.default} style={styles.loader} />
        ) : workouts.length === 0 ? (
          <EmptyState
            icon="water-outline"
            title="Nog geen workouts — tijd om te beginnen!"
          />
        ) : (
          <View style={styles.workoutList}>
            {workouts.map((w, i) => {
              const durStr = fmtDuration(w.duration_seconds);
              const distVU = w.distance_meters != null ? fmtMetersVU(w.distance_meters) : null;
              const isLast = i === workouts.length - 1;

              return (
                <TouchableOpacity
                  key={w.id}
                  style={[styles.workoutRow, isLast && styles.workoutRowLast]}
                  onPress={() => handleWorkoutPress(w.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.workoutLeft}>
                    <Text style={styles.workoutDay}>{fmtDate(w.started_at)}</Text>
                    <View style={styles.workoutStatsRow}>
                      {durStr != null && (
                        <Text style={styles.workoutValue}>{durStr}</Text>
                      )}
                      {w.calories != null && (
                        <>
                          <View style={styles.dotWrapper}>
                            <Dot />
                          </View>
                          <View style={styles.caloriesGroup}>
                            <Text style={styles.workoutValue}>{w.calories}</Text>
                            <Text style={styles.workoutUnit}>kcal</Text>
                          </View>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={styles.workoutRight}>
                    {distVU != null && (
                      <View style={styles.workoutDistRow}>
                        <Text style={styles.workoutDistValue}>{distVU.value}</Text>
                        <Text style={styles.workoutDistUnit}>{distVU.unit}</Text>
                      </View>
                    )}
                    <Text style={styles.workoutArrow}>→</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
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
    paddingBottom: space['32'],
    gap: space['20'],
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space['20'],
  },
  greeting: {
    fontFamily: fontFamily.sourceSerifItalic,
    fontSize: fontSize['14'],
    lineHeight: 21,
    letterSpacing: letterSpacing.subtle * fontSize['14'],
    color: fg.secondary,
    marginBottom: -2,
    paddingLeft: space['20'],
  },
  name: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: typeStyles.buttonOutline.fontSize - 6,
    borderWidth: 1,
    borderColor: accent.default,
    borderRadius: componentRadius.buttonOutline,
    backgroundColor: accent.subtle,
    paddingHorizontal: space['22'],
    paddingTop: space['14'],
    paddingBottom: space['12'],
  },
  startButtonText: {
    ...typeStyles.buttonOutline,
    color: accent.default,
  },
  startButtonArrow: {
    ...typeStyles.buttonOutline,
    color: accent.default,
  },

  // PR block
  prSection: {
    padding: space['20'],
    gap: space['16'],
  },
  prRow: {
    flexDirection: 'row',
    gap: space['16'],
  },
  prCell: {
    flex: 1,
    gap: space['6'],
  },
  prValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  prValue: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  prUnit: {
    ...typeStyles.kpiUnit,
    color: fg.secondary,
  },
  prLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },

  // Recent workouts section
  section: {
    gap: space['16'],
    paddingHorizontal: space['20'],
  },
  loader: {
    paddingVertical: space['40'],
  },

  // Workout list + rows
  workoutList: {
    gap: space['8'],
  },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space['20'],
    paddingTop: space['4'],
    paddingBottom: space['12'],
    borderBottomWidth: 1,
    borderBottomColor: border.subtle,
  },
  workoutRowLast: {
    borderBottomWidth: 0,
  },
  workoutLeft: {
    flex: 1,
    gap: space['4'],
  },
  workoutDay: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['6'],
  },
  workoutValue: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
  workoutUnit: {
    ...typeStyles.kpiUnit,
    color: fg.primary,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['8'],
  },
  workoutDistRow: {
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
  workoutDistValue: {
    ...typeStyles.kpiValue,
    color: fg.onAccent,
  },
  workoutDistUnit: {
    ...typeStyles.kpiUnit,
    color: fg.onAccent,
  },
  workoutArrow: {
    ...typeStyles.kpiValue,
    color: accent.default,
  },
});
