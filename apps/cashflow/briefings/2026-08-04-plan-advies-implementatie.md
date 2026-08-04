# Plan — implementatie adviesrapporten cashflow

**Datum:** 2026-08-04
**Bron:** `Claude.pdf` (PDF-B) + `Cashflow Forecasting App - Onderzoek & Advies.pdf` (PDF-A)
**Status:** gepland — wacht op go per fase

Dit is het overkoepelende plan. Per fase volgt een aparte TC-EBC in deze map, geschreven vlak vóór de bouw van die fase.

---

## Genomen beslissingen

| Beslissing | Keuze |
|---|---|
| Scope | WS1 (kolom-leesbaarheid) + WS3 (invoerfrictie) + WS4/WS5 (historiek & charts) |
| Eindsaldo-footer | Drie regels: bankstand / gereserveerd / beschikbaar (WS2 opgenomen in WS1) |
| Fiscaal model | Geen. Generieke spaarpotten volstaan; btw en RSZ zijn gewone potten |
| Historiek-opslag | Immutable snapshots in de bestaande Zustand-store (localStorage) |
| Charts | Recharts, waterfall via stacked-bar-truc |
| Finance-tokens | Afgeleid van de bestaande umanex-schaal, niet uit de PDF-paletten |
| Centen | Tonen in ledgerregels en invoervelden, verbergen in KPI's, subtotalen en chart-labels |
| WS3-scope | Alleen "herhaal vorige maand". CSV-import geschrapt op 2026-08-04 |

**Geparkeerd:** mobiele scroll-snap layout, dark mode, command palette, fiscaal model, insight cards,
what-if scenario-sandbox, zoom-niveaus (jaar → 3 maanden → maand). Het WCAG-kritische deel van
toegankelijkheid (dubbele codering) zit wél in fase 1.

---

## Fase 0 — Één bron voor de maandberekening (voorwaarde)

De sectie-subtotalen (vast / eenmalig / budgetten / provisies) worden nu in `MonthCard.tsx:68-100`
berekend, terwijl `calculator.ts:382-396` diezelfde formule voor maand 0 nadoet om het eindsaldo
gelijk te houden aan wat de kaart toont. Twee implementaties van één formule: elke wijziging aan de
ledger, elke snapshot en elke chart moet ze allebei raken of ze lopen uit elkaar.

**Werk:** de subtotalen naar `MonthData` tillen, `MonthCard` puur laten renderen, de maand-0-tak in
de calculator laten vervallen. `scripts/buffer-scenarios.ts` is de bestaande regressie-harness en moet
identieke uitkomsten geven vóór en na.

**Effort:** ~1 dag. **Blokkeert:** alles hieronder.

**Uitgevoerd op 2026-08-04.** De formule bleek niet op twee maar op zes plaatsen te staan:
elke sectie rekende zijn eigen kop uit, `MonthCard` de vier subtotalen nog eens voor de
KPI-tegel en het eindsaldo, en de calculator nog eens voor maand 0. Alles leest nu
`lib/cashflow/subtotals.ts`. `scripts/calc-baseline.ts` dumpt elke berekende waarde over
300 gegenereerde scenario's (1200 maanden) en bewijst met een lege diff dat de motor niet
verschoven is; `scripts/buffer-scenarios.ts` groeide van 77 naar 119 checks.

### Bevindingen uit fase 0 — mee te nemen in fase 1

1. **Sectiekoppen tellen niet op tot het kostentotaal.** Gemeten in 122 van 1200 maanden
   (~10%), telkens door een gefinaliseerde pot in een toekomstige maand of door een
   uitgestelde storting die die maand toekomt. De koppen tonen bewust wat er nog openstaat
   (aansluitend bij de Open/Alle-filter), het totaal telt de volledige kost. In een
   running-subtotal-ledger kan dat niet blijven: rijen die niet optellen tot hun totaal
   maken de ledger waardeloos. Fase 1 moet kiezen welke van de twee de rij wordt.
