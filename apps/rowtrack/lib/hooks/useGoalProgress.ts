import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { calculateProgress } from '@/lib/workout-goals';
import type { WorkoutGoal } from '@/lib/workout-goals';
import { formatDistanceDynamic, formatSplit } from '@/lib/formatters';
import { t } from '@/i18n';
import { getPaceZone } from '@/components/workout';
import { EMPTY_BASELINE, extendBaseline, type PrBaseline } from '@/lib/personalRecords';
import type { PaceZoneLevel, SplitEntry } from '@/components/workout';
import type { WorkoutMetricsState, AccumulatorRefs } from './useWorkoutMetrics';

// --- Goal-reached celebration message (dynamisch per doeltype) ---

function celebrationMessage(goal: WorkoutGoal): string {
  switch (goal.type) {
    case 'duration':
      return t.workout.celebration.duration(Math.round(goal.target / 60));
    case 'distance': {
      const { value, unit } = formatDistanceDynamic(goal.target);
      return t.workout.celebration.distance(value, unit);
    }
    case 'split':
      return t.workout.celebration.split(formatSplit(goal.target));
    case 'watts':
      return t.workout.celebration.watts(goal.target);
  }
}

// De records waartegen deze rit zich meet, staan in `lib/personalRecords.ts` — die
// module is puur en dus toetsbaar met `node --test`. Hier blijft alleen het ophalen en
// het live vergelijken over.

// --- Hook ---

type Phase = 'idle' | 'active' | 'summary';

