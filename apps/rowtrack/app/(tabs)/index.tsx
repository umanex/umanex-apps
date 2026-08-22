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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { drainPendingWorkout } from '@/lib/pendingWorkout';
import { EmptyState, ErrorState, KpiSingle, Button, WorkoutCard, GoalSheet, GoalCardSkeleton, Skeleton } from '@/components';
import { GoalProgressCard } from '@/components/GoalProgressCard';
import { Subtitle } from '@/components/Subtitle';
import { usePeriodGoal, type PeriodGoalProgress } from '@/lib/hooks/usePeriodGoal';
import { usePrHistory } from '@/lib/hooks/usePrHistory';
import { selectWithPrMetrics } from '@/lib/prColumn';
import { formatDecimal, formatInt } from '@/lib/formatters';
import { t } from '@/i18n';
import {
  bg,
  fg,
  accent,
  border,
  typeStyles,
  body,
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
  is_pr: boolean | null;
  /** jsonb — vorm bewaakt door parsePrEntries, niet door dit type. */
  pr_metrics: unknown;
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
    return { value: Number.isInteger(km) ? formatInt(km) : formatDecimal(km, 1), unit: 'km' };
  }
  return { value: formatInt(m), unit: 'm' };
}

function fmtPr2k(sec: number): { value: string; unit: string } {
  const total = Math.round(sec); // round first so 7:59.7 → 8:00, never "7:60"
  const m = Math.floor(total / 60);
  const s = total % 60;
  return { value: `${m}:${String(s).padStart(2, '0')}`, unit: 'min' };
}

// Maatvoerder voor het doel-skelet: de echte kaart wordt onzichtbaar gerenderd, zodat de
// skelet-hoogte uit het component komt i.p.v. uit een hardcoded pixelwaarde (er is geen
// size-token voor blokhoogtes). De waarden zijn dummy's en nooit zichtbaar.
const GOAL_SKELETON_PROGRESS: PeriodGoalProgress = {
  goal: { period: 'week', metric: 'distance', target: 1 },
  current: 0,
  percentage: 0,
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { entriesFor, refresh: refreshPrHistory } = usePrHistory(user?.id);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [displayName, setDisplayName] = useState('');
  const [workouts, setWorkouts] = useState<HomeWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [workoutsError, setWorkoutsError] = useState(false);

  // `loading`/`error` bewust gealiast: dit scherm heeft al een eigen `loading` en
  // `workoutsError` voor de recente-trainingen-lijst.
  const {
    goalProgress,
    records,
    loading: goalLoading,
    error: goalError,
    refetch: refetchGoal,
  } = usePeriodGoal(user?.id);
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Eerder mislukte (offline) workout-opslag alsnog wegschrijven vóór we lezen,
    // zodat een gedrainede rit meteen in de lijst verschijnt (security-audit P2-4).
    // De drain zit in pendingWorkout.ts omdat hij tegen zichzelf beschermd moet
    // zijn: fetchData kan meerdere keren tegelijk lopen (focus + pull-to-refresh,
    // of een auth-event dat een nieuw user-object oplevert).
    await drainPendingWorkout(user.id);

    const [profileRes, workoutsRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .single(),
      // Zie history/index.tsx: zonder deze terugval zet een niet-gemigreerde
      // `pr_metrics`-kolom het hele home-scherm op een ErrorState.
      selectWithPrMetrics<HomeWorkout[]>((prColumn) => {
        // Zie history/index.tsx: `string`, niet template-literal — anders parseert
        // postgrest-js de dynamische kolomstaart als typefout.
        const columns: string = `id, started_at, duration_seconds, distance_meters, avg_watts, avg_spm, avg_split_seconds, calories, is_pr${prColumn}`;
        return supabase
          .from('workouts')
          .select(columns)
          .order('started_at', { ascending: false })
          .limit(3);
      }),
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
      void refreshPrHistory();
    }, [fetchData, refreshPrHistory]),
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
          {/* Naam pas tonen als het profiel binnen is: anders flitst de fallback "roeier"
              kort in beeld (audit F9). Het skelet erft zijn regelhoogte van dezelfde
              tekststijl, dus de kop verspringt niet wanneer de echte naam landt. */}
          {loading ? (
            <Skeleton style={styles.nameSkeleton}>
              <Text style={styles.name}>{t.home.nameFallback}</Text>
            </Skeleton>
          ) : (
            <Text style={styles.name}>{name}</Text>
          )}
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

      {/* Doel-sectie. Vier uitkomsten op dezelfde plek: laden → skeleton, leesfout →
          ErrorState met retry, geen doel → CTA, doel → kaart. Vóór F6 rendeerde alléén
          de laatste, dus een gefaalde fetch zag er identiek uit als "geen doel" en
          verdween de sectie geruisloos. */}
      {goalLoading ? (
        <GoalCardSkeleton />
      ) : goalError ? (
        <View style={styles.goalSlot}>
          <ErrorState onRetry={refetchGoal} />
        </View>
      ) : goalProgress ? (
        <GoalProgressCard
          progress={goalProgress}
          // Wijzigen opent de doel-bottomsheet in-place (gedeelde GoalSheet, geen redirect).
          onEdit={() => setGoalSheetOpen(true)}
        />
      ) : (
        <TouchableOpacity
          style={[styles.goalSlot, styles.goalCta]}
          onPress={() => setGoalSheetOpen(true)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <View style={styles.goalCtaText}>
            <Text style={styles.goalCtaTitle}>{t.home.goalCtaTitle}</Text>
            <Text style={styles.goalCtaBody}>{t.home.goalCtaBody}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={fg.quaternary} />
        </TouchableOpacity>
      )}

      {/* PR + Recent sections */}
      <View style={styles.body}>
        {goalLoading && (
          // PR's komen uit dezelfde fetch als het doel; zonder skelet schuift de sectie pas
          // ná de fetch in beeld en springt de lijst eronder mee (audit F9). De echte
          // Subtitle blijft staan — die is niet data-afhankelijk.
          <View style={styles.prSection}>
            <Subtitle label={t.home.prSectionTitle} />
            <View style={styles.prRow}>
              <Skeleton style={styles.prCell}>
                <KpiSingle value="0" unit="km" label={t.home.prMaxDistance} />
              </Skeleton>
              <Skeleton style={styles.prCell}>
                <KpiSingle value="0:00" unit="min" label={t.home.prBest2k} />
              </Skeleton>
            </View>
          </View>
        )}

        {!goalLoading && hasPrRecords && (
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

        <View style={[styles.recentSection, (goalLoading || hasPrRecords) && styles.recentSectionBorder]}>
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
                  prEntries={entriesFor(w)}
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
  // Het skelet erft zijn hoogte van de onzichtbare naam-Text erin; flex-start houdt de
  // breedte op die van de ghost i.p.v. de volle kolom.
  nameSkeleton: {
    alignSelf: 'flex-start',
  },

  // Doel-sectie — dezelfde full-bleed chrome als GoalProgressCard, zodat CTA en
  // ErrorState exact de plek van de kaart innemen en de states niet t.o.v. elkaar
  // verspringen.
  goalSlot: {
    backgroundColor: bg.raised,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: border.default,
    padding: space['20'],
  },
  goalCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space['16'],
  },
  goalCtaText: {
    flex: 1,
    gap: space['4'],
  },
  goalCtaTitle: {
    ...body.lg,
    color: fg.primary,
  },
  goalCtaBody: {
    ...body.sm,
    color: fg.secondary,
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
