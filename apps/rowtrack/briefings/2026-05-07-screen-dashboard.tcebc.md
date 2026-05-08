# Dashboard — Home scherm

**Datum:** 2026-05-07
**Type:** screen
**Project:** RowTrack
**Klant:** umanex
**Status:** Open — blokkades

---

```
TASK:    Implementeer Home / Dashboard scherm (index.tsx) op basis van Figma node 16:159
CONTEXT: Home-tab van RowTrack; vervangt bestaand scherm met hardcoded kleuren.
         Nieuw design: Newsreader serif + Albert Sans caps-labels, rood accent (#F05454),
         warmere neutralen (#15171C base).
ELEMENTS:
  - Header: greeting italic Newsreader + naam 34px Newsreader + "Start →" outline button
  - Goal Progress Card: "WEEKDOEL" eyebrow + "WIJZIG →" link, "20.4 van 50 km" (28px Newsreader),
    1px progress bar, "41% voldaan • 29.6 km resterend" (italic Newsreader 17px)
  - Persoonlijke records: section eyebrow + hairline divider, 3 kolommen inline
    (max. afstand / langste duur / snelste split) — geen card-backgrounds
  - Recente trainingen: section eyebrow + divider, border-bottom list items
    (dag-label boven, tijd • kcal, afstand + chevron rechts)
BEHAVIOUR:
  - Pull-to-refresh herlaadt workouts + goal progress
  - Tap workout item → history/[id]
  - Tap "ALLE →" → history tab
  - Tap "Start →" → workout tab
  - Tap "WIJZIG →" → goal-instelling (toekomstige flow)
CONSTRAINTS:
  - React Native + Expo Router + StyleSheet.create, geen inline styles
  - Alle waarden via @/constants — geen hardcoded kleuren/sizes/fonts
  - Tab bar in Expo Router _layout, niet in dit scherm
  - Figma node: 16:159 — file T1bGrvIzSNeLyh5CbarATZ
```

---

## Open vragen

*Leeg — alle TC-EBC-kritische items beantwoord door Figma design.*

## Aannames

- [ASSUMPTION] "WIJZIG →" tikt door naar een toekomstige goal-instelling scherm; voor nu geen navigatie nodig
- [ASSUMPTION] PR-sectie toont enkel de records die bestaan (null-guards zoals nu)
- [ASSUMPTION] Empty state en loading state behouden huidige implementatie

## Beslissingsgeschiedenis

- 2026-05-07: Briefing aangemaakt, twee blokkades gevonden — implementatie on hold
