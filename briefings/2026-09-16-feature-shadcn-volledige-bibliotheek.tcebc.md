# De volledige shadcn-bibliotheek in @umanex/ui, gespiegeld in Figma

- **Datum:** 2026-09-16
- **Type:** feature
- **Project:** packages/ui + packages/config (monorepo-niveau)
- **Klant:** umanex
- **Status:** gepland — batch 0 gevalideerd 2026-09-16 en gemerged (umanex-apps#512), layout-tokens volgt, batches 1–6 open

---

```
TASK:        Breid @umanex/ui uit van 15 naar 56 componenten + 3 composities (de volledige
             shadcn-bibliotheek), elk met story + Figma-pagina in de Component library
             (ko2OuasYxyY2YRD69MYhWX), rollaag gebonden, guards groen — in 7 batches, elk een PR.

CONTEXT:     packages/ui is de enige componentbron voor cashflow, jobradar, dashboard,
             portfolio, soda-plus. Die apps bouwen dialogs, selects, tabellen, radiogroepen en
             progress-balken vandaag met de hand. Figma is ontvanger; tokens.json blijft bron.
             De 15 bestaande componenten staan al in Figma (handgebouwd, node-ids deep-linked)
             en worden niet herbouwd. De nieuwe worden gebouwd via een DOM/Tailwind-adapter op
             de rowtrack code→Figma-keten (batch 0), trigger vastgelegd in BACKLOG 2026-09-09.

ELEMENTS:    Code — 41 componentbestanden in components/ui/, 3 in components/composities/,
             hooks/use-mobile.ts, 44 stories, package.json exports/deps, preset-keyframes +
             @tailwindcss/container-queries.
             Tooling — scripts/figma/* (story-axes, build-spec, build-prune, serve, links,
             check0, recept-/poort-selftest), figma/{builder,bouw-batch,lees-manifest,
             lees-geometrie,toets-batch}.js, recursieve geometry-parity, guard-assen [slots]
             [binding] [laagnaam].
             Figma — 44 pagina's: COMPONENT_SET (cva-assen + boolean/select-argTypes) of
             COMPONENT per component, sub-exports als extra nodes, overlays als *Content,
             composities als FRAME met instances.

BEHAVIOUR:   Storybook: Playground per component, args = Figma-assen, primaire export precies
             één keer gerenderd; overlays open via defaultOpen; docs-pagina toont "Open in
             Figma" + tokens-tabel. Figma: elke kleur/spacing/radius bindt aan Theme/Base,
             elke tekst aan sans/<size>-<weight>, lagen heten naar data-slot; een herbouw werkt
             bij op naam, ids en keys blijven. Guards: figma:check(+selftest), geometry, parity,
             tokens guard, ds:guard, figma:links --check groen; elke batch draagt zijn
             tegenproeven.

CONSTRAINTS: Tokens-first (bg-black/80 → overlay-scrim, rounded-[2px] → rounded-sm,
             text-[0.8rem] → text-dense); auto layout op elk frame; hover en focus-visible
             zijn een `state`-as (besluit 2026-09-17); asnamen = propnamen; eerste `variants: {` in een bestand =
             assen van de primary; argTypes plat; deterministisch renderen (geen
             datum-van-vandaag, geen random, geen netwerkbeelden, animaties uit); fileKey-guard
             in élke figma_execute; geen next build in de hoofdtree; commits feat(ui) per batch;
             bestaande nodes nooit vervangen.
```

---

## Open vragen

- De `state`-as (default, hover, focus-visible) op een set die ook `disabled` draagt: volledig product, of de combinaties `disabled × hover` en `disabled × focus-visible` weglaten? `disabled:pointer-events-none` maakt ze in de browser onbereikbaar, maar de `[varianten]`-as eist vandaag het volledige product. Blokkeert batch 1 (Toggle).
- De 17 sets die al in Figma staan (15 handgebouwd + Switch en Dialog): de `state`-as nu achteraf toevoegen, of alleen voor nieuwe componenten vanaf batch 1? De set-ids blijven in beide gevallen, maar de 15 handgebouwde weigert de builder (geen `bouwhash`). Blokkeert batch 1.
- De scope en dependencies, de oplevering, de recept-pagina's en de Field-port zijn beslist door Jeroen (zie Beslissingsgeschiedenis).

## Aannames

- `[ASSUMPTION: de shadcn-registry "default"-stijl (Tailwind 3, forwardRef) op ui.shadcn.com/r/styles/default/<naam>.json is de bron; bevestigd voor switch, sidebar, chart. Kbd, Field, Empty, InputGroup, Item, ButtonGroup, Spinner staan er in v4-syntax en worden handmatig geport.]`
- `[ASSUMPTION: Chart, Form en Sidebar passen slecht in een Figma-set; model: ChartContainer als component met tooltip/legend als extra's, FormItem als set met Figma-only as error, SidebarMenuButton als set (12) + shell als voorbeeldframe.]`
- `[ASSUMPTION: Table krijgt nog geen size-as — die wacht op BACKLOG "Compacte maat in @umanex/ui" (2026-09-07).]`
- `[ASSUMPTION: de Figma-keten wordt gekopieerd naar packages/ui met een ADAPTER-object, niet geëxtraheerd; rowtrack blijft onaangeroerd tot een derde consumer.]`

## Acceptatie

### Kritische assen

- [ ] Typologie — elke nieuwe component heeft precies één Figma-pagina met als primary de component(set) die `primair.mjs` noemt
- [ ] States — elke boolean-prop die de vorm verandert (`checked`, `disabled`, `pressed`, `open`, `isActive`) is een variant-as
- [ ] States — elke set waarvan de primary een `hover:`- of `focus-visible:`-klasse draagt, heeft een `state`-as (default, hover, focus-visible)
- [ ] States — een set zónder `hover:`- en `focus-visible:`-klassen heeft geen `state`-as (tegenproef: Separator, Label)
- [ ] Interactie n.v.t. — presentational primitives; state via Storybook-args, geen prototype-reactions in Figma
- [ ] Edge cases — aantal variant-nodes per set = product van de asgroottes (`[varianten]`-as)

### Batch 0 — tooling + Switch + Dialog

Spec en meting:

- [x] `figma:spec` eindigt met exit 0 op Switch en Dialog — bewijs: build-spec rc=0 (2 componenten, 5 variant-nodes, 0 fouten), build-prune rc=0, check0 rc=0
- [x] `build-spec.mjs --slots-uit` eindigt met exit 2 — bewijs: rc=2, "0 element(en) met data-slot=… verwacht precies 1" op alle 5 varianten
- [x] `build-spec.mjs --slots-uit` laat `build-spec.json` ongewijzigd — bewijs: shasum `67c4eae71b62` vóór en na
- [x] `ongebonden.json`: 3 unieke gaten, elk met reden in `BEKENDE_ONGEBONDEN` (opacity 0,5 · opacity 0,7 · DialogTitle leading-none) — bewijs: `figma:check` `[binding] 3 bekende ongebonden waarden over 4 voorkomens, geen nieuwe`
- [x] `build-spec`: 0 `klasse-waarde-mismatch`-fouten — bewijs: `fouten: 0` in de run van 2026-09-16
- [x] `laagnamen.json`: `heuristiek = 0` — bewijs: `perBron.heuristiek 0` over 19 nodes (component 5, slot 11, label 2, icon 1)
- [x] `laagnamen.json`: `indexNamen = 0` en `copyNamen = 0` — bewijs: "0 cijfernamen, 0 copy-namen" (build-prune)

Bouw:

- [x] `bouwresultaat.geweigerd = []` — bewijs: bouw 1 en bouw 2 (`figma_execute`, bouw-batch.js)
- [x] `bouwresultaat.onbekend = []` — bewijs: bouw 1 en bouw 2
- [x] `bouwresultaat.perSoort` bevat geen `icoon-placeholder` — bewijs: bouw 2 `perSoort: { tekst-zonder-text-style: 1 }`
- [x] `tekst-zonder-text-style` alleen op DialogTitle (leading-none, geen style op de tokenschaal) — bewijs: melding `Dialog[default]>header>title: tekst zonder text style (18/18 600)`, toets-batch `tekstZonderStyle: 1 (verwacht: title)`
- [x] Check 0: afstammelingen en tekstinhoud gelijk aan `check0.json` voor alle 5 varianten — bewijs: toets-batch `check0Gelijk` Switch 4/4, Dialog 1/1 (tekst, iconen én verfdozen)
- [x] Check 0 kan rood worden — bewijs: verfdozen-telling toegevoegd nadat Switch op tekst+iconen alleen 0 tegen 0 kon scoren; Switch 2, Dialog 3
- [x] VOCAB-toets: `buitenVocabAantal`, `numeriek`, `naarInhoudVernoemd`, `groepen` alle 0 — bewijs: toets-batch, beide componenten
- [x] VOCAB- en rauwe-waardentoets kunnen rood worden — bewijs: thumb hernoemd naar `Frame 1` + rauwe vulling → `buitenVocab 1`, `rauw 1` op precies die node; teruggezet, binding `VariableID:27:3` (background) op alle 4 thumbs, bouwhash `d2a23z:9` gelijk
- [x] `zonderAutoLayout = []` — bewijs: toets-batch, beide componenten
- [x] `description` gevuld met het bronpad op beide primaries — bewijs: toets-batch `description: true`
- [x] Rauwe-waardenscan: 0 fills/strokes/padding/gap/radius/effects zonder binding — bewijs: toets-batch `rauw: 0`, beide componenten
- [x] 7b-read-back: hoogte, layoutMode, padding, gap, radius, vullingen, randen, opacity gelijk aan de spec — bewijs: toets-batch `readbackVerschillen: 0` over 5 varianten
- [x] Tweede bouw: `hergebruikt = 5` (4 varianten + DialogContent; de set zelf telt de builder niet) — bewijs: bouw 2 `hergebruikt: 5`
- [x] Tweede bouw: node-ids én keys gelijk aan de eerste bouw — bewijs: set `107:31` id+key, varianten `107:23/25/27/29`, DialogContent `107:33` id+key, properties `title#107:0`/`description#107:1` — alle vijf vergelijkingen `true`
- [x] Dark-capture van beide sets bekeken — bewijs: `figma_capture_screenshot` 107:31 en 107:33 met explicit mode Dark; elke kleur volgt de modus; modus teruggezet, `explicitVariableModes` `{}` op beide
- [x] Beeld naast de browser gelegd — bewijs: Playwright-render van Dialog en Switch uit storybook-static naast de captures; zelfde opbouw, één verschil: iconstreep 2 px tegen 1,33 px (huisconventie van alle 5 legacy-iconen, BACKLOG 2026-09-16)

Neerslag en guards:

- [x] Manifest-diff = `effectStyles` (+`shadow/lg`) + precies 2 nieuwe pagina's — bewijs: veld-diff tegen HEAD: `.effectStyles.2`, `.pages.Switch`, `.pages.Dialog`, verder niets
- [x] `geometry.figma.json`: de 76 bestaande variant-metingen byte-gelijk — bewijs: `JSON.stringify(gemeten)` gelijk aan HEAD, sets 11 = 11, varianten 76 = 76
- [x] `figma:links` wijzigt precies 2 stories — bewijs: `--check` rc=1 op dialog + switch vóór, schrijven, `--check` rc=0 erna ("2 al juist")
- [x] `figma:check:selftest` groen — bewijs: sync-selftest 25/25, recept-selftest 8/8, poort-selftest 25/25, guard 31 checks
- [x] `figma:recept:selftest` reproduceert manifest en legacy-geometrie en wordt rood op beide defecten van LEARNINGS 2026-09-09 — bewijs: 8/8, incl. geneste assen en Base als lijst
- [x] `figma:poort:selftest` groen, inclusief "set zonder bouwhash → weigeren" — bewijs: 25/25
- [x] `parity`: 0 verschillen op de recursieve boom van Switch en Dialog — bewijs: "keten-pagina's: 5 varianten, 19 nodes recursief gelijk"
- [x] `geometry`: 0 diff op de 15 bestaande stories vóór `geometry:write` — bewijs: eerste run rood op alleen de 6 nieuwe story-ids
- [x] Parity-tegenproef: padding +4 diep in de boom geeft exact één rode regel — bewijs: `--selftest` "footer>button padding-links", 1 verschil
- [x] Parity-tegenproef in Figma zelf: opacity 0,7 → 0,8 op de sluitknop is rood — bewijs: na de tolerantiefix `Dialog/default>close opacity: Figma 0.8 tegen spec 0.7`, rc=1 (vóór de fix groen — de vondst)
- [x] Parity na terugdraaien groen — bewijs: schone lezing rc=0, 68 legacy + 5 keten-varianten
- [x] `type-check` (ui + vijf consumerende apps) groen — bewijs: turbo 6/6 successful
- [x] tokens guard groen — bewijs: "306 bestanden schoon (0 baseline-uitzonderingen)"
- [x] `ds:guard:selftest` groen — bewijs: 11/11, 9/9 apps
- [x] `build-storybook` exit 0 — bewijs: rc=0 (worktree, na de Slider-fix)
- [x] Button `asChild` rendert het kind — bewijs: story `AsChild` → `A`, 0 buttons, knopklassen aanwezig; Playground → `BUTTON` (Playwright, storybook-static)
- [x] HANDOFF 2026-08-25 "variant-modellering": de uitsluitingen doorgelopen — bewijs: HANDOFF-entry bijgewerkt, drie beweringen nagelezen in doel.mjs, input.tsx, ThemeToggle.tsx; status blijft open (besluit Jeroen)
- [ ] Stories-preview via de Storybook-MCP — [NIET TE VERIFIËREN — de PM2-Storybook op :6006 serveert de hoofdtree op een andere branch, niet deze worktree; herstart hoort na de merge]

### Batches 1–6

Worden per batch aan deze lijst toegevoegd vóór de bouw van die batch, met dezelfde vorm: per component `[pagina]`/`[variant]`/`[link]` groen, Check 0 gelijk, VOCAB 0, rauwe waarden 0, parity 0, geometry alleen nieuwe ids.

## Beslissingsgeschiedenis

- 2026-09-16: scope "écht alles" (41 nieuw) i.p.v. alleen de Radix-primitives of wat de apps nu nodig hebben — besluit Jeroen.
- 2026-09-16: losse `@radix-ui/react-*` én de niet-Radix dependencies (sonner, vaul, cmdk, input-otp, react-resizable-panels, embla, react-day-picker v9 + date-fns v4, recharts, react-hook-form, tanstack-table; devDeps zod, @hookform/resolvers) goedgekeurd — besluit Jeroen.
- 2026-09-16: één PR per batch van ~6–8 — besluit Jeroen.
- 2026-09-16: Combobox, DatePicker en DataTable krijgen ook een Figma-pagina (FRAME met instances) — besluit Jeroen; de sync-guard krijgt een `Composities`-tak.
- 2026-09-16: Field `responsive` 1-op-1 via `@tailwindcss/container-queries` in de gedeelde preset i.p.v. een `md:`-port — besluit Jeroen.
- 2026-09-16: de 15 handgebouwde componenten worden niet herbouwd (deep-links); ze krijgen alleen `data-slot`-attributen.
- 2026-09-16: briefing in de root `briefings/` i.p.v. `packages/ui/briefings/` (plan) — de wijziging raakt de gedeelde preset en daarmee alle apps.
- 2026-09-16: drie batch-0-items herschreven na meting, niet afgezwakt: `ongebonden ≤ 1` was een schatting uit het plan (gemeten 3, elk met reden in de guard), `hergebruikt = 6` telde de set mee die de builder niet telt (5 + gelijke set-id/key apart bewezen), en "geen tekst-zonder-text-style" sloot DialogTitle niet uit terwijl die per ontwerp geen style kan hebben.
- 2026-09-16: de parity-tolerantie van 0,51 gold ook voor opacity — een tegenproef in Figma bleef groen. Tolerantie per veld (0,01 voor opacity); daarna kwam `Slider disabled` boven (Figma 0,5, browser 1). De oorzaak zat in `slider.tsx` (`disabled:opacity-50` op een span) en is daar gerepareerd, niet in de guard uitgezonderd. Faalklasse in umanex-os/LEARNINGS (Globaal); rowtrack draagt dezelfde tolerantie (apps/rowtrack/BACKLOG.md).
- 2026-09-16: batch 0 in de worktree `.claude/worktrees/ui-batch-0` op verzoek van Jeroen, nadat een parallelle sessie de hoofdtree naar `main` zette.
- 2026-09-17: hover en focus-visible worden wél Figma-varianten, als `state`-as — besluit Jeroen, herroept het besluit van 2026-08-25. Gevolg voor de keten: de walker forceert `:hover`/`:focus-visible` per variant en de binding leest in die variant de `hover:`/`focus-visible:`-klassen in plaats van ze te negeren; varianten per interactieve set tot ×3. Werk in batch 1, vóór de eerste set.
- 2026-09-17: layout-tokens (spacing-schaal + rollen in `tokens.json`, Figma Base eruit gezet) als eigen PR tussen batch 0 en batch 1 — besluit Jeroen. Briefing: `briefings/2026-09-17-feature-layout-tokens.tcebc.md`.
