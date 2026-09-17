# TC-EBC — fouten en toegankelijkheid

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd (2026-09-17)

---

```
TASK:        Laat elke bediening in jobradar een naam dragen en met het toetsenbord en een schermlezer
             bereikbaar zijn, en laat geen enkele fout, laadtoestand of lege toestand stil blijven.
CONTEXT:     jobradar `/`, `/instellingen`, `/plan`. Critique 2026-09-17 issue 3 (P2) en persona's Sam
             en Riley; plan delightful-stirring-blossom, fase 3. Fase 1 en 2 losten de statusfout en
             het statusfilter al op; wat blijft: scoreopbouw, kaartmarkers, ContactPanel, foutpagina,
             laadtoestanden, sync-voortgang, prospects-fout.
ELEMENTS:    JobCard/LeadCard — scoreopbouw via een focusbare trigger · ProspectMap — markers bereikbaar
             voor een schermlezer, hit-area ≥ 24 px · ContactPanel — melding bij een netwerkfout en een
             bevestiging na Vastleggen · app/error.tsx — menselijke zin, weg naar huis, ruwe melding
             ingeklapt · loading.tsx voor `/` en `/instellingen` · DashboardClient — prospects-fout met
             Opnieuw proberen · SyncButton — verstreken tijd tijdens de sync, "+N vacatures" als weg naar
             wat nieuw is · flow-harness — as "toegankelijke naam" met selftest · FilterBar — vinkje
             "Alleen nieuw bij de laatste sync" (Vacatures, Leads) · statusoptie "Nieuw" heet "Niet
             beoordeeld" · ActieRij — Wijzig opent met de actuele volgende stap.
BEHAVIOUR:   Tab bereikt elke bediening; elke bediening heeft een berekende naam · de scoreopbouw opent
             met focus zoals met hover · een netwerkfout in het paneel toont een alert, een geslaagde
             vastlegging wordt aangekondigd · de foutpagina biedt Opnieuw proberen én een link naar `/` ·
             een laadtoestand verschijnt tijdens server-rendering · een mislukte prospects-lading biedt
             Opnieuw proberen · het vinkje toont precies de items met de badge "nieuw" (zelfde
             voorwaarde, één functie), staat in de URL, en "+N vacatures/leads" zet het aan op het
             juiste tabblad · leeg door dat vinkje noemt het vinkje als oorzaak.
CONSTRAINTS: Alleen @umanex/ui en rol-utilities · geen nieuwe primitive (Skeleton komt uit de
             bibliotheekbatches, fase 5) · geen debug-hooks in productcode om fouten te forceren · de
             harness draait op de echte database: forceren gebeurt door onderschepping met positieve
             controle · de Slider-naam wacht op fase 4a (`packages/ui`) · mobiel blijft buiten scope.
```

---

## Open vragen

_(geen — het plan is goedgekeurd; de acceptatielijst wordt aangevuld uit de inventaris-workflow)_

## Aannames

- [ASSUMPTION: de naamloze slider-thumb blijft open tot fase 4a; hij wordt hier gemeten en als bekende
  uitzondering benoemd, niet stil weggefilterd.]
- ~~[ASSUMPTION: "+N vacatures" na een sync wordt een link naar `/?status=new` — het filter dat al bestaat —
  en geen nieuwe weergave.]~~ Weerlegd 2026-09-17: status `new` is "nog niet beoordeeld", niet "binnengekomen";
  zie Beslissingsgeschiedenis.
- [ASSUMPTION: "+N" zet naast het vinkje ook status terug op Open en wist de zoekterm (beide kunnen de nieuwe
  items verbergen); regio's en minimumscore blijven staan — die kiest de gebruiker bewust, en de lege toestand
  en de telling noemen ze.]
- [ASSUMPTION: met maar één sync in de database is alles "nieuw" (de vorige sync bestaat niet); dat is ook
  vandaag de betekenis van de badge, dus het vinkje volgt die.]
- [ASSUMPTION: het vinkje hoort niet bij Prospects — prospects komen uit de KBO-spiegel, niet uit een sync.]

## Acceptatie

Bron: de inventaris-workflow van 2026-09-17 (4 assen, 208 bestandslezingen samen — met overlap, geen unieke bestanden — 136 bevestigd, 1 weerlegd) en de
verificatie van de criticus (4 aanvullingen, elk door twee lenzen bevestigd). Na ontdubbelen: 1 × P1 (deeplink,
al gefixt), 31 × P1/P2 in 43 clusters. De clustersleutel (cNN) staat in elk item; één item, één meting.

**Al gebouwd in deze fase**
- [x] c00: navigatie van `/plan` naar `/?tab=leads&zoek=X` landt op Leads met X in het zoekveld en de query in de URL — bewijs: flow-harness vóór de fix `{"tab":"Vacatures","zoek":"","url":""}`, na de fix "landt op Leads met \"Atcon Global\" (?tab=leads&zoek=Atcon+Global)"; commit 6096d09

