# BACKLOG.md — jobradar

Kleine, afgebakende items die geen eigen briefing verdienen maar wel ergens moeten staan.
Een P3 die alleen in een auditrapport staat, verdwijnt met dat rapport.

Format: `- [ ] {type}: {wat} — {waarom} ({bron})`

## Open

- [ ] `ui`: **Het dashboard loopt over op 400 px, en de oorzaak is één ontbrekende klasse.**
      Gemeten 2026-09-16 met `flow --shot --smal=400` op de echte database: `scrollWidth` 756 tegen
      400 beschikbaar. De bron is de vacaturetitel in `JobCard.tsx` — `h3.truncate` als flex-item
      zonder `min-w-0`, dus `min-width: auto` houdt hem op zijn volle tekstbreedte en `truncate`
      treedt nooit in werking. Dezelfde klasse is op 2026-09-16 in `components/plan/Startvoorwaarden.tsx`
      opgelost. **Waarom niet nu:** mobiel is een vastgelegd niet-doelwit voor jobradar (zie Verworpen
      hieronder), dus dit is een aanvaarde toestand en geen regressie; de harness meldt hem nu als
      notitie in plaats van als fout, zodat rood rood blijft betekenen. **Eerste zet:** `min-w-0` op
      de `h3` in `JobCard.tsx`, en `/` toevoegen aan `SMAL_ROUTES` in de harness zodat het gemeten
      blijft. (harness-meting 2026-09-16)
      **Kanttekening 2026-09-17 (critique, hypothese — niet getoetst):** die eerste zet raakt
      vermoedelijk de verkeerde laag. `truncate` zet al `overflow: hidden`, en dan is de automatische
      minimumbreedte van een flex-item al 0. Waarschijnlijker is de grid eromheen: `grid gap-3
      sm:grid-cols-2 xl:grid-cols-3` (`DashboardClient.tsx:339/363/521`) heeft onder `sm` geen
      `grid-cols-1`, dus één impliciete `auto`-kolom die meegroeit met de langste titel. **Toets:**
      `min-w-0` alléén op de `h3` → `--smal=400` meet nog altijd > 400; `grid-cols-1` (of `min-w-0` op
      de `Card`) → 400. Eén variabele per run.

- [ ] `fix`: **Een verwijderde actie blijft als dode key in een beslismoment staan.**
      `verwijderActie` ruimt kanten en koppelingen op, maar niet de JSON-lijst in
      `plan_decisions.acties`. `beslismomentStatus` telt die key dan als "niet gereed", dus het
      beslismoment blijft permanent op *Wacht op acties* staan zonder dat iets aanwijst waarom.
      Alleen eigen acties zijn verwijderbaar, dus het raakt B01–B03 pas zodra Jeroen er een eigen
      actie aan koppelt. (finish-review 2026-09-16, P2)
- [ ] `fix`: **Een hergebruikte key erft de geschiedenis van de verwijderde actie.**
      `verwijderActie` laat `plan_history` bewust staan — het spoor mag niet verdwijnen met het
      ding — maar `volgendeVrijeKey` kan diezelfde key opnieuw uitdelen zodra de hoogste eronder
      ligt, en dan hangt de oude geschiedenis onder een nieuwe actie. Sinds de `E`-reeks bestaat is
      dit alleen nog mogelijk binnen die reeks. Kleinste fix: de geschiedenis markeren als van een
      verwijderde actie, of de teller nooit laten dalen. (finish-review 2026-09-16, P2)
- [ ] `fix`: **Een startuitzondering is permanent en nergens in te trekken.** `start_uitzondering`
      blijft staan zodra hij gezet is, en `uitvoerbaarheidVan` gebruikt hem voor élke latere zachte
      blokkade — ook eentje die niets met de oorspronkelijke reden te maken heeft. Een uitzondering
      die je nam voor A01, machtigt dus stilzwijgend het starten ondanks A09. Er is ook geen knop om
      hem in te trekken. Overweging: hem wissen zodra de blokkade waarvoor hij gold verdwijnt, of
      de key waarvoor hij geldt erin opslaan. (finish-review 2026-09-16, P2 + P3)
