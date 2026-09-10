# TC-EBC — jobradar a11y-afronding + score-pil-rol

- **Datum:** 2026-08-27
- **Type:** feature
- **Project:** jobradar (met wijzigingen in `packages/ui` en `packages/tokens`)
- **Klant:** umanex
- **Status:** gebouwd — drie van de vier items gemerged; de pil-rol is afgesplitst (zie A6)

Cross-app geplaatst omdat twee van de vier wijzigingen in de gedeelde lagen landen
(`packages/ui/lib/focus.ts`, `packages/tokens/tokens.json`) en dus buiten `apps/jobradar/`
gelezen moeten kunnen worden.

> **Afsplitsing 2026-08-27.** De pil-rol zit **niet** in deze PR. `figma:check` eist een
> Figma-variabele per tokenrol en draait in CI, en die variabelen kunnen alleen gemaakt worden met
> de Desktop Bridge op *Component library*. Beslissing van Jeroen: de andere drie items nu mergen,
> de pil apart afronden. Het meetwerk staat bij A6 en in de HANDOFF-entry van 2026-08-08, zodat de
> vervolg-PR niet opnieuw hoeft te beginnen.

---

```
TASK:        Sluit de vier openstaande jobradar-items af: contrast van de scheiding in de
             dekkingsindicator, de kopsprong h1→h3, de drie focus-vormen naast elkaar, en de
             bruine score-pil — met één eigen rol voor de pil-achtergrond.

CONTEXT:     Backlog `apps/jobradar/BACKLOG.md` (5 UX-items uit de ux-audit van 2026-08-11) en
             de open HANDOFF-entry van 2026-08-08 over de score-pil. Jeroen heeft per item
             beslist: 1 → text-muted-foreground · 2 → h2 invoegen · 3 → constante in
             @umanex/ui · 4 en 5 → verworpen · 6 → verworpen (mobile niet relevant) ·
             7 → andere harness · HANDOFF → eigen rol voor de pil-achtergrond.

ELEMENTS:    CoverageBar (scheidingsteken) · DashboardClient (h1, tabpanelen, Instellingen-link)
             · JobCard / LeadCard (h3-kaarttitels, Bekijk/Website-links, toon-vacatures-knop) ·
             ScoreBadge (pil) · FilterBar (zoekveld, wisknop, status-select) · TermChips
             (chip-invoer, wisknop) · StatusDropdown (select per kaart) · instellingen-pagina
             (terug-link) · not-found (link) · packages/ui/lib/focus.ts (nieuw) ·
             packages/tokens Semantic/light|dark → score/mid (+ -foreground).

BEHAVIOUR:   Toetsenbord: elk focusseerbaar element toont bij :focus-visible dezelfde ring
             (2px ring in --ring, 2px offset in --background). Muis/aanwijzer: geen zichtbare
             verandering behalve de pilkleur. Schermlezer: h1 → h2 per tabpaneel → h3 per
             kaart, zonder overgeslagen niveau. De pil blijft een statisch label — geen focus,
             geen klik, geen tooltip-trigger (de tooltip hangt aan de wrapper-span).

CONSTRAINTS: Rollaag-only: geen rauwe paletklasse, geen hex, geen arbitrary waarde — de
             `@umanex/tokens guard` en de contrast-check moeten groen blijven. Beide mode-sets
             krijgen de nieuwe rol (de build faalt op asymmetrie). De focus-constante mag de
             bestaande klassenreeks van `buttonVariants()` niet veranderen — cashflow en
             portfolio consumeren die knop. Desktop-web; mobiel is expliciet buiten scope.
             Geen nieuwe dependency, geen nieuw component.
```

---

## Open vragen

- **Beantwoord (2026-08-27):** de rol mag met de hand in de PR, mits Jeroen er direct na de merge
  een **Pull in Tokens Studio** op doet — anders draait de eerstvolgende plugin-push hem terug.
  Die afspraak geldt onverkort voor de vervolg-PR waarin de pil alsnog landt.
- **Open:** de twee Figma-variabelen (`score-mid`, `score-mid-foreground`) in de collectie `Theme`
  van *Component library*. Zonder die is `figma:check` rood en kan de rol niet mee. Zie A6/A13.

## Aannames

- `[ASSUMPTION]` "Helder amber" uit de HANDOFF-entry = `Warning.500` (`#F59E0B`). Dat is exact
  de waarde die vóór de contrastfix als `bg-amber-500` in `ScoreBadge` stond, dus de rol
  herstelt de oorspronkelijke kleur in plaats van een nieuwe te kiezen.
