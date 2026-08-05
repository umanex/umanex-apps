# Finance-tokens — inventaris en voorstel

- **Datum:** 2026-08-05
- **Project:** cashflow
- **Status:** uitgevoerd — 2026-08-05, met de hand in `tokens.json`. Jeroen pullt in Tokens Studio zodat Figma bijtrekt.

De open HANDOFF-post "Token-migratie is groter geworden in plaats van kleiner" vroeg om
de nieuwe componenten mee te nemen zodra de finance-tokens aangemaakt worden. Dit bestand
is die inventaris, geteld op de huidige `main`. Het aanmaken zelf gebeurt in Tokens Studio
— `packages/tokens/tokens.json` is de sync-target en wordt nooit met de hand bewerkt.

Na het aanmaken is de code-kant mechanisch: elke rij hieronder is een zoek-vervang.

---

## Wat er nu staat

Zeven semantische rollen zitten verspreid over Tailwind-paletklassen, umanex-variabelen
en ShadCN-tokens. Het probleem is niet dat er hardcoded kleuren staan — het is dat
dezelfde betekenis op drie manieren geschreven wordt.

| Rol | Nu in de code | Voorstel |
|---|---|---|
| Bedrag dat binnenkomt of gunstig uitvalt | `text-emerald-700`, `text-emerald-600`, `text-teal-600` | `color.finance.positive` |
| Vlak voor diezelfde betekenis (knop, balk) | `bg-emerald-700` | `color.finance.positive.surface` |
| Bedrag dat vertrekt of ongunstig uitvalt | `var(--umanexPrimary500)`, `var(--umanexPrimary700)` | `color.finance.negative` |
| Vlak daarvan | `bg-[var(--umanexPrimary500)]`, `bg-[var(--umanexPrimary700)]` | `color.finance.negative.surface` |
| Uitgesteld / vraagt aandacht | `text-amber-600`, `text-amber-500`, `hover:text-amber-700` | `color.finance.deferred` |
| Gereserveerd (arcering en vlak in de ledger) | `var(--umanexNeutral400)` met een `// TODO` | `color.finance.reserved.graphic` |
| Saldo-staaf in een grafiek (niveau, geen beweging) | `var(--umanexNeutral800)` | `color.finance.total` |
| Verduistering achter een overlay | `bg-black/40`, `bg-black/50` | `color.overlay.scrim` |

`text-destructive` blijft zoals het is: dat is de ShadCN-rol voor "verwijderen", geen
financiële betekenis, en die twee horen niet op één token te landen.

## Waar het staat

Twaalf bestanden, alle in `apps/cashflow/components/`:

- **`cashflow/SectionBar.tsx`** — positief bedrag én de toevoeg-knop
- **`cashflow/BalanceFooter.tsx`** — buffer-beweging en -totaal, beide richtingen
- **`cashflow/RunwayCard.tsx`** — "geen tekort", de balkvulling en de negatieve staat
- **`cashflow/WaterfallChart.tsx`** — `--umanexChart4` semantisch als "erbij", `--umanexPrimary500` als "eraf"
- **`cashflow/VarianceChart.tsx`** — richting van de afwijking, tekst en balk
- **`cashflow/BufferChart.tsx`** — neutrale grafiekkleuren, geen richting; kan blijven
- **`cashflow/MonthVariance.tsx`** — zelfde richting-paar als VarianceChart
- **`cashflow/ReservationSection.tsx`** — provisiebedrag, uitgestelde regels, potbetalingen
- **`cashflow/ReservationSidepanel.tsx`** — potsaldo (`teal-600`, wijkt af van de rest), overlay
- **`cashflow/ReservationPaymentModal.tsx`** — overlay
- **`cashflow/RepeatMonthModal.tsx`** — positief bedrag
- **`cashflow/MonthCard.tsx`** — geen kleur meer sinds de footer-wijziging; niets te doen

## Wat er in Tokens Studio moet gebeuren

1. Een set `color.finance` met `positive`, `positive.surface`, `negative`,
   `negative.surface`, `deferred`, `reserved.graphic`, `total` — en `color.overlay.scrim`.
2. Waardes: neem `emerald-700` / `emerald-600` en `amber-600` als vertrekpunt, maar
   controleer het contrast op `--umanexNeutral50` en op wit. De bedragen staan in
   `tabular-nums` op klein formaat, dus AA op 14px is de ondergrens.
3. `negative` mag `--umanexPrimary700` blijven; dat is vandaag al de rode umanex-kleur.
   Het punt is de *naam*: `primary` betekent nu zowel "merkkleur" als "geld eraf".
4. Exporteren in W3C DTCG (`$value` / `$type`) — `sync-tokens.js` leest niets anders.

## Beslissingen — genomen op 2026-08-05

**`teal-600` in het spaarpotten-paneel is drift.** Geen bewust onderscheid, dus het valt
samen met `color.finance.positive`. Raakt `ReservationSidepanel.tsx` op twee plaatsen
(het potsaldo in de kop en het saldo-na-betaling in de betalingenlijst).

