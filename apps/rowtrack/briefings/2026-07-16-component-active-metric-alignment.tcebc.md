# TC-EBC — Active-workout metric-uitlijning (statische spacer)

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

---

```
TASK:        Duration & distance values in de active workout ("afgelegd") zo
             uitlijnen dat de spacer/eenheid statisch blijft bij wisselende
             live-cijfers, in portrait én landscape.
CONTEXT:     components/workout/ActivePhase.tsx — live-metric weergave tijdens
             een actieve rit. Figma 391-2436 = bron.
ELEMENTS:    Waarde-cel duration (timer), waarde-cel afstand + eenheid, de
             spacer/divider die nu meebeweegt met de cijferbreedte.
BEHAVIOUR:   Live cijfers wisselen elke tick; de layout mag niet reflowen — de
             spacer/eenheid blijft op een vaste positie (tabular/fixed-width of
             vaste value-kolom-breedte).
CONSTRAINTS: RN/Expo, tokens only. Portrait + landscape. Figma 391-2436 = bron.
             Geen nieuwe interactie of states.
```

---

## Open vragen

_(geen — bestaande weergave, gedrag ongewijzigd behalve uitlijning)_

## Aannames

- [ASSUMPTION: "spacer" = het vaste element (divider/eenheid/"·") tussen of naast
  de waarden dat nu verschuift doordat de cijfers variabele breedte hebben; fix =
  tabular figures of een vaste value-kolombreedte, conform Figma 391-2436.]
- [ASSUMPTION: raakt zowel de portrait- als de landscape-tak van ActivePhase.]

## Acceptatie

- [x] Duration- en distance-waarden reflowen niet meer — gelijk-brede flex:1-kolommen
      (links rechts-uitgelijnd, rechts links-uitgelijnd) houden de 2px-divider statisch
      op het paneelcenter (portrait: schermcenter geverifieerd)
- [x] Idem in landscape (zelfde code-pad; divider gecentreerd in de gemeten halve kolom)
- [x] Uitlijning matcht Figma 391-2436 (Values FILL, Value rechts / Percentage links, Spacer 2px)
- [x] tokens only (space/fg/fontFamily), geen hardcoded waarden; tsc groen
- [x] Sim-geverifieerd (dev-active ?goal=distance), portrait + landscape

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — uitlijning duration/distance zodat spacer statisch blijft (Figma 391-2436).
