# CLAUDE.md — globale werkprincipes voor umanex

Dit is de globale "operating system" laag voor mijn manier van werken als freelance UX/UI designer en developer. Klant-CLAUDE.md (Columba, Luminus, umanex) extends dit bestand. Project-CLAUDE.md (per project binnen een klant) extends de klant-laag.

Regel: een principe of skill hoort thuis op de **laagste laag waar hij echt verandert**. Wat altijd geldt → hier. Wat per klant verschilt → klant-CLAUDE.md. Wat per project verschilt → project-CLAUDE.md.

---

## Taal en communicatie

**Taal in conversatie:** Nederlands, behalve technische termen die in het Engels blijven (bv. "deze component", "de props", "de state").

**Taal in code:** Engels voor code, variabelen, functienamen, commentaar en commit messages. Nederlands voor uitleg buiten code (markdown documentatie, chat antwoorden, design rationale).

**Toon:** Direct met korte argumentatie. Niet pedagogisch — Jeroen heeft de context al. Geef pushback wanneer een beslissing technische, UX- of business-implicaties heeft die niet evident zijn vanuit de vraag zelf.

**Lengte:** Antwoord + argumentatie + relevante caveats, dan stoppen. Geen volledige uitwerking tenzij gevraagd.

**Formatting:** Markdown is toegestaan waar het de leesbaarheid helpt — lijsten voor opsommingen van 3+, headers voor secties, tabellen voor vergelijkingen. Niet over-formatten: voor losse zinnen of korte antwoorden gewoon proza.

**Emoji:** niet gebruiken tenzij Jeroen er zelf eentje stuurt.

---

## TC-EBC framework

**Wat is TC-EBC**

TC-EBC is een prompt skeleton dat Jeroen gebruikt om design- en prototype-briefings te formaliseren voor ze gebouwd worden. Geen verbose documentatie — een skeleton.

```
T  — Task:        One line describing what the prototype or screen should do
C  — Context:     Where this fits in the product or flow
E  — Elements:    Literal UI components present — keep this a short list
B  — Behaviour:   How users interact with those components
Co — Constraints: Device, layout rules, visual constraints — concise
```

Regels:
- Elke regel zo kort mogelijk
- Alleen wat het model écht moet weten
- Geen verbose documentatie

**Wanneer toepassen**

Bij elke design- of prototype-briefing schrijf je *eerst* een TC-EBC, vóór je de codebase verkent of verduidelijkingsvragen stelt. Dit is geen optionele stap. Geen vraag vooraf — je maakt zelf een TC-EBC voor je begint te bouwen.

Belangrijk: deze stap moet plaatsvinden in de **main agent context**, niet uitbesteed worden aan een sub-agent. Als de hoofd-Claude de briefing krijgt, is de TC-EBC zijn eerste actie.

**Sanity check — voor je begint**

Voor je een TC-EBC schrijft, valideer eerst dat dit effectief een design- of prototype-taak is:

- Bevat de input een UI- of design-element (component naam, scherm, flow, interactie, layout, visueel patroon)? → Door met TC-EBC.
- Gaat de input over puur niet-UI werk (bv. refactor van een hook, performance optimalisatie, bug fix in business logic, debug, deployment)? → Skip TC-EBC. Zeg expliciet: *"Lijkt geen design taak — TC-EBC overgeslagen."*

Bij twijfel: door met TC-EBC. Een onnodige TC-EBC is minder erg dan een gemiste.

**Stappenplan**

1. **Detecteer of de Task duidelijk is**
   - Task duidelijk → ga naar stap 2
   - Task onduidelijk (bv. "doe iets met die sidebar") → vraag eerst om verheldering. Maak nog geen bestand.

2. **Detecteer scope: één of meerdere taken?**
   - Eén coherent geheel → ga naar stap 3
   - Meerdere componenten of features → vraag: *"Wil je hier één TC-EBC voor het geheel, of aparte TC-EBC's per component?"*

3. **Bepaal type** (vaste set):
   - `component` — één UI primitive of compositie
   - `flow` — opeenvolging van schermen of stappen
   - `screen` — volledige pagina of view
   - `feature` — capability die meerdere componenten of schermen kruist
   - Bij twijfel: kies `component`

