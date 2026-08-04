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

# Project — cashflow

## 2026-08-04 — Runway leest de ankermaand, niet vandaag · [risico]
- **Bevinding:** `/analyse` haalt de bufferstand uit `useMonths(3)[0]`, en die volgt `anchorMonth` uit de store. Navigeer je op de prognosepagina een maand terug en ga je dan naar de analyse, dan rekent de runway met de bufferstand van die andere maand — zonder dat de pagina dat zegt. De navigatie is sessie-state, dus het verdwijnt na een herlaad, wat het juist verraderlijk maakt.
- **Volgende zet:** In `app/analyse/page.tsx` de bufferstand halen uit de maand die gelijk is aan `getCurrentMonthKey()` in plaats van uit `months[0]`, of `useMonths` daar aanroepen met een eigen anker. Daarna controleren dat het getal niet meer verandert door op `/` terug te bladeren.
- **Status:** resolved — 2026-08-04: `useMonths` en `useAnchorState` nemen een optionele anker-maand, en `/analyse` geeft daar `getCurrentMonthKey()` aan mee. De analyse rekent dus altijd vanaf vandaag, ongeacht waar je op de prognosepagina staat.

## 2026-08-04 — Twee PR's staan open en zijn niet geverifieerd op scherm · [next-step]
- **Bevinding:** PR #172 (grafieken als inline SVG) en PR #173 (historie begint bij de huidige maand) zijn gebouwd, groen door build/lint/type-check en harness, maar niet gemerged. Van #172 zijn de waterfall en de bufferopbouw wél visueel gecontroleerd en gefixt; de bullet charts (`VarianceChart`) zijn nooit op scherm gezien. Van #173 is niets visueel gecontroleerd. Precies de fout die de visuele controle van #172 blootlegde — een SVG van 672px hoog — compileerde probleemloos.
- **Volgende zet:** #173 eerst mergen (correctheid: hij gooit de niet-vertrouwde historie weg), dan #172. Vóór het mergen van #172 met drie afgesloten maanden demodata naar `/analyse` kijken, in het bijzonder naar de bullet charts en naar een waterfall met een negatief eindsaldo — dat geval is nooit getekend.
- **Status:** resolved — 2026-08-04: #172 en #173 zijn gemerged op verzoek. De visuele controle van de bullet charts en van de historie-vanaf-nu blijft openstaan en verhuist naar de entry hieronder.

## 2026-08-04 — Alle data leeft in één browser, zonder export · [risico]
- **Bevinding:** De store staat in `localStorage` onder `cashflow-store-v3`, per browser en per profiel. Deze sessie bleek dat concreet: in Chrome was alles leeg terwijl Arc de echte cijfers had. Er is geen export of import, dus browserdata wissen of van machine wisselen betekent alles kwijt. Voor een tool waar je financiële planning in staat is dat een enkelvoudig faalpunt.
- **Volgende zet:** Een export- en importknop die de hele store als JSON-bestand wegschrijft en terugleest, met een versiecontrole op `STORE_VERSION`. Klein werk, en het maakt ook het overzetten tussen browsers en het bewaren van een back-up vóór een migratie mogelijk.
- **Status:** resolved — 2026-08-04: opgegaan in de bredere entry over opslag, back-up en meerdere browsers onderaan.

## 2026-08-04 — Automatisch afsluiten kan een verkeerd beginsaldo bevriezen · [risico]
- **Bevinding:** Zodra een maand voorbij is, sluit de app hem bij het eerstvolgende bezoek zichzelf af. Het model gaat ervan uit dat het beginsaldo van de ankermaand je échte banksaldo is, maar niets in de UI herinnert je eraan dat bij te werken. Was dat saldo verouderd op het moment van afsluiten, dan staat die fout permanent in de historie — en van daaruit rolt hij door naar elke volgende maand.
- **Volgende zet:** Overwegen om vóór het automatisch afsluiten te vragen of het beginsaldo klopt, of de afsluiting pas te doen bij het eerste bezoek ná een expliciete bevestiging. Alternatief: bij een heropening tonen hoeveel het bevroren eindsaldo afwijkt van een herberekening, zodat een scheve maand opvalt.
- **Status:** resolved — 2026-08-04: Jeroen past het beginsaldo manueel aan en houdt het correct; de automatische afsluiting bevriest dus geen scheef saldo. Geen extra bevestiging nodig.

## 2026-08-04 — Token-migratie is groter geworden in plaats van kleiner · [debt]
- **Bevinding:** De finance-tokens zijn bewust uitgesteld, maar er zijn deze sessie componenten bijgekomen die opnieuw hardcoded kleuren gebruiken: `emerald-700` in de sectiebalk en de bullet charts, `--umanexChart4` en `--umanexPrimary500` semantisch ingezet in de waterfall, en `--umanexNeutral400` als arcering in de saldo-footer met een `// TODO` erbij. De lijst met token-paden, waardes en contrastcijfers staat in `briefings/2026-08-04-plan-advies-implementatie.md`.
- **Volgende zet:** Bij het aanmaken van de tokens in Tokens Studio meteen alle nieuwe componenten meenemen: `SectionBar`, `BalanceFooter`, `RunwayCard`, `WaterfallChart`, `BufferChart`, `VarianceChart` en `MonthVariance`. Grep op `emerald-`, `amber-` en `umanexChart` vindt ze allemaal.
- **Status:** open

## 2026-08-04 — Bullet charts en historie-vanaf-nu draaien ongezien op main · [onzekerheid]
- **Bevinding:** #172 en #173 zijn gemerged zonder dat `VarianceChart` ooit op scherm stond, en zonder visuele controle van het gedrag na `historyStartMonth`. De waterfall en de bufferopbouw zijn wél gezien en gefixt; juist dáár bleek dat een grafiek probleemloos compileert en toch 672px hoog wordt. Ongeteste gevallen: een waterfall met een negatief eindsaldo, en een categorie in de bullet charts die zo klein is dat de balk onzichtbaar wordt.
- **Volgende zet:** Met drie afgesloten maanden demodata naar `/analyse` kijken, in een tweede browserprofiel zodat de echte store ongemoeid blijft. Let op de bullet charts en forceer één maand met een negatief eindsaldo.
- **Status:** open

## 2026-08-04 — Opslag, back-up en gebruik over meerdere browsers · [next-step]
- **Bevinding:** De store leeft in `localStorage` onder `cashflow-store-v3`, per browser en per profiel; deze sessie bleek dat concreet toen Chrome leeg was en Arc de echte cijfers had. Jeroen wil hierover nadenken vóór er gebouwd wordt. De keuze raakt drie dingen tegelijk: een back-up hebben, dezelfde data in meerdere browsers gebruiken, en of de app local-first blijft — beide adviesrapporten noemen dat laatste een expliciete vereiste.
- **Volgende zet:** De opties naast elkaar zetten met hun consequenties: (1) export/import als JSON-bestand, klein en volledig local-first, maar handmatig synchroniseren; (2) File System Access API met een gekozen bestand op schijf, automatisch en nog steeds lokaal, maar alleen in Chromium-browsers; (3) een echte backend zoals Supabase, waarmee synchroniseren vanzelf gaat maar de local-first vereiste vervalt en er accounts en beveiliging bij komen. De vorige entry over export is hierin opgegaan.
- **Status:** open
