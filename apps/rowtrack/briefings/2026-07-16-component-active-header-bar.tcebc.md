# TC-EBC — Active-workout header bar redesign

**Datum:** 2026-07-16
**Type:** component
**Project:** rowtrack
**Klant:** umanex
**Status:** gevalideerd

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
             Let op verschillende paddings portrait vs landscape. Bijgewerkte bron:
             Figma 297:2227 (deep-read paddings in build). Eerdere bron 290:2872/290:2785.
```

Figma (iteratie 2026-07-16): [297-2227](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=297-2227) · eerder [Portrait 290-2872](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=290-2872) · [Landscape 290-2785](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=290-2785)

---

## Open vragen

_(geen blokkerende — redesign van bestaande header met behoud van gedrag)_

## Aannames

- [ASSUMPTION: enkel de header-band + pill + Stop-knop wijzigen; hero/KPI-lijst blijven]
- [ASSUMPTION: pill blijft niet-tappable (doel-edit gebeurt elders); gedrag ongewijzigd]
- [ASSUMPTION: de "doel / 180W / W / Stop"-beschrijving = DOEL-label, doelwaarde, eenheid, Stop — exacte structuur uit de Figma deep-read]

## Acceptatie

- [x] Band met accent-tint + platte DOEL (geen pill-border) + Stop matchen Figma 297:2227 (portrait sim-geverifieerd)
- [x] Landscape matcht met eigen paddings (left safe-area, right 40 naar de progress-bar); band-tint + platte DOEL toegepast
- [x] Doelwaarde+eenheid beide bold ("180W"), gap 2 — per 297:2227
- [x] Band-padding 20 (portrait top/bottom van 28→20; landscape 20 + pr 40), safe-area-aware
- [x] Tokens only (accent.muted 0.12 ≈ Figma 0.10, TODO genoteerd); dark mode correct
- [x] Stop-gedrag ongewijzigd

## Beslissingsgeschiedenis

- 2026-07-16: Aangemaakt — header-bar redesign portrait + landscape.
- 2026-07-17: Iteratie — header nog niet correct. Nieuwe bron 297:2227 (native Figma MCP,
  Console-bridge losgekoppeld): de accent-tint verhuist van de DOEL-pill terug naar de
  **band** (accent.muted), de pill wordt **plat** (geen fill/border, px 0, py 12, gap 16),
  band-padding 20. Portrait top/bottom van 28 → 20; landscape houdt zijn eigen paddings
  (left safe-area, right 40 naar de progress-bar). Eenheid-italic voorlopig behouden (geldt
  ook voor km/split; Figma-watts-instance toont "180W" bold — apart af te toetsen).
