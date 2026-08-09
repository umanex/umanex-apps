# RowTrack marketingsite (rowtrack-web)

- **Datum:** 2026-08-09
- **Type:** feature
- **Project:** apps/rowtrack-web
- **Klant:** umanex (eigen product)
- **Status:** gebouwd (fase 0 — fundering)

---

```
TASK:        Bouw de commerciële Nederlandstalige site voor de RowTrack iOS-app: één premium
             onepager (S1-S11) plus de verplichte subpagina's, die converteert naar App
             Store-downloads. Bouwen gebeurt nu; publiceren pas ná de App Store-release.

CONTEXT:     Nieuwe app `apps/rowtrack-web` in de umanex-apps monorepo, naast cashflow,
             portfolio, vyvey en jobradar. De iOS-app zelf is `apps/rowtrack`. Enige
             Nederlandstalige app die de Fluid Rower Apollo XL via Bluetooth FTMS uitleest —
             dat is de differentiator die in de hero staat, niet een vage belofte.
             Doelgroep: Apollo XL-bezitter (primair), fanatieke indoorroeier (secundair),
             design-bewuste indie-app-koper (tertiair). Domein: rowtrack.app.

ELEMENTS:    Onepager /nl — S1 Hero (kop + subkop + App Store-badge + QR + app-screenshot),
             S2 Compatibiliteit (+ merk-disclaimer), S3 Live metrics, S4 Doelmodi (5 segmenten),
             S5 Analyse & splits, S6 PR's, S7 Privacy, S8 Pricing (2 kaarten, aankondiging),
             S9 Over de maker, S10 FAQ-accordion, S11 Slot-CTA, Footer.
             Subpagina's: /nl/privacy, /nl/voorwaarden, /nl/support.
             Componenten: Button, SectionHeading, MetricCard, FeatureRow, PricingCard,
             FAQAccordion, ScreenshotFrame, AppStoreBadge, QRBlock, Footer,
             LanguageSwitcher, SmartAppBanner.
             Machine-leesbaar: robots.txt, sitemap.xml, llms.txt, JSON-LD, AASA.

BEHAVIOUR:   Eén primaire CTA (App Store) herhaald in hero/pricing/slot; geen afleidende
             navigatie. Mobiel → badge + Smart App Banner; desktop → badge + QR.
             Secties onthullen zich bij scroll (fade+rise, stagger, count-up, lijn-teken,
             PR-shine) — one-shot, compositor-only. FAQ-accordion volledig met toetsenbord
             bedienbaar (Enter/Space, focus zichtbaar). Taalwissel nl↔en (en later).
             Alle animatie valt bij `prefers-reduced-motion: reduce` terug op de eindstaat:
             geen beweging, wél volledige zichtbaarheid.

CONSTRAINTS: Dark-only canvas, in RowTrack-DNA (niet umanex-DNA). Token-only: geen hex, geen
             magic number, geen rauwe paletklasse. Alle copy via next-intl uit
             `messages/nl.json`; geen hardcoded string. Next.js 14 App Router + TypeScript +
             Tailwind v3, Vercel, dev-poort 3004, harness-poort 3104. WCAG AA (contrast,
             focus-ring, semantische HTML, toetsenbord). Cookieloze analytics — geen
             cookiebanner. Apple-badge: officiële zwarte badge, niet vertalen/animeren/
             roteren, vrije ruimte ≥ ¼ badgehoogte. Merknaam "Fluid Rower Apollo XL"
             uitsluitend feitelijk, geen logo, met niet-affiliatie-disclaimer. Unit-casing SI
             (W hoofdletter; km/m/min/kcal/bpm/spm klein), punt als decimaalscheiding.
             Hero < 2s. Geen enkele claim buiten de waarheidstabel hieronder.
```

---

## Beslissingen (2026-08-09, door Jeroen)

