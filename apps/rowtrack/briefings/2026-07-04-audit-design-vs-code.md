# Audit — Design vs. code (RowTrack)

**Datum:** 2026-07-04
**Bronnen:** Figma file [RowTrack](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack) (via Figma Console MCP / Desktop Bridge) vs. code in `apps/rowtrack` (main, werkstand 2026-07-04)
**Methode:** 11 gebied-auditors (multi-agent) vergeleken Figma node-data (auto layout, fills, typografie, teksten, varianten) met de code. Elke bevinding is daarna adversarieel geverifieerd: code herlezen én Figma-node herbevraagd. 206 van 207 bevindingen bevestigd met high confidence, 1 met medium. Geen enkele bevinding werd weerlegd.
**Doel:** beslisdocument — vink aan wat aangepast wordt. Een vinkje betekent nog niet automatisch "code volgt design": per cluster staat expliciet de vraag welke bron wint.

---

## Samenvatting

| Gebied | Hoog | Middel | Laag | Totaal |
|---|---|---|---|---|
| Home | 0 | 3 | 12 | 15 |
| Workout — Idle-fase (doel instellen) | 0 | 10 | 16 | 26 |
| Workout — Actieve fase, portrait | 0 | 6 | 12 | 18 |
| Workout — Actieve fase, landscape | 0 | 8 | 14 | 22 |
| Workout — Samenvatting | 0 | 3 | 11 | 14 |
| History — lijst | 0 | 3 | 11 | 14 |
| History — detail (Overview / Splits / BPM) | 0 | 2 | 18 | 20 |
| Profile + bewerk-sheets | 0 | 9 | 19 | 28 |
| Overlays & Motivational Toast | 0 | 6 | 7 | 13 |
| Gedeelde chrome (TabBar, status bars, Chip, Button) | 0 | 6 | 15 | 21 |
| Design tokens (Figma variables vs constants/) | 1 | 4 | 11 | 16 |
| **Totaal** | **1** | **60** | **146** | **207** |

**Naar type:** style-mismatch (63) · layout-mismatch (44) · token-mismatch (27) · text-mismatch (25) · missing-in-design (23) · missing-in-code (11) · state-mismatch (8) · structure-mismatch (6)

---

## Beslispunten — de clusters achter de 207 items

De meeste bevindingen vallen in acht clusters. Beslis per cluster; de losse items hieronder volgen dan vanzelf.

### 1. Token-pipeline is kapot — `[object Object]` in colors.ts · HOOG

Pure code-bug, geen designkeuze. `constants/colors.ts` (regels 62, 78, 89) bevat letterlijk de string `'[object Object]'` waar Button shadow- en typografie-tokens hadden moeten staan — de Style Dictionary-export serialiseert composite tokens (shadows met 4 lagen, typography-objecten) niet. Gevolg: de hele Button-schaduwset uit het design ontbreekt in de app. Daarnaast is de Figma component-tokenlaag grotendeels niet geëxporteerd.
**Beslissing:** export-pipeline fixen (transform voor composite tokens) — dit lijkt me non-negotiable en de eerste stap, want meerdere visuele clusters hangen hieraan.

### 2. Cyaan vs. rood accent — het design is hier zelf inconsistent · HOOG (beslispunt)

De Profile-sheets (Opslaan-knop `#00D4FF`, cyaan) en de Motivational Toast (cyaan knop + kaart-border) gebruiken een kleurenwereld die nergens in `constants/colors.ts` bestaat; de code gebruikt overal het rode accent (`#F05454`-familie) dat de rest van het design (Home, Workout, History) wél gebruikt. Dit zijn vermoedelijk oudere Figma-schermen van vóór de rode accent-richting.
**Beslissing:** wint het rode accent (→ Figma-schermen Profile/Toast bijwerken, code grotendeels laten) of cyaan als secundaire actie-kleur (→ token toevoegen + code aanpassen)? Mijn inschatting: design bijwerken, niet de code.

### 3. Italic ontbreekt op alle eenheid-teksten · MIDDEL, één fix

In het design zijn álle eenheden (km, min, uur, kcal, m, /500m) Source Serif *Italic*; `typeStyles.kpiUnit` (`constants/typography.ts:100`) gebruikt de Regular-variant. Eén tokenfix raakt Home, History, Summary, landscape-pill en de Verbind/Verbreek-teksten. Let op de spiegelbeeld-bug: `type/heroDisplay` is in Figma juist Regular maar in code Italic.
**Beslissing:** kpiUnit → `SourceSerif4_400Regular_Italic`, heroDisplay-richting kiezen.

### 4. Button-systeem wijkt structureel af · MIDDEL

Drie structurele punten: (a) het design zet een pijl-icoon **rechts** van het label ("Start training →"), de code rendert icons alleen links en groter; (b) de Stop-knop is in het design een **Primary** (rode gradient), in code `variant="destructive"` (subtiele tint); (c) de Opslaan-knop in Profile-sheets — zie cluster 2.
**Beslissing:** trailing-icon support in `Button.tsx` + variant-keuze Stop-knop.

### 5. Landscape actieve workout: functionele afwijkingen · MIDDEL-HOOG impact

Niet cosmetisch maar inhoudelijk: de Duration-variant toont AFSTAND waar het design TIJD toont; de Distance-subtitel toont tijd i.p.v. afgelegde afstand; de vergelijkingszin onder de balk (Split/Watts) ontbreekt; afstand schakelt naar km waar het design meters met puntnotatie houdt; de progressbalk-representatie verschilt.
**Beslissing:** per variant bepalen wat de juiste metriek-hiërarchie is — dit is eerder een UX-beslissing dan een stijlkwestie.

### 6. TabBar-labels: 9px vs 11px · MIDDEL

Design: Albert Sans SemiBold 11px voor actief én inactief (alleen kleurverschil). Code: inactief valt terug op `labelMicro` (Medium 9px). Kleine fix in `TabLabel.tsx`, zichtbaar op elk scherm.

### 7. Status-semantiek: "connected" is rood in design, groen in code · MIDDEL (beslispunt)

De BLE/HR status bars gebruiken in het design het rode accent als connected-indicator (merk-kleur als status); de code koos semantisch groen. Zelfde discussie bij de Verbreek-actie (design: accent-rood italic; code: grijs regular).
**Beslissing:** merk-kleur of verkeerslicht-semantiek? Bewuste UX-keuze maken en één van beide bronnen bijwerken.

### 8. Design-backlog: schermen zonder Figma-design · beslispunt voor Figma, niet voor code

Login/Register, GoalSetupModal, MilestoneOverlay, de verbindings-overlay tijdens actieve workout en de niet-goal toast-state bestaan in code maar hebben geen design. Omgekeerd zijn er zes geëxporteerde componenten die nergens gerenderd worden (dead code) en drie Figma-componenten die nooit in code belandden.
**Beslissing:** designen wat blijft, dead code opruimen.

### Overig

De resterende ~150 LAAG-items zijn detail-polish (gaps van 2–8px, kleurtint een stap ernaast, radius-stapjes, copy-verschillen). Die kunnen per gebied in bulk mee zodra de clusters beslist zijn.

---

## Dekkings-gaten (coverage-critic)

Geen discrepanties maar gaten: dingen die in één van beide bronnen simpelweg niet bestaan of buiten de audit vielen.

- [ ] **Auth-schermen (login en register) hebben geen Figma-design en zijn door geen enkel gebied geaudit** · `HOOG` · missing-in-design
  app/(auth)/login.tsx en app/(auth)/register.tsx bestaan alleen in code: de Figma-inventaris bevat geen enkel auth-frame, en 'auth' was ook geen auditgebied. Dit raakt ook components/FormField.tsx en components/ErrorMessage.tsx, die uitsluitend in deze schermen gebruikt worden en dus nergens tegen een design zijn getoetst.
- [ ] **GoalSetupModal (doel instellen tijdens workout) heeft geen Figma-equivalent en zit in geen enkele bevinding** · `HOOG` · missing-in-design
  components/GoalSetupModal.tsx is een volledige modal (doeltype-selectie via GOAL_TYPES, tekstinvoer, opslaan/wissen-knoppen) die vanuit components/workout/ActivePhase.tsx (regel 636) mid-workout wordt geopend. Er is geen corresponderend Figma-frame (IdlePhase-set en 'Doel bewerken' in Profile dekken andere flows) en geen enkele workout-active- of overlays-bevinding noemt hem.
- [ ] **Verbindings-overlay tijdens actieve workout ontbreekt in design en in de audit** · `MIDDEL` · missing-in-design
  components/workout/ActivePhase.tsx regels 585-605 rendert een full-screen overlay met spinner en statusteksten ('Zoeken naar roeier...', 'Verbinden...', 'Services ontdekken...', 'Opnieuw verbinden...', 'Verbinding verbreken...') plus een error-state met warning-icoon en 'Opnieuw proberen'-ghost-knop. Geen Figma-frame dekt deze states; de bestaande shared-chrome bevinding over status-bar states gaat alleen over de BLE/HR-statusbalken, niet over deze overlay.
- [ ] **Zes geexporteerde componenten zonder Figma-equivalent worden bovendien nergens gerenderd (dead code)** · `LAAG` · missing-in-design
  components/Card.tsx, components/MetricDisplay.tsx, components/SummaryRow.tsx, components/PeriodGoalCard.tsx, components/GoalInput.tsx en het UI-deel van components/PaceZone.tsx (alleen de getPaceZone-helper wordt gebruikt via lib/hooks/useGoalProgress.ts) worden via components/index.ts geexporteerd maar in geen enkel scherm gerenderd, en hebben geen Figma-tegenhanger. Vooral opruimkandidaten; PeriodGoalCard overlapt functioneel met GoalProgressCard dat wel design en audit heeft.
- [ ] **Figma-component Icons/Targets (72:15000) niet vergeleken met Ionicons-gebruik in GoalSegments** · `MIDDEL` · not-audited
  Figma bevat een eigen Icons/Targets-component voor de doel-iconen, terwijl components/GoalSegments.tsx Ionicons gebruikt (GOAL_ICONS-mapping). Geen enkele bevinding vergelijkt de icoonbron of -vormen; de shared-chrome bevinding over de icon-variant van segment-TabItem gaat over een ander component. Kon niet live geverifieerd worden omdat de Figma Desktop Bridge onbereikbaar was.
- [ ] **Figma-component Devices (32:374) komt in geen enkele bevinding voor** · `LAAG` · not-audited
  Naast het wel geauditeerde 'Device connect 72:15743' staat op de Components-pagina een aparte 'Devices 32:374'. Geen bevinding refereert eraan; mogelijk een legacy-duplicaat, maar dat is niet vastgesteld. Verdient een expliciete check (audit of archiveren in Figma).
- [ ] **Figma-component App page title (32:516) niet als component geaudit** · `LAAG` · not-audited
  Paginatitels zijn alleen zijdelings geraakt (history-detail bevinding over gap tussen titel en back-link). De App page title-component zelf is niet systematisch vergeleken met de titel-implementaties in app/(tabs)/index.tsx, history/index.tsx, history/[id].tsx en profile.tsx (typografie, spacing, structuur).

> Noot van de critic: Figma Desktop Bridge was tijdens deze check onbereikbaar (Console MCP figma_execute faalde met connectiefout); Figma-zijde is daarom beoordeeld op de aangeleverde inventaris. Code-zijde volledig doorlopen: alle routes in app/ en alle 30 componentbestanden in components/. Profile-sheets in code (voornaam, email, geslacht, lengte, gewicht, geboortedatum, doel) matchen 1-op-1 met de Figma-set '07 - Profile' — daar geen gap. KPI, KPI_single, KPI_table, Workout(Card), Subtitle, TabBar/TabItem, Segments, GoalSegments, Wheel, Motivational Toast en MilestoneOverlay zijn al gedekt door bestaande bevindingen en dus niet herhaald.

---

## Alle bevindingen per gebied

### Home (15)

- [ ] **Divider onder workout-rijen ontbreekt in code** · `MIDDEL` · missing-in-code
  - In het design heeft elke workout-rij in 'Recente trainingen' een 1px onderrand als scheidingslijn (strokeTRBL 0/0/1/0). In code hebben de rijen alleen gap 8 zonder enige border, waardoor de dividers volledig ontbreken. Merk op dat het design zelf inconsistent is: de derde rij gebruikt border.strong i.p.v. border.default.
  - Figma: Workout component (56:13791), instanties op Home (16:159) > Frame 23 (107:2459) → Workout-rij heeft bottom border 1px #2C2F37 (border.default); laatste rij op Home gebruikt #3A3E48 (border.strong)
  - Code: `app/(tabs)/index.tsx:363` → workoutRow heeft geen border/divider

