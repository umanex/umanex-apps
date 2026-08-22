# TC-EBC — PR-detail: welke metric, en zichtbaar in het archief

**Datum:** 2026-08-22
**Type:** feature
**Project:** RowTrack (`apps/rowtrack`)
**Klant:** umanex (eigen product)
**Status:** gebouwd

---

```
TASK:        Een persoonlijk record benoemt wélke metric gebroken is, met de verslagen
             waarde, en die markering is ook zichtbaar in het trainingsarchief.

CONTEXT:     Vandaag vlagt de app een PR met één boolean. `useGoalProgress.ts:113` OR't drie
             metrics samen tot `hasPR`, `workout.tsx:163` schrijft `is_pr: hasPR || null`, en
             de gebruiker leest "Nieuw persoonlijk record. Proficiat!" zonder te weten waarop.
             `prFlags` bereikt `ActivePhase.tsx:43` wél maar wordt daar nooit uitgelezen.
             De archieflijst en de Home-lijst selecteren `is_pr` niet eens, dus records zijn
             niet te scannen — alleen het detailscherm toont een kale 🏅 PR-badge.
             Gemeten aanleiding: de rit van 22-08 (10 km, 45:13) staat op is_pr=true; alleen
             gemiddeld vermogen (143 W tegen 142 W op 20-08) was een record — niet af te lezen
             in de app.

ELEMENTS:    1. `components/PrBadge.tsx` — gedeelde badge, twee groottes (`sm` lijst / `md`
                detail+summary). Extractie van de inline badge in `history/[id].tsx:187`.
             2. PR-banner in de samenvatting-modal (`ActivePhase.tsx:587`) — krijgt metric,
                nieuwe waarde en verslagen waarde.
             3. PR-badge in de archief-rij (`WorkoutCard.tsx:85`), rechts van de datum.
             4. PR-blok op het detailscherm — badge + één regel per gebroken metric.
             5. `lib/personalRecords.ts` — pure module: metric-definities, `buildPrEntries()`
                en `derivePrHistory()` voor ritten zonder opgeslagen detail.
                `lib/prDisplay.ts` draagt de labels en formattering (die mag i18n zien, de
                pure module niet), `lib/hooks/usePrHistory.ts` bedient de drie schermen.
             6. Kolom `workouts.pr_metrics jsonb` — migratie door Jeroen in de SQL Editor.
                `lib/prColumn.ts` vangt het venster ertussen af: zolang de kolom ontbreekt
                valt elke select terug op de versie zónder, in plaats van de hele lijst op
                een ErrorState te zetten.

BEHAVIOUR:   Bij het opslaan van een rit legt de app per gebroken metric vast: welke, de
             behaalde waarde, de verslagen waarde en de datum daarvan. 2K komt erbij als
             vierde metric en wordt — anders dan de andere drie — pas ná de rit bepaald,
             uit `bestTimeForDistance(samples, 2000)`.
             In de archieflijst draagt een PR-rij een badge met metric + waarde ("🏅 143 W");
             tikken opent zoals altijd het detailscherm — de badge is geen apart tapdoel.
             Bij meerdere records toont de lijst het aantal ("🏅 3 records"), het detailscherm
             alle regels.
             Ritten van vóór deze feature krijgen hun metric uit de afleiding over de
             chronologie; levert die niets op, dan blijft de badge kaal (🏅 PR).

CONSTRAINTS: React Native / Expo, `StyleSheet.create()`, iOS-first (portrait; active workout
             landscape). Uitsluitend tokens uit `@/constants` — de bestaande banner gebruikt
             `rgba(245,158,11,0.15)` en dat is een rauwe waarde die mee opgeruimd wordt.
             Iconen via `@expo/vector-icons`. De badge mag de rijhoogte van `WorkoutCard`
             niet veranderen (datumregel heeft lineHeight 13.75) en de rechterkolom
             (afstand + pijl) niet verschuiven — die uitlijning draagt de lijst.
```

---

## Open vragen

Geen. De drie kritische keuzes zijn beantwoord op 2026-08-22:
databron = kolom + afleiding als fallback · plaatsing = badge naast de datum · 2K telt mee als
vierde metric.

## Aannames

- `[ASSUMPTION]` Vorm van `pr_metrics`: een array, één object per gebroken metric.
  ```json
  [{ "metric": "watts", "value": 143, "previous": 142, "previous_at": "2026-08-20T06:53:33Z" }]
  ```
  `metric` ∈ `watts` · `split` · `distance` · `best2k`. Array en niet drie kolommen, omdat
  een rit meerdere records tegelijk kan breken en een vijfde metric anders opnieuw migreert.
