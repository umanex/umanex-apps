# Figma sync audit — 2026-05-11

## Summary
- 34 unique file references in mapping
- 5 broken mapping refs (wrong path of file non-existent)
- 7 undocumented code files (niet in map)
- 6 files zonder importers (deletion candidates)
- 20 deviations totaal: 11 autonoom / 9 voorleggen

---

## Broken mapping refs

| Map-pad | Probleem |
|---|---|
| `app/(tabs)/workout/index.tsx` | Bestand bestaat als `app/(tabs)/workout.tsx` (path mismatch) |
| `app/(tabs)/profile/index.tsx` | Bestand bestaat als `app/(tabs)/profile.tsx` (path mismatch) |
| `components/TabItem.tsx` → node 86:2769 | Bestand is `components/TabLabel.tsx` (naam mismatch) |
| `components/TabBar.tsx` → node 5:9 | Bestand bestaat niet; map-label "Cards / GoalProgressCard" is ook wrong — node 5:9 IS de TabBar |
| `components/workout/Confetti.tsx` | Bestand bestaat niet, geen node-id |

---

## Ongedocumenteerde files (niet in map)

| Path | Importers (real) | Voorstel |
|---|---|---|
| `components/BottomSheet.tsx` | 1 (profile.tsx) | toevoegen aan map |
| `components/KPI.tsx` | 2 (history screens + ActivePhase) | toevoegen aan map |
| `components/TabLabel.tsx` | 1 (_layout.tsx) | toevoegen als vervanging van TabItem-entry |
| `components/WheelPicker.tsx` | 3 (profile, IdlePhase, lib) | toevoegen aan map |
| `components/PeriodGoalCard.tsx` | 0 | deletion candidate (zie hieronder) |
| `app/(auth)/login.tsx` | 0 van screens | intentioneel buiten scope? |
| `app/(auth)/register.tsx` | 0 van screens | intentioneel buiten scope? |

---

## Deletion candidates (0 real importers buiten barrel)

Bevestigd via grep + JSX-check — geen `<Component` rendering gevonden buiten eigen file en barrel export.

- `components/MetricDisplay.tsx` — alleen `components/index.ts` barrel
- `components/PeriodGoalCard.tsx` — alleen `components/index.ts` barrel
- `components/SectionHeader.tsx` — alleen `components/index.ts` barrel
- `components/SummaryRow.tsx` — alleen `components/index.ts` barrel
- `components/SplitsList.tsx` — alleen `components/workout/index.ts` barrel
- `components/workout/ProgressBar.tsx` — alleen `components/workout/index.ts` barrel; ActivePhase gebruikt het niet

---

## Per-file deviations

### `components/GoalProgressCard.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=64-14031
- **Status:** ⚠ deviations
- **Importers:** 3 (Home screen, Profile screen, barrel)
- **Deviations:**
  - [autonoom] `trackOuter.height: 1` → moet `2` zijn (Figma: `h-[var(--borderwidth/2,2px)]`)
  - [autonoom] `trackOuter.backgroundColor: border.default` → moet `progressBar.trackColor` zijn (Figma: `var(--progressbar/trackcolor,#c9b894)`)
  - [autonoom] `trackOuter.borderRadius: radii.xs` → moet `radii.lg` zijn (Figma: `borderRadius/lg = 18`)
  - [autonoom] `trackFill.height: 1` → moet `2` zijn
  - [autonoom] `trackFill.borderRadius: radii.xs` → moet `radii.lg` zijn

### `components/WorkoutCard.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=56-13791
- **Status:** ⚠ deviations
- **Importers:** 2 (history/index.tsx, barrel)
- **Deviations:**
  - [autonoom] `serifItalic16` const gebruikt `fontFamily.sourceSerifItalic` (Italic) voor "kcal" en "m" eenheden. Figma: `type/kpiUnit` = Regular. Fix: vervang `serifItalic16` door `typeStyles.kpiUnit` (en verwijder const).

### `components/BleStatusBar.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=21-485
- **Status:** ⚠ deviations
- **Importers:** 2 (IdlePhase, barrel)
- **Deviations:**
  - [voorleggen] `actionText` en `actionMuted` gebruiken hardcoded `fontFamily: 'SourceSerif4_400Regular'` (Regular). `typeStyles.textLink` bestaat maar genereert Italic (`SourceSerif4_400Regular_Italic`). Figma toont Regular voor de knoptekst. Vraag: fix token definitie in Figma plugin sync (zodat textLink → Regular), dan code updaten naar `typeStyles.textLink`? Of acceptabel zo?

### `components/HrStatusBar.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=21-515
- **Status:** ⚠ deviations
- **Importers:** 2 (IdlePhase, barrel)
- **Deviations:**
  - [voorleggen] Zelfde probleem als BleStatusBar: `actionText` en `actionMuted` hardcoded Regular vs typeStyles.textLink (Italic). Zelfde vraag.

