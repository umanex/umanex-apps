import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GoalType } from '@/lib/workout-goals';

/**
 * Returns the 3 most recently chosen distinct goal_target values for the
 * given goal_type, drawn from the last 10 completed workouts. Ordered by
 * recency (most recent first); deduplicates on exact value.
 */
export function useRecentGoals(userId: string | undefined, goalType: GoalType | null): number[] {
  const [recents, setRecents] = useState<number[]>([]);

  useEffect(() => {
    if (!userId || !goalType) {
      setRecents([]);
      return;
    }

    let cancelled = false;

    supabase
      .from('workouts')
      .select('goal_target, started_at')
      .eq('user_id', userId)
      .eq('goal_type', goalType)
      .not('goal_target', 'is', null)
      .order('started_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (cancelled || !data) return;

        // Rows arrive most-recent first; keep the first (most recent)
        // occurrence of each distinct target, then take the top 3.
        const seen = new Set<number>();
        const ordered: number[] = [];
        for (const row of data) {
          const val = row.goal_target as number;
          if (seen.has(val)) continue;
          seen.add(val);
          ordered.push(val);
          if (ordered.length === 3) break;
        }

        setRecents(ordered);
      });

    return () => { cancelled = true; };
  }, [userId, goalType]);

  return recents;
}
