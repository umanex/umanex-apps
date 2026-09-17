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

- [ ] Typologie: één kaart bovenaan `/`, boven het maandraster, geen overlay en geen bedieningselementen — geen `button`/`input`/`a` in de nieuwe component
- [ ] States: laden en laadfout n.v.t. (DataGate); leeg document toont "Onvoldoende gegevens" met wat er ontbreekt, nooit € 0
- [ ] States: geen maand die binnen 13 weken eindigt → eigen tekst, geen getal
- [ ] Interactie n.v.t. — de kaart is tekst; navigeren in de ledger verandert haar niet (scenario met "Een maand vooruit")
- [ ] Het getal is gelijk aan het laagste maandeinde op `/bureau/cash` en aan de footer-Buffer van diezelfde maand op `/`
- [ ] De maand van het laagste punt staat in woorden in de kaart
- [ ] "gedekt" of "tekort" staat er als woord, niet alleen als kleur
- [ ] Regel 2 telt op: vrij + bufferpot = het getal (zichtbare bedragen gemeten)
- [ ] Zonder bufferpot in het venster: geen regel 2, en het getal blijft gelijk aan de footer
- [ ] Oorzaak: de genoemde kop is de grootste absolute afwijking tegenover de maand ervóór (unit-test met tegenproef die een andere kop laat winnen)
- [ ] Oorzaak: is het laagste punt de ankermaand, dan noemt de kaart de grootste kostenkop van die maand (unit-test)
- [ ] Contrast: alle nieuwe tekst boven AA (`verify:visual` + flow-contrastscenario)
- [ ] De kaart kost hoogstens drie tekstregels; de drie maandfooters blijven op één horizontale lijn (harness-meting van de footer-y per kolom)
- [ ] Geen P0/P1 uit code-review en verify

## Beslissingsgeschiedenis

- 2026-09-17: getal = laagste punt in 13 weken (niet "eind volgende maand"), gelijk aan de Bureau-tegel.
- 2026-09-17: oorzaak = grootste verschil met de maand ervóór (niet de grootste kostenkop) — die verklaart de daling, niet enkel de omvang.
- 2026-09-17: geen signalen in de strook; die blijven op Bureau.
- 2026-09-17: vorm = kaart met twee à drie regels (niet één regel, niet drie kolommen).
