# BACKLOG.md — jobradar

Kleine, afgebakende items die geen eigen briefing verdienen maar wel ergens moeten staan.
Een P3 die alleen in een auditrapport staat, verdwijnt met dat rapport.

Format: `- [ ] {type}: {wat} — {waarom} ({bron})`

## Open

- [ ] `ui`: **Toevoegen in de chip-editors is het zwaarste vlak van de sectie Zoekopdracht.**
      Gemeten 2026-09-19 op `.flow-shots/instellingen.png`: de drie `Toevoegen`-knoppen
      (`components/TermChips.tsx:117`, `variant="secondary"`) vullen rgb(160,163,168), ≈ 2,6:1 tegen
      de paginakleur, 94×36 px, drie keer. Het gevulde `Opslaan` staat in ruststand op
      rgb(144,176,244), ≈ 2,2:1, één keer, 82×40 px. De luidste rechthoeken in de sectie zijn dus de
      veld-knoppen en niet de primaire actie. Dat is precies het argument waarmee *Test deze
      zoekopdracht* in fase 4c van `secondary` naar `outline` ging — één niveau lager niet
      doorgetrokken. Toevoegen is bovendien een dubbele route: Enter en `onBlur` voegen al toe
      (`TermChips.tsx:100-110`). **Eerste zet:** `variant="ghost"` of `outline` op regel 117; de
      harness-as `c51` hangt aan `[data-zoekopdracht-actie]` en verschuift niet mee. **Waarom niet
      nu:** buiten de scope van fase 4c, die over de actierij ging.

- [ ] `ui`: **De primaire actie staat per sectie op een andere plek in de rij.**
      `/instellingen` leest in Zoekopdracht omrand-breed (216 px) → gevuld (82 px) → tekst, terwijl
      Bedrijfsplan het gevulde `Opslaan` als enige knop op de linkerkantlijn heeft (x=288). Het oog
      landt in de eerste sectie dus op de omrande knop. **Eerste zet:** `Opslaan` eerst in de rij van
      `components/SearchSettingsForm.tsx:179-215`. `c51` hangt aan data-attributen, dus de meting
      verschuift niet mee. (design-review fase 4c, 2026-09-19)

- [ ] `ui`: **`/` opent met een dode band links en de sync-knop als zwaarste element.**
      Gemeten op `.flow-shots/index.png` (2026-09-19): balkrand y=48 · eerste inhoud y=81, en alléén
      op x=1147–1243 (Sync nu) · eerste links uitgelijnde tekst pas op y=135. Het besluit "geen
      zichtbare titel op `/`" houdt structureel stand — de actieve "Radar" staat exact boven de
      kantlijn van de inhoud en leest als het label van de pagina — maar het zwaarste element van het
      scherm is nu een onderhoudsactie, en dat is niet wat "gewicht verdelen" wil. **Eerste zet die
      het besluit intact laat:** `<CoverageBar />` naar dezelfde rij als de SyncButton
      (`components/DashboardClient.tsx:518-523`, `justify-between items-center`). **Let op:** de
      triage-sectie meet de meta-rij op overloop bij 1280 en 1024 px — die as opnieuw draaien na de
      wissel. (design-review fase 4c)

- [ ] `ui`: **De balk ligt op `/instellingen` 256 px naast de inhoud.**
      De balktekst begint op x=32 op alle drie de routes; op `/` en `/plan` begint de pagina-inhoud
      op x=33, daar valt het patroon samen. Op `/instellingen` (`max-w-3xl`) begint álles op x=288, en
      geen enkel element raakt de kantlijn van de balk (`max-w-7xl`). Bewuste asymmetrie, vastgelegd
      in de aannames van `briefings/2026-09-19-feature-navigatie.tcebc.md` — hier genoteerd zodat ze
      niet stilzwijgend is. **Twee uitwegen:** `/instellingen` naar `max-w-5xl`, of de balk-container
      per route laten meebewegen (duurder, en dan springt het wordmerk bij elke routewissel).
      (design-review fase 4c, 2026-09-19)

- [ ] `ui`: **Een klik op de huidige route in de balk is een volledige herlading.**
      `AppHeader.tsx` geeft de link naar het pad waar je al staat een gewone `<a>`, omdat Next de
      error-boundary alléén bij een padwissel leegt — zonder dat is het op de foutpagina een
      zichtbare link die niets doet (harness-as `c02f`). De prijs: vanaf `/?tab=leads&status=alle`
      kost één klik op "Radar" een volledige force-dynamic render van alle vacatures, leads en
      koppelingen, en de filterstand valt terug op de standaard. Gemeten 2026-09-19 dat URL en scherm
      daarna hetzelfde zeggen (harness-as *klik op de huidige route*), dus er is geen halve
      toestand — alleen kost. **Waarom niet nu:** elke goedkopere vorm (`onClick` + `reload`) bewaart
      juist de querystring en verandert daarmee wat het menu-item betekent; dat is een eigen
      beslissing, geen fix.

- [ ] `a11y`: **Het klikdoel van de navigatielinks is 20 px hoog.**
      `components/layout/AppHeader.tsx` — de link heeft geen eigen padding; de balkhoogte komt van de
      container. WCAG 2.5.8 haalt het via de spacing-uitzondering (hart-op-hart ≥ 48 px), dus geen
      faalgeval, maar klein. **Eerste zet:** `py-2 -my-2` in `klasse`, dat maakt er 36 px van zonder
      de balkhoogte te raken en geeft de focus-ring meteen een fatsoenlijke doos. (design-review
      fase 4c)

