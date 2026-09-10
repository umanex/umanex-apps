# UX-audit — SODAplus digitaal attituderapport, wireframes (revisie van 2026-08-25)

| | |
|---|---|
| **Geaudit** | Figma `Soda+` (`XwEUhY92XX32sQkEIdbEFN`), pagina "Wireframes": cover (50:52), Sectie 1 "Leerling — de opdracht" (01–08), Sectie 2 "Schoolzijde — daarna" (09–10), Sectie 3 "Archief" — de gereviseerde set van vanochtend, uitgelezen via de plugin-runtime, niets in deze sessie bewerkt |
| **Datum** | 2026-08-25 |
| **Platform** | mobiel 375×812 (gsm / chromebook in de klas); 10 is desktop 875×700 |
| **Methodiek** | IxDF-framework (7 UX-factoren · 5 usability-karakteristieken · 5 interactie-dimensies), expert-review. Bewijs: verse screenshots + metingen via `figma_execute` (afmetingen, fills, fontsizes, reacties, zichtbaarheid). Drie onafhankelijke lenzen (leerling · beoordelaar/techteam · gedrag & schoolrealiteit), elk adversarieel geweerlegd door een aparte verifier; consolidatie en scoring door de main-agent |
| **Briefing** | `apps/soda-plus/briefings/2026-08-25-flow-attituderapport-revisie.tcebc.md` — de acceptatielijst daarin is als bewering getoetst, niet als feit overgenomen |
| **Context** | praktijkopdracht sollicitatie SODAplus; beoordeeld wordt de video, het board gaat mee als viewlink + PDF; indienen ±5 sept, harde deadline 11 sept |

---

## 1 · Samenvatting

**Score 52 / 85 (61 / 100) — D-grens, drie punten onder C.** De score meet het artefact zoals het er nu staat, niet de kwaliteit van de ideeën: de mechanismen (terugkeerlus, openen op overeenstemming, telling los van lezing, plan uit slots) scoren 4 en zijn het sterkste deel van de inzending. Wat de score drukt is meetbaar en grotendeels goedkoop: één inhoudelijke breuk in doelstelling 2, een handvol beloftes op het scherm zonder vervolg, gemeten toegankelijkheidsgebreken die het bestand letterlijk specificeert, en board-hygiëne die een technisch team als eerste ziet. De P1's plus de S-effort P2's tillen het naar C; de redesign-voorstellen in §7 naar B.

**Top-3 prioriteiten**

1. **P1 — Doelstelling 2 breekt op het board.** 03 vraagt de oorzaak bij de *verwachte* B (Orde); 06 plant het *onverwachte* verschil (Attitude); de oorzaak komt nergens terug en de twee werkpunten waar leerling en school het eens zijn (S, O) krijgen plan noch "waarom". De cover zegt "de leerling kiest er één" — geen scherm laat kiezen. Dit is de doelstelling die de opdracht het meest letterlijk formuleert.
2. **P1 — Section "3 · Archief (niet tonen)" is zichtbaar** als lege grijze band van 1900×1120 px: de frames erin zijn verborgen, de section zelf niet. Het videoscript beweert "wie de viewlink krijgt ziet het niet" — onwaar. Eén klik.
3. **P2 — Het board zegt dingen die het niet doet.** Zeven beloftes zonder vervolg of tegenspraak op het scherm: "dan maken we de afspraak kleiner" (01), "Straks kies je zelf wat je deelt" (03), "weet ik niet" (02), "Nog even niet" (07), "Naar mijn rapport" (08), "CTA's op één hoogte" (briefing, gemeten spreiding 288 px), "Yassine helpt me" (06 → weg op 07/08). Elk is één regel tekst of één reactie; samen zijn ze wat een technisch team "niet uitgedacht" noemt.

**Kernbevinding in één alinea.** De revisie heeft precies gedaan wat de analyse van vanochtend vroeg — H2, H3, H5, H6, H7, M7, M8 en M10 zijn aantoonbaar gedicht — en heeft daarbij één nieuwe breuk gemaakt: door 06 van Orde naar Attitude te schuiven (beslissing 1a) werd de flow uitlegbaar in vier minuten, maar verloor de verwachte B haar plan en de oorzaakstap haar functie. Daaronder ligt een patroon dat over de hele set terugkomt: het board belooft op het scherm meer paden dan het tekent, en de acceptatielijst is afgevinkt op zicht in plaats van op meting — vijf afgevinkte items spreekt het bestand tegen (bijlage A). De leerlingcopy zelf is sterk, Vlaams en op niveau; de fixes zijn overwegend copy, één reactie per scherm en één kleurstap.

---

## 2 · Context, scope en aannames

**Wat.** De volledige leerlingflow 01→08 als één ding, plus de schoolzijde (09–10) als gelabelde hypothese, plus het board als deliverable (cover, captions, prototype, viewlink/PDF).

**Doel.** De leerling schat eerst zijn eigen gedrag in, ziet dan de schoolscore, en komt bij een werkpunt tot een concreet plan vóór het gesprek met de titularis (doelstellingen 1–3 uit de opdracht). Het board moet die keuzes zichtbaar maken voor een beoordelaar die de video intern herbekijkt met zijn technisch team.

**Persona's** — alle drie `[ASSUMPTION]`, afgeleid uit de opdracht, de mail en het oude rapport:

- **Amine B., 16**, klas 5B in technisch/beroepssecundair, Nederlands op A1–A2 (OKAN in het voorbeeld; het ontwerp moet ook voor een klas Bouw werken). Op een gsm of chromebook, met 24 klasgenoten rondom. B is de norm, het oplossingskader bleef drie keer leeg. Vlot op een telefoon, slecht met formulieren.
- **Simon Mensaert + technisch team.** Ontwierp het papieren rapport, werkt met 58 scholen, kiest uit vijf kandidaten voor 0,5–1 dag/week. Beoordeelt probleeminterpretatie, flow, UI/UX-keuzes en de drie doelstellingen. Het team opent de viewlink zonder de video en denkt in Smartschool-integratie.
- **Mevr. Devos, titularis**, en de vakleerkracht Nederlands die de observaties zou leveren. Krijgt wat de leerling deelt en voert het gesprek van 29 januari.

