# Plan — de dekkingsgaten in de cashflow-harnessen dichten

- **Datum:** 2026-08-08
- **Type:** infra (taak-contract, geen TC-EBC — geen design-taak)
- **Project:** cashflow
- **Status:** gevalideerd — 2026-08-08. Alle acceptatie-items af, alle elf scenario's
  (zeven + vier tegenproeven) groen in 18s, geen open vragen.

---

## Doel

Drie gaten die de harnessen zélf benoemen, en die elk hetzelfde patroon hebben: het
grootste scherm van de app en zijn overlays worden door geen enkele guard aangeraakt.

1. **`MonthCard` en de modals staan in geen enkele contrast-sweep.** `render-screens.tsx`
   laat ze bewust weg omdat ze aan dnd-kit én de store hangen. Wat de sweep dekt zijn de
   rollaag, de primitives en de losse componenten — samen 284 tekstelementen, geen enkel
   ervan uit het scherm waar de gebruiker naar kijkt.
2. **De modals worden nergens aangedreven.** De flow-harness rijdt alleen de sleep uit.
   `RepeatMonthModal` en `ReservationPaymentModal` zijn nooit geopend door een guard.
3. **Loading, empty en error zijn niet op te wekken.** De fixture antwoordt altijd meteen
   en goed, dus de drie states die volgens de globale CLAUDE.md default onderdeel van elk
   data-gedreven component zijn, worden door niets getoetst — precies het scherm dat een
   gebruiker ziet wanneer het misgaat.

## Aanpak

**Root cause, niet drie patches.** Gat 1 en 2 komen uit dezelfde oorzaak: de contrast-meting
kan alleen een statisch HTML-bestand lezen, dus alles wat een draaiende app nodig heeft valt
erbuiten. De fix is dus niet "MonthCard nabouwen in de render-harness" — dan meet de sweep de
layout die de harness zelf neerzet, niet die van de app (dezelfde reden waarom de flow-harness
de échte app aanstuurt). De fix is de meting losmaken van zijn driver:

    scripts/contrast.mjs      de meting + het oordeel — één bron
      ├── dom-sweep.mjs       driver A: statische bestanden (rollaag, charts)
      └── flow-harness.mjs    driver B: de draaiende app, mét MonthCard en de modals open

Gat 3 zit in de fixture: de route-handler kent één antwoord. Hij krijgt een gedrag-parameter
(vertraging, leeg document, 500) zodat een scenario de state kan forceren.

## Acceptatie

- [x] De contrast-meting staat in één module die zowel `dom-sweep.mjs` als
      `flow-harness.mjs` gebruikt. Geen tweede implementatie van drempels of compositing.
      `scripts/contrast.mjs`; `dom-sweep` meet ná de refactor exact dezelfde aantallen
      (165 + 119 = 284), dus er schoof niets.
- [x] De flow-harness sweept het échte scherm (MonthCard inbegrepen) en meldt hoeveel
      tekstelementen hij mat. Een fout onder AA laat de run vallen. Gemeten: 325
      tekstelementen (prognose 103, herhaal-modal 108, betaalmodal 114).
- [x] Beide modals (`RepeatMonthModal`, `ReservationPaymentModal`) worden geopend, gesweept
      en weer gesloten door een scenario. De fixture bevat daarvoor een spaarpot.
      Selectie op `aria-label`, niet op `[role=dialog]` — zie de bevinding hieronder.
- [x] Loading, empty en error zijn elk als scenario te forceren, en elk toetst wat de
      gebruiker dan ziet: skeleton met `aria-busy`, de lege staat per sectie, het
      foutscherm met "Opnieuw proberen" — geen blanco scherm.
- [x] **Tegenproef per guard.** Vier, in dezelfde run: een sleep die niets verplaatst, een
      geïnjecteerde te-lichte tekst die de sweep moet vinden, een modal die niemand opent,
      en een foutscherm zonder fout. Alle vier falen zoals bedoeld.
