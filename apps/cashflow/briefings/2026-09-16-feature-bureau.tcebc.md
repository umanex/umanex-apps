# Bureau — umanex sturen vanuit de cashflow-app

- **Datum:** 2026-09-16
- **Type:** feature
- **Project:** cashflow
- **Klant:** umanex
- **Status:** gepland

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

- [ ] **I1** — gerealiseerd en resterend getekend zijn disjunct: per jaar is hun som gelijk aan Σ mijlpalen met dat jaar als attributie — instrument: `lib/bureau/revenue.test.ts`
- [ ] **I2** — de 13 weken tellen per maand exact terug op tot de maandbeweging van de engine (|delta| < 0,005) — instrument: `verifyReconciliation` in `lib/bureau/weekly-cash.test.ts`
- [ ] **I2-tegenproef** — een mutatie van 0,01 in één weekcel maakt `verifyReconciliation` rood — instrument: mutant-test in `weekly-cash.test.ts`
- [ ] **I3** — bank = vrij + gereserveerd aan elk maandeinde van de horizon — instrument: `weekly-cash.test.ts`
- [ ] **I4** — besteed en gepland overlappen niet: registraties ≤ vandaag, planning in periodes die nog niet voorbij zijn — instrument: `lib/bureau/capacity.test.ts`
- [ ] **I5** — de bestaande rekenkern is ongewijzigd: digest-hash over 300 seeds gelijk aan de hash van vóór fase 0 — instrument: `scripts/calc-regression.ts` in `pnpm --filter cashflow scenarios`
- [ ] **I5-tegenproef** — `SCENARIO_SELFTEST=1` verschuift één bedrag 0,01 en de regressiesuite faalt — instrument: `scenarios.mjs`
- [ ] **I6** — een document zonder sleutel `bureau` (v15) laadt en round-tript alle 15 bestaande sleutels onveranderd — instrument: `lib/cashflow/normalize.test.ts`
- [ ] **I7** — `selectCashflowData` en `emptyData()` dragen allebei `bureau` (anders wordt niets opgeslagen) — instrument: `normalize.test.ts` (16 sleutels) + harness-teller schrijfpogingen na een bureau-edit

_Financiële semantiek (brief §12):_

