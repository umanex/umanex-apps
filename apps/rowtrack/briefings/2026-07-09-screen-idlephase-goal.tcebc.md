# TC-EBC — IdlePhase goal-selectie (aangepast design)

| Veld | Waarde |
|------|--------|
| Datum | 2026-07-09 |
| Type | screen |
| Project | rowtrack |
| Klant | umanex (eigen product) |
| Status | gevalideerd |

Figma: [IdlePhase](https://www.figma.com/design/T1bGrvIzSNeLyh5CbarATZ/RowTrack?node-id=35-1516&t=g6hMU5xcc3R3NILx-4) — COMPONENT_SET, varianten `Goal` × `recents`.

---

```
TASK:        Aangepaste designs van het IdlePhase-scherm (training opzetten + doel kiezen) doorvoeren in de RowTrack-code.
CONTEXT:     Idle/setup-fase vóór een roeisessie start. Gebruiker koppelt toestellen, kiest een doeltype en target, en start de training. Bestaand scherm — dit is een iteratie op het design, geen nieuwbouw.
ELEMENTS:    Header "Nieuwe training"; TOESTELLEN-lijst (Roeitrainer, Hartslagmeter — icon + naam + Verbind/Verbonden-status); DOEL-selector (5 doeltype-iconen: Geen/Duur/Afstand/Split/Watt, actieve als label-chip); waarde-stepper (grote centrale waarde + eenheid, − / + met stap-labels bv. 5 MIN / 8 MIN, aangrenzende waarde-hints boven/onder); "Geen"-body = beschrijvende tekst; RECENT-chiprij (recente targets); "Start training →" primaire knop; bottom tab bar (HOME/TRAINING/HISTORIEK/PROFIEL).
BEHAVIOUR:   Tik doeltype-icon → wisselt doel, vervangt stepper/omschrijving in de body. Tik − / + → verlaagt/verhoogt target met de stapgrootte. Tik recent-chip → zet target op die waarde. Tik Verbind → koppelt BLE-toestel. Tik Start training → start sessie. RECENT-sectie verschijnt enkel bij bestaande recente waarden (variant recents=shown), anders verborgen.
CONSTRAINTS: React Native + Expo, mobile-first (referentie 390×844). RowTrack-eigen tokens.json (géén umanex-DNA). Ionicons via @expo/vector-icons. Doeltypes: none/duration/distance/split/watts. Design getoond in dark; light/dark conform RowTrack-context verifiëren.
```

---

## Open vragen

- Geen blokkerende. Exacte delta bepaald door Figma-deep-read tegen de bestaande code te diffen.

**Observaties buiten scope (niet gewijzigd — bevestiging gevraagd):**
- TOESTELLEN-indicatoren: Figma toont Roeitrainer-dot + Hartslag-hartje in accent-rood, ook in disconnected-state; code toont ze grijs (BleStatusBar/HrStatusBar state-logica). Bewust in TOESTELLEN-sectie gelaten.
- Start training-knop: `buttonTokens.primary.height` = 48 maar `Button.sizeLg` = `space['44']` (44). Gedeeld component — laten staan.

## Aannames

- [ASSUMPTION] Type = `screen`: IdlePhase is een volledige view, geen sheet/modal/dropdown.
- [ASSUMPTION] Interactie = tap (geen swipe/drag op de stepper — +/- knoppen, niet slider).
- [ASSUMPTION] `recents=hidden` is de empty-state van de RECENT-sectie (geen recente waarden voor dat doeltype), niet een aparte toggle.
- [ASSUMPTION] Device-connect loading/error states leven al in de bestaande code (BLE) — niet nieuw in dit design; verifiëren, niet vervangen.
- [ASSUMPTION] Min/max per stepper (bv. duur ≥ 1 min, watt/split ondergrens) volgen uit de bestaande logica; design toont enkel stapgroottes.

## Acceptatie

- [x] DOEL-selector: full-bleed band met top/bottom dividers, actief hug-content, inactief flex — 5 doeltypes.
- [x] Body wisselt correct per doeltype: stepper voor duration/distance/split/watts, beschrijvende tekst voor `none`.
- [x] Stepper = samengevoegde segmented bar (−/+ bg.raised met dividers, waarde bg.elevated); waarde serif 34 + eenheid italic 16; stap-labels + waarde-hints conform Figma.
- [x] RECENT-chips: value serif + unit italic, hoogte 40; verschijnen enkel bij aanwezige recente waarden.
- [x] TOESTELLEN-rijen (Roeitrainer, Hartslagmeter) met Verbind-status conform design (BleStatusBar/HrStatusBar reeds correct).
- [x] "Start training →" primaire knop en bottom tab bar conform design (reeds correct).
- [x] Alle waarden via RowTrack-tokens; enige non-token (0.20 accent-fill) volgt bestaand GoalSegments-precedent, met TODO.
- [x] Geen regressie in BLE-/state-logica; enkel presentatie-delta. Typecheck groen; live parity-check op simulator (Duur-variant) matcht Figma.

## Beslissingsgeschiedenis

- 2026-07-09: TC-EBC opgesteld op basis van Figma COMPONENT_SET IdlePhase (varianten Goal × recents). Iteratie op bestaand scherm.
- 2026-07-09: Delta doorgevoerd — (1) NudgeRow: 3 losse boxen → 1 samengevoegde segmented bar; (2) waarde-typografie serif 34 / italic 16; (3) GoalSegments full-bleed band met top/bottom dividers, actief hug / inactief flex; (4) RECENT-chips value+italic unit, hoogte 40; (5) vertical rhythm 28/20/20. Live geverifieerd tegen Figma op simulator.
