import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { periodStart } from '@/lib/period';

export type PeriodGoalPeriod = 'week' | 'month';
export type PeriodGoalMetric = 'distance' | 'duration' | 'workouts';

export interface PeriodGoal {
  period: PeriodGoalPeriod;
  metric: PeriodGoalMetric;
  target: number; // meters | seconds | count
}

export interface PeriodGoalProgress {
  goal: PeriodGoal;
  current: number;
  percentage: number; // 0–100
}

export interface PersonalRecords {
  longestDistance: number | null;   // meters
  best2k: number | null;           // fastest 2000m in seconds
  fastestSplit: number | null;     // seconds per 500m
}

/**
 * Grenzen komen uit `lib/period.ts`, dezelfde bron als de historiek-filter — zo kan
 * "deze week" op de doel-kaart niet meer een ander getal opleveren dan "Week" in de
 * historiek.
 */
function getPeriodStart(period: PeriodGoalPeriod): string {
  // `week` en `month` geven altijd een datum terug; enkel `all` levert null.
  return periodStart(period)!.toISOString();
}

export function usePeriodGoal(userId: string | undefined) {
  const [goalProgress, setGoalProgress] = useState<PeriodGoalProgress | null>(null);
  const [records, setRecords] = useState<PersonalRecords>({
    longestDistance: null,
    best2k: null,
    fastestSplit: null,
  });
  const [loading, setLoading] = useState(true);
  // `error` dekt bewust alléén de doel-reads (profiel + de workouts van de periode).
  // Faalt enkel een PR-query, dan verdwijnt de PR-sectie — die staat elders in de boom
  // en mag de doel-kaart niet op een ErrorState zetten.
  const [error, setError] = useState(false);

  const fetchAll = useCallback(async () => {
    // Zonder user valt er niets te laden: `loading` moet hier omlaag. Bleef hij staan,
    // dan houdt de skeleton op Home het scherm eeuwig bezet bij een uitgelogde sessie.
    if (!userId) {
      setLoading(false);
      return;
    }
    // Per run resetten, anders blijft een gelukte retry op een oude fout hangen.
    setError(false);

    // Fetch goal from profile + PRs from workouts in parallel
    const [profileRes, prDistRes, prBest2kRes, prSplitRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('period_goal_period, period_goal_metric, period_goal_target')
        .eq('id', userId)
        .single(),
      supabase
        .from('workouts')
        .select('distance_meters')
        .eq('user_id', userId)
        .order('distance_meters', { ascending: false })
        .limit(1),
      supabase
        .from('workouts')
        .select('best_2k_seconds')
        .eq('user_id', userId)
        .not('best_2k_seconds', 'is', null)
        .order('best_2k_seconds', { ascending: true })
        .limit(1),
      supabase
        .from('workouts')
        .select('best_split')
        .eq('user_id', userId)
        .not('best_split', 'is', null)
        .order('best_split', { ascending: true })
        .limit(1),
    ]);

    // Leesfouten niet stil inslikken — melden voor observability (security-audit P2-2).
    for (const res of [profileRes, prDistRes, prBest2kRes, prSplitRes]) {
      if (res.error && res.error.code !== 'PGRST116') {
        reportError(res.error, { where: 'usePeriodGoal.fetchAll' });
      }
    }

    // Het profiel draagt het doel zélf. Faalt die read, dan is "geen doel" een gok en
    // geen feit — precies de verwisseling uit F6. PGRST116 (geen rij) is wél een feit.
    if (profileRes.error && profileRes.error.code !== 'PGRST116') setError(true);

    // Personal records
    setRecords({
      longestDistance: prDistRes.data?.[0]?.distance_meters ?? null,
      best2k: prBest2kRes.data?.[0]?.best_2k_seconds ?? null,
      fastestSplit: prSplitRes.data?.[0]?.best_split ?? null,
    });

    // Period goal progress
    const p = profileRes.data;
    if (p?.period_goal_period && p?.period_goal_metric && p?.period_goal_target) {
      const goal: PeriodGoal = {
        period: p.period_goal_period,
        metric: p.period_goal_metric,
        target: p.period_goal_target,
      };

      const periodStart = getPeriodStart(goal.period);
      const { data: periodWorkouts, error: periodError } = await supabase
        .from('workouts')
        .select('distance_meters, duration_seconds')
        .eq('user_id', userId)
        .gte('started_at', periodStart);
      if (periodError) {
        reportError(periodError, { where: 'usePeriodGoal.periodWorkouts' });
        // Zonder deze rijen is `current` een 0 die als échte voortgang leest: de kaart
        // zou "0% voldaan" tonen op een mislukte read. Liever de ErrorState.
        setError(true);
        setGoalProgress(null);
        setLoading(false);
        return;
      }

      let current = 0;
      if (goal.metric === 'distance') {
        current = (periodWorkouts ?? []).reduce((s, w) => s + w.distance_meters, 0);
      } else if (goal.metric === 'duration') {
        current = (periodWorkouts ?? []).reduce((s, w) => s + w.duration_seconds, 0);
      } else {
        current = periodWorkouts?.length ?? 0;
      }

      setGoalProgress({
        goal,
        current,
        percentage: Math.min((current / goal.target) * 100, 100),
      });
    } else {
      setGoalProgress(null);
    }

    setLoading(false);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll]),
  );

  return { goalProgress, records, loading, error, refetch: fetchAll };
}
