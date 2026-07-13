# Active Workout — Design Snapshot (Figma → code)

**Datum:** 2026-07-13
**Type:** screen (redesign-snapshot / toetssteen voor `verify`)
**Project:** RowTrack · **Bestand:** Figma `T1bGrvIzSNeLyh5CbarATZ` (pagina Screens)
**Bron-frames (6):**

| Variant | node-id |
|---|---|
| Active/Portrait/None | 290:2400 |
| Active/Portrait/Duration | 290:2436 |
| Active/Portrait/Distance | 290:2536 |
| Active/Landscape/None | 290:2746 |
| Active/Landscape/Duration | 290:3359 |
| Active/Landscape/Distance | 290:3406 |

**Doel-frames dekken alleen None / Duration / Distance.** De goal-types `split` en `watts` staan NIET in deze frames — hun pill-strings, subtitle en KPI-volgorde zijn hier niet vastgelegd; behoud voorlopig het huidige codegedrag voor die twee.

> NB: RowTrack gebruikt in code géén Figma-variabelen. Alle waarden hieronder zijn de **letterlijke hex/rgba/px uit het design**; het bijhorende token-pad staat er tussen `[ ]` waar de kleur wél aan een Figma-variabele hangt. Jeroen mapt zelf naar `@/constants`.

---

## Belangrijkste wijzigingen (t.o.v. huidige `ActivePhase.tsx`)

1. **Stop-knop verhuist naar de header top-rechts** (naast de DOEL-pill), hug-breedte ~105px, label **"Stop"** — niet meer de full-width knop onderaan met label "Stop training". Portrait én landscape.
2. **Hero-font wordt Albert Sans Bold, size 114** i.p.v. Source Serif Bold size 96. ⚠️ Dit botst met de bestaande "serif-hero" beslissing — expliciet bevestigen (zie Open vragen).
3. **Hero-blok krijgt een eigen elevated paneel** (`bg/elevated #1A1D24`) dat de vrije ruimte flex-vult; de rest van het scherm is `bg/base #15171C`.
4. **Progress-bar is een aparte full-bleed sectie** tussen hero-paneel en KPI-lijst (portrait), niet meer een 2px-lijntje binnen het hero-blok. Track `#C9B894`, fill = gradient (button-gradient), hoogte 4px, **geen dot**.
5. **Landscape progress-bar = verticale lijn op de 50/50-scheiding**, track `#C9B894`, fill een gradient die **van onder naar boven** vult.
6. **KPI-rijen worden flatte rijen met een hairline-divider** (geen elevated cards, geen border rondom, geen radius). Rijhoogte 56 (portrait). Label `Albert Sans Light 22` in **natuurlijke casing** ("Split 500/m", "Watt", "Afstand", "Kcal"), value `Albert Sans Medium 28`.
7. **Subtitle onder de hero wordt size 36 Albert Sans Light** (`fg/primary #F2F4FA`); rechterhelft toont enkel **"25%"** (niet "25% voltooid"); divider is een 2×36 verticale pill `fg/tertiary #8A8E97`.
8. **DOEL-pill**: hoogte 40 → 48, label wit (`fg/onAccent`) size 14, value Albert Sans Regular 18; None-waarde is **"Geen"** (niet "Geen doel"); units lowercase ("20 min", "10 km").

---

## 0. Frame / container

| | Portrait | Landscape |
|---|---|---|
| Dimensies | 402 × 844 | 874 × 402 |
| Root richting | VERTICAL | HORIZONTAL |
| Background | `#15171C` [bg/base] | `#15171C` [bg/base] |

**Portrait verticale structuur (top→bottom):**
1. `Header` 402×104 — pad **T28 R20 B28 L20**, HORIZONTAL, SPACE_BETWEEN, cAlign MIN (top), gap 48, bg `bg/base`. Bevat [DOEL-pill] [Stop].
2. `Main KPI` 402×384 — VERTICAL, CENTER/CENTER, gap 28, **FILL/FILL** (flex-vult), bg **`#1A1D24` [bg/elevated]**. Bevat hero-getal + subtitle.
3. `ProgressBar` 402×4 — full-bleed sectie (geen h-padding).
4. `KPI Grid` 402×352 — VERTICAL, gap 0, pad **T8 R20 B8 L20**, bg `bg/base`. 6 rijen.

