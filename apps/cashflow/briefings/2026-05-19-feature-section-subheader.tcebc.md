# Feature: Section Subheader

---
Datum: 2026-05-19
Type: feature
Project: cashflow
Klant: umanex
Status: in progress
---

---

```
TASK:        Gestandaardiseerde subheader per kostenrubriek in MonthCard:
             titel · subtotaal (openstaand) · betaling-registreren button · toon-betaald toggle
CONTEXT:     MonthCard → RecurringSection, ExpenseSection, ReservationSection
ELEMENTS:    Subheader row: titel (links) | subtotaal + acties (rechts)
             Subtotaal: som van openstaande kosten per sectie (verborgen als 0)
             RecurringSection button "+ Toevoegen": opent RecurringSidepanel
             ExpenseSection button "+ Toevoegen": bestaande inline add
             ReservationSection button "+ Betaling": bestaande ReservationPaymentModal
             Toon/verberg betaald toggle: enkel zichtbaar als er betaalde items zijn
             ReservationSection: "Toon gefinaliseerd" → aligned met "Toon betaald" patroon
BEHAVIOUR:   Subtotaal berekening per sectie:
               Recurring: unpaid recurring (budgeted) + unfinalized deferred
               Expense: unpaid expense items
               Reservation: unfinalized pots (effectiveAmount) + deferred reservation items
             RecurringSection button: opens RecurringSidepanel (zelfde als page header button)
             ExpenseSection: altijd header tonen (ook bij 0 items)
CONSTRAINTS: Consistente layout over alle 3 secties
             Volgorde rechts: subtotaal · betaling-registreren · toon-betaald
```

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION: subtotaal in text-destructive kleur — het zijn openstaande kosten]
- [ASSUMPTION: subtotaal verborgen wanneer 0 — alles betaald]
- [ASSUMPTION: ReservationSection toont "Toon betaald (N)" i.p.v. "Toon gefinaliseerd (N)"]

## Beslissingsgeschiedenis

- 2026-05-19: subtotaal = enkel openstaande kosten (niet totaal); recurring button opent zelfde sidepanel als page header
