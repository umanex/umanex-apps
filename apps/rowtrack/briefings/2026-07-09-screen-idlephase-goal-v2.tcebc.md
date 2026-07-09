# TC-EBC — IdlePhase goal-selectie v2 (suggesties + toestellen + nudge-removal)

| Veld | Waarde |
|------|--------|
| Datum | 2026-07-09 |
| Type | screen |
| Project | rowtrack |
| Klant | umanex (eigen product) |
| Status | gevalideerd |

Figma: [IdlePhase scherm](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1516) · [Toestel-selectie component](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=32-374).

Iteratie op [2026-07-09-screen-idlephase-goal.tcebc.md](./2026-07-09-screen-idlephase-goal.tcebc.md) (`gevalideerd`). Drie deltas: (1) doel-suggesties altijd 3, (2) nieuwe toestel-selectie layout + bluetooth-icoon, (3) nudge-bar volledig verwijderd.

---

```
TASK:        Drie designwijzigingen aan het IdlePhase-scherm doorvoeren: doel-suggesties altijd 3 tonen (meest relevante defaults, of 3 meest-recent gekozen bij bestaande historiek), toestel-selectie herwerken naar de nieuwe layout + bluetooth-icoon, en de nudge-functionaliteit (−/+ segmented bar) volledig verwijderen zodat enkel het scrollwiel de selectie maakt.
CONTEXT:     Idle/setup-fase vóór een roeisessie. Bestaand, eerder gevalideerd scherm — dit is een iteratie, geen nieuwbouw. Raakt IdlePhase.tsx + de toestel-statusbalken (BleStatusBar/HrStatusBar) + de suggestie-chips (Chip + useRecentGoals).
ELEMENTS:    Header "Nieuwe training"; TOESTELLEN-sectie met herwerkte toestel-rijen (nieuwe layout + bluetooth-icoon, node 32-374); DOEL-selector (5 doeltypes: Geen/Duur/Afstand/Split/Watt); WheelPicker (scrollwiel — enige waarde-selector); suggestie-chiprij (ALTIJD 3 chips per doeltype); "Geen"-body beschrijvende tekst; "Start training →" primaire CTA; bottom tab bar.
BEHAVIOUR:   Tik doeltype → wisselt doel + suggesties + wiel. Scroll wiel → kiest waarde (geen −/+ knoppen meer). Tik suggestie-chip → zet wiel/target op die waarde, chip wordt actief. Tik toestel-rij → koppelt/ontkoppelt BLE. Tik Start → start sessie. Suggesties: bij ≥3 recente gekozen targets → 3 meest-recente; anders (of aanvullend tot 3) → meest relevante defaults per doeltype.
CONSTRAINTS: React Native + Expo, mobile-first (390×844 referentie). RowTrack-eigen tokens.json via @/constants (géén umanex-DNA, geen hardcodes). Ionicons via @expo/vector-icons. Doeltypes: none/duration/distance/split/watts. Dark + light conform RowTrack. Nudge-code (NudgeButton, nudgeRow, NUDGE_STEP_IDX-gebruik) verdwijnt volledig — geen dode code.
```

---

## Open vragen

- Geen blokkerende. Jeroen gaf carte blanche op de suggestie-selectie ("kies zelf de meest relevante"). Pixel-details (toestel-rij hoogte, icoon-plaatsing, chip-breedte bij 3) worden vastgelegd via Figma deep-read in de Bouw-stap en tegen de snapshot geverifieerd.

## Aannames

