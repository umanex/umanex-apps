# TC-EBC — Geslacht-sheet segmented control + input border-radius

**Datum:** 2026-07-15
**Type:** component
**Project:** RowTrack
**Klant:** umanex (eigen product)
**Status:** gevalideerd

---

```
TASK:        De segmented control (Man/Vrouw/Anders) in de Geslacht-sheet correct
             renderen — actieve pill binnen de track, geen overflow/clipping — en de
             border-radius van tabs & inputs terugbrengen naar de Figma-spec.
CONTEXT:     Profielscherm (node 354-2004) → Geslacht-sheet (segmented 52:9155 / 52:9730).
             Regressie: actieve "Man"-pill steekt buiten de track (linkerrand geclipt),
             radius van segmented-track én profiel-inputs wijkt af van design.
ELEMENTS:    Segmented control (track + 3 segmenten + actieve pill), profiel-rij-inputs
             (VOORNAAM/EMAIL/GESLACHT/... met chevron), sheet-container, Opslaan-knop.
BEHAVIOUR:   Tap op segment selecteert het; actieve segment krijgt accent-fill + label-
             kleur; pill blijft binnen de track met correcte inset; niet-actieve segmenten
             tonen neutrale label-kleur.
CONSTRAINTS: iOS (fysiek + sim), dark mode, portrait. Token-only (radius/fill/spacing uit
             tokens.json). Geen hardcoded radii. Fabric/Reanimated layout-animatie taboe
             (bekende segment-breedte-snap, zie HANDOFF 2026-07-10).
```

---

## Open vragen
- Geen blokkerende — spec wordt live uit Figma (Desktop Bridge) geverifieerd vóór de fix.

## Aannames
- [WEERLEGD] De "overflow" van de actieve pill was géén radius-probleem maar een clip: de body-`ScrollView` in `BottomSheet` hugt zijn content niet (RN/Yoga-valkuil met `flexShrink:1` in een `maxHeight`-container) en collapse'te ~8px te kort. De radius-mismatch (pill 8 i.p.v. 4) bestond óók, maar was niet de clip-oorzaak.
- [BEVESTIGD] Segmented control is variabele-breedte-per-label (Figma-look), niet gelijk-brede segmenten (HANDOFF 2026-07-10).
- [BEVESTIGD] `useSafeAreaInsets()` geeft binnen een RN `<Modal>` `bottom: 0` → safe-area moet via `initialWindowMetrics` gehaald worden.

## Acceptatie
- [x] Actieve pill valt volledig binnen de segmented-track (geen clipping) — root cause was de `BottomSheet`-ScrollView, opgelost met `flexShrink: 0`.
- [x] Border-radius van de segmented-track (8) + actieve pill (4, `radii.xs`) matcht Figma `52:9155`.
- [x] Border-radius van de sheet-inputs 12 → 8 (`radii.sm`) matcht Figma `52:9892` (+ fill `bg.base`, border `border.strong`).
- [x] Actieve segment: 0.20 accent-tint + rode border + rode SemiBold tekst; inactief: grijs Regular (`fg.tertiary`) — matcht Figma.
- [x] Tap-selectie werkt; geen layout-snap/jump.
- [x] Geen nieuwe hardcoded radii/fills — alles via tokens (0.20-tint blijft bekende HANDOFF-debt).
- [x] Geverifieerd op render-pad: iOS-sim screenshots + fysiek toestel (Geslacht + Doel + Email keyboard-open).
- [x] Sheet-achtergrond `bg.elevated` → `bg.raised` (Figma sheet-fill).
- [x] Sheet reikt tot de schermrand (geen scrim-gap) + padding onder de submit-knop (safe-area hersteld).
- [x] Keyboard-open: sheet tilt boven het toetsenbord, knop ~space['20'] erboven, bg-extensie dekt de gap — geverifieerd op fysiek toestel.
- [x] `tsc --noEmit`: 0 errors.

## Beslissingsgeschiedenis
- 2026-07-15: TC-EBC aangemaakt n.a.v. gerapporteerde overflow van de actieve pill + gewijzigde radius op tabs/inputs.
- 2026-07-15: Root cause pill-"overflow" verlegd van radius naar de `BottomSheet`-ScrollView (hug-collapse) — `flexShrink: 1 → 0`. Radius-mismatch (pill → 4) apart gecorrigeerd.
- 2026-07-15: Scope uitgebreid met sheet-bg (`bg.raised`) + herschrijving keyboard-afhandeling in `BottomSheet` (KeyboardAvoidingView → `Keyboard`-events + bg-extensie + `initialWindowMetrics` safe-area) n.a.v. 2 layout-bugs in de Email-sheet.