**Aannames en biases van deze audit.** Expert-review zonder gebruikers. De analyse van vanochtend en de revisie kwamen uit dezelfde tooling als deze audit — daarom kreeg elke lens een aparte verifier met de opdracht gedocumenteerde keuzes níet als excuus te aanvaarden zonder nieuw argument, en omgekeerd finders te weerleggen die een bewuste keuze als fout aanmerkten. Wireframe-stadium is meegewogen: grijs, geen merk en ongetekende lege toestanden tellen niet; getallen die in het bestand staan (fontsizes, hexwaarden, y-posities, reacties) wél, want een technisch team leest die letterlijk.

---

## 3 · Zeven UX-factoren

| Factor | Score | Sterktes | Gaps | Bewijs |
|---|---|---|---|---|
| Useful | **4** | 01/05/06 beantwoorden elk één oorzaak van het lege kader; werkt ook zonder OKAN-hypothese | 03 voedt niets; verwachte B's zonder plan (F1) | tekstdump 04–08: geen string uit 03 komt terug |
| Usable | **3** | één vraag, één H1, één CTA per scherm; vast skelet (20 px marge, 335 px content) | dode terugpaden; drie interactiepatronen (tap-advance 01, kies+CTA, hold 04); 05 twee zwarte blokken | 11 reacties, alle vooruit; 2:275 en 50:9 beide `#1f1f1f` 335×51 |
| Findable | **3** | board: genummerde sections, caption onder elk scherm, cover verwijst naar schermnummers | "Mijn rapport" bestaat niet (2:10, 50:37→2:5); na 03 geen positie meer | 50:37 ON_CLICK → 2:5; 2:161 "stappen" op 04 visible:false |
| Credible | **3** | hypothese-vorm op 09/10, "instelbaar per school", ongesourcete cijfers weg; data consistent (Periode 2, kalender 2026, "A → B (A)" klopt met het echte rapport) | zichtbare archiefband; 66 stale laagnamen met de weggewerkte copy; vijf afgevinkte acceptatie-items die het bestand tegenspreekt | 49:5 visible:true; laagnamen 2:359 "5 OKAN", 2:619 "~20 lee…" |
| Desirable | **3** | rustige hiërarchie, ruime witruimte, captions in "Keuze / In plaats van" | "aantrekkelijk" (doelstelling 1) wordt nergens op het board gelezen of beantwoord; alleen in het script | grep board-dump: "aantrekkelijk" 0×, "badge/streak" 0× |
| Accessible | **2** | body 15 px `#6b6b6b` haalt 5,33:1; knoppen 51–53 px; checkbox-rijen 47 px | `#9e9e9e` op wit 2,68:1 / op `#f4f4f4` 2,44:1 voor ≥41 tekstnodes; 29 nodes ≤11 px (8× 9 px); chips 35–37 px; vakjes 17×17 met tik-hint; hold-gesture zonder toetsenbordpad | gemeten via `figma_execute` + WCAG-formule |
| Valuable | **3** | de titularis krijgt een concrete afspraakzin met datum i.p.v. een leeg kader; het board begrenst de scope eerlijk | het board indexeert nergens tegen de drie doelstellingen; wat mevr. Devos krijgt is dun (één zin + één knoplabel) | cover 50:52: geen doelstellingenblok; 07 kaart 2:326 |

**Subtotaal 21 / 35.**

---

## 4 · Vijf usability-karakteristieken