- `[ASSUMPTION]` `is_pr` blijft staan naast `pr_metrics` — bestaande queries en het
  detailscherm hangen eraan, en de kolom blijft de goedkope filter.
- `[ASSUMPTION]` Prioriteitsvolgorde wanneer er één metric getoond moet worden:
  afstand → 2K → vermogen → split. Afstand en 2K zijn de records die Home al viert.
- `[ASSUMPTION]` Eenheden: vermogen `143 W` · split `2:15 /500m` · afstand `12,5 km` ·
  2K `8:52`. Formattering hergebruikt `fmtPrDistance` / `fmtPr2k` uit `app/(tabs)/index.tsx`,
  die daarvoor naar `lib/personalRecords.ts` verhuizen.
- `[ASSUMPTION]` De afleiding draait in het lijstscherm één keer over álle ritten van de
  gebruiker (klein: 19 rijen vandaag), niet per rij — anders is het N+1.

## Acceptatie

**Detectie en opslag**
- [x] 2K is een vierde PR-metric: een rit met een snellere `best_2k_seconds` dan elke eerdere
      rit levert `is_pr = true`, ook wanneer vermogen, split en afstand geen record zijn.
      *Bewijs: `PR_METRICS` in `lib/personalRecords.ts:22`, `node --test` 12/12.*
- [x] De hele beoordeling gebeurt bij het opslaan, op de eindwaarden. **Gewijzigd t.o.v. het
      plan:** de live-tak is niet blijven staan maar verwijderd — hij vergeleek een lopend
      gemiddelde dat van true naar false kon terugvallen, en wat bij het stoppen toevallig de
      laatste stand was belandde in `is_pr`. Zijn `tickCount < 10`-drempel is meeverhuisd naar
      `saveWorkout` (`MIN_PR_TICKS`), anders zet een sprintje van vier ticks een onverslaanbaar
      vermogensrecord. *Bewijs: `app/(tabs)/workout.tsx` — `MIN_PR_TICKS`.*
- [x] `pr_metrics` bevat na een PR-rit één object per gebroken metric, met `value`,
      `previous` en `previous_at`; bij een rit zonder PR blijft de kolom NULL.
      *Bewijs: `app/(tabs)/workout.tsx` — `pr_metrics: entries.length > 0 ? entries : null`.*
- [x] Een rit die géén record breekt schrijft `is_pr` NULL — ongewijzigd gedrag.
- [x] De afleiding voor oudere ritten rekent met de drie metrics die de app destijds gebruikte
      (`LEGACY_PR_METRICS`), niet met vier: anders krijgt een rit uit augustus een 2K-record
      toegeschreven dat de app nooit gevierd heeft. *Bewijs: test 'de afleiding rekent
      standaard met de drie metrics'; gemeten op de echte historiek — 20-08 toont 2 records,
      niet 3.*

**Weergave — samenvatting (na het stoppen)**
- [x] De banner noemt de metric, de behaalde waarde en de verslagen waarde met datum.
- [x] Bij meerdere metrics staat er één regel per metric, geen samengevoegde zin.
- [x] De banner gebruikt uitsluitend tokens; `rgba(245,158,11,0.15)` is weg.
      *Openstaand met lagere prioriteit: `bg.raised` is hetzelfde vlak als de KPI-band
      eronder, dus de banner leest minder als viering. Nu opgevangen met een
      `achievement.muted`-rand; een `achievement.surface`-rol in `tokens.json` zou beter zijn
      — tokens raken vraagt akkoord, dus dat is een aparte vraag.*

**Weergave — archieflijst**
- [x] Een rit met `is_pr = true` toont een badge rechts van de datum met metric + waarde;
      bij meerdere records het aantal. *Bewijs: `components/WorkoutCard.tsx` + `prRowLabel`.*
- [ ] **TOESTEL** De rijhoogte is identiek aan een rij zonder badge. *Statisch verankerd: de
      badge erft `lineHeight` van `labelGoalPrefix` (13.75) en heeft geen verticale padding,
      dus hij kan per constructie niet hoger worden — maar gemeten is het niet.*
- [ ] **TOESTEL** De afstand-waarde en de pijl staan op dezelfde x-positie als in een rij
      zonder badge, ook bij vergrote systeemtekst. *De datum krimpt (`flexShrink: 1`,
      `numberOfLines={1}`) en `left` heeft `overflow: 'hidden'` als vangnet.*
- [x] Dezelfde badge verschijnt in de recente-lijst op Home — `is_pr` staat in die select en
      in `HomeWorkout`.
