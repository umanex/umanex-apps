# Bedrijfsplan 2027

---
Datum:   2026-09-16
Type:    feature
Project: jobradar
Klant:   umanex
Status:  gepland
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

- [ ] Typologie: `/plan` houdt h1 → h2 → h3 zonder overgeslagen niveau op elke tab en met
  `ActiePanel` open — bewijs: kopstructuur-pass van de flow-harness
- [ ] Typologie: `ActiePanel` opent als `[role="dialog"]` en de rijenlijst blijft in de DOM —
  bewijs: `li`-telling vóór en na het openen
- [ ] Typologie: geen nieuwe primitive in `packages/ui` — bewijs: `git diff --stat packages/ui` leeg
- [ ] Typologie: de gedeclareerde design-systeem-bron blijft kloppen — bewijs: `pnpm ds:guard` exit 0
- [ ] Typologie: voortgang toont het woord "ongewogen" en nergens een percentage — bewijs: DOM-tekst
  van de voortgangssectie
- [ ] Typologie: geen kicker, geen `border-l-[2-9]`, geen voortgangsring — bewijs:
  `impeccable detect --json` op `components/plan` en `app/plan`
- [ ] State *empty*: op een verse database toont Nu bezig "Niets bezig. Start een actie uit
  Beschikbaar." — bewijs: flow-harness op een wegwerp-database
- [ ] State *blocked*: op een verse database staat elke actie met een onvervulde afhankelijkheid
  onder Geblokkeerd met minstens één reden-chip — bewijs: chip-telling ≥ aantal geblokkeerde rijen
- [ ] State *empty*: acties gefilterd tot nul toont de zin over een filter terugzetten — bewijs:
  tekstmatch in de DOM
- [ ] State *error*: afronden zonder bewijs levert een `role="alert"` ín de sheet en de sheet blijft
  open — bewijs: de PATCH geeft 400 en het alert-element staat in de DOM
- [ ] State *loading*: `app/plan/loading.tsx` toont "Plan laden…" — bewijs:
  `[NIET TE VERIFIËREN — geen fixture-laag en geen mock-route in jobradar, zie `## Verify-pad` →
  "State forceren"; alleen de bestandsinhoud is te controleren]`
- [ ] De aannames dragen zichtbaar het label "voorlopig, nog te toetsen", open én dicht — bewijs:
  DOM-tekst van het `details`-element in beide toestanden
- [ ] Interactie: de status-select op een rij naar Bezig stuurt precies één PATCH — bewijs:
  request-telling in de harness
- [ ] Interactie: Gereed kiezen in een rij opent de sheet op Afronden en verstuurt niets — bewijs:
  `document.activeElement.id === 'bewijs'` en nul requests
- [ ] Interactie: "Markeer gereed" is disabled bij leeg bewijs en enabled na één teken — bewijs: het
  `disabled`-attribuut vóór en na het typen
- [ ] Interactie: een vierde start toont het conflictblok met exact drie keys, elk met een
  Parkeer-knop — bewijs: telling van de knoppen in het blok
- [ ] Interactie: parkeren zet het doel op bezig en de geparkeerde op niet gestart in één PATCH —
  bewijs: `SELECT status` op beide rijen na één request
- [ ] Interactie: heropenen laat bewijs en afrondingsdatum zichtbaar staan — bewijs: beide waarden
  nog aanwezig in de DOM en in de database na de heropening
- [ ] Interactie: een afhankelijkheid die een cirkel sluit levert een alert met beide keys en een
  ongewijzigde lijst — bewijs: 400-respons plus gelijke `li`-telling
- [ ] Interactie: elke stop in de sheet toont focus, focus blijft binnen, Escape sluit — bewijs:
  trap-bewuste toetsenbord-pass van de harness op het geopende paneel
- [ ] Interactie: de volledige toetsenbord-pass op `/plan` heeft nul stops zonder zichtbare focus en
  nul positieve tabindex — bewijs: harness-uitvoer met het gemeten aantal stops
- [ ] Interactie: koppelen vanuit `ContactPanel` laat de kaart de `PlanBadge` tonen — bewijs: de
  badge staat in de DOM van het dashboard na de refresh
- [ ] Interactie: "Open in dashboard" landt op `/` met de naam in het zoekveld en de juiste tab
  actief — bewijs: URL plus de waarde van het zoekveld
- [ ] Interactie: `LeadCard` toont Opvolging en opent `ContactPanel` voor een lead — bewijs: het
  verzoek naar `/api/opvolging` draagt `type=lead`
- [ ] Edge case: inzet leeg toont "inzet onbekend", 12 uur bij 8 u/dag toont "12 u · 1,5 d" —
  bewijs: DOM-tekst van beide rijen
- [ ] Edge case: een vervallen afhankelijkheid blokkeert hard, ook met een startuitzondering —
  bewijs: scenario-check plus 409 op de probe
- [ ] Edge case: een beslismoment met alle acties gereed toont "Klaar voor beoordeling" en
  `beslist_op` blijft NULL — bewijs: DOM-tekst plus `SELECT beslist_op`
- [ ] Edge case: `/plan` op 400 px heeft geen horizontale scrollbalk — bewijs:
  `document.documentElement.scrollWidth <= 400` in de harness
- [ ] Edge case: zonder streefdatum staat er geen datum in een actierij — bewijs: regex op de
  gerenderde tekst buiten geschiedenis en afrondingsdatum
- [ ] Edge case: de seed twee keer draaien levert 22 acties, en een bewerkte titel en een
  verwijderde afhankelijkheid blijven weg — bewijs: scenario-check plus twee GET's in de probe
- [ ] `pnpm --filter jobradar scenarios` blijft groen, inclusief de nieuwe plan-suite en haar
  tegenproef — bewijs: exit 0 op de run en exit niet-nul op `SCENARIO_SELFTEST=1`
- [ ] `pnpm --filter jobradar plan:probe` draait alle HTTP-gevallen groen — bewijs: exit 0 met de
  positieve controle vooraan (22 acties, 0 geschiedenisrijen)
- [ ] Bestaande functionaliteit blijft intact — bewijs: `opvolging:probe` en `flow --selftest`
  ongewijzigd groen
- [ ] Geen nieuwe dependency in `apps/jobradar/package.json` — bewijs: `git diff` op dat bestand
  toont alleen script-regels

## Beslissingsgeschiedenis

- 2026-09-16: briefing aangemaakt. Eigen model (`plan_*`) in plaats van `next_actions` uitbreiden,
  omdat dat model per constructie één actie per bedrijf draagt en geen afhankelijkheden, bewijs of
  prioriteitsgroepen kent.