4. **Detecteer iteratie**
   - Als er al een TC-EBC bestand bestaat met dezelfde basis-naam (zelfde datum + naam), vraag: *"Update bestaand bestand of nieuw bestand?"*
   - Bij "nieuw": voeg `HHMM` suffix toe aan bestandsnaam

5. **Valideer kritische items**
   - Vier items die altijd opgevraagd moeten worden tenzij beantwoord in klant- of projectcontext
   - Voor elk niet-beantwoord item: zet op Open vragen lijst

6. **Schrijf het bestand** (zie locatie en naamgeving hieronder)

7. **Toon TC-EBC inline in chat** als codeblock met expliciete labels. Vermeld het bestandspad en eventuele open vragen. **Niet stilzwijgend overslaan** — gebruiker moet zien wat er is opgeslagen.

**Kritische items (altijd vragen tenzij beantwoord in klant/project context)**

1. **Component-typologie** — sheet / dropdown / modal / aparte pagina / inline
2. **States** — loading / empty / error / success / default
3. **Interactie-modaliteit** — klik / swipe / drag / keyboard / hover
4. **Edge cases** — max waardes, min waardes, validatie regels

Andere items (mogen aanname zijn met `[ASSUMPTION: ...]` marker):
- Doelgroep / persona
- Device / form factor
- Data shape / structuur
- Branding / design system context

**Vragen-formulering per kritisch item**

Wanneer een kritisch item ontbreekt, gebruik deze formuleringen. Bied altijd de meest plausibele optie eerst aan op basis van wat in project-context zichtbaar is.

- *Component-typologie:* "Wordt dit een [meest plausibele optie uit project context], of iets anders zoals [twee andere opties]?"
- *States:* "Welke states zijn van toepassing? Loading is meestal nodig bij data-fetch, empty bij lege resultaten, error bij failure. Welke gelden hier?"
- *Interactie-modaliteit:* "Welke interactie verwacht je: klik, swipe, drag, keyboard? Voor [type component] is [meest plausibele] gebruikelijk."
- *Edge cases:* "Edge cases om te overwegen: minimum aantal items, maximum aantal items, lege staat, validatie. Welke zijn relevant?"

**Inline formaat in chat**

```
TASK:        ...
CONTEXT:     ...
ELEMENTS:    ...
BEHAVIOUR:   ...
CONSTRAINTS: ...
```

**Bestandslocatie**

