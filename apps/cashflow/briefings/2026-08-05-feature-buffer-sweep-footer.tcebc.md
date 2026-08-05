# Buffer-sweep en buffer-footer

- **Datum:** 2026-08-05
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        De bufferpot neemt elke maand automatisch het volledige vrije saldo op —
             opbouw bij overschot, opname bij tekort — en de maandfooter toont nog
             uitsluitend de buffer-impact van die maand plus de totale bufferstand.

CONTEXT:     Cashflow-prognose, BalanceFooter onder elke MonthCard, plus de rekenkern
             (calculator.ts / subtotals.ts) en de afgeleide analyse (runway, buffer-
             grafiek). Vervangt het model uit 2026-08-03, waar de buffer een vaste
             maandstorting had en enkel bij een negatief eindsaldo bijsprong.

ELEMENTS:    - BalanceFooter: regel "Buffer deze maand" (± delta), regel "Buffer totaal"
             - BalanceFooter: regel "Niet gedekt" — alleen wanneer de pot tekortschiet
             - BalanceFooter: hint-staat wanneer er geen bufferpot ingesteld is
             - ReservationSection: de bufferrij verdwijnt uit de sectie "Provisies"
             - ReservationSidepanel: maandbedrag van de bufferpot uitgeschakeld + hint
             - RunwayCard / analyse: netBurn zonder de buffer-storting

BEHAVIOUR:   Per maand: E(0) = eindsaldo met buffer-storting 0. De buffer-storting wordt
             onvoorwaardelijk x = max(E(0), −potbeschikbaar) — positief is opbouw,
             negatief een opname. Het vrije saldo dat doorrolt is E(0) − x: normaal €0,
             negatief zodra de pot leeg is. De footer toont x met teken, de potstand aan
             het einde van de maand, en het niet-gedekte restant als aparte regel. Zonder
             gemarkeerde bufferpot verandert er niets aan de rekenkern en toont de footer
             enkel de hint. Afgesloten maanden blijven bevroren.

CONSTRAINTS: Desktop-first, bestaande umanex CSS-variabelen, geen nieuwe dependencies.
             Rekenkern in calculator.ts/subtotals.ts is enige bron — footer en analyse
             leiden af, dupliceren geen buffer-math. De drie footers blijven even hoog.
             De doorrol-invariant `MonthData.endBalance` = doorgerold vrij saldo blijft
             ongewijzigd; enkel de wéérgave splitst buffer van provisies af.
