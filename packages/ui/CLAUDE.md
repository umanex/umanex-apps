# CLAUDE.md — packages/ui

De gedeelde UI-laag van de monorepo: shadcn-achtige primitives op de rollaag van
`@umanex/tokens`, gedocumenteerd in Storybook, gespiegeld in het Figma-bestand
**Component library** (`ko2OuasYxyY2YRD69MYhWX`).

## Structuur

- `components/ui/` — 1 component = 1 file, named exports, elk met een `*.stories.tsx` ernaast
- `docs/` — Storybook-only: `blocks/` (docs-blokken), `lib/` (token-catalogus), `tokens/` (MDX-pagina's)
- `figma/manifest.json` — de neergeslagen Figma-staat. **Niet met de hand bewerken**; zie Verify-pad.
- `scripts/` — de sync-guard en zijn tegenproef; `scripts/figma/` — de code→Figma-keten
- `figma/` — de artefacten van de keten (`build-spec.min.json`, `check0.json`, `ongebonden.json`, `laagnamen.json`) en de plugin-scripts (`builder.js`, `bouw-batch.js`, `toets-batch.js`, `lees-manifest.js`, `lees-geometrie.js`)

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
| **Figma ↔ browser (maten)** | `pnpm --filter @umanex/ui parity` — legacy per variant-wortel tegen de browser, keten-pagina's recursief tegen `figma/build-spec.min.json`. Tegenproef: `node scripts/geometry-parity.mjs --selftest` |
| **Bouwspec verversen** | `pnpm --filter @umanex/ui figma:spec` — na elke component- of storywijziging aan een keten-component |
| **Leesscripts tegenproeven** | `pnpm --filter @umanex/ui figma:recept:selftest` — `lees-manifest.js` en `lees-geometrie.js` op een stub uit de gecommitte bestanden |
| **Builder-poort tegenproeven** | `pnpm --filter @umanex/ui figma:poort:selftest` — `poort`, `bouwhash` en de meldingen-basislijn, letterlijk uit `figma/builder.js` |
| **Deep-links actueel** | `node scripts/figma/links.mjs --check` — exit 1 als een keten-story een andere url zou krijgen |

### De Figma-keten — een component in Figma bouwen

Sinds 2026-09-16 bouwt `scripts/figma/` + `figma/` een component uit zijn Storybook-render, in plaats
van met de hand via losse `figma_execute`-aanroepen. Het is de keten van rowtrack met een
`dom-tailwind`-adapter; de koppen van de scripts zeggen per plek wat er anders is en waarom. De
vijftien handgebouwde componenten (`LEGACY` in `scripts/figma/doel.mjs`) worden niet herbouwd: hun
node-ids staan als deep-link in de stories, en de poort van de builder weigert een component zonder
bouwhash.

**Wat een nieuw component moet dragen**, anders meet de keten niets (de guard toetst de eerste twee):

- `data-slot="<kebab-export>"` op elk element dat hij rendert — de primaire slot is `kebab(<pagina>)`,
  of wat `PRIMAIR` in `doel.mjs` zegt (een overlay: `DialogContent` → `dialog-content`). De laagnaam in
  Figma komt eruit.
- geen `dark:`-klassen: de keten meet light en bindt aan Theme-variabelen met modes.
- een `Playground`-story die de primaire export precies één keer rendert, met `argTypes` alleen voor
  de visuele assen (`control: 'boolean'` of `'select'`/`'radio'` + `options`, plat geschreven). Een
  overlay staat open (`defaultOpen`). Tekst die per gebruiksplek verschilt als string-arg — die wordt
  een tekst-property op de Figma-component.
- de eerste `variants: {` in het bronbestand zijn de assen van de primary — de guard leest alleen die.

**De volgorde per batch** (Desktop Bridge in de Component library; elke stub begint met een
`figma.fileKey`-guard):

```bash
pnpm --filter @umanex/ui build-storybook
pnpm --filter @umanex/ui figma:spec            # story-axes -> build-spec -> build-prune -> check0
node scripts/figma/build-spec.mjs --slots-uit  # negatieve controle: exit 2, spec ongewijzigd
pnpm --filter @umanex/ui figma:serve           # eigen terminal; lees de poort uit de log
```

```js
// figma_execute — bouwen. Bij een timeout NIET opnieuw sturen: poll figma.root.getPluginData('bouwbezig').
const BATCH = ['Switch'], STAMP = '<datum>', FORCE = false, TOEGESTAAN = { effectStyles: [] }, POORT = <poort>;
const bron = await (await fetch(`http://localhost:${POORT}/bouw-batch.js`)).text();
const F = Object.getPrototypeOf(async function () {}).constructor;
return await (new F('BATCH', 'STAMP', 'FORCE', 'TOEGESTAAN', 'POORT', 'figma', bron))(BATCH, STAMP, FORCE, TOEGESTAAN, POORT, figma);
```

Daarna, in deze volgorde: `figma/toets-batch.js` (zelfde stub-vorm, parameters `BATCH, STAMP, POORT`)
→ `figma/lees-manifest.js` en `figma/lees-geometrie.js` (parameter `figma`; POST de uitkomst naar
`/manifest.json` en `/geometry.figma.json` op de server) → `pnpm --filter @umanex/ui figma:links` →
`figma:check:selftest` → `parity`. **Eerst het manifest, dan de links**: omgekeerd schrijft `links`
de ids van de vorige bouw. Diff het ververste manifest veld per veld tegen de commit: alles buiten
`gegenereerd` en de gebouwde pagina's is drift in Figma, en die overschrijf je niet.

`TOEGESTAAN.effectStyles` noemt de effect styles die de builder mag aanmaken. Een schaduw heeft geen
tokenbron (BACKLOG 2026-08-25), dus dat is een vraag aan Jeroen, geen default.

### Bekende gaten van de keten, telbaar

- `figma/ongebonden.json` — waarden zonder variabele of text style; `[binding]` ratelt er tweezijdig op
  (`BEKENDE_ONGEBONDEN` in de guard, met reden per waarde).
- `figma/laagnamen.json` — `heuristiek` hoort 0 te zijn; `[laagnaam]` is rood op één.
- Iconstreep: 2 px in Figma tegen ±1,33 px in de browser — huisconventie, zie BACKLOG 2026-09-16.
- Geportalde content (DialogContent) staat niet in `geometry.code.json` — `parity` meet hem wel,
  recursief tegen de spec. Zie BACKLOG 2026-09-16.

## Wat hier NIET hoort

- App-specifieke composities — die horen in `apps/<app>/src/components/`
- Feature-logica, data-fetching, state management
- Nieuwe dependencies zonder bevestiging (zie de globale CLAUDE.md)
