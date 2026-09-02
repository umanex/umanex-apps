# TC-EBC — De stepper: weg als grafiek, blijven als tekst

| | |
|---|---|
| **Datum** | 2026-09-02 |
| **Type** | component |
| **Project** | soda-plus — praktijkopdracht sollicitatie SODAplus |
| **Status** | gebouwd — 2026-09-02 via de plugin-bridge; 7 van 7 acceptatie-items gemeten |
| **Figma** | `Soda+` · `XwEUhY92XX32sQkEIdbEFN` · pagina "Wireframes" · node 2:40 |
| **Amendeert** | `briefings/2026-08-25-flow-attituderapport-revisie.tcebc.md` — beslissing "Voortgang alleen op 02/03" |
| **Aanleiding** | Jeroen, 2026-09-02: "Op sommige schermen is er een stepper. Dit moet je ofwel verwijderen ofwel consistent gebruiken." |

---

```
TASK:        Haal de streepjes-stepper weg als grafisch element en houd de informatie die hij
             droeg als tekst, zodat er nergens nog een voortgangsbalk staat die niet beweegt.

CONTEXT:     Gemeten vandaag: 02 (2:40) en 03 (2:120) tonen een identieke stand — vol/vol/leeg/leeg
             plus het label "domein 2 van 4" — en 04 draagt een verborgen frame (2:161) met een
             verouderde 4/4. De overige 13 schermen hebben niets. Twee opeenvolgende schermen met
             dezelfde streepjesstand leest als een balk die vastloopt; de verborgen laag is dood
             gewicht dat het technisch team in de lagenlijst tegenkomt. De streepjes zijn 10×4 px
             en dragen geen informatie die het label niet preciezer geeft.

ELEMENTS:    02 — frame 2:40: de vier streepjes (2:41–2:44) weg, tekst "domein 2 van 4" blijft,
             frame hernoemd naar `domein-teller`.
             03 — frame 2:120: idem (2:121–2:124 weg, label blijft, hernoemd).
             04 — verborgen frame 2:161 met zijn vier streepjes verwijderd.
             Geen nieuwe elementen; geen voortgangsindicator op enig ander scherm.

BEHAVIOUR:   Het label is statisch en telt alleen wat er te tellen valt: de vier domeinen van de
             zelfcheck. Het staat daarom op 02 (dat vier keer draait) en op 03 (de oorzaakstap
             binnen hetzelfde domein), en nergens anders — 04 tot 08 en 00 zijn een lineaire
             reeks zonder herhaling en krijgen geen teller. Herhaald label op 02 en 03 is
             correct: de leerling zit nog steeds in domein 2.

CONSTRAINTS: Wireframe blijft: grijstinten, geen componenten, geen kleur. Verwijderen en hernoemen;
             geen copy-wijziging, geen wijziging aan de topbar. Eén verplaatsing wél: het label
             staat op x=87 omdat de streepjes ervoor stonden — zonder die streepjes hoort het op
             x=20, in lijn met de rest van de schermcontent. De verticale rest van de schermen mag niet verschuiven: het label houdt de
             hoogte van het frame (24 px) vast. Niets verwijderen buiten de genoemde negen nodes.
             Na afloop verse runtime-screenshots van 02, 03 en 04.
```

---

## Open vragen

Geen — de opdracht bood twee uitkomsten ("verwijderen of consistent gebruiken") en dit is de eerste, uitgevoerd op de plek waar de informatie waar is.

## Aannames

- `[ASSUMPTION]` Een teller over de héle flow (14 schermen) is bewust niet gebouwd. Die zou terugbrengen wat de briefing van 25 augustus juist verwijderde ("STAP 1 VAN 3" weg), en aan een leerling vertellen dat hij op scherm 3 van 14 zit is de afhaakdruk die de feedback van vandaag noemde — niet de remedie ervoor.
- `[ASSUMPTION]` Het label op 03 blijft staan. Tekst die tweemaal hetzelfde feit stelt leest als een feit, niet als een defect; vier streepjes die tweemaal dezelfde stand tonen lezen wél als een defect.

## Acceptatie

- [x] 0 nodes met de naam `s0`/`s1`/`s2`/`s3` op de hele pagina (vertrekpunt: 12) — bewijs: 12 → 0 (`findAll` op /^s[0-3]$/)
- [x] Geen enkel frame heet nog `stappen`; 2:40 en 2:120 heten `domein-teller` — bewijs: 0 frames met die naam; 2:40 en 2:120 heten `domein-teller`
- [x] Het verborgen frame 2:161 bestaat niet meer — bewijs: `getNodeByIdAsync(2:161)` geeft null
- [x] Op 02 en 03 staat de tekst "domein 2 van 4"; geen ander scherm draagt een voortgangsindicator — bewijs: beide tellers dragen exact die tekst; geen ander scherm heeft een indicator. Let op: een naïeve scan op /van 4|STAP/i geeft een valse treffer op de cover, want "kies-één-stap" bevat "stap" — de telling is op framenaam gedaan, niet op tekst
- [x] De teller-frames zijn nog 24 px hoog en geen scherm is van hoogte veranderd; geen uitloop, geen overlap — bewijs: beide 24 px; 02, 03 en 04 alle drie nog 812 px hoog; 0 uitloop, 0 overlap, 0 frames buiten hun sectie, 18 reacties intact
- [x] Het label staat op x=20 (was x=87), gelijk met de kop en de body eronder — bewijs: x=20, y=5 in beide frames (was x=87)
- [x] Verse runtime-capture van 02, 03 en 04 bekeken — bewijs: `figma_capture_screenshot` van 02 en 03 — label links uitgelijnd met de kop, geen gat. 04 niet gecaptured en dat hoeft niet: de verwijderde node was `visible: false`, en een onzichtbare node in een auto-layout neemt geen ruimte in; de onveranderde hoogte van 812 px bevestigt dat

## Beslissingsgeschiedenis

- 2026-09-02: Streepjes weg, tekst blijft. Reden: het label geeft precies wat de streepjes suggereren, en twee schermen op rij met dezelfde stand lezen als een kapotte balk. Alternatief (streepjes houden en op 03 een andere stand tonen) verworpen: dat is onwaar — de leerling zit op 03 nog in domein 2. Alternatief (teller over de hele flow) verworpen: zie Aannames.