export function useGoalProgress(
  phase: Phase,
  goal: WorkoutGoal | null,
  metricsState: WorkoutMetricsState,
  refs: AccumulatorRefs,
  userId: string | undefined,
) {
  const { seconds, distanceMeters, splitSeconds } = metricsState;

  // State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [goalReached, setGoalReached] = useState(false);

  // Refs
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const goalReachedRef = useRef(false);
  const milestonesHit = useRef(new Set<string>());
  const lastSplitDistance = useRef(0);
  const splitStartSeconds = useRef(0);
  /**
   * De staande records van vóór deze rit. Een ref en geen state: hij stuurt geen render
   * aan, en `saveWorkout` moet hem bij het stoppen kunnen uitlezen om de definitieve
   * PR-lijst samen te stellen uit de eindwaarden.
   */
  const prBaseline = useRef<PrBaseline>(EMPTY_BASELINE);

  // --- Computed (useMemo) ---

  // Deel door de teller die in dezelfde guard optelt als de som, niet door tickCount:
  // die telt ook de packets waarin het veld ontbrak en drukt het gemiddelde omlaag.
  const avgWatts = useMemo(() => {
    const c = refs.wattsCount.current || 1;
    return Math.round(refs.wattsSum.current / c);
  }, [seconds, refs]);

  const avgSpm = useMemo(() => {
    const c = refs.spmCount.current || 1;
    return Math.round(refs.spmSum.current / c);
  }, [seconds, refs]);

  const avgSplit = useMemo(() => {
    const tc = refs.splitTickCount.current || 1;
    return Math.round(refs.splitSum.current / tc);
  }, [seconds, refs]);

  const goalProgress = useMemo(() => {
    if (!goal) return null;
    return calculateProgress(goal, {
      seconds,
      distanceMeters,
      splitSeconds,
      avgWatts: refs.wattsCount.current > 0
        ? Math.round(refs.wattsSum.current / refs.wattsCount.current)
        : 0,
    });
  }, [goal, seconds, distanceMeters, splitSeconds, refs]);

  const isCountdown = useMemo(
    () => goalProgress != null && goalProgress.percentage >= 90 && !goalProgress.reached,
    [goalProgress],
  );

  const paceZone = useMemo((): PaceZoneLevel | null => {
    if (!goal || (goal.type !== 'split' && goal.type !== 'watts')) return null;
    if (refs.tickCount.current < 5) return null;
    if (goal.type === 'split') return getPaceZone(avgSplit, goal.target, true);
    return getPaceZone(goal.target, avgWatts, false);
  }, [goal, avgSplit, avgWatts, refs]);

  // --- Fetch personal records ---
  const fetchPRs = useCallback(async () => {
    if (!userId) return;
    // `started_at` komt mee zodat een gebroken record kan zeggen wélke rit het hield;
    // `best_2k_seconds` omdat de 2000m sinds 2026-08-22 een vierde PR-metric is.
    const { data, error } = await supabase
      .from('workouts')
      .select('started_at, avg_watts, avg_split_seconds, distance_meters, best_2k_seconds')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(100);

    if (error) {
      // Bij een leesfout de baseline leegmaken in plaats van die van de vórige rit laten
      // staan: een lege baseline levert géén records op (elke metric mist zijn voorganger),
      // en dat is de veilige kant. Een oude baseline zou records claimen tegen waarden van
      // een andere sessie.
      reportError(error, { where: 'useGoalProgress.fetchPRs' });
      prBaseline.current = EMPTY_BASELINE;
      return;
    }
    // De query sorteert aflopend; oplopend opbouwen zodat bij een gedeeld record de
    // vroegste rit als houder geldt ("je staat op 142 W sinds …"), niet de laatste.
    prBaseline.current = [...(data ?? [])]
      .reverse()
      .reduce<PrBaseline>((acc, w) => extendBaseline(acc, w, w.started_at), EMPTY_BASELINE);
  }, [userId]);

  // --- Goal progress + milestones + countdown haptics ---
  useEffect(() => {
    if (phase !== 'active' || !goal || !goalProgress) return;

    // Goal reached → toon de viering-toast + één Heavy haptic op het bereik-moment
    // (bleef behouden toen de 25/50/75/100%-milestone-toasts verdwenen).
    if (goalProgress.reached && !goalReachedRef.current) {
      goalReachedRef.current = true;
      setGoalReached(true);
      setToastMsg(celebrationMessage(goal));
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }

    // Countdown haptics at 90%, 95%, 99% (geen toast — de 25/50/75%-milestone-toasts
    // zijn bewust verwijderd; enkel deze subtiele "bijna daar"-haptiek blijft).
    for (const pct of [90, 95, 99]) {
      const key = `countdown_${pct}`;
      if (goalProgress.percentage >= pct && !milestonesHit.current.has(key)) {
        milestonesHit.current.add(key);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    }
  }, [phase, goal, goalProgress]);

  // --- 500m split tracking ---
  useEffect(() => {
    if (phase !== 'active') return;

    const nextMilestone = lastSplitDistance.current + 500;
    if (distanceMeters >= nextMilestone) {
      const splitTime = seconds - splitStartSeconds.current;
      const avgSplitWatts = refs.splitIntervalWattsCount.current > 0
        ? Math.round(refs.splitIntervalWattsSum.current / refs.splitIntervalWattsCount.current)
        : undefined;
      refs.splitIntervalWattsSum.current = 0;
      refs.splitIntervalWattsCount.current = 0;
      setSplits((prev) => [...prev, { distance: nextMilestone, split: splitTime, watts: avgSplitWatts }]);

      lastSplitDistance.current = nextMilestone;
      splitStartSeconds.current = seconds;
    }
  }, [phase, distanceMeters, seconds]);

  // Géén live PR-check meer. Die vergeleek het lópende gemiddelde en kon dus van true
  // naar false terugvallen; wat bij het stoppen toevallig de laatste stand was, belandde
  // in `is_pr`. De rit wordt nu één keer beoordeeld op zijn eindwaarden, in `saveWorkout`
  // — dezelfde getallen die de gebruiker in de samenvatting ziet, en de enige plek waar
  // ook de exacte 2000m bekend is.

  // --- Countdown pulse animation ---
  useEffect(() => {
    if (phase !== 'active' || !goal || !goalProgress) {
      pulseAnim.setValue(1);
      return;
    }

    if (goalProgress.percentage >= 90 && !goalProgress.reached) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [phase, goal, goalProgress]); // pulseAnim is stable ref, excluded from deps

  // --- Dismiss callbacks ---
  const dismissToast = useCallback(() => setToastMsg(null), []);

  // --- Reset gamification state ---
  const resetGameState = useCallback(() => {
    goalReachedRef.current = false;
    setGoalReached(false);
    milestonesHit.current.clear();
    lastSplitDistance.current = 0;
    splitStartSeconds.current = 0;
    setSplits([]);
    setToastMsg(null);
  }, []);

  // --- Reset goal reached (for mid-workout goal changes) ---
  const resetGoalReached = useCallback(() => {
    goalReachedRef.current = false;
    setGoalReached(false);
    milestonesHit.current.clear();
  }, []);

  return {
    // State
    toastMsg,
    splits,
    goalReached,
    pulseAnim,
    // Computed
    avgWatts,
    avgSpm,
    avgSplit,
    goalProgress,
    isCountdown,
    paceZone,
    // Actions
    dismissToast,
    fetchPRs,
    prBaseline,
    resetGameState,
    resetGoalReached,
  };
}
