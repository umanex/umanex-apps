# CLAUDE.md — packages/ui

De gedeelde UI-laag van de monorepo: shadcn-achtige primitives op de rollaag van
`@umanex/tokens`, gedocumenteerd in Storybook, gespiegeld in het Figma-bestand
**Component library** (`ko2OuasYxyY2YRD69MYhWX`).

## Structuur

- `components/ui/` — 1 component = 1 file, named exports, elk met een `*.stories.tsx` ernaast
- `docs/` — Storybook-only: `blocks/` (docs-blokken), `lib/` (token-catalogus), `tokens/` (MDX-pagina's)
- `figma/manifest.json` — de neergeslagen Figma-staat. **Niet met de hand bewerken**; zie Verify-pad.
- `scripts/` — de sync-guard en zijn tegenproef

Componenten raken uitsluitend de **rollaag** aan via een utility uit `@umanex/config/tailwind/preset`.
Geen primitive, geen rauwe paletklasse, geen hardcoded hex of arbitrary radius. `pnpm --filter
@umanex/tokens guard` dwingt dat af.

## Storybook ↔ Figma

Elke component heeft een eigen **pagina** in het Figma-bestand, en elk stories-bestand draagt
`parameters.figma.url` die naar de component(set) op die pagina wijst. De docs-pagina rendert
die link via `docs/blocks/FigmaLink.tsx` ("Open in Figma").

De richting is éénzijdig: **code is de bron, Figma de ontvanger.** Een variant bijbouwen doe je
in de code; Figma volgt. `tokens.json` blijft de bron voor de rollaag — de Figma-variabelen zijn
er een afgeleide van, nooit andersom.

Twee variabelen-collections in Figma:

| Collection | Modes | Inhoud | Bron |
|---|---|---|---|
| `Theme` | Light, Dark | de 42 hsl-rollen + `overlay-scrim` | `packages/tokens/build/theme.css` |
| `Base` | Value | `radius*`, `spacing-*`, `border-*`, `icon-stroke` | preset + Tailwind-schaal + lucide |

`radius-lg/md/sm` zijn afgeleiden van `--radius` (`var(--radius)`, `−2px`, `−4px` — zoals de
preset ze definieert); de guard rekent die regel terug. `spacing-*` volgt Tailwinds `n × 4px`.

**Bekende gaten**, expliciet in plaats van stil:
- `spacing-*`, `border-*` en `icon-stroke` hebben **geen token in `tokens.json`** — hun bron is de
  Tailwind-default respectievelijk lucide-react. `roles.mjs` zegt "later spacing"; tot dat er is,
  is de Figma-kant de enige plek waar deze schaal expliciet staat. Zie `BACKLOG.md`.
- `shadow/sm` en `shadow/md` zijn Tailwind-defaults, om dezelfde reden.
- De guard ziet **geen** wijziging die in Figma gemaakt wordt zonder verse manifest. CI heeft geen
  Figma-toegang; de manifest is een meting, geen live verbinding.

## Verify-pad

| Capability | Commando |
|---|---|
| **Sync code ↔ Figma toetsen** | `pnpm --filter @umanex/ui figma:check` |
| **Guard tegenproeven** (beide kanten) | `pnpm --filter @umanex/ui figma:check:selftest` |
| **Verse build** | `pnpm --filter @umanex/ui build-storybook` (output: `storybook-static/`) |
| **Render vastleggen** | `pnpm --filter @umanex/ui storybook` → `:6006`; per component `/?path=/docs/componenten-<naam>--docs` |
| **Types** | `pnpm --filter @umanex/ui type-check` |
| **Flow aandrijven** | geen — deze package heeft geen flows, alleen presentational primitives |
| **State forceren** | via Storybook-args (`argTypes`); dark mode via de Theme-toolbar (`.dark`-class) |
| **Invariant draaien** | de sync-invarianten zitten in `figma:check`; er is geen aparte rekenkern |

### Figma-manifest verversen

Nodig na **elke** wijziging aan het Figma-bestand (nieuwe component, hernoemde variant, node-ids
na een herbouw). Vereist een actieve Desktop Bridge (`figma_get_status`). Assert op de **fileKey**,
niet op de bestandsnaam — die is een bewering die verandert zodra iemand het bestand hernoemt:

```js
// figma_execute (Figma Console MCP)
if (figma.fileKey !== "ko2OuasYxyY2YRD69MYhWX") return { fout: "verkeerde file: " + figma.fileKey };
await figma.loadAllPagesAsync();
const pages = {};
for (const p of figma.root.children) {
  pages[p.name] = { pageId: p.id, nodes: p.children.map(c => ({
    name: c.name, id: c.id, type: c.type,
    variantProperties: c.type === "COMPONENT_SET" ? c.variantGroupProperties : null })) };
}
return pages;
```

Werk daarna `figma/manifest.json` bij en draai `figma:check`. Lees een node die in deze sessie
bewerkt is **altijd** via de runtime (`figma_execute`, `figma_capture_screenshot`) — de REST-tools
(`figma_take_screenshot`, `figma_get_component_for_development`) geven de laatst opgeslagen
cloud-staat en zijn na een verse edit per definitie stale.

## Wat hier NIET hoort

- App-specifieke composities — die horen in `apps/<app>/src/components/`
- Feature-logica, data-fetching, state management
- Nieuwe dependencies zonder bevestiging (zie de globale CLAUDE.md)
