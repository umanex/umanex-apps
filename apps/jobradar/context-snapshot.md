# Context Snapshot — jobradar
_Gegenereerd op 2026-08-11_

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
- **@umanex/rowtrack-tokens:** 0.0.1
- **@umanex/tokens:** 0.0.1
- **@umanex/ui:** 0.0.1

## Componenten
_Afgeleid uit de codebase — niet manueel aanpassen. Bron: `// @figma`-headers + co-located `.design-snapshot.md` sidecars._

| Component | Pad | Categorie | Figma-node | Snapshot | Status |
|---|---|---|---|---|---|
| CoverageBar | `apps/jobradar/components/CoverageBar.tsx` | components | — | — | — |
| DashboardClient | `apps/jobradar/components/DashboardClient.tsx` | components | — | — | — |
| FilterBar | `apps/jobradar/components/FilterBar.tsx` | components | — | — | — |
| JobCard | `apps/jobradar/components/JobCard.tsx` | components | — | — | — |
| LeadCard | `apps/jobradar/components/LeadCard.tsx` | components | — | — | — |
| RegionFilter | `apps/jobradar/components/RegionFilter.tsx` | components | — | — | — |
| ScoreBadge | `apps/jobradar/components/ScoreBadge.tsx` | components | — | — | — |
| SearchSettingsForm | `apps/jobradar/components/SearchSettingsForm.tsx` | components | — | — | — |
| StatusDropdown | `apps/jobradar/components/StatusDropdown.tsx` | components | — | — | — |
| SyncButton | `apps/jobradar/components/SyncButton.tsx` | components | — | — | — |
| TermChips | `apps/jobradar/components/TermChips.tsx` | components | — | — | — |

## Recente commits (app + packages)
```
c36692b fix(jobradar): drop the search word that was pulling in warehouse work
eef1820 Merge pull request #268 from umanex/fix/jobradar-bronlaag
1f7f72e fix(jobradar): serve fixtures only when asked, never as a fallback
76c58e1 docs(jobradar): record what actually guards the class
30e4ec5 fix(jobradar): guard the deciding power, not the vocabulary
```

## Uncommitted wijzigingen
  A  apps/jobradar/app/api/settings/route.ts
  A  apps/jobradar/app/api/settings/test/route.ts
  M  apps/jobradar/app/api/sync/route.ts
  A  apps/jobradar/app/instellingen/page.tsx
  A  apps/jobradar/briefings/2026-08-11-feature-zoekinstellingen.tcebc.md
  M  apps/jobradar/components/DashboardClient.tsx
  A  apps/jobradar/components/SearchSettingsForm.tsx
  A  apps/jobradar/components/TermChips.tsx
  M  apps/jobradar/lib/db/ddl.ts
  M  apps/jobradar/lib/db/schema.ts

## Bestanden met TODO/FIXME
  (geen)

## MCP
- Figma Console MCP (Desktop Bridge) is primair voor lezen én schrijven; native Figma MCP is fallback.
