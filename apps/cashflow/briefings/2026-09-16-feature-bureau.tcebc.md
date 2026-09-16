# Bureau — umanex sturen vanuit de cashflow-app

- **Datum:** 2026-09-16
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gebouwd — 2026-09-16; open: build in CI, unit-tests in CI, screenshots niet elk geopend, doelwit-controle na de merge

---

```
TASK:        Een intern bedrijfsdashboard "Bureau" in de cashflow-app dat zes vragen
             beantwoordt: meer verkopen? past een opdracht in mijn tijd? leveren projecten
             genoeg op? scope/prijs bijstellen? wanneer een cashtekort? te afhankelijk van
             één klant?

CONTEXT:     Jeroen schakelt van uurtje-factuurtje naar trajecten tegen vaste prijs. De app
             is vandaag een maandprognose (/ en /analyse) op één Supabase-document; klanten,
             verkoopfacturen, projecten, uren, doelen, weken en kwartalen bestaan niet.
             Uitbreiding, geen losse app: zelfde document (nieuwe sleutel `bureau`, v16),
             zelfde rekenkern (13 weken = verdeling ervan), zelfde light-only rollaag.
             Plan: ~/.claude/plans/velvety-hopping-prism.md.

ELEMENTS:    - AppHeader (gedeeld op /, /analyse, /bureau/*): titel · sync · nav Prognose/
               Analyse/Bureau · Uitloggen
             - /bureau: SignalList + 6 KpiTiles (omzet · getekend resterend · kansen ·
               capaciteit · rendement A/B · vrije cash + 13 weken)
             - /bureau/projecten (+ [id]): lijst, ProjectSheet, detail met YieldBreakdown,
               mijlpalen, facturen, blokkades
             - /bureau/verkoop: SalesFunnel, OpportunityList per stadium, OpportunitySheet
               met QualificationChecklist en ConversionPanel
             - /bureau/tijd: QuickTimeEntry, WeekList, PlanningTable
             - /bureau/klanten: ConcentrationBars + tabel
             - /bureau/cash: CashPositionLine, WeekCashTable, OverdueInvoiceList
             - /bureau/doelen: GoalsForm met GoalsSumLines, of EmptyState + startwaarden
             - BureauSubnav, YearSelector, EmptyState, DataTable, velden
             - @umanex/ui: Button, Input, Label, Checkbox, Badge, Separator, Sheet, Tabs,
               + nieuw Textarea en NativeSelect

BEHAVIOUR:   Elke tegel toont waarde, noemer, bron en één drill-down; ontbrekend = "Onvoldoende
             gegevens" met reden en fix-link, nooit € 0. Signalen eerst, met drempel en link.
             Bewerken in Sheets en inline rijen, altijd met expliciete submit (Opslaan /
             Registreren / OK / checkbox) — nooit wegschrijven per toetsaanslag. Snelle
             tijdinvoer: Enter registreert, focus terug op uren, categorie en project blijven.
             Factuur maakt/koppelt een inkomstenpost; "betaald" haalt die post uit de prognose
             (niet in een afgesloten maand). Gewonnen kans → precies één project. Doelen:
             somregels live, nooit gecorrigeerd; startwaarden vullen alleen het formulier.
             Jaarkiezer filtert alle bureau-pagina's en blijft staan bij navigatie.

CONSTRAINTS: Operate-modus, de incumbent cashflow-stijl (RunwayCard-oppervlak, dichte
             ledger-rijen, text-dense), light-only, alleen rollaag-utilities, geen nieuwe
             dependencies. Nederlands, euro, omzet ex btw / cash incl. btw. Klik + toetsenbord,
             geen drag, geen informatie die alleen op hover of kleur bestaat. 1440 én 390
             zonder horizontale overflow (tabellen scrollen in hun eigen container).
             Rekenkern `lib/cashflow/*` byte-identiek. Rekenmodules puur (`lib/bureau/*`).
```

---

## Open vragen

_(leeg — alle vier kritische items beantwoord in het plan en door Jeroen op 2026-09-16)_

## Aannames

- `[ASSUMPTION: typologie]` Pagina per vraag onder `/bureau`; bewerken in een rechter `Sheet`
  (`sm:max-w-md`, scrollt); project-detail als eigen route omdat mijlpalen, facturen en
  blokkades elk een eigen bewerkbare lijst zijn (geen overlay-in-overlay) en signalen er naartoe
  moeten kunnen linken. Snelle tijdinvoer inline, nooit in een overlay.
- `[ASSUMPTION: persona]` Eén gebruiker (Jeroen), desktop-first maar bruikbaar op 390; de
  weekstart (maandag) en de dagdefinitie (8 u) zijn instellingen, geen constanten.
- `[ASSUMPTION: data]` Startwaarden 2027 zijn defaults in code (`isDefault`-vlag), geen
  opgeslagen gegevens; verkoopprijzen per aanbodtype worden nergens opgeslagen.
- `[ASSUMPTION: klanten]` Een klant ontstaat bij het aanmaken van een project of conversie (vrij
  tekstveld met suggesties); er is geen apart klantbeheer behalve klantgroepen.
- `[ASSUMPTION: weekplanning]` Ongedateerde uitgaven landen in de eerste week van hun maand (nooit
  vóór vandaag), ongedateerde inkomsten in de laatste; dat is voorzichtig en staat per regel
  zichtbaar als "ongedateerd".
- `[ASSUMPTION: auto-close]` `useAutoCloseMonth` verhuist naar `DataGate` met dezelfde vier guards,
  zodat de weekopening op `/bureau/cash` gelijk is aan de ankerkolom op `/`.

## Direction contract

- **THESIS:** Elk getal draagt zijn noemer en zijn bron in zijn eigen tegel; weigert het
  KPI-dashboard dat een groot getal toont en de herkomst achter een tooltip verstopt.
- **OWN-WORLD:** De bestaande cashflow-wereld, niet uitgebreid: `bg-card` met `border-accent`
  en `rounded-xl`, Fira Sans, `text-3xl tabular-nums` voor één waarde per tegel, `text-dense`
  ledger-rijen met zebra `bg-muted`, finance-rollen alleen voor teken en afwijking, U+2212 als
  minteken, geen iconen waar een woord volstaat.
- **STORY:** Jeroen ziet eerst wat aandacht vraagt, dan waar hij staat, klikt op het getal dat
  hem verrast en landt op de rijen die het optellen — en kan daar meteen corrigeren.
- **FIRST VIEWPORT:** Bovenaan de gedeelde header met Bureau actief, eronder subnav en
  jaarkiezer op één regel; dan de signaallijst over de volle breedte (één regel per signaal);
  daaronder drie tegels op 1440 (omzet · getekend resterend · kansen), de tweede rij net
  boven de vouw. Geen primaire knop op het overzicht: acties wonen op de bestemming.
- **FORM:** Structuur B uit drie (signalen eerst, tegels in briefvolgorde), gekozen boven
  "tegels eerst" en "signalen in een zijkolom"; incumbent-uitbreiding, geen concept-roll.
- **FINISH:** unreviewed and undocumented is unfinished; this build ends with the finish review,
  the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Acceptatie

_Invarianten over het hele model (afhankelijke berekeningen — scherm-per-scherm valideert hier niets):_

- [x] **I1** — gerealiseerd en resterend getekend zijn disjunct: per jaar is hun som gelijk aan Σ mijlpalen met dat jaar als attributie — instrument: `lib/bureau/revenue.test.ts` — bewijs: `revenue.test.ts` 'I1 — invariant: per jaar is gerealiseerd + resterend gelijk aan de som…' groen (`pnpm test` 147/147)
- [x] **I2** — de 13 weken tellen per maand exact terug op tot de maandbeweging van de engine (|delta| < 0,005) — instrument: `verifyReconciliation` in `lib/bureau/weekly-cash.test.ts` — bewijs: `weekly-cash.test.ts` 'reconciliatie: per maand tellen de weken exact op…' — `verifyReconciliation` = [] over maart–juni 2027, handgerekende bewegingen 2.940 / −2.600 / −2.500 / −1.600
- [x] **I2-tegenproef** — een mutatie van 0,01 in één weekcel maakt `verifyReconciliation` rood — instrument: mutant-test in `weekly-cash.test.ts` — bewijs: 'één cent in één week is al een verschil' → ['2027-04'], 'een weggevallen regel wordt gezien' → ['2027-03']; plus vijf broncode-mutanten, alle vijf rood
- [x] **I3** afgeschreven — bank = vrij + gereserveerd per maandeinde wordt niet getoond: potbewegingen zijn in de rekenkern niet gedateerd, dus een potstand per week of maandeinde in de weektabel zou verzonnen zijn (zie beslissingsgeschiedenis). Wat wél gemeten is: bank = vrij + gereserveerd bij de start — bewijs: `weekly-cash.test.ts` position {bank 10.000, reserved 4.000, free 6.000}
- [x] **I4** — besteed en gepland overlappen niet: registraties ≤ vandaag, planning in periodes die nog niet voorbij zijn — instrument: `lib/bureau/capacity.test.ts` — bewijs: `capacity.test.ts` 'I4 — besteed en gepland overlappen niet…' groen
- [x] **I5** — de bestaande rekenkern is ongewijzigd: digest-hash over 300 seeds gelijk aan de hash van vóór fase 0 — instrument: `scripts/calc-regression.ts` in `pnpm --filter cashflow scenarios` — bewijs: `pnpm --filter cashflow scenarios` regressie 1/1 na fase 6 (digest ongewijzigd), buffer 1033/1033, anker 48/48
- [x] **I5-tegenproef** — `SCENARIO_SELFTEST=1` verschuift één bedrag 0,01 en de regressiesuite faalt — instrument: `scenarios.mjs` — bewijs: dezelfde run: 'tegenproef regressie: valt met exit 1 op een geïnjecteerde fout — 0/1'
- [x] **I6** — een document zonder sleutel `bureau` (v15) laadt en round-tript alle 15 bestaande sleutels onveranderd — instrument: `lib/cashflow/normalize.test.ts` — bewijs: `normalize.test.ts` 'een v15-document laadt: alle vijftien bestaande sleutels onveranderd, bureau leeg' groen
- [x] **I7** — `selectCashflowData` en `emptyData()` dragen allebei `bureau` (anders wordt niets opgeslagen) — instrument: `normalize.test.ts` (16 sleutels) + harness-teller schrijfpogingen na een bureau-edit — bewijs: `normalize.test.ts` 'emptyData draagt 16 sleutels, waaronder bureau' groen; harness `state.documenten` bevat `bureau` na een bureau-edit ('verkoop — gewonnen maakt één project': document met 1 project en `kans.projectId`)

_Financiële semantiek (brief §12):_

- [x] Voorschot-factuur telt als gefactureerd en openstaand, niet als omzet — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'voorschot → realisatie → betaling: omzet volgt alleen de mijlpaal…' groen
- [x] Betaling verandert ontvangen en openstaand, niet de omzet — instrument: `revenue.test.ts` — bewijs: zelfde test 'voorschot → realisatie → betaling…' groen
- [x] Project over twee boekjaren: een mijlpaal gepland in december en gerealiseerd in januari telt één keer, in het realisatiejaar — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'project over twee boekjaren: een decembermijlpaal die in januari gerealiseerd wordt, telt één keer, in januari' groen
- [x] Gedeeltelijk gerealiseerde opdracht (4k van 12k) splitst in 4k gerealiseerd en 8k resterend — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'gedeeltelijk gerealiseerde opdracht…' — mijlpalen 4.000 (gerealiseerd voor 3.500) + 8.000 → [3.500, 8.000]
- [x] Maandmijlpalen aanmaken voor een capaciteitsproject maakt precies één mijlpaal per maand van de geplande periode, met som gelijk aan de goedgekeurde prijs — instrument: `mutations.test.ts` (`addMonthlyMilestones`) — bewijs: `mutations.test.ts` 'maandmijlpalen: één per maand, samen precies de goedgekeurde prijs incl. uitbreiding' groen
- [x] Goedgekeurde uitbreiding verhoogt resterend getekend en de goedgekeurde prijs met hetzelfde bedrag — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'een goedgekeurde uitbreiding verhoogt de prijs en, met haar mijlpaal, het resterend getekende' groen
- [x] Een voorstel van € 20.000 komt in geen enkele getekende, gerealiseerde of cash-som voor — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'een voorstel is geen getekend werk…' → gerealiseerd/resterend/getekend [0, 0, 0], ongewogen apart 20.000; cash: `grep -c opportunit lib/bureau/weekly-cash.ts` = 0
- [x] Omzet boven doel toont "boven doel" en nog-te-verkopen 0, nooit een negatief bedrag — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'boven doel: nog te verkopen is 0, en het bedrag boven doel staat apart' groen
- [x] Omzetgat bij nul vrije klantdagen geeft `geen-capaciteit`, geen NaN of Infinity — instrument: `revenue.test.ts` — bewijs: `revenue.test.ts` 'omzet per vrije klantdag: … nul dagen is een melding, geen Infinity' groen
- [x] Nul uren én geen urenraming geven A en B "onvoldoende gegevens" — instrument: `lib/bureau/profitability.test.ts` — bewijs: `profitability.test.ts` 'nul uren en geen raming: onvoldoende gegevens, geen deling door nul' groen
- [x] Afgerond project rekent met werkelijke uren en kosten; een ontbrekende werkelijke kost maakt alleen B onvoldoende — instrument: `profitability.test.ts` — bewijs: `profitability.test.ts` 'afgerond project: werkelijke uren…' en 'afgerond met een ontbrekende werkelijke kost: B onvoldoende, A wel' groen
- [x] Externe kosten verlagen B en niet A, en tellen nooit als eigen capaciteit — instrument: `profitability.test.ts` + `capacity.test.ts` — bewijs: `profitability.test.ts` 'externe kosten verlagen B en niet A, en tellen niet als eigen dagen' groen; `grep -c externalCosts lib/bureau/capacity.ts` = 0
- [x] Een gewijzigde uur-per-daginstelling verandert de dagen van eerdere registraties niet — instrument: `profitability.test.ts` — bewijs: `profitability.test.ts` en `capacity.test.ts` 'dagen volgen de uren per dag van de registratie' groen
- [x] Overschrijding binnen de buffer is geen overbelasting; daarboven wel, met het verschil als getal — instrument: `capacity.test.ts` — bewijs: `capacity.test.ts` 'overschrijding: eerst uit de buffer, daarboven overbelasting' groen
- [x] Gewonnen kans tweemaal omzetten geeft de tweede keer `al-omgezet` en geen tweede project — instrument: `lib/bureau/mutations.test.ts` — bewijs: `mutations.test.ts` 'tweede conversie: al-omgezet, geen tweede project en geen tweede klant' groen
- [x] Conversiecijfers dragen periode en noemer; bij noemer 0 is de ratio `null` — instrument: `pipeline.test.ts` — bewijs: `pipeline.test.ts` 'conversies: noemer uit de historie in de periode… geen ratio bij noemer 0' groen; mutant 'noemer zonder periode' rood
- [x] Achterstallige factuur zonder verwachte betaaldatum staat in `unplaced`, in geen enkele week — instrument: `weekly-cash.test.ts` — bewijs: `weekly-cash.test.ts` 'achterstallige factuur zonder verwachte datum: apart, in geen enkele week' groen; mutant 'achterstallig in deze week' rood
- [x] Factuur mét gekoppelde inkomstenpost geeft één ontvangstregel, niet twee — instrument: `weekly-cash.test.ts` — bewijs: `weekly-cash.test.ts` 'factuur mét gekoppelde post: één ontvangstregel' groen; mutant 'factuur én post' rood
- [x] Reserveringen worden in de ankermaand niet tweemaal afgetrokken: openingsvrij = banksaldo − potstand bij start — instrument: `weekly-cash.test.ts` — bewijs: `weekly-cash.test.ts` — position {bank 10.000, reserved 4.000, free 6.000}, week 10 naar potten 500; mutant 'reservering dubbel' rood (6 tests)
- [x] Klantconcentratie telt meerdere projecten van één klant samen en noemt de noemer per basis (gerealiseerd · prognose) — instrument: `lib/bureau/concentration.test.ts` — bewijs: `concentration.test.ts` — Alfa 30k + 10k = 40k, noemer 100.000 gerealiseerd / 200.000 prognose
- [x] De cashbehoefte-aanname komt in geen enkele weekregel voor — instrument: `weekly-cash.test.ts` — bewijs: `weekly-cash.test.ts` 'de cashbehoefte uit de doelen komt in geen enkele weekregel' groen
- [x] Dagbudgetten en kwartaaldoelen die niet optellen tonen het verschil, zonder de ingestelde waarden aan te passen — instrument: `lib/bureau/goals.test.ts` — bewijs: `goals.test.ts` 'dagbudgetten die niet optellen…' en 'kwartalen die niet optellen…' groen

_Store-overgangen:_

- [x] "Betaald" verwijdert de gekoppelde inkomstenpost in een open maand — instrument: `lib/bureau/mutations.test.ts` — bewijs: `mutations.test.ts` 'voorschot → betaling: de post verdwijnt…' groen; harness 'facturen — betaald haalt de post uit de prognose' — 1 schrijfactie, post weg in het document
- [x] "Betaald" laat de post staan in een afgesloten maand en meldt dat — instrument: `mutations.test.ts` — bewijs: `mutations.test.ts` 'betaald in een afgesloten maand: de post blijft staan en dat wordt gemeld' groen
- [x] "Betaald ongedaan maken" zet de post terug in de maand van de verwachte betaaldatum — instrument: `mutations.test.ts` — bewijs: `mutations.test.ts` 'betaald ongedaan maken zet de post terug…' groen; harness: uitvinken → nieuwe post € 1.234,56
- [x] Een inkomstenpost verwijderen op `/` ontkoppelt de factuur (`incomeItemId` null) — instrument: `mutations.test.ts` — bewijs: `mutations.test.ts` 'een post verwijderen op de prognose ontkoppelt de factuur' groen

_States (per pagina aanwezig tenzij afgeschreven):_

- [x] Leeg: elke tegel toont "Onvoldoende gegevens" en nergens "€ 0" — instrument: harness `bureau — leeg: onvoldoende gegevens, nooit nul` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — leeg (document zonder bureau-sleutel)': 6 tegels, elk 1× 'Onvoldoende gegevens', 0× € 0
- [x] Leeg-tegenproef: een geïnjecteerde "€ 0" in een tegel laat dat scenario falen — instrument: harness selftest — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tegenproef — een nul in een lege tegel' faalt zoals bedoeld ('€ 0 in omzet')
- [x] Legacy-document zonder `bureau` rendert zes tegels zonder paginafout — instrument: harness `bureau — document zonder bureau-sleutel` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde leeg-scenario op een document zonder bureau-sleutel: 6 tegels, 0 paginafouten
- [x] Elke bureau-pagina heeft een lege staat met één actie — instrument: harness-scenario per route op `gedrag.bureau: 'leeg'` (telling `[data-empty-state]` = 1) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — lege staat per route': 7/7 routes 1 lege staat; actie ín de lege staat op overzicht, klanten, cash en doelen; op projecten en verkoop staat de enige actie in de kop (Nieuw project / Nieuwe kans), op tijd het registratieformulier erboven; tegenproef faalt bij 0
- [x] Laden: de `DataGate`-skeleton met `aria-busy` verschijnt ook op `/bureau` — instrument: harness `state — laden` met `pad: '/bureau'` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'state — laden op het overzicht'
- [x] Fout: het foutscherm met "Opnieuw proberen" verschijnt ook op `/bureau` — instrument: harness `state — fout` met `pad: '/bureau'` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'state — fout op het overzicht': 'Opnieuw proberen', 0 tegels
- [x] Conflict: na een revisieconflict is "Registreren" uitgeschakeld met hint — instrument: harness `conflict — bureau blokkeert opslaan` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tijd — revisieconflict zet registreren uit, met hint'
- [x] Gedeeltelijk: een project zonder urenraming toont "Onvoldoende gegevens" in zijn A/B-cellen — instrument: harness `projecten — zonder urenraming geen rendement` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'projecten — zonder urenraming geen rendement': 2× Onvoldoende gegevens, met raming € 1.125/dag

_Gedrag en interactie:_

- [x] Elke tegel heeft een niet-lege noemer, een bron en precies één link naar `/bureau/…` — instrument: harness `bureau — vol: noemer, bron en link per tegel` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — vol: noemer, bron en precies één link per tegel' (omzet → /bureau/projecten … cash → /bureau/cash)
- [x] Tegel "Omzet" is gelijk aan de som van de gerealiseerde mijlpalen op zijn bestemming — instrument: harness `bureau — tegel-som klopt op de bestemming` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — omzettegel is de som…': tegel € 100.000 = Σ data-realized 100000
- [x] Snelle invoer met Enter maakt één regel en precies één schrijfpoging — instrument: harness `tijd — snelle invoer` (teller schrijfpogingen) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tijd — snelle invoer': 1 regel erbij, 1 schrijfactie
- [x] Na registreren staat de focus op het urenveld — instrument: harness `tijd — snelle invoer` (`activeElement.id`) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tijd — snelle invoer': focus op #tijd-uren
- [x] Na registreren blijven categorie en project staan en is het urenveld leeg — instrument: harness `tijd — snelle invoer` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tijd — snelle invoer': klantwerk + project behouden, uren leeg
- [x] Klantwerk zonder project wordt geweigerd met melding en nul schrijfpogingen — instrument: harness `tijd — klantwerk zonder project` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'tijd — klantwerk zonder project wordt geweigerd': melding, aria-invalid, 0 schrijfacties
- [x] Een Sheet houdt de focus vast bij Tab — instrument: harness `projecten — sheet focus` (40× Tab binnen `[role=dialog]`) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'projecten — sheet: focus blijft binnen…': 40× Tab binnen [role=dialog]; tegenproef faalt zoals bedoeld
- [x] Escape sluit de Sheet en de focus keert terug naar de trigger — instrument: harness `projecten — sheet focus` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde scenario: Escape sluit, focus terug op 'Nieuw project'; kanssheet: 'verkoop — nieuwe kans' focus terug op #kans-nieuw
- [x] Doelen wijzigen zonder Opslaan schrijft niets; Opslaan schrijft één keer — instrument: harness `doelen — som getoond, niet gecorrigeerd` (teller) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'doelen — somregel…' 0 schrijfacties zonder opslaan; 'doelen — startwaarden…' 1 schrijfactie na opslaan
- [x] "Startwaarden invullen" schrijft niets tot Opslaan — instrument: harness `doelen — startwaarden` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'doelen — startwaarden schrijven niets tot opslaan': 0 → 1
- [x] Gewonnen kans omzetten maakt één project en de knop komt niet terug — instrument: harness `verkoop — gewonnen maakt één project` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'verkoop — gewonnen maakt één project': 1 schrijfactie, 1 project met opportunityId, knop 0× ook na heropenen; tegenproef met dubbel project faalt
- [x] Vervallen factuur zonder datum staat in de aparte lijst en in geen enkele weekrij — instrument: harness `cash — vervallen factuur zonder datum staat apart` (uniek bedrag 731,17) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'cash — vervallen factuur zonder datum staat apart…': 731,17 apart, 0× in de weekregels, 1.234,56 één keer in haar week; tegenproef 'cash-gedateerd' faalt
- [x] Jaarkiezer verandert de omzettegel — instrument: harness `bureau — jaarkeuze filtert` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — jaarkeuze filtert…': 2026 € 100.000 → 2027 Onvoldoende gegevens
- [x] Het gekozen jaar blijft staan na navigatie via de subnav — instrument: harness `bureau — jaarkeuze filtert` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde scenario: na Projecten → Overzicht nog 'Overzicht 2027'
- [x] Interactie drag n.v.t. — Bureau heeft geen sleepbare elementen; alle acties zijn klik of toetsenbord — bewijs: `grep -rn 'dnd-kit\|useDraggable' app/bureau components/bureau` = 0
- [x] Bestaande `/`-scenario's blijven groen na de gedeelde header (12 scenario's + 11 tegenproeven) — instrument: `pnpm --filter cashflow flow:selftest` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) — de 12 scenario's en 11 tegenproeven van `/` groen naast de bureau-scenario's

_Toegankelijkheid en layout:_

- [x] Contrast AA op de zeven bureau-routes — instrument: harness `bureau — contrast` (telling gemeten elementen in de uitvoer) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) contrast-scenario's: overzicht 78 · projecten 53 + detail 81 · verkoop 110 · tijd 51 + 124 · klanten 63 · cash 155 · facturen 107 · doelen 107 tekstelementen, 0 fouten
- [x] Contrast AA met ProjectSheet en OpportunitySheet open — instrument: harness `bureau — contrast` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) projectsheet 78, kanssheet 177, nieuwe-kanssheet 138 tekstelementen, 0 fouten
- [x] Contrast AA op alle nieuwe pure componenten statisch — instrument: `pnpm --filter cashflow verify:visual` (nieuwe telling in CLAUDE.md) — bewijs: `NEXT_DIST_DIR=.next-harness pnpm verify:visual` — .screens-preview.html 302 (183 zonder bureau-sectie), .charts-preview.html 141, alles AA
- [x] Kopstructuur h1 → h2 → h3 zonder sprong op elke route — instrument: harness `bureau — kopstructuur en toetsenbord` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) kopstructuur-pass in elk contrast-scenario zonder problemen; tegenproef 'kop overgeslagen' faalt zoals bedoeld
- [x] Zichtbare focus op elke tabstop op elke route — instrument: harness `bureau — kopstructuur en toetsenbord` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) toetsenbord-pass zonder problemen op elke route (bv. overzicht 20, verkoop 21, cash 18 stops); tegenproef 'focus zonder zichtbare ring' faalt
- [x] Geen horizontale overflow op 390 px op elke route — instrument: harness `bureau — mobiel 390` (`scrollWidth ≤ 390`) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — 390 px…' op overzicht, doelen, projecten, detail, tijd, verkoop, cash, klanten: scrollbreedte 390 ≤ 390; tegenproef faalt
- [x] Geen bedrag of status alleen via kleur: negatieve bedragen dragen U+2212 — instrument: grep in `.screens-preview.html` (U+2212-telling, 0× ASCII-min na €) — bewijs: `grep -o '−€' .screens-preview.html` = 8, ASCII `-€` = 0; signaalniveaus als woord (tegenproef 'signaal met alleen een kleur' faalt)

_Design-laag:_

- [x] `Textarea` en `NativeSelect` staan in `packages/ui` met story `Componenten/<Naam>` — instrument: `stories-find-by-component` (Storybook-MCP) — bewijs: `packages/ui/components/ui/{textarea,native-select}.stories.tsx` met titels Componenten/Textarea en Componenten/NativeSelect op main (PR umanex-apps#505 MERGED); Storybook-MCP `stories-find-by-component` gaf [] — de draaiende :6006 heeft een index van 47 entries van vóór de pull, niet herstart (hoofdtree van een andere sessie)
- [x] Beide hebben een Figma-pagina en de sync-guard is groen — instrument: `pnpm --filter @umanex/ui figma:check:selftest` — bewijs: PR umanex-apps#505 CI-job 'Type-check, lint, build' SUCCESS, met stap `pnpm --filter @umanex/ui figma:check:selftest` (ci.yml)
- [x] Hun gerenderde maten staan in de geometrie-basislijn — instrument: `pnpm --filter @umanex/ui geometry` — bewijs: PR umanex-apps#505 CI-job 'Type-check, lint, build' SUCCESS, met stap `pnpm --filter @umanex/ui geometry`
- [x] Figma en browser komen overeen per variant — instrument: `pnpm --filter @umanex/ui parity` — bewijs: PR umanex-apps#505 CI-job 'Type-check, lint, build' SUCCESS, met stap 'Guard — Figma ↔ browser per variant (geometrie-parity)'
- [x] Cashflow importeert ze en houdt geen lokale kopie — instrument: `pnpm ds:guard` — bewijs: `pnpm ds:guard` — 9/9 apps in lijn; NativeSelect in 5, Textarea in 1 bureau-bestand
- [x] Tokenregels: geen rauwe kleur, hex of arbitrary size in de nieuwe bestanden — instrument: `pnpm --filter @umanex/tokens guard` — bewijs: `pnpm --filter @umanex/tokens guard` — 347 bestanden schoon, 0 baseline-uitzonderingen

_Procedureel (eigen instrument, eigen regel):_

- [x] Types — instrument: `pnpm --filter cashflow type-check` — bewijs: `pnpm --filter cashflow type-check` exit 0 na de review-ronde
- [x] Lint — instrument: `pnpm --filter cashflow lint` — bewijs: `pnpm --filter cashflow lint` — No ESLint warnings or errors
- [ ] Build — instrument: CI-stap "Type-check, lint, build"
- [ ] Unit-tests — instrument: `pnpm --filter cashflow test` + CI-stap "invarianten (node:test)"
- [x] Geen `any` in aangeraakte bestanden — instrument: grep `: any|as any|<any>` = 0 — bewijs: `grep -rn ': any\|as any\|<any>' app/bureau components/bureau lib/bureau` = 0
- [ ] Review-screenshots leeg/gedeeltelijk/vol op 1440 en 390 bestaan en zijn elk één keer geopend — instrument: `node scripts/flow-harness.mjs --no-build --screenshots=<map>` (in de scratchpad i.p.v. `.impeccable/review`, zodat er geen `.gitignore`-regel nodig was) + visuele controle — stand: 27 + 27 PNG's gemaakt, 13 zelf geopend (overzicht vol/leeg/deels, verkoop, cash 1440 en 390 twee keer, projectdetail, klanten, tijd), de finish-reviewer las er meer; niet elk één keer geopend
- [x] Impeccable finish-review met disposition `ship` — instrument: `impeccable-finish-reviewer` — bewijs: impeccable-finish-reviewer ronde 1 'fix' (F1–F8), ronde 2 op de verse captures 'ship', niets materieels open
- [ ] Doelwit-controle op Jeroens echte document na de merge (alleen lezen): `/bureau` rendert zonder paginafout — instrument: `:3000` na `pm2:rebuild` op `main`

_Finish-review 2026-09-16 (impeccable-finish-reviewer, disposition fix — F1–F8, één bevinding met twee wijzigingen = twee items):_

- [x] **F1a** Projectdetail: een project zonder mijlpalen toont bij "Omzet in {jaar}" "Onvoldoende gegevens", geen € 0 — instrument: harness `projecten — zonder mijlpalen geen € 0` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'projecten — zonder mijlpalen geen € 0…' detail 'Onvoldoende gegevens geen mijlpalen…'; tegenproef faalt
- [x] **F1b** Projecttabel: gerealiseerd- en resterend-cel van een project zonder mijlpalen tonen "Onvoldoende gegevens", geen € 0 — instrument: harness `projecten — zonder mijlpalen geen € 0` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde scenario: 2 cellen 'Onvoldoende gegevens', geen € 0 in de rij
- [x] **F2** Cash op 390 px: het einde-vrij-bedrag van elke week staat binnen het viewport zonder horizontaal scrollen — instrument: harness `cash — 390: einde vrij per week in beeld` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'cash — 390: einde vrij per week in beeld': 13/13 binnen 390 px; tegenproef faalt (13 onzichtbaar)
- [x] **F3** Signaallijst vanaf `sm`: titel en detail op één regel per signaal — instrument: harness `bureau — signalen op één regel` (rijhoogte per signaal op 1440) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — signalen op één regel op 1440': 5/5 één regel; tegenproef faalt (elk 2 regels)
- [x] **F4a** Cashtabel: rijen met en zonder regelknop zijn even hoog — instrument: harness `cash — rijen even hoog` (set van rijhoogtes heeft één waarde) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'cash — rijen even hoog': 13 rijen van 31 px; tegenproef faalt
- [x] **F4b** Cashtabel: de regelknop heet "N regels", niet "N tonen" — instrument: harness `cash — rijen even hoog` (knoptekst) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde scenario: knoppen ['2 regels','2 regels','1 regel','1 regel']
- [x] **F5** Projectdetail: de toevoeg-rijen van mijlpalen, uitbreidingen en externe kosten gebruiken `outline`; hoogstens één primaire knop per sectie — instrument: harness `projecten — hoogstens één primaire knop per sectie` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'projecten — hoogstens één primaire knop per sectie': 5 secties, 1 primaire knop; tegenproef faalt
- [x] **F6a** Projectdetail-kop: uitvoeringsperiode en contractdatum in Nederlandse notatie, geen `yyyy-MM` — instrument: harness `projecten — datums in Nederlandse notatie` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'projecten — datums in Nederlandse notatie': kop 'uitvoering sep 2026 · getekend 1 september 2026'; tegenproef faalt
- [x] **F6b** Projecttabel: uitvoeringsperiode in Nederlandse notatie, één maand als start en einde gelijk zijn — instrument: `lib/bureau/format.test.ts` (`monthRangeLabel`) + harness `projecten — datums in Nederlandse notatie` — bewijs: `format.test.ts` 'maandlabels…' groen ('sep – dec 2026', 'nov 2026 – feb 2027'); harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 0 ISO-datums in de tabelrijen
- [x] **F7** Geen spatie vóór "/dag" in bedragen per dag — instrument: `grep -rn ' /dag' app/bureau components/bureau` = 0 — bewijs: `grep -rn ' /dag' app/bureau components/bureau` = 0
- [x] **F8a** Header op 390 px: "Uitloggen" staat niet alleen op een eigen rij — instrument: harness `bureau — 390: header en subnav` (top van Uitloggen = top van de navigatie) — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) 'bureau — 390: header en subnav': Uitloggen en navigatie op y=80
- [x] **F8b** Bureau-subnav op 390 px: alle zeven onderdelen staan binnen het viewport — instrument: harness `bureau — 390: header en subnav` — bewijs: harness 2026-09-16 (`flow:selftest` 103/103, twee runs) zelfde scenario: 7/7 subnav-items binnen 390 px; tegenproef faalt (Klanten, Cash, Doelen buiten beeld)

## Beslissingsgeschiedenis

- 2026-09-16: Opslag in het bestaande document onder `bureau` (v16) i.p.v. eigen tabellen — keuze
  Jeroen; sync, RLS, conflictdetectie en harness dekken het zonder SQL-stap.
- 2026-09-16: Factuur maakt/koppelt een inkomstenpost, en "betaald" verwijdert die post i.p.v. hem
  als ontvangen te markeren — Jeroen verwijdert of verplaatst ontvangen posten vandaag al; de
  rekenkern leest `received` niet, dus markeren zou de maandprognose de inkomst dubbel laten tellen
  naast een bijgewerkt beginsaldo.
- 2026-09-16: Design-laag uitgebreid met `Textarea` en `NativeSelect` in `packages/ui` (Jeroen: "ontbrekende
  elementen mogen vanuit shadcn naar umanex/ui"); Radix `Select` en shadcn `Table` bewust niet —
  nieuwe dependency resp. een dichtheid die het open BACKLOG-item "compacte maat" pas oplost.
- 2026-09-16: Bouw in een tijdelijke worktree `.claude/worktrees/bureau` — keuze Jeroen; de hoofdtree
  werd gelijktijdig door een andere sessie gebruikt.
- 2026-09-16: Capaciteit in dagen per maand = project met één mijlpaal per maand (keuze Jeroen, geen
  apart contractmodel); het projectdetail krijgt daarvoor "Maandmijlpalen aanmaken". Het aanbodtype
  heet "Productdiagnose (scan)". PRODUCT.md volgt de positionering uit de brief ("design team of
  one"), met de afwijking van het umanex-profiel expliciet genoteerd.
- 2026-09-16: I3 (bank = vrij + gereserveerd per maandeinde in de weekplanning) afgeschreven.
  De rekenkern dateert potbewegingen niet binnen een maand; een potstand per week of maandeinde
  zou dus een verdeling zijn die niemand gemeten heeft. De weektabel toont vrije cash per week, de
  positie bank · potten · vrij alleen bij de start, en de reconciliatie per maand bewaakt de rest.
- 2026-09-16: De kans-sheet hangt aan de pagina in plaats van aan de rij — de eerste harness-run
  toonde dat een stadiumwissel de rij naar een andere groep verplaatst en de sheet dan sloot.
- 2026-09-16: Finish-review ronde 1 gaf acht bevindingen (F1–F8), eerst als acceptatie-items
  vastgelegd en daarna gefixt; ronde 2 gaf `ship`. De bureau-subnav loopt op smalle schermen over
  twee regels in plaats van horizontaal te scrollen.
