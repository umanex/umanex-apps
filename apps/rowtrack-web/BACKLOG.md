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