Standaard: `/briefings/` aan de root van het actieve project. In monorepos kan dit overschreven worden per klant-CLAUDE.md (zie bv. Columba's regel voor `apps/{app}/briefings/`).

Als de folder nog niet bestaat: maak hem aan.

**Bestandsnaamgeving**

Format: `{YYYY-MM-DD}-{type}-{naam}.tcebc.md`

Voorbeelden:
- `2026-04-29-component-filter-bar.tcebc.md`
- `2026-04-29-flow-onboarding.tcebc.md`
- `2026-04-29-feature-mobile-vergelijking.tcebc.md`

Bij naamconflict (bestand bestaat al en gebruiker koos "nieuw"): voeg `HHMM` suffix toe.
- `2026-04-29-1430-component-filter-bar.tcebc.md`

De `.tcebc.md` extensie is een pilot-marker die verifieerbaar maakt dat de TC-EBC-flow correct is doorlopen. Wordt later vervangen door `.md` zodra de flow stabiel is.

**Bestandsinhoud — volledig structuurformaat**

Het bestand bevat: titel met naam, metadata blok (Datum / Type / Project / Klant / Status), een horizontale lijn, het inline TC-EBC codeblock met TASK / CONTEXT / ELEMENTS / BEHAVIOUR / CONSTRAINTS labels, een tweede horizontale lijn, dan de secties Open vragen, Aannames, Acceptatie, en Beslissingsgeschiedenis.

Open vragen-sectie: lijst van kritische items die nog niet beantwoord zijn. Leeg laten als alles beantwoord is.

Aannames-sectie: lijst van items met `[ASSUMPTION]` markers — niet kritisch maar context-afhankelijk.

Acceptatie-sectie: de checklist waartegen de Beoordeel-stap valideert (zie *Plan / Bouw / Beoordeel — werkprincipe*). Eén `- [ ]` item per toetsbaar criterium, afgeleid uit de vier kritische items (component-typologie, states, interactie, edge cases) plus de toetsbare kern van BEHAVIOUR en CONSTRAINTS. De `Status` in het metadata blok doorloopt onder dit principe `gepland → gebouwd → gevalideerd`; `gevalideerd` mag pas zodra elk item `- [x]` is én er geen P0/P1-bevindingen meer openstaan. Bij pure niet-design taken blijft deze sectie leeg — daar leeft het acceptatie-contract los (doel / invariants / done-criteria).

Beslissingsgeschiedenis-sectie: alleen kantelpunten, niet elke kleine wijziging.

Een kantelpunt is: component-typologie gewijzigd (sheet → modal), kritisch element toegevoegd of verwijderd, scope significant verschoven.

Een kantelpunt is NIET: typo's of formuleringsverbeteringen, aanvulling van Open vragen sectie.

Format per regel: `- {YYYY-MM-DD}: {wat veranderd is en waarom}`

**Voorbeelden**

Drie uitgewerkte voorbeelden staan in `umanex-os/docs/tc-ebc-examples/`:
- `01-volledige-briefing-columba.md` — rijke briefing, weinig open vragen
- `02-onvolledige-briefing.md` — minimale briefing, veel kritische items als open vragen
- `03-feature-mobile.md` — niet-component briefing op feature-niveau

---

## Plan / Bouw / Beoordeel — werkprincipe

**Wat het is**

Een lus voor substantieel bouwwerk: **PLAN → BOUW → BEOORDEEL**, herhalend tot de taak *gevalideerd* is. Het is de snelle, per-taak tegenhanger van de trage eval-loop (`vastleggen` → `learnings-verwerken`); de twee koppelen op één punt (zie *Brug*). Bouwt niets nieuws — het knoopt bestaande rollen aan elkaar.

Status: dit is v1, een **werkprincipe** (model-gedreven, geen skill of hook), exact zoals TC-EBC begon. Rijping staat onderaan.

**Wanneer toepassen — de poort**

- **Wel:** design-to-code, nieuw component, feature-flow, en business-logica met afhankelijke berekeningen — werk waar één feat doorgaans meerdere fix-iteraties vraagt.
- **Niet (bouw direct, geen cyclus):** copy-/token-/één-regel-fix, dep-bump, ci/config-sync, rename, pure debug/deploy/infra zonder gedragscontract.
- **Twijfel?** De poort weegt of de Beoordeel-stap iets *meetbaars* heeft om tegen te valideren. Zo niet → geen cyclus.

**De drie rollen** (mapping naar bestaande primitieven, geen nieuwe machinerie)

- **PLAN** — TC-EBC (design, **main-agent only** — harde rail, nooit naar een sub-agent) of een licht **taak-contract** (doel / invariants-regressiechecks / done-criteria) voor refactor/bugfix/infra waar TC-EBC bewust wordt overgeslagen. Levert één machine-leesbare **acceptatie-checklist** (`- [ ]`).
- **BOUW** — main-agent (erft de `@`-import CLAUDE.md-keten met git/Figma/token-rails) of de bouw-skill bij het taaktype: `nieuw-component`, `figma-naar-code`, `code-naar-figma`. Een build-sub-agent alleen bewust — `@`-import-erving is buiten de main-agent niet gegarandeerd.
- **BEOORDEEL** — een panel langs verschillende assen, elk een eigen bril: `code-review` (diff-correctheid, P0-blokker), `verify` (gedrag tegen BEHAVIOUR, P0-blokker), `ux-audit` (design, niet-blokkerend). Bij design-to-code is de **design-snapshot** (traceability-`.md` uit `figma-naar-code` stap 4b) + parity + token-checklist de meetbare as: `verify` dift de gebouwde code tegen de snapshot i.p.v. tegen een vluchtige in-context mapping. De main-agent is **scheidsrechter** en consolideert tot één geprioriteerde P0–P3 fix-lijst. Geef een reviewer-sub-agent **nooit** een hint over de verwachte fout — dat besmet de test (`learnings-verwerken` stap 3-discipline).

**De cyclus en "validatie volledig"**

Itereer BOUW → BEOORDEEL zolang er P0/P1 openstaan. EXIT (status `gevalideerd`) geldt pas wanneer **alle drie** waar zijn:

1. elk acceptatie-item afgevinkt `- [x]`;
2. geen P0/P1 in `code-review` of `verify`;
3. Open vragen leeg.

Harde rail: **max 3 iteraties**. Convergeert het niet → **gecontroleerde stop**: roep `vastleggen` niet-interactief aan (taak-input als Input, de aanhoudende bevinding als Fout) en escaleer naar Jeroen. Nooit stil afsluiten alsof gevalideerd. Ontbreekt de meetbare as (geen render-pad → `verify`/parity vallen terug op "overgeslagen")? Meld dat expliciet; draai de Beoordeel-stap niet alsof hij slaagde.

**Brug naar de eval-loop**

Een gefaalde review die een **terugkerende faalklasse** blootlegt = een `vastleggen`-trigger. De triade is de *feeder* van de trage loop, geen duplicaat. Houd de twee assen uit elkaar: triade-status (`gepland → gebouwd → gevalideerd`, per taak) staat los van learning-status (`open → verified → promoted`, over sessies heen). Die brug is het enige raakpunt.

**Rijping** (zoals TC-EBC: eerst principe, dan hardenen)

- **v1** — dit werkprincipe.
- **v2** — een `cyclus-tot-validatie`-skill die de lus triggerbaar maakt met een Stap-0 overkill-poort; propageert user-level via `sync-os.sh`.
- **v3** — een deterministisch Workflow-script + render-paden per app, pas wanneer de Beoordeel-as echt machine-checkbaar meet. De design-snapshot (`figma-naar-code` stap 4b) is de eerste bouwsteen daarvan: een persistente, diff-bare toetssteen i.p.v. een vluchtige in-context mapping.

---

## Werkprincipes voor code en componenten

**Component structuur**
Strict 1 component = 1 file. Geldt ook voor sub-componenten (CardHeader, CardBody, CardFooter staan elk in hun eigen bestand). Dit zorgt voor een cleane Figma MCP koppeling.

**Naamgeving**
- Components: PascalCase (`Card.tsx`, `FilterBar.tsx`)
- Hooks, utilities, helpers: camelCase (`useFilter.ts`, `formatDate.ts`)
- Folders die één component huisvesten: PascalCase
- Algemene folders: kebab-case (`components/`, `lib/`)

**TypeScript**
- Component props: `type` (niet `interface`)
- Componenten: plain function syntax → `({ x }: Props) => ...` (geen `React.FC`)
- Types staan inline in de component file, tenzij gedeeld door meerdere components — dan apart in `types.ts`
- `any` is niet toegestaan in committed code. In WIP/prototypes mag het tijdelijk, mits TODO comment.

**Folder structuur binnen `components/`**
Standaard set categorieën:

```
components/
├── ui/            (primitives)
├── forms/         (input componenten + form composities)
├── layout/        (header, sidebar, container, grid)
├── feedback/      (toast, alert, empty state, loading, error)
├── navigation/    (tabs, breadcrumbs, menu, pagination)
├── data-display/  (table, list, card, chart)
└── overlay/       (modal, sheet, popover, tooltip)
```

Regels:
- Folders worden aangemaakt zodra er een eerste component voor bestaat (geen lege folders vooraf)
- Bij twijfel over categorisatie: vraag expliciet voor je plaatst

**States zijn default, geen optie**

Voor elk data-gedreven of async component zijn **loading, empty en error** een default onderdeel van de scaffold — niet iets dat pas op vraag toegevoegd wordt. Een component dat bij trage, lege of gefaalde data in een blanco scherm valt, is niet af (de "white screen of death").

De TC-EBC blijft nog steeds vragen *welke* states van toepassing zijn, maar het vertrekpunt keert om: aanwezig, tenzij het component puur presentationeel/statisch is of de briefing ze expliciet uitsluit. Vraag dus welke states afvallen, niet welke erbij moeten. State-componenten horen in `feedback/`.

**Herbruikbaarheid (rule of three + design-system-first)**

Default: rule of three — eerste keer mag inline of project-specifiek, tweede keer extracten en generiek maken, derde keer polishen.

Uitzondering: als een component evident in het design system thuishoort (Button, Input, Card, primitives die overal terugkomen), bouw je het meteen daar (`@columba/ui` of equivalent), niet in app-code.

Bij twijfel of iets in de design system thuishoort: vraag het.

**Acties die altijd eerst moeten worden bevestigd**

1. Bestanden of folders verwijderen
2. Componenten hernoemen of verplaatsen
3. Tokens of design system bestanden wijzigen
4. Nieuwe dependencies installeren (`pnpm add ...`) of bestaande upgraden/downgraden
5. Config bestanden wijzigen (`tsconfig.json`, `next.config.*`, `tailwind.config.*`, `turbo.json`, `package.json` non-trivial wijzigingen)

Voor andere wijzigingen (nieuwe components, refactors binnen één file, bug fixes) hoeft geen toestemming gevraagd te worden — gewoon doen en in de samenvatting noemen wat er gebeurd is.

---

## Git workflow

### Wat mag, zonder vragen
- Read-only: `git status`, `git diff`, `git log`, `git branch`
- Lokaal: `git checkout`, `git checkout -b`, `git pull`, `git add`, `git merge`
- Commits maken op feature branches
- Pushen naar remote (`git push`) — inclusief feature branches die preview deployments triggeren bij Vercel
- Branches aanmaken en verwijderen
- Tags aanmaken en verwijderen
- PR's openen
- Merge naar `main` — mag automatisch, zonder voorafgaande melding. Blijf wel volgens het vaste principe werken: feature branch → PR → merge. Na een geslaagde merge: de feature branch verwijderen (lokaal en remote).

### Wat met melding vooraf
- Na een merge naar `main`: meld kort dat de merge gebeurd is, zodat Jeroen weet dat hij de Vercel production deploy kan triggeren als hij dat wil. (Production blijft handmatig — zie "Wat nooit mag".)

### Wat nooit mag
- Vercel production deployments triggeren. Production blijft handmatig via Jeroen.

### Veiligheidsklep
Commit nooit direct op `main`. Werk altijd op een feature branch. Merges naar main verlopen via een PR of expliciete merge — niet door directe commits op main.

### Branch naming
Format: `<type>/<korte-beschrijving>`

Types:
- `feature/` — nieuwe functionaliteit
- `fix/` — bug fix
- `chore/` — onderhoud, dependencies, config
- `docs/` — documentatie
- `refactor/` — code restructuur zonder gedrag te wijzigen

Voorbeelden:
- `feature/filter-bar`
- `fix/dropdown-zindex`
- `chore/update-deps`

Klantnaam komt **niet** in branchnamen — die zit al in de repo.

### Cross-repo review — normaliseer eerst naar main

Voor élke cross-repo inventarisatie of code review: bepaal per repo eerst `git -C <repo> rev-parse --abbrev-ref HEAD`. Staat een repo NIET op main, dan is de uitgecheckte werkkopie geen canonieke bron — normaliseer eerst (`git -C <repo> checkout main && git -C <repo> pull`) of, als checkout niet wenselijk is, vergelijk expliciet tegen `origin/main` en flag elke afwijking. Dit geldt óók voor umanex-os zelf: rapporteer nooit content van een feature-branch (incl. nog-niet-gemergede skills of uncommitted wijzigingen) als bestaand systeemonderdeel zonder te markeren dat die nog niet op main staat. Behandel nooit een toevallig uitgecheckte staat als de waarheid.

### Commit messages
Format: Conventional Commits in het Engels.

```
<type>[optional scope]: <description>

[optional body]
```

Body toevoegen wanneer:
- de wijziging niet evident is uit de subject alleen
- er een breaking change is
- er context is over *waarom* dit zo gebeurde (niet *wat*)

### PR descriptions
Bij het openen van een PR: default sectie is alleen "Wat" (korte beschrijving van wat dit toevoegt of wijzigt). "Waarom" of "Hoe te testen" toevoegen als de wijziging dat verdient. Bij twijfel: alleen "Wat".

---

## Wanneer vragen om context

**Default houding bij ambiguïteit**
Doen + alternatieven tonen. Maak je beste keuze op basis van project-context, voer uit, en vermeld in de samenvatting welke alternatieven je overwogen hebt. Jeroen wijzigt achteraf indien nodig.

Uitzondering: TC-EBC kritische items en "altijd vragen" acties blijven vraag-waardig.

**Wanneer *niet* vragen — gewoon doen**
- Variabele- en functienamen kiezen
- Folder structuur binnen een component (waar een helper file staat)
- Welke ShadCN/UI primitive gebruiken voor een gekend pattern
- Comment style in code (eenregelig vs multi-line)
- Volgorde van imports
- Welke hook signature kiezen (return tuple vs object)
- Of een type union of enum gebruiken
- Of een useMemo of useCallback toevoegen voor performance

**Styling beslissingen**
Leid af uit project-context (bestaande tokens, andere componenten in dezelfde folder, design system referenties). Als er geen referentie is, vraag voor je kiest.

**Icoonset**
Wordt vastgelegd in de klant- of project-CLAUDE.md. Globaal: gebruik wat in de klant- of projectcontext is vastgelegd. Als er niets is, vraag.

**Hoe meerdere vragen presenteren**
Gegroepeerd per onderwerp. Eén vraag = gewoon stellen. Meerdere vragen die samenhangen = gegroepeerd in één bericht. Vragen die over verschillende onderwerpen gaan = aparte berichten of duidelijk gegroepeerd.

**"Do as you see fit"**
Wanneer Jeroen carte blanche geeft, beslis je autonoom — *behalve* voor TC-EBC kritische items (component-typologie, states, interactie, edge cases) en de "altijd eerst bevestigen" acties (verwijderen, hernoemen, design system wijzigen, dependencies installeren, config wijzigen). Die rails staan er niet voor niets.

Geef achteraf een samenvatting van genomen beslissingen en alternatieven die je overwogen hebt.

---

## Figma, design tokens en bestand-referenties

**Figma node referenties**

In chat: alleen de naam.
> *"Pas de padding aan op de FilterCard"*

In TC-EBC briefings, PR descriptions en commit messages: naam + klikbare URL.
> *"Pas de padding aan op [FilterCard](https://www.figma.com/design/abc123/...?node-id=142-3801)"*

**Design tokens**

Verwijs altijd naar tokens via het token path (Tokens Studio notatie):
> *"Gebruik color.primary.500 voor de border"*

Reden: token path is bron-van-waarheid neutraal — werkt in Figma, JSON, CSS variables én Tailwind. Beschermt tegen verwarring tussen klanten met verschillende Tailwind-configuraties.

In code zelf vertaal je wel naar de juiste implementatie (Tailwind class, CSS variable, etc.). Maar wanneer je *over* tokens praat in chat, briefings of rationale: altijd het path.

**Alleen token-mapping, geen hardcoded values**

Werk uitsluitend met de mapping uit `tokens.json` (via de Tokens Studio + Style Dictionary pipeline). Hardcoded waardes — losse hex-kleuren, pixel-spacings, font-sizes, radii, shadows die niet uit een token komen — worden vermeden in committed code.

Wanneer een benodigde waarde geen token heeft: **eerst vragen** of er een token toegevoegd moet worden, niet stilzwijgend hardcoden. In WIP/prototype mag een hardcoded waarde tijdelijk, mits `// TODO:` comment die naar de ontbrekende token verwijst.

**Altijd de meest recente `tokens.json` ophalen**

Vóór design- of token-werk: haal eerst de meest recente `tokens.json` op via GitHub (`git pull` van de tokens-bron op de actieve branch). Zo wordt nooit met een stale token-set gewerkt.

Welke repo en welk pad de tokens-bron is, verschilt per klant en wordt in de klant- of project-CLAUDE.md vastgelegd (bv. Columba: `tokens.json` → `packages/tokens/build/variables.css`). Bij twijfel over de bron: vraag voor je begint.

**Bestand- en code-locatie referenties**

Altijd vol pad vanaf project root. Geen compacte vorm, geen "in FilterBar.tsx" zonder pad.

> *"In `apps/enviro/src/components/forms/FilterBar.tsx`, regel 42, vervangen we de useState door..."*

Reden: in monorepos bestaat dezelfde filename vaak in meerdere apps.

**Referentie-schermen (`reference/`)**

Een project mag een `reference/`-map aan de root hebben (in monorepos: `apps/{app}/reference/`) met echte schermen, screenshots of exports die als **visuele context** dienen — bestaande app-schermen, concurrenten, inspiratie, of states die niet makkelijk uit Figma komen.

Dit is géén token-bron (dat blijft `tokens.json`) en geen Figma-vervanger (dat blijft live via Console MCP) — het is vastgelegd referentiebeeld. Verwar het niet met `public/images/` (runtime-assets die de app zelf toont).

Regel: bestaat er een `reference/`-map, lees dan de relevante schermen vóór je bouwt of audit — bij een TC-EBC, in `nieuw-component`, en bij `ux-audit`.

**Figma Console MCP — primaire tool voor alle Figma-operaties**

Figma Console MCP (Desktop Bridge Plugin API) is de primaire tool voor **alles** in Figma — lezen én schrijven. Geen lees/schrijf split.

    Alle Figma-operaties  → Figma Console MCP (via Desktop Bridge)
    Native Figma MCP      → uitsluitend als fallback (Desktop Bridge niet beschikbaar)

**Native MCP is fallback-only.** Het is nooit de aangewezen tool voor een taak — het wordt uitsluitend gebruikt wanneer de Desktop Bridge niet beschikbaar is en de gebruiker daar expliciet voor kiest.

**Figma Code Connect wordt niet gebruikt** — noch native, noch via Console. Stel geen Code Connect mappings voor of in.

**Desktop Bridge check — altijd eerst**

Start elke Figma-operatie met `figma_get_status`. Als de Bridge niet actief is:
- Vraag: *"Wil je Desktop Bridge activeren, of overschakelen naar native MCP?"*
- Wacht op antwoord voor je verdergaat
- Ga **nooit** stilzwijgend over naar native MCP

**Figma → code**

Gebruik de `figma-naar-code` skill. Die is leidend voor alle stappen, token mapping en verificatie.

**Code naar Figma workflow**

Bij het omzetten van code naar Figma met volledige token binding:

1. `figma_get_status` — Desktop Bridge check
2. Parallel: `figma_get_variables` + `tokens.json` lezen
3. Lookup bouwen + gap-analyse — `token path → Figma variable ID`, ontbrekende variabelen aanmaken (`figma_create_variable`) of importeren (`figma_import_library_variable`) vóór execute
4. `figma_execute` — `setBoundVariable` voor fills/spacing/radius, text styles, effect styles, auto layout structuur, component variants voor states
5. `figma_take_screenshot` — visuele check
6. `figma_get_component_for_development_deep` — verifieer dat alle `boundVariables` de juiste IDs bevatten, geen hardcoded values

Hardcoded values in Figma (`fills = [{color: {r,g,b}}]` zonder variable binding) zijn het equivalent van hardcoded hex in code — verboden in committed work.

**Vermeld altijd welke MCP je gebruikt**

Bij elke Figma-stap: noem expliciet Console MCP of native MCP. Geen impliciete keuzes.

---

## Markdown en syntaxregels

Sectie waar regels verzameld worden die doorheen sessies opduiken — dingen die fout liepen en niet meer mogen gebeuren.

**Geneste codeblocks in markdown**
Wanneer markdown wordt geschreven die zelf codeblocks bevat: gebruik viervoudige backticks rond de buitenste block, of gebruik geïndenteerde code (4 spaties) voor de inner block. Anders sluit de inner block voortijdig de outer af. Test geneste markdown mentaal voor je hem post.

**Markers**
- `[ASSUMPTION: ...]` — voor aannames in TC-EBC briefings of code waar context ontbrak
- `// TODO: ...` — voor open taken in code