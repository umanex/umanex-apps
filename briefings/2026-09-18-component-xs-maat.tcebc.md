# TC-EBC — xs-maat op Button en Input in @umanex/ui

- **Datum:** 2026-09-18
- **Type:** component
- **Project:** packages/ui (consument: cashflow)
- **Klant:** umanex
- **Status:** gebouwd (2026-09-18 — 19 items met bewijs; de review-ronde loopt nog)

---

```
TASK:        Geef Button en Input een maat van 28 px als echte variant, zodat de ledger van cashflow
             de gedeelde primitives kan gebruiken zonder ze per call-site te overschrijven.
CONTEXT:     Stap 4 van het cashflow-plan (fizzy-strolling-origami), voorwaarde voor stap 6 (ledger en
             login op @umanex/ui) en stap 7 (kleur ontlasten, die de +-knop van SectionBar een Button
             maakt). De ledger meet vandaag 22 plekken op h-7 (28 px) plus één size-7 icoonknop, met de
             maat in app-code. De bibliotheek kent sinds #529/#531 sm = 36 px; niets daaronder.
             Root-BACKLOG "Compacte maat in @umanex/ui" (2026-09-07) sluit hiermee.
ELEMENTS:    tokens.json Theme/base — rol size.control-xs = {spacing.7} · button.tsx — size xs en
             icon-xs · input.tsx — size xs · button.stories.tsx en input.stories.tsx tonen de maat ·
             Figma: xs als variant op de sets Button (27:374) en Input (27:413), Base-variabele
             size-control-xs · apps/cashflow/scripts/render-screens.tsx — rijen voor de nieuwe maat.
BEHAVIOUR:   size="xs" rendert 28 px hoog met text-dense en rounded-sm, zonder className-override ·
             de bestaande maten default, sm, lg en icon blijven pixel-gelijk · de focus-ring blijft
             zichtbaar en wordt niet afgesneden in een dichte rij · een icoonknop op xs is 28 × 28.
CONSTRAINTS: Alleen rol- en schaal-utilities uit de preset, geen arbitrary values · consumenten
             migreren is stap 6, niet hier · Figma volgt de keten in packages/ui/CLAUDE.md, via Desktop
             Bridge, nooit native · alleen in een venster tussen twee bibliotheekbatches (anders botst
             figma/manifest.json) · tokens.json wordt met de hand bewerkt: Jeroen doet na de merge een
             Pull in Tokens Studio, anders draait de eerstvolgende plugin-push de rol terug.
```

---

## Open vragen

_(geen — naam `xs` en de rolvorm `size.control-xs` zijn op 2026-09-18 beslist; wat nog onbekend is, wordt hieronder gemeten)_

## Aannames

- [ASSUMPTION: de maat wordt gemeten op de ledger van cashflow, niet gekozen: 28 px hoogte, `text-dense`
  (13/18), `rounded-sm`, horizontale padding 8 px — de klassenreeks die daar 22 keer staat.]
- [ASSUMPTION: `NativeSelect` en `Textarea` krijgen géén xs; geen enkele consument vraagt er vandaag om
  (gemeten: nul selects en nul textareas onder 32 px in cashflow). De as loopt daarmee uiteen met `Input` —
  dat is de rule-of-three-rem, niet een vergetelheid.]
- [ASSUMPTION: de `gap` van een xs-knop is `gap-1.5` (6 px) in plaats van de rol `gap-inline` (8 px): op
  28 px is 8 px gap breder dan het icoon dat ernaast staat. Een eigen rol daarvoor bestaat pas als een
  tweede component dezelfde maat draagt.]

## Acceptatie

**De maat zelf**
- [x] U1: `Button size="xs"` en `Input size="xs"` meten 28 px hoog — bewijs:
  geometrie-basislijn op de verse storybook-static
  (`geometry:write`, 49 stories / 264 elementen): knop `h=28 padding=0/8/0/8 radius=4px font=13/18 500
  gap=6px`, veld `h=28 padding=0/8/0/8 radius=4px font=13/18 400`
