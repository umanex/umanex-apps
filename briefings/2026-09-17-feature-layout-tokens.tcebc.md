# Layout-tokens — spacing-schaal en rollen in tokens.json, gebonden in code en Figma

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** packages/tokens + packages/config + packages/ui (monorepo-niveau)
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Maak layout een tokenlaag: een spacing-schaal plus rollen in tokens.json, de preset
             eruit gegenereerd, de 17 bestaande componenten op de rollen, Figma Base eruit gezet.
CONTEXT:     Batch "0.5" van de shadcn-bibliotheek (briefing 2026-09-16), tussen batch 0 en 1.
             Vandaag bestaan 22 Base-variabelen alleen in Figma (BEKENDE_GATEN) en komt spacing
             stil uit Tailwind's defaults. Model: Typography/Scale → build/typography.mjs.
ELEMENTS:    tokens.json — set Layout/Scale (spacing.*, border.*, icon.stroke), rollen in
             Theme/base (spacing.surface|menu|control-x|control-y|item-y|inline|stack|heading,
             size.control-sm|md|lg, radius-sm|md|lg|full). build.mjs → build/layout.mjs. preset.ts
             spacing/borderWidth/borderRadius uit tokens. token guard: arbitrary-spacing. 17
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

- Geen.

## Aannames

- `[ASSUMPTION: de rolnamen hieronder zijn een eerste voorstel; Jeroen keurt de naamlijst in de PR. Ze zijn afgeleid uit de klassen van de 17 componenten op 2026-09-17, niet uit een vuistregel.]`
- `[ASSUMPTION: size.control-sm en -lg hebben vandaag één consument (Button); ze staan erin omdat Toggle (batch 1) en Select (batch 2) dezelfde drie hoogtes dragen.]`
- `[ASSUMPTION: radius-sm|md|lg|full gaan mee omdat ze in dezelfde BEKENDE_GATEN-lijst staan; hun waarden blijven de huidige calc() op --radius.]`

### Naamlijst (voorstel)

| Rol | Alias | Consumenten (gemeten) | Utility |
|---|---|---|---|
| `spacing.surface` | `{spacing.6}` | Card, Dialog, Sheet | `p-surface` |
| `spacing.menu` | `{spacing.1}` | DropdownMenuContent, TabsList | `p-menu` |
| `spacing.control-x` | `{spacing.3}` | Input, Textarea, NativeSelect, TabsTrigger, Tooltip, Button sm | `px-control-x` |
| `spacing.control-y` | `{spacing.2}` | Input, Textarea, NativeSelect, Button | `py-control-y` |
| `spacing.item-y` | `{spacing.1_5}` | DropdownMenuItem, TabsTrigger, Tooltip | `py-item-y` |
| `spacing.inline` | `{spacing.2}` | Button, DropdownMenuItem, Dialog/Sheet-footer | `gap-inline`, `space-x-inline` |
| `spacing.stack` | `{spacing.4}` | DialogContent, SheetContent | `gap-stack` |
| `spacing.heading` | `{spacing.1_5}` | CardHeader, DialogHeader | `space-y-heading` |
| `size.control-sm` / `-md` / `-lg` | `{spacing.9}` / `{spacing.10}` / `{spacing.11}` | Button · Input, NativeSelect, TabsList, ThemeToggle | `h-control-md` |

Bewust géén rol: Button `px-4`/`px-8`, Badge `px-2.5 py-0.5`, menu `pl-8`/`px-2`, SheetHeader `space-y-2` (één consument, of wijkt af van de rol).

## Acceptatie

### Kritische assen

- [ ] Typologie — `Layout/Scale` staat in `PRIMITIVE_SETS` met `build/layout.mjs` als levering; er komt geen nieuwe rolgroep bij
- [ ] States n.v.t. — tokens hebben geen data-laag, dus loading/empty/error bestaan hier niet
- [ ] Interactie n.v.t. — tokens hebben geen gedrag; hover/focus hoort bij de bibliotheek-briefing
- [ ] Edge case — `spacing.4` op `1.1rem` laat `pnpm --filter @umanex/tokens build` falen
- [ ] Edge case — een ontbrekende Tailwind-v3-spacingsleutel laat de build falen
- [ ] Edge case — een rol die naar een onbestaande stap aliast laat de build falen

### Tokens en code

- [ ] `Layout/Scale` draagt elke spacing-sleutel van Tailwind v3 met dezelfde waarde (telling tegen `tailwindcss/defaultTheme`)
- [ ] `Theme/base` draagt precies de rollen uit de naamlijst
- [ ] `preset.ts` bevat geen literal spacing-, borderWidth- of radiuswaarde meer
- [ ] Gecompileerde Tailwind-CSS van cashflow is vóór/na byte-gelijk op bestaande regels
- [ ] Gecompileerde Tailwind-CSS van jobradar is vóór/na byte-gelijk op bestaande regels
- [ ] Gecompileerde Tailwind-CSS van dashboard is vóór/na byte-gelijk op bestaande regels
- [ ] Gecompileerde Tailwind-CSS van portfolio is vóór/na byte-gelijk op bestaande regels
- [ ] Gecompileerde Tailwind-CSS van soda-plus is vóór/na byte-gelijk op bestaande regels
- [ ] In de 17 componentbestanden staat geen schaalklasse meer die een rol uit de naamlijst dupliceert
- [ ] `pnpm --filter @umanex/ui geometry` geeft 0 verschillen na de klassewissel
- [ ] Token guard kent `arbitrary-spacing`; tegenproef `p-[13px]` in een componentbestand is rood
- [ ] `pnpm --filter @umanex/tokens guard` groen
- [ ] `pnpm ds:guard:selftest` groen
- [ ] `pnpm turbo type-check` groen

### Figma

- [ ] `BEKENDE_GATEN` in `packages/ui/scripts/figma-sync-check.mjs` is leeg
- [ ] `[dekking]` groen op het bijgewerkte manifest
- [ ] Tegenproef — een Base-variabele zonder tokenpad maakt `[dekking]` rood
- [ ] Elke rolvariabele in Base is een alias naar zijn schaalvariabele (read-back via de runtime)
- [ ] De ids van de 22 bestaande Base-variabelen zijn ongewijzigd (manifest-diff)
- [ ] Switch en Dialog binden padding, gap en hoogte aan de rolvariabele waar de code de rol-utility draagt
- [ ] De 15 handgebouwde componenten binden aan de rolvariabele waar de code de rol-utility draagt (log vóór/na per node)
- [ ] `pnpm --filter @umanex/ui parity` geeft 0 verschillen na de herbinding

### Docs en proces

- [ ] Storybook `Tokens/Layout` toont schaal en rollen, gelezen uit tokens.json
- [ ] `CLAUDE.md` (root) noemt `Layout/Scale` in de lagen-tabel
- [ ] De PR-body draagt de naamlijst ter review
- [ ] Na Jeroens Pull in Tokens Studio geeft zijn eerstvolgende push 0 diff op `Layout/Scale` en `Theme/base`

## Beslissingsgeschiedenis

- 2026-09-17: layout-tokens als schaal + rollen, als eigen PR tussen batch 0 en batch 1 — besluit Jeroen.
