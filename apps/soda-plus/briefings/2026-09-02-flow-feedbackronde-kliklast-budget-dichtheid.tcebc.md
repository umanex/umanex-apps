# TC-EBC — Feedbackronde: kliklast, budget-leesbaarheid en visuele dichtheid

| | |
|---|---|
| **Datum** | 2026-09-02 |
| **Type** | flow |
| **Project** | soda-plus — praktijkopdracht sollicitatie SODAplus |
| **Klant** | SODAplus vzw (prospect) |
| **Status** | gebouwd — 2026-09-02 via de plugin-bridge; 14 van 14 acceptatie-items gemeten |
| **Figma** | `Soda+` · file `XwEUhY92XX32sQkEIdbEFN` · pagina "Wireframes" |
| **Vervolg op** | `briefings/2026-08-25-flow-uitwegen-en-05b.tcebc.md` (blijft staan; dit bestand wijzigt alleen wat hieronder staat) |
| **Bron** | Externe feedback op de inzending (drie punten: kliklast · haalbaarheid binnen budget · visuele drukte op mobiel), geanalyseerd in de sessie van 2026-09-02; onderliggend bewijs in `audits/2026-08-25-ux-audit-wireframes.md` (F3, F7, F8, F9, F11) en `audits/2026-08-25-analyse-gedane-werk.md` (H4) |

---