| Karakteristiek | Score | Bewijs |
|---|---|---|
| Effectiveness | **3** | Doelstelling 1 gedragen (02→04). Doelstelling 2 half: plan voor het onverwachte verschil, niet voor de verwachte B; oorzaak (03) zonder gevolg. Doelstelling 3: terugkeer + datum aanwezig, maar "Niet gelukt" heeft geen vervolg |
| Efficiency | **3** | Geteld voor de persona (twee verwachte B's): 26 taps en 8 schermweergaven vóór de onthulling (01: 1 · 02×4: 20 · 03×2: 4 · 04: 1). Bewuste keuze (drie gedragingen per domein), maar 02 belooft "Vier korte vragen, dan je rapport" — per scherm waar, als flow-belofte niet |
| Engagement | **3** | Sterke copy-momenten ("Niet gelukt is ook een antwoord", "Jij mag antwoorden"); eerste feedbackmoment pas op 08. `[GEEN DATA]` over echt gedrag |
| Error tolerance | **3** | Veel uitwegen als volwaardig gelabeld (Niet gelukt, weet ik niet, Ik zie het anders, Nog even niet, mag leeg) — maar per uitweg ontbreekt de uitkomst. 07 is een echte preview-vóór-delen (foutpreventie). Terug-links zonder reactie; 01 navigeert bij één tik zonder correctie |
| Ease of learning | **3** | Vast skelet en leerlingtaal helpen; A/B (02) → werkpunt (03) → dit lukt/werkpunt (04) → "A" (04 body) zonder brug; dezelfde witte knop is op 01 "ga verder" en op 05 "kies" |

**Subtotaal 15 / 25.**

**Utility-check.** De juiste features zijn er voor doelstelling 1 (zelfcheck met gate, voorspelling, onthulling op overeenstemming) en 3 (terugkeerlus, checkdatum, bevestiging). Voor doelstelling 2 is de feature half aanwezig: er is een planbouwer, maar hij hangt aan het verkeerde domein voor de letter van de opdracht ("bij een verwachte B-score"). Usefulness = utility (¾) × usability (3/5): functioneel, met één inhoudelijk gat dat vóór de video dicht moet.

---

## 5 · Vijf interactie-dimensies

| Dimensie | Score | Kernissues |
|---|---|---|
| Words | **3** | Sterk: ik-zinnen, Vlaams register, "mevr. Devos, je titularis" eenmaal geïntroduceerd. Issues: "ze" op 05 is de leerkracht Nederlands maar nergens benoemd; ontwerpersredenering als leerlingtekst op 06 ("Dat werkt beter dan groot en vaag" — afgevinkt item klopt niet); vaktaal op 07 ("inschatting per domein", "aantikte"); 03 en caption 07 overclaimen "jij kiest wat je deelt" |
| Visual representations | **3** | Zwart = geselecteerd én CTA botst op 05 (twee identieke blokken); zwarte rand = invoer op 06 maar alleen-lezen op 07/08; streepjes 2/4 (02) → 3/4 (03) → verborgen (04) voor hetzelfde domein; ALS/DAN zonder picker-affordance |
| Physical / space | **3** | CTA-top van y=458 (08) tot y=746 (05; 15 px van de onderrand, in de home-indicator-zone) — spreiding 288 px terwijl "op één hoogte" afgevinkt is; 28–46 % lege ruimte onder de content; targets onder 44 px (zie Accessible) |
| Time | **3** | 08: "Over 2 weken. Je krijgt een seintje." — kanaal onbenoemd; 01: "check op 15 januari" past in geen van de twee chips van 06 (2 weken / volgende periode); geen tussentijdse bevestiging tussen domein 1 en 4 |
| Behavior | **3** | Hoofdroute volledig bedraad (11 reacties). Hold (ON_PRESS) en Verder navigeren beide naar 05 — of de hold bij loslaten terugspringt is `[NIET TE VERIFIËREN vanuit de plugin]`; 08 "Naar mijn rapport" → 01 toont de oude novemberafspraak; drie 01-antwoorden → identiek 02 |

**Subtotaal 15 / 25. Totaal 52 / 85.**

---

## 6 · Bevindingen (P0 → P3)

Geen P0: niets blokkeert een gebruiker of de inzending. Per bevinding: geschonden framework-items · scherm/node · bewijs · impact · effort · aanbeveling. "Bevestigd" = de onafhankelijke verifier zag hetzelfde bewijs; "afgezwakt/verscherpt" = de prioriteit is na weerlegging bijgesteld en die bijstelling is hier overgenomen.

### P1

**F1 · Doelstelling 2 breekt: de oorzaak van 03 (Orde) voedt het plan van 06 (Attitude) nergens; de verwachte en bevestigde B's (S, O) krijgen plan noch "waarom"** — Useful · Effectiveness · Behavior · `nieuw sinds revisie` · bevestigd door twee verifiers
- Schermen 03, 04, 06, 07, 08 · nodes 2:126, 2:193/2:196, 2:207/2:210, 2:294, 2:342, 50:33, 50:65
- Bewijs: 03 overline "JE DENKT: WERKPUNT BIJ ORDE" met twee aangevinkte oorzaken; 04: S en O beide "werkpunt / werkpunt · Jij en de school zien hetzelfde." zonder telling, lezing of tik; enige uitweg uit 04 is → 05 (Attitude, waar de leerling "dit lukt" dacht) → 06 (Attitude-plan); 07 zet de oorzaak-tik onder WAT WE NIET DELEN; geen string uit 03 komt op 04–08 terug. Cover: "Meerdere werkpunten: de leerling kiest er één" — geen scherm, geen reactie. Opdracht: "Bij een verwachte B-score: nadenken over een praktische oplossing" en "Vooral wanneer een leerling een B-score krijgt, is het belangrijk dat wordt verduidelijkt waarom".
- Impact: de leerling doet op 03 werk dat nergens terugkomt — precies het "nepwerk"-argument dat caption 03 tegen het alternatief gebruikt — en plant het domein waarvan hij dacht dat het lukte. Voor Simon: een plan voor een A-verwachting terwijl de brief een plan bij een B-verwachting vraagt; wie 03 en 06 naast elkaar legt ziet de sprong (het script zegt bij 03 "daar kom ik op terug" en komt er niet op terug).
- Effort M (kiesstap) / S (regels). Aanbeveling: zie §7.1. Minimaal vóór de video: op 08 en de cover de regel "Op tijd en spullen: jij en de school eens — bewaard voor het gesprek en periode 3", op 04 per S/O-kaart één regel wat de school zag, en op 06 de 03-keuze terughalen als eerste ALS-suggestie.

**F2 · Section "3 · Archief (niet tonen)" is zichtbaar als lege grijze band; het script beweert het tegendeel; het acceptatie-item is afgevinkt op de frames, niet op de section** — Credible · Findable · Words · `nieuw sinds revisie` · verscherpt door beide verifiers
- Node 49:5 · bewijs: `visible:true`, fill `#ebebeb`, 1900×1120; alle vier kinderen (2:399, 2:442, 2:445, 2:479) `visible:false`; capture toont een lege band. Sectienamen renderen op het canvas, dus de viewlink-kijker leest een instructie-aan-jezelf boven niets. Videoscript §Opname: "Het archief is verborgen; wie de viewlink krijgt ziet het niet." De verborgen frames dragen nog "DW2/DW3/DW4", "Periode 3/4" en "Vier gelijktijdige problemen is de definitie van hulpeloosheid"; of die via het lagenpaneel in view-only leesbaar zijn is `[aanname, niet gemeten]`.
- Impact: leest als onafgewerkt en als "er is meer dan je mag zien" — het tegendeel van de voorspelbaarheid die 0,5 dag/week vraagt.
- Effort S. Aanbeveling: section 49:5 zelf op `visible:false` en hernoemen naar "Archief"; beter: kopie van het bestand als privé-archief en de section uit het gedeelde bestand halen ("niets verwijderen" blijft via de kopie gerespecteerd). Script-regel corrigeren. Viewlink in een privévenster controleren: de band mag niet meer bestaan.

### P2

**F3 · CTA's staan op zeven hoogtes (y=458–746, spreiding 288 px); op 05 valt de CTA in de 34 px-zone onderaan; afgevinkt item "CTA's op één hoogte" klopt niet** — Physical/space · Credible · bevestigd
- Gemeten CTA-top in framecoördinaten: 02 634 · 03 651 · 04 709 · 05 746 (onderkant 797/812) · 06 662 · 07 466 (+ Nog even niet 529) · 08 458 · 01 laatste knop 561. Lege ruimte onder de content 28–46 %. Briefing CONSTRAINTS "CTA's gepind op dezelfde hoogte", acceptatie `[x]`.
- Impact: in Present-mode springt de knop per klik; op een echte iPhone ligt 05's CTA onder de home-indicator; een team dat "gepind" leest bouwt een sticky footer die het board niet toont.
- Effort S. Kies: (a) sticky CTA-zone y=727–778 op alle schermen incl. 01, body scrollt; of (b) "CTA volgt de content" en het item terugzetten op `[ ]`. 05 in beide gevallen 34 px omhoog.

**F4 · Dode controls in het prototype en één ongespecificeerd pad: 7× "‹ Terug" + "‹ Mijn rapport", "Nog even niet", "sluiten", "Bevestig klas"; "Nog even niet" staat in geen van beide media** — Behavior · Error tolerance · bevestigd (drie lenzen)
- Gemeten: 11 reacties in de set, alle vooruit; topbars en Terug-teksten (2:10, 2:38, 2:118, 2:159, 2:228, 2:287, 2:321, 50:15) 0 reacties; 2:348 "Nog even niet" 0 reacties, geen scherm, geen regel over wat er met het plan gebeurt; analyse M9 beloofde "één zin per pad in de video" en het script noemt "Nog even niet" niet (grep: 0). Sectie 2 zonder flow is gedocumenteerd — prima, mits caption 09 het zegt.
- Impact: Simon die 05 nog eens wil bekijken klikt op niets; de bange leerling die uitstelt — het meest waarschijnlijke pad voor deze persona — staat stil, en mevr. Devos komt onvoorbereid het gesprek in (het probleem uit de opdracht).
- Effort S. Elke topbar één ON_CLICK → Back (vijf minuten). "Nog even niet": vijfde cover-toestand "plan bewaard, herinnering twee dagen vóór het gesprek; niet gedeeld op 29 jan = mevr. Devos ziet alleen de scores" + één zin in het script + knop in het prototype naar 01 zodat de klik niet dood is.

**F5 · "Mijn rapport" bestaat niet: "‹ Mijn rapport" (01) en "Naar mijn rapport" (08 → 01); de lus toont in Present-mode de oude novemberafspraak; en of het overzicht de scores vóór de zelfcheck toont bepaalt of de poort van doelstelling 1 standhoudt** — Findable · Behavior · Credible · bevestigd
- Gemeten: 2:10 geen reactie; 50:37 ON_CLICK → 2:5 ("Eerst je vorige afspraak … in november", Periode 2); grep "rapport" op de zichtbare secties: geen overzichtsframe. "‹ Mijn rapport" stond al in analyse M8 en is niet opgelost; de 08-CTA is nieuw. Cover-toestand "Periode nog niet vrijgegeven … geen leeg dashboard" bevestigt dat er een dashboard bedoeld is, zonder te zeggen wat het vóór de zelfcheck toont.
- Effort S. Hernoem 50:37 naar "Klaar" en laat 08 de flow beëindigen (of naar 01 met caption "periode 3 opent op déze afspraak"); één cover-regel: "Mijn rapport toont de scores van een periode pas na de zelfcheck van die periode." Of teken één 00-overzicht (vier domeinen × periode 1–2, lopende afspraak) als bestemming van beide links.

**F6 · 66 van 257 zichtbare tekstlagen dragen de oude copy als laagnaam — inclusief precies wat de revisie wegwerkte** — Credible · `nieuw sinds revisie` · verscherpt
- Gemeten (`autoRename:false`, naam ≠ tekst): 2:359 "5 OKAN · dinsdag 13 jan", 2:485 "Klassenraad · 5 OKAN", 2:619 "Een klassenraad doet ~20 lee…", 2:398 "Wie alleen de leerlingflow h…", 2:614 "Gesprek verplicht bij 2+ B's", 2:504 "T.O.V. DW2", 2:566 "Verplaats naar Duiding", 2:183 "Vier periodes op rij. Dat is", 2:197/2:211 "Je zag het zelf ook aankomen", 2:334 "Ik durf niet antwoorden als", 2:148 "Dit blijft van jou", 2:182/2:196/2:210 "A"/"B" (tekst "dit lukt"/"werkpunt"), 50:37 "btn/Delen met mevr. Devos" (tekst "Naar mijn rapport"), frame 2:223 "hoe hij het las" (scherm zegt "ze"), 8× "Periode 3". Het lagenpaneel is zichtbaar in view-only.
- Impact: het technisch team leest lagen; H5, H6 en M7 staan dus nog in het bestand. Een lege grep op `characters` was hier de lege meting zonder positieve controle — de laagnamen zijn een tweede tekstlaag.
- Effort S. Eén read-and-rename-pas: naam = tekst (of `autoRename` aan) over 49:2/49:3/49:4; `btn/`-namen bijwerken. Bouwstap, niet in deze audit uitgevoerd.

**F7 · Het board indexeert nergens tegen de drie doelstellingen en zegt niet hoeveel schermen een leerling écht doorloopt; "aantrekkelijk" en het verworpen gamification-alternatief leven alleen in de video; 02 belooft "dan je rapport" te vroeg** — Valuable · Desirable · Credible · Words · bevestigd/afgezwakt
- Bewijs: grep board-dump "doelstelling" 0×, "aantrekkelijk" 0×, "badge/streak" 0×. Prototype springt van 01 naar "02 · Zelfcheck (2 van 4)" (streepjes 2 gevuld); caption 02 zegt niet "één scherm per domein, vier keer"; realistisch pad = 01 + 4×02 + 2×03 + 04–08 = 12 schermen, niet 8. 2:51 "Vier korte vragen, dan je rapport." staat op een scherm waarna nog twee domeinen, 03 en 04 volgen.
- Impact: de board-only lezer (het team dat omvang schat) kan de "voorgestelde gebruikersflow" — een van de vier beoordelingspunten — niet aflezen en vindt nergens waarom het grijs is en zonder beloning. De video dekt dit; het board dat wordt doorgestuurd niet.
- Effort S. Cover: blok "DE DRIE DOELSTELLINGEN" (doelstelling → schermen → verworpen alternatief, drie regels; zie §7.3) + regel "Een leerling doorloopt 01, vier keer 02, per verwachte B één keer 03, dan 04–08: hier 12 schermen." Caption 02 openen met "Vier keer, één scherm per domein — hier Orde:". 02-copy: "Vier domeinen, elk drie korte vragen. Dan je rapport."

**F8 · Contrast en tekstgrootte: `#9e9e9e` haalt 2,68:1 op wit en 2,44:1 op `#f4f4f4` (≥41 tekstnodes, incl. de geruststellingszinnen); 29 nodes ≤ 11 px, waarvan 8× 9 px op de JIJ DACHT/SCHOOL-vakjes** — Accessible · gemeten · bevestigd
- Getroffen: voetnoten 2:29 ("Niet gelukt is ook een antwoord"), 2:148 ("Dit delen we niet"), 2:350, 50:41; alle overlines 10 px; hints 11 px (2:295, 50:8); "Periode 2"-headers; JIJ DACHT/SCHOOL 9 px (2:178, 2:181, …). Randen `#d6d6d6` op wit 1,45:1 (UI-component vraagt 3:1). Ter vergelijking: body `#6b6b6b` 5,33:1 / 4,85:1 — al in gebruik.
- Impact: de zinnen die deze persona het meest nodig heeft zijn de minst leesbare; de labels die het kernonderscheid van 04/05 dragen zijn de kleinste tekst op het scherm. Grijs is wireframe-constraint, maar de hexwaarden en fontsizes staan in het bestand.
- Effort S. Secundaire tekst → `#6b6b6b`; overlines minstens `#767676` (4,54:1); minimum 12 px, 13 px voor interactieve labels en de vakjes (de 04-kaarten zijn 122 px hoog — ruimte genoeg). Eén cover-regel: "Grijstinten zijn wireframe; minimumcontrast 4,5:1 bij implementatie."

**F9 · Op 05 zijn de geselecteerde antwoordknop en de CTA identiek: twee zwarte blokken 335×51 `#1f1f1f`, 15 px Semi Bold, met één witte knop ertussen** — Visual representations · Ease of learning · `nieuw sinds revisie` · bevestigd
- Gemeten: 2:275 y=618 (geen reactie), 2:277 wit y=681, 50:9 y=746 (→ 06). Het is het scherm dat de video het langst toont; de regel "zwart alleen geselecteerd + primaire CTA" is naar de letter waar en visueel het probleem.
- Effort S. Geselecteerd antwoord = witte knop met 2 px zwarte rand en vinkje links (zoals de rijen op 03), of antwoorden als radio-rijen; zwart-vol exclusief voor de CTA; 24 px extra ruimte boven de CTA.

**F10 · 06: invoermodaliteit van DAN en WIE HELPT ongespecificeerd, geen picker-affordance op de slots, en de zwarte rand betekent "invoer" op 06 maar "alleen-lezen" op 07/08** — Visual representations · Words · Behavior · bevestigd
- Gemeten: slots 2:292/2:296/2:299 stroke `#121212`, geen chevron/placeholder/cursor (0 vector-nodes op 06); hint alleen onder ALS; kaarten 2:326 (07) en 50:20 (08) ook stroke `#121212` maar alleen-lezen; samenvattingskaart 2:302 `#d6d6d6`. De beslissing "ALS uit een menu, DAN zelf" is gedocumenteerd, niet getekend; de spanning met de cover ("kader vraagt schrijven, waar kiezen zou volstaan") blijft.
- Effort S/M. Hint onder DAN ("Kies uit vijf voorstellen bij deze ALS, of typ zelf — kort") en WIE HELPT ("Kies een klasgenoot of leerkracht"); chevron op ALS; zwarte rand uitsluitend voor invoervelden, 07/08-kaarten `#d6d6d6`. Optioneel een tweede frame met de lege toestand van 06.

**F11 · 05 toont alleen de rijke variant: het degradatiepad zonder per-les-tellingen staat nergens; het enige concrete voorbeeld in de opdracht-sectie is de OKAN-observatie zonder label; de vakleerkracht die observeert staat buiten de lus** — Useful · Credible · Valuable · afgezwakt naar P2
- Bewijs: 05 "WAT DE LEERKRACHT ZAG · 14 LESSEN NEDERLANDS", "6 / 14", "Tik op een vakje voor de datum." — data die alleen bestaat als 09 (hypothese, sectie 2) bestaat; 06-hint "of uit wat je leerkracht noteerde". Cover: "De leerlingflow staat op zichzelf; waar de school al gedateerde observaties heeft … wordt hij scherper" — beweerd, niet getoond (analyse H4 vroeg het te tónen). OKAN-label staat alleen op 09 (2:395) en als cover-vraag 2. Het plan "Als de leerkracht mij een vraag stelt" gaat over de les Nederlands, maar gedeeld wordt uitsluitend met de titularis (2:327) — de leerkracht die het gedrag kan zien krijgt niets, en 09 toont geen lopende afspraken.
- Effort S. Caption 05: "Voorbeeld uit het meegeleverde rapport (OKAN-klas); zonder per-les-tellingen blijft de kaart 'wat de school zag' weg en staat hier alleen de lezing met dezelfde drie antwoorden." Of één 05-variant zonder telling. Cover-vraag of 07-bullet: "Krijgt je leerkracht Nederlands dit ook?" (label op het leerlingscherm zelf zou ontwerpersredenering als leerlingtekst zijn — niet doen).

**F12 · Copy op de hero-schermen: "ze" op 05 is nergens benoemd; ontwerpersredenering als leerlingtekst op 06; vaktaal op 07; de A/B-gok (02) wordt nergens gemapt op "werkpunt" (03)** — Words · Ease of learning · bevestigd
- Bewijs: 05 2:244 "WAT DE LEERKRACHT ZAG · 14 LESSEN NEDERLANDS", 2:271 "Dit is wat ze erbij dacht", 2:274 "Ik weet welke lessen ze bedoelt" — de enige benoemde persoon is mevr. Devos (titularis); het antwoord van de leerling hangt af van wie "ze" is. 06 2:291 "Dat werkt beter dan groot en vaag." — afgevinkt item "geen ontwerpersredenering als leerlingtekst" klopt hier niet; 2:271 is letterlijk de caption-titel als UI-tekst. 07 2:339 "Je eigen inschatting per domein", 2:342 "Wat je aantikte". 02 chips "A / B / weet ik niet" → 03 "WERKPUNT BIJ ORDE" zonder brug.
- Effort S. 05: "WAT JE LEERKRACHT NEDERLANDS ZAG · 14 LESSEN" en "Dit is wat ze vond. Hierboven staat wat ze zag. Jij mag antwoorden." 06: "Eén ding, op een vast moment. Klein werkt beter dan groot." 07: "Wat jij dacht per domein" / "Waar het aan lag". 02: hint onder de chips "B betekent: een werkpunt" of chips "dit lukt · A / werkpunt · B / weet ik niet".

**F13 · "Niet gelukt … dan maken we de afspraak kleiner" heeft geen vervolg: alle drie 01-antwoorden → identiek 02; de novemberafspraak verdwijnt en mevr. Devos verneemt niet of ze gelukt is** — Credible · Behavior · Useful · bevestigd (drie lenzen)
- Gemeten: 2:23/2:25/2:27 → 2:33; de Orde-afspraak komt op geen later scherm terug; 07 deelt het 01-antwoord niet en noemt het evenmin onder WAT WE NIET DELEN. Cover-lijst "bewust niet getekend" noemt deze toestand niet — de lezer kan bewust-niet-getekend niet onderscheiden van vergeten. Het script herhaalt de belofte zonder mechanisme.
- Effort S. 07: derde regel onder WAT MEVR. DEVOS ZIET "Je vorige afspraak: niet gelukt"; cover: vijfde toestand "Niet gelukt: op 06 staat de vorige afspraak vooringevuld met 'wat maakt hem kleiner?' — één slot wijzigen, niet herbeginnen". Minimaal: de belofte op 01 schrappen als ze niet ingelost wordt.

**F14 · "Weet ik niet" (02) heeft geen uitkomst op 04** — Error tolerance · Words · bevestigd
- 02 chip 2:88 is volwaardig (caption 02 noemt dat de keuze; bewuste afwijking van de brief); 03 opent met "JE DENKT: WERKPUNT"; 04 kent onder JIJ DACHT alleen "dit lukt"/"werkpunt"; cover noemt de toestand niet; script zegt alleen "'Weet ik niet' mag."
- Effort S. Cover-toestand: "Weet ik niet: geen oorzaakvraag; op 04 staat het domein onder 'eens' met JIJ DACHT 'wist ik niet' en de regel 'Nu weet je het.'"

**F15 · 07 deelt niet wat het zegt te delen: "Straks kies je zelf wat je deelt" (03) en caption-titel "jij kiest wat meegaat" tegenover alles-of-niets; "Yassine helpt me" (06) valt op 07/08 stil weg — noch gedeeld, noch onder "niet delen"** — Words · Behavior · Credible · `nieuw sinds revisie` · bevestigd
- Gemeten: 07 heeft twee vaste kaarten, geen toggle of per-item keuze; 2:304 (06) "… Yassine helpt me." vs 2:330 (07) en 50:33 (08) zonder helper; WAT WE NIET DELEN heeft twee bullets. Acceptatie-item "07 toont die zin" is half waar. De blokken zijn bewust vast (briefing ELEMENTS); de copy overclaimt.
- Effort S. 03: "Straks zie je precies wat mevr. Devos krijgt, en beslis je of je het deelt." Caption-titel 07: "de leerling ziet wat meegaat en beslist". Yassine mee in de gedeelde zin op 07/08 (de titularis kan hem betrekken) óf als derde bullet "Wie je helpt" onder niet-delen.

**F16 · 10 spreekt zichzelf tegen: kolomkop "WAT IK ZAG · DE LEERLING LEEST DIT" boven het veld "niet gemotiveerd in de les|", voetnoot "de leerling krijgt de observatie" — en 05 toont de leerling de zin** — Credible · Words · sectie 2 (hypothese) · afgezwakt naar P2
- Dat 05 de lezing toont is de kern van het ontwerp (caption 05); de tegenspraak zit in de voetnoot van 10. Effort S: voetnoot herschrijven ("de leerling leest de zin én de observatie, de teamnotitie niet") of de kolomkop.

### P3 — weggeschreven naar `apps/soda-plus/BACKLOG.md` (type `ux`)

| # | Bevinding | Schermen | Bewijs (kort) |
|---|---|---|---|
| P3-1 | Voortgangsstreepjes 2/4 → 3/4 → verborgen voor hetzelfde domein; niet gelabeld | 02, 03, 04 | fills 2:41–2:44 / 2:121–2:124; 2:161 visible:false |
| P3-2 | Touch-targets: chips 35–37 px, 14 datumvakjes 17×17 met tik-hint, Terug 52×20; geselecteerde staat 2 px kleiner en 1 px verschoven | 02, 05, 06 | gemeten; strokeAlign INSIDE overal |
| P3-3 | Hold-to-reveal: geen ON_CLICK op de kaart terwijl caption "op chromebook: een klik" belooft; copy "Houd ingedrukt" is touch-only; niet toetsenbord-bereikbaar; Present-mode-gedrag van ON_PRESS+NAVIGATE `[NIET TE VERIFIËREN — 10 s test door Jeroen]` | 04 | 2:214 ON_PRESS → 2:223; 50:6 ON_CLICK → 2:223 |
| P3-4 | "Ik zie het anders" → zelfde CTA "Naar mijn plan"; briefing-aanname ("plan wordt optioneel") spreekt caption 05 ("geen ontsnapping") tegen | 05 | 2:273/2:275/2:277 zonder reactie |
| P3-5 | Delen onomkeerbaar zonder bewerkvenster; 08 heeft "‹ Terug" na "Gedeeld." | 07, 08 | 2:346 → 50:11; 50:15 |
| P3-6 | "Iets anders …" zonder veld; "Eén tik is genoeg" bij twee aangevinkte kaarten (single/multi onbepaald) | 03 | 2:146; screenshot |
| P3-7 | Tweede observatie zonder vakjesstrip; lege vakjes 1,32:1; "Wat klopt hiervan?" slaat op telling én lezing zonder onderscheid | 05 | 2:249 vs 2:265; 50:8 |
| P3-8 | Woordenboek-restjes: JOUW/Je/JE AFSPRAAK; "Attitude" op 07 waar elders "Ik werk mee in de les"; "afspraak" = eigen plan én schoolregel (D-kaart 2:173, chip 50:51) | 04, 06, 07, 08, 09 | tekstdump |
| P3-9 | Zero-states en de gate "Verder pas na alle antwoorden" nergens gespecificeerd `[GEEN DATA]` | 02, 03, 05, 06 | geen disabled-variant |
| P3-10 | Seintje-kanaal onbenoemd; "check op 15 januari" (01) past in geen van de twee chips van 06 (2 weken / volgende periode); twee check-events zonder semantiek | 01, 06, 08 | 2:20, 2:307/2:309, 50:28 |
| P3-11 | Captions 09/10 hebben drie zinnen (afgevinkt item "≤ 2" klopt niet — de derde is de hypothese-markering en leest goed); drie stellige claims zonder bron in captions 01/06/07 | captions | 2:396, 2:617, 2:32, 2:315, 2:353 |
| P3-12 | 10: "18 / 21 bevestigd" zonder per-rij status; prompt "Gedrag kan een leerling veranderen, een eigenschap niet" leest belerend; drempel chip→B nergens | 10 | 2:488, 2:554 |
| P3-13 | "9:41" is een Apple-tell; verder is de statusbalk wél geneutraliseerd | 01–09 | 9 nodes |
| P3-14 | Inleverchecklist: bestandsnaam "Soda+" (briefing-item open); PDF-exportroute — sections exporteren, niet "frames to PDF" (captions zijn losse frames → losse pagina's `[aanname]`); cover 1740×330 als eerste PDF-pagina | board | `figma.root.name`; 10 caption-frames top-level |
| P3-15 | Geen prikkel die de kwaliteit van het plan toetst — alleen of de slots gevuld zijn (idee: "Hoe vaak gebeurt de ALS per week?") | 06 | — |
| P3-16 | Frequentie-antwoorden (02) komen nergens terug — hun functie is de zelfevaluatie zelf; hoogstens één echo op 03/04 | 02–04 | tekstdump |
| P3-17 | "Dit delen we niet" (03) als feit terwijl cover-vraag 3 inzage openlaat — één caption-zin "default, instelbaar per school" | 03, 07 | 2:148 |
| P3-18 | Wat mevr. Devos krijgt is dun: knoplabel-echo "Dit had ik niet gezien." zegt haar weinig — herformuleren als gesprekszin | 07 | 2:334 |

Niet opgenomen: scenario-data vallen in januari 2026 (het papierjaar) — intern consistent, geen actie.

---

## 7 · Redesign-voorstellen

### 7.1 · Doelstelling 2 sluitend maken: één kiesstap, en 03 laten doorwerken (F1, F13, F14)

**Huidige issues.** Oorzaak bij Orde, plan bij Attitude; S en O zonder plan of "waarom"; "kiest er één" alleen op de cover; "Niet gelukt" en "weet ik niet" zonder uitkomst.

**Oplossing.** Eén nieuw scherm 05b tussen 05 en 06 — de kies-één-stap uit het archief (2:445), nu als hoofdgeval:

```
‹ Terug                          Periode 2
Waar werk je deze periode aan?
Eén ding. De rest bewaren we voor het gesprek.

( ) Ik ben op tijd              S   jij en de school: werkpunt
                                    school zag: 2× te laat deze week
(•) Mijn spullen zijn in orde   O   jij en de school: werkpunt
                                    jij zei: ik vergeet het thuis      ← uit 03
( ) Ik werk mee in de les       A   jij dacht: dit lukt · school: werkpunt
                                    jouw antwoord: dit had ik niet gezien

[ Naar mijn plan ]
```

06 opent dan met de gekozen oorzaak als eerste ALS-suggestie ("Je zei: ik vergeet het thuis → ALS ik 's avonds mijn boekentas maak …"); bij "Niet gelukt" op 01 staat de novemberafspraak vooringevuld met "wat maakt hem kleiner?"; op 08 verschijnen de niet-gekozen werkpunten als "bewaard voor het gesprek en periode 3". Op 04 krijgt elke S/O-kaart één regel wat de school zag (het "waarom" uit de opdracht). Cover: vijf extra toestanden (weet ik niet · niet gelukt · nog even niet · ik zie het anders · Mijn rapport).

**Goedkope variant** (geen scherm): dezelfde drie regels als tekst op 04, 06 en 08 plus de cover-toestanden.

**Verwacht effect.** Useful 4→5, Effectiveness 3→4, Error tolerance 3→4, Credible +1. Het argument in de video wordt "de leerling kiest zijn werkpunt, ook als de school er drie ziet" — sterker dan "één domein van verschil tot plan". **Effort M** (scherm) / **S** (regels).

### 7.2 · 07/08 laten kloppen met hun eigen claim (F15, F13, F4, F5)

**Huidige issues.** "Kies zelf wat je deelt" zonder keuze; Yassine verdwijnt; 01-antwoord ontbreekt; "Nog even niet" dood; "Naar mijn rapport" naar de oude afspraak.

**Oplossing.** 07-kaart WAT MEVR. DEVOS ZIET met drie regels: je vorige afspraak (soms gelukt) · je werkpunt deze periode (spullen — jij en de school eens) · je afspraak (mét "Yassine helpt me"). "Jouw antwoord bij Attitude" wordt een gesprekszin ("bij 'meewerken in de les': dit had ik niet gezien — bespreek welke lessen"). "Nog even niet" krijgt één regel eronder ("Je plan blijft bewaard. Delen kan tot 28 januari.") en een reactie. 08: CTA "Klaar" i.p.v. "Naar mijn rapport", geen "‹ Terug", regel "Je kan dit aanpassen tot de dag vóór het gesprek." 03: "Straks zie je precies wat mevr. Devos krijgt."

**Verwacht effect.** Credible 3→4, Valuable 3→4, Behavior 3→4. **Effort S.**

### 7.3 · Het board als index: cover, archief, laagnamen, prototype (F2, F6, F7, F4)

**Huidige issues.** Cover zonder doelstellingen en flow-lengte; archiefband zichtbaar; 66 stale laagnamen; Terug-links dood.

**Oplossing.** Cover 1740×900 met een vijfde blok:

```
DE DRIE DOELSTELLINGEN — EN WAT IK VERWIERP
1  Eerst zelfevaluatie, dan resultaat  →  02 (drie gedragingen + gok), 04 (opent op overeenstemming)
   in plaats van: jouw gok en onze score naast elkaar, verschillen in het rood
   "aantrekkelijk" las ik als kort en niet bedreigend — niet als kleurrijk
2  Bij een verwachte B een oplossing   →  03 (oorzaak vóór), 05b (kies je werkpunt), 06 (plan ná)
   in plaats van: het plan vóór de onthulling — blijkt het een A, dan was het nepwerk
3  Écht nadenken                        →  01 + 08 (terugkeer met datum), 06 (slots i.p.v. leeg vak)
   in plaats van: badges en streaks — bij vier momenten per jaar kan een streak alleen breken

DE FLOW  01 → 02 ×4 → 03 (per verwachte B) → 04 → 05 → 05b → 06 → 07 → 08 → (periode 3) 01
         hier: 13 schermen, ±5 minuten [aanname]
```

Plus: section 49:5 verbergen of naar een privékopie; rename-pas naam = tekst; ON_CLICK → Back op elke topbar; caption 09 "geen prototype — hypothese". Script-regel over het archief corrigeren.

**Verwacht effect.** Credible 3→4, Findable 3→4, Desirable 3→4 (voor de board-lezer), Valuable +1. **Effort S** (alles samen ±1 uur via de plugin-bridge).

### 7.4 · Leesbaar en tastbaar: kleur, maat, CTA-zone, 05-knoppen (F3, F8, F9, F10)

**Oplossing.** Eén kleurstap (`#9e9e9e` → `#6b6b6b`; overlines `#767676`); minimum 12 px, vakjes 13 px; chips 44 px hoog (02 eindigt op y=685 — ruimte genoeg); sticky CTA-zone y=727–778 op alle schermen; op 05 geselecteerd = wit + 2 px rand + vinkje; op 06 chevron op ALS en hints op DAN/WIE HELPT; zwarte rand alleen voor invoer. Cover-regel over contrast bij implementatie.

**Verwacht effect.** Accessible 2→4, Physical/space 3→4, Visual representations 3→4. **Effort S.**

---

## 8 · Research-aanbevelingen

Het script noemt de eerste zelf; de rest maakt de aannames van deze audit toetsbaar.

1. **Vijf leerlingen laten doorklikken, op gsm én chromebook** — meet taps en tijd tot 04 (audit telt 26 taps), kijk of ze de frequentievragen eerlijk invullen of doorklikken, en laat er minstens één "Niet gelukt", één "weet ik niet" en één "Ik zie het anders" kiezen. Valideert F1, F13, F14, Efficiency en Engagement (nu `[GEEN DATA]`).
2. **Twee klassen buiten OKAN** (Bouw, Zorg) — werken "telling los van lezing" en de ALS-lijst per domein zonder taaldrempel? Valideert F11 en cover-vraag 2.
3. **Titularis-interview vóór het bouwen van 07** — wat heeft mevr. Devos nodig om een gesprek over drie B's voor te bereiden, en krijgt de vakleerkracht het plan? Valideert F15/7.2 en de "buiten de lus"-hypothese.
4. **Smartschool-datacheck met het technisch team** — welke gedateerde observaties bestaan er vandaag (aanwezigheden zeker; attitude per les?). Beslist of 05 de rijke of de kale variant is (F11) en welk kanaal "een seintje" heeft (P3-10).
5. **Tien-secondentest in Present-mode** — springt de hold op 04 bij loslaten terug? Bepaalt of P3-3 een P2 wordt.

---

## 9 · Methodiek en limieten

- **Expert-review, geen gebruikers.** Alle scores zijn oordelen op bewijs; waar bewijs ontbrak staat `[GEEN DATA]`. Engagement en Efficiency zijn hypotheses tot research 1 gedaan is.
- **Gemeten vs. geobserveerd.** Afmetingen, fills, fontsizes, reacties, zichtbaarheid en laagnamen komen uit `figma_execute` (read-only) op de plugin-runtime en zijn reproduceerbaar; contrast via de WCAG-formule. Visuele oordelen komen van verse `figma_capture_screenshot`-captures per scherm.
- **Niet geverifieerd:** het gedrag van ON_PRESS + NAVIGATE bij loslaten in Present-mode; hoe een view-only viewlink de section-titel en het lagenpaneel rendert; de PDF-exportroute (item staat terecht open in de briefing).
- **Bias-controle.** Drie lenzen met drie persona's, elk adversarieel geweerlegd; 13 bevindingen afgezwakt (meestal: gedocumenteerde keuze zonder nieuw argument, of prototype-conventie als defect gelezen), 4 verscherpt (archiefband, laagnamen). De scheidsrechter volgde de verifier waar die bewijs aandroeg en de finder waar de verifier een scope-argument gebruikte tegen een gemeten getal.
- **Score is communicatie.** 52/85 = D-grens. De bevindingenlijst is de deliverable; de score zegt vooral dat de afstand tot C klein en concreet is.
- **Proces-bevinding (vastleggen-trigger).** Vijf afgevinkte acceptatie-items in de briefing spreekt het bestand tegen (bijlage A). Faalklasse: *afvinken op zicht, niet op meting* — dezelfde klasse als "op bewijs, niet op herinnering" in de globale CLAUDE.md. Voorstel: `vastleggen` met de briefing als input en F3 als verificatie-test (meting van CTA-y's moet rood worden op de huidige set).

---

## Bijlage A · Acceptatie-items uit de briefing getoetst aan het board

| Item (afgevinkt) | Klopt? | Bewijs |
|---|---|---|
| CTA's op één hoogte | **nee** | y=458–746, spreiding 288 px (F3) |
| Elke caption-body ≤ 2 zinnen | **nee** voor 09/10 | derde zin = hypothese-markering; leest goed, item bijstellen (P3-11) |
| Geen ontwerpersredenering als leerlingtekst | **nee** op 06 | 2:291 "Dat werkt beter dan groot en vaag." (F12) |
| Oude 10–11 in Archief, verborgen | **half** | frames verborgen, section zichtbaar (F2) |
| 07 toont die zin én de knopkeuze van 05 | **half** | zin zonder "Yassine helpt me" (F15) |
| Statusbalk neutraal | **grotendeels** | geen iconen; "9:41" is een Apple-tell (P3-13) |
| november / 15 jan / 13 jan / 29 jan consistent | **half** | kalender klopt; 15 jan past niet in het chip-model van 06 (P3-10) |
| Voortgang alleen op 02/03 | **ja**, semantiek breekt | 2/4 → 3/4 voor hetzelfde domein (P3-1) |
| Letter alleen in de tag; A/B nooit in de JIJ/SCHOOL-vakjes | **ja** | 2:179/2:182 "dit lukt", 2:193/2:196 "werkpunt" |
| Eén domein van verschil tot plan; geen zin op 07 die nergens ontstaat | **ja** | 06 → 07 → 08 dragen dezelfde zin — en dat is precies F1 |
| Geen "OKAN" in headers; taalchip gelabeld | **ja** | 2:359 "5B"; 2:395 |
| Prototype 01→…→08; ON_PRESS op 04 | **ja** | 11 reacties; 2:214 |

## Bijlage B · Bronnen

- Board-dump van de gereviseerde set (tekst, reacties, afmetingen, zichtbaarheid): scratchpad van deze sessie, `soda-audit/board-dump-2026-08-25.md`
- Workflow `wf_26d67653-d31` (3 finders + 3 verifiers, 68 + 18 bevindingen): journal onder `~/.claude/projects/-Users-jeroen-Documents-umanex-apps/9d1faa2b-…/subagents/workflows/wf_26d67653-d31/`
- Opdracht, mail, oud rapport, vacature: scratchpad van sessie `6cb803e1-…` (vluchtig — overweeg `apps/soda-plus/reference/`)
- Analyse van vanochtend: `apps/soda-plus/audits/2026-08-25-analyse-gedane-werk.md` · Videoscript: `apps/soda-plus/video/2026-08-25-videoscript.md`
