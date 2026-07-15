-- Extra indexen voor de dominante lees-paden (security-audit 2026-07-15, P2-6).
--
-- Draai dit in de Supabase SQL Editor — deze repo past migrations handmatig toe
-- (zoals schema.sql en de andere bestanden in deze map).

-- Composite voor "eigen workouts, nieuwste eerst": de History-lijst en de home
-- recent-query filteren op user_id en sorteren op started_at DESC. De losse
-- workouts_user_id_idx wordt hierdoor grotendeels overbodig (mag later weg).
CREATE INDEX IF NOT EXISTS workouts_user_started_idx
  ON public.workouts (user_id, started_at DESC);

-- PR-lookups per gebruiker (usePeriodGoal): snelste split + langste afstand.
CREATE INDEX IF NOT EXISTS workouts_user_best_split_idx
  ON public.workouts (user_id, best_split)
  WHERE best_split IS NOT NULL;

CREATE INDEX IF NOT EXISTS workouts_user_distance_idx
  ON public.workouts (user_id, distance_meters DESC);
