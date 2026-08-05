# Context Snapshot — jobradar
_Gegenereerd op 2026-08-05_

## Project
- **App:** jobradar
- **Beschrijving:** [TODO: korte beschrijving van jobradar]
- **Dir:** `apps/jobradar`

## Figma
- **Key:** `[TODO]`
- **URL:** [TODO]
- ⚠️ Node IDs veranderen na edits — altijd opnieuw ophalen via "Copy link to selection"

## Packages
- **@umanex/config:** 0.0.1
- **@umanex/tokens:** 0.0.1
- **@umanex/ui:** 0.0.1

## Componenten
_Afgeleid uit de codebase — niet manueel aanpassen. Bron: `// @figma`-headers + co-located `.design-snapshot.md` sidecars._

| Component | Pad | Categorie | Figma-node | Snapshot | Status |
|---|---|---|---|---|---|
| DashboardClient | `apps/jobradar/components/DashboardClient.tsx` | components | — | — | — |
| FilterBar | `apps/jobradar/components/FilterBar.tsx` | components | — | — | — |
| JobCard | `apps/jobradar/components/JobCard.tsx` | components | — | — | — |
| LeadCard | `apps/jobradar/components/LeadCard.tsx` | components | — | — | — |
| RegionFilter | `apps/jobradar/components/RegionFilter.tsx` | components | — | — | — |
| ScoreBadge | `apps/jobradar/components/ScoreBadge.tsx` | components | — | — | — |
| StatusDropdown | `apps/jobradar/components/StatusDropdown.tsx` | components | — | — | — |
| SyncButton | `apps/jobradar/components/SyncButton.tsx` | components | — | — | — |

## Recente commits (app + packages)
```
84f557b refactor(tokens): make the finance layer mode-aware and cut it loose from the brand red
b282e96 refactor(config): generate the Tailwind color map from the tokens
b546f4f feat(tokens): add success and warning roles, move primary to Primary.600
760d0f0 refactor(tokens): ship the role layer as its own export and put every app on it
bf4ffe4 refactor(tokens): derive the mode from the set name, not the token path
```

## Uncommitted wijzigingen
  M  apps/jobradar/app/layout.tsx
  M  apps/jobradar/components/JobCard.tsx
  M  apps/jobradar/components/LeadCard.tsx
  M  packages/config/tailwind/preset.ts
  M  packages/tokens/build.mjs
  A  packages/tokens/build/roles.d.ts
  A  packages/tokens/build/typography.d.ts
  A  packages/tokens/build/typography.mjs
  M  packages/tokens/build/variables.css
  M  packages/tokens/package.json

## Bestanden met TODO/FIXME
  (geen)

## MCP
- Figma Console MCP (Desktop Bridge) is primair voor lezen én schrijven; native Figma MCP is fallback.