```

---

## Open vragen

_(leeg — alle kritische items beantwoord)_

## Aannames

- `[ASSUMPTION: rekenmodel]` `subtotals.costs` en `subtotals.endBalance` blijven de
  volledige formule (buffer inbegrepen), zodat de doorrol naar de volgende maand
  ongewijzigd blijft. Enkel de weergave splitst: `provisions` toont voortaan zonder
  buffer, en een nieuw veld `buffer` draagt de delta. De zichtbare secties tellen daardoor
  op tot `buffer + endBalance` — precies de twee footerregels "Buffer deze maand" en
  "Niet gedekt". De invariant verdwijnt dus niet, hij verhuist.
- `[ASSUMPTION: maandbedrag]` Het maandbedrag van de bufferpot is volledig afgeleid en
  wordt genegeerd. Het veld blijft staan maar uitgeschakeld met een hint — verwijderen zou
  de waarde stil weggooien bij het uitzetten van de buffer-vlag.
- `[ASSUMPTION: betalingen uit de buffer]` De bufferpot verdwijnt uit de Provisies-sectie
  en dus ook uit de keuzelijst van de betaalmodal — een handmatige betaling uit de buffer
  spreekt het automatische model tegen. Bestaande betalingen op de bufferpot blijven
  correct doorrekenen (ze verlagen de pot) maar zijn niet meer als losse regel zichtbaar.
- `[ASSUMPTION: states]` Geen loading/error: alles is synchroon uit de Zustand-store.
  Relevante toestanden: geen bufferpot · opbouw · opname · pot ontoereikend.
- `[ASSUMPTION: interactie]` De footer is read-only. Geen klik, geen invoer — het bedrag
  is volledig afgeleid.
- `[ASSUMPTION: historie]` Afgesloten maanden dragen hun bevroren `MonthData` uit het oude
  model. `netBurn` valt daar terug op de oude formule doordat het nieuwe veld ontbreekt
  (0), dus historie blijft leesbaar zonder migratie.

## Acceptatie

- [x] Maand met overschot → buffer-storting = het volledige vrije saldo, eindsaldo €0
- [x] Maand met tekort en toereikende pot → opname, eindsaldo €0, potstand daalt exact
- [x] Pot ontoereikend → opname begrensd tot de potstand, potstand landt op €0, het
      restant rolt door als negatief vrij saldo én staat als "Niet gedekt" in de footer
- [x] Footer toont uitsluitend buffer-impact, buffer-totaal en (voorwaardelijk) het
      niet-gedekte tekort — geen bankstand, geen gereserveerd, geen beschikbaar
- [x] Zonder gemarkeerde bufferpot: rekenkern ongewijzigd, footer toont de hint, en de
      drie kolommen blijven even hoog — de rekenkern is afgedekt door S1, de hint-staat
      zelf is alleen door code-inspectie nagegaan (`hasBuffer` is vensterbreed, dus alle
      drie de kolommen tonen altijd dezelfde tak). Niet op scherm gezien: dat zou een
      wijziging in Jeroens echte potten vragen.
- [x] De bufferrij staat niet meer in de sectie "Provisies"; het subtotaal van die sectie
      bevat de buffer niet meer
- [x] Zichtbare sectiesubtotalen tellen op tot de buffer-kostenkop + het niet-gedekte
      tekort. In de ankermaand is die kop de potstand ná beweging (het banksaldo bevat de
      hele pot); in latere maanden is het de beweging zelf. De footer toont beide getallen,
      dus die asymmetrie blijft afleesbaar.
- [x] De bestaande bufferstand blijft behouden: de pot vertrekt van het overgedragen
      saldo en telt de beweging van de maand erbij, hij wordt niet herzet
- [x] Maandbedrag van de bufferpot is uitgeschakeld in ReservationSidepanel, met hint
- [x] `netBurn` en de runway rekenen op de kosten zonder buffer-storting; een maand met
      overschot geeft runway `null`, een maand met structureel tekort een eindig getal
- [x] Afgesloten maanden veranderen niet en blijven zonder fout renderen in `/analyse`
- [x] `buffer-scenarios.ts` slaagt volledig op het nieuwe model
- [x] `pnpm --filter cashflow build` en `type-check` slagen, geen `any`

## Beslissingsgeschiedenis

- 2026-08-05: Buffer-storting wordt onvoorwaardelijk in plaats van alleen bij een tekort —
  de buffer is niet langer een spaardoel met eigen maandbedrag maar de bestemming van al
  het vrije geld.
- 2026-08-05: Buffer uit de kostensecties gehaald (keuze Jeroen). De ledger toont daardoor
  het maandresultaat vóór buffer; de footer toont waar dat resultaat naartoe gaat.
- 2026-08-05: Analyse mee herijkt (keuze Jeroen) — zonder herdefinitie van `netBurn` zou
  de runway na deze wijziging structureel "geen tekort" tonen, omdat de buffer-storting
  het tekort per constructie wegneemt.
- 2026-08-05: Footer zonder bufferpot toont een hint in plaats van terug te vallen op het
  eindsaldo (keuze Jeroen) — het model duwt naar één buffer, geen tweede lezing.

## Beoordeling

Reviewpanel van vijf assen (rekenkern · doorrol/anker · UI · analyse · datamigratie) met
adversariële verificatie per bevinding. Vier bevestigde defecten opgelost bij de oorzaak,
elk met een scenario dat ze vastlegt:

- `netBurn` las de kostenkoppen van de ankermaand, die daar een stand dragen in plaats van
  een stroom → runway meldde een tekort bij een maand met overschot (S21).
- `potBalanceMap` en `deferredRemainingMap` liepen uiteen bij een cash-bijbetaling → de
  bufferpot kon onder nul zakken met "Niet gedekt €0" ernaast (S19).
- Uitstel en finalisatie op de bufferpot zetten de sweep stil zonder zichtbare rij om het
  terug te draaien (S20).

Drie bevestigde bevindingen zijn pre-existing en raken `computeAnchorState` los van de
buffer; die staan in `HANDOFF.md` in plaats van hier meegepatcht te worden.
