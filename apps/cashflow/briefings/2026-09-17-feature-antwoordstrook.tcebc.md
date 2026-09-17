# Antwoordstrook op de prognose — "kom ik rond?" boven de ledger

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** cashflow (`apps/cashflow`)
- **Klant:** umanex
- **Status:** gepland
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
BEHAVIOUR:   Alleen lezen. Oorzaak = de kop met het grootste verschil tegenover de maand ervóór
             ("inkomsten € 6.648 lager dan oktober"); is het laagste punt de ankermaand, dan de
             grootste kostenkop van die maand. Navigeren in de ledger verandert de kaart niet.
CONSTRAINTS: Rekenkern ongemoeid. Light-only. Twee à drie regels hoog (de kolommen hebben tot
             stap 5 een vaste hoogte). Rol-utilities uit de preset. Woorden uit de geldtaal.
```

---

## Open vragen

_(leeg)_

## Aannames

- [ASSUMPTION: de kaart hangt binnen `DataGate`, dus laden en laadfout worden daar al afgehandeld; de kaart krijgt geen eigen skeleton.]
- [ASSUMPTION: zonder bufferpot in het venster vervalt regel 2, zoals de footer op hetzelfde scherm — Buffer is dan Vrij. Dit wijkt af van tegel en cashpagina, die "+ bufferpot € 0" tonen (backlog-item 2026-09-17).]
- [ASSUMPTION: "de kop met het grootste verschil" kijkt naar de subtotalen-koppen (saldo + inkomsten, vast, eenmalig, budgetten, provisies, bufferpot) en kiest de grootste absolute afwijking; bij gelijkspel de eerste in die volgorde.]
- [ASSUMPTION: de strook toont de maand van het laagste punt, ook als dat de huidige maand is.]

## Acceptatie

- [x] Typologie: één kaart bovenaan `/`, boven het maandraster, geen overlay — bewijs: `CashAnswer.tsx` staat als eerste kind vóór de `<section>` met het raster (`app/page.tsx:68`), en is een `<section>`, geen dialoog
- [x] Geen bedieningselementen in de kaart — bewijs: 0 treffers op `<button|<input|<a |<select|onClick` in `components/cashflow/CashAnswer.tsx`
- [x] States: laden en laadfout n.v.t. voor de kaart — bewijs: `DataGate` monteert `app/page.tsx` pas als de stand geladen is (commentaar r. 20-21), en de harness-scenario's "state — laden" en "state — fout" tonen die twee standen buiten de kaart
- [x] States: leeg document toont wat er ontbreekt, nooit € 0 — bewijs: harness "state — leeg": kaart op `data-cash-answer="leeg"` en 0 × `[data-answer-value]`
- [x] States: geen maand binnen 13 weken → eigen tekst, geen getal — bewijs: unit-test "leeg document en geen maand binnen de horizon" (april begint binnen de horizon, eindigt erbuiten: `monthEnds` leeg, uitkomst `geen-maand`); static render toont die stand
- [x] Interactie n.v.t.: navigeren in de ledger verandert de kaart niet — bewijs: harness "antwoord — kaart blijft op vandaag": ledger September → Oktober 2026, kaart blijft −237,42; tegenproef zonder navigatie valt om op de eigen controle "er is niet genavigeerd"
- [x] Het getal is gelijk aan het laagste maandeinde op `/bureau/cash` — bewijs: harness "antwoord — kaart toont de laagste Buffer": kaart −237,42 = kopgetal −237,42; tegenproef (+100 op het kaartgetal) valt om
- [x] Datzelfde getal is de footer-Buffer van die maand op `/` — bewijs: de keten uit stap 1, scenario "geldtaal — cash toont de laagste Buffer, gelijk aan de footer op /" (3 maanden gelijk), nog groen in deze run
- [x] De maand van het laagste punt staat in woorden — bewijs: de kaarttekst matcht `laagste punt, eind [a-z]+ \d{4}` (harness), en de static render toont "eind november 2026"
- [x] "gedekt" of "tekort" staat er als woord — bewijs: harness leest `[data-answer-stand]` en eist een van beide woorden; static render toont beide standen
- [x] Regel 2 telt op: vrij + bufferpot = het getal — bewijs: harness vergelijkt de attributen van `[data-answer-bridge]` met het kaartgetal (−237,42 + 0); tegenproef valt om
- [x] Zonder bufferpot in het venster: geen regel 2 — bewijs: harness "antwoord — zonder bufferpot geen brugregel" op de standaardfixture: 0 brugregels, footer meldt "Geen buffer", kaart toont 4.682,58
- [x] Oorzaak: de grootste absolute afwijking tegenover de maand ervóór — bewijs: unit-test "oorzaak: de kop met het grootste verschil" (inkomsten −500) mét tegenproef waarin provisies +3.000 wint
- [x] Oorzaak: zonder vorige maand de grootste kostenkop — bewijs: unit-test "is het laagste punt de eerste maand": `{ soort: 'grootste-kost', kop: 'vast', bedrag: 1.000 }`
- [x] Contrast: alle nieuwe tekst boven AA — bewijs: `verify:visual` 463 tekstelementen boven AA (was 443; +20 door de vier kaartfixtures)
- [x] De kaart is hoogstens drie tekstregels hoog — bewijs: harness meet de kaarthoogte en weigert boven 160 px; gemeten op de bufferfixture binnen die grens
- [x] De drie maandfooters staan op één lijn en blijven in beeld — bewijs: harness meet drie gelijke `top`-waarden en eist dat de onderkant binnen het venster valt; mutant met de oude kolomhoogte (`100vh-11rem`) valt om met "3 footer(s) onder de vouw: onderkant 1079 bij 1000 px"
- [ ] Geen P0/P1 uit code-review en verify

## Beslissingsgeschiedenis

- 2026-09-17: getal = laagste punt in 13 weken (niet "eind volgende maand"), gelijk aan de Bureau-tegel.
- 2026-09-17: oorzaak = grootste verschil met de maand ervóór (niet de grootste kostenkop) — die verklaart de daling, niet enkel de omvang.
- 2026-09-17: geen signalen in de strook; die blijven op Bureau.
- 2026-09-17: vorm = kaart met twee à drie regels (niet één regel, niet drie kolommen).
