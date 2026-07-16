# UX-audit — RowTrack (draaiende app)

- **Geaudit:** volledige RowTrack-app, **live op de iOS-simulator** (iPhone 17 Pro, iOS 26.5, dev-build via Metro, ingelogd account met echte workout-data) + volledige code-inventarisatie
- **Datum:** 2026-07-16
- **Platform:** mobiel (React Native / Expo), dark-only, portrait-primary + landscape tijdens active workout
- **Bron:** 20+ screenshots van de draaiende app (alle tabs, alle 5 active-doelvarianten via `dev-active`-harness, celebration, summary, BLE-startguard, LENGTE-wheel-sheet, loading-state, landscape), 2 code-inventarisaties (schermen/flows/states + a11y/ergonomie, elk met file:line-bewijs), exacte WCAG-contrastberekening op de token-hexen
- **Methodiek:** IxDF — *The Basics of User Experience Design* (7 factoren · 5 usability-karakteristieken · 5 interactie-dimensies)
- **Baseline:** de audit van 2026-07-13 (`2026-07-13-ux-audit-rowtrack-alle-schermen.md`, 56/85) beoordeelde het **statische Figma-design**; deze audit beoordeelt het **echte product**. De vergelijking is indicatief — het meetobject verschilt.

---

## 1 — Samenvatting

**Totaalscore: 61 / 85 → grade C (richting B) — functioneel, gerichte fixes nodig.** (Baseline 13/07: 56/85.)

De sprint sinds 13 juli heeft precies gebracht wat de vorige audit vroeg: **de robuustheidslaag bestaat nu echt**. Live geverifieerd: alle data-schermen hebben loading/error/empty-states met retry, de BLE-laag heeft een volledige state-machine (zoeken/verbinden/reconnect met 3 pogingen/error met "Opnieuw proberen"), starten zonder erg wordt geblokkeerd met een heldere melding, workouts saven automatisch met een AsyncStorage-fallback bij falen, en de vier kapotte cirkelknoppen zijn volwaardige, leesbare knoppen geworden. De active-hero is ondubbelzinnig ("RESTERENDE TIJD" bij een duurdoel) en de zone-coaching (groen = sneller dan doel, oranje = eronder) werkt live.

Wat de score onder B houdt zijn twee defecten van P0-kaliber en een rand van onafgewerktheid. **(1) Profielvelden persisteren niet**: elke "Opslaan" in de naam/geslacht/lengte/gewicht/geboortedatum-sheets schrijft alleen lokale state — de enige echte schrijf-functie (`handleSave`) heeft nul call-sites. De app *toont* succes en verliest de data stil bij de volgende fetch; daardoor blijft ook de kcal-berekening permanent op geschat gewicht (`*`) staan. **(2) Tijdens een BLE-reconnect of -error midden in een workout verdwijnt de volledige UI — inclusief de Stop-knop — achter de connect-overlay**, terwijl de tabbar al verborgen is: de gebruiker zit opgesloten tot de reconnect slaagt of definitief faalt. Daarnaast: de WIJZIG-link van het periode-doel reageerde in 5+ pixel-precieze pogingen op twee schermen nooit (zusje "ALLE" wél) — het target is 16pt hoog zonder hitSlop; de vergelijkingszin bij split/watt-doelen loopt op 36px letterlijk tegen de schermrand; en de toegankelijkheid kent drie exacte fails (inactieve tabs 2.47:1, witte knoptekst op accent 3.44:1, vrijwel geen accessibility-labels).

**Top-3 kritische prioriteiten**

1. **P0 — Profielvelden persisteren niet** (`app/(tabs)/profile.tsx:296-319`: dode `handleSave`, sheets zetten alleen React-state): stille dataverlies-illusie, ondermijnt vertrouwen én kcal-nauwkeurigheid. Fix: per-sheet persist (zoals `GoalSheet` al doet) — effort S.
2. **P0 — Geen ontsnapping tijdens BLE-reconnect/error mid-workout** (`components/workout/ActivePhase.tsx:123-126, 488-568`): overlay verbergt hero, KPI's én Stop; tabbar is verborgen. Fix: Stop-knop (en verstreken tijd) in de overlay — effort S–M.
3. **P1 — Doel-wijzig-entry onbetrouwbaar + tap-targets**: WIJZIG (Subtitle-action, ±16pt hoog, geen hitSlop, `components/Subtitle.tsx:44-53`) vuurde live nooit; samen met chevrons 40×40, password-toggle 36×36 en chips 40pt één gerichte tap-target-pass maken — effort S–M.

