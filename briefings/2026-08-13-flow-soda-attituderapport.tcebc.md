# TC-EBC — Digitaal SODA-attituderapport (zelfevaluatie-flow)

| | |
|---|---|
| **Datum** | 2026-08-13 |
| **Type** | flow |
| **Project** | SODAplus — praktijkopdracht sollicitatie UI/UX Developer |
| **Klant** | SODAplus vzw (Zevergem) — prospect, niet onder umanex-merk |
| **Status** | gebouwd |
| **Figma** | `Soda+` · file `XwEUhY92XX32sQkEIdbEFN` · board "SODA+ — digitaal attituderapport · wireframes" |

---

```
TASK:        Herontwerp het papieren SODA-attituderapport tot een digitale flow waarin de leerling
             eerst zijn eigen gedrag inschat, pas daarna de beoordeling van de school ziet, en
             tussen beide het verschil als gespreksagenda krijgt in plaats van de score.

CONTEXT:     Vervangt het A4 "SODA+ RAPPORT" (KTA Brugge, klas OKANOR). Vier domeinen S/O/D/A ×
             vier periodes DW1–DW4, per cel A of B, een kolom klassenraad-feedback, per periode
             een leeg kader "Oplossing voor de B-scores volgens de leerling", ouderhandtekening.
             In het echte exemplaar: B is de norm (8 van 12 cellen), Stiptheid en Orde staan drie
             periodes op B, en het oplossingskader is alle drie de keren volledig leeg.
             Doelgroep bevat anderstalige nieuwkomers (OKAN) in technisch secundair.

ELEMENTS:    Leerling — Periodestart met de vorige afspraak · Zelfcheck per domein (3 gedrags-
             items met frequentieschaal + A/B-voorspelling + "weet ik niet") · Oorzaakchips ·
             Onthulling (overeenstemming eerst, verschil onder hold-to-reveal) · Verschildetail
             met "wat de leerkracht zag" (gedateerde telling + kalenderstrip) apart van "hoe de
             leerkracht het las" · Planbouwer met slots ALS · DAN · WIE HELPT + checkdatum ·
             Deelscherm met preview van het leerkrachtscherm en de privélaag.
             School — Vakleerkracht: observatiechips in twee taps, automatisch gedateerd ·
             Klassenraad: klastabel met vooringevulde scores, bevestigen i.p.v. invullen,
             trait-routing en zichtbare gesprekscapaciteit.

BEHAVIOUR:   Vergrendelde wizard: de schoolscore is pas bereikbaar na alle vier de zelfchecks;
             "Toon mijn rapport" blijft als uitweg bereikbaar en leidt daarna naar dezelfde,
             dan optionele, reflectiestap. De leerling scoort op gedragsfrequentie, de school op
             A/B — twee assen, dus geen te manipuleren match. Vóór de onthulling is alles
             goedkoop: één oorzaakchip per verwacht werkpunt. Ná de onthulling staat het dure
             werk: de als-dan-planbouwer, alleen op werkpunten die echt bestaan. De onthulling
             opent op overeenstemming (beste domein eerst), toont één domein per keer, zonder
             kleur, en het verschil komt pas in beeld bij ingedrukt houden. Bij vier werkpunten
             kiest de leerling er één; de rest wordt bewaard. De leerling bepaalt wat gedeeld
             wordt en ziet vooraf letterlijk wat de titularis te zien krijgt.

CONSTRAINTS: Wireframe, grijstinten, geen visuele afwerking, geen tokens, geen componentsysteem.
             Mobiel-first 375px (leerling op gsm of chromebook); alleen de klassenraadweergave is
             breed. Taalniveau A1–A2: geen abstracte substantieven in de leerlingweergave —
             S/O/D/A worden eerste-persoonszinnen, de letters blijven als grijze tag voor school,
             ouders en print. Geen smileys, duimen of kleurcodering als enige drager. Geen punten,
             badges, streaks of klasvergelijking. Max 1 uur voor de set; code-prototype is
             uitgesteld tot na de Figma-set.
```

---

## Open vragen

**Voor Jeroen:** beantwoord — geen prototype voorlopig, Figma-bestand `Soda+` via Console MCP.

**Voor SODAplus (bewust open, gaan mee in de video):**

- [ ] Wie ziet de zelfinschatting — enkel de leerling, ook de titularis, ook de ouders? Het ontwerp kiest nu privé-tenzij-gedeeld. Kiest de school anders, dan verandert alleen de regel bovenaan de flow, maar het effect op eerlijkheid is reëel.
- [ ] Is OKAN de brede doelgroep of één van de scholen? Bepaalt of meertaligheid kern of randgeval is.
- [ ] Wat staat op de achterkant van het papieren rapport (voetnoot "* Zie achterkant")? Vermoedelijk de uitleg bij "Oplossing" — precies de tekst die deze flow vervangt.
- [ ] Blijft de ouderhandtekening, en in welke vorm? Voorstel: leesbevestiging na het gesprek in plaats van handtekening vooraf.
- [ ] Hoeveel tijd zit er tussen het vrijgeven van de scores en het gesprek met de titularis?
- [ ] Registreert de school te-laat-komen en afwezigheden al digitaal (Smartschool)? Zo ja, is Stiptheid meteen een telling in plaats van een oordeel.