- [x] De schrijf-garantie blijft overeind: 0 verzoeken naar de echte Supabase-origin in
      élk scenario, ook met de modals open. Gemeten over de volle run: 2 schrijfpogingen
      onderschept, 0 verzoeken naar de echte origin.
- [x] `pnpm --filter cashflow flow:selftest` blijft groen en de looptijd blijft werkbaar:
      18s lokaal voor elf scenario's (was 8s voor drie).
- [x] `apps/cashflow/CLAUDE.md` → Verify-pad klopt weer: "Render vastleggen" noemt beide
      drivers, "Flow aandrijven" de zeven scenario's plus de origin-eis, en "State
      forceren" het `gedrag`-argument in plaats van "kan niet".

## Invariant

Niet van toepassing als rekenkundige invariant — dit raakt de rekenkern niet. De meetbare as
is de **tegenproef**: elke guard die hier bijkomt moet in dezelfde run bewijzen dat hij kán
falen. Dat is wat `--selftest` al doet voor de sleep, en het wordt hier de regel voor alles.

## Open vragen

Geen. De drie gaten staan letterlijk in `apps/cashflow/CLAUDE.md` (Verify-pad) en in
`dom-sweep.mjs` beschreven; de aanpak volgt eruit.

## Wat het bouwen zelf blootlegde

Drie dingen die niemand zocht, en die precies daarom de moeite van het opschrijven waard zijn:

1. **De tegenproeven verdienden zich meteen terug.** "Modal die niemand opent" was gróén bij
   de eerste run: beide sidepanels staan permanent gemonteerd als `role="dialog"
   aria-modal="true"` en worden alleen met `translate-x-full` uit beeld geschoven, dus een
   kale `[role=dialog]`-selector matcht altijd iets. Zonder die tegenproef had de
   modal-assertie een sidepanel gemeten en groen gestaan zonder ooit een modal te openen.
2. **Een build met een andere `NEXT_PUBLIC_SUPABASE_URL` maakt élk scenario rood** op een
   oorzaak die nergens genoemd werd ("Geen verbinding met de server", elf keer). De harness
   sluit nu niet alleen de juiste origin af, hij zégt het ook wanneer de app een andere zoekt.
3. **Geen van beide modals sluit op Escape.** Bewust niet als assertie opgenomen — dan zou
   de harness rood staan op bestaand gedrag — maar het staat als bevinding in `HANDOFF.md`.
   Gefixt op 2026-08-08 samen met punt 1; sindsdien is sluiten met Escape wél de assertie.

## Wat de review daarna vond

Een `code-review` op de diff leverde drie bevindingen op die alle drie dezelfde vorm hebben
als wat dit plan wilde wegwerken — een guard die succes meldt zonder gemeten te hebben.
Opgelost in een eigen PR; hier genoteerd omdat ze bij dit werk horen.

1. **De harness sloot de verkeerde origin af zonder het te merken.** Hij las de origin uit
   zijn eigen omgeving, terwijl de app die uit de build draagt. Bij een mismatch gaan de
   verzoeken langs de onderschepping heen — naar een échte server — en meldt de uitslag
   nog steeds "0 verzoeken naar de echte origin". Hij leest de origins nu uit
   `.next/static/chunks` en weigert te starten bij een mismatch, en breekt daarnaast élke
   andere supabase-host af. De diagnose op `requestfailed` die ik tijdens het bouwen
   toevoegde is weer weg: die ving alleen de ónschuldige richting.
2. **`scenarios` was de enige guard zonder tegenproef.** Nu draait elke suite eerst met
   `SCENARIO_SELFTEST=1`, wat één check injecteert die moet falen.
3. **`scenarios` ketende met `&&`,** dus een rode buffer-suite verborg de anker-suite tot
   de volgende push. Beide draaien nu altijd.
