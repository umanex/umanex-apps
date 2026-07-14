# Re-triage — Design vs. code audit (2026-07-04)

**Uitgevoerd:** 2026-07-14 tegen de huidige code (`main`).
**Methode:** 12 gebied-verifiers (multi-agent), elk item van `2026-07-04-audit-design-vs-code.md` conservatief tegen de huidige code getoetst en geclassificeerd als `resolved` / `moot` / `still-open` / `decision-needed`.
**Waarom:** het originele 214-item beslisdocument dateert van vóór de active-workout redesign, history-herwerk, WheelPicker-redesign, IdlePhase goal-v2 en de token-pipeline-reworks. Meerdere headline-claims bleken al achterhaald.

---

## Netto-resultaat

| Gebied | resolved | still-open | decision | moot | totaal |
|---|--:|--:|--:|--:|--:|
| Home | 10 | 2 | 2 | 1 | 15 |
| Workout — Idle-fase | 11 | 1 | 3 | 11 | 26 |
| Workout — Actief portrait | 10 | 0 | 0 | 8 | 18 |
| Workout — Actief landscape | 12 | 1 | 3 | 6 | 22 |
| Workout — Samenvatting | 10 | 3 | 1 | 0 | 14 |
| History — lijst | 9 | 1 | 3 | 1 | 14 |
| History — detail | 11 | 4 | 2 | 3 | 20 |
| Profile + bewerk-sheets | 4 | 16 | 7 | 1 | 28 |
| Overlays & Toast | 4 | 7 | 0 | 2 | 13 |
| Gedeelde chrome | 10 | 5 | 5 | 1 | 21 |
| Design tokens | 4 | 11 | 1 | 0 | 16 |
| Dekkings-gaten | 1 | 7 | 0 | 0 | 8 |
| **Totaal** | **96** | **58** | **27** | **34** | **215** |

**130 van 215 (60%) is obsoleet** (resolved of moot) — de redesigns sinds 4-jul hebben het grootste deel afgehandeld (portrait actief: 0 open). **Netto actioneerbaar: 85 items** (58 discrepanties + 27 bron-keuzes), sterk geconcentreerd in **Profile-sheets (23), tokens (12), gedeelde chrome (10), overlays (7)**.

---

## De 85 open items collapsen tot ~7 werkstromen

Behandel deze, niet 85 losse regels.

1. **Profile-sheet polish-pass (23 items)** — Profile is nauwelijks aangeraakt sinds 4-jul. Concrete mismatches: input-radius 16→12, sheet-padding 20→32, rij-volgorde LICHAAMSGEGEVENS, stepper-styling, chevron glyph vs Ionicons, datumformaat, diverse copy-labels. + 7 bron-keuzes (code-only states/labels). **Grootste enkele brok.**
2. **Token-export laag (12 items)** — overlapt met TODO §2 "component-tokenlaag exporteren": goalPill/kpiTile/prBadge/segmentedControl/splitRow/statusBar/tabBar/textLink niet geëxporteerd, progressBar onvolledig, core-primitieven (red/gold/alpha/fontWeight) niet als code-primitief, legacy typo-sets (Barlow/Inter/mono) zonder Figma-equivalent.
3. **✅ GEDAAN: eenheid tonen op KPI's (14-jul)** — beslist: **design volgen, units weg**. De waarde-formaten dragen de betekenis al (`formatTimerFull` → `1:30:45`/`30:45` self-explanatory timer; label `BPM GEMIDDELD` zegt al BPM). Unit verwijderd op 5 KPI-sites (History-lijst DUUR, History-detail DUUR + BPM×2, Samenvatting DUUR); `KpiSingle.unit` optioneel + conditioneel gemaakt (fixt tegelijk de lege-''-gap). Distance/watts/spm-units blijven. tsc groen.
4. **✅ BESLIST: code-only states behouden (14-jul)** — **code wint, Figma documenteert**. loading/empty/error/not-found (states-zijn-default-principe) + de affordance-labels (versie, MIJN DOEL, DAG/MAAND/JAAR) blijven. Geen code-wijziging; Jeroen voegt ze in Figma toe zodat het design compleet is.
5. **✅ BESLIST: status groen, actie rood (14-jul)** — connected-indicator blijft **groen** (verkeerslicht: groen=connected, rood=connecting/disconnected/error; rood-voor-connected zou het positieve signaal wissen). Actie-tekst Verbind/Verbreek → **accent-rood** (design volgen). Splitst status-kleur van actie-kleur. Code: `DeviceRow.tsx` actionText `fg.secondary`→`accent.default` (tsc groen). Figma: connected-dot naar groen bijwerken.
6. **✅ BESLIST: Chip active-state = 0.20-tint** (14-jul). De 4-jul audit wilde een solide `#F05454` fill; de latere IdlePhase goal-v2 (13-jul, door Jeroen gevraagd) koos de **0.20-tint** + rode border + rode label — en dat wint. De audit-claim "solid" is hier stale. Geen visuele wijziging (code is al de tint). **Deblokkeert TODO §2 ①**: `accent.selected` = `{color.alpha.red-20}` (0.20) is bevestigd correct. Figma-zijde: de solid-fill-chip bijwerken naar de tint.
7. **Off-token design-waarden → Figma tokeniseren (± 6 items)** — `#1A1F2E` (sheet/toast-bg), `#94A3B8` (units/labels), `#AAAAAA` (toast-body), cyaan (al beslist §3). Dit zijn **design-side** afwijkingen: de code volgt de tokens correct → **Figma bijwerken, code laten.**

