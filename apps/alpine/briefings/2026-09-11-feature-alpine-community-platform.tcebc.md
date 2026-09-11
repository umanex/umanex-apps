# Alpine A110 community-platform — conceptueel design

- **Datum:** 2026-09-11
- **Type:** feature
- **Project:** alpine (nieuw, nog geen code)
- **Klant:** umanex (eigen product / conceptwerk)
- **Status:** gepland

---

```
TASK:        Conceptueel ontwerp in Figma voor een eigenaarscommunity rond de Alpine A110,
             op twee platformen (mobiel 390x844, desktop 1440), met de tijdlijn van de auto
             als ruggengraat waar elke feature aan ondergeschikt is.

CONTEXT:     Wereldwijde eigenaarscommunity. Geen verzameling modules maar een doorlopende
             biografie van een auto. Toon: autodossier en servicelogboek, warm en ambachtelijk
             - uitdrukkelijk geen SaaS-dashboard, geen statistiek-tegels, geen kleurige badges.
             Eigen merk, los van umanex: geen umanex-tokens. Er wordt in deze opdracht geen
             code geschreven; de Figma-variables zijn de latere bron voor een eigen tokens.json
             via Tokens Studio.

ELEMENTS:    Foundations: variable-collectie met Core/* primitieven + semantische laag,
             licht/donker als modes, neutrale schaal 50-950, twee typografie-families
             (verhaal + UI), spacing- en radius-schaal. Moodboard-frame.
             Componenten: timeline-item component set (type x layout), year-divider.
             Schermen: tijdlijn (mobiel + desktop, gevuld + leeg), autoprofiel met
             geboortekaart/specificaties/eigenaarsketen, snel-invoer, register met filters,
             community-feed, twinned-car onderdeel.

BEHAVIOUR:   Mobiel is onderweg: snel een gebeurtenis met foto toevoegen, melding krijgen.
             Desktop is ontdekken en doorbladeren: extra breedte gaat naar context naast de
             chronologie, niet naar meer knoppen. Elke auto in het register leidt naar zijn
             tijdlijn. De community-feed hangt aan de tijdlijn vast, staat er niet naast.
             Vier tijdlijn-types verschillen in gewicht en ritme maar blijven een familie:
             maintenance feitelijk en compact, story ruim en leesbaar, milestone ceremonieel,
             photo beeld-gedragen.

CONSTRAINTS: Alle kleur, typografie en spacing via Figma variables - geen hardcoded waarden.
             Schermen en componenten binden uitsluitend aan de semantische laag, nooit
             rechtstreeks aan Core/*. Kleur als hex. Namen kebab-case, vlak en voorspelbaar.
             Alles in auto-layout, ook de mobiele frames. Componentnamen Engels, UI-copy
             Nederlands zonder persoonlijke voornaamwoorden. Chassisnummer nooit volledig
             zichtbaar - gemaskeerd, alleen de laatste cijfers. Gefaseerd met stops.
```

---

## Open vragen

Alle vier beantwoord op 2026-09-11, vóór Fase 1.

1. ~~Component-typologie snel-invoer~~ → **paneel over de tijdlijn**. Schuift van onder omhoog, de chronologie blijft erachter zichtbaar. Toevoegen gebeurt visueel bínnen de tijdlijn, niet ernaast.
2. ~~States~~ → **alle toestanden op elk datascherm**: default/gevuld, leeg, laden en fout. Niets valt af.
3. ~~Interactie-modaliteit~~ → **statisch**. Geen hover/pressed-varianten; de component set blijft op de twee assen type × layout. Interactie wordt in tekst bij het scherm beschreven.
4. ~~Eigen brandnaam~~ → **`Alpine` als werknaam**. Collectienaam en token-prefix volgen die naam; hernoemen is later één ingreep op collectieniveau.

## Aannames

