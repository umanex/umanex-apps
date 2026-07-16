# TC-EBC — Active-workout header bar redesign

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gepland

---

```
TASK:        Neem het aangepaste header-bar-design van de active workout over uit Figma —
             DOEL-pill (label + doelwaarde + eenheid, bv. "180 W") + Stop-knop — met de
             juiste paddings, in portrait én landscape.
CONTEXT:     Active workout, bovenaan (ActivePhase header). Gedeeld portrait/landscape.
             Huidig: accent-getinte band met DOEL-pill links + Stop-knop rechts.
ELEMENTS:    Header-band, DOEL-pill (DOEL-label · divider · doelwaarde+eenheid), Stop-knop
             (primair, trailing arrow-icoon).
BEHAVIOUR:   Statisch weergegeven; Stop → stopt de workout (bestaand). Pill toont het
             actieve doel ("Geen" / "20 min" / "10 km" / "2:20 split" / "180 W").
CONSTRAINTS: React Native/Expo, RowTrack-tokens, StyleSheet. Dark mode. Safe-area-aware.
             Let op verschillende paddings portrait vs landscape. Figma portrait 290:2872,
             landscape 290:2785 = bron (deep-read paddings in build).
```

Figma: [Portrait 290-2872](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=290-2872) · [Landscape 290-2785](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=290-2785)

---

## Open vragen

_(geen blokkerende — redesign van bestaande header met behoud van gedrag)_

## Aannames

- [ASSUMPTION: enkel de header-band + pill + Stop-knop wijzigen; hero/KPI-lijst blijven]
- [ASSUMPTION: pill blijft niet-tappable (doel-edit gebeurt elders); gedrag ongewijzigd]
- [ASSUMPTION: de "doel / 180W / W / Stop"-beschrijving = DOEL-label, doelwaarde, eenheid, Stop — exacte structuur uit de Figma deep-read]

## Acceptatie

- [ ] Header-band + DOEL-pill + Stop matchen Figma 290:2872 (portrait)
- [ ] Header matcht 290:2785 (landscape) met de juiste landscape-paddings
- [ ] Doelwaarde+eenheid renderen correct per doeltype (min/km/split/W/Geen)
- [ ] Paddings/spacing exact uit Figma (portrait ≠ landscape), safe-area-aware
- [ ] Tokens only (geen hardcoded values); dark mode correct
- [ ] Stop-gedrag ongewijzigd

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — header-bar redesign portrait + landscape.