- [ ] `fix`: **De harde blokkade geldt alleen bij starten, niet bij afronden.** Een actie die al
      `bezig` is en waarvan een afhankelijkheid daarna op `vervallen` gaat, kan gewoon op `gereed`
      gezet worden — `blokkadeVan` wordt alleen geraadpleegd op het pad naar `bezig`. De rij toont
      het signaal wel. (finish-review 2026-09-16, P2)
- [ ] `fix`: **De client herkent een versieconflict aan een regex op de Nederlandse foutzin.**
      `ActiePanel` en `BeslissingPanel` doen `/intussen elders gewijzigd/.test(fout)` om de
      Herlaad-knop te tonen, terwijl het antwoord al `conflict: 'versie'` draagt. Eén herformulering
      van die melding en de knop verdwijnt stil. (finish-review 2026-09-16, P2)
- [ ] `fix`: **Status-parameters die niet bij de doelstatus horen worden stil weggegooid, mét 200.**
      Een PATCH met `status: 'bezig'` én `wachtreden` levert 200 terwijl de wachtreden nergens
      landt — `wijzigStatus` leest hem alleen op de uitgesteld/wacht-takken. Weiger het verzoek of
      benoem wat er niet is toegepast. (finish-review 2026-09-16, P3)
- [ ] `fix`: **"Elke PATCH draagt de versie" geldt niet voor de ideeën-route.** `/api/plan/ideeen/[id]`
      vraagt geen `versie`, anders dan de acties- en beslissingen-routes. Voor een idee is de inzet
      klein, maar de belofte in de briefing is algemeen. (finish-review 2026-09-16, P3)
- [ ] `refactor`: **De startvoorwaarden staan in code, het startbesluit draagt zijn lijst in de
      database.** `HARDE_STARTVOORWAARDEN` in `seed-inhoud.ts` en `plan_decisions.acties` van `START`
      beginnen gelijk, maar de tweede is bewerkbaar en de eerste niet. Wijzig je de een, dan meet de
      voetnoot iets anders dan de lijst erboven. (finish-review 2026-09-16, P2)
- [ ] `ui`: **De koppeling op een bedrijfskaart draagt geen status en vergaat nooit.** `PlanBadge`
      toont elke gekoppelde actie, ook een afgeronde of vervallen. Na een jaar draagt een kaart
      merktekens van werk dat allang klaar is. (finish-review 2026-09-16, P2)
- [ ] `ui`: **Streefdatum en herbekijkdatum zijn invoerbaar maar nergens zichtbaar buiten het
      paneel.** `ActieRij` toont ze niet, dus een streefdatum die je invult verdwijnt uit beeld —
      en het acceptatie-item "zonder streefdatum staat er geen datum in een rij" is daarmee
      tautologisch waar. Of tonen, of het veld weghalen. (finish-review 2026-09-16, P2)
- [ ] `ui`: **`Overzicht.signalen` en `resterend` worden berekend, meegestuurd en nergens getoond.**
      Het overzicht krijgt een vlakke lijst signalen die alleen per rij gerenderd wordt, en de
      resterende inzet staat alleen in het paneel. Of gebruiken, of niet berekenen. (finish-review
      2026-09-16, P3)
- [ ] `test`: **De geschiedenis van een beslismoment wordt geschreven en nooit gelezen.**
      `legBeslissingVast` logt naar `plan_history` met `onderwerp_type: 'beslissing'`, maar
      `leesActieDetail` filtert op `'actie'` en er is geen leespad voor de andere. (finish-review
      2026-09-16, P3)
- [ ] `perf`: **Groei bijt eerst in het scherm, niet in de database.** Elk detailverzoek draait
      `leidAf` over het hele plan, en `/plan` rendert alle acties in elke groep zonder paginering.
      Bij 22 acties onmerkbaar; bij 200 acties en duizenden geschiedenisregels niet meer.
      (finish-review 2026-09-16, P3)