- [ ] `ui`: **De balk is niet sticky, en hij is nu de enige navigatie.**
      `/` is 2032 px hoog; na één schermhoogte is er geen navigatie meer. Geen regressie — de oude
      koppen stonden ook bovenaan — maar vóór fase 4c droeg elke pagina haar eigen links, en nu is
      dit het enige exemplaar. **Let op bij het bouwen:** een sticky balk verschuift de focus-scroll,
      en `PlanClient` gebruikt `scroll-mt-6` op zijn foutbanner. (design-review fase 4c)

- [ ] `a11y`: **Geen skip-link naar de inhoud.**
      Elke route begint sinds fase 4c met drie navigatie-stops vóór `main`. Verwaarloosbaar op `/`
      (80+ stops), maar de layout is voortaan de plek waar zo'n link hoort. (design-review fase 4c)

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
      **Hermeten 2026-09-19 (fase 4c): 480 tegen 400, niet meer 756.** Zelfde commando, zelfde
      database. Het getal is dus tussen 09-16 en 09-19 met 276 px gedaald zonder dat iemand dit item
      aanraakte — vermoedelijk fase 4b (velden naar `@umanex/ui`) of de compacte lage-scorerijen uit
      fase 2, maar dat is niet gemeten. Neem 480 als vertrekpunt, niet 756; en meet opnieuw vóór je
      de toets hierboven draait, anders vergelijk je met een getal dat al verlopen is. De balk van
      fase 4c is níet de oorzaak: die past op 400 px op alle drie de routes (eigen as in de harness,
      `--alleen=navigatie`).

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

- [ ] `a11y`: **Kleine toegankelijkheids- en state-bevindingen (P3) uit de inventaris van 2026-09-17**, per bestand
      hieronder. Bron: de workflow `jobradar-a11y-fouten-inventaris` (4 assen, adversarieel geverifieerd) plus
      22 aanvullingen van de volledigheidscriticus die niet apart geverifieerd zijn en zo gemarkeerd staan. De
      Engelse statusroutes staan al als eigen item hierboven.
- [ ] `a11y`: **P3's in `app/api/prospects/route.ts`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.57 haalProspects draait zonder try/catch, terwijl open() in spiegel.ts bij een mislukte ATTACH opnieuw gooit. Het antwoord is dan een 500 zonder JSON-body. DashboardClient toont data?.error, maar valt hier terug op het generieke 'Mis…
- [ ] `a11y`: **P3's in `app/api/sync/route.ts`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.63 [niet geverifieerd] Een uitgevallen bron komt als 'String(result.reason)' in sourceStatuses terecht, en SyncButton toont dat letterlijk: 'bron "adzuna" is uitgevallen: Error: …' (SyncButton.tsx:46), met het prefix 'Error:' en de Engelse boodschap uit…
- [ ] `a11y`: **P3's in `app/error.tsx`** (4). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.13 Vervangt de boundary de inhoud (bv. na een client-navigatie of een fout in een handler tijdens het renderen), dan gaat de focus niet naar de kop en is er geen role=alert. Er is geen <title>-wijziging, dus ook de routeaankondiging …
      - r.14 Vervangt de error boundary de pagina na een clientinteractie, dan krijgt de kop geen focus en is er geen live-melding. Het element met focus verdwijnt, dus de focus valt op body.
      - r.15 De foutpagina toont error.message rechtstreeks. In productie is dat voor elke server-renderfout Next's Engelse standaardzin 'An error occurred in the Server Components render. The specific message is omitted in production builds…'… **→ opgelost in fase 3 (c02a, gemeten)**
      - r.19 De enige bediening is Opnieuw proberen. Er is geen link naar het dashboard. Deze error.tsx vangt ook fouten op /plan en /instellingen, want die hebben geen eigen error.tsx. **→ opgelost in fase 3 (c02b, gemeten)**
- [ ] `a11y`: **P3's in `app/instellingen/page.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.16 /instellingen heeft geen loading.tsx. De render leest de zoekopdracht en roept planDb() aan, en planDb zaait het plan bij het eerste bezoek. Een client-navigatie vanaf het dashboard of het plan toont tot dan niets. **→ opgelost in fase 3 (c14b, gemeten)**
- [ ] `a11y`: **P3's in `app/page.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.34 / heeft geen loading.tsx (alleen app/plan/loading.tsx bestaat). Navigeer je client-side naar / (de link 'Terug naar het dashboard' op /plan en /instellingen), dan blijft de vorige pagina zonder indicatie staan tot de force-dynamic… **→ opgelost in fase 3 (c14a, gemeten)**
- [ ] `a11y`: **P3's in `app/plan/loading.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.13 De laadtekst staat in een aria-live-regio die samen met zijn inhoud verschijnt. Het project legt zelf vast dat zo'n regio niet betrouwbaar wordt voorgelezen (ActiePanel.tsx r.557-560).
      - r.13 De laadtekst staat in een aria-live-regio die al mét inhoud gemount wordt. Live-regio's kondigen wijzigingen ná de mount aan, dus een schermlezer zegt 'Plan laden…' niet betrouwbaar. De route-announcer vangt dat niet op, omdat de …
