# Vyvey Interieur — Rebuild Spec (Framer → Next.js 14)

> **Bron-van-waarheid.** Een developer bouwt hieruit zonder de originele site te zien. Copy = Nederlands (Vlaams), technical notes = English. Onzekerheden zijn gemarkeerd `[ONZEKER]`. Verbatim copy staat tussen aanhalingstekens of in codeblocks — overneem letterlijk.
>
> **Locatie:** `apps/vyvey` (monorepo `umanex-apps`, maar zelfstandig — eigen Tailwind-theme, GEEN `@umanex/ui` / umanex-tokens). De 11 rasterbeelden staan al in `apps/vyvey/public/images/`.
>
> Afgeleid uit de live Framer-site via parallelle extractie (run `wf_f1db8b95-0d9`, 2026-06-19). Begeleidt de TC-EBC `apps/vyvey/briefings/2026-06-19-feature-vyvey-site-migratie.tcebc.md`.

---

## 1. Overzicht

| Item | Waarde |
|---|---|
| **Site-type** | One-pager + 2 legal-subroutes (`/algemene-voorwaarden`, `/privacy`, placeholder-tekst) |
| **Taal** | Nederlands (Vlaams), `<html lang="nl">` |
| **Brand** | Vyvey Interieur — "het andere interieur", interieurbedrijf Jabbeke (BE), 50+ jaar familiebedrijf |
| **Logo** | Vyvey-wordmark = **inline SVG** (geen raster), `viewBox="0 0 180 155"`, fill `#393e46`. Origineel enkel in hero-overlay; rebuild plaatst hem ook in de sticky header. |
| **Umanex-credit** | Kleine inline-SVG in footer (`viewBox="0 0 92 13"`), linkt naar `https://umanex.be` |
| **Icons** | Inline-SVG per USP-card en dienst-categorie (`icon_advies`, `icon_contact`, `icon_totaalinrichting`, `icon_interieurDecoratie`, `icon_decoratie`), fill `#414141` |

### De 11 rasterbeelden — hash → semantische naam → rol → alt

| # | Origineel (in `public/images/`) | Voorgestelde naam | Rol | Px | Alt (NL) |
|---|---|---|---|---|---|
| 1 | `Sny0NGhWOH24V0oK9tzhYRJypRY.png` | `hero-groot.png` | hero Large, tagline+wordmark overlay | 2420×1600 | Sfeervol ingericht interieur door Vyvey |
| 2 | `Yp7KyXea2e7NSXxv7iTotReMy9I.png` | `hero-portret.png` | hero Medium portrait-tile | 800×1200 | Detail van een interieurinrichting van Vyvey |
| 3 | `XsG7i4pvtbqgQ3YNTkIfnlXXEM8.jpg` | `hero-klein-boven.jpg` | hero Small stack boven | 4096×1928 | Interieurproject van Vyvey |
| 4 | `bUYuOXO07PmGFwyjINh06152KM.jpg` | `hero-klein-onder.jpg` | hero Small stack onder | 4096×2639 | Interieurrealisatie door Vyvey |
| 5 | `0T5t7gCr69beaQR0AJOmwmWQPw.jpg` | `dienst-totaalinrichting.jpg` | Totaalinrichting foto | 4096×4096 | Totaalinrichting van een woning door Vyvey |
| 6 | `IrXN6j79XUJfKl00YGFp1zhFLGk.jpg` | `dienst-interieur-decoratie.jpg` | Interieur & decoratie foto | 4096×3218 | Interieur en decoratie met raam-, muur- en vloerbekleding |
| 7 | `rzEIPWO7LacYBV986GAf2ucmyo.jpg` | `dienst-decoratiewerken.jpg` | Decoratiewerken foto | 1200×800 | Decoratie- en schilderwerken door Vyvey |
| 8 | `qpRfhwtFVHXZPnkl1z8wanOVTSA.png` | `team-mieke.png` | portret Mieke | 1024×1024 | Mieke, interieurarchitect en vast contactpersoon bij Vyvey |
| 9 | `sCmMGgnt9Bu0DkCGuPGnQaarqM.png` | `team-erik.png` | portret Erik | 1024×1024 | Erik, interieurarchitect en uitvoerder bij Vyvey |
| 10 | `UB2rWntFRob67d4Z7NnlhP0c.png` | `contact-achtergrond.png` | full-bleed bg contactsectie (GEEN logo) | 2880×1200 | "" (decoratief) |
| 11 | `RykaYNatXidN9Kh7aBapXZqOg.jpg` | `og-image.jpg` | meta og:image, niet in body | 1200×630 | n.v.t. |