## Aannames

- `[ASSUMPTION]` De leerling doet dit individueel, niet klassikaal naast elkaar. Klassikaal ondermijnt eerlijke zelfinschatting; het ontwerp dekt het gedeeltelijk af (geen kleur, hold-to-reveal), maar de rest is procesadvies.
- `[ASSUMPTION]` De vier periodes blijven bestaan als ritme (DW1–DW4).
- `[ASSUMPTION]` A/B blijft binair aan schoolzijde; nuance toevoegen is een schoolbeslissing, geen ontwerpvrijheid.
- `[ASSUMPTION]` De observatiebibliotheek per domein is opstelbaar met de school — de inhoud in de wireframes is geëxtrapoleerd uit de echte klassenraadzinnen.
- `[ASSUMPTION]` Namen in de wireframes (Amine B., mevr. Devos, Yassine) zijn verzonnen.

## Acceptatie

- [x] Vergrendelde wizard: de schoolscore staat achter de vier zelfchecks
- [x] Alle vier de domeinen komen voor, in eerste-persoonstaal én met de S/O/D/A-code als tag
- [x] De leerling scoort op gedragsfrequentie, niet op het abstracte domein
- [x] De A/B-voorspelling blijft, geformuleerd als voorspelling van de school, met "weet ik niet" als volwaardige derde optie
- [x] Vóór de onthulling kost het werkpunt één tik; het planwerk staat erna
- [x] De onthulling opent op overeenstemming, toont geen kleur en vraagt ingedrukt houden voor het verschil
- [x] Observatie (gedateerd, telbaar) staat fysiek gescheiden van interpretatie, met een antwoordmogelijkheid inclusief "ik zie het anders"
- [x] De oplossingsstap is invulbaar zonder één woord Nederlands te schrijven, met slots die hem narekenbaar maken
- [x] De periode opent met de afspraak van de vorige periode en de vraag of die gelukt is
- [x] De leerling ziet vóór het delen letterlijk wat de titularis krijgt, en wat privé blijft
- [x] Schoolzijde aanwezig: observatie in twee taps én een klassenraad die bevestigt in plaats van invult
- [x] Trait-taal wordt geroute, niet geblokkeerd
- [x] Edge case: alles A → eindigt zinvol zonder oplossingsstap
- [x] Edge case: vier werkpunten → de leerling kiest er één, de rest wordt bewaard
- [x] Edge case: late instroom → periodes vóór instroom worden niet getoond in plaats van leeg gelaten
- [x] State: periode nog niet vrijgegeven → eigen scherm met de lopende afspraak, geen leeg dashboard
- [x] Elk leerlingscherm is één beslissing, leesbaar op 375px
- [x] Wireframe-niveau: grijstinten, geen merkkleur, geen afgewerkte typografie
- [ ] Video van 3–5 min: probleeminterpretatie → flow → de drie doelstellingen met per doelstelling het verworpen alternatief → open vragen

## Beslissingsgeschiedenis

- 2026-08-13: Eén uitgewerkte richting in plaats van meerdere concepten met pro/contra — de afweging gaat naar de video-narratie, niet naar extra artefacten. Reden: opdracht begrensd op één uur en vraagt expliciet welke keuze de kandidaat máákt.
- 2026-08-13: Reveal ontworpen rond het verschil tussen zelfinschatting en schoolscore in plaats van rond de score. Reden: de score staat al op papier; de kloof is de enige nieuwe informatie en meteen de agenda van het gesprek.
- 2026-08-13: **Teruggedraaid** — de oplossingsstap stond eerst onmiddellijk na elk zelf-ingeschat werkpunt, dus vóór de onthulling. Nu gesplitst: één goedkope oorzaakchip vóór de onthulling, het volledige plan erna. Reden: een plan bedenken voor een B die misschien niet bestaat is speculatie, en blijkt het een A, dan heeft de leerling geleerd dat de stap nepwerk is. De brief vraagt "vóór het gesprek met de leerkracht", niet vóór de onthulling — de splitsing haalt beide doelen en houdt de eigen analyse onbesmet door het schooloordeel.
- 2026-08-13: Zelfinschatting verschoven van "A of B op het domein" naar drie gedragsitems met frequentie, met de A/B-voorspelling eronder. Reden: een abstract substantief in de tweede taal meet taalbegrip, geen gedrag; een frequentie is betwistbaar én verbeterbaar terwijl de letter B blijft staan.
- 2026-08-13: Schoolzijde toegevoegd aan de scope (twee schermen), hoewel de opdracht alleen de leerlingzijde vraagt. Reden: de oplosbaarheid van het oplossingskader wordt bepaald in de leerkracht-invoer een week eerder — wie alleen de leerlingzijde herontwerpt, digitaliseert een leeg kader.
- 2026-08-13: Onthulling opent op overeenstemming in plaats van op het verschil, en het verschil zit onder hold-to-reveal. Reden: standing vóór het moeilijk wordt, en 25 leerlingen doen dit tegelijk op een chromebook — wie meekijkt leest kleur en grootte, geen tekst.
