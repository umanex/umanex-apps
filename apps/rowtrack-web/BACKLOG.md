# BACKLOG.md — gemeld, niet gebouwd

Dit bestand vangt het werk dat **buiten scope** viel: wat er benoemd is maar niet gedaan, plus de P3-bevindingen uit `ux-audit` en `security-audit`. Zonder deze lijst is "buiten scope gelaten" alleen een zin in een antwoord dat wegscrollt — de melding bestaat dan wel, het werk niet, en niemand kan er later op terugkomen.

Entries komen erbij **op het moment van de melding**, niet aan het einde van de sessie. Een sessie die zonder reflectie afloopt mag geen scope-drop verliezen; dat is precies de vorm waarin ze vandaag verdwijnen.

## Waarom dit geen HANDOFF is

Een handoff-item is **sessie-gebonden**: het zorgt dat de volgende sessie niet koud begint en verdwijnt zodra het opgepakt is. Een backlog-item is **werk** — het blijft bestaan tot het gebouwd of bewust verworpen is, ook als er tien sessies overheen gaan. Ze in één bestand gooien maakt het sessiestart-signaal onbruikbaar: de handoff-lijst hoort kort te zijn, een backlog mag lang worden.

| Soort bevinding | Huis |
|---|---|
| Werk dat benoemd is maar niet gebouwd (scope-drop) | **hier** |
| P3 / nice-to-have uit `ux-audit` of `security-audit` | **hier** |
| Waargenomen fout van een skill of werkprincipe | `LEARNINGS.md` (via `vastleggen`) |
| Onzekerheid, aanname, risico, next-step van déze sessie | `HANDOFF.md` (via `sessie-reflectie`) |
| Durend feit over Jeroen of het project | auto-memory |

## Statussen

- `open` — vastgelegd, nog geen beslissing over genomen. Telt mee bij sessiestart.
- `gepland` — dit gebeurt; het wacht op een plek in de planning.
- `gebouwd` — gedaan. Blijft staan als spoor, met commit of PR erbij.
- `verworpen` — bewust niet doen. **Reden verplicht**, anders komt hetzelfde voorstel over drie maanden terug en begint de afweging van nul.

## Types

`feature` · `refactor` · `fix` · `test` · `infra` · `ux` · `security` · `docs`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Wat:** {1-2 zinnen — wat er gebouwd zou worden}
    - **Waarom niet nu:** {waarom het buiten scope viel}
    - **Eerste zet:** {concreet startpunt of "-"}
    - **Status:** open

<!-- De eerste entry maakt hieronder de juiste laag-header aan. -->

# Project — rowtrack-web

## 2026-08-11 — Hero-kop breekt na "telt." op desktop · [ux]
- **Wat:** De slogan "Elke haal telt." op één regel houden in de hero op brede viewports; nu breekt `text-balance` na "telt." (P3 uit de ux-audit van het premium redesign).
- **Waarom niet nu:** Kop-tuning raakt copy-balans en wordt beter één keer gedaan zodra de EN-locale erbij komt.
- **Eerste zet:** `max-w`-tuning op de h1-kolom in `apps/rowtrack-web/components/sections/Hero.tsx` en op beide locales nameten.
- **Status:** gebouwd — 2026-08-11 op vraag van Jeroen: expliciete `\n` in `hero.title` + `whitespace-pre-line` (i.p.v. `text-balance`); op 1280px én 375px staat "Elke haal telt." op één regel. Bij de EN-locale dezelfde bewuste regelval kiezen. Zit in PR #274.

## 2026-08-11 — Metrics-grid laat een leeg slot rechtsonder · [ux]
- **Wat:** De 7 metric-kaarten in een 4-koloms grid eindigen op 4+3 met een leeg vierde slot (P2/P3-grens uit de ux-audit). Opties: laatste kaart laten spannen, terug naar 3 kolommen, of de rij bewust zo laten.
- **Waarom niet nu:** Een achtste kaart verzinnen mag niet (waarheidstabel); de overige opties zijn smaak en verdienen een blik van Jeroen in plaats van een stille keuze.
- **Eerste zet:** Twee varianten naast elkaar renderen (`col-span`-variant vs. 3-koloms) en kiezen.
- **Status:** gebouwd — Jeroen koos 2026-08-11 zelf voor een achtste kaart; SLAGEN (FTMS-totaal, in de waarheidstabel) vult het slot als 4+4-grid, expliciet geformuleerd als totaal-na-afloop. Zit in PR #274.