| # | Beslissing | Gevolg |
|---|---|---|
| 1 | **RowTrack-DNA** via een nieuw web-platform — uitgevoerd als `packages/rowtrack-tokens`, niet in de RN-config (zie geschiedenis) | Site erft de dark-only rollen van de app. Géén cross-app commit nodig. Ontbrekende web-tokens eerst in Tokens Studio. |
| 2 | **Nu bouwen, publiceren ná de App Store-release** | Volledige onepager mét echte badge en QR; de App Store-URL is één config-constante met TODO. Geen wachtlijst, geen e-mailveld, dus geen backend en geen formulier-states. |
| 3 | **€3.99 / €29.99 tonen als aankondiging** | S8 blijft staan, maar expliciet als toekomstige prijs. Er is geen IAP-code — de prijs mag niet als bestaand product geformuleerd worden. |
| 4 | **rowtrack.app, app-constante aanpassen** | `apps/rowtrack/lib/links.ts` gaat naar `https://rowtrack.app/nl/privacy`. Vereist een nieuwe app-build vóór de eerste store-inzending. Aparte, apart geplande commit. |

## Productwaarheid — bindend voor alle copy

Geverifieerd tegen de code op 2026-08-09. De site mag **niets** claimen dat hier niet in staat.

| Onderwerp | Wat waar is | Bron |
|---|---|---|
| Compatibiliteit | Scan matcht op naam-prefix `Rower`, niet op FTMS-service. Alleen de Apollo XL is onderbouwd — géén brede "werkt met elke FTMS-roeier"-claim. | `lib/ble/constants.ts:13-17` |
| FTMS-velden | spm, slagen, afstand, split (instantaneous pace), gemiddeld tempo, watt, gemiddeld vermogen, weerstand, hartslag, MET, verstreken/resterende tijd | `lib/ble/ftms-parser.ts:29-148` |
| Calorieën | **Niet** uit FTMS. App-side VO2/MET-formule; zonder gewicht een terugval op 75 kg, in de app gemarkeerd met een sterretje. | `lib/ble/ftms-parser.ts:111-116`, `lib/calories.ts:1-12` |
| Hartslag | Vraagt een **aparte** BLE-borstband (0x180D/0x2A37). FTMS-HR is enkel fallback. Niet "de roeier meet je hartslag". | `lib/ble/hr-service.ts:16-18` |
| Doelmodi | Vijf segmenten: Geen · Duur · Afstand · Split · Watt. Grenzen: 1-180 min, 500-42000 m, 90-180 s/500m, 50-500 W. | `lib/workout-goals.ts:6,80-85` |
| Live-KPI's | SPLIT · WATT · SPM · BPM · AFSTAND · TIJD · KCAL, herordend per doeltype | `components/workout/ActivePhase.tsx:361-382` |
| Landschap | Active workout heeft portrait én landscape (50/50). De rest van de app is portrait-only. | `lib/orientation.ts:1` |
| Historiek-tabs | Overzicht · Splits · Hartslag — de Hartslag-tab verschijnt **alleen** als de training hartslag heeft. | `app/(tabs)/history/[id].tsx:80-86` |
| Persoonlijke records | **Twee**: langste afstand en snelste 2000m. Géén 500m-PR. Oudere trainingen zonder tijdreeks tonen "—". | `lib/hooks/usePeriodGoal.ts:23-24` |
| Periodedoelen | Week/maand op afstand, duur of aantal trainingen | `supabase/migrations/add_period_goals.sql:2-5` |
| Apple Health | **Nee.** Geen HealthKit, lege entitlements. | `ios/RowTrack/RowTrack.entitlements` |
| Prijzen / Pro | Geen StoreKit, RevenueCat of feature-gating. De Gratis/Pro-splitsing bestaat nog niet in code. | grep over `apps/rowtrack` |
| Backend | Supabase, EU-regio Frankfurt `eu-central-1`. Twee tabellen: `profiles`, `workouts`. RLS op `auth.uid()`. | `docs/privacybeleid.md:194-196`, `supabase/schema.sql:71-130` |
| Hartslag-data | Zonder toestemming wordt hartslag **aan de bron** uit de samples gestript, niet enkel in de UI verborgen. | `app/(tabs)/workout.tsx:122-127` |
| Tracking | Geen analytics, geen crash-reporting, geen advertenties in de app. Geen ranglijst, geen vriendenlijst, geen delen. | `lib/monitoring.ts:1-16`, `docs/privacybeleid.md:184-185` |
| Account verwijderen | Bestaat in de app, via een service-role Edge Function met cascade. | `supabase/functions/delete-account/index.ts` |
| Registratie | Stuurt **geen** bevestigingsmail — dat staat in het privacybeleid en mag de site niet tegenspreken. | `docs/privacybeleid.md:54-57` |
| Data-export | Geen exportknop; verzoeken lopen per e-mail, binnen één maand. | `docs/privacybeleid.md:252-254` |
| Achtergrond | Bluetooth is foreground-only; sluit je de app, dan stuurt hij niets. | `app.json:46-52` |
| Taal | App is NL-only bij launch, geen in-app taalwissel voorzien. | `i18n/index.ts:6-16` |