Overblijvend na deze 7: een handvol echte kleine code-fixes (connector paddingBottom-offset, summary divider-kleur/border, kolom-gaps, Chip/SectionHeader font, delete-knop pijl) + de dekkingsgaten (auth-schermen + GoalSetupModal + connection-overlay zonder Figma-design).

---

## Per gebied — netto open (traceerbaar)

`[O]` = still-open discrepantie · `[B]` = decision-needed bron-keuze.

### Home (4)
- `[O]·L` GoalProgressCard connector `paddingBottom: space['4']` 4px-offset blijft (`GoalProgressCard.tsx:105`) — design wil bottom-aligned zonder offset.
- `[O]·L` Home loading/empty/geen-doel-states bestaan enkel in code (`index.tsx:235-241`) — Figma-zijde niet te verifiëren.
- `[B]·L` PR "snelste split": `fastestSplit` wordt gefetcht maar nooit gerenderd (`usePeriodGoal.ts`, `index.tsx:157`) — 3-koloms Frame-12-variant niet geïmplementeerd; canonieke bron onbeslist.
- `[B]·M` Greeting-font: code `sourceSerifItalic`, design Newsreader Italic (niet in de app geladen) (`index.tsx:318`).

### Workout — Idle-fase (4)
- `[O]·L` Duur-chip labelformaat `1 u 30 min` vs design `1:30 u` (`formatters.ts:131`).
- `[B]·L` Decimaalteken afstand: code komma (NL-correct), design punt (`formatters.ts:150`).
- `[B]·L` Extra device-states (error-retry/spinner) niet in Figma component-set.
- `[B]·L` Off-token slate-kleuren in NudgeRow/Wheel = Figma-side afwijking (code volgt tokens).

### Workout — Actief landscape (4)
- `[B]·M` Duration-variant KPI-lijst toont AFSTAND, design TIJD (`ActivePhase.tsx:354`) — expliciete case, UX-keuze.
- `[O]·M` Doel-pill unit niet italic / niet apart element (format-deel is al opgelost 14-jul).
- `[B]·L` Hero-tekstkleur `fg.onAccent` (wit) overal; design wisselt fg.primary/wit (zelf inconsistent).
- `[B]·L` Watts-variant KPI-label — code leidend-correct; Figma-cleanup.

### Workout — Samenvatting (4)
- `[O]·L` KPI-band-divider `border.default`, design wil `border.strong` (`ActivePhase.tsx:894`).
- `[O]·L` Stats-tabel mist 1px buitenborder (`ActivePhase.tsx:916`).
- `[O]·L` GEM/PIEK-waardekolommen `flex:1` zonder vaste breedte + gap 16 (`ActivePhase.tsx:911/932`).
- `[B]·L` DUUR-cel toont unit die design verbergt → **werkstroom 3**.

### History — lijst (4)
- `[B]·L` TOTALE DUUR unit uur/min getoond, design verbergt → **werkstroom 3** (`history/index.tsx:128`).
- `[B]·L` Loading/empty-states enkel in code → **werkstroom 4**.
- `[O]·L` `Segment.tsx` active-stijl matcht geen Figma-variant — **bevestigd dead code** (0 usages), opruimkandidaat.
- `[B]·L` Font Source Serif Pro (Figma) vs SourceSerif4 (code) — bewuste mapping → **werkstroom 7 / tokens**.

### History — detail (6)
- `[O]·L` Delete-knop mist trailing pijl (Button ondersteunt het nu wél) (`history/[id].tsx:374`).
- `[O]·L` Tabelrijen missen kolom-gap + rechterpadding (`history/[id].tsx:522/573`).
- `[O]·L` DUUR-KPI unit uur/min getoond → **werkstroom 3**.
- `[O]·L` Hartslag-KPI's tonen `bpm`, design niet → **werkstroom 3**.
- `[B]·L` Hartslag-tab conditioneel verborgen; design toont altijd 3 tabs.
- `[B]·L` Loading/empty/not-found-states niet in design → **werkstroom 4**.

