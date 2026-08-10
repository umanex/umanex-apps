# Dekkingsindicator

---
Datum:   2026-08-10
Type:    component
Project: jobradar
Klant:   umanex
Status:  gebouwd
---

---

```
TASK:        Toon op het dashboard waarop de afgeleide leads rusten: hoeveel van de
             opgeslagen vacatures classificeerbaar waren, uitgesplitst naar design,
             dev en onbepaald.

CONTEXT:     jobradar dashboard, tussen de kop (titel + "Sync nu") en de FilterBar.
             Reden: na vier reviewrondes op de classificatie bleek 647 van 664 echte
             vacatures onbepaald. Die leemte was nergens zichtbaar — de leadlijst
             oogde gewoon kort. Een gemiste classificatie hoort een leesbaar getal
             te zijn, geen stille afwezigheid.

ELEMENTS:    - CoverageBar: één inline regel onder de kop
             - Totaal ("17 van 664 vacatures geclassificeerd")
             - Drie tellingen: design · dev · onbepaald
             - Lege staat wanneer er nog geen vacatures zijn

BEHAVIOUR:   - Puur informatief: geen klik, geen hover, geen state
             - Telling gebeurt server-side op de huidige classificatie, niet op wat
               bij de sync gold — de indicator hoort mee te bewegen met de code
             - Rekent over álle opgeslagen vacatures, niet over de filterselectie:
               het is een uitspraak over de dataset, niet over de weergave

CONSTRAINTS: - Desktop-first, één regel; wrapt op smal scherm
             - Tailwind + bestaande rollaag; text-muted-foreground, tabular-nums
             - Geen nieuwe dependency, geen schemawijziging
             - Geen percentage — bij nul vacatures bestaat dat niet en een tweede
               getal naast "17 van 664" voegt niets toe
```

---

## Open vragen

_Geen._

## Aannames

- `[ASSUMPTION: de indicator telt over de volledige jobs-tabel, niet over de actieve filters — de FilterBar-tellingen staan al op de tabs]`
- `[ASSUMPTION: server-side berekend in app/page.tsx, waar de vacatures toch al geladen worden; geen extra query]`
- `[ASSUMPTION: loading- en error-state vallen af — het component rendert props van een server-gerenderde pagina en doet zelf geen data-fetch. De pagina-brede error-state staat in app/error.tsx. De lege staat blijft wél]`

## Acceptatie

- [x] Staat als één regel tussen de kop en de FilterBar, en niet in een tabblad
- [x] Toont het totaal in de vorm "{geclassificeerd} van {totaal} vacatures geclassificeerd"
- [x] Toont drie afzonderlijke tellingen: design, dev, onbepaald
- [x] design + dev + onbepaald == totaal (invariant, over elke dataset)
- [x] geclassificeerd == design + dev (invariant)
- [x] Lege staat: zonder vacatures verschijnt een leesbare regel, geen "0 van 0" en geen NaN
- [x] Randgeval: alles geclassificeerd → onbepaald toont 0, de regel blijft kloppen
- [x] Bevat geen interactie — geen onClick, geen tooltip, geen useState
- [x] Telt over alle opgeslagen vacatures, niet over de filterselectie
- [x] Cijfers zijn `tabular-nums` en de regel wrapt op smal scherm zonder overflow
- [x] Gebruikt uitsluitend rol-utilities uit de preset; geen rauwe paletklasse, geen hex
- [x] De telling volgt de huidige classificatie: wijzigt `classificeer`, dan wijzigen de cijfers mee

### Verificatie

Gemeten op 2026-08-10 tegen een momentopname van 664 echte vacatures (wegwerp-database,
niet `.data/jobradar.db`):

- Gerenderd: `50 van 664 vacatures geclassificeerd | design 5  dev 45  onbepaald 614`
- Lege staat gerenderd via `pnpm --filter jobradar flow --shot=.flow-shots`
- De vijf invarianten (som, geclassificeerd, lege dataset, alles-geclassificeerd, volgt
  `classificeer`) draaien in `scripts/signal-scenarios.ts`
- `pnpm --filter @umanex/tokens guard`: 176 bestanden schoon
- Wrapping op smal scherm rust op `flex-wrap`, niet op een visuele controle bij een smalle
  breakpoint — het enige item dat by construction is afgevinkt

Status blijft `gebouwd` en niet `gevalideerd`: er is nog geen reviewronde over deze wijziging
gedraaid.

### Bekende grenzen

Uit de reviewronde van 2026-08-10, allebei gemeten en allebei bewust niet gefixt:

- **De indicator rekent live, de kaarten eronder zijn bevroren op sync-tijd.** Wijzig je de
  woordenlijsten en herlaad je zonder te synchroniseren, dan beweegt het dekkingsgetal wél en
  de scores op de kaarten niet. Dat is precies de bedoelde eigenschap (zie BEHAVIOUR), maar
  het kan tegenspreken wat eronder staat. Beslissing over of dat verwarrend genoeg is om de
  copy aan te passen: aan Jeroen.
- **`berekenDekking` draait de volledige classificatie bij élke render.** Gemeten: 12 ms bij
  662 rijen, 85 ms bij 5.000, 841 ms bij 50.000. Nu ruim voldoende. Een cache is bewust niet
  gebouwd: bij die aantallen is de échte rem de ongelimiteerde query in `app/page.tsx`, die
  álle rijen naar de RSC-payload stuurt. Dit optimaliseren vóór dát opgelost is, is het
  verkeerde ding polijsten.

## Beslissingsgeschiedenis

- 2026-08-10: TC-EBC aangemaakt na vier reviewrondes waarin bleek dat 97% van de opgehaalde vacatures onbepaald blijft; scope = zichtbaarheid van die dekking, niet het verbeteren ervan
- 2026-08-10: drie kritische items beantwoord door Jeroen — inline regel onder de kop, uitsplitsing design/dev/onbepaald, statisch zonder interactie
