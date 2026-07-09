# TabItem + Chip labels — verticale centrering

- **Datum:** 2026-07-09
- **Type:** component
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd

---

```
TASK:        Labels verticaal correct centreren binnen tabItem (segmented control) én goal-chips.
CONTEXT:     RowTrack. tabItem = "Overzicht/Splits" op Historiek-detail. Chips = DOEL goal-type selector op Training-scherm (∞ / Duur / Afstand / …) + RECENT quick-picks. Labels stonden te hoog binnen hun container.
ELEMENTS:    tabItem (label, actief/inactief), goal-chip (icoon + label, actief/inactief), recent-chip (label).
BEHAVIOUR:   Puur visueel — geen gedragswijziging. Tap-selectie ongewijzigd. Label (+ optioneel icoon) exact verticaal gecentreerd in de container-hoogte.
CONSTRAINTS: React Native / Expo, StyleSheet, tokens uit @/constants. Source Serif font-metrics. Geen hardcoded spacing.
```

---

## Open vragen

_(geen)_

## Aannames

_(geen — root cause en fix empirisch bevestigd)_

## Acceptatie

- [x] Root cause vastgesteld: strakke `lineHeight: 16` (= fontSize) op Source Serif duwt glyph naar boven; descent-ruimte blijft onderaan leeg → label te hoog.
- [x] Fix volgt bestaande codebase-conventie (`Button.tsx` gebruikt `lineHeight: undefined` om exact dit op te lossen).
- [x] TabItem `labelActive` / `labelDefault` → `lineHeight: undefined`.
- [x] Chip `label` → `lineHeight: undefined`.
- [x] GoalSegments `activeLabel` → `lineHeight: undefined` (verving foute `lineHeight: 20` + Android-only `textAlignVertical`).
- [x] BleStatusBar + HrStatusBar `label` én `actionText` ("Verbind"/"Verbreek") → `lineHeight: undefined` (Figma "Device connect" 72-15743, zelfde fix-klasse).
- [x] Root cause structureel opgelost in `style-dictionary.config.mjs`: `lineHeight` alleen uitgestuurd bij >fontSize (>100%); tight ≤100% styles laten hem vallen → RN natuurlijke metrics. Per-component overrides teruggedraaid, `Button.tsx`-workaround verwijderd.
- [x] Typecheck schoon.
- [x] Visuele bevestiging op simulator: "∞ Geen" DOEL-box en Roeitrainer/Verbind-rij nu gecentreerd (crop-vergelijking before/after).

## Beslissingsgeschiedenis

- 2026-07-09: Offset-richting empirisch bepaald via crop van simulator-screenshots (labels ~te hoog in alle 3 componenten). Fix = `lineHeight: undefined`, consistent met `Button.tsx`, i.p.v. optische padding-nudge — matcht Figma's centrering met natuurlijke serif-metrics.
- 2026-07-09: Scope uitgebreid naar de device-connect rijen (BleStatusBar/HrStatusBar). Crop toonde dat zowel het rij-label ("Roeitrainer") als de "Verbind"-actie te hoog stonden → beide gefixt voor een coherent gecentreerde rij, niet enkel de Verbind-knop.
- 2026-07-09: Kantelpunt van per-component naar **root-cause** fix (op vraag). Oorzaak zat in de token-pipeline die `lineHeight = fontSize` bakte voor 100%/AUTO type-tokens. Fix verplaatst naar `style-dictionary.config.mjs` (lineHeight alleen bij >fontSize); alle handmatige `lineHeight: undefined`-overrides teruggedraaid. Zie project-memory [[rowtrack-serif-vertical-centering]].
