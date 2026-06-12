# TODO — RowTrack

Openstaande punten uit de code review + security check van 2026-06-12 (PR #66).

## Zelf toepassen (Jeroen)

- [ ] **Supabase migration uitvoeren** — `supabase/migrations/add_birth_date_and_profiles_insert_policy.sql` handmatig toepassen op de database: voegt `birth_date` kolom toe (al gebruikt in `app/(tabs)/profile.tsx`) en een expliciete INSERT-policy op `profiles`. Als de kolom destijds via het dashboard is aangemaakt, is enkel de policy nieuw.

## Beslissing nodig

- [ ] **Token voor goud-kleur** — `components/MotivationalToast.tsx` gebruikt hardcoded `#FFD700` (titel bij goal bereikt). Geen bestaand token; toevoegen via Tokens Studio (dichtstbijzijnde bestaande: `achievement.default` #E8DCC4) of bewust hardcoded laten met `// TODO:` marker.
- [ ] **Icon default kleur** — `components/Icon.tsx` heeft default `color = '#FFFFFF'`; semantisch zou dat `fg.primary` (#F2F4FA) zijn, maar dat wijzigt visuals licht. Beslissen en doorvoeren.

## Refactors (akkoord nodig vóór uitvoering)

- [ ] **BleStatusBar + HrStatusBar samenvoegen** — `components/BleStatusBar.tsx` en `components/HrStatusBar.tsx` zijn vrijwel identiek; één generieke statusbar-component met type/icon/label props. Beide bevatten ook hardcoded spacing en fontSizes zonder exact token.
- [ ] **Dubbele Bluetooth-permissions in `app.json`** — elke Android-permission staat er twee keer in; duplicaten verwijderen (config-wijziging).

## Laag prioriteit

- [ ] Overweeg `expo-secure-store` als auth storage adapter i.p.v. AsyncStorage (huidige setup met refreshable tokens is acceptabel).
- [ ] Wachtwoord-minimum bij registratie van 6 naar 8 tekens.
