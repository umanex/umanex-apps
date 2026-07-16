# TC-EBC — GoalSheet Figma-sync (wheel + delete + gedeelde Segmented)

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

---

```
TASK:        Voer de Figma-aanpassingen aan de "Doel bewerken"-sheet (388:2256) door in code.
CONTEXT:     components/GoalSheet.tsx (gedeeld home + profiel) ↔ Figma component 388:2256.
ELEMENTS:    BottomSheet: PERIODE/TYPE segmented, STREEFWAARDE, Opslaan, Doel verwijderen.
BEHAVIOUR:   Ongewijzigd gedrag; visueel/interactie-sync.
CONSTRAINTS: RN/Expo, tokens only. Figma 388:2256 = bron.
```

Drie wijzigingen:
1. **STREEFWAARDE** = TextInput → **WheelPicker** (bereik/eenheid per doeltype; save() converteert km/min → m/s).
2. Nieuwe **"Doel verwijderen"**-knop (outline) boven **Opslaan** (nu met arrow); beide in de footer, gap 16.
3. **PERIODE/TYPE tabs → gedeelde `Segmented`-component** ("neem hetzelfde over van Geslacht") — ook het
   Geslacht-veld op het profiel gebruikt nu `Segmented`; de gedupliceerde segmented-styles zijn weg.
   Veld-labels naar Albert Sans SemiBold 13, fg.secondary, uppercase (Figma).

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: streefwaarde-bereiken (distance 1–500 km step 1 · duration 5–600 min step 5 · workouts 1–100)
  zijn zinvolle defaults; niet in de Figma gespecificeerd — bij te stellen indien gewenst.]

## Acceptatie

- [x] STREEFWAARDE is een WheelPicker (init op de huidige waarde; km/min/sessies-eenheid)
- [x] "Doel verwijderen"-knop (enkel bij een bestaand doel) → schrijft period_goal_* null + refetch
- [x] Opslaan met arrow; beide knoppen in de footer
- [x] PERIODE/TYPE + Geslacht gebruiken één gedeelde `Segmented` (geen duplicatie, kan niet driften)
- [x] tsc groen; GoalSheet sim-geverifieerd tegen Figma 388:2256

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — Figma-sync (388:2256): wheel + delete + gedeelde Segmented.
