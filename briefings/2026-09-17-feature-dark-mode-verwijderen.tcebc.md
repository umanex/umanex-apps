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
ELEMENTS:    tokens.json (Theme/dark 36, Semantic/dark 7, $themes Dark, tokenSetOrder, en het
             hernoemen van de drie rolsets — zie "De rolsets" hieronder) · build.mjs (MODES,
             MODE_SELECTOR, color-scheme, symmetrie-guard, emitSetsFor, classifySet,
             `tokenSets['Theme/base']`) · preset.ts (darkMode) · packages/ui (ThemeToggle +
             stories, .storybook/preview withThemeByClassName + addon-themes én de dependency,
             docs-blokken ColorRoles/RoleTable/TokenUseTable/tokenCatalog/Overzicht.mdx) ·
             apps/portfolio (Header, layout-script) · apps/dashboard (RepoBar, cockpit-layout,
             layout-script) · figma-sync-check ([token] mode-assert, [themawaarde] 43×2,
             [slots] dark-regel) + selftest · Figma (Theme-collectie modes, pagina ThemeToggle,
             manifest).
BEHAVIOUR:   De rollaag houdt dezelfde namen en dezelfde lichte waarden; alleen het .dark-blok
             en de tweede mode verdwijnen. De setnamen wijzigen wél — de CSS-variabelenaam komt
             uit het token-pad, niet uit de setnaam, dus dat is een verhuizing zonder output.
             Een bezoeker die eerder dark koos, krijgt licht en verliest zijn opgeslagen keuze.
             De guards toetsen daarna één mode, met hun tegenproeven mee.
CONSTRAINTS: Geen rolnaam wijzigt (anders verschuift elke utility) · geometry 0 en parity 0 ·
             gecompileerde app-CSS verliest alleen de .dark-regels · component- en set-ids in
             Figma blijven, behalve de verwijderde ThemeToggle · deep-links blijven kloppen ·
             de setnaam-wijziging gaat in één PR, met een Pull in Tokens Studio erna (anders
             draait de eerstvolgende push hem terug) · per fase één PR · fileKey-guard in elke
             schrijvende Figma-call.