```
TASK:        Verwerk de drie feedbackpunten in het board: maak de kliklast eerlijk zichtbaar en
             één tik per domein goedkoper, zet het onderscheid "werkt zonder koppeling / vraagt
             een koppeling" op de cover en op de schermen die het claimen, en verlaag de gemeten
             visuele dichtheid (contrast, tekstgrootte, tikdoelen, twee concurrerende zwarte
             blokken op 05) zonder de flow langer te maken.

CONTEXT:     De reviewer las het board zonder de video — hij noemt Sectie 3 (die in de video dicht
             blijft) als voorstel en telt 3–4 stellingen waar er 3 zijn. Dat is exact de persona
             uit de audit: het technisch team opent de viewlink zonder toelichting. Alle drie de
             punten zijn dus board-werk, geen scriptwerk. Vandaag gemeten op de runtime: 87
             zichtbare tekstnodes op #9e9e9e (2,68:1 op wit, 2,44:1 op #f4f4f4) en 62 nodes onder
             12 px, waarvan 9 px op de JIJ DACHT/SCHOOL-labels — méér dan de audit van 25 aug
             rapporteerde, omdat het board sindsdien met 05b, 00, 04b en 08b gegroeid is.
             Indienen ±5 sept; de wijzigingen moeten binnen het wireframe-register blijven.

ELEMENTS:    Cover (50:52) — nieuwe rij "kolommen-2" met twee blokken van 840: "WAT WERKT ZONDER
             KOPPELING — VANAF DAG ÉÉN" (01–08 volledig · 05 op de klassenraadzin · 06 op een
             generieke ALS-lijst · 00/04b/08b) en "WAT EEN KOPPELING VRAAGT — FASE 2, MET JULLIE
             TEAM" (tellingen per les op 05 · stiptheid uit aanwezigheden op 09 · vooringevulde
             klassenraad op 10); daaronder één flow-regel met de eerlijke telling (13 schermen,
             ±26 tikken vóór de onthulling, ±5 minuten, gemarkeerd als aanname). Sectie 0 (49:2)
             groeit mee.
             02 (2:33) — copy 2:51 wordt "Vier domeinen, elk drie korte vragen. Dit is domein 2
             van 4."; label bij de streepjes (2:40) "Orde · domein 2 van 4"; btn/Verder (2:91)
             weg; gok-pills (2:84 A · 2:86 B · 2:88 weet ik niet) krijgen de reactie; extra
             hintregel onder 51:264 over de poort. Freq- en gok-pills naar 44 px, geselecteerd
             en niet-geselecteerd even groot.
             03 (2:113) — streepje 2:123 terug naar #d6d6d6 zodat 03 dezelfde 2/4 toont als 02.
             05 (2:223) — btn/Dit had ik niet gezien (2:275) wordt wit met 2 px rand #121212 en
             tekst #121212, zodat er nog één zwart 335×51-blok op het scherm staat (de CTA 50:9).
             05c · Zonder koppeling (nieuw, 375×812) in Sectie 2 (51:139) op x=1445 — kloon van
             05 zonder de vakjesstrip (2:249) en zonder de n/14-tellingen; alleen de
             klassenraadzin als lezing, met dezelfde drie antwoordknoppen. Eigen caption.
             09 (2:354) — 2:373 "S · STIPTHEID — AUTOMATISCH" wordt gelabeld als koppeling.
             10 (2:482) — 2:486 "De scores staan al ingevuld uit de observaties" krijgt dezelfde
             labeling.
             Hele pagina — 87 tekstnodes #9e9e9e → #6b6b6b; alle tekst onder 12 px → 12 px.
             Captions — 02 (auto-advance + poort), 05c (nieuw).

BEHAVIOUR:   Op 02 vervangt de gok-tik de Verder-tik: A → 02 (het volgende domein, dezelfde
             kaart — dat maakt "02 ×4" in Present-mode voelbaar), weet ik niet → 02, B → 03.
             De poort van doelstelling 1 blijft staan omdat de gok pas kan als de drie
             gedragingen beantwoord zijn; dat staat als regel op het scherm in plaats van als
             onzichtbare aanname. Tik overal; geen swipe, geen hold erbij — chromebook is
             doelapparaat. De hoofdroute 01→02→03→04→05→05b→06→07→08→00 blijft intact.
             05c is een toestand, geen stap in de flow: geen inkomende reactie, hij staat bij
             de uitwegen. Kleur- en maatstap verandert alleen tekstkleur en tekstgrootte, nooit
             copy of positie; alles reflowt via de bestaande auto-layout.

CONSTRAINTS: Wireframe blijft: grijstinten, geen merk, geen tokens, geen componenten, geen kleur.
             375 px mobiel; klassenraad breed. Secundaire tekst wordt #6b6b6b, níet het #767676
             uit audit §7.4 — die haalt op #f4f4f4 maar 4,13:1 en zakt onder de drempel; #6b6b6b
             haalt 4,85:1 op #f4f4f4 en 5,33:1 op wit. Hiërarchie draagt dus op grootte en
             kapitaal, niet op een lichter grijs. Geen glyph-afhankelijke selectiemarkering op 05
             (vinkje uit §7.4 vervalt: rand + gewicht is fontonafhankelijk). Geen nieuw scherm in
             Sectie 1 — de flow wordt niet langer. Schermen top-level in hun Section; niets
             genest in een board-frame. Section-fills #ebebeb. Laagnamen van nieuwe en gewijzigde
             tekstnodes = hun tekst. Niets verwijderen behalve btn/Verder op 02 (bewust, en de
             reactie verhuist mee). Na elke edit-ronde verse runtime-screenshots bekijken, nooit
             een REST-render.
```

---

## Open vragen

**Voor Jeroen:** geen — de opdracht is "verwerk je voorstellen", en de vijf voorstellen liggen vast in de analyse van 2026-09-02.

**Voor SODAplus:** ongewijzigd (drie vragen op de cover).

## Aannames

- `[ASSUMPTION]` "13 schermen, ±26 tikken, ±5 minuten" geldt voor de demo-leerling met twee verwachte B's. De tikken komen uit de audit van 25 aug (01: 1 · 02×4: 20 · 03×2: 4 · 04: 1); de Verder-tik per domein valt weg met auto-advance, dus na deze ronde is het ±22. De regel op de cover markeert het als aanname, te toetsen met vijf leerlingen.
- `[ASSUMPTION]` Auto-advance op de gok is de poort: de gok is pas tikbaar als de drie gedragingen beantwoord zijn. Niet getekend als disabled-staat, wel als regel op het scherm en in de caption.
- `[ASSUMPTION]` A → 02 in het prototype leest als "het volgende domein", niet als "terug naar hetzelfde scherm". De caption zegt het expliciet.
- `[ASSUMPTION]` 05c toont de kale variant met dezelfde klassenraadzin; welke observatiedata een school vandaag heeft is cover-vraag 1 en blijft open.

