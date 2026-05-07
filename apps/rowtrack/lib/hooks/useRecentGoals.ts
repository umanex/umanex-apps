import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { GoalType } from '@/lib/workout-goals';

/**
 * Returns up to 3 goal_target values for the given goal_type, drawn from
 * the last 10 completed workouts. Sorted by frequency (desc), then by
 * recency (desc). Deduplicates on exact value.
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

        // Count frequency; track index of first (most recent) occurrence
        const freq = new Map<number, { count: number; firstIdx: number }>();
        data.forEach((row, idx) => {
          const val = row.goal_target as number;
          if (freq.has(val)) {
            freq.get(val)!.count += 1;
          } else {
            freq.set(val, { count: 1, firstIdx: idx });
          }
        });

        const sorted = Array.from(freq.entries())
          .sort(([, a], [, b]) => {
            if (b.count !== a.count) return b.count - a.count;
            return a.firstIdx - b.firstIdx;
          })
          .slice(0, 3)
          .map(([val]) => val);

        setRecents(sorted);
      });

    return () => { cancelled = true; };
  }, [userId, goalType]);

  return recents;
}