Heavy 4096px JPG's (#3,4,5,6) via `next/image` met `sizes` → AVIF/WebP downscales. `width`/`height` uit tabel tegen CLS.

---

## 2. Global design system

### 2.1 Palette

| Hex | Token | Gebruik |
|---|---|---|
| `#ffffff` | `white` | Body-bg; witte secties; cards (radius 8px); witte tekst+knop op contactsectie. Sticky nav = `rgba(255,255,255,0.5)` (glassy) |
| `#f9f7f0` | `cream` | Afwisselende sectie-bg + footer-balk. Tint `rgba(249,247,240,0.1)` op translucent form-velden |
| `#414141` | `ink` | Dominante tekstkleur (`--framer-text-color`); fill USP/contact-iconen; link-hover |
| `#393e46` | `slate` | Fill Vyvey-wordmark. Donkerste brand-ink, enkel logo |
| `#9c7460` | `accent` | Enige accent: divider onder titels (64×2px r1px), brand-marks, 1px divider @0.5, input-icon-color, link-tekst |
| `#976b54` | `accent-emphasis` | Donkerder bruin, emphasized inline tekst |
| `#8a5f4a` | `accent-deep` | Donkerste bruin, hover/pressed |
| `#b3b3b3` | `placeholder` | Skeleton/overlay-fills |
| `#999999` | `input-icon-dark` | Input-icon op donkere-sectie-velden |

**Vervang** Framer-defaults `#0099ff` (focus-ring) en `#f05454` (error) door eigen tokens — niet overnemen.

Theme isolated in `tailwind.config.ts` (`theme.extend.colors.vyvey`) + CSS custom properties in `globals.css`. Geen umanex-tokens.

### 2.2 Type scale — Lexend Deca overal (weights 300/400/600/700), self-hosted via `next/font`. Geen letter-spacing. **Type verandert niet tussen breakpoints.**

| Rol | Size | Weight | Line-height | Voorbeelden |
|---|---|---|---|---|
| nav link | 14px | 600 | 1.2em | DIENSTEN / OVER ONS / CONTACT (uppercase) |
| hero h1 / tagline | 22px | 600 | 100% | "Met passie & expertise creëren wij uw droominterieur." — geen groot display-type, impact = beeld |
| section heading (h2) | 28px | 600 | 1.2em | "Totaalinrichting", "Over ons", "Nood aan inspiratie?" |
| person name | 22px | 600 | 1.2em | "Mieke", "Erik" |
| section subtitle (light) | 24px | **300** | 1.2em | "een klantgerichte aanpak" — enige weight-300 |
| card title | 18px | 600 | 1.2em | "Advies", "Contact", "Openingsuren" |
| body | 16px | 400 | **125%** (USP) / **150%** (diensten+over-ons) | sommige regels 700 (openingsuren-emphasis) |
| button / form label | 14px | 600 | 1.2em | "Verstuur"; input-tekst 14px/400 |
| small / radio label | 12px | 400 | 150% (footer) | "Voormiddag"/"Namiddag"; legal-links |

### 2.3 Breakpoints (mobile-first, 4 stops, content max-width 1152px)

| Naam | min | max | Belangrijkste changes |
|---|---|---|---|
| **Phone** | 0 | 809px | page→390px. Alles → 1 kolom. Sectie-padding 88–108px → **48px**. Beeld-helften → 100%. Footer-row stackt |
| **Tablet** | 810px | 1199px | page 810px. Hero→column. **Alternating image+text-secties: row behouden, beeld→45%**. USP/people→column. Padding ~108/72px |
| **Desktop** | 1200px | 1439px | base. 3 USP row (gap 64px); image+text row (gap 72px, beeld 60%); diensten-detail row (72px); people row (72px). Sectie-pad 88px |
| **Large** | 1440px | ∞ | cap 1440px centered. Gaps/paddings schalen op (124–144px). Type onveranderd |

Tailwind screens: `tablet:'810px'`, `desktop:'1200px'`, `xl:'1440px'`. Let op tablet-uitzondering (alternating secties blijven row).

### 2.4 Framer-motion variants → `lib/motion.ts`

