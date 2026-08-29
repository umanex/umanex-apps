# TC-EBC — Leads en prospects koppelen op ondernemingsnummer

- **Datum:** 2026-08-29
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Leg de brug tussen de twee tabbladen op het ondernemingsnummer in plaats van op
             een genormaliseerde bedrijfsnaam: toon bij een lead wat KBO over dat bedrijf
             weet, en markeer een prospect die al vacatures heeft.

CONTEXT:     De leadkant kent bedrijven alleen bij naam — Adzuna levert niets anders. Elke
             samenvoeging draaide daardoor op naamvergelijking, met "Volvo Group toont 3 op
             de kaart en 6 na de doorklik" als gevolg. De prospectkant heeft sinds vandaag
             wél het ondernemingsnummer. `lib/kbo/koppeling.ts` slaat de brug via een
             genormaliseerde naamindex in de spiegel.

ELEMENTS:    LeadCard krijgt een KBO-regel (officiële naam · gemeente · NACE-label ·
             ondernemingsnummer) · ProspectCard krijgt een badge "heeft vacatures" ·
             lib/kbo/koppeling.ts (naamindex + strenge opzoeking) · kbo-sync bouwt de index.

BEHAVIOUR:   Lezen. De koppeling gebeurt bij het renderen, niet bij de sync: 0,1 ms per
             opzoeking maakt opslaan onnodig, en wat niet opgeslagen wordt kan niet
             verouderen ten opzichte van de spiegel. Geen enkele bestaande waarde op de
             leadkaart wordt overschreven.

CONSTRAINTS: Liever geen koppeling dan een verkeerde: exact één actieve kandidaat, anders
             niets; regio breekt hoogstens een gelijkspel. Zonder spiegel verandert er niets
             aan de bestaande kaarten. Rollaag-only, geen nieuwe dependency.
```

---

## Wat de meting op de echte data zegt

Gedraaid over de 27 leads in `jobradar.db`, tegen extract 466:

| | |
|---|---|
| Gekoppeld | **12** (44%) |
| Meerdere kandidaten, dus bewust niets | **0** |
| Niet gevonden | **15** — `Cegeka`, `AXIANS`, `NTT DATA`, `Volvo Group`, `SQLI BELUX`, `Movu Robotics` … |
| Uniciteit van een genormaliseerde naam | 1.814.647 van 1.897.192 sleutels (**95,6%**) wijst naar precies één onderneming |
| Kosten | 0,1 ms per opzoeking |

**En één van de twaalf is aantoonbaar fout:** `Smile Group` koppelt aan een onderneming in
Sint-Lambrechts-Woluwe met NACE 86230 — een tandartspraktijk. De naam is uniek in KBO, dus de
strenge regel laat hem door. Uniek betekent niet juist.

Dat stuurt het ontwerp: de koppeling is een **vermoeden dat je moet kunnen nakijken**, geen
feit dat stil wordt ingevoegd. De kaart toont daarom de officiële naam, de gemeente en de
hoofdactiviteit náást het nummer — genoeg om een tandartspraktijk in één oogopslag te
herkennen — en overschrijft niets van wat er al stond. Niet-gevonden is met 56% bovendien het
normale geval, geen uitzondering, en mag dus geen lege plek of foutmelding opleveren.

## Aannames

- `[ASSUMPTION]` De naamindex leeft in `kbo.db` en niet in `jobradar.db`: het is afgeleide
  KBO-data en hij hoort met de spiegel mee weggegooid te worden. Herbouwen kost 10 seconden.
- `[ASSUMPTION]` Alleen benamingen van **actieve** ondernemingen komen in de index —
  vestigingen en stopgezette ondernemingen zijn geen koppeldoel. Dat scheelt een derde van de
  rijen (2.040.310 in plaats van ~3,1 miljoen).
- `[ASSUMPTION]` Sleutels korter dan vier tekens worden niet gekoppeld. Bij "AB" of "IT" is
  een gelijkspel de regel, niet de uitzondering.

## Acceptatie

- [x] A1 — bewijs: `kbo:sync` bouwt de index aan het eind van elke run. Getoetst op béide
      kanten: met een lege `naam_index` meldt de "al bij"-tak *"naamindex ontbreekt nog —
      alsnog opbouwen"* en levert 2.026.204 rijen; met een gevulde index zwijgt hij. Zonder
      die uitzondering zou een spiegel van vóór deze wijziging stil nooit koppelen.
- [x] A2 — bewijs: op de gerenderde Leads-tab dragen **12 van de 27** kaarten een KBO-regel —
      exact het aantal dat de opzoeking vindt. De andere vijftien zien er ongewijzigd uit.
- [x] A3 — bewijs: zoeken op "Introw" in het Prospects-tabblad geeft één kaart met de badge
      *"heeft vacatures"*, nummer `0798.161.431` — hetzelfde nummer dat de lead-koppeling
      oplevert. Op pagina 1 is de badge afwezig en dat klopt: die is op jongste oprichting
      gesorteerd, en de gekoppelde bedrijven zijn ouder.
- [x] A4 — bewijs: met `KBO_DB_PATH` naar een niet-bestaand pad renderen alle 27 leadkaarten
      zoals voorheen, zonder KBO-regel en met nul console- of pagina-fouten.
- [x] A5 — bewijs: invarianten tegen een synthetische index — twee kandidaten zonder regio
      geven `meerdere` (geen keuze), twee kandidaten in dezelfde regio óók, en regio breekt
      alleen een gelijkspel tussen verschillende regio's. Een stopgezette onderneming en een
      te korte naam koppelen niet.
- [x] A6 — bewijs: `✓ scenarios: 804 checks over 5 suite(s), en bewezen faalbaar`; de
      kbo-suite staat op 111. Herbouwen van de index is idempotent (zelfde aantal, tabel
      verdubbelt niet) — anders zou elke sync de kandidatenlijst laten groeien tot élke naam
      "meerdere" oplevert en de koppeling stil uitzet.
- [x] A7 — bewijs: volledige harness-run groen, beide tabbladen: `336 koppen h1 → h2 → h3`,
      `80 stops`, `prospects: 60 kaarten`, `62 koppen`, `73 stops`, console schoon.
- [x] A8 — bewijs: `type-check` en `lint` zonder output, `laag-discipline: 226 bestanden
      schoon`, `contrast: 96 combinaties boven AA`.

## Beslissingsgeschiedenis

- 2026-08-29: aangemaakt ná de meting, niet ervoor. De 44% dekking en de foute twaalfde match
  bepalen dat dit een zichtbaar vermoeden wordt in plaats van een stille samenvoeging.
- 2026-08-29: `koppelSleutel` haalt nu eerst de punten weg. `normaliseerBedrijf` strijkt
  `\bnv\b` weg, maar "N.V." heeft geen woordgrens tussen n en v en bleef als "n v" staan.
  Bewust nét buiten `normaliseerBedrijf` gehouden: die voedt de dedupe-hash van bestaande
  rijen. De dekking bleef daarna 12 van 27 — de fix haalt geen extra treffer binnen op déze
  27 namen, maar sluit wel een vorm uit die stil nooit matchte.
- 2026-08-29: de eerste indexbouw hing na tien minuten zonder één gecommitte rij — lezen met
  een `iterate()` op een tweede verbinding botst met de schrijfsloten. Met één verbinding en
  bladeren op `rowid` duurt hij 10 seconden.
