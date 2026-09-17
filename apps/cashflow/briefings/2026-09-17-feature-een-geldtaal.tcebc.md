# Eén geldtaal — Buffer, Vrij en een zichtbare brug

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** cashflow (`apps/cashflow`)
- **Klant:** umanex
- **Status:** gevalideerd — 2026-09-17, 2 iteraties (code-review: 0 P0/P1, 5 P2 gefixt)
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
- [ASSUMPTION: zonder bufferpot in het hele venster (`hasBuffer` onwaar) blijft de hint "Geen buffer" en is er geen brugregel. Is er wél een pot, dan staat de brug in élke kolom — ook in een maand vóór de startmaand of met een lege pot ("+ bufferpot € 0,00") — zie Beslissingsgeschiedenis.]

## Acceptatie

- [x] Typologie: inline tekst, geen overlay of tooltip — bewijs: `git diff origin/main...HEAD -- app components` bevat 0 nieuwe `title=`-attributen (de ene treffer is de kop-prop van `KpiTile`, positieve controle: dezelfde grep vindt de verwijderde oude kop)
- [x] States n.v.t. voor laden/fout; leeg document blijft "Onvoldoende gegevens" — bewijs: harness "bureau — leeg (document zonder bureau-sleutel)": 6 tegels elk 1× "Onvoldoende gegevens", 0× € 0 (flow:selftest 125/125, twee runs)
- [x] Interactie n.v.t. — bewijs: 0 toegevoegde `<button|<input|<select|<textarea` in de diff van `app/` en `components/`
- [x] Footer: brugregel "vrij € X + bufferpot € Y" zichtbaar, som = Buffer op de cent — bewijs: harness "geldtaal — brug onder de footer telt op tot de Buffer" parst de zichtbare bedragen: kolom 0 vrij 0 + pot 862,58 = 862,58 · kolom 1 vrij 0 + pot 1.362,58 · kolom 2 vrij −237,42 + pot 0; tegenproef met gewijzigde pottekst valt om
- [x] Footer: pot in de brug komt overeen met een onafhankelijke bron — bewijs: zelfde scenario vergelijkt de pot per kolom met `data-pot` van de maandeinden op `/bureau/cash` (3 maanden gelijk)
- [x] Footer zonder bufferpot in het venster: geen brugregel — bewijs: static render `.screens-preview.html`, 4 footer-fixtures → 3 brugregels, de "Geen buffer"-kolom zonder (screenshot `footer.png`; `verify:visual` 443 → 446 = precies 3 regels)
- [x] Bureau-tegel "cash": groot getal = laagste Buffer-maandeinde — bewijs: harness "geldtaal — tegel toont de laagste Buffer groot": groot −237 = laagste Buffer −237,42; tegenproef (vrij vandaag groot) → "toont 1000 groot, verwacht −237,42"
- [x] Cashpagina: maandeinden = footer-Buffer op `/` — bewijs: harness "geldtaal — cash toont de laagste Buffer": 3 maanden gelijk; tegenproef (maandeinden op Vrij) → "2026-09 cash 0 / footer 862,58"
- [x] Bureau-tegel "cash": maand van het laagste punt in de tekst — bewijs: harness "cash — kopgetal is het laagste maandeinde" eist `laagste punt eind nov 2026:` in de tegel (125/125); screenshot `vol-1440-overzicht.png`
- [x] Bureau-tegel "cash": vrij vandaag in de noemerregel, niet groot — bewijs: tegel-scenario leest "vrij vandaag" uit `[data-kpi-noemer]` (1.000) ≠ groot (−237)
- [x] Cashpagina: "In potten" draagt provisies + bufferpot, som = In potten — bewijs: unit-test `position` { reserved 5.000 = provisions 3.000 + buffer 2.000 } (tests 165/165); de regel print exact die twee velden. Render met een pot ≠ 0 bij de start niet gemeten: alle harness-fixtures starten hun potten in de ankermaand
- [x] Waterval: laatste staaf heet "Vrij", buffer-stap "In/Naar de bufferpot" — bewijs: `.charts-preview.html` 3× label "Vrij", 0× "Eindsaldo", 3× "In de bufferpot"
- [x] Waterval: Beginsaldo + Inkomsten = inkomstenkop op `/` — bewijs: echt document sep 2026 (critique-screenshot): 20.773,60 + 3.527,15 = 24.300,75 = inkomstenkop; deze PR wijzigt alleen labels, geen bedragen
- [x] "Eindsaldo" en "Vrije cash" komen niet meer voor in `app/` en `components/` — bewijs: grep 0 treffers; positieve controle op origin/main: 3
- [x] Weektabel: een opname uit de bufferpot staat in de week van de kosten — bewijs: unit-test `b:bufferregel-in-eerste-week` + timing-test W02 −1.800 (was −3.800; verschil = bufferstand 2.000)
- [x] Weektabel: `verifyReconciliation` blijft `[]` — bewijs: tests 165/165 (beide scenario's); rekenkern-scenario's buffer 1033/1033, anker 48/48, regressie-hash ongewijzigd
- [x] Weektabel: opbouw van de bufferpot blijft in de laatste week — bewijs: test "reserveringen gaan in de ankermaand één keer af": W13 bufferregel −200 groen
- [x] Kopgetal kiest op de Buffer, niet op Vrij — bewijs: unit-test `potVolScenario` (laagste = feb Buffer 100, niet jan Vrij 0) + tegenproef; signaaltest "oordeelt op de Buffer" valt om op een mutant die `closingFree` leest
- [x] Edge: maand vóór de startmaand van de pot — bewijs: code-review render (renderToStaticMarkup, pot vanaf november): september en oktober tonen "vrij € 1.000,00 + bufferpot € 0,00", som = Buffer
- [x] Edge: afgesloten eerste kolom uit een snapshot op vrije basis toont geen provisiebrug — bewijs: `provisionStandForHeader` (`lib/cashflow/subtotals.test.ts`): bank → 3.000, vrij en ontbrekend → geen brug; mutant die elke basis doorlaat valt om (1 fail), hersteld 3/3. `MonthCard` roept alleen die functie aan
- [x] Contrast: nieuwe tekstregels boven AA — bewijs: `verify:visual` 446 tekstelementen boven AA (incl. de 3 brugregels), flow contrast-scenario's groen
- [x] Geen P0/P1 uit code-review en verify — bewijs: code-review 2026-09-17: 0 P0/P1, 5 P2 gefixt in `d4f5b60`; verify via harness 125/125 twee runs, tests 168/168; resterende P3's in `apps/cashflow/BACKLOG.md` (4 items, 2026-09-17)

## Beslissingsgeschiedenis

- 2026-09-17: woorden "Buffer" (pot + vrij) en "Vrij" (buiten elke pot) gekozen boven "Stand" of "Vrij + pot apart" — kleinste wijziging, rekenkern ongemoeid.
- 2026-09-17: bufferopname in de weektabel naar de week van het tekort (was: laatste week) — weektabel sluit dan aan op wat de maandrekening doet; week 38/39 op het echte document van −€ 7.107 naar −€ 3.823.
- 2026-09-17: kopgetal = laagste punt in 13 weken (niet "eind volgende maand"), vrij vandaag wordt context.
- 2026-09-17: brug als altijd zichtbare tweede regel (niet als uitklap).
- 2026-09-17: brugregel onder de footer staat in élke kolom zodra er een bufferpot bestaat, ook met een lege pot — afwijking van de eerste aanname ("geen brug zonder pot"): een regel die per kolom verschijnt breekt de uitlijning van de drie footers, die `BalanceFooter` expliciet afdwingt.
