---
name: verify
description: Toetst of gebouwd werk zich werkelijk gedraagt zoals het acceptatie-contract zegt, door het uit te vóéren op het doelwit van de gebruiker — niet door de code te lezen. Kiest de meetbare as bij het taaktype (design-snapshot, invariant, flow-doorloop, request/response, before-after-reproductie), levert P0–P3 bevindingen met runtime-bewijs, en vinkt de acceptatie-items van de briefing af. Gebruik deze skill in de Beoordeel-stap van de triade, of wanneer de gebruiker zegt "verifieer dit", "klopt het gedrag", "werkt het echt", "check of dit doet wat de briefing zegt", "vink de acceptatie af". NIET voor diff-correctheid (`code-review`), design-kwaliteit (`ux-audit`) of backend-hardening (`security-audit`).
---

## Werkwijze

Deze skill beantwoordt één vraag: **gedraagt het gebouwde zich zoals het acceptatie-contract zegt, bewezen door uitvoering?**

Dat maakt hem het buitenbeentje van het Beoordeel-panel. `code-review` leest de diff, `security-audit` leest het backend-oppervlak, `ux-audit` beoordeelt kwaliteit — alle drie statisch. `verify` is de enige as die **runtime-bewijs** produceert. Een skill die alleen leest kan nooit aantonen dat iets wérkt; ze kan hoogstens aantonen dat het er goed uitziet.

Daaruit volgt de kernregel van deze skill: **een groene build is geen gedrag.** Exit 0 zegt dat er gecompileerd is, niet dat de gebruiker ziet wat hij hoort te zien. Elke bevinding steunt op waargenomen output — een waarde, een screenshot, een response, een berekend saldo — nooit op "de code doet dit".

---

## Scope-gate — verplichte eerste stap

`verify` heeft twee dingen nodig. Ontbreekt er één, dan is de uitkomst geen verificatie maar een indruk.

**1. Een acceptatie-contract (de oracle).** De machine-leesbare `- [ ]`-checklist uit PLAN: een TC-EBC bij design-werk, een licht taak-contract bij refactor/bugfix/infra. Ontbreekt die → **stop**. Zeg: *"Geen acceptatie-contract — verify heeft geen oracle. Vraag PLAN eerst om de checklist."* Zelf een checklist verzinnen en er dan tegen toetsen is een gesloten cirkel: je bewijst je eigen aanname.

**2. Een uitvoerbaar pad (de as).** Een manier om het gedrag echt op te wekken — zie de as-tabel hieronder. Begin bij de sectie `## Verify-pad` in de `CLAUDE.md` van de app: die hoort de commando's te bevatten. Ontbreekt die sectie, dan is dat je eerste bevinding. Ontbreekt het pad zelf → **niet doen alsof**. Meld expliciet *"as overgeslagen: {welke}, want {reden}"* en draai de Beoordeel-stap niet alsof hij geslaagd is. Een groene review die niets gemeten heeft geeft valse zekerheid en is slechter dan geen review.

**Valt binnen dezelfde app dezelfde as een tweede keer weg**, dan is het ontbrekende pad zélf het werk: leg het vast als `next-step` in de `HANDOFF.md` van die app, met wat het concreet moet meten. Een verify-pad is een deliverable, geen bijproduct — het ontstaat niet vanzelf uit bouwtaken, en vanaf de tweede melding is "overgeslagen" geen informatie meer maar een gewoonte.

---

## Kies de meetbare as

De as volgt uit het taaktype, niet uit wat toevallig makkelijk te draaien is.

| Taaktype | Meetbare as | Wat telt als bewijs |
|---|---|---|
| **Design-to-code** | de design-snapshot (`figma-naar-code` stap 4b) + parity- en token-checklist | een render van het gebouwde, gediff tegen de snapshot — niet tegen een vluchtige in-context mapping |
| **Business-logica met afhankelijke berekeningen** | de **invariant** over het hele model | de invariant uitgerekend over een echte dataset (`eindsaldo maand N == beginsaldo maand N+1`), niet een scherm dat het juiste getal toont |
| **Flow / interactie** | het pad daadwerkelijk afleggen | de flow doorlopen op het doeltoestel, inclusief toetsenbordpad waar dat geldt |
| **Backend / API** | request → response → statewijziging | een echte call tegen een echte store; de rij die erna in de database staat |
| **Bugfix** | de reproductie | dezelfde input faalt vóór de fix en slaagt erna — beide kanten getoond |
| **States** (loading/empty/error) | de toestand forceren | de app in die toestand brengen (mock, throttle, lege dataset), niet de branch in de code aanwijzen |
| **Diagnose / meting** ("klopt waarde X?", "wordt Y nog juist berekend?") | de directe meting aan de bron | de grootheid zelf gemeten — een log, een opname, een teller, een testrun op synthetische invoer. Nooit een aggregaat, vuistregel of verwachtingswaarde als afsluiting: dat is de hypothese, niet het bewijs (CLAUDE.md, *"Een verwachtingswaarde is geen meting"*) |

