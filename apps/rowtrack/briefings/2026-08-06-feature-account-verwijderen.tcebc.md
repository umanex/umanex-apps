# Account verwijderen

- **Datum:** 2026-08-06
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd

---

```
TASK:        De gebruiker kan zijn account en alle bijhorende data permanent verwijderen vanuit Profiel.

CONTEXT:     Security-audit 2026-07-15 P1-2. AVG art. 17 (recht op vergetelheid) is nu niet
             invulbaar, en Apple Guideline 5.1.1(v) + Play weigeren een app met account-aanmaak
             zonder in-app verwijdering — dit is een zekere store-blocker, geen risico.
             Vereist het eerste server-side stuk in dit project: de client mag de admin-API
             niet aanroepen, dus een Supabase Edge Function met de service-role-key.

ELEMENTS:    Rij "Account verwijderen" onderaan Profiel (eigen sectie, destructief) ·
             BottomSheet met waarschuwingstekst + wachtwoordveld + inline foutregel ·
             destructieve bevestigingsknop · Edge Function `delete-account`.

BEHAVIOUR:   Tap rij → sheet. Sheet somt op wát verdwijnt (ritten, splits, hartslagreeks,
             lichaamsgegevens, doel) en dat het onomkeerbaar is. Gebruiker typt zijn huidige
             wachtwoord → knop wordt actief → tap → re-auth, dan Edge Function → server
             verwijdert auth-user, cascade ruimt profiel + workouts + intervallen op →
             lokale pending-workout wissen → signOut → app landt op login.
             Fout (verkeerd wachtwoord / offline / functie onbereikbaar) → inline regel,
             sheet blijft open, niets verwijderd.

CONSTRAINTS: iPhone portrait · bestaande BottomSheet + Button (`variant="destructive"`) ·
             enkel rol-tokens, geen nieuwe kleur · NL copy via `t.profile.deleteSheet.*` ·
             Edge Function leest de user uit de JWT, nooit uit de request body ·
             geen nieuwe dependency · geen RLS-wijziging (service-role omzeilt RLS,
             cascade is al aanwezig).
```

---

## Open vragen

Geen blokkerende. Eén productkeuze staat hieronder als aanname met alternatief — hij verandert
de flow niet, alleen wat de server doet.

## Aannames

- `[ASSUMPTION: harde verwijdering, geen bedenktijd]` — het account is meteen weg. Alternatief is
  een soft-delete met 30 dagen herstelvenster; dat vergt een `deleted_at`-kolom, een cron-job en
  een "je account wordt op {datum} verwijderd"-staat bij login. Apple accepteert beide. Voor een
  app zonder abonnement of gedeelde content is direct verwijderen het eerlijkste contract — en
  het enige dat geen extra server-infrastructuur vraagt.
- `[ASSUMPTION: wachtwoord als bevestiging]` — hetzelfde re-auth-patroon als de e-mailwijziging
  (`signInWithPassword` vóór de gevoelige actie), i.p.v. het typen van een woord als "VERWIJDER".
  Bewijst identiteit, niet alleen aandacht: een geleende ontgrendelde telefoon kan het account
  dan niet wissen. Elke RowTrack-account heeft een wachtwoord (registratie vereist er één).
- `[ASSUMPTION: geen Figma-design]` — Profiel-sectie en sheet bestaan niet in Figma; dit valt in
  hetzelfde dekkingsgat als de auth-schermen (audit 2026-07-04). Gebouwd op de bestaande
  Profiel-patronen (`listCard`/`listRow`, BottomSheet, `sheetFieldLabel`), achteraf te syncen.
- `[ASSUMPTION: NL-only]` — copy in `nl.ts`, `Translations` dwingt een latere `en.ts` af.

## Acceptatie

- [x] Rij "Account verwijderen" staat onderaan Profiel in een eigen sectie, visueel destructief
      onderscheiden van de normale rijen, en opent de sheet.
- [x] Sheet is een `BottomSheet` (geen native `Alert`), consistent met elke andere Profiel-actie.
- [x] De sheet benoemt expliciet dat verwijderen onomkeerbaar is én wélke data verdwijnt.
- [x] **State default:** knop is disabled zolang het wachtwoordveld leeg is.
- [x] **State loading:** tijdens verwijderen toont de knop een spinner, is het veld niet
      bewerkbaar, en kan de sheet niet gesloten worden (X, scrim, Android-back).
- [x] **State error:** verkeerd wachtwoord, geen verbinding, rate limiting, een onbekende uitkomst
      en een gefaalde Edge Function geven elk een eigen inline melding; de sheet blijft open.
- [ ] **State success:** de gebruiker wordt uitgelogd en landt op het loginscherm; er blijft geen
      sessie in de beveiligde opslag achter. → *statisch afgeleid uit de auth-js-broncode, niet
      op een toestel gezien. Blijft open tot de eerste echte verwijdering.*
- [x] **Interactie:** tap-only (rij, veld, knop, sluiten); `onSubmitEditing` op het wachtwoordveld
      doet hetzelfde als de knop; de rij heeft een raakvlak ≥44pt (`listRow`, minHeight 48).
- [x] **Edge case dubbeltap:** twee snelle taps sturen hoogstens één verwijderverzoek.
- [x] **Edge case pending workout:** een lokaal bewaarde niet-opgeslagen rit is na verwijderen weg.
- [x] **Edge case verlopen sessie:** een verlopen/ongeldige sessie geeft een nette fout, geen crash.
- [x] **Edge case vastlopend verzoek:** de invoke heeft een deadline van 20s, zodat de sheet nooit
      zonder uitgang op een spinner blijft staan (RN heeft op Android geen HTTP-timeout).
- [x] Edge Function haalt de user-id uit de geverifieerde JWT en negeert de request body volledig.
- [x] Edge Function draait niet zonder service-role-key en lekt die nooit in een response.
- [x] De `ON DELETE CASCADE`-keten `auth.users → profiles → workouts → workout_intervals` is live
      tegen de database geverifieerd; het periode-doel zit als kolommen op `profiles` en gaat mee.
- [ ] Na een échte verwijdering zijn de rijen ook werkelijk weg. → *vereist de uitgerolde functie.*
- [x] Geen hardcoded kleur/spacing/fontgrootte; alles via `@/constants`.
- [x] Alle nieuwe copy via `t.*`, niets inline in de component.
- [x] `tsc --noEmit` groen.

**Waarom nog niet `gevalideerd`.** Twee acceptatie-items hangen op een runtime die er nog niet is:
de Edge Function is niet uitgerold, dus de keten is nooit end-to-end gereden. Alles wat statisch
toetsbaar was, is getoetst — twee adversariële reviewrondes (9 + 8 bevindingen, 6 + 4 bevestigd na
weerleggingspoging) zijn verwerkt en er staan geen P0/P1 meer open. De meetbare as ontbreekt
bewust, hij is niet overgeslagen.

## Beslissingsgeschiedenis

- 2026-08-06: aangemaakt. Typologie BottomSheet i.p.v. native `Alert` gekozen — een Alert kan geen
  wachtwoordveld en geen opsomming van wat verdwijnt dragen, en elke andere Profiel-actie is al
  een sheet.
