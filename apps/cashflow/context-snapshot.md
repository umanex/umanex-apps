# Context Snapshot — cashflow
_Gegenereerd op 2026-09-16_

## Project
- **App:** cashflow
- **Beschrijving:** Persoonlijke cashflow-prognose (Next.js + Supabase). Draait als PM2 productie-build op :3000, loopback-gebonden — geen next dev. Geen eigen Figma-bestand: de componentbron is @umanex/ui.
- **Dir:** `apps/cashflow`

## Figma
- **Key:** `geen`
- **URL:** geen
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
| DataGate | `apps/cashflow/components/auth/DataGate.tsx` | auth | — | — | — |
| LoginForm | `apps/cashflow/components/auth/LoginForm.tsx` | auth | — | — | — |
| LoginGate | `apps/cashflow/components/auth/LoginGate.tsx` | auth | — | — | — |
| SignOutButton | `apps/cashflow/components/auth/SignOutButton.tsx` | auth | — | — | — |
| BalanceFooter | `apps/cashflow/components/cashflow/BalanceFooter.tsx` | cashflow | — | — | — |
| BufferChart | `apps/cashflow/components/cashflow/BufferChart.tsx` | cashflow | — | — | — |
| CashflowDndContext | `apps/cashflow/components/cashflow/CashflowDndContext.tsx` | cashflow | — | — | — |
| ExpenseSection | `apps/cashflow/components/cashflow/ExpenseSection.tsx` | cashflow | — | — | — |
| IncomeSection | `apps/cashflow/components/cashflow/IncomeSection.tsx` | cashflow | — | — | — |
| MonthCard | `apps/cashflow/components/cashflow/MonthCard.tsx` | cashflow | — | — | — |
| MonthNavigator | `apps/cashflow/components/cashflow/MonthNavigator.tsx` | cashflow | — | — | — |
| MonthVariance | `apps/cashflow/components/cashflow/MonthVariance.tsx` | cashflow | — | — | — |
| RecurringSection | `apps/cashflow/components/cashflow/RecurringSection.tsx` | cashflow | — | — | — |
| RecurringSidepanel | `apps/cashflow/components/cashflow/RecurringSidepanel.tsx` | cashflow | — | — | — |
| RepeatMonthModal | `apps/cashflow/components/cashflow/RepeatMonthModal.tsx` | cashflow | — | — | — |
| ReservationPaymentModal | `apps/cashflow/components/cashflow/ReservationPaymentModal.tsx` | cashflow | — | — | — |
| ReservationSection | `apps/cashflow/components/cashflow/ReservationSection.tsx` | cashflow | — | — | — |
| ReservationSidepanel | `apps/cashflow/components/cashflow/ReservationSidepanel.tsx` | cashflow | — | — | — |
| RunwayCard | `apps/cashflow/components/cashflow/RunwayCard.tsx` | cashflow | — | — | — |
| SectionBar | `apps/cashflow/components/cashflow/SectionBar.tsx` | cashflow | — | — | — |
| StartBalanceRow | `apps/cashflow/components/cashflow/StartBalanceRow.tsx` | cashflow | — | — | — |
| VarianceChart | `apps/cashflow/components/cashflow/VarianceChart.tsx` | cashflow | — | — | — |
| WaterfallChart | `apps/cashflow/components/cashflow/WaterfallChart.tsx` | cashflow | — | — | — |
| SyncStatus | `apps/cashflow/components/feedback/SyncStatus.tsx` | feedback | — | — | — |

## Recente commits (app + packages)
```
0e63bf9 test(cashflow): pin the month engine to a digest hash before the bureau lands
ff4238f docs(cashflow): brief the bureau extension and record what the exploration left out of scope
fc45be8 feat(ui): run Storybook under PM2 so the MCP is always reachable
8f8756a feat(ui): wire the Storybook MCP into packages/ui
d5e47d7 docs(cashflow): close the reflection loop — one handoff item moved, three findings filed
```

## Uncommitted wijzigingen
  M  apps/cashflow/briefings/2026-09-16-feature-bureau.tcebc.md
  A  apps/cashflow/lib/bureau/goals.test.ts
  A  apps/cashflow/lib/bureau/goals.ts
  A  apps/cashflow/lib/bureau/money.ts
  A  apps/cashflow/lib/bureau/mutations.test.ts
  A  apps/cashflow/lib/bureau/mutations.ts
  A  apps/cashflow/lib/bureau/normalize.ts
  A  apps/cashflow/lib/bureau/periods.test.ts
  A  apps/cashflow/lib/bureau/periods.ts
  A  apps/cashflow/lib/bureau/testing.ts

## Bestanden met TODO/FIXME
  (geen)

## MCP
- Figma Console MCP (Desktop Bridge) is primair voor lezen én schrijven; native Figma MCP is fallback.