- `[ASSUMPTION]` De rol heet `score/mid` en dekt alléén de middentier. `high` (success) en `low`
  (secondary) blijven op de generieke rollen: die halen AA al en een half-gebruikte schaal van
  drie rollen waarvan er twee nergens vandaan komen is duurder dan één rol die klopt.
- `[ASSUMPTION]` De h2 per tabpaneel is `sr-only`. Het tabblad draagt het label al zichtbaar
  (Radix zet `aria-labelledby` op het paneel); wat ontbreekt is het *niveau* in de koppen-outline,
  niet een tweede zichtbaar label.
- `[ASSUMPTION]` "Andere harness" = de bestaande Playwright-harness uitbreiden met een
  toetsenbord-pass, niet een tweede harness ernaast. Playwright kan wél `Tab` sturen; de
  Chrome-automatisering waarmee de audit draaide kon dat niet, en dát was de limiet.

## Acceptatie

- [x] A1 — bewijs: de scheiding in `CoverageBar` meet **4.97:1** in light (`#667085` op `#FFFFFF`) en **7.32:1** dark (`#98A2B3` op `#0C111D`),
      gemeten met Playwright op de gerenderde DOM van de verse build; anker op de *inhoud* (`|`),
      precies 1 kandidaat. Was 1.24:1.
- [x] A2 — Geen overgeslagen kopniveau op `/` en `/instellingen` — bewijs: kopstructuur-pass van de
      harness, `/` = 336 koppen `h1 → h2 → h3`, `/instellingen` = 1 kop `h1`, nul sprongen.
      Tegenproef: een ingespoten `h5` ná de kaart-`h3`'s wordt gevangen (`flow --selftest`).
- [x] A3 — Eén focus-vorm in jobradar — bewijs: `grep -rn "focus-visible:outline" apps/jobradar`
      geeft nul treffers; de enige resterende `outline-none` staat in een commentaarregel. Acht
      bestanden consumeren `focusRing`, `app/error.tsx` via `<Button>`.
- [x] A4 — bewijs: elk element in de tab-volgorde verandert bij focus zijn computed `outline` of
      `box-shadow` — toetsenbord-pass, `/` = 80 stops, `/instellingen` = 16 stops, nul
      bevindingen; differentieel gemeten (mét focus vs. na `blur()`), niet op klassenaam.
      Tegenproef: een knop met `outline`/`box-shadow` op `none !important` wordt gevangen.
- [x] A5 — `buttonVariants()` levert dezelfde klassen vóór en ná de extractie — bewijs: multiset
      identiek, 19 klassen beide kanten, `alleen in oud: []` / `alleen in nieuw: []`, gemeten door
      het template uit `button.tsx` te evalueren met de echte `focusRing` uit `focus.ts`. De
      *string* verschilt wél: `ring-offset-background` en `transition-colors` wisselen van plaats.
      Volgorde in het class-attribuut heeft geen CSS-effect (de twee raken verschillende
      properties), dus de invariant is de set, niet de volgorde.
- [ ] A6 — **afgesplitst, niet gemerged.** Gemeten op een lokale build mét de rol: light
      `bg #F59F0B` / `tekst #101828` = **8.32:1**, dark `bg #F59F0B` / `tekst #0C111D` = **8.84:1**,
      computed op echte kaarten (n=4). Let op: `#F59F0B`, niet `#F59E0B` — de hex → HSL-triplet →
      rgb-rondgang van de build kost 1/255 in groen. Onzichtbaar, maar het is wat er rendert. Dat
      bewijst dat de kéúze klopt, niet dat hij op `main` staat: `tokens.json` en `ScoreBadge` zijn
      teruggedraaid en het item leeft verder in HANDOFF 2026-08-08.
- [ ] A7 — Tiergrenzen ongewijzigd — **hangt aan A6 en is dus niet van toepassing op deze PR.**
      Wat gemeten is toen de rol er lokaal in zat: de diff toonde identieke drempels
      (`score >= 61` / `score >= 31`), en op de dataset van 334 kaarten viel 0–30 op `secondary`
      (n=330) en 35–45 op `score-mid` (n=4). De scores 31, 60 en 61 kómen in deze dataset niet voor
      en de hoge tier (`≥ 61`) is dus niet uitgeoefend: `[NIET TE VERIFIËREN op het doelwit — die
      scores bestaan niet in de data]`. Wél gemeten: het instrument onderscheidt de tiers
      aantoonbaar (twee niet-lege groepen).
