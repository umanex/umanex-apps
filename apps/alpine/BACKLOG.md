# BACKLOG.md — alpine

Gemeld, niet gebouwd. Format, statussen en de grens met `HANDOFF.md` en `LEARNINGS.md`
staan in de root-`BACKLOG.md`.

# Project — alpine

## 2026-09-11 — Voertuiggegevens ophalen via chassisnummer of kenteken · [feature]
- **Wat:** Uitzoeken welke bronnen de geboortekaart en de tijdlijn kunnen vóórvullen in plaats van
  alles handmatig te laten invoeren. Kandidaten, geen van alle geverifieerd vanuit de sessie:
  **NHTSA vPIC** (gratis, VIN-decodering, VS-markt, ≥ modeljaar 1981) · **RDW open data** (NL, gratis,
  op kenteken: merk, eerste toelating, kleur, massa, APK) · **DVLA Vehicle Enquiry + MOT history API**
  (VK, gratis met sleutel; de MOT-historiek draagt kilometerstanden en is daarmee de rijkste
  tijdlijn-bron die in beeld kwam) · **Car-Pass** (BE, kilometerhistoriek, professioneel account) ·
  **carVertical / vindecoder.eu** (betaald, Europese dekking) · **Renault Classic** (fabrieksarchief,
  handmatige aanvraag per wagen, geen koppeling).
- **Waarom niet nu:** de vraag kwam op tijdens Fase 5 van conceptwerk in Figma. Er is geen code en geen
  gekozen backend, dus een integratie heeft nog nergens een thuis. En de lijst hierboven is uit het
  hoofd opgeschreven, niet nagetrokken — die claim hoort gemeten te worden vóór hij een ontwerp draagt.
- **Randvoorwaarde die al vaststaat:** voor de **klassieke A110 (1961–1977) bestaat er geen VIN**. Het
  gestandaardiseerde 17-tekennummer werd pas verplicht vanaf modeljaar 1981; die wagens dragen een
  carrosserienummer van vier of vijf cijfers zonder gecodeerde betekenis. Voor dat deel van het park is
  *eigenaar vult in, club of platform verifieert tegen een foto van het typeplaatje* het enige model —
  precies wat de regel "Gecontroleerd tegen het carrosserienummer op 12 mei 2019" op de geboortekaart
  impliceert. Koppeling met een externe bron is alleen kansrijk voor de moderne modellen.
- **Privacy:** een chassisnummer aan een eigenaar knopen is persoonsgegeven. Het register toont
  chassisnummers daarom gemaskeerd; dat is ontwerp, geen detail.
- **Eerste zet:** de drie bronnen die er echt toe doen natrekken op bestaan, voorwaarden en dekking —
  RDW open data, DVLA/MOT history, en wat Renault Classic voor de moderne modellen aanbiedt.
- **Status:** open

## 2026-09-11 — De demo-inhoud staat op een klassieke A110, de doelgroep is de moderne · [ux]
- **Wat:** Alle drieëntwintig schermen van Fase 3 t/m 5 draaien om één wagen: een A110 1300 VB uit 1973,
  bouwnummer ···· 4127. Jeroen meldde tijdens Fase 5 dat het platform vooral op de **huidige A110** en de
  **A290 / A390** mikt, met de klassiekers als toegankelijk maar secundair. Het concept (de tijdlijn als
  ruggengraat) houdt stand, maar de inhoud demonstreert de randgevallen in plaats van de kern.
- **Waarom niet nu:** de melding kwam nadat Fase 5 gebouwd was. Herinhoud geven aan drieëntwintig
  schermen is een eigen ronde, geen correctie binnen de lopende fase.
- **Eerste zet — gedaan op 2026-09-11.** `03 · Autoprofiel — A290 (proef)` plus een bevindingenpaneel
  ernaast, beide op `03 — Desktop`. Uitkomst: de geboortekaart en de specificaties houden stand zonder
  één wijziging aan componenten of tokens; vier andere dingen niet. Die staan hieronder als eigen items.
  Het omzetten van de overige tweeëntwintig schermen blijft open.
- **Status:** open

## 2026-09-11 — Het type `maintenance` hernoemen · [refactor]
- **Wat:** De variant-as `type` draagt `photo · maintenance · story · milestone`. Voor een elektrische
  Alpine dekt `maintenance` de lading niet: de gebeurtenissen zijn software-updates, batterijcontroles,
  keuringen en circuitdagen. Hernoemen naar `service` of `log`.
