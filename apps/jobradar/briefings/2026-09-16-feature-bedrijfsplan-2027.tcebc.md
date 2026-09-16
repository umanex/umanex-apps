# Bedrijfsplan 2027

---
Datum:   2026-09-16
Type:    feature
Project: jobradar
Klant:   umanex
Status:  gebouwd
---

---

```
TASK:        Een onderdeel in Jobradar waarmee Jeroen het voorbereidingsplan voor de start van
             umanex (januari 2027) uitvoert en opvolgt: 22 acties in vier prioriteitsgroepen,
             afgeleide blokkade uit afhankelijkheden, focusregel (3 bezig), afronden met bewijs,
             drie beslismomenten en een handmatig startbesluit, ideeënlijst, aannames, export.

CONTEXT:     Jobradar is een éénpersoons lokaal triagescherm (Next 15, SQLite, geen auth). Er
             bestaan alleen bedrijven (leads en prospects) als koppelbare objecten; geen
             campagnes, kansen, contactpersonen of taken-tabel — gemeten 2026-09-16, en dat is
             de reden dat dit onderdeel een eigen model krijgt in plaats van een bestaand model
             uit te breiden. Wat er wél is, wordt hergebruikt: de polymorfe sleutel
             `subject_type` + `subject_key` van `contact_moments`, het `settings`-regime
             (ontbrekende rij = default in code, herstel = DELETE), `Gekeurd<T>`, en de
             scheiding tussen zuivere logica en `server-only` waardoor de scenario-suite tegen
             een `:memory:`-database kan draaien.

             Het plan is een eigen route `/plan` naast het dashboard, met een link in de
             dashboard-header. Bedrijven koppelen gebeurt vanuit de kaart (`ContactPanel`), niet
             met een picker; vanuit een actie open je het dashboard op de naam. Zo ontstaat er
             geen tweede registratie van prospectgegevens.

ELEMENTS:    - Route `/plan`: `PlanClient` met Tabs Overzicht · Acties · Beslissingen · Ideeën
             - Overzicht: eerstvolgende actie, `NuBezig` (n van 3), Beschikbaar, Geblokkeerd met
               reden-chips, `VoortgangPerPrioriteit` (gesegmenteerde telling, ongewogen),
               `Startvoorwaarden` (hard / bewijs / niet vereist + startbesluit),
               `Beslismomenten`, `Uitgesteld`, `Aannames`
             - Acties: `PlanFilters` (prioriteit · status · uitvoerbaarheid · eigenaar) +
               `ActieLijst` van `ActieRij`
             - `ActiePanel` — sheet van rechts, zoals `ContactPanel`: status, volgende stap,
               omschrijving en resultaat, gereedcriterium, inzet, planning, links,
               afhankelijkheden, gekoppelde bedrijven, afronden/heropenen, geschiedenis
             - `BeslissingPanel` (sheet), `Ideeen`, `PlanStatusPill`, `PlanBadge` op `LeadCard`
               en `ProspectCard`, `PlanKoppeling` in `ContactPanel`, Opvolging-knop op `LeadCard`
             - Sectie Bedrijfsplan op `/instellingen`: lancering, uren per dag, focuslimiet
             - Tabellen `plan_actions`, `plan_dependencies`, `plan_decisions`, `plan_ideas`,
               `plan_links`, `plan_history`; settings `plan.instellingen`, `plan.aannames`,
               `plan.seed_versie`
             - Routes `/api/plan/*` (plan, acties, beslissingen, ideeën, koppelingen, export)

BEHAVIOUR:   - De seed draait één keer per seed-versie, met een poort in `settings`. Nooit een
               UPDATE op bestaande rijen, dus een bewerkte titel of een verwijderde
               afhankelijkheid overleeft elke herstart en elke deploy. A18–A22 starten
               `uitgesteld` met hun aanleiding; inzet start onbekend, niet nul
             - Geblokkeerd is afgeleid, niet opgeslagen: een afhankelijkheid die niet gereed is
               blokkeert met reden. Een vervallen afhankelijkheid blokkeert hard tot je hem
               verwijdert of vervangt — vervallen is geen geslaagde afronding
             - Een vastgelegde startuitzondering omzeilt een zachte blokkade en blijft zichtbaar
             - Status bezig terwijl er al drie actief zijn → 409 met die drie. Kies parkeren
               (→ niet gestart, met geschiedenis) of een uitzondering met reden. Nooit stil een
               andere actie wijzigen
             - Gereed kan alleen via het panel, met verplicht bewijs; de afrondingsdatum wordt
               bewaard. Heropenen behoudt bewijs en datum, en zet afhankelijken in bezig of
               gereed op "afhankelijkheid heropend" zonder hun status te veranderen
             - Beslismoment: alle gekoppelde acties gereed betekent "klaar voor beoordeling",
               nooit beslist zonder ingevoerde beslissing. Het startbesluit voor januari 2027
               werkt hetzelfde en wordt nooit afgeleid
             - Een idee wordt pas een actie na "Opnemen in plan" met een gekozen
               prioriteitsgroep, en krijgt dan de volgende vrije key
             - Elke PATCH draagt de versie; verouderd → 409 met een herlaad-knop
             - Koppelen van hetzelfde bedrijf blijft één rij; ontkoppelen laat het bedrijf
               ongemoeid
             - Geen deadlines gefabriceerd: streefdatum en herbekijkdatum verschijnen alleen als
               ze ingevuld zijn

CONSTRAINTS: - Desktop-first, zoals de rest van jobradar; niet breken op 768 px, met één
               controle op 400 px
             - `@umanex/config/tailwind/preset` + `@umanex/ui`; geen nieuwe primitive (die hoort
               in `packages/ui` mét story en Figma-pagina), dus native `select`, `textarea` en
               `input[type=date]` met het bestaande inputrecept
             - Geen nieuwe dependency
             - Alleen rollaag-tokens; geen kicker, geen hero-metric, geen voortgangsring of
               percentage, geen gekleurde linkerrand dikker dan 1 px
             - Nederlands, en de jobradar-conventies: code en commentaar in het Nederlands,
               `Gekeurd<T>`, synchrone transacties (better-sqlite3), relatieve imports in
               `lib/plan` zodat `scripts/ts-resolve.mjs` ze kan laden
             - De app voert geen geregistreerde bedrijfsactie uit: geen berichten, geen
               publicatie, geen betalingen, geen achtergrondautomatisering
```

---

## Open vragen

## Aannames

- `[ASSUMPTION: parkeren zet de geparkeerde actie op "niet gestart"]` — volgende stap, resterende
  inzet en uitzonderingen blijven staan; ze verschijnt weer onder Beschikbaar, wat de waarheid is.
- `[ASSUMPTION: heropenen via de UI gaat naar "niet gestart"]` — direct naar bezig zou midden in de
  flow de focuslimiet kunnen raken. De API laat gereed → bezig wél toe, met dezelfde focus- en
  blokkadecontroles.
- `[ASSUMPTION: A12 hangt alleen van A10 af, niet van A11]` — de opdracht zegt expliciet dat een
  vroege campagne-evaluatie niet geblokkeerd mag worden wanneer nog geen voorstel passend was.
- `[ASSUMPTION: het startbesluit is een vierde record in plan_decisions met soort 'start']` — zo
  draagt het dezelfde velden (beslissing, datum, onderbouwing, vervolgacties) en kan het nooit
  afgeleid worden.
- `[ASSUMPTION: de planningsaannames zijn één bewerkbare tekst in settings, default in code]` — het
  zijn voorlopige getallen om te tonen en te herzien, geen rekenregels.
- `[ASSUMPTION: plan-instellingen op /instellingen, niet in een tweede sheet]` — daar staan de
  andere instellingen van deze app al.
- `[ASSUMPTION: "Open in dashboard" werkt via searchParams tab + zoek op /]` — het dashboard leest
  vandaag geen query-parameters; dit is de kleinste toevoeging die de sprong mogelijk maakt.

## Acceptatie

- [x] Typologie: `/plan` houdt h1 → h2 → h3 zonder overgeslagen niveau op elke tab en met `ActiePanel` open — bewijs: flow-harness, `/plan kopstructuur: 11 koppen, niveaus h1 → h2 → h3` en `plan/acties kopstructuur: 6 koppen, niveaus h1 → h2 → h3`
- [x] Typologie: `ActiePanel` opent als `[role="dialog"]` en de rijenlijst blijft in de DOM — bewijs: flow-harness, `het actiepaneel opent als dialog` en `de actielijst blijft staan (22 → 22)`; de telling is geankerd op `li:has(select)` nadat een kale `li`-telling 40 gaf — blokkade-chips zijn ook lijstitems
- [x] Typologie: geen nieuwe primitive in `packages/ui` — bewijs: `git diff --stat packages/ui` geeft nul regels uitvoer
- [x] Typologie: de gedeclareerde design-systeem-bron blijft kloppen — bewijs: `pnpm ds:guard` → `9/9 apps gedeclareerd en in lijn met de schijf`
- [x] Typologie: voortgang toont het woord "ongewogen" en nergens een percentage — bewijs: de voetnoot in `VoortgangPerPrioriteit.tsx` staat in de opname `na-overzicht.png`, en een grep op `%` in `components/plan/` geeft nul treffers
- [x] Typologie: geen kicker, geen `border-l-[2-9]`, geen voortgangsring — bewijs: `impeccable detect --json` gaf `[]`, mét positieve controle: op een wegwerpbestand met een gradient-titel en een `border-l-4` gaf dezelfde aanroep twee bevindingen
- [x] State *empty*: op een verse database toont Nu bezig "Niets bezig. Start een actie uit Beschikbaar." — bewijs: `plan.png`, opgenomen door de harness op de verse database van de worktree
- [x] State *blocked*: elke actie met een onvervulde afhankelijkheid staat onder Geblokkeerd met minstens één reden-chip — bewijs: `na-overzicht.png` toont zes geblokkeerde acties, elk met een chip; A10 draagt er drie (`wacht op A07 (bezig)`, `wacht op A08 (niet gestart)`, `wacht op A09 (wacht op input)`)
- [x] State *empty*: acties gefilterd tot nul toont de zin over een filter terugzetten — bewijs: Playwright — prioriteit 4 + status gereed brengt de lijst van 22 naar 0 rijen, de zin *"zet een filter terug op Alle"* verschijnt, en de teller leest `0 van 22 acties`
- [x] State *error*: afronden zonder bewijs wordt geweigerd met een leesbare reden — bewijs: `plan:probe` geval 9 — HTTP 400, `reden=afronden vraagt bewijs — wat toont dat het klaar is?`; de knop `Markeer gereed` staat bovendien op `disabled` zolang het veld leeg is
- [ ] State *loading*: `app/plan/loading.tsx` toont "Plan laden…" — bewijs:
  `[NIET TE VERIFIËREN — geen fixture-laag en geen mock-route in jobradar, zie `## Verify-pad` →
  "State forceren"; alleen de bestandsinhoud is te controleren]`
- [x] De aannames dragen zichtbaar het label "voorlopig, nog te toetsen" — bewijs: de badge staat in de `summary` van `Aannames.tsx` en is in `na-overzicht.png` zichtbaar met het blok dicht
- [x] Interactie: de status-select op een rij stuurt één PATCH en de rij toont de nieuwe status — bewijs: `plan:probe` geval 2 — één PATCH, HTTP 200, versie 1 → 2
- [x] Interactie: Gereed kiezen in een rij opent de sheet op Afronden en verstuurt niets — bewijs: Playwright op een wegwerp-database — `dialog open: 1 | PATCH-verzoeken: 0`, met `document.activeElement.id === 'plan-bewijs'`. Sinds de finish-review is dit een aparte knop *Afronden…* in plaats van een optie in de select
- [x] Interactie: "Markeer gereed" is disabled bij leeg bewijs — bewijs: `disabled={bezig || bewijs.trim() === ''}` in `ActiePanel.tsx`, en de API weigert hetzelfde geval (probe 9), dus de rem zit op beide plekken
- [x] Interactie: een vierde start levert een conflict met exact de drie actieve acties — bewijs: `plan:probe` geval 7 — HTTP 409, `conflict=focus`, limiet 3; `plan-scenarios` sectie 7 toetst dat de lijst `A01,A07,A09` is en dat A14 niet stil gestart is
- [x] Interactie: parkeren zet het doel op bezig en de geparkeerde op niet gestart in één PATCH — bewijs: `plan:probe` geval 8 — HTTP 200 en `SELECT status` op A07 geeft `niet_gestart`; de geschiedenis van A07 draagt de reden `geparkeerd voor A14`
- [x] Interactie: heropenen laat bewijs en afrondingsdatum staan — bewijs: `plan:probe` geval 11 — HTTP 200 en `SELECT bewijs` geeft nog altijd `aanbod-document`; A02 krijgt dan het signaal `A01 is heropend en niet meer gereed`
- [x] Interactie: een afhankelijkheid die een cirkel sluit wordt geweigerd mét het pad — bewijs: `plan:probe` geval 12 — HTTP 400, `dit sluit een cirkel: A01 → A02 → A01 — dan kan geen van beide ooit starten`
- [x] Interactie: elke stop in de sheet toont focus, de focus blijft binnen en Escape sluit — bewijs: flow-harness, `9 stops, elk met zichtbare focus`, `de focus blijft binnen het paneel (22 bedienbare elementen)` en `Escape sluit het paneel`. De valcheck staat los van de toetsenbord-pass nadat die eerst "de focus liep het paneel uit" meldde: die pass eindigt zelf op `document.body` en mat dus zijn eigen opruiming
- [x] Interactie: de volledige toetsenbord-pass op `/plan` heeft nul stops zonder zichtbare focus en nul positieve tabindex — bewijs: flow-harness, 72 stops op het overzicht en 54 op het tabblad Acties, elk met zichtbare focus; de cap ligt op 80
- [x] Interactie: koppelen vanuit `ContactPanel` laat de kaart de `PlanBadge` tonen — bewijs: Playwright met één gezaaide lead — na Koppel op A07 en het sluiten van het paneel draagt de kaart de badge `A07`
- [x] Interactie: "Open in dashboard" landt op `/` met de naam in het zoekveld en de juiste tab actief — bewijs: Playwright — de klik landt op `/?tab=leads&zoek=Acme%20Software`, het zoekveld bevat `Acme Software` en de actieve tab is `Leads`. `app/page.tsx` leest die twee parameters nu server-side; de link wees eerst nergens heen
- [x] Interactie: `LeadCard` toont Opvolging en opent `ContactPanel` voor een lead — bewijs: Playwright met één gezaaide lead — de knop staat op de kaart, het paneel opent, en het verzoek is `GET /api/opvolging?type=lead&key=1`
- [x] Edge case: inzet leeg toont "inzet onbekend", 12 uur bij 8 u/dag toont "12 u · 1,5 d" — bewijs: beide staan naast elkaar in `na-overzicht.png` (A13 draagt 12 uur, de rest onbekend); `plan-scenarios` sectie 13 toetst dezelfde omzetting en dat `null` nooit als 0 meetelt
- [x] Edge case: een vervallen afhankelijkheid blokkeert hard, ook met een startuitzondering — bewijs: `plan-scenarios` sectie 5 — de blokkade draagt `hard: true`, de reden vraagt om verwijderen of vervangen, en een start mét uitzondering geeft een conflict; vervangen maakt de actie wél vrij
- [x] Edge case: een beslismoment met alle acties gereed toont "Klaar voor beoordeling — geen goedkeuring" en blijft onbeslist — bewijs: `na-overzicht.png` toont B01 met die pil bij 6 van 6 gereed; `plan-scenarios` sectie 14 toetst dat `beslissing` en `beslistOp` dan NULL zijn
- [x] Edge case: `/plan` op 400 px heeft geen horizontale scrollbalk — bewijs: flow-harness `--smal=400`, `geen horizontale overloop (400 ≤ 400)`. Was eerst 429: de oorzaak is causaal gevonden door elementen één voor één te verbergen, en de fix is in de browser getoetst tegen twee kandidaten die niet werkten
- [x] Edge case: zonder streefdatum staat er geen datum in een actierij — bewijs: `ActieRij.tsx` rendert `streefdatum` nergens, de seed vult er geen enkele, en in `na-overzicht.png` staat in geen enkele rij een datum
- [x] Edge case: de seed twee keer draaien levert 22 acties, en een bewerkte titel en een verwijderde afhankelijkheid blijven — bewijs: `plan-scenarios` sectie 3 (tweede run `gezaaid: false`, titel `Eigen titel` blijft, kant A13←A01 blijft weg); `plan:probe` geval 0/1 — 22 acties na de eerste GET, nog altijd 22 na de tweede
- [x] `pnpm --filter jobradar scenarios` blijft groen, inclusief de nieuwe plan-suite en haar tegenproef — bewijs: `1263 checks over 9 suite(s), en bewezen faalbaar`; de plan-suite draagt er 320 en valt met exit 1 om op zijn geïnjecteerde fout
- [x] `pnpm --filter jobradar plan:probe` draait alle HTTP-gevallen groen — bewijs: 31 genummerde gevallen, `PROBE KLAAR`, met de positieve controle vooraan (22 gezaaide acties, 0 geschiedenisregels) en als slot 23 acties met 23 unieke keys
- [x] Bestaande functionaliteit blijft intact — bewijs: `opvolging:probe` draait zijn twaalf gevallen ongewijzigd af, en `flow --selftest` laat alle drie de ingespoten defecten afgaan
- [x] Geen nieuwe dependency in `apps/jobradar/package.json` — bewijs: `git diff origin/main` op dat bestand toont één toegevoegde regel, het script `plan:probe`

**Waarom de status `gebouwd` is en niet `gevalideerd`.** 39 van de 40 items zijn afgevinkt op een
meting die rood kón worden. Het veertigste — de laadtoestand — is hier niet op te wekken: jobradar
heeft geen fixture-laag en geen mock-route, en dat staat zo in `## Verify-pad` → "State forceren".
Het item blijft dus open met zijn reden, en de status volgt die uitkomst in plaats van hem te
verbergen. `gevalideerd` zou hier betekenen dat ik een as afvink die ik niet gemeten heb.

### Na de finish-review (2026-09-16)

- [x] De app vult nooit zelf een reden in bij uitstellen, wachten of vervallen — bewijs: Playwright — de statuswissel stuurt `0` PATCH-verzoeken tot er een reden staat, de knop is `disabled` zonder en `enabled` met; de woorden "nog te bepalen" en "niet meer aan de orde" komen nergens meer in de pagina voor
- [x] Het startbesluit staat één keer op het overzicht — bewijs: het woord "Startbesluit" komt één keer voor in de tekst van `main`, en de ondertitel leest "22 acties, 3 beslismomenten en het startbesluit"
- [x] De status-select is niet meer zo breed als een opdracht — bewijs: alle 22 selects meten 103 px (was ~200 met de pseudo-optie erin), en er staan 22 aparte knoppen *Afronden…*
- [x] De startvoorwaarde-rijen breken niet af op 1280 px — bewijs: 14 van de 15 rijen zetten hun twee kinderen op dezelfde regel; de vijftiende verschilt 7 px bij een rijhoogte van 34 px, dus dat is verticale centrering en geen afbreking. Horizontale overloop op 1280: 0
- [x] De focus blijft bij de rij die van lijst wisselt — bewijs: na een statuswissel op A01 staat de focus op een `BUTTON` binnen `[data-actie="A01"]`, niet op `body`
- [x] Een afgeronde actie vraagt niet naar zijn eerste zet — bewijs: het veld rendert alleen bij een status buiten `gereed`/`vervallen`, en het afrondblok staat voor die statussen bovenaan het paneel

## Beslissingsgeschiedenis

- 2026-09-16: na de finish-review drie dingen gewijzigd die de opdracht raakten: de app vult geen
  redenen meer in die Jeroen hoort te schrijven, afronden is een knop in plaats van een optie in
  een dropdown, en het startbesluit staat niet langer tussen de drie beslismomenten.
- 2026-09-16: briefing aangemaakt. Eigen model (`plan_*`) in plaats van `next_actions` uitbreiden,
  omdat dat model per constructie één actie per bedrijf draagt en geen afhankelijkheden, bewijs of
  prioriteitsgroepen kent.
