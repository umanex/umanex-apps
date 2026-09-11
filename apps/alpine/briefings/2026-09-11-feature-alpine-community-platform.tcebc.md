# Alpine A110 community-platform — conceptueel design

- **Datum:** 2026-09-11
- **Type:** feature
- **Project:** alpine (nieuw, nog geen code)
- **Klant:** umanex (eigen product / conceptwerk)
- **Status:** gebouwd — 2026-09-11. Niet `gevalideerd`: één acceptatie-item vraagt de Tokens Studio-plugin, die in deze sessie niet bestond. Alle andere 52 items staan afgevinkt mét bewijs.

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
- [GEMETEN 2026-09-11: tekst is per instance te overschrijven] Een `characters`-override op een tekstnode binnen een instance komt aan en leest terug — Fase 3 heeft dus geen component properties nodig om twaalf items met eigen inhoud te vullen.
- [AFWIJKING 2026-09-11: `year-divider` is een set, geen los component] De opdracht vraagt één component; twee platformen vragen twee breedtes. Eén as `layout=[compact, wide]`, verder identiek.
- [ASSUMPTION: donkere modus] — licht en donker worden als modes opgezet, maar de schermen worden in licht uitgewerkt; donker wordt op één frame getoetst.
- [ASSUMPTION: beeldmateriaal] — placeholder-vlakken met een variable-gebonden vulling, geen gelicenseerde foto's.

## Acceptatie

**Fase 0 — structuur**
- [x] De vijf pagina's bestaan met exact de gevraagde namen — bewijs: `namesMatchExactly: true` uit dezelfde `figma_execute`-call die ze aanmaakte (2026-09-11)
- [x] Geen bestaande pagina verwijderd — bewijs: `pagesDeleted: 0`; de lege standaardpagina `Page 1` is hernoemd, niet verwijderd

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
- [x] De component set draagt 8 varianten: type (photo/maintenance/story/milestone) × layout (compact/wide) — bewijs: `variantGroupProperties` geeft exact `{type: [...4], layout: [...2]}`, 8 children (`figma_execute`, 2026-09-11)
- [x] De verbindende lijn zit ín het component, niet op het scherm — bewijs: `rail-line` zit in elke variant; zes gestapelde instances geven 5 gaten van 0 px, en de tegenproef (`itemSpacing = 8`) maakt er 5 van 8 px van — de nul beweegt dus mee met het object
- [x] Datum-behandeling is identiek over alle vier de types — bewijs: 8 van 8 varianten `fontSize 12`, rol `text/muted`, afstand van datummidden tot markermidden **0** op alle acht
- [x] `year-divider` bestaat als eigen component — bewijs: `COMPONENT_SET · year-divider` met as `layout=[compact, wide]` op `01 — Components`
- [x] De vier types verschillen in ritme — bewijs: gemeten hoogtes compact/wide — maintenance 94/94, story 282/198, milestone 270/226, photo 322/402
- [x] Geen enkele node in beide sets bindt aan `Core/*` — bewijs: 0 treffers over alle 34 frames en 32 tekstnodes
- [x] Token-dekking in beide sets — bewijs: fills 56 van 56, strokes 8 van 8, tekst-eigenschappen 32 van 32 (alle vijf per node), auto-layout 34 van 34

**Fase 3 — tijdlijn-scherm**
- [x] Mobiel gevuld draagt ≥ 12 items, alle vier de types, ≥ 1 jaarscheiding — bewijs: 13 items (photo 3 · maintenance 5 · story 3 · milestone 2) en 9 jaarscheidingen (`figma_execute`, 2026-09-11)
- [x] Elk tijdlijn-item op elk scherm is een INSTANCE, nergens nagebouwd — bewijs: 46 instances van `timeline-item` en 29 van `year-divider` over `02` en `03`, **0 vreemde instances**; de enige eigen rail-rijen zijn `invitation` (2) en `skeleton` (8), die per ontwerp geen gedateerde gebeurtenis dragen
- [x] Mobiele frames meten 390×844 — bewijs: 4 van 4 toestelframes; de scroll-uitrol (390×3533) staat er los naast en draagt dat in zijn naam
- [x] Desktopframes meten 1440 breed — bewijs: 4 van 4
- [x] De lege staat toont de geboortekaart en een ingang tot toevoegen — bewijs: screenshot van `03 · Tijdlijn — leeg` (1:1678) en `02 · Tijdlijn — leeg` (1:1258)
- [x] Nul lorem ipsum in de schermen — bewijs: 0 van 429 tekstnodes
- [x] Vier toestanden per platform — bewijs: `gevuld · leeg · laden · fout` op beide pagina's, 4 van 4 elk

