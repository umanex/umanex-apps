# Eén navigatie over de drie routes van jobradar

- **Datum:** 2026-09-19
- **Type:** feature
- **Project:** apps/jobradar
- **Klant:** umanex
- **Status:** gepland

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

- [ ] Typologie — `components/layout/AppHeader.tsx` bestaat en wordt geïmporteerd in `app/layout.tsx` (grep, beide bestanden)
- [ ] Typologie — de balk is geen primitive: `packages/ui` bevat geen `AppHeader` (grep over `packages/ui`)
- [ ] States n.v.t. — de balk heeft geen data-laag: 0 voorkomens van `fetch`, `useEffect` of `use(` in `AppHeader.tsx`
- [ ] Interactie — klik en toetsenbord, gedekt door de `aria-current`- en focus-items hieronder
- [ ] Edge cases — querystring, hash, foutpagina, 404 en 400 px, elk een eigen item hieronder

### De balk staat er en weet waar je bent

- [ ] 3 navigatielinks in `header` op `/` — noemer: alle `header a`-elementen
- [ ] 3 navigatielinks in `header` op `/plan` — zelfde noemer
- [ ] 3 navigatielinks in `header` op `/instellingen` — zelfde noemer
- [ ] `[aria-current="page"]` = 1 op `/`, mét noemer 3. Tegenproef: de padvergelijking in `AppHeader` omkeren → rood
- [ ] `[aria-current="page"]` = 1 op `/plan`, mét noemer 3
- [ ] `[aria-current="page"]` = 1 op `/instellingen`, mét noemer 3
- [ ] Op `/` wijst de `aria-current`-link naar `/` — gelezen uit `href`, niet uit de linktekst
- [ ] Op `/plan` wijst de `aria-current`-link naar `/plan` — gelezen uit `href`
- [ ] Op `/instellingen` wijst de `aria-current`-link naar `/instellingen` — gelezen uit `href`
- [ ] `/?tab=leads&status=alle` geeft `aria-current` op de link naar `/` — een querystring zet de markering niet uit
- [ ] `/instellingen#bedrijfsplan` geeft `aria-current` op de link naar `/instellingen` — een hash zet de markering niet uit
- [ ] De geforceerde foutpagina draagt 3 navigatielinks in `header` (tweede server, `JOBRADAR_DB_PATH` naar een tekstbestand)
- [ ] `/bestaat-niet` draagt 3 navigatielinks in `header`
- [ ] Het wordmerk is geen kop — `header h1,header h2,header h3,header h4,header h5,header h6` = 0 op alle drie de routes

### De oude headers zijn weg

- [ ] "Terug naar het dashboard" komt 0 keer voor in `apps/jobradar/app` + `apps/jobradar/components` — noemer: 4 voorkomens vóór de wijziging
- [ ] 0 links met de toegankelijke naam "Terug naar het dashboard" op `/plan`
- [ ] 0 links met de toegankelijke naam "Terug naar het dashboard" op `/instellingen`
- [ ] 0 links naar `/instellingen#bedrijfsplan` in `apps/jobradar/components` — noemer: 1 vóór de wijziging (`PlanClient.tsx:439`)
- [ ] Precies 1 h1 op `/` — kopstructuur-pass van de harness
- [ ] Precies 1 h1 op `/plan` — kopstructuur-pass
- [ ] Precies 1 h1 op `/instellingen` — kopstructuur-pass
- [ ] Op `/` is die h1 niet zichtbaar — `getBoundingClientRect().width ≤ 1`
- [ ] Op `/plan` is die h1 wél zichtbaar — breedte > 1
- [ ] Op `/instellingen` is die h1 wél zichtbaar — breedte > 1
- [ ] De drie `loading.tsx` herhalen het wordmerk niet — 0 voorkomens van "JobRadar" in `app/loading.tsx`, `app/plan/loading.tsx` en `app/instellingen/loading.tsx` samen (was 1)
- [ ] De twee export-links van het plan staan er nog — "Exporteer (Markdown)" en "JSON" elk 1 keer op `/plan`

### /instellingen — één primaire actie per sectie

