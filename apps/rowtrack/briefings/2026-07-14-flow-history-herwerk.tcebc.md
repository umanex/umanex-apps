# TC-EBC — History-flow herwerk (overzicht + detail, split-tienden)

| | |
|---|---|
| **Datum** | 2026-07-14 |
| **Type** | flow |
| **Project** | RowTrack |
| **Klant** | umanex (eigen product) |
| **Status** | gepland |

---

```
TASK:        Herwerkte History-flow in code brengen — overzicht-lijst + detail
             (Overzicht / Splits / Hartslag), met split-tijden tot op 0,1s waar
             de data dat toelaat.
CONTEXT:     RowTrack. app/(tabs)/history/index.tsx (lijst) +
             app/(tabs)/history/[id].tsx (detail, 3 tabs). Figma History-sectie
             236:5201 → 5:6 (lijst), 5:7 (Overzicht), 38:5009 (Splits),
             38:5115 (Hartslag). In-place herwerkt — node-ids ongewijzigd.
ELEMENTS:    Lijst: titel "Historiek", periode-segments (Week/Maand/Jaar/Alle),
             KPI-samenvatting 2×2 (duur/afstand/energie/#trainingen), workout-
             rijen (datum-eyebrow · duur uur · kcal · afstand →), TabBar.
             Detail-header (gedeeld): datumtitel, "← Overzicht"-eyebrow, PR-badge
             (conditioneel), tab-segments (Overzicht/Splits/Hartslag).
             Overzicht: KPI-blok (duur/afstand/energie/slagen), stats-tabel
             GEM/PIEK (Watt/SPM/BPM), afstand-splits GEM/BEST (500/1000/2000m,
             tienden), "Training verwijderen"-knop.
             Splits: KPI (gem. split / snelste split, tienden), splits-tabel
             (afstand | split tienden | watt), verwijder-knop.
             Hartslag: KPI (gem./max BPM), tabel per segment, verwijder-knop.
BEHAVIOUR:   Tap workout-rij → detail; periode-segments filteren lijst-KPI +
             rijen; detail tab-segments wisselen (tap, geen swipe); training
             verwijderen; verticale scroll op lijst en detail.
CONSTRAINTS: Portrait. Uitsluitend @/constants tokens (geen hardcoded hex/px).
             Iconen via @expo/vector-icons (Ionicons). Split-tienden afgeleid uit
             workouts.samples via de interpolatie in lib/bestDistanceTime.ts
             (~0,1s ceiling: samples.t staat in hele seconden). Oude workouts
             (samples=NULL) → integer-fallback. Live active-workout split blijft
             heel-seconde (FTMS-hardware 1s-resolutie) — buiten scope.
             DATALAAG: samples-shape → {t,d,hr} (HR nu capturen); nieuwe kolom
             total_strokes (FTMS stroke-count) → één migratie (Jeroen draait die).
             HR-tabel + slagen enkel voor NIEUWE workouts; bestaande blijven leeg.
```

---

## Open vragen

- **Hartslag-detail (38:5115)** nog visueel te verifiëren (screenshot bij bouwstap 1) — KPI's + tabelinhoud/kolommen.
- Snelste/gemiddelde split: live uit de per-split-reeks afleiden (aanbevolen, tiende klopt overal) — te bevestigen tegen de Figma-waarden bij render.

## Aannames

- `[ASSUMPTION]` Periode-segments (Week/Maand/Jaar/Alle) filteren client-side op `created_at`.
- `[ASSUMPTION]` PR-badge hergebruikt de bestaande `hasPR`-logica (workout heeft ≥1 PR).
- `[ASSUMPTION]` Detail-tabs zijn tap-segments (geen swipe), consistent met de huidige `[id].tsx`.
- `[ASSUMPTION]` Geen pull-to-refresh tenzij al aanwezig in de huidige lijst.

## Acceptatie

- [ ] Lijst (5:6): titel, 4 periode-segments, KPI-samenvatting 2×2, workout-rijen, TabBar — token-correct.
- [ ] Detail-header: datumtitel, back-eyebrow, PR-badge (conditioneel), 3 tab-segments.
- [ ] Overzicht (5:7): KPI-blok, stats GEM/PIEK (Watt/SPM/BPM), afstand-splits GEM/BEST met tienden.
- [ ] Splits (38:5009): gem./snelste split (tienden), splits-tabel (afstand | split tienden | watt).
- [ ] Hartslag (38:5115): BPM-detail conform Figma.
- [ ] Split-tienden afgeleid uit `samples` (bestDistanceTime-interpolatie) + tienden-variant van `formatSplit`.
- [ ] Oude workouts (samples=NULL) → integer-fallback, geen lege/crashende cellen.
- [ ] States aanwezig: loading (fetch), empty (geen trainingen), error.
- [ ] Interactie: tap rij → detail, tab-switch, verwijder-knop, scroll.
- [ ] Alle visuele waarden via @/constants tokens; portrait; Ionicons.
- [ ] Geen DB-migratie; typecheck groen; parity-render tegen 5:6/5:7/38:5009/38:5115.

## Beslissingsgeschiedenis

- 2026-07-14: scope vastgelegd als één flow-TC-EBC (lijst + 3 detail-tabs) i.p.v. per scherm.
- 2026-07-14: split-tienden worden afgeleid uit `samples` (interpolatie), niet uit de afgeronde opgeslagen scalars; oude workouts vallen terug op integer-split (beslist door Jeroen).
- 2026-07-14: live active-workout split blijft heel-seconde — FTMS levert pace op 1s-resolutie; als constraint vastgelegd, buiten deze flow.
- 2026-07-14: Hartslag per-500m BPM-tabel → HR wordt vanaf nu in `samples` opgenomen (`{t,d,hr}`); enkel toekomstige workouts vullen de tabel, bestaande blijven leeg (beslist door Jeroen).
- 2026-07-14: TOTALE SLAGEN → echte stroke-count uit FTMS opslaan (nieuwe kolom `total_strokes` + migratie, door Jeroen te draaien); enkel nieuwe workouts (beslist door Jeroen).