**Fase 4 — autoprofiel en geboortekaart**
- [x] Het eigenaarsketen-blok bestaat in twee staten: meerdere eigenaars en precies één — bewijs: `Autoprofiel — gevuld` draagt 3 instances in `keten`, `Autoprofiel — één eigenaar` draagt er 1, op beide platformen (`figma_execute`, 2026-09-11)
- [x] De geboortekaart is als certificaat uitgevoerd, niet als specificatietabel — bewijs: dubbele rand (buitenkader + binnenkader), gecentreerde as, eigen typografie-rol `type/certificate` (64/72), zegel met `border/critical`, en twee exportacties buiten het kader — screenshot `1:1928` en `1:2594`
- [x] De geboortekaart draagt productiedatum, fabriek en oorspronkelijke specificaties — bewijs: 10 velden, twee kolommen op desktop, één op mobiel
- [x] Specificaties staan eronder, feitelijk en rustig — bewijs: apart blok `specificaties`, 6 rijen label/waarde met haarlijn, geen kader en geen accentkleur
- [x] Er is een ingang naar de tijdlijn en naar de tweeling — bewijs: `ingang-tijdlijn` en `ingang-tweeling` op elk van de acht autoprofiel-frames
- [x] Vier toestanden per platform — bewijs: `gevuld · één eigenaar · laden · fout` op `02` en `03`; **`één eigenaar` staat op de plek van de lege staat**, omdat een autoprofiel nooit leeg kan zijn: de geboortekaart is er vanaf dag één

**Fase 5 — snel-invoer, register, community-feed, tweeling**
- [x] Elk van de drie ruwe schermen draagt een verantwoording van de platformkeuze — bewijs: snel-invoer mobiel (kernactie onderweg) · register desktop (doorbladeren met filters) · community mobiel (nabijheid en meldingen); één regel per scherm in het Fase 5-rapport
- [x] Snel-invoer is het paneel over de tijdlijn dat bij vraag 1 gekozen is — bewijs: `scrim` + `paneel` absoluut onderaan, met de gevulde tijdlijn eronder zichtbaar, op alle vier de frames
- [x] Het register maskeert elk chassisnummer — bewijs: 10 wagens, alle met `···· ####`, en **0 van 1643** tekstnodes matcht de 17-teken VIN-vorm
- [x] Het register draagt filters op bouwjaar, kleur, uitvoering en land — bewijs: vier filter-controls in `filters`, met `BOUWJAAR 1973 — 1977` actief
- [x] Elke auto in het register leidt naar zijn tijdlijn — bewijs: `TIJDLIJN →` op elke van de 10 rijen
- [x] De community-feed staat niet náást de tijdlijn maar ís er een — bewijs: elk feed-item is een INSTANCE van `timeline-item`, voorafgegaan door een `herkomst`-rij op dezelfde rail; de lijn loopt door over de hele stroom
- [x] Het tweeling-onderdeel is volledig afgewerkt, inclusief de ring verwante auto's — bewijs: `03 · De tweeling` (1440×2143) met gedeelde oorsprong, twee uiteenlopende kolommen van elk 4 items, en 6 verwante wagens met gedeelde-kenmerken-telling
- [x] Vier toestanden per scherm — bewijs: snel-invoer `begin · ingevuld · opslaan · fout`, register `gevuld · leeg · laden · fout`, community `gevuld · leeg · laden · fout`

**Fase 6 — doorlopende constraints** *(tussenstand na Fase 5, hermeten bij de eindronde)*
- [x] Elke fill en elke tekststijl op `01/02/03` is gebonden aan een variable — bewijs: fills **2690 van 2690**, strokes **325 van 325**, tekst-eigenschappen **1643 van 1643**
- [x] Geen enkele node op `01/02/03` bindt rechtstreeks aan een `Core/*`-variabele — bewijs: **0** treffers
- [x] Elk frame en elke component is auto-layout — bewijs: **1721 van 1721**
- [x] Alle componentnamen zijn Engels — bewijs: 12 namen gelezen
- [x] Nul persoonlijke voornaamwoorden in UI-copy — bewijs: **geen** treffer over 1643 tekstnodes
- [x] Geen enkele TextNode toont een volledig chassisnummer — bewijs: **0 van 1643**
- [x] **States:** elk datascherm draagt vier frames — bewijs: 5 schermen × 4 toestanden over `02` en `03`
- [x] **Interactie:** de component set draagt exact twee variant-assen, geen state-as — bewijs: `variantGroupProperties` = `{type, layout}`

