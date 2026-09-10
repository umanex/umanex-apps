# Storybook → Figma component-export met sync-guard

- **Datum:** 2026-08-25
- **Type:** feature
- **Project:** packages/ui + packages/tokens (monorepo-niveau)
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Exporteer de 11 @umanex/ui componenten naar het Figma-bestand
             "Component library" (key ko2OuasYxyY2YRD69MYhWX), één pagina per
             component, en leg per Storybook-component een deep-link naar die
             pagina. Een guard bewijst dat beide kanten in sync blijven.

CONTEXT:     packages/ui is de gedeelde UI-laag van de umanex-apps monorepo,
             gedocumenteerd in Storybook (11 componenten, 4 tokens-docs pagina's).
             Het Figma-bestand is vandaag volledig leeg: 0 variabelen, 0 styles,
             0 componenten, één lege pagina "Storybook". De rollaag komt uit
             packages/tokens (42 hsl-rollen + 1 raw-rol + radius, 2 modes).
             Figma is dus de ontvanger; tokens.json blijft de bron.

ELEMENTS:    Figma — 1 cover-pagina (Overzicht) · 11 component-pagina's
             (Button, Badge, Card, Checkbox, Input, Label, Separator, Slider,
             Tabs, ThemeToggle, Tooltip) · variable collection "Theme"
             (modes Light/Dark, 43 kleurrollen) · collection "Base" (radius,
             type-schaal) · text styles voor de gebruikte size/weight-paren.
             Code — docs/blocks/FigmaLink.tsx · parameters.figma.url per
             stories-bestand · scripts/figma-sync-check.mjs · packages/ui/CLAUDE.md.

BEHAVIOUR:   Elke component wordt één COMPONENT_SET met variant-properties die
             exact de cva-varianten spiegelen (Button: variant 6 × size 4 ×
             disabled 2; Badge: variant 6; enz.). Elke kleur-, radius- en
             spacing-waarde bindt aan een variable — geen hardcoded waarde.
             In Storybook toont de docs-pagina bovenaan een "Open in Figma"-link
             naar de node van die component-set. De guard vergelijkt beide
             kanten en faalt bij elk verschil.

CONSTRAINTS: Tokens-first (nul hardcoded waarden) en auto layout op elk frame —
             de twee principes van code-naar-figma. Figma-variabelenaam ==
             rolnaam uit roles.mjs, letterlijk. Light/Dark als variable modes,
             niet als losse pagina's. Geen nieuwe npm-dependency (geen
             addon-designs). Geen wijziging aan tokens.json — die stroomt
             één kant op.
```

---

## Open vragen

- Geen. De vier kritische items zijn beantwoord uit de code-bron en de gemeten Figma-staat; de afwegingen staan onder Beslissingsgeschiedenis.

## Aannames

- `[ASSUMPTION: het Figma-bestand "Component library" (ko2OuasYxyY2YRD69MYhWX) is het bedoelde doel — het is het enige umanex-design-system-bestand dat via de Bridge verbonden is, de pagina heette al "Storybook", en het bestand is leeg. Soda+ is óók verbonden maar is een klant-app-bestand.]`
- `[ASSUMPTION: hover- en focus-states worden NIET als Figma-variant gebouwd. In code zijn het alpha-mixen (bg-primary/90) en ring-utilities zonder eigen token; als Figma-variant zouden ze een tweede, token-loze bron worden die stil kan afwijken — dat schendt principe 2 en ondergraaft juist de sync-claim. Disabled wél, want dat is een opacity-regel die 1-op-1 te binden is.]`
- `[ASSUMPTION: de type-schaal gaat als variabelen naar collection "Base" plus text styles voor de paren die de componenten echt gebruiken — niet 12 sizes × 4 weights als 48 styles.]`

## Acceptatie

Sync-invarianten (de guard rekent ze uit, per as, over de hele set — niet per exemplaar):

- [x] Elke rol uit `roles.mjs` bestaat als Figma-variable met exact dezelfde naam — bewijs: `figma:check` → "43 kleurrollen ↔ 43 Theme-variabelen, 1-op-1"; geen tekort, geen overschot (beide richtingen gediff'd)
- [x] Elke Theme-variable heeft een waarde in béide modes, gelijk aan `theme.css` — bewijs: `figma_execute`-vergelijking over 86 mode-waarden, 0 verschillen, tolerantie 1/512; negatieve controle (`primary` tegen `0 56.2% 60%`) gaf `false`, positieve gaf `true`
- [x] Aantal component-pagina's == aantal `*.stories.tsx` (11), namen 1-op-1 — bewijs: `figma:check` → "11 componenten ↔ 11 pagina's, 1-op-1"
- [x] Elke component-pagina draagt precies één top-level component(set) — bewijs: `figma_execute`-inventaris, `pageKinderen: 1` op alle pagina's; **uitzondering** Tabs = 2 (`Tabs` + `TabsTrigger`), want `tabs.tsx` exporteert beide (zie Beslissingsgeschiedenis)
- [x] Elke variant-property spiegelt exact wat de code kent — bewijs: `figma:check` variant-as, 11 componenten groen; verwachting uit cva (Button/Badge) én `argTypes` (disabled/checked/orientation), beide richtingen vergeleken
- [x] Elk `*.stories.tsx` heeft `parameters.figma.url` met de juiste fileKey en een bestaand node-id — bewijs: `figma:check` → "11 deep-links wijzen naar de juiste node"
- [x] De "Open in Figma"-link rendert zichtbaar op de docs-pagina — bewijs: gemeten op de dráaiende Storybook (`:6006`, dev-server uit `packages/ui`): Button → 1 link naar `node-id=27-374`, Card → 1 link naar `node-id=27-432` (beweegt mee met het object), Tokens/Overzicht → 0 links terwijl de pagina wél rendert (negatieve controle)
- [x] Nul hardcoded kleur-, radius- of spacing-waarden in de geschreven nodes — bewijs: enumererende scan over 200 nodes: `rawFills 0 · rawStrokes 0 · rawRadius [] · rawSpacing [] · rawEffects []`
- [x] Elke gebonden property draagt het bedoelde token, beide richtingen — bewijs: partitie-toets i.p.v. steekproef: Button 48 exemplaren → exact 6 signatuur-buckets × 8, elk gelijk aan zijn cva-variant; Badge 6/6. Geen zevende bucket
- [x] `layoutMode !== 'NONE'` op elk composietframe waar spacing bedoeld is — bewijs: scan → `geenAutoLayout: []`; 16 SVG-icoonframes apart geteld en verantwoord (vectorpaden op absolute coördinaten — auto layout kan daar structureel niet)
- [x] Elke TEXT-node hangt aan een text style — bewijs: scan over 55 tekstnodes → `tekstZonderStyle: []`
- [x] `packages/ui/CLAUDE.md` bestaat met een `## Verify-pad`-sectie — bewijs: bestand aangemaakt, 87 regels, tabel met 8 capabilities incl. het commando om de manifest te verversen
- [x] De guard faalt aantoonbaar rood op een geïntroduceerd verschil — bewijs: `figma:check:selftest` → 10 tegenproeven, **beide kanten**: 1 zwijg-kant (ongewijzigde kopie groen) + 9 afgaan-kant, elk op de juiste as. Draait in CI vóór de guard zelf
- [x] `type-check` en `build-storybook` slagen — bewijs: `tsc --noEmit` exit 0; `storybook build` exit 0, "build completed successfully"

