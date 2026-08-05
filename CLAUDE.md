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

- `packages/tokens/tokens.json` is Tokens Studio GitHub sync target — nooit handmatig bewerken
- Figma plugin File path: `packages/tokens/tokens.json`

## Briefings (TC-EBC)

TC-EBC framework staat volledig in `.umanex-os/CLAUDE.md` — werkprincipe, niet hier herhaald.

Briefings-bestanden landen op deze plek:
- **App-specifieke briefing:** `apps/{app}/briefings/{YYYY-MM-DD}-{type}-{naam}.tcebc.md`
- **Cross-app briefing (raakt meerdere apps of monorepo-niveau):** `briefings/{YYYY-MM-DD}-{type}-{naam}.tcebc.md` aan de root

Bij twijfel — vraag.

Folders worden aangemaakt wanneer ze nodig zijn, niet vooraf.
