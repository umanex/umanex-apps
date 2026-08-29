# TC-EBC — KBO-prospects als eigen tabblad

- **Datum:** 2026-08-29
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Een derde tabblad "Prospects" dat de KBO-spiegel ontsluit: software-
             ondernemingen in WVL/OVL/BRU die (nog) geen vacature open hebben, met per
             kaart de NACE-subcode en de leeftijd van de onderneming.

CONTEXT:     De KBO-ingest staat sinds 2026-08-29 op main (`.data/kbo.db`, extract 466).
             `lib/sources/kbo.ts` hangt bewust nog niet aan LEAD_SOURCES: een prospect is
             geen lead. Een lead is "dit bedrijf zoekt developers en heeft geen designer" —
             een bewering mét bewijs uit de vacaturedata. Een prospect is "het juiste soort
             bedrijf in het juiste gebied", zonder gebeurtenis. Die twee op één score-as
             zetten laat 13.993 nullen naast 27 echte leads landen; vandaar een eigen as en
             een eigen tabblad.

ELEMENTS:    TabsList krijgt een derde TabsTrigger met teller · ProspectCard (nieuw,
             components/) met bedrijfsnaam, NACE-subcode + omschrijving, leeftijd,
             gemeente/regio, en de website als KBO er een heeft · FilterBar werkt ook op dit
             tabblad · EmptyState · lib/sources/kbo.ts leest de spiegel · lib/kbo/universum.ts
             (nieuw) draagt de selectie als één verklaring.

BEHAVIOUR:   Lezen en filteren, geen bewerken in ronde één. Filters uit de FilterBar die
             hier betekenis hebben: regio en zoektekst. "Min. score" heeft dat niet — de
             prospect-as is geen score maar een set kenmerken. Toetsenbord en focus volgen
             de gedeelde `focusRing`; de kopstructuur h1 → h2 (sr-only, per paneel) → h3
             (kaarttitel) zoals de andere twee tabbladen sinds 2026-08-27.

CONSTRAINTS: Rollaag-only (tokens guard + contrast blijven groen). De selectie is
             13.993 rijen: die gaan niet als één lijst naar de client. Geen nieuwe
             dependency. De spiegel is optioneel — ontbreekt `.data/kbo.db`, dan is dat een
             lege staat mét uitleg, geen crash en geen stille nul. Desktop-web.
