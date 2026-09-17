# Layout-tokens — spacing-schaal en rollen in tokens.json, gebonden in code en Figma

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** packages/tokens + packages/config + packages/ui (monorepo-niveau)
- **Klant:** umanex
- **Status:** gebouwd — ronde 2 verwerkt; wacht op Jeroen (Figma teruggedraaid, naamlijst)

---

```
TASK:        Maak layout een tokenlaag: een spacing-schaal plus rollen in tokens.json, de preset
             eruit gegenereerd, de 17 bestaande componenten op de rollen, Figma Base eruit gezet.
CONTEXT:     Batch "0.5" van de shadcn-bibliotheek (briefing 2026-09-16), tussen batch 0 en 1.
             Vandaag bestaan 22 Base-variabelen alleen in Figma (BEKENDE_GATEN) en komt spacing
             stil uit Tailwind's defaults. Model: Typography/Scale → build/typography.mjs.
ELEMENTS:    tokens.json — set Layout/Scale (spacing.*, border.*, icon.stroke), rollen in
             Theme/base (spacing.surface|menu|control-x|control-y|item-y|inline|stack|heading,
             size.control-sm|md|lg). build.mjs → build/layout.mjs. preset.ts spacing en
             borderWidth uit tokens. token guard: arbitrary-spacing. 17
             componentbestanden. Figma: Base-collectie (schaal + rollen als alias). Docs: Tokens/Layout.
BEHAVIOUR:   Schaalwaarden = Tailwind v3 1-op-1, dus geen bestaande klasse verschuift; de build faalt
             op een afwijkende of ontbrekende stap. Rollen zijn CSS-variabelen in :root en worden
             utilities (p-surface, px-control-x, gap-inline, h-control-md). Figma-rolvariabelen zijn
             aliassen naar de schaalvariabele; bestaande variabele-ids blijven.
CONSTRAINTS: Een rol pas bij ≥ 2 componenten (gemeten), anders een schaalstap. Bulk-route voor
             tokens.json: één PR, Pull in Tokens Studio direct na de merge. Geen next build in de
             hoofdtree. fileKey-guard in elke figma_execute; Desktop Bridge op Component library.
             Handgebouwde nodes herbinden, nooit herbouwen; elke herbinding logt vóór/na.
```

---

## Open vragen

- Naamlijst (code-review ronde 2): `spacing.menu` dient ook de binnenpadding van TabsList, en `spacing.control-x`/`item-y` ook Tooltip en TabsTrigger — zelfde waarde, ander doel. Wie `menu` ruimer maakt, verschuift elke TabsList mee. Houden (rollen als gedeelde maat) of splitsen/hernoemen (rollen als doel)? Na de merge kost hernoemen een tweede `zet-base` plus herbinden in Figma.

## Aannames

- `[ASSUMPTION: de rolnamen hieronder zijn een eerste voorstel; Jeroen keurt de naamlijst in de PR. Ze zijn afgeleid uit de klassen van de 17 componenten op 2026-09-17, niet uit een vuistregel.]`
- `[ASSUMPTION: size.control-sm en -lg hebben vandaag één consument (Button); ze staan erin omdat Toggle (batch 1) en Select (batch 2) dezelfde drie hoogtes dragen.]`
- `[ASSUMPTION: radius-sm|md|lg|full blijven een bekend gat. De preset leidt ze met calc() af van één token (`radius`); ze als losse tokens uitschrijven wijzigt de CSS-uitvoer van elke app en is geen layout. Restant in BACKLOG 2026-08-25.]`

### Naamlijst (voorstel)