**Instrument**
- [x] N1: de flow-harness meet per route het aantal bedienbare elementen zonder berekende naam in de toegankelijkheidsboom van de browser, met noemer — bewijs: flow run 1 en 2: "/ namen: 114 bedienbare elementen, elk met een naam (+ 1 bekende uitzondering…)", "/instellingen namen: 25 …", "/plan namen: 44 …" (CDP getFullAXTree)
- [x] N2: die telling is 0, op één benoemde uitzondering na: de slider-thumb van Min. score (fase 4a) — bewijs: flow run 1 en 2: 0 naamloos op /, /instellingen en /plan buiten de slider-thumb; de uitzondering telt zelf tweezijdig (moet precies 1 zijn, anders fail)
- [x] N3: `flow --selftest` spuit een naamloos bedieningselement in en de naam-as valt om — bewijs: flow --selftest: "✗ ZELFTEST namen: 1 naamloos (combobox select)" en "✓ zelftest: alle 6 assen falen wanneer ze horen te falen"

**G1 — dashboard, foutpagina, routes**
- [x] c01: na Sync nu (onderschept met een extra vacature) staat de nieuwe vacature in de lijst zonder herladen — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c01: na Sync nu (onderschept) staat de nieuwe vacature job-940 in de lijst zonder herladen (25 → 26 kaarten)"; tegenproef rood (dash-t1): "c01: na Sync nu staat "Harness c01 nieuwe vacature 1789655169359" (id 940) 0× in de lijst (25 → 25 kaarten), z"
- [x] c02a: de foutpagina toont een menselijke zin in plaats van alleen `error.message` — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c02a: de foutpagina toont "Deze pagina kon niet geladen worden. Probeer het opnieuw, of ga terug naar het dashboard."; de ruwe melding ("An error occu"; tegenproef rood (server-tp1): "c02a: de ruwe melding staat zichtbaar in beeld (1×, details open=false): "An error occurred in the Server Comp"
- [x] c02b: de foutpagina heeft een link naar `/` — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c02b: op / leidt "Terug naar het dashboard" (/) met een documentnavigatie naar /"; tegenproef rood (server-tp1): "c02b: op / gaf "Terug naar het dashboard" geen documentnavigatie (documentverzoek nee, pagina dezelfde, nu op "
- [x] c02c: Opnieuw proberen op de foutpagina doet de server-render opnieuw (`router.refresh`), niet alleen `reset()` — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c02c: Opnieuw proberen stuurt 1 RSC-verzoek(en) naar de server (fout blijft zolang de database kapot is: ja)"; tegenproef rood (server-tp1): "c02c: Opnieuw proberen stuurde geen RSC-verzoek — alleen reset(), de server rendert niet opnieuw"
- [x] c03: `/`, `/plan`, `/instellingen` en de 404 hebben elk een eigen `<title>` — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c03: / heeft een eigen titel "Dashboard — JobRadar" (1 <title>, ≠ layout "JobRadar — umanex")"; tegenproef rood (server-tp1): "c03: /plan draagt de layouttitel "JobRadar — umanex", geen eigen titel"
- [x] c04: een KBO-spiegel die niet opent, geeft een dashboard zonder koppelingen in plaats van de foutpagina — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c04: een kapotte KBO-spiegel geeft het dashboard met 27 leads, geen foutpagina"; tegenproef rood (server-tp1): "c04: een kapotte KBO-spiegel geeft de foutpagina (0 leads)"
- [x] c05: een filterwijziging op Vacatures en Leads zet het nieuwe aantal in een live-regio — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c05: filterwissel op Vacatures → live-regio "6 vacatures vanaf score 10, 128 lager" (25 → 6 kaarten; bij laden "")"; tegenproef rood (dash-t1): "c05: na Brussel uitvinken op Vacatures staat "" in de live-regio, verwacht "6 vacatures vanaf score 10, 128 la"
- [x] c05b: terug naar een tabblad na een eerdere filterwissel kondigt geen oude telling opnieuw aan — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c05b: na Vacatures → Leads → Vacatures schrijft de live-regio niets (1 mutatie(s), alle leeg; oude telling "6 vacatures vanaf score 10, 128 lager")"; tegenproef rood (dash-t1): "c05b: na een filterwissel kwam er geen telling in de live-regio — dit meet niets"
- [x] c05c: na een sync met nieuwe items staat er geen verouderd getal in de telling-regio — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c05c: na de sync (25 → 26 kaarten) staat er geen verouderd getal in de telling-regio ("", vóór: "25 vacatures vanaf score 10, 309 lager")"; tegenproef rood (dash-t1): "c05c: vóór de sync stond er geen telling in de live-regio — dit meet niets"
- [x] c06a: Vacatures leeg door filters noemt de filters als oorzaak, niet "Druk op Sync nu" — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c06a: vacatures leeg door minimumscore 100 (334 in de database) noemt de filters: "Vacatures Geen vacatures binnen je huidige filters — pas regio, sta"; tegenproef rood (dash-t2): "c06a: vacatures leeg door minimumscore 100 (334 in de database) toont "Vacatures Geen vacatures gevonden. Druk"
- [x] c06b: Leads leeg door filters noemt de filters als oorzaak — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c06b: leads leeg door minimumscore 100 (27 in de database) noemt de filters: "Leads Geen leads binnen je huidige filters — pas regio, status of minimu"; tegenproef rood (dash-t2): "c06b: leads leeg door minimumscore 100 (27 in de database) toont "Leads Geen leads gevonden. Druk op 'Sync nu'"
- [x] c07a: een mislukte eerste prospects-lading toont geen blijvend "Bezig…" — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c07a: na een mislukte eerste lading geen "Bezig…" — teller "—", tab "Prospects —", alert met de fout (gemeten na 1,5 en 3,5 s)"; tegenproef rood (dash-t2): "c07a: na een mislukte eerste lading staat er "Bezig…" (teller "Bezig…", tab "Prospects —", na 1,5 s true en na"
- [x] c07b: een mislukte prospects-lading biedt Opnieuw proberen — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c07b: "Opnieuw proberen" met Enter laadt opnieuw — fout weg, teller "2939 prospects", 60 kaarten, focus niet op body"; tegenproef rood (dash-t1): "c07b: Opnieuw proberen (Enter) haalde /api/prospects niet opnieuw op"
- [x] c08: de kaart/lijst-toggle heeft in beide standen dezelfde naam; `aria-pressed` wisselt — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c08: de toggle heet in beide standen "Kaartweergave" (button); aria-pressed false → true"; tegenproef rood (dash-t1): "c08: de prospects zijn niet geladen (zie c07b) — dit meet niets"
- [x] c08b: de ingedrukte stand van die toggle verschilt minstens 3:1 van de niet-ingedrukte (light) — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c08b: light: ingedrukt rgb(36,99,235) tegen niet-ingedrukt rgb(255,255,255) = 5.17:1"; tegenproef rood (dash-t1): "c08b: de prospects zijn niet geladen (zie c07b) — dit meet niets"
- [x] c08c: idem in dark — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c08c: dark: ingedrukt rgb(68,122,238) tegen niet-ingedrukt rgb(12,17,29) = 4.73:1"; tegenproef rood (dash-t1): "c08c: de prospects zijn niet geladen (zie c07b) — dit meet niets"
- [x] c09: na Volgende met het toetsenbord staat de focus niet op `body` — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c09: Enter op Volgende ("pagina 1 van 49" → "pagina 2 van 49"): focus tijdens en na de lading op <button> "Volgende""; tegenproef rood (dash-t1): "c09: de prospects zijn niet geladen (zie c07b) — paginering niet gemeten, dit meet niets"
- [x] c10a: de scoreopbouw op een vacature- en leadkaart opent met de toetsenbordfocus — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c10a: jobkaart 210: Tab zet de focus op de scorepil en de opbouw staat open ("ux +20 ui +15 frontend +10 ux +20 ui +15 frontend +10", 3 onderdelen uit"; tegenproef rood (dash-t2): "c10a: Tab vanaf het tabpaneel landt niet op de scorepil van jobkaart 210 maar op <a> "Bekijk Stagiaire Web-Fro"
- [x] c10b: de trigger van de scoreopbouw heeft een naam die de score noemt — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c10b: 25 van 25 opbouw-triggers (25 jobkaarten, 25 met een opbouw in de database) heten "Score <score>, opbouw tonen" (bv. "Score 45, opbouw tonen")"; tegenproef rood (dash-t1): "c10b: 25 van 25 triggers op jobkaarten hebben een naam zonder de score (button "Score, opbouw tonen" bij getoo"
- [x] c10c: Enter op de trigger laat de scoreopbouw open — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c10c: Enter op de scorepil van jobkaart 210 laat de opbouw open (data-state "instant-open")"; tegenproef rood (dash-t1): "c10c: na Enter op de scorepil van jobkaart 210: focus blijft, opbouw {"state":"closed","tip":null,"zichtbaar":"
- [x] c10d: een muisklik op de trigger tekent geen focusring — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c10d: muisklik → focus zonder zichtbare ring; toetsenbordfocus → ring (outline solid 2px rgba(0, 0, 0, 0); shadow rgb(255, 255, 255) 0px 0px 0px 2px, "; tegenproef rood (dash-t1): "c10d: na een muisklik tekent de scorepil een focusring (outline solid 2px rgba(0, 0, 0, 0); shadow rgb(255, 25"
- [x] c11a: elke Bekijk-link op een vacaturekaart heeft een unieke naam — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c11a: 25 Bekijk-links op 25 vacaturekaarten, 25 unieke namen (bv. "Bekijk Stagiaire Web-Front, UX/UI Design, Graphics Branding (opent in een nieuw tab"; tegenproef rood (dash-t1): "c11a: 1 unieke namen op 25 Bekijk-links (dubbel: "Bekijk (opent in een nieuw tabblad)")"
- [x] c11b: die naam meldt dat de link in een nieuw tabblad opent — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c11b: 25 van 25 Bekijk-links melden het nieuwe tabblad in hun naam"; tegenproef rood (dash-t2): "c11b: 25 van 25 Bekijk-links melden het nieuwe tabblad niet (bv. "Bekijk Stagiaire Web-Front, UX/UI Design, Gr"
- [x] c12: elke doorklikknop op een leadkaart heeft een unieke naam — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c12: 27 doorklikknoppen op 27 leadkaarten, 27 unieke namen (bv. "toon deze vacatures van Médiane Benelux")"; tegenproef rood (dash-t1): "c12: 1 unieke namen op 27 doorklikknoppen (dubbel: "toon deze vacatures")"
- [x] c13a: na Sync nu met het toetsenbord staat de focus niet op `body` tijdens de sync — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c13a: tijdens de sync blijft de focus op de knop (niet op body)"; tegenproef rood (server-tp1): "c13a: tijdens de sync staat de focus op body, niet op de knop"
- [x] c13b: tijdens de sync staat de verstreken tijd in beeld — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c13b: de verstreken tijd staat in beeld en loopt op (1 s → 2 s)"; tegenproef rood (server-tp1): "c13b: de verstreken tijd loopt niet op: 0 s na ±1,4 s, 0 s na ±2,5 s"
- [x] c13c: het resultaat van een geslaagde sync staat in een live-regio — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c13c: het resultaat staat in een live-regio (polite): "Sync klaar: 2 vacatures en 1 lead erbij""; tegenproef rood (server-tp1): "c13c: het resultaat (2 vacatures, 0 leads) staat in geen live-regio die er vóór de sync al stond ([])"
- [x] c13d: "+N vacatures" na een sync vinkt "Alleen nieuw bij de laatste sync" aan en opent Vacatures — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c13d: /^\+2 vacatures/ zet "Alleen nieuw bij de laatste sync" aan en opent Vacatures (status alle → open, {"nieuw":"1"})"; tegenproef rood (nA): "c13d: na /^\+2 vacatures/ {"status":"open","vinkje":"false","tab":"Vacatures25","url":{}}, verwacht vinkje aan"
- [x] c13e: "+N leads" na een sync vinkt hetzelfde aan en opent Leads — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c13e: /^\+1 lead/ zet "Alleen nieuw bij de laatste sync" aan en opent Leads (status alle → open, {"tab":"leads","nieuw":"1"})"; tegenproef rood (nA): "c13e: na /^\+1 lead/ {"status":"open","vinkje":"false","tab":"Leads27","url":{"tab":"leads"}}, verwacht vinkje"
- [x] c14a: `/` heeft een loading.tsx — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c14a: tijdens het renderen van / staat de laadtoestand in beeld ("Dashboard laden…", kop "JobRadar", live-regio "Dashboard laden…")"; tegenproef rood (server-tp1): "c14a: 700 ms na de klik naar / geen laadtoestand van die route: {"h1":"","laden":null,"live":"Dashboard laden…"
- [x] c14b: `/instellingen` heeft een loading.tsx — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c14b: tijdens het renderen van /instellingen staat de laadtoestand in beeld ("Instellingen laden…", kop "Instellingen", live-regio "Instellingen laden"; tegenproef rood (server-tp1): "c14b: 700 ms na de klik naar /instellingen geen laadtoestand van die route: {"h1":"","laden":null,"live":"Inst"

**G2 — kaart**
- [x] c15: markers staan als knoppen met naam in de toegankelijkheidsboom (de svg is geen `img` meer) — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c15: 58 van 58 markers staan als knop met naam in de toegankelijkheidsboom, bereikbaar vanaf de wortel, zonder voorouder met presentationele kinderen "; tegenproef rood (kaart-tp2): "c15: 0 van 74 markers staan als knop met naam in de toegankelijkheidsboom (svg-rol image; bv. 0679872406: onde"
- [x] c16: een marker met toetsenbordfocus toont een zichtbare indicator (gemeten in pixels, niet in CSS-waarden) — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c16: een marker met toetsenbordfocus verandert 214 px binnen zijn klikdoel (31×31 px) en 0 erbuiten; ruis 0 px; na Shift+Tab 0 px verschil"; tegenproef rood (kaart-tp1): "c16: een marker met toetsenbordfocus verandert 0 px binnen zijn klikdoel (30×30 px), verwacht ≥ 40 — geen zich"
- [x] c17: de naam van een marker noemt de status van het bedrijf — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c17: 58 markernamen noemen de status (30 los, 28 clusters); samen nieuw 215, bewaard 0, gecontacteerd 0, afgewezen 0 = /api/kaart"; tegenproef rood (kaart-tp2): "c17: 74 van 74 markernamen noemen de status niet — 38 van 38 los, 36 van 36 clusters ("CONICS" noemt "nieuw" n"
- [x] c18: na het kiezen van een marker bereikt het toetsenbord het paneel met de keuze zonder langs alle andere markers te tabben — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c18: van de gekozen marker tot het paneel 1 Tab-stop(s), 0 markers onderweg (57 van 58 markers staan er in DOM-volgorde na; eerste stop button(Bewaar "; tegenproef rood (kaart-tp1): "c18: van de gekozen marker tot het paneel 58 Tab-stops, waarvan 57 markers (58 markers op de kaart)"
- [x] c19: een kaartfout verdwijnt na een geslaagde lading — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c19: de kaartfout verdwijnt na Opnieuw proberen en een geslaagde lading (HTTP 200): 0 foutblokken, kaart terug"; tegenproef rood (kaart-tp1): "c19: na Opnieuw proberen en een geslaagde lading (HTTP 200) staat de kaartfout er nog ("harness-kaartfout", 1 "
- [x] c20: elke marker heeft een klikdoel van minstens 24 × 24 px — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c20: bij 1280 px 58 van 58 klikdoelen ≥ 24 × 24 px (kleinste 24.01995849609375 × 24.01995849609375; svg 910 px)"; tegenproef rood (kaart-tp1): "c20: bij 1280 px 58 van 58 klikdoelen kleiner dan 24 × 24 px (kleinste 23.96697998046875 × 23.9669189453125; b"

**G3 — opvolgingspaneel**
- [x] c21: een gegooide fetch in Vastleggen, Verwijderen en Bewaren actie toont een melding (elk van de drie gemeten) — bewijs: 8× ✓ in flow/plan:probe run 1 én 2, o.a. "c21 Vastleggen: een gegooide fetch toont een alert ("Niet vastgelegd — geen antwoord van de server. Wat je invuld")"; tegenproef rood (opvolging-tp-a): "c21 Vastleggen: 0 alert(s) "Niet vastgelegd…" na een gegooide fetch, verwacht 1"
- [x] c22a: een geslaagd Vastleggen wordt aangekondigd — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c22a: een geslaagd Vastleggen staat in een live-regio die er vóór de klik al was ("Contactmoment van 2026-09-17 vastgelegd — 0 contactmomenten.")"; tegenproef rood (opvolging-tp-a): "c22a: na een geslaagd Vastleggen staat "Contactmoment van … vastgelegd" in geen enkele live-regio"
- [x] c22b: een geslaagd Bewaren van de volgende actie wordt aangekondigd — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c22b: een geslaagd Bewaren staat in een live-regio die er vóór de klik al was ("Volgende actie bewaard voor 2026-12-01: harness c22b.")"; tegenproef rood (opvolging-tp-a): "c22b: na een geslaagd Bewaren staat "Volgende actie bewaard voor …" in geen enkele live-regio"
- [x] c23: een mislukte historiek-lading toont een fout, geen "0 contactmomenten" — bewijs: 6× ✓ in flow/plan:probe run 1 én 2, o.a. "c23 (500): een mislukte historiek-lading toont een alert ("Historiek niet geladen: harness-historiek.")"; tegenproef rood (opvolging-tp-a): "c23 (500): 0 alert(s) "Historiek niet geladen" na een mislukte lading, verwacht 1"
- [x] c24: na Vastleggen met het toetsenbord staat de focus niet op `body` — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c24: tijdens Vastleggen (toetsenbord) staat de focus op <button> "Vastleggen", niet op body"; tegenproef rood (opvolging-tp-b): "c24: tijdens Vastleggen (toetsenbord) staat de focus op de dialoogcontainer"
- [x] c25: na het sluiten van het opvolgingspaneel staat de focus op de Opvolging-knop die het opende — bewijs: 6× ✓ in flow/plan:probe run 1 én 2, o.a. "c25 Escape: na sluiten staat de focus op de Opvolging-knop die het paneel opende"; tegenproef rood (opvolging-tp-a): "c25 Escape: na sluiten staat de focus op body, niet op de Opvolging-knop die opende"
- [x] c25b: verdwijnt de kaart uit de lijst (filter Nieuw, Vastleggen), dan staat de focus na sluiten op de kaart die nu op die plek staat of op het tabpaneel, niet op `body` — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c25b Escape: de kaart verdween; de focus staat op Opvolging van de kaart die nu op die plek staat (lead-21)"; tegenproef rood (opvolging-tp-b): "c25b Escape: de kaart verdween en na sluiten staat de focus op body"
- [x] c26: Escape, overlay-klik en het sluitkruis met onbewaarde invoer vragen eerst bevestiging — bewijs: 7× ✓ in flow/plan:probe run 1 én 2, o.a. "c26 Escape: met onbewaarde invoer blijft het paneel open en vraagt het "Onbewaarde wijzigingen weggooien?""; tegenproef rood (opvolging-tp-b): "c26 Escape: met onbewaarde invoer sloot het paneel zonder te vragen"
- [x] c26b: na een geslaagd Vastleggen blijft het gekozen kanaal staan — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c26b: na een geslaagd Vastleggen blijft het gekozen kanaal (LinkedIn) staan"; tegenproef rood (opvolging-tp-a): "c26b: na een geslaagd Vastleggen staat het kanaal op "mail", gekozen was "linkedin""
- [x] c27: een fout in het opvolgingspaneel staat in beeld — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c27 actie: de fout staat in beeld (alert y 358–396 binnen paneel 0–420)"; tegenproef rood (opvolging-tp-a): "c27 actie: de fout staat buiten beeld (alert y 428–466, paneel 0–420)"

**G4 — plan**
- [x] c28: na Herstel de standaard toont het Aannames-veld de standaardtekst — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c28: na Herstel toont het veld de standaardtekst (748 tekens, standaard 748, eigen regel niet meer aanwezig) true"; tegenproef rood (plan-tp-T4): "c28: na Herstel toont het veld de standaardtekst (774 tekens, standaard 748, eigen regel nog aanwezig) verwach"
- [x] c28b: na Herstel en na Opslaan in Aannames staat de focus niet op `body` — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c28b: tijdens Opslaan staat de focus niet op body (button "Opslaan") false"; tegenproef rood (plan-tp-T4): "c28b: tijdens Opslaan staat de focus niet op body (body) verwacht false, kreeg true"
- [x] c29: pijltoetsen door het status-select van het actiepaneel versturen geen PATCH — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c29: pijltoetsen/letters door het status-select: 0 PATCH-verzoeken 0"; tegenproef rood (plan-tp-T1): "c29: positieve controle: het toetsenbord verzette de select (bezig) verwacht true, kreeg false"
- [x] c30: Bewaar en een statuswissel in het actiepaneel worden aangekondigd — bewijs: 5× ✓ in flow/plan:probe run 1 én 2, o.a. "c30: die regio staat er vóór een handeling, met aria-live="polite" {"live":"polite","tekst":""}"; tegenproef rood (plan-tp-T1): "c30: Bewaar wordt aangekondigd ("") verwacht true, kreeg false"
- [x] c30b: een statuswissel vanaf gereed kondigt de nieuwe status aan, niet alleen "heropend" — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c30b: Heropen kondigt de nieuwe status aan ("A01 heropend, staat nu op niet gestart.") true"; tegenproef rood (plan-tp-T1): "c30b: Heropen kondigt de nieuwe status aan ("A01 heropend.") verwacht true, kreeg false"
- [x] c30c: tijdens Bewaar, Heropen en Zet op staat de focus niet op `body` — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c30c: tijdens Bewaar staat de focus niet op body (button "Bezig…") false"; tegenproef rood (plan-tp-T1): "c30c: tijdens Zet op staat de focus niet op body (body) verwacht false, kreeg true"
- [x] c31: Bewaar van de volgende stap in een actierij sluit het veld pas na een geslaagd antwoord — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c31: een geweigerde Bewaar laat het veld open met de getypte tekst {"veld":1,"tekst":"ui-probe: c31 eerste stap"}"; tegenproef rood (plan-tp-T1): "c31: een geweigerde Bewaar laat het veld open met de getypte tekst verwacht {"veld":1,"tekst":"ui-probe: c31 e"
- [x] c31b: een versieconflict op die volgende stap biedt Herlaad plan bij de rij, en de getypte tekst blijft staan — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c31b: het versieconflict biedt Herlaad plan bij de rij 1"; tegenproef rood (plan-tp-T1): "c31b: het versieconflict biedt Herlaad plan bij de rij verwacht 1, kreeg 0"
- [x] c32: Bewaar in het beslissingspaneel wordt aangekondigd — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c32: de meldingsregio staat er vóór Bewaar, met aria-live="polite" {"n":1,"live":"polite","tekst":""}"; tegenproef rood (plan-tp-T1): "c32: Bewaar in het beslissingspaneel wordt aangekondigd ("") verwacht true, kreeg false"
- [x] c33: een idee-titel blijft staan wanneer toevoegen mislukt — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c33: de titel blijft staan wanneer toevoegen mislukt "ui-probe: c33 idee""; tegenproef rood (plan-tp-T4, plan-tp-T1): "c33: de titel blijft staan wanneer toevoegen mislukt verwacht "ui-probe: c33 idee", kreeg """
- [x] c34: een mislukte detail-lading in `/plan` toont een melding — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c34: /plan?actie=A99 toont een melding en geen paneel {"banner":1,"tekst":true,"dialog":0}"; tegenproef rood (plan-tp-T4): "c34: /plan?actie=A99 toont een melding en geen paneel verwacht {"banner":1,"tekst":true,"dialog":0}, kreeg {"b"
- [x] c35: een mislukte Herlaad plan toont een melding — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c35: een mislukte Herlaad plan (banner) toont een melding, de knop en zijn focus blijven {"tekst":true,"knop":1,"focus":true}"; tegenproef rood (plan-tp-T4): "c35: een mislukte Herlaad plan (banner) toont een melding, de knop en zijn focus blijven verwacht {"tekst":tru"
- [x] c36a: na Opslaan vergelijken de planinstellingen met de bewaarde waarde — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c36a: na Opslaan: veld = bewaarde waarde en niet meer "gewijzigd" {"veld":"7.33","ariaDisabled":"true"}"; tegenproef rood (plan-tp-T4): "c36a: na Opslaan: veld = bewaarde waarde en niet meer "gewijzigd" verwacht {"veld":"7.33","ariaDisabled":"true"
- [x] c36b: Opgeslagen staat in een live-regio en verdwijnt bij een nieuwe wijziging — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c36b: de meldingsregel staat vóór Opslaan in een live-regio (role=status, aria-live=null) {"live":true,"tekst":""}"; tegenproef rood (plan-tp-T4): "c36b: de meldingsregel staat vóór Opslaan in een live-regio (role=null, aria-live=null) verwacht {"live":true,"
- [x] c37a: na Koppel staat de focus niet op `body` — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c37a: tijdens Koppel staat de focus niet op body (button "Koppel") false"; tegenproef rood (plan-tp-T4): "c37a: tijdens Koppel staat de focus niet op body (body) verwacht false, kreeg true"
- [x] c37b: het resultaat van Koppel wordt aangekondigd — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c37b: de live-regio staat er vóór Koppel {"n":1,"live":"polite","tekst":""}"; tegenproef rood (plan-tp-T4): "c37b: het resultaat van Koppel wordt aangekondigd verwacht "Gekoppeld aan A01.", kreeg """
- [x] c38: na het sluiten van actie- of beslissingspaneel staat de focus op het element dat het opende — bewijs: 7× ✓ in flow/plan:probe run 1 én 2, o.a. "c38: actiepaneel via Escape: focus terug op de titel van A02 (button "Leveringsbudget toetsen ·") {"dicht":true,"opOpener":true}"; tegenproef rood (plan-tp-T2, plan-tp-T4): "c38: actiepaneel via Escape: focus terug op de titel van A02 (body) verwacht {"dicht":true,"opOpener":true}, k"
- [x] c38b: na Afronden → gereed → sluiten staat de focus op een stabiel anker, niet op `body` — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c38b: na Afronden → gereed → sluiten: focus op een anker (button[role=tab] "Overzicht") false"; tegenproef rood (plan-tp-T1): "c38b: na Afronden → gereed → sluiten: focus op een anker (body) verwacht false, kreeg true"
- [x] c39: sluiten van actie- of beslissingspaneel met onbewaarde invoer vraagt eerst bevestiging, óók via het sluitkruis; na een geslaagde actie telt die invoer niet meer als onbewaard — bewijs: 11× ✓ in flow/plan:probe run 1 én 2, o.a. "c39: na Heropen sluit Escape het paneel zonder vraag true"; tegenproef rood (plan-tp-T2, plan-tp-T3, plan-tp-T4): "c39: na Heropen sluit Escape het paneel zonder vraag verwacht true, kreeg false"
- [x] c40: een fout in actie- of beslissingspaneel staat in beeld — bewijs: 4× ✓ in flow/plan:probe run 1 én 2, o.a. "c40: de fout in het actiepaneel staat in beeld (top 24 px) {"gevonden":true,"inBeeld":true}"; tegenproef rood (plan-tp-T4): "c40: de fout in het actiepaneel staat in beeld (top -1129 px) verwacht {"gevonden":true,"inBeeld":true}, kreeg"
- [x] c41: vervallen in het status-select haalt ≥ 4,5:1 contrast — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c41: vervallen in het status-select: 4.97:1 (opacity 1, rgb(102, 112, 133)) ≥ 4,5 true"; tegenproef rood (plan-tp-T1): "c41: vervallen in het status-select: 2.35:1 (opacity 0.6, rgb(102, 112, 133)) ≥ 4,5 verwacht true, kreeg false"

**G5 — instellingen**
- [x] c42: na Test, Opslaan of Herstel met het toetsenbord staat de focus niet op `body` — bewijs: 6× ✓ in flow/plan:probe run 1 én 2, o.a. "c42: tijdens Test (Enter, onderschept 1200 ms) staat de focus op button[testen] "Bezig…" (aria-disabled="true")"; tegenproef rood (kaart-tp1): "c42: tijdens Test (Enter, onderschept 1200 ms) staat de focus op body"
- [x] c43: het resultaat van Test en Opslaan staat in een live-regio — bewijs: 3× ✓ in flow/plan:probe run 1 én 2, o.a. "c43: het resultaat van Test staat in een live-regio (polite): "Test klaar. WVL: 120 treffers. OVL: 98 treffers. BRU: hoogstens 600 treffers, wordt afg"; tegenproef rood (kaart-tp1): "c43: de live-regio met het testresultaat bestond niet bij het laden — hij verscheen samen met zijn inhoud"

**Nieuw bij de laatste sync (toegevoegd 2026-09-17 op vraag van Jeroen)**
- [x] c44: in de filterbalk van Vacatures en van Leads staat een vinkje met de naam "Alleen nieuw bij de laatste sync" in de toegankelijkheidsboom — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c44: op Vacatures staat één vinkje met de naam "Alleen nieuw bij de laatste sync""; tegenproef rood (nD2): "c44: op Vacatures 0 vinkjes met de naam "Alleen nieuw bij de laatste sync" in de toegankelijkheidsboom, verwac"
- [x] c45: aangevinkt toont Vacatures precies de vacatures die bij de laatste sync binnenkwamen (telling tegen de database, binnen de overige filters) — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c45: aangevinkt toont Vacatures 88 vacatures ("5 vacatures vanaf score 10, 83 lager") = 88 in de database, van 334 open"; tegenproef rood (nA): "c45: aangevinkt toont Vacatures 334 (25 vacatures vanaf score 10, 309 lager), de database zegt 88 nieuw bij de"
- [x] c45b: idem Leads — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c45b: aangevinkt toont Leads 3 kaarten = 3 in de database (zonder vinkje 27)"; tegenproef rood (nB): "c45b: aangevinkt 27 leadkaarten, de database zegt 3 nieuw bij de laatste sync"
- [x] c46: het vinkje overleeft herladen (`nieuw=1` in de URL) — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c46: het vinkje overleeft herladen (?tab=leads&nieuw=1, 3 kaarten)"; tegenproef rood (nC): "c46: na het aanvinken staat nieuw=null in de URL, verwacht 1"
- [x] c47: Vacatures leeg door het vinkje noemt het vinkje als oorzaak — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c47: leeg door het vinkje noemt het vinkje ("Smile Group": 7 zonder, 0 met)"; tegenproef rood (nB): "c47: leeg door het vinkje ("Smile Group", zonder vinkje 7) leest: "Vacatures Geen vacatures voor "Smile Group""
- [x] c48: de statusoptie voor nog niet beoordeelde items heet "Niet beoordeeld" in het statusfilter — bewijs: 1× ✓ in flow/plan:probe run 1 én 2, o.a. "c48: de optie new heet "Niet beoordeeld" (6 opties: Open, Alle statussen, Niet beoordeeld, Opgeslagen, Afgewezen, Gecontacteerd)"; tegenproef rood (nA): "c48: de optie new leest [{"waarde":"new","tekst":"Nieuw"}], verwacht "Niet beoordeeld""
- [x] c48b: nergens in de broncode van het dashboard heet status `new` nog "Nieuw" als label (grep met noemer) — bewijs: grep op 'Nieuw'/"Nieuw"/>Nieuw</label: 'Nieuw/onder Nieuw in components, app en lib: 1 treffer, het uitlegcommentaar FilterBar.tsx:15, 0 labels van de 6 statuslabels; dezelfde grep vindt de tegenproef-mutatie `label: 'Nieuw'` (set nA)
- [x] c49: suite `triage` — de URL-rondreis geldt over de hele filterruimte mét het vinkje (tegenproef: `nieuw` niet wegschrijven) — bewijs: suite triage: "1: 60480 standen door de URL heen en terug", 60801/60801 groen; tegenproef (nieuw niet wegschrijven): 30240 × "FAIL rondreis … nieuw:true", rc=1, byte-gelijk hersteld
- [x] c49b: suite `triage` — het vinkje selecteert precies de items waarvoor de badge-voorwaarde geldt, over elke combinatie van filters (tegenproef: een tweede, afwijkende voorwaarde) — bewijs: suite triage: "6: 240 filterstanden × 480 items, met en zonder vinkje", groen; tegenproef (`>` i.p.v. isNieuw in pastBijFilters): 210 × "FAIL 6 … vinkje = zonder ∩ badge", rc=1, byte-gelijk hersteld

**Wijzig op een actierij (toegevoegd 2026-09-17 op vraag van Jeroen)**
- [x] c50: wordt de volgende stap elders gewijzigd (paneel of HTTP) en het plan herladen, dan opent Wijzig met de nieuwe tekst — bewijs: 2× ✓ in flow/plan:probe run 1 én 2, o.a. "c50: Wijzig opent met de stap uit het paneel, niet met de kopie van bij het mounten "ui-probe: c50 in het paneel 21""; tegenproef rood (plan-tp-T3): "c50: Wijzig opent met de stap uit het paneel, niet met de kopie van bij het mounten verwacht "ui-probe: c50 in"

**States (afschrijving)**
- [x] States: dit is een fase óver states; elk item hierboven is een state- of bereikbaarheidsitem — bewijs: de clusters c01–c43 zijn afgeleid uit de state- en focus-assen van de inventaris

**Bestaande werking**
- [x] `scenarios` groen — bewijs: "✓ scenarios: 62215 checks over 10 suite(s), en bewezen faalbaar"
- [x] `plan:probe` groen — bewijs: run 1 en 2 "✓ PROBE KLAAR — alle asserties geslaagd" (286 check-regels, identieke labels), jobradar.db-vingerafdruk voor = na
- [x] `opvolging:probe` groen — bewijs: rc=0, 0 × ✗, jobradar.db-vingerafdruk voor = na
- [x] `flow` groen — bewijs: run 1 (202 s) en run 2 "✓ alle checks geslaagd", 209 × ✓, rc=0, jobradar.db-vingerafdruk voor = na
- [x] `flow --selftest` bewijst zijn assen — bewijs: "✓ zelftest: alle 6 assen falen wanneer ze horen te falen"
- [x] `tsc` en eslint groen — bewijs: `tsc --noEmit --incremental false -p apps/jobradar` rc=0, `eslint --no-cache app components lib` rc=0
- [x] `ds:guard` en tokens-guard groen — bewijs: "✓ Design-systeem-bron: 9/9 apps", "✓ laag-discipline: 397 bestanden schoon"
- [x] `packages/ui` ongewijzigd — bewijs: `git status --porcelain -uall -- packages/` = 0 regels
- [x] 95 P3's (96 uniek, min het Engelse-routes-item dat al bestond) gegroepeerd per bestand in `apps/jobradar/BACKLOG.md` — bewijs: awk over de groepen "Gevonden door de inventaris van fase 3": 36 groepen, 95 regels (commit 77c7f37); 25 ervan sindsdien gemarkeerd als opgelost of deels

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt vanuit plan fase 3; de acceptatielijst komt uit een inventaris over alle
  routes in plaats van uit de zeven punten van het plan alleen.
- 2026-09-17: op vraag van Jeroen twee BACKLOG-items in deze fase getrokken. (1) "+N vacatures" filterde op
  status `new` = "nog niet beoordeeld", terwijl de badge "nieuw" "binnengekomen bij de laatste sync" betekent —
  hetzelfde woord, twee betekenissen op één scherm, en dat is waarom de aanname in de briefing fout liep. Keuze
  Jeroen: een vast vinkje in de filterbalk (niet alleen een label na de link) en de statusoptie hernoemen naar
  "Niet beoordeeld". c13d herschreven. (2) Wijzig op een actierij opende met de stap van bij het mounten.
- 2026-09-17: review na de bouwronde (5 sceptische reviewers) leverde 12 nieuwe items (c05b–c38b);
  opgenomen vóór het meten. Premisse van c25b bijgesteld: Open = alles behalve afgewezen, dus de
  kaart verdwijnt pas onder Nieuw of Bewaard.