- [x] U2: die gerenderde maten zijn gelijk aan wat de ledger van cashflow vandaag zelf tekent — bewijs:
  de vier klassenreeksen uit `IncomeSection`, `MonthCard` en `SectionBar` gerenderd in dezelfde
  chromium met dezelfde preset (scratchpad `maat/meet.mjs`): veld 28 / 0-8-0-8 / 4px / 13-18, knop
  idem, icoonknop 28 × 28 / 4px — gelijk aan U1 op alle vier de assen. Positieve controle: het
  `h-9`-element in dezelfde meting geeft 36 px, niet 28
- [x] U3: `Button size="icon-xs"` is 28 × 28 px — bewijs: `gedrag-xs.mjs` op de storybook-static meet
  de zes knoppen in `Sizes`: `Toevoegen, compact` 28 × 28 naast `Toevoegen` 40 × 40
- [x] U4: de rol `size.control-xs` wijst naar stap `spacing.7` en levert `h-control-xs` — bewijs:
  `tokens.json` schrijft `"control-xs": { "$type": "sizing", "$value": "{spacing.7}" }`; na
  `pnpm --filter @umanex/tokens build` staat er `--size-control-xs: 1.75rem` in `build/theme.css` en
  `"control-xs": "size-control-xs"` in `build/roles.mjs` — beide auto-gegenereerd, geen handmatige regel

**Bestaande werking**
- [x] U5: de bestaande maten zijn pixel-gelijk — bewijs: de twee basislijnen vergeleken op identiteit
  (story + tag + gesorteerde klassenreeks) in plaats van op index, want een ingevoegd element schuift de
  index op: 254 elementen met dezelfde klassen in beide, **0** verdwenen, **0** met een andere `h`, `w`,
  `padding`, `radius`, `border`, `gap`, `font` of `opacity`. Per maat uitgeschreven: sm 36 / 0-12-0-12,
  default 40 / 8-16-8-16, lg 44 / 0-32-0-32, icon 40 × 40 — vóór en ná gelijk, alle vier op radius 6px
  en font 14/20. Tegenproef: `--mutant` verhoogt één knophoogte met 1 px en het script meldt hem (rc=1)
- [x] U6: geen consument is in deze stap gemigreerd — bewijs: `git grep -c h-7` over
  `apps/cashflow/components` en `app`: 22 voorkomens, ongewijzigd
- [x] U7: type-check, `ds:guard`, `ds:guard:selftest` en de tokens-guard groen — bewijs:
  root `pnpm type-check` rc=0 (9/9 tasks), `@umanex/ui type-check` rc=0, tokens-guard "407
  bestanden schoon (1 baseline-uitzondering)", `ds:guard` "9/9 apps", `ds:guard:selftest` "11/11 — de
  guard gaat rood op elk defect en zwijgt op een schone fixture"
- [x] U8: geen arbitrary values in de gewijzigde bestanden — bewijs: `git diff` tegen `origin/main` op
  `button.tsx`, `input.tsx` én hun twee stories, toegevoegde regels met een `[<cijfer>`-patroon: 0. De
  eerste versie had `w-[92px]` in `input.stories.tsx` (review-bevinding); dat is `w-24`. De tokens-guard
  ziet die klasse per constructie niet — breedtes vallen bewust buiten zijn `arbitrary-spacing`-regel —
  en elke app scant `packages/ui/components/**`, dus hij belandde in vijf app-stylesheets

**Kleur (review-ronde 2026-09-18)**
- [x] U20: xs draagt per variant dezelfde voorgrondkleur en hetzelfde contrast als `sm` — bewijs:
  `kleur-xs.mjs` meet beide maten over vijf varianten op de verse
  storybook-static: default 5,32:1 · secondary 16,11:1 · destructive 6,47:1 · link 5,32:1 · outline
  17,75:1 — op de cent gelijk aan `sm`, en de klassenreeks draagt nu `text-primary-foreground
  text-dense` in plaats van alleen `text-dense`
- [x] U21: de guard die dit defect ving wordt rood zonder de fix — bewijs: tegenproef met de
  `classGroups`-regel uit `lib/utils.ts` weggehaald (`cmp` bewees dat de patch iets raakte):
  `verify:visual` rc=1, "✗ .screens-preview.html: 1 kleurcombinatie(s) onder AA … 3.34:1, nodig 4.5:1"
  — precies de CI-melding op PR #537. Mét de fix rc=0, "dom-sweep: 464 tekstelementen boven AA".
  Hersteld byte-gelijk