```

---

## De rolsets

De drie open vragen zijn op 2026-09-17 beantwoord; dit is het voorstel dat vraag 1 invult.

| vandaag | straks | inhoud | gemeten |
|---|---|---|---|
| `Theme/light` + `Theme/dark` | `Theme` | de shadcn-kleurrollen | 36 rollen |
| `Semantic/light` + `Semantic/dark` | `Semantic` | domeinrollen (finance, overlay) | 7 rollen |
| `Theme/base` | `Layout/Roles` | `radius` + spacing-rollen + size-rollen | 12 rollen, 0 kleuren |

**Waarom `Theme/base` niet in `Theme` opgaat** — anders dan deze briefing zelf voorstelde. Gemeten
inhoud: `Theme/base` draagt `radius`, acht `spacing.*`-rollen en drie `size.*`-rollen, en geen
enkele kleur; `Theme/light` draagt 36 kleuren en geen enkele maat. Samenvoegen zet geometrie en
kleur in één set, en bij de Tokens Studio-migratie dus in één Figma-collectie — terwijl Figma
vandaag precies op die lijn splitst (`Base` 57 maten, `Theme` 43 kleuren). `base` is bovendien een
mode-woord: het betekende "mode-blind", en dat begrip verdwijnt met de modes. Wat overblijft is de
laag die `Layout/Scale` al beschrijft — de schaalstap (`p-4`) tegenover de rol (`p-surface`,
`h-control-md`). Die twee onder één `Layout`-groep maakt het paar leesbaar in de plugin-UI.

**Wat dit kost, gemeten:** niets in de output. `build.mjs` maakt elke variabelenaam uit
`t.path.join('-')` — het token-pad, nooit de setnaam. `spacing.surface` blijft `--spacing-surface`
blijft `p-surface`. De rename raakt `classifySet`, de regel `tokenSets['Theme/base']`, `$themes`,
`tokenSetOrder` en de docs; `:root` blijft byte-gelijk, wat het acceptatie-item hieronder toetst.

**Wat de classificatie wordt.** `MODES`, `MODE_SELECTOR`, `MODE_BLIND_LEAF`, `ROLE_GROUPS` en de
symmetrie-guard vervallen; de suffix-parsing wordt een opzoeking in twee expliciete lijsten:

```js
const ROLE_SETS = { Theme: 'kleurrollen', Semantic: 'domeinrollen', 'Layout/Roles': 'layout-rollen' };
// PRIMITIVE_SETS blijft: Primitives, Typography/Scale, Layout/Scale
```

Een set die in geen van beide staat is fataal — dezelfde tweezijdige rem als vandaag, zonder het
mode-verhaal eromheen. De symmetrie-guard verliest zijn onderwerp (met één set valt er niets
asymmetrisch te zijn), niet zijn tanden.

## Open vragen

Geen — de drie open vragen zijn beantwoord, zie Beslissingsgeschiedenis.

## Aannames

- `[ASSUMPTION: de lichte waarden blijven exact gelijk; theme.css verliest alleen het .dark-blok en de color-scheme-regel van dark, en het :root-blok blijft byte-gelijk.]`
- `[ASSUMPTION: de pagina ThemeToggle mag uit Figma, want er zijn nul instanties (gemeten 2026-09-17); zijn deep-link verdwijnt samen met de story.]`
- `[ASSUMPTION: rowtrack en rowtrack-web blijven buiten scope — die hebben hun eigen tokenbron; rowtrack-web noemt dark alleen in een comment.]`
- `[ASSUMPTION: er blijft één $themes-entry over, de bestaande Light met id d51322f8… hernoemd naar "umanex"; Tokens Studio volgt het id, dus een hernoeming is geen nieuw theme. Te toetsen bij de eerste Pull na de merge — als de plugin er wél een tweede theme van maakt, is de terugval: de naam "Light" laten staan.]`
- `[ASSUMPTION: de opruimregel voor de localStorage-sleutel is zelf tijdelijk; hij mag weg zodra elke bezoeker hem één keer gezien heeft. Zonder een moment dat dat afsluit blijft hij staan, dus hij krijgt bij de bouw een BACKLOG-item met datum in plaats van een TODO in het layout-script.]`

## Acceptatie

### Kritische assen

- [ ] Typologie — de rollaag is mode-loos: één set per laag, geen `light`/`dark`-suffix
- [ ] Typologie — `tokens.json` draagt precies drie rolsets: `Theme`, `Semantic` en `Layout/Roles`
- [ ] States n.v.t. — tokens en rollen hebben geen data-laag
- [ ] Interactie — de toggle is weg op alle drie de plekken (portfolio-header, RepoBar, cockpit)
- [ ] Edge case — een `dark:`-klasse in `packages/ui` blijft rood in de guard, of de regel is met reden verwijderd
- [ ] Edge case — een bezoeker met `theme=dark` in localStorage krijgt het lichte scherm
- [ ] Edge case — na één bezoek staat de sleutel `theme` niet meer in localStorage (gemeten in de browser, niet afgeleid uit de code)
- [ ] Edge case — een verzonnen set (`Theme/paars`) laat de build vallen, en een verzonnen primitive-set ook

### Tokens en code

- [ ] `theme.css` verliest alleen het `.dark`-blok; het `:root`-blok is byte-gelijk aan vandaag
- [ ] De gecompileerde CSS van cashflow, jobradar, dashboard, portfolio en soda-plus verliest alleen `.dark`-regels
- [ ] `roles.mjs` levert dezelfde rolnamen als vandaag (diff = alleen volgorde of niets)
- [ ] De layout-rollen komen uit `Layout/Roles`, niet meer uit `tokenSets['Theme/base']`
- [ ] `$metadata.tokenSetOrder` en `$themes` noemen geen set met een mode-suffix meer
- [ ] Geen `dark`-verwijzing meer in `packages/tokens/build.mjs`, `preset.ts` en `packages/ui`
- [ ] `pnpm --filter @umanex/tokens guard`, `pnpm ds:guard:selftest` en `pnpm turbo type-check` groen
- [ ] `pnpm turbo lint --force` groen over alle apps

### Storybook en docs

- [ ] De docs-blokken tonen één kolom in plaats van Light en Dark (ColorRoles, RoleTable, TokenUseTable)
- [ ] `Tokens/Overzicht` noemt geen modes meer
- [ ] `geometry` geeft 0 verschillen na het verwijderen van de ThemeToggle-stories (de basislijn krimpt met precies die stories)
- [ ] De Storybook-toolbar heeft geen theme-schakelaar meer
- [ ] `@storybook/addon-themes` staat niet meer in `packages/ui/package.json`
- [ ] Geen enkel bestand importeert nog uit `@storybook/addon-themes` (`.storybook/preview.tsx`, `.storybook/main.ts`)
- [ ] Storybook start op na de verwijdering en toont de index (`pm2:restart`, dan `curl -s localhost:6006/index.json` geeft de componenten)

### Figma

- [ ] De collectie `Theme` heeft één mode; de 43 rolnamen en hun ids zijn ongewijzigd
- [ ] De pagina ThemeToggle is weg; geen enkele node bindt nog aan een verwijderde variabele of component
- [ ] `figma-sync-check` toetst één mode ([token]) en 43 themawaarden ([themawaarde]), met tegenproeven in de selftest
- [ ] `pnpm --filter @umanex/ui parity` geeft 0 verschillen
- [ ] `node scripts/figma/links.mjs --check` is groen (geen verweesde deep-link)

### Documentatie

- [ ] De root-`CLAUDE.md` beschrijft de lagen zonder mode-uit-de-setnaam
- [ ] Het lagenblok in de root-`CLAUDE.md` noemt de drie nieuwe setnamen, en de zin "Voeg een rol toe in **beide** mode-sets" is vervangen
- [ ] Jeroen heeft ná de merge een Pull in Tokens Studio gedaan en de plugin toont de drie nieuwe sets — [NIET TE VERIFIËREN door mij: dit is een handeling in de plugin-UI, dus het is een afspraak in de PR-tekst, geen meting]
- [ ] `packages/ui/CLAUDE.md` beschrijft de Theme-collectie zonder modes
- [ ] De migratie-briefing van dezelfde dag verwijst hiernaar als voorwaarde
- [ ] Het umanex-profiel belooft geen dark mode meer — die regel ("Light + dark mode altijd ondersteund") staat in de **umanex-os-repo** (`profiles/umanex.md`); `.umanex-os/` hier is een gesynchroniseerde kopie, dus de wijziging hoort daar en komt via de sync terug

## Beslissingsgeschiedenis

- 2026-09-17: dark mode gaat er helemaal uit — besluit Jeroen, na de meting dat er nul `dark:`-klassen zijn, drie zichtbare toggles en nul Figma-instanties. Gewogen alternatief: alleen uit Figma houden (goedkoper en omkeerbaar) of alleen de toggle weghalen; beide afgewezen.
- 2026-09-17: dit gaat vóór de Tokens Studio-migratie, omdat de plugin met één theme tegelijk geen twee modes in één collectie kan zetten.
- 2026-09-17: open vraag 1 beantwoord — Jeroen liet het voorstel aan mij. De rolsets worden `Theme`, `Semantic` en `Layout/Roles`. Afwijking van wat deze briefing zelf voorstelde: `Theme/base` gaat **niet** op in `Theme`, want gemeten draagt hij twaalf maten en nul kleuren, en Figma splitst vandaag precies op die lijn (`Base` maten, `Theme` kleuren). Gewogen alternatieven: `Theme/light` als enige set laten staan (afgewezen — de naam belooft een zus die niet bestaat), en alles in één `Theme` (afgewezen — mengt geometrie en kleur in één collectie).
- 2026-09-17: open vraag 2 beantwoord — de `localStorage`-sleutel `theme` wordt actief opgeruimd. Het layout-script krimpt tot één `removeItem`-regel in plaats van te verdwijnen; die regel is zelf tijdelijk en krijgt bij de bouw een BACKLOG-item.
- 2026-09-17: open vraag 3 beantwoord — `@storybook/addon-themes` mag uit `packages/ui` (dependency én config).
