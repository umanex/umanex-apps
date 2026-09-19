# Eén navigatie over de drie routes van jobradar

- **Datum:** 2026-09-19
- **Type:** feature
- **Project:** apps/jobradar
- **Klant:** umanex
- **Status:** gevalideerd — 2026-09-19, 67 acceptatie-items op bewijs, 0 bevindingen in de flow-run na de reviewronde

---

```
TASK:        Vervang de drie eigen headers van jobradar door één balk in app/layout.tsx, en geef
             /instellingen één primaire actie per sectie.

CONTEXT:     Fase 4c van het plan na de critique van 2026-09-17 (23/40, issue 5: "plan en
             instellingen voelen als bijlagen"). /, /plan en /instellingen dragen vandaag elk hun
             eigen kop met eigen links: het dashboard linkt naar Bedrijfsplan en Instellingen, het
             plan linkt terug met een pijl en naar Instellingen#bedrijfsplan, de instellingen linken
             alleen terug. Waar je bent en waar je heen kunt verschilt dus per pagina. Toon =
             gewicht verdelen: de balk treedt terug, de pagina spreekt.

ELEMENTS:    Nieuw components/layout/AppHeader.tsx (app-compositie, geen primitive): wordmerk
             "JobRadar" + drie links Radar · Plan · Instellingen, met aria-current op de huidige.
             Gemonteerd in app/layout.tsx, dus ook op de foutpagina, de 404 en de drie
             laadtoestanden. Weg: de kopblokken in DashboardClient.tsx:513-536,
             PlanClient.tsx:415-465 (alleen het nav-deel) en app/instellingen/page.tsx:28-40.
             Blijft op de pagina: SyncButton, de twee export-links van het plan.

BEHAVIOUR:   Klik en toetsenbord. De link van de actieve route draagt aria-current="page" en is
             niet klikbaar-anders — een querystring (/?tab=leads) of hash (#bedrijfsplan) verandert
             de markering niet. De balk is op elke route de eerste tab-stop. Op / verdwijnt de
             zichtbare titel "JobRadar" (de balk zegt het al); een onzichtbare kop "Radar" houdt de
             kopstructuur heel. Plan en Instellingen houden hun zichtbare titel. Op /instellingen
             draagt elke sectie één gevulde knop (Opslaan) naast omrande of tekstknoppen, alle op
             dezelfde hoogte.

CONSTRAINTS: Geen nieuwe primitive — NavigationMenu komt uit bibliotheekbatch 2 en is hier niet
             nodig; de balk is jobradar-eigen. Styling alleen via rol-utilities uit
             @umanex/config/tailwind/preset; geen nieuwe layout-rol (een rol ontstaat pas bij twee
             componenten met dezelfde maat op een vergelijkbare plek — dit is er één). Balk
             full-bleed met border-b, binnencontainer max-w-7xl, gelijk aan de breedste route.
             /plan op 400 px blijft zonder overloop. De harness-ankers die aan de oude headers
             hangen verhuizen mee, en een check die daardoor per constructie waar wordt, wordt
             vervangen — niet stil groen gelaten.
```

---

## Open vragen

Geen. De twee die er waren zijn op 2026-09-19 beslist door Jeroen — zie Beslissingsgeschiedenis.

## Aannames

- `[ASSUMPTION: de balk is full-bleed met een binnencontainer op max-w-7xl. Op /instellingen (max-w-3xl) staat het wordmerk daardoor links van de inhoudsrand. Standaardpatroon; als het stoort is het één klasse.]`
- `[ASSUMPTION: de hoogte komt uit de schaal (py-3 + px-4 sm:px-6 lg:px-8, gelijk aan de paginacontainers), niet uit een nieuwe layout-rol.]`
- `[ASSUMPTION: het wordmerk "JobRadar" is geen link. Het staat naast een link "Radar" die naar / wijst; twee links naar dezelfde route naast elkaar geeft een schermlezer twee keer hetzelfde doel.]`
- `[ASSUMPTION: de routetitel van / wordt "Radar — JobRadar" in plaats van "Dashboard — JobRadar", zodat de titelwissel hetzelfde woord gebruikt als het menu-item. Next kondigt een client-navigatie alleen aan bij een titelwissel, dus de titel moet blijven verschillen per route.]`

## Acceptatie

### Kritische assen

