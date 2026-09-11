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

1. **Component-typologie snel-invoer** — wordt het toevoegen van een gebeurtenis een bottom sheet over de tijdlijn (minste stappen, mobiele kernactie), een volledig scherm, of een inline-compositie bovenaan de tijdlijn? De opdracht zegt "zo weinig mogelijk stappen" maar niet welke vorm.
2. **States** — de tijdlijn krijgt expliciet gevuld + leeg. Vallen loading en error af voor dit conceptwerk, of horen ze er bij het register (netwerk-afhankelijk doorbladeren) en de snel-invoer (upload) wél bij?
3. **Interactie-modaliteit** — blijven het statische concept-frames, of horen hover/pressed/focus als varianten in de timeline-item component set? Dat verdubbelt de variant-as en is voor een concept niet vanzelfsprekend.
4. **Eigen brandnaam** — het merk staat los van umanex, maar heeft nog geen naam. Blijft "Alpine" de werknaam in collectie- en tokennamen, of komt er een eigen productnaam (die later de tokens.json-prefix wordt)?

## Aannames

- [ASSUMPTION: type = `feature`] — het werk kruist meerdere schermen, twee platformen en een foundations-laag; geen enkel scherm draagt het alleen.
- [ASSUMPTION: doelgroep] — A110-eigenaars, wereldwijd, hobbyist tot verzamelaar; de emotionele waarde van het object weegt zwaarder dan taak-efficiëntie.
- [ASSUMPTION: datamodel] — één datamodel over beide platformen; een gebeurtenis draagt datum, type, korte tekst, optioneel foto's, optioneel kosten/kilometerstand bij maintenance.
- [ASSUMPTION: donkere modus] — licht en donker worden als modes opgezet, maar de schermen worden in licht uitgewerkt; donker wordt op één frame getoetst.
- [ASSUMPTION: beeldmateriaal] — placeholder-vlakken met een variable-gebonden vulling, geen gelicenseerde foto's.

## Acceptatie

**Fase 0 — structuur**
- [ ] De vijf pagina's bestaan met exact de gevraagde namen — bewijs: `figma.root.children.map(p => p.name)` via `figma_execute`
- [ ] Geen bestaande pagina verwijderd — bewijs: paginalijst vóór en ná naast elkaar

**Fase 1 — foundations**
- [ ] Elke semantische variable is een alias naar een `Core/*`-variabele, nul directe waarden — bewijs: telling `valuesByMode` van type `VARIABLE_ALIAS` over de semantische laag (`figma_get_variables`), mét noemer
- [ ] Licht en donker zijn twee modes binnen één collectie, niet twee collecties — bewijs: `collection.modes.length === 2` op de semantische collectie
- [ ] De neutrale schaal draagt alle stappen 50 t/m 950 — bewijs: naamlijst van de `Core/neutral/*`-variabelen
- [ ] Alle variable-namen zijn kebab-case — bewijs: regex `^[a-z0-9/-]+$` over elke naam, mét noemer
- [ ] Elke kleur-primitief is opgeslagen als hex-herleidbare COLOR-waarde — bewijs: type-telling over `Core/color/*`
- [ ] Het moodboard-frame staat op `04 — Explorations` — bewijs: `figma_capture_screenshot` van het frame
- [ ] Exporteerbaarheid via Tokens Studio expliciet gerapporteerd, inclusief wat niet meekomt — bewijs: `figma_export_tokens` draaien en de uitkomst tegen de gemaakte structuur leggen

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
- [ ] **States:** open vraag 2 is beantwoord en elke state die van toepassing blijft, is ontworpen; wat afvalt staat hier met reden — bewijs: deze regel ingevuld vóór Fase 6 sluit
- [ ] **Interactie:** open vraag 3 is beantwoord; blijft het statisch, dan staat hier `n.v.t. — statische concept-frames, geen interactieve varianten` — bewijs: deze regel ingevuld vóór Fase 6 sluit

## Beslissingsgeschiedenis

- 2026-09-11: briefing aangemaakt. Conceptwerk in Figma, expliciet zonder code en zonder eigen repo; de variable-structuur is de latere bron voor `tokens.json` via Tokens Studio.
