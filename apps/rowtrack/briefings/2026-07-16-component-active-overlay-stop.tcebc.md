# TC-EBC — Active connect-overlay: verstreken tijd + Stop-uitgang

- **Datum:** 2026-07-16
- **Type:** component
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Geef de BLE-connect-overlay in de active workout een verstreken-tijd-regel en een
             Stop-knop, zodat een roeier tijdens reconnect/error de sessie kan beëindigen (P0-F2,
             UX-audit 2026-07-16).
CONTEXT:     ActivePhase rendert bij bleStatus !== 'connected' een full-screen overlay die hero,
             KPI's én de header-Stop verbergt (ActivePhase.tsx:123-126, 488-568); de tabbar is
             tijdens active verborgen — er is geen enkele uitgang tot de reconnect slaagt of faalt.
ELEMENTS:    Bestaande overlay (spinner + status-tekst; error: warning-icoon + bleError +
             "Opnieuw proberen" ghost-Button) + NIEUW: (1) verstreken-tijd-regel (italic,
             fg.secondary, "verstreken {m:ss}"), (2) Button "Stop training" (variant primary,
             size md — zelfde actie-variant als de header-Stop, cluster-4-beslissing).
BEHAVIOUR:   Tap Stop → bestaand onStop-pad (saveWorkout met lege-sessie-guard + disconnect +
             summary) — gedrag identiek aan de header-Stop. "Opnieuw proberen" ongewijzigd.
             Overlay verdwijnt vanzelf zodra reconnect slaagt. Elapsed + Stop zichtbaar in álle
             niet-connected states (zoeken/verbinden/ontdekken/reconnect/verbreken/error).
CONSTRAINTS: Tokens-only (geen hardcodes); portrait én landscape (overlay staat buiten de
             layout-takken → gedeeld); geen nieuwe dependencies; dev-active-harness krijgt een
             ?ble=-param zodat de overlay-states zonder hardware op de sim te verifiëren zijn.
```

---

## Open vragen

_(geen — de vier kritische items zijn beantwoord uit de audit + code)_

## Aannames

- `[ASSUMPTION]` Stop in de overlay volgt de cluster-4-beslissing "Stop = primary" (consistent met de header-Stop); "Opnieuw proberen" blijft ghost.
- `[ASSUMPTION]` Label "Stop training" spiegelt "Start training" (app noemt een sessie "training").
- `[ASSUMPTION]` Een 0-tick-sessie die via de overlay stopt volgt het bestaande handleStop-gedrag (geen save door de lege-sessie-guard, wél summary) — bewust niet anders dan de header-Stop.

## Acceptatie

- [x] Overlay toont "verstreken {tijd}" in alle niet-connected BLE-states tijdens active
- [x] Stop-knop zichtbaar én bedraad naar onStop in alle overlay-states, incl. error naast "Opnieuw proberen"
- [x] Bestaand onStop-gedrag ongewijzigd (exact-één-keer-save, lege-sessie-guard, summary) — cross-file getraceerd in review
- [x] Render sim-geverifieerd via dev-active ?ble=reconnecting en ?ble=error (screenshot)
- [x] Tokens-only, tsc groen (geïsoleerde worktree, exit 0)

## Beslissingsgeschiedenis

- 2026-07-16: aangemaakt vanuit UX-audit P0-F2; Stop-variant = primary (hergebruik cluster-4-beslissing).
- 2026-07-16: 10-hoeken-review doorlopen; bewust geaccepteerd: lege summary bij 0-tick-Stop (zelfde klasse als header-Stop) en de dubbele Stop-knop i.p.v. header-hoisting (bandaid-vs-diepte gewogen — diepere overlay-herziening hoort bij audit-R2-familie). Pre-existing ghost-scan-gat (ble-service mist stopDeviceScan in cleanup) → HANDOFF-risico-entry.
