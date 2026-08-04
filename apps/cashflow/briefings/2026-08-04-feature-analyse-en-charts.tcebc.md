# Analyse en charts

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** in schijven — runway gebouwd, grafieken geblokkeerd op de React-opzet

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

## Blokkade

De grafieken wachten op het gelijktrekken van react en react-dom in de monorepo. Zie de
entry van 2026-08-04 in de root `HANDOFF.md`: `pnpm add recharts` brak elke Next-build
doordat de workspace één platte `node_modules` deelt met react 19 uit rowtrack naast
react-dom 18. De runway-kaart heeft geen library nodig en is daarom wél gebouwd; de
bufferopbouw-grafiek staat geparkeerd.

## Aannames

- `[ASSUMPTION]` Provisies tellen nooit mee als beschikbaar geld voor runway: dat is geld
  van de fiscus, niet van jou. Dat is de kern van het BE-onderscheid uit beide rapporten.
- `[ASSUMPTION]` De begroot-vs-werkelijk-grafiek leest het variantiepaneel uit fase 3, niet
  de ledger-regels — zie de bevinding onderaan de snapshot-briefing.
- `[ASSUMPTION]` Recharts, zoals eerder gekozen; de waterfall bouwen we met de
  stacked-bar-truc (onzichtbare basis-serie).
- `[ASSUMPTION]` Chart-labels tonen geen centen (`formatCurrency`); de datatabel eronder
  wel (`formatAmount`).

## Acceptatie

- [ ] De runway-kaart toont een getal met een lineaire balk, geen gauge.
- [ ] De bufferopbouw toont een expliciete nullijn en een niet-afgekapte y-as.
- [ ] Historie is doorlopend, toekomst gestippeld, met een marker op de grens.
- [ ] Elke grafiek heeft een uitklapbare datatabel met dezelfde waarden.
- [ ] Onder de drempel verschijnt een "nog niet genoeg gegevens"-staat die zegt hoeveel
      maanden er nog nodig zijn.
- [ ] Kleur is nergens de enige drager van betekenis.
- [ ] `prefers-reduced-motion` wordt gerespecteerd.
- [ ] De bundel groeit met ongeveer de aangekondigde 150 kB, niet meer.

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als fase 4. Recharts is de gekozen library; de finance-tokens
  zijn bewust uitgesteld, dus de grafieken gebruiken voorlopig dezelfde kleuren als de
  ledger.