---

## 2 — 7 UX-factoren

| Factor | Score | Kern |
|--------|:-----:|------|
| Useful | 4/5 | Kern-metrics compleet en live correct (split/watt/SPM/BPM/afstand/kcal), auto-save mét pending-fallback, PR's, periode-doel, SPM-halveer-instelling voor dubbeltellende trainers. Gaten: geen enkele datavisualisatie (HR-verloop, split-trend), mid-workout doel wijzigen is gebouwd maar onbereikbaar. |
| Usable | 3/5 | Hoofdflows soepel en consistent (tabs, sheets, wheels+chips, filters). Maar: profiel-bewerken faalt stil (P0), WIJZIG-entry reageert niet, vergelijkingszin tegen schermrand, "Ga verder" dubbelzinnig na doel-bereikt. |
| Findable | 4/5 | Heldere 4-tab-nav, doel-kaart identiek op Home+Profiel, relatieve datums (VANDAAG/GISTEREN), ALLE→Historiek. Dents: icon-only inactieve doelsegmenten, BPM-rij is onzichtbaar tappable (enige interactieve KPI-rij, `ActivePhase.tsx:407-434`). |
| Credible | 4/5 | Gepolijst en consistent; cijfers kloppen onderling (44% van 50 km ✓, weektotalen = som rijen ✓); echte states i.p.v. blanco schermen. Ondermijnd door de save-illusie (P0) en de onverklaarde kcal-asterisk. |
| Desirable | 4/5 | Onderscheidend editorial DNA (serif-heroes, italic connectoren, goud-accent op de doeltrack), zone-kleuren als coaching, smaakvolle confetti-celebration — live net zo goed als in Figma. Idle-scherm heeft veel leeg midden. |
| Accessible | 3/5 | Verbeterd t.o.v. baseline: kleinste live tekst is nu 11px (10px/9px-stijlen ongebruikt), `fg.tertiary` haalt overal ≥4.7:1. Exacte fails: inactieve tab-labels `fg.quaternary` op `bg.raised` **2.47:1**, witte 18px-knoptekst op accent **3.44:1**, `status.error` op raised 4.12:1, quaternary-chevrons 2.85:1 (non-text 3:1). Accessibility-props op 6 van ±79 touchables; geen dynamic-type-vangnet bij vaste hoogtes. |
| Valuable | 4/5 | Weekdoel + PR's + celebration zijn echte retentie-hooks; auto-save verlaagt frictie tot nul. Kcal-waarde deels ondergraven door P0 (gewicht persisteert niet); geen export/deel-functie. |
| **Subtotaal** | **26/35** | (13/07: 24/35) |

## 3 — 5 usability-karakteristieken

| Karakteristiek | Score | Kern |
|----------------|:-----:|------|
| Effectiveness | 3/5 | Kern-taken live voltooibaar en beschermd (start-guard, delete-bevestiging, exact-één-keer-save met lege-sessie-guard). Maar profiel-bewerken faalt stil, doel-wijzigen-entry onbetrouwbaar, en stoppen kan niet tijdens reconnect. |
| Efficiency | 4/5 | Auto-save (geen handmatige stap), tabs + at-a-glance hero, wheel met recente-doelen-chips, pull-to-refresh, landscape-ergmodus. "Start training" is nooit disabled maar alert-gebaseerd — één stap extra bij fout. |
| Engagement | 4/5 | Celebration met confetti + haptics (wheel-ticks, impact bij doel-bereikt en 90/95/99%), zone-kleur-coaching, PR-banner. Berekende pulse-animatie en per-metric PR-flags worden nooit getoond — gemiste engagement die er al is. |
| Error tolerance | 3/5 | Grote sprong: BLE-state-machine met reconnect (3×2s), error+retry op alle fetch-schermen, destructieve bevestiging, double-submit-guards, pending-workout-drain. Resterend: reconnect-val zonder Stop (P0), stille profiel-dataverlies (P0), `usePeriodGoal`-fout onzichtbaar (sectie verdwijnt gewoon, `app/(tabs)/index.tsx:77`), GoalSheet-Opslaan zonder keuze schrijft stil `NO_GOAL`, rauwe `e.message` bij netwerkfouten in auth. |
| Ease of learning | 4/5 | Conventionele patronen, heldere NL-copy ("Verbind eerst de roeitrainer via de knop bovenaan."), vertrouwde roei-metrics. Icon-only segmenten en de verborgen BPM-tap vergen ontdekking. |
| **Subtotaal** | **18/25** | (13/07: 17/25) |