**`umanexChart4` verdwijnt uit de waterfall.** De aanleiding, met de feiten erbij:

`Primitives.Chart.1–5` is een categorische reeks — `#F05454`, `#2563EB`, `#F59E0B`,
`#10B981`, `#8B5CF6` — en die vijf voeden `Theme/shadcn.light.chart-1..5` plus de
dark-variant. Het zijn dus de ShadCN-serie-slots. In heel cashflow staat er precies één
verwijzing naar, in `WaterfallChart.tsx`:

    fill={ isTotal ? 'var(--umanexNeutral800)'
         : isInflow ? 'var(--umanexChart4)'
         :            'var(--umanexPrimary500)' }

Drie rollen uit drie verschillende schalen. Dat wringt op drie manieren:

1. **Het nummer is een index, geen betekenis.** Slot 4 zegt "de vierde reeks". Herschik je
   het palet ooit — normaal onderhoud, bijvoorbeeld voor beter contrast tussen aangrenzende
   reeksen — dan wordt "inkomsten" stilletjes blauw. Er breekt niets; de grafiek klopt
   alleen niet meer.
2. **De twee helften van dezelfde beslissing komen niet uit dezelfde schaal.** "Erbij" uit
   het chart-palet, "eraf" uit `Primary`, terwijl `Chart.1` vrijwel dezelfde rode is. De
   voor de hand liggende koppeling was beschikbaar en werd niet gebruikt — de keuze is ad
   hoc gemaakt, niet als paar bedacht.
3. **Er staan twee groenen voor één betekenis naast elkaar op `/analyse`.** De waterfall
   gebruikt `#10B981` (emerald-500), de footer en de sectiebalken `emerald-700`
   (`#047857`).

Daarom een derde token erbij, dat nu ontbreekt: **`color.finance.total`** voor de
saldo-staven. Die lenen vandaag `umanexNeutral800`, en dat is een eigen rol — een saldo is
geen beweging maar een niveau, en daarom bewust kleurloos.

Na de migratie verwijst niets in cashflow nog naar `umanexChart*`, en is het palet weer
vrij voor waar het voor is: reeksen zónder richting (HR-verloop, split-trend, een
vergelijking per categorie — allemaal op de ideeënlijst). Extra reden om er vanaf te
blijven: die vijf voeden ook ShadCN's `--chart-N`, dus elke ShadCN-grafiek die er later
bijkomt consumeert ze op index.

---

## Uitgevoerd op 2026-08-05

Twee nieuwe primitives, want groen en amber bestonden nog niet als ramp — alleen als
reeks-slot `Chart.4` en `Chart.3`:

    Primitives.Success   500 #10B981 · 600 #059669 · 700 #047857
    Primitives.Warning   500 #F59E0B · 600 #D97706 · 700 #B45309

En een nieuwe set `Semantic`, tussen `Primitives` en `Typography` in de `tokenSetOrder`
en aangezet in het umanex-thema:

    Semantic.Finance.positive          {Success.700}   → --umanexFinancePositive
    Semantic.Finance.negative          {Primary.700}   → --umanexFinanceNegative
    Semantic.Finance.negative-surface  {Primary.500}   → --umanexFinanceNegativeSurface
    Semantic.Finance.deferred          {Warning.600}   → --umanexFinanceDeferred
    Semantic.Finance.deferred-strong   {Warning.700}   → --umanexFinanceDeferredStrong
    Semantic.Finance.total             {Neutral.800}   → --umanexFinanceTotal
    Semantic.Overlay.scrim             #0A0A0A80       → --umanexOverlayScrim

Twee afwijkingen op het voorstel hierboven, allebei tijdens de uitvoering ontstaan:

- **`reserved` is er niet gekomen.** Die rol had één afnemer — de arcering in de
  saldo-footer — en die is bij de buffer-herbouw verdwenen. Een token zonder gebruiker
  is een token die niemand onderhoudt.
- **`deferred-strong` is erbij gekomen.** De uitgestelde regels hebben een hover-tint
  (`amber-700`); met alleen `deferred` was dat onderscheid verdwenen.

`positive.surface` is niet apart geworden: de enige twee vlakken die hem zouden gebruiken
(de toevoeg-knop en de runway-balk) dragen exact dezelfde waarde als de tekstrol. Splitsen
kan alsnog zodra er een reden is, en dat is dan een echte beslissing in plaats van een
vooruitlopende.

Twee dingen die de migratie zichtbaar verandert:

- Een paar bedragen die `emerald-600` waren staan nu op `emerald-700` — iets donkerder,
  beter contrast, en overal dezelfde groen.
- De waterfall-balk voor inkomsten was `#10B981` (Chart.4) en is nu `#047857`, gelijk aan
  de rest van de app.

De actie-link "Finaliseren →" en de checkbox-accent blijven bewust op `Primary.500`: dat
zijn merkkleuren voor een handeling, geen bedragen.