| Rol | Alias | Consumenten (gemeten) | Utility |
|---|---|---|---|
| `spacing.surface` | `{spacing.6}` | Card, Dialog, Sheet | `p-surface` |
| `spacing.menu` | `{spacing.1}` | DropdownMenuContent, TabsList | `p-menu` |
| `spacing.control-x` | `{spacing.3}` | Input, Textarea, NativeSelect, TabsTrigger, Tooltip, Button sm | `px-control-x` |
| `spacing.control-y` | `{spacing.2}` | Input, Textarea, NativeSelect, Button | `py-control-y` |
| `spacing.item-y` | `{spacing.1_5}` | DropdownMenuItem, TabsTrigger, Tooltip | `py-item-y` |
| `spacing.inline` | `{spacing.2}` | Button, DropdownMenuItem, Dialog/Sheet-footer | `gap-inline`, `space-x-inline` |
| `spacing.stack` | `{spacing.4}` | DialogContent (grid), SheetContent (geen flex/grid: de gap doet daar niets — BACKLOG 2026-09-17); tweede echte consument: AlertDialogContent in batch 2 | `gap-stack` |
| `spacing.heading` | `{spacing.1_5}` | CardHeader, DialogHeader | `space-y-heading` |
| `size.control-sm` / `-md` / `-lg` | `{spacing.9}` / `{spacing.10}` / `{spacing.11}` | Button · Input, NativeSelect, TabsList, ThemeToggle | `h-control-md` |

Bewust géén rol: Button `px-4`/`px-8`, Badge `px-2.5 py-0.5`, menu `pl-8`/`px-2`, SheetHeader `space-y-2` (één consument, of wijkt af van de rol).

## Acceptatie

### Kritische assen

- [x] Typologie — `Layout/Scale` staat in `PRIMITIVE_SETS` en levert `layout.mjs` — bewijs: `packages/tokens/build.mjs` regel 57; build schrijft `build/layout.mjs` (rc=0)
- [x] Typologie — `ROLE_GROUPS` blijft `Theme` en `Semantic`; de rollen landen in `Theme/base` — bewijs: `git diff origin/main -- packages/tokens/build.mjs` raakt `ROLE_GROUPS` niet; `theme.css` :root draagt `--spacing-surface` … `--size-control-lg` (11 regels)
- [x] States n.v.t. — tokens hebben geen data-laag, dus loading/empty/error bestaan hier niet — bewijs: geen component of datastroom in de diff buiten klassewissels
- [x] Interactie n.v.t. — tokens hebben geen gedrag; hover/focus hoort bij de bibliotheek-briefing — bewijs: besluit 2026-09-17 staat in `2026-09-16-feature-shadcn-volledige-bibliotheek.tcebc.md`
- [x] Edge case — `spacing.4` op `1.1rem` laat `pnpm --filter @umanex/tokens build` falen — bewijs: rc=1, "spacing.4 is 1.1rem, Tailwind-default is 1rem"
- [x] Edge case — een ontbrekende Tailwind-v3-spacingsleutel laat de build falen — bewijs: `spacing.7` weg → rc=1, "spacing.7 ontbreekt in Layout/Scale"
- [x] Edge case — een rol die naar een onbestaande stap aliast laat de build falen — bewijs: `{spacing.13}` → rc=1, "Some token references (1) could not be found"; tokens.json daarna byte-gelijk hersteld (sha `aef4900de4b0`)

### Tokens en code

