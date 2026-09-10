# TC-EBC — Revisie digitaal attituderapport (leerlingflow + board)

| | |
|---|---|
| **Datum** | 2026-08-25 |
| **Type** | flow |
| **Project** | soda-plus — praktijkopdracht sollicitatie SODAplus |
| **Klant** | SODAplus vzw (prospect) |
| **Status** | gebouwd — 2026-08-25, via plugin-bridge; bestand hernoemen, PDF en viewlink zijn handmatig |
| **Figma** | `Soda+` · file `XwEUhY92XX32sQkEIdbEFN` · board "SODA+ — digitaal attituderapport · wireframes" |
| **Vervangt** | `briefings/2026-08-13-flow-soda-attituderapport.tcebc.md` (branch `feature/sodaplus-attituderapport`) |
| **Bron** | `apps/soda-plus/audits/2026-08-25-analyse-gedane-werk.md` — beslissingen 1a · 2a · 3 benoemen · 4 schrappen · 5 parkeren · 6 weg |

---

```
TASK:        Herzie de bestaande set van elf wireframes tot één coherente leerlingflow (01–08) die
             de opdracht zichtbaar begrenst, plus een cover en een apart gehouden schoolzijde —
             klaar om als Figma-viewlink en PDF mee te gaan met de video.

CONTEXT:     De set van 13 aug staat (zie audit): sterke mechanismen, maar de flow breekt tussen
             04 en 07 (verschil bij Attitude, plan bij Orde, gedeelde zin ontstaat nergens), het
             board markeert niet wat opdracht is, OKAN staat als feit, captions zijn essays, de
             tijdlijn klopt niet. Beoordeeld wordt de video; het board gaat mee als viewlink en
             wordt intern herbekeken, ook door het technisch team. Deadline 11 sept, indienen ±5 sept.

ELEMENTS:    Board — cover-frame (nieuw); Section "Leerling — de opdracht" met 01–08; Section
             "Schoolzijde — daarna" met 09 (vakleerkracht, was 08) en 10 (klassenraad, was 09);
             Section "Archief" (verborgen) met de oude 10–11. Ondertitel "umanex voor SODAplus" weg.
             01 vorige afspraak — "STAP 1 VAN 3" weg; periode 2.
             02 zelfcheck — regel "Vier korte vragen, dan je rapport."; vier streepjes blijven.
             03 oorzaak — voetnoot "Dit delen we niet."
             04 onthulling — labels JIJ DACHT / SCHOOL met "dit lukt" / "werkpunt", letter alleen
             in de tag; "Twee periodes op rij A." / "Jij en de school zien hetzelfde."; CTA "Verder".
             05 verschil (Attitude) — telling gelabeld "in 6 van de 14 lessen Nederlands" + hint
             "tik op een vakje voor de datum"; lezing gelabeld "Dit is wat ze erbij dacht, niet wat
             ze telde. Jij mag antwoorden."; keuze "Dit had ik niet gezien" geselecteerd; CTA
             "Naar mijn plan".
             06 plan (Attitude, was Orde) — ALS "de leerkracht mij een vraag stelt" (hint "gekozen
             uit een lijst per domein") · DAN "zeg ik iets, ook als het fout is" · WIE HELPT
             "Yassine helpt me"; samenvattingskaart wit met rand.
             07 delen — "Je afspraak" = de zin uit 06; "Jouw antwoord bij Attitude" = de knopkeuze
             uit 05; blok "WAT WE NIET DELEN" (inschatting per domein · oorzaak-tik), regel over
             gewiste tekst weg.
             08 bevestiging (nieuw) — "Gedeeld." · "Mevr. Devos, je titularis, leest dit vóór
             jullie gesprek." · gesprek do 29 jan 10u10 · "Check van je afspraak: over 2 weken,
             je krijgt een seintje." · knop "Naar mijn rapport".
             09 vakleerkracht — header "5B"; S-sectie vervangen door vaste regel "Stiptheid:
             automatisch"; D-sectie met twee chips; chips uit het echte rapport; taalchip
             gelabeld "(OKAN-set, voorbeeld)".
             10 klassenraad — header "5B"; cel "A → B (A)"; "Bewaar ook als teamnotitie";
             footerregel "instelbaar per school"; "… nog 17 leerlingen".
             Captions — titels blijven; body ≤ 2 zinnen: "Keuze: … In plaats van: …".
             Cover — één alinea probleem (drie oorzaken), scopezin, vier toestand-notities uit
             de oude 10–11, drie open vragen.
             Prototype — connecties 01→02→03→04→05→06→07→08; ON_PRESS op de geblurde kaart van 04.

BEHAVIOUR:   Eén domein van verschil tot plan: het enige verschil op 04 is Attitude, 05 bespreekt
             het, 06 plant het, 07 deelt het, 08 bevestigt en sluit de lus naar 01. Tik overal;
             de hold-to-reveal op 04 is pacing (de leerling kiest het moment), op chromebook een
             klik. Vier streepjes alleen op de zelfcheck (02/03), nergens anders. Periode 2 overal:
             "in november", check 15 januari, les 13 januari, gesprek 29 januari kloppen samen.
             Eén woordenboek: de leerling ziet "Periode n" (nooit DW); "mevr. Devos, je titularis"
             bij eerste vermelding, daarna "mevr. Devos"; A/B nooit in de JIJ/SCHOOL-vakjes.
             Zwart alleen voor geselecteerd en primaire CTA. Geen ontwerpersredenering als
             leerlingtekst. Elke stelling over schoolprocessen op board of caption is een
             hypothese, geen vaststelling; geen cijfers zonder bron.

CONSTRAINTS: Wireframe blijft: grijstinten, geen merk, geen tokens, geen componenten, geen kleur.
             375 px mobiel; klassenraad breed. Statusbalk zonder platformkenmerken. CTA's
             gepind op dezelfde hoogte. Geen "OKAN" in headers; OKAN alleen als gelabeld
             voorbeeld. Geen effectgroottes of jargon in captions. Schermen top-level in
             Sections, niets genest in een board-frame. Niets verwijderen: oude frames naar
             Archief, verborgen. Bestand hernoemen "SODAplus — attituderapport (praktijkopdracht)".
             Geen code-prototype (geparkeerd). Na elke edit-ronde verse screenshots bekijken.
```

