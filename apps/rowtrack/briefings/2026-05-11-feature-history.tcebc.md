---
name: History feature — lijst + detail (4 frames)
description: History tab met periode-filter, KPI grid en workout detail schermen synchen met Figma
type: feature
---

# History — lijst + detail

**Datum:** 2026-05-11
**Type:** feature
**Project:** RowTrack
**Klant:** umanex
**Status:** in implementatie

---

```
TASK:        History tab (4 frames) synchen met Figma — KPI grids, header en Hartslag tab
CONTEXT:     Vierde tab in de app. Toont overzicht van afgesloten trainingen met periode-filter
             en een detail view per training met 3 sub-tabs (Overzicht / Splits / Hartslag).
ELEMENTS:    Lijst: paginatitel · periode tabs (Week/Maand/Jaar/Alle) ·
               2×2 KPI grid in bg.raised container (Totale Duur · Totale Afstand / Gem Split · Aantal) ·
               WorkoutCard lijst
             Detail header: grote datum titel (34px Source Serif) · "← OVERZICHT" back link ·
               PR badge rechts
             Detail Overzicht tab: 2×2 KPI grid in bg.raised (Duur · Afstand / Gem Split · Gem SPM) ·
               GEM/PIEK stats tabel · "Training verwijderen" knop
             Detail Splits tab: tabel per 500m met Split + Watt kolommen (ongewijzigd)
             Detail Hartslag tab: 2 KPI cellen (BPM GEMIDDELD / BPM MAXIMAAL) met grote waarden
BEHAVIOUR:   Periode filter → fetchWorkouts opnieuw + KPI herberekening
             WorkoutCard tap → navigeer naar /(tabs)/history/[id]
             Back link → router.back()
             Segment tabs → wissel Overzicht/Splits/Hartslag content
             Training verwijderen → Alert confirm → delete Supabase → router.back()
CONSTRAINTS: React Native + Expo Router · bg.raised (#21242C) voor KPI containers ·
             border.default voor container borders, border.strong voor interne row divider ·
             KpiSingle component voor alle 34px KPI waarden ·
             formatTimerFull voor h:mm:ss duraties · tokens only
```

---

**Open vragen:** geen

**Aannames:**
- `[ASSUMPTION]` Hartslag tab heeft nog geen grafiek — enkel de twee KPI cellen
- `[ASSUMPTION]` WorkoutCard toont duration met formatTimerFull + "uur" unit wanneer >= 3600s
- `[ASSUMPTION]` Stats tabel label "SPLIT 500/M" → "SPLIT /500M" (sync met Figma label)

**Beslissingsgeschiedenis:**
- 2026-05-11: Figma sync — KPI grids (3-kolom → 2×2), header layout, Hartslag KPI styling
