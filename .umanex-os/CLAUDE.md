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

**Kritische items (altijd vragen tenzij beantwoord in klant/project context)**

Component-typologie · States · Interactie-modaliteit · Edge cases. Alle vier moeten
beantwoord zijn of op de Open vragen lijst staan. De `tc-ebc` skill heeft per item de
vraag-formulering.

**Uitvoering — roep de `tc-ebc` skill aan**

Ga je een TC-EBC effectief schrijven, lees dan eerst de **`tc-ebc` skill**. Die bevat het
stappenplan, de vraag-formuleringen per kritisch item, de bestandslocatie en -naamgeving, en
het bestandsformaat met de acceptatie-checklist. Schrijf er nooit één op de gok zonder de
skill te lezen — dat bestandsformaat is precies wat de Beoordeel-stap later toetst.

**Inline formaat in chat**

```
TASK:        ...
CONTEXT:     ...
ELEMENTS:    ...
BEHAVIOUR:   ...
CONSTRAINTS: ...
```

---

## Plan / Bouw / Beoordeel — werkprincipe

**Wat het is**

Een lus voor substantieel bouwwerk: **PLAN → BOUW → BEOORDEEL**, herhalend tot de taak *gevalideerd* is. Het is de snelle, per-taak tegenhanger van de trage eval-loop (`vastleggen` → `learnings-verwerken`). Bouwt niets nieuws — het knoopt bestaande rollen aan elkaar.

**Wanneer toepassen — de poort**

- **Wel:** design-to-code, nieuw component, feature-flow, en business-logica met afhankelijke berekeningen — werk waar één feat doorgaans meerdere fix-iteraties vraagt.
- **Niet (bouw direct, geen cyclus):** copy-/token-/één-regel-fix, dep-bump, ci/config-sync, rename, pure debug/deploy/infra zonder gedragscontract.
- **Twijfel?** De poort weegt of de Beoordeel-stap iets *meetbaars* heeft om tegen te valideren. Zo niet → geen cyclus.

**De drie rollen** — PLAN levert de acceptatie-checklist (TC-EBC bij design, **main-agent only**; een licht taak-contract bij refactor/bugfix/infra), BOUW draait in de main-agent of de bouw-skill bij het taaktype, BEOORDEEL is een panel van `code-review` · `verify` · `ux-audit` · `security-audit` met de main-agent als scheidsrechter. De **`cyclus-tot-validatie` skill** heeft de volledige mapping, het panel per as en de reviewer-discipline — lees hem voor je de lus start.

**De cyclus en "validatie volledig"**

Itereer BOUW → BEOORDEEL zolang er P0/P1 openstaan. EXIT (status `gevalideerd`) geldt pas wanneer **alle drie** waar zijn:

1. elk acceptatie-item afgevinkt `- [x]`;
2. geen P0/P1 in `code-review`, `verify` of (bij backend-werk) `security-audit`;
3. Open vragen leeg.

Harde rail: **max 3 iteraties**. Convergeert het niet → **gecontroleerde stop**: roep `vastleggen` niet-interactief aan (taak-input als Input, de aanhoudende bevinding als Fout) en escaleer naar Jeroen. Nooit stil afsluiten alsof gevalideerd. Ontbreekt de meetbare as (geen render-pad → `verify`/parity vallen terug op "overgeslagen")? Meld dat expliciet; draai de Beoordeel-stap niet alsof hij slaagde.

**Discipline in de Beoordeel-stap**

*De Beoordeel-stap schrijft.* Bouwen, migreren en installeren zijn geen observaties — ze veranderen de schijf. Leest er een langlopend proces uit diezelfde plek (dev-server, PM2-app, gedeelde database), dan deployt je verificatie ongewild, en de schade valt buiten je blikveld: jij ziet "build ok" en exit 0, de gebruiker ziet een witte pagina. Kijk daarom vóór een build in een repo met draaiende processen of er iets uit die map serveert (`pm2 status`, `lsof -nP -iTCP:<poort> -sTCP:LISTEN`); zo ja, gebruik het script dat bouwen en herstarten koppelt (bv. `pm2:rebuild`), of bouw naar een aparte map. Achteraf telt niet de exit code, maar of de app nog serveert wat ze zegt te serveren.