- [ ] `feature`: **Eén eigenaar zit in de regels, niet alleen in de data.** `eigenaar` is vrije tekst
      met default "Jeroen", maar de focusregel telt over het hele plan en niet per eigenaar. Zodra
      er een tweede naam in staat, telt die mee voor Jeroens limiet van drie. (finish-review
      2026-09-16, P3)

- [ ] `feature`: **Bewijs met een bestand in plaats van alleen tekst en een link.** Het
      bedrijfsplan bewaart bij het afronden een tekst en optioneel een URL. De opdracht van
      2026-09-16 noemde bestandsupload expliciet niet verplicht "als dat nog niet bestaat", en
      het bestaat niet: deze app heeft geen auth en geen uploadroute, en die twee horen bij
      elkaar (zie de kop van `scripts/prospects-import.mjs`). Pas relevant wanneer bewijs
      vaker een document dan een verwijzing is. (bedrijfsplan 2026-09-16)
- [ ] `feature`: **Een herinnering wanneer een herbekijkdatum verstrijkt.** Een uitgestelde
      actie met een verstreken `herbekijk_op` krijgt nu een badge in de lijst, en verder
      niets. Er is geen serverproces en geen mailkanaal in deze app, en de opdracht verbood
      achtergrondautomatisering zonder concrete noodzaak. Zichtbaar-bij-openen is bewust het
      niveau; als dat te laat blijkt, is dít het item. (bedrijfsplan 2026-09-16)
- [ ] `ui`: **Een volgende-actie-badge op de leadkaart.** `ProspectCard` toont
      `NextActionBadge`, `LeadCard` niet — de `Company`-rijen dragen geen `actieDatum`, want
      die komt uit een aparte query die alleen voor prospects draait. Sinds leads een
      Opvolging-knop hebben, is het verschil zichtbaar geworden. Vraagt een join op
      `next_actions` in `app/page.tsx`. (bedrijfsplan 2026-09-16)
- [ ] `ui`: **De naam van een gekoppelde prospect die alleen in de KBO-spiegel bestaat.**
      `leesKoppelingenPerBedrijf` zoekt namen op in `companies` en `csv_prospects`; een
      prospect die enkel uit de spiegel komt, toont zijn ondernemingsnummer. Bewust: de
      spiegel is een apart databasebestand dat kan ontbreken, en een naam uit een cache die
      er morgen niet meer is, is erger dan een zichtbaar nummer. Oplosbaar door de opzoeking
      in `app/plan/page.tsx` te laten lopen, waar `koppelBedrijven` al gebruikt wordt.
      (bedrijfsplan 2026-09-16)
- [ ] `feature`: **Een bord- of tijdlijnweergave voor het plan.** De opdracht liet dit toe
      "als die duidelijk helpt en bij de bestaande app past". Op 22 acties met vier
      prioriteitsgroepen helpt een lijst met filters meer dan een bord, en jobradar heeft
      nergens drag-and-drop. Pas overwegen wanneer het plan structureel groter wordt.
      (bedrijfsplan 2026-09-16)

