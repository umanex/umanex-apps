# HANDOFF.md — sessie-handoff (vooruitkijkend)

Dit bestand is de **vooruitkijkende tegenhanger** van `LEARNINGS.md`. Waar LEARNINGS de rauwe vangst van *fouten* is, houdt HANDOFF de open **onzekerheden, aannames, risico's, next steps en ideeën** bij die een sessie achterlaat — zodat een volgende sessie niet koud begint.

Entries komen erbij via de `sessie-reflectie` skill aan het einde van een sessie. De open items worden bij de start van een volgende sessie automatisch getoond via de user-level SessionStart-hook (`~/.claude/hooks/session-start-handoff.sh`). Niet handmatig bewerken tenzij je een status corrigeert.

## Waarom dit bestaat

Aan het einde van een sessie zit de meeste context in het hoofd van Claude en verdampt bij afsluiten: waar was ik het minst zeker over, welke aanname bleef onuitgesproken, wat breekt over 3 maanden, wat is de eerste zet volgende keer. HANDOFF vangt dat expliciet op zodat het meekomt.

Dit is **geen duplicaat van de eval-loop**. Een terugkerende *faalklasse* hoort in `LEARNINGS.md` (via `vastleggen`); een *durend feit* hoort in auto-memory. HANDOFF is enkel voor het vooruitkijkende, sessie-gebonden restant.

## Statussen

- `open` — vastgelegd bij reflectie, nog niet opgepakt. Wordt bij sessiestart getoond.
- `resolved` — opgepakt of beantwoord in een latere sessie; blijft staan als spoor, wordt niet meer getoond.

## Types

`onzekerheid` · `aanname` · `risico` · `next-step` · `idee` · `debt`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Bevinding:** {1-2 zinnen}
    - **Volgende zet:** {concreet actiepunt of "-"}
    - **Status:** open

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Project — rowtrack

## 2026-07-09 — IdlePhase merge + resterende varianten verifiëren · [next-step]
- **Bevinding:** IdlePhase goal-redesign zit op branch `feature/idlephase-goal-redesign` (commit `5635f6f`), niet gemerged. Enkel de Duur-variant is live op de simulator geverifieerd; none/distance/split/watts leunen op gedeelde-componenten-redenering.
- **Volgende zet:** De 5 doeltypes doorklikken op de simulator (m.n. Watt = actief segment uiterst rechts, en distance single-chip full-width + komma-decimaal), dan merge naar main + branch opruimen.
- **Status:** resolved — v1 gemerged (`9ce14f5`). Het variant-doorklik-punt keert terug in de v2 TC-EBC (branch `feature/idlephase-goal-suggestions`): enkel Duur live geverifieerd, geen idb voor auto-taps.

## 2026-07-09 — Scope-onzekerheid goal-redesign · [risico]
- **Bevinding:** De delta is afgeleid uit een Figma deep-read vs code, zonder zicht op het vórige design. Spacing (section 28, doel/picker 20), chip-hoogte 44→40 en de 0.20-fill kunnen bestaande drift zijn i.p.v. deel van "de aanpassing".
- **Volgende zet:** Bij Jeroen aftoetsen of enkel de nudge-bar/segments bedoeld waren; zo ja, de spacing/chip-extra's terugdraaien.
- **Status:** resolved — v2 (2026-07-09): Jeroen vroeg expliciet de toestel-, suggestie- én nudge-wijzigingen; de spacing/chip-drift is dus bewust deel van het design, niet terug te draaien.

## 2026-07-09 — 0.20 accent-selectie-fill zonder token · [debt]
- **Bevinding:** De actieve chip (Chip.tsx) én het actieve segment (GoalSegments.tsx) gebruiken `rgba(240,84,84,0.20)` hardcoded; er bestaat enkel `accent.muted` (0.12) en `accent.subtle` (0.06). Twee `// TODO`-markers wijzen ernaar.
- **Volgende zet:** Een `accent.selected` (0.20) token toevoegen via Tokens Studio → `tokens.json`, rebuilden, beide hardcodes vervangen.
- **Status:** open

## 2026-07-09 — Chip value/unit-split is fragiele heuristiek · [risico]
- **Bevinding:** IdlePhase splitst de chip-value/unit met `label.endsWith(' ${unit}')`. Dit is gekoppeld aan het exacte label-formaat van de formatters; een wijziging daar breekt stil de italic-unit-rendering (of toont een verkeerde unit).
- **Volgende zet:** Overwegen om `{value, unit}` gestructureerd uit de WheelItem-builders door te geven i.p.v. het label te parsen.
- **Status:** resolved — v2 (2026-07-09): split gecentraliseerd in gedeelde `wheelItemParts(item)` (formatters.ts), nu de enige bron voor zowel WheelPicker als de chips. Nog steeds label-gebaseerd, maar op één plek i.p.v. gedupliceerd.

## 2026-07-09 — Out-of-scope design-vragen IdlePhase · [onzekerheid]
- **Bevinding:** (1) Figma toont Roeitrainer-dot + Hartslag-hartje in accent-rood, ook disconnected; code toont ze grijs (Ble/HrStatusBar state-logica). (2) `buttonTokens.primary.height` = 48 maar `Button.sizeLg` = `space['44']` (44) — Start-knop rendert 44.
- **Volgende zet:** Bij Jeroen bevestigen of (1) de indicator-kleur gelijkgetrokken moet en (2) `Button.sizeLg` naar `buttonTokens.primary.height` moet.
- **Status:** open — (1) resolved in v2: nieuwe DeviceRow toont accent-rode dot/hart disconnected (Figma 32:374 bevestigde dit). (2) blijft open — Button.sizeLg (44) vs buttonTokens.primary.height (48) niet aangeraakt.