**Niet gehaald / bewust open** — geen van deze blokkeert de EXIT, alle drie staan in `BACKLOG.md`:
- `spacing-*`, `border-*`, `icon-stroke` en de shadow-styles hebben geen bron in `tokens.json` (Tailwind- resp. lucide-defaults)
- De guard ziet een wijziging die ín Figma gemaakt wordt pas na een verse manifest — CI heeft geen Figma-toegang
- Hover/focus zijn niet als Figma-variant gebouwd (hun kleuren hebben geen token)

## Beslissingsgeschiedenis

- 2026-08-25: Figma-variabelenaam == rolnaam letterlijk (`sidebar-accent`, niet `sidebar/accent`). Slashes zouden in de Figma-UI mooiere folders geven, maar breken de 1-op-1 mapping met `roles.mjs` en de Tailwind-utility — en juist die 1-op-1 maakt de sync-guard een exacte gelijkheidstest in plaats van een normalisatie-heuristiek.
- 2026-08-25: hover/focus niet als Figma-variant (zie Aannames). Alternatief overwogen: hover wél bouwen met een handmatig gemengde kleur — verworpen omdat die kleur geen token heeft en de export dan met een hardcoded waarde zou sluiten.
- 2026-08-25: `radius-lg/md/sm` en de `spacing-*`-schaal als gegenereerde `Base`-variabelen. Ontdekt bij het lezen van `@umanex/config/tailwind/preset`: `rounded-md` is `calc(var(--radius) - 2px)`, een afgeleide die een Figma-variable niet kan uitdrukken. Hardcoden zou principe 2 schenden; een losse variabele zou stil kunnen afwijken. Opgelost door ze te genereren uit `--radius` en de guard de rekenregel terug te laten rekenen. Spacing kreeg dezelfde behandeling, mét gap-melding — de bron is de Tailwind-default, niet `tokens.json`.
- 2026-08-25: pagina `Tabs` draagt twee nodes. `tabs.tsx` exporteert `TabsTrigger` als eigen component met een active/inactive-state; die als losse set modelleren is design-system-correct en laat `Tabs` er instances van gebruiken (met een echte `label`-property). De acceptatie-regel "precies één set per pagina" is daarop aangepast naar "één top-level component, plus de sub-componenten die de code als aparte export kent".
- 2026-08-25: Input en Slider kregen de as `disabled=false|true` in plaats van `state=default|disabled`. Gevonden door de guard zelf, in zijn eerste run: de code kent die prop als `disabled` (boolean argType), dus `state` was een naam die ik verzon en die aan geen enkele kant van de code bestond.
- 2026-08-25: `icon-stroke` als eigen Base-variabele (waarde 2). De lucide-vectoren droegen een rauwe `strokeWeight`; `border-2` binden zou numeriek kloppen maar semantisch fout zijn (een icoon-lijndikte is geen border-width).
- 2026-08-25: geen `@storybook/addon-designs`. Die addon is de conventionele weg voor design-links, maar is een nieuwe dependency (bevestiging vereist per CLAUDE.md) terwijl een eigen docs-block van ~20 regels hetzelfde levert en meerijdt met de bestaande DocsTemplate.