Meerdere assen tegelijk is normaal: een feature-flow met een berekening heeft er twee. Draai ze allebei of meld welke je oversloeg.

---

## Zeven rails — de discipline van de Beoordeel-stap

Deze staan als werkprincipe in `CLAUDE.md`; hier zijn ze operationeel.

**1. De Beoordeel-stap schrijft.** Bouwen, migreren en installeren zijn geen observaties — ze veranderen de schijf. Leest er een langlopend proces uit diezelfde plek (dev-server, PM2-app, gedeelde database), dan deployt je verificatie ongewild en valt de schade buiten je blikveld: jij ziet exit 0, de gebruiker ziet een witte pagina.

Vóór een build in een repo met draaiende processen: `pm2 status`, `lsof -nP -iTCP:<poort> -sTCP:LISTEN`. Serveert er iets uit die map → gebruik het script dat bouwen en herstarten koppelt (`pm2:rebuild`), of bouw naar een aparte map.

*Diagnose-truc:* staat de mtime van de buildmap ná de starttijd van het proces, dan serveert het uit een build die het zelf niet kent. Bewijs is één stap: haal de HTML op, trek de chunk-paden eruit, kijk of ze op schijf bestaan.

**2. Verifieer op het doelwit van de gebruiker.** Een groene check op een ander toestel, een andere build of een andere omgeving dan waar de gebruiker de fout ziet, bewijst niets over zijn geval. Draai de volledige cyclus — herstart of reload inbegrepen — op hetzelfde doelwit.

Kan dat niet, dan is een surrogaat toegestaan **mits je twee dingen meldt**: dat je op een surrogaat getest hebt, en wat dat níet uitsluit. Sluit het gat waar mogelijk met een aantoonbare gelijkheid ("de uitgerolde hook is byte-identiek aan de geteste template, en `core.hooksPath` staat gezet") — dat is geen aanname maar een diff.

**3. Geen verzonnen bewijs.** Kun je een item niet uitvoeren, markeer het `[NIET TE VERIFIËREN — reden]` en zeg hoe het wél zou kunnen. Een verificatie met valse zekerheid is schadelijker dan een eerlijke leemte, want ze sluit de vraag af.

**4. Toets een bewering over een bibliotheek aan de geïnstalleerde bron.** Die staat in `node_modules`. Hoe stelliger de bewering, hoe kleiner de kans dat ze nagekeken is — en een typecheck die slaagt zegt niets over een verkeerd begrepen contract.

**5. Nooit een destructief pad tegen productiedata.** Rail 2 stuurt je naar het echte doelwit; deze rail begrenst dat. Verwijderen, wissen, overschrijven of een migratie draaien op data die de gebruiker echt gebruikt is geen verificatie — het is schade met een rapport eraan vast. Dat het goed afliep bewijst niets over de beslissing: die was al fout toen je hem nam, want de uitkomst was toen onbekend.

Bouw het bewijs om het pad heen. Drie vormen, in volgorde van voorkeur:

| Vorm | Hoe | Wat het bewijst |
|---|---|---|
| **Guard in plaats van effect** | roep het beschermde pad aan zónder rechten; tel de data ná afloop | dat de bescherming houdt — het sterkste bewijs dat er is, want je hebt het echte pad geraakt |
| **Synthetische invoer** | dezelfde transformatie op een verzonnen rij in een `select`, nooit een `update` | dat de logica klopt, zonder één echte rij aan te raken |
| **Testaccount met seed-data** | een tweede account waarvan het verlies niets kost | het volledige pad, end-to-end |

Kan geen van de drie, dan is het item `[NIET TE VERIFIËREN — destructief pad, geen testaccount]`. Dat is een leemte, geen vrijbrief. Wil je het tóch echt uitvoeren: vraag het vooraf, niet achteraf.

*Herkennen doe je aan de aanroep, niet aan de naam.* `revoke`, `delete`, `reset`, `drain`, `purge`, een `rpc(...)` waarvan je de body niet gelezen hebt, en elke `update`/`delete` zonder `where` op een eigen rij. Bij twijfel: lees eerst wat de functie doet, dan pas of je hem aanroept.

