# Beginsaldo als eerste regel van de inkomsten

- **Datum:** 2026-08-10
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gevalideerd — 2026-08-10. Alle guards groen (flow-selftest 19/19 inclusief
  vier nieuwe tegenproeven, scenarios 594/594, verify:visual 297 tekstelementen,
  type-check, lint en de laag-discipline-guard), zowel lokaal als in CI op PR #251. Daarna
  bevestigd op het doelwit van de gebruiker: de PM2-app op `:3000` met de echte data, ná
  `pm2:rebuild`. Beide takken gezien — augustus toont het beginsaldo in de sectie, en met
  het anker op oktober komt de "Vorig saldo"-regel in december terug op −€ 11.443,15.

---

```
TASK:        Het beginsaldo wordt de eerste regel bínnen de Inkomsten-sectie in plaats
             van een eigen ledger-regel erboven. In een niet-ankermaand verdwijnt die
             regel zodra het saldo op €0 staat.

CONTEXT:     Maandkolom-ledger (briefings/2026-08-04-feature-maandkolom-ledger), het
             3-kolomsvenster van app/page.tsx. Sinds de bufferpot het eindsaldo per
             constructie op €0 legt, herhaalt "Vorig saldo" in kolom 2 en 3 alleen nog
             "€ 0,00". De rekenkern blijft ongemoeid: subtotals.incoming (= startBalance
             + totalIncome) bestaat al en wordt vandaag nergens gerenderd.

ELEMENTS:    SectionBar "Inkomsten" (bedrag wordt subtotals.incoming), StartBalanceRow
             als eerste regel in de sectielijst — bewerkbaar met label "Beginsaldo" in de
             ankerkolom, read-only met label "Vorig saldo" daarbuiten — de bestaande
             inkomstenposten, de lege staat "Geen inkomsten".

BEHAVIOUR:   Ankerkolom: de regel staat er altijd; klik op het bedrag opent een
             invoerveld, Enter en wegklikken bevestigen, Escape annuleert. Gelijk aan
             het berekende saldo wist de correctie, anders wordt ze opgeslagen — de
             drie-tak uit PR #187 verhuist integraal mee. Andere kolommen: de regel is
             read-only en wordt alleen getoond bij |saldo| ≥ 0,005. De regel is niet
             versleepbaar en niet verwijderbaar.

CONSTRAINTS: Geen wijziging aan lib/cashflow/subtotals.ts of calculator.ts — dit is een
             weergavewijziging. De kop toont in élke kolom subtotals.incoming, zodat
             "kop = som van de zichtbare regels" overal blijft gelden. Teken én kleur
             blijven dubbel gecodeerd, ook bij een negatief doorgerold saldo. Alleen
             rol-utilities, geen paletklassen. Desktop 3-koloms.
```

---

## Open vragen

Geen. De twee kritische keuzes zijn op 2026-08-10 door Jeroen beantwoord:

1. **Inkomsten-kop** — toont `subtotals.incoming` (beginsaldo + inkomsten), niet alleen de
   losse posten. Reden: anders tellen de zichtbare regels niet meer op tot hun eigen kop.
2. **"Vorig saldo" in kolom 2 en 3** — weg bij €0, terug zodra het saldo afwijkt. De
   premisse "dit is nu toch altijd 0" klopt niet volledig: `calculator.ts:566` begrenst de
   bufferopname tot wat er in de pot zit, en `calculator.ts:620` rolt het restant
   ongewijzigd door. Gemeten op de echte data: met het anker op 2026-10 opent kolom 3
   (2026-12) op −11.443,15; met het anker op 2026-11 openen beide niet-ankerkolommen op
   −11.443,15 en −26.700,28. Twee klikken op → volstaat.

## Aannames

- `[ASSUMPTION]` "De huidig actieve maand" is de **ankerkolom** (`isFirst`, kolom 0 van het
  venster), niet `getCurrentMonthKey()`. Dat is de bestaande betekenis in de app: alleen
  daar grijpt een `balanceOverride` aan (`calculator.ts:840`) en alleen daar is het
  beginsaldo het échte banksaldo. Navigeer je terug, dan verhuist de bewerkbare regel mee.
- `[ASSUMPTION]` De lege staat blijft hangen aan `items.length === 0` en gaat dus over
  inkomstenposten, niet over de sectie-inhoud. In de ankerkolom staan de saldoregel en
  "Geen inkomsten" daardoor onder elkaar. Zo blijft `flow-harness.mjs` groen op het
  scenario "state — leeg".
- `[ASSUMPTION]` De WaterfallChart op /analyse houdt "Beginsaldo" als eigen eerste staaf.
  Die grafiek verklaart juist de brug van begin- naar eindsaldo; samenvoegen zou haar
  openingstotaal wegnemen.
- `[ASSUMPTION]` De kop houdt `direction="in"`. Een negatieve `incoming` krijgt daarmee een
  `−` en de negatieve kleur; `direction="neutral"` zou via `formatSigned` de absolute
  waarde tonen en het tekort onzichtbaar maken (`recurring.ts:54`).