- [ASSUMPTION: type = `feature`] — het werk kruist meerdere schermen, twee platformen en een foundations-laag; geen enkel scherm draagt het alleen.
- [ASSUMPTION: doelgroep] — A110-eigenaars, wereldwijd, hobbyist tot verzamelaar; de emotionele waarde van het object weegt zwaarder dan taak-efficiëntie.
- [ASSUMPTION: datamodel] — één datamodel over beide platformen; een gebeurtenis draagt datum, type, korte tekst, optioneel foto's, optioneel kosten/kilometerstand bij maintenance.
- [BESLIST 2026-09-11: snel-invoer is een paneel over de tijdlijn]
- [BESLIST 2026-09-11: alle vier de toestanden op elk datascherm]
- [BESLIST 2026-09-11: statische frames, geen state-as in de component set]
- [BESLIST 2026-09-11: werknaam `Alpine` voor collecties en token-paden]
- [GEMETEN 2026-09-11: verhaalkolom desktop = 620 px] Bij 560/600/620 px blijft `story-body` op 68 tekens per regel; vanaf 660 px springt het naar 85, boven de 80 die WCAG 1.4.8 noemt. 620 is de breedste veilige maat.
- [GEMETEN 2026-09-11: mobiel haalt de ondergrens van 45 tekens niet] 390 − 2×20 = 350 px content geeft 42 tekens bij `story-body` (17 px). Dat is natuurkunde, geen defect: de bovengrens van 80 is de bindende regel, de ondergrens geldt alleen op desktop.
- [GEMETEN 2026-09-11: `space` en `radius` bestaan in beide collecties] Core draagt de numerieke stappen, Semantic de rollen. Bij een platte export vallen ze in dezelfde groep — in Tokens Studio scheidt de set-naam ze, in een flat-JSON-export niet.
- [BEKEND 2026-09-11: typografie exporteert niet als DTCG-composite] De 11 type-rollen staan als 5 losse tokens per rol (family/size/leading/weight/tracking), niet als één `typography`-token. Style Dictionary verwerkt dat prima; een `$type: typography`-composite is het niet.
- [ASSUMPTION: donkere modus] — licht en donker worden als modes opgezet, maar de schermen worden in licht uitgewerkt; donker wordt op één frame getoetst.
- [ASSUMPTION: beeldmateriaal] — placeholder-vlakken met een variable-gebonden vulling, geen gelicenseerde foto's.

## Acceptatie

**Fase 0 — structuur**
- [ ] De vijf pagina's bestaan met exact de gevraagde namen — bewijs: `figma.root.children.map(p => p.name)` via `figma_execute`
- [ ] Geen bestaande pagina verwijderd — bewijs: paginalijst vóór en ná naast elkaar

**Fase 1 — foundations**
- [x] Elke semantische variable is een alias naar een `Core/*`-variabele, nul directe waarden — bewijs: 198 van 198 alias-waarden, 0 rauw (`figma_execute`, 2026-09-11)
- [x] Geen alias-ketens: elke semantische alias wijst rechtstreeks naar Core, niet naar een andere rol — bewijs: 198 van 198 naar de Core-collectie, 0 naar Semantic (`figma_execute`)
- [x] Licht en donker zijn twee modes binnen één collectie, niet twee collecties — bewijs: `Semantic [light, dark]` naast `Core [value]` (`figma_execute`)
- [x] De neutrale schaal draagt alle stappen 50 t/m 950 — bewijs: 11 namen `color/neutral/50`…`950` (`figma_get_variables`, summary)
- [x] Alle variable-namen zijn kebab-case — bewijs: 199 van 199; de regex is tweezijdig getoetst (`Color/Neutral/50`, `surface_page`, `type/uiBody/size` afgekeurd · `surface/page` doorgelaten)
- [x] Elke kleur-primitief is een COLOR-waarde, hex-herleidbaar — bewijs: 57 COLOR-tokens, hex uitgeschreven op het kleurblad (`figma_execute` + screenshot `1:211`)
- [x] Het moodboard-frame staat op `04 — Explorations` — bewijs: `figma_capture_screenshot` van pagina `1:5`
- [x] `figma_export_tokens` is hier géén geldig bewijs — bewijs: levert `collections: []` bij `success: true`, terwijl `figma_get_variables` 199 variables in 2 collecties ziet (positieve controle, 2026-09-11)
- [ ] De werkelijke export via de Tokens Studio-plugin — `[NIET TE VERIFIËREN — plugin niet aanwezig in deze sessie; de structurele voorwaarden zijn wel gemeten]`

**Fase 2 — timeline-item**
- [ ] De component set draagt 8 varianten: type (photo/maintenance/story/milestone) × layout (compact/wide) — bewijs: telling `componentSet.children.length` + `variantGroupProperties`
- [ ] De verbindende lijn zit ín het component, niet op het scherm — bewijs: de lijn-node komt voor in `component.findAll()`, niet als sibling op het scherm
- [ ] Datum-behandeling is identiek over alle vier de types — bewijs: per variant de naam, `fontSize`, gebonden text-variable en positie van de datum-node naast elkaar
- [ ] `year-divider` bestaat als eigen component — bewijs: `figma.currentPage.findOne(n => n.type === 'COMPONENT' && n.name === 'year-divider')`

**Fase 3 — tijdlijn-scherm**
- [ ] Mobiel gevuld draagt ≥ 12 items, alle vier de types, ≥ 1 jaarscheiding — bewijs: telling van instances per variant op het frame
- [ ] Elk tijdlijn-item op elk scherm is een INSTANCE van de component set, nergens nagebouwd — bewijs: `findAll(n => n.type === 'INSTANCE')` + `mainComponent.parent.id` vergelijken met de set-id, mét noemer
- [ ] Mobiele frames meten 390×844 — bewijs: `width`/`height` per frame op `02 — Mobile`
- [ ] Desktopframes meten 1440 breed — bewijs: `width` per frame op `03 — Desktop`
- [ ] De lege staat toont de geboortekaart en minstens één ingang tot toevoegen — bewijs: screenshot van het frame
- [ ] Nul lorem ipsum in de schermen — bewijs: regex `lorem|ipsum|dolor sit` over alle TextNodes, mét noemer

