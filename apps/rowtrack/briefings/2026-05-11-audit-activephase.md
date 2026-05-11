# Audit — ActivePhase (Phase 1.5) — 2026-05-11

## Summary

- **Component:** `components/workout/ActivePhase.tsx`
- **Figma varianten geauditeerd:** 10 (5 portrait × 5 goalType + 5 landscape × 5 goalType)
- **Summary screen:** geen Figma node-id in figma-map.md — niet volledig geauditeerd
- **Deviations totaal:** 20 autonoom / 6 voorleggen

---

## Portrait — gedeelde deviations

### Doel-pill (`portraitStyles.doelPill*`)

- **Figma:** https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=85-2341 (Landscape/None pill — zelfde structuur als portrait)

| Stijl | Code | Figma | Fix |
|---|---|---|---|
| `doelPill.borderColor` | `rgba(240,84,84,0.3)` | `accent.muted` = `rgba(240,84,84,0.12)` | [autonoom] |
| `doelPill.paddingHorizontal` | `space['12']` (12) | `spacing/16` = 16 | [autonoom] → `space['16']` |
| `doelPill.gap` | `space['8']` (8) | `spacing/16` = 16 | [autonoom] → `space['16']` |
| `doelPill.borderRadius` | `18` (hardcoded) | `borderRadius/lg` = 18 | [autonoom] → `radii.lg` |
| `doelPillDivider.backgroundColor` | `rgba(240,84,84,0.3)` | `fg.quaternary` (#5c606b) | [autonoom] |
| `doelPillValue` font | `typeStyles.labelGoalPrefix` (AlbertSans SemiBold 11px) | `type/kpiValue` (SourceSerif Regular 16px, tracking -0.4) | [autonoom] → `typeStyles.kpiValue` |

- [voorleggen] Pill niet gerenderd als `goal === null` — code: `{goal && <doelPill>}`. Figma toont altijd een pill, met "Geen doel" als er geen doel is. Intentionele UX-keuze of oversight?

### Hero timer kleur

- **Code:** `portraitStyles.heroText.color: fg.primary` (#F2F4FA) voor alle varianten
- **Figma:** inconsistent per variant — Portrait/None toont `text-white` (fg.onAccent = #fff via containerovererving); Landscape/Duration/Distance/Split tonen `fg.primary`; Landscape/Watts toont expliciet `fg.onAccent`
- [voorleggen] Figma heeft hier zelf inconsistente waarden. Align naar `fg.onAccent` voor alle hero-teksten (witter contrast op donkere bg), of `fg.primary` als pragmatische keuze accepteren?

### Progressbalk (`portraitStyles.progressTrack` + `activeStyles.progressTrack`)

Beide style-objecten hebben dezelfde problemen; `portraitStyles` is portret-specifiek, `activeStyles` wordt gebruikt door `renderTopSection()` (landscape).

- [autonoom] `progressTrack.backgroundColor: border.strong` → moet `progressBar.trackColor` zijn. Figma: `var(--progressbar/trackcolor,#c9b894)`. Van toepassing op Duration + Distance-varianten.
- [autonoom] `progressTrack.borderRadius: 1` → Duration/Distance: moet `radii.lg` (18) zijn. Split/Watts: moet `6` zijn (Figma: `rounded-[6px]` — geen token, hardcoded in Figma zelf).

### Subtitle-tekst voor null/split/watts (`portraitStyles.subtitleText`)

- **Code:** `{ ...typeStyles.labelGoalPrefix, color: fg.tertiary }` — AlbertSans SemiBold 11px, fg.tertiary (#8b8f9a)
- **Figma:** `type/activeProgress` (SourceSerif Regular 28px, tracking -0.84) + white (`text-white`)
- [autonoom] Fix: `{ ...typeStyles.activeProgress, color: fg.onAccent }` — geldt voor:
  - goalType null: "X m geroeid"
  - goalType split: "Je bent X sec sneller/trager"
  - goalType watts: "Je levert X W meer/minder dan je doel"

  NB: `portraitStyles.subtitleRowText` (voor duration + distance) gebruikt al correct `typeStyles.activeProgress + fg.onAccent`. Het is alleen `subtitleText` (de enkelvoudige tekst voor de andere goal types) die afwijkt.

### Portrait KPI-rijen (`portraitStyles.kpiRow`)

| Stijl | Code | Figma | Fix |
|---|---|---|---|
| `borderWidth` | ontbreekt | `1px solid border.default` | [autonoom] voeg toe: `borderWidth: 1, borderColor: border.default` |
| `borderRadius` | `componentRadius.cardSm` (12) | `borderRadius/sm` = `radii.sm` (8) | [autonoom] → `radii.sm` |
| `paddingHorizontal` | `18` (hardcoded) | `spacing/18` = 18 ✓ waarde klopt | [autonoom] → `space['18']` (tokenref) |

- [voorleggen] `kpiValue.fontFamily: fontFamily.sourceSerifSemiBold` — Figma `type/kpiValue` spec is Regular. Dit is dezelfde systeem-brede tokenspanning als in de hoofdaudit. Zie "Systeem-brede token-definitie issues" in `2026-05-11-audit-figma-sync.md`.

### Stop-knop (portrait)

- **Code:** custom `TouchableOpacity` met inline styling (`portraitStyles.stopButton`)
- **Figma:** gebruikt de `Button/Primary` component
- [voorleggen] Inconsistentie in aanpak: landscape gebruikt `<Button variant="destructive">` (component), portrait gebruikt custom TouchableOpacity. Samenvoegen naar `<Button>` component voor portrait?

---

## Landscape — gedeelde deviations

### Layout (`landscapeStyles`)

- [autonoom] `landscapeStyles.leftTop.gap: 16` hardcoded → `space['16']`
- [autonoom] `landscapeStyles.root.gap: 40` hardcoded → `space['40']` (token bestaat: `space['40'] = 40`)

### Null goal in landscape: ontbrekende subtitle

- **Figma Landscape/None (5:4):** toont "1.234 m" onder de hero-timer in `type/activeProgress` style (28px Regular, white)
- **Code `renderTopSection()`:** rendert alleen timer + (optioneel) pill + progressbalk. Geen subtitle voor null goal.
- [autonoom] Voeg null-goal subtitle toe aan `renderTopSection()`: analoog aan portrait null case maar dan in `activeProgress + fg.onAccent` stijl.

### Progress fill-kleur in landscape (`renderTopSection`)

- **Code `renderTopSection()`:** `activeStyles.progressFill` heeft altijd `backgroundColor: accent.default` (rood). Geen split/watts kleurlogica.
- **Figma Landscape/Split:** `#4caf50` (groen) — **Figma Landscape/Watts:** `#fe9429` (oranje)
- [autonoom] `renderTopSection()` heeft dezelfde split/watts kleurlogica nodig als `renderPortrait()`. Fix: voer `progressBarColor`-berekening ook in `renderTopSection()` door.

---

## Landscape KPI-component (`components/KPI.tsx`)

Gebruikt in landscape `renderKPIs(compact)`.

- **Figma KPI-card:** `bg.elevated`, `border: 1px border.default`, `borderRadius: borderRadius/sm = 8`, `px: spacing/18 = 18`, `py: spacing/12 = 12`

| Stijl | Code | Figma | Fix |
|---|---|---|---|
| `borderWidth` | ontbreekt | `1` | [autonoom] `borderWidth: 1, borderColor: border.default` |
| `borderRadius` | `componentRadius.cardSm` (12) | `borderRadius/sm` = `radii.sm` (8) | [autonoom] → `radii.sm` |
| `paddingHorizontal` | `16` (hardcoded) | `spacing/18` = 18 | [autonoom] → `space['18']` |

- [voorleggen] Landscape KPI-volgorde in code: Watt, SPM, Split, Afstand, KCAL + conditionele BPM. Figma Landscape/None: Split 500/M, Watt, SPM, BPM, Afstand, KCAL (BPM altijd aanwezig, niet conditioneel). Intentioneel of oversight?

---

## Landscape varianten — extra bevindingen

### Landscape/Split + Watts — progressbalk radius

- Zelfde probleem als portrait: `borderRadius: 1` → moet `6` zijn. (Zie Portrait — Progressbalk sectie hierboven.)

### Landscape/Duration + Distance — progressbalk kleur

- Zelfde probleem als portrait: `border.strong` → moet `progressBar.trackColor`. (Zie Portrait — Progressbalk sectie.)

### Landscape/Watts — hero kleur

- Figma toont expliciet `fg.onAccent` (white) voor de "170 W" hero-tekst, terwijl Duration/Distance/Split `fg.primary` tonen. Dit is een Figma-inconsistentie (zelfde `voorleggen` item als portrait hero kleur).

---

## Summary screen (`summaryStyles`)

- Geen Figma node-id in `figma-map.md` — niet geauditeerd in deze pass.
- **Enige bevestigde afwijking:**
  - [autonoom] `summaryStyles.kpiUnit.fontFamily: fontFamily.sourceSerifItalic` → moet `typeStyles.kpiUnit` zijn (Regular). Zelfde fix als `WorkoutCard.tsx`.
- Overige summary-stijlen (`dateText`, `prText`, `statsRow`, etc.) wachten op Figma node-id.

---

## Systeem-brede items (geen code-fix mogelijk)

Deze zijn dezelfde als gerapporteerd in `apps/rowtrack/briefings/2026-05-11-audit-figma-sync.md`:

| Token | Code | Figma verwacht | Impact in ActivePhase |
|---|---|---|---|
| `typeStyles.kpiValue.fontFamily` | `SourceSerif4_400Regular` | SemiBold (600) | `portraitStyles.kpiValue` gebruikt SemiBold expliciet — omzeilt het probleem maar is inconsistent |
| `typeStyles.textLink.fontFamily` | `SourceSerif4_400Regular_Italic` | Regular (400) | Niet direct gebruikt in ActivePhase |

---

## Overzicht deviations

**Autonoom (20):**

| # | Locatie | Wat |
|---|---|---|
| 1 | `doelPill.borderColor` | `rgba(0.3)` → `accent.muted` |
| 2 | `doelPill.paddingHorizontal` | `space['12']` → `space['16']` |
| 3 | `doelPill.gap` | `space['8']` → `space['16']` |
| 4 | `doelPill.borderRadius` | `18` hardcoded → `radii.lg` |
| 5 | `doelPillDivider.backgroundColor` | `rgba(0.3)` → `fg.quaternary` |
| 6 | `doelPillValue` font | `labelGoalPrefix` → `kpiValue` |
| 7 | `portraitStyles.subtitleText` | `labelGoalPrefix + fg.tertiary` → `activeProgress + fg.onAccent` |
| 8 | `progressTrack.backgroundColor` (portrait + landscape) | `border.strong` → `progressBar.trackColor` |
| 9 | `progressTrack.borderRadius` (portrait + landscape) | `1` → `radii.lg` (dur/dist) / `6` (split/watts) |
| 10 | `kpiRow` (portrait) missing border | voeg `borderWidth: 1, borderColor: border.default` toe |
| 11 | `kpiRow.borderRadius` (portrait) | `cardSm (12)` → `radii.sm (8)` |
| 12 | `kpiRow.paddingHorizontal` (portrait) | `18` hardcoded → `space['18']` |
| 13 | `landscapeStyles.leftTop.gap` | `16` hardcoded → `space['16']` |
| 14 | `landscapeStyles.root.gap` | `40` hardcoded → `space['40']` |
| 15 | Landscape null goal subtitle | ontbreekt — toevoegen in `renderTopSection()` |
| 16 | Landscape progress fill kleur | altijd `accent.default` → split/watts kleurlogica toevoegen |
| 17 | `KPI.tsx` missing border | `borderWidth: 1, borderColor: border.default` |
| 18 | `KPI.tsx` borderRadius | `cardSm (12)` → `radii.sm (8)` |
| 19 | `KPI.tsx` paddingHorizontal | `16` → `space['18']` |
| 20 | `summaryStyles.kpiUnit` font | `sourceSerifItalic` → `typeStyles.kpiUnit` |

**Voorleggen (6):**

| # | Vraag |
|---|---|
| V1 | Pill tonen bij `goal === null` met "Geen doel"? (Figma: altijd zichtbaar) |
| V2 | Hero-tekst kleur: `fg.primary` (code) vs `fg.onAccent` (Figma, maar inconsistent per variant) |
| V3 | `kpiValue` SemiBold in code vs Regular in Figma/token-spec (systeem-breed) |
| V4 | Portrait stop-knop: custom `TouchableOpacity` vs `<Button>` component zoals in landscape |
| V5 | Split/Watts progressbalk: `#4CAF50`/`#FE9429` (Figma-exact) vs `status.success`/`status.warning` tokens (andere waarden) |
| V6 | Landscape KPI-volgorde en BPM conditioneel vs Figma (altijd 6 rijen, andere volgorde) |

---

## Matches (✓)

- Hero timer font: `fontFamily.sourceSerifBold + fontSize['124'] + lineHeight * 0.95` ✓ (`type/heroNumeric` = Bold 700)
- `subtitleRow` (duration/distance): `typeStyles.activeProgress + fg.onAccent` ✓
- `subtitleDivider`: `fg.quaternary` ✓
- `kpiLabel` (portrait): `typeStyles.labelGoalPrefix + fg.secondary` ✓
- `doelPillLabel` ("DOEL" tekst): `typeStyles.labelGoalPrefix + fg.secondary` ✓
- `stopButtonText`: `typeStyles.buttonPrimary + fg.onAccent` ✓
- Landscape root padding: via `styles.container` + `layout.screenHorizontal` ✓
- Landscape KPI label: `typeStyles.labelGoalPrefix + fg.secondary` ✓
- Landscape KPI value: `typeStyles.kpiValue + fg.primary` (via KPI component) ✓ (font-stijl kwestie apart)
- Pill height `40`, gap-structuur DOEL-tekst ✓
- Split/Watts hero-tekst formaat ✓
- Duration/Distance hero-tekst (resterende tijd/afstand) ✓
- KPI-volgorde per goal type (portrait) ✓