*Verifieer op het doelwit van de gebruiker.* Een groene check op een ander toestel, een andere build of een andere omgeving dan waar de gebruiker de fout ziet, bewijst niets over zijn geval. Draai de volledige cyclus — herstart of reload inbegrepen — op hetzelfde doelwit, of meld expliciet dat je op een surrogaat getest hebt en wat dat níet uitsluit.

*Nooit een destructief pad tegen productiedata.* Het vorige principe zegt "draai op het echte doelwit"; dit begrenst het. Verwijderen, wissen, overschrijven of een migratie draaien op data die de gebruiker echt gebruikt, is geen verificatie maar schade met een rapport eraan vast. Dat de uitkomst goed afliep bewijst niets: de beslissing was al fout op het moment dat je hem nam, want je kende de uitkomst niet. Bouw het bewijs daarom om het pad heen: **toets de guard in plaats van het effect** (roep het beschermde pad aan zónder rechten en toon dat de data ná afloop onveranderd is), **draai de logica op synthetische invoer** (dezelfde transformatie op een verzonnen rij in een `select`, geen `update`), of gebruik een **testaccount met seed-data**. Kan geen van die drie, dan is het item `[NIET TE VERIFIËREN — destructief pad, geen testaccount]` — een leemte, geen reden om het toch te draaien. Vraag het pas als je het écht wil uitvoeren, en vraag het vooraf.

*Bij afhankelijke berekeningen is de invariant de meetbare as.* Volgt een waarde uit een andere — een saldo dat doorrolt, een provisie die afgetrokken wordt, een subtotaal dat uit losse posten opgebouwd wordt — dan valideert een controle scherm per scherm niets. Elke fix is er lokaal correct terwijl dezelfde afgeleide waarde elders anders berekend blijft: je patcht de instanties en de klasse blijft leven. PLAN levert daarom minstens één **invariant** die over het hele model moet gelden (`eindsaldo maand N == beginsaldo maand N+1`, `som(posten) == subtotaal`, `totaal na verwijderen == totaal vóór toevoegen`), en BEOORDEEL rékent die uit over een echte dataset in plaats van de uitkomst af te lezen. Bestaat er al een scenario-harness, dan hoort ze in CI naast de andere guards — een harness die door niets aangeroepen wordt, meet niets.

**Brug naar de eval-loop**

Een gefaalde review die een **terugkerende faalklasse** blootlegt = een `vastleggen`-trigger. De triade is de *feeder* van de trage loop, geen duplicaat. Houd de twee assen uit elkaar: triade-status (`gepland → gebouwd → gevalideerd`, per taak) staat los van learning-status (`open → verified → promoted`, over sessies heen). Die brug is het enige raakpunt.

---

## Root cause boven patch — werkprincipe

Bij een probleem, bug of gefaalde check: zoek de onderliggende oorzaak en los díe op, niet enkel het symptoom. Een patch die het zichtbare gedrag maskeert terwijl de oorzaak blijft bestaan, verplaatst het probleem — hij lost het niet op. Dit geldt breed: code, tooling, pipeline, proces.

**De toets — patch of root cause?**
- Kan dezelfde oorzaak elders opnieuw toeslaan? Dan is een lokale fix een patch.
- Fix je het gevolg (de foutmelding, de kapotte output) of de reden waaróm dat gevolg ontstaat?
- Voorbeeld uit deze codebase: bij een kapotte DTCG-build is de root cause een custom format die `token.value` i.p.v. `token.$value` leest — niet de ontbrekende output-waarde die je ook handmatig zou kunnen bijvullen.

**Toets een bewering over een bibliotheek aan de geïnstalleerde bron.** Die staat in `node_modules` — lees hem vóór je een fix bouwt op wat een API "zou moeten" doen. Hoe stelliger de bewering, hoe kleiner de kans dat ze nagekeken is, en een typecheck die slaagt zegt niets over een verkeerd begrepen contract. Dezelfde vorm als de DTCG-valkuil verderop.

