# Home – Figma sync + workout IdlePhase audit

**Datum:** 2026-05-11  
**Type:** screen  
**Project:** RowTrack  
**Klant:** umanex  
**Status:** in progress

---

```
TASK:        Sync Home screen pixel-perfect met Figma; audit IdlePhase workout
             component op layout- en tokenparity.
CONTEXT:     RowTrack – app/(tabs)/index.tsx (Home) en components/workout/IdlePhase.tsx.
             Beide hebben bestaande implementaties die gevalideerd en gecorrigeerd
             worden t.o.v. de huidige Figma designs.
ELEMENTS:    Home: header (greeting, naam, Start-knop), GoalProgressCard,
             PR-records blok, recente workouts lijst.
             IdlePhase: BLE-statusbalken, doel-segment control, doelwaarde-input,
             start-knop.
BEHAVIOUR:   Primair display + navigatie. Start-knop → workout screen,
             workoutrijen → history detail, 'alle'-link → history list.
CONSTRAINTS: React Native + Expo, StyleSheet.create (geen Tailwind), tokens via
             @/constants, iconen via @expo/vector-icons (Ionicons),
             ScrollView met RefreshControl op Home.
```

---

## Open vragen

_(geen — alle kritische items zijn beantwoord vanuit project- en codebase-context)_

## Aannames

- [ASSUMPTION: Home toont maximaal 3 recente workouts conform huidige Supabase query]
- [ASSUMPTION: IdlePhase-audit dekt goalType=none als baseline; varianten worden
  gecontroleerd op dezelfde tokens]

## Beslissingsgeschiedenis

- 2026-05-11: Eén TC-EBC voor Home-sync én IdlePhase-audit, omdat het één
  geïntegreerde Figma-sync sessie is met Home als primaire taak.