- [ ] Voorschot-factuur telt als gefactureerd en openstaand, niet als omzet — instrument: `revenue.test.ts`
- [ ] Betaling verandert ontvangen en openstaand, niet de omzet — instrument: `revenue.test.ts`
- [ ] Project over twee boekjaren: een mijlpaal gepland in december en gerealiseerd in januari telt één keer, in het realisatiejaar — instrument: `revenue.test.ts`
- [ ] Gedeeltelijk gerealiseerde opdracht (4k van 12k) splitst in 4k gerealiseerd en 8k resterend — instrument: `revenue.test.ts`
- [ ] Maandmijlpalen aanmaken voor een capaciteitsproject maakt precies één mijlpaal per maand van de geplande periode, met som gelijk aan de goedgekeurde prijs — instrument: `mutations.test.ts` (`addMonthlyMilestones`)
- [ ] Goedgekeurde uitbreiding verhoogt resterend getekend en de goedgekeurde prijs met hetzelfde bedrag — instrument: `revenue.test.ts`
- [ ] Een voorstel van € 20.000 komt in geen enkele getekende, gerealiseerde of cash-som voor — instrument: `revenue.test.ts`
- [ ] Omzet boven doel toont "boven doel" en nog-te-verkopen 0, nooit een negatief bedrag — instrument: `revenue.test.ts`
- [ ] Omzetgat bij nul vrije klantdagen geeft `geen-capaciteit`, geen NaN of Infinity — instrument: `revenue.test.ts`
- [ ] Nul uren én geen urenraming geven A en B "onvoldoende gegevens" — instrument: `lib/bureau/profitability.test.ts`
- [ ] Afgerond project rekent met werkelijke uren en kosten; een ontbrekende werkelijke kost maakt alleen B onvoldoende — instrument: `profitability.test.ts`
- [ ] Externe kosten verlagen B en niet A, en tellen nooit als eigen capaciteit — instrument: `profitability.test.ts` + `capacity.test.ts`
- [ ] Een gewijzigde uur-per-daginstelling verandert de dagen van eerdere registraties niet — instrument: `profitability.test.ts`
- [ ] Overschrijding binnen de buffer is geen overbelasting; daarboven wel, met het verschil als getal — instrument: `capacity.test.ts`
- [ ] Gewonnen kans tweemaal omzetten geeft de tweede keer `al-omgezet` en geen tweede project — instrument: `lib/bureau/mutations.test.ts`
- [ ] Conversiecijfers dragen periode en noemer; bij noemer 0 is de ratio `null` — instrument: `pipeline.test.ts`
- [ ] Achterstallige factuur zonder verwachte betaaldatum staat in `unplaced`, in geen enkele week — instrument: `weekly-cash.test.ts`
- [ ] Factuur mét gekoppelde inkomstenpost geeft één ontvangstregel, niet twee — instrument: `weekly-cash.test.ts`
- [ ] Reserveringen worden in de ankermaand niet tweemaal afgetrokken: openingsvrij = banksaldo − potstand bij start — instrument: `weekly-cash.test.ts`
- [ ] Klantconcentratie telt meerdere projecten van één klant samen en noemt de noemer per basis (gerealiseerd · prognose) — instrument: `lib/bureau/concentration.test.ts`
- [ ] De cashbehoefte-aanname komt in geen enkele weekregel voor — instrument: `weekly-cash.test.ts`
- [ ] Dagbudgetten en kwartaaldoelen die niet optellen tonen het verschil, zonder de ingestelde waarden aan te passen — instrument: `lib/bureau/goals.test.ts`

_Store-overgangen:_

- [ ] "Betaald" verwijdert de gekoppelde inkomstenpost in een open maand — instrument: `lib/bureau/mutations.test.ts`
- [ ] "Betaald" laat de post staan in een afgesloten maand en meldt dat — instrument: `mutations.test.ts`
- [ ] "Betaald ongedaan maken" zet de post terug in de maand van de verwachte betaaldatum — instrument: `mutations.test.ts`
- [ ] Een inkomstenpost verwijderen op `/` ontkoppelt de factuur (`incomeItemId` null) — instrument: `mutations.test.ts`

_States (per pagina aanwezig tenzij afgeschreven):_

- [ ] Leeg: elke tegel toont "Onvoldoende gegevens" en nergens "€ 0" — instrument: harness `bureau — leeg: onvoldoende gegevens, nooit nul`
- [ ] Leeg-tegenproef: een geïnjecteerde "€ 0" in een tegel laat dat scenario falen — instrument: harness selftest
- [ ] Legacy-document zonder `bureau` rendert zes tegels zonder paginafout — instrument: harness `bureau — document zonder bureau-sleutel`
- [ ] Elke bureau-pagina heeft een lege staat met één actie — instrument: harness-scenario per route op `gedrag.bureau: 'leeg'` (telling `[data-empty-state]` = 1)
- [ ] Laden: de `DataGate`-skeleton met `aria-busy` verschijnt ook op `/bureau` — instrument: harness `state — laden` met `pad: '/bureau'`
- [ ] Fout: het foutscherm met "Opnieuw proberen" verschijnt ook op `/bureau` — instrument: harness `state — fout` met `pad: '/bureau'`
- [ ] Conflict: na een revisieconflict is "Registreren" uitgeschakeld met hint — instrument: harness `conflict — bureau blokkeert opslaan`
- [ ] Gedeeltelijk: een project zonder urenraming toont "Onvoldoende gegevens" in zijn A/B-cellen — instrument: harness `projecten — zonder urenraming geen rendement`

_Gedrag en interactie:_

