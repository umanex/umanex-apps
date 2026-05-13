---
name: Home screen implementatie
description: Home tab screen van RowTrack implementeren vanuit Figma-design — structuur, spacing, kleuren via tokens, primary button, bijgewerkte Subtitle
type: project
---

# Home screen — RowTrack

**Datum:** 2026-05-12
**Type:** screen
**Project:** RowTrack
**Klant:** umanex
**Status:** in progress

---

```
TASK:        Implementeer het bijgewerkte Home scherm design van Figma naar code
             (apps/rowtrack/app/(tabs)/index.tsx)
CONTEXT:     Eerste tab in de RowTrack Expo/React Native app. Toont dashboard
             met goal progress, recente workouts en start-knop. Figma node: 16-159.
ELEMENTS:    - ScreenHeader met Subtitle component (bijgewerkte variant)
             - GoalProgressCard (week/maand voortgang)
             - WorkoutCard lijst (recente workouts)
             - Primaire start-knop (Button variant=primary)
             - StatusBar componenten (BLE, HR) indien aanwezig in design
BEHAVIOUR:   Statisch scherm — geen interactie behalve start-knop (navigeert naar
             workout tab) en WorkoutCard taps (navigeert naar history detail)
CONSTRAINTS: - React Native / Expo, geen web-specifieke properties
             - Uitsluitend tokens via @/constants (bg, fg, accent, space, layout, etc.)
             - Geen hardcoded kleuren, spacing of font sizes
             - StyleSheet.create(), geen inline styles
             - Figma URL: https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=16-159
```

---

## Open vragen

_Geen — voldoende context vanuit brief en project-CLAUDE.md._

## Aannames

- `[ASSUMPTION]` Start-knop navigeert naar `/(tabs)/workout`
- `[ASSUMPTION]` WorkoutCard taps navigeren naar `/(tabs)/history/[id]`
- `[ASSUMPTION]` BLE/HR statusbalken komen van bestaande componenten, niet her-implementeren

## Beslissingsgeschiedenis

- 2026-05-12: TC-EBC aangemaakt voor Home screen implementatie vanuit Figma-brief