- **Waarom niet nu:** de A290-proef toont dat de **vorm** wél klopt — vier typische A290-gebeurtenissen
  in de bestaande variant lezen alle vier goed als feitelijke, compacte logregel. Alleen het woord is
  fout. Hernoemen raakt elke instance-naam in het bestand en is een eigen, saaie ronde.
- **Eerste zet:** `figma_rename_node` op de twee varianten, daarna de instances hertellen; de
  variant-property `type` zelf hernoemen vraagt `figma_edit_component_property`.
- **Status:** gebouwd — 2026-09-11, commit `e698141`. Gekozen: `service`, niet `log`. De vier
  gebeurtenissen die onder dit type vallen (keuring, batterijcontrole, software-update, onderhoudsbeurt)
  zijn alle vier *iets dat aan de wagen gedaan is*; `log` is te generiek want de hele tijdlijn is een
  logboek. Gemeten na de hernoeming: variant-as `type` gaat van `photo · maintenance · story · milestone`
  naar `photo · service · story · milestone`, **129 instances heel, 0 stuk**.

## 2026-09-11 — De tweeling werkt niet op schaal · [ux]
- **Wat:** Bij een klassieker is er precies één wagen met dezelfde bouwweek, kleur en uitvoering. Bij een
  A290 GTS in Bleu Alpine Vision zijn dat er in het proefvoorbeeld 412. Het onderdeel leeft van
  zeldzaamheid en die is er bij de moderne modellen niet.
- **Waarom niet nu:** de keuze is inhoudelijk, niet technisch — beperken tot de klassiekers, of de as
  verleggen naar leverweek plus optiecombinatie en het eerlijk "dichtstbijzijnde configuratie" noemen.
  Dat is een productbeslissing van Jeroen, geen ontwerpfout die ik kan wegpoetsen.
- **Eerste zet:** beslissen welke van de twee, en pas daarna `03 · De tweeling` aanpassen.
- **Status:** gebouwd — 2026-09-11, commit `e698141`. Gekozen: **het label volgt de data**. Bij weinig
  treffers blijft het "de tweeling" en gaat het over zeldzaamheid; bij veel treffers heet het "verwante
  wagens" en kantelt de as van *zeldzaamheid* naar *contrast* — niet wie het meest op je lijkt, maar
  wiens dossier het meest anders liep. `03 · Verwante wagens — A290` toont dat geval: 412 wagens delen
  de configuratie, vijf dossiers lopen het verst uiteen (van 1 240 km in een klimaatkamer tot 41 200 km
  woon-werk), en de resterende 407 staan als landen-grootboek. De drempel tussen beide labels is een
  productbeslissing die nog open staat — vermoedelijk rond de vijf treffers.

## 2026-09-11 — De tijdlijn is niet getoetst op de dichtheid van een connected wagen · [ux]
- **Wat:** De aanname was dat een A290 die zelf laadsessies en ritten wegschrijft honderden gebeurtenissen
  per jaar produceert, waardoor de jaarscheiding het verkeerde ritme zou worden en groepering nodig was.
- **Waarom niet nu:** —
- **Status:** verworpen — 2026-09-11. **De premisse was een aanname van mij, geen waarneming.** Ik sprong van
  "connected wagen" naar "de app logt elke laadbeurt en elke rit"; dat is een productbeslissing die ik voor
  Jeroen nam. Hij corrigeerde het diezelfde dag: **laadsessies en routineritten zijn geen gebeurtenissen in
  deze applicatie.** Zonder die twee krijgt een A290-dossier service, foto's, ritverslagen en mijlpalen —
  tientallen per jaar, vergelijkbaar met een goed bijgehouden klassieker. De jaarscheiding blijft dus een
  jaarscheiding en het bundelmechanisme is voor dit probleem niet nodig.
- **Wat er wél uit overbleef, en gebouwd is:** één rit levert twintig foto's op, en dát is een echte
  bundelbehoefte. `timeline-cluster` (2 varianten) dient sindsdien **fotobundels** — "22 foto's van de
  Vogezen" — met een holle markering in de fotokleur, en klapt open tot een raster miniaturen bínnen die
  ene rij in plaats van tot twintig losse tijdlijn-items. Een verslag van een toeristische rit is gewoon
  een `story`; daar was geen nieuw type voor nodig. De vier "dicht"-schermen zijn vervangen door vier
  A290-tijdlijnschermen met normale dichtheid (8 gebeurtenissen, 31 foto's in twee bundels over zeven
  maanden). Bevinding 05 op `03 · A290-proef — bevindingen` staat nu als **INGETROKKEN** met de reden erbij.
