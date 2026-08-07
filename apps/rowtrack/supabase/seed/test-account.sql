-- Testaccount voor `verify` — seed én reset in één bestand.
--
-- Waarom dit bestaat: er was één profiel in deze database en dat was Jeroens
-- echte. Elk acceptatie-item dat data schrijft of wist was daardoor per
-- constructie onverifieerbaar — `revoke_health_consent()` wist hartslag uit
-- alle ritten, en dat kun je niet "even testen" op de enige echte gebruiker.
-- Zie rail 5 in de `verify`-skill.
--
-- EENMALIG VOORAF (kan niet vanuit SQL — auth.users vult Supabase zelf):
--   Dashboard → Authentication → Users → Add user
--     Email:    rowtrack-test@umanex.be
--     Password: kies iets en zet het in 1Password
--     ✅ Auto Confirm User  ← anders kun je niet inloggen
--   De trigger `on_auth_user_created` maakt het profiel automatisch aan.
--
-- DAARNA, en telkens als je de staat terug wil: draai dit bestand in de SQL
-- Editor. Het is idempotent — twee keer draaien geeft exact dezelfde staat.
--
-- De vertreksituatie die het achterlaat:
--   • health_consent = null  → het toestemmingsscherm verschijnt bij inloggen
--   • lichaamsvelden leeg    → zoals een account dat nooit toestemming gaf
--   • 4 ritten, bewust verschillend van vorm (zie onder)
--
-- Het script neemt geen parameter aan. De doelgebruiker komt uitsluitend uit
-- een lookup op het test-emailadres — hetzelfde principe waarom
-- `revoke_health_consent()` `auth.uid()` gebruikt in plaats van een argument:
-- een parameter maakt er een wisfunctie voor andermans data van.

do $$
declare
  v_test_email constant text := 'rowtrack-test@umanex.be';
  v_prod_email constant text := 'jeroen@ikbenjeroen.be';
  v_uid uuid;
  v_geraakt int;
begin
  if v_test_email = v_prod_email then
    raise exception 'GESTOPT: test- en productie-adres zijn gelijk. Dit script wist ritten.';
  end if;

  select id into v_uid from auth.users where email = v_test_email;

  if v_uid is null then
    raise exception
      'Testgebruiker % bestaat nog niet. Maak hem eerst aan via Dashboard → Authentication → Add user (met Auto Confirm).',
      v_test_email;
  end if;

  raise notice 'Doelgebruiker: % (%)', v_test_email, v_uid;

  delete from public.workouts where user_id = v_uid;
  get diagnostics v_geraakt = row_count;
  raise notice 'Oude testritten verwijderd: %', v_geraakt;

  -- Terug naar "nooit iets gevraagd". Niet 'declined': dat is een gemaakte
  -- keuze en zou het toestemmingsscherm juist overslaan.
  update public.profiles set
    display_name           = 'Testroeier',
    health_consent         = null,
    health_consent_at      = null,
    health_consent_version = null,
    gender                 = null,
    birth_date             = null,
    height_cm              = null,
    weight_kg              = null,
    spm_halved             = false,
    period_goal_period     = null,
    period_goal_metric     = null,
    period_goal_target     = null,
    updated_at             = now()
  where id = v_uid;

  -- Vier ritten, elk met een andere samples-vorm. Dat is met opzet: de
  -- strip-logica in `revoke_health_consent()` heeft een `where` op
  -- `samples is not null and jsonb_array_length(samples) > 0`, en die tak
  -- toets je alleen als er rijen zijn die er níet aan voldoen.

  -- 1. 2000m — hartslag in de reeks én in de kolommen. Het hoofdgeval.
  insert into public.workouts (
    user_id, started_at, duration_seconds, distance_meters,
    avg_watts, max_watts, avg_spm, max_spm, avg_split_seconds, best_split,
    calories, total_strokes, avg_heart_rate, max_heart_rate,
    best_2k_seconds, is_pr, samples
  ) values (
    v_uid, timestamptz '2026-07-20 09:12:00+02', 480, 2000,
    180, 214, 24, 29, 120, 116,
    90, 192, 142, 168,
    480, true,
    (select jsonb_agg(jsonb_build_array(s, round(s * 2000.0 / 480), 120 + round(48.0 * s / 480)) order by s)
       from generate_series(0, 480) s)
  );

  -- 2. 5000m — langer stuk, zodat "beste 2k binnen een langere rit" iets te
  --    rekenen heeft in plaats van samen te vallen met de hele rit.
  insert into public.workouts (
    user_id, started_at, duration_seconds, distance_meters,
    avg_watts, max_watts, avg_spm, max_spm, avg_split_seconds, best_split,
    calories, total_strokes, avg_heart_rate, max_heart_rate,
    best_2k_seconds, samples
  ) values (
    v_uid, timestamptz '2026-07-27 08:40:00+02', 1320, 5000,
    165, 198, 22, 26, 132, 124,
    240, 484, 151, 174,
    508,
    (select jsonb_agg(jsonb_build_array(s, round(s * 5000.0 / 1320), 128 + round(46.0 * s / 1320)) order by s)
       from generate_series(0, 1320) s)
  );

  -- 3. 1000m — reeks zónder hartslag ([t,d]). Na een revoke moet deze rij er
  --    identiek uitzien: de strip mag niets kapotmaken aan wat al schoon is.
  insert into public.workouts (
    user_id, started_at, duration_seconds, distance_meters,
    avg_watts, max_watts, avg_spm, max_spm, avg_split_seconds, best_split,
    calories, total_strokes, samples
  ) values (
    v_uid, timestamptz '2026-08-02 18:05:00+02', 225, 1000,
    195, 230, 26, 31, 112, 109,
    45, 98,
    (select jsonb_agg(jsonb_build_array(s, round(s * 1000.0 / 225)) order by s)
       from generate_series(0, 225) s)
  );

  -- 4. 500m — helemaal geen reeks. Raakt de `where`-tak die overgeslagen wordt.
  insert into public.workouts (
    user_id, started_at, duration_seconds, distance_meters,
    avg_watts, max_watts, avg_spm, max_spm, avg_split_seconds, best_split,
    calories, total_strokes, avg_heart_rate, max_heart_rate, samples
  ) values (
    v_uid, timestamptz '2026-08-05 19:30:00+02', 105, 500,
    240, 268, 30, 34, 105, 103,
    22, 53, 158, 176, null
  );

  select count(*) into v_geraakt from public.workouts where user_id = v_uid;
  raise notice 'Testritten aangemaakt: % — health_consent staat op null.', v_geraakt;
end $$;

-- Controle achteraf. Verwacht: 4 ritten, 2 met hartslag in de reeks,
-- 3 met avg_heart_rate, consent null.
select
  (select count(*) from public.workouts w join auth.users u on u.id = w.user_id
     where u.email = 'rowtrack-test@umanex.be') as ritten,
  (select count(*) from public.workouts w join auth.users u on u.id = w.user_id
     where u.email = 'rowtrack-test@umanex.be'
       and w.samples is not null and jsonb_array_length(w.samples -> 0) = 3) as met_hr_in_samples,
  (select count(*) from public.workouts w join auth.users u on u.id = w.user_id
     where u.email = 'rowtrack-test@umanex.be' and w.avg_heart_rate is not null) as met_avg_hr,
  (select p.health_consent from public.profiles p join auth.users u on u.id = p.id
     where u.email = 'rowtrack-test@umanex.be') as consent;
