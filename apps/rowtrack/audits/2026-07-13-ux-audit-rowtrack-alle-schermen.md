# UX-audit — RowTrack (alle schermen)

- **Geaudit:** volledige RowTrack-app, alle schermen zoals ontworpen in Figma (file `RowTrack`, pagina *Screens*)
- **Datum:** 2026-07-13
- **Platform:** mobiel (React Native / Expo, iOS + Android), dark-only, portrait-primary + landscape voor de active workout
- **Bron:** Figma Console MCP (Desktop Bridge, `exportAsync`-screenshots — REST-token ontbreekt), node-inspectie + text styles + kleur-tokens
- **Methodiek:** IxDF — *The Basics of User Experience Design* (7 factoren · 5 usability-karakteristieken · 5 interactie-dimensies)
- **Scope-noot:** dit is een expert-review van het **statische design**, niet van de draaiende app of instrumenteel gebruik. Alle uitspraken over taaksucces/timing zijn aannames (zie *Methodiek & limieten*).

---

## 1 — Samenvatting

**Totaalscore: 56 / 85 → grade C (grens met B) — functioneel, werk nodig.**

RowTrack heeft een **sterke visuele basis**: een volwassen token- en type-systeem (coral `accent/default` #F05454, editorial serif hero-cijfers naast een strakke Albert Sans, italic-connectoren en units, warme *achievement*-accenten, een smaakvolle confetti-celebration). Op craft-niveau zit dit tegen A aan. Wat de score naar C trekt is niet de esthetiek maar de **robuustheid**: er zijn geen error-/empty-/loading-/BLE-disconnect-states, enkele **kern-acties zijn zichtbaar kapot** (Uitloggen / Opslaan / Verwijderen zijn 48×48 cirkelknoppen die hun label clippen), de active-workout hero is **semantisch dubbelzinnig** (label "TOTALE TIJD" toont resterende tijd), en er zijn **toegankelijkheidsgaten** (9–10 px labels, tekst op `fg/quaternary` haalt WCAG-contrast niet).

**Top-3 kritische prioriteiten**

1. **P1 — Kapotte cirkel-actieknoppen** (Uitloggen, Opslaan, Verwijderen): tekst geclipt in een 48×48 cirkel, geen leesbare affordance voor primaire én destructieve acties.
2. **P1 — Geen states**: geen error/empty/loading en — kritiek voor een BLE-app — geen "geen roeimachine verbonden"-state op de active workout. Botst met de eigen regel *states zijn default*.
3. **P1 — Dubbelzinnige active-hero + toegankelijkheid**: "TOTALE TIJD 15:00" naast "AFGELEGD 05:00 · 25%" (15:00 = resterend, niet totaal); daarbovenop kleine, laag-contrast labels.

---

## 2 — 7 UX-factoren

| Factor | Score | Kern |
|--------|:-----:|------|
| Useful | 4/5 | Kern-roeimetrics compleet (split/500m, watt, SPM, BPM, afstand, tijd, kcal), PR's, weekdoel. Analyse-diepte dun (geen HR-curve, geen pace-grafiek). |
| Usable | 3/5 | Heldere hiërarchie en grote leesbare hero-cijfers, maar kapotte actieknoppen + dubbelzinnige hero + redundante metric. |
| Findable | 3/5 | Duidelijke 4-tab bottom-nav en filters/tabs; maar de metric-switch op de active workout heeft geen zichtbare affordance. |
| Credible | 4/5 | Gepolijst, consistent accent, rijk token-systeem — voelt premium. Ondermijnd door placeholder-herhaling en zichtbare defecten (mockup-staat). |
| Desirable | 4/5 | Onderscheidende, editoriale look boven het fitness-app-gemiddelde. Veel lege schermen lezen als onaf i.p.v. bewust minimaal. |
| Accessible | 2/5 | 9 px tab-labels, 10 px KPI-labels (uppercase, wijde tracking); tekst op `fg/quaternary` (#5C606B ≈ 2,5:1) faalt WCAG AA. Zwakste factor. |
| Valuable | 4/5 | Voortgang, PR's, weekdoel, celebration = echte waarde + sterk merk. Geen sharing/export; retentie leunt op één hook (weekdoel). |
| **Subtotaal** | **24/35** | |

## 3 — 5 usability-karakteristieken

| Karakteristiek | Score | Kern |
|----------------|:-----:|------|
| Effectiveness | 3/5 | Kern-taken haalbaar, maar kapotte save/logout/delete blokkeren afronding *as-shown*; hero-semantiek kan misgelezen worden. |
| Efficiency | 4/5 | Bottom-tabs + at-a-glance hero + KPI-grids + landscape-erg-modus + wheel-picker = efficiënt. |
| Engagement | 4/5 | Celebration, PR-badges, achievement-kleuren, weekdoel-voortgang. Lege Hartslag/analyse temperen het. |
| Error tolerance | 2/5 | Geen error/empty/loading; geen BLE-disconnect-state; destructieve "Verwijderen" zonder zichtbare bevestiging. Zwakste. |
| Ease of learning | 4/5 | Conventionele patronen, heldere NL-labels, vertrouwde roei-metrics → lage leercurve. |
| **Subtotaal** | **17/25** | |

**Utility-check (Utility + Usability = Usefulness):** de juiste kern-features zíjn aanwezig (live metrics, samenvatting, historiek, PR's, doel). Wat ontbreekt op utility-niveau: connectie-state-afhandeling (BLE) en analyse-diepte (HR-verloop, pace-curve). Usefulness wordt dus vooral geremd door robuustheid, niet door ontbrekende hoofd-features.

## 4 — 5 interactie-dimensies

| Dimensie | Score | Kern |
|----------|:-----:|------|
| Words | 3/5 | Goede microcopy ("Verhoog je kracht om je doel te behalen"), maar unit-bug "20.45 m van 50 km", mislabel "TOTALE TIJD", dubbele "Totaal afstand", NL-decimaal met punt. |
| Visual representations | 3/5 | Sterk type/kleur-systeem, maar géén datavisualisatie (Hartslag = 2 getallen + leegte), gevarieerde divider-kleur zonder legenda, geclipte cirkelknoppen. |
| Physical / space | 3/5 | Doordachte portrait/landscape-split; maar 9–10 px labels, kleine tap-targets, veel verspilde verticale ruimte, ongebruikelijke plaatsing van primaire actie linksonder. |
| Time | 3/5 | *[GEEN DATA — statische frames]*. Design impliceert real-time hero-feedback + celebration; laadtijd/animatie niet toetsbaar. Bekende Fabric-animatie-ruwheid (segment-snap). |
| Behavior | 3/5 | Systeemstatus zichtbaar tijdens workout; maar geen connect/disconnect- of bevestigings-feedback, onduidelijk wat een KPI-tik doet, wisselende hero-semantiek verlaagt voorspelbaarheid. |
| **Subtotaal** | **15/25** | |

---

## 5 — Bevindingen (geprioriteerd)

### P1 — grote frictie, deze sprint

**F1 · Kapotte cirkel-actieknoppen** — `Usable, Effectiveness, Accessible`
Uitloggen (Profile `52:8768`), Opslaan (edit-sheets `52:9155`/`52:9538`) en Verwijderen (History-detail `5:7`/`38:5009`/`38:5115`) zijn `Button`-instances van **48×48 px, `cornerRadius: 9999`, `clipsContent: true`** met een tekstlabel dat wordt afgekapt ("ogge", "oslaan", "verwij"). Kern- én destructieve acties hebben geen leesbare affordance.
→ *Impact hoog · Effort S.* Vervang door een volle-breedte / pill-tekstknop (bestaande `button/*`), of een icon-only 48 px knop met accessible label — niet geclipte tekst.

**F2 · Geen error/empty/loading/disconnect-states** — `Error tolerance, Useful`
Nergens states: Auth zonder validatie/foutmelding, History zonder empty-state (nieuwe gebruiker), en — kritiek voor een BLE-app — de active workout heeft **geen "geen roeimachine verbonden / zoeken"-state**; alles gaat uit van een streamende erg. Botst met de projectregel *states zijn default*.
→ *Impact hoog · Effort M–L.* Minimaal: BLE-searching/disconnected op Active, empty-History, Auth-fout (verkeerd wachtwoord / leeg veld / netwerk), loading-skeletons.

**F3 · Dubbelzinnige active-workout hero** — `Words, Behavior`
Bij een duur-doel toont de hero "TOTALE TIJD **15:00**" terwijl "AFGELEGD **05:00 · 25%**" eronder staat (15:00 = resterend van 20 min). Het label spreekt de waarde tegen, en verschilt van de *Geen*-variant waar "TOTALE TIJD" wél de verstreken tijd is.
→ *Impact midden-hoog · Effort S.* Herlabel naar "RESTEREND / NOG TE GAAN" bij een tijdsdoel, of houd de hero altijd = verstreken tijd en zet resterend in de sub-regel.

**F4 · Toegankelijkheid: kleine type + laag contrast** — `Accessible, Physical/space`
Tab-bar & micro-labels 9 px, KPI-labels 10 px (uppercase, 30% tracking); tekst op `fg/quaternary` #5C606B (inactieve tab/segment, split-index) ≈ **2,5:1 → faalt WCAG AA**. `fg/tertiary` #8A8E97 op donkere achtergrond is borderline (~4,5:1) bij kleine tekst.
→ *Impact hoog · Effort M.* Til minimale leestype naar ≥11–12 px, verhoog contrast van inactieve/secundaire tekst, en doe een formele WCAG-pass op toestel.

### P2 — hinder, volgende release

**F5 · Dubbele "80 kcal ENERGIE"-tegel** op Active/Summary (`43:8278`) — linksonder én rechtsonder identiek; één tegel is placeholder/fout, een stat ontbreekt (bv. gem. split of SPM). *Effort S.*

**F6 · Unit- & getalformattering** op Home (`16:159`) en Profile (`52:8768`): "20.45 m van 50 km" — waarde is km, label zegt "m". Bovendien NL-decimaal met punt ("20.45") terwijl elders de punt duizendtal is ("6.120 m" = 6120 m) → dezelfde punt betekent twee dingen. *Effort S.* (Kan live-data-formattering zijn; gevlagd vanuit het design.)

**F7 · Redundante "Totaal afstand"** op de active screens — zowel als hero ("TOTALE AFSTAND 1.234m") als opnieuw in de KPI-lijst eronder. Verspilt schaarse active-screen-ruimte. *Effort S.*

**F8 · Lege Hartslag-tab + geen datavisualisatie** (`38:5115`) — enkel gem./max BPM en ~85% lege ruimte waar een HR-verloop/zones hoort; Splits (`38:5009`) is een tabel zonder pace-curve; het weekdoel is een dunne balk. Geen enkele grafiek in een data-product. *Impact midden · Effort M–L.*

**F9 · Stale/afwijkende Profile achter de edit-sheets + off-token teal** — de Profile-achtergrond onder de Geslacht/Geboortedatum-sheets toont een oudere layout ("MIJN DOEL / DEZE WEEK / Bewerken") met een **teal accent dat in géén token bestaat** (systeem-accent = `accent/default` #F05454). Twee Profile-versies leven naast elkaar. *Effort S.* Herbouw de sheets op de huidige Profile (`52:8768`); schrap teal.

**F10 · Metric-switch-affordance onduidelijk** — hoe de gebruiker de active hero-KPI kiest (None/Duration/Distance/Split/Watts) is niet zichtbaar in het design. *Effort S–M.*

### P3 — nice-to-have, backlog

**F11 · Placeholder-uniformiteit** — elke History-rij identiek + allemaal "VANDAAG", geen datum-groepering ("Deze week / Vorige week"). *Effort S.*

**F12 · Naamgeving "Motivational Toast"** (`5:5`) is in werkelijkheid een full-screen celebration-modal, geen toast (interne naam). *Effort XS.*

**F13 · Back-link "← OVERZICHT"** op History-detail botst semantisch met de tab "Overzicht" op datzelfde scherm. Gebruik een chevron-terug of label "Historiek". *Effort XS.*

**F14 · Design-system-hygiëne** — twee overlappende text-style-taxonomieën (platte `type/*` set naast component-scoped `button/…`, `kpiTile/…`) met bijna-duplicaten; losse dubbele frames op het canvas (standalone Active/Portrait+Landscape/Duration buiten de sectie). *Effort S.*

**F15 · Auth-minimalisme** — veel lege ruimte, geen logo/illustratie, geen social login, geen wachtwoordregels op Register. Acceptabel, maar kan warmer. *Effort S.*

---

## 6 — Redesign-voorstellen (top)

### R1 · Actieknoppen herstellen (lost F1 op)
**Nu:** primaire/destructieve acties als 48×48 cirkel met geclipt label.
**Voorstel:** volle-breedte of pill-tekstknop onderaan; destructief als outline-destructive; sheets krijgen een sticky "Opslaan" onder de sheet-inhoud.

    Profile ▸ onderaan            Edit-sheet ▸ onder de inhoud
    ┌───────────────────────┐     ┌───────────────────────┐
    │      Uitloggen        │     │   Man  Vrouw  Anders  │
    └───────────────────────┘     │  ┌─────────────────┐  │
    (outline-destructive, full)   │  │     Opslaan     │  │
                                  │  └─────────────────┘  │
    Detail ▸ Verwijderen als      └───────────────────────┘
    tekst-outline, niet als bol.

**Effect:** Usable 3→4, Effectiveness 3→4. **Effort S.**

### R2 · State-dekking (lost F2 op)
Voeg de default-set toe, met prioriteit op de BLE-context:
- **Active — "Geen roeimachine verbonden"**: zoek-spinner + "Verbind je Concept2…" + herprobeer-knop; onderscheid *zoeken* / *verbonden* / *verbinding verloren*.
- **History — empty**: eerste-workout-CTA i.p.v. blanco lijst.
- **Auth — error**: veldvalidatie + inline foutmelding (verkeerd wachtwoord, leeg, netwerk).
- **Loading**: skeletons op data-schermen.

**Effect:** Error tolerance 2→4, Useful 4→5. **Effort M–L.**

### R3 · Active-hero verhelderen (lost F3 + F7 op)
Eén ondubbelzinnige hero, geen dubbele afstand.

    ┌───────────────────────────────┐
    │ DOEL  |  20 min        Stop → │
    │                               │
    │           RESTEREND           │   ← eenduidig label
    │            15:00              │
    │      verstreken 05:00 · 25%   │
    │      ▓▓▓▓░░░░░░░░░░░░░░        │
    ├───────────────────────────────┤
    │ Split 500/m            02:20  │   ← Totaal afstand niet
    │ Watt                    142   │     dubbel: enkel in lijst
    │ SPM · BPM · Kcal …            │
    └───────────────────────────────┘

**Effect:** Words 3→4, Behavior 3→4. **Effort S.**

### R4 · Toegankelijkheidspass (lost F4 op)
Minimale leestype ≥11–12 px; inactieve/secundaire tekst weg van `fg/quaternary` naar minstens `fg/tertiary`-contrast of hoger; tap-targets (tekstlinks, back) ≥44 px; formele WCAG-check + dynamic-type op toestel.
**Effect:** Accessible 2→3/4. **Effort M.**

### R5 · Hartslag & analyse als datavisualisatie (lost F8 op)
HR-over-tijd-lijn + zones op Hartslag; pace/split-curve op Splits; rijker weekdoel. Vult de lege schermen met betekenis.
**Effect:** Useful 4→5, Visual 3→4, Desirable 4→5. **Effort M–L.**

> Bouwen van deze redesigns: gebruik `nieuw-component` (scaffold) en `figma-naar-code` / `code-naar-figma` (design ↔ code). Deze audit levert richting, geen Figma-uitwerking.

---

## 7 — Research-aanbevelingen

- **Moderated erg-test (5–6 roeiers, mid-workout):** kunnen ze *resterend* vs *verstreken* lezen en de hero-metric wisselen? Toetst F3 + F10.
- **BLE connect/disconnect op toestel:** observeer het echte gedrag bij geen/verloren verbinding. Toetst F2 (kritiek).
- **First-run / empty-state-test met een nieuwe gebruiker:** wat ziet iemand met 0 workouts? Toetst F2/F11.
- **Formele WCAG-contrast + dynamic-type-audit** met een tool op toestel (niet op geschatte tokens). Toetst F4.
- **5-second-test op Active/Summary:** valt de dubbele "80 kcal"-tegel op, worden de stats begrepen? Toetst F5.

---

## 8 — Methodiek & limieten

- **Expert-review van het statische Figma-design**, niet de draaiende app. Te valideren met echte gebruikers — de bevindingenlijst is de deliverable, de score is een communicatiemiddel.
- **Geen analytics/user-data** → alle uitspraken over taaksucces, timing en drop-off zijn aannames, niet gemeten.
- **Contrastratio's zijn geschat** uit de kleur-tokens (bv. `fg/quaternary` #5C606B ≈ 2,5:1). Bevestig met een echte WCAG-tool op toestel.
- Sommige "bugs" (identieke placeholder-data, "80 kcal"-tegel, unit-string) kunnen in de **live datalaag al correct** zijn — ze zijn gevlagd vanuit de mockup.
- **Provisionele persona (aanname):** recreatieve/competitieve indoor-roeier, 25–55, bezit/gebruikt een Concept2-erg, tech-comfortabel; telefoon staat op de erg tijdens de workout (verklaart grote hero-cijfers + landscape). Doel: workouts, splits/watt/pace/HR, PR's en een weekafstand-doel volgen. Frustratie: onbetrouwbare BLE-koppeling en trage/onleesbare metrics tijdens het roeien.
- **Bias-noot:** RowTrack is umanex-eigen werk; als auditor ben ik hier zowel maker-nabij als beoordelaar. Ik heb bewust de zwakke factoren (states, a11y, defecten) niet weggeschreven ondanks de sterke visuele indruk.

### Aannames

- `[ASSUMPTION]` Dark-only is bewust (erg-/gebruikscontext), geen light-mode-gat.
- `[ASSUMPTION]` De standalone Active/Duration-frames buiten de sectie zijn oudere iteraties, geen actieve schermen.
- `[ASSUMPTION]` De teal-Profile achter de sheets is een verouderde versie, niet de doel-staat.
