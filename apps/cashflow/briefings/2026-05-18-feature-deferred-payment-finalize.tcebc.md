# Feature: Deferred Payment Finalize

---
Datum: 2026-05-18
Type: feature
Project: cashflow
Klant: umanex
Status: in progress
---

---

```
TASK:        Mark a deferred recurring payment as paid and finalize it (persist to store,
             remove from pending deferred list)
CONTEXT:     Cashflow prognose — RecurringSection; deferred items tonen in de maand
             waarnaar ze zijn doorgeschoven (toMonth). Scope: recurring defers only.
             Reservation defers zijn buiten scope.
ELEMENTS:    Deferred item row (bestaand, amber styling)
             Checkbox — step 1: local state, enabled "Finaliseer →"
             Amount input — nieuw, zichtbaar na checkbox check (werkelijk bedrag)
             "Finaliseer →" button — step 2: persist via settleRecurringDefer(deferId, true, amount)
             ↩ button — betaald: unsettle; onbetaald: undo defer (bestaand)
BEHAVIOUR:   Stap 1 — checkbox aanvinken: local state, amount input verschijnt,
               "Finaliseer →" button verschijnt, ↩ button verdwijnt
             Stap 2 — klik "Finaliseer →": settleRecurringDefer(deferId, true, amount)
               Item verplaatst naar betaald-groep (zichtbaar via "Toon betaald")
             Betaald state — checkbox disabled, doorgestreept, paidAmount getoond,
               ↩ voor unsettle (settleRecurringDefer(deferId, false, 0))
             Afwijkend bedrag — indien paidAmount ≠ budgeted: toon budgeted in (grijs)
             Balance — paidAmount gebruikt in deferredRecurringAmount i.p.v. budgeted
CONSTRAINTS: Desktop-first (3-column grid), volgt DraggableRecurringItem pattern
             Geen schema-change op ReservationDefer
             RecurringDefer krijgt paid?: boolean en paidAmount?: number velden
             STORE_VERSION bump naar 7 + migrate default
```

---

## Open vragen

_(geen — subheader feature toegevoegd als aparte entry hieronder)_

## Aannames

- [ASSUMPTION: reservation defers vallen buiten scope van deze feature]
- [ASSUMPTION: cleanup logic in useCashflow.ts verwijdert paid defers samen met andere stale defers]

## Beslissingsgeschiedenis

- 2026-05-18: finaliseren = expliciet 2-stap (checkbox → "Finaliseer →"), consistent met reservation pot pattern
