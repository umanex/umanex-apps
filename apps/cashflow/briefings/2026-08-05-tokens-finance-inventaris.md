# Finance-tokens — inventaris en voorstel

- **Datum:** 2026-08-05
- **Project:** cashflow
- **Status:** wacht op Tokens Studio

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
   `negative.surface`, `deferred`, `reserved.graphic` — en `color.overlay.scrim`.
2. Waardes: neem `emerald-700` / `emerald-600` en `amber-600` als vertrekpunt, maar
   controleer het contrast op `--umanexNeutral50` en op wit. De bedragen staan in
   `tabular-nums` op klein formaat, dus AA op 14px is de ondergrens.
3. `negative` mag `--umanexPrimary700` blijven; dat is vandaag al de rode umanex-kleur.
   Het punt is de *naam*: `primary` betekent nu zowel "merkkleur" als "geld eraf".
4. Exporteren in W3C DTCG (`$value` / `$type`) — `sync-tokens.js` leest niets anders.

## Twee dingen om te beslissen

- **`teal-600` in het spaarpotten-paneel** wijkt af van de `emerald` elders voor exact
  dezelfde betekenis (een positief potsaldo). Voorstel: laten samenvallen op
  `color.finance.positive`. Was dat een bewust onderscheid, zeg het dan — dan wordt het
  een eigen token in plaats van een opruiming.
- **`--umanexChart4`** doet in de waterfall dienst als "geld erbij", terwijl de naam een
  reeks-index suggereert. Als de grafieken ooit een echte reeks-schaal krijgen, botst dat.
  Voorstel: de waterfall op `color.finance.*` zetten en `umanexChart*` reserveren voor
  categorische reeksen.