**Copy-correcties t.o.v. het onderzoeksdocument:** S6 mag geen 500m-PR noemen; FAQ a3 wordt "Nee, RowTrack koppelt (nog) niet met Apple Health"; S3 moet hartslag als losse borstband benoemen en calorieën als berekend; S2 mag niet naar FTMS-in-het-algemeen generaliseren.

## Open vragen

1. **Ontbrekende web-tokens.** RowTrack's tokenset heeft geen breakpoints, container-widths, motion/easing, focus-ring-breedte of web-type-scale. Die horen via Tokens Studio in `apps/rowtrack/tokens/tokens.json` — ik signaleer ze in `TOKENS-TODO.md` en verzin ze niet. Wanneer voeg je ze toe?
2. **Analytics.** Plausible cloud of self-hosted Umami? Nog niet beslist; blokkeert alleen fase 6.
3. **Voorwaarden/EULA.** Bestaat nergens. Zelf schrijven, Apple's standaard-EULA gebruiken, of een jurist?
4. **Maker-foto en app-screenshots.** Er staat geen enkele productscreenshot in de repo. Tot die er zijn, blijft S1/S3/S5 op placeholders staan.

## Aannames

- `[ASSUMPTION: Dev-poort 3004, harness-poort 3104 — de bestaande apps bezetten 3000-3003 en 3100-3103.]`
- `[ASSUMPTION: EN-locale is fase 8; /nl is de enige actieve locale, met x-default op /nl.]`
- `[ASSUMPTION: Geen light-mode — RowTrack's tokenset is dark-only en heeft geen light-variant.]`
- `[ASSUMPTION: De kennisbank (5-8 artikelen) valt buiten deze briefing.]`
- `[ASSUMPTION: Geen formulier op de site, dus geen loading/empty/error-states; de enige
  niet-default toestanden zijn reduced-motion en no-JS.]`

## Acceptatie

**Fundering** — afgerond 2026-08-09, PR #246
- [x] `apps/rowtrack-web` draait op poort 3004 en levert de vijf turbo-scripts (`dev`, `build`, `start`, `lint`, `type-check`) plus `clean` en `flow`
- [x] `pnpm turbo type-check lint build --filter rowtrack-web` slaagt vanuit een verse worktree — en de volledige monorepo-run doet dat ook (18/18 taken)
- [x] `packages/rowtrack-tokens` genereert de RowTrack-rollen als CSS-variabelen (33) plus een Tailwind-preset; `pnpm --filter rowtrack tokens:build` en de vijf bestaande TS-outputs zijn onaangeraakt
- [x] `tokens-sync.yml` regenereert de web-CSS mee bij een push op `tokens.json`, guardt hem op aliassen/leegloop, én bouwt `rowtrack-web` omdat de preset-throw pas bij het laden van de Tailwind-config vuurt
- [x] Ontbrekende web-tokens staan in `packages/rowtrack-tokens/TOKENS-TODO.md`, niet verzonnen in code
- [x] `apps/rowtrack-web/CLAUDE.md` bevat een `## Verify-pad`-sectie met de vijf capabilities
- [x] De app staat in `context.json`
- [x] De laag-discipline-guard dekt de app (137 bestanden), met tegenproef op beide kanten

**Onepager**
- [ ] S1-S11 in de gespecificeerde volgorde, elk met copy uit `messages/nl.json`
- [ ] Geen enkele hardcoded gebruikerszichtbare string in `.tsx`
- [ ] Eén `<h1>` (hero), één `<h2>` per sectie
- [ ] Elke feitelijke claim op de pagina staat in de waarheidstabel hierboven
- [ ] S2 bevat de compatibiliteitsbevestiging, de FTMS-uitleg én de niet-affiliatie-disclaimer
- [ ] S8 toont €3.99/€29.99 zichtbaar én expliciet als toekomstige prijs
- [ ] De achievement-kleur komt uitsluitend in S6 voor; de accentkleur alleen op CTA's, links/hover en actieve staten

