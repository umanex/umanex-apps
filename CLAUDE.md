# CLAUDE.md — umanex-apps monorepo

@.umanex-os/CLAUDE.md
@.umanex-os/profiles/umanex.md

Monorepoconventies voor de umanex-apps codebase. Lees dit vóór je iets implementeert.

## Context

- **Eigenaar**: Jeroen (jeroen@umanex.be), Belgische freelance UX/UI designer & developer
- **Deployment**: Vercel, één project per app

## Structuurregels

- 1 component = 1 file, named exports (geen default exports voor componenten)
- Interne packages via workspace protocol: `"workspace:*"`
- Packages zijn private; exports field in package.json bepaalt publieke API
- Geen feature code zonder expliciete opdracht — geen Zustand, dnd-kit, auth of API routes tenzij gevraagd

## TypeScript

- Paths via tsconfig, niet via runtime tricks

## Commits (Conventional Commits)

```
feat(cashflow): ...
fix(ui): ...
chore: ...
docs: ...
ci: ...
```

Scope = package of app naam. Eén logische stap per commit.

## Design tokens

- `packages/tokens/tokens.json` is Tokens Studio GitHub sync target
- Figma plugin File path: `packages/tokens/tokens.json`

**Handmatig bewerken: nee, met één uitzondering.** Losse tokenwijzigingen gaan altijd via
de plugin — een handmatige edit wordt bij de eerstvolgende push overschreven en is dus
stil verlies. De uitzondering is een *gecoördineerde bulk-restructurering* (sets splitsen,
hernoemen, een laag herindelen): die is in de plugin honderden klikken en foutgevoelig.
Voorwaarden: de wijziging gebeurt in één keer, gaat via een PR, en Jeroen doet er direct
na de merge een **Pull in Tokens Studio** op zodat de plugin de nieuwe structuur overneemt.
Push je vanuit de plugin vóór die pull, dan draai je de restructurering terug.

**Lagen.** Drie assen, elk hun eigen set(s):

```
Primitives          rauwe ramps, enige plek met een literal hex — resolve-only, geen output
Typography/Scale    families, size/leading/weight/tracking — levert build/typography.mjs
Theme/base          mode-blinde rollen (radius) — alleen in :root
Theme/light|dark    DE shadcn-rollaag, per mode
Semantic/light|dark domeinrollen (finance, overlay), per mode
```

De mode komt uit de **set-naam**, niet uit het token-pad. Een set `X/light` of `X/dark`
wordt automatisch een mode-blok; alles buiten `Theme/` en `Semantic/` is een primitive.

**Consumptieregel.** App-code en `packages/ui` raken uitsluitend de **rollaag** aan, via een
Tailwind-utility uit `@umanex/config/tailwind/preset`. Geen primitive, geen rauwe
paletklasse (`bg-green-500`), geen hardcoded hex, geen arbitrary font-size of radius.
De preset wordt gegenereerd uit de tokens, dus een kleur die geen rol is heeft geen utility.
Ontbreekt er een waarde? Voeg een rol toe in **beide** mode-sets — de build faalt op
asymmetrie — en gebruik hem als utility.

`pnpm --filter @umanex/tokens guard` dwingt dit af (draait ook in CI), met ESLint-regels
per app voor feedback in de editor.

## Briefings (TC-EBC)

TC-EBC framework staat volledig in `.umanex-os/CLAUDE.md` — werkprincipe, niet hier herhaald.

Briefings-bestanden landen op deze plek:
- **App-specifieke briefing:** `apps/{app}/briefings/{YYYY-MM-DD}-{type}-{naam}.tcebc.md`
- **Cross-app briefing (raakt meerdere apps of monorepo-niveau):** `briefings/{YYYY-MM-DD}-{type}-{naam}.tcebc.md` aan de root

Bij twijfel — vraag.

Folders worden aangemaakt wanneer ze nodig zijn, niet vooraf.
