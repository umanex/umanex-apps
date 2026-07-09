# Recente-trainingen rijen — alternerende achtergrond

- **Datum:** 2026-07-09
- **Type:** component
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gebouwd

---

```
TASK:        Recente-trainingen lijst krijgt alternerende rij-achtergrondkleur zoals in Figma (167-2365).
CONTEXT:     Home-scherm, sectie "RECENTE TRAININGEN". Elke rij = datum + tijd/kcal + afstand + arrow. Nu vlakke achtergrond; design wil zebra-striping.
ELEMENTS:    Workout-rij-item (datum-label, stats-regel, afstand-waarde, chevron/arrow), lijst-container.
BEHAVIOUR:   Puur presentationeel — even/oneven rijen krijgen afwisselend een subtiel andere bg. Tap-op-rij (arrow → detail) blijft ongewijzigd.
CONSTRAINTS: React Native / Expo, StyleSheet, tokens uit @/constants (geen hardcoded). Mobile. Alternerende kleur = bestaande bg-token.
```

---

## Open vragen

_(geen — de kritische open vraag is opgelost via Figma-inspectie)_

## Aannames

- [ASSUMPTION] Press-highlight (`bg.raised`) blijft behouden. Op de oneven rijen (die in rust al `bg.raised` zijn) geeft de press dus geen zichtbare verandering — press-feedback leunt daar op de `arrow`/navigatie. Buiten scope van deze briefing.

## Acceptatie

- [x] Typologie: inline lijst-rijen in de Home recent-sectie (geen sheet/modal/pagina).
- [x] Alternerende bg volgt Figma: Default variant = transparant, Variant2 = `bg/raised` (`#21242C`).
- [x] Alternatie-index klopt met design: rij 0 transparant, rij 1 `bg.raised`, rij 2 transparant → oneven index = raised.
- [x] Alleen token-mapping, geen hardcoded kleur (`bg.raised` uit `@/constants`).
- [x] Tap-gedrag ongewijzigd (`handleWorkoutPress`).
- [x] Loading / empty states ongemoeid.

## Beslissingsgeschiedenis

- 2026-07-09: Alternerende kleur vastgesteld als `bg.raised` via Figma COMPONENT_SET `Workout` (node 167-2365, Variant2). Home-screen (16:159) plaatst instances als Default/Variant2/Default → oneven index krijgt de raised-tile.