**Fase 6 — maat en overloop (impeccable's `type,layout`-regels, in Figma-medium)**

Het instrument `impeccable detect` werkt op lokale bestanden en gerenderde pagina's, niet op Figma-frames — hier is er dus geen detector. Wat wél kan is de regels overnemen en zelf meten, zodat de code-versie later niets nieuws hoeft te repareren.

- [x] Geen `story-body`-blok boven 80 tekens per regel — bewijs: **42 gemeten, 0 boven 80, max 77**. Na Fase 5 stonden er twee op 132 en 91 (de foutmelding van het register over 1150 px, de intro van de tweeling over 1248 px); de gemeten leesmaat staat nu als `maxWidth: 620` op elke verhaaltekst, dus dit kan niet stil terugkomen
- [x] Geen tekst loopt buiten de binnenbreedte van zijn ouder — bewijs: **0 van 1643**; onderweg gemeten op 12/222, 1/968 en 1/1643, telkens hersteld
- [x] Geen frame klipt een kind weg — bewijs: **0 van 1602**. Dit instrument is er bijgekomen omdat het rij-instrument het `EIGEN DOSSIER`-label niet zag: `kop` hugt zijn inhoud, dus de overloop zat tegen de *ouder* en niet tegen de eigen breedte
- [x] Geen kaart-in-kaart-in-kaart — bewijs: maximale diepte **2**. Twee keer aangescherpt: een dubbele-randwikkel telt niet mee, en een pil (radius `full`) is geen kaart
- [x] Geen krappe padding — bewijs: **0 van 61** inhoudskaders

## Beslissingsgeschiedenis

- 2026-09-11: briefing aangemaakt. Conceptwerk in Figma, expliciet zonder code en zonder eigen repo; de variable-structuur is de latere bron voor `tokens.json` via Tokens Studio.
- 2026-09-11: vier open vragen beantwoord. De keuze voor alle vier de toestanden op elk datascherm vergroot Fase 3 en 5 met ongeveer acht frames; scope bewust verruimd.
- 2026-09-11: Fase 1 gebouwd. Twee families gekozen na meting van 2205 beschikbare families: Fraunces (karakter) en IBM Plex Sans (rust). Een derde, mono-family voor typeplaatje en chassisnummer is overwogen en afgewezen — de opdracht zegt twee families; `ui-caps` op IBM Plex Sans met tracking 1,2 draagt dat register.
- 2026-09-11: impeccable's `type,layout`-regels als acceptatie-items opgenomen na de vraag of het instrument hier bruikbaar is. Het instrument zelf niet: `impeccable detect` leest DOM en gerenderde pagina's, en er is geen render-pad van Figma naar een URL. De regels wel — `line-length` bepaalde de 620 px verhaalkolom.
- 2026-09-11: Fase 2 gebouwd. Maten vastgelegd: compact 350 breed (rail 40 + gap 12 + inhoud 298), wide 700 (rail 56 + gap 24 + inhoud 620 — precies de gemeten leesmaat). Ritme per type via de verticale padding van de inhoudskolom: maintenance 16, photo 16, story 24, milestone 32.
- 2026-09-11: Fase 3 gebouwd, acht schermen. Tijdlijn staat **nieuwste bovenaan**: nieuwe invoer schuift boven de vorige, en de geboortekaart is het anker onderaan. Mobiel krijgt naast de vier toestelframes één scroll-uitrol van 390×3533, omdat 13 items met 9 jaarscheidingen niet in 844 px passen en de opdracht die hoogte vastlegt.
- 2026-09-11: de zwevende actieknop op mobiel is vervangen door een actie ín de onderbalk. Reden: hij bedekte permanent inhoud (gemeten op twee frames) en was het meest app-achtige element op een verder rustig scherm.
- 2026-09-11: Fase 4 gebouwd, acht schermen. Nieuwe typografie-rol `type/certificate` (display 64/72, tracking tight-lg) — de geboortekaart vraagt een trap boven `display`, en een rauwe waarde was geen optie.
- 2026-09-11: de eigenaarsketen hergebruikt de `type=story`-variant van het tijdlijn-component. Reden: een eigenaarsketen ís een chronologie, en zo hangt ook het autoprofiel aan dezelfde ruggengraat in plaats van ernaast te staan.
- 2026-09-11: de foutstaat van het autoprofiel toont de geboortekaart **volledig**. Die is lokaal; alleen de eigenaarsketen komt van de server. Een dossier dat je bij je hebt, valt niet weg omdat het netwerk wegvalt.
- 2026-09-11: Fase 5 gebouwd op hetzelfde detailniveau als de vorige fases, op verzoek — dertien schermen in plaats van drie ruwe. Platformkeuze: snel-invoer mobiel, register desktop, community mobiel, tweeling desktop.
- 2026-09-11: de community-feed is opgebouwd uit instances van `timeline-item` met een `herkomst`-rij erboven op dezelfde rail. Dat is het antwoord op "zoek de verbinding": de feed is dezelfde chronologie, maar over auto's heen in plaats van binnen één.
- 2026-09-11: nieuwe rollen `color/scrim` + `surface/scrim` (rgba, 55%) voor het paneel over de tijdlijn — een ongebonden `opacity` op een node was de alternatieve route en die zou de kleur buiten de tokenlaag brengen.
- 2026-09-11: Jeroen meldde tijdens deze fase dat het platform vooral op de moderne A110 en de A290/A390 mikt. Alle demo-inhoud staat op een klassieke A110 uit 1973. Vastgelegd in `apps/alpine/BACKLOG.md`; het concept houdt stand, de inhoud demonstreert de randgevallen.
- 2026-09-11: A290-proef gedraaid op verzoek — `03 · Autoprofiel — A290 (proef)` met bevindingenpaneel. De geboortekaart en de specificaties houden stand zonder wijziging aan componenten of tokens; het type `maintenance`, de eigenaarsketen-standaard, de tweeling en de tijdlijn-dichtheid niet. Vier items in `apps/alpine/BACKLOG.md`.

## Fase 6 — eindcontrole

- [x] Alle kleur en typografie loopt via variables — bewijs: **0 afwijkingen van 5094 nodes** over `01/02/03`, gemeten per property (`fills`, `strokes`, `fontFamily`, `fontSize`, `lineHeight`, `fontWeight`, `letterSpacing`). Tegenproef: één fill losmaken geeft 1, herstellen geeft 0
- [x] Geen enkel scherm of component bindt rechtstreeks aan een `Core/*`-primitief — bewijs: **0 afwijkingen**. Tegenproef: één markering aan een Core-kleur hangen geeft **26** (de binding plant zich via het component voort naar alle instances), herstellen geeft 0
- [x] De tijdlijn-component is overal hergebruikt en nergens nagebouwd — bewijs: **252 instances, 0 ontkoppeld, 0 nagebouwd**. Tegenproef: één instance loskoppelen geeft 1 nagebouwd, herstellen geeft 0. De 20 eigen rail-rijen (`invitation`, `skeleton`, `herkomst`) dragen per ontwerp geen gedateerde gebeurtenis en tellen niet mee
- [x] Geen tekst loopt buiten zijn kolom of wordt weggeklipt — bewijs: **0 van 2044** tekstoverloop, **0 van 1916** klippende frames
- [x] Geen verhaaltekst boven 80 tekens per regel — bewijs: **54 gemeten, 0 boven 80, max 77**

## Beslissingsgeschiedenis (vervolg)
- 2026-09-11: Fase 6 gedraaid. Drie gevraagde controles, elk met een tegenproef die aantoont dat ze rood kunnen worden. Eén eigen fout onderweg: de tegenproef voor hergebruik gebruikte `detachInstance()` gevolgd door `remove()`, wat twee instances definitief uit `02 · Tijdlijn — gevuld (volledige scroll)` verwijderde. De check meldde "hersteld" omdat hij de *teller* controleerde en niet het *object*. Hersteld tegen het toestelframe als ijkpunt (22 kinderen, identieke volgorde, hoogte 3609, rail-gaten nul). Voortaan: kloon-detach-meten-verwijderen, nooit het origineel.
- 2026-09-11: tijdens Fase 6 bleek een tweede Figma-bestand ("Partner Fleet Portal") de Bridge-plugin te hebben overgenomen als actief doelwit. Een hernoem-actie viel om op het opzoeken van de pagina, dus vóór elke schrijfactie; nul vreemde nodes achtergebleven. Sindsdien staat `figma.fileKey !== 'P552u2mCWH04IEMgnkUGyN'` als eerste regel in elke schrijf-call.
- 2026-09-11: bevinding 04 uit de A290-proef ingetrokken na correctie van Jeroen — laadsessies en routineritten zijn geen gebeurtenissen in deze applicatie. Het dichtheidsprobleem waar ik een bundelmechanisme voor bouwde bestond alleen in mijn eigen aanname. `timeline-cluster` omgebouwd naar fotobundels (de echte behoefte: één rit, twintig foto's), de vier "dicht"-schermen vervangen door vier A290-tijdlijnschermen met normale dichtheid, en een geopende bundel toont een raster miniaturen in één rij in plaats van twintig rail-entries.
