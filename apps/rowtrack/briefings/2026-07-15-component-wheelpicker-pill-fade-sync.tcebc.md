# TC-EBC — WheelPicker: zichtbare pill + fade sync (Figma → code)

- **Datum:** 2026-07-15
- **Type:** component
- **Project:** rowtrack
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd
- **Richting:** Figma → code (source-of-truth = Figma, aangepast door Jeroen)

---

```
TASK:        Sync de code-WheelPicker aan het aangepaste Figma-design:
             zichtbare pill (met border) + fade naar de surface-kleur.
CONTEXT:     Jeroen paste de IdlePhase-wheel aan tot component-sets met Single/
             Date-varianten (377:2678 = mét fade, 402w; 377:2707 = basis, 350w)
             en verving de profiel-sheet-bodies ermee. Bron: components/
             WheelPicker.tsx — gedeeld door de goal-input én de 6 profiel-sheets.
ELEMENTS:    Pill (Selected) — nu zichtbaar: fill surface-afhankelijk
             (screen bg.base → pill bg.raised; sheet bg.raised → pill bg.base),
             `border.strong` 1px stroke, radius `radii.sm` (8). Fade → surface-
             kleur (screen bg.base; sheet bg.raised i.p.v. bg.elevated). Date-
             picker: de gedeelde band (profile.tsx datePickerBand) krijgt dezelfde
             pill-stijl (bg.base + border.strong + radius 8).
BEHAVIOUR:   Ongewijzigd — snap-scroll + haptic. Enkel visueel: pill + fade
             worden zichtbaar/correct (waren onzichtbaar: bg.raised op bg.raised).
CONSTRAINTS: Token-only (bg.base/raised, border.strong, radii.sm); geen gedrags-
             wijziging; raakt de gedeelde WheelPicker → goal-wheel + alle sheet-
             wheels tegelijk. Native/runtime-verify op sim/toestel (geen web).
```

---

## Open vragen

_(geen — de delta is volledig afgeleid uit de Figma-specs: pill fill/stroke/radius + fade-stops, alle token-gebonden.)_

## Aannames

- [ASSUMPTION] `surface`-optie `'elevated'` → hernoemd naar `'raised'` (matcht de echte sheet-bg `bg.raised`); de 6 profiel-sheet-call-sites volgen mee.
- [ASSUMPTION] Date-picker houdt `showPill=false` per kolom; de gedeelde `datePickerBand` in profile.tsx wordt de zichtbare pill (bg.base + border.strong + radius 8).

## Acceptatie

- [x] WheelPicker pill: `border.strong` 1px stroke + radius `radii.sm` (8); fill = `SURFACE[surface].pill` (base→bg.raised, raised→bg.base) — `components/WheelPicker.tsx`
- [x] Fade opaque-kleur = surface-bg: base→`bg.base`, raised→`bg.raised` (was bg.elevated) — `SURFACE`-map
- [x] `surface` prop `'elevated'`→`'raised'`; alle call-sites (profile.tsx ×5) bijgewerkt
- [x] `datePickerBand` (profile.tsx) → bg.base + border.strong 1px + radius radii.sm
- [x] `tsc --noEmit` groen; token-only (geen hardcoded)
- [x] **Runtime-verify op sim/toestel** — geslaagd op iPhone 17 Pro sim (2026-07-15). Goal-wheel (`surface='base'`): zichtbare pill `bg.raised` + border. Lengte-sheet (`surface='raised'`): zichtbare pill `bg.base`-inset + border + fade (1 neighbor/kant, vervaagt). Beide surfaces bevestigd via `simctl io screenshot`.

## Beslissingsgeschiedenis

- 2026-07-15: aangemaakt — Figma→code tegenhanger van de eerdere code→Figma wheel-exports; Jeroen maakte de pill/fade zichtbaar in Figma (pill fill surface-afhankelijk + border.strong + fade naar surface-kleur), code volgt.
- 2026-07-15: **boot-blocker gefixt onderweg** — de app crashte bij opstarten op `Cannot find native module 'ExpoSecureStore'` (static import van expo-secure-store, module-load-crash, niet opvangbaar). `lib/secureStorage.ts` → lazy `require()` binnen try/catch, zodat een dev-client zonder de native module terugvalt op AsyncStorage. Zónder deze fix was de render-verify onmogelijk (app bootte niet).
- 2026-07-15: **gevalideerd op sim** — beide surfaces (goal-wheel + Lengte-sheet) tonen de zichtbare pill + border + fade zoals in Figma. Status → gevalideerd.