**Wanneer een patch tóch mag** — tijdsdruk, een echt lokaal incident, of de root cause zit buiten scope. Dan geldt: benoem het expliciet als patch en maak de oorzaak zichtbaar — een `// TODO:` die naar de root cause wijst, of een `vastleggen`-entry bij een terugkerende faalklasse. Nooit stilzwijgend om een oorzaak heen werken en het als opgelost rapporteren.

**Koppeling met de eval-loop.** Dit principe is de attitude achter de trage loop: een terugkerende faalklasse hoort niet per instantie gepatcht, maar via `vastleggen` → `learnings-verwerken` structureel gehard aan de root (juiste CLAUDE.md-laag of code-guard). De Plan / Bouw / Beoordeel-triade is de per-taak tegenhanger — een gefaalde review los je op bij de oorzaak, niet met een cosmetische fix die de check net doet slagen.

---

## Sessie-reflectie en handoff — werkprincipe

Aan het einde van een substantiële sessie: een kritisch, eerlijk retrospectief dat de vluchtige context vastlegt vóór ze verdampt. Niet vleiend — de waarde zit in wat Claude zelf naar boven haalt: onzekerheden, onuitgesproken aannames, blinde vlekken, toekomstig breukrisico, de eerste zet voor de volgende keer. Dit draait via de **`sessie-reflectie` skill**, die de werkwijze bevat.

**Router, geen silo.** De reflectie is een *feeder* die elke bevinding naar het juiste bestaande huis stuurt — geen parallelle opslag (root cause boven patch):
- terugkerende **faalklasse** → `vastleggen` (LEARNINGS, de eval-loop);
- **durend feit** over Jeroen/project → auto-memory;
- **vooruitkijkend & sessie-gebonden** (onzekerheid, aanname, risico, next-step, idee, debt) → `HANDOFF.md`.

**Grens met de eval-loop.** Een fout hoort in LEARNINGS mét zijn verificatie-input, niet in HANDOFF; HANDOFF is enkel het vooruitkijkende restant dat (nog) geen fout is. `HANDOFF.md` is gelaagd (globaal `umanex-os/` / klant repo-root / project `apps/{app}/`) met statussen `open → resolved`; open items komen bij sessiestart automatisch mee via `session-start-handoff.sh`. Diezelfde hook toont ook de LEARNINGS-entries op `open` (nog te verifiëren) en `verified` (bewezen, nog niet gehard) — zonder die herinnering was de eval-loop de enige lus zonder trigger, en bleven bewezen lessen wekenlang ongepromoveerd.

**Een faalklasse hoeft niet in de sessie te zijn opgetreden.** `vastleggen` vangt van nature alleen wat iemand zag misgaan. Een klasse die zich over weken opstapelt — dezelfde soort `fix(...)` die telkens terugkomt, een as die geen enkele guard dekt — wordt pas zichtbaar door terug te kijken. De `sessie-reflectie` skill stelt die vraag expliciet; het antwoord is een `vastleggen`-trigger als elke andere, met een reproduceerbaar commando in plaats van een prompt als Input.

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

### Parallel werk — één app, één worktree

Twee taken tegelijk in één working tree lopen door elkaar. Niet soms: gegarandeerd. `git add -A` veegt het in-flight werk van de andere taak mee, de commit slaagt, en CI blijft groen omdat die de hele repo bouwt — een verdwaald bestand compileert gewoon mee. Git kan niet scheiden wat op schijf niet gescheiden is, dus discipline is hier geen oplossing.

**Een branch lost dit niet op.** Er is één set bestanden op schijf, gedeeld door élke branch. Niet-gecommitte en ongetrackte bestanden reizen mee bij iedere `checkout`, ongeacht op welke branch je staat. Wie netjes per taak vertakt en tóch in één tree werkt, heeft het probleem nog steeds.

Daarom is de eenheid de **app**, niet de taak. Elke app waaraan actief gewerkt wordt krijgt een eigen worktree, permanent:

