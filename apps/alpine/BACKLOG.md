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
- **Eerste zet:** één scherm omzetten naar een A290 uit 2026 en kijken wat er breekt — vermoedelijk de
  geboortekaart (wordt een configuratiebon: fabriek Douai, batterij, uitrusting) en het type
  `maintenance` (een elektrische wagen heeft nauwelijks onderhoudsbeurten, wel software-updates,
  batterijcontroles en keuringen).
- **Status:** open
