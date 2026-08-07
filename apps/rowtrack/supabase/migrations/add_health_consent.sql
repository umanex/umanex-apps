-- Toestemming voor gezondheidsgegevens (AVG art. 9.2.a).
--
-- Hartslag, gewicht, lengte, geboortedatum en geslacht zijn bijzondere
-- persoonsgegevens. Die mogen enkel verwerkt worden met uitdrukkelijke
-- toestemming, en die toestemming moet aantoonbaar zijn — vandaar het tijdstip
-- en de versie van het beleid waarop ze gegeven is.
--
-- `null` betekent "nog niet gevraagd" en is nadrukkelijk iets anders dan
-- 'declined'. Zonder dat onderscheid zou een bestaand account niet van een
-- nieuw account te onderscheiden zijn, en zou het toestemmingsscherm dus nooit
-- verschijnen voor wie er het meest toe doet.

alter table public.profiles
  add column if not exists health_consent text
    check (health_consent is null or health_consent in ('granted', 'declined')),
  add column if not exists health_consent_at timestamptz,
  add column if not exists health_consent_version text;

comment on column public.profiles.health_consent is
  'null = nog niet gevraagd, granted = toestemming gegeven, declined = geweigerd of ingetrokken';

-- Intrekken wist wat er al verzameld is.
--
-- Juridisch werkt intrekken alleen voor de toekomst, maar een gebruiker die op
-- "intrekken" tikt verwacht dat zijn hartslag wég is — niet dat hij blijft staan
-- en er alleen niets bijkomt. Dit doet het serverzijdig in één aanroep: de
-- client zou anders elke rit moeten ophalen, de hartslag uit de tijdreeks moeten
-- knippen en terugschrijven, met een half afgemaakte staat als het netwerk
-- halverwege wegvalt.
--
-- De ritten zelf blijven bestaan: afstand, tijd, vermogen en split zijn geen
-- gezondheidsgegevens en die wil je niet kwijt.
--
-- SECURITY DEFINER met een vaste search_path, en de user-id komt uit auth.uid()
-- — nooit uit een argument. Een parameter zou betekenen dat elke ingelogde
-- gebruiker de gegevens van een ander kan wissen.
create or replace function public.revoke_health_consent()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'niet ingelogd';
  end if;

  update public.profiles set
    gender = null,
    birth_date = null,
    height_cm = null,
    weight_kg = null,
    health_consent = 'declined',
    health_consent_at = now()
  where id = uid;

  -- Hartslag uit de per-seconde tijdreeks knippen: elk punt is [t, d] of
  -- [t, d, hr]; we houden de eerste twee elementen over. Rijen zonder reeks of
  -- met een lege reeks blijven ongemoeid.
  update public.workouts w set
    samples = (
      select jsonb_agg(jsonb_build_array(s -> 0, s -> 1) order by ord)
      from jsonb_array_elements(w.samples) with ordinality as t(s, ord)
    )
  where w.user_id = uid
    and w.samples is not null
    and jsonb_array_length(w.samples) > 0;

  update public.workouts set
    avg_heart_rate = null,
    max_heart_rate = null
  where user_id = uid
    and (avg_heart_rate is not null or max_heart_rate is not null);
end;
$$;

revoke all on function public.revoke_health_consent() from public, anon;
grant execute on function public.revoke_health_consent() to authenticated;
