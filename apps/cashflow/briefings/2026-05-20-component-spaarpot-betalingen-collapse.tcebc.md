# Spaarpot betalingen collapse

---
Datum: 2026-05-20
Type: component
Project: cashflow
Klant: umanex
Status: actief
---

---

```
TASK:        Toggle om betalingen per spaarpot in/uit te klappen
CONTEXT:     DraggablePotRow in ReservationSection toont paymentsThisMonth altijd
             zichtbaar; bij meerdere potten met betalingen neemt de lijst veel ruimte in
ELEMENTS:    Chevron-toggle in de Provisie/Resterend-rij (Rij 2), betaling-rijen,
             Finaliseer-knop
BEHAVIOUR:   Klik op toggle in Rij 2 → betalingen en Finaliseer-knop klappen uit/in;
             standaard uitgebreid (bestaand gedrag bewaard);
             toggle enkel zichtbaar wanneer pot betalingen heeft
CONSTRAINTS: Staat per pot via useState in DraggablePotRow; geen nieuwe component;
             geen logica- of data-wijzigingen; puur visuele toggle
```

---

## Open vragen

_(geen)_

## Aannames

- [ASSUMPTION] Standaard uitgebreid — bestaand gedrag blijft intact bij eerste render
- [ASSUMPTION] Finaliseer-knop verdwijnt mee bij inklappen — is altijd bereikbaar via uitklappen

## Beslissingsgeschiedenis

- 2026-05-20: initieel ontwerp
