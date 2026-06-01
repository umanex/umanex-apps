# Model 2 — Referentiebalans met berekende startbalans

---

**Datum:** 2026-06-01
**Type:** feature
**Project:** cashflow
**Status:** in progress

---

```
TASK:        Model 2 implementeren — berekende lopende balans vanaf referentiepunt,
             inline editeerbaar voor de huidige maand

CONTEXT:     startBalance is nu manueel en niet gekoppeld aan historische data.
             Model 2 berekent de startbalans voor de huidige maand automatisch op
             basis van alle data sinds het referentiepunt. Gebruiker kan de balans
             van de huidige maand overschrijven via hetzelfde inline veld.
             Onderdeel: bug fix in calculateMonths (carry-forward verliest
             initiële startBalance bij maand 1).

ELEMENTS:    - BalanceOverride type (store)
             - referenceBalance + referenceMonth in store (vervangt startBalance)
             - balanceOverrides array in store
             - Bug fix calculateMonths regel 337 (monthIndex===0?0 verwijderd)
             - computeHistoricalBalance() in calculator.ts (roept calculateMonths
               intern aan voor consistentie)
             - useComputedStartBalance hook
             - Inline editeerbaar saldo in IncomeSection (eerste maand)

BEHAVIOUR:   - computeHistoricalBalance zoekt meest recente override < anchorMonth;
               gebruikt die als effectief referentiepunt
             - anchorMonth-override: direct retourneren zonder verdere berekening
             - Inline input toont effectieve waarde (computed of overridden)
             - On blur: waarde ≠ computed → BalanceOverride opslaan voor anchorMonth
             - On blur: waarde = computed → bestaande override verwijderen
             - Niet-eerste maanden: startBalance read-only (Vorig saldo, ongewijzigd)

CONSTRAINTS: - Backwards-compatible via store migratie: startBalance → referenceBalance,
               referenceMonth = currentMonth()
             - STORE_VERSION verhogen naar 10
             - calculateMonths fix mag forecast voor maanden 2–3 numeriek wijzigen
               (was een bug, correcte carry-forward is het doel)
```

---

**Open vragen:** geen

**Aannames:**
- [ASSUMPTION: geen visuele scheiding tussen computed en overridden waarde in de input]
- [ASSUMPTION: intermediate overrides (maanden tussen reference en anchor) worden
  nog niet via UI aangeboden — alleen anchorMonth is editeerbaar]
- [ASSUMPTION: referenceBalance na migratie = bestaande startBalance (kan 0 zijn);
  gebruiker stelt correcte waarde in bij eerste gebruik]

**Beslissingsgeschiedenis:**
- 2026-06-01: model 2 gekozen boven model 1 (manuele startBalance); inline input
  behouden; computeHistoricalBalance gebruikt calculateMonths intern om
  formule-mismatch te vermijden (advisor feedback)
