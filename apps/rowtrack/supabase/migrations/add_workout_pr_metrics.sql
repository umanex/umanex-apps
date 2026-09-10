-- Welk record een rit brak, niet alleen dát hij er een brak.
--
-- `is_pr` is een boolean en houdt niets over van de reden: de app OR'de drie metrics
-- samen en gooide de rest weg. Deze kolom legt per gebroken record vast wat de waarde
-- werd, wat ze was, en welke rit dat vorige record hield.
--
-- Vorm (array, één object per gebroken metric):
--   [{"metric":"watts","value":143,"previous":142,"previous_at":"2026-08-20T06:53:33Z"}]
--   metric ∈ 'distance' | 'best2k' | 'watts' | 'split'
--
-- Een array en geen drie kolommen: één rit kan meerdere records tegelijk breken, en een
-- vijfde metric zou anders opnieuw migreren. `is_pr` blijft staan — bestaande queries
-- hangen eraan en het is de goedkope filter.
--
-- NULL = geen record, of een rit van vóór deze migratie. Voor die oudere ritten leidt de
-- app de metric af uit de chronologie (lib/personalRecords.ts → derivePrHistory).

alter table public.workouts
  add column if not exists pr_metrics jsonb;

comment on column public.workouts.pr_metrics is
  'Gebroken persoonlijke records van deze rit: [{metric,value,previous,previous_at}]. NULL = geen PR of van vóór 2026-08-22.';
