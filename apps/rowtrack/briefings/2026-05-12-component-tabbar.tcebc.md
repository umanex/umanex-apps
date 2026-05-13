---
name: TabBar + TabItem componenten
description: In-screen horizontale tab navigatie — TabItem (één knop) en TabBar (container) voor gebruik op het history detail scherm
type: component
---

# TabBar + TabItem — RowTrack

**Datum:** 2026-05-12
**Type:** component
**Project:** RowTrack
**Klant:** umanex
**Status:** in progress

---

```
TASK:        Bouw TabItem (één tab-knop) en TabBar (container) voor
             in-screen tab navigatie
CONTEXT:     Gebruikt op het history detail scherm voor de tabs
             Overview / Splits / BPM. Geen Expo Router navigatie —
             puur visuele state-wissel binnen één scherm.
ELEMENTS:    - TabItem: label (string), active/inactive state,
               onPress callback
             - TabBar: rij van TabItems, beheert actieve index niet
               zelf (controlled via props)
BEHAVIOUR:   Tap op TabItem → parent roept onPress aan met index of
             label, parent wisselt activeTab state, TabBar herrendert
             met nieuwe active prop
CONSTRAINTS: - React Native / Expo, geen web-specifieke properties
             - Uitsluitend tokens via @/constants
             - StyleSheet.create(), geen inline styles
             - Figma node TabItem: 86-2769
             - Figma node TabBar: 5-9 (label in map mogelijk fout)
```

---

## Open vragen

_Geen — voldoende context vanuit Figma nodes en project-CLAUDE.md._

## Aannames

- `[ASSUMPTION]` TabBar is controlled: activeTab en onTabChange komen van parent
- `[ASSUMPTION]` Geen iconen op de tabs, enkel labels
- `[ASSUMPTION]` Maximaal 3-4 tabs (history detail heeft er 3)

## Beslissingsgeschiedenis

- 2026-05-12: TC-EBC aangemaakt voor TabBar + TabItem componenten
