# HANDOFF.md — sessie-handoff (vooruitkijkend)

Dit bestand is de **vooruitkijkende tegenhanger** van `LEARNINGS.md`. Waar LEARNINGS de rauwe vangst van *fouten* is, houdt HANDOFF de open **onzekerheden, aannames, risico's, next steps en ideeën** bij die een sessie achterlaat — zodat een volgende sessie niet koud begint.

Entries komen erbij via de `sessie-reflectie` skill aan het einde van een sessie. De open items worden bij de start van een volgende sessie automatisch getoond via de user-level SessionStart-hook (`~/.claude/hooks/session-start-handoff.sh`). Niet handmatig bewerken tenzij je een status corrigeert.

## Waarom dit bestaat

Aan het einde van een sessie zit de meeste context in het hoofd van Claude en verdampt bij afsluiten: waar was ik het minst zeker over, welke aanname bleef onuitgesproken, wat breekt over 3 maanden, wat is de eerste zet volgende keer. HANDOFF vangt dat expliciet op zodat het meekomt.

Dit is **geen duplicaat van de eval-loop**. Een terugkerende *faalklasse* hoort in `LEARNINGS.md` (via `vastleggen`); een *durend feit* hoort in auto-memory. HANDOFF is enkel voor het vooruitkijkende, sessie-gebonden restant.

## Statussen

- `open` — vastgelegd bij reflectie, nog niet opgepakt. Wordt bij sessiestart getoond.
- `resolved` — opgepakt of beantwoord in een latere sessie; blijft staan als spoor, wordt niet meer getoond.

## Types

`onzekerheid` · `aanname` · `risico` · `next-step` · `idee` · `debt`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Bevinding:** {1-2 zinnen}
    - **Volgende zet:** {concreet actiepunt of "-"}
    - **Status:** open

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Project — rowtrack-web

## 2026-08-10 — Web-tokens ontbreken; de site draait op Tailwinds schaal · [debt]
- **Bevinding:** Kleuren zijn token-only en bewaakt, maar élke maat (`text-5xl`, `px-6`, `max-w-5xl`, `py-24`) komt uit Tailwinds eigen schaal. RowTrack's tokenset heeft geen web-typeschaal, geen spacing boven 48 en geen container-widths. Er staan nu `TODO`-markers verspreid over elf sectiebestanden plus `Section.tsx` en `globals.css`; hoe langer dit staat, hoe meer plekken de sweep straks raakt.
- **Volgende zet:** De ontbrekende assen in Tokens Studio zetten (`packages/rowtrack-tokens/TOKENS-TODO.md` §2 t/m §5), dan `Section.tsx` en `SectionHeading.tsx` eerst — die twee dragen het leeuwendeel van de ritmiek.
- **Status:** open

## 2026-08-10 — Wit op de accentknop haalt geen AA · [risico]
- **Bevinding:** `fg.onAccent` (#FFFFFF) op `accent.default` (#F05454) meet 3.44:1; AA vraagt 4.5:1 voor normale tekst en `type.buttonPrimary` is 18px regular. Het is nu niet zichtbaar omdat er nog geen echte CTA-knop bestaat — de App Store-badge is Apple's artwork en de Pro-kaart draagt het accent als rand. Zodra er één knop met tekst op accent komt, bijt dit meteen, en het raakt óók de app.
- **Volgende zet:** Kies uit de drie uitwegen in `TOKENS-TODO.md` §1a (accent verdiepen · donkere tekst op accent · knoptekst ≥18.66px bold). Het onderzoeksdocument stelde een AA-accent-tekstvariant voor; die is NIET nodig — accent-als-tekst haalt 5.21:1.
- **Status:** open

## 2026-08-10 — De site toont prijzen die de app niet kan innen · [risico]
- **Bevinding:** S8 en de JSON-LD-`offers` noemen €3.99/€29.99, maar er zit geen enkele in-app-aankoopcode in `apps/rowtrack` — geen StoreKit, geen RevenueCat, geen feature-gating. De sectie labelt Pro als "Binnenkort" en zegt dat er niets gefactureerd wordt, dus vandaag klopt het; het wordt onwaar op het moment dat de site live gaat zonder dat StoreKit bestaat.
- **Volgende zet:** Vóór publicatie: bedragen toetsen aan App Store Connect. Bestaat Pro dan nog niet, haal de offers uit `lib/schema.ts` in plaats van ze te laten staan — structured data wordt letterlijk overgenomen, zonder het "binnenkort" eromheen.
- **Status:** open

## 2026-08-10 — Analyse-sectie toont de samenvatting, niet de drie tabs · [next-step]
- **Bevinding:** S5 gaat over de splits-analyse maar toont het samenvattingsscherm, omdat het detailscherm met Overzicht/Splits/Hartslag een ingelogd account met een training mét hartslag vraagt. In die samenvatting staan de PIEK-kolom en de BPM-rij bovendien op streepjes, doordat `dev-active.tsx` daar `null` doorgeeft.
- **Volgende zet:** Inloggen op `rowtrack-test@umanex.be` op de simulator, een training met hartslag openen, en `xcrun simctl io booted screenshot`. Alternatief zonder account: de summary-mocks in `dev-active.tsx` vullen — maar dat is een testfixture wijzigen om een marketingbeeld te winnen, en dat is de verkeerde volgorde.
- **Status:** open

## 2026-08-10 — Concept-voorwaarden nog niet juridisch nagekeken · [next-step]
- **Bevinding:** `apps/rowtrack/docs/voorwaarden.md` staat op CONCEPT v0.1 en rendert op `/nl/voorwaarden`, maar de route staat bewust niet in `lib/routes.ts` en dus niet in de sitemap. Van de Consumentenombudsdienst staat alleen naam en website in de tekst — het postadres heb ik niet uit het hoofd ingevuld in een document waarmee mensen een klacht indienen.
- **Volgende zet:** Juridische controle; daarna het adres aanvullen, de statusregel op definitief zetten en `/voorwaarden` toevoegen aan `lib/routes.ts`.
- **Status:** open

## 2026-08-10 — Geen Vercel-project; de site kan nergens heen · [next-step]
- **Bevinding:** `rowtrack-web` heeft geen Vercel-project. Dat is geen vergetelheid — de afspraak is bouwen nu, publiceren ná de App Store-release — maar het betekent wel dat niemand de site kan bekijken zonder hem lokaal te draaien, en dat de eerste deploy nog een onbekende is.
- **Volgende zet:** Root `apps/rowtrack-web`, install `cd ../.. && pnpm install --frozen-lockfile`, build `cd ../.. && pnpm turbo build --filter=rowtrack-web`, Node 20.x, ignored build step `npx turbo-ignore rowtrack-web`. Deploy blijft handmatig.
- **Status:** open

## 2026-08-10 — De app registreert meer dan de site laat zien · [idee]
- **Bevinding:** Per training bewaart RowTrack ook weerstandsniveau, totaal aantal slagen, gemiddelden en maxima per metric, de beste split en de volledige ~1 Hz-tijdreeks. Daarvan komt niets op de site voor; het onderzoeksdocument liet ze weg en S3 volgde dat. Juist die diepte is waarmee RowTrack zich tegenover ErgData meet.
- **Volgende zet:** Overweeg S5 uit te breiden met de gemiddelden/maxima en de slagtelling — S3 blijft dan wat je tíjdens het roeien ziet, en dat onderscheid houdt beide secties rustig.
- **Status:** open
