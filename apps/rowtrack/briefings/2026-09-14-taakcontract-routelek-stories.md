# Taakcontract — Storybook-bestanden zijn productieroutes

- **Datum:** 2026-09-14
- **Type:** fix (geen TC-EBC — geen ontwerpbeslissing; zie Waarom geen TC-EBC)
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gebouwd
- **Bron:** designreview 2026-09-14, bevinding P0

---

## Waarom geen TC-EBC

De TC-EBC-poort vraagt of de input een UI- of design-element bevat. Het gevolg is zichtbaar
(een vijfde tab, een afgebroken label), maar de ingreep is een router-configuratie: er valt
niets te ontwerpen, alleen iets weg te halen. Conform `CLAUDE.md` → *Plan / Bouw / Beoordeel*
krijgt dit een licht taak-contract met doel, invarianten en done-criteria.

De twee UI-gevolgen worden hier wél gemeten, want ze zijn de enige zichtbare tegenproef dat
de fix werkt.

## Doel

Zeven `*.stories.tsx`-bestanden onder `app/` zijn volwaardige expo-router-routes. Eén ervan
verschijnt als vijfde tab in de tabbar; aantikken crasht de app. Haal ze uit de routeboom
zonder de Storybook-keten te breken.

## Wat er precies aan de hand is

Gemeten op 2026-09-14, twee bronnen die elkaar aanvankelijk tegenspraken en daarna samenvielen:

- `app/(tabs)/_layout.tsx` declareert exact **vier** `Tabs.Screen` en bevat nergens `href: null`.
- expo-router 6.0.23 rendert élke route in de `(tabs)`-map als tab; `Tabs.Screen` configureert
  alleen opties. Een niet-gedeclareerde route krijgt dus een tab met default-opties — de rauwe
  bestandsnaam als label en het default chevron-icoon.
- `node_modules/expo-router/_ctx.ios.js` sluit via `require.context` alleen `+api`, `+html` en
  `+middleware` uit. `getRoutesCore.js:96` heeft `ignoreList = [/^\.\/\+(html|native-intent)\.[tj]sx?$/]`.
  Stories staan in geen van beide.
- Uitkomst: **18 bladroutes, waarvan 7 uit `.stories.tsx`** — vier auth-stories, `profile.stories`,
  `history/index.stories`, `history/[id].stories`.
- Elk van die zeven heeft `export default meta` (een CSF-object, geen component). React krijgt
  een object waar een component hoort → Render Error.
- Geen van de zeven draagt een `__DEV__`-guard, anders dan `dev-active.tsx:69` en `dev-ble.tsx:69`.
- `scheme: "rowtrack"` (`app.json:9`) en geen `blockList` in `metro.config.js`: `rowtrack://login.stories`
  is een deeplink naar zo'n route, en de bestanden reizen mee in de bundel.

Waargenomen gevolg op de simulator: tik op de vijfde tab → rood Render Error-scherm
*"Element type is invalid… Check the render method of `Route(profile.stories)`"* → app blijft
zwart tot relaunch. Tweede gevolg: de vijfde tab steelt breedte, waardoor `HISTORIEK` afbreekt
tot "HISTORIE / K" met de losse K buiten de tabbar-achtergrond.

## Invarianten (mogen niet wijzigen)

1. De vier bestaande tabs behouden hun route, label, icoon en volgorde.
2. Storybook blijft alle stories vinden en renderen — de zeven bestanden verdwijnen niet.
3. `app/dev-active.tsx` en `app/dev-ble.tsx` blijven bestaan mét hun `__DEV__`-guard; ze zijn
   het state-forceerpad uit het Verify-pad en worden hier niet aangeraakt.
4. Geen wijziging aan de componenten die de stories beschrijven.

## Aanpak

Voorkeursvolgorde; kies de eerste die werkt.

1. **Verplaats de zeven bestanden buiten `app/`.** De meest structurele fix: `app/` is de
   routeboom, dus alles wat geen route is hoort er niet. Vereist dat `.storybook/main.ts`
   het nieuwe pad in zijn `stories`-glob heeft.
2. Lukt dat niet zonder de sync-keten te breken (de stories importeren `TOESTEL` uit
   `.storybook/toestel.ts` en drie ook `vulEnVerstuur` uit `.storybook/formulier.ts`), dan
   een router-ignore op `*.stories.*`.

Ongeacht de route: voeg een guard toe die rood wordt zodra de tabbar meer dan vier items telt,
of zodra `app/` een bestand bevat dat op `.stories.tsx` eindigt. Zonder guard komt dit terug —
het ontstond stil en niets in de repo zag het.

## Done-criteria

Elk item één meting. Afvinken met het bewijs in de regel.

- [x] De routeboom telt 11 bladroutes in plaats van 18 — bewijs: `git ls-tree origin/main` geeft 18, `git ls-files` nu 11, beide zonder `_layout`
- [x] Geen enkel bestand onder `app/` eindigt op `.stories.tsx` — bewijs: `git ls-files apps/rowtrack/app/**/*.stories.*` geeft 0
- [x] De tabbar toont vier items op het toestel — bewijs: `scratchpad/sim/na-fix-home.png`, vier labels geteld (HOME · TRAINING · HISTORIEK · PROFIEL)
- [x] `HISTORIEK` staat op één regel en valt binnen de tabbar-achtergrond — bewijs: hetzelfde screenshot, de losse "K" buiten de achtergrond is weg
- [x] Storybook vindt nog steeds alle stories — bewijs: `storybook-static/index.json` na een verse build, alle zeven verhuisde titels aanwezig (Login·Register·ForgotPassword·ResetPassword·Profile·History·WorkoutDetail). Let op: het totaal (297) heeft geen basislijn uit dezelfde sessie, dus daar leunt dit item niet op — de zeven titels zijn de positieve controle
- [x] De guard wordt rood op het defect zelf — bewijs: `pnpm --filter rowtrack routes:selftest` 5/5, waarvan geval 2 ("story in de routeboom") exact het defect van vandaag is en geval 5 de negatieve controle op de parser
- [x] `rowtrack://login.stories` opent niets meer — bewijs: `simctl openurl` geeft expo-routers "Unmatched Route — Page could not be found" in plaats van een Render Error, screenshot `sim/na-deeplink.png`
- [x] De vier bestaande tabs zijn ongewijzigd in route, label, icoon en volgorde — bewijs: `git diff origin/main -- apps/rowtrack/app/(tabs)/_layout.tsx` is leeg

## Niet in deze taak

- De tekstgrootte van het tabbar-label (`labelGoalPrefix`, 11 px). Dat is een aparte bevinding
  uit dezelfde review en raakt 19 plekken; hier wordt alleen gemeten dát HISTORIEK past.
- De overige zes story-routes buiten `(tabs)` crashen even hard maar zijn niet zichtbaar in de
  navigatie. Ze vallen wél binnen deze taak — de fix is dezelfde — maar hun zichtbaarheid is
  geen apart criterium.

## Beslissingsgeschiedenis

- 2026-09-14: aangemaakt uit de designreview van dezelfde dag. Twee bronnen spraken elkaar tegen
  (de code declareert vier tabs, het toestel toont er vijf); verklaard vóór het opschrijven — beide
  waar, expo-router voegt niet-gedeclareerde routes vanzelf aan de navigator toe.
- 2026-09-14: geen TC-EBC. De poort tikt aan op het zichtbare gevolg, maar er is geen
  component-typologie, geen state en geen interactie te kiezen — alleen een route weg te halen.
