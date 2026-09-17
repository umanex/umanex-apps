# Dark mode verwijderen — tokens, code, Storybook en Figma

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** packages/tokens + packages/config + packages/ui + apps/portfolio + apps/dashboard + Figma Component library
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Haal dark mode overal weg — de dark-rollen uit tokens.json, het .dark-blok uit de
             build, ThemeToggle uit code en Figma, de modes uit de Theme-collectie — zonder dat
             het lichte beeld van één scherm verandert.
CONTEXT:     Besluit Jeroen 2026-09-17: "dark mode is momenteel niet echt een ding". Gemeten:
             nul `dark:`-klassen in alle negen apps (het omschakelen liep volledig via de rollen),
             drie plekken met een zichtbare toggle (portfolio-header, dashboard-RepoBar,
             cockpit-layout), nul instanties van ThemeToggle in de Figma-library. Dit gaat vóór
             de migratie naar Tokens Studio als variabelenbron (briefing van dezelfde dag): zonder
             modes verdwijnt daar het blokkerende probleem.
ELEMENTS:    tokens.json (Theme/dark 36, Semantic/dark 7, $themes Dark, tokenSetOrder) ·
             build.mjs (MODES, MODE_SELECTOR, color-scheme, symmetrie-guard, emitSetsFor) ·
             preset.ts (darkMode) · packages/ui (ThemeToggle + stories, .storybook/preview
             withThemeByClassName + addon-themes, docs-blokken ColorRoles/RoleTable/
             TokenUseTable/tokenCatalog/Overzicht.mdx) · apps/portfolio (Header, layout-script) ·
             apps/dashboard (RepoBar, cockpit-layout, layout-script) · figma-sync-check
             ([token] mode-assert, [themawaarde] 43×2, [slots] dark-regel) + selftest ·
             Figma (Theme-collectie modes, pagina ThemeToggle, manifest).
BEHAVIOUR:   De rollaag houdt dezelfde namen en dezelfde lichte waarden; alleen het .dark-blok
             en de tweede mode verdwijnen. Een bezoeker die eerder dark koos, krijgt licht.
             De guards toetsen daarna één mode, met hun tegenproeven mee.
CONSTRAINTS: Geen rolnaam wijzigt (anders verschuift elke utility) · geometry 0 en parity 0 ·
             gecompileerde app-CSS verliest alleen de .dark-regels · component- en set-ids in
             Figma blijven, behalve de verwijderde ThemeToggle · deep-links blijven kloppen ·
             per fase één PR · fileKey-guard in elke schrijvende Figma-call.
```

---

## Open vragen

1. **Hoe heten de rolsets na de samenvoeging?** Vandaag dwingt `build.mjs` een mode-suffix af op een rolgroep (`Theme/light`, `Theme/dark`). Zonder modes ligt `Theme` en `Semantic` (mode-loos) voor de hand, met `Theme/base` erin opgenomen — dat scheelt ook een set bij de Tokens Studio-migratie. Akkoord, of blijft `Theme/light` staan als enige set?
2. **Wat gebeurt er met de bezoeker die ooit dark koos?** Zijn `localStorage`-sleutel `theme` blijft staan. Opruimen in het layout-script (één regel, verdwijnt later), of laten verlopen?
3. **Mag `@storybook/addon-themes` uit `packages/ui`?** Hij levert alleen de light/dark-toolbar. Dependency verwijderen vraagt jouw akkoord.

## Aannames

- `[ASSUMPTION: de lichte waarden blijven exact gelijk; theme.css verliest alleen het .dark-blok en de color-scheme-regel van dark, en het :root-blok blijft byte-gelijk.]`
- `[ASSUMPTION: de pagina ThemeToggle mag uit Figma, want er zijn nul instanties (gemeten 2026-09-17); zijn deep-link verdwijnt samen met de story.]`
- `[ASSUMPTION: rowtrack en rowtrack-web blijven buiten scope — die hebben hun eigen tokenbron; rowtrack-web noemt dark alleen in een comment.]`

## Acceptatie

### Kritische assen

- [ ] Typologie — de rollaag is mode-loos: één set per laag, geen `light`/`dark`-suffix
- [ ] States n.v.t. — tokens en rollen hebben geen data-laag
- [ ] Interactie — de toggle is weg op alle drie de plekken (portfolio-header, RepoBar, cockpit)
- [ ] Edge case — een `dark:`-klasse in `packages/ui` blijft rood in de guard, of de regel is met reden verwijderd
- [ ] Edge case — een bezoeker met `theme=dark` in localStorage krijgt het lichte scherm (open vraag 2)

### Tokens en code

- [ ] `theme.css` verliest alleen het `.dark`-blok; het `:root`-blok is byte-gelijk aan vandaag
- [ ] De gecompileerde CSS van cashflow, jobradar, dashboard, portfolio en soda-plus verliest alleen `.dark`-regels
- [ ] `roles.mjs` levert dezelfde rolnamen als vandaag (diff = alleen volgorde of niets)
- [ ] Geen `dark`-verwijzing meer in `packages/tokens/build.mjs`, `preset.ts` en `packages/ui`
- [ ] `pnpm --filter @umanex/tokens guard`, `pnpm ds:guard:selftest` en `pnpm turbo type-check` groen
- [ ] `pnpm turbo lint --force` groen over alle apps

### Storybook en docs

- [ ] De docs-blokken tonen één kolom in plaats van Light en Dark (ColorRoles, RoleTable, TokenUseTable)
- [ ] `Tokens/Overzicht` noemt geen modes meer
- [ ] `geometry` geeft 0 verschillen na het verwijderen van de ThemeToggle-stories (de basislijn krimpt met precies die stories)
- [ ] De Storybook-toolbar heeft geen theme-schakelaar meer

### Figma

- [ ] De collectie `Theme` heeft één mode; de 43 rolnamen en hun ids zijn ongewijzigd
- [ ] De pagina ThemeToggle is weg; geen enkele node bindt nog aan een verwijderde variabele of component
- [ ] `figma-sync-check` toetst één mode ([token]) en 43 themawaarden ([themawaarde]), met tegenproeven in de selftest
- [ ] `pnpm --filter @umanex/ui parity` geeft 0 verschillen
- [ ] `node scripts/figma/links.mjs --check` is groen (geen verweesde deep-link)

### Documentatie

- [ ] De root-`CLAUDE.md` beschrijft de lagen zonder mode-uit-de-setnaam
- [ ] `packages/ui/CLAUDE.md` beschrijft de Theme-collectie zonder modes
- [ ] De migratie-briefing van dezelfde dag verwijst hiernaar als voorwaarde
- [ ] Het umanex-profiel belooft geen dark mode meer — die regel ("Light + dark mode altijd ondersteund") staat in de **umanex-os-repo** (`profiles/umanex.md`); `.umanex-os/` hier is een gesynchroniseerde kopie, dus de wijziging hoort daar en komt via de sync terug

## Beslissingsgeschiedenis

- 2026-09-17: dark mode gaat er helemaal uit — besluit Jeroen, na de meting dat er nul `dark:`-klassen zijn, drie zichtbare toggles en nul Figma-instanties. Gewogen alternatief: alleen uit Figma houden (goedkoper en omkeerbaar) of alleen de toggle weghalen; beide afgewezen.
- 2026-09-17: dit gaat vóór de Tokens Studio-migratie, omdat de plugin met één theme tegelijk geen twee modes in één collectie kan zetten.