- [ ] **Begroetingstekst gebruikt ander lettertype dan design** · `MIDDEL` · style-mismatch
  - De begroeting ('Goedemiddag,') staat in het design in Newsreader Italic, terwijl de code SourceSerif4 Italic gebruikt. Alle andere italics op het scherm zijn wel Source Serif in beide bronnen; alleen deze tekst wijkt af. Size (14), lineHeight (150%), letterSpacing (-0.5%) en kleur (fg.secondary #B5B9C2) kloppen wel.
  - Figma: Home (16:159) > Frame 9 > Goedemiddag, (16:160) → Newsreader Italic 14px
  - Code: `app/(tabs)/index.tsx:313` → fontFamily.sourceSerifItalic = SourceSerif4_400Regular_Italic 14px

- [ ] **Eenheid-teksten zijn regular i.p.v. italic** · `MIDDEL` · style-mismatch
  - Alle eenheid-teksten op Home (PR-eenheden 'km'/'min', workout-rij 'uur'/'kcal'/'m') zijn in het design cursief (Source Serif Italic). De code gebruikt overal typeStyles.kpiUnit met de regular font family (gebruikt in components/KPI_single.tsx:37 en app/(tabs)/index.tsx:391/417). Font size 16 klopt wel.
  - Figma: Workout (56:13791) > 'uur'/'kcal'/'m' + Home (16:159) > KPI_single (107:2455) > unit → Source Serif Pro Italic 16px voor alle eenheden (km, min, uur, kcal, m)
  - Code: `constants/typography.ts:100` → typeStyles.kpiUnit gebruikt SourceSerif4_400Regular (niet italic)

- [ ] **Dot-component kleur wijkt af van design** · `LAAG` · token-mismatch
  - Het dot-component (4x4 separator) is in het design fg.tertiary (#8A8E97), maar de code-default is fg.quaternary (#5C606B). Beide plekken op Home (statusregel van GoalProgressCard en de workout-rij) gebruiken <Dot /> zonder color-prop en tonen dus de te donkere kleur.
  - Figma: dot component (67:14291) > Ellipse 10 → #8A8E97 (fg.tertiary)
  - Code: `components/Dot.tsx:19` → fg.quaternary = #5C606B

- [ ] **KPI_single: eenheid-kleur wijkt af** · `LAAG` · token-mismatch
  - De eenheid ('km'/'min') bij de persoonlijke records is in het design fg.tertiary (#8A8E97), in code fg.secondary (#B5B9C2) — een tint lichter dan bedoeld.
  - Figma: Home (16:159) > PR Row (107:2454) > KPI_single (107:2455) > unit (I107:2455;89:3441) → #8A8E97 (fg.tertiary)
  - Code: `components/KPI_single.tsx:38` → fg.secondary = #B5B9C2

- [ ] **KPI_single: verticale gap 4 i.p.v. 0** · `LAAG` · layout-mismatch
  - Tussen de KPI-waarde en het label zit in het design geen gap (0), in code 4px. De PR-cellen worden daardoor 4px hoger dan het design.
  - Figma: Home (16:159) > PR Row > KPI_single (107:2455) → VERTICAL gap 0 (totale hoogte 62: waarde 34 + label 28)
  - Code: `components/KPI_single.tsx:25` → gap: space['4'] = 4

- [ ] **GoalProgressCard: statusregel gap 6 i.p.v. 4 plus extra spatie** · `LAAG` · layout-mismatch
  - De statusregel onder de progress bar gebruikt in het design 4px gap; de code gebruikt 6px én voegt via de leading spatie in ' voldaan' nog extra witruimte toe, waardoor de elementen merkbaar verder uit elkaar staan dan ontworpen.
  - Figma: GoalProgressCard (64:14031) > Frame 73 (64:14018) → HORIZONTAL gap 4 tussen '41%', 'voldaan', dot en 'resterend'
  - Code: `components/GoalProgressCard.tsx:136` → gap: space['6'] = 6, en statusLabel-string ' voldaan' heeft een leading spatie (regel 71)

- [ ] **GoalProgressCard: connector 'van' met extra spaties en bottom-padding** · `LAAG` · layout-mismatch
  - De waarderegel '20.45 m van 50 km' krijgt in code dubbele spatiëring (flex-gap 8 + spaties in de string) en de connector wordt 4px omhoog geduwd met paddingBottom, terwijl het design de tekstboxen zuiver bottom-aligned zet met alleen gap 8.
  - Figma: GoalProgressCard (64:14031) > Frame 97 (64:14011) > van (64:14013) → tekst 'van' zonder spaties, gap 8, tekstbox bottom-aligned zonder offset
  - Code: `components/GoalProgressCard.tsx:59` → tekst ' van ' met spaties bovenop gap 8, plus paddingBottom: space['4'] (regel 103)

- [ ] **ProgressBar track: corner radius 4 i.p.v. 18** · `LAAG` · token-mismatch
  - De buitenste track van de progress bar heeft in het design radius 18, in code radius 4. Visueel onzichtbaar op een 2px hoge balk, maar de token-keuze wijkt af. Trackkleur (#C9B894), fill (#F05454) en trackdot (6x6) kloppen wel.
  - Figma: GoalProgressCard (64:14031) > ProgressBar (71:14319) → cornerRadius 18 (radius.lg) op de track; Fill heeft radius 4
  - Code: `components/GoalProgressCard.tsx:116` → trackOuter borderRadius: radii.xs = 4

- [ ] **Start-knop is 48px hoog i.p.v. 44px** · `LAAG` · layout-mismatch
  - De primaire Start-knop in de header is in het design 44px hoog; de code gebruikt voor size 'lg' een vaste hoogte van 48px.
  - Figma: Home (16:159) > Frame 9 > Button (108:2214) → hoogte 44 (padding 14 boven / 12 onder, tekst 18px)
  - Code: `components/Button.tsx:124` → sizeLg height: space['48'] = 48

- [ ] **Start-knop: border en schaduw-set wijken af van design** · `LAAG` · style-mismatch
  - De primary button heeft in het design een 1px accentrand en een gelaagde schaduw-set (2 drop + 2 inner shadows); de code rendert geen border en slechts één iOS-schaduw. De gradient (#F66363 naar #F05454) klopt wel.
  - Figma: Home (16:159) > Frame 9 > Button (108:2214) → 1px stroke #F05454 + 4 effecten (drop shadow r2, drop shadow r20, inner shadow r4, inner shadow r0)
  - Code: `components/Button.tsx:131` → geen border (buttonTokens.primary.borderWidth = 0), één schaduw (shadowRadius 12, opacity 0.4)

- [ ] **PR 'beste tijd': waarde-formaat minuten i.p.v. mm:ss** · `LAAG` · text-mismatch
  - Het design toont de tijd-PR als mm:ss ('15:00 min'), de code rondt af op hele minuten. Ook toont het design de afstand-PR met 2 decimalen waar de code op 1 decimaal afrondt. Mogelijk sample-data, maar het formaat verschilt structureel.
  - Figma: Home (16:159) > PR Row (107:2454) > KPI_single (107:2456) → '15:00' + eenheid 'min' (mm:ss-formaat); afstand-PR toont '100.45' met 2 decimalen
  - Code: `app/(tabs)/index.tsx:95` → fmtPrDuration geeft alleen hele minuten ('15'); fmtPrDistance maximaal 1 decimaal ('100.5')

- [ ] **PR 'snelste split' bestaat in design maar wordt niet getoond** · `LAAG` · missing-in-code
  - Frame 12 (los frame naast het Home-scherm, mogelijk een iteratie) toont een 3-koloms PR-variant inclusief snelste split. De hook haalt fastestSplit wel op, maar hasPrRecords en de render negeren die volledig. Het geplaatste Home-frame zelf toont 2 PR's, dus dit kan bewust zijn.
  - Figma: Frame 12 (80:2315) > PR Row (3 kolommen) → 3-koloms PR-rij: 'max. afstand', 'langste duur', 'snelste split' (1:58 /500m)
  - Code: `app/(tabs)/index.tsx:156` → maximaal 2 PR-cellen; records.fastestSplit wordt gefetcht (lib/hooks/usePeriodGoal.ts:85) maar nergens gerenderd

- [ ] **Loading- en lege-staat van Home niet in Figma uitgewerkt** · `LAAG` · missing-in-design
  - De code kent drie extra states (loading, geen workouts, geen periodedoel) die in Figma niet als frame of variant bestaan; er is maar één Home-frame.
  - Figma: Home (16:159) → één Home-frame met gevulde staat (doel actief, 2 PR's, 3 trainingen)
  - Code: `app/(tabs)/index.tsx:232` → code heeft loading-spinner, EmptyState 'Nog geen workouts — tijd om te beginnen!' en verbergt GoalProgressCard zonder ingesteld doel

- [ ] **Pijlen als tekstglyph i.p.v. vector-icoon** · `LAAG` · structure-mismatch
  - Alle pijlen op Home zijn in het design 9x8 vectoren; de code rendert het unicode-teken '→' in de lopende tekststijl. Vorm en grootte van de pijl hangen daardoor af van het font en wijken af van het getekende icoon.
  - Figma: Subtitle (55:13730) > → (66:14223), Workout (56:13791) > → (56:13789), Button (108:2214) → 9x8 vector-pijl (#F05454, in Button wit) los van de tekst
  - Code: `components/Subtitle.tsx:52` → '→' als Text-glyph: labelSection 13px (Subtitle), kpiValue 16px (index.tsx:421), en in de Button-titel 'Start →' 18px

### Workout — Idle-fase (doel instellen) (26)

- [ ] **CTA-knop mist pijl-icoon** · `MIDDEL` · missing-in-code
  - De primary CTA in het design heeft een pijl rechts van het label; in code wordt geen icoon meegegeven en ondersteunt Button geen trailing icon.
  - Figma: IdlePhase (35:1516) > Button Primary (64:14115) → Label 'Start training' gevolgd door pijl-vector (→, 9x8, wit)
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:503` → Button zonder icon-prop; Button.tsx rendert een icoon bovendien vóór de titel, niet erna

- [ ] **NudgeRow is in design één aaneengesloten balk, in code drie losse elementen** · `MIDDEL` · structure-mismatch
  - Design toont min/waarde/plus als één samengevoegde balk met donkerdere knopvlakken (bg.raised); code rendert drie gescheiden kaartjes met grotere radius en uniforme achtergrond.
  - Figma: IdlePhase (35:1516) > NudgeRow (80:2079) → Eén container: gap 0, radius 8, buitenrand #2C2F37, knoppen 64x64 fill #21242C met separator-strokes #3A3E48, waardecel fill #1A1D24
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:569` → Drie losse vlakken met gap 8, elk radius 12 (componentRadius.cardSm), alle vlakken bg.elevated #1A1D24 met eigen border #2C2F37

- [ ] **Nudge-waarde typografie wijkt af van design** · `MIDDEL` · style-mismatch
  - De grote waarde in het nudge-display gebruikt in design de serif-stijl van de wheel (34pt regular + italic unit); code gebruikt Inter Bold 28 met kleine Inter-unit.
  - Figma: NudgeRow (80:2079) > Val (I80:2079;80:1915) → Waarde: Source Serif Pro Regular 34; unit: Source Serif Pro Italic 16
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:586` → nudgeValue: Inter_700Bold 28 (fontFamily.bodyBold); nudgeUnit: Inter_400Regular 12

- [ ] **Unit-copy in nudge-display: voluit in code, afgekort in design** · `MIDDEL` · text-mismatch
  - Design toont afgekorte units naast de waarde; code toont voluitgeschreven units. Alleen de split-unit '/ 500m' komt overeen.
  - Figma: IdlePhase varianten duration/distance/watts > NudgeRow Val unit (bv. I80:1992;80:1917) → 'min', 'km', 'W' (split: '/ 500m')
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:319` → 'minuten', 'kilometer', 'watt gem.' (split: '/ 500m')

- [ ] **Segmented control: breedteverdeling inactief/actief wijkt af** · `MIDDEL` · layout-mismatch
  - In design zijn de inactieve segmenten breed en hugt het actieve segment zijn label; in code is het omgekeerd (smalle vaste inactieve knoppen, actief segment vult de rest).
  - Figma: Segments/Goals (72:15146), instanties in IdlePhase varianten → Inactieve segmenten vullen gelijkmatig (56-62px breed), actief segment hugt content (95-117px, padding 20 horizontaal)
  - Code: `apps/rowtrack/components/GoalSegments.tsx:146` → segmentInactive: vaste width 44; segmentActive: flex 1 (neemt alle restruimte, ~166px), paddingHorizontal 10

- [ ] **WheelPicker rijhoogtes: 40/56/40 in design, uniform 44 in code** · `MIDDEL` · layout-mismatch
  - De geselecteerde rij is in design 12px hoger dan in code en de randrijen 4px lager; het totaal verschilt 4px.
  - Figma: IdlePhase/Wheel (36:1956) > rijen (I36:2000;36:1945/36:1947/72:14741) → Bovenste/onderste rij 40 hoog, geselecteerde rij 56 hoog (padding 8/0/8), totaal 136
  - Code: `apps/rowtrack/components/WheelPicker.tsx:14` → ITEM_H = 44 voor alle rijen, totaal 132 (PICKER_H)

- [ ] **Unit-kleur bij geselecteerde wheel-rij wijkt af** · `MIDDEL` · style-mismatch
  - In design licht de unit mee op met de geselecteerde waarde; in code blijft de unit grijs.
  - Figma: IdlePhase/Wheel (36:1956) > geselecteerde rij unit (I36:2000;72:14678) → Unit in geselecteerde rij: #F8FAFC (zelfde lichte kleur als de waarde)
  - Code: `apps/rowtrack/components/WheelPicker.tsx:163` → itemUnitSelected: fg.secondary #B5B9C2

- [ ] **Actieve chip-achtergrond: opacity 0.20 in design, 0.12 in code** · `MIDDEL` · style-mismatch
  - De actieve recent-chip is in design even opvallend als het actieve segment (20% accent); code gebruikt de zwakkere accent.muted token (12%). GoalSegments hardcodet wél 0.20, dus code is intern inconsistent.
  - Figma: Pill State=Active (bv. 85:2062 in IdlePhase Goal=duration) → Fill #F05454 @ 0.20 (identiek aan actieve segment)
  - Code: `apps/rowtrack/components/Chip.tsx:34` → accent.muted = rgba(240, 84, 84, 0.12)

- [ ] **Nudge stepLabel-typografie wijkt af** · `MIDDEL` · style-mismatch
  - Het staplabel onder de +/- iconen gebruikt in design de labelGoalPrefix-stijl (Albert Sans caps met brede tracking); code gebruikt Inter met minimale tracking.
  - Figma: NudgeRow (80:2079) > '5 s' label (I80:2079;80:1914) → Albert Sans SemiBold 11, letterSpacing 20% (2.2), rendert als caps '5 S'
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:154` → Inter_500Medium 11 (fontFamily.bodyMedium), letterSpacing 0.3, geen uppercase

- [ ] **Verbind/Verbreek-knoptekst niet italic in code** · `MIDDEL` · style-mismatch
  - De actietekst in de statusbalken is in design italic (textLink-stijl); code gebruikt de regular cut. Geldt ook voor HrStatusBar.tsx:98 en de 'Verbreek'/'Opnieuw' varianten.
  - Figma: Device connect (72:15743) > 'Verbind' (72:15738) → Source Serif Pro Italic 15, #F05454
  - Code: `apps/rowtrack/components/BleStatusBar.tsx:110` → SourceSerif4_400Regular 15 (niet italic), accent.default

- [ ] **Chip-hoogte en horizontale padding wijken af** · `LAAG` · layout-mismatch
  - Recent-chips zijn in code 4px hoger dan in design; de padding verschilt maar heeft door gecentreerde flex-content weinig zichtbaar effect.
  - Figma: Pill (85:2108) in IdlePhase > ChipRow (33:902) → Hoogte 40, paddingHorizontal 8
  - Code: `apps/rowtrack/components/Chip.tsx:27` → height 44, paddingHorizontal 16

- [ ] **Chip-unit niet italic en niet als apart tekstsegment** · `LAAG` · style-mismatch
  - Design splitst waarde en unit met de unit in italic; code rendert het hele label in één regular tekst.
  - Figma: Pill (85:2108) > waarde + unit teksten → Waarde Source Serif Pro Regular 16 + unit Source Serif Pro Italic 16, gap 2
  - Code: `apps/rowtrack/components/Chip.tsx:17` → Eén Text met volledige label-string in typeStyles.kpiValue (SS Regular 16)

- [ ] **Duur-chip labelformaat: '1:30 u' vs '1 u 30 min'** · `LAAG` · text-mismatch
  - Recente duur-doelen boven 60 minuten worden in design als klok-notatie met unit 'u' getoond; code bouwt labels als '1 u 30 min'.
  - Figma: IdlePhase Goal=duration (35:1508) > Chips (35:1066) → '1:30 u', '1:00 u'
  - Code: `apps/rowtrack/lib/formatters.ts:78` → buildDurItems label: '1 u 30 min', '1 u'

- [ ] **Decimaalteken afstand: punt in design, komma in code** · `LAAG` · text-mismatch
  - Design gebruikt overal een punt als decimaalteken (en inconsistent 'KM'/'km' op de min/plus-knoppen); code gebruikt consequent een komma.
  - Figma: IdlePhase Goal=distance (35:1510) > NudgeRow/Wheel/Chips → '5.0', '4.5', '0.5 KM'/'0.5 km'
  - Code: `apps/rowtrack/lib/formatters.ts:100` → '5,0', '4,5 km', NUDGE_LABEL '0,5 km'

- [ ] **Split nudge-label '5 s' vs '5s'** · `LAAG` · text-mismatch
  - Het staplabel op de split-nudgeknoppen mist in code de spatie tussen waarde en eenheid.
  - Figma: IdlePhase Goal=split (35:1512) > NudgeRow staplabels → '5 s' (met spatie)
  - Code: `apps/rowtrack/lib/workout-goals.ts:87` → NUDGE_LABEL.split = '5s' (zonder spatie)

- [ ] **Inactief segment-icoon: fg.tertiary in design, fg.secondary in code** · `LAAG` · style-mismatch
  - Inactieve doeltype-iconen zijn in code een tint lichter dan in design.
  - Figma: Icons/Targets (72:15000) in Segments/Goals inactieve segmenten → Icoon-strokes #8A8E97 (fg.tertiary)
  - Code: `apps/rowtrack/components/GoalSegments.tsx:83` → Ionicons color fg.secondary #B5B9C2

- [ ] **Statusbalk corner radius 8 vs 12** · `LAAG` · style-mismatch
  - BLE- en HR-statusbalken hebben in code radius 12 waar het design 8 toont. Geldt ook voor HrStatusBar.tsx:61.
  - Figma: IdlePhase (35:1516) > BLE Status Bar (I36:3114;32:359) en HR Status Bar → cornerRadius 8
  - Code: `apps/rowtrack/components/BleStatusBar.tsx:72` → componentRadius.cardSm = 12

- [ ] **Statusdot 10px in design, 8px in code** · `LAAG` · layout-mismatch
  - De verbindingsindicator-dot is in code 2px kleiner dan in design.
  - Figma: BLE Status Bar > Ellipse (I36:3114;32:359;20:280) → Ellipse 10x10, #5C606B
  - Code: `apps/rowtrack/components/BleStatusBar.tsx:92` → dot 8x8 (kleur fg.quaternary klopt)

- [ ] **Actietekst 'Verbreken' vs 'Verbreek'** · `LAAG` · text-mismatch
  - De disconnect-actie heet in design 'Verbreken' en in code 'Verbreek' (idem HrStatusBar.tsx:48).
  - Figma: Device connect State=Disconnect (72:15742) → 'Verbreken'
  - Code: `apps/rowtrack/components/BleStatusBar.tsx:53` → 'Verbreek'

- [ ] **Code-states 'Opnieuw' en bezig-spinner ontbreken in Device connect set** · `LAAG` · state-mismatch
  - De error-retry-knop en de laad-state uit code hebben geen design-equivalent in de Device connect component set.
  - Figma: Device connect (72:15743) — alleen State=Connect en State=Disconnect → 2 varianten: Connect ('Verbind'), Disconnect ('Verbreken')
  - Code: `apps/rowtrack/components/BleStatusBar.tsx:57` → 4 states: Verbind, Verbreek, Opnieuw (error) en ActivityIndicator tijdens verbinden/zoeken

- [ ] **Gap tussen segmented control en NudgeRow: 4 vs 8** · `LAAG` · layout-mismatch
  - Design koppelt de nudge-balk dichter (4px) aan de segmented control; code gebruikt overal 8px.
  - Figma: IdlePhase Goal=split (35:1512) > Frame 102 (80:2077, gap 4) → Segments/Goals en NudgeRow gegroepeerd met gap 4
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:551` → doelSection gap 8 tussen doelHeader en pickerArea

- [ ] **Geen-variant: afstand tot 'Vrije training...'-tekst 16 vs 8** · `LAAG` · layout-mismatch
  - Bij doeltype 'Geen' staat de tekst 'Vrije training zonder vooraf bepaald doel.' in design 16px onder de segmented control, in code 8px.
  - Figma: IdlePhase Goal=none (35:1506) > Doel (35:938, gap 16) → Gap 16 tussen segmented control en placeholdertekst
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:551` → doelSection gap 8

- [ ] **CTA-knop hoogte 44 in design, 48 in code** · `LAAG` · layout-mismatch
  - De 'Start training'-knop is in code 4px hoger dan het design.
  - Figma: Button Primary (64:14115): pad 14/24/12/24, hug 44 hoog → Hoogte 44
  - Code: `apps/rowtrack/components/Button.tsx:124` → sizeLg height = space['48'] = 48

- [ ] **Primary button mist border en shadow-compositie van design** · `LAAG` · style-mismatch
  - Het design combineert een accentrand met gelaagde schaduwen; code heeft alleen een enkele drop-shadow. Radius (pill) en gradient (F66363→F05454) kloppen wel.
  - Figma: Button Primary (64:14115) → 1px stroke #F05454, 2 drop-shadows (r2, r20) + 2 inner-shadows (r4, r0); gradient fill
  - Code: `apps/rowtrack/components/Button.tsx:131` → Geen border; één shadow (offset 0/4, radius 12, opacity 0.4); gradient klopt

- [ ] **Design gebruikt off-token kleuren (Tailwind slate) in NudgeRow en Wheel** · `LAAG` · token-mismatch
  - Design-side afwijking: de nudge/wheel-teksten gebruiken hardcoded slate-tinten en puur wit i.p.v. de fg-tokens; code volgt wél de tokens. Vooral #94A3B8 vs #B5B9C2 is een zichtbaar tintverschil.
  - Figma: NudgeRow (80:2079) en IdlePhase/Wheel (36:1956); ook 'Vrije training...'-tekst (35:952) → #F8FAFC (waardes), #94A3B8 (units/iconen/labels), #FFFFFF (Geen-tekst) — niet variable-gebonden
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:586` → fg.primary #F2F4FA en fg.secondary #B5B9C2 via tokens

- [ ] **Disabled-state van nudge-knoppen ontbreekt in design** · `LAAG` · state-mismatch
  - Code dimt de nudge-knoppen aan de randen van het waardebereik; het design bevat hiervoor geen variant.
  - Figma: NudgeRow (80:2079) — geen disabled-variant → Alleen enabled min/plus-knoppen
  - Code: `apps/rowtrack/components/workout/IdlePhase.tsx:146` → btnDisabled: opacity 0.4 wanneer de wheel-grens bereikt is

### Workout — Actieve fase, portrait (18)

- [ ] **Geen-doel pill mist DOEL-label en divider** · `MIDDEL` · state-mismatch
  - In het design behoudt de pill in de geen-doel-staat dezelfde structuur (label + divider + waarde); de code laat label en divider weg zodra er geen doel is.
  - Figma: Active/Portrait/None (5:3) > Pill (85:2278) → Pill toont 'DOEL' label (#B5B9C2) + verticale divider + 'Geen doel' (#F05454)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:505` → Bij goal == null wordt alleen de tekst 'Geen doel' gerenderd, zonder label en divider

- [ ] **Verticale spacing in top-sectie te krap** · `MIDDEL` · layout-mismatch
  - Het design gebruikt 28px tussen hero, progressbar en subtitel (en 16-20px in de None-variant) met de pill los bovenaan; de code zet overal 12px waardoor de top-sectie duidelijk compacter oogt dan het design.
  - Figma: Active/Portrait/Duration (42:5387) > Dynamic values (42:5589) → Gap 28 tussen hero, progressbar en subtitle (doelvarianten); gap 16-20 in None-variant; pill staat bovenaan, hero-blok gecentreerd in resterende ruimte
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:775` → topSection gap: space['12'] (12) tussen alle elementen, pill/hero/bar/subtitle als één gecentreerde groep

- [ ] **Hero-cijfer mist negatieve letterSpacing** · `MIDDEL` · style-mismatch
  - Het design (en de token typeStyles.heroNumeric) specificeert letterSpacing -4.32 op de hero-waarde; de code bouwt de stijl handmatig zonder letterSpacing, waardoor het cijfer merkbaar breder rendert op 96px.
  - Figma: Active/Portrait/Duration (42:5387) > 15:00 (42:5590) → 96px Source Serif Bold met letterSpacing -4.5% (-4.32px), conform token typeStyles.heroNumeric
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:801` → heroText: fontSize 96, lineHeight 91.2, geen letterSpacing gedefinieerd

- [ ] **KPI-waarde in SemiBold i.p.v. Regular** · `MIDDEL` · style-mismatch
  - Alle zes KPI-waarden in de portrait-grid gebruiken in het design Source Serif Regular (typeStyles.kpiValue); de code zet expliciet SemiBold, een zichtbaar zwaarder gewicht over de hele grid.
  - Figma: Active/Portrait/None (5:3) > KPI (38:5293) > Value → Source Serif Pro Regular 16px (token typeStyles.kpiValue)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:863` → fontFamily.sourceSerifSemiBold 16px

- [ ] **Stop-knop gerenderd als destructive i.p.v. Primary** · `MIDDEL` · style-mismatch
  - Alle vijf designvarianten tonen de Stop training-knop als gevulde Primary-knop met gradient en witte tekst; de code gebruikt de destructive-variant met semi-transparante achtergrond en rode tekst — een compleet andere verschijning van de belangrijkste CTA.
  - Figma: Active/Portrait/None (5:3) > Button (64:14127, Variant=Primary) → Primary-variant: linear gradient #F66363→#F05454, witte tekst, 1px rode stroke, drop/inner shadows, hoogte 44
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:565` → variant="destructive": achtergrond rgba(240,84,84,0.06), rode tekst, geen border, geen schaduw

- [ ] **Distance-hero toont unit ' m' die in design ontbreekt** · `MIDDEL` · text-mismatch
  - De hero-waarde bij een afstandsdoel is in het design een kaal getal; de code plakt er ' m' achter, wat op hero-formaat duidelijk zichtbaar extra breedte geeft.
  - Figma: Active/Portrait/Distance (42:5431) > 15.000 (85:2381) → '15.000' (alleen het getal, geen eenheid)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:396` → '15.000 m' (met ' m'-suffix op 96px)

- [ ] **Pijl-icoon ontbreekt in Stop-knop** · `LAAG` · missing-in-code
  - Het design toont een pijl rechts van het knoplabel; de code rendert de Button zonder icoon.
  - Figma: Active/Portrait/None (5:3) > Button (64:14127) > → (vector) → Tekst 'Stop training' + witte pijl-vector (→) met gap 10
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:563` → Alleen tekst 'Stop training', geen icon-prop meegegeven

- [ ] **Doel-pill waarde: eenheid niet in italic en niet als apart element** · `LAAG` · style-mismatch
  - In het design is de eenheid in de doel-pill een aparte italic tekst in kleine letters; de code rendert waarde en eenheid als één regular string.
  - Figma: Active/Portrait/Duration (42:5387) > Pill (85:2287) > Frame 105 → Waarde ('20') in Source Serif Regular + eenheid ('min', 'km', '/500m', 'W') in Source Serif Italic, lowercase, gap 2
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:792` → Eén string in typeStyles.kpiValue (Regular), eenheid in hoofdletters ('MIN', 'KM')

- [ ] **Doel-pill duration/distance waarde-formaat wijkt af** · `LAAG` · text-mismatch
  - Het design toont het doel compact zonder seconden en zonder decimaal ('20 min', '20 km'); de code formatteert als '20:00 MIN' en '20,0 KM'.
  - Figma: Active/Portrait/Duration (42:5387) > Pill (85:2287); Active/Portrait/Distance (42:5431) > Pill (85:2398) → '20 min' en '20 km'
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:339` → '20:00 MIN' en '20,0 KM'

- [ ] **Doel-pill achtergrond-opacity 10% vs 6%** · `LAAG` · token-mismatch
  - De pill-achtergrond staat in het design op 10% accent-opacity, wat met geen bestaand token overeenkomt (accent.subtle=6%, accent.muted=12%); de code gebruikt accent.subtle (6%). De stroke klopt wel (accent.muted, 12%).
  - Figma: Active/Portrait/Duration (42:5387) > Pill (85:2287) → Fill #F05454 @ 10% opacity
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:781` → accent.subtle = rgba(240, 84, 84, 0.06)

- [ ] **Doel-pill divider 14px hoog i.p.v. 16px** · `LAAG` · layout-mismatch
  - De verticale divider in de doel-pill is in het design 16px hoog, in de code 14px.
  - Figma: Active/Portrait/Duration (42:5387) > Pill (85:2287) > Rectangle → Divider 1x16
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:798` → doelPillDivider height: 14

- [ ] **Progressbar loopt over volle breedte i.p.v. met 20px inzet** · `LAAG` · layout-mismatch
  - In het design staat de progressbar (en het hero-blok) 20px ingesprongen t.o.v. de contentbreedte; de code rekt de bar over de volledige breedte uit (40px breder).
  - Figma: Active/Portrait/Duration (42:5387) > Dynamic values (42:5589) > ProgressBar (71:14329) → Bar 322px breed (Dynamic values heeft 20px horizontale padding binnen 362px content)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:808` → progressTrack alignSelf: 'stretch' → 362px volle contentbreedte

- [ ] **Progress-dot 10px i.p.v. 6px** · `LAAG` · layout-mismatch
  - De dot op het einde van de progress-fill is in het design 6px, in de code 10px.
  - Figma: ProgressBar component (71:14318) > Trackdot (71:14316) → Trackdot ellipse 6x6
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:818` → progressDot width/height 10, borderRadius 5

- [ ] **Progress-dot ook gerenderd bij Split- en Watts-variant** · `LAAG` · missing-in-design
  - Bij split- en watts-doelen is de balk in het design volledig gevuld zonder eind-dot; de code toont daar wel een dot aan de rechterrand.
  - Figma: Active/Portrait/Split (42:5463) > ProgressBar (85:2502); Active/Portrait/Watts (42:5495) > ProgressBar (85:2504) → Split/Watts-bar is een egaal gevulde balk (#4CAF50 / #FE9429) zonder Trackdot
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:524` → Code rendert altijd een dot binnen progressFill, ook bij split/watts (fill = 100%)

- [ ] **Subtitel zonder doel: ' geroeid'-suffix niet in design** · `LAAG` · text-mismatch
  - De subtitel onder de timer in de geen-doel-variant toont in het design enkel de afstand; de code voegt het woord 'geroeid' toe.
  - Figma: Active/Portrait/None (5:3) > Frame 35 > 1.234 m (42:5699) → '1.234 m'
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:367` → '1.234 m geroeid'

- [ ] **Distance-subtitel decimaalteken punt vs komma** · `LAAG` · text-mismatch
  - Het design gebruikt een punt in de afgelegde-afstand-subtitel, de code een komma. Waarschijnlijk is de code (Nederlandse notatie) bedoeld, maar het wijkt letterlijk af van het design.
  - Figma: Active/Portrait/Distance (42:5431) > Frame 37 > 5.0 km (85:2384) → '5.0 km' (punt als decimaalteken)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:401` → '5,0 km' (komma als decimaalteken)

- [ ] **Split-subtitel: 'sec' i.p.v. 'seconden'** · `LAAG` · text-mismatch
  - Het design schrijft 'seconden' voluit in de split-subtitel; de code kort af tot 'sec'.
  - Figma: Active/Portrait/Split (42:5463) > Je bent 5 seconden sneller (85:2448) → 'Je bent 5 seconden sneller'
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:424` → 'Je bent 5 sec sneller' / 'Je bent 5 sec trager'

- [ ] **KPI-label 'SPLIT/500M' vs 'SPLIT 500/M'** · `LAAG` · text-mismatch
  - Het label van de eerste KPI-rij verschilt: design toont 'SPLIT 500/M' (spatie voor 500, slash voor M), code toont 'SPLIT/500M'.
  - Figma: Active/Portrait/None (5:3) > KPI (38:5293) > LABEL → 'Split 500/M' (rendert via textCase UPPER als 'SPLIT 500/M')
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:471` → 'SPLIT/500M'

### Workout — Actieve fase, landscape (22)

- [ ] **Stop-knop is Primary in design maar destructive in code** · `MIDDEL` · style-mismatch
  - In alle 5 landscape-varianten toont het design de stop-knop als volle Primary-knop (gradient, witte tekst, pijl-icoon); de code rendert een subtiele destructive-knop met transparant-rode achtergrond en rode tekst zonder icoon.
  - Figma: Active/Landscape/None (5:4) > Button (64:14131), idem in alle 5 varianten → Primary variant: linear gradient #F66363→#F05454, witte tekst 18px Source Serif SemiBold, pijl-icoon (→), stroke #F05454, drop/inner shadows, radius 9999
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:616` → variant="destructive": achtergrond rgba(240,84,84,0.06), rode tekst #F05454, geen border, geen pijl-icoon

- [ ] **KPI-waarde 34px in code i.p.v. 16px uit design** · `MIDDEL` · style-mismatch
  - De KPI-waarde in de rechterkolom is in het design 16px (token kpiValue); de KPI-component in code gebruikt typeStyles.sectionValue (34px) — ruim dubbel zo groot, ook in compact-modus die landscape gebruikt.
  - Figma: Active/Landscape/None (5:4) > KPI Grid (42:5839) > KPI > Value (I42:5840;38:5278) → 16px Source Serif Pro Regular, letterspacing -2.5% (≈ -0.4), #F2F4FA
  - Code: `apps/rowtrack/components/KPI.tsx:66` → typeStyles.sectionValue: 34px SourceSerif4_400Regular, letterspacing -1.02

- [ ] **Duration-variant: KPI-lijst toont AFSTAND i.p.v. TIJD** · `MIDDEL` · state-mismatch
  - Bij een duration-doel toont het design een TIJD-KPI als vijfde rij; in code valt goalType 'duration' in de default kpiOrder met AFSTAND, waardoor TIJD ontbreekt en AFSTAND extra is.
  - Figma: Active/Landscape/Duration (42:5712) > KPI Grid (42:6013) > KPI 'TIJD' (42:6038) → KPI-volgorde: SPLIT 500/M, WATT, SPM, BPM, TIJD, KCAL
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:276` → duration valt in default-tak: SPLIT, WATT, SPM, BPM, AFSTAND, KCAL

- [ ] **Split/Watts landscape: vergelijkingszin ontbreekt onder de balk** · `MIDDEL` · state-mismatch
  - De landscape-subtitel is in code generiek (verstreken tijd + percentage) voor alle doeltypes; het design toont bij split/watts een vergelijkingszin. Portrait heeft die zinnen wel, maar met 'sec' i.p.v. 'seconden' uit het design.
  - Figma: Active/Landscape/Split (42:5770) > 'Je bent 5 seconden sneller' (42:5980); Active/Landscape/Watts (42:5799) > 'Je levert 10 W minder dan je doel' (85:2519) → Subtitel is een vergelijkingszin: 'Je bent 5 seconden sneller' / 'Je levert 10 W minder dan je doel' (28px, zonder divider of percentage)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:246` → renderTopSection toont voor elk doeltype 'timer | X% voltooid' (subtitleRow met divider)

- [ ] **Distance landscape: subtitel toont tijd i.p.v. afgelegde afstand** · `MIDDEL` · text-mismatch
  - Bij een distance-doel toont het design links van de divider de afgelegde afstand; de landscape-code toont daar de verstreken tijd. De portrait-implementatie toont wél afstand (met komma: '5,0 km' vs punt '5.0 km' in design).
  - Figma: Active/Landscape/Distance (42:5741) > Frame 37 (42:5937) > '5.0 km' (42:5938) → '5.0 km | 25% voltooid' (afgelegde afstand links)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:247` → '{formattedTimer} | X% voltooid' (verstreken tijd links)

- [ ] **Split/Watts progressbalk: volle statusbalk vs percentage-vulling met dot** · `MIDDEL` · state-mismatch
  - Bij split/watts is de balk in het design een volle statusindicator zonder dot; de landscape-code vult de balk op basis van goalProgress.percentage en rendert altijd een dot, waardoor bij lage watts een deels beige track zichtbaar is. Portrait zet progressFillPct wél op 1.
  - Figma: Active/Landscape/Split (42:5770) > ProgressBar (85:2246); Active/Landscape/Watts (42:5799) > ProgressBar (85:2517) → Balk 100% gevuld in statuskleur (#4CAF50 / #FE9429), radius 6, geen dot
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:236` → Fill-breedte = goalProgress.percentage, met progressDot aan het uiteinde

- [ ] **Doel-pill waarde: formaat en italic unit wijken af** · `MIDDEL` · text-mismatch
  - Het design toont de doelwaarde compact met de eenheid in italic en lowercase ('20 min', '20 km'); de code bouwt één label in uppercase zonder italic en met ander getalformaat ('20:00 MIN', '20,0 KM').
  - Figma: Active/Landscape/Duration (42:5712) > Pill (85:2332) > Frame 105; idem Distance (85:2323) → Waarde + unit als aparte tekstnodes, unit in Source Serif Italic lowercase: '20 min', '20 km', '02:15 /500m', '180 W' (gap 2)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:180` → Eén string in regular kpiValue-stijl: '20:00 MIN', '20,0 KM', '2:15/500m', '180 W'

- [ ] **Afstandswaarde schakelt naar km i.p.v. meters met puntnotatie** · `MIDDEL` · text-mismatch
  - Het design toont afstanden ≥ 1 km als meters met duizendtal-punt ('1.234 m'); de code schakelt via formatDistanceDynamic naar kilometers met twee decimalen ('1.23 km'), zowel in de AFSTAND-KPI als in de subtitel zonder doel.
  - Figma: Active/Landscape/None (5:4) > KPI 'Afstand' (42:5844) en subtitel '1.234 m' (80:2221) → '1.234 m' — meters met puntduizendtal-notatie
  - Code: `apps/rowtrack/lib/formatters.ts:31` → formatDistanceDynamic: vanaf 1000 m → '(m/1000).toFixed(2) km' → '1.23 km'

- [ ] **KPI-label kleur: fg.secondary in design, fg.tertiary in code** · `LAAG` · token-mismatch
  - De KPI-labels in de rechterkolom zijn in het design fg.secondary; de KPI-component in code kleurt ze fg.tertiary (een stap donkerder).
  - Figma: Active/Landscape/None (5:4) > KPI Grid > KPI > LABEL (I42:5840;43:7843;43:7485) → #B5B9C2 (fg.secondary)
  - Code: `apps/rowtrack/components/KPI.tsx:63` → fg.tertiary (#8A8E97)

- [ ] **Doel-pill achtergrond: 10% i.p.v. 6% accentopacity** · `LAAG` · token-mismatch
  - De pill-achtergrond is in het design 10% accentrood; de code gebruikt accent.subtle (6%). De border (accent.muted, 12%) komt wel overeen.
  - Figma: Active/Landscape/Duration (42:5712) > Pill (85:2332) → fill #F05454 @ 0.10 (border @ 0.12 klopt wel)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:781` → backgroundColor accent.subtle = rgba(240,84,84,0.06)

- [ ] **'Geen doel'-pill mist DOEL-label en divider** · `LAAG` · structure-mismatch
  - In de None-variant toont het design de pill met DOEL-prefix en divider vóór 'Geen doel'; de code rendert bij ontbrekend doel enkel de waarde-tekst.
  - Figma: Active/Landscape/None (5:4) > Pill (85:2341) → 'DOEL | Geen doel' — label, divider en waarde
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:219` → Alleen 'Geen doel' zonder label en divider

- [ ] **Hero-tekst kleur: fg.primary in design, wit in code** · `LAAG` · token-mismatch
  - Drie van de vijf design-varianten gebruiken fg.primary voor de hero-tekst, twee gebruiken puur wit (design is zelf inconsistent); de code gebruikt overal fg.onAccent (#FFFFFF).
  - Figma: Active/Landscape/Duration (42:5712) > '15:00' (42:5897); ook Distance (42:5934) en Split (42:5976) → #F2F4FA (fg.primary) in Duration/Distance/Split; #FFFFFF in None/Watts
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:738` → fg.onAccent (#FFFFFF) in alle gevallen

- [ ] **Hero-tekst mist letterspacing -4.32** · `LAAG` · style-mismatch
  - De 96px hero-tekst heeft in het design letterspacing -4.32 (zoals typeStyles.heroNumeric); de code zet fontFamily/size/lineHeight los zonder letterSpacing, waardoor de tekst breder oogt.
  - Figma: Active/Landscape/None (5:4) > '03:28' (42:5836), ls -4.5% → 96px Source Serif Bold met letterspacing -4.5% (= -4.32, token heroNumeric)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:734` → activeStyles.timerText: geen letterSpacing gezet

- [ ] **Distance hero toont ' m'-suffix die design weglaat** · `LAAG` · text-mismatch
  - De hero bij een distance-doel toont in het design alleen het getal; de code plakt er ' m' achter.
  - Figma: Active/Landscape/Distance (42:5741) > '15.000' (42:5934) → '15.000' (zonder eenheid)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:190` → '15.000 m' (met eenheid)

- [ ] **Split-waardes zonder leading zero** · `LAAG` · text-mismatch
  - Het design toont split-tijden met leading zero op de minuten; formatSplit padt alleen de seconden, waardoor hero, pill en KPI '2:10' i.p.v. '02:10' tonen.
  - Figma: Active/Landscape/Split (42:5770) > '02:10' (42:5976); KPI-waarde '02:05' → '02:10', '02:05', '02:15' — minuten met leading zero
  - Code: `apps/rowtrack/lib/formatters.ts:38` → formatSplit: `${m}:${s.padStart(2,'0')}` → '2:10'

- [ ] **Trackdot 10px in code, 6px in design** · `LAAG` · layout-mismatch
  - De dot aan het einde van de progressbalk is in het design 6px; de code rendert 10px.
  - Figma: Active/Landscape/Duration (42:5712) > ProgressBar (71:14345) > Trackdot (I71:14345;71:14316) → ellipse 6×6
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:755` → progressDot 10×10 (radius 5)

- [ ] **Pill-divider 14px hoog i.p.v. 16px** · `LAAG` · layout-mismatch
  - De verticale divider in de doel-pill is in het design 16px hoog, in code 14px.
  - Figma: Active/Landscape/Duration (42:5712) > Pill (85:2332) > Rectangle (1×16) → 1×16
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:798` → width 1, height 14

- [ ] **Pill bovenaan kolom in design, gecentreerd in code** · `LAAG` · layout-mismatch
  - Het design zet de doel-pill bovenaan de linkerkolom en centreert alleen de hero-groep in de resterende ruimte; de code centreert alles samen, waardoor de pill circa 55px lager staat.
  - Figma: Active/Landscape/Duration (42:5712) > Top Section (42:5876): pill top-aligned, 'Dynamic values' gecentreerd in restruimte → Pill verankerd bovenaan de linkerkolom; hero-groep apart verticaal gecentreerd
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:882` → leftTop centreert pill + hero + balk + subtitel als één blok met gap 16

- [ ] **Ruimte tussen balk en subtitelrij: 16px i.p.v. 24px** · `LAAG` · layout-mismatch
  - Onder de progressbalk zit in het design 24px ruimte tot de subtitelrij (gap 16 plus 8px padding); de code hanteert alleen de 16px kolom-gap.
  - Figma: Active/Landscape/Duration (42:5712) > Frame 37 (42:5900): gap 16 + paddingTop 8 → 16 gap + 8 padding-top = 24px effectief
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:887` → gap 16 in leftTop

- [ ] **Split/Watts progressbalk smaller dan volle breedte in design** · `LAAG` · layout-mismatch
  - Bij split/watts is de statusbalk in het design 20px ingesprongen aan beide zijden; de code rekt de balk in alle varianten tot de volle kolombreedte (design is hier zelf inconsistent tussen varianten).
  - Figma: Active/Landscape/Split (42:5770) > ProgressBar (85:2246, 357px binnen 397px kolom); Watts idem (85:2517) → 357px breed (20px inset links/rechts); bij Duration/Distance wel volle 397px
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:741` → alignSelf: 'stretch' → altijd volle kolombreedte

- [ ] **Watts-variant 'Dynamic values' gebruikt gap 28 i.p.v. 16** · `LAAG` · layout-mismatch
  - Alleen de Watts-variant hanteert in het design gap 28 tussen hero, balk en subtitel; de drie andere varianten en de code gebruiken 16 — vermoedelijk een design-inconsistentie, maar het staat zo in het bestand.
  - Figma: Active/Landscape/Watts (42:5799) > Dynamic values (85:2515) → VERTICAL gap 28 tussen hero, balk en subtitel
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:887` → gap 16 (leftTop)

- [ ] **Watts-variant: tweede KPI-label niet overschreven in design** · `LAAG` · missing-in-design
  - In de Watts-variant is het label van de tweede KPI in Figma niet overschreven (placeholder 'LABEL'); de code toont hier correct TIJD — design vereist opschoning, code is leidend juist.
  - Figma: Active/Landscape/Watts (42:5799) > KPI Grid (42:6073) > KPI (42:6075) → Label letterlijk 'LABEL' met waarde '15:00'
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:273` → kpiOrder watts: tweede item is 'TIJD' met timerwaarde

### Workout — Samenvatting (14)

- [ ] **KPI-overzichtsblok mist raised achtergrond en full-bleed opmaak** · `MIDDEL` · style-mismatch
  - In het design vormen de vier KPI's (AFSTAND/DUUR/ENERGIE) een edge-to-edge band met raised achtergrond en onderrand; in de code is het een transparant grid binnen de kaartpadding zonder achtergrondvlak.
  - Figma: Active/Summary (43:8278) > KPI Row (90:3656) → Full-bleed blok (402 breed, buiten de 20px sectiepadding) met fill #21242C (bg.raised) en een 1px bottom-border #2C2F37 (border.default)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:659` → kpiGrid heeft geen achtergrondkleur en staat binnen de 20px schermpadding; alleen een losse divider eronder (summaryStyles.divider)

- [ ] **Datum-label gebruikt verkeerde typografie-stijl** · `MIDDEL` · style-mismatch
  - Het design toont de datum als uppercase sans-serif label (typeStyles.labelGoalPrefix-equivalent); de code rendert een serif-italic tekst in mixed case. Kleur klopt (fg.secondary), maar font-familie, grootte, letterspacing en case wijken af. Ook: design toont uur zonder voorloopnul (8:45), code padt naar 08:45, en design heeft gap 0 tussen titel en label waar code gap 4 gebruikt.
  - Figma: Active/Summary (43:8278) > Frame 60 > LABEL (99:4225) → LABEL-stijl: Albert Sans SemiBold 11px, letterspacing 20%, uppercase ("VANDAAG - 8:45"), kleur #B5B9C2
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:914` → dateText: SourceSerif4 Italic 15px, geen uppercase ("Vandaag - 08:45"), kleur fg.secondary

- [ ] **KPI-unit is niet italic en heeft verkeerde kleur** · `MIDDEL` · style-mismatch
  - In het design staat de eenheid naast de KPI-waarde in italic en in fg.tertiary; de code gebruikt de regular font-stijl en fg.secondary — beide zichtbaar afwijkend.
  - Figma: KPI_single instance in Active/Summary (43:8278) > KPI Row, unit-tekst (I90:3657;89:3441) → Unit ("km"/"kcal"): Source Serif Pro Italic 16px, kleur #8A8E97 (fg.tertiary)
  - Code: `apps/rowtrack/components/KPI_single.tsx:36` → unit: typeStyles.kpiUnit = SourceSerif4_400Regular (niet italic) 16px, kleur fg.secondary (#B5B9C2)

- [ ] **Divider tussen KPI-rijen gebruikt border.default i.p.v. border.strong** · `LAAG` · token-mismatch
  - De scheidingslijn tussen de twee KPI-rijen is in het design een tint sterker (border.strong) dan de border.default die de code gebruikt.
  - Figma: Active/Summary (43:8278) > KPI Row > Frame 109 (91:3848) bottom-stroke → 1px bottom-border #3A3E48 (border.strong)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:941` → kpiGridDivider backgroundColor: border.default (#2C2F37)

- [ ] **Verticale spacing en celspacing in KPI-grid wijken af** · `LAAG` · layout-mismatch
  - De ruimte rond de rij-divider is 12px in code vs 20px in design, en de horizontale afstand tussen de twee KPI-cellen is ~8px in code vs 20px in design.
  - Figma: Active/Summary (43:8278) > KPI Row > Frame 109/110 (91:3848, 91:3855) → Rijen hebben paddingTop/Bottom 20 (dus 20px boven en onder de divider) en gap 20 tussen de twee cellen
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:942` → kpiGridDivider marginVertical: 12; cellen hebben alleen paddingHorizontal 4 (effectief 8px tussenruimte)

- [ ] **DUUR-cel toont unit die niet in het design staat** · `LAAG` · missing-in-design
  - Het design toont bij DUUR geen eenheid; de code voegt 'min' of 'uur' toe achter de tijdswaarde.
  - Figma: Active/Summary (43:8278) > KPI Row > KPI_single DUUR (90:3658) → Alleen de waarde "1:32:14" met label DUUR, geen unit-tekst
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:669` → unit={seconds >= 3600 ? 'uur' : 'min'} — code rendert altijd een unit naast de duurwaarde

- [ ] **PR-banner corner radius is 16 i.p.v. 8** · `LAAG` · style-mismatch
  - De PR-banner heeft in het design radius 8 (zoals componentRadius.highlightRow); de code gebruikt radii.md = 16.
  - Figma: Active/Summary (43:8278) > pr-banner (43:8282) → cornerRadius 8
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:923` → borderRadius: radii.md (16)

- [ ] **PR-banner tekst lineHeight 22 i.p.v. 16** · `LAAG` · style-mismatch
  - Door de lineHeight van 22 wordt de banner in code 6px hoger dan de 56px uit het design.
  - Figma: Active/Summary (43:8278) > pr-banner > tekst (43:8285) → 16px Source Serif Italic met lineHeight 100% (16) — bannerhoogte 56
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:930` → lineHeight: 22 — bannerhoogte wordt 62

- [ ] **Statstabel mist 1px buitenborder** · `LAAG` · style-mismatch
  - In het design heeft de tabelcontainer een subtiele buitenborder in border.default; in de code ontbreekt die volledig.
  - Figma: Active/Summary (43:8278) > Frame 49 > KPI's (43:8439) → 1px stroke #2C2F37 (border.default) rond de GEM/PIEK-tabel
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:967` → statsTable heeft alleen backgroundColor bg.raised, geen borderWidth/borderColor

- [ ] **Statstabel corner radius 12 i.p.v. 8** · `LAAG` · style-mismatch
  - De GEM/PIEK-tabel heeft radius 8 in het design; de code gebruikt componentRadius.cardSm = 12.
  - Figma: Active/Summary (43:8278) > Frame 49 > KPI's (43:8439) → cornerRadius 8
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:969` → borderRadius: componentRadius.cardSm (12)

- [ ] **Rij-labels in statstabel gebruiken fg.tertiary i.p.v. fg.secondary** · `LAAG` · token-mismatch
  - De labels SPLIT /500M, WATT, SPM en BPM zijn in het design een stap lichter (fg.secondary) dan de fg.tertiary die de code gebruikt. De kolomkoppen GEM/PIEK gebruiken wel correct fg.tertiary.
  - Figma: Active/Summary (43:8278) > KPI's > rij-label (I91:3687;43:8186;43:7485) → Labelkleur #B5B9C2 (fg.secondary)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:981` → statsRowLabel color: fg.tertiary (#8A8E97)

- [ ] **GEM/PIEK-kolommen flex i.p.v. vaste breedte met gap** · `LAAG` · layout-mismatch
  - De waardekolommen zijn in code flexibel verdeeld zonder gap en zonder rechterpadding, waardoor de kolomposities ~16px verschuiven t.o.v. de vaste 67px-kolommen uit het design (intern lijnen header en rijen in code wel uit).
  - Figma: Active/Summary (43:8278) > Frame 45 (43:8358) en KPI_table rijen (43:8421) → Kolommen 67px vast breed met gap 16 en padding links+rechts 16 (GEM start op x≈197)
  - Code: `apps/rowtrack/components/workout/ActivePhase.tsx:963` → statsColLabel/statsRowValue flex: 1, geen gap, alleen paddingLeft 16 (GEM start op x≈181, kolommen ~90px)

- [ ] **Knoppen zijn 48px hoog i.p.v. 44px** · `LAAG` · layout-mismatch
  - De Annuleren- en Opslaan-knoppen in de summary gebruiken size lg (48px hoog); het design toont 44px hoge knoppen. Vorm (pill), kleuren, border en tekststijlen kloppen wel.
  - Figma: Active/Summary (43:8278) > Frame 41 > Button Primary (64:14167) en Secondary (71:14507) → Beide knoppen (Annuleren, Opslaan) hoogte 44
  - Code: `apps/rowtrack/components/Button.tsx:124` → size="lg" → sizeLg height: space['48'] (48)

- [ ] **KPI_single gap 4 tussen waarde en label i.p.v. 0** · `LAAG` · layout-mismatch
  - In het design sluiten waarde-rij en label direct op elkaar aan; de code voegt 4px gap toe, waardoor elke KPI-cel 4px hoger wordt.
  - Figma: KPI_single component-instances in Active/Summary (43:8278) > KPI Row (90:3657 e.a.) → Verticale auto-layout met gap 0 (waarde 34 + label 14 = 48 hoog)
  - Code: `apps/rowtrack/components/KPI_single.tsx:25` → container gap: space['4'] (4)

### History — lijst (14)

- [ ] **Scheidingslijn onder workout-rijen ontbreekt** · `MIDDEL` · missing-in-code
  - In het design heeft elke workout-rij een onderrand van 1px in border.default (#2C2F37) als scheidingslijn, behalve de laatste rij. In de code heeft WorkoutCard geen enkele border; rijen worden alleen gescheiden door de gap van 8px.
  - Figma: Workout (56:13791), instanties op History (5:6) > Frame 34 (38:4769) → borderBottom 1px #2C2F37 (border.default) op elke rij, laatste rij zonder border
  - Code: `components/WorkoutCard.tsx:90` → geen border op styles.row

- [ ] **Eenheden in workout-rij niet cursief** · `MIDDEL` · style-mismatch
  - De eenheid-teksten (uur, kcal, m) zijn in het design cursief (Italic). De code gebruikt typeStyles.kpiUnit met de regular font-variant voor zowel styles.unit (regel 126) als styles.distUnit (regel 144).
  - Figma: Workout (56:13791) > teksten "uur" (99:4242), "kcal" (56:13786), "m" (66:14243) → Source Serif Pro Italic 16
  - Code: `components/WorkoutCard.tsx:126` → typeStyles.kpiUnit = SourceSerif4_400Regular 16 (niet cursief)

- [ ] **KPI-eenheid niet cursief** · `MIDDEL` · style-mismatch
  - De eenheden bij de KPI's (km, /500m) zijn in het design cursief. KpiSingle gebruikt typeStyles.kpiUnit die de regular variant is.
  - Figma: History (5:6) > KPI Row (91:4049) > KPI_single (91:4084) > unit "km" (I91:4084;89:3441) → Source Serif Pro Italic 16
  - Code: `components/KPI_single.tsx:37` → typeStyles.kpiUnit = SourceSerif4_400Regular 16 (niet cursief)

- [ ] **KPI-eenheid heeft verkeerde kleur** · `LAAG` · token-mismatch
  - De KPI-eenheid is in het design fg.tertiary (#8A8E97), maar de code gebruikt fg.secondary (#B5B9C2).
  - Figma: History (5:6) > KPI Row (91:4049) > KPI_single (91:4084) > unit (I91:4084;89:3441) → #8A8E97 (fg.tertiary)
  - Code: `components/KPI_single.tsx:38` → fg.secondary = #B5B9C2

- [ ] **Corner radius segment-container 8 i.p.v. 4** · `LAAG` · token-mismatch
  - De buitenste container van de segment-filter heeft in het design radius 4; de code gebruikt radii.sm (8). Achtergrond, border en padding kloppen wel.
  - Figma: Segments/Historiek (71:14376) > Container (113:2215) → cornerRadius 4 (radii.xs)
  - Code: `app/(tabs)/history/index.tsx:202` → borderRadius: radii.sm = 8

- [ ] **Onderrand tussen workout-rijen: dot-kleur wijkt af** · `LAAG` · token-mismatch
  - Het scheidingspuntje tussen duur en calorieën is in het design fg.tertiary (#8A8E97); de Dot-component valt zonder color-prop terug op fg.quaternary (#5C606B).
  - Figma: Workout (56:13791) > Frame 101 (64:14183) > dot (67:14302) → #8A8E97 (fg.tertiary)
  - Code: `components/Dot.tsx:19` → fg.quaternary = #5C606B (default van Dot, WorkoutCard geeft geen color mee)

- [ ] **Horizontale padding segment-items 12 i.p.v. 20** · `LAAG` · layout-mismatch
  - De segment-items hebben in het design 20px horizontale padding; TabItem gebruikt 12px. Visueel effect is beperkt doordat de items flex:1 zijn met gecentreerd label, maar de waarde wijkt 8px af.
  - Figma: Segments/Historiek (71:14376) > SegmentItem instanties (92:2159 e.a.) → padding horizontaal 20 (active en default)
  - Code: `components/TabItem.tsx:30` → paddingHorizontal: space['12'] = 12

- [ ] **KPI-kolommen: cell-padding i.p.v. kolom-gap** · `LAAG` · layout-mismatch
  - Het design zet de twee KPI's per rij met een gap van 20px; de code gebruikt flex:1 cellen met 4px horizontale padding. Daardoor schuift de content 4-6px t.o.v. het design.
  - Figma: History (5:6) > KPI Row (91:4049) > Frame 109 (91:4050) → gap 20 tussen de twee KPI-kolommen, geen cell-padding (content start op 20px van schermrand, tweede kolom op x=191)
  - Code: `app/(tabs)/history/index.tsx:226` → geen gap, kpiCell paddingHorizontal 4 + flex:1 (content start op 24px, tweede kolom op ~185px)
  - Correctie uit verificatie: Het design zet de twee KPI's per rij met een gap van 20px (Frame 109 itemSpacing 20, geen cell-padding; KPI Row zelf padding 20). De code gebruikt flex:1 cellen met 4px horizontale padding en geen gap (styles.kpiGridRow/kpiCell). Daardoor start de content op 24px i.p.v. 20px van de schermrand en verschuift de tweede kolom ~6px t.o.v. het design.

- [ ] **Gap tussen KPI-waarde en label 4 i.p.v. 0** · `LAAG` · layout-mismatch
  - In het design sluit het label direct aan onder de KPI-waarde (gap 0); de code voegt 4px gap toe, waardoor de KPI-blokken iets hoger worden.
  - Figma: History (5:6) > KPI Row > KPI_single (99:4410) → verticale gap 0 tussen waarde-rij en label
  - Code: `components/KPI_single.tsx:25` → gap: space['4'] = 4

- [ ] **Eenheid 'uur'/'min' bij TOTALE DUUR ontbreekt in design** · `LAAG` · missing-in-design
  - De duur-KPI in het design toont geen eenheid naast de waarde; de code rendert altijd 'uur' of 'min' als unit. De andere drie KPI's komen wel overeen (km-unit, /500m-unit, geen unit bij aantal).
  - Figma: History (5:6) > KPI Row > KPI_single (99:4410) "3:25:14" → alleen waarde "3:25:14", geen unit-tekst
  - Code: `app/(tabs)/history/index.tsx:129` → unit={totalDurSec >= 3600 ? 'uur' : 'min'} — altijd een unit naast de waarde
  - Correctie uit verificatie: De duur-KPI in het design toont geen eenheid naast de waarde '3:25:14' — de unit-node bestaat wel in de instantie (met placeholder '/500m') maar staat op visible=false. De code rendert altijd 'uur' of 'min' als unit (app/(tabs)/history/index.tsx regel 129). De andere drie KPI's komen wel overeen.

- [ ] **Pijl in workout-rij als tekst-glyph i.p.v. vector-icoon** · `LAAG` · style-mismatch
  - Het design gebruikt een 9x8px vector-pijl; de code rendert het teken '→' als 16px tekst. Kleur (accent) klopt, maar vorm en afmeting van de pijl wijken af van het icoon in het design.
  - Figma: Workout (56:13791) > → vector (56:13789) → vector-icoon 9x8px, fill #F05454
  - Code: `components/WorkoutCard.tsx:83` → Text "→" met typeStyles.kpiValue (16px Source Serif), kleur accent.default

- [ ] **Loading- en empty-state bestaan alleen in code** · `LAAG` · missing-in-design
  - De code implementeert een loading-state en een empty-state voor de workoutlijst, maar het Figma-bestand bevat hier geen ontwerp voor; de styling ervan (o.a. Inter body.md in EmptyState) is dus niet tegen design te verifiëren.
  - Figma: History (5:6) — alleen gevulde lijst-variant aanwezig → geen loading- of empty-variant van het History-scherm
  - Code: `app/(tabs)/history/index.tsx:157` → ActivityIndicator (loading) en EmptyState met icoon time-outline en tekst "Geen workouts in deze periode."

- [ ] **Segment.tsx active-stijl matcht geen Figma-variant** · `LAAG` · state-mismatch
  - Het History-scherm gebruikt TabItem, dat de Figma active-variant correct volgt. De aparte Segment-component heeft echter een afwijkende active-stijl (volle accent-fill, witte tekst, radius 8) die met geen enkele variant in Figma overeenkomt — vermoedelijk legacy.
  - Figma: Segments/Historiek (71:14376) > SegmentItem State=Active (92:2159 op scherm 5:6) → active = fill #F05454 @20%, border 1px #F05454, radius 4, label #F05454 SemiBold
  - Code: `components/Segment.tsx:32` → active = volle accent.default fill, radius 8, geen border, label fg.primary

- [ ] **Font-familie Source Serif Pro vs Source Serif 4** · `LAAG` · token-mismatch
  - Het design gebruikt overal de familie Source Serif Pro, de code laadt Source Serif 4. Source Serif 4 is de hernoemde opvolger met vrijwel identieke metrics, dus dit is vermoedelijk een bewuste mapping, maar formeel wijkt de font-familie af.
  - Figma: History (5:6) — alle serif-teksten (titel, KPI's, workout-rijen, segmenten) → Source Serif Pro (Regular/SemiBold/Italic)
  - Code: `constants/typography.ts:4` → SourceSerif4_400Regular e.a. (Source Serif 4)

### History — detail (Overview / Splits / BPM) (20)

- [ ] **Splits-tabel heeft verkeerde achtergrondkleur** · `MIDDEL` · style-mismatch
  - De rijen van de splits-tabel hebben in het design fill #21242C (bg.raised), gelijk aan de GEM/PIEK-tabel op de Overzicht-tab. De code gebruikt bg.elevated (#1A1D24) voor splitsTable, terwijl statsTable wel correct bg.raised gebruikt — inconsistent binnen hetzelfde scherm.
  - Figma: History/Detail/Splits (38:5009) > Frame 66 (43:8604) > Split rijen (99:4491) → #21242C (bg.raised)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:428` → bg.elevated (#1A1D24)

- [ ] **Verwijder-knop wordt niet onderaan gepind bij weinig content** · `MIDDEL` · layout-mismatch
  - In alle drie de designs staat 'Training verwijderen' onderaan gepind. In code heeft flex:1 op een kind van een ScrollView-contentContainer zonder flexGrow:1 geen effect, dus op tabs met weinig content (BPM, korte splits) verschijnt de knop direct onder de content in plaats van onderaan.
  - Figma: History/Detail/BPM (38:5115) > Frame 68 (44:8681, MAX-alignment) → Knop onderaan het scherm uitgelijnd (primaryAxisAlignItems MAX), boven de tab bar
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:434` → buttonSection heeft flex:1 + justifyContent flex-end, maar contentContainerStyle (styles.content) mist flexGrow:1

- [ ] **Pijl-icoon ontbreekt in verwijder-knop** · `LAAG` · missing-in-code
  - Het design toont een pijl rechts van 'Training verwijderen' in de secondary/outline knop. De code geeft geen icoon mee, en de Button-component ondersteunt alleen een leading icoon (icoon vóór de tekst), geen trailing.
  - Figma: History/Detail/Overview (5:7) > Button (99:4433) > → (I99:4433;57:14006) → Trailing pijl-vector (9x8, #F05454) na de tekst, gap 10
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:262` → Geen icon prop doorgegeven; Button rendert een eventueel icoon bovendien vóór de tekst

- [ ] **Corner radius splits-tabel wijkt af** · `LAAG` · style-mismatch
  - De splits-tabelwrapper heeft in het design radius 12; de code gebruikt radii.sm (8). Het bestaande token componentRadius.cardSm (12) wordt niet gebruikt.
  - Figma: History/Detail/Splits (38:5009) > Frame 66 (43:8604) → cornerRadius 12 (componentRadius.cardSm)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:431` → radii.sm (8)

- [ ] **Afstand-label in splits-rij heeft verkeerde tekstkleur** · `LAAG` · style-mismatch
  - De rij-labels (500M, 1000M, ...) zijn in het design fg.secondary, zoals de rij-labels van de GEM/PIEK-tabel (die in code wel fg.secondary gebruiken). splitsDistLabel gebruikt fg.tertiary.
  - Figma: History/Detail/Splits (38:5009) > Split (99:4491) > LABEL (I99:4491;43:8186;43:7485) → #B5B9C2 (fg.secondary)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:460` → fg.tertiary (#8A8E97)

- [ ] **Tab-container corner radius wijkt af** · `LAAG` · style-mismatch
  - De omhullende container van de segmented control heeft in het design radius 4 (gelijk aan de actieve tab-pill); de code gebruikt radii.sm (8). Fill, border en padding kloppen wel.
  - Figma: Segments/WorkoutDetail (71:14458) > Container (113:2237) → cornerRadius 4 (radii.xs)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:346` → radii.sm (8)

- [ ] **Verticale spacing rond segments en secties wijkt af van 28px-ritme** · `LAAG` · layout-mismatch
  - Het design hanteert een 28px verticaal ritme rond de tabs en tussen secties; de code gebruikt 12/16/20 — verschillen van 8 tot 16px.
  - Figma: History/Detail/Overview (5:7) > Segments/WorkoutDetail (113:2259, pad 28/20/28/20) en Frame 42 (43:8620, padTop 28, gap 28) → 28px boven en onder de segmented control, 28px tussen KPI-stripe/tabel/knop
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:349` → 12px boven (header paddingBottom), 16px onder (tabBar marginBottom), 20px sectie-gap (content gap)

- [ ] **Gap tussen paginatitel en back-link** · `LAAG` · layout-mismatch
  - In het design sluiten datumtitel en '← OVERZICHT'-link direct op elkaar aan (headerblok 48px); de code voegt 8px gap toe.
  - Figma: History/Detail/Overview (5:7) > Header (12:21) > Frame 113 (96:4220, gap 0) → gap 0 (titel 34px + link-regel 14px = 48px hoog)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:303` → gap: space['8'] (8px)

- [ ] **Back-link pijl als tekstkarakter in plaats van vector-icoon** · `LAAG` · structure-mismatch
  - Het design gebruikt een apart pijl-icoon met vaste 8px gap; de code rendert de pijl als tekstkarakter binnen het labelGoalPrefix-lettertype, wat een andere pijlvorm en spacing geeft.
  - Figma: History/Detail/Overview (5:7) > Frame 112 (96:4219) > → (96:4215) → Los vector-icoon (9x8, #F05454) met 8px gap vóór het label 'OVERZICHT'
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:134` → Unicode '← ' opgenomen in de tekststring '← OVERZICHT'

- [ ] **Kolomafstand in KPI-grid wijkt af** · `LAAG` · layout-mismatch
  - Het design zet 20px (bovenste rij) en 12px (onderste rij) tussen de twee KPI-cellen; de code gebruikt 4px padding per cel, dus effectief 8px, en de celinhoud schuift 4px naar rechts ten opzichte van het design.
  - Figma: KPI Row (99:4321 / instance 99:4340) > Frame 109 (gap 20) en Frame 110 (gap 12) → gap 20 (rij 1) en 12 (rij 2) tussen de KPI-cellen
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:378` → geen gap; kpiCell paddingHorizontal 4 aan beide zijden (effectief 8px)

- [ ] **Interne gap in KpiSingle tussen waarde en label** · `LAAG` · layout-mismatch
  - De KPI_single component heeft in het design geen ruimte tussen waarde-regel en label; de code voegt 4px toe.
  - Figma: KPI_single (99:4396, VERTICAL gap:0) → gap 0 (waarde 34px + label direct eronder)
  - Code: `apps/rowtrack/components/KPI_single.tsx:25` → gap: space['4'] (4px)

- [ ] **Kolom-gap en rechterpadding ontbreken in tabelrijen** · `LAAG` · layout-mismatch
  - In zowel de GEM/PIEK-tabel als de splits-tabel starten de waardekolommen in code direct na de 165px labelkolom; in het design zit er 16px tussen en is er 16px rechterpadding, waardoor waardes in code tot ~16px meer naar links staan.
  - Figma: KPI_table rij (43:8421 / instances 99:4438, 99:4491): pad 16/16/16/16, gap 16 → 16px gap tussen labelkolom (165) en waardekolommen (67 breed), plus 16px rechterpadding
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:405` → statsRow/splitsDataRow: alleen paddingLeft 16; waardekolommen flex:1 zonder gap of rechterpadding

- [ ] **DUUR-KPI toont eenheid die het design niet toont** · `LAAG` · text-mismatch
  - Het design laat de unit-tekst leeg bij de DUUR-KPI; de code toont 'uur' of 'min' achter de waarde.
  - Figma: History/Detail/Overview (5:7) > KPI_single (99:4396) > unit (leeg) → Geen unit bij duur ('1:32:14' zonder toevoeging)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:159` → unit={duration_seconds >= 3600 ? 'uur' : 'min'}

- [ ] **Hartslag-KPI's tonen eenheid 'bpm' die het design niet toont** · `LAAG` · text-mismatch
  - In het BPM-design staan de waarden zonder eenheid; de code voegt 'bpm' toe als unit bij beide KPI's.
  - Figma: History/Detail/BPM (38:5115) > KPI_single (99:4574 / 99:4581) → Alleen waarde ('140' / '160'), geen unit
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:246` → unit 'bpm' achter de waarde
  - Correctie uit verificatie: In het BPM-design is de unit-textnode van beide KPI's verborgen (visible:false), zodat alleen de waarde ('140' / '160') zichtbaar is; de code voegt 'bpm' toe als unit bij beide KPI's.

- [ ] **Hartslag-KPI labels op één regel in plaats van twee** · `LAAG` · text-mismatch
  - Het design breekt de labels op twee regels (zoals GEMIDDELDE\nSPLIT op de Overzicht-tab, die in code wél twee regels heeft); de code zet de BPM-labels op één regel.
  - Figma: History/Detail/BPM (38:5115) > KPI_single labels (I99:4574;89:3442, 'BPM\ngemiddeld') → 'BPM\nGEMIDDELD' en 'BPM\nMAXIMAAL' (twee regels)
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:247` → 'BPM GEMIDDELD' en 'BPM MAXIMAAL' (één regel)

- [ ] **Verwijder-knop hoogte en icon-gap wijken af** · `LAAG` · style-mismatch
  - De secondary/outline knop is in het design 44px hoog met 10px gap; de code (size lg) is 48px hoog met 8px gap.
  - Figma: History/Detail/Overview (5:7) > Button (99:4433): h 44, gap 10, pad 14/24/12/24 → hoogte 44, gap 10
  - Code: `apps/rowtrack/components/Button.tsx:124` → sizeLg height space['48'] (48), gap space['8'] (8)

- [ ] **Verwijder-knop tekstgrootte 18 in plaats van 16** · `LAAG` · style-mismatch
  - De outline-variant gebruikt in het design 16px SemiBold; de Button-component past voor de outline-variant dezelfde 18px buttonPrimary-stijl toe. Het token typeStyles.buttonOutline (16px) bestaat maar wordt niet gebruikt.
  - Figma: History/Detail/Overview (5:7) > Button (99:4433) > 'Training verwijderen' (16px Source Serif Pro SemiBold) → fontSize 16 (typeStyles.buttonOutline)
  - Code: `apps/rowtrack/components/Button.tsx:145` → typeStyles.buttonPrimary (fontSize 18) voor alle niet-ghost varianten

- [ ] **Actieve tab heeft kleinere horizontale padding dan design** · `LAAG` · layout-mismatch
  - De tab-items hebben in het design 20px horizontale padding; TabItem gebruikt 12px. Door flex:1 en gecentreerde labels is dit alleen zichtbaar bij lange labels (eerdere afkap-marge), maar het wijkt af van de spec.
  - Figma: Segments/WorkoutDetail (71:14458) > actieve tab (pad 8/20/8/20) → paddingHorizontal 20
  - Code: `apps/rowtrack/components/TabItem.tsx:30` → paddingHorizontal: space['12'] (12)

- [ ] **Hartslag-tab wordt conditioneel verborgen; design toont altijd drie tabs** · `LAAG` · state-mismatch
  - Alle drie de tabs bestaan in de code en labels komen overeen, maar de code verbergt de Hartslag-tab bij workouts zonder hartslagdata. Het design bevat geen twee-tabs-variant, dus deze state is niet in Figma gedocumenteerd.
  - Figma: History/Detail/Overview (5:7) > Segments/WorkoutDetail (113:2259) met drie tabs → Altijd drie tabs: Overzicht / Splits / Hartslag
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:63` → 'Hartslag' alleen toegevoegd als avg_heart_rate of max_heart_rate aanwezig is

- [ ] **Loading-, empty- en not-found-states ontbreken in het design** · `LAAG` · missing-in-design
  - De code implementeert drie extra states (laden, lege splits, workout niet gevonden) waarvoor geen Figma-variant bestaat.
  - Figma: History/Detail/Overview (5:7), History/Detail/Splits (38:5009), History/Detail/BPM (38:5115) → Alleen default state met data
  - Code: `apps/rowtrack/app/(tabs)/history/[id].tsx:93` → ActivityIndicator (loading), EmptyState 'Geen splits beschikbaar.' (regel 236), EmptyState 'Workout niet gevonden' (regel 109)

### Profile + bewerk-sheets (28)

- [ ] **Opslaan-knop volledig andere stijl dan design** · `MIDDEL` · style-mismatch
  - De design-knop gebruikt een cyaan vlak dat in geen enkel token voorkomt; de code rendert de token-gebaseerde primary Button (rood verloop, pilvorm). Zichtbaar totaal andere knop, in het profielscherm en in elke bewerk-sheet.
  - Figma: Profile (52:8768) > btn-opslaan (52:8813); idem in alle zeven sheets (bv. 53:9997, 53:10113, 52:9282) → fill #00D4FF, radius 12, hoogte 52, tekst 'Opslaan' Inter Semi Bold 16 #0A0A0F
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:450` → Button variant primary: lineair verloop #F66363→#F05454, radius 9999 (radii.full), hoogte 48 (lg) / padding 12 (md), tekst Source Serif SemiBold 18 #FFFFFF

- [ ] **Segmented control (Geslacht en Doel) wijkt af in kleur, vorm en maat** · `MIDDEL` · style-mismatch
  - Design toont een omrande, transparante control met cyaan actieve staat; code gebruikt een gevulde control met accent-rode actieve staat en 14px in plaats van 13px tekst. Structuur (3 resp. 2/3 segmenten met klik-interactie) komt wel overeen.
  - Figma: 07 - Profile/Geslacht (52:9155) > Segments (52:9275); 07 - Profile/Doel bewerken (52:9730) > Segments (52:9870, 52:9884) → container zonder fill met 1px #FFFFFF border, radius 10, padding 4, segment 44px hoog; actief fill #00E5FF met tekst #0A0A0F Inter Semi Bold 13; inactief tekst #94A3B8
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:808` → container fill bg.elevated #1A1D24, radius radii.sm 8, padding 3, gap 2, segment paddingVertical 12; actief fill accent.default #F05454 met tekst bg.base #15171C Inter SemiBold 14; inactief tekst fg.secondary #B5B9C2
  - Correctie uit verificatie: Design toont een transparante control met 1px witte border op 8% opacity (subtiel, niet vol wit), radius 10, padding 4, segment 44px hoog en cyaan (#00E5FF) actieve staat met Inter Semi Bold 13; code gebruikt een gevulde control (bg.elevated), radius 8, padding 3, gap 2 en accent-rode (#F05454) actieve staat met Inter SemiBold 14. Structuur en klik-interactie komen wel overeen.

- [ ] **BottomSheet padding 20 in plaats van 32** · `MIDDEL` · layout-mismatch
  - De sheet-inhoud staat in het design 32px van de randen (space.32 bestaat als token), in code 20px. Verschil van 12px rondom.
  - Figma: 07 - Profile/Voornaam (53:9905) > Frame 77 (53:9970); zelfde padding in alle zeven sheets → padding 32/32/32/32
  - Code: `apps/rowtrack/components/BottomSheet.tsx:152` → paddingHorizontal space.20 (20), paddingTop space.20 (20), paddingBottom 20 + safe-area inset

- [ ] **BottomSheet hoekradius 32 in plaats van 24** · `MIDDEL` · token-mismatch
  - Design gebruikt 24 — exact de waarde van het bestaande token componentRadius.modal — terwijl de code radii['3xl'] (32) hanteert. 8px verschil op de bovenhoeken.
  - Figma: 07 - Profile/Voornaam (53:9905) > Frame 77 (53:9970), radius 24/24/0/0 → topradius 24 (komt overeen met token componentRadius.modal = 24)
  - Code: `apps/rowtrack/components/BottomSheet.tsx:150` → borderTopLeftRadius/borderTopRightRadius radii['3xl'] = 32

- [ ] **Sheet-veldlabels in Inter in plaats van Albert Sans** · `MIDDEL` · style-mismatch
  - De labels boven sheet-velden (PERIODE, TYPE, STREEFWAARDE, e-maillabels, DAG/MAAND/JAAR) volgen in het design de LABEL-component (typeStyles.labelGoalPrefix: Albert Sans, ls 2.2, fg.tertiary), maar de code definieert een eigen Inter-stijl met andere kleur en veel kleinere letterspacing. Het profielscherm zelf gebruikt wél labelGoalPrefix — inconsistent binnen dezelfde file.
  - Figma: 07 - Profile/Mail (53:10039) > Frame 92-95 > LABEL; 07 - Profile/Doel bewerken (52:9730) > LABEL (52:9878, 52:9883, 52:9893) → Albert Sans SemiBold 11, letterspacing 20% (2.2), kleur #8A8E97, uppercase
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:878` → fontFamily.bodySemiBold (Inter_600SemiBold) 11, letterSpacing 0.88, kleur fg.secondary #B5B9C2, uppercase

- [ ] **Volgorde rijen LICHAAMSGEGEVENS wijkt af** · `MIDDEL` · structure-mismatch
  - Alle vier rijen bestaan in beide, maar Geboortedatum staat in het design op positie 2 en in de code op positie 4.
  - Figma: Profile (52:8768) > Frame 76 (52:9019): geslacht, Geboortedatum, Lengte, Gewicht → rijvolgorde: Geslacht → Geboortedatum → Lengte → Gewicht
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:424` → rijvolgorde: Geslacht → Lengte → Gewicht → Geboortedatum

- [ ] **Tekstvelden: witte 1px border en radius 12 vs border.default en radius 16** · `MIDDEL` · style-mismatch
  - Inputvelden in de sheets hebben in het design een opvallende witte rand en radius 12; de code gebruikt de donkere token-border en radius 16. Zelfde afwijking geldt voor sheetInputRow (regel 884).
  - Figma: 07 - Profile/Voornaam (53:9905) > Frame 88 > Workout; idem inputs in Mail- en Doel-sheet (bv. 52:9892) → fill #1A1F2E, 1px border #FFFFFF, radius 12, tekst 16 Inter Regular #FFFFFF
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:787` → fill bg.elevated #1A1D24, 1px border border.default #2C2F37, radius radii.md 16, tekst 16 Inter Regular fg.primary #F2F4FA
  - Correctie uit verificatie: Inputvelden in de sheets hebben in het design fill #1A1F2E, een 1px witte rand op 5% opacity (subtiel) en radius 12; de code gebruikt bg.elevated #1A1D24, border.default #2C2F37 en radius 16. Zelfde afwijking geldt voor sheetInputRow (profile.tsx:884).

- [ ] **Stepper Lengte/Gewicht wijkt af van NudgeRow in design** · `MIDDEL` · style-mismatch
  - Interactiepatroon (min/plus stepper) komt overeen, maar de code mist het omkaderde waardevak, gebruikt grotere knoppen zonder border, andere radius, kleinere waarde-typografie en geen aparte unit-stijl.
  - Figma: 07 - Profile/Lengte (52:9286) > NudgeRow (52:9413); 07 - Profile/Gewicht (52:9424) > NudgeRow (52:9491) → min/plus-knoppen 52x52, radius 12, 1px #FFFFFF border, icoon #94A3B8; waarde in omkaderd vak (218x52, radius 12, 1px witte border) met '180' Inter Bold 28 #F8FAFC en unit apart 12px #94A3B8; gap 8
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:841` → knoppen 56x56, radius radii.lg 18, geen border, fill bg.elevated, Ionicons 28 fg.primary #F2F4FA; waarde als losse tekst '180 cm' Inter Bold 24 fg.primary (unit zelfde stijl); space-between layout
  - Correctie uit verificatie: Interactiepatroon (min/plus stepper) komt overeen, maar de code mist het omkaderde waardevak (218x52, radius 12, 1px witte border op 8% opacity), gebruikt grotere knoppen (56 i.p.v. 52) zonder border met radius 18 i.p.v. 12, kleinere waarde-typografie (Inter Bold 24 i.p.v. 28) en geen aparte unit-stijl (12px #94A3B8 in design).

- [ ] **WheelPicker typografie en opbouw wijken af van design-wheel** · `MIDDEL` · style-mismatch
  - De code-wheel gebruikt de serif-tokenstijl met veel groter contrast tussen geselecteerd (34) en niet-geselecteerd (16), toont 3 in plaats van 5 rijen, en tekent per kolom een eigen indicator in plaats van één doorlopende lijn.
  - Figma: 07 - Profile/Geboortedatum (52:9538) > IdlePhase/Wheel (52:9667) → geselecteerde rij Inter Bold 22 #F8FAFC, overige rijen Inter Regular 18 #47556E, 5 zichtbare rijen, selectielijnen 1px #47556E over de volledige breedte gedeeld door de drie kolommen
  - Code: `apps/rowtrack/components/WheelPicker.tsx:152` → geselecteerd Source Serif 34 fg.primary #F2F4FA, overige Source Serif 16 fg.secondary #B5B9C2, 3 zichtbare rijen (VISIBLE=3, WheelPicker.tsx:15), hairline indicator border.default #2C2F37 per kolom

- [ ] **Lijstrij-divider: andere kleur en inzet** · `LAAG` · style-mismatch
  - Divider tussen lijstrijen heeft in het design een niet-token blauwgrijze kleur en loopt van rand tot rand; code gebruikt fg.quaternary en springt 16px in aan de linkerkant.
  - Figma: Profile (52:8768) > Frame 74 > Rectangle (52:9014, 52:9027, 52:9048, 52:9049) → 1px #47556E, volledige breedte (362)
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:762` → 1px fg.quaternary #5C606B, marginLeft 16 (ingesprongen)

- [ ] **Chevron in lijstrijen: glyph 20px wit vs Ionicons 16px grijs** · `LAAG` · style-mismatch
  - De rij-indicator is in code kleiner en aanzienlijk donkerder dan in het design.
  - Figma: Profile (52:8768) > Workout > '›' (bv. 52:8992) → tekstglyph '›' 20px Inter Regular #FFFFFF
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:398` → Ionicons chevron-forward, size 16, kleur fg.quaternary #5C606B

- [ ] **Rijlabel 'Email' heet in code 'E-mailadres'** · `LAAG` · text-mismatch
  - Label van de e-mailrij in de ACCOUNT-sectie verschilt letterlijk van het design.
  - Figma: Profile (52:8768) > Workout (52:9007) > LABEL (I52:9008;43:7485) → "Email"
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:403` → "E-mailadres"

- [ ] **Labels in e-mailsheet wijken tekstueel af** · `LAAG` · text-mismatch
  - Alle vier veldlabels in de e-mail-wijzigen-sheet verschillen van de design-copy.
  - Figma: 07 - Profile/Mail (53:10039) > Frame 92-95 > LABEL → "HUIDIG", "NIEUW EMAILADRES", "HERHAAL NIEUW EMAILADRES", "BEVESTIG MET WACHTWOORD"
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:485` → "HUIDIG E-MAILADRES", "NIEUW E-MAILADRES", "HERHAAL E-MAILADRES", "WACHTWOORD"

- [ ] **Geboortedatum-weergave: slash-formaat vs kort maandformaat** · `LAAG` · text-mismatch
  - De waarde in de geboortedatum-rij gebruikt in code een NL-kortemaandnotatie in plaats van het dd/mm/jjjj-formaat uit het design.
  - Figma: Profile (52:8768) > Workout (52:9028) > '11/07/1989' (52:9031) → "11/07/1989"
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:73` → formatBirthDate rendert "11 jul 1989"

- [ ] **Sectielabel 'MIJN DOEL' bestaat niet in design** · `LAAG` · missing-in-design
  - Code voegt een sectiekop toe die in het Figma-scherm ontbreekt; ACCOUNT en LICHAAMSGEGEVENS hebben er wel één in beide.
  - Figma: Profile (52:8768) > Frame 32 (52:8776) — GoalProgressCard staat er zonder sectielabel → geen label boven GoalProgressCard
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:379` → Text 'MIJN DOEL' (labelGoalPrefix) boven de kaart

- [ ] **Empty state 'Geen doel ingesteld' ontbreekt in design** · `LAAG` · missing-in-design
  - Code implementeert een lege staat voor het periodedoel waarvoor geen design-variant bestaat.
  - Figma: Profile (52:8768) — alleen de gevulde GoalProgressCard-staat is ontworpen → geen variant zonder doel
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:384` → TouchableOpacity-rij 'Geen doel ingesteld' met chevron als goalProgress null is

- [ ] **Error-state in e-mailsheet ontbreekt in design** · `LAAG` · missing-in-design
  - De code toont een foutmelding onder de velden; het design bevat geen error-staat voor deze sheet.
  - Figma: 07 - Profile/Mail (53:10039) — geen foutvariant aanwezig → geen error-weergave
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:538` → rode fouttekst (status.error #EF4444, 14px) bij fout wachtwoord of update-fout

- [ ] **Versietekst 'RowTrack v1.0.0' ontbreekt in design** · `LAAG` · missing-in-design
  - Code voegt onderaan het scherm een versielabel toe dat niet in het Figma-scherm staat.
  - Figma: Profile (52:8768) — geen versietekst onder de knoppen → niet aanwezig
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:454` → gecentreerde tekst 'RowTrack v1.0.0' (body.xs, fg.secondary)

- [ ] **Kolomlabels DAG/MAAND/JAAR ontbreken in design** · `LAAG` · missing-in-design
  - De code voegt uppercase kolomkoppen toe boven de drie datumkolommen die het design niet heeft.
  - Figma: 07 - Profile/Geboortedatum (52:9538) > IdlePhase/Wheel (52:9667) — geen kolomkoppen → wheel zonder kolomlabels
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:632` → labels 'DAG', 'MAAND', 'JAAR' boven elke WheelPicker-kolom

- [ ] **Afstand tussen Opslaan- en Uitloggen-knop: 20 vs 8** · `LAAG` · layout-mismatch
  - In het design staan de knoppen als groep met 8px tussenruimte; in code erven ze de algemene sectie-gap van 20px. Verschil 12px.
  - Figma: Profile (52:8768) > Buttons (52:8812), gap 8 → gap 8 tussen de twee knoppen
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:730` → knoppen zijn losse ScrollView-children met content-gap space.20 (20)

- [ ] **Uitloggen-knop mist pijl-icoon en accent-border uit design** · `LAAG` · style-mismatch
  - De design-Button (Primary-variant met arrow) wordt in code zonder pijl en zonder accentrand gerenderd en is 4px hoger.
  - Figma: Profile (52:8768) > Buttons > Button (72:15558), variant Primary → hoogte 44, 1px border #F05454, drop/inner shadows, label 'Uitloggen' met pijl-vector →
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:452` → Button primary size lg: hoogte 48 (space.48), geen border, één drop shadow, geen icoon

- [ ] **Sheet-inhoud gap 16 vs 20-30 in design** · `LAAG` · layout-mismatch
  - Verticale ruimte tussen titel, velden en knop is in code 16px; het design gebruikt 20px (tekst-sheets) tot 30px (picker/segment-sheets).
  - Figma: Frame 77 in de sheets: gap 20 (Voornaam 53:9970, Mail 53:10104, Doel 52:9795) en gap 30 (Geslacht 52:9273, Lengte 52:9351, Gewicht 52:9489, Geboortedatum 52:9603) → verticale gap 20 of 30 tussen sheet-secties
  - Code: `apps/rowtrack/components/BottomSheet.tsx:178` → bodyContent gap space.16 (16), header marginBottom space.16 (16)

- [ ] **Sheet- en rij-achtergrond #1A1F2E is geen token** · `LAAG` · token-mismatch
  - Design gebruikt een blauwiger donkergrijs dat buiten de token-set valt; code gebruikt bg.elevated. Geldt voor de sheet-container én de listCard-rijen (profile.tsx:748).
  - Figma: Frame 77 (bv. 53:9970) en Workout-rijen (bv. 52:8986), fill #1A1F2E → #1A1F2E (komt niet voor in colors.ts)
  - Code: `apps/rowtrack/components/BottomSheet.tsx:149` → bg.elevated #1A1D24

- [ ] **Wit (#FFFFFF) in design waar code fg.primary gebruikt** · `LAAG` · token-mismatch
  - Design gebruikt puur wit (alleen als fg.onAccent getokeniseerd); code gebruikt consequent fg.primary. Visueel vrijwel gelijk, token-technisch afwijkend.
  - Figma: Profile (52:8768): rijwaarden (bv. 52:8996) en chevrons; sheets: inputtekst en close-icoon (close-outline, stroke #FFFFFF) → #FFFFFF voor rijwaarden, inputtekst en sluit-icoon
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:777` → fg.primary #F2F4FA (listValue profile.tsx:777, sheetInput profile.tsx:784, close-icoon BottomSheet.tsx:115)

- [ ] **Huidig e-mailadres: 16px fg.secondary vs 18px wit** · `LAAG` · style-mismatch
  - De read-only weergave van het huidige e-mailadres is in code 2px kleiner en gedempt in plaats van wit.
  - Figma: 07 - Profile/Mail (53:10039) > Frame 92 > 'jeroen@ikbenjeroen.be' → Inter Regular 18 #FFFFFF
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:796` → Inter Regular 16 fg.secondary #B5B9C2

- [ ] **Streefwaarde-unit: 16px fg.secondary vs 12px #94A3B8** · `LAAG` · style-mismatch
  - De eenheid rechts in het streefwaardeveld is in code 4px groter en gebruikt fg.secondary in plaats van de (niet-token) design-kleur.
  - Figma: 07 - Profile/Doel bewerken (52:9730) > Frame 88 > 'km' (52:9902) → Inter Regular 12 #94A3B8
  - Code: `apps/rowtrack/app/(tabs)/profile.tsx:901` → Inter Regular 16 fg.secondary #B5B9C2

- [ ] **GoalProgressCard heeft in code top/bottom borders die design niet toont** · `LAAG` · style-mismatch
  - De kaart op het profielscherm krijgt in code een 1px rand boven en onder die de design-instance niet heeft.
  - Figma: Profile (52:8768) > GoalProgressCard (64:14054) — instance zonder strokes → kaart zonder randen (alleen fill #1A1D24)
  - Code: `apps/rowtrack/components/GoalProgressCard.tsx:84` → borderTopWidth 1 + borderBottomWidth 1, borderColor border.default #2C2F37

- [ ] **GoalProgressCard statusregel: gap 6 vs 4** · `LAAG` · layout-mismatch
  - 2px meer tussenruimte in de statusregel onder de progressbar dan in het design.
  - Figma: Profile (52:8768) > GoalProgressCard > Frame 73 (I64:14054;64:14018), gap 4 → horizontale gap 4 tussen %, 'voldaan', dot en resttekst
  - Code: `apps/rowtrack/components/GoalProgressCard.tsx:136` → gap space.6 (6)

### Overlays & Motivational Toast (13)

- [ ] **Knopkleur: cyaan in design, rood accent-token in code** · `MIDDEL` · style-mismatch
  - De primaire knop 'Training afsluiten' is in Figma cyaan (#00E5FF), in code rood via accent.default (#F05454). Het hele Figma-scherm gebruikt een ouder cyaan accentschema dat niet overeenkomt met de huidige token-set.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card (10:61) > Close Button (10:66) → fill #00E5FF (cyaan)
  - Code: `components/MotivationalToast.tsx:236` → backgroundColor: accent.default = #F05454 (rood)

- [ ] **Kaart-border: cyaan in design, rood accent-token in code** · `MIDDEL` · style-mismatch
  - De 1px border rond de toast-kaart is in Figma cyaan (#00E5FF), in code rood via accent.default (#F05454). Borderbreedte komt wel overeen.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card (10:61) → stroke #00E5FF, 1px
  - Code: `components/MotivationalToast.tsx:209` → borderColor: accent.default = #F05454, borderWidth 1

- [ ] **Knoptekstkleur: donker in design, wit in code** · `MIDDEL` · style-mismatch
  - Het knoplabel is in Figma donker (#0A0E1A) op de cyane knop; in code wit (fg.onAccent) op de rode knop. Hangt samen met het afwijkende accentschema van het design.
  - Figma: 04 – Motivational Toast (5:5) > Close Button (10:66) > 'Training afsluiten' (10:67) → #0A0E1A (donker op cyaan)
  - Code: `components/MotivationalToast.tsx:245` → fg.onAccent = #FFFFFF (wit op rood)

- [ ] **Knop-typografie: Inter Bold 16 vs Source Serif SemiBold 18** · `MIDDEL` · style-mismatch
  - Het knoplabel gebruikt in Figma Inter Bold 16; de code gebruikt typeStyles.buttonPrimary (Source Serif 4 SemiBold 18). Ander font-family, gewicht en grootte.
  - Figma: 04 – Motivational Toast (5:5) > Close Button (10:66) > 'Training afsluiten' (10:67) → Inter Bold, 16px
  - Code: `components/MotivationalToast.tsx:244` → typeStyles.buttonPrimary = SourceSerif4_600SemiBold, 18px

- [ ] **MilestoneOverlay heeft geen Figma-design** · `MIDDEL` · missing-in-design
  - De tussentijdse milestone-melding tijdens de workout (bv. '500m ✓', 'Halverwege! Blijf gaan!', getriggerd in lib/hooks/useGoalProgress.ts) bestaat volledig in code maar heeft geen tegenhanger in Figma; figma-map.md heeft een lege node-id voor dit component.
  - Figma: — geen node (figma-map.md: 'Workout / Milestone Overlay', node-id leeg) → geen design aanwezig
  - Code: `components/MilestoneOverlay.tsx:17` → kaart bg.elevated, padding 32/24, radius radii.xl (22), tekst BarlowCondensed_700Bold 24 fg.primary, auto-dismiss na 1,5s

- [ ] **Niet-goal toast-state (motivatiebericht met OK-knop) ontbreekt in design** · `MIDDEL` · missing-in-design
  - Het Figma-frame toont uitsluitend de goal-complete variant. De code heeft daarnaast een default motivatie-toast (isGoalComplete=false) met het bericht als titel, een 'OK'-knop en auto-dismiss na 3 seconden — deze state is nergens in het design gedocumenteerd.
  - Figma: 04 – Motivational Toast (5:5) → alleen goal-complete variant (trofee, 'Doel bereikt!', confetti, 'Training afsluiten')
  - Code: `components/MotivationalToast.tsx:190` → tweede state zonder trofee/confetti: message als titel (fg.primary), knop 'OK', auto-dismiss na 3s

- [ ] **Kaartachtergrond wijkt licht af van bg.elevated token** · `LAAG` · token-mismatch
  - De kaartachtergrond in Figma (#1A1F2E, blauwiger) is geen bestaande token-waarde; code gebruikt bg.elevated (#1A1D24). Visueel subtiel maar de design-waarde loopt niet via de token-set.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card (10:61) → #1A1F2E
  - Code: `components/MotivationalToast.tsx:207` → bg.elevated = #1A1D24

- [ ] **Bodytekstkleur: #AAAAAA in design vs fg.tertiary in code** · `LAAG` · style-mismatch
  - De bodytekst is in Figma #AAAAAA (geen token-waarde; fg.secondary is #B5B9C2, fg.tertiary #8A8E97); code gebruikt fg.tertiary. Font (Inter Regular 15, lineHeight 22) komt wel overeen.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card > bodytekst (10:64) → #AAAAAA
  - Code: `components/MotivationalToast.tsx:231` → fg.tertiary = #8A8E97

- [ ] **Confetti-kleurenpalet wijkt af** · `LAAG` · style-mismatch
  - Slechts drie van de zes confetti-kleuren komen overeen (#F05454, #FFD700, #FFFFFF). Design gebruikt cyaan (#00E5FF), paars (#AB47BC) en groen (#4CAF50); code gebruikt blauw (#3B82F6), groen (#22C55E) en roze (#FF69B4).
  - Figma: 04 – Motivational Toast (5:5) > Confetti (10:21–10:60) → #00E5FF, #FFFFFF, #AB47BC, #F05454, #4CAF50, #FFD700
  - Code: `components/MotivationalToast.tsx:14` → #F05454, #3B82F6, #22C55E, #FFD700, #FF69B4, #FFFFFF

- [ ] **Confetti-vormen: rechthoekige strips ontbreken in code** · `LAAG` · structure-mismatch
  - Het design toont twee confetti-vormen (cirkels en langwerpige strips met radius 2); de code rendert alle partikels als cirkels met gelijke breedte en hoogte.
  - Figma: 04 – Motivational Toast (5:5) > Confetti (10:21–10:60) → mix van cirkels (4–12px) en verticale strips (3–7 × 10–26px, radius 2)
  - Code: `components/MotivationalToast.tsx:100` → uitsluitend cirkels (6–14px, borderRadius = size/2)

- [ ] **Kaarthoogte: 340px vast in design, content-hug (~280px) in code** · `LAAG` · layout-mismatch
  - De toast-kaart is in Figma 340px hoog met zichtbare extra witruimte onder de knop; in code krimpt de kaart naar de inhoud (ca. 60px lager). Breedte (320), padding (32), gap (16) en radius (24 = componentRadius.modal) kloppen wel.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card (10:61) → 320 × 340, content verticaal gecentreerd met extra witruimte
  - Code: `components/MotivationalToast.tsx:206` → width 320, hoogte hugt content (ca. 280px bij twee regels body)

- [ ] **Body-copy: doel-samenvatting uit design wordt nergens gegenereerd** · `LAAG` · text-mismatch
  - Het design toont een samenvattende zin over het behaalde doel; de code heeft geen logica die zo'n samenvatting opbouwt — bij goal-complete verschijnt als body het toevallig actieve motivatiebericht, en zonder toastMsg verschijnt de modal helemaal niet.
  - Figma: 04 – Motivational Toast (5:5) > Toast Card > bodytekst (10:64) → "Je hebt 20 minuten geroeid.\nGeweldig gedaan! 💪"
  - Code: `components/MotivationalToast.tsx:182` → body toont toastMsg = laatste pace-motivatiebericht (bv. 'Perfecte pace, hou vol!') uit lib/hooks/useGoalProgress.ts

- [ ] **Scrim-waarde hardcoded i.p.v. via overlay.scrim token** · `LAAG` · token-mismatch
  - Design en code komen visueel overeen (zwart 85%), maar de code omzeilt de token: constants/overlay.ts definieert scrim als 0.7 (elders gebruikt in BottomSheet/GoalSetupModal), terwijl deze toast 0.85 hardcodet. Design en token-set spreken elkaar tegen.
  - Figma: 04 – Motivational Toast (5:5) > Overlay (10:20) → #000000 @ 0.85
  - Code: `components/MotivationalToast.tsx:202` → hardcoded 'rgba(0,0,0,0.85)'; token overlay.scrim = rgba(0,0,0,0.7)

### Gedeelde chrome (TabBar, status bars, Chip, Button) (21)

- [ ] **Inactief tab-label gebruikt kleinere/lichtere typografie dan design** · `MIDDEL` · style-mismatch
  - In Figma hebben actieve en inactieve tab-labels dezelfde typografie (11px SemiBold); in code krimpt het inactieve label naar 9px Medium met andere tracking, waardoor labels van grootte wisselen bij tab-switch.
  - Figma: TabItem (86:2769) > Page=Home, State=Default (86:2768) > label (86:2679) → Albert Sans SemiBold 11px, letterSpacing 20% (2.2px), lineHeight 125%, uppercase — identiek aan de actieve variant, alleen kleur verschilt
  - Code: `components/TabLabel.tsx:23` → typeStyles.labelMicro: AlbertSans_500Medium 9px, letterSpacing 2.7, lineHeight 9 (actieve state gebruikt wel labelGoalPrefix 11px SemiBold, conform design)

- [ ] **Connected-indicator is rood in design, groen in code (BLE en HR)** · `MIDDEL` · style-mismatch
  - Beide status bars kleuren de verbonden-indicator groen via status.success, terwijl het design de accent-rode kleur toont voor de connected state.
  - Figma: BLE Status Bar (21:485) > State=Connected (21:486) > Ellipse (21:489); HR Status Bar (21:515) > State=Connected (21:516) > hart (21:519) → #F05454 (accent.default) voor dot en hart bij connected
  - Code: `components/BleStatusBar.tsx:25` → status.success #22C55E (BleStatusBar.tsx:25 en HrStatusBar.tsx:23)

- [ ] **Verbind/Verbreek-actietekst is italic in design, regular in code** · `MIDDEL` · style-mismatch
  - De actielinks in het rechterpaneel van beide status bars zijn in het design cursief (textLink-stijl), maar de code gebruikt de regular font-variant.
  - Figma: BLE Status Bar (21:485) > Device connect > Verbind (I72:15744;72:15738); idem HR Status Bar (21:515) → Source Serif Pro Italic 15px, letterSpacing -0.5% (komt overeen met typeStyles.textLink)
  - Code: `components/BleStatusBar.tsx:110` → SourceSerif4_400Regular 15px (hardcoded in actionText/actionMuted; BleStatusBar.tsx:110/117 en HrStatusBar.tsx:98/105)

- [ ] **Verbreek-actie is accent-rood in design, grijs in code** · `MIDDEL` · style-mismatch
  - De disconnect-actie in de connected state is in het design accent-rood zoals de connect-actie, maar de code dempt hem naar tertiair grijs.
  - Figma: BLE Status Bar (21:485) > State=Connected > Device connect State=Disconnect > Verbreken (I72:15769;72:15740) → #F05454 (accent.default)
  - Code: `components/BleStatusBar.tsx:121` → fg.tertiary #8A8E97 via actionMuted (BleStatusBar.tsx:121 en HrStatusBar.tsx:109)

- [ ] **Actieve Chip: design is solide rode chip met lichte tekst, code een subtiele tint met rode border en rode tekst** · `MIDDEL` · style-mismatch
  - De actieve chip-state wijkt volledig af: het design toont een gevulde accent-chip met lichte tekst, de code een transparante tint met rode rand en rode tekst.
  - Figma: Chip (22:798) > State=Active (22:796) → fill #F05454 solid, geen border, label #F2F4FA (fg.primary)
  - Code: `components/Chip.tsx:34` → backgroundColor accent.muted rgba(240,84,84,0.12), borderWidth 1 accent.default, label accent.default (Chip.tsx:33-37 en 46-48)

- [ ] **Button-pijl rechts van label ontbreekt in code; icon rendert links en veel groter** · `MIDDEL` · missing-in-code
  - Beide button-varianten in het design hebben een trailing pijl als vast onderdeel; de code kent alleen een optioneel leading icoon van 24px, dus positie, grootte en aanwezigheid wijken af.
  - Figma: Button (109:2214) > Variant=Primary (64:14082) > → (64:14081) en Variant=Secondary (56:13755) > → (57:14006) → pijl-vector (→) van 9x8px rechts ná het label, in beide varianten, gap 10
  - Code: `components/Button.tsx:94` → optioneel Ionicons-icoon van 24px vóór het label, gap 8; geen standaard pijl

- [ ] **Status bar corner radius: 8 in design, 12 in code** · `LAAG` · token-mismatch
  - Beide status bars gebruiken in code het cardSm-token (12) terwijl het design radius 8 toont; verkeerd token gekozen.
  - Figma: BLE Status Bar (21:485) > State=Default (20:291); HR Status Bar (21:515) > State=Default (20:290) → cornerRadius 8 (radii.sm)
  - Code: `components/BleStatusBar.tsx:72` → componentRadius.cardSm = 12 (BleStatusBar.tsx:72 en HrStatusBar.tsx:61)

- [ ] **Verbreek-label: 'Verbreken' in design, 'Verbreek' in code** · `LAAG` · text-mismatch
  - De copy van de disconnect-actie verschilt: design gebruikt het hele werkwoord 'Verbreken', code de imperatief 'Verbreek'.
  - Figma: BLE Status Bar (21:485) > Device connect State=Disconnect > Verbreken (I72:15769;72:15740) → "Verbreken"
  - Code: `components/BleStatusBar.tsx:53` → "Verbreek" (BleStatusBar.tsx:53 en HrStatusBar.tsx:48)

- [ ] **Status-dot is 10px in design, 8px in code** · `LAAG` · layout-mismatch
  - De verbindingsindicator-dot van de BLE status bar is in code 2px kleiner dan in het design.
  - Figma: BLE Status Bar (21:485) > State=Default > Ellipse (20:280) → ellipse 10x10
  - Code: `components/BleStatusBar.tsx:92` → dot 8x8, borderRadius 4

- [ ] **Hart-glyph in HR status bar heeft geen fontFamily in code** · `LAAG` · style-mismatch
  - Het hart-teken wordt in het design in Inter gezet; de code zet geen fontFamily, waardoor het systeemfont de glyph rendert.
  - Figma: HR Status Bar (21:515) > State=Default > ♥ (20:286) → Inter Regular 14px
  - Code: `components/HrStatusBar.tsx:81` → fontSize 14, lineHeight 16, geen fontFamily (valt terug op systeemfont)

- [ ] **Scanning/connecting- en error-states van status bars ontbreken in Figma** · `LAAG` · missing-in-design
  - De code implementeert tussen- en foutstates (spinner, error-kleur, 'Opnieuw'-actie) die als varianten in de Figma component sets ontbreken.
  - Figma: BLE Status Bar (21:485) en HR Status Bar (21:515) — alleen State=Default en State=Connected → 2 varianten: Default, Connected
  - Code: `components/BleStatusBar.tsx:14` → BLE: default, connecting (spinner, 'Verbinden...'), connected, error ('Verbinding mislukt' + 'Opnieuw'); HR: default, scanning (spinner, 'Zoeken...'), connected

- [ ] **Default Chip heeft border in code die het design niet heeft** · `LAAG` · style-mismatch
  - De code voegt een 1px border.default toe aan de default chip; in het design is de chip randloos.
  - Figma: Chip (22:798) > State=Default (22:797) → fill #1A1D24 (bg.elevated), geen stroke
  - Code: `components/Chip.tsx:40` → backgroundColor bg.elevated + borderWidth 1 border.default #2C2F37

- [ ] **Default Chip-labelkleur wijkt af (design gebruikt niet-token slate-kleur)** · `LAAG` · token-mismatch
  - Het default chip-label is in Figma #94A3B8, een kleur die niet in de token-set voorkomt; de code gebruikt fg.secondary #B5B9C2. Vermoedelijk moet het design geüpdatet worden naar het token, maar de waardes verschillen nu.
  - Figma: Chip (22:798) > State=Default > Label (22:792) → #94A3B8 (geen token uit colors.ts; oude slate-waarde)
  - Code: `components/Chip.tsx:50` → fg.secondary #B5B9C2

- [ ] **Button-hoogte: 44 in design, 48 in code (lg default)** · `LAAG` · layout-mismatch
  - Beide Figma-varianten zijn 44px hoog; de code rendert de standaard lg-button op 48px.
  - Figma: Button (109:2214) > Variant=Primary (64:14082) en Variant=Secondary (56:13755) → hoogte 44 (padding 14/24/12/24)
  - Code: `components/Button.tsx:124` → sizeLg: height space['48'] = 48 (default size)

- [ ] **Primary button mist 1px accent-stroke uit design** · `LAAG` · style-mismatch
  - Het design geeft de primary button een 1px accent-rand rond de gradient; de code rendert geen border op de primary variant.
  - Figma: Button (109:2214) > Variant=Primary (64:14082) → stroke #F05454, 1px, bovenop de gradient-fill
  - Code: `components/Button.tsx:83` → geen border op primary (buttonTokens.primary.borderWidth = 0)

- [ ] **Primary button-schaduwstack versimpeld in code** · `LAAG` · style-mismatch
  - Het design gebruikt een gelaagde schaduw/inner-shadow-stack voor diepte; de code benadert dit met één drop shadow met afwijkende radius/opacity en laat de inner shadows (RN-beperking) en de secondary-glow weg.
  - Figma: Button (109:2214) > Variant=Primary (64:14082) effects → 4 effects: drop shadow #000@30% r2 o(0,1), drop shadow #F05454@20% r20 o(0,6), inner shadow #B42828@30% r4 o(0,-2), inner shadow #FFF@22% r0 o(0,1); Secondary heeft inner shadow #FFF@4%
  - Code: `components/Button.tsx:131` → enkele shadow: kleur #F05454, offset (0,4), opacity 0.4, radius 12, elevation 8; outline heeft geen effect

- [ ] **Button icon-label gap: 10 in design, 8 in code** · `LAAG` · layout-mismatch
  - De ruimte tussen icoon/pijl en label is in het design 10px, in code 8px.
  - Figma: Button (109:2214) > Variant=Primary (64:14082) → itemSpacing 10 (buttonTokens.outline.gap = 10)
  - Code: `components/Button.tsx:120` → gap space['8'] = 8

- [ ] **Button-varianten destructive en ghost ontbreken in Figma** · `LAAG` · missing-in-design
  - De code kent destructive- en ghost-varianten en loading/disabled-states die niet als Figma-varianten bestaan; ook een size-as ontbreekt in het component set.
  - Figma: Button (109:2214) — alleen Variant=Primary en Variant=Secondary → 2 varianten: Primary, Secondary
  - Code: `components/Button.tsx:26` → 4 varianten: primary, destructive, ghost, outline (plus size md/lg en loading/disabled states)

- [ ] **Segment-TabItem horizontale padding: 20 in design, 12 in code** · `LAAG` · layout-mismatch
  - De segmented-control TabItem (gebruikt in history-schermen) heeft in het design 20px horizontale padding; de code gebruikt 12px.
  - Figma: TabItem (21:400) > State=Active, Icon=No (21:398) → padding links/rechts 20
  - Code: `components/TabItem.tsx:30` → paddingHorizontal space['12'] = 12 (met flex:1, dus items vullen de rij)

- [ ] **Icon-variant van segment-TabItem niet geimplementeerd** · `LAAG` · missing-in-code
  - Het Figma component set heeft een Icon-as met doelicoon naast het label; de code-component ondersteunt geen icoon.
  - Figma: TabItem (21:400) > State=Active, Icon=Yes (72:14974) en State=Default, Icon=Yes (72:14976) → Icon=Yes varianten met 16px Icons/Targets-icoon en gap 6 voor het label
  - Code: `components/TabItem.tsx:4` → TabItemProps kent alleen label/active/onPress — geen icon-prop

- [ ] **SectionHeader-component matcht LABEL-component niet (Inter i.p.v. Albert Sans)** · `LAAG` · style-mismatch
  - De herbruikbare SectionHeader-component gebruikt de Inter-gebaseerde label.caps-stijl in plaats van de Albert Sans LABEL-stijl uit Figma. De schermen zelf (o.a. TOESTELLEN in components/workout/IdlePhase.tsx:545) gebruiken wél de correcte labelGoalPrefix-stijl; SectionHeader is momenteel enkel geëxporteerd en nergens gebruikt.
  - Figma: LABEL (43:7508) > LABEL (43:7485) → Albert Sans SemiBold 11px, letterSpacing 20% (2.2px), lineHeight 125%, uppercase, #8A8E97
  - Code: `components/SectionHeader.tsx:15` → label.caps: Inter_600SemiBold 12px, letterSpacing 1.8, lineHeight 15, uppercase, fg.tertiary

### Design tokens (Figma variables vs constants/) (16)

- [ ] **Button shadow tokens exporteren als '[object Object]' — onbruikbaar** · `HOOG` · token-mismatch
  - De Style Dictionary build serialiseert de boxShadow composite tokens naar de string '[object Object]'. De 4-laags knopschaduw uit Figma heeft daardoor geen enkel bruikbaar code-equivalent; Button.tsx valt terug op een simpele shadowColor. Geldt voor colors.ts regels 62, 78 en 89.
  - Figma: Effect styles: button/primary/shadow, button/outline/shadow, button/destructive/shadow (+ shadow/buttonPrimary, shadow/buttonOutline) → primary: 4 lagen — drop 0/1/2 #000000@30%, drop 0/6/20 #F05454@20%, inner 0/-2/4 #B42828@30%, inner 0/1/0 #FFFFFF@22%; outline/destructive: inner 0/1/0 #FFFFFF@4%
  - Code: `apps/rowtrack/constants/colors.ts:62` → shadow: '[object Object],[object Object],[object Object],[object Object]' (primary) en '[object Object]' (outline/destructive)

- [ ] **type/kpiUnit is Italic in Figma maar Regular in code** · `MIDDEL` · token-mismatch
  - De Figma text style voor KPI-eenheden is expliciet Italic; de code-constante typeStyles.kpiUnit gebruikt de Regular font family. Het token wordt actief gebruikt in 5 componenten (o.a. app/(tabs)/index.tsx, WorkoutCard.tsx, KPI_single.tsx), dus eenheden renderen niet cursief.
  - Figma: Text style type/kpiUnit (S:b1301c1726ebe4ad179cd0cd821fcc89778ed51a) → Source Serif Pro Italic, 16px (beschrijving: 'Italic units after values')
  - Code: `apps/rowtrack/constants/typography.ts:100` → fontFamily: 'SourceSerif4_400Regular', 16px

- [ ] **type/heroDisplay is Regular in Figma maar Italic in code** · `MIDDEL` · token-mismatch
  - Omgekeerde stijl-mismatch: de Figma style voor de dashboard-groet (heroDisplay) staat op Regular, terwijl typeStyles.heroDisplay in code de Italic variant gebruikt. Size, line-height en letter-spacing kloppen wel.
  - Figma: Text style type/heroDisplay (S:5e00182b595325aaa77f0ee8fbbbb88d8696b8d5) → Source Serif Pro Regular, 44px, ls -3%, lh 95%
  - Code: `apps/rowtrack/constants/typography.ts:76` → fontFamily: 'SourceSerif4_400Regular_Italic', 44px

- [ ] **Button typography tokens exporteren als '[object Object]'** · `MIDDEL` · token-mismatch
  - Zelfde serialisatie-defect als de shadows: buttonTokens.primary/outline/destructive.typography (regels 61, 77, 88) zijn onbruikbare strings. Minder ernstig dan de shadows omdat typeStyles.buttonPrimary en typeStyles.buttonOutline dezelfde waardes wel correct exporteren.
  - Figma: Text styles button/primary/typography, button/outline/typography, button/destructive/typography → primary: Source Serif Pro SemiBold 18px, ls -1.5%, lh 100%; outline/destructive: idem 16px
  - Code: `apps/rowtrack/constants/colors.ts:61` → typography: '[object Object]'

- [ ] **Figma Component-tokenlaag grotendeels niet geëxporteerd naar code** · `MIDDEL` · missing-in-code
  - Van de Figma Component-collectie exporteert de token-pipeline enkel de button- en (deels) progressBar-tokens. Alle andere componentgroepen (goalPill, kpiTile, prBadge, recentRow, sectionEyebrow, segmentedControl, splitRow, statusBar, tabBar-kleuren, textLink) hebben geen code-constanten; componenten moeten die waardes zelf samenstellen uit theme-tokens of hardcoden.
  - Figma: Variables collectie 'Component' (VariableCollectionId:55:10337): goalPill/*, kpiTile/*, prBadge/*, recentRow/*, sectionEyebrow/*, segmentedControl/*, splitRow/*, statusBar/*, tabBar/* (kleuren), textLink/* → ~70 component-variabelen, o.a. splitRow/fastestBackground #F0545414, tabBar/activeColor #F05454, kpiTile/borderTop #1F2128, prBadge/color #E8DCC4
  - Code: `apps/rowtrack/constants/index.ts:1` → Alleen buttonTokens en progressBar (partieel) worden geëxporteerd; overige component-tokens ontbreken volledig in constants/
  - Correctie uit verificatie: De Figma Component-collectie (VariableCollectionId:55:10337) bevat 100 variabelen (niet ~70). De pipeline exporteert daarvan buttonTokens, progressBar (partieel, 3 van 9) én — anders dan geclaimd — ook screen/paddingX (24), screen/paddingXAlt (28), tabBar/paddingTop (18) en tabBar/paddingBottom (28) via layout in constants/spacing.ts. Alle overige componentgroepen (goalPill, kpiTile, prBadge, recentRow, sectionEyebrow, segmentedControl, splitRow, statusBar, tabBar-kleuren, textLink) ontbreken wel volledig in constants/.

- [ ] **progressBar tokens onvolledig geëxporteerd** · `LAAG` · missing-in-code
  - Code exporteert 3 van de 9 progressBar-tokens. fillColor, markerColor, markerRadius, markerSize, fillHeight en trackHeight ontbreken. Ook een naamverschil: Figma noemt het 'fillSucces', code 'successFill' (waarde identiek).
  - Figma: Variables Component > progressBar/* (fillColor, fillHeight, markerColor, markerRadius, markerSize, trackHeight, fillSucces, warningFill) → fillColor #F05454, markerColor #F05454, markerRadius 9999, markerSize 7, fillHeight 1, trackHeight 1, fillSucces #4CAF50, warningFill #FE9429
  - Code: `apps/rowtrack/constants/colors.ts:95` → Alleen trackColor #C9B894, successFill #4CAF50, warningFill #FE9429

- [ ] **Hardcoded kleuren in componentcode omzeilen tokens (steekproef)** · `LAAG` · token-mismatch
  - Steekproef: TabItem.tsx:35 en GoalSegments.tsx:151 hardcoden rgba(240,84,84,0.20) terwijl color/alpha/red-20 als Figma variable bestaat maar niet in constants/ is geëxporteerd. Verder: Icon.tsx:12 default '#FFFFFF', MotivationalToast.tsx:14/226 confetti-kleuren en #FFD700, IdlePhase.tsx:241 rgba(0,0,0,0.5), ActivePhase.tsx:922 rgba(245,158,11,0.15) — allemaal zonder token.
  - Figma: Variables Core > color/alpha/red-20 (#F0545433) e.a. → color/alpha/red-20 = #F05454 @ 20% bestaat als Figma variable
  - Code: `apps/rowtrack/components/TabItem.tsx:35` → 'rgba(240, 84, 84, 0.20)' hardcoded

- [ ] **buttonTokens.radius = 22 heeft geen Figma-equivalent** · `LAAG` · missing-in-design
  - Het top-level veld radius: 22 in buttonTokens komt niet voor in de Figma variables (borderRadius/xl = 22 bestaat wel als primitief, maar is nergens aan buttons gebonden). Vermoedelijk een verouderd restant dat tot verkeerde afronding kan leiden.
  - Figma: Variables Component > button/* (radius-tokens: button/primary/radius = 8, button/outline/radius = 8, button/destructive/radius = 8) → Alle button-radii in Figma zijn 8 (via radius/buttonPrimary → borderRadius/sm); er bestaat geen button-level radius 22
  - Code: `apps/rowtrack/constants/colors.ts:92` → buttonTokens.radius: 22

- [ ] **radii '3xl', componentRadius.cardSm en .modal ontbreken in Figma** · `LAAG` · missing-in-design
  - Drie radius-constanten in code hebben geen corresponderende Figma variable. Componenten die deze gebruiken kunnen niet tegen het design geverifieerd worden.
  - Figma: Variables Core > borderRadius/* en Theme > radius/* → borderRadius: none/xs/sm/md/lg/xl/full; radius: input/buttonOutline/buttonPrimary/card/highlightRow/pill — geen 3xl (32), cardSm (12) of modal (24)
  - Code: `apps/rowtrack/constants/radius.ts:11` → radii['3xl']: 32 (regel 11), componentRadius.cardSm: 12 (regel 21), componentRadius.modal: 24 (regel 22)

- [ ] **layout.screenHorizontal en layout.navHeight zonder Figma-equivalent** · `LAAG` · missing-in-design
  - screenHorizontal (20) wijkt af van de enige screen-padding tokens in Figma (24/28) en navHeight (48) bestaat niet in Figma. Omgekeerd heeft Figma's statusBar/height (44) geen code-constante.
  - Figma: Variables Component > screen/paddingX (24), screen/paddingXAlt (28); geen navHeight variable → screen/paddingX = 24, screen/paddingXAlt = 28; nav-hoogte bestaat niet als variable (wel statusBar/height = 44)
  - Code: `apps/rowtrack/constants/spacing.ts:33` → layout.screenHorizontal: 20 (regel 33), layout.navHeight: 48 (regel 34)

- [ ] **Legacy typografie-sets (display/body/label/mono) ontbreken volledig in Figma** · `LAAG` · missing-in-design
  - Code exporteert complete typografie-schalen met Barlow Condensed, Inter en JetBrains Mono die nergens in de Figma variables of text styles voorkomen. Vermoedelijk legacy; ze concurreren met de type/* styles als bron van waarheid.
  - Figma: Variables Core > fontFamily/* (alleen sourceSerif en albertSans) en text styles type/* (18 stuks) → Figma kent enkel Source Serif Pro en Albert Sans; fontSize variables: 9-18, 22, 26, 28, 32, 34, 36, 38, 44, 124
  - Code: `apps/rowtrack/constants/typography.ts:182` → display (BarlowCondensed 30-72px), body (Inter 12-20px), label (Inter), mono (JetBrainsMono) + fontFamily entries en fontSize 12/20/24/30/48/60/72
  - Correctie uit verificatie: Code exporteert complete legacy-typografieschalen (display met BarlowCondensed 30-72px, body/label met Inter, mono met JetBrainsMono, typography.ts:182 e.v.) plus fontFamily-entries en fontSize-keys 12/20/24/30/48/60/72 die in geen enkele Figma variable of text style voorkomen. Figma kent alleen Source Serif Pro en Albert Sans, 18 type/* text styles, en fontSize-variabelen 9, 10, 11, 13-18, 22, 26, 28, 32, 34, 36, 38, 44, 124 — dus ook fontSize/12 ontbreekt in Figma (niet '9-18' doorlopend).

- [ ] **Figma Core-primitieven (red/gold/alpha/opacity/fontWeight) niet geëxporteerd naar code** · `LAAG` · missing-in-code
  - Van de Core-collectie exporteert de pipeline alleen neutral. De red- en gold-ramps, alle alpha-varianten, opacity- en fontWeight-primitieven hebben geen code-equivalent, wat hardcoded rgba-waardes in componenten in de hand werkt (zie TabItem/GoalSegments).
  - Figma: Variables Core: color/red/100-900 (10 stappen), color/gold/100, color/alpha/* (12 stuks), opacity/0-100, fontWeight/*, sizing/* → o.a. color/red/450 #F87575, color/gold/100 #F5EFE0, color/alpha/red-08 #F0545414, color/alpha/white-22 #FFFFFF38, opacity/40, opacity/55
  - Code: `apps/rowtrack/constants/colors.ts:3` → Alleen de neutral-ramp wordt als primitief geëxporteerd; red/gold/alpha/opacity/fontWeight/sizing ontbreken

- [ ] **Backwards-compat status- en blue-kleuren zonder Figma-equivalent** · `LAAG` · missing-in-design
  - De status-kleuren in code wijken af van de enige succes/warning-waardes die Figma kent (#22C55E vs #4CAF50, #F59E0B vs #FE9429) en error #EF4444 bestaat helemaal niet in Figma. Gemarkeerd als backwards-compat, maar wordt nog gebruikt (o.a. ProgressBar.tsx GOAL_COLOR).
  - Figma: Variables (geen status/* of blue/* aanwezig; wel Component > progressBar/fillSucces #4CAF50 en progressBar/warningFill #FE9429) → Geen status-tokens; succes/waarschuwing bestaan alleen als progressBar-tokens (#4CAF50 / #FE9429)
  - Code: `apps/rowtrack/constants/colors.ts:105` → status = { success: '#22C55E', warning: '#F59E0B', error: '#EF4444' }, blue = {}

- [ ] **overlay.scrim (rgba 0,0,0,0.7) heeft geen Figma variable** · `LAAG` · missing-in-design
  - De scrim-constante op 70% zwart komt in geen enkele Figma variable voor; het dichtstbijzijnde is black-40. Daarnaast hardcoden MotivationalToast (0.85) en IdlePhase (0.5) nog afwijkende scrims.
  - Figma: Variables Core > color/alpha/black-30 (#0000004D), color/alpha/black-40 (#00000066) → Zwart-alpha bestaat alleen op 30% en 40%
  - Code: `apps/rowtrack/constants/overlay.ts:2` → scrim: 'rgba(0,0,0,0.7)'

- [ ] **Spacing-aliassen '1'/'3'/'5'/'7'/px zonder Figma-equivalent** · `LAAG` · missing-in-design
  - Vijf alias-keys in space verwijzen naar waardes onder een andere naam dan de Figma variables (bv. key '1' levert 4). Verwarrend als bron van waarheid; de numerieke keys 0-48 zelf matchen wel exact.
  - Figma: Variables Core > spacing/* (0,2,4,6,8,10,12,14,16,18,20,22,24,28,32,40,48) → Geen spacing/1, spacing/3, spacing/5, spacing/7 of spacing/px variables
  - Code: `apps/rowtrack/constants/spacing.ts:21` → '1': 4, '3': 12, '5': 20, '7': 28, px: 1

- [ ] **Font family naamverschil: Source Serif Pro (Figma) vs SourceSerif4 (code)** · `LAAG` · token-mismatch
  - Figma gebruikt de oudere 'Source Serif Pro' terwijl code overal Source Serif 4 laadt. Het zijn verschillende releases van dezelfde typeface met licht afwijkende metrics; waarschijnlijk pragmatisch (Pro staat niet meer op Google Fonts) maar het Figma-bestand is dan niet 1-op-1 de renderende font.
  - Figma: Variables Core > fontFamily/sourceSerif; alle type/* text styles → 'Source Serif Pro'
  - Code: `apps/rowtrack/constants/typography.ts:4` → 'SourceSerif4_400Regular' e.a. (Source Serif 4 via Expo Google Fonts)

---

## Verificatie-verantwoording

- Elke bevinding is door een onafhankelijke batch-verifier per gebied adversarieel getoetst (opdracht: weerleggen; twijfel = verwerpen). Alle 207 overleefden; de verdicts citeren concrete node-waardes aan beide kanten.
- Volledige ruwe data incl. verdict-motivaties per bevinding: workflow-journal `wf_7629ae0a-e3c` (sessie a3c02de6).