## Acceptatie

- [x] In de ankerkolom staat het beginsaldo als eerste regel bínnen de Inkomsten-sectie,
      met label "Beginsaldo", en er staat geen saldo-regel meer boven de sectie. Gemeten
      door `saldo — regel staat in de inkomstensectie`: de regel valt tússen de
      inkomstenkop en de kop van de volgende sectie. Tegenproef `saldoregel boven de
      sectie` bewijst dat die volgorde-check ook echt kan afgaan.
- [x] De Inkomsten-kop toont in élke kolom `subtotals.incoming`. Kop = som van de zichtbare
      regels eronder, en de kolom telt nog steeds op tot het eindsaldo. Dezelfde
      optelling die `scripts/buffer-scenarios.ts:150` al als "zichtbaar" toetst — geen
      tweede afleiding in de UI.
- [x] Een niet-ankerkolom met |saldo| < 0,005 toont géén saldo-regel. Gemeten door
      `saldo — geen nulregel in latere maanden` op de lege fixture; tegenproef
      `nulregel in een latere maand` bewijst de andere kant.
- [x] Een niet-ankerkolom met een afwijkend saldo toont hem wél, read-only, met label
      "Vorig saldo" en met zichtbaar minteken bij een tekort. De harnasfixture heeft geen
      bufferpot, dus dit is precies wat het eerste scenario meet: `Vorig saldo 4802.58` en
      `4742.58`, allebei zonder knop. Het minteken komt van `formatAmount`, niet van
      `formatSigned` — vandaar de keuze in de Aannames.
- [x] De correctie-flow werkt onveranderd: klikken en wegklikken zónder wijziging laat een
      bestaande correctie staan (de bug uit HANDOFF 2026-08-05), gelijk aan het berekende
      saldo wist ze, anders slaat ze op. Nu end-to-end gedekt in plaats van alleen via het
      model (A9): het scenario klikt het veld open, klikt ernaast en toetst dat er ná de
      800 ms debounce géén wegschrijf-call vertrekt. Tegenproef `correctie schrijft niets
      weg` typt wél een ander bedrag en ziet er één — zonder die tegenproef stond de
      teller op nul omdat er te kort gewacht werd.
- [x] De saldo-regel is niet versleepbaar en niet verwijderbaar, en breekt de
      sleep-selector van de harness niet. De rij draagt in de ankerkolom precies één knop
      (het bedrag) en elders geen enkele; beide sleep-scenario's blijven groen.
- [x] `pnpm --filter cashflow scenarios` blijft groen: geen enkel getal in de rekenkern
      verschuift (546 + 48 = 594 checks, beide suites bewezen faalbaar). Sterker: de diff
      raakt geen enkel bestand onder `lib/`.
- [x] `pnpm --filter cashflow flow:selftest` blijft groen, inclusief een nieuw scenario dat
      de plaats van de regel vastlegt én zijn tegenproef. 19/19.
- [x] `pnpm --filter cashflow verify:visual` blijft groen; `render-screens.tsx` toont de
      regel in zijn nieuwe vorm en een kop met een negatief bedrag. 297 tekstelementen
      boven AA (was 284; het verschil zijn de nieuwe fixtures).
- [x] De typecheck dekt `scripts/` mee en blijft groen. Ook `lint` en
      `@umanex/tokens guard` (169 bestanden, 0 uitzonderingen).
- [x] Visueel bevestigd op het doelwit van de gebruiker: de PM2-app op `:3000` met de
      echte data, ná `pnpm --filter cashflow pm2:rebuild`. Anker augustus 2026: kop
      +€ 23.603,83 = beginsaldo € 21.487,83 + Columba € 2.116,00, en september en oktober
      tonen géén saldo-regel omdat ze op nul openen (8.966,00 + 2.821,72 = 11.787,72 en
      14.483,00 + 2.821,72 = 17.304,72 — beide kloppen met hun kop). Anker oktober 2026:
      december opent op −€ 11.443,15, de "Vorig saldo"-regel staat er read-only met
      minteken en de kop draagt hetzelfde bedrag in de negatieve kleur. Uitlijning in de
      DOM nagemeten: de saldoregel en een inkomstenpost hebben identieke geometrie
      (label 58,6→329,5 · bedrag 337,5→410,3), dus de bedragkolom loopt door.

## Beslissingsgeschiedenis

- 2026-08-10: Briefing geopend. Vervangt het afgevinkte acceptatie-item "De ledger toont
  beginsaldo, vier kostenstappen en het eindsaldo in de volgorde van de kernformule" uit
  `briefings/2026-08-04-feature-maandkolom-ledger.tcebc.md`: het beginsaldo is geen eigen
  ledger-stap meer maar de eerste regel van de inkomstenstap. Het item eronder ("de som van
  de zichtbare ledger-regels is exact het eindsaldo") blijft onverkort gelden en is precies
  de reden dat de kop naar `subtotals.incoming` gaat.