---

## Open vragen

**Voor Jeroen:** geen — beslissingen 1–6 zijn genomen op 2026-08-25.

**Voor SODAplus (gaan mee in de video en op de cover):**

- [ ] Leeft dit in Smartschool (rapportmodule/LVS) of in jullie eigen platform — en welke data (aanwezigheden, observaties) is er vandaag al?
- [ ] Is de OKAN-context van het voorbeeld typerend, of één school van de 58?
- [ ] Wie ziet de zelfinschatting — alleen de leerling, ook de titularis, ook de ouders? En wie is verwerkingsverantwoordelijke?

## Aannames

- `[ASSUMPTION]` Gespreksdatum (do 29 jan 10u10) en les (di 13 jan) zijn fictief maar onderling consistent met periode 2.
- `[ASSUMPTION]` Bij "Ik zie het anders" op 05 wordt het plan optioneel en het verschil een agendapunt — alleen als caption, niet als scherm.
- `[ASSUMPTION]` De ALS-bibliotheek per domein bestaat ook zonder leerkrachtobservaties (degradatiepad); de hint op 06 zegt dat.
- `[ASSUMPTION]` Namen (Amine B., mevr. Devos, Yassine, 5B) blijven verzonnen; de klassenraadzinnen komen letterlijk uit het echte rapport en blijven in de inzending.

## Acceptatie

