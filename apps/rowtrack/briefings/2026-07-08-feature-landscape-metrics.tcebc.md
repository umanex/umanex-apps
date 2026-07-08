# TC-EBC — Landscape actieve workout: metriek-hiërarchie (audit cluster 5)

- **Datum:** 2026-07-08
- **Type:** feature (screen-varianten)
- **Project:** RowTrack
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd (50/50 + metriek-hiërarchie geïmplementeerd; review-gate groen)

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

- [x] Duration/Split/Watts/Distance KPI-volgorde volgens beslissing (1). — was al correct; duration/no-goal 5e slot = AFSTAND.
- [x] Split/Watts subtitel + progressbalk volgens beslissing (2)+(3). — vergelijkingszin ('seconden'), fillPct=1, geen dot, radius 6.
- [x] Afstand-notatie volgens beslissing (4), consistent KPI + subtitel. — `formatMetersDotted`; hero zonder unit, KPI + subtitel met ' m'.
- [x] Landscape KPI-waarde 16px; distance-subtitel toont afstand; geen-doel-pill compleet. — KPI.tsx compact = `kpiValue` + label `fg.secondary`; 'DOEL | Geen doel'.
- [x] Doel-pill waarde/unit-formaat gelijk aan portrait. — portrait-pariteit behouden (single-string); italic-unit '20 min' bewust NIET (zie beslissing hieronder).
- [x] Portrait-gedrag ongewijzigd; `tsc` groen. — landscape volledig geïsoleerd in `activeStyles`; `formatSplit(x)` default onveranderd.
- [x] LAAG-polish items afgevinkt. — letterspacing -4.32, trackdot 6px, pill-divider 16px, bar→subtitel 24px, pill top-aligned, leading-zero splits, distance-hero zonder ' m'. Uitzonderingen: zie beslissing hieronder.

## Beslissingsgeschiedenis

- 2026-07-08: Briefing aangemaakt vanuit audit cluster 5.
- 2026-07-08: Geïmplementeerd (branch `fix/rowtrack-landscape-metrics-cluster5`). `renderTopSection`
  herschreven per doeltype (subtitel + progressbalk-descriptor), landscape-styles losgetrokken naar
  `activeStyles`, pill top-aligned. Dode `goalProgress`-prop opgeruimd (ActivePhase + workout.tsx).
  Adversariële review-gate (4 dimensies + per-finding verify) groen: 0 P0/P1/P2, 1 P3 weerlegd.
- 2026-07-08: **Bewust uitgesteld / afgeweken van audit** (3 items):
  1. Pill-achtergrond blijft `accent.subtle` (6%) i.p.v. 10% — geen token tussen 6% en 12%; wacht op
     Tokens-Studio-token (raakt dan ook portrait-pill, audit-cluster dashboard). Niet gehardcode.
  2. Doel-pill houdt portrait-pariteit ('20:00 MIN'); italic-unit '20 min' (audit-finding) botst met
     acceptatie-#5 + portrait-freeze — voorstel: app-breed in aparte stap (portrait+landscape samen).
  3. Design-inconsistenties NIET nagevolgd (uniform gehouden): Watts-variant gap 28 → 24; split/watts
     bar-inset 20px → volle breedte; hero-kleur wit i.p.v. wisselend fg.primary/wit. Audit flagde deze
     zelf als design-bugs.
