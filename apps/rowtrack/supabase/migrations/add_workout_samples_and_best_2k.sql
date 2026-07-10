-- Tijdreeks + afgeleide beste-2000m per workout.
--
-- `samples` bewaart de {tijd, afstand}-datapunten (device-elapsedTime in seconden,
-- cumulatieve meters) als compacte tuples [t, d]. Hiermee kan de beste 2000m —
-- en later ook 500m/1k/5k — met een two-pointer + lineaire interpolatie exact
-- berekend worden (zie lib/bestDistanceTime.ts). Bestaande workouts hebben geen
-- tijdreeks en houden samples/best_2k_seconds NULL (tonen "—" tot een nieuwe rit).
--
-- `best_2k_seconds` is de afgeleide waarde, bij opslaan berekend, zodat de
-- home-PR-query een simpele min() blijft (net als best_split).
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS samples jsonb;
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS best_2k_seconds real;

-- Snelle "snelste 2000m"-lookup per gebruiker; alleen rijen met een waarde.
CREATE INDEX IF NOT EXISTS workouts_best_2k_idx
  ON workouts (user_id, best_2k_seconds)
  WHERE best_2k_seconds IS NOT NULL;
