import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { periodStart } from '@/lib/period';
import { fetchPrBaseline } from '@/lib/personalRecordsQuery';

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
}

// Hier stond een derde veld, `fastestSplit`, gevuld uit `best_split` (de snelste 500m ván een
// rit). Het werd nergens gelezen — gemeten 2026-09-16 over `app/`, `components/` en `lib/`:
// Home toont afstand en 2000m, Profiel leest alleen `goalProgress`. Het kostte dus een query
// per focus zonder lezer, en het droeg een tweede betekenis van het woord "split" naast de
// `avg_split_seconds` van de PR-baseline. Weg; komt hij terug, dan hoort hij bij het scherm
// dat hem toont.

/**
 * Grenzen komen uit `lib/period.ts`, dezelfde bron als de historiek-filter — zo kan
 * "deze week" op de doel-kaart niet meer een ander getal opleveren dan "Week" in de
 * historiek.
 */
function getPeriodStart(period: PeriodGoalPeriod): string {
  // `week` en `month` geven altijd een datum terug; enkel `all` levert null.
  return periodStart(period)!.toISOString();
}

/**
 * @param fetchOnFocus Haalt de hook zelf op bij elke focus?
 *
 * Home zet dit op `false` en roept `refetch` zelf aan — ná het afdruinen van de wachtrij.
 * Anders leest de doel-kaart vóór de insert en de rittenlijst erna, en toont hetzelfde scherm
 * een rit die nog niet in zijn eigen periodetotaal meetelt (functionele review F8). Profiel
 * heeft geen wachtrij te druinen en houdt de focus-fetch.
 */
export function usePeriodGoal(userId: string | undefined, { fetchOnFocus = true } = {}) {
  const [goalProgress, setGoalProgress] = useState<PeriodGoalProgress | null>(null);
  const [records, setRecords] = useState<PersonalRecords>({
    longestDistance: null,
    best2k: null,
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

    // Fetch goal from profile + PRs from workouts in parallel.
    // De records komen uit dezelfde bron als de baseline waartegen een lopende rit zich meet
    // (`lib/personalRecordsQuery.ts`). Dat is het tweede deel van F6: stonden hier eigen
    // queries, dan konden Home en het trainingsscherm een ander record tonen — en die twee
    // spraken elkaar dan tegen zonder dat één van beide fout leek.
    const [profileRes, baseline] = await Promise.all([
      supabase
        .from('profiles')
        .select('period_goal_period, period_goal_metric, period_goal_target')
        .eq('id', userId)
        .single(),
      fetchPrBaseline(userId),
    ]);

    // Leesfouten niet stil inslikken — melden voor observability (security-audit P2-2).
    // De PR-kant meldt zijn eigen fouten en geeft dan een lege baseline terug.
    if (profileRes.error && profileRes.error.code !== 'PGRST116') {
      reportError(profileRes.error, { where: 'usePeriodGoal.fetchAll' });
    }

    // Het profiel draagt het doel zélf. Faalt die read, dan is "geen doel" een gok en
    // geen feit — precies de verwisseling uit F6. PGRST116 (geen rij) is wél een feit.
    if (profileRes.error && profileRes.error.code !== 'PGRST116') setError(true);

    // Personal records
    setRecords({
      longestDistance: baseline.distance?.value ?? null,
      best2k: baseline.best2k?.value ?? null,
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
      if (fetchOnFocus) fetchAll();
    }, [fetchAll, fetchOnFocus]),
  );

  return { goalProgress, records, loading, error, refetch: fetchAll };
}