### `components/workout/IdlePhase.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1506 (variant: goalType=none)
- **Status:** ⚠ deviations
- **Importers:** 1 (app/(tabs)/workout.tsx)
- **Deviations:**
  - [autonoom] `geenText` stijl: code gebruikt `typeStyles.italicConnector, color: fg.secondary`. Figma toont SemiBold 16px wit (`type/kpiValue`, `fg.primary`). Fix: vervang door `typeStyles.kpiValue, color: fg.primary`.
  - [autonoom] Hardcoded spacing-waarden door heel de component: `paddingHorizontal: 20`, `paddingBottom: 20`, `gap: 20`, `gap: 8` (toestelSection, barsStack, doelSection, doelHeader, pickerArea, recentsSection, chipRow, ctaArea). Vervangen door resp. `space['20']` en `space['8']`.
  - [voorleggen] `<View style={styles.divider} />` (1px `border.default`) staat tussen Toestellen en Doel secties, maar Figma heeft geen divider — de secties vloeien direct in elkaar over via gap. Intentioneel toegevoegd of moet weg?

### `app/(tabs)/index.tsx`
- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=16-159
- **Status:** ⚠ deviations
- **Importers:** screen (root)
- **Deviations:**
  - [autonoom] `serifItalic16` const overridedt `typeStyles.kpiUnit` met italic font voor PR-eenheden ("km", "min"). Figma: Regular. Fix: vervang `serifItalic16` door `typeStyles.kpiUnit` direct (en verwijder const).
  - [voorleggen] `greeting` stijl: gebruikt `fontFamily.sourceSerifItalic` (Source Serif Italic). Figma toont `fontFamily/newsreader` (Newsreader Italic). Newsreader staat niet in de token-set / fontFamily constants. Intentionele substitutie (Source Serif als fallback), of Newsreader nog toe te voegen?

### `components/workout/ActivePhase.tsx`
- **Figma:** portrait/landscape/summary variants (node 5:3, 42:5387, etc.)
- **Status:** ⚠ niet geauditeerd in deze pass
- **Importers:** 1 (app/(tabs)/workout.tsx)
- **Deviations:** Niet geïnspecteerd — component is complex (portrait + landscape + summary + 5 goalType variants). Aparte audit-pass nodig.
- **Open vragen:**
  - Alle variant node-ids staan in figma-map.md — zijn die up to date?

---

## Systeem-brede token-definitie issues (voorleggen)

Deze zijn NIET oplosbaar via code-fixes alleen — ze vereisen correctie in `tokens.json` via Figma plugin sync, gevolgd door `pnpm tokens:build`.

| Token | Code (gegenereerd) | Figma verwacht | Gebruikt in |
|---|---|---|---|
| `typeStyles.kpiValue.fontFamily` | `SourceSerif4_400Regular` (Regular) | SemiBold (600) | BleStatusBar label, WorkoutCard values, GoalProgressCard values, ... |
| `typeStyles.textLink.fontFamily` | `SourceSerif4_400Regular_Italic` (Italic) | Regular (400) | BleStatusBar/HrStatusBar actietekst |

→ Vraag: wil je dat ik de tokens.json discrepanties oplijst voor de Figma plugin sync, of is dit bewust (hebben de tokens een andere betekenis dan de Figma-componentnaam doet vermoeden)?

---

## Map-fixes (autonoom uitvoerbaar)

| Huidige entry | Correctie |
|---|---|
| `app/(tabs)/workout/index.tsx` | `app/(tabs)/workout.tsx` |
| `app/(tabs)/profile/index.tsx` | `app/(tabs)/profile.tsx` |
| `components/TabBar.tsx` node 5:9, label "Cards / GoalProgressCard" | Label → "TabBar"; pad → nog te beslissen (zie voorleggen) |

---

## Files die kloppen (✓)

- `components/Button.tsx` — gebruikt `buttonTokens.*` en `typeStyles.buttonPrimary` correct; ✓
- `components/Dot.tsx` — `space['4']` ✓
- `components/Subtitle.tsx` — `typeStyles.labelSection`, `border.strong`, `space['12']`, `space['16']` ✓
- `components/GoalProgressCard.tsx` (typography) — `typeStyles.sectionValue`, `typeStyles.italicConnector`, `typeStyles.labelSection` correct gebruikt ✓ (alleen de progress track heeft deviations)
- `components/BleStatusBar.tsx` (layout) — `bg.elevated`, `border.default`, `componentRadius.cardSm`, `border.strong`, height/padding structuur ✓
- `components/HrStatusBar.tsx` (layout) — zelfde als BleStatusBar ✓
- `components/WorkoutCard.tsx` (layout) — `space['20']`, `space['16']`, `space['8']`, `space['6']`, `border.subtle`, `fg.onAccent` correct ✓
- `app/(tabs)/index.tsx` (layout + tokens buiten serifItalic16) — space-tokens gebruikt ✓
