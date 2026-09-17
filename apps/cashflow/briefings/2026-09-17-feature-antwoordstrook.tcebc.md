# Antwoordstrook op de prognose — "kom ik rond?" boven de ledger

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** cashflow (`apps/cashflow`)
- **Klant:** umanex
- **Status:** gevalideerd — 2026-09-17, 2 iteraties (code-review: 2 P1 en 1 P2 in de oorzaakregel, alle drie gefixt)
- **Plan:** `~/.claude/plans/fizzy-strolling-origami.md`, stap 1c (critique 22/40, P1-1)
- **Bouwt op:** `2026-09-17-feature-een-geldtaal.tcebc.md` (gevalideerd, PR #527)

---

```
TASK:        Boven de ledger op `/` één kaart die "kom ik rond?" beantwoordt in woorden en één getal.
CONTEXT:     De ledger opent op drie maandkolommen; het antwoord staat nu verspreid over footer,
             Analyse en Bureau. De strook rekent vanaf vandaag, los van de maandnavigatie.
ELEMENTS:    Nieuwe kaart `CashAnswer` bovenaan `app/page.tsx`: regel 1 laagste punt in 13 weken
             (Buffer) + maand + "gedekt"/"tekort"; regel 2 de brug "vrij € X + bufferpot € Y";
             regel 3 de oorzaak. Geen signalen, geen knoppen, geen links.
BEHAVIOUR:   Alleen lezen. Oorzaak = de kop met het grootste verschil tegenover de maand ervóór,
             alléén tussen twee maanden op vrije basis; over de ankergrens (standen tegen stromen)
             en in de ankermaand zelf: de grootste post van die maand. Navigeren verandert niets.
CONSTRAINTS: Rekenkern ongemoeid. Light-only. Twee à drie regels hoog (de kolommen hebben tot
             stap 5 een vaste hoogte). Rol-utilities uit de preset. Woorden uit de geldtaal.
```

---

## Open vragen

_(leeg)_

## Aannames

- [ASSUMPTION: de kaart hangt binnen `DataGate`, dus laden en laadfout worden daar al afgehandeld; de kaart krijgt geen eigen skeleton.]
- [ASSUMPTION: zonder bufferpot in het venster vervalt regel 2, zoals de footer op hetzelfde scherm — Buffer is dan Vrij. Dit wijkt af van tegel en cashpagina, die "+ bufferpot € 0" tonen (backlog-item 2026-09-17).]
- [ASSUMPTION: "de kop met het grootste verschil" kijkt naar vijf koppen als **stroom** van die maand — eigen inkomsten (niet de sectiekop, die draagt het saldo), vast, eenmalig, budgetten, provisies (in de ankermaand gecorrigeerd voor de al opgebouwde stand) — en kiest de grootste absolute afwijking; bij gelijkspel de eerste in die volgorde. De bufferpot staat er niet in: die neemt op wat overblijft en staat bovenaan al als bezit.]
- [ASSUMPTION: de kaart noemt de maand van het laagste punt, ook als dat een vierde maand is die niet in de ledger staat. Gemeten over 1.096 dagen komt dat op 2 dagen voor (30-11-2026 en 31-01-2028).]
- [ASSUMPTION: de strook toont de maand van het laagste punt, ook als dat de huidige maand is.]

## Acceptatie

- [x] Typologie: één kaart bovenaan `/`, boven het maandraster, geen overlay — bewijs: `CashAnswer.tsx` staat als eerste kind vóór de `<section>` met het raster (`app/page.tsx:68`), en is een `<section>`, geen dialoog
- [x] Geen bedieningselementen in de kaart — bewijs: 0 treffers op `<button|<input|<a |<select|onClick` in `components/cashflow/CashAnswer.tsx`
- [x] States: laden en laadfout n.v.t. voor de kaart — bewijs: `DataGate` monteert `app/page.tsx` pas als de stand geladen is (commentaar r. 20-21), en de harness-scenario's "state — laden" en "state — fout" tonen die twee standen buiten de kaart
- [x] States: leeg document toont wat er ontbreekt, nooit € 0 — bewijs: harness "state — leeg": kaart op `data-cash-answer="leeg"` en 0 × `[data-answer-value]`
- [x] States: geen maand binnen 13 weken → eigen tekst, geen getal — bewijs: unit-test "leeg document en geen maand binnen de horizon" (april begint binnen de horizon, eindigt erbuiten). Vanuit de app onbereikbaar: het venster begint altijd bij de ankermaand en die eindigt binnen 13 weken (review mat 0 van 1.096 dagen); de tak blijft staan voor een los aangeroepen venster en staat zo in de code beschreven
- [x] Interactie n.v.t.: navigeren in de ledger verandert de kaart niet — bewijs: harness "antwoord — kaart blijft op vandaag": ledger September → Oktober 2026, kaart blijft −237,42; tegenproef zonder navigatie valt om op de eigen controle "er is niet genavigeerd"
- [x] Het getal is gelijk aan het laagste maandeinde op `/bureau/cash` — bewijs: harness "antwoord — kaart toont de laagste Buffer": kaart −237,42 = kopgetal −237,42; tegenproef (+100 op kaart én brug, zodat de optelling klopt) valt om op precies die vergelijking. Twee renders van dezelfde afleiding, geen tweede rekenweg
- [x] Datzelfde getal is de footer-Buffer van die maand op `/` — bewijs: de keten uit stap 1, scenario "geldtaal — cash toont de laagste Buffer, gelijk aan de footer op /" (3 maanden gelijk), nog groen in deze run
- [x] De maand van het laagste punt staat in woorden — bewijs: de kaarttekst matcht `laagste punt, eind [a-z]+ \d{4}` (harness), en de static render toont "eind november 2026"
- [x] "gedekt" of "tekort" staat er als woord — bewijs: harness leest `[data-answer-stand]` en eist een van beide woorden; static render toont beide standen
- [x] Regel 2 telt op: vrij + bufferpot = het getal — bewijs: harness vergelijkt de attributen van `[data-answer-bridge]` met het kaartgetal (−237,42 + 0); tegenproef valt om
- [x] Zonder bufferpot in het venster: geen regel 2 — bewijs: harness "antwoord — zonder bufferpot geen brugregel" op de standaardfixture: 0 brugregels, footer meldt "Geen buffer", kaart toont 4.682,58
- [x] Oorzaak: de grootste absolute afwijking tegenover de maand ervóór — bewijs: unit-test "oorzaak: de kop met het grootste verschil" (inkomsten −500) mét tegenproef waarin provisies +3.000 wint
- [x] Oorzaak: zonder vorige maand de grootste kostenkop — bewijs: unit-test "is het laagste punt de eerste maand": `{ soort: 'grootste-kost', kop: 'vast', bedrag: 1.000 }`
- [x] Contrast: alle nieuwe tekst boven AA — bewijs: `verify:visual` 463 tekstelementen boven AA (was 443; +20 door de vier kaartfixtures)
- [x] De kaart is hoogstens een titel plus drie regels — bewijs: harness meet de kaarthoogte en weigert boven 160 px; gemeten op de bufferfixture binnen die grens
- [x] De drie maandfooters staan op één lijn en blijven in beeld — bewijs: harness meet drie gelijke `top`-waarden en eist dat de onderkant binnen het venster valt; mutant met de oude kolomhoogte (`100vh-11rem`) valt om met "3 footer(s) onder de vouw: onderkant 1079 bij 1000 px"
- [x] Er wordt niet vergeleken over de ankergrens — bewijs: unit-test "over de ankergrens wordt niet vergeleken": een huur die elke maand € 2.000 is maar in de ankermaand al afgevinkt staat, levert geen "€ 2.000 hoger" meer maar de grootste post van die maand
- [x] De provisiekop van de ankermaand telt als storting, niet als opgebouwde stand — bewijs: unit-test "de provisiekop wordt gecorrigeerd": kop € 9.000 (8.000 stand + 1.000 storting) verliest van een huur van € 2.000
- [x] De bufferpot wordt nooit als post genoemd — bewijs: unit-test "de bufferpot komt nooit als post op de kaart": pot van € 10.000 in de ankermaand, oorzaak blijft "vaste uitgaven"; `KOSTEN` in `outlook.ts` bevat hem niet
- [x] Een pot die pas ná het laagste punt begint, geeft geen brugregel — bewijs: unit-test "een pot die pas ná het laagste punt begint": `heeftBufferpot` false, terwijl de pot wel in het venster zit
- [x] Geen P0/P1 uit code-review en verify — bewijs: review 2026-09-17 vond 2 P1 en 1 P2, alle drie in de oorzaakregel en alle drie gefixt (`outlook.ts` rekent nu op stromen); de kruiscontrole van de tegenproef raakt sinds dan ook de vergelijking met `/bureau/cash` ("kaart −137,42 ≠ kopgetal −237,42"). Resterende P3's staan in `apps/cashflow/BACKLOG.md`

## Beslissingsgeschiedenis

- 2026-09-17: getal = laagste punt in 13 weken (niet "eind volgende maand"), gelijk aan de Bureau-tegel.
- 2026-09-17: oorzaak = grootste verschil met de maand ervóór (niet de grootste kostenkop) — die verklaart de daling, niet enkel de omvang.
- 2026-09-17: geen signalen in de strook; die blijven op Bureau.
- 2026-09-17: vorm = kaart met twee à drie regels (niet één regel, niet drie kolommen).
- 2026-09-17 (na review): de oorzaakregel rekent op stromen in plaats van op subtotaal-koppen. Over de ankergrens wordt niet meer vergeleken (standen tegen stromen gaf een huur van € 2.000 als "€ 2.000 hoger"), inkomsten meten op de eigen inkomst van die maand (de kop droeg het saldo van de vorige maand en vertelde de daling opnieuw), de provisiekop van de ankermaand wordt gecorrigeerd voor de opgebouwde stand, en de bufferpot verdween uit de koppen — hij stond bovenaan al als bezit.