**Fase 4 en 5**
- [ ] Het eigenaarsketen-blok bestaat in twee staten: meerdere eigenaars en precies één — bewijs: twee frames, screenshot van beide
- [ ] Geen enkele TextNode toont een volledig chassisnummer — bewijs: regex op 17-teken VIN-vorm over alle TextNodes in het bestand, mét noemer
- [ ] Elk van de drie ruwe schermen draagt een verantwoording van de platformkeuze — bewijs: de tekst in het eindrapport, per scherm één regel
- [ ] Het tweeling-onderdeel is volledig afgewerkt, inclusief de ring verwante auto's — bewijs: screenshot

**Fase 6 — doorlopende constraints**
- [ ] Elke fill en elke tekststijl op `01/02/03` is gebonden aan een variable — bewijs: scan op `boundVariables` per node, afwijkingen als tabel node/waarde/voorgestelde token, mét noemer
- [ ] Geen enkele node op `01/02/03` bindt rechtstreeks aan een `Core/*`-variabele — bewijs: scan van elke `boundVariables`-id tegen de Core-collectie-id, mét noemer
- [ ] Elk frame en elke component is auto-layout — bewijs: telling `layoutMode !== 'NONE'` over alle FRAME/COMPONENT-nodes, mét noemer
- [ ] Alle componentnamen zijn Engels — bewijs: naamlijst van alle COMPONENT/COMPONENT_SET-nodes, handmatig gelezen
- [ ] Nul persoonlijke voornaamwoorden in UI-copy — bewijs: regex `\b(je|jij|jouw|jouw?e|u|uw|ik|mijn|we|wij|ons|onze)\b` over alle TextNodes, mét noemer
- [ ] **States:** elk datascherm draagt vier frames — gevuld, leeg, laden en fout — bewijs: framenamen per scherm tellen op `02 — Mobile` en `03 — Desktop`, mét noemer
- [ ] **Interactie:** de timeline-item component set draagt exact twee variant-assen, geen state-as — bewijs: `variantGroupProperties` van de set, verwacht precies de sleutels `type` en `layout`


**Fase 6 — maat en overloop (impeccable's `type,layout`-regels, in Figma-medium)**

Het instrument `impeccable detect` werkt op lokale bestanden en gerenderde pagina's, niet op Figma-frames — hier is er dus geen detector. Wat wél kan is de regels overnemen en zelf meten, zodat de code-versie later niets nieuws hoeft te repareren.

- [ ] Geen `story-body`-blok boven 80 tekens per regel — bewijs: per TEXT-node regels = `height / leading`, tekens/regel = `characters.length / regels`, mét noemer (impeccable `line-length`; de ondergrens 45 geldt niet op 390 px, zie Aannames)
- [ ] Geen tekst loopt buiten de binnenbreedte van zijn ouder — bewijs: tekstbreedte tegen `parent.width − paddingLeft − paddingRight`, nooit tegen de framebreedte, mét noemer (impeccable `text-overflow`)
- [ ] Geen kaart-in-kaart-in-kaart — bewijs: maximale nestingdiepte van frames die zowel een eigen `surface/*`-fill als een stroke dragen, verwacht ≤ 2 (impeccable `nested-cards`)
- [ ] Geen krappe padding — bewijs: elk frame met een eigen `surface/*`-fill heeft padding ≥ `space/sm` (12), telling mét noemer (impeccable `cramped-padding`)

## Beslissingsgeschiedenis

- 2026-09-11: briefing aangemaakt. Conceptwerk in Figma, expliciet zonder code en zonder eigen repo; de variable-structuur is de latere bron voor `tokens.json` via Tokens Studio.
- 2026-09-11: vier open vragen beantwoord. De keuze voor alle vier de toestanden op elk datascherm vergroot Fase 3 en 5 met ongeveer acht frames; scope bewust verruimd.
- 2026-09-11: Fase 1 gebouwd. Twee families gekozen na meting van 2205 beschikbare families: Fraunces (karakter) en IBM Plex Sans (rust). Een derde, mono-family voor typeplaatje en chassisnummer is overwogen en afgewezen — de opdracht zegt twee families; `ui-caps` op IBM Plex Sans met tracking 1,2 draagt dat register.
- 2026-09-11: impeccable's `type,layout`-regels als acceptatie-items opgenomen na de vraag of het instrument hier bruikbaar is. Het instrument zelf niet: `impeccable detect` leest DOM en gerenderde pagina's, en er is geen render-pad van Figma naar een URL. De regels wel — `line-length` bepaalde de 620 px verhaalkolom.