- [ ] Elke tegel heeft een niet-lege noemer, een bron en precies één link naar `/bureau/…` — instrument: harness `bureau — vol: noemer, bron en link per tegel`
- [ ] Tegel "Omzet" is gelijk aan de som van de gerealiseerde mijlpalen op zijn bestemming — instrument: harness `bureau — tegel-som klopt op de bestemming`
- [ ] Snelle invoer met Enter maakt één regel en precies één schrijfpoging — instrument: harness `tijd — snelle invoer` (teller schrijfpogingen)
- [ ] Na registreren staat de focus op het urenveld — instrument: harness `tijd — snelle invoer` (`activeElement.id`)
- [ ] Na registreren blijven categorie en project staan en is het urenveld leeg — instrument: harness `tijd — snelle invoer`
- [ ] Klantwerk zonder project wordt geweigerd met melding en nul schrijfpogingen — instrument: harness `tijd — klantwerk zonder project`
- [ ] Een Sheet houdt de focus vast bij Tab — instrument: harness `projecten — sheet focus` (40× Tab binnen `[role=dialog]`)
- [ ] Escape sluit de Sheet en de focus keert terug naar de trigger — instrument: harness `projecten — sheet focus`
- [ ] Doelen wijzigen zonder Opslaan schrijft niets; Opslaan schrijft één keer — instrument: harness `doelen — som getoond, niet gecorrigeerd` (teller)
- [ ] "Startwaarden invullen" schrijft niets tot Opslaan — instrument: harness `doelen — startwaarden`
- [ ] Gewonnen kans omzetten maakt één project en de knop komt niet terug — instrument: harness `verkoop — gewonnen maakt één project`
- [ ] Vervallen factuur zonder datum staat in de aparte lijst en in geen enkele weekrij — instrument: harness `cash — vervallen factuur zonder datum staat apart` (uniek bedrag 731,17)
- [ ] Jaarkiezer verandert de omzettegel — instrument: harness `bureau — jaarkeuze filtert`
- [ ] Het gekozen jaar blijft staan na navigatie via de subnav — instrument: harness `bureau — jaarkeuze filtert`
- [ ] Interactie drag n.v.t. — Bureau heeft geen sleepbare elementen; alle acties zijn klik of toetsenbord
- [ ] Bestaande `/`-scenario's blijven groen na de gedeelde header (12 scenario's + 11 tegenproeven) — instrument: `pnpm --filter cashflow flow:selftest`

_Toegankelijkheid en layout:_

- [ ] Contrast AA op de zeven bureau-routes — instrument: harness `bureau — contrast` (telling gemeten elementen in de uitvoer)
- [ ] Contrast AA met ProjectSheet en OpportunitySheet open — instrument: harness `bureau — contrast`
- [ ] Contrast AA op alle nieuwe pure componenten statisch — instrument: `pnpm --filter cashflow verify:visual` (nieuwe telling in CLAUDE.md)
- [ ] Kopstructuur h1 → h2 → h3 zonder sprong op elke route — instrument: harness `bureau — kopstructuur en toetsenbord`
- [ ] Zichtbare focus op elke tabstop op elke route — instrument: harness `bureau — kopstructuur en toetsenbord`
- [ ] Geen horizontale overflow op 390 px op elke route — instrument: harness `bureau — mobiel 390` (`scrollWidth ≤ 390`)
- [ ] Geen bedrag of status alleen via kleur: negatieve bedragen dragen U+2212 — instrument: grep in `.screens-preview.html` (U+2212-telling, 0× ASCII-min na €)

_Design-laag:_

- [ ] `Textarea` en `NativeSelect` staan in `packages/ui` met story `Componenten/<Naam>` — instrument: `stories-find-by-component` (Storybook-MCP)
- [ ] Beide hebben een Figma-pagina en de sync-guard is groen — instrument: `pnpm --filter @umanex/ui figma:check:selftest`
- [ ] Hun gerenderde maten staan in de geometrie-basislijn — instrument: `pnpm --filter @umanex/ui geometry`
- [ ] Figma en browser komen overeen per variant — instrument: `pnpm --filter @umanex/ui parity`
- [ ] Cashflow importeert ze en houdt geen lokale kopie — instrument: `pnpm ds:guard`
- [ ] Tokenregels: geen rauwe kleur, hex of arbitrary size in de nieuwe bestanden — instrument: `pnpm --filter @umanex/tokens guard`

