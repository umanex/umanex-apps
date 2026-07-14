# TODO — RowTrack

_Geconsolideerd op 2026-07-14 uit `HANDOFF.md` (11 open items, 13-jul), de vorige `TODO.md` (PR #66, 12-jun), 4 code-`// TODO`'s, 25 briefings/audits en de `supabase/migrations/`._

Herkomst-tags per item: `[HANDOFF]` · `[PR#66]` · `[code-TODO]` · `[briefing …]` · `[audit …]`.
Prioriteit loopt van boven (meest actiegericht) naar onder (bewust geparkeerd / te re-triageren).

---

## 1. Jeroen-acties buiten de code (klein, deblokkeren de rest)

- [x] **INSERT-policy op `profiles`** — toegepast + geverifieerd 14-jul: `profiles` heeft nu SELECT/INSERT/UPDATE-policies, INSERT met `with_check (auth.uid() = id)`. De `birth_date`-kolom bestond al. `[PR#66]`
- [x] **Migratie `add_total_strokes.sql`** — geverifieerd 14-jul: kolom `workouts.total_strokes` (integer) bestaat al in de DB → niets te doen (no-op). `[briefing 2026-07-14-flow-history-herwerk]`
- [x] **Actions "Read and write permissions"** — gezet + geverifieerd 14-jul (`default_workflow_permissions: "write"` op repo-niveau). `[HANDOFF · next-step]`
- [x] **Tokens-sync round-trip bevestigd** — 14-jul via `workflow_dispatch` (run `29327011562`) end-to-end groen gedraaid: install → build (beide token-sets) → DTCG-guard → typecheck → commit-stap onder `contents: write`. Commit-back was een schone no-op ("code al in sync"), geen bot-commit op main. De literal push van een echte diff is nu óók bewezen: de hero-token-push (`3646cff`) triggerde de CI die de constants terug-committe (`1b45aff`, 14-jul) — round-trip volledig dicht. `[HANDOFF · risico]`
- [x] **Dode workflow verwijderd: `apps/rowtrack/.github/workflows/sync-tokens.yml`** — 14-jul via PR #111 (gemerged naar main). Vervangen door de root `tokens-sync.yml`. `[cleanup]`

## 2. Design tokens — Tokens Studio werk (blokkeert de code-TODO's + hardcodes)

Ontbrekende tokens die nu als hardcode / `// TODO` in code staan. Toevoegen via Tokens Studio → `apps/rowtrack/tokens/tokens.json` → `pnpm tokens:build`, daarna de hardcodes vervangen.

- [ ] **`accent.selected` (0.20) selectie-fill** — richting bevestigd 14-jul: Chip active blijft de **0.20-tint** (audit-"solid" verworpen), dus `{color.alpha.red-20}` is correct. De primitive `color.alpha.red-20` (0.20) **bestaat al** in `tokens.json`; enkel de semantische alias in de `accent`-groep toevoegen via Tokens Studio, dan `pnpm tokens:build` → ik vervang de 2 hardcodes (`Chip.tsx:44`, `GoalSegments.tsx:155`). Snippet: `"selected": { "$type": "color", "$value": "{color.alpha.red-20}" }`. `[HANDOFF · debt]` `[code-TODO]`
- [x] **0.10 accent-tint samengevouwen → `accent.muted`** — 14-jul: beslissing om de header-band-tint (`ActivePhase.tsx`) op `accent.muted` (12%) te zetten i.p.v. een nieuw 0.10-token (2% delta, niet waarneembaar). Hardcode + `// TODO` verwijderd, tsc groen. `[code-TODO]` `[briefing 2026-07-08-feature-landscape-metrics]`
- [x] **Toast-titel `#FFD700` → `achievement.default`** — 14-jul: gelijkgetrokken met de crème achievement-ramp (`MotivationalToast.tsx:200`), tsc groen. ⚠️ zichtbare wijziging (fel goud → crème) — eens eyeballen. De decoratieve `CONFETTI_COLORS`-array (regel 14) blijft bewust hardcoded. `[PR#66]` `[audit laag-flags]`
- [x] **`fontSize.114` + hero-token herbestemmen** — klaar 14-jul. Tokens Studio (door Jeroen): `fontSize.124`(=96) → `114`(=114) + `heroNumeric` → Albert Sans/114 (commit `3646cff`, CI-sync `1b45aff`). Code (door mij): `activeStyles.heroText` → `...typeStyles.heroNumeric`, hardcode 114 + `// TODO` weg. Render identiek (AlbertSans Bold 114, ls -5.13). tsc groen. `[code-TODO]`
- [ ] **Bredere primitieven — grotendeels al aanwezig (herzien 14-jul)** — de alpha-ramp (`red-04/06/08/12/20`, `white-22`, `black-30/40`), de gold-ramp (`gold.100/300/500`) én de `fontWeight`-primitieven bestaan al in `tokens.json`. Nog echt ontbrekend: status/error-semantiek, `scrim`/`scrimStrong`, en `red-10` (enkel als je alsnog een 0.10 wil). Her-scopen tegen wat de code effectief hardcodet. `[audit laag-flags]`
- [ ] **Component-tokenlaag exporteren** — grotendeels niet geëxporteerd: goalPill, kpiTile, prBadge, segmentedControl, splitRow, statusBar, tabBar, textLink (progressBar onvolledig). `[audit laag-flags]`

## 3. Openstaande design-beslissingen (knoop doorhakken)

- [x] **Hero-font active workout → Albert Sans Bold** (beslist 14-jul). Vondst: de code (`activeStyles.heroText`) + alle 6 Figma-frames zijn al Albert Sans Bold 114; de Source Serif serif-hero leefde enkel nog als de **dode, ongebruikte** `heroNumeric`-token. Beslissing = token-laag uitlijnen op die realiteit. Implementatie = 2 Tokens Studio-edits (zie sectie 2, ③-blok) + code-wire door mij. `[briefing 2026-07-13-active-workout-redesign-snapshot]`
- [x] **Split/Watts DOEL-pill copy** — beslist 14-jul op het `{waarde} {eenheid}`-spatie-patroon: split → `2:20 split` (frame-copy overgenomen), watts → `180 W` behouden (Figma's `180W` verworpen als spatie-slip). Gewijzigd in `goalPillValue()`; de dode `buildGoalLabel`-formatter (oude copy, 0 usages) meteen verwijderd. tsc groen. `[HANDOFF · onzekerheid]`
- [ ] **Pill-value bij niet-ronde waarden** — 25:30 → "25 min"? · 7.500m → "7,5 km"? (lowercase units staan vast). `[briefing 2026-07-13-active-workout-redesign-snapshot]`
- [x] **Cyaan vs rood accent → rood wint** (beslist 14-jul). Geverifieerd: cyaan (#00D4FF/#00E5FF) staat **nergens** in de code — Profile + GoalSetupModal gebruiken al `accent.default` (rood). Cyaan was een Figma-only artefact. Geen code-wijziging. ⏳ Rest: Figma-frames opruimen (cyaan → rood/neutraal in Profile-sheets + toast, jouw hand). `[audit 2026-07-04 · cluster 2]`
- [ ] **Connected-status: rood (Figma) vs groen (code)** incl. Verbreek-actie — merk-kleur of verkeerslicht-semantiek, en welke bron bijwerken? `[audit 2026-07-04 · cluster 7]`
- [ ] **`Button.sizeLg` (44) vs `buttonTokens.primary.height` (48)** — gedeeld component, nu bewust niet aangeraakt. `[HANDOFF · onzekerheid]`
- [ ] **`Icon` default kleur `#FFFFFF`** — semantisch zou dat `fg.primary` (#F2F4FA) zijn; wijzigt visuals licht. `apps/rowtrack/components/Icon.tsx:12`. `[PR#66]`
- [ ] **Profile-datumpicker** — erft-ie de trainings-wheel-restyle, of krijgt-ie een eigen `surfaceColor`/`visibleRows`-prop? `[HANDOFF · onzekerheid]`

## 4. Active-workout redesign — render-verificatie hangt

Code is gebouwd (spec-parity ok), maar **live render-parity niet gedraaid**. Mock-pad bestaat: `apps/rowtrack/app/dev-active.tsx` (`rowtrack://dev-active?goal=none|duration|distance|split|watts`).

- [ ] **5 doel-varianten live render-verifiëren** (portrait) via het mock-pad tegen de Figma-frames. `[briefing 2026-07-13-component-active-hero-labels / -redesign / -resync]`
- [ ] **Landscape active-workout render-verifiëren** — sim roteren (Cmd+→) met het mock-pad, of een `?orientation`-forcering toevoegen. `[HANDOFF · next-step]`
- [ ] **Live Figma text-style re-verify** — Desktop Bridge heropenen → `figma_get_text_styles` diffen tegen de code-typeStyles. `[HANDOFF · onzekerheid]`

## 5. History-flow herwerk — validatie-status hangt

Code is gemerged (`3b223b2`), maar de briefing staat op `gepland` met een niet-afgevinkte 11-item acceptatie-checklist.

- [ ] **HR-detail (Figma 38:5115) visueel verifiëren** — KPI's + tabelinhoud/kolommen (screenshot bij bouwstap 1). `[briefing 2026-07-14-flow-history-herwerk]`
- [ ] **Snelste/gemiddelde split** live uit de per-split-reeks afleiden en tegen de Figma-waarden checken bij render (tienden). `[briefing 2026-07-14-flow-history-herwerk]`
- [ ] **Acceptatie-checklist formeel afvinken** (lijst 5:6, detail-header, overzicht 5:7, splits 38:5009, HR 38:5115, tienden-fallback, states, interactie, parity-render) → status naar `gevalideerd`. `[briefing 2026-07-14-flow-history-herwerk]`
- HR-tabel + slagen gelden enkel voor **nieuwe** workouts; bestaande blijven leeg (bewust).

## 6. Bewust geparkeerde debt (niet bouwen tenzij het opduikt)

- [ ] **Best-2000m: BLE-reconnect midden in workout re-baselinet niet** — bij een reële erg: op reconnect de baseline opnieuw zetten en de reeks in een nieuwe run laten starten. Nu bewust niet gebouwd. `[HANDOFF · debt]`
- [ ] **`best_2k_seconds` is een bevroren afgeleide** — bij semantiek-wijziging een script dat het (en 500m/1k/5k) uit `samples` herberekent voor alle rijen. `[HANDOFF · aanname]`
- [ ] **Segment-breedte snapt** (Fabric layout-animatie taboe) — opnieuw proberen bij latere Reanimated/Fabric-versie, of gelijk-brede segmenten + schuivende-pill. NB: Reanimated is intussen toegevoegd. `[HANDOFF · debt]`
- [ ] **WheelPicker spring / segment-layout-transities** — buttery-smooth transities vereisen Reanimated + native dev-client rebuild; beslissing bij Jeroen. `[briefing 2026-07-10-component-wheel-animations]`

## 7. Kleine refactors (akkoord nodig vóór uitvoering)

- [ ] **BleStatusBar + HrStatusBar samenvoegen** — `apps/rowtrack/components/BleStatusBar.tsx` en `HrStatusBar.tsx` zijn vrijwel identiek; één generieke statusbar met type/icon/label props (beide bevatten ook hardcoded spacing/fontSizes zonder token). `[PR#66]`
- [ ] **Dubbele Bluetooth-permissions in `app.json`** — bevestigd: elke Android-permission staat er 2× in; duplicaten verwijderen (config-wijziging). `[PR#66]`
- [ ] **`expo-secure-store`** als auth storage adapter overwegen i.p.v. AsyncStorage (huidige setup acceptabel). `[PR#66 · laag]`
- [ ] **Wachtwoord-minimum** bij registratie van 6 → 8 tekens. `[PR#66 · laag]`

## 8. Achterhaald / opnieuw te triageren

- [x] **Re-triage `briefings/2026-07-04-audit-design-vs-code.md`** — gedaan 14-jul (12 gebied-verifiers, elk item tegen huidige code). Resultaat in **`briefings/2026-07-14-retriage-audit-design-vs-code.md`**: **130/215 (60%) obsoleet** (resolved/moot door de redesigns); **85 netto open** (58 discrepanties + 27 bron-keuzes) die collapsen tot **7 werkstromen**. Concentratie: Profile-sheets (23), tokens (12), gedeelde chrome (10), overlays (7). ✅ Het conflict rond §2 ① is beslist (14-jul): Chip active-state = **0.20-tint** (idle-v2 wint, audit-"solid" is stale) → `accent.selected` is gedeblokkeerd. `[audit 2026-07-04]`
- [ ] **Coverage-gaten uit die audit** — auth-schermen (`login.tsx`/`register.tsx`) hebben geen Figma-design en zijn nooit geaudit (raakt ook `FormField.tsx`, `ErrorMessage.tsx`); `GoalSetupModal` + verbindings-overlay missen design; dode componenten (Card, MetricDisplay, SummaryRow, PeriodGoalCard, GoalInput) opruimen na bevestiging. `[audit 2026-07-04]`
- [ ] **Figma-map hygiëne** (`briefings/2026-05-11-audit-figma-sync.md`) — 5 broken refs corrigeren, ongedocumenteerde files toevoegen (BottomSheet, KPI, TabLabel, WheelPicker), deletion-candidates opruimen na bevestiging. Deels ingehaald door latere sync-rondes — verifiëren wat nog geldt. `[audit 2026-05-11]`
- [ ] **`context-snapshot.md` sjabloon invullen** — nog `[TODO]`-placeholders voor Figma key/URL/beschrijving. `[housekeeping]`
- Oude `on hold`-briefings (dashboard 07-mei "blokkades", tabbar 12-mei "in progress") — nooit formeel gesloten; waarschijnlijk ingehaald door later home/history-werk. Checken of ze dicht mogen.
