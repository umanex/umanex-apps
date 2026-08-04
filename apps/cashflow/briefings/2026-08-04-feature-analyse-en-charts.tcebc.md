# Analyse en charts

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gebouwd — bullet charts open, twee grafieken nog niet visueel geverifieerd

---

```
TASK:        De app krijgt een analyselaag: hoeveel maanden houd ik het vol, hoe groeit
             mijn buffer, en waar week ik af van mijn begroting.

CONTEXT:     Fase 4 van 2026-08-04-plan-advies-implementatie.md, de laatste. Fase 3
             leverde afgesloten maanden op; zonder die snapshots viel er niets
             betrouwbaars te tonen. Eerste fase met een nieuwe dependency: Recharts.

ELEMENTS:    Runway-kaart (getal met een lineaire balk), cumulatieve bufferopbouw als
             area chart, waterfall per maand, begroot-vs-werkelijk per categorie, en
             onder elke grafiek een uitklapbare datatabel.

BEHAVIOUR:   De analyse leest afgesloten maanden als historie en het venster als
             prognose. Onder de drempel toont elke trend een expliciete
             "nog niet genoeg gegevens"-staat in plaats van een misleidende lijn.

CONSTRAINTS: Geen circulaire gauge voor runway, geen afgekapte y-as, geen
             confidence-band op handmatige data — alle drie expliciet afgeraden in beide
             rapporten. Toekomst gestippeld, historie doorlopend, met een marker op de
             grens. Elke grafiek heeft een datatabel als volwaardig alternatief.
```

---

## Open vragen

Alle vier beantwoord op 2026-08-04:

1. **Plaats** — een eigen analysepagina op `/analyse`.
2. **Runway-teller** — alleen de bufferpot.
3. **Runway-noemer** — netto burn (kosten min inkomsten), gemiddeld over maximaal zes
   afgesloten maanden.
4. **Drempel** — drie afgesloten maanden.

Gevolg van 2 en 3 samen: dit getal antwoordt niet op "hoelang overleef ik" maar op
"hoelang dekt mijn bufferpot mijn maandtekort". Strenger, en het label zegt dat ook. De
storting náár de buffer telt niet als kost in de noemer — anders eet de buffer zichzelf op.

## Geen chart-library

Recharts brak elke Next-build: de workspace deelt één platte `node_modules` met react 19
uit rowtrack naast react-dom 18. Vastgelegd in `apps/rowtrack/HANDOFF.md`. De grafieken
zijn daarom met de hand in SVG getekend — geen dependency, `/analyse` is 3,65 kB. Dat
kost meer code maar levert volledige tokencontrole en nul risico voor het fundament.

## Aannames

- `[ASSUMPTION]` Provisies tellen nooit mee als beschikbaar geld voor runway: dat is geld
  van de fiscus, niet van jou. Dat is de kern van het BE-onderscheid uit beide rapporten.
- `[ASSUMPTION]` De begroot-vs-werkelijk-grafiek leest het variantiepaneel uit fase 3, niet
  de ledger-regels — zie de bevinding onderaan de snapshot-briefing.
- `[ASSUMPTION]` Inline SVG in plaats van een library; de waterfall is met zwevende
  staven getekend in plaats van de stacked-bar-truc, wat zonder library eenvoudiger is.
- `[ASSUMPTION]` Chart-labels tonen geen centen (`formatCurrency`); de datatabel eronder
  wel (`formatAmount`).

## Acceptatie

- [x] De runway-kaart toont een getal met een lineaire balk, geen gauge.
- [x] De bufferopbouw toont een expliciete nullijn en een y-as die op nul begint.
- [x] Historie is doorlopend met gevulde punten, toekomst gestippeld met open punten, en
      er staat een verticale marker op de grens.
- [x] Beide grafieken hebben een uitklapbare datatabel met dezelfde waarden, plus een
      `aria-label` op de SVG die naar die tabel verwijst.
- [x] Onder de drempel verschijnt een staat die zegt hoeveel maanden er nog nodig zijn.
- [x] Kleur is nergens de enige drager: de waterfall zet het teken onder elke staaf, de
      bufferlijn onderscheidt zich door streepjes en open punten.
- [x] `prefers-reduced-motion`: er zijn geen animaties, dus er valt niets te degraderen.
- [x] Geen dependency; `/analyse` is 3,65 kB.
- [ ] **Niet visueel geverifieerd**: de bufferopbouw en de waterfall. De Chrome-extensie
      raakte losgekoppeld voor ik kon kijken. De runway-kaart is wel gezien.
- [ ] Bullet charts voor begroot-vs-werkelijk per categorie — laatste stuk van fase 4. De
      cijfers bestaan al in het variantiepaneel van fase 3; alleen de visualisatie ontbreekt.

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als fase 4. Recharts is de gekozen library; de finance-tokens
  zijn bewust uitgesteld, dus de grafieken gebruiken voorlopig dezelfde kleuren als de
  ledger.