Easing `[0.44, 0, 0.56, 1]` = **verbatim** uit bundle (`shared-lib`, symbool `yo`). Opacity/translateY/duration/delay/stagger = inferred (best-estimate Framer-appear defaults; static export had geen `data-framer-appear-id`). `viewport={{ once: true }}`.

```ts
import type { Variants } from "framer-motion";

const FRAMER_EASE: [number, number, number, number] = [0.44, 0, 0.56, 1];

/** Single element fade-up (hero content, standalone blocks, headings). */
export const appearFadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: FRAMER_EASE, delay: 0 } },
};

/** Image / media column — larger lift, slight lead-in delay. */
export const appearMedia: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: FRAMER_EASE, delay: 0.08 } },
};

/** Staggered container/child — USP cards, dienst-blokken, contact/uren-lijst. */
export const appearStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { delayChildren: 0, staggerChildren: 0.09 } },
};
export const appearStaggerChild: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: FRAMER_EASE } },
};
```

**Variant→sectie:** `appearFadeUp` = hero-content, headings, tekstblokken · `appearMedia` = hero-beelden, dienst-foto's, portretten · `appearStagger*` = 3 USP-cards, 3 dienst-blokken, contact/uren-lijst.

**Reduced-motion (a11y):** bij `prefers-reduced-motion: reduce` direct `visible`-state renderen (`useReducedMotion()`).

---

## 3. Secties (volgorde: header → hero → USP → diensten → over-ons → contact/footer). Anchors: `#diensten`, `#over-ons`, `#contact`.

### 3.1 Header (sticky)
- Nav verbatim: `DIENSTEN` · `OVER ONS` · `CONTACT` → `#diensten` / `#over-ons` / `#contact`, smooth-scroll.
- Wordmark-SVG links (`#393e46`). Desktop: flex row, menu-group gap 48px, padding `0 0 4px 0`, max-width 1440px, `position:sticky`, bg `rgba(255,255,255,0.5)`. Nav 14px/600.
- Mobile: hamburger → overlay/sheet met dezelfde 3 anchors (briefing-element; niet in origineel).
- Geen appear-animatie.

### 3.2 Hero
- h1 verbatim: `Met passie & expertise creëren wij uw droominterieur.`
- Overlay-tekst: `Vyvey, het andere interieur` / `een klantgerichte aanpak`. `[ONZEKER]` mogelijk overlap met USP-intro (§3.3).
- 4-beeld collage: Large `hero-groot.png` (tagline+wordmark overlay) · Medium `hero-portret.png` · Small 2-up `hero-klein-boven.jpg` + `hero-klein-onder.jpg`.
- Desktop: wrapper flex column gap 72px; visuals-row flex row gap 64px; padding `108px 88px`. Mobile: column, beelden 100%, padding 48px.
- Bg wit; overlay-tekst wit op foto. Animatie: content→`appearFadeUp`, beelden→`appearMedia`.

### 3.3 Services-intro / USP
- h2 verbatim: `Vyvey, het andere interieur` + light subtitle `een klantgerichte aanpak` (24px/300) + brown accent-line (`#9c7460`, 64×2px).
- 3 cards (verbatim):
  - **Advies** — "Van kleuren tot materialen, wij begeleiden u als ervaren interieurvormgevers bij het kiezen van de ideale producten die uw ruimte transformeren. U kunt daarbij vertrouwen op onze degelijke vakkennis. Met oog voor detail en uitstraling."
  - **Persoonlijk contact** — "We nemen de tijd om naar uw wensen te luisteren en streven naar een perfecte match tussen u en het eindresultaat. Van 1 ruimte tot een volledige woning op uw maat en binnen uw stijl. In onze showroom heerst een huiselijke en familiale sfeer met steeds dezelfde contactpersoon."
  - **Kwaliteit voor elk budget** — "Onze oplossingen garanderen altijd topkwaliteit die passen binnen uw budget. Uw project toevertrouwen aan Vyvey zorgt voor een esthetische meerwaarde van al uw interieurprojecten. U krijgt kwaliteit en service zonder zorgen."
- Inline-SVG-icoon per card (`#414141`). Desktop: 3 row, gap 64px, witte cards radius 8px box-shadow, titel 18px/600 + body 16px/125%. Mobile: column. Animatie: `appearStagger*`.

