# Maandkolom-ledger met saldo-footer

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd — wacht enkel nog op de finance-tokens

---

```
TASK:        De maandkolom wordt een running-subtotal-ledger met een vastgezette
             drieregelige saldo-footer.

CONTEXT:     Fase 1 van 2026-08-04-plan-advies-implementatie.md. Vervangt de
             sectielijst in MonthCard, binnen het bestaande 3-maandenvenster.
             Fase 0 maakte de subtotalen al tot één bron (lib/cashflow/subtotals.ts).

ELEMENTS:    LedgerRow (label · bedrag · lopend saldo), uitklapbare detailregels per
             categorie, sticky maandheader, sticky saldo-footer (bankstand ·
             gereserveerd · beschikbaar), gearceerde gereserveerd-band.

BEHAVIOUR:   Klik op een categorie klapt de detailregels open of dicht. Drag & drop
             van een regel naar een andere maand blijft binnen zijn categorie.
             Header en footer blijven staan terwijl de ledger-body scrollt; de drie
             eindsaldi staan daardoor altijd op één horizontale lijn.

CONSTRAINTS: Desktop 3-koloms — mobiel is bewust geparkeerd. Elk bedrag dubbel
             gecodeerd (teken én kleur, nooit kleur alleen). Centen in ledgerregels
             en invoervelden, geen centen in de footer. Geen hardcoded kleuren zodra
             de finance-tokens er zijn.
```

---

## Open vragen

Alle vier beantwoord op 2026-08-04:

1. **Gereserveerd-lijn** — alleen de provisies. Een budget is een inschatting van een
   maandelijkse kost; wat je niet opmaakt blijft gewoon op je rekening staan. Alleen een
   provisie rolt door als opzijgezet geld. Meetbaar gevolg: `vrij + provisiepotten` komt
   exact uit op het banksaldo, budgetten niet — die horen dus niet in die regel.
2. **Detailregels** — standaard open, zoals vandaag.
3. **KPI-tegels** — weg; de ledger toont dezelfde twee getallen.
4. **Lopend saldo** — alleen stapbedragen, eindsaldo in de footer.

Nog te beslissen buiten deze fase: de finance-tokens moeten in Tokens Studio aangemaakt
worden voor de hardcoded `emerald`/`amber`-klassen kunnen verdwijnen. De lijst met paden,
waardes en contrastcijfers staat in het plan.

## Aannames

- `[ASSUMPTION]` De ledger-regel toont het **kost**-subtotaal uit `subtotals`, niet de
  openstaand-variant van de huidige sectiekoppen. Dat lost bevinding 1 uit fase 0 op:
  de rijen tellen dan per constructie op tot het totaal. Zichtbaar effect blijft beperkt
  tot latere maanden met posten die als betaald gemarkeerd staan, tot gefinaliseerde
  potten en tot toekomende uitgestelde stortingen.
- `[ASSUMPTION]` Een bufferopname maakt de provisie-regel positief (geld dat terugkomt).
  Die krijgt een `+`-teken en de positieve kleur in plaats van een negatieve regel met
  een minbedrag.
- `[ASSUMPTION]` De hydratatie-state wordt meegenomen: `useHydrated()` bestaat maar wordt
  nergens aangeroepen, waardoor de eerste paint nullen toont voor de store geladen is.
  De ledger krijgt een skeleton zolang dat niet gebeurd is.
- `[ASSUMPTION]` De Open/Alle-filter en de +-knop van elke sectie verhuizen mee naar de
  uitgeklapte staat van hun categorie.
- `[ASSUMPTION]` Interactie blijft klik + drag & drop; de bestaande dnd-kit
  keyboard-sensor blijft werken na de herstructurering.

## Acceptatie

- [x] De ledger toont beginsaldo, vier kostenstappen en het eindsaldo in de volgorde van
      de kernformule.
- [x] De som van de zichtbare ledger-regels is exact het eindsaldo. Per constructie: elke
      regel leest zijn bedrag uit `MonthData.subtotals`, en `endBalance = incoming − costs`.
      De vier losse sectiekop-formules zijn verdwenen.
- [x] De saldo-footer toont bankstand, gereserveerd, buffer en beschikbaar, en staat
      buiten het scrollgebied. De buffer staat apart van de provisies: een provisie is
      geld dat je aan iemand anders schuldig bent, de buffer is eigen geld dat achter de
      hand blijft. Zo zie je de buffer slinken terwijl de provisies onaangeroerd blijven.
- [x] De maandheader staat buiten het scrollgebied.
- [x] De drie eindsaldi staan op één horizontale lijn. Visueel bevestigd op 2026-08-04 met
      drie kolommen van ongelijke inhoud: de footers staan gelijk, alleen de ledger-body
      scrollt.
- [x] Kleur is nergens de enige drager van betekenis. De ledger-regels, de
      gereserveerd-regel en de inkomstenregels dragen een expliciet `+` of `−`. Binnen een
      homogene sectie (alle rijen zijn kosten) draagt de kleur geen onderscheid en blijft
      het teken weg; een bedrag in een bewerkbaar invoerveld kan er sowieso geen dragen.
- [x] Ledgerregels, detailregels en de footer tonen centen, zodat de getoonde regels exact
      optellen tot het getoonde totaal. `formatCurrency` (zonder centen) blijft staan voor
      de KPI's en chart-labels van fase 4.
- [x] Detailregels staan open (beslissing 2); de +-knop en de Open/Alle-filter zitten in de
      ledger-regel zelf.
- [ ] Drag & drop tussen maanden werkt nog, ook met toetsenbord — **nog steeds niet
      getest** (herbevestigd 2026-08-07). De sleepgrepen renderen, maar een sleep tussen
      twee kolommen is nooit uitgevoerd, met muis noch toetsenbord. Dit is het enige
      acceptatie-item van deze briefing dat openstaat, en het valt buiten élk vangnet:
      de scenario-scripts raken alleen de rekenkern, en `render-screens.tsx` laat
      `MonthCard` bewust weg omdat die aan dnd-kit én de store hangt. Verplaatst naar
      `apps/cashflow/HANDOFF.md` zodat het niet in een briefing blijft liggen.
- [x] Een lege categorie toont een lege staat in plaats van te verdwijnen (inkomsten, vaste
      uitgaven, eenmalige uitgaven). De pot-secties blijven verborgen zonder potten, gelijk
      met de gereserveerd-regel in de footer.
- [x] Vóór hydratatie toont de kolom een skeleton, geen nullen. `useHydrated()` wordt nu
      aangeroepen in `app/page.tsx`; de server rendert hetzelfde skelet, dus de eerste
      client-render komt ermee overeen. Console toont geen hydratatie-waarschuwing meer.
- [x] Een bufferopname leest als teruggave: `formatSigned` draait teken én kleur om zodra
      het bedrag tegen de richting van zijn regel ingaat.
- [x] `buffer-scenarios.ts` groen (145/145) en de baseline ongewijzigd t.o.v. de fix-commit.

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als fase 1 van het adviesplan. WS2 (bankstand vs beschikbaar) is
  op 2026-08-04 in deze fase opgenomen omdat dezelfde footer anders twee keer gebouwd
  wordt.
- 2026-08-04: de bufferpot krijgt een eigen footer-regel in plaats van mee te tellen in
  gereserveerd. Een provisie moet weg, de buffer is eigen geld dat een tekort opvangt —
  in één regel betekende "gereserveerd" twee dingen tegelijk. Buiten de oorspronkelijke
  scope; het plan had de buffer pas in fase 4 als runway-metric staan.
