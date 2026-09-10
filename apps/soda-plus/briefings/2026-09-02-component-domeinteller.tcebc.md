# TC-EBC — De stepper: weg als grafiek, blijven als tekst

| | |
|---|---|
| **Datum** | 2026-09-02 |
| **Type** | component |
| **Project** | soda-plus — praktijkopdracht sollicitatie SODAplus |
| **Status** | gebouwd — 2026-09-02; daarna door Jeroen verder teruggebracht (label óók weg). Acceptatie hieronder beschrijft de **eindstaat**, hermeten om 18:09 |
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
- [x] Geen enkel scherm draagt nog een voortgangsindicator, ook niet als tekst — bewijs: 0 nodes met /domein \d van 4/ op de hele pagina (hermeten 18:09). De telling leeft in de body-copy van 02 ("Vier domeinen, elk drie korte vragen") en in de caption-titel ("02 · Vier keer, één scherm per domein"); 03 noemt het domein in zijn overline "JE DENKT: WERKPUNT BIJ ORDE"
- [x] Geen scherm is van hoogte veranderd; geen uitloop, geen overlap — bewijs: 02 en 03 nog 812 px na het volledig verwijderen van de teller-frames (2:40 en 2:120 bestaan niet meer); 0 uitloop, 0 overlap, 0 frames buiten hun sectie, 0 tekst breder dan zijn ouder, 18 reacties intact
- [x] Verse runtime-capture van 02, 03 en 04 bekeken — bewijs: `figma_capture_screenshot` van 02 en 03 — label links uitgelijnd met de kop, geen gat. 04 niet gecaptured en dat hoeft niet: de verwijderde node was `visible: false`, en een onzichtbare node in een auto-layout neemt geen ruimte in; de onveranderde hoogte van 812 px bevestigt dat

## Beslissingsgeschiedenis

- 2026-09-02: Streepjes weg, tekst blijft. Reden: het label geeft precies wat de streepjes suggereren, en twee schermen op rij met dezelfde stand lezen als een kapotte balk. Alternatief (streepjes houden en op 03 een andere stand tonen) verworpen: dat is onwaar — de leerling zit op 03 nog in domein 2. Alternatief (teller over de hele flow) verworpen: zie Aannames.
- 2026-09-02, 18:09: **Jeroen heeft ook het label verwijderd.** Mijn ronde haalde de grafiek weg en hield "domein 2 van 4" als tekst; hij heeft daarna 2:40 en 2:120 in hun geheel geschrapt. Hermeten: beide frames en beide labels bestaan niet meer, 02 en 03 gaan rechtstreeks van topbar naar body, hoogtes onveranderd op 812 px, board verder schoon. Dat is de tweede uitkomst die zijn opdracht toeliet ("ofwel verwijderen") en consequenter dan de mijne: een teller die op één plek in de flow staat is nog steeds een uitzondering. De informatie is niet verloren — 02 draagt "Vier domeinen, elk drie korte vragen" in de body en de caption heet "Vier keer, één scherm per domein". De drie acceptatie-items hierboven zijn herschreven naar deze eindstaat; het bewijs van de tussenstap staat in deze regel, zodat er geen vinkje blijft staan dat het bestand tegenspreekt.