- [x] `Layout/Scale` draagt elke spacing-sleutel van Tailwind v3 met dezelfde waarde — bewijs: 35/35 sleutels uit `tailwindcss/defaultTheme` (3.4.19); de build-guard toetst ze bij elke build
- [x] `Theme/base` draagt precies de rollen uit de naamlijst — bewijs: `layoutRoleUtilities` in `build/roles.mjs` = 11 sleutels, gelijk aan de tabel
- [x] `preset.ts` bevat geen literal spacing- of borderWidth-waarde — bewijs: `spacing` en `borderWidth` komen uit `@umanex/tokens/layout`; rollen als `var(--…)` uit `layoutRoleUtilities`
- [x] Gecompileerde Tailwind-CSS van cashflow is vóór/na byte-gelijk op bestaande regels — bewijs: `tailwindcss -c` vóór/na de preset-wissel `cmp` gelijk (46 384 B); tegenproef `spacing.4 = 1.1rem` in layout.mjs → 26 regels verschil (op packages/ui)
- [x] Gecompileerde Tailwind-CSS van jobradar is vóór/na byte-gelijk op bestaande regels — bewijs: `cmp` gelijk (39 096 B), zelfde run
- [x] Gecompileerde Tailwind-CSS van dashboard is vóór/na byte-gelijk op bestaande regels — bewijs: `cmp` gelijk (36 186 B), zelfde run
- [x] Gecompileerde Tailwind-CSS van portfolio is vóór/na byte-gelijk op bestaande regels — bewijs: `cmp` gelijk (41 665 B), zelfde run
- [x] Gecompileerde Tailwind-CSS van soda-plus is vóór/na byte-gelijk op bestaande regels — bewijs: `cmp` gelijk (30 588 B), zelfde run; gemeten vóór de klassewissel in de componenten, die de CSS bedoeld verandert
- [x] In de 17 componentbestanden staat geen schaalklasse meer die een rol uit de naamlijst dupliceert — bewijs: grep per rol op zijn consumenten 0/0/0/0/0/0/0/0/0/0/0/0; positieve controle: `p-6` in `card.tsx` op origin/main = 3
- [x] `pnpm --filter @umanex/ui geometry` geeft 0 verschillen na de klassewissel — bewijs: 225 elementen over 42 stories, 0 maatverschillen tegen de basislijn van main (56 klassewijzigingen), 3 identieke runs; tegenproef `--spacing-surface: 1.25rem` in de gebouwde CSS → 12 verschillen
- [x] Token guard kent `arbitrary-spacing`; tegenproef `p-[13px]` in een componentbestand is rood — bewijs: `badge.tsx` met `p-[13px]` → rc=1 op `[arbitrary-spacing]`; zonder de baseline-regel valt cashflow `ReservationSection.tsx:261`
- [x] `pnpm --filter @umanex/tokens guard` groen — bewijs: rc=0, 400 bestanden, 1 baseline-uitzondering (apps/cashflow/BACKLOG.md 2026-09-17)
- [x] `pnpm ds:guard:selftest` groen — bewijs: rc=0, 9/9 apps
- [x] `pnpm turbo type-check` groen — bewijs: `--force`, 9/9 taken, 0 uit cache; tegenproef: een typefout in `preset.ts` faalt jobradar (TS2322)

### Gevonden tijdens de bouw

- [x] `cn()` laat een className van de consument winnen van een rol-utility — bewijs: 7 gevallen (`cn("p-surface","p-4")` = `p-4`, `cn("h-control-md w-full","h-8")` = `w-full h-8`, …) groen; zonder de uitbreiding hield tailwind-merge beide klassen. Eenmalige probe, niet gecommit; structureel leest `cn()` dezelfde `layoutRoleUtilities` als de preset
- [x] `geometry-check` meet de eerste story met geladen fonts — bewijs: badge--playground koud 73 px met 0 fonts, warm 72 px met 2 (eenmalige probe); na de fix 3 runs identiek
- [x] `geometry-check` meet een uitgelopen animatie — bewijs: tooltip--open gaf opacity 0 en 1 op dezelfde build; na de fix 3 runs identiek
- [x] `geometry-check` meet de breedte van `w-control-md` — bewijs: `button--sizes [5].w` en `themetoggle--default [1].w` weer 40 in de basislijn
- [x] `lees-manifest.js` leest een alias als getal plus `aliassen` — bewijs: recept-selftest 8/8 op het ververste manifest; tegenproef zonder alias-resolutie 6/8

### Figma

