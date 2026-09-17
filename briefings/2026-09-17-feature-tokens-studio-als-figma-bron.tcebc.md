# Tokens Studio als bron van de Figma-variabelen en -styles

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** packages/tokens + packages/ui + Figma Component library (monorepo-niveau)
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Laat Tokens Studio de Figma-variabelen en -styles maken uit tokens.json, in plaats
             van onze eigen scripts, zonder de 1310 bestaande bindingen of de deep-links te breken.
CONTEXT:     Vandaag lopen er twee wegen naar hetzelfde doel: `figma/zet-base.js` schrijft `Base`
             (57) en de keten schrijft `Theme` (43, modes Light/Dark) plus de text- en
             effect-styles. Op 2026-09-17 zette een export van de plugin daar acht collecties
             naast (213 variabelen, nul bindingen) — de aanleiding voor dit plan. Jeroen wil
             tokens.json als bron met de plugin als uitvoerder.
ELEMENTS:    Tokens Studio: export per theme of per set, de vier Variables-vinkjes, Styles
             (Typography/Effects), "Remove styles and variables without connection to a token".
             tokens.json: $themes (Light/Dark, groep umanex), Layout/Scale, samengestelde
             typography-tokens (bestaan niet), boxShadow-tokens (bestaan niet), radius-stappen.
             packages/ui: zet-base.js, base-payload.mjs, builder.js, build-spec, build-prune,
             layout-rollen.mjs, figma-sync-check (assen schaal/dekking/token/binding), manifest.
             Figma: collectienamen, mode-opzet, 1310 bindingen, node-ids van de deep-links.
BEHAVIOUR:   Eén bron per soort waarde. De plugin maakt de variabelen; de keten bindt eraan op
             naam en meet terug. De guard toetst dezelfde assen, maar tegen de nieuwe namen.
             Een export mag nooit een tweede collectie naast een bestaande zetten.
CONSTRAINTS: Dark mode is eerst verwijderd (aparte briefing) · geen twee bronnen tegelijk in het bestand · component- en set-ids blijven (de
             stories deep-linken erop) · parity 0 en geometry 0 na de migratie · "Remove styles
             and variables without connection to a token" blijft uit zolang radius geen token
             heeft · per fase één PR · Desktop Bridge in de Component library, fileKey-guard in
             elke schrijvende call.
