# TC-EBC — Eén woord per begrip, één eenheid per grootheid

- **Datum:** 2026-09-14
- **Type:** feature
- **Project:** rowtrack
- **Klant:** umanex
- **Status:** gepland
- **Bron:** designreview 2026-09-14, bevindingen `haal-woorden` en `afstand-formaat`

---

```
TASK:        Elk begrip krijgt één woord en elke grootheid één schrijfwijze, vastgelegd op één
             plek in plaats van per scherm opnieuw gekozen.

CONTEXT:     Gemeten over 691 tekstnodes in Figma `Screens v2` en over de gebouwde app.
             Vier woorden voor de roeihaal: `Halen` (1×), `SLAGEN` / `TOTALE SLAGEN` (3×),
             `slagfrequentie` (3×), `SPM` (14×). Twee varianten van hetzelfde scherm spreken
             elkaar tegen — *ActivePhase / Samenvatting* zegt "Halen" waar *Samenvatting Zonder
             Gewicht* "SLAGEN" zegt. Idem de split: `Split 500/m` in Playground tegenover
             `Split /500m` in Zonder Hartslagband; het eerste leest als 500 per meter en is fout.
             Idem energie: `Totaal Kcal` naast `Totale kcal` naast `ENERGIE`. En Engels lekt in:
             "Geen workouts in deze periode" en "Workout niet gevonden" tegenover "AANTAL
             TRAININGEN". Op de afstand-as vier formaten voor één grootheid: dezelfde rit van
             13 sep staat op Home als `12.715 m` en op het detail als `12,71 km` — vijf meter
             verdwijnt — naast `2.500 m`, `2,50 km`, `58,5 km` en `0 m`.

             Wat hier NIET bij hoort, want al gesloten: HANDOFF 2026-07-16 *"getal-/unit-
             formattering inconsistent"* is resolved (PR #260) en legde de SCHEIDINGSTEKENS vast
             — punt = duizendtal, komma = decimaal, één spatie vóór de eenheid. Die conventie
             blijft staan. Deze briefing gaat over de EENHEIDSKEUZE en het WOORD, niet over de
             scheidingstekens. Wat er wél bij hoort: `BACKLOG 2026-08-22` staat open op twee
             schrijfwijzen van dezelfde grootheid op Home (`fmtPrDistance` één decimaal tegenover
             `formatPrValue` twee) — dat item wordt hier opgelost en daar gesloten, niet gedupliceerd.

ELEMENTS:    `lib/formatters.ts` · `i18n/` (de NL-stringtabel) · de schermen die de labels dragen:
             ActivePhase, StatsTable, SummaryKpiBand, HistoryScreen, WorkoutDetailScreen,
             ProfileScreen, Home (`app/(tabs)/index.tsx`) · de Figma-frames met dezelfde labels.

BEHAVIOUR:   Geen. Dit is een taal- en formatteerlaag; er verandert niets aan wat een tik doet.
             Wat wél verandert is dat een label op twee schermen hetzelfde is, en dat een afstand
             op twee schermen hetzelfde getal toont.

CONSTRAINTS: Eén bron per begrip. Een label dat op twee plekken staat, staat op één plek in de
             code. Geen nieuwe eenheidsconventie bedenken waar er al een is — de scheidingstekens
             uit PR #260 blijven. De Nederlandse app blijft Nederlands: een Engels woord is een
             bug, geen stijlkeuze, tenzij het vakjargon is dat in het Nederlands niet bestaat.
             Elke zichtbare wijziging gaat door de Figma-keten.
```

---

## Open vragen

Geen. Het enige kritische item is op 2026-09-14 beantwoord; de andere drie zijn niet van
toepassing en staan als zodanig in de acceptatielijst.

**Beantwoord — de woordenlijst.** Keuze van Jeroen, 2026-09-14: het voorstel hieronder wordt
de conventie.

| Begrip | Wint | Verdwijnt | Reden |
|---|---|---|---|
| de roeihaal, als aantal | **haal** (`486 halen`) | `slagen`, `SLAGEN`, `TOTALE SLAGEN` | roeitaal; "slagen" leest als fitnesstaal |
| de roeihaal, als frequentie | **SPM**, alléén als live-meting | `slagfrequentie` in lopende tekst → **haalfrequentie** | een afkorting hoort op een meter, niet in een uitleg |
| het tempo | **`/500m`** | `Split 500/m` | `500/m` leest als 500 per meter en is fout |
| de energie | label **energie**, eenheid **kcal** | `Kcal`, `Totaal Kcal`, `Totale kcal` | kcal is een eenheid en is altijd kleine letter |
| een sessie | **training** | `workout`, `workouts` | de app is Nederlands; "workout" is geen vakjargon zonder NL-equivalent |

Deze lijst is de bron voor de acceptatie-telling verderop: elke term in de kolom *Verdwijnt*
hoort na de bouw op nul te staan.

De andere drie kritische items, expliciet afgeschreven:

