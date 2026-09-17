# TC-EBC — Badge-maat en Slider-thumbnaam in @umanex/ui

- **Datum:** 2026-09-17
- **Type:** component
- **Project:** packages/ui (consument: jobradar)
- **Klant:** umanex
- **Status:** gevalideerd (2026-09-17)

---

```
TASK:        Geef Badge een compacte maat als echte variant en de Slider-thumb een toegankelijke naam,
             zodat apps die niet langer lokaal hoeven na te bootsen.
CONTEXT:     Plan delightful-stirring-blossom, fase 4a. jobradar overschrijft Badge tientallen keren
             met `text-2xs`; de thumb van Min. score is het enige naamloze bedieningselement dat de
             naam-as van de jobradar-harness nog toelaat (fase 3). Twee root-BACKLOG-items raken
             hetzelfde bestand: badge.tsx-focusklassen (2026-08-27) en "Compacte maat" (2026-09-07).
ELEMENTS:    badge.tsx — cva-as `size` (default | sm), `whitespace-nowrap` in de basis, focusklassen
             via `focusRing` · slider.tsx — prop `thumbLabel` → `aria-label` op de Thumb · stories voor
             beide · Figma: size-as als variant op de Badge-component (Desktop Bridge) · jobradar —
             Min. score krijgt een thumbnaam, de naam-as verliest zijn uitzondering.
BEHAVIOUR:   `size="sm"` rendert de compacte badge zonder className-override; default blijft pixel-gelijk
             aan vandaag · een badge breekt nooit over twee regels · een focusbare badge toont alleen bij
             toetsenbordfocus een ring · de thumb heeft een berekende naam die de schermlezer voorleest.
CONSTRAINTS: Alleen rol- en schaal-utilities uit de preset, geen arbitrary values · default-varianten
             ongewijzigd voor bestaande consumenten (cashflow, dashboard, jobradar, stories) · Figma volgt
             de keten in packages/ui/CLAUDE.md, via Desktop Bridge, nooit native · alleen in een venster
             tussen twee bibliotheekbatches (anders botst figma/manifest.json) · consumenten omzetten naar
             `size="sm"` is fase 4b, niet hier.
```

---

## Open vragen

_(geen — de keuze "mét Figma-stap" is gemaakt bij het plan; wat nog onbekend is, wordt hieronder gemeten)_

## Aannames

- [ASSUMPTION: `sm` = de maat die jobradar vandaag met `text-2xs` overschrijft; de exacte padding wordt gemeten op
  een bestaande override, niet gekozen.]
- [ASSUMPTION: `thumbLabel` is optioneel — een Slider zonder label blijft renderen zoals nu; de naam-as van de
  harness vangt consumenten die hem vergeten.]
- [ASSUMPTION: de focusklassen van de Badge gaan naar `focusRing` (focus-visible), niet weg: jobradar gebruikt
  `badgeVariants` sinds fase 3 op een focusbare knop.]

## Acceptatie

**Badge — maat**
- [x] U1: `size="sm"` is identiek aan de oude `className="text-2xs"` op hoogte, font, padding, radius en rand — bewijs: eenmalige DOM-meting op de verse storybook-static (scratchpad `badge-meting2.mjs`, 2026-09-17): sm 20px / 11px-14px / 600, padding 2-10-2-10, radius 9999px, rand 1px — identiek aan de oude klassenreeks uit `git show HEAD` met `text-2xs`
- [x] U2: de default-badge is pixel-gelijk: in de geometrie-basislijn veranderen alleen klassen, nul maten — bewijs: `geometry:write` daarna gediffed tegen HEAD: 7 elementen met andere klassen, **0** elementen met een andere `h`, `padding`, `radius`, `border`, `gap`, `font` of `opacity`
- [x] U3: een lange badge in een knellende container blijft op één regel (tegenproef: zonder `whitespace-nowrap`) — bewijs: zelfde meting, container 120px: mét `whitespace-nowrap` 22px, zonder 38px — de badge brak dus echt over twee regels
- [x] U4: op een focusbare badge tekent een muisklik geen ring en de toetsenbordfocus wel (jobradar c10d/c10c) — bewijs: jobradar `flow` run 1 en 2: "c10d: muisklik → focus zonder zichtbare ring; toetsenbordfocus → ring" en "c10c: Enter … laat de opbouw open", ná het weghalen van de lokale `focus:ring-0`-neutralisatie