2. **De ankermaand telt cash-bijbetalingen bij een gefinaliseerde of uitgestelde pot niet
   mee**, latere maanden wel. Bestaand gedrag, bewust ongemoeid gelaten in een refactor.
   Vermoedelijk verdedigbaar (in de ankermaand is zo'n betaling al van het banksaldo af),
   maar dan zou hetzelfde voor élke bijbetaling moeten gelden — nu geldt het maar voor een
   deel. Uit te klaren bij de footer-herwerking.
3. **"Betaald" in een toekomstige maand** is een wankel begrip: het geld is er nog niet af,
   dus de kost telt mee, maar de rij verdwijnt wel achter de Open-filter. Overwegen of de
   betaalvlag in een toekomstige maand überhaupt aanklikbaar moet zijn.

---

## Fase 1 — Kolom-leesbaarheid (WS1 + WS2-footer)

1. **Ledger-herwerking** — de sectielijst wordt een running-subtotal-ledger: beginsaldo → +inkomsten →
   −vast → −eenmalig → −budgetten → −provisies → eindsaldo, elke stap met lopend subtotaal.
   Categorieën blijven uitklapbaar; drag & drop tussen maanden blijft binnen een categorie.
2. **Sticky header + sticky footer** — één verticale scroll voor het grid, per kolom een vastgezette
   maandheader en een vastgezette drieregelige footer (bankstand / gereserveerd / beschikbaar). De
   drie eindsaldi staan zo altijd op één horizontale lijn — de meest accurate perceptuele vergelijking
   volgens Cleveland & McGill, en het argument waarom beide rapporten hierop aandringen.
3. **Gereserveerde band** — het verschil tussen bankstand en beschikbaar krijgt een gearceerde
   weergave; de potstanden zelf blijven in de spaarpotten-sectie.
4. **Dubbele codering** — elk bedrag krijgt een expliciet `+`/`−` naast de kleur. Kleur mag nergens
   de enige drager van betekenis zijn (WCAG 1.4.1).
5. **Getalnotatie** — `formatCurrency` splitsen in `formatAmount` (met centen, voor ledger en invoer)
   en `formatTotal` (zonder centen, voor KPI's en chart-labels).
6. **Tokens** — de 25 hardcoded `emerald`/`amber`-klassen vervangen door finance-tokens.
   *Blocker: de tokens moeten eerst door Jeroen in Tokens Studio aangemaakt en gepusht worden.*

**Effort:** ~3 dagen na fase 0. **Nieuwe deps:** geen.

### Tokens die Jeroen moet aanmaken

Afgeleid van de bestaande umanex-schaal. Twee varianten per statuskleur, want de huidige kleuren
halen de contrastdrempel voor tekst niet:

| Token pad | Waarde | Contrast op wit | Gebruik |
|---|---|---|---|
| `color.finance.positive.text` | `#047857` | 5,55:1 ✓ AA | bedragen, labels |
| `color.finance.positive.graphic` | `#10b981` (= Chart4) | 2,56:1 | vlakken, lijnen ≥ 3px |
| `color.finance.negative.text` | `#c43737` (= Primary700) | 5,35:1 ✓ AA | bedragen |
| `color.finance.negative.graphic` | `#f05454` (= Primary500) | 3,44:1 ✓ 1.4.11 | staven, randen |
| `color.finance.critical` | `#b91c1c` (= Destructive600) | 6,8:1 ✓ AA | tekort onder buffer |
| `color.finance.reserved.text` | `#b45309` | 5,89:1 ✓ AA | provisiebedragen |
| `color.finance.reserved.graphic` | `#f59e0b` (= Chart3) | 2,16:1 | arcering gereserveerde band |
| `color.finance.neutral` | `#475467` (= Neutral600) | 7,5:1 ✓ AA | neutrale regels |
| `color.finance.forecast` | `#98a2b3` (= Neutral400) | 2,4:1 | gestippelde toekomstlijn |
| `color.finance.locked` | `#d0d5dd` (= Neutral300) | — | achtergrond afgesloten maand |

**Bevinding:** de huidige `text-emerald-600` (#059669, 3,77:1) en `text-[var(--umanexPrimary500)]`
(#f05454, 3,44:1) zakken allebei onder de 4,5:1 die WCAG AA voor gewone tekst vraagt. De app faalt dus
vandaag al op contrast, los van dit advies. Vandaar de tekst/graphic-splitsing: 3:1 volstaat voor
grafische objecten (1.4.11), tekst heeft de diepere variant nodig.

---

## Fase 2 — Invoerfrictie (WS3) — **afgerond 2026-08-04**

1. **Herhaal vorige maand** — gebouwd. Elke maandkolom neemt met één klik de inkomsten en
   eenmalige uitgaven van zijn voorganger over, als afvinklijst met duplicaatmarkering.
   Briefing: `2026-08-04-feature-herhaal-vorige-maand.tcebc.md`.
2. **CSV-import** — **geschrapt.** Een bankexport beschrijft het verleden, terwijl de app
   vooruitkijkt: regels landen ofwel in een maand waar ze niet thuishoren, ofwel in maanden
   die pas met fase 3 zichtbaar worden. Beide adviesrapporten noemen de import een must,
   maar geen van beide beantwoordt in welke tijdsemmer de regels terechtkomen. Zonder dat
   antwoord is het drie dagen bouwen aan iets waarvan het nut niet vaststaat. Herzien zodra
   er historiek is, als de behoefte er dan nog is.

---

## Fase 3 — Historiek & snapshots (WS4)

`anchorMonth` is nu altijd de huidige maand en wordt bewust niet gepersisteerd; `setAnchorMonth`
bestaat maar wordt nergens aangeroepen. Het verleden bestaat dus niet in de app.

1. **Maandnavigatie** — vooruit en achteruit door het 3-maandenvenster.
2. **Maand afsluiten** — schrijft een immutable `MonthSnapshot` met eindstand en begroot-vs-werkelijk
   per categorie. Afgesloten maanden worden gelezen uit het snapshot, nooit herberekend uit actuele
   stamdata — anders is elke afwijkingsanalyse onbetrouwbaar (anti-patroon in beide rapporten).
3. **Zichtbaar vergrendeld** — afgesloten maanden krijgen de `locked`-achtergrond en zijn niet
   bewerkbaar zonder expliciete heropening.

**Effort:** ~3 dagen. Store-versie omhoog + migrate.

---

## Fase 4 — Analyse & charts (WS5)

Recharts toevoegen. In volgorde van waarde:

1. **Runway-metric** — buffer ÷ gemiddelde netto burn over 6 maanden, als getal met een lineaire
   balk. Géén circulaire gauge (Few: gauges "fail spectacularly when intended for comparison").
2. **Cumulatieve bufferopbouw** — area chart met expliciete nullijn, niet-afgekapte y-as.
3. **Waterfall per maand** — stacked-bar-truc met onzichtbare basis-serie.
4. **Begroot-vs-werkelijk** — bullet charts per categorie, zodra fase 3 genoeg snapshots levert.

Onder elke chart een uitklapbare datatabel als volwaardig alternatief (WCAG 1.1.1). Toekomst
gestippeld, historie doorlopend, met een verticale marker op de grens. Geen confidence-bands.

**Empty state:** onder de 3 afgesloten maanden tonen de trends een expliciete "nog niet genoeg data"-
staat in plaats van een lege of misleidende grafiek.

**Effort:** ~4 dagen. **Nieuwe dep:** `recharts` (~150 kB).

---

## Openstaande vragen per fase

Deze landen in de TC-EBC van de betreffende fase, niet nu:

- **Fase 1** — Krijgt de gearceerde band alleen de footer, of ook elke potregel? Welke states heeft de
  ledger bij nul posten in een categorie?
- **Fase 3** — Sluit een maand automatisch af bij de maandwissel, of expliciet met een actie? Wat
  gebeurt er als je een afgesloten maand achteraf wil corrigeren?
- **Fase 4** — Komen de charts onder het 3-maandenvenster, of op een aparte analyse-pagina?

---

## Volgorde en afhankelijkheden

```
Fase 0 (calculator)          ✔ gemerged — PR #161
   └── Fase 1 (ledger + footer)  ✔ gemerged — PR #162
          ├── Fase 2 (herhaal vorige maand)  ✔ gemerged — PR #163
          └── Fase 3 (snapshots, ~3d)
                 └── Fase 4 (charts, ~4d)
```

Elke fase is een eigen feature branch met PR.

**Open na fase 1**, los van de fasering:
- De finance-tokens moeten in Tokens Studio aangemaakt worden; tot dan blijven de
  hardcoded `emerald`/`amber`-klassen staan.
- De hydratatie-skeleton is niet gebouwd: `useHydrated()` bestaat maar wordt nergens
  aangeroepen, dus bij het laden verschijnen kort nullen.
- De ledger en de modals zijn niet visueel geverifieerd (Chrome-extensie niet verbonden).
