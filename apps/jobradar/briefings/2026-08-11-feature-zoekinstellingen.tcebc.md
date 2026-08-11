# Zoekinstellingen

---
Datum:   2026-08-11
Type:    feature
Project: jobradar
Klant:   umanex
Status:  gebouwd
---

---

```
TASK:        Laat de zoektermen en uitsluitingen van de Adzuna-bron zien op een eigen
             pagina, en maak ze aanpasbaar — met een testknop die vóór het opslaan
             toont hoeveel treffers de wijziging oplevert per regio.

CONTEXT:     jobradar. De termen staan nu hardcoded in lib/config/profile.ts. Op
             2026-08-11 bleek één woord ("product", dat ook op "productie" matchte)
             goed voor 743 van de 1222 treffers. Dat soort bijstelling hoort niet
             telkens een commit te vragen.

ELEMENTS:    - Route /instellingen, met een link "Instellingen" in de dashboardkop
             - TermChips: chip per term met kruisje + invoerveld om toe te voegen
             - Twee velden: zoektermen (verplicht) en uitsluitingen (optioneel)
             - QueryTest: knop + uitslag per regio (treffers, en of het plafond raakt)
             - Opslaan-knop met bevestiging; Herstel-naar-standaard

BEHAVIOUR:   - Een term met een spatie wordt bij invoer gesplitst in losse chips:
               `what_or` matcht losse woorden, dus "product designer" ís twee termen.
               Dat zichtbaar maken is de helft van het punt van dit scherm.
             - Testen doet één goedkope API-aanroep per regio (results_per_page=1) en
               toont alleen de telling — het slaat niets op en raakt de database niet
             - Opslaan werkt pas door bij de volgende sync; dat staat er ook
             - Leeg opslaan mag niet: zonder zoektermen haalt Adzuna álles op

CONSTRAINTS: - Desktop-first, Tailwind + bestaande rollaag, geen nieuwe dependency
             - Alleen de zoektermen zijn bewerkbaar. SKILL_KEYWORDS, de rolwoorden en
               de score/classificatie-assen blijven vastgepind in de guard — die
               lijsten veroorzaakten vier reviewrondes P0/P1
             - Opslag in SQLite naast de bestaande tabellen; ontbreekt de rij, dan
               gelden de gemeten waarden uit profile.ts als standaard
```

---

## Open vragen

_Geen._

## Aannames

- `[ASSUMPTION: opslag als key/value-rij in een nieuwe settings-tabel; dat is de kleinste vorm die ook een volgende instelling aankan]`
- `[ASSUMPTION: loading, error en success zijn alle drie aanwezig — het is een formulier dat opslaat en een externe API bevraagt, dus geen ervan valt af. "Empty" is hier een validatiefout en geen rusttoestand]`
- `[ASSUMPTION: de testknop is niet gedebounced maar wel geblokkeerd zolang een test loopt; drie API-aanroepen per druk is verwaarloosbaar tegenover een sync van vijftien]`
- `[ASSUMPTION: geen autorisatie — de app draait lokaal, net als de rest van de routes. Zie de bekende grens hieronder]`

## Acceptatie

- [x] `/instellingen` bestaat en is bereikbaar via een link in de dashboardkop
- [x] Toont de huidige zoektermen en uitsluitingen als chips, uit de database
- [x] Zonder opgeslagen rij toont hij de standaard uit `profile.ts`, en dat is zichtbaar
- [x] Een term toevoegen met een spatie erin levert meerdere chips op, geen één
- [x] Een dubbele term toevoegen verandert niets (stil ontdubbeld)
- [x] Een chip verwijderen kan met de muis én met het toetsenbord
- [x] Opslaan met nul zoektermen wordt geweigerd, met een leesbare reden
- [x] Opslaan toont een bevestiging en meldt dat het pas bij de volgende sync werkt
- [x] Herstel-naar-standaard zet beide velden terug op de waarden uit `profile.ts`
- [x] De testknop toont per regio het aantal treffers en of het plafond geraakt wordt
- [x] De testknop slaat niets op: de opgeslagen instellingen zijn er ná een test nog gelijk aan
- [x] Tijdens opslaan en testen is de knop geblokkeerd en zichtbaar bezig
- [x] Een gefaalde API-aanroep bij het testen toont een fout, geen leeg resultaat
- [x] De sync gebruikt de opgeslagen termen, niet die uit `profile.ts`
- [x] `SKILL_KEYWORDS`, de rolwoorden en de assen zijn en blijven niet bewerkbaar
- [x] De bestaande guard-invarianten blijven groen; de pin op `whatOr` bewaakt nu de standaard
- [x] Alleen rol-utilities uit de preset; geen rauwe paletklasse, geen hex

### Verificatie

Gedraaid op 2026-08-11 tegen een kopie van de echte database, in Chrome en via de routes:

- Pagina rendert met de opgeslagen termen als chips; "Dit is de gemeten standaard" zichtbaar
- `product designer` typen gaf **één** chip (`product`) — gesplitst in twee woorden, `designer`
  stil ontdubbeld omdat hij er al stond
- Testknop met `product` erbij: WVL 239 (was 26), OVL 336, BRU 652 — twee regio's raken het
  plafond, zichtbaar vóór het opslaan
- Na de test is `isStandaard` nog `true`: de telling sloeg niets op
- Leeg opslaan geweigerd met de reden; overlap tussen termen en uitsluitingen geweigerd
- `{"termen":["ux react"]}` via de route werd twee termen — splitsen zit niet alleen in de UI
- Herstellen zette `isStandaard` terug op `true`
- 627 invarianten groen, waaronder de opslag tegen een `:memory:`-database

## Bekende grenzen

- **De pin verschuift van waarde naar standaard.** `adzuna-scenarios.ts` pinde de gemeten
  zoekopdracht vast. Zodra hij bewerkbaar is, bewaakt die pin alleen nog de *standaard* —
  wat er werkelijk gedraaid wordt staat in de database. De feedback komt in de plaats
  daarvan uit de testknop vooraf en uit `sourceStatuses` plus de dekkingsindicator achteraf.
  Dat is zwakker dan een pin, en het is de prijs van bewerkbaarheid.
- **`/api/settings` wordt net als de andere routes niet geautoriseerd.** Dat staat al als
  bekende grens voor `/api/sync` en de PATCH-routes; dit voegt er een schrijfpad aan toe.

## Beslissingsgeschiedenis

- 2026-08-11: TC-EBC aangemaakt nadat één zoekwoord 61% van de opgehaalde ruis bleek te veroorzaken; scope = de termen bewerkbaar maken, niet de scoring
- 2026-08-11: vier kritische items beantwoord door Jeroen — alleen de zoektermen bewerkbaar (scoring blijft gepind), aparte pagina, chips, en een testknop vóór opslaan
