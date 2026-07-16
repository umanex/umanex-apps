# TC-EBC — Goal-card label + doel-edit-flow

**Datum:** 2026-07-16
**Type:** feature
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

---

```
TASK:        (1) GoalProgressCard-label wordt "Deze {periode}" (bv. "Deze week"/"Deze maand").
             (2) Profiel: het "MIJN DOEL"-label boven de card verwijderen.
             (3) Home "WIJZIG" opent meteen de doel-instellen-bottomsheet (via navigatie
                 naar profiel met ?openGoal=1) i.p.v. enkel naar het profiel te navigeren.
CONTEXT:     GoalProgressCard (home + profiel), de doel-instellen-bottomsheet (in profile.tsx),
             home + profiel schermen.
ELEMENTS:    Card-label, "MIJN DOEL"-label (weg), WIJZIG-actie, doel-bottomsheet ("Doel bewerken").
BEHAVIOUR:   WIJZIG op home → navigeert naar profiel én opent meteen de bottomsheet met de
             huidige doel-waarden. Persist blijft via de profiel-save (usePeriodGoal is read-only).
CONSTRAINTS: RN/Expo, tokens. Bestaande bottomsheet hergebruiken; auto-open gate-en op de
             gesyncte goal-state zodat de sheet niet leeg opent.
```

Item 4 (bottomsheet → Figma) loopt via de `code-naar-figma` skill, aparte deliverable.

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: "meteen de bottomsheet openen" = navigeren naar profiel + de sheet daar auto-openen
  (niet standalone op home — dat zou de profiel-gekoppelde persist-flow moeten dupliceren)]

## Acceptatie

- [x] Card-label = "Deze week" / "Deze maand"
- [x] "MIJN DOEL"-label verwijderd op profiel
- [x] Home WIJZIG → profiel opent meteen de "Doel bewerken"-sheet met de huidige waarden
- [x] Sheet opent niet leeg (gegate op gesyncte goal-state); param geconsumeerd
- [x] tsc groen; sim-geverifieerd

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — label + MIJN DOEL weg + home WIJZIG opent de sheet.
