-- Eén rit per gebruiker per starttijd (review 2026-08-05, P1 dubbele drain-insert).
--
-- Draai dit in de Supabase SQL Editor — deze repo past migrations handmatig toe
-- (zoals schema.sql en de andere bestanden in deze map).
--
-- Waarom: een offline rit belandt in de lokale pending-slot en wordt later alsnog
-- ingevoegd. De client bewaakt dat nu met één in-flight drain (lib/pendingWorkout.ts),
-- maar dat dekt niet de kruis-herstart-race: wordt de app afgesloten tussen een
-- geslaagde insert en het wissen van de slot, dan probeert de volgende start het
-- opnieuw. De pkey staat op een random uuid en houdt dat niet tegen, dus beide
-- rijen slagen en elke KPI-som telt de rit dubbel.
--
-- started_at is de milliseconde-precieze starttijd van de rit; twee echte ritten van
-- dezelfde gebruiker kunnen die niet delen. Op 2026-08-05 bevatte de tabel geen
-- enkele (user_id, started_at)-duplicaat, dus de index kan zonder opschoning.
--
-- Na het aanmaken vertaalt een tweede poging zich in Postgres-foutcode 23505; de
-- client leest die als "stond er al" en ruimt de pending-slot op.

CREATE UNIQUE INDEX IF NOT EXISTS workouts_user_started_at_key
  ON public.workouts (user_id, started_at);
