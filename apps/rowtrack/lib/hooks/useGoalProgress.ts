import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { calculateProgress, goalEndsRide } from '@/lib/workout-goals';
import type { WorkoutGoal } from '@/lib/workout-goals';
import { formatDistanceDynamic, formatSplit } from '@/lib/formatters';
import { t } from '@/i18n';
import { EMPTY_BASELINE, type PrBaseline } from '@/lib/personalRecords';
import { fetchPrBaseline } from '@/lib/personalRecordsQuery';
import type { SplitEntry } from '@/types/workout';
import type { WorkoutMetricsState, SessionRef } from './useWorkoutMetrics';
import { mean, takeSplitInterval } from '@/lib/sessionAccumulator';

// --- Goal-reached celebration message ---

/**
 * De viering hoort bij een EINDPUNT, en alleen `goalEndsRide`-types hebben er een. De takken
 * voor tempo en vermogen zijn met F3 verdwenen: die doelen beëindigen de rit niet meer, dus er
 * is geen moment meer waarop zo'n toast zou verschijnen. Hun copy is uit `nl.ts` gehaald in
 * plaats van onbereikbaar te blijven staan — het nieuwe zone-model krijgt zijn eigen woorden.
 */
function celebrationMessage(goal: WorkoutGoal): string {
  if (goal.type === 'distance') {
    const { value, unit } = formatDistanceDynamic(goal.target);
    return t.workout.celebration.distance(value, unit);
  }
  return t.workout.celebration.duration(Math.round(goal.target / 60));
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
  session: SessionRef,
  userId: string | undefined,
) {
  const { seconds, distanceMeters, splitSeconds } = metricsState;

  // State
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [goalReached, setGoalReached] = useState(false);

  // Refs
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

  // `mean` deelt altijd door de teller die in dezelfde stap optelde. Een vreemde noemer kan
  // sinds de accumulator niet meer: som en teller zijn één object.
  const avgWatts = useMemo(
    () => Math.round(mean(session.current.watts) ?? 0),
    [seconds, session],
  );

  const avgSpm = useMemo(
    () => Math.round(mean(session.current.spm) ?? 0),
    [seconds, session],
  );

  const avgSplit = useMemo(
    () => Math.round(mean(session.current.split) ?? 0),
    [seconds, session],
  );

  const goalProgress = useMemo(() => {
    if (!goal) return null;
    return calculateProgress(goal, {
      seconds,
      distanceMeters,
      splitSeconds,
      avgWatts: Math.round(mean(session.current.watts) ?? 0),
    });
  }, [goal, seconds, distanceMeters, splitSeconds, session]);

  // --- Fetch personal records ---
  const fetchPRs = useCallback(async () => {
    if (!userId) return;
    // Over de VOLLEDIGE historiek, niet over de laatste honderd ritten: zie
    // `lib/personalRecordsQuery.ts` voor waarom dat verschil pas bij rit 101 bijt en dan
    // onzichtbaar is. Bij een leesfout komt daar een lege baseline uit — de veilige kant,
    // want die levert géén records op in plaats van records tegen de verkeerde waarden.
    prBaseline.current = await fetchPrBaseline(userId);
  }, [userId]);

  // --- Goal progress + milestones + countdown haptics ---
  useEffect(() => {
    if (phase !== 'active' || !goal || !goalProgress) return;

    // Alleen een EINDPUNT beëindigt de rit. Voor tempo en vermogen betekent `reached` "je zit
    // er nu in", en dat is geen reden om de training af te breken — zie `goalEndsRide`.
    if (!goalEndsRide(goal.type)) return;

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
      // Lezen én legen in één handeling — anders is "vergeten te legen" een stille bug waarin
      // elk volgend segment het vorige meesleept.
      const avgSplitWatts = takeSplitInterval(session.current);
      setSplits((prev) => [...prev, { distance: nextMilestone, split: splitTime, watts: avgSplitWatts }]);

      lastSplitDistance.current = nextMilestone;
      splitStartSeconds.current = seconds;
    }
  }, [phase, distanceMeters, seconds, session]);

  // Géén live PR-check meer. Die vergeleek het lópende gemiddelde en kon dus van true
  // naar false terugvallen; wat bij het stoppen toevallig de laatste stand was, belandde
  // in `is_pr`. De rit wordt nu één keer beoordeeld op zijn eindwaarden, in `saveWorkout`
  // — dezelfde getallen die de gebruiker in de samenvatting ziet, en de enige plek waar
  // ook de exacte 2000m bekend is.

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
    // Computed
    avgWatts,
    avgSpm,
    avgSplit,
    goalProgress,
    // Actions
    dismissToast,
    fetchPRs,
    prBaseline,
    resetGameState,
    resetGoalReached,
  };
}