_Procedureel (eigen instrument, eigen regel):_

- [ ] Types — instrument: `pnpm --filter cashflow type-check`
- [ ] Lint — instrument: `pnpm --filter cashflow lint`
- [ ] Build — instrument: CI-stap "Type-check, lint, build"
- [ ] Unit-tests — instrument: `pnpm --filter cashflow test` + CI-stap "invarianten (node:test)"
- [ ] Geen `any` in aangeraakte bestanden — instrument: grep `: any|as any|<any>` = 0
- [ ] Review-screenshots leeg/gedeeltelijk/vol op 1440 en 390 bestaan en zijn elk één keer geopend — instrument: `ls apps/cashflow/.impeccable/review | wc -l` + visuele controle
- [ ] Impeccable finish-review met disposition `ship` — instrument: `impeccable-finish-reviewer`
- [ ] Doelwit-controle op Jeroens echte document na de merge (alleen lezen): `/bureau` rendert zonder paginafout — instrument: `:3000` na `pm2:rebuild` op `main`

_Finish-review 2026-09-16 (impeccable-finish-reviewer, disposition fix — F1–F8, één bevinding met twee wijzigingen = twee items):_

- [ ] **F1a** Projectdetail: een project zonder mijlpalen toont bij "Omzet in {jaar}" "Onvoldoende gegevens", geen € 0 — instrument: harness `projecten — zonder mijlpalen geen € 0`
- [ ] **F1b** Projecttabel: gerealiseerd- en resterend-cel van een project zonder mijlpalen tonen "Onvoldoende gegevens", geen € 0 — instrument: harness `projecten — zonder mijlpalen geen € 0`
- [ ] **F2** Cash op 390 px: het einde-vrij-bedrag van elke week staat binnen het viewport zonder horizontaal scrollen — instrument: harness `cash — 390: einde vrij per week in beeld`
- [ ] **F3** Signaallijst vanaf `sm`: titel en detail op één regel per signaal — instrument: harness `bureau — signalen op één regel` (rijhoogte per signaal op 1440)
- [ ] **F4a** Cashtabel: rijen met en zonder regelknop zijn even hoog — instrument: harness `cash — rijen even hoog` (set van rijhoogtes heeft één waarde)
- [ ] **F4b** Cashtabel: de regelknop heet "N regels", niet "N tonen" — instrument: harness `cash — rijen even hoog` (knoptekst)
- [ ] **F5** Projectdetail: de toevoeg-rijen van mijlpalen, uitbreidingen en externe kosten gebruiken `outline`; hoogstens één primaire knop per sectie — instrument: harness `projecten — hoogstens één primaire knop per sectie`
- [ ] **F6a** Projectdetail-kop: uitvoeringsperiode en contractdatum in Nederlandse notatie, geen `yyyy-MM` — instrument: harness `projecten — datums in Nederlandse notatie`
- [ ] **F6b** Projecttabel: uitvoeringsperiode in Nederlandse notatie, één maand als start en einde gelijk zijn — instrument: `lib/bureau/format.test.ts` (`monthRangeLabel`) + harness `projecten — datums in Nederlandse notatie`
- [ ] **F7** Geen spatie vóór "/dag" in bedragen per dag — instrument: `grep -rn ' /dag' app/bureau components/bureau` = 0
- [ ] **F8a** Header op 390 px: "Uitloggen" staat niet alleen op een eigen rij — instrument: harness `bureau — 390: header en subnav` (top van Uitloggen = top van de navigatie)
- [ ] **F8b** Bureau-subnav op 390 px: alle zeven onderdelen staan binnen het viewport — instrument: harness `bureau — 390: header en subnav`

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