### 3.4 Dienstcategorieën (`id="diensten"`) — 3 alternerende image+text blokken
- **Totaalinrichting** (`id=diensten` op block 1), bg **cream**, foto `dienst-totaalinrichting.jpg`, icoon `icon_totaalinrichting`:
  > Wij richten uw interieur in van A tot Z, van eerste advies in de showroom, naar ontwerp tot uitvoering van uw project. Van uw huis maken wij een nieuwe thuis, geheel volgens uw wensen.
- **Interieur & decoratie**, bg **wit**, foto `dienst-interieur-decoratie.jpg`, icoon `icon_interieurDecoratie`:
  > Creëer een unieke sfeer met onze persoonlijke selectie aan kwalitatieve raam-muur-vloerbekleding. Een stijlvol aanbod volgens de laatste trends strekt zich van het aanpakken van één element tot combinaties van verschillende elementen: de juiste verf, muurbekleding in de mooiste texturen (linnen, jute, zijde, fluweel, geweven gras..), panorama's, zonwering, gordijnen, tapijt, karpet, laminaat, vinyl… En dit in uiteenlopende stijlen en prachtige kleurpaletten. Onze plaatsingsdienst bestaat uit een team met ervaren vaklui waarin de zaakvoerder steeds mee werkt. Ook voor wie zelf graag de handen uit de mouwen steekt kan bij ons terecht voor de aankoop van materialen.
- **Decoratiewerken**, bg **cream** + box-shadow `0 4px 4px #00000040`, foto `dienst-decoratiewerken.jpg`, icoon `icon_decoratie`:
  > Voor een thuis vol stijl: professioneel schilderen binnen als buiten, kaleien gevels, behangwerken, plaatsen vloerbekledingen… met kwalitatieve materialen voor elk project! Wij geven niet zomaar een likje verf. Onze persoonlijke manier van werken: eerst de inspiratie en een moodboard, het technisch advies en pas daarna de uitvoering van de werken.
- Desktop: elk block flex row gap 72px, beeld ~60% + tekst fill, **zijden alterneren**, sectie-pad 88px. Heading 28px/600 + body 16px/150%. Mobile: tablet beeld 45% (row), phone column 100%. Animatie: foto→`appearMedia`, tekst→`appearFadeUp`.

### 3.5 Over ons (`id="over-ons"`)
- h2 `Over ons` + intro verbatim:
  > Vyvey - het andere interieur is een trots familiebedrijf met meer dan 50 jaar ervaring in decoratie. Bij ons staat Mieke aan het roer van klantcontact en persoonlijk advies, terwijl Erik garant staat voor de kwalitatieve uitvoering van uw projecten. Onze focus ligt op advies op maat, waarbij we ruim de tijd nemen om in gesprek te gaan en uw wensen grondig te begrijpen. Zo zorgen wij ervoor dat uw decoratiedromen werkelijkheid worden met de finesse en expertise die u verdient.
- **Mieke** — portret `team-mieke.png`, role-pills (verbatim): `Interieurarchitect` · `Onthaal showroom` · `Persoonlijke aanpak` · `Uw vaste contactpersoon`.
- **Erik** — portret `team-erik.png`, role-pills: `Interieurarchitect` · `Schilder - behanger` · `Totaalaanpak` · `Steeds aanwezig op de werkvloer`.
- Desktop: wit, box-shadow `0 0 24px #e0e0e080`, padding `108px 144px 144px`. People-row flex gap 72px; person-name 22px/600; role-pills flex gap 16px. Mobile: people column (gap 48px), detail column (gap 32px), pills column. Animatie: intro→`appearFadeUp`, portret→`appearMedia`, pills→`appearStaggerChild`.

### 3.6 Contact / inspiratie-CTA + footer (`id="contact"`)
- Full-bleed donkere fotografische bg `contact-achtergrond.png` (`object-fit:cover`, GEEN logo). Alle tekst wit.
- h2 verbatim: `Nood aan inspiratie?` · form-intro (700): `Bel mij terug om een afspraak in te plannen:`
- Contact-block verbatim:
  ```
  Hogedijkenstraat  1
  BE - 8490 Jabbeke
  050 81 35 89        → tel:+3250813589
  miekevyvey@skynet.be → mailto:
  BTW BE 0824.546.223
  ```
- Openingsuren (titel `Openingsuren`, regels 1-2 weight 700):
  ```
  Maandag, zon- en feestdagen gesloten
  Dinsdag - zaterdag
  09:30 - 12:00
  Namiddag op afspraak
  ```