**6. Toets ook je instrument, niet enkel je doelwit.** Rail 2 gaat over wáár je meet; deze over waarmee. Bootst je invoermethode de interactie echt na — en geeft ze haar de tíjd die ze nodig heeft?

Een niet-getrouw instrument levert een vals-negatief dat er identiek uitziet als een echte bug — juist bij de skill die bewijs moet leveren. Bevestig een negatieve uitkomst daarom langs een tweede, onafhankelijk pad (toetsenbord naast muis, een andere driver) vóór je "werkt niet" rapporteert.

*Het gaat zelden om ontbrekende events, meestal om ontbrekende frames.* Gemeten op cashflow (2026-08-07): `left_click_drag` lévert pointer-events af — 1 pointerdown, 3 pointermove, 1 pointerup — en dnd-kit pakt het item ook echt op. De sensor weigert dus niets. Wat het gebaar mist is een frame waarin de bibliotheek haar droppables opmeet; daardoor blijft `over` leeg en gebeurt er bij het loslaten niets. Dezelfde bewegingen mét ~50 ms ertussen lossen de doelzone wél op. Een gebaar dat in één burst afloopt is geen snelle versie van een echt gebaar, het is een ánder gebaar.

*Je observatiepunt is óók een instrument.* Kijk naar wat de bibliotheek zelf vertelt — bij dnd-kit de `[aria-live]`-narratie ("Picked up…", "was moved over droppable area…") — niet naar een afgeleid symptoom. Een observer die op de DragOverlay lette meldde nul terwijl de sleep aantoonbaar was opgepakt: bij een burst commit React die overlay nooit. Twee instrumenten, twee tegengestelde antwoorden, en het zichtbaarste was het foute.

*En de omgeving van je instrument.* In een achtergrond-tabblad staat `document.visibilityState` op `hidden` en vuurt `requestAnimationFrame` niet meer: een wachtlus op frames hangt tot de tool-timeout, en animaties maken hun exit nooit af. Wat je dan meet is de tab-staat, niet de app. Gebruik timers in plaats van frames, of breng het doelwit naar de voorgrond.

**7. De verwachting is de reden om te meten, nooit het bewijs.** Een vuistregel uit de literatuur, een typische waarde, een aggregaat dat logisch oogt — dat is de hypothese die de meting motiveert, niet de meting zelf. Bestaat de meetbare as (een log, een opname, een teller, het Verify-pad van de app), dan sluit alleen díe de vraag; kun je niet meten, dan lever je een hypothese mét het meetpad erbij, geen conclusie met een tabel eronder.

*Herkenningsteken:* wijkt het getal af met precies een ronde factor (×2, ×½, ×60), dan is dat vrijwel zeker een tel- of eenheidsfout — die ga je meten, niet verklaren, en de kant waarop hij valt beslis je nooit uit plausibiliteit. Gemeten op rowtrack (2026-08-16): "20-24 spm is je echte slagfrequentie" klonk sluitend met twee vuistregels als steun; een FTMS-opname en een handtelling dezelfde avond wezen het tegendeel uit, en de echte oorzaak (een noemer die rustpackets meetelde) produceerde exact het klachtgetal 24.

---

## Het verify-pad — een contract per app

Deze skill kan niet elke run het terrein opnieuw ontdekken: welke simulator, welke build, draait de dev-server, waar leeft dat scherm. Dat is verspilde tijd én een bron van valse conclusies — een build van een maand oud ziet er in een screenshot precies zo uit als een verse.

Elke app die `verify` gebruikt hoort daarom een sectie **`## Verify-pad`** in zijn eigen `CLAUDE.md` te hebben, met de letterlijke commando's per capability:

| Capability | Wat het moet kunnen |
|---|---|
| **Render vastleggen** | een screenshot van de draaiende app, met het commando erbij |
| **Flow aandrijven** | tappen, typen, navigeren — of expliciet "geen" |
| **State forceren** | loading/empty/error opwekken, plus het testaccount en hoe je het reset |
| **Invariant draaien** | de headless host voor pure logica, met het commando |
| **Verse build** | hoe je zeker weet dat je de huidige code test, niet een oude binary |

**"Geen" is een geldige waarde en hoort er expliciet te staan.** Een lege regel laat de vraag elke run terugkomen; het woord "geen" maakt het gat zichtbaar en telbaar. Ontbreekt de sectie helemaal, dan is dát de eerste bevinding van de run — vóór welk acceptatie-item ook.

