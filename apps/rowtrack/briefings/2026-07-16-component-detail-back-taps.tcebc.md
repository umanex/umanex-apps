# TC-EBC — Detail: datum + "OVERZICHT" beide tappable terug

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        Op het trainingsdetail moet zowel de datum-titel als het "OVERZICHT"-label
             tappable zijn om terug te keren naar het historiek-overzicht.
CONTEXT:     app/(tabs)/history/[id].tsx header. Nu: enkel "← OVERZICHT" is tappable (router.back);
             de datum-titel is een plain Text.
ELEMENTS:    Datum-titel (tappable), "← OVERZICHT"-link (al tappable).
BEHAVIOUR:   Tap op datum OF op OVERZICHT → router.back() naar het historiek-overzicht.
CONSTRAINTS: RN/Expo, tokens. PR-badge naast de datum mag niet mee-triggeren.
```

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: dezelfde `router.back()` als het bestaande OVERZICHT-label; PR-badge blijft buiten de touchable]

## Acceptatie

- [ ] Datum-titel is tappable → terug naar historiek
- [ ] "OVERZICHT"-label blijft tappable → terug
- [ ] PR-badge triggert niet mee; header-layout ongewijzigd

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — datum-titel óók tappable maken (naast OVERZICHT).