```bash
git worktree add ../<repo>-<app> -b <type>/<korte-beschrijving>
# ... werk, commit, PR; de volgende taak vertakt in dezelfde map ...
```

Per taak vertak je bínnen die map; de map zelf blijft staan. De hoofdtree houd je vrij voor gedeelde lagen (`packages/`, tokens, CI) — daar hoort geen app-werk meer te gebeuren.

"Eén taak, één worktree" vraagt een beslissing precies op het moment dat je haast hebt. "Eén app, één worktree" vraagt niets: de map staat er al.

Eigen bestanden, eigen branch, eigen index — ze kunnen elkaar fysiek niet raken. De `.githooks`-hooks rijden automatisch mee: `core.hooksPath` staat in de gedeelde git-config en de hooks zelf staan in de repo.

Wat **wel** gedeeld blijft en dus botst: draaiende dev-servers en hun poorten, PM2-processen, en native build-caches. Draai dezelfde app niet vanuit twee worktrees. Voor een monorepo met een package manager: reken op één install per worktree (met pnpm is dat vooral tijd, nauwelijks schijf — de store linkt hard).

Blijf je toch in één tree, dan geldt: nooit `git add -A`, altijd per pad stagen.

**Werk nooit in andermans tree.** Zit er iemand anders — of een agent — in dezelfde map, blijf er dan af, ook voor "even een branch aanmaken". Een branch die je vanaf andermans HEAD aanmaakt, erft diens werk als vertrekpunt.

**Bij het mergen.** Gebruik `gh pr merge --delete-branch` niet zolang er een andere branch in dezelfde tree leeft: die vlag verplaatst HEAD naar een willekeurige andere lokale branch. Check eerst expliciet `main` uit, merge daarna, ruim de branch apart op.

**Twee guards.** `.githooks/pre-commit` weigert een commit op `main`/`master` en op een losse HEAD — de veiligheidsklep is daarmee afdwingbaar in plaats van een goed voornemen, en een geparkeerde worktree kan geen commit stil kwijtraken. Rebase, cherry-pick en een lopende merge laat hij met rust. `.githooks/commit-msg` blokkeert een commit met een app-scope die een ándere app raakt — `fix(cashflow):` mag niet aan `apps/rowtrack/` komen. Scopes die géén app zijn (`chore:`, `feat(tokens):`, `refactor(config):`) blijven vrij: een gedeelde laag hoort in één commit met de apps die hij aanpast. Is een cross-app commit écht bedoeld, zet dan een `Cross-app: <reden>` trailer in de body — expliciet en greppable. `--no-verify` is de slechtere weg: dat slaat álle hooks over, ook de snapshot- en token-sync.

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

**Token-formaat: W3C DTCG (standaard voor alle apps)**

De canonieke `tokens.json` is **W3C DTCG**: elke leaf gebruikt `$value` + `$type` (niet de Tokens Studio classic `value`/`type`). In Tokens Studio is dit een export-instelling ("Convert to W3C DTCG format"). Alle apps — bestaand én nieuw — volgen dit; het is het formaat dat `sync-tokens.js` en de Style Dictionary v4-pipeline verwachten. Een classic-format `tokens.json` geeft in `sync-tokens.js` 0 tokens.

**Build-valkuil (DTCG):** een custom Style Dictionary format of transform leest de getransformeerde waarde van **`token.$value`** (fallback `?? token.value`), nooit enkel `token.value` — bij DTCG landt de waarde op `$value`. Een custom format die `token.value` leest, produceert **stil `undefined`**: de build slaagt zónder error maar de output is kapot. Built-in formats (`css/variables`) handelen DTCG zelf af; enkel custom formats zijn de val. Verifieer een DTCG-build daarom altijd door te herbouwen en de output op echte waarden te checken, niet enkel op een geslaagde exit.

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

**Code → Figma**

Gebruik de `code-naar-figma` skill. Die is leidend voor alle stappen: Bridge-check, variabelen-lookup en gap-analyse, de `setBoundVariable`-execute, screenshot-verificatie en de deep-check op `boundVariables`.

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