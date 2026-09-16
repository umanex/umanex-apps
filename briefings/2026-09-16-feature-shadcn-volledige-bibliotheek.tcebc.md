# De volledige shadcn-bibliotheek in @umanex/ui, gespiegeld in Figma

- **Datum:** 2026-09-16
- **Type:** feature
- **Project:** packages/ui + packages/config (monorepo-niveau)
- **Klant:** umanex
- **Status:** gepland

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
             text-[0.8rem] → text-dense); auto layout op elk frame; hover/focus geen variant
             (besluit 2026-08-25); asnamen = propnamen; eerste `variants: {` in een bestand =
             assen van de primary; argTypes plat; deterministisch renderen (geen
             datum-van-vandaag, geen random, geen netwerkbeelden, animaties uit); fileKey-guard
             in élke figma_execute; geen next build in de hoofdtree; commits feat(ui) per batch;
             bestaande nodes nooit vervangen.
```

---

## Open vragen

- Geen. De scope, dependencies, oplevering, recept-pagina's en de Field-port zijn beslist door Jeroen (zie Beslissingsgeschiedenis).

## Aannames

- `[ASSUMPTION: de shadcn-registry "default"-stijl (Tailwind 3, forwardRef) op ui.shadcn.com/r/styles/default/<naam>.json is de bron; bevestigd voor switch, sidebar, chart. Kbd, Field, Empty, InputGroup, Item, ButtonGroup, Spinner staan er in v4-syntax en worden handmatig geport.]`
- `[ASSUMPTION: Chart, Form en Sidebar passen slecht in een Figma-set; model: ChartContainer als component met tooltip/legend als extra's, FormItem als set met Figma-only as error, SidebarMenuButton als set (12) + shell als voorbeeldframe.]`
- `[ASSUMPTION: Table krijgt nog geen size-as — die wacht op BACKLOG "Compacte maat in @umanex/ui" (2026-09-07).]`
- `[ASSUMPTION: de Figma-keten wordt gekopieerd naar packages/ui met een ADAPTER-object, niet geëxtraheerd; rowtrack blijft onaangeroerd tot een derde consumer.]`

## Acceptatie

### Kritische assen

- [ ] Typologie — elke nieuwe component heeft precies één Figma-pagina met als primary de component(set) die `primair.mjs` noemt
- [ ] States — elke boolean-prop die de vorm verandert (`checked`, `disabled`, `pressed`, `open`, `isActive`) is een variant-as; hover/focus n.v.t. (besluit 2026-08-25, BACKLOG-item staat)
- [ ] Interactie n.v.t. — presentational primitives; state via Storybook-args, geen prototype-reactions in Figma
- [ ] Edge cases — aantal variant-nodes per set = product van de asgroottes (`[varianten]`-as)

### Batch 0 — tooling + Switch + Dialog

- [ ] `figma:spec` eindigt met exit 0 op Switch en Dialog
- [ ] `build-spec.mjs --slots-uit` eindigt met exit 2
- [ ] `build-spec.mjs --slots-uit` laat `build-spec.min.json` ongewijzigd (`git diff --quiet`)
- [ ] `ongebonden.json`: `aantalUniek ≤ 1`
- [ ] `build-spec`: 0 `klasse-waarde-mismatch`-fouten
- [ ] `laagnamen.json`: `heuristiek = 0`
- [ ] `laagnamen.json`: `indexNamen = 0` en `copyNamen = 0`
- [ ] `bouwresultaat.geweigerd = []`
- [ ] `bouwresultaat.onbekend = []`
- [ ] `bouwresultaat.perSoort` bevat geen `icoon-placeholder` en geen `tekst-zonder-text-style`
- [ ] Check 0: afstammelingen en tekstinhoud gelijk aan `check0.json` voor alle 5 varianten
- [ ] VOCAB-toets: `buitenVocabAantal`, `numeriek`, `naarInhoudVernoemd`, `groepen` alle 0
- [ ] `zonderAutoLayout = []` en `tekstZonderStyle = []`
- [ ] `description` gevuld met het bronpad op beide primaries
- [ ] Rauwe-waardenscan: 0 fills/strokes/padding/gap/radius/effects zonder binding
- [ ] 7b-read-back: padding, gap, radius, fills.length, strokes.length gelijk aan de spec
- [ ] Manifest-diff = `gegenereerd` + precies 2 nieuwe pagina's
- [ ] `figma:check:selftest` groen, inclusief recept-selftest
- [ ] `figma:poort:selftest` groen, inclusief de case "set zonder bouwhash → weigeren"
- [ ] `figma:links` wijzigt precies 2 stories
- [ ] `parity`: 0 verschillen op de recursieve boom van Switch en Dialog
- [ ] `geometry.figma.json`: de 76 bestaande variant-metingen byte-gelijk
- [ ] `geometry`: 0 diff op de 15 bestaande stories vóór `geometry:write`
- [ ] Tweede bouw met dezelfde spec: `hergebruikt = 6`
- [ ] Tweede bouw: node-ids van beide primaries gelijk aan de eerste bouw
- [ ] Parity-tegenproef: padding +4 op één variant geeft exact één rode regel
- [ ] Parity-tegenproef: na terugdraaien opnieuw groen
- [ ] Dark-capture van beide sets bekeken (`figma_capture_screenshot`)
- [ ] `type-check` (ui + turbo) groen
- [ ] tokens guard groen
- [ ] `ds:guard:selftest` groen
- [ ] `build-storybook` exit 0
- [ ] Button `asChild` rendert het kind (Slot) — story `AsChild` toont een `<a>`
- [ ] HANDOFF 2026-08-25 "variant-modellering": de uitsluitingen doorgelopen in `assen-uitsluitingen.mjs`

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
