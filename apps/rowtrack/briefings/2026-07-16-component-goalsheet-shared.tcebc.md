# TC-EBC — Gedeelde, zelf-persisterende GoalSheet

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

---

```
TASK:        Extraheer de doel-instellen-bottomsheet naar een herbruikbare, zelf-persisterende
             GoalSheet-component; open hem in-place op home (geen redirect) én op profiel.
CONTEXT:     Was inline in profile.tsx, persist via de (nooit-aangeroepen) profiel-handleSave;
             home gebruikte de ?openGoal=1-redirect-omweg (vervangt de vorige aanpak).
ELEMENTS:    GoalSheet (BottomSheet: PERIODE/TYPE segmented + STREEFWAARDE + Opslaan), triggers op home + profiel.
BEHAVIOUR:   WIJZIG (home én profiel) → opent de sheet in-place; Opslaan → schrijft period_goal_*
             + onSaved (refetch). Draft init uit currentGoal bij openen (+ edge: currentGoal laadt later).
CONSTRAINTS: RN/Expo, tokens. Eén component (components/GoalSheet.tsx), geen logica-duplicatie.
             Doel-write uit profiel-handleSave gehaald (anti-dubbelschrijven).
```

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: `handleSave` in profile.tsx werd nooit aangeroepen → de doel-edit persisteerde
  voorheen niet; de zelf-persisterende GoalSheet fixt dat. Het bredere "profiel-velden
  persisteren niet"-vermoeden is apart geflagd (HANDOFF), buiten scope.]

## Acceptatie

- [x] Eén gedeelde `GoalSheet`-component (home + profiel), geen dubbele sheet/logica
- [x] Home WIJZIG → sheet opent in-place (geen redirect naar profiel)
- [x] Sheet init met de huidige doel-waarden (Maand/Afstand/50), ook in de open-vóór-laden edge
- [x] Opslaan schrijft period_goal_* + onSaved-refetch (self-persist)
- [x] Doel-write verwijderd uit profiel-handleSave; geslacht/email-sheets ongewijzigd
- [x] tsc groen; home + sheet sim-geverifieerd

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — vervangt de ?openGoal=1-redirect (2026-07-16-feature-goal-card-flow)
  door een gedeelde, zelf-persisterende GoalSheet die op home in-place opent.
