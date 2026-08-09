# TOKENS-TODO — wat RowTrack's tokenset mist voor web

Bron: `apps/rowtrack/tokens/tokens.json`. Toe te voegen via **Tokens Studio**, niet met
de hand — een handmatige edit wordt bij de eerstvolgende plugin-push overschreven.

Niets hieronder is verzonnen of alvast in code gezet. Zolang een token ontbreekt, staat
het onderdeel dat het nodig heeft stil.

Gemeten op 2026-08-09 tegen commit `3bb516f`.

---

## 1. Blokkerend — contrast

### 1a. Witte tekst op de accentknop haalt geen AA

`fg.onAccent` (#FFFFFF) op `accent.default` (#F05454) = **3.44:1**.

WCAG AA vraagt 4.5:1 voor normale tekst; 3:1 mag alleen bij *grote* tekst (24px regular,
of 18.66px bold). `type.buttonPrimary` is `fontSize.18` met `fontWeight.regular` — dat is
normale tekst. De primaire CTA van de hele site zakt er dus doorheen.

Drie uitwegen, alle drie een tokenwijziging:

| Uitweg | Token | Gevolg |
|---|---|---|
| Accent verdiepen voor vlakken | nieuwe `accent.solid`, donkerder dan #F05454 | Wit haalt AA; de knop wordt visueel zwaarder |
| Donkere tekst op accent | `fg.onAccent` → een donkere waarde | Draait de knop om; wijkt af van de app |
| Knoptekst vergroten/verzwaren | web-`type.buttonPrimary` ≥ 18.66px **bold** | Geen kleurwijziging, wel een web-eigen typeschaal (zie §2) |

**Dit is een ontwerpbeslissing voor Jeroen.** Tot ze genomen is, krijgt de CTA-knop geen
definitieve vorm.

### 1b. `fg.quaternary` is geen tekstkleur

#5C606B op `bg.base` = **2.85:1** — onder de 3:1 die zelfs grote tekst nodig heeft.
Bruikbaar voor scheidingslijnen en decoratie, niet voor letters. Geen tokenwijziging
nodig; wel een regel om te bewaken.

### Wat wél haalt (gemeten, ter referentie)

| Rol | op `bg.base` | AA normaal |
|---|---|---|
| `fg.primary` #F2F4FA | 16.30:1 | ✓ |
| `fg.secondary` #B5B9C2 | 9.12:1 | ✓ |
| `fg.tertiary` #8A8E97 | 5.46:1 | ✓ |
| `accent.default` #F05454 | **5.21:1** | ✓ |
| `achievement.default` #E8DCC4 | 13.20:1 | ✓ |

Let op: het onderzoeksdocument (§11, Caveats) vermoedde dat `#F05454` als tekst onder AA
zou zakken en stelde een extra AA-accent-tekstvariant voor. **Dat token is niet nodig** —
5.21:1 haalt AA voor normale tekst. Het echte probleem zit precies andersom, bij wit óp
het accent (§1a).

---

## 2. Blokkerend — web-typeschaal

`Theme.type.*` bevat 18 rollen, maar ze zijn mobiel geschaald: `fontSize.114` voor het
hero-getal, `44` voor de hero-display, `28` voor de voortgang. Die schaal op een
1440px-canvas zetten geeft telefoon-typografie op een desktop.

De 18 overgeslagen rollen staan in `build/roles.mjs` als `pendingWebTypeRoles`.

Nodig: een web-set, bijvoorbeeld als `Theme/web` of een aparte `Typography/Web`:

- display (Source Serif Pro): 64 / 48 / 36 / 28
- body (Albert Sans): 20 / 18 / 16 / 14
- caption: 13 / 12
- line-height en letter-spacing per stap

### 2a. `letterSpacing` staat in procenten

`letterSpacing.displayTight = "-4.5%"`, `.wide = "20%"`, enzovoort. CSS `letter-spacing`
accepteert **geen** procenten — alleen een lengte. Voor RN werkt dit omdat de generator
het omrekent; op web moet het `em` worden (`-4.5%` → `-0.045em`).

Toe te voegen aan de web-schaal, of de bestaande waarden bij het genereren omrekenen.
Nu nog niet aan de orde, want de web-schaal bestaat nog niet.

### 2b. `fontWeight.italic` en `fontWeight.bold` zijn geen gewichten

```
fontWeight.italic = "Italic"    ← een stijl, geen gewicht
fontWeight.bold   = "Bold"      ← een naam, geen getal
```

De andere vier zijn wél numeriek (`light` 300 … `semibold` 600). In de RN-pipeline werkt
dit omdat die naar fontbestánden mapt; `font-weight: Italic` is in CSS ongeldig en valt
stil terug op `normal`.

Nodig: `fontWeight.bold` → `"700"`, en `italic` verhuizen naar een eigen `fontStyle`-as.
Dit raakt óók de RN-app, dus even afstemmen vóór de wijziging.

### 2c. Fontnaam wijkt af van Google Fonts

`fontFamily.sourceSerif = "Source Serif Pro"`. Google Fonts levert die familie
tegenwoordig als **Source Serif 4**; `next/font/google` kent `Source_Serif_4`, niet
`Source_Serif_Pro`. Geen tokenwijziging nodig als we de mapping documenteren, maar dan
kan een font-drift-guard de twee niet meer letterlijk vergelijken.

---

## 3. Ontbrekend — layout

Geen van deze bestaat in `tokens.json` (0 treffers op `screens`, `breakpoint`,
`container`, `maxWidth`):

- **Breakpoints** — sm 640 / md 768 / lg 1024 / xl 1280
- **Container max-widths** — bv. 1200px voor content, 720px voor lopende tekst
- **Spacing boven 48** — `Core.spacing` loopt tot `48`. Een onepager met secties van
  96px en 128px heeft de bovenkant van de schaal nodig: 64 / 80 / 96 / 128.

---

## 4. Ontbrekend — motion

Geen `motion`, `duration`, `easing` of `transition` in de bron. Nodig voor de
scroll-onthulling in fase 5:

- `motion.duration.fast` 150ms · `.base` 300ms · `.slow` 600ms
- `motion.easing.standard` `cubic-bezier(0.4, 0, 0.2, 1)`
- `motion.easing.entrance` `cubic-bezier(0, 0, 0.2, 1)`
- `motion.easing.exit` `cubic-bezier(0.4, 0, 1, 1)`

---

## 5. Ontbrekend — focus-ring

RowTrack's tokenset heeft **geen enkele** focus-rol — geen kleur, geen breedte, geen
offset. Op mobiel valt dat niet op; op web is een zichtbare focus-ring een AA-vereiste
(WCAG 2.4.7). Nodig:

- `focus.ring` — kleur (kandidaat: `accent.default`, dat 5.21:1 haalt)
- `focus.ringWidth` — bv. 2px
- `focus.ringOffset` — bv. 2px

---

## Wat dit blokkeert

| Fase | Wacht op |
|---|---|
| Componentinventaris (knoppen, focus) | §1a, §5 |
| Onepager-secties S1-S11 | §2, §3 |
| Animaties | §4 |

Kleuren, radii, strokes, sizes en shadows zijn **compleet** — daarop kan wel gebouwd worden.