```

---

## Open vragen

Vraag 1 is vervallen; 2 tot 4 blokkeren de bouw en vragen elk een besluit van Jeroen.

1. **Vervallen (2026-09-17).** De vraag was of één collectie twee modes kan krijgen, nu Jeroen in het export-venster maar één theme tegelijk kan kiezen. Hij koos ervoor dark mode helemaal te verwijderen (`briefings/2026-09-17-feature-dark-mode-verwijderen.tcebc.md`), dus er valt geen tweede mode meer te maken. **Voorwaarde:** die briefing is klaar vóór deze bouwt, anders exporteert de plugin een rollaag zonder dark terwijl code en Figma er nog op staan.
2. **Waar landt de spacing-schaal?** In beide themes staat `Layout/Scale` op *source*, dus die levert geen variabelen, terwijl 940 bindingen eraan hangen. Als aparte set exporteren (eigen collectie, één mode — dicht bij het huidige `Base`), of in beide themes op *enabled* (dan zit spacing in de rollen-collectie, met per mode dezelfde waarde)?
3. **Wat gebeurt er met de vier radius-stappen?** `radius-sm|md|lg|full` hebben bewust geen token: de preset leidt ze met `calc()` af van één `radius`-token. Krijgen ze echte tokens (dan verdwijnt die afleiding uit de preset en verandert de CSS van elke app), of blijven ze handmatig in Figma staan (dan moet de opruim-instelling van de plugin uit blijven)?
4. **Komen de styles ook uit de plugin?** De plugin maakt tekst-styles uit *samengestelde* typography-tokens; onze schaal staat als losse `font.size`, `font.weight`, `font.leading` en `font.tracking` (12/4/12/4 tokens). Schaduwen hebben helemaal geen token. Styles uit de plugin vraagt dus eerst een tokenherstructurering; het alternatief is dat `figma/builder.js` de zes `sans/*`- en drie `shadow/*`-styles blijft maken.

## Aannames

- `[ASSUMPTION: de plugin noemt variabelen naar hun tokenpad met slashes (`spacing/surface`), zoals in de acht collecties van 2026-09-17; de keten bindt vandaag op `Base:spacing-surface` en `Theme:background`, dus de naamvertaling zit in build-spec, build-prune, builder.js en figma-sync-check.]`
- `[ASSUMPTION: de collectie heet naar de themegroep (`umanex`), niet `Theme`; hernoemen kan, maar raakt elke plek die op naam bindt.]`
- `[ASSUMPTION: het herbinden kan node voor node met `setBoundVariable`, zoals de 213 herbindingen van 2026-09-17 — component- en set-ids blijven dan gelijk, alleen de variabele-referentie wijzigt.]`

## Acceptatie

### Kritische assen

- [ ] Typologie — er is per soort waarde precies één bron: de plugin maakt de variabelen, de keten bindt eraan
- [ ] States n.v.t. — tokens en variabelen hebben geen data-laag
- [ ] Interactie n.v.t. — variabelen hebben geen gedrag; het schakelen tussen modes vervalt met dark mode
- [ ] Edge case — een tweede export voegt geen tweede collectie naast een bestaande toe (gemeten met twee opeenvolgende exports)
- [ ] Edge case — een variabele zonder token verdwijnt niet ongemerkt (de opruim-instelling van de plugin staat uit zolang radius geen token heeft)

### Figma en bindingen

- [ ] Elke binding die vandaag naar `Theme:` of `Base:` wijst, wijst na de migratie naar de bijbehorende plugin-variabele (telling vóór/na, per collectie)
- [ ] Geen enkele node bindt nog aan een verwijderde variabele (telling = 0)
- [ ] De ids en keys van de 18 component(sets) zijn ongewijzigd (manifest-diff)
- [ ] `pnpm --filter @umanex/ui parity` geeft 0 verschillen
- [ ] `pnpm --filter @umanex/ui geometry` geeft 0 verschillen

### Code en guards

- [ ] `figma-sync-check` toetst schaal, dekking, token en binding tegen de nieuwe namen; `figma:check:selftest` is groen met zijn tegenproeven
- [ ] `figma/zet-base.js` en `scripts/figma/base-payload.mjs` zijn verwijderd óf dragen in hun kop waarom ze blijven
- [ ] De keten bindt op de nieuwe variabelenamen (`build-spec`, `build-prune`, `builder.js`, `layout-rollen.mjs`)
- [ ] `pnpm --filter @umanex/tokens guard` en `pnpm ds:guard:selftest` groen
- [ ] `pnpm turbo type-check` groen

### Documentatie

- [ ] `packages/ui/CLAUDE.md` beschrijft de nieuwe bron, met het commando of de klik die de variabelen bijwerkt
- [ ] De root-`CLAUDE.md` zegt niet langer dat de export uit moet, maar hoe hij hoort te staan
- [ ] `apps/*/CLAUDE.md` blijven ongewijzigd — [NIET TE VERIFIËREN vóór de bouw: hangt af van open vraag 3]

## Beslissingsgeschiedenis

- 2026-09-17: Jeroen wil `tokens.json` als bron met Tokens Studio als uitvoerder van variabelen en styles; onze eigen scripts worden daarmee de tweede weg die verdwijnt.
- 2026-09-17: in het export-venster is maar één theme tegelijk te kiezen — daarmee is de mode-vraag (open vraag 1) het eerste wat gemeten wordt, vóór welke bouwstap ook.
- 2026-09-17: open vraag 1 (modes) vervalt doordat dark mode verdwijnt; die opruiming is nu een voorwaarde voor dit plan.
