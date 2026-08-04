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
    - **Status:** resolved — root `.npmrc` en het symlink-postinstall zijn weg; elke Next-app
  resolvet nu zijn eigen react 18.3.1 + react-dom 18.3.1 en rowtrack houdt 19.1.0. Eén
  open punt: `node-linker=hoisted` in `apps/rowtrack/.npmrc` wordt níét gehonoreerd —
  pnpm behandelt die instelling workspace-breed — dus rowtrack draait nu op de
  geïsoleerde layout. De Next-kant is volledig geverifieerd; of Metro daarmee overweg
  kan moet één keer op een toestel bevestigd worden.

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Klant — umanex

## 2026-08-04 — React 18 en 19 delen één platte node_modules · [risico]
- **Bevinding:** De root `.npmrc` zet `node-linker=hoisted` en `shamefully-hoist=true`, dus
  de hele workspace deelt één platte `node_modules` met één `react`. Rowtrack pint
  `react@19.1.0` (Expo 54), de vier Next 14-apps en `packages/ui` willen `^18`. React 19
  wint aan de root; `react-dom` blijft op 18.3.1 omdat rowtrack die niet gebruikt. Het
  postinstall-script in de root `package.json` symlinkt daarom elke app-`react` naar
  `next/node_modules/react`. Die constructie breekt zodra een nieuwe dependency met een
  React-peer de resolutie verschuift: `pnpm add recharts` liet `next/node_modules/react`
  verdwijnen, waarna elke Next-build viel met `ReactCurrentDispatcher of undefined`.
- **Volgende zet:** `node-linker=hoisted` verplaatsen van de workspace-root naar
  `apps/rowtrack/.npmrc` (waar hij al staat), zodat de Next-apps pnpm's geïsoleerde layout
  krijgen en elk hun eigen react 18 + react-dom 18 resolven. Daarna kan het
  symlink-postinstall weg. Let op: pnpm behandelt `node-linker` als workspace-brede
  instelling, dus een per-package `.npmrc` wordt mogelijk genegeerd — lukt dat niet, dan is
  rowtrack uit de pnpm-workspace halen (eigen lockfile) het gangbare alternatief voor een
  React Native-app in een gemengde monorepo. Verifieer met een schone install plus een
  build van alle vier de Next-apps én een Metro-start van rowtrack.
- **Status:** open

