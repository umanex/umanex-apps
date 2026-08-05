# @umanex/tokens

Design tokens voor het umanex design system. Bron: `tokens.json` (W3C DTCG,
Tokens Studio GitHub sync target — Figma plugin File path `packages/tokens/tokens.json`).

Losse tokenwijzigingen gaan via de plugin; een handmatige edit wordt bij de eerstvolgende
push overschreven. De uitzondering staat in de root `CLAUDE.md`: een gecoördineerde
bulk-restructurering mag in de repo, mits gevolgd door een Pull in Tokens Studio.

## Lagen

| Set | Rol | Mode |
|---|---|---|
| `Primitives` | rauwe ramps; enige plek met een literal hex | mode-blind |
| `Typography/Scale` | families, size/leading/weight/tracking | mode-blind |
| `Theme/base` | mode-blinde rollen (`radius`) | alleen `:root` |
| `Theme/light` · `Theme/dark` | de shadcn-rollaag | per mode |
| `Semantic/light` · `Semantic/dark` | domeinrollen (`finance`, `overlay`) | per mode |

De mode komt uit de **set-naam**, niet uit het token-pad. Zo blijft de structuur klaar voor
Figma variable modes zonder dat de build van Tokens Studio's multi-theme (betaald) afhangt.

Let op het onderscheid: de **set-naam** bepaalt in welk mode-blok een token landt, het
**token-pad** bepaalt de variabelenaam. `Theme/light` met een platte key `background` geeft
`--background`; `Semantic/light` met `finance.positive` geeft `--finance-positive`. De
setnaam komt níet in de variabelenaam terug.

### Een nieuwe as toevoegen

De build weigert elke set die hij niet thuis kan brengen — dat is bewust, want de oude
versie classificeerde een onbekende set stil als primitive (geen output) of als mode-blind
(output in `:root`, over de light-rollen heen). Twee wegen:

- **Rollaag met CSS-output** — zet de groep in `ROLE_GROUPS` in `build.mjs` en maak
  `Groep/light` én `Groep/dark` aan (de symmetrie-guard dekt de nieuwe groep automatisch),
  of `Groep/base` voor waarden die niet per mode verschillen. De tokens worden vanzelf
  Tailwind-utilities via `roles.mjs`.
- **Iets anders dan CSS** — zet de set in `PRIMITIVE_SETS` en regel daar expliciet hoe hij
  geleverd wordt, zoals `Typography/Scale` → `build/typography.mjs`.

Een nieuwe **mode** vraagt een entry in `MODES` én in `MODE_SELECTOR`; de build controleert
dat allebei bestaan.

## Build

```bash
pnpm --filter @umanex/tokens build
```

| Output | Consument |
|---|---|
| `build/theme.css` | alle apps — `import '@umanex/tokens/theme.css'`, vóór de eigen globals.css |
| `build/roles.mjs` + `.d.ts` | `@umanex/config/tailwind/preset` — genereert de kleur-map |
| `build/typography.mjs` + `.d.ts` | idem — `fontSize` (tuples), `fontWeight`, `letterSpacing` |

Primitives hebben **geen** CSS-output: ze bestaan om door de rollaag gealiast te worden.
Dat is bewust — een primitive die als CSS-variabele bestaat, is een route om de
mode-aware rollaag te omzeilen.

`theme.css` staat bewust **niet** in `@layer base`. Next draait de PostCSS-keten over
elk global stylesheet apart, en een bestand met `@layer base` zonder `@tailwind base`
faalt hard. Ongelaagd wint bovendien van gelaagd, zodat een app één rol kan overschrijven
met een gewone `:root`-regel (zie `apps/jobradar/app/globals.css`).

## Guards

De build faalt hard bij: een set die niet in `$metadata.tokenSetOrder` staat, asymmetrie
tussen `X/light` en `X/dark`, een onopgeloste alias, of een wijziging aan een
type-schaalstap die Tailwind ook kent.

```bash
pnpm --filter @umanex/tokens guard
```

controleert de laag-discipline in app-code: geen primitives, rauwe paletkleuren,
hardcoded hex, mode-blinde `bg-white`, of arbitrary type-/radius-waarden. Plus een check
dat de `next/font`-import van elke app overeenkomt met `font.family.sans` — next/font hasht
de familienaam, dus het token kan het font niet zelf leveren.