- [x] Board: cover + Sections "Leerling — de opdracht" / "Schoolzijde — daarna" / "Archief" (verborgen); geen scherm genest in een board-frame; ondertitel "umanex voor SODAplus" weg
- [ ] Bestand hernoemd naar "SODAplus — attituderapport (praktijkopdracht)" — handmatig, `figma.root.name` is via de API niet schrijfbaar
- [x] Prototype-connecties 01→…→08 aanwezig; 04 heeft ON_PRESS op de geblurde kaart
- [x] Eén domein van verschil tot plan: 04 verschil = Attitude, 05 = Attitude, 06 = Attitude-plan, 07 toont die zin én de knopkeuze van 05
- [x] Geen zin op 07 die op geen scherm ontstaat
- [x] 04 en 05 hebben een CTA; 08 bestaat en sluit de lus (gedeeld · gespreksdatum · check over 2 weken · naar mijn rapport)
- [x] Voortgang alleen op 02/03; "STAP 1 VAN 3" weg
- [x] Periode 2 overal; november / 15 jan / 13 jan / 29 jan consistent; "Twee periodes op rij"
- [x] JIJ DACHT / SCHOOL met "dit lukt" / "werkpunt"; letter alleen in de tag; "mevr. Devos, je titularis" eenmaal geïntroduceerd; leerling ziet nergens "DW"
- [x] Geen "OKAN" in headers; taalchip gelabeld als voorbeeld-set; chips uit het echte rapport aanwezig op 09/10
- [x] Elke caption-body ≤ 2 zinnen in "Keuze / In plaats van"; geen effectgroottes, geen "calibratie", "standing", "vrijgavegebaar", "geroute"; titels behouden
- [x] Geen ontwerpersredenering als leerlingtekst; 04 draagt "Twee periodes op rij A." en "Jij en de school zien hetzelfde."
- [x] "Dit delen we niet" (03) en "WAT WE NIET DELEN" (07) zonder regel over gewiste tekst
- [x] 09 zonder S-chip, met vaste stiptheidsregel en D-sectie; 10 met "A → B (A)", "Bewaar ook als teamnotitie", "instelbaar per school", "… nog 17 leerlingen"
- [x] Zwart alleen geselecteerd + primaire CTA; 06-samenvattingskaart wit met rand; statusbalk neutraal; CTA's op één hoogte
- [x] Cover: probleem in één alinea, scopezin, vier toestand-notities, drie open vragen
- [x] Oude 10–11 in Archief, verborgen, niet verwijderd
- [x] Verse screenshot van elk scherm bekeken na de laatste edit; geen overlap, geen afgekapte tekst
- [ ] PDF-export van het board en viewlink "iedereen met de link kan bekijken" gemaakt

## Beslissingsgeschiedenis

- 2026-08-25: 06 verschuift van Orde naar Attitude (beslissing 1a). Reden: één domein van verschil tot plan; het Orde-plan was bijna letterlijk de afspraak van 01, en de gedeelde zin op 07 ontstond nergens.
- 2026-08-25: Oude 10–11 geschrapt als schermen, gedachten naar de cover (beslissing 4). Reden: randgevallen als frames claimen inspanning die de opdracht niet vraagt; als notities tonen ze hetzelfde systeemdenken. Niet verwijderd maar gearchiveerd en verborgen — omkeerbaar.
- 2026-08-25: Scherm 08 (bevestiging) toegevoegd. Reden: de lus naar 01 had geen sluiting en de flow geen enkel feedbackmoment terwijl doelstelling 3 "feedback" letterlijk noemt.
- 2026-08-25: Schoolzijde uit de opdracht-sectie, alleen benoemen in de video (beslissing 3). Reden: SODAplus verkoopt "geen nieuwe tools, gewoon deel van Smartschool"; een tweede leerkracht-app tegenover hun technisch team leest als niet-complementair. Blijft op het board als "daarna" met minimale fixes.
- 2026-08-25: Rapport van periode 3 naar periode 2. Reden: alleen dan kloppen "in november", 15 januari en 13 januari.
- 2026-08-25: Board zonder umanex-branding (beslissing 6); code-prototype geparkeerd (beslissing 5); uur-verhaal = tooling benoemen en keuzes claimen (beslissing 2a) — dat laatste leeft in het videoscript, niet op het board.

- 2026-08-25: Gebouwd. Node-ids: cover 50:52 · 08 = 50:11 · caption 08 = 50:42 · sections 49:2 / 49:3 / 49:4 / 49:5. Prototype: 11 reacties (ON_CLICK, 04-kaart ON_PRESS), flow-startpunt "Leerlingflow" op 01. Section-fills expliciet #ebebeb gezet omdat de export anders donker rendert.