### Profile + bewerk-sheets (23) — grootste brok, **werkstroom 1**
- `[O]·M` Segmented control (Geslacht/Doel): bg/​radius/padding/hoogte wijken af (`profile.tsx:842`).
- `[O]·M` BottomSheet padding 20 → design 32 (`BottomSheet.tsx:152`).
- `[O]·M` Rij-volgorde LICHAAMSGEGEVENS: geboortedatum op pos 4 i.p.v. 2 (`profile.tsx:420`).
- `[O]·M` Tekstvelden radius 16 → design 12 (`profile.tsx:815`).
- `[O]·M` Stepper Lengte/Gewicht: knopmaat 56→52, radius, omkaderd waardevak (`profile.tsx:875`).
- `[O]·L` Lijstrij-divider kleur `fg.quaternary` + 16px-inzet; design `#47556E` volle breedte.
- `[O]·L` Chevron Ionicons 16px grijs vs design glyph `›` 20px wit (`profile.tsx:402…`).
- `[O]·L` Copy: `E-mailadres`→`Email`; 4 e-mailsheet-labels wijken af; datumweergave `11 jul 1989`→`11/07/1989`.
- `[O]·L` Opslaan↔Uitloggen gap 20→8; sheet-content gap 16→20-30; huidig-email 16→18px; streefwaarde-unit 16→12px.
- `[O]·L` GoalProgressCard top/bottom borders die design niet toont (`GoalProgressCard.tsx:86`).
- `[B]·L` (7×) code-only labels/states: `MIJN DOEL`-sectielabel, `Geen doel ingesteld`-empty, e-mail-error, `RowTrack v1.0.0`, `DAG/MAAND/JAAR`-koppen → **werkstroom 4**; `#1A1F2E`-bg + wit vs fg.primary → **werkstroom 7**.

### Overlays & Toast (7)
- `[O]·M` MilestoneOverlay heeft geen Figma-design (`MilestoneOverlay.tsx`, figma-map lege node).
- `[O]·L` Toast card-bg `#1A1F2E`, body `#AAAAAA` = design-side non-token → **werkstroom 7**.
- `[O]·L` Confetti palet + vormen (enkel cirkels, geen strips) wijken af; kaarthoogte content-hug vs 340px vast.
- `[O]·L` Scrim hardcoded `rgba(0,0,0,0.85)` omzeilt `overlay.scrim`-token (`MotivationalToast.tsx:180`).

### Gedeelde chrome (10)
- `[B]·M` Connected-indicator groen vs design rood (BLE+HR) → **werkstroom 5** (`BleStatusBar.tsx:21`).
- `[O]·M` Verbreek-actie grijs vs design accent-rood; nu is zelfs connect-actie grijs (`DeviceRow.tsx:99`).
- `[O]·M` Chip active tint vs design solid → **✅ werkstroom 6 beslist: tint wint** (Figma bijwerken).
- `[B]·M` Button trailing-pijl: nu geïmplementeerd (`iconPosition`), mismatch grotendeels resolved — Figma-cleanup rest.
- `[O]·L` Default Chip heeft border die design niet heeft; SectionHeader Inter i.p.v. Albert Sans; TabItem icon-variant niet gebouwd.
- `[B]·L` (3×) status-bar scanning/error-states + Button destructive/ghost-varianten niet in Figma → **werkstroom 4**; default-Chip-labelkleur = Figma-side.

### Design tokens (12) — **werkstroom 2**
- `[O]·M` Component-tokenlaag niet geëxporteerd (goalPill/kpiTile/prBadge/segmentedControl/splitRow/statusBar/tabBar/textLink).
- `[O]·L` progressBar 3/9 tokens; core-primitieven (red/gold/alpha/fontWeight) niet als code-primitief; legacy typo-sets (Barlow/Inter/mono) zonder Figma-equivalent.
- `[O]·L` Diverse code-tokens zonder Figma-variable: `buttonTokens.radius:22`, `radii.3xl/cardSm/modal`, `layout.screenHorizontal/navHeight`, spacing-aliassen `1/3/5/7/px`, `overlay.scrim`, `status`/`blue`.
- `[O]·L` Hardcoded-kleuren steekproef: TabItem/GoalSegments 0.20, Icon `#FFFFFF`, MotivationalToast confetti (deels al TODO §2).
- `[B]·L` Font-naam Source Serif Pro (Figma) vs SourceSerif4 (code) — bewuste mapping.

### Dekkings-gaten (7)
- `[O]·H` Auth-schermen login + register hebben géén Figma-design (+ `FormField`/`ErrorMessage` nergens getoetst).
- `[O]·H` GoalSetupModal (mid-workout doel instellen) heeft géén Figma-equivalent (`ActivePhase.tsx:560`).
- `[O]·M` Connection-overlay tijdens actieve workout zonder design (`ActivePhase.tsx:477-499`).
- `[O]·M` Figma Icons/Targets (72:15000) niet vergeleken met Ionicons in GoalSegments.
- `[O]·L` Figma-only housekeeping: Devices (32:374) + App page title (32:516) ongeverifieerd.

---

## Aanbeveling

Werk de **7 werkstromen** af i.p.v. de 85 losse regels. Volgorde-voorstel: eerst de **beslissingen** (werkstroom 3/4/5/6 — die sluiten ~20 items met een handvol keuzes en deblokkeren §2 ①), dan de **Profile-polish-pass** (werkstroom 1, het grootste concrete blok), dan **token-export** (werkstroom 2, overlapt §2) en de **Figma-side cleanups** (werkstroom 7 + dekkingsgaten, jouw hand in Figma). Het originele `2026-07-04`-document blijft als granulaire bron; dit is de actieve lijst.