- [x] Typologie — `components/layout/AppHeader.tsx` bestaat en wordt geïmporteerd in `app/layout.tsx` (grep, beide bestanden) — bewijs: grep: 2 treffers `AppHeader` in `app/layout.tsx` (import + gebruik), bestand aanwezig
- [x] Typologie — de balk is geen primitive: `packages/ui` bevat geen `AppHeader` (grep over `packages/ui`) — bewijs: `grep -rl AppHeader packages/ui --include='*.tsx'` → 0 bestanden
- [x] States n.v.t. — de balk heeft geen data-laag: 0 voorkomens van `fetch`, `useEffect` of `use(` in `AppHeader.tsx` — bewijs: `grep -cE 'fetch|useEffect|use\('` op `AppHeader.tsx` → 0
- [x] Interactie — klik en toetsenbord, gedekt door de `aria-current`- en focus-items hieronder — bewijs: gedekt door c02f (klik, 3 gevallen) en de tab-volgorde-as (3 routes), beide in flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Edge cases — querystring, hash, foutpagina, 404 en 400 px, elk een eigen item hieronder — bewijs: vijf eigen items hieronder, elk groen in flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)

### De balk staat er en weet waar je bent

- [x] 3 navigatielinks in `header` op `/` — noemer: alle `header a`-elementen — bewijs: `/ navigatie: 1 van 3 links met aria-current`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] 3 navigatielinks in `header` op `/plan` — zelfde noemer — bewijs: `/plan navigatie: 1 van 3 links`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] 3 navigatielinks in `header` op `/instellingen` — zelfde noemer — bewijs: `/instellingen navigatie: 1 van 3 links`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `[aria-current="page"]` = 1 op `/`, mét noemer 3. Tegenproef: de padvergelijking in `AppHeader` omkeren → rood — bewijs: `1 van 3`; tegenproef `--selftest` haalt het kenmerk weg → `ZELFTEST navigatie: 0 van 3` (zelftest rc=0, 7/7 assen)
- [x] `[aria-current="page"]` = 1 op `/plan`, mét noemer 3 — bewijs: `1 van 3`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `[aria-current="page"]` = 1 op `/instellingen`, mét noemer 3 — bewijs: `1 van 3`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Op `/` wijst de `aria-current`-link naar `/` — gelezen uit `href`, niet uit de linktekst — bewijs: `aria-current (/)` uit het `href`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Op `/plan` wijst de `aria-current`-link naar `/plan` — gelezen uit `href` — bewijs: `aria-current (/plan)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Op `/instellingen` wijst de `aria-current`-link naar `/instellingen` — gelezen uit `href` — bewijs: `aria-current (/instellingen)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `/?tab=leads&status=alle` geeft `aria-current` op de link naar `/` — een querystring zet de markering niet uit — bewijs: `navigatie (querystring): 1 van 3 links met aria-current (/)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `/instellingen#bedrijfsplan` geeft `aria-current` op de link naar `/instellingen` — een hash zet de markering niet uit — bewijs: `navigatie (hash): 1 van 3 links met aria-current (/instellingen)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De geforceerde foutpagina draagt 3 navigatielinks in `header` (tweede server, `JOBRADAR_DB_PATH` naar een tekstbestand) — bewijs: `c02e: foutpagina navigatie: 1 van 3 links met aria-current (/)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `/bestaat-niet` draagt 3 navigatielinks in `header` — bewijs: `navigatie (404): 3 links, 0 van 3 met aria-current` — 0 en niet 1, want die route is geen van de drie
- [x] Het wordmerk is geen kop — `header h1,header h2,header h3,header h4,header h5,header h6` = 0 op alle drie de routes — bewijs: `0 koppen in de balk` op alle drie de routes én op de foutpagina, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)

### De oude headers zijn weg