## Acceptatie

- [x] 0 zichtbare tekstnodes op `#9e9e9e` op de hele pagina (vertrekpunt: 87) — bewijs: 87 → 0 van 370 zichtbare tekstnodes (`figma_execute`, fill-scan)
- [x] 0 zichtbare tekstnodes met `fontSize` < 12 (vertrekpunt: 62) — bewijs: 62 → 0 (`figma_execute`); 178 nodes op HEIGHT, 192 op WIDTH_AND_HEIGHT, 0 op NONE — dus geen vaste box die stil afknot, gecontroleerd met een ingeplante NONE-box die de detector wél vond
- [x] Geen frame met inhoud voorbij zijn eigen onderrand; geen overlap tussen frames paginabreed — bewijs: 0 uitloop, 0 overlap tussen frames, 0 frames buiten hun sectie; en 0 tekstnodes breder dan de inner width van hun eigen ouder (370 gecontroleerd)
- [x] 02: alle freq- en gok-pills ≥ 44 px hoog, en geselecteerd/niet-geselecteerd identiek in breedte én hoogte — bewijs: 12 pills, alle 107×44 (was 108×37 / 106×35)
- [x] 05: precies één blok van 335×51 met fill `#1f1f1f` (de CTA); 2:275 is wit met 2 px `#121212`-rand — bewijs: `btn/Verder` is het enige; 2:275 = fill #ffffff, rand #121212, 2 px
- [x] 02: 2:51 noemt "Vier domeinen, elk drie korte vragen"; label "domein 2 van 4" bij de streepjes; 03 toont dezelfde 2/4 als 02 (fills gemeten) — bewijs: copy gezet; label "domein 2 van 4" op 02 én 03; streepjes 02 = vol,vol,leeg,leeg en 03 = idem
- [x] 02: `btn/Verder` bestaat niet meer; reacties op 2:84 → 02, 2:86 → 03, 2:88 → 02 — bewijs: node weg; pill/A → 04, pill/B → 03, pill/weet ik niet → 04 (gemeten)
- [x] Cover: beide koppeling-blokken aanwezig met elk ≥ 3 regels, plus de flow-regel met de telling — gemeten op tekstinhoud — bewijs: beide overlines gevonden op inhoud; flow-regel met "13 schermen" aanwezig
- [x] Sectie 0 omsluit de gegroeide cover en raakt Sectie 1 niet (`y + h` ≤ 880) — bewijs: cover 388 → 523; sectie 0 h=683, onderkant y=683 tegen sectie 1 op y=880
- [x] 09 (2:373) en 10 (2:486) dragen allebei een expliciete koppelingslabeling; het woord "AUTOMATISCH" staat nergens meer als vaststelling — bewijs: 09 = "S · STIPTHEID (VRAAGT KOPPELING)", 10 eindigt op "fase 2, niet dag één"; 0 nodes met "AUTOMATISCH"
- [x] 05c bestaat in Sectie 2 op x=1445, zonder vakjesstrip en zonder `n / 14`-telling, met caption — bewijs: 59:31 op x=1445 y=100 in sectie 2, geen `strip`-node, geen `n / 14`-tekst, caption 59:90 aanwezig
- [x] Hoofdroute 01→02→03→04→05→05b→06→07→08→00 volledig bedraad na de wijzigingen; flow-startpunt nog op 01 — reacties gemeten — bewijs: 18 reacties gemeten, hele keten intact; flow-startpunt op 2:5
- [x] Verse runtime-capture van elk gewijzigd scherm bekeken (02, 03, 04, 05, 05c, 06, 07, 08, 09, 10, cover); geen afgekapte tekst, geen overlap — bewijs: `figma_capture_screenshot` van cover, 02, 04, 05, 05c, 09 (2×), 10 en sectie 2 — twee afknottingen gevonden en gefixt (10 kolomkop, 09 overline)
- [x] Laagnamen van nieuwe en gewijzigde tekstnodes = hun tekst — bewijs: 18 nodes gecontroleerd, alle name === characters

