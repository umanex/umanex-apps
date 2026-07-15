-- Server-side begrenzing van de vrije-tekst profielvelden (security-audit
-- 2026-07-15, P2-8). De client cap't display_name al op maxLength=60 en gender
-- op de segmented-opties; deze CHECKs dwingen dat ook op DB-niveau af — anders is
-- de RLS-write ongebonden (arbitrair lange strings / vrije gender-waarden).
--
-- Draai dit in de Supabase SQL Editor. Bestaande data is compatibel
-- (geverifieerd 2026-07-15: gender enkel 'male', langste display_name = 6 tekens).

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_display_name_len;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_display_name_len
  CHECK (display_name IS NULL OR char_length(display_name) <= 60);

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_gender_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_gender_check
  CHECK (gender IS NULL OR gender IN ('male', 'female', 'other'));
