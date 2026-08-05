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

# Klant — umanex

## 2026-08-04 — React 18 en 19 delen één platte node_modules · [risico]
- **Verplaatst:** dit punt hoort bij RowTrack, want die app dwingt de platte layout af. De volledige bevinding — inclusief de mislukte poging met de geïsoleerde layout (alle Next-builds groen, Metro valt op de phantom dependency `@expo/metro-runtime`) en de drie uitwegen — staat in `apps/rowtrack/HANDOFF.md`, entry van dezelfde datum. Hieronder de oorspronkelijke, inmiddels achterhaalde formulering.
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
- **Status:** resolved — verplaatst naar `apps/rowtrack/HANDOFF.md` (2026-08-04)

## 2026-08-05 — Tokens Studio push-round-trip is nooit getest · [risico]
- **Bevinding:** De pull werkt — de zeven sets landen correct als groepen in de plugin. Maar
  er is nooit *vanuit* de plugin gepusht met deze structuur. Twee constructies zijn exotisch
  genoeg om anders genormaliseerd te worden: de same-set rol-aliassen (`ring: {primary}`) en
  de alpha-modifier (`overlay.scrim: rgba({Base.black}, 0.5)`). Normaliseert de plugin die
  bij een push, dan herschrijft de eerstvolgende Figma-push stil de rollaag, en de
  auto-commit in `tokens-sync.yml` publiceert dat naar main.
- **Volgende zet:** Maak in Figma een triviale wijziging (bv. één primitive), push vanuit de
  plugin naar een wegwerp-branch, en diff `tokens.json` tegen main. Kijk specifiek of
  `{primary}` en `rgba({Base.black}, 0.5)` overleven. Pas daarna vrijuit pushen naar main.
- **Status:** open

## 2026-08-05 — Token-refactor is nooit visueel geverifieerd · [onzekerheid]
- **Bevinding:** De hele twaalf-stappen-refactor is geverifieerd op CSS-niveau: gecompileerde
  output per app, per selector, per mode, plus contrast-berekeningen. Geen enkel gerenderd
  scherm gezien. In cashflow verschuiven `--muted-foreground`, `--foreground`, `--border`,
  `--input`, `--ring`, `--destructive` en `--secondary` allemaal doordat de app van zijn
  gedrifte handgeschreven kopie naar de gegenereerde waarden gaat. Ik verklaarde de
  `--secondary`-flip "inert" op basis van greps — en juist deze sessie bleek een grep te
  falen op `ScoreBadge`, waar de variant in een variabele berekend wordt in plaats van als
  attribuut te staan.
- **Volgende zet:** cashflow en jobradar naast elkaar in light en dark bekijken, met aandacht
  voor de invoervelden (`border-input` werd lichter), zebra-rijen (`bg-muted` werd sterker)
  en de foutmeldingen (`text-destructive`).
- **Status:** open

## 2026-08-05 — Semantic/dark is afgeleid, niet ontworpen · [aanname]
- **Bevinding:** Elke dark-waarde in `Theme/dark` en `Semantic/dark` is door mij gekozen door
  een plausibele primitive te prikken en daarna het contrast te meten. Contrast is een
  ondergrens, geen ontwerp. `finance-negative` is in dark `Destructive.400` (#F87171) — een
  vrij felle zalm die op een dichte financiële tabel eerder alarmerend dan informatief kan
  lezen. Er ligt geen dark-design naast.
- **Volgende zet:** Bij het eerste echte gebruik van dark mode in cashflow: de finance-rollen
  beoordelen als *set* i.p.v. per token. Bevalt het niet, dan is het één alias per rol in
  `Semantic/dark`.
- **Status:** open

## 2026-08-05 — Een nieuwe token-set levert stil geen output · [risico]
- **Bevinding:** `classifySet` in `packages/tokens/build.mjs` noemt alles buiten `Theme/` en
  `Semantic/` een primitive, en primitives hebben sinds deze refactor geen output meer. Voeg
  je straks een set `Spacing` of `Shadow` toe, dan resolvet die netjes, faalt niets, en komt
  er niets uit — precies de stille faalmodus die de rest van deze refactor heeft uitgeroeid.
  De typografie ontsnapt eraan omdat ze een expliciete eigen pass heeft.
- **Volgende zet:** Bij het toevoegen van de eerste nieuwe as (spacing is de meest
  waarschijnlijke): een expliciete allow-list van bekende primitive-sets in `classifySet`,
  die gooit op een onbekende set in plaats van hem stil als primitive te classificeren.
- **Status:** open

## 2026-08-05 — Guard-baseline en dode eslint-config · [debt]
- **Bevinding:** Twee dingen die eruitzien als handhaving maar het niet zijn. (1) De
  `BASELINE` in `packages/tokens/scripts/guard.mjs` bevat twee `rounded-[2px]`/`[3px]`-sites;
  baselines groeien in de praktijk aan tenzij iemand ze bewaakt. (2) `packages/config/eslint`
  is flat-config (ESLint 9-stijl) in een repo die ESLint 8 + `.eslintrc` + `next lint` draait,
  en wordt door niets geconsumeerd. Ik heb er deze sessie omheen gewerkt door de regels per
  app te zetten, maar het bestand staat er nog en ziet eruit alsof het werkt.
- **Volgende zet:** Ofwel een radius-schaalstap toevoegen zodat de baseline leeg kan, ofwel de
  twee sites accepteren en de baseline bevriezen met een teller-check. En `packages/config/eslint`
  ofwel migreren naar flat config plus bedraden, ofwel verwijderen.
- **Status:** open

## 2026-08-05 — Visuele regressie-harness ontbreekt · [idee]
- **Bevinding:** De verificatie-as die deze hele sessie miste. `apps/cashflow/scripts/render-charts.tsx`
  doet dit al voor de grafieken: componenten met synthetische data naar een los HTML-bestand
  renderen, buiten de login gate om. Datzelfde patroon uitgebreid naar de kern-componenten,
  met een light- en een dark-variant naast elkaar, had elke kleurverschuiving van deze
  refactor zichtbaar gemaakt zonder in te loggen.
- **Volgende zet:** `scripts/render-screens.tsx` naar het model van `render-charts.tsx`, met
  beide modes naast elkaar. Ook bruikbaar als input voor `ux-audit` en voor `code-naar-figma`.
- **Status:** open

## 2026-08-05 — Geen brand-laag: heropenen bij een tweede merk · [aanname]
- **Bevinding:** De keuze om géén brand-/merklaag te bouwen rust op één aanname: jobradar is
  de enige app die van de umanex-rollaag afwijkt, en dat blijft zo. De override is vandaag zes
  declaraties per mode in `apps/jobradar/app/globals.css`. Komt er een tweede afwijkend merk
  bij, dan wordt dat twee losse blokken die elk apart kunnen driften — precies het probleem
  dat deze refactor bij de handgeschreven `globals.css`-kopieën heeft opgelost.
- **Volgende zet:** Bij een tweede afwijkend merk: het afgewezen brand-laag-voorstel opnieuw
  bekijken (staat in de synthese van de analyse-workflow), met per-merk rollagen i.p.v. een
  alias-overlay — die laatste lost een omgekeerde rolsemantiek niet op.
- **Status:** open