**Landscape horizontale structuur (left→right):**
1. `Main KPI` (links) 435×402 — VERTICAL, CENTER/CENTER, gap 28, FILL/FILL, bg **`#1A1D24` [bg/elevated]**. Alleen hero-getal + subtitle.
2. `ProgressBar` 4×402 — verticale scheidingslijn op x≈435.
3. `Frame 128` (rechts) 435×402 — VERTICAL, pad B8. Bevat: `Header` 435×88 (pad **T20 R20 B20 L20**, SPACE_BETWEEN, gap 48, bg `bg/base`, [DOEL-pill][Stop]) + `KPI Grid` 435×306 (6 flex-vullende rijen).

**DELTA:** de huidige portrait-root is `topSection (pill+hero) → kpiGrid → Stop-knop`; geen elevated hero-paneel en geen full-bleed progress-sectie. Huidige landscape-root is `leftCol (pill-top + hero-center + Stop-onder) | rightCol (KPI's)`. **Design verplaatst pill+Stop naar de rechterkolom-header en maakt de linkerkolom een puur hero-paneel op `bg/elevated`.**

---

## 1. Top-rij (Header) + Stop-knop

### Top-rij
- **Portrait:** HORIZONTAL, `justify = SPACE_BETWEEN`, `align = MIN` (top), gap 48, pad T28 R20 B28 L20, hoogte 104.
- **Landscape:** idem maar in de rechterkolom-header, pad T20 R20 B20 L20, hoogte 88.
- Volgorde links→rechts: **[DOEL-pill] … [Stop-knop]**.
- Afstand tot volgend blok: header is een eigen sectie; daaronder komt (portrait) het hero-paneel, (landscape) de KPI Grid.

**DELTA:** in de huidige code zit de Stop-knop NIET in de top-rij. Portrait: aparte full-width knop onderaan. Landscape: onderaan de linkerkolom. → **Stop-knop moet de top-rij in, rechts van de pill.**

### Stop-knop (component "Button", variant primary)
| Property | Waarde |
|---|---|
| Tekst | **"Stop"** (Albert Sans **Medium** / w500, size 18, ls **-1.5%** = -0.27px, lh 100%, `#FFFFFF` [button/primary/color]) |
| Icoon | trailing pijl **"→"** (VECTOR 9×8, `#FFFFFF`), gap 10 na de tekst |
| Afmeting | HUG breedte ≈105 × **48** hoog (FIXED) |
| Layout | HORIZONTAL, CENTER/CENTER, gap 10, pad **T12 R24 B12 L24** |
| Radius | **9999** (pill) |
| Fill | linear gradient `#F66363` @0 → `#F05454` @1 [gradient/primaryButtonFrom→To] |
| Border | `#F05454` [button/primary/border], breedte 1 |
| Effects (4) | drop `#000000` a0.3 off(0,1) blur2 spread0 · drop `#F05454` a0.2 off(0,6) blur20 spread0 · inner `#B42828` a0.3 off(0,-2) blur4 spread0 · inner `#FFFFFF` a0.22 off(0,1) blur0 spread0 |

**DELTA:** de knop-primitive (`components/Button.tsx`) matcht dit al 1-op-1 — gradient, border, 4 shadows, `radii.full`, height 48, paddingX 24, tekst-token. **Enige wijzigingen zijn op ActivePhase-niveau:** `title="Stop training"` → **`title="Stop"`**, en de knop van full-width/onderaan naar hug-breedte in de header (dus géén `style={{ alignSelf: 'stretch' }}`). Trailing `arrow-forward` icoon is ongewijzigd.

---

## 2. DOEL-pill (component "Doel")

Container:
| Property | Design | Huidige code | Delta |
|---|---|---|---|
| Richting/align | HORIZONTAL, CENTER/CENTER | idem | ongewijzigd |
| Hoogte | **48** | 40 | 40 → 48 |
| Padding | pad T12 R20 B12 L20 (padH **20**, padV 12) | paddingHorizontal 16 | 16 → 20 |
| Gap | 16 | 16 (`space['16']`) | ongewijzigd |
| Radius | **9999** (pill) | `radii.lg` (18) | 18 → 9999 (pill) |
| Background | **`rgba(240,84,84,0.10)`** (niet token-gebonden) | `accent.subtle` = rgba(…,0.06) | 0.06 → **0.10** (geen bestaand token — zie Open vragen) |
| Border | `#F05454` @ **0.12** [accent/muted], w1 | `accent.muted`, w1 | ongewijzigd |