- [x] De rij heeft een `accessibilityLabel` dat de PR benoemt — én de vier bestaande
      datapunten behoudt. Een `Pressable` staat standaard op `accessible`, dus een kaal
      datum-label zou duur, calorieën en afstand uit élke rij hebben laten verdwijnen.

**Weergave — detailscherm**
- [x] De bestaande badge toont nu per gebroken metric een regel met behaalde en verslagen
      waarde, als één screenreader-stop per record.
- [x] Voor de rit van 2026-08-22 levert de afleiding "Vermogen · 143 W · vorige beste 142 W ·
      20 aug", zonder `pr_metrics`. *Gemeten op de echte historiek: 6/6 PR-ritten krijgen een
      metric, 0 kale badges.*
- [x] `best_2k_seconds` staat in de select van het detailscherm.

**States**
- [ ] **TOESTEL** Loading: de bestaande skeletons van lijst en Home verspringen niet door de
      badge. *De badge verschijnt pas als de afleiding klaar is (`ready`), dus hij springt niet
      van kaal naar metric.*
- [x] Empty: geen PR → geen badge, geen lege ruimte die de layout verschuift.
- [x] Onbekend: `is_pr = true` zonder `pr_metrics` én zonder afleiding → kale 🏅 PR-badge.
      *`entriesFor` onderscheidt `null` (geen record) van `[]` (record zonder metric).*
- [x] Error: faalt de afleiding, dan blijft de lijst renderen. **En breder dan gepland:** de
      lijst-, home- en detailquery vallen terug op een select zónder `pr_metrics` zolang die
      kolom niet gemigreerd is (`lib/prColumn.ts`) — zonder dat vangnet toonde de app een
      ErrorState in plaats van een badge minder.

**Edge cases**
- [x] Eerste rit ooit: geen baseline → geen PR. *Test 'de eerste rit ooit is geen record'.*
- [x] Rit met drie of vier records tegelijk: lijst toont het aantal, detail alle regels.
- [ ] **TOESTEL** Langste duur (`1:23:45 u`) + kcal + badge: geen afgekapte of geknepen tekst.
- [x] Ritten van 0 m / 0 s krijgen geen badge. *Test 'ontbrekende en onbruikbare metingen';
      gemeten: de lege rit van 22-08 12:40 blijft zonder badge.*
- [x] `is_pr` NULL versus false: de toets is `=== true`.

**Invariant (meetbare as)**
- [x] `lib/personalRecords.ts` is een pure module, getoetst met
      `node --test lib/personalRecords.test.ts` — 12/12, beide kanten (een rit die een record
      breekt levert de metric, een rit die dat niet doet levert een lege lijst). De suite is
      ook rood geweest: een fixture die de rit van 10-07 miste maakte 30-07 ten onrechte een
      afstandsrecord.
- [x] Over de echte historiek: 6/6 ritten met `is_pr = true` krijgen een metric, 0 kale badges.
      De tegenproef houdt stand — 2026-07-30 brak het 2K-record maar draagt `is_pr = NULL` en
      krijgt géén badge.
- [x] Sorteren gebeurt zonder ICU-collatie. `localeCompare` zet '…T12:42:11+00:00' ná
      '…T12:42:11.735+00:00' (gemeten in Node 24 / ICU 77.1), en Postgres laat de fractie weg
      zodra die nul is — beide vormen staan dus in één historiek. *Regressietest: 'sorteren
      gebeurt zonder collatie'.*

## Beslissingsgeschiedenis

- 2026-08-22: Databron vastgelegd op kolom + afleiding, na de vaststelling dat `is_pr` alleen
  een boolean draagt en 19 bestaande ritten anders zonder uitleg blijven.
- 2026-08-22: Plaatsing in de archieflijst vastgelegd op "badge naast de datum" — de
  alternatieven (achter de calorieën met dot, alleen detail) verloren op respectievelijk
  knel-risico in een flex:1-kolom zonder wrap en op het niet oplossen van de vraag.
- 2026-08-22: 2K toegevoegd als vierde metric, en daarmee verschuift die ene metric van de
  live-tak naar het opslagmoment — de exacte 2K komt pas uit de volledige tijdreeks.
- 2026-08-22: de live PR-check is niet blijven staan maar verwijderd. Twee bronnen die
  hetzelfde vlaggen, met verschillende getallen (lopend gemiddelde tegenover eindwaarde),
  zouden `is_pr` en `pr_metrics` uit elkaar laten lopen. De tick-drempel is meeverhuisd.
- 2026-08-22: `lib/prColumn.ts` toegevoegd na de review. De migratie wordt met de hand
  gedraaid, dus er bestaat een venster waarin de kolom nog niet bestaat; zonder terugval
  zetten home, historiek én detail in dat venster een ErrorState.