De sectie beschrijft het pad, ze bouwt het niet. Welk gereedschap de flow aandrijft verschilt fundamenteel per platform (browser-automatisering voor web, een UI-driver voor native) en is dus een keuze op app-niveau, niet hier.

---

## Stappenplan

1. **Scope-gate** — contract aanwezig? uitvoerbaar pad aanwezig? Zo niet: meld en stop (of meld "overgeslagen" en ga eerlijk verder met wat wél kan).
2. **As kiezen** — bepaal uit het taaktype welke as(sen) gelden; benoem ze expliciet vóór je draait.
3. **Doelwit vaststellen** — waar ziet de gebruiker dit? Check op draaiende processen vóór je iets bouwt (rail 1).
4. **Uitvoeren** — wek het gedrag op. Leg de waargenomen output vast: waarde, screenshot, response, saldo. Niet de exit code.
5. **Per acceptatie-item oordelen** — `gehaald` / `gefaald` / `niet te verifiëren`, elk met zijn bewijs.
6. **Consolideren** — bundel de gefaalde items tot één P0–P3-lijst.
7. **Briefing bijwerken** — vink de gehaalde items af (`- [x]`) in het TC-EBC- of contract-bestand. Dit is de enige rol in het systeem die dat mag doen: een afgevinkt item betekent *geverifieerd*, niet *gebouwd*.
8. **Rapporteren** — inline, met bestandspad naar de briefing.

---

## Prioritering

| Niveau | Betekenis |
|--------|-----------|
| P0 | Het gedrag klopt niet op het hoofdpad — de gebruiker krijgt een fout resultaat, een lege pagina of een verkeerd bedrag. Blokkeert `gevalideerd` |
| P1 | Een acceptatie-item faalt, of een state (loading/empty/error) valt in een blanco scherm. Blokkeert `gevalideerd` |
| P2 | Randgeval of afwijking zonder gebruikersimpact op het hoofdpad — parity-verschil binnen tolerantie, trage maar correcte respons |
| P3 | Observatie voor later; geen contract-schending |

Een item dat je niet kón verifiëren is **geen** P-bevinding — het is een leemte, en die hoort in de "niet te verifiëren"-lijst. Ze stilzwijgend als gehaald tellen is de faalvorm die deze hele skill moet voorkomen.

---

## Output

Standaard **inline**, geen bestand: `verify` draait meerdere keren per bouwlus, en een rapport per iteratie is ruis. Wat wél persistent wordt: de afgevinkte acceptatie-items in de briefing (stap 7).

Toon:

1. **As + doelwit** — welke as(sen) gedraaid, op welk doelwit, en of dat het doelwit van de gebruiker was.
2. **Acceptatie-tabel** — item · oordeel · bewijs.
3. **Bevindingen** — P0→P3, elk met de waargenomen output.
4. **Niet te verifiëren** — met de reden en hoe het wél zou kunnen.
5. **Overgeslagen assen** — expliciet, met de reden. Bij de tweede keer in dezelfde app: het HANDOFF-item dat je aanmaakte.

Vraagt de gebruiker om een blijvend rapport, of is dit de afsluitende verificatie van een grote briefing → schrijf ook naar `/audits/{YYYY-MM-DD}-verify-{naam}.md`.

---

## Verhouding tot de triade

`verify` is de gedrags-as van de **Beoordeel**-stap. Een openstaande **P0 of P1** blokkeert de status `gevalideerd`, net als in `code-review` en (bij backend-werk) `security-audit`. De main-agent is scheidsrechter en consolideert alle panels tot één fix-lijst.

Twee dingen die deze skill **niet** doet: hij fixt niet (dat is BOUW), en hij oordeelt niet over kwaliteit of smaak (dat is `ux-audit`). Hij stelt vast of het contract gehaald is.

Legt een gefaalde verificatie een **terugkerende faalklasse** bloot — niet deze bug, maar de soort — dan is dat een `vastleggen`-trigger. Log alleen echte skill-/principe-fouten, geen losse code-bevindingen.

---

## Bewust niet in deze skill

- **Diff-correctheid** — dat is `code-review`. Overlap is verspilling: die leest, deze draait.
- **Zelf de acceptatie-checklist schrijven** — dat is PLAN (`tc-ebc` of het taak-contract). Een oracle die je zelf verzint bewijst niets.
- **Fixen wat je vindt** — rapporteren en teruggeven aan BOUW; anders vervaagt de grens tussen bouwer en toetser binnen dezelfde iteratie.
- **Een rapport per run wegschrijven** — inline is de norm; de briefing draagt de persistente staat.