- [x] 0 links met de toegankelijke naam "Terug naar het dashboard" op `/plan` — bewijs: tab-volgorde-note `/plan`: `a(Radar) → a(Plan) → a(Instellingen) → a(Exporteer (Markdow) → a(JSON) → …`, geen terug-link, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] 0 links met de toegankelijke naam "Terug naar het dashboard" op `/instellingen` — bewijs: tab-volgorde-note `/instellingen`: `a(Radar) → a(Plan) → a(Instellingen) → button(UX verwijderen) → …`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De foutpagina houdt die link wél — precies 1, en een klik erop is een documentnavigatie (c02b) — bewijs: `c02b` groen op alle drie de routes: 1 eigen uitweg, documentnavigatie naar `/`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] 0 `href` naar `/instellingen#bedrijfsplan` in `apps/jobradar/components` — noemer: 1 vóór de wijziging (`PlanClient.tsx:439`) — bewijs: `grep -ro 'instellingen#bedrijfsplan' components` → 1 treffer, en die staat in een codecommentaar in `AppHeader.tsx:32`, niet in een `href`
- [x] Precies 1 h1 op `/` — kopstructuur-pass van de harness — bewijs: `/ kopstructuur: 28 koppen, niveaus h1 → h2 → h3`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Precies 1 h1 op `/plan` — kopstructuur-pass — bewijs: `/plan kopstructuur: 12 koppen, niveaus h1 → h2 → h3`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Precies 1 h1 op `/instellingen` — kopstructuur-pass — bewijs: `/instellingen kopstructuur: 3 koppen, niveaus h1 → h2`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Op `/` is die h1 niet zichtbaar — `getBoundingClientRect().width ≤ 1` — bewijs: `/: h1 onzichtbaar (1px breed)`; tegenproef `sr-only` → `text-xl` gaf `de h1 is 53px breed`
- [x] Op `/plan` is die h1 wél zichtbaar — breedte > 1 — bewijs: `/plan: h1 zichtbaar (862px breed)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Op `/instellingen` is die h1 wél zichtbaar — breedte > 1 — bewijs: `/instellingen: h1 zichtbaar (704px breed)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De drie `loading.tsx` herhalen het wordmerk niet — 0 voorkomens van "JobRadar" in `app/loading.tsx`, `app/plan/loading.tsx` en `app/instellingen/loading.tsx` samen (was 1) — bewijs: `grep -ho JobRadar` over de drie bestanden → 0 treffers (was 1, in `app/loading.tsx`)
- [x] De twee export-links van het plan staan er nog — "Exporteer (Markdown)" en "JSON" elk 1 keer op `/plan` — bewijs: tab-volgorde-note `/plan`: `a(Exporteer (Markdow) → a(JSON)`, elk één keer, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)

### /instellingen — één primaire actie per sectie

- [x] Sectie Zoekopdracht: precies 1 knop met de primaire achtergrondkleur — berekende `background-color`, niet de klasse; noemer = alle zichtbare knoppen in de sectie — bewijs: `c51: 1 van 3 actieknoppen in Zoekopdracht is gevuld ("Opslaan")`; tegenproef Test terug op `secondary` → `2 van 3 … gevuld`
- [x] Sectie Bedrijfsplan: precies 1 knop met de primaire achtergrondkleur — zelfde meting, eigen noemer — bewijs: `c51: 1 van 1 actieknoppen in Bedrijfsplan is gevuld ("Opslaan")`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] "Test deze zoekopdracht" is omrand en niet gevuld — berekende `border-width` ≥ 1 én `background-color` gelijk aan de paginakleur — bewijs: `c51: omrand (1px) en niet gevuld`; tegenproef `secondary` → `gevuld (rgb(61, 67, 77) tegen pagina rgb(255, 255, 255))`
- [x] Alle actieknoppen op `/instellingen` hebben dezelfde hoogte — `getBoundingClientRect().height` over `[data-zoekopdracht-actie]` + `[data-planinstellingen-actie]`, mét noemer (vóór de wijziging: drie op 40 px, één op 36 px) — bewijs: `c51: alle 4 actieknoppen zijn 40px hoog`; tegenproef `size="sm"` terug op het plan-Opslaan → `2 verschillende hoogtes (… Opslaan=36)`

### Toetsenbord, namen en overloop

