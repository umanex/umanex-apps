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
| SessionEffects | `apps/cashflow/components/auth/SessionEffects.tsx` | auth | — | — | — |
| SignOutButton | `apps/cashflow/components/auth/SignOutButton.tsx` | auth | — | — | — |
| BureauSubnav | `apps/cashflow/components/bureau/BureauSubnav.tsx` | bureau | — | — | — |
| NumberField | `apps/cashflow/components/bureau/fields/NumberField.tsx` | fields | — | — | — |
| FormSection | `apps/cashflow/components/bureau/FormSection.tsx` | bureau | — | — | — |
| GoalsForm | `apps/cashflow/components/bureau/GoalsForm.tsx` | bureau | — | — | — |
| SumLine | `apps/cashflow/components/bureau/SumLine.tsx` | bureau | — | — | — |
| YearSelector | `apps/cashflow/components/bureau/YearSelector.tsx` | bureau | — | — | — |
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
| EmptyState | `apps/cashflow/components/feedback/EmptyState.tsx` | feedback | — | — | — |
| SyncStatus | `apps/cashflow/components/feedback/SyncStatus.tsx` | feedback | — | — | — |
| AppHeader | `apps/cashflow/components/layout/AppHeader.tsx` | layout | — | — | — |

## Recente commits (app + packages)
```
98c01c0 feat(cashflow): the bureau document key, its transitions and their tests (store version 16)
0e63bf9 test(cashflow): pin the month engine to a digest hash before the bureau lands
ff4238f docs(cashflow): brief the bureau extension and record what the exploration left out of scope
fc45be8 feat(ui): run Storybook under PM2 so the MCP is always reachable
8f8756a feat(ui): wire the Storybook MCP into packages/ui
```

## Uncommitted wijzigingen
  M  apps/cashflow/app/analyse/page.tsx
  A  apps/cashflow/app/bureau/doelen/page.tsx
  A  apps/cashflow/app/bureau/layout.tsx
  M  apps/cashflow/app/page.tsx
  M  apps/cashflow/components/auth/DataGate.tsx
  A  apps/cashflow/components/auth/SessionEffects.tsx
  M  apps/cashflow/components/auth/SignOutButton.tsx
  A  apps/cashflow/components/bureau/BureauSubnav.tsx
  A  apps/cashflow/components/bureau/FormSection.tsx
  A  apps/cashflow/components/bureau/GoalsForm.tsx

## Bestanden met TODO/FIXME
  (geen)

## MCP
- Figma Console MCP (Desktop Bridge) is primair voor lezen én schrijven; native Figma MCP is fallback.