## 2026-09-11 — FAQ-accordion: `<dt>`/`<dd>` in `<details>` maakt de `<dl>` ongeldig · [ux]
- **Wat:** `components/ui/FaqAccordion.tsx:27–40` bouwt `<dl>` › `div` › `<details>` › `<summary>` › `<dt>` met de `<dd>` in de `<details>`. Een `dl` mag alleen `dt`/`dd`-groepen (eventueel in een `div`) bevatten; nu ziet een schermlezer geen lijst meer. P2 uit de detector-run naast de ux-audit van 2026-08-11 (die schreef "semantiek ongewijzigd"). Bewijs: axe-core `definition-list` ×1 + `dlitem` ×7, impact serious, op `/nl` bij 1280×800 én 390×844.
- **Waarom niet nu:** raakt de FAQ-markup en het uitklapgedrag; verdient een eigen ronde met de flow-harness (native `<details>` blijft de basis).
- **Eerste zet:** de `dl` laten vallen — `<div>` als lijst, de vraag als `<h3>` in de `<summary>`, het antwoord als `<p>`/`<div>` — of de `<details>` uit de `dl` halen en de vraag-antwoord-paren als `dt`/`dd` in een `div` zetten mét eigen toggle. Nameten: `pnpm --filter rowtrack-web exec node scripts/detect.mjs` → `dlitem` 0.
- **Check:** `pnpm --filter rowtrack-web exec node scripts/detect.mjs --no-build 2>&1 | grep -c dlitem` — nul betekent gefixt; positieve controle: `--full` laat de overige axe-regels staan.
- **Status:** open

## 2026-09-11 — `h1` op `/nl/voorwaarden` breekt op 390px uit zijn vak · [ux]
- **Wat:** "Gebruiksvoorwaarden RowTrack" op 36px: het woord "Gebruiksvoorwaarden" past niet in de kolom — `scrollWidth` 366 tegen `clientWidth` 342, rechterrand op 366 binnen een viewport van 390 (geen paginabrede overflow, wél door de rechtermarge). P3 uit de detector-run; de ux-audit van 2026-08-11 mat overflow alleen op `/nl` bij 375. Bewijs: impeccable `text-overflow` "h1 overflows its box by 24px" bij 390×844, DOM-meting met Playwright.
- **Waarom niet nu:** cosmetisch en beperkt tot één juridische pagina; de juiste fix (kleinere mobiele maat, `overflow-wrap: anywhere` of `hyphens: auto` met `lang="nl"`) is een keuze over de kop-typografie van alle drie de juridische pagina's tegelijk.
- **Eerste zet:** `text-3xl` op mobiel voor de juridische `h1`'s, of `[overflow-wrap:anywhere]` op precies die kop; nameten op 390 én 375.
- **Check:** `pnpm --filter rowtrack-web exec node scripts/detect.mjs --no-build 2>&1 | grep -c text-overflow` — nul betekent gefixt.
- **Status:** open

## 2026-09-11 — Regels van 122–139 tekens op de juridische pagina's en delen van `/nl` · [ux]
- **Wat:** Bij 1280×800 meet impeccable regels van ~96 (×4), ~122 (×7) en ~139 (×1) tekens op `/nl`, en ~139 op `/nl/support`, `/nl/privacy` en `/nl/voorwaarden`; comfortabel is 45–80 (WCAG 1.4.8 noemt 80). P3 uit de detector-run; de ux-audit van 2026-08-11 beoordeelde de maat niet. Bij 390 verdwijnen ze vanzelf.
- **Waarom niet nu:** een `max-width` op de tekstkolommen raakt de hele desktop-layout van de juridische pagina's en de metrics-beschrijvingen op `/nl`; smaak en ritme horen bij Jeroen.
- **Eerste zet:** `max-w-prose` (65ch) op de tekstkolom van de drie juridische pagina's; op `/nl` per sectie kijken welke `p` de 122 haalt (de metrics-kaarten) en daar `max-w-[60ch]` toetsen tegen het grid.
- **Check:** `pnpm --filter rowtrack-web exec node scripts/detect.mjs --no-build 2>&1 | grep -c line-length` — nul bij 1280 betekent gefixt; de tegenproef is dezelfde run mét een kolom op `max-w-none`.
- **Status:** open

