# Maandkolom-ledger met saldo-footer

- **Datum:** 2026-08-04
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gepland

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

1. **Gereserveerd-lijn** — telt die alleen de provisies (spaardoelen), of ook het
   resterende saldo van de maandelijkse budgetten? Het prudente model beschouwt een
   onbesteed budget als uitgegeven; tel je het mee, dan staat er een bankstand die
   dichter bij je echte rekening ligt, maar die het model tegenspreekt.
2. **Detailregels** — standaard ingeklapt (alleen de zes ledger-regels zichtbaar) of
   standaard open zoals vandaag?
3. **KPI-tegels** — de twee tegels (Inkomsten / Uitgaves) bovenaan de kaart worden
   overbodig zodra de ledger met beginsaldo begint en op het kostentotaal uitkomt.
   Weg, of behouden?
4. **Lopend saldo** — een tweede getalkolom die na elke stap het lopende saldo toont,
   of alleen de stapbedragen met het eindsaldo in de footer?

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

- [ ] De ledger toont beginsaldo, vier kostenstappen en het eindsaldo in de volgorde van
      de kernformule.
- [ ] De som van de zichtbare ledger-regels is exact het eindsaldo — geen enkele maand
      waarin rijen en totaal uit elkaar lopen.
- [ ] De saldo-footer toont bankstand, gereserveerd en beschikbaar, en blijft staan bij
      verticaal scrollen.
- [ ] De maandheader blijft staan bij verticaal scrollen.
- [ ] De drie eindsaldi staan op één horizontale lijn, ongeacht kolomhoogte.
- [ ] Elk bedrag draagt een expliciet `+` of `−` naast zijn kleur.
- [ ] Ledgerregels en invoervelden tonen centen; footer en tegels niet.
- [ ] Detailregels klappen open en dicht per categorie, met de +-knop en de Open/Alle
      filter in de uitgeklapte staat.
- [ ] Drag & drop tussen maanden werkt nog, ook met toetsenbord.
- [ ] Een lege categorie toont een lege staat in plaats van te verdwijnen.
- [ ] Vóór hydratatie toont de kolom een skeleton, geen nullen.
- [ ] Een bufferopname is als teruggave leesbaar, niet als negatieve kost.
- [ ] `buffer-scenarios.ts` en de baseline-diff blijven groen.

## Beslissingsgeschiedenis

- 2026-08-04: aangemaakt als fase 1 van het adviesplan. WS2 (bankstand vs beschikbaar) is
  op 2026-08-04 in deze fase opgenomen omdat dezelfde footer anders twee keer gebouwd
  wordt.