- [x] `BEKENDE_GATEN` in `packages/ui/scripts/figma-sync-check.mjs` bevat alleen `radius-sm`, `radius-md`, `radius-lg` en `radius-full` — bewijs: `git diff`; de ratel faalde eerst op 17 namen die wél een token kregen
- [x] `[dekking]` groen op het bijgewerkte manifest — bewijs: "96/100 variabelen gedekt door tokens.json; 4 bekende gaten (radius-stappen)"
- [x] Tegenproef — een Base-variabele zonder tokenpad maakt `[dekking]` rood — bewijs: selftest-case `spacing-13 = 52` rood op [dekking] (verhuisd van `spacing-7`, dat nu een token heeft)
- [x] Elke rolvariabele in Base is een alias naar zijn schaalvariabele — bewijs: runtime read-back 11/11 (`spacing-surface→spacing-6 [GAP]` … `size-control-lg→spacing-11 [WIDTH_HEIGHT]`); `[schaal]` toetst het tegen Theme/base, met 2 nieuwe tegenproeven
- [x] De ids van de 22 bestaande Base-variabelen zijn ongewijzigd — bewijs: `idsGewijzigd: []` in dezelfde call als het schrijven; tweede droge run 0 wijzigingen
- [x] Switch en Dialog binden padding en gap aan de rolvariabele waar de code de rol-utility draagt — bewijs: spec 0 fouten; Dialog runtime read-back `DialogContent` padding `spacing-surface` ×4, gap `spacing-stack`, header `spacing-heading`, footer `spacing-inline`, knoppen `spacing-control-y`; toets-batch 7b 0 verschillen. Switch draagt geen rol-utility
- [x] De 15 handgebouwde componenten binden aan de rolvariabele waar de code de rol-utility draagt — bewijs: 213 velden herbonden met log vóór/na, 4 bewust niet (Sheet-gap, waarde ≠ rol → BACKLOG 2026-09-17); read-back per pagina: resterende `spacing-N` zijn alleen stappen zonder rol (`px-4`, `px-8`, `px-2`, separator, `pr-9`, `h-20`, `pt-2`)
- [x] `pnpm --filter @umanex/ui parity` geeft 0 verschillen na de herbinding — bewijs: 68 varianten + 19 keten-nodes, 2 runs; TabsTrigger, ThemeToggle en SheetContent slaat parity al over (geen playground met die assen)

### Review-ronde 1 (code-review PR umanex-apps#524, 15 bevindingen)