- [ ] `ui`: **Segmented control naar `packages/ui`.** `components/HerkomstFilter.tsx` is een
      lokale primitive in app-code, tegen de regel in `CLAUDE.md` → Design-systeem-bron. De
      reden is gemeten en klopt — `packages/ui/scripts/figma-sync-check.mjs:136` faalt op een
      nieuwe story zonder Figma-pagina — maar daarmee is het uitgesteld werk, geen
      oplossing. Verplaatsen vraagt: component + story in `packages/ui`, een Figma-pagina in
      het manifest, en de import in jobradar omzetten. De klassenreeks is nu overgetikt uit
      `TabsList`/`TabsTrigger`, dus hij drift bij elke wijziging daar. (code-review PR #408, P3)
- [ ] `fix`: **Een geleverd bedrijf dat stopgezet is of geen zeteladres heeft, verdwijnt
      stil.** `bouwProspectSql` eist `Status='AC'` plus een `REGO`-adres, en
      `bouwZonderKboSql` telt alleen wat hélemaal niet in `enterprise` staat. Een rij die de
      spiegel wél kent maar op die twee afvalt, staat dus in geen enkele lijst en in geen
      enkele telling — precies de faalklasse die de melding boven de lijst moet afdekken. De
      huidige export bevat dit geval niet (215/215 actief, allemaal met zeteladres), een
      volgende kan het wel. (code-review PR #408, P3)
- [ ] `fix`: **`JOBRADAR_DB_PATH` wordt op twee manieren afgeleid.**
      `scripts/prospects-import.mjs` doet `resolve(APP, env || '.data/jobradar.db')`,
      `lib/db/index.ts:14` en `lib/kbo/spiegel.ts` doen `env ?? join(process.cwd(), …)`. Bij
      een lege waarde (`JOBRADAR_DB_PATH=` in een `.env`) schrijft het script naar de echte
      database terwijl de app een wegwerp-database in het geheugen opent. Eén helper voor
      beide. (code-review PR #408, P3)
- [ ] `fix`: **`ORDENING[filter.sortering]` vangt prototype-sleutels niet af.**
      `sortering: 'constructor'` levert `ORDER BY function Object() { [native code] }`. Niet
      bereikbaar vanaf HTTP (de route whitelist), maar de scenario-check claimt breder dan
      hij meet — hij toetst één sample. `Object.hasOwn` plus een check per prototype-sleutel.
      (code-review PR #408, P3)
- [ ] `ui`: **`border border-border` op `bg-muted` levert in dark mode geen rand** —
      `--border` en `--muted` zijn daar dezelfde HSL-triplet, contrast 1,000:1. Bestaand
      patroon op vier plekken in `DashboardClient.tsx`. Raakt de rollaag, dus het is een
      tokenvraag en geen app-fix. (code-review PR #408, P3)

- [ ] `infra`: De KBO-spiegel is **3,6 GB** (`.data/kbo.db`, extract 466) en de schijf stond
      bij het aanmaken op 99% vol (15 GiB vrij). `activity` is met 34.498.093 rijen veruit de
      grootste tabel, en daarvan zijn er 17.384.045 van NACE-versie 2003 (2.233.543) en 2008
      (15.150.502) — versies die de universum-query niet gebruikt. Snoeien halveert die tabel
      ruwweg. **Geen automatische winst:** de 2008→2025-hercodering is niet één-op-één, dus wie
      2008 weggooit kan een oudere referentie niet meer terugvertalen. Beslissing nodig, geen
      opruimactie. Exacte winst vraagt een `VACUUM` om te meten.
      (gemeten bij de eerste bootstrap, 2026-08-29)
- [ ] `refactor`: De **bron-richting** van `upsertLead` heeft geen productie-aanroeper meer.
      Met de externe leadbron weg passeert elke aanroep `{ afgeleid: true }`; de andere tak
      (`mergeBronSignalen` in `lib/signals.ts`) is daarmee onbereikbaar in productie. Niet
      meeverwijderd omdat `scripts/upsert-scenarios.ts` die richting als primitief gebruikt om
      leads met exacte signalen klaar te zetten — negen aanroepen, ook in scenario's die over
      dedupe en opruimen gaan. Weghalen betekent die suite herschrijven, en dat is een eigen
      taak met eigen risico, geen bijproduct van een opruiming.
      (gemeten bij het verwijderen van de KBO-leadbron, 2026-08-29)

- [ ] `ux`: **Sneltoetsen voor triage op het dashboard** (j/k om te bewegen, s bewaren, d afwijzen).
      Er is nu geen enkele sneltoets en elke kaart kost twee tab-stops of meer. **Waarom niet nu:**
      pas zinvol als de statusactie een knop is in plaats van een select (plan
      `delightful-stirring-blossom`, fase 2), en de hint hoort in `Kbd` uit bibliotheekbatch 1.
      (critique 2026-09-17, persona Alex)
- [ ] `fix`: **Een tweetalige vacature verschijnt als twee kaarten.** Belfius staat in de NL- en de
      FR-versie als twee losse vacatures, met twee statussen die uit elkaar lopen. Dit is dedupe in de
      sync (`dedupe_hash`), geen UI-kwestie, dus buiten het UX/UI-plan. Eerste zet: tellen hoeveel paren
      `(bedrijf, regio, datum)` met een verschillende titel er in `.data/jobradar.db` staan, vóór je
      een regel bouwt. (critique 2026-09-17)
- [ ] `ux`: **"Laatst geëxporteerd" bij de plan-export.** De markdown-export is nu de enige back-up
      van het bedrijfsplan (HANDOFF 2026-09-16), maar staat er als grijs tekstlinkje zonder datum.
      **Waarom niet nu:** hangt aan de open back-upbeslissing in `HANDOFF.md`; een datum tonen van een
      export die nergens bewaard wordt, suggereert een vangnet dat er niet is. (critique 2026-09-17)
- [ ] `ux`: **Een geparkeerde actie met startuitzondering leest tegenstrijdig.** Parkeren laat
      `start_uitzondering` staan (`mutaties.ts`, parkeertak), dus de rij staat onder Beschikbaar met
      tegelijk een chip "wacht op …", een badge "gestart met een uitzondering" en een knop Start.
      Technisch juist, maar drie signalen die elkaar lijken tegen te spreken. Hangt samen met het
      open item "een startuitzondering is permanent". Geen instrument zet deze toestand. (design-review
      fase 1, 2026-09-17, P3)
- [ ] `a11y`: **Na Start in het blok "nu beschikbaar" valt de focus op de container van de sheet.** De
      knop wordt vervangen door een statuslabel. Kleinste fix: de focus naar dat label of naar de
      volgende Start-knop in het blok. (design-review fase 1, 2026-09-17, P3)
- [ ] `a11y`: **Twee knoppen heten "Start A01" wanneer niets loopt** — één op de Eerstvolgende-kaart,
      één op de rij. Ze doen hetzelfde, maar een lijst van knoppen in een schermlezer toont ze dubbel.
      (design-review fase 1, 2026-09-17, P3)
- [ ] `fix`: **Markeer gereed is kort opnieuw klikbaar tussen het PATCH-antwoord en het verse detail.**
      Een tweede klik levert een 400 "staat al op gereed" in het paneel. Kleinste fix: de knop verbergen
      zodra het antwoord `gereed` is, niet pas wanneer het detail binnen is. (design-review fase 1,
      2026-09-17, P3)
- [ ] `fix`: **`haalDetail` verwerkt antwoorden in aankomstvolgorde, niet in verzoekvolgorde.** Twee
      snelle wissels kunnen een ouder detail over een nieuwer zetten. Bestond al; sinds 2026-09-17 leunt
      het scroll-effect na afronden op `actie.status` uit dat detail. Kleinste fix: een `AbortController`
      per verzoek, zoals `ContactPanel` al doet. (design-review fase 1, 2026-09-17, P3)
- [ ] `test`: **De flow-harness crasht op een lege `jobradar.db` in de Prospects-sectie.** Gemeten 2026-09-17 met
      `JOBRADAR_DB_PATH` naar een nieuwe database: `TimeoutError` op `locator('[role="tabpanel"]:visible h3').first()`
      in de sorteercheck (de regel staat ook op `origin/main`), waardoor de notities aan het eind niet
      meer afgedrukt worden. Het Verify-pad belooft dat een verse tree de lege staat meet. Eerste zet: een
      count-guard vóór `innerText()`, zoals de triage-sectie die heeft. (triage-fase 2026-09-17)
- [ ] `test`: **`opvolging:probe` controleert gevallen 1–12 niet — hij drukt ze af.** Ze eindigen altijd
      op PROBE KLAAR, ook wanneer een route 500 geeft of een 409 een 200 wordt: de faalklasse die
      `plan:probe` op 2026-09-16 al had en waar hij van genezen werd. Gevallen 13–17 (heropenen,
      2026-09-17) vergelijken wél. Eerste zet: de `p`-regels ombouwen naar de `v`-vorm van `plan-probe.sh`,
      met per geval een verwachte waarde, en één keer rood laten worden. (triage-fase 2026-09-17)
- [ ] `refactor`: **`StatusDropdown.tsx` heeft sinds de triage-fase geen enkele importeur meer.** Vervangen
      door `StatusActies` op alle vier de plekken. Niet verwijderd omdat bestanden verwijderen eerst
      akkoord vraagt. Eerste zet: `grep -rn StatusDropdown apps/jobradar` moet 0 geven buiten het bestand
      zelf, dan weg. (design-review fase 2, 2026-09-17, P3)
- [ ] `ux`: **Het statusfilter staat er ook op het tabblad Prospects, waar het niets doet.** `filterQuery`
      kent geen status; dat bestond al, maar met "Open" als nieuwe standaard is het zichtbaarder. Kleinste
      fix: het filter verbergen of uitschakelen met uitleg zolang Prospects actief is. (design-review
      fase 2, 2026-09-17, P3)
- [ ] `fix`: **De statusroutes antwoorden in het Engels** ("Invalid status", "Invalid id"), en
      `StatusActies` toont dat letterlijk naast Nederlandse tekst: "Niet bewaard: Invalid status". Eerste
      zet: de drie routes onder `app/api/jobs|leads|prospects` in het Nederlands, zoals de plan-routes.
      (design-review fase 2, 2026-09-17, P3)
- [ ] `fix`: **Een trage prospects-fetch kan een net bewaarde status overschrijven.** `StatusActies` neemt
      een nieuwe `status`-prop over via een effect; komt een oudere pagina-respons binnen ná een geslaagde
      wissel, dan zet die de oude status terug. Zeldzaam (250 ms debounce, AbortController per filter),
      maar niet uitgesloten. (design-review fase 2, 2026-09-17, P3)
- [ ] `test`: **Geen geval toetst dat de UI zelf een reden invult bij een statuswissel.** De vorm van
      `76a29ff`: kies op `/plan` "Uitgesteld" zonder reden, en de client schreef "Aanleiding: nog te
      bepalen" in een veld van de gebruiker. `scripts/plan-ui-probe.mjs` legt sinds 2026-09-17 de
      PATCH-bodies van echte klikken vast (regel 191) en toetst de `status` erin (regel 205), maar
      nergens de `reden`. Eerste zet: vaststellen hoe de UI een wissel zonder reden nu afhandelt (sinds
      `ca98e0c`), dan één geval dat die wissel via de knop doet en eist dat de body geen door de client
      verzonnen `reden` draagt; tegenproef: `76a29ff` terugdraaien en de check rood zien. (umanex-os
      LEARNINGS 2026-09-16, *Verzonnen inhoud*; learnings-ronde 2026-09-17)

## Verworpen

Met reden, want zonder reden komt hetzelfde voorstel over drie maanden terug en begint de
afweging van nul.

- `ux`: Signaalbadges gewicht geven — alle vier `variant="outline"` terwijl
  `dev-vacature zonder design` 30 punten weegt en `recente groei` 20.
  **Verworpen 2026-08-27** (Jeroen): niet doen. De leadscore-pil op dezelfde kaart draagt het
  gewicht al als getal; de badges zijn een opsomming van wat meetelde, geen rangschikking.
  (ux-audit 2026-08-11, P3)
- `ux`: "Min. score" ondubbelzinnig maken — het filtert op de vacaturescore bij Vacatures en op
  de leadscore bij Leads: twee schalen, één label.
  **Verworpen 2026-08-27** (Jeroen): niet doen. De app heeft één gebruiker, die beide assen kent;
  het label per tabblad laten verspringen kost meer dan het oplevert.
  (ux-audit 2026-08-11, P3)
- `test`: Flow-harness op meerdere viewportbreedtes laten renderen.
  **Verworpen 2026-08-27** (Jeroen): mobiel is voor jobradar geen doelwit. De app is een
  desktop-triagescherm; responsive gedrag hoeft niet geverifieerd te worden zolang dat zo blijft.
  Kantelt dat, dan is dit item de plek om te heropenen — Playwright kan de viewport wél zetten,
  dus de limiet uit de audit (het venster verkleinen liet `innerWidth` op 1417 staan) gold de
  browserautomatisering van toen, niet de harness van nu.
  (ux-audit 2026-08-11, limiet)

## Gebouwd

- `ui`: Een actie op vervallen zetten blokkeerde haar afhankelijken hard, zonder melding op dat
  moment. **Gebouwd 2026-09-17** (umanex-apps#517): het redenblok in `ActiePanel` noemt vóór het
  bevestigen elke afhankelijke actie met haar eigen gevolg. Gemeten in `plan-ui-probe.mjs` UI 14.
  (finish-review 2026-09-16, P2)

- `infra`: **Eigen build-map voor de flow-harness.** Hij bouwde in de gedeelde `.next`, en
  `next build` maakt die map eerst leeg — een dev-server op 3003 die eruit serveert gaf
  daarna een witte pagina. **Gebouwd 2026-09-09** (met akkoord van Jeroen, want het raakt
  `next.config.mjs`): `distDir: process.env.NEXT_DIST_DIR ?? '.next'`, de harness zet die
  variabele op `.next-harness` voor build én start. De tussentijdse poortcheck op 3003 is
  eruit — die was een patch. Tegenproef zit ín de harness: hij leest de mtime van `.next`
  vóór en ná de run en faalt wanneer die verschilt, plus hij stopt wanneer `.next-harness`
  na de build niet bestaat. (code-review PR #408, P2)

- `refactor`: `lib/sources/kbo.ts` en zijn fixtures waren dode code sinds het
  prospects-tabblad. **Verwijderd 2026-08-29** samen met `LEAD_SOURCES`, de `LeadSource`-
  interface en de externe-leadlus in de sync-route.

De vijf UX-items en de twee verificatie-items uit de ux-audit van 2026-08-11 zijn op
2026-08-27 afgehandeld: drie gebouwd, drie verworpen, één gebouwd als harness-uitbreiding.
Briefing: `briefings/2026-08-27-feature-jobradar-a11y-afronding.tcebc.md` aan de root.

- `ux`: Contrast van de `|`-scheiding in `CoverageBar.tsx` — `text-border` mat 1.24:1.
  **Gebouwd 2026-08-27:** `text-muted-foreground`, gemeten 4.97:1 in light en 7.32:1 in dark op
  de gerenderde DOM.
- `ux`: Kopstructuur sprong van h1 naar h3 — 1× h1, 327× h3, geen h2.
  **Gebouwd 2026-08-27:** een `sr-only` h2 per tabpaneel. Gemeten: `/` heeft 336 koppen,
  h1 → h2 → h3, nul overgeslagen niveaus. De harness bewaakt het nu per run.
- `ux`: Focus was inconsistent — drie vormen naast elkaar, en drie elementen met `outline-none`
  zonder vervanging (status-select, chip-invoer, status-select per kaart) waren zelfs
  focus-loos. **Gebouwd 2026-08-27:** één `focusRing`-constante in `@umanex/ui/lib/focus`,
  overal geconsumeerd. Gemeten: 96 tab-stops over twee routes, elk met zichtbare focus.
- `test`: Toetsenbordvolgorde en focusvolgorde ongemeten.
  **Gebouwd 2026-08-27:** een toetsenbord-pass in de flow-harness die de echte tab-volgorde
  afloopt en per stop differentieel meet of de focus zichtbaar is, met een tegenproef in
  `--selftest`. Dat is de "andere harness" uit dit item — Playwright krijgt `Tab` wél in de
  pagina.

## 2026-09-08 — score-pill: eigen rol `score/mid` bouwen (besluit is gevallen) · [design-system]

- **Wat:** De score-pill hangt aan `bg-warning` (Warning.700, bruin) sinds de contrastfix van
  2026-08-08. Het besluit viel op 2026-08-27: een **eigen rol**, geen bruin. De rol is gebouwd
  en gemeten maar bewust niet gemerged — `Semantic/light|dark → score/mid` (+ `-foreground`),
  Warning.500 met Neutral.900 respectievelijk Neutral.950 erop. Gemeten op een lokale build:
  `#F59F0B` met `#101828` = **8,32:1** in light, met `#0C111D` = **8,84:1** in dark. In dark
  verandert er feitelijk niets — `--warning` stond daar al op Warning.500.
- **Waarom niet nu:** `pnpm --filter @umanex/ui figma:check` eist een Figma-variabele per
  tokenrol en draait in CI, dus de rol vraagt éérst twee variabelen in de collectie `Theme` van
  **Component library** (`ko2OuasYxyY2YRD69MYhWX`) met Light/Dark-modes, plus een verse
  `figma/manifest.json`. Dat kan alleen met de Desktop Bridge op dát bestand.
- **Eerste zet:** Volgorde is dwingend: `score-mid` en `score-mid-foreground` in Figma →
  manifest verversen → `tokens.json` + `ScoreBadge.tsx` in één PR. Verplaatst uit `HANDOFF.md`
  (entry 2026-08-08) bij de sessie-reflectie van 2026-09-08 — 31 dagen open, besluit genomen,
  dus werk in plaats van sessie-context.
- **Check:** `grep -n "'warning'" apps/jobradar/components/ScoreBadge.tsx` — treffer = de pill
  hangt nog aan de generieke warning-rol; leeg = de eigen rol is er.
- **Status:** open

## 2026-09-10 — Prospect-classificatie en het labelscherm: opnieuw bouwen op het tabblad, niet mergen uit #327 · [feature]

- **Wat:** PR umanex-apps#327 (`feature/prospect-classificatie`, 16 commits, +4 178) bouwt een
  `/prospects`-pagina met een labelscherm — per toetsaanslag een oordeel wegschrijven, teller
  meebewegen, herlaadbeurt overleven — plus KBO/NBB-bronnen en `classificatie`/`geclassificeerd_op`
  op `companies`. Gemeten op 2026-09-10 vóór de merge: `main` heeft prospects ná de vertakking
  opnieuw gebouwd — een Prospects-**tabblad** gevoed door de KBO-spiegel (`c2b353c`), leads
  gekoppeld op ondernemingsnummer (`4936599`), CSV-prospects, de kaart en filters — en de
  KBO-bron waar de branch op leunt is verwijderd (`9f8b8d7`). De API-routes lopen uiteen
  (`[id]` op de branch, `[nr]` op `main`), acht bestanden raken beide kanten, en de
  merge-preview gaf zes inhoudelijke conflicten: `lib/db/ddl.ts`, de flow-harness (388 tegen
  105 regels op dezelfde plek), `scenarios.mjs`, `CLAUDE.md`, `BACKLOG.md`, het snapshot.
  Dat is geen merge-conflict maar twee ontwerpen van dezelfde feature; een mechanische
  oplossing zou hooguit compileren en een tweede prospects-oppervlak op een verwijderde bron
  zetten. Besluit Jeroen, 2026-09-10: #327 gesloten, de branch blijft bestaan als bron.
- **Waarom niet nu:** het labelscherm is een feature *op* het huidige tabblad, niet een merge
  *van* een oud ontwerp. Dat is een jobradar-bouwtaak van minstens een dagdeel, met een eigen
  TC-EBC en de flow-harness als rechter — niet iets dat in een merge-ronde thuishoort.
- **Eerste zet:** Lees op de branch `apps/jobradar/app/prospects/page.tsx` en de labelscherm-
  sectie in `scripts/flow-harness.mjs` (de 105 regels achter `→ Labelscherm aandrijven`) als
  gedragsspecificatie; neem de drie acceptatie-eisen daaruit over. Schrijf dan een TC-EBC voor
  een classificatie-actie ín het bestaande tabblad, met `classificatie`/`geclassificeerd_op` als
  kolommen op de tabel die het tabblad vandaag leest. De DDL-hunk uit de branch (kolommen +
  `companies_classificatie_idx`, met de reden waarom de index buiten `SCHEMA_DDL` staat) is
  herbruikbaar zoals hij is.
- **Check:** `git ls-tree -r --name-only origin/main -- apps/jobradar/app | grep -c prospects/page`
  — 0 = het labelscherm is nog niet op het tabblad gebouwd (de branch had wél een pagina; die
  telt niet, want ze staat niet op `main`). En `gh pr view 327 --json state -q .state` = `CLOSED`
  hoort te blijven; wordt hij heropend, dan is dit item de reden waarom dat geen goede weg is.
- **Status:** open