- [x] Focus-pass groen op `/` — 0 stops zonder zichtbare focus, mét noemer — bewijs: `/ toetsenbord: 80 stops, elk met zichtbare focus` (80 = plafond), flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Focus-pass groen op `/plan` — 0 stops zonder zichtbare focus, mét noemer — bewijs: `/plan toetsenbord: 44 stops, elk met zichtbare focus` (was 43 vóór de balk), flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Focus-pass groen op `/instellingen` — 0 stops zonder zichtbare focus, mét noemer — bewijs: `/instellingen toetsenbord: 24 stops, elk met zichtbare focus`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De drie navigatielinks zijn de eerste drie tab-stops op `/` — uit de tab-volgorde-note van de harness — bewijs: `a:Radar → a:Plan → a:Instellingen`; tegenproef label `Radar` → `Dashboard` gaf rood op alle drie de routes
- [x] De drie navigatielinks zijn de eerste drie tab-stops op `/plan` — zelfde note — bewijs: zelfde drie stops, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De drie navigatielinks zijn de eerste drie tab-stops op `/instellingen` — zelfde note — bewijs: zelfde drie stops, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] Namen-pass: 0 bedienbare elementen zonder berekende naam op de drie routes, mét noemer — bewijs: `/` 115, `/plan` 45, `/instellingen` 27 bedienbare elementen, elk met een naam, 0 uitzonderingen, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `/plan` op 400 px: `scrollWidth ≤ clientWidth` — de enige route die als smal doelwit geldt — bewijs: `/plan op 400px: geen horizontale overloop (400 ≤ 400)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `/instellingen` op 400 px: `scrollWidth ≤ clientWidth` — bewijs: `/instellingen op 400px: geen horizontale overloop (400 ≤ 400)`, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De balk zelf loopt op 400 px niet over, op alle drie de routes — rechterrand van elk kind tegen `clientWidth` — bewijs: `navigatie (400px): de balk op / · /instellingen · /plan past (400 ≤ 400)`; twee tegenproeven — een te lang label blijft terecht groen (tekst wrapt), `whitespace-nowrap` erbij geeft rood op alle drie (545–546 px)
- [x] `/` op 400 px is géén item: die route liep daar vóór deze fase al over (kaartengrid) en staat als niet-doelwit in BACKLOG. Wat deze fase eraan toevoegt, is de balk, en die heeft zijn eigen item hierboven. — bewijs: hermeten op 480 tegen 400 en bijgeschreven in `apps/jobradar/BACKLOG.md` (stond er op 756 uit 2026-09-16)

### Sync blijft een pagina-actie

- [x] `header [data-sync-knop]` = 0 op `/` — bewijs: `/ sync-knop: 0 in de balk, 1 in de pagina`; tegenproef `data-sync-knop` op het wordmerk → `1 in de balk`
- [x] `main [data-sync-knop]` = 1 op `/` — bewijs: zelfde meting, beide kanten in één regel, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] De doorklik "+N vacatures" zet nog steeds tabblad en vinkje — de bestaande sectie `flow --alleen=fase3-nieuw` groen, mét het aantal checks — bewijs: sectie `fase3-nieuw` groen in flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0); c13d/c13e onderscheppen de sync en toetsen tabblad + vinkje

### De instrumenten blijven meten

- [x] `flow-harness.mjs` klikt de link "Plan"; de count-guard eist er precies 1. Tegenproef: de naam terugzetten op "Bedrijfsplan" → rood — bewijs: `triage: na /plan en Back staan filter én URL nog op de gefilterde stand`, met de nieuwe telling-guard ervoor, flow-run 2026-09-19 na de reviewronde (246 checks, 0 bevindingen, rc=0)
- [x] `fase3-server.mjs` c14a gebruikt de link "Radar"; `link.count()` = 1 op `/instellingen` — bewijs: `c14a: tijdens het renderen van / staat de laadtoestand in beeld (… kop "Radar" …)` — de count-guard in `laadtoestand()` eist er precies 1 en zou anders melden dat het niets meet
- [x] c14b's onderscheidende voorwaarde noemt "JobRadar" niet meer — na deze wijziging draagt geen enkele h1 dat woord, dus die clausule zou per constructie waar zijn. Vervangen door `!s.h1.includes('Radar')` — bewijs: `grep -c JobRadar` over alle `<h1>` in `app` + `components` → 0; de clausule leest nu `!s.h1.includes('Radar')`
- [x] De nieuwe c14b-clausule kan rood worden — tegenproef: de laadtoestand van `/instellingen` tijdelijk een h1 "Radar" geven → c14b faalt — bewijs: `c14b` scheidt de twee laadtoestanden alleen omdat `app/loading.tsx` de kop "Radar" draagt — die kop staat er (`c14a` leest hem terug) en zonder de clausule zou c14b ook op de root-laadtoestand slagen
- [x] `apps/jobradar/CLAUDE.md` → Verify-pad, regel "Toetsenbordlast op `/plan`": de tellingen ná de balk staan erin, gemeten in dezelfde run — bewijs: twee nieuwe rijen (**Navigatie**, **Eén primaire actie per sectie**) en de rij *Toetsenbordlast op `/plan`* op 44, in deze PR
- [x] `pnpm --filter jobradar flow --selftest` eindigt op exit 0 — alle ingespoten defecten gevangen — bewijs: `✓ zelftest: alle 7 assen falen wanneer ze horen te falen`, rc=0 — inclusief de nieuwe `ZELFTEST navigatie`
- [x] `pnpm --filter jobradar exec tsc --noEmit` exit 0 — bewijs: rc=0 op de eindstand
- [x] `pnpm ds:guard` exit 0 — bewijs: `✓ Design-systeem-bron: 9/9 apps gedeclareerd en in lijn met de schijf.`, rc=0
- [x] `pnpm --filter @umanex/tokens guard` exit 0 — bewijs: `✓ laag-discipline: 408 bestanden schoon (1 baseline-uitzonderingen)`, rc=0

### Reviewronde (2026-09-19) — vijf defecten uit `code-review`, elk gefixt en tegengetoetst

- [x] `flow-harness.mjs`: de telling van de link "Plan" stopt nu óók de klik — bewijs: tegenproef label `Plan` → `Planning` gaf één rode regel (`0 links "Plan" op /, … wordt overgeslagen`) én de sectie erná draaide door (`c51` 4× groen). Vóór de fix zou `click()` gegooid hebben en was alles erna niet gedraaid
- [x] De zelftest kan "as werd rood" onderscheiden van "defect niet ingespoten" — bewijs: met `aria-current` uit `AppHeader` printte de oude versie `✓ zelftest: alle 7 assen falen`, rc=0; de nieuwe print `✗ zelftest: deze as/assen faalden NIET — ZELFTEST navigatie`, rc=1
- [x] `error.tsx` en `not-found.tsx` passen verticaal in het venster — bewijs: `c02e` en `navigatie (404)` op `720 ≤ 720`; tegenproef `min-h-screen` terug gaf `769px in een venster van 720px` op beide, exact de 49 px balkhoogte
- [x] De exportrij van `/plan` staat weer op de hoogte van de h1 — bewijs: `pt-6` verwijderd; die duwde de rij 24 px omlaag naar een terug-link die er niet meer is (`PlanClient.tsx`, `git diff`)
- [x] Een subroute krijgt straks géén volledige herlading — bewijs: `isZelfdePad` (exact pad) is losgekoppeld van `isActief` (prefix); `c02f` blijft groen op alle drie de gevallen
- [x] `<main>` behoudt zijn breedte onder de kolom-flexbox — bewijs: `navigatie (main-breedte)` meet 1280 / 1280 / 768 px op `/`, `/plan`, `/instellingen`; `w-full` staat op elke main omdat `mx-auto` op de kruis-as `align-self: stretch` uitzet
- [x] Een klik op de huidige route laat URL en scherm hetzelfde zeggen — bewijs: vanaf `/?tab=leads&status=alle` geeft een klik op "Radar" search `""` naast status `open` en tabblad `Vacatures`; de kost (volledige herlading) staat als BACKLOG-item
- [x] De acht design-bevindingen die buiten scope vallen staan in `apps/jobradar/BACKLOG.md` — bewijs: 8 nieuwe items onder Open, elk met meting en eerste zet
- [x] `security-audit` overgeslagen — bewijs: `git diff origin/main --name-only` raakt 0 bestanden onder `app/api/`, `lib/db/`, `lib/sources/` of `lib/kbo/`; de 21 gewijzigde bestanden zijn UI-componenten, route- en laadpagina's, drie meetscripts en documentatie

## Beslissingsgeschiedenis

- 2026-09-19: **"Sync nu" blijft op de pagina** in plaats van in de balk — besluit Jeroen, wijkt af van het plan (`~/.claude/plans/delightful-stirring-blossom.md`, fase 4c: "SyncButton als slot op `/`"). Reden: de doorklik "+N vacatures" zet vijf stukken filterstand van `DashboardClient`, en die stand leeft ín dat component. Een knop in de layout-balk moet daar dan via een context-laag naar terugpraten — ~40 regels omweg voor 20 px. Bovendien is sync een actie van één pagina, geen navigatie.
- 2026-09-19: **`/` krijgt geen zichtbare titel** — besluit Jeroen. De h1 "JobRadar" herhaalde het wordmerk dat straks in de balk staat; een onzichtbare kop "Radar" houdt de kopstructuur heel. Past bij "gewicht verdelen". Plan en Instellingen houden hun zichtbare titel: die zeggen wél iets nieuws.
- 2026-09-19: de actieve link is een gewone `<a>` **alleen bij exact hetzelfde pad**, niet bij een prefix-treffer. `isActief` (markering) en `isZelfdePad` (mechanisme) zijn daarom losse predicaten: op een toekomstige `/plan/xyz` is "Plan" wél de huidige sectie maar wijst hij naar een ánder pad, en dát is net het geval waarin `next/link` werkt.
- 2026-09-19: `app/layout.tsx` wordt een kolom-flexbox en `error.tsx`/`not-found.tsx` ruilen `min-h-screen` voor `flex-1`. Die twee telden de balkhoogte erbij op — 100vh + 49 px — en gaven élke foutpagina een schuifbalk met de inhoud onder het midden. Elke `main` kreeg `w-full`, want `mx-auto` op de kruis-as van een kolom-flexbox zet `align-self: stretch` uit.
- 2026-09-19: het menu-item voor `/` heet **Radar**, conform het plan. Gevolg: de routetitel wordt "Radar — JobRadar", zodat balk en titel hetzelfde woord gebruiken.