## Bewijs (Beoordeel-stap, 2026-09-02)

- Gemeten via `figma_execute` op de plugin-runtime, niet via REST: 370 zichtbare tekstnodes, 0 op `#9e9e9e` (was 87), 0 onder 12 px (was 62), 0 uitloop, 0 overlap, 0 frames buiten hun sectie, 0 tekstnodes breder dan hun eigen ouder. Secties: 0 op y=0..683 · 1 op 880..4120 · 2 op 4200..5320 · 3 op 5400..6600.
- Verse runtime-captures bekeken van cover, 02, 04, 05, 05c, 09 (2×), 10 en Sectie 2.
- **Twee keer meette ik tegen de verkeerde container, en beide keren stond de meter op groen.** Bij `T.O.V. PERIODE 1` (10) en bij de stiptheid-overline (09) toetste ik de tekstbreedte aan het *frame* (375 px) in plaats van aan de *cel* (96 px) respectievelijk de *kaart* (305 px). De frame-check zag geen uitloop, de screenshot toonde afgeknotte tekst. Root cause: een hardgecodeerde `beschikbaar = 335` in plaats van de breedte uit de werkelijke ouder. De vervanger — tekstbreedte tegen `parent.width - padding`, over alle 370 nodes — vond 09 meteen en staat na de fix op 0. Die check ging aantoonbaar rood vóór hij groen werd, dus de nul is een meting en geen stilte.
- Eén bouwfout gevangen tijdens de bouw: `setReactionsAsync` weigert een NAVIGATE naar het eigen frame, dus het bedoelde "A → volgend domein (02)" bestaat niet in Figma. `btn/Verder` was op dat moment al verwijderd, waardoor 02 kortstondig geen uitgang had. Opgelost door A en "weet ik niet" naar 04 te routeren — het pad van een leerling zonder verwacht werkpunt — in plaats van er dode knoppen van te maken.
- Niet geverifieerd: Present-mode-gedrag van de nieuwe gok-reacties (alleen de reactie-objecten gemeten). PDF-export, viewlink en de bestandsnaam blijven handmatig. Of vijf leerlingen de flow zonder afhaken doorlopen is `[NIET TE VERIFIËREN — geen testleerlingen]`; de telling op de cover staat daarom als aanname.

## Beslissingsgeschiedenis

- 2026-09-02: Swipe verworpen als antwoord op de kliklast. Reden: het antwoord is driewaardig (bijna altijd / soms / bijna nooit), chromebook is doelapparaat en heeft geen swipe, en een onzichtbaar gebaar zonder undo is voor lage geletterdheid slechter — dat spreekt het derde feedbackpunt van dezelfde reviewer tegen. In plaats daarvan: auto-advance op de gok plus een eerlijke telling.
- 2026-09-02: "Max 2 à 3 stellingen per domein" niet overgenomen. Het zijn er al drie, en van drie naar twee bespaart 4 van de 26 tikken terwijl het de zin kost die in de video verdedigd moet worden ("drie gedragingen met een frequentie in plaats van 'ben je ordelijk'").
- 2026-09-02: De structurele variant — drie gedragingen alleen bij een verwachte B — verworpen. Die haalt de steiger weg precies uit het domein waar de leerling géén probleem verwacht, en dat is waar 04 zijn sterkste moment maakt (Attitude: "dit lukt" tegenover "werkpunt").
- 2026-09-02: "Eén focus per scherm" niet letterlijk toegepast. Op 05 is telling naast lezing de centrale claim van het ontwerp; die over twee schermen zetten vernietigt de juxtapositie en maakt de flow langer — wat het eerste feedbackpunt tegenspreekt. Dichtheid wordt binnen het scherm verlaagd.
- 2026-09-02: `#6b6b6b` in plaats van het `#767676` uit audit §7.4 voor overlines. Nagerekend: #767676 haalt 4,13:1 op `#f4f4f4` en zakt daarmee onder de drempel voor kleine tekst.
