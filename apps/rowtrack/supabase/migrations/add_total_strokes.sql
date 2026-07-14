-- total_strokes: totaal aantal slagen per workout, afgeleid van de cumulatieve
-- FTMS stroke-count (gebaselined bij de start van de sessie).
--
-- Enkel workouts die ná deze wijziging worden opgeslagen vullen deze kolom;
-- bestaande rijen blijven NULL (de brondata is niet retroactief beschikbaar).
-- Wordt getoond als "TOTALE SLAGEN" op het History-detail Overzicht.

ALTER TABLE workouts ADD COLUMN IF NOT EXISTS total_strokes integer;