**Toegankelijkheid**
- [ ] FAQ-accordion bedienbaar met toetsenbord, zichtbare focus-ring, correcte `aria-expanded`
- [ ] Alle tekst haalt WCAG AA op de dark canvas, gemeten met een contrast-checker en genoteerd
- [ ] Bij `prefers-reduced-motion: reduce` toont elke sectie direct de eindstaat, zonder beweging
- [ ] De pagina is volledig leesbaar zonder JavaScript

**Web-to-app**
- [ ] De App Store-URL zit op één plek, met een TODO die naar de release wijst
- [ ] Mobiel toont de Smart App Banner; desktop toont de QR-code
- [ ] De badge is de officiële zwarte badge, onvertaald, niet geanimeerd, met ≥ ¼ badgehoogte vrije ruimte
- [ ] `/.well-known/apple-app-site-association` wordt geserveerd als `application/json` zonder extensie

**SEO/GEO**
- [ ] `generateMetadata` levert per pagina title/description binnen de lengtegrenzen
- [ ] `alternates.canonical` en `alternates.languages` inclusief `x-default`
- [ ] `sitemap.xml`, `robots.txt` en `llms.txt` worden geserveerd en kloppen met §14
- [ ] JSON-LD (MobileApplication + 3 Offers, FAQPage, Organization) staat in de initiële HTML en valideert
- [ ] De FAQ-vragen op de pagina en in het FAQPage-schema zijn identiek

**Verplichte pagina's**
- [ ] `/nl/privacy` serveert het bestaande `apps/rowtrack/docs/privacybeleid.md` inhoudelijk gelijk
- [ ] `/nl/voorwaarden` en `/nl/support` zijn publiek bereikbaar en indexeerbaar
- [ ] `apps/rowtrack/lib/links.ts` wijst naar de live privacy-URL — apart gepland, vóór de eerste store-inzending

## Beslissingsgeschiedenis

- 2026-08-09: Briefing aangemaakt op basis van het onderzoeksdocument
  `compass_artifact_wf-ee6a98cc…`. Twee aannames uit dat document bewust **niet**
  overgenomen: (1) `apps/watermark-remover` bestaat niet in deze monorepo; (2) het
  voorgestelde losse Style Dictionary-web-platform staat op gespannen voet met de
  bestaande `packages/tokens` → rollaag → Tailwind-preset-pipeline.
- 2026-08-09: **Scope-kantelpunt.** Verificatie tegen de code weerlegt vier dragende
  aannames van het document: de app is niet gepubliceerd, heeft geen monetisatie-code,
  geen HealthKit, en twee PR's in plaats van drie. "Vellum" bestaat niet in de repo —
  RowTrack's tokens zijn `Core/Theme/Component`, dark-only. Waarheidstabel toegevoegd als
  bindende bron voor alle copy; de wachtlijst-variant is afgevallen ten gunste van bouwen
  nu, publiceren na release.
- 2026-08-09: **Uitvoeringswijziging op beslissing 1.** Het web-platform komt in een
  eigen package `packages/rowtrack-tokens` in plaats van als tweede platform in
  `apps/rowtrack/style-dictionary.config.mjs`. Reden: `.githooks/pre-commit` herbouwt
  tokens en stageert daarna uitsluitend `apps/<app>/constants` (regel 100). Output die
  elders landt wordt wél geregenereerd maar niet gestaged — precies het stille
  wegdrijven dat die hook moet voorkomen, en `.githooks` is een canoniek upstream-bestand
  dat niet hier aangepast hoort te worden. Als package valt de build onder turbo's
  `^build` en vervalt bovendien de cross-app commit. Uitkomst identiek: de site draait
  op RowTrack's rollen.
- 2026-08-09: **Contrastmeting weerlegt een aanname van het document.** Accent-als-tekst
  haalt 5.21:1 en dus AA — het voorgestelde extra accent-tekst-token is niet nodig. Het
  echte probleem zit omgekeerd: wit op de accentknop haalt 3.44:1 en zakt door AA. Dat
  raakt de primaire CTA en blokkeert de componentinventaris tot er een tokenbeslissing is.