- [ ] A8 — **afgesplitst met A6.** Gemeten toen de rol er lokaal in zat:
      `git diff packages/tokens/build/theme.css` = 4 toegevoegde regels (2 per mode), nul
      wijzigingen elders, dus cashflow en portfolio kregen niets; `contrast` gaf 98 combinaties
      boven AA. Tegenproef gedraaid: `score-mid-foreground` tijdelijk op wit →
      `✗ [light] score-mid-foreground op score-mid 2.13:1` — de check méét die rol echt. Op deze
      PR staat `packages/tokens` ongewijzigd (`git diff origin/main -- packages/tokens` is leeg).
- [x] A9 — De harness faalt aantoonbaar op een a11y-defect — bewijs: `flow --selftest` eindigt op
      **exit 0** met alle drie de assen rood. Onderweg gemeten en gerepareerd: de eerste versie
      hing de kapotte knop achteraan de body, buiten het bereik van de 80 stops, en bleef stil
      groen — precies de faalvorm waarvoor de zelftest bestaat.
- [x] A10 — `/instellingen` staat in `ROUTES` en laadt — bewijs: `✓ /instellingen → 200, 967 tekens`.
      De interactiestap kreeg een expliciete `goto` naar `/`, anders was het status-filter stil
      ingeruild voor een linkklik op de laatste route.
- [x] A11 — `type-check` en `lint` slagen; `scenarios` blijft groen — bewijs: beide zonder output,
      `✓ scenarios: 693 checks over 4 suite(s), en bewezen faalbaar`. De 634 in `CLAUDE.md` was een
      verouderde telling; bijgewerkt.
- [x] A13 — bewijs: `pnpm --filter @umanex/ui figma:check` heeft op deze PR geen nieuwe rol te
      toetsen, want `packages/tokens` is ongewijzigd. De guard viel rood zolang `score-mid` er wél
      in zat (*rol in code zonder Figma-variable: score-mid, score-mid-foreground*) — precies de
      koppeling die de afsplitsing veroorzaakte. Ze staat nu als voorwaarde in de HANDOFF-entry.
- [x] A12 — bewijs: `apps/jobradar/BACKLOG.md` heeft nul open items en drie verworpen items mét
      reden; de HANDOFF-entry van 2026-08-08 staat op `open` met de gemeten waarden en de
      Figma-voorwaarde erin; twee nieuwe items in de root-`BACKLOG.md` (dode focus-klassen op
      `badge.tsx`, jobradar-harness draait niet in CI).

## Beslissingsgeschiedenis

- 2026-08-27: aangemaakt. Backlog-items 4 (signaalbadges dragen geen gewicht) en 5 ("Min. score"
  is ambigu) op verzoek verworpen; item 6 (responsive) verworpen omdat mobiel geen doelwit is.
- 2026-08-27: de tokenrol legt een koppeling bloot die niet in de PLAN-stap zat — `figma:check`
  eist een Figma-variabele per rol, en die guard draait in CI. Toegevoegd als A13; de rol zelf
  blijft ongewijzigd.
- 2026-08-27: `app/error.tsx` bouwde de `Button` met de hand na (zelfde kleuren, geen focus-ring).
  Vervangen door de component in plaats van er één klasse bij te plakken — anders is de fix een
  patch op het symptoom terwijl de duplicatie de oorzaak is.
- 2026-08-27: `packages/ui/tailwind.config.ts` heeft `./lib/**` in zijn content-globs gekregen.
  Zonder die glob genereert Tailwind de focus-klassen voor Storybook niet meer zodra ze alleen nog
  in `lib/focus.ts` staan — gemeten met content op enkel `button.tsx`: 0 treffers zonder de glob,
  1 met. Dat het vandaag tóch werkte, kwam doordat input, checkbox, slider en tabs de reeks nog
  letterlijk dragen; een toevalstreffer, geen ontwerp.
- 2026-08-27: pil-rol afgesplitst. `figma:check` eist een Figma-variabele per tokenrol en draait in
  CI, en de Bridge hing aan een ander bestand. Keuze van Jeroen: de drie a11y-items nu mergen, de
  pil afronden zodra de variabelen in *Component library* staan. Bewust géén tweede backlog-item:
  het werk heeft al een huis in HANDOFF 2026-08-08.