## 2026-09-11 — Elf inhoudsblokken op `/nl` staan buiten een landmark · [ux]
- **Wat:** axe-core `region` (best-practice, moderate) telt 11 nodes op `/nl` waarvan de inhoud niet in een landmark (`main`, `nav`, `header`, `footer`, `section` mét naam) valt — o.a. `.md\:py-36` en `#compatibiliteit`. Schermlezer-gebruikers die per landmark navigeren slaan die blokken over. P3 uit de detector-run van 2026-09-11, bij 1280×800 én 390×844.
- **Waarom niet nu:** best-practice, geen WCAG-schending; de fix (secties in `<main>` of elke `<section>` een `aria-labelledby` naar haar `h2`) raakt de hele pagina-opbouw en hoort bij de `dl`-fix van de FAQ in één ronde.
- **Eerste zet:** tellen wat er nu ís — `grep -c '<main' app/[locale]/page.tsx` — en dan óf één `<main>` om alle secties, óf per `<section>` een `aria-labelledby`; nameten met het script.
- **Check:** `pnpm --filter rowtrack-web exec node scripts/detect.mjs --no-build 2>&1 | grep -c ' region '` — nul betekent gefixt.
- **Status:** open

## 2026-09-16 — Web-tokens ontbreken; de site draait op Tailwinds schaal · [tokens]
- **Wat:** Kleuren zijn token-only en bewaakt, maar élke maat (`text-5xl`, `px-6`, `max-w-5xl`, `py-24`) komt uit Tailwinds eigen schaal. RowTrack's tokenset heeft geen web-typeschaal, geen spacing boven 48 en geen container-widths; er staan `TODO`-markers over elf sectiebestanden plus `Section.tsx` en `globals.css`.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Check gemeten 2026-09-16: 0, onveranderd sinds 2026-08-27.
- **Eerste zet:** De ontbrekende assen in Tokens Studio zetten (`packages/rowtrack-tokens/TOKENS-TODO.md` §2 t/m §5), dan `Section.tsx` en `SectionHeading.tsx` eerst — die twee dragen het leeuwendeel van de ritmiek.
- **Check:** `git ls-files apps/rowtrack-web | grep -ci token` — 0 betekent dat er nog geen web-tokenbestand is.
- **Status:** open