- [x] U22: `cn()` lost een tekstmaat uit de tokenschaal op als maat, niet als kleur — bewijs:
  `twmerge.mjs` op de geïnstalleerde `tailwind-merge@2.6.1`, vier gevallen in beide richtingen:
  `text-primary-foreground text-dense` → kleur blijft staan (was: weg) · `text-sm text-dense` →
  `text-dense` wint (was: beide) · `text-dense text-xs` → de consument wint (was: beide) · positieve
  controle `text-2xs` gedroeg zich vóór én na correct, want dát is wél een t-shirtmaat

**Figma**
- [x] U9: `figma:check` was rood op de maat-as vóór de Figma-stap en is groen erna — bewijs: vóór
  (rc=1): `FAIL [variant] Button.size: code [default,icon,icon-xs,lg,sm,xs] vs Figma
  [default,icon,lg,sm]` · `FAIL [variant] Input.size: code [default,sm,xs] vs Figma [default,sm]` ·
  `FAIL [schaal] layout-rollen: size-control-xs ontbreekt in Figma`. Erna (rc=0): `ok [variant] Button:
  disabled=2 × size=6 × variant=6 — gelijk` · `ok [variant] Input: disabled=2 × size=3 — gelijk` ·
  `32 checks groen`
- [x] U10: `parity` groen met de nieuwe varianten erbij — bewijs: rc=0, "106 varianten, Figma en
  browser gelijk op hoogte, padding, gap, radius, rand, opacity" (was 80); de 10 bekende afwijkingen
  zijn alle tien de Badge-rand uit fase 4a, elk met die reden in de regel
- [x] U11: de Base-variabele `size-control-xs` is een alias naar `spacing-7` — bewijs: droge run van
  `zet-base.js` (SCHRIJF=false) meldde één wijziging, `size-control-xs → alias:spacing-7`, scope
  WIDTH_HEIGHT; ná het schrijven telt Base 58 variabelen en zegt `figma:check`: "12 layout-rollen zijn
  in Figma een alias naar hun stap uit Theme/base" (was 11)
- [x] U12: het ververste manifest draagt geen drift van buiten deze stap — bewijs: sleutel-voor-sleutel
  diff tegen `HEAD`, 8 gewijzigde paden en geen andere: `gegenereerd` ·
  `collections.Base.variables.size-control-xs` · `collections.Base.aliassen.size-control-xs` ·
  `textStyles` (7 → 9) · `pages.Button.primary.variantProperties.size` + `.varianten` ·
  `pages.Input.primary.variantProperties.size` + `.varianten`
- [x] U13: de node-ids van de bestaande varianten zijn ongewijzigd — bewijs: oud en nieuw manifest per
  variantnaam vergeleken: Button 48 → 72 met **0** gewijzigde ids en 0 verdwenen, Input 4 → 6 idem;
  set-ids `27:374` en `27:413` gelijk. `links --check`: "2 al juist, 0 te wijzigen, 0 probleem"
