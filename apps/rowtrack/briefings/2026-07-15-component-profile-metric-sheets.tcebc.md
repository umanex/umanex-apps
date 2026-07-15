# TC-EBC — Profiel-invoer-bottomsheets (Lengte / Gewicht / Geboortedatum) → Figma

- **Datum:** 2026-07-15
- **Type:** component (set van 3 verwante bottomsheets)
- **Project:** rowtrack
- **Klant:** umanex (eigen product)
- **Status:** gevalideerd
- **Richting:** Code → Figma (source-of-truth = code)

---

```
TASK:        Mirror de drie profiel-invoer-bottomsheets (Lengte, Gewicht,
             Geboortedatum) uit code naar Figma, met volledige token-binding.
CONTEXT:     RowTrack Profiel-scherm; sheets openen bij tap op een rij. Bron:
             apps/rowtrack/app/(tabs)/profile.tsx + gedeelde BottomSheet +
             WheelPicker. RowTrack-eigen tokens (geen umanex-DNA).
ELEMENTS:    BottomSheet (titel + surface bg.elevated), WheelPicker —
             Lengte: 1 kolom (cm) · Gewicht: 1 kolom (kg) · Geboortedatum:
             3 kolommen (dag/maand/jaar), gedeelde selectie-band, geen labels —
             plus Opslaan-knop (Button size md).
BEHAVIOUR:   Sheet slide-up; wheel scroll/snap naar waarde; pill markeert de
             selectie; Opslaan schrijft weg + sluit; tap-buiten/close dismisst.
             In Figma statisch: de default open-state + de selectie-band.
CONSTRAINTS: Mobile portrait; RowTrack tokens (surface bg.elevated, edge-fade →
             bg.elevated, showPill); Figma-file T1bGrvIzSNeLyh5CbarATZ,
             Components-pagina node-id 21-378 / Screens 0-1; token-binding
             verplicht (geen hardcoded fills/spacing/radius).
```

---

## Open vragen

- ~~**Doel-Figma-nodes:** bestaan er al sheet-frames of maak ik nieuwe?~~ → **Opgelost:** de 3 frames bestonden al in de `Profile`-sectie (`354:2004`): Lengte `52:9286`, Gewicht `52:9424`, Geboortedatum `52:9538`. Dit was dus een **update**, geen creatie. De bodies waren verouderd (Lengte=`Val`-input, Gewicht=`NudgeRow`-stepper, Geboortedatum=1 wheel) en zijn vervangen door de WheelPicker-representatie.

## Aannames

- [ASSUMPTION] Eén TC-EBC voor de set — de 3 sheets delen de BottomSheet + WheelPicker-structuur. Kan per sheet opgesplitst worden indien gewenst.
- [ASSUMPTION] Statische representatie van de default open-state per sheet — geen loading/empty/error (lokale input, geen async data-fetch).
- [ASSUMPTION] De WheelPicker rendert in de sheets met `surface = bg.elevated`, `showPill` en de edge-fade naar `bg.elevated` (cf. HANDOFF 2026-07-10, PR #124/#126).

## Acceptatie

- [x] Drie sheet-frames bijgewerkt: Lengte `52:9286` (cm-wheel), Gewicht `52:9424` (kg-wheel), Geboortedatum `52:9538` (3-koloms date-wheel)
- [x] BottomSheet-structuur per sheet: titel + WheelPicker-body + Opslaan-knop (shell + header + button bleven ongewijzigd, enkel body vervangen)
- [x] Alle nieuwe fills via **bound variables** — border→`border/strong`, neighbors→`fg/secondary`, center→`fg/primary`; fontFamily/fontSize/fontStyle(bold) gebonden. Geen hardcoded fills. *Caveat:* `fontStyle` op regular-tekst kan niet gebonden (enkel `fontWeight/bold` bestaat als STRING-var — matcht de bestaande date-wheel).
- [x] Selectie-indicator (twee `border/strong`-lijnen) consistent over alle 3 — zie decision hieronder over pill vs. lijnen
- [x] Wheel-waarden spiegelen de code: Lengte 178–182 cm (center 180), Gewicht 73–77 kg (center 75), Geboortedatum 10/11/12 · jun/jul/aug · 1988/89/90
- [x] Visuele parity-screenshots (3×) + binding-check via `figma_execute` bevestigt geen hardcoded fills

## Beslissingsgeschiedenis

- 2026-07-15: aangemaakt — code→Figma sync van de 3 profiel-metric-sheets; kritische items ingevuld vanuit de bestaande code (typologie/interactie/edge-cases), enige echte open vraag = bestaande vs. nieuwe Figma-nodes.
- 2026-07-15: **update i.p.v. creatie** — de 3 frames bestonden al; enkel de body (child index 1) van elke Sheet vervangen, header + Opslaan-button + sheet-tokens ongewijzigd gelaten.
- 2026-07-15: **selectie = twee lijnen, geen filled pill** — de code-pill/`datePickerBand` is `bg.raised` op een `bg.raised` sheet → visueel onzichtbaar. De bestaande Geboortedatum-wheel gebruikte al twee `border/strong`-lijnen; die stijl overgenomen voor Lengte/Gewicht voor consistentie (de zichtbare selectie-cue is de grote bold center-waarde). ⚠️ *Aandachtspunt voor Jeroen:* in de app is de sheet-selectieband dus feitelijk onzichtbaar — bewust design-keuze of te herzien?
- 2026-07-15: **Geboortedatum-neighbors Inter → Albert Sans** — de bestaande date-wheel had nog Inter-neighbors (van vóór de typografie-migratie); geswapt naar Albert Sans + gebonden fontFamily/fontSize/fill, zodat alle 3 de sheets identiek zijn en matchen met de code.