- [ ] `a11y`: **P3's in `components/ActieRij.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.125 'Wijzig' vervangt de alinea waarin hij zelf staat door een invoerveld zonder autoFocus. Bewaar en Annuleer (r.94-114) halen zichzelf weer weg. De knop die je indrukt verdwijnt telkens, en de focus valt op body. **→ deels in fase 3 (zie `components/plan/ActieRij.tsx` r.127)**
- [ ] `a11y`: **P3's in `components/ContactPanel.tsx`** (5). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.128 Na een geslaagde Vastleggen wordt de notitie geleegd en de historiek opnieuw geladen. De enige aankondiging is de bestaande live-regio, die van 'Historiek laden' naar 'N contactmomenten' springt. Een expliciete bevestiging is er n… **→ opgelost in fase 3 (c22a, gemeten)**
      - r.278 [niet geverifieerd] 'maxLength' kapt geplakte tekst stil af, zonder teller of melding. Het gaat om de notitie (2000), het bewijs en de beslissingsvelden (4000, ActiePanel.tsx:299 en BeslissingPanel.tsx:127-168) en de aannames (8000, Aannames.tsx:40).…
      - r.288 Vastleggen wordt 'disabled' zolang 'bezig' waar is; de knop heeft op dat moment de focus, die daardoor naar body gaat (geen node verwijderd, dus FocusScope vangt het niet op). **→ opgelost in fase 3 (c24, gemeten)**
      - r.288 Vastleggen wordt 'disabled' tijdens 'bezig'. Daarna vervangt 'haal()' de hele historiek door 'Laden…' (r.209-210). De focus valt op body, en FocusScope zet hem bij die DOM-mutatie op de sheet-container (handleMutations: 'if (focus… **→ opgelost in fase 3 (c24, gemeten)**
      - r.288 Vastleggen en Bewaren/Bijwerken worden disabled tijdens bezig. Daarna vervangt haal() de hele timeline door 'Laden…' (r.209-210), dus de bevestigknop 'Verwijderen' in ContactTimeline verdwijnt onder de focus. In alle drie de geval… **→ opgelost in fase 3 (c24 en de Verwijderen-checks onder c21, gemeten)**
- [ ] `a11y`: **P3's in `components/ContactTimeline.tsx`** (3). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.59 Een inline bevestiging (Verwijderen/Annuleren in de historiek, 'Zeker?' in ActiePanel.tsx:1042-1056, het redenblok in ActiePanel.tsx:413-485) vangt Escape niet af. Escape gaat naar Radix DismissableLayer en sluit de hele sheet. Co…
      - r.81 De prullenbakknop wordt bij klik vervangen door Verwijderen/Annuleren; de gefocuste knop verdwijnt en Radix FocusScope zet de focus op de sheet-container. **→ opgelost in fase 3 (focus naar Annuleren/prullenbak; gemeten onder c21 Verwijderen)**
      - r.81 De prullenbakknop vervangt zichzelf door Verwijderen/Annuleren (r.59-79), zonder dat de focus mee verhuist. De verwijderde knop stuurt de focus naar body, en Radix zet hem daarna op de sheet-container. Annuleren haalt zichzelf ook… **→ opgelost in fase 3 (idem)**
- [ ] `a11y`: **P3's in `components/DashboardClient.tsx`** (5). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.107 [niet geverifieerd] Het commentaar zegt 'Sinds 2026-09-17 alle filters, niet alleen tab en zoek' (r.53-56), maar TriageStand (lib/triage.ts:31-43) kent alleen status, regio's, score, tab, zoek en via. De filters van het tabblad Prospects bestaan alle…
      - r.297 De live-melding kent maar drie woorden. Elke status behalve dismissed en saved wordt 'heropend', dus ook 'contacted' wanneer een lead via het Opvolging-paneel uit een Nieuw- of Opgeslagen-filter valt.
      - r.297 naVerdwijnen zegt 'heropend' voor elke status die niet dismissed of saved is. Twee bereikbare paden geven zo een onware melding. (1) Onder filter 'Opgeslagen' Bewaar uitzetten: de status wordt new, de kaart verdwijnt, en je hoort …
      - r.298 statusMelding wordt nooit geleegd. Wijs je na elkaar twee items met dezelfde titel af, dan zet setState dezelfde string: React rendert niet opnieuw, de DOM verandert niet en de live-regio zwijgt. Gemeten met sqlite3 -readonly: 7 t…
      - r.603 Bij de eerste lading van Prospects (prospects leeg, prospectBezig waar) valt de ternary door naar de grid-tak en rendert een lege div. De enige laadindicator is het kleine 'Bezig…' rechts in de filterrij (r.547). Het lijstgebied z…
- [ ] `a11y`: **P3's in `components/FilterBar.tsx`** (3). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.65 'Zoekterm wissen' bestaat alleen zolang er een zoekterm is. Na de klik wordt 'zoek' leeg, verdwijnt de knop onder de focus, en valt de focus op body.
      - r.70 De wisknop is 'p-1' plus een icoon 'h-3 w-3', dus 20×20 CSS-px, en ligt absoluut bovenop het zoekveld. Het zoekveld is zelf een doel. Een cirkel van 24 px rond de knop snijdt dat veld, dus de spacing-uitzondering geldt niet en WCA…
      - r.97 De Slider-thumb heeft geen toegankelijke naam: het zichtbare 'Min. score' is een losse '<span>' en is er niet aan gekoppeld. De thumb is 'h-5 w-5' (20×20, packages/ui slider.tsx:19). Die maat haalt AA alleen via de spacing-uitzond…
- [ ] `a11y`: **P3's in `components/HerkomstFilter.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.96 [niet geverifieerd] Home op de eerste optie of End op de laatste zet 'naarIndex.current' op de huidige optie en roept 'onChange' aan met dezelfde waarde. 'waarde' verandert dus niet, het effect (r.47-51) draait niet, en de ref blijft gevuld. De eerst…
      - r.110 [niet geverifieerd] Het commentaar op r.105-108 zegt dat de rand het 1.4.11-tekort van de vulling oplost ('De rand doet het werk dat de vulling niet kan'). Die rand is 'border-input': 218 17% 91% tegen 'bg-muted' (216 24% 96%) geeft 1,13:1 in light, …
- [ ] `a11y`: **P3's in `components/JobCard.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.36 [niet geverifieerd] Titels en namen worden met 'truncate' afgekapt, zonder 'title', tooltip of uitklap. Het gaat om de vacaturetitel (r.36), de bedrijfsnaam in LeadCard r.59 en ProspectCard r.96 en r.109, de rij in LageScoreLijst r.55, de actieknop i…
- [ ] `a11y`: **P3's in `components/LageScoreLijst.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.75 [niet geverifieerd] StatusActies bouwt 'Bewaar/Afwijzen/Heropen {naam}', en voor vacatures is 'naam' alleen de titel. JobCard.tsx:93 doet hetzelfde. De Bekijk-link in de rij heet 'Bekijk ${job.title}' (r.64). Gemeten met sqlite3 -readonly: 7 titels k…
- [ ] `a11y`: **P3's in `components/LeadCard.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.149 Zelfde "Website"-link op de leadkaart. Latent: 0 van de 27 leads in .data/jobradar.db hebben nu een url (read-only gemeten).
      - r.162 Elke leadkaart heeft een knop "Opvolging" zonder bedrijfsnaam, en hij opent een Sheet zonder aria-haspopup.
- [ ] `a11y`: **P3's in `components/NextActionBadge.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.41 De omschrijving van de volgende actie staat alleen in een title-attribuut op een niet-focusbare div (Badge).
      - r.41 De omschrijving van de volgende actie ('Bellen, mail sturen…') staat alleen in een 'title'-attribuut, op een Badge-'div' die geen focus kan krijgen. De app heeft 'title' elders zelf verworpen om precies deze reden (HerkomstFilter.…
- [ ] `a11y`: **P3's in `components/ProspectCard.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.171 Link "Website" per kaart zonder bedrijfsnaam en zonder melding van het nieuwe tabblad.
      - r.189 Zelfde als LeadCard: "Opvolging" per prospectkaart zonder bedrijfsnaam en zonder aria-haspopup.
- [ ] `a11y`: **P3's in `components/ProspectMap.tsx`** (9). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.37 Een afgewezen marker heeft dezelfde vulklasse als het provincievlak eronder: beide fill-muted. Alleen een stroke van 1 eenheid in de achtergrondkleur scheidt ze. /api/kaart filtert afgewezen prospects niet weg (route.ts:105 zet de…
      - r.76 Beide fetches doen r.json() zonder r.ok te controleren. /api/kaart heeft geen try/catch rond haalSelectie en de db-lezingen, en open() in lib/kbo/spiegel.ts gooit bij een mislukte ATTACH opnieuw (r.95-99). Een 500 heeft dus geen J… **→ opgelost in fase 3 (r.ok op beide fetches; het 500-pad gemeten onder c19)**
      - r.80 fout wordt gezet maar nergens teruggezet naar null. Na één mislukte /api/kaart-lading halen filterwijzigingen wel nieuwe punten op, maar de component geeft eerst de alert terug (r.113-119), dus de kaart blijft kapot tot je naar Li… **→ opgelost in fase 3 (c19, gemeten)**
      - r.122 'Kaart laden…' is een gewone p zonder role=status. Bij een filterwijziging blijven de oude punten en tellers zonder enige laadtoestand staan tot het antwoord binnen is. De nieuwe telling (r.162-170) staat niet in een live-regio.
      - r.173 De live-regio van de kaart meldt alleen het aantal; twee losse stippen na elkaar geven twee keer "1 bedrijven geselecteerd", dus de tweede keuze wordt niet aangekondigd.
      - r.202 De gekozen marker wordt alleen visueel onderscheiden (grotere straal); de knop draagt geen aria-pressed.
      - r.213 Elke cluster is een eigen tab-stop, en die stops staan in DOM-volgorde: gesorteerd op x, niet geografisch. Wie met Enter een marker kiest, moet eerst langs alle resterende markers tabben voor hij bij de StatusActies in de aside ko… **→ opgelost in fase 3 (c18, gemeten)**
      - r.258 Markers zijn in SVG-eenheden r=5 (actief 7), de ruit is 8×8 en een cluster r=11, in een viewBox van 1000 breed. Bij 1280 px viewport is de svg ongeveer 912 CSS-px breed (1216 min aside 'lg:w-72' min 'gap-4'). Een losse stip is dan… **→ opgelost in fase 3 (c20, gemeten)**
      - r.258 De klikbare vorm is ook de zichtbare vorm: een stip r=5 (r=7 als hij actief is), een ruit van 8×8 en een cluster r=11, allemaal in viewBox-eenheden op een breedte van 1000. Clusters worden pas samengevoegd onder 18 eenheden, dus b… **→ opgelost in fase 3 (c20, gemeten)**
- [ ] `a11y`: **P3's in `components/RegionFilter.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.26 "Regio" is een losse span; de drie checkboxen hangen er niet aan, dus ze hebben alleen hun regionaam.
- [ ] `a11y`: **P3's in `components/ScoreBadge.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.15 De scorepil rendert alleen een getal, zonder dat de toegankelijke tekst zegt dat het een score is. **→ deels in fase 3: de pil mét opbouw noemt de score (c10b); de kale pil zonder opbouw niet**
- [ ] `a11y`: **P3's in `components/SearchSettingsForm.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.139 'Herstel de standaard' wordt alleen gerenderd zolang '!isStandaard'. Na een geslaagd herstel wordt 'isStandaard' waar en verdwijnt de knop onder de focus. Hetzelfde geldt voor de chip-verwijderknop in TermChips.tsx:78-89: de chip … **→ deels in fase 3: Herstel houdt de focus (c42); de chip-verwijderknop in TermChips niet**
      - r.147 [niet geverifieerd] De validatiefout staat onder de knoppen, ver van het veld waarover hij gaat. Voorbeelden: 'Zonder zoektermen…', "'x' staat zowel bij de zoektermen als bij de uitsluitingen" en 'is één woord'. Het TermChips-veld krijgt geen 'aria-i…
- [ ] `a11y`: **P3's in `components/SyncButton.tsx`** (4). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.35 '+N vacatures, +N leads' is platte tekst, geen link naar de nieuwe items. De aanname in de briefing dat /?status=new daarheen leidt, klopt niet. status=new is de triagestatus 'nog niet beoordeeld' (lib/triage.ts:26, pastBijStatus)… **→ opgelost in fase 3 (c13d, c13e, c44–c47, gemeten)**
      - r.61 Dezelfde faalklasse als de paginering, op minder frequente plekken: een knop die je net indrukte, wordt 'disabled', en volgens StatusActies.tsx:58-59 geeft hij zijn focus dan af aan body. Het gaat om SyncButton.tsx:61 ('disabled={… **→ opgelost voor SyncButton in fase 3 (c13a, gemeten)**
      - r.61 De knop wordt tijdens de sync 'disabled'. Wie hem met Enter of Spatie start, verliest de focus aan body, de klasse die StatusActies.tsx:58–59 beschrijft en vermijdt. **→ opgelost in fase 3 (c13a, gemeten)**
      - r.63 Tijdens de sync zie je alleen een draaiend icoon en 'Bezig…'. Je ziet niet hoe lang het al duurt of ongeveer nog duurt. Volgens CLAUDE.md duurt een sync ~12 s door de Adzuna-pauzes. **→ opgelost in fase 3 (c13b, gemeten)**
- [ ] `a11y`: **P3's in `components/TermChips.tsx`** (4). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.51 [niet geverifieerd] Typ je een term die al bestaat, dan verandert de lijst niet, maar het veld wordt wel geleegd. Ontdubbelen gebeurt hoofdletterongevoelig, in splitsTermen en normaliseerZinsnedes op lowercase. Er komt geen melding, en dat geldt voor…
      - r.88 Bedieningselementen onder 24×24 CSS-px die AA alleen halen dankzij de spacing-uitzondering (geen ander doel binnen een cirkel van 24 px): de chip-verwijderknop in TermChips.tsx:78-89 (12×12, geen padding); de prullenbak in Contact…
      - r.105 [niet geverifieerd] Backspace in een leeg invoerveld verwijdert zonder melding de laatste term. Houd je de toets ingedrukt, dan verdwijnen er meerdere. De focus blijft in het veld, en er is geen live-regio.
      - r.117 Elke TermChips heeft een knop "Toevoegen"; /instellingen rendert er drie (Zoektermen, Woordcombinaties, Uitsluiten).
- [ ] `a11y`: **P3's in `components/plan/Aannames.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.31 [niet geverifieerd] De h3 'Planningsaannames' staat ín de 'summary', net als 'Geschiedenis (N)' in ActiePanel.tsx:1018. Een summary krijgt een knoprol (Firefox stelt hem als button bloot), en de kinderen van een knop zijn presentationeel. De kop kan …
- [ ] `a11y`: **P3's in `components/plan/ActieLijst.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.17 De live-regio 'N acties getoond' staat alleen in de niet-lege tak. Filter je naar nul, dan verdwijnt de live-regio samen met zijn inhoud, en de lege toestand heeft zelf geen live-regio. De teller in PlanFilters ('{getoond} van {to…
      - r.28 [niet geverifieerd] 'N acties getoond' is op het tabblad Acties de enige aankondiging na een filterwissel. Gemeten met sqlite3 -readonly: prioriteit 1 en 2 hebben elk 6 acties, 3 en 4 elk 5, en alle 22 hebben eigenaar 'Jeroen'. Wissel je van priorite…
- [ ] `a11y`: **P3's in `components/plan/ActiePanel.tsx`** (13). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.385 De status-select roept in onChange direct zetStatus aan en krijgt disabled={bezig}. Het element dat net gekozen werd, wordt dus disabled terwijl het de focus heeft. Hetzelfde patroon zit op alle velden en knoppen in het paneel en … **→ deels in fase 3: de select verstuurt niet meer bij een wissel (c29) en Heropen, Bewaar en Zet op houden de focus (c30c); de overige knoppen staan in het BACKLOG-item hieronder**
      - r.508 [niet geverifieerd] Bij een 409 op de focusregel zet 'verstuur' zowel 'fout' ('er zijn al 3 acties bezig', mutaties.ts r.352) als 'conflict' (PlanClient.tsx:128-129). Het paneel rendert beide tegelijk als role="alert": de foutregel (r.361) en het con…
      - r.519 In het focusconflict staat per lopende actie een knop "Parkeer" zonder key; per constructie zijn het er evenveel als de focuslimiet (standaard 3).
      - r.810 [niet geverifieerd] Een link heeft zijn URL als React-key (r.794) en wordt ook op URL verwijderd. Dezelfde URL kan twee keer in de lijst komen: via Voeg toe, of doordat Markeer gereed een bewijslink met een bestaande URL toevoegt (r.327-331). Dan sta…
      - r.811 De knop die een link verwijdert heeft geen padding en een icoon 'h-3 w-3': een doel van 12×12 CSS-px, op 4 px ('gap-1') van de link zelf. Een cirkel van 24 px rond de knop snijdt de link, dus WCAG 2.5.8 faalt ook met de spacing-ui…
      - r.821 [niet geverifieerd] Een reeks velden heeft alleen een aria-label, met als enige zichtbare aanwijzing een placeholder die verdwijnt zodra je typt: de twee linkvelden 'Label' en 'https://…' (r.819-837), de bewijslink (r.305-313), datum en omschrijving …
      - r.848 De knop in de sectie Links heet "Voeg toe", net als de knop bij Afhankelijkheden (r.939) in hetzelfde paneel.
      - r.936 [niet geverifieerd] Voeg toe bij Afhankelijkheden zet de select meteen terug op 'Kies een actie…'. Het wacht niet op het antwoord: 'onVerzoek' heeft als type '=> void', en panelVerzoek geeft niets terug. Weigert de server de afhankelijkheid, bv. een …
      - r.939 De knop bij Afhankelijkheden heet "Voeg toe", identiek aan die bij Links (r.848).
      - r.1003 Per gekoppeld bedrijf een link "Open in dashboard" zonder bedrijfsnaam.
      - r.1031 [niet geverifieerd] De geschiedenis toont 'oud → nieuw' zoals het in plan_history staat. Voor status zijn dat de ruwe enumwaarden: mutaties.ts r.378 schrijft 'actie.status' en 'invoer.status' weg, dus er staat 'status: niet_gestart → wacht_op_input'.…
      - r.1058 "Verwijder deze actie" wordt vervangen door Verwijder/Annuleer zonder focusverplaatsing; de gefocuste knop verdwijnt, en Radix FocusScope zet de focus dan op de sheet-container (gelezen in node_modules: 'if (mutation.removedNodes.…
      - r.1058 Een reeks knoppen in het actiepaneel haalt zichzelf weg bij activatie. Radix zet de focus daarna op de sheet-container, en dus bovenaan het paneel: 'Verwijder deze actie' (r.1058) en zijn Annuleer (r.1053); Annuleer van het redenb…
- [ ] `a11y`: **P3's in `components/plan/ActieRij.tsx`** (3). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.54 De titelknop opent het actiepaneel (een Sheet) maar draagt geen aria-haspopup, terwijl Afronden… in dezelfde rij (r.183) en Open op de Eerstvolgende-kaart dat wel doen.
      - r.127 Wijzig vervangt de knop door een invoerveld zonder focus te verplaatsen; Bewaar en Annuleer halen het blok weer weg. In alle drie de gevallen verdwijnt het gefocuste element. **→ deels in fase 3: na een geslaagde Bewaar gaat de focus naar Wijzig; Wijzig en Annuleer zelf niet**
      - r.133 De knop om de volgende stap te bewerken heet alleen "Wijzig", zonder actie en zonder object.
- [ ] `a11y`: **P3's in `components/plan/Beslismomenten.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.31 Zelfde als de actierij: de titelknop opent het BeslissingPanel zonder aria-haspopup.
- [ ] `a11y`: **P3's in `components/plan/Ideeen.tsx`** (4). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.99 Per open idee drie knoppen "Opnemen in plan", "Verwerp", "Verwijder" zonder de titel van het idee. Latent: 0 open ideeën in de database nu.
      - r.99 "Opnemen in plan" verbergt zijn eigen knoppenrij en toont een select zonder focusverplaatsing; Annuleer en Bevestig halen die weer weg.
      - r.99 'Opnemen in plan' laat zijn eigen knoppenrij verdwijnen: 'opnemen !== i.id' wordt onwaar en er verschijnt een select zonder autoFocus. Verwerp en Verwijder halen de rij ook weg, via een statuswissel of doordat het idee uit de lijs…
      - r.105 [niet geverifieerd] Verwijder wist een idee definitief met één klik. De historiek (ContactTimeline) en 'Verwijder deze actie' (ActiePanel r.1042-1061) vragen wél een tweestapsbevestiging. Verwerp is in de UI eenrichtingsverkeer: een verworpen idee kr…
- [ ] `a11y`: **P3's in `components/plan/PlanBadge.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.24 De zichtbare tekst is 'A01 · A07' of 'A01 +2', de aria-label begint met "Bedrijfsplan:" en bevat "+2" niet. Bovendien belooft de naam alle keys terwijl de link alleen naar keys[0] gaat.
- [ ] `a11y`: **P3's in `components/plan/PlanClient.tsx`** (6). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.65 [niet geverifieerd] Op /plan staan het tabblad en de filters (prioriteit, status, uitvoerbaarheid, eigenaar) alleen in state (r.65, r.75). Herladen, of Back na 'Open in dashboard', zet alles terug op Overzicht zonder filter. '?actie=' wordt bij opene…
      - r.176 'laatstGewijzigd.current' wordt gezet vóór de PATCH en alleen gewist in het effect op '[plan, openActie]'. Faalt een Start zonder conflict (500 of netwerkfout), dan blijft de ref staan. Bij de eerstvolgende wijziging van 'plan' of…
      - r.265 [niet geverifieerd] 'Terug naar het dashboard' op /plan (r.264-273) en op /instellingen (app/instellingen/page.tsx:23-32) linkt naar een kale '/'. De filterstand die fase 2 in de URL bewaart (status, regio, score, tab, zoek), valt daardoor terug op d…
      - r.310 De tweede exportlink heet alleen "JSON".
      - r.318 'Herlaad plan' staat in de foutmelding, en die wordt alleen gerenderd zolang 'fout' gezet is. 'herlaad' doet als eerste 'setFout(null)' (r.146), dus de knop verdwijnt meteen onder de focus. **→ opgelost in fase 3 (c35, gemeten)**
      - r.592 Tussen de klik op een actietitel of 'Open' en het antwoord van /api/plan/acties/{key} rendert er niets: het paneel verschijnt pas als detail binnen is. Er is geen laadindicator, geen aria-busy en geen live-melding.
- [ ] `a11y`: **P3's in `components/plan/PlanInstellingenForm.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.153 /instellingen heeft twee knoppen "Opslaan": deze en die van SearchSettingsForm.tsx:136.
- [ ] `a11y`: **P3's in `components/plan/PlanKoppeling.tsx`** (2). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.42 Bij een laadfout blijft data null. Onder de alert staat dan 'Nog niet gekoppeld aan een actie.', en de select zegt 'Alle acties zijn al gekoppeld.' en is disabled. Beide zinnen zijn onwaar: ze beschrijven een lege lijst die er noo…
      - r.100 Per gekoppelde actie een knop "Ontkoppel" zonder key.
- [ ] `a11y`: **P3's in `components/plan/Startvoorwaarden.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.116 De knop heet "Leg vast" of "Bekijk", zonder dat de naam zegt dat het om het startbesluit gaat, en hij opent een Sheet zonder aria-haspopup.
- [ ] `a11y`: **P3's in `packages/ui/components/ui/input.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.12 [niet geverifieerd] De rand van invulvelden is de rol '--input' (218 17% 91%), berekend op 1,24:1 tegen wit. Dat is dezelfde waarde die de BACKLOG voor 'text-border' in CoverageBar mat. In jobradar is die rand bij de meeste velden de enige aanwijzing…
- [ ] `a11y`: **P3's in `packages/ui/components/ui/sheet.tsx`** (1). Gevonden door de inventaris van fase 3 (2026-09-17);
      niet gebouwd omdat fase 3 alle P1/P2 nam en de P3's gegroepeerd parkeert.
      - r.50 [niet geverifieerd] Geen enkele animatie respecteert 'prefers-reduced-motion'. Het gaat om de sheet die 500 ms inschuift, de zoom van de tooltip (tooltip.tsx:19), en 'animate-spin' tijdens de sync van ~12 s (SyncButton.tsx:62) en de zoektest (SearchS…

- [x] `feature`: **"+N vacatures" na een sync toont niet wat er nieuw is.** Gebouwd in fase 3 (c13d)
      volgens de aanname in de briefing: de link zet het statusfilter op Nieuw. Maar Nieuw is de
      triagestatus "nog niet beoordeeld" (`lib/triage.ts`), niet "binnengekomen sinds de vorige sync" —
      met weinig afgewezen vacatures toont hij vrijwel de hele lijst. Zie ook het P3-item bij
      `SyncButton.tsx` r.35. **Eerste zet:** een stand `sinds=<previousSyncAt>` in `TriageStand` en de URL
      (`leesStand`/`schrijfStand` + de 30.240-standen-suite), en de link daarop zetten. (review fase 3, 2026-09-17)
      **Gebouwd 2026-09-17 in fase 3 (items c13d/e, c44–c49b, gemeten), keuze Jeroen:** een vast vinkje "Alleen nieuw bij de laatste
      sync" in de filterbalk op de badge-voorwaarde, en de statusoptie "Nieuw" hernoemd naar "Niet beoordeeld".
- [x] `fix`: **Wijzig op een actierij opent met een verouderde volgende stap.** `ActieRij.tsx` zet `stap`
      één keer uit `actie.volgendeStap` bij het mounten. Pas je de stap aan in het paneel of herlaad je het
      plan, dan opent Wijzig met de oude tekst — en Bewaar overschrijft de nieuwere stap, want de versie is
      dan wél actueel. **Eerste zet:** `stap` bij het openen van het veld uit de actuele prop zetten, met een
      `plan-ui-probe`-geval: stap wijzigen via HTTP, dan Wijzig → de nieuwe tekst staat erin. (fix-ronde fase 3, 2026-09-17)
      **Gebouwd 2026-09-17 in fase 3 (item c50, gemeten), op vraag van Jeroen.**
- [ ] `ux`: **Onbewaarde invoer in het actiepaneel verdwijnt zonder vraag bij een paneelwissel.** De
      sluitvraag (c39) dekt Escape, overlay en kruis, niet (a) de automatische wissel naar een andere actie
      wanneer Start in het blok "nu beschikbaar" op een 409 strandt, en (b) de link "Open in dashboard".
      Beslissing nodig: bij onbewaarde invoer niet automatisch wisselen, of vooraf altijd vragen. (bouw fase 3, 2026-09-17)
- [ ] `ux`: **Na Bewaren van de volgende actie blijven kaart en sortering oud.** `ContactPanel` meldt de
      nieuwe actie niet aan `DashboardClient`, dus `NextActionBadge` en "Volgende actie eerst" tonen de oude
      stand tot de volgende lading. **Eerste zet:** prop `onActieChange(actie | null)` die `bewaarActie` na
      succes aanroept. (bouw fase 3, 2026-09-17)
- [ ] `ux`: **De actiekeuze in PlanKoppeling telt niet als onbewaarde invoer.** Het paneel vraagt bevestiging
      bij een getypt contactmoment, niet bij een gekozen maar niet gekoppelde actie — `PlanKoppeling` is een
      slot en meldt zijn staat niet. **Eerste zet:** callback `onOnbewaard(boolean)` naar `ContactPanel`. (bouw fase 3, 2026-09-17)
- [ ] `ux`: **Tijdens de eerste historiek-lading zijn Vastleggen en Bewaren inert.** Bewuste ruil in fase 3:
      zonder die rem overschreef de lading de getypte actie. Een klik tijdens een trage lading doet niets
      (gedimd, wel zichtbaar). Ter beoordeling na gebruik; alternatief is de lading niet laten overschrijven
      wat al getypt is. (review fase 3, 2026-09-17)
- [ ] `refactor`: **De kaart scheidt clusters in de component in plaats van in `lib/kaart.ts`.** `scheidClusters`
      in `ProspectMap.tsx` garandeert dat geen twee markers dichter dan het klikdoel liggen (c20); die garantie
      hoort in `clusterPunten`, met een invariant in `scripts/kaart-scenarios.ts`. Staat als `// TODO` in de code. (bouw fase 3, 2026-09-17)
- [ ] `ux`: **Clusteren op klikdoelgrootte maakt de grootste markers groot.** Doorgerekend op 217 echte punten
      (niet in de browser gezien): losse markers 77 → 59 bij 1280 px en 77 → 40 bij 1024 px; de grootste marker
      bundelt 49 resp. 64 bedrijven (was 33), dus het paneel na één keuze toont tot 64 rijen met statusknoppen.
      Alternatief overwogen en verworpen: straal houden met overlappende klikdoelen (een buur neemt dan een deel
      van het doel over). **Eerste zet:** kijken bij 1024 px of 64 rijen werkbaar zijn; zo niet, het paneel groeperen. (review fase 3, 2026-09-17)
- [ ] `a11y`: **Een viewportwissel kan de kaartfocus laten vallen.** De clustering hangt aan de gemeten breedte
      (ResizeObserver); valt bij een resize de sleutel van de gefocuste marker weg, dan gaat de focus naar body en
      klopt `gekozen` niet meer met een marker. Uit de code gelezen, niet gemeten. (review fase 3, 2026-09-17)
- [ ] `a11y`: **Op de kaart is kleur voor muisgebruikers het enige statussignaal.** Markers dragen naam en status
      voor een schermlezer; met de muis is er geen tooltip of `<title>`, en de legenda verklaart de kleur zonder
      hem te vervangen (WCAG 1.4.1). (bouw fase 3, 2026-09-17)
- [ ] `a11y`: **Herlaad-knoppen hebben geen guard.** `PlanClient`, `ActiePanel` en `BeslissingPanel`: dubbel
      activeren tijdens een herlading stuurt parallelle GET's. aria-disabled + guard, zoals de rest. (review fase 3, 2026-09-17)
- [ ] `a11y`: **Knoppen in het actiepaneel die je zelf activeert, staan nog op native `disabled`.** Markeer gereed,
      Parkeer, Start met uitzondering, Start toch, Verwijder, Voeg toe (afhankelijkheden), Start in het blok met
      vrijgekomen acties, en Afronden… in `ActieRij`: bij een fout of 409 valt de focus op body. En na een
      geslaagde Zet op/Heropen verdwijnt de knop en zet FocusScope de focus op de sheet-container — beter naar het
      status-select. (fix-ronde fase 3, 2026-09-17)
- [ ] `a11y`: **`BeslissingPanel` kent geen laatste focusanker.** Zijn openers blijven vandaag verbonden, maar een
      opener die wegvalt zet de focus op body; `ActiePanel` loopt sinds fase 3 een reeks kandidaten af. (fix-ronde fase 3, 2026-09-17)
- [ ] `refactor`: **De focusterugval na het opvolgingspaneel zoekt de Opvolging-knop op tekst.** `LeadCard` en
      `ProspectCard` geven die knop geen data-attribuut, en `ProspectCard` heeft geen `data-item`; een hernoemde
      knop valt stil terug op het tabpaneel. **Eerste zet:** `data-opvolging` op beide knoppen, `data-item` op
      `ProspectCard`. (fix-ronde fase 3, 2026-09-17)
- [ ] `a11y`: **TermChips geeft vermoedelijk twee keer de focus aan body.** (1) Tab uit een chipveld met getypte
      tekst: `onBlur={voegToe}` leegt het veld, waardoor Toevoegen `disabled` wordt op het moment dat de focus erop
      landt. (2) Enter die de laatste toegelaten woordcombinatie toevoegt, zet het veld met focus op `disabled`
      (`vol`). Niet gemeten. (bouw fase 3, 2026-09-17)
- [ ] `test`: **De toetsenbord-pass van de harness raakt zijn plafond eerder.** Sinds de scoreopbouw een focusbare
      knop is, telt elke kaart met opbouw één tab-stop meer; de pass stopt na 80 stops en dekt dus minder van `/`.
      **Eerste zet:** het plafond per route instelbaar maken of de pass per tabpaneel laten lopen. (review fase 3, 2026-09-17)

- [ ] `refactor`: **Achttien sectiegrenzen zijn `border-t pt-4` in plaats van `Separator`.** Fase 4b liet ze
      staan: de rand zit op de sectie zelf en draagt zijn eigen padding, terwijl `Separator` een los element
      is met eigen marges — omzetten verschuift de ruimte in achttien panelen, en dat was precies wat die fase
      uitsloot. **Eerste zet:** één sectie omzetten, de hoogte van het paneel vóór en ná meten, en pas bij
      gelijke maat de rest. (fase 4b, 2026-09-17)
- [ ] `ui`: **Het chipveld in TermChips blijft een rauwe `<input>`.** Het is een randloze inline-editor binnen
      een omrande chip-zone; een `Input` zet daar een tweede rand en achtergrond binnen de eerste. Dat is het
      enige veld van de 47 dat niet uit `@umanex/ui` komt. **Eerste zet:** beslissen of de bibliotheek een
      "veld zonder schil" kent (zoals shadcn's `Input` in een `InputGroup`), of dat dit bewust app-code blijft.
      (fase 4b, 2026-09-17)

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

- `refactor`: `StatusDropdown.tsx` had sinds de triage-fase geen importeur meer. **Verwijderd 2026-09-17**
  met akkoord van Jeroen; de twee verwijzingen in commentaar zijn mee aangepast. (design-review fase 2, P3)

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
