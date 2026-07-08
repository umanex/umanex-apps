# TC-EBC — Landscape actieve workout: metriek-hiërarchie (audit cluster 5)

- **Datum:** 2026-07-08
- **Type:** feature (screen-varianten)
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** deels gebouwd (50/50 klaar; metriek-hiërarchie beslist, implementatie open)

---

```
TASK:        De landscape actieve-workout (ActivePhase, landscape) uitlijnen op design +
             portrait-gedrag: juiste metriek per variant, subtitel-content, progressbalk.
CONTEXT:     Audit cluster 5. De landscape-render is afgedreven van zowel het Figma-design
             als de portrait-implementatie (die veel van deze punten wél correct doet).
             Vooral inhoudelijk (welke metriek waar), niet cosmetisch.
ELEMENTS:    components/workout/ActivePhase.tsx (landscape render, renderTopSection, kpiOrder,
             DOEL-pill), components/KPI.tsx (compact KPI-waarde), lib/formatters.ts.
             Figma landscape-varianten: None 5:4, Duration 42:5712, Distance 42:5741,
             Split 42:5770, Watts 42:5799.
BEHAVIOUR:   Per doeltype de juiste KPI-volgorde + subtitel; split/watts een volle
             statusbalk (pace-kleur) i.p.v. percentage-vulling; vergelijkingszinnen bij
             split/watts zoals portrait.
CONSTRAINTS: RN/Expo · token-only · StyleSheet · geen gedragswijziging aan portrait ·
             Stop-knop al Primary (cluster 4).
```

---

## Beslissingen (2026-07-08, door Jeroen)

1. **Duration-KPI (5e slot):** **AFSTAND** (code wint) — hero toont al de timer; Figma bijwerken.
   Geen code-wijziging nodig (kpiOrder duration heeft al AFSTAND).
2. **Split/Watts subtitel:** **vergelijkingszin** zoals design + portrait.
3. **Split/Watts progressbalk:** **volle statusbalk** in pace-kleur (fillPct=1, geen dot).
4. **Afstand-notatie:** **meters met punt** "1.234 m" (design) — landscape-specifiek
   (portrait-design gebruikt zelf km, dus niet app-breed formatDistanceDynamic wijzigen;
   aparte landscape-formatter of param).

## Reeds gebouwd

- **50/50 kolommen** (merge `6ca1c74`): `minWidth: 0` op leftCol + rightCol zodat flex:1 echt
  gelijk deelt (Yoga RN 0.81 kromp niet onder content-breedte → hero-kolom te smal, hero brak af).

## Aannames (design-wint, niet-controversieel — meegenomen bij implementatie)

- `[ASSUMPTION]` Landscape KPI-waarde 34px → 16px (kpiValue), zoals design/compact.
- `[ASSUMPTION]` Distance-subtitel toont afgelegde afstand i.p.v. verstreken tijd (design + portrait).
- `[ASSUMPTION]` Geen-doel-pill krijgt DOEL-label + divider (design).
- `[ASSUMPTION]` Doel-pill: waarde + italic lowercase unit ("20 min"), zoals design/portrait.
- `[ASSUMPTION]` LAAG-polish meegenomen: KPI-label fg.secondary, pill-opacity 10%, hero
  letterspacing -4.32, ' m'-suffix weg bij distance-hero, leading-zero splits, trackdot 6px,
  pill-divider 16px, pill top-aligned, gaps. Watts placeholder-label = code leidend.

## Acceptatie

- [ ] Duration/Split/Watts/Distance KPI-volgorde volgens beslissing (1).
- [ ] Split/Watts subtitel + progressbalk volgens beslissing (2)+(3).
- [ ] Afstand-notatie volgens beslissing (4), consistent KPI + subtitel.
- [ ] Landscape KPI-waarde 16px; distance-subtitel toont afstand; geen-doel-pill compleet.
- [ ] Doel-pill waarde/unit-formaat gelijk aan portrait.
- [ ] Portrait-gedrag ongewijzigd; `tsc` groen.
- [ ] LAAG-polish items afgevinkt.

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 5.
