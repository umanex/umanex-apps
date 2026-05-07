import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
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
import { EmptyState } from '@/components';
import { PeriodGoalCard } from '@/components/PeriodGoalCard';
import { fontFamily } from '@/constants';
import { usePeriodGoal } from '@/lib/hooks/usePeriodGoal';

const C_BG = '#0A0E1A';
const C_SURFACE = '#1A1F2E';
const C_CYAN = '#00E5FF';
const C_TEXT_ON_CYAN = '#0A0A0F';
const C_TEXT_WHITE = '#F8FAFC';
const C_TEXT_MUTED = '#94A3B8';
const C_GREETING = '#D2D2D2';
const C_SECTION_LABEL = '#AAAAAA';
const C_DIVIDER = '#47556E';

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
  if (hour < 12) return 'Goedemorgen';
  if (hour < 18) return 'Goedemiddag';
  return 'Goedenavond';
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${NL_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function fmtStartTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// nl-BE: always show meters with dot-thousands separator
function fmtMeters(m: number): string {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return `${t}.${String(r).padStart(3, '0')} m`;
  }
  return `${m} m`;
}

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

// PR card value + unit helpers (split for baseline-row display)
function fmtPrDistance(m: number): { value: string; unit: string } {
  if (m >= 1000) {
    const t = Math.floor(m / 1000);
    const r = m % 1000;
    return { value: `${t}.${String(r).padStart(3, '0')}`, unit: 'm' };
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
    records.longestDuration != null ||
    records.fastestSplit != null;

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={C_CYAN}
        />
      }
    >
      {/* Header */}
      <View style={styles.headerSection}>
        <View>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.nameText}>{name}</Text>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={() => router.push('/(tabs)/workout')}
          activeOpacity={0.8}
        >
          <Ionicons name="barbell-outline" size={22} color={C_TEXT_ON_CYAN} />
          <Text style={styles.ctaText}>Start</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Period goal */}
      {goalProgress && (
        <>
          <PeriodGoalCard progress={goalProgress} />
          <View style={styles.divider} />
        </>
      )}

      {/* Personal records */}
      {hasPrRecords && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PERSOONLIJKE RECORDS</Text>
            <View style={styles.prRow}>
              {records.longestDistance != null && (() => {
                const { value, unit } = fmtPrDistance(records.longestDistance!);
                return (
                  <View style={styles.prCard}>
                    <View style={styles.prValueRow}>
                      <Text style={styles.prValue}>{value}</Text>
                      <Text style={styles.prUnit}>{unit}</Text>
                    </View>
                    <Text style={styles.prLabel}>MAX. AFSTAND</Text>
                  </View>
                );
              })()}
              {records.longestDuration != null && (() => {
                const { value, unit } = fmtPrDuration(records.longestDuration!);
                return (
                  <View style={styles.prCard}>
                    <View style={styles.prValueRow}>
                      <Text style={styles.prValue}>{value}</Text>
                      <Text style={styles.prUnit}>{unit}</Text>
                    </View>
                    <Text style={styles.prLabel}>LANGSTE DUUR</Text>
                  </View>
                );
              })()}
              {records.fastestSplit != null && (() => {
                const { value, unit } = fmtPrSplit(records.fastestSplit!);
                return (
                  <View style={styles.prCard}>
                    <View style={styles.prValueRow}>
                      <Text style={styles.prValue}>{value}</Text>
                      <Text style={styles.prUnit}>{unit}</Text>
                    </View>
                    <Text style={styles.prLabel}>SNELSTE SPLIT</Text>
                  </View>
                );
              })()}
            </View>
          </View>
          <View style={styles.divider} />
        </>
      )}

      {/* Recent workouts */}
      <View style={styles.section}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionLabel}>RECENTE WORKOUTS</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={styles.sectionLink}>Bekijk alle →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={C_CYAN} style={styles.loader} />
        ) : workouts.length === 0 ? (
          <EmptyState
            icon="water-outline"
            title="Nog geen workouts — tijd om te beginnen!"
          />
        ) : (
          <View style={styles.workoutList}>
            {workouts.map((w) => {
              const subtitle = [
                fmtStartTime(w.started_at),
                w.calories != null ? `${w.calories} kcal` : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <TouchableOpacity
                  key={w.id}
                  style={styles.workoutCard}
                  onPress={() => handleWorkoutPress(w.id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.workoutLeft}>
                    <Text style={styles.workoutDate}>{fmtDate(w.started_at)}</Text>
                    <Text style={styles.workoutSubtitle}>{subtitle}</Text>
                  </View>
                  <View style={styles.workoutRight}>
                    {w.distance_meters != null && (
                      <Text style={styles.workoutDistance}>
                        {fmtMeters(w.distance_meters)}
                      </Text>
                    )}
                    <Text style={styles.workoutChevron}>›</Text>
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
    backgroundColor: C_BG,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 16,
  },
  divider: {
    height: 1,
    backgroundColor: C_DIVIDER,
    marginVertical: 8,
  },

  // Header
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  greetingText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 16,
    color: C_GREETING,
  },
  nameText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 28,
    color: C_TEXT_WHITE,
  },
  ctaButton: {
    height: 52,
    borderRadius: 12,
    backgroundColor: C_CYAN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 8,
  },
  ctaText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: C_TEXT_ON_CYAN,
  },

  // Sections
  section: {
    gap: 16,
  },
  sectionLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 12,
    color: C_SECTION_LABEL,
    letterSpacing: 0.96,
  },

  // PR row
  prRow: {
    flexDirection: 'row',
    gap: 12,
  },
  prCard: {
    flex: 1,
    backgroundColor: C_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    gap: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prValueRow: {
    flexDirection: 'row',
    gap: 3,
    alignItems: 'baseline',
  },
  prValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 18,
    color: C_TEXT_WHITE,
  },
  prUnit: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: C_TEXT_MUTED,
  },
  prLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 10,
    color: C_DIVIDER,
    letterSpacing: 0.5,
  },

  // Recent workouts
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLink: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: C_CYAN,
  },
  loader: {
    paddingVertical: 40,
  },
  workoutList: {
    gap: 8,
  },
  workoutCard: {
    height: 68,
    backgroundColor: C_SURFACE,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutLeft: {
    flex: 1,
    gap: 2,
  },
  workoutDate: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 15,
    color: C_TEXT_WHITE,
  },
  workoutSubtitle: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: C_TEXT_MUTED,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  workoutDistance: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: C_CYAN,
  },
  workoutChevron: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 20,
    color: C_DIVIDER,
  },
});
