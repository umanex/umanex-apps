# Lead-herleidbaarheid en zoeken

---
Datum:   2026-08-11
Type:    feature
Project: jobradar
Klant:   umanex
Status:  gebouwd
---

---

```
TASK:        Maak een lead controleerbaar: toon waarop hij rust en laat hem doorklikken
             naar de vacatures die het signaal dragen — via één zoekveld dat ook los
             bruikbaar is over de hele lijst.

CONTEXT:     De twee P1's uit audits/2026-08-11-ux-audit-jobradar.md. Een leadkaart zegt
             "Smals · dev-vacature zonder design · 75" en biedt geen enkel bewijspad;
             lib/signals.ts rékent de tellingen uit en gooit ze weg. En met 327 vacatures
             zonder zoekveld is elke gerichte vraag bladerwerk. De twee versterken
             elkaar: de doorklik ís het zoekveld.

ELEMENTS:    - Zoekveld in de FilterBar, met wisknop
             - Drie tellingen op de leadkaart: totaal · design · dev
             - Knop "toon deze vacatures" op de leadkaart
             - Lege staat per tabblad wanneer de zoekterm niets oplevert
             - Drie nieuwe kolommen op `companies` (nullable)

BEHAVIOUR:   - Zoeken filtert op titel én bedrijfsnaam, hoofdletter-ongevoelig, in beide
               tabbladen; het is een gewone substring, geen regex
             - "toon deze vacatures" zet de zoekterm op de bedrijfsnaam en springt naar
               het Vacatures-tabblad. Eén mechanisme, twee ingangen
             - Een lead zonder opgeslagen tellingen toont "— nog niet geteld", geen 0.
               De eerstvolgende sync vult ze
             - De lege staat noemt de zoekterm, en bij nul treffers na een doorklik legt
               hij uit dat de vacatures uit het venster van 30 dagen kunnen zijn gelopen

CONSTRAINTS: - Desktop-first, Tailwind + bestaande rollaag, geen nieuwe dependency
             - Client-side filteren: alle rijen zitten al in de RSC-payload
             - Nullable kolommen, geen backfill-migratie — "nog niet geteld" is een
               geldige toestand en geen gebrek
```

---

## Open vragen

_Geen._

## Aannames

- `[ASSUMPTION: de tabs worden controlled; ze staan nu op defaultValue en de doorklik moet het actieve tabblad kunnen zetten]`
- `[ASSUMPTION: geen debounce — filteren gebeurt op data die al in het geheugen zit, dus er is niets om te vertragen]`
- `[ASSUMPTION: loading- en error-states vallen af voor het zoekveld: het doet geen enkele netwerkaanroep. De lege staat blijft, en die is hier de belangrijkste]`
- `[ASSUMPTION: de tellingen komen uit `Bedrijfsprofiel`, dat ze al berekent — er komt geen nieuwe rekenkern bij]`

## Acceptatie

- [x] Een zoekveld staat in de FilterBar en filtert op titel én bedrijfsnaam
- [x] Zoeken is hoofdletter-ongevoelig en behandelt de invoer als gewone tekst, niet als regex
- [x] Het filter werkt in beide tabbladen, en de tellers op de tabs volgen mee
- [x] Een wisknop leegt het veld en herstelt de volledige lijst
- [x] Een leadkaart toont totaal · design · dev wanneer die bekend zijn
- [x] Een leadkaart zonder tellingen toont "— nog niet geteld", nooit 0
- [x] "toon deze vacatures" zet de zoekterm op de bedrijfsnaam en activeert het Vacatures-tabblad
- [x] Na die doorklik tonen de kaarten uitsluitend vacatures van dat bedrijf
- [x] Levert de doorklik nul treffers op, dan legt de lege staat uit waarom dat kan
- [x] De lege staat bij een gewone zoekterm noemt die zoekterm
- [x] De sync schrijft de drie tellingen weg bij elke afgeleide lead
- [x] Een lead uit een externe bron (geen afgeleide) krijgt geen verzonnen tellingen
- [x] `design + dev <= totaal` voor elke opgeslagen lead (invariant)
- [x] Het zoekveld is bedienbaar met het toetsenbord en heeft een toegankelijke naam
- [x] Alleen rol-utilities uit de preset; geen rauwe paletklasse, geen hex

### Verificatie

Gedraaid op 2026-08-11 tegen een consistente kopie van de echte database, in Chrome:

- 25 leads met een score, **nul zonder telling**. Smals toont "9 vacatures · 0 design · 4 dev"
- Klik op "toon deze vacatures" bij Smals → zoekveld op "Smals", tabblad springt naar
  Vacatures, tellers worden 9 en 1, en er staan exact die negen — allemaal met score **0**,
  want het is backend-werk. De twee assen op één scherm
- Eén verouderde lead verloor zijn signaal, met een waarschuwing in `sourceStatuses`
- Invariant `design + dev <= totaal` houdt over alle rijen
- 688 checks over vier suites

### Wijziging tijdens het bouwen

De afleiding rekende over de vacatures van de laatste fetch. Met de versmalde zoektermen die
op de echte database stonden (`UX`, `UI`, `UX/UI`) haalde die 24 rijen op, en kregen 15 van de
26 leads geen telling — Smals stond op 75 punten met "— nog niet geteld". Gemeten alternatief:
afleiden over álle opgeslagen vacatures gaf 25 leads en nul zonder telling.

Beslissing Jeroen: afleiden over de database. Dat lost meteen de bekende P2 op dat een lead
nooit veroudert — wordt een bedrijf niet meer afgeleid, dan verliest het zijn afgeleide
signalen en zakt de score, terwijl de rij en jouw status blijven staan.

## Beslissingsgeschiedenis

- 2026-08-11: aangemaakt uit de twee P1's van de UX-audit. Eén briefing in plaats van twee, omdat de doorklik het zoekmechanisme hergebruikt — apart bouwen zou het filter twee keer opleveren
- 2026-08-11: drie kritische items beantwoord door Jeroen — doorklik naar het gefilterde Vacatures-tabblad, "— nog niet geteld" voor bestaande leads, en zoeken op titel plus bedrijfsnaam