## 2026-09-16 — Wit op de accentknop haalt geen AA · [a11y]
- **Wat:** `fg.onAccent` (#FFFFFF) op `accent.default` (#F05454) meet 3,44:1; AA vraagt 4,5:1 en `type.buttonPrimary` is 18px regular. Nog onzichtbaar omdat er geen echte CTA-knop met tekst op accent bestaat; zodra die er komt bijt dit meteen, en het raakt óók de app.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16. Check gemeten 2026-09-16: accent #F05454, onAccent #FFFFFF, onveranderd.
- **Eerste zet:** Kies uit de drie uitwegen in `TOKENS-TODO.md` §1a (accent verdiepen · donkere tekst op accent · knoptekst ≥18.66px bold). Een AA-accent-tekstvariant is NIET nodig — accent-als-tekst haalt 5,21:1.
- **Check:** `grep -o '#F05454' apps/rowtrack/tokens/tokens.json` naast `grep -A2 '"onAccent"' apps/rowtrack/tokens/tokens.json` — beide ongewijzigd = contrast nog 3,44:1.
- **Status:** open

## 2026-09-16 — De site toont prijzen die de app niet kan innen · [content]
- **Wat:** S8 en de JSON-LD-`offers` noemen €3.99/€29.99, maar `apps/rowtrack` heeft geen in-app-aankoopcode — geen StoreKit, geen RevenueCat, geen feature-gating. De sectie zegt "Binnenkort", dus vandaag klopt het; het wordt onwaar zodra de site live gaat zonder inningsweg.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16. Check gemeten 2026-09-16: 0 bestanden, onveranderd.
- **Eerste zet:** Vóór publicatie: bedragen toetsen aan App Store Connect. Bestaat Pro dan nog niet, haal de offers uit `lib/schema.ts` — structured data wordt letterlijk overgenomen, zonder het "binnenkort" eromheen.
- **Check:** `grep -rl 'StoreKit\|RevenueCat\|react-native-iap\|expo-in-app' apps/rowtrack | wc -l` — 0 = nog geen enkele inningsweg terwijl de site prijzen noemt.
- **Status:** open

## 2026-09-16 — Analyse-sectie toont de samenvatting, niet de drie tabs · [content]
- **Wat:** S5 gaat over de splits-analyse maar toont het samenvattingsscherm, omdat het detailscherm (Overzicht/Splits/Hartslag) een ingelogd account met een training mét hartslag vraagt. In die samenvatting staan de PIEK-kolom en de BPM-rij op streepjes doordat `dev-active.tsx` daar `null` doorgeeft.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16. Check gemeten 2026-09-16: `Analysis.tsx:54` draagt nog "Het samenvattingsscherm na een training".
- **Eerste zet:** Inloggen op `rowtrack-test@umanex.be` op de simulator, een training met hartslag openen, `xcrun simctl io booted screenshot`. Niet: de summary-mocks in `dev-active.tsx` vullen — dat is een testfixture wijzigen voor een marketingbeeld.
- **Check:** `grep -n 'alt=' apps/rowtrack-web/components/sections/Analysis.tsx` — noemt de alt-tekst nog "samenvattingsscherm", dan toont S5 de splits-tabs nog niet.
- **Status:** open

## 2026-09-16 — Concept-voorwaarden nog niet juridisch nagekeken · [legal]
- **Wat:** `apps/rowtrack/docs/voorwaarden.md` staat op CONCEPT v0.1 en rendert op `/nl/voorwaarden`, maar de route staat bewust niet in `lib/routes.ts` en de sitemap. Van de Consumentenombudsdienst staat alleen naam en website in de tekst; het postadres is niet uit het hoofd ingevuld.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16; wacht op een juridische controle, niet op een sessie. Check gemeten 2026-09-16: 1.
- **Eerste zet:** Juridische controle; daarna het adres aanvullen, de statusregel op definitief zetten en `/voorwaarden` toevoegen aan `lib/routes.ts`.
- **Check:** `grep -c CONCEPT apps/rowtrack/docs/voorwaarden.md` — een treffer = nog concept.
- **Status:** open

## 2026-09-16 — Geen Vercel-project; de site kan nergens heen · [infra]
- **Wat:** `rowtrack-web` heeft geen Vercel-project — bewust: bouwen nu, publiceren ná de App Store-release. Gevolg: niemand ziet de site zonder hem lokaal te draaien, en de eerste deploy is nog een onbekende. `apps/rowtrack/BACKLOG.md` (PRIVACY_POLICY_URL) hangt hieraan.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16; de afspraak zelf is de reden. Check gemeten 2026-09-16: 0 deployments.
- **Eerste zet:** Root `apps/rowtrack-web`, install `cd ../.. && pnpm install --frozen-lockfile`, build `cd ../.. && pnpm turbo build --filter=rowtrack-web`, Node 20.x, ignored build step `npx turbo-ignore rowtrack-web`. Deploy blijft handmatig (Jeroen).
- **Check:** `gh api repos/umanex/umanex-apps/deployments --jq '[.[]|select(.environment|test("rowtrack";"i"))]|length'` — 0 = nog nergens een rowtrack-deployment.
- **Status:** open

## 2026-09-16 — De app registreert meer dan de site laat zien · [idee]
- **Wat:** Per training bewaart RowTrack ook weerstandsniveau, slagtelling, gemiddelden en maxima per metric, de beste split en de ~1 Hz-tijdreeks. Niets daarvan staat op de site; juist die diepte is waarmee RowTrack zich tegenover ErgData meet.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-16: een idee, geen sessie-context. Check gemeten 2026-09-16: 0 treffers in `components/`.
- **Eerste zet:** S5 uitbreiden met gemiddelden/maxima en de slagtelling — S3 blijft wat je tíjdens het roeien ziet, en dat onderscheid houdt beide secties rustig.
- **Check:** `grep -rin 'weerstand\|slagfrequentie' apps/rowtrack-web/components` — treffers alleen in `llms.txt` of in een comment tellen niet; het gaat om zichtbare secties.
- **Status:** open
