# TC-EBC — Historiek-rijen gelijk aan home-lijst

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        De trainingslijst onder Historiek moet dezelfde rij-layout krijgen als de
             trainingshistoriek op de home-tab.
CONTEXT:     Historiek-tab (WorkoutCard: bordered rijen + dividers + separators) vs. home-tab
             (zebra-striped full-bleed tiles, Pressable, "Workout / Variant2"). Twee layouts
             voor dezelfde data.
ELEMENTS:    Trainingsrij (datum, duur+eenheid · kcal, afstand, arrow) — één gedeelde look.
BEHAVIOUR:   Statisch; tap → workout-detail (bestaand). Press-state = raised tile.
CONSTRAINTS: RN/Expo, RowTrack-tokens, dark mode. De home-lijst is de bron-van-waarheid;
             historiek neemt die over via één gedeelde WorkoutCard-component (rule of three).
```

---

## Open vragen

_(geen — "match de home-lijst" is eenduidig)_

## Aannames

- [ASSUMPTION: `WorkoutCard` wordt herbestemd naar de home zebra-tile layout en in BEIDE
  schermen gebruikt (i.p.v. twee kopieën) — design-system-first]
- [ASSUMPTION: duur toont de eenheid ("min"/"uur") zoals home, niet zoals de oude WorkoutCard]

## Acceptatie

- [ ] Historiek-rijen = zebra-striped full-bleed tiles (oneven rij = `bg.raised`), geen dividers/separators
- [ ] Duur toont eenheid, kcal + afstand identiek aan home
- [ ] Press-state (raised tile) werkt; tap → detail
- [ ] Home-lijst rendert ongewijzigd (geen regressie) met de gedeelde component
- [ ] Eén gedeelde `WorkoutCard`; geen gedupliceerde rij-implementatie meer
- [ ] Tokens only; dark mode

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — historiek-rijen gelijktrekken met home via een gedeelde component.