Label (linker tekstnode):
- **String:** characters = `"doel"` (lowercase) + `textCase = UPPER` → rendert **"DOEL"**.
- Font **Albert Sans SemiBold** (w600), size **14**, ls **20%** (=2.8px), lh 125%, kleur **`#FFFFFF` [fg/onAccent]**.
- **DELTA:** huidige `labelGoalPrefix` = AlbertSans SemiBold **11**, ls 2.2, kleur **`fg.secondary` (#B5B9C2)**. → size 11→14, ls 2.2→2.8, kleur grijs→**wit**.

Divider:
- 1 × 16 rechthoek, kleur **`#B5B9C2` [fg/secondary]**, radius 8.
- **DELTA:** huidige divider kleur = `fg.quaternary` (#5C606B). → **fg.quaternary → fg.secondary**.

Value (rechter tekstnode):
- Font **Albert Sans Regular** (w400), size **18**, ls **-2.5%** (=-0.45px), lh 100%, kleur **`#F05454` [accent/default]**, **geen** textCase.
- **Strings per doeltype (letterlijk):**
  - None → **"Geen"**
  - Duration → **"20 min"** (minuten + lowercase "min"; geen seconden in de sample)
  - Distance → **"10 km"** (lowercase "km", geen decimaal bij rond getal)
- **DELTA:** huidige `doelPillValue` = `typeStyles.kpiValue` (SourceSerif Regular **16**, ls -0.4). → font SourceSerif→**Albert Sans Regular**, size 16→18. Strings/casing:
  - None: `'Geen doel'` → **`'Geen'`**
  - Duration: `'{m}:{ss} MIN'` (bv. "20:00 MIN") → design toont **"20 min"** (lowercase, minuten-only). Formaat voor niet-ronde duur onbekend (zie Open vragen).
  - Distance: `'{x,x} KM'` (bv. "10,0 KM") → design toont **"10 km"** (lowercase km, geen decimaal). Formaat voor niet-ronde afstand onbekend.

---

## 3. Hero-blok

Verticale volgorde binnen het hero-paneel: **hero-getal → (gap 28) → subtitle**. De progress-bar zit hier **niet** tussen — die is een aparte sectie (zie §4).

### Hero-getal
| Property | Design | Huidige code | Delta |
|---|---|---|---|
| Font | **Albert Sans Bold (w700)** | `sourceSerifBold` (SourceSerif4_700Bold) | ⚠️ **serif → sans** (bevestigen) |
| Size | **114** | `fontSize['124']` = **96** | 96 → 114 |
| Letter-spacing | **-4.5%** (=-5.13px) | `heroNumeric.letterSpacing` = -4.32 | -4.32 → -5.13 |
| Line-height | 95% (natuurlijk gehouden) | geen `lineHeight` gezet (bewust) | ongewijzigd principe |
| Kleur | `#FFFFFF` [fg/onAccent] | `fg.onAccent` | ongewijzigd |

Hero-strings (letterlijk):
- None → **"03:28"** (verstreken mm:ss, oplopend)
- Duration → **"15:00"** (resterende tijd)
- Distance → **"7.500"** (resterende meters, dotted duizendtal, **geen unit**)

### Subtitle
- **None:** één tekstnode **"1.234m"** — Albert Sans **Light** (w300), size **36**, ls -2.5%, lh 100%, kleur **`#F2F4FA` [fg/primary]**. (dotted duizendtal, "m" **vast** aan getal, geen spatie)
- **Duration / Distance:** een RIJ (HORIZONTAL, CENTER, gap **20**): **[links-value] [divider] [rechts-value]**
  - Links: Duration **"05:00"** (verstreken tijd) · Distance **"2.500"** (verstreken meters, dotted, geen unit). Albert Sans Light 36, `fg/primary`.
  - Divider: **2 × 36** verticale pill, kleur **`#8A8E97` [fg/tertiary]**, radius 8.
  - Rechts: **"25%"** (enkel percentage). Albert Sans Light 36, `fg/primary`.

**DELTA (subtitle):**
- Huidige subtitle-tekst = `typeStyles.activeProgress` (SourceSerif Regular **28**, ls -0.84) kleur **`fg.onAccent` (wit)**. → font SourceSerif→**Albert Sans Light**, size 28→36, kleur wit→**`fg/primary` #F2F4FA**.
- Huidige row-divider = `fg.quaternary`, breedte 1, `alignSelf: stretch`. → design **2px × 36**, **`fg/tertiary` #8A8E97**, radius 8.
- Rechtertekst huidig = **"{n}% voltooid"** → design **"{n}%"** (woord "voltooid" vervalt).
- Distance links huidig = `"2,5 km"` (komma-decimaal km) → design **"2.500"** (dotted meters, geen unit).
- None huidig = `"1.234 m"` (spatie) → design **"1.234m"** (geen spatie).

---

## 4. Progress-bar — PORTRAIT

Aparte **full-bleed sectie** (`ProgressBar` 402×4) tussen het hero-paneel en de KPI Grid — **niet** binnen het hero-blok.

| Property | Waarde |
|---|---|
| Positie | eigen sectie, ná Main KPI-paneel, vóór KPI Grid; volle breedte 402 (geen h-padding) |
| Hoogte | **4** |
| Track-kleur | **`#C9B894` [progressBar/trackColor]** (bestaand token) |
| Fill | horizontale linear gradient `#F66363` → `#F05454`; breedte = pct (Duration/Distance: 100px ≈ **25%**), links-verankerd (links→rechts) |
| Dot | **geen** |
| None-variant | **geen fill** — enkel de egale track-lijn `#C9B894` (4px, volledige breedte) |

**DELTA:** huidige progress-bar zit **binnen** `heroGroup`, tussen hero-getal en subtitle; hoogte **2**; track `progressBar.trackColor`; fill **solid `accent.default`** (geen gradient) + een **6px dot**; alleen zichtbaar als er een goal is. → verplaats naar full-bleed sectie tussen paneel en KPI-lijst; hoogte 2→**4**; solid fill → **gradient `#F66363`→`#F05454`**; **dot weg**; **None toont een egale track-lijn** (nu: geen bar bij goal-loos).

> Split/Watts gebruiken in de huidige code een 100%-gevulde bar met success/warning-kleur; deze frames bevatten die varianten niet — behoud dat gedrag tot er design voor is.

---

## 5. Progress-bar — LANDSCAPE

Verticale lijn (`ProgressBar` 4×402) op de kolomscheiding (x≈435, tussen hero-paneel en rechterkolom).

| Property | Waarde |
|---|---|
| Positie/x | ≈435 (na de 435px linkerkolom) |
| Breedte × Hoogte | **4 × 402** (volle hoogte) |
| Track-kleur | **`#C9B894` [progressBar/trackColor]** |
| Fill-geometrie | verticale linear gradient `#F66363` → `#F05454`; **verankerd aan de ONDERKANT** (`primaryAxisAlignItems = MAX`) → vult **van onder naar boven**. Duration/Distance: fill = 4×100 ⇒ onderste **~25%** gevuld, bovenste ~302px is track |
| None-variant | **geen fill** — egale verticale track-lijn `#C9B894` |

**DELTA:** huidige landscape heeft **geen** verticale progress/divider-lijn tussen de kolommen. → nieuw element toevoegen: 4px verticale lijn, track `#C9B894`, fill-gradient die van onder naar boven groeit met het percentage.

---

## 6. KPI-lijst — PORTRAIT

**Flatte rijen met hairline-divider — GEEN cards.**

| Property | Design | Huidige code | Delta |
|---|---|---|---|
| Rij-hoogte | **56** | 48 | 48 → 56 |
| Rij-background | **geen** (transparant) | `bg.elevated` | **weg** |
| Radius | **geen** | `radii.sm` (8) | **weg** |
| Border rondom | **geen** | 1px `border.default` rondom | **weg** |
| Divider tussen rijen | **hairline bottom-divider `#2C2F37` [border/default]** onder elke rij behalve de laatste | geen (elke rij aparte card) | **nieuw** (hairline tussen rijen) |
| Gap tussen rijen | **0** (rijen sluiten aan, divider ertussen) | `space['8']` | 8 → 0 |
| Layout rij | HORIZONTAL, SPACE_BETWEEN, cAlign CENTER; h-padding via grid (pad L20 R20), niet op de rij | rij paddingHorizontal 18 | grid-padding L20 R20 |
| Label | **Albert Sans Light (w300), size 22, ls 5% (1.1px), lh 125%, `#B5B9C2` [fg/secondary]**, natuurlijke casing | `labelGoalPrefix` (AlbertSans SemiBold 11, ls 2.2, uppercase, fg.secondary) | font-weight SemiBold→**Light**, size 11→22, **uppercase → natuurlijke casing** |
| Value | **Albert Sans Medium (w500), size 28, ls -2.5% (-0.7px), lh 100%, `#F2F4FA` [fg/primary]** | `kpiValue` (SourceSerif Regular 16, ls -0.4, fg.primary) | font SourceSerif→**Albert Sans Medium**, size 16→28 |

**Exacte labels + volgorde per doeltype (letterlijke casing):**
- **None:** `Split 500/m` · `Watt` · `SPM` · `BPM` · `Afstand` · `Kcal`
- **Duration:** `Split 500/m` · `Watt` · `SPM` · `BPM` · `Afstand` · `Kcal`
- **Distance:** `Split 500/m` · `Watt` · `SPM` · `BPM` · **`Tijd`** · `Kcal` *(Afstand vervangen door Tijd)*

**DELTA (labels):** huidige code toont uppercase `'SPLIT 500/M'`, `'WATT'`, `'AFSTAND'`, `'TIJD'`, `'KCAL'` (+ uppercase-transform). Design gebruikt **title/natuurlijke casing zonder transform**: `Split 500/m`, `Watt`, `Afstand`, `Tijd`, `Kcal` (SPM/BPM blijven uppercase acroniemen).

**DELTA (volgorde):** huidige Distance-volgorde in code = `SPLIT, WATT, SPM, BPM, TIJD, KCAL` — matcht design (Afstand→Tijd op positie 5). None/Duration matchen ook. ✓ Volgorde ongewijzigd; enkel casing + styling wijzigt.

---

## 7. KPI-lijst — LANDSCAPE

Zelfde flat-rij-patroon als portrait, in de rechterkolom onder de header.

| Property | Design | Delta t.o.v. huidige code |
|---|---|---|
| Grid | `KPI Grid` 435×306, VERTICAL, gap 0, rijen **flex-vullen** de hoogte | huidige rechterkolom vult ook flex met gap 8 → **gap 0**, rijen als flat-rijen |
| Rij-hoogte | flex ≈ **50–51** (306/6; bij Distance is de Tijd-rij FIXED 56 → rest ~50) | huidige `compact` KPI-cards → **flat rijen** |
| Rij-padding | pad **L20 R20** per rij | — |
| Divider | hairline `#2C2F37` [border/default] onder elke rij behalve de laatste | **nieuw** |
| Label/Value | identiek aan portrait (Light 22 natuurlijk / Medium 28) | idem als §6 |

**Volgorde per doeltype:** identiek aan portrait (None/Duration: Split, Watt, SPM, BPM, Afstand, Kcal; Distance: Split, Watt, SPM, BPM, Tijd, Kcal).

**DELTA:** huidige landscape gebruikt de `KPI`-component in `compact/fill`-modus (elevated cards). → vervangen door dezelfde flatte hairline-rijen als portrait. Pill + Stop verhuizen naar de header bóven deze lijst (§0/§1).

---

## Kleur-/token-mapping (design-hex → bestaand @/constants)

| Design hex/rgba | Token |
|---|---|
| `#15171C` | `bg.base` |
| `#1A1D24` | `bg.elevated` |
| `#F2F4FA` | `fg.primary` |
| `#B5B9C2` | `fg.secondary` |
| `#8A8E97` | `fg.tertiary` |
| `#FFFFFF` | `fg.onAccent` |
| `#F05454` | `accent.default` |
| `#F66363` | `accent.hover` (= `buttonTokens.primary.gradientFrom`) |
| `#2C2F37` | `border.default` |
| `#C9B894` | `progressBar.trackColor` (= `achievement.muted`) |
| gradient `#F66363→#F05454` | `buttonTokens.primary.gradientFrom → gradientTo` |
| **`rgba(240,84,84,0.10)`** (pill-bg) | **geen exact token** — `accent.subtle`=0.06, `accent.muted`=0.12 |

Fonts uit design: hero **Albert Sans Bold**, subtitle & KPI-label **Albert Sans Light (w300)**, KPI-value & Stop **Albert Sans Medium (w500)**, pill-value **Albert Sans Regular (w400)**, pill-label **Albert Sans SemiBold (w600)**.
> `constants/typography.ts` heeft momenteel enkel `albertSansMedium` en `albertSansSemiBold`. Voor dit design zijn ook **Albert Sans Light (300), Regular (400) en Bold (700)** nodig.

---

## Open vragen (bevestigen vóór bouw)

1. **Hero-font: Albert Sans Bold of Source Serif?** Alle 6 frames tonen Albert Sans Bold (114). De huidige code + eerdere beslissing gebruiken bewust Source Serif (serif-hero, zie `rowtrack-serif-vertical-centering`). Is de switch naar sans-serif bedoeld, of is het Figma-design met de verkeerde font gebouwd?
2. **Pill-value formaat bij niet-ronde waarden.** Design toont "20 min" en "10 km" (ronde samples). Wat bij 25:30 duur of 7.500m afstand — "25 min"/"7,5 km", of met precisie? (lowercase units zijn wél zeker.)
3. **Pill-bg opacity 0.10** — nieuw token toevoegen (`accent/…-10`) of inline `rgba(240,84,84,0.10)`?
4. **Nieuwe Albert Sans weights (Light/Regular/Bold)** toevoegen aan de font-pipeline + `fontFamily`-tokens — akkoord?
5. **Split/Watts-varianten** niet in deze frames — huidige gedrag behouden tot er design is?

## Aannames

- `[ASSUMPTION]` De hairline-divider tussen KPI-rijen is ~1px (`StyleSheet.hairlineWidth`); Figma serialiseerde `strokeWeight` als `null` (mixed/per-side), maar alle rijen behalve de laatste dragen kleur `border/default` → duidelijke bottom-divider-intentie.
- `[ASSUMPTION]` De header heeft géén betrouwbare zichtbare onderrand: `strokeWeight` = null en de token verschilt per variant (None: border/default, Duration/Distance: border/strong) — waarschijnlijk geen bedoelde border.
- `[ASSUMPTION]` Landscape rij-hoogtes 50/51 zijn een gevolg van flex-fill (306px / 6 rijen), geen vaste maat.

---

## Addendum — re-sync 2026-07-13 (frames + tokens opnieuw aangepast)

Wijzigingen t.o.v. de body hierboven, gesynct in `ActivePhase.tsx` (zie [[2026-07-13-screen-active-workout-resync]]):

1. **Hero-eyebrows** toegevoegd (via [[2026-07-13-component-active-hero-labels]]): None `TOTALE TIJD`/`TOTALE AFSTAND`, Duration `RESTERENDE TIJD`/`AFGELEGD`, Distance `RESTERENDE AFSTAND`/`AFGELEGD`, Split `HUIDIGE SPLIT 500/M`, Watts `HUIDIGE KRACHT`. SemiBold 16 / 20% / UPPER / `fg.onAccent`; paneel-gap 40, groep-gap 8.
2. **KPI-labels** (alle varianten): `Afstand`→**`Totaal afstand`**, `Kcal`→**`Totaal Kcal`**.
3. **None KPI** dropt de afstand-rij → 5 rijen (Split · Watt · SPM · BPM · Totaal Kcal); afstand staat al als hero-subtitle. Duration/Split/Watts behouden de afstand-rij (6). Distance vervangt afstand door Tijd.
4. **Distance-subtitle** krijgt de unit: `2.500m` (hero-getal blijft zonder unit).
5. **Tokens:** button-typografie → `AlbertSans_400Regular` (i.p.v. Source Serif SemiBold) + gewichten Light/Regular/Bold toegevoegd. Propageert via `Button.tsx`/`@/constants` — geen ActivePhase-wijziging.

**Nog open (niet overgenomen):** Split/Watts DOEL-pill tonen in de frames `2:20 split` / `180W`; code houdt `2:20/500m` / `180 W` tot bevestiging.