- Callback-form rechterkolom (zie §4). Form-velden translucent: bg `rgba(255,255,255,0.2)`, radius **28px**, witte tekst, placeholder wit@0.7. "Verstuur" wit.
- Footer-balk: cream `#f9f7f0`, legal-links `Algemene voorwaarden`→`/algemene-voorwaarden` · `Privacy`→`/privacy` (12px/150%) + umanex-credit-SVG → `https://umanex.be`. Padding `0 0 44px 44px`, row→column op phone.
- Desktop: sectie flex column gap 72px; inner flex row (links info, rechts form), padding `72px 88px`. Mobile: column, padding 48px. Animatie: `appearStagger*` (y:20, dense tekst).

---

## 4. Callback-form (volgt live-site als bron-van-waarheid)

- Intro verbatim: `Bel mij terug om een afspraak in te plannen:` · Submit: `Verstuur`

| # | Label | HTML | Type | Placeholder | Required | Opties |
|---|---|---|---|---|---|---|
| 1 | Naam | input | text | `Uw naam` | **ja** | — |
| 2 | Telefoon | input | tel | `Uw telefoonnummer` | **ja** | — |
| 3 | Dag | select | select | `Kies een dag...` | nee | Kies een dag… (disabled placeholder), Maandag, Dinsdag, Woensdag, Donderdag, Vrijdag, Zaterdag |
| 4 | Voormiddag | input | checkbox | — | nee | label `Voormiddag` |
| 5 | Namiddag | input | checkbox | — | nee | label `Namiddag` |

`[ONZEKER]` Briefing noemde naam/telefoon/e-mail/bericht; live-site wint (taak = getrouwe migratie). Voormiddag/Namiddag = checkboxes (mogen beide).

### Submit-gedrag (nieuw t.o.v. Framer)
POST → `app/api/contact/route.ts` → **Resend**.
1. Client: controlled form, required-validatie op Naam+Telefoon, `fetch('/api/contact', {method:'POST', body:JSON})`.
2. Server: zod-validatie (`naam` min1, `telefoon` min1, `dag` enum optional, `voormiddag`/`namiddag` boolean). Invalid → 400.
3. Resend: `to: miekevyvey@skynet.be`, from = geverifieerd `vyveyinterieur.be`-domein (fallback `onboarding@resend.dev`), key uit `RESEND_API_KEY`.
4. States: **default** / **loading** (knop disabled, "Verzenden…") / **success** (bevestiging i.p.v. form) / **error** (blijft invulbaar, retry).
   - Success-copy `[ONZEKER]`: "Bedankt, we bellen je terug om een afspraak in te plannen."
   - Error-copy `[ONZEKER]`: "Er ging iets mis. Probeer opnieuw of bel ons op 050 81 35 89."
5. A11y: `aria-live="polite"` voor status, `aria-invalid` + gekoppelde error per veld, eigen focus-ring (niet `#0099ff`).

---

## 5. Bekende gaps / `[ONZEKER]` (vóór/tijdens bouw bevestigen)

1. **Form-velden** — live-analyse (naam/telefoon/dag/voormiddag/namiddag) gevolgd i.p.v. briefing (naam/telefoon/email/bericht).
2. **Voormiddag/Namiddag** — checkbox aangehouden.
3. **Hero-tagline duplicatie** — "Vyvey, het andere interieur"/"een klantgerichte aanpak" in zowel hero als USP-intro.
4. **Inline-SVG-paths** — wordmark, umanex-credit, USP/dienst-iconen uit `/tmp/vyvey.html` (of bundle `/tmp/vyvey_shared.mjs`).
5. **Header-logo** — origineel had wordmark enkel in hero; rebuild plaatst in header.
6. **Mobiele nav** — hamburger te ontwerpen (niet in origineel).
7. **Animatie-params** — alleen easing verbatim; rest inferred. Exact: live page recapturen ná JS-run.
8. **Success/error-copy** — voorstellen in §4.
9. **Resend** — `RESEND_API_KEY` + domein-verificatie te regelen door Jeroen.
10. **Legal-content** — definitieve tekst ontbreekt (placeholder).
11. **System-kleuren** — Framer-defaults `#0099ff`/`#f05454` niet overnemen.
12. **Adres dubbele spatie** — "Hogedijkenstraat  1": behouden of normaliseren.