- [x] R1 (P1) — `[schaal]` is rood als een stap uit `Layout/Scale` in Figma Base ontbreekt — bewijs: selftest-case "stap uit Layout/Scale ontbreekt in Figma" (`icon-stroke` weg) rood op [schaal]; figma:check:selftest 28 tegenproeven groen
- [x] R2 (P1) — de swatch-matrix van `apps/cashflow/scripts/render-screens.tsx` telt alleen kleurrollen, geen layout-rollen — bewijs: CI-log `verify:visual` "✓ 54 rollen" op dd83810 (vóór), "✓ 43 rollen" op c5d1db5 (na) = `hslRoles` + `rawRoles` (43)
- [ ] R3 (P1) — de keten bindt de hoogte van een element met `h-control-*` aan `size-control-*` — spec: `hVar: Base:size-control-md` ×2 en de toets met tegenproef slaagde; **daarna teruggedraaid in Figma** (DialogContent terug op de kinderen `141:53…` van de vorige bouw, geen height-binding — vermoedelijk een undo in Desktop). Opnieuw bouwen wacht op Jeroen (HANDOFF 2026-09-17)
- [x] R4 (P1) — de keten bindt de breedte van een element met `w-control-*` aan `size-control-*` — bewijs: Button tijdelijk uit LEGACY en door de walker: `size=icon` → `h` en `w` = `Base:size-control-md` (40×40), `sm` → `size-control-sm`, `lg` → `size-control-lg`; daarna teruggezet, `figma/` git-schoon. De builder bindt `width` via dezelfde `bind()` als `height` (R3, in Figma gemeten)
- [x] R5 (P2) — een baseline-regel in de token guard dekt één fragment, niet het hele bestand — bewijs: `mt-[13px]` op dezelfde regel als `pl-[22px]` → rc=1 op [arbitrary-spacing]
- [x] R6 (P2) — een baseline-regel zonder treffer maakt de token guard rood — bewijs: `pl-[22px]` → `pl-5` → rc=1 op [baseline-verouderd]
- [x] R7 (P2) — `build-prune` meldt een `space-x/y`-rol waarvan de marge afwijkt, in plaats van stil op de stap te binden — bewijs: marge onder `space-y-heading` in `build-spec.json` op 8 gezet → `ongebonden.json` bevat "spacing-heading (6) ≠ marge 8" (nieuwe ongebonden waarde = rood op [binding], bestaande selftest-case); daarna teruggezet, `figma/` git-schoon
- [x] R8 (P2) — `@umanex/tokens` staat in `dependencies` van `@umanex/ui` — bewijs: `packages/ui/package.json`; lockfile-diff verplaatst alleen die entry (+3/−3)
- [x] R9 (P2) — een gefaalde layout-validatie laat `theme.css` en `roles.mjs` ongewijzigd — bewijs: `spacing.4 = 1.1rem`, ontbrekende stap, kapotte alias en `spacing.auto` → rc=1 met sha van build/ gelijk; tegenkant: de HEAD-build met dezelfde fout zet `1.1rem` in theme.css
- [x] R10 (P2) — `$`-sleutels op groepsniveau breken build, payload en `figma:check` niet — bewijs: `$type`/`$description` op spacing, border en Theme/base → build rc=0 met identieke uitvoer, payload gelijk, figma:check rc=0; tegenkant: HEAD-payload gooit "geen getal", HEAD-build exporteert `$type` als stap
- [x] R11 (P2) — `arbitrary-spacing` vangt `!p-[…]`, niet-px-waarden en `scroll-m/p` — bewijs: `!p-[13px]`, `gap-[1ch]`, `p-[5%]`, `scroll-mt-[13px]`, `sm:!-mt-[2px]`, `m-[calc(1rem+2px)]` elk rc=1; scope telt met de ruime regex 1 treffer (de gebaselinede)
- [x] R12 (P3) — de ESLint-spiegel (`packages/config/eslint/tokens.cjs`) kent `arbitrary-spacing` — bewijs: eslint via stdin in jobradar: `p-[13px]` en `!mt-[3px]` rc=1, `p-4 gap-inline` rc=0; `pnpm --filter jobradar lint` schoon
- [x] R13 (P3) — de botsingscheck kent Tailwinds gereserveerde spacing-sleutels (`auto`, `full`, `screen`, `min`, `max`, `fit`) — bewijs: rol `spacing.auto` → rc=1 "gereserveerde Tailwind-sleutel"
- [x] R14 (P3) — `gapRol` volgt dezelfde voorrang als `paddingRollen` (een latere schaalklasse wist de rol) — bewijs: probe `gap-stack gap-y-2` (kolom) → null; `gap-inline` (rij) → spacing-inline; spec van Dialog ongewijzigd behalve `hVar`
- [x] R15 (P3) — `layout.mjs` exporteert geen ongebruikte `iconStroke` — bewijs: diff `build/layout.mjs` −2 regels, `layout.d.ts` −1; `grep -rn iconStroke packages apps` buiten build.mjs-commentaar 0
- [x] R15b (P3) — de build eist van `icon.stroke` alleen een getal — bewijs: `1.5` → rc=0, `dik` → rc=1 "icon.stroke ontbreekt of is geen getal"
- [x] R17 (P1) — de ESLint-spiegel breekt `cashflow#lint` niet op de gebaselinede plek (CI-run 35248117831 faalde erop) — bewijs: `eslint-disable-next-line` met verwijzing naar dezelfde BACKLOG-entry; `turbo lint --force` 7/7 lokaal; CI-run 35248551985 groen
- [x] R16 (P3) — naar BACKLOG: `border`-groep botst in de merge met kleurrol `border`; rolgroepen en alias-regex staan op drie plekken; spacing- en size-rollen zijn als utility onderling uitwisselbaar — bewijs: BACKLOG 2026-09-17 (drie entries)

### Review-ronde 2 (code-review PR umanex-apps#524, 15 bevindingen, geen P0/P1)

