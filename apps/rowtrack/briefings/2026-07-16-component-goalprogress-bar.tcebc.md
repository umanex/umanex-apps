# TC-EBC — GoalProgressCard progressbar tegen design

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        GoalProgressCard progressbar gelijktrekken met het Figma-component:
             dot verwijderen + bar-hoogte corrigeren.
CONTEXT:     Home weekdoel/maanddoel-card (GoalProgressCard). Nu: track 2px + fill 2px + 6px dot rechts.
ELEMENTS:    Progress-track, progress-fill (geen dot meer).
BEHAVIOUR:   Statisch; fill-breedte = % voldaan.
CONSTRAINTS: RN/Expo, tokens. Figma GoalProgressCard-component = bron.
```

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: de `<Dot />`-separator in de status-tekstrij ("41% voldaan · resterend") blijft — die is NIET de bar-dot]

## Acceptatie

- [ ] Geen dot meer aan de progress-bar
- [ ] Track + fill zijn 4px hoog (Figma ProgressBar h=4), was 2px
- [ ] Full-bleed breedte + tokens ongewijzigd; fill = % voldaan
- [ ] Home rendert correct

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — dot weg + bar-hoogte 2→4 tegen het Figma-component.