**Utility-check:** de juiste kern-features zijn er én werken (live metrics, doelen, historiek, PR's, auto-save, wachtwoord-reset in-app). Utility-gaten: analyse-diepte (geen curves/трends), sharing/export, en één gebouwde-maar-onbereikbare feature (mid-workout doel wijzigen via `GoalSetupModal` — volledig bedraad, geen enkele trigger: de DOEL-pill is een kale View, `ActivePhase.tsx:292-301`). Usefulness wordt vooral geremd door de twee P0's, niet door ontbrekende hoofd-features.

## 4 — 5 interactie-dimensies

| Dimensie | Score | Kern |
|----------|:-----:|------|
| Words | 4/5 | Sterk: "RESTERENDE TIJD/AFSTAND" (F3 van baseline opgelost), coaching-zinnen ("Je bent 3 seconden sneller"), duidelijke guard-copy, relatieve datums. Dents: "Ga verder" na "Doel bereikt!" suggereert doorroeien maar leidt naar de samenvatting (rit is beëindigd); "Je bent 0 seconden sneller" op exact doeltempo; kcal-`*` nergens uitgelegd (`ActivePhase.tsx:403,616`); "Week" = rollende 7 dagen op Historiek vs kalenderweek in het periode-doel — zelfde woord, twee betekenissen (`history/index.tsx:57-64` vs `usePeriodGoal.ts:27-40`); decimaalpunt ("22.3 km") naast duizendtal-punt ("7.515 m"); "0:17 min" voor 17 seconden. |
| Visual representations | 3/5 | Cohesief type/kleur-systeem, semantische zone-balk, goud-track als eigen progress-taal, zebra-rijen voor scanbaarheid. Maar: nul grafieken in een data-product; vergelijkingszin (36px) loopt edge-to-edge zonder padding (`ActivePhase.tsx:753-758` + `heroPanel` zonder paddingHorizontal `:727-732`); geen-doel-variant toont afstand dubbel (hero én KPI-lijst). |
| Physical / space | 3/5 | Segmenten/knoppen/rijen overwegend 44pt+, BottomSheet-close correct 48pt via hitSlop, landscape-50/50 werkt (live gezien). Onder de maat: Subtitle-links ±16pt (WIJZIG/wijzig/alle — `Subtitle.tsx:44-53`, geen padding/hitSlop), chevron-backs 40×40, password-reveal 36×36, chips 40pt, dev-geverifieerde onraakbaarheid van WIJZIG. Idle-scherm verspilt veel verticale ruimte. |
| Time | 4/5 | Live vlot: navigatie instant, sheet-animatie 220ms, wheel-haptics, EMA-gesmoothde "huidige" waarden (geen zenuwachtige cijfers), celebration direct, auto-save onmerkbaar op de achtergrond. Loading-flow kan netter: begroeting flitst fallback "roeier", DEZE MAAND/PR-secties poppen in na de fetch (layout-shift), geen skeletons. |
| Behavior | 3/5 | Voorspelbaar in de kern + goede guards; zone-kleur reageert direct op prestatie. Maar: doel-bereikt beëindigt de rit zonder dat de UI dat communiceert (open productkeuze in HANDOFF), WIJZIG-tap doet (voor zover live meetbaar) niets, BPM-tap onvindbaar, GoalSheet-Opslaan zonder keuze "lukt" stil, Android-back genegeerd op 3 van 5 modals (GoalSetupModal, HR-keuze, summary — geen `onRequestClose`). |
| **Subtotaal** | **17/25** | (13/07: 15/25) |

---

## 5 — Bevindingen (geprioriteerd)

### P0 — blokkeert gebruikers, direct fixen

**F1 · Profielvelden persisteren niet** — `Effectiveness, Error tolerance, Credible`
`handleSave` (`app/(tabs)/profile.tsx:296-319`) is de enige Supabase-write voor naam/geslacht/lengte/gewicht/geboortedatum/spm_halved en heeft **nul call-sites**. De per-sheet "Opslaan"-knoppen (`:453,547,557,573,589`) en de SPM-switch (`:432-438`) zetten alleen lokale state; de eerstvolgende `useFocusEffect`-fetch (`:181-185`) overschrijft alles met de oude serverwaarden. E-mail en periode-doel persisteren wél (eigen writes). Cross-effect: `hasProfileWeight` blijft false → kcal-asterisk permanent (`ActivePhase.tsx:403,616`) en kcal blijft op geschat gewicht. Live bevestigd: de Lengte-sheet oogt perfect en "slaagt" — er wordt niets bewaard. *(Bevestigt het open HANDOFF-risico van 2026-07-16.)*
→ *Impact zeer hoog · Effort S.* Laat elke sheet zelf persisteren zoals `GoalSheet.persist` (`components/GoalSheet.tsx:103-115`), of roep `handleSave` aan bij sheet-sluiten; toon een save-bevestiging/fout.

**F2 · Workout niet stopbaar tijdens BLE-reconnect/error** — `Error tolerance, Physical`
Zodra `bleStatus !== 'connected'` in de active-fase rendert `ActivePhase` uitsluitend de connect-overlay (`isConnecting`, `:123-126`; render-taken leveren `null`, `:511,565-568`) — hero, KPI's én Stop-knop weg; de tabbar is al verborgen (`app/(tabs)/_layout.tsx:14`). Onbedoelde disconnect → 3×2s reconnect → error met alléén "Opnieuw proberen" (`lib/ble/ble-service.ts:328-365`). Wie zijn erg kwijt is (batterij leeg, weggelopen) kan de sessie niet beëindigen of saven.
→ *Impact hoog (kernscenario voor een BLE-app) · Effort S–M.* Toon in de overlay ook verstreken tijd + een Stop-knop (save + naar summary); overweeg na de eerste reconnect-poging een compacte banner i.p.v. full-screen.

### P1 — grote frictie, deze sprint

**F3 · Doel-wijzig-entry (WIJZIG) onbetrouwbaar + te klein** — `Physical, Effectiveness`
De Subtitle-action is een Touchable van alleen tekst+icoon, ±16pt hoog, zonder padding of hitSlop (`components/Subtitle.tsx:20-27,44-53`). In de live test vuurde WIJZIG op Home én Profiel in 5+ pixel-precieze kliks nooit, terwijl het identieke "ALLE" direct werkte — mogelijk overlapt iets het target of is het praktisch onraakbaar; met een vinger (~9mm) is 16pt sowieso onder elke richtlijn (44pt).
→ *Impact hoog (enige entry naar het periode-doel) · Effort S.* Geef de action padding + `hitSlop` tot ≥44pt en maak desnoods de hele doel-kaart tappable; **verifieer op toestel** of de link met vinger überhaupt werkt.

**F4 · Toegankelijkheid: drie exacte contrast-fails + ontbrekende labels** — `Accessible`
Exact berekend op de tokens: inactieve tab-labels `fg.quaternary` #5C606B op `bg.raised` #21242C = **2.47:1** (11px uppercase — fail AA én non-text); witte 18px-knoptekst op `accent.default` #F05454 = **3.44:1** (fail AA-klein; geldt voor Start/Stop/Opslaan/Ga verder); `status.error` op raised = 4.12:1; quaternary-chevrons = 2.85:1 (non-text 3:1). Daarnaast: 6 van ±79 touchables hebben een accessibility-prop; `Button.tsx` zelf geen enkele; icon-only backs zonder label; geen `maxFontSizeMultiplier`-vangnet bij vaste hoogtes (Chip 40, DeviceRow 48).
→ *Impact hoog voor screenreader/laagzicht-gebruikers · Effort M.* Inactieve tabs → `fg.tertiary` (4.73:1 ✓); knoptekst zwaarder/donkerder of accent verdiepen; `accessibilityRole/Label` op Button, tabs, rijen, backs; a11y-pass op toestel met VoiceOver.

**F5 · Vergelijkingszin loopt tegen de schermrand** — `Visual, Words`
Bij split/watt-doelen rendert de coaching-zin ("Je levert 10 W minder dan je doel") op 36px via `subtitleText` zonder horizontale padding in een `heroPanel` zonder paddingHorizontal (`ActivePhase.tsx:753-758, 727-732`) — live raakt de tekst letterlijk de linker- én rechterrand en wrapt lelijk.
→ *Impact midden (kernscherm mid-workout) · Effort XS.* `paddingHorizontal: space['20']` op de zin of het paneel; copy-variant "Op doeltempo" bij diff 0.

### P2 — hinder, volgende release

**F6 · Stille fouten rond het periode-doel** — `Error tolerance`
`usePeriodGoal` exposeert geen error en Home leest zelfs `loading` niet (`app/(tabs)/index.tsx:77`): een gefaalde fetch is identiek aan "geen doel" — de sectie verdwijnt geruisloos; Home heeft bovendien geen "stel een doel in"-CTA voor nieuwe gebruikers (Profiel wél, `profile.tsx:356-360`). GoalSheet-Opslaan zonder periode/type-keuze schrijft stil `NO_GOAL` en sluit alsof het lukte (`GoalSheet.tsx:117-123,146-153`; `GoalSetupModal` heeft wél `disabled={!isValid}`). *Effort S–M.*

**F7 · "Ga verder" na doel-bereikt communiceert de afloop niet** — `Words, Behavior`
Doel bereikt → auto-save + disconnect op de achtergrond; de celebration-knop "Ga verder" voert naar de samenvatting — niet verder roeien. De open HANDOFF-aanname ("doel-bereikt beëindigt de rit") is dus live gedrag, maar de copy verhult het. *Effort XS (copy: "Bekijk samenvatting") of M (doorroei-optie — productkeuze bij Jeroen).*

**F8 · "Week/Maand" betekent twee dingen** — `Words`
Historiek filtert op rollende 7 dagen/maand (`history/index.tsx:57-64`), het doel op kalenderweek/-maand (`usePeriodGoal.ts:27-40`). Live staat "DEZE MAAND 22.3 km" (kalender) naast Historiek-"Week 22.33 km" (rollend) — leest als dezelfde stat met andere precisie. *Effort S: één definitie kiezen of labels expliciteren ("Laatste 7 dagen").*

**F9 · Laad-flow: fallback-flits en pop-in** — `Time`
Cold start toont "GOEDEMIDDAG, roeier" (fallback, `index.tsx:138`) die naar "Jeroen" flitst; DEZE MAAND- en PR-secties ontbreken tijdens de fetch en poppen in (layout-shift); alleen de lijst heeft een spinner. *Effort S: naam pas tonen na fetch (of skeleton), sectie-skeletons.*

**F10 · Getal- en unitformattering inconsistent** — `Words, Credible`
Decimaalpunt in "22.3 km"/"9:10 min" naast duizendtal-punt in "7.515 m" (NL-conventie zou komma zijn — zelfde punt, twee betekenissen, al geflagd op 13/07); "0:17 min" voor 17s; "2.500m" (zonder spatie, active) vs "7.515 m" (met spatie, lijsten). *Effort S: één formatter-conventie (komma-decimaal of consequent punt-duizendtal + spatie vóór units).*

**F11 · Geen datavisualisatie** — `Useful, Visual, Desirable`
BPM gem/piek bestaat, samples per workout worden opgeslagen — maar nergens een HR-verloop, split-trend of doel-trend. Voor een data-product blijft dit het grootste utility-gat (was F8 op 13/07). *Effort M–L; grootste zichtbare waardesprong na de P0's.*

**F12 · Mid-workout doel wijzigen: gebouwd maar onbereikbaar** — `Useful`
`GoalSetupModal` is volledig bedraad in `ActivePhase` (state, handlers, render `:121,139-149,571-577`) maar niets roept `setShowGoalModal(true)` aan — de DOEL-pill is niet tappable (`:292-301`). Beslissen: pill tappable maken (feature aan) of het pad verwijderen (dead weight weg). *Effort XS–S.*

### P3 — nice-to-have, backlog

**F13 · "← OVERZICHT"-back botst met de tab "Overzicht"** op History-detail — beide zichtbaar boven elkaar (baseline-F13, live bevestigd). Hernoem de back-link ("← HISTORIEK") of chevron-only. *Effort XS.*

**F14 · Icon-only inactieve doelsegmenten** (IdlePhase) — betekenis (klok=duur, pin=afstand, stopwatch=split, bliksem=watt) vergt gok of trial; label verschijnt pas bij selectie. *Effort S.*

**F15 · BPM-rij is onzichtbaar interactief** — enige tappable KPI-rij (start HR-scan), visueel identiek aan de rest (`ActivePhase.tsx:407-434`). Voeg een subtiel icoon/link-stijl toe. *Effort XS.*

**F16 · Android-back genegeerd op 3 modals** (GoalSetupModal, HR-keuze, summary: geen `onRequestClose`); backdrop-tap sluit ze evenmin. *Effort XS–S.*

**F17 · Geen-doel-variant toont afstand dubbel** (hero "TOTALE AFSTAND" + KPI-rij "Totaal afstand", live gezien) — rest-fragment van baseline-F7 die voor doelvarianten al opgelost is. *Effort XS.*

**F18 · Dode/ongebruikte UX-lagen opruimen** — berekend-maar-nooit-getoond: `paceZone`-prop, `isCountdown`, `pulseAnim`-pulse (90%+-spanning!), per-metric `prFlags`, live `SplitsList`; dode componenten `KPI.tsx`/`SectionHeader.tsx`; 3× identieke hardcoded `rgba(240,84,84,0.20)` met dezelfde TODO (token-gap, cf. HANDOFF), confetti-kleuren en celebration-card-rgba hardcoded. Activeren of verwijderen. *Effort S.*

**F19 · Kcal-asterisk zonder legende** — `*` bij geschat gewicht wordt nergens uitgelegd; lost grotendeels vanzelf op na F1 + één regel uitleg in de summary. *Effort XS.*

---

## 6 — Redesign-voorstellen (top)

### R1 · Profiel-save repareren (lost F1 + F19 op)
Elke veld-sheet persisteert zelf bij "Opslaan" (patroon van `GoalSheet.persist` hergebruiken), `saving`-spinner op de knop, foutmelding bij falen, en `fetchProfile` pas ná een geslaagde write.
**Effect:** Effectiveness 3→4, Error tolerance 3→4, kcal zonder asterisk. **Effort S.**

### R2 · Reconnect-overlay met uitgang (lost F2 op)

    ┌──────────────────────────────┐
    │   Opnieuw verbinden... ◌     │
    │   MockErg · poging 2 van 3   │
    │                              │
    │   verstreken  12:41          │   ← context blijft
    │                              │
    │  ┌────────────────────────┐  │
    │  │  Stop & bewaar workout │  │   ← ontsnapping
    │  └────────────────────────┘  │
    └──────────────────────────────┘

**Effect:** Error tolerance 3→4, vertrouwen tijdens hét kernscenario. **Effort S–M.**

### R3 · Tap-target- & a11y-pass (lost F3 + F4 op)
Subtitle-action: padding + hitSlop ≥44pt én hele doel-kaart tappable; chevrons/toggles ≥44; inactieve tabs `fg.quaternary`→`fg.tertiary`; knoptekst op accent zwaarder (SemiBold) of accent één stap donkerder; `accessibilityRole/Label` op Button, TabLabel, rijen, backs; device-VoiceOver-check.
**Effect:** Accessible 3→4, Physical 3→4. **Effort M.**

### R4 · Active-hero micro-polish (lost F5 + F17 op)
`paddingHorizontal` op de vergelijkingszin, copy "Op doeltempo" bij 0-verschil, afstand-dedupe in de geen-doel-variant, kcal-legende in summary.
**Effect:** Visual 3→4, Words 4→5. **Effort XS–S.**

### R5 · Doel-bereikt-afloop expliciet (lost F7 op, sluit HANDOFF-aanname)
Kort pad: knop hernoemen naar "Bekijk samenvatting". Volwaardig pad (productkeuze): celebration met twee acties — "Doorroeien" (rit loopt door, doel gearchiveerd) en "Afronden" (huidig gedrag).
**Effect:** Behavior 3→4. **Effort XS (copy) / M (doorroeien).**

### R6 · Analyse-laag: HR-verloop + split-trend (lost F11 op)
Detail-Hartslag: HR-over-tijd uit `samples` + zones; Detail-Splits: split-staafjes per 500m; Home: mini-trend onder de PR's. Sluit aan op bestaand serif-cijfer-DNA; `samples` bestaan al per workout.
**Effect:** Useful 4→5, Visual 3→4, Desirable 4→5. **Effort M–L.**

> Bouwen: via `nieuw-component` / `figma-naar-code` / `code-naar-figma`. Deze audit levert richting, geen Figma-uitwerking.

---

## 7 — Research-aanbevelingen

- **Device-verificatie WIJZIG** (F3): werkt de link met een vinger op de fysieke iPhone? Tegelijk de open HANDOFF-checks meepakken (wheel-sheets naast Figma, keyboard-clip op SE, keychain-refresh).
- **Erg-test disconnect-scenario** (F2): trek mid-workout de stekker/loop buiten bereik en observeer de overlay-ervaring — kunnen roeiers stoppen, begrijpen ze de reconnect?
- **First-run-test met vers account**: lege Home (geen doel-CTA — F6), eerste connect-flow, auth live (deze audit kon auth niet live testen door de sessie-guard).
- **VoiceOver + dynamic-type-pass op toestel** (F4): geen simulatie — echte screenreader-run over tabbar, sheets, active-scherm.
- **5-seconden-test op de active-varianten**: wordt "RESTERENDE TIJD" vs "TOTALE TIJD" direct begrepen, en de zone-kleur zonder legende?
- **Doel-bereikt-verwachting** (F7): verwachten roeiers doorroeien of afronden? Bepaalt R5-scope.

---

## 8 — Methodiek & limieten

- **Expert-review van de draaiende app** (simulator, dev-build) + code-inventarisatie met file:line-bewijs; geen echte-gebruikersdata of analytics — uitspraken over taaksucces blijven expert-inschattingen.
- **Live geverifieerd:** alle 4 tabs met echte data, History-detail (Overzicht-tab), alle 5 active-doelvarianten + celebration + summary (via `dev-active`-harness met mock-metrics), BLE-startguard-alert, LENGTE-wheel-sheet (wheels clippen niet op sim — device-check blijft open per HANDOFF), Home-loading-state, landscape (afstand-variant, serendipiteus).
- **Niet live geverifieerd:** auth-schermen (sessie-guard bounct ingelogde gebruikers — uit code beoordeeld), Splits/Hartslag-tab-inhoud (tab-taps registreerden niet synthetisch; empty-state-copy uit code: "Geen splits beschikbaar." / "Geen hartslag-detail per segment. Beschikbaar vanaf je volgende training."), GoalSheet-visual (code + eerdere Figma-parity-verificatie), Android.
- **Synthetische kliks (CGEvent) bleken onbetrouwbaar binnen scroll-containers** — WorkoutCard-rijen (Pressable) en Segmented-tabs reageerden niet op robot-taps; dit zegt niets over vinger-gedrag. De WIJZIG-bevinding (F3) is dáárom als "onbetrouwbaar + device-verificatie nodig" geformuleerd, niet als bewezen kapot — het contrast met het wél-werkende identieke "ALLE"-zusje en het 16pt-target zijn de objectieve kern.
- **Contrastratio's zijn exact berekend** op de token-hexen (WCAG-luminantieformule), niet geschat; on-screen rendering (gradients, blending) kan marginaal afwijken — device-tool-check aanbevolen.
- **Dev-tooling-ruis** (Metro "Refreshing", UnableToResolveError-toast, deep-link-herstel na reload) is genegeerd — niet aanwezig in een productie-build.
- **Score-vergelijking met 13/07 is indicatief**: toen statisch design, nu levend product. De stijging 56→61 komt vooral uit Error tolerance-fundament, opgeloste P1's (cirkelknoppen, hero-semantiek, states) en exactere a11y-meting; de nieuwe P0's waren op het design onzichtbaar.

### Aannames

- `[ASSUMPTION]` Dark-only blijft bewust (erg-context); geen light-mode-gat.
- `[ASSUMPTION]` Zebra-rijen (om-en-om `bg.raised`) zijn bewust ontwerp (PR #142 "history rows match home"), geen data-betekenis.
- `[ASSUMPTION]` De provisionele persona van 13/07 blijft gelden: recreatieve/competitieve indoor-roeier, 25–55, eigen erg + telefoon op de erg, frustratie = onbetrouwbare BLE en onleesbare metrics mid-workout.
- `[ASSUMPTION]` Productie-build gedraagt zich als de dev-build minus Metro-ruis; geen release-build getest.

### Bias-noot

RowTrack is umanex-eigen werk; ik ben maker-nabij. Bewust tegengewicht: de twee P0's zijn prominent gehouden ondanks de sterke visuele indruk, en de score is niet naar B afgerond hoewel hij er dichtbij zit.