- [ASSUMPTION] Type = `screen` (IdlePhase is een volledige view, geen sheet/modal).
- [ASSUMPTION] "Altijd 3 suggesties" = exact 3 chips per doeltype. Bij <3 unieke recente targets → aanvullen met relevante defaults tot 3 (geen lege plekken). Bij `Geen` doeltype → geen suggesties (geen target).
- [ASSUMPTION] "3 meest-recent gekozen keuzes" = de 3 meest recente distinct gekozen targets voor dát doeltype uit de historiek (useRecentGoals), niet globaal.
- [ASSUMPTION] Nudge weg = zowel de UI (−/+ bar) als de dode logica (NUDGE_STEP_IDX/NUDGE_LABEL-gebruik in IdlePhase, nudgeDisplayValue). De constanten in workout-goals blijven staan tenzij nergens anders gebruikt.
- [ASSUMPTION] Nieuwe toestel-layout vervangt de huidige BleStatusBar/HrStatusBar-presentatie; onderliggende BLE/HR state-logica en props blijven intact (enkel presentatie-delta).
- [ASSUMPTION] Bluetooth-icoon = Ionicons `bluetooth`-variant; exacte glyph + kleur per Figma node 32-374 bevestigen.

## Acceptatie

- [x] Suggestie-chiprij toont ALTIJD exact 3 chips per doeltype (duration/distance/split/watts); `Geen` toont geen chips. → `buildGoalSuggestions` levert altijd 3 in-range wielindices.
- [x] Bij ≥3 distinct recente targets: 3 meest-recente uit useRecentGoals; bij <3: aangevuld met relevante defaults tot 3; geen duplicaten. → hook = recency-order distinct; padding + dedup op wielindex.
- [x] Actieve chip (matcht huidige wielwaarde) krijgt de actieve stijl; tik zet het wiel op die waarde. → `active={chipIdx === idx}`, onPress `setIdx+sync`. Live geverifieerd (Duur: 30 min actief).
- [x] Toestel-selectie volgt de nieuwe layout + bluetooth-icoon uit node 32-374; BLE/HR-states blijven correct gedreven. → nieuwe `DeviceRow` + gegroepeerde card; state→props-mapping in Ble/HrStatusBar behouden.
- [x] Nudge volledig weg: geen −/+ bar, geen NudgeButton, geen dode nudge-logica; enkel WheelPicker als selector. → NudgeButton + NUDGE_STEP_IDX/NUDGE_LABEL verwijderd (grep-schoon).
- [x] Alle waarden via RowTrack-tokens uit @/constants; geen nieuwe hardcodes. → DeviceRow-spacing getokeniseerd na review-P3; enige non-token = bestaande 0.20-accent (debt-TODO).
- [x] Geen regressie in BLE-/HR-/goal-state-logica; typecheck groen; live parity-check op simulator. → tsc exit 0; Duur-variant live tegen Figma; review 0×P0/P1, 2×P3 opgelost.

**Verificatie-gat (bewust):** enkel de Duur-variant is live op de simulator geverifieerd (geen idb → geen auto-taps). Afstand/Split/Watt/Geen delen exact hetzelfde render-pad (renderGoalInput/getModeConfig/DeviceCard); enkel `items` + default-index verschillen (ongewijzigde formatters). Aanbevolen: Jeroen klikt de 4 resterende types één keer door.

## Beslissingsgeschiedenis

- 2026-07-09: v2 TC-EBC opgesteld als iteratie op het gevalideerde IdlePhase-design. Drie deltas: altijd-3 suggesties, herwerkte toestel-selectie (node 32-374), nudge-removal. Nieuw bestand i.p.v. overschrijven zodat het gevalideerde record intact blijft.
- 2026-07-09: Toestel-redesign werd in scope getrokken — Figma node 32:374 toont accent-rode (gradient) dot/hart óók disconnected + italic "Verbinden/Verbreken" + bluetooth. Dit lost de vorige out-of-scope-onzekerheid over indicator-kleur op. Extractie: presentational `DeviceRow` + dunne Ble/HrStatusBar-mappers + `deviceCard`-wrapper.
- 2026-07-09: Chip value/unit-split gecentraliseerd in gedeelde `wheelItemParts` (formatters), gebruikt door WheelPicker én chips — lost de HANDOFF-debt over de fragiele label-heuristiek op.
- 2026-07-09: Beoordeel-panel (3 lenzen, adversarieel geverifieerd) → 2× P3 opgelost: DeviceRow-spacing naar `space`-tokens; `bleError` dode plumbing verwijderd uit de IdlePhase→BleStatusBar-tak.