- **Component-typologie** — n.v.t. Er komt geen component bij; dit raakt bestaande labels.
- **States** — n.v.t. Geen data-laag in deze wijziging. De lege-toestand-copy ("Geen workouts in
  deze periode" → "Geen trainingen in deze periode") verandert wél, maar de state zelf niet.
- **Interactie-modaliteit** — n.v.t. Er verandert niets aan wat een tik doet.

## Aannames

- `[ASSUMPTION]` De m/km-grens ligt op 10 km: onder die grens meters met duizendtalpunt
  (`12.715 m` blijft `12.715 m`), erboven km met één decimaal. Reden: elke rit in de
  productiedatabase ligt tussen 4 269 en 13 405 m, dus de grens raakt in de praktijk alleen de
  langste ritten — en meters zijn de eenheid waarin roeiers hun ritten benoemen. Maand- en
  jaartotalen staan altijd in km, want daar is de meter betekenisloos.
- `[ASSUMPTION]` Twee decimalen op km verdwijnen overal. `2,50 km` en `12,71 km` worden
  `2.500 m` en `12.715 m`.

## Acceptatie

Elk item één meting, bewijs in de regel.

- [ ] Component-typologie n.v.t. — geen nieuw component in deze wijziging; bewijs: `git diff --name-only`, geen nieuw bestand in `components/`
- [ ] States n.v.t. — geen data-laag geraakt; bewijs: `git diff` raakt geen fetch, hook of query
- [ ] Interactie n.v.t. — geen handler gewijzigd; bewijs: `git diff` raakt geen `onPress`
- [ ] De roeihaal heeft één woord over alle schermen — bewijs: de Figma-teltelling opnieuw draaien over `Screens v2`, alle varianten op nul behalve de gekozen term
- [ ] De split heeft één notatie — bewijs: dezelfde telling, `Split 500/m` op nul
- [ ] Energie heeft één label en één eenheidsschrijfwijze — bewijs: dezelfde telling, `Kcal` met hoofdletter op nul
- [ ] Geen Engels woord meer in NL-copy waar een Nederlands woord bestaat — bewijs: grep op `workout` in `i18n/`, buiten de technische identifiers
- [ ] Dezelfde rit toont hetzelfde getal op Home en op het detailscherm — bewijs: twee screenshots van één rit naast elkaar, het getal genoemd
- [ ] Geen afstand meer met twee decimalen in km — bewijs: node:test op de formatteerfunctie over de grenswaarden
- [ ] De m/km-grens klopt aan beide kanten — bewijs: node:test op 9 999 m en 10 001 m, elk met de verwachte eenheid
- [ ] Nul, negatief en ontbrekend renderen zonder crash en zonder misleidende waarde — bewijs: node:test op `0`, `-1`, `null`, `undefined`
- [ ] De scheidingstekens uit PR #260 zijn ongewijzigd — bewijs: node:test op duizendtalpunt, komma-decimaal en de spatie vóór de eenheid
- [ ] De tegenproef is rood zonder de fix — bewijs: één label terugzetten op zijn oude waarde, de telling moet omvallen (tweezijdig)
- [ ] `lib/formatters.ts` heeft een committed suite — bewijs: `git ls-files apps/rowtrack/lib/formatters.test.ts` geeft een treffer
- [ ] `figma:check` blijft groen — bewijs: exit-code plus het aantal assen uit de uitvoer
- [ ] De beeld-as blijft binnen zijn vloer op `overig` — bewijs: `pnpm --filter rowtrack beeld`, per frame de ontleding, niet de som van `grof`
- [ ] `BACKLOG 2026-08-22` (twee schrijfwijzen op Home) is gesloten met een verwijzing hierheen — bewijs: de Status-regel in dat item

## Let op bij het bouwen

`lib/formatters.ts` heeft nog géén committed test, en `BACKLOG 2026-09-14` legt uit waarom dat
niet triviaal is: de module valt om op zijn eigen extensieloze import van `./workout-goals`
(Node ESM eist de extensie; de bestaande suites importeren daarom mét `.ts`). Die import moet
dus eerst recht, anders is de helft van de acceptatielijst hierboven niet meetbaar. Dat is een
bronwijziging — meld hem, verstop hem niet in deze taak.

## Beslissingsgeschiedenis

- 2026-09-14: aangemaakt uit de designreview van dezelfde dag. Taal en eenheden samengevoegd
  omdat ze dezelfde bron delen (`lib/formatters.ts` + `i18n/`) en dezelfde tegenproef: één
  telling over alle schermen die op nul hoort te staan voor elke verworpen variant.
- 2026-09-14: expliciet afgebakend tegen HANDOFF 2026-07-16 (resolved, PR #260). Dat item ging
  over scheidingstekens, dit over eenheidskeuze en woord. Zonder die afbakening leest een
  volgende sessie het gesloten item als bewijs dat dit al af is.
- 2026-09-14: **de woordenlijst is vastgelegd** (keuze Jeroen) — haal · SPM alleen als
  live-meting · `/500m` · energie met kcal · training. De lijst staat in de Open vragen-sectie
  als tabel, want hij is de bron van de acceptatie-telling: elke verworpen term hoort op nul.
