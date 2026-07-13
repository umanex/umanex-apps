# TC-EBC — Active workout redesign (geen / tijdsduur / afstand)

| | |
|---|---|
| **Datum** | 2026-07-13 |
| **Type** | screen |
| **Project** | RowTrack (`apps/rowtrack`) |
| **Klant** | umanex (eigen product) |
| **Status** | gebouwd (parity nog te valideren) |

---

```
TASK:        Migreer het Active-workout scherm (ActivePhase) naar het nieuwe
             Figma-design voor doel-types geen / tijdsduur / afstand, in zowel
             portrait als landscape. Andere organisatie & layout + aangepaste
             tokens; functioneel identiek aan de huidige implementatie.

CONTEXT:     RowTrack rowing tracker. Dit is het EERSTE test-scherm van een
             bredere design-migratie — overige schermen (idle, home, history,
             summary, split/watts-doelen) volgen later in aparte iteraties.
             Tokens zijn aangepast in tokens.json (Tokens Studio → build).

ELEMENTS:    - DOEL-pill (label + doelwaarde, of "Geen doel")
             - Hero-cijfer (resterende afstand/tijd, of live afstand bij geen doel)
             - Progress-bar met fill + dot (bij duration/distance)
             - Subtitle-rij: elapsed · "X% voltooid" (floor)
             - Stop-training knop
             - KPI-lijst: SPLIT 500/M · WATT · SPM · BPM · TIJD · KCAL
             (landscape: hero-kolom links, KPI-rijen rechts — 50/50)

BEHAVIOUR:   - Live BLE-updates van alle metrics (ongewijzigd)
             - Klik "Stop training" → beëindigt sessie (ongewijzigd)
             - Oriëntatie-switch portrait ↔ landscape rendert de juiste layout
             - "% voltooid" floor'd; progress-fill capped op 100%
             Alle gedrag identiek aan huidige ActivePhase — enkel de visuele
             organisatie/layout en tokens wijzigen.

CONSTRAINTS: React Native / Expo · StyleSheet (geen inline styles) ·
             tokens uitsluitend via @/constants (rebuild uit aangepaste
             tokens.json, geen hardcodes) · portrait + landscape (active
             workout is de enige landscape-view) · Ionicons (@expo/vector-icons).
```

---

## Open vragen

- [ ] **Figma-bron** — welke node-id(s)/frames bevatten het aangepaste design (portrait + landscape, per doel-type)? Uit `apps/rowtrack/figma-map.md`, of deel je een selectie/URL? Vóór ik inspecteer wil ik de juiste bron zeker weten (niet gokken op componentnaam — projectregel).
- [ ] **Tokens-sync** — staat de aangepaste `tokens.json` al op deze branch (Tokens Studio → GitHub gesynct), zodat `pnpm tokens:build` volstaat? Of moet ik nog iets ophalen?
- [ ] **Scope split/watts** — de doel-varianten `split` en `watts` blijven deze iteratie ongewijzigd (oude layout), toch? Briefing noemt enkel geen/tijdsduur/afstand.

## Aannames

- `[ASSUMPTION]` Betreft de **active**-fase (`ActivePhase`), niet de idle/setup-fase van dit scherm.
- `[ASSUMPTION]` States ongewijzigd: geen-data / live-data / doel-bereikt bestaan al en blijven; er komt geen nieuwe loading/empty/error bij (functioneel identiek).
- `[ASSUMPTION]` Edge cases ongewijzigd: geen doel, 0%, doel bereikt (fill capped >100%), reconnect-gedrag.
- `[ASSUMPTION]` Interactie ongewijzigd: klik Stop-training, live BLE-updates, oriëntatie-switch.

## Acceptatie

- [ ] Portrait — doel = geen: layout matcht nieuw design (parity tegen snapshot)
- [ ] Portrait — doel = tijdsduur: layout + progress-bar + subtitle matchen
- [ ] Portrait — doel = afstand: layout + progress-bar + subtitle matchen
- [ ] Landscape — geen / tijdsduur / afstand: hero-kolom + KPI-rijen matchen
- [ ] Alle kleuren/spacing/radii/type via tokens uit `@/constants` — geen hardcodes
- [ ] `tokens.json`-wijzigingen doorgebouwd (`pnpm tokens:build`) en geverifieerd op echte waarden (DTCG `$value`-valkuil)
- [ ] Functioneel gedrag ongewijzigd: BLE-updates, Stop-training, oriëntatie-switch, %-floor
- [ ] split/watts-varianten ongewijzigd (geen regressie)
- [ ] Verify op render-pad (iOS-sim + waar relevant fysiek toestel)

## Beslissingsgeschiedenis

- 2026-07-13: TC-EBC aangemaakt — eerste test-scherm van bredere migratie.
- 2026-07-13: Hero-font → Albert Sans Bold (Jeroen bevestigd; serif-hero losgelaten). Pill-bg → inline `rgba(240,84,84,0.10)` + TODO (geen token). Split/watts behouden huidig gedrag in de nieuwe shell.
- 2026-07-13: Gebouwd — font-pipeline uitgebreid (Albert Sans Light/Regular/Bold), ActivePhase portrait+landscape geherstructureerd, tsc groen. Visuele parity (6 varianten) nog niet gedraaid: geen mock-pad om active-fase met testdata te forceren.
