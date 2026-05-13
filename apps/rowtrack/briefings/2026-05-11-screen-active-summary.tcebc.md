---
name: Active/Summary scherm
description: Post-workout samenvatting na het stoppen van een training — layout sync met Figma
type: screen
---

# Active/Summary

**Datum:** 2026-05-11
**Type:** screen
**Project:** RowTrack
**Klant:** umanex
**Status:** in implementatie

---

```
TASK:        Summary sectie in ActivePhase synchen met Figma (KPI 3-kolom → 2×2)
CONTEXT:     Modal die verschijnt nadat gebruiker "Stop training" drukt in ActivePhase.
             Toont de totale stats van de net afgesloten sessie + knoppen om op te slaan of te annuleren.
ELEMENTS:    Titel "Samenvatting" · datum/tijd label · PR-banner (conditioneel) ·
             2×2 KPI grid (rij1: AFSTAND + DUUR, rij2: ENERGIE + ENERGIE) ·
             horizontale divider · stats tabel GEM/PIEK (Split, Watt, SPM, BPM) ·
             twee knoppen (Annuleren outline + Opslaan filled)
BEHAVIOUR:   Opslaan → slaat op in Supabase + navigeert naar History
             Annuleren → verwijdert data + terug naar IdlePhase
             PR-banner → alleen zichtbaar wanneer hasPR = true
CONSTRAINTS: React Native · Modal transparent animationType="fade" ·
             KPI waarden via KpiSingle component · DUUR format: h:mm:ss via formatTimerFull ·
             Geen bg.raised container voor KPI's — inline op bg.base · tokens only
```

---

**Open vragen:** geen

**Aannames:**
- `[ASSUMPTION]` ENERGIE rij 2 toont dezelfde caloriewaarde twee keer (Figma placeholder — beide cellen = calories)
- `[ASSUMPTION]` DUUR toont seconden niet als onderdeel van de eenheid maar als formatTimerFull (h:mm:ss)

**Beslissingsgeschiedenis:**
- 2026-05-11: Figma sync — KPI layout gewijzigd van 3-kolom naar 2×2 met divider na elke rij
