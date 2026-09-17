# Eén geldtaal — Buffer, Vrij en een zichtbare brug

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** cashflow (`apps/cashflow`)
- **Klant:** umanex
- **Status:** gepland
- **Plan:** `~/.claude/plans/fizzy-strolling-origami.md`, stap 1a + 1b (critique 22/40, P1-1)

---

```
TASK:        Eén woordpaar voor "kom ik rond" op Prognose, Analyse en Bureau, elk getal met zijn opbouw ernaast.
CONTEXT:     Vandaag drie verhalen: footer "Buffer −€295,99", Bureau-tegel "€ 4.731" (vrij vandaag),
             weektabel "−€7.107 tekort". Stap 0 (PR #525): het verschil is definitie, geen rekenfout.
ELEMENTS:    Maandfooter (BalanceFooter) · Runway-kaart · waterval · cashpositie-regel · KPI-tegel
             "cash" · cash-signaal · weektabel-intro · inkomstenkop · provisiekop ankermaand.
BEHAVIOUR:   Alleen lezen. Buffer = bufferpot + vrij; Vrij = geld buiten elke pot. Waar beide
             verschillen staat onder het getal een vaste tweede regel "vrij € X + bufferpot € Y".
             Kopgetal Bureau = laagste Buffer-maandeinde in 13 weken, mét maand.
             Weektabel: een opname uit de bufferpot valt in de week van het tekort, niet op maandeinde.
CONSTRAINTS: Rekenkern (calculator, subtotals) ongemoeid; wél weekmodel-timing. Light-only.
             Uitleg nooit alleen via hover/title. Rol-utilities uit de preset, geen nieuwe tokens.
```

---

## Open vragen

_(leeg)_

## Aannames

- [ASSUMPTION: "laagste punt" meet de **Buffer** (bufferpot + vrij), niet het vrije saldo — afgeleid uit
  beslissing 1 + 3. Met vrij zou een maand waarin alles in de pot zit "€ 0" tonen (okt 2026: vrij € 0,
  buffer € 196,88). Bij een tekort dat de pot leegt vallen beide samen (sep, nov).]
- [ASSUMPTION: het cash-signaal blijft oordelen op dezelfde maandeinden, nu uitgedrukt als Buffer; de
  drempel `negativeCash.floor` verandert niet.]
- [ASSUMPTION: de inkomstenkop draagt het saldo al (Beginsaldo/Vorig saldo staat ín de sectie); de titel
  zegt dat voortaan, het bedrag blijft gelijk.]
- [ASSUMPTION: zonder bufferpot is Buffer = Vrij en vervalt de brugregel; de hint "Geen buffer" blijft.]

## Acceptatie

- [ ] Typologie: inline tekst, geen overlay of tooltip — geen nieuw `title`-attribuut in de gewijzigde bestanden (grep op de diff)
- [ ] States n.v.t. voor laden/fout — de wijziging raakt alleen gerenderde tekst binnen bestaande DataGate-states; leeg document blijft "Onvoldoende gegevens" (scenario "bureau — leeg" groen)
- [ ] Interactie n.v.t. — geen nieuwe bedieningselementen (aantal `button`/`input` per scherm gelijk aan vóór, harness-telling)
- [ ] Footer: kolom met bufferpot én vrij ≠ buffer toont "vrij € X + bufferpot € Y" als zichtbare tekst, som = Buffer op de cent
- [ ] Footer: kolom zonder bufferpot toont géén brugregel
- [ ] Bureau-tegel "cash": groot getal = laagste Buffer-maandeinde binnen de horizon, gelijk aan de laagste footer-Buffer op `/` over dezelfde maanden
- [ ] Bureau-tegel "cash": maand van het laagste punt staat in de tekst
- [ ] Bureau-tegel "cash": vrij vandaag (bank − potten) staat als tweede regel, niet als groot getal
- [ ] Cashpagina: "In potten" draagt de opbouw provisies + bufferpot, som = In potten op de cent
- [ ] Waterval: laatste staaf heet "Vrij" (geen "Eindsaldo"), en Beginsaldo + Inkomsten = de inkomstenkop op `/` voor dezelfde maand
- [ ] Het woord "Eindsaldo" en "Vrije cash" komen nergens meer voor in `app/` en `components/` (grep)
- [ ] Weektabel: bij een opname uit de bufferpot staat de bufferregel in dezelfde week als de kosten van die maand (unit-test op `buildWeeklyCashPlan`)
- [ ] Weektabel: `verifyReconciliation` blijft `[]` na de timingwijziging (bestaande + nieuwe tests)
- [ ] Weektabel: opbouw van de bufferpot blijft in de laatste week (bestaande test W13 −200 groen)
- [ ] Edge: document met bufferpot maar maand vóór zijn startmaand — footer toont vrij als Buffer zonder brugregel
- [ ] Contrast: nieuwe tekstregels boven AA (`flow:selftest` contrast-scenario's + `verify:visual`)
- [ ] Geen P0/P1 uit code-review en verify

## Beslissingsgeschiedenis

- 2026-09-17: woorden "Buffer" (pot + vrij) en "Vrij" (buiten elke pot) gekozen boven "Stand" of "Vrij + pot apart" — kleinste wijziging, rekenkern ongemoeid.
- 2026-09-17: bufferopname in de weektabel naar de week van het tekort (was: laatste week) — weektabel sluit dan aan op wat de maandrekening doet; week 38/39 op het echte document van −€ 7.107 naar −€ 3.823.
- 2026-09-17: kopgetal = laagste punt in 13 weken (niet "eind volgende maand"), vrij vandaag wordt context.
- 2026-09-17: brug als altijd zichtbare tweede regel (niet als uitklap).