- [ ] Sectie Zoekopdracht: precies 1 knop met de primaire achtergrondkleur — berekende `background-color`, niet de klasse; noemer = alle zichtbare knoppen in de sectie
- [ ] Sectie Bedrijfsplan: precies 1 knop met de primaire achtergrondkleur — zelfde meting, eigen noemer
- [ ] "Test deze zoekopdracht" is omrand en niet gevuld — berekende `border-width` ≥ 1 én `background-color` gelijk aan de paginakleur
- [ ] Alle zichtbare knoppen op `/instellingen` hebben dezelfde hoogte — `getBoundingClientRect().height`, mét noemer (vóór de wijziging: drie op 40 px, één op 36 px)

### Toetsenbord, namen en overloop

- [ ] Focus-pass groen op `/` — 0 stops zonder zichtbare focus, mét noemer
- [ ] Focus-pass groen op `/plan` — 0 stops zonder zichtbare focus, mét noemer
- [ ] Focus-pass groen op `/instellingen` — 0 stops zonder zichtbare focus, mét noemer
- [ ] De drie navigatielinks zijn de eerste drie tab-stops op `/` — uit de tab-volgorde-note van de harness
- [ ] De drie navigatielinks zijn de eerste drie tab-stops op `/plan` — zelfde note
- [ ] De drie navigatielinks zijn de eerste drie tab-stops op `/instellingen` — zelfde note
- [ ] Namen-pass: 0 bedienbare elementen zonder berekende naam op de drie routes, mét noemer
- [ ] `/` op 400 px: `scrollWidth ≤ clientWidth`
- [ ] `/plan` op 400 px: `scrollWidth ≤ clientWidth`
- [ ] `/instellingen` op 400 px: `scrollWidth ≤ clientWidth`

### Sync blijft een pagina-actie

- [ ] `header [data-sync-knop]` = 0 op `/`
- [ ] `main [data-sync-knop]` = 1 op `/`
- [ ] De doorklik "+N vacatures" zet nog steeds tabblad en vinkje — de bestaande sectie `flow --alleen=fase3-nieuw` groen, mét het aantal checks

### De instrumenten blijven meten

- [ ] `flow-harness.mjs` klikt de link "Plan"; de count-guard eist er precies 1. Tegenproef: de naam terugzetten op "Bedrijfsplan" → rood
- [ ] `fase3-server.mjs` c14a gebruikt de link "Radar"; `link.count()` = 1 op `/instellingen`
- [ ] c14b's onderscheidende voorwaarde noemt "JobRadar" niet meer — na deze wijziging draagt geen enkele h1 dat woord, dus die clausule zou per constructie waar zijn. Vervangen door `!s.h1.includes('Radar')`
- [ ] De nieuwe c14b-clausule kan rood worden — tegenproef: de laadtoestand van `/instellingen` tijdelijk een h1 "Radar" geven → c14b faalt
- [ ] `apps/jobradar/CLAUDE.md` → Verify-pad, regel "Toetsenbordlast op `/plan`": de tellingen ná de balk staan erin, gemeten in dezelfde run
- [ ] `pnpm --filter jobradar flow --selftest` eindigt op exit 0 — alle ingespoten defecten gevangen
- [ ] `pnpm --filter jobradar exec tsc --noEmit` exit 0
- [ ] `pnpm ds:guard` exit 0
- [ ] `pnpm --filter @umanex/tokens guard` exit 0

## Beslissingsgeschiedenis

- 2026-09-19: **"Sync nu" blijft op de pagina** in plaats van in de balk — besluit Jeroen, wijkt af van het plan (`~/.claude/plans/delightful-stirring-blossom.md`, fase 4c: "SyncButton als slot op `/`"). Reden: de doorklik "+N vacatures" zet vijf stukken filterstand van `DashboardClient`, en die stand leeft ín dat component. Een knop in de layout-balk moet daar dan via een context-laag naar terugpraten — ~40 regels omweg voor 20 px. Bovendien is sync een actie van één pagina, geen navigatie.
- 2026-09-19: **`/` krijgt geen zichtbare titel** — besluit Jeroen. De h1 "JobRadar" herhaalde het wordmerk dat straks in de balk staat; een onzichtbare kop "Radar" houdt de kopstructuur heel. Past bij "gewicht verdelen". Plan en Instellingen houden hun zichtbare titel: die zeggen wél iets nieuws.
- 2026-09-19: het menu-item voor `/` heet **Radar**, conform het plan. Gevolg: de routetitel wordt "Radar — JobRadar", zodat balk en titel hetzelfde woord gebruiken.