- [x] U14: de keten-zelftests groen — bewijs: `figma:check:selftest` rc=0 (32 checks),
  `figma:recept:selftest` rc=0 (8/8, incl. "een hernoemde variant in Figma geeft een verschil"),
  `figma:poort:selftest` rc=0 (25/25), `parity --selftest` rc=0 (o.a. "padding +4 op een knop drie
  niveaus diep: precies één verschil")

**States**
- [x] U15: `disabled` werkt op xs — bewijs: `disabled-xs.mjs` op de storybook-static, beide kanten per
  component (loading/empty/error zijn n.v.t.: presentationele primitives zonder data- of async-laag,
  dus voor die drie is er niets te meten): knop xs disabled `opacity=0.5 pointer-events=none
  disabled=true` tegen actief `opacity=1 pointer-events=auto`; veld xs disabled `opacity=0.5
  disabled=true` tegen actief `opacity=1` — hoogte in alle vier de gevallen 28 px

**Interactie**
- [x] U16: de toetsenbordfocus tekent op xs een ring en een muisklik niet — bewijs: `gedrag-xs.mjs`,
  drie metingen op dezelfde knop: rust `box-shadow: none`, ná Tab `rgb(255,255,255) 0 0 0 2px,
  rgb(196,55,55) 0 0 0 4px` (de 2 px offset plus de 2 px ring van `focusRing`), ná muisklik weer `none`
- [x] U17: een xs-icoonknop haalt de WCAG 2.2 AA-drempel voor doelgrootte — bewijs: gemeten 28 × 28 px
  (`gedrag-xs.mjs`) tegen de drempel van 24 × 24 px

**Edge cases**
- [x] U18: een lang label in een xs-knop blijft op één regel binnen de doos — bewijs: knop met
  `max-width: 60px` en een lang label: doos blijft 28 px, inhoudshoogte 28 in 28. Tegenproef zonder
  `whitespace-nowrap`: 41 in 28 — de tekst loopt dan wél over de vaste hoogte heen. (Eerste opstelling
  knelde alleen de ouder; de knop paste daar gewoon in, dus de tegenproef kon niet vuren — met een
  `max-width` op de knop zelf doet hij dat wel.)
- [x] U19: een xs-invoerveld met een lang bedrag houdt zijn 28 px — bewijs: beide velden van de story
  `ExtraSmall` op `1.234.567.890,99` gezet: hoogte 28 → 28, en `scrollHeight > clientHeight` is voor
  geen van beide waar (geen verticale overloop)

## Beslissingsgeschiedenis

- 2026-09-18: aangemaakt vanuit stap 4 van het cashflow-plan.
- 2026-09-18: de maat heet `xs`, niet `compact` — beslissing Jeroen. Het plan en het BACKLOG-item van
  2026-09-07 schreven `compact`; `xs` sluit aan bij de bestaande reeks `sm`/`lg` en laat het openstaande
  jobradar-item over knoppen van 24–28 px op dezelfde naam landen.
- 2026-09-18: 28 px wordt een benoemde rol (`size.control-xs`), geen kale schaalstap `h-7` — beslissing
  Jeroen. Gevolg: een handmatige regel in `tokens.json` plus een Pull in Tokens Studio na de merge.
- 2026-09-18: scope bijgesteld tegenover het plan. Dat schreef "compacte maat op Button en Input"; PR #531
  gaf `Input` intussen al een maat-as met `sm` = 36 px, dus deze stap zet er een derde stap ónder in plaats
  van de as aan te leggen.
- 2026-09-18: de tekstmaat verhuisde eerst van de basis naar de size-as in `button.tsx` en `input.tsx`,
  omdat `text-dense` geen t-shirtmaat is die tailwind-merge herkent. **Teruggedraaid dezelfde dag**: dat
  was de patch, niet de oorzaak — en hij maakte het erger. `text-dense` belandde in de *kleurgroep*, dus
  `cn()` gooide de `text-primary-foreground` van de variant weg en de xs-knop werd donkerblauw op
  merkrood (3,34:1). De contrast-sweep van cashflow ving het in CI op PR #537. De oorzaak zit in
  `lib/utils.ts`: `extendTailwindMerge` kende de spacing-rollen wel en de typeschaal niet. Die lijst komt
  nu uit de tokenbuild, zodat een volgende stap met een gewone naam (`compact`, `tight`) hier niet
  opnieuw stil de kleur opeet.
- 2026-09-18: `icon-xs` krijgt dezelfde `gap-1.5` als `xs` (review-bevinding). Hij hield eerst de rol
  `gap-inline` (8px) uit de basis, wat de eigen aanname van deze briefing tegensprak: 8px is breder dan
  het icoon dat er in een doos van 28px naast staat. Onzichtbaar bij één kind, zichtbaar bij twee — en
  niets verbiedt dat.
- 2026-09-18: de nieuwe Figma-varianten zijn gekloond uit hun naaste buur (`size=sm` voor `xs`, `size=icon`
  voor `icon-xs`) en daarna aan de rollen gebonden — niet opnieuw getekend. Button en Input staan als
  `LEGACY` in `scripts/figma/doel.mjs`, dus de builder weigert ze (geen bouwhash); klonen houdt de node-ids
  van de bestaande varianten intact, wat de deep-links in de stories nodig hebben.