```

---

## Beantwoord (2026-08-29)

1. **States** — drie verschillende "leeg" met elk hun eigen tekst: *(a)* geen spiegel op
   schijf → verwijst naar `kbo:sync --full`; *(b)* spiegel ouder dan 7 dagen → verwijst naar
   `kbo:sync`; *(c)* filters zonder treffers. (a) en (b) komen als regel **boven** de lijst,
   niet in plaats van de lijst — een verouderde spiegel is geen lege spiegel.
2. **Interactie** — de **volledige statusset**, zoals bij leads: `new`/`saved`/`dismissed`/
   `contacted`, met dezelfde `StatusDropdown`. Statussen leven in `jobradar.db`, nooit in de
   wegwerpbare `kbo.db`.
3. **Schaal** — **serverpaginering, 60 per pagina**, gesorteerd op jongste oprichtingsdatum.
   Geen virtualisatie, dus geen dependency en geen scrollgedrag dat nergens anders bestaat.
4. **RSZ-zeef** — activiteitengroep `006` bestaat alleen bij werkgevers. Filter **standaard
   aan**, zichtbaar en uitzetbaar.
5. **NACE-set** — `62100`, `62200`, `62900` plus `58290`, `63910`, `58210`.

**Gemeten universum met die keuzes:** 14.613 ondernemingen (de unie, niet de optelsom — 97
bedrijven dragen zowel een 62xxx als een van de drie extra codes als hoofdactiviteit). Met de
RSZ-zeef aan, waar het tabblad op opent: **2.903**.

## Aannames

- `[ASSUMPTION]` "Leeftijd" = het aantal jaren sinds `enterprise.StartDate`, getoond als
  jaartal + duur ("2019 · 6 jaar"). De verdeling in het universum: 14,9% jonger dan 2 jaar,
  25,2% 2–5, 37,7% 5–15, 22,2% ouder.
- `[ASSUMPTION]` "Subcode" = de vier- of vijfcijferige NACE-2025-hoofdactiviteit mét de
  Nederlandse omschrijving uit `code.csv`, niet de kale code. 12.235 van de 13.993 hebben er
  precies één; 1.758 hebben er twee of drie en tonen ze allemaal.
- `[ASSUMPTION]` De prospect-lijst is read-only ten opzichte van de KBO-spiegel: statussen en
  andere app-state komen in `jobradar.db`, nooit in `kbo.db`. Die laatste is wegwerpbaar en
  wordt bij elke `--full` overschreven.
- `[ASSUMPTION]` Een website tonen we alleen als KBO er een heeft. Dat is 6,0% van het
  universum (842 van 13.993) — genoeg om te tonen, te weinig om op te leunen.

## Acceptatie

- [x] A1 — bewijs: derde tabblad "Prospects" met teller; de harness klikt hem aan en krijgt
      `HTTP 200, 2903 in totaal, spiegel ok`.
- [x] A2 — bewijs: gerenderde kaart 2 toont *"3OPS Software · IT-consultancy en beheer ·
      Programmatuur ontwerpen · 2026 · 0 jaar · 1038.898.308 · 9620 Zottegem"* plus de
      statuskeuze. De websitelink verschijnt alleen bij een `WEB`-contact — 6,0% van het
      universum, dus op deze drie kaarten terecht afwezig.
- [x] A3 — bewijs: `lib/kbo/universum.ts` draagt codes, versie, RSZ-groep, zetel-type en
      paginagrootte als constanten; de route en het component importeren ze en herhalen niets.
- [x] A4 — bewijs: alle drie de toestanden uitgereden. *(a)* `KBO_DB_PATH` naar een
      niet-bestaand pad → `spiegel ontbreekt` + *"lege staat legt uit wat er moet gebeuren"*;
      *(b)* een mini-spiegel met `SnapshotDate` 01-07-2026 → *"De spiegel is van 2026-07-01 —
      59 dagen oud"* (en dat de datum klopt, bewijst meteen de DD-MM-YYYY → ISO-conversie);
      *(c)* filters zonder treffers → *"Geen prospects binnen je huidige filters"*, ónder de
      melding en niet in plaats ervan.
- [x] A5 — bewijs: de volledige harness-run zónder spiegel is groen — routes, kopstructuur,
      toetsenbord, console schoon. Geen crash, geen stille nul.
- [x] A6 — bewijs: `prospects kopstructuur: 62 koppen, niveaus h1 → h2 → h3` en
      `prospects toetsenbord: 73 stops, elk met zichtbare focus`. Onderweg gerepareerd: de
      tab-walk begon na het aangeklikte tabblad in plaats van bovenaan het document en zag
      dus de paginachrome niet. Met `document.body.focus()` als vertrekpunt ging de telling
      van 64 naar 73, terwijl `/` en `/instellingen` op 80 en 16 bleven — de negatieve
      controle die laat zien dat de fix alleen verzet wat hij hoort te verzetten.
- [x] A7 — bewijs: `60 kaarten in de DOM (grens 60)` bij 2.903 treffers; de harness faalt
      boven de 60.
- [x] A8 — bewijs: `✓ scenarios: 783 checks over 5 suite(s), en bewezen faalbaar`. De
      scherpste nieuwe invariant telt de `?` in de SQL tegen het aantal parameters, over zes
      filtercombinaties × lijst en telling — precies de fout die ontstond toen de NACE-codes
      een tweede keer in de SELECT-lijst kwamen te staan.
- [x] A9 — bewijs: `type-check` en `lint` zonder output, `laag-discipline: 225 bestanden
      schoon`, `contrast: 96 combinaties boven AA`.
- [x] A10 — bewijs: via de API gemeten — standaard `totaal 2.903`, met `werkgevers=0`
      `totaal 14.613`.
- [x] A11 — bewijs: `PATCH /api/prospects/1039606705 {"status":"saved"}` → een verse `GET`
      geeft `saved` terug; een onzinstatus en een te kort nummer geven allebei `HTTP 400`; de
      mtime van `.data/kbo.db` is ongewijzigd. Testrij daarna weer verwijderd.

## Beslissingsgeschiedenis

- 2026-08-29: aangemaakt. Eigen tabblad in plaats van een filter binnen Leads (keuze van
  Jeroen), met subcode en leeftijd op de kaart. NACE-set `62100/62200/62900`.
- 2026-08-29: de vier open vragen beantwoord — volle statusset, serverpaginering op 60,
  RSZ-zeef standaard aan, en de NACE-set uitgebreid met 58290/63910/58210. Het universum in
  de eerdere keuzevraag stond op 14.710; dat was een optelsom van twee metingen en niet zelf
  gemeten. De unie is 14.613.
- 2026-08-29: gebouwd en gevalideerd. `StatusDropdown` kreeg onderweg een `endpoint`-prop in
  plaats van `itemId` + `type`: de padopbouw zat in het component en brak bij de derde soort,
  want een prospect heeft geen numerieke id maar een ondernemingsnummer.
- 2026-08-29 (later): `lib/sources/kbo.ts` is verwijderd. De ELEMENTS-regel hierboven noemt hem
  nog als lezer van de spiegel; dat is hij nooit geworden — `lib/kbo/spiegel.ts` doet dat, en
  de stub bleef als dode code achter tot deze opruiming. De regel blijft staan als vastlegging
  van wat er gepland was, niet van wat er staat.