**Figma**
- [x] U5: `figma:check` was rood op de maat-as vóór de Figma-stap en groen erna — bewijs: vóór de Figma-stap: `FAIL [variant] Badge: variant-assen verschillen — code [size,variant] vs Figma [variant]` (rc=1); erna: `ok [variant] Badge: size=2 × variant=6 — gelijk`, 32 checks groen
- [x] U6: `parity` groen met de nieuwe varianten; elke bekende afwijking draagt zijn reden — bewijs: `parity` rc=0: "74 varianten, Figma en browser gelijk op hoogte, padding, gap, radius, rand, opacity" (was 68) met 10 bekende afwijkingen, elk met de 1px-rand-reden
- [x] U7: `parity` valt om op een uitzondering die niet meer gemeten wordt (nieuwe derde ratel, met tegenproef) — bewijs: tegenproef: een verzonnen variant in `BEKENDE_AFWIJKINGEN` → rc=1 met "staat in BEKENDE_AFWIJKINGEN maar wordt niet gemeten"; daarna byte-gelijk hersteld (shasum van `git diff` gelijk)
- [x] U8: de tekststijl `sans/2xs-semibold` volgt de tokenschaal (11/14 uit `fontSize.2xs`) — bewijs: `figma:check`: "7 text styles volgen de tokenschaal (grootte, regelhoogte, family)" — `sans/2xs-semibold` is 11/14, uit `fontSize.2xs` (0.6875rem/0.875rem)
- [x] U9: het ververste manifest draagt alleen de Badge-pagina en de tekststijlen; Figma-drift van buiten deze fase staat er niet in — bewijs: het ververste manifest verschilde met HEAD op 8 collecties die van buiten deze fase komen (Tokens-Studio-sets in Figma); alleen `textStyles` en `pages.Badge` overgenomen — diff met HEAD noemt precies die twee (plus `variantProperties.size`)
- [x] U10: de node-ids van de bestaande varianten zijn ongewijzigd, dus de deep-links in de stories blijven kloppen — bewijs: manifest ná de bouw: varianten `27:377`, `27:380`, `27:383`, `27:386`, `27:389`, `27:392` ongewijzigd; de zes sm-varianten zijn nieuw (`144:226`…`144:236`). `links --check`: "2 al juist, 0 te wijzigen, 0 probleem"

**Slider — naam**
- [x] U11: een Slider met `thumbLabel` geeft de thumb die berekende naam; zonder blijft hij naamloos (beide gemeten) — bewijs: AX-boom op de verse build: Playground (mét `thumbLabel`) → naam "Minimumscore"; story `Zonder Naam` → naam "" — beide kanten in één meting
- [x] U12: de naam-as van jobradar eist nul uitzonderingen en meet nul naamloze bedieningen op `/`, `/instellingen` en `/plan` — bewijs: jobradar `flow` run 1 en 2: "/ namen: 114 bedienbare elementen, elk met een naam", "/instellingen namen: 25", "/plan namen: 44", zonder uitzonderingsregel
- [x] U13: die as wordt rood zodra `thumbLabel` uit `FilterBar` verdwijnt (tegenproef) — bewijs: tegenproef: `thumbLabel` uit `FilterBar` → "✗ / namen: 1 van 114 bedienbare elementen zonder naam (slider span.block.h-5)", andere routes groen; daarna byte-gelijk hersteld

**Bestaande werking**
- [x] U14: `type-check`, `ds:guard` en de tokens-guard groen — bewijs: `type-check` rc=0, `ds:guard` "9/9 apps", tokens-guard "403 bestanden schoon (1 baseline-uitzondering)" — die uitzondering is de bestaande cashflow-regel uit #524, niet nieuw
- [x] U14b: geen arbitrary values in de twee gewijzigde componenten — bewijs: 0 toegevoegde regels met een `[…]`-patroon in de diff van `badge.tsx` en `slider.tsx` (git diff HEAD~4, `grep '^+' | grep -c '\[[0-9]'`), en de tokens-guard leest die klasse met de nieuwe `arbitrary-spacing`-regel uit #524
- [x] U15: de keten-zelftests groen: `figma:check:selftest`, `figma:recept:selftest`, `figma:poort:selftest`, `parity --selftest`, `links --check` — bewijs: `figma:check:selftest` rc=0, `figma:recept:selftest` rc=0 ("een hernoemde variant in Figma geeft een verschil"), `figma:poort:selftest` rc=0, `parity --selftest` rc=0 (3 gerichte mutaties rood), `links --check` rc=0
- [x] U16: de volledige jobradar-harness groen (de badge-klassen raken elk scherm), inclusief `--selftest` — bewijs: `flow` rc=0 twee keer (209 ✓ in run 2), database-vingerafdruk voor = na; `flow --selftest` rc=0: "alle 6 assen falen wanneer ze horen te falen"
- [x] U17: consumenten zijn in deze fase niet gemigreerd — de 96 `text-2xs`-overrides staan er nog (dat is 4b) — bewijs: `git grep -c text-2xs` over `apps/`: 96 voorkomens ongewijzigd (80 jobradar, 14 cashflow, 2 dashboard) — geen consument gemigreerd

**States (afschrijving)**
- [x] U18: States n.v.t. — Badge is presentationeel; de Slider heeft alleen `disabled`, en die stond al in Figma en in parity — bewijs: Badge heeft geen data of async gedrag; de Slider-`disabled` stond al in Figma en in `parity` (opacity-as, gemeten in de basislijn van deze fase)

**Interactie**
- [x] U19: de toetsenbordbediening van de Slider is ongewijzigd (Radix), en de thumbnaam verandert niets aan de waarde — bewijs: `flow` toetsenbord-pass op `/` groen in beide runs (elke stop met zichtbare focus), en de triage-as "Min. score" ongewijzigd: de thumbnaam voegt alleen een `aria-label` toe

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt vanuit plan fase 4a, op "Doe 4a" van Jeroen.
- 2026-09-17: venster dicht — PR umanex-apps#524 (layout-tokens, andere sessie) wijzigt figma/manifest.json,
  figma-sync-check.mjs, de preset en 11 componenten. Keuze Jeroen: wachten tot #524 gemerged is; de sm-maat van
  de Badge komt dan op de nieuwe spacing-rollen.