- [x] S1 (P2) — het Tokens-blok op een component-docspagina toont de layout-rollen die het component gebruikt — bewijs: gerenderde docs op storybook-static: Button 6 layout-rijen (`spacing.inline`, `size.control-md`, …), Card 2, Badge 0
- [x] S2 (P2) — `[schaal]` is rood als `icon-stroke` in Figma niet 2 is (lucide tekent op 2, ongeacht het token) — bewijs: selftest-case "icon-stroke 1.5 in token én Figma" rood op [schaal]; zonder de regel bleef hij groen
- [ ] S3 (P2) — de naamcontrole in `toets-batch` vergelijkt padding en gap alleen op auto-layout-nodes
- [x] S4 (P2) — de naamcontrole in `toets-batch` meldt een ontbrekende variant- of kind-node als verschil — bewijs: spec met een extra kind in de footer → "default>footer>extra: node ontbreekt in Figma"
- [x] S5 (P3) — `figma-sync-check` herkent een layout-rol met een cijfer in de naam (`size-control-2xl`) — bewijs: zwijg-kant-case groen; met de oude regex vals alarm
- [x] S6 (P3) — een baseline-regel in de token guard dekt een vast aantal voorkomens; één meer is rood — bewijs: tweede `pl-[22px]` in ReservationSection → rc=1; hersteld rc=0
- [x] S7 (P3) — padding of gap van 1 px bindt aan `spacing-px` (build-spec en build-prune) — bewijs: eenmalige probe op de broncode van beide `spacingVar`: 1 → `Base:spacing-px`, 6/24 ongewijzigd, 13 → null
- [x] S8 (P3) — `toets-batch` bouwt de variabelen-map één keer per batch — bewijs: map vóór de componentlus met `Promise.all`; de run in Figma (S4) slaagt ermee
- [x] S9 (P3) — de swatch-matrix van cashflow leest de positieve lijst `hslRoles` + `rawRoles` — bewijs: filter op `hslRoles.includes \|\| rawRoles.includes`; cashflow type-check groen [CI-telling volgt na push]
- [x] S10 (P3) — de melding van `arbitrary-spacing` verwijst niet naar umanex-rollen die in rowtrack-web niet bestaan — bewijs: melding "gebruik een schaalstap of een layout-rol uit de preset van deze app" in guard en ESLint-spiegel
- [x] S11 (P3) — `figma/base-payload.json` kan niet ongemerkt verouderen ten opzichte van tokens.json — bewijs: `base-payload.mjs --check` rc=0 actueel, rc=1 na `spacing.surface → {spacing.5}`; draait als eerste stap van `figma:check:selftest` (CI)
- [x] S12 (P3) — `geometry-check` wacht niet op een gepauzeerde animatie — bewijs: filter `playState !== 'paused'`; geometry 2× groen op de verse build
- [x] S13 — naar BACKLOG: variants en `ps-/pe-`/margin-rollen in de voorrangsregel; niet-numerieke schaalstappen; bereik van de eslint-disable — bewijs: BACKLOG 2026-09-17 (drie entries)

### Docs en proces

- [x] Storybook `Tokens/Layout` toont schaal en rollen, gelezen uit tokens.json — bewijs: render op storybook-static: 11 rolrijen met gemeten 24/4/12/8/6/8/16/6/36/40/44 px, 40 schaalrijen; Radius-pagina toont weer 1 rij
- [x] `CLAUDE.md` (root) noemt `Layout/Scale` in de lagen-tabel — bewijs: `git diff origin/main -- CLAUDE.md`
- [x] De PR-body draagt de naamlijst ter review — bewijs: `gh pr view 524 --json body` bevat de tabel (`spacing.surface` … `size.control-sm/md/lg`)
- [ ] Na Jeroens Pull in Tokens Studio geeft zijn eerstvolgende push 0 diff op `Layout/Scale` en `Theme/base` — [NIET TE VERIFIËREN vóór de merge — vraagt Jeroens pull]

## Beslissingsgeschiedenis

- 2026-09-17: layout-tokens als schaal + rollen, als eigen PR tussen batch 0 en batch 1 — besluit Jeroen.
- 2026-09-17: radius-stappen buiten deze PR — ze zijn een calc() op één token, geen layout, en uitschrijven wijzigt de CSS-uitvoer van elke app.
- 2026-09-17: `cn()` uitgebreid met de rol-sleutels — zonder dat wint een className van de consument niet meer van een rol-utility (17 overrides in de apps).
- 2026-09-17: Figma Base spiegelt de volledige `Layout/Scale` (41 variabelen), niet alleen de gebruikte stappen — dan zegt de dekkingscheck iets over de bron in plaats van over het gebruik.
