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

# Project — jobradar

## 2026-09-16 — Het bedrijfsplan draait op één machine, en dat is een keuze met een houdbaarheid · [aanname]
- **Bevinding:** `/plan` draagt vanaf nu het voorbereidingsplan voor de start van umanex — de
  acties, het bewijs bij het afronden, de beslismomenten. Die staan in `.data/jobradar.db`, een
  lokaal SQLite-bestand zonder back-up en zonder synchronisatie. Voor vacaturedata is dat prima:
  die haal je opnieuw op. Voor een afgeronde actie met zijn onderbouwing niet — dat bestaat
  nergens anders. De app is bewust zo gebouwd (geen auth, lokaal, geen deploy), dus dit is geen
  fout maar een aanname die nu meer draagt dan toen ze genomen werd.
- **Check:** `sqlite3 apps/jobradar/.data/jobradar.db "SELECT count(*) FROM plan_actions WHERE
  bewijs IS NOT NULL;" 2>&1` — drie uitkomsten, en alle drie betekenen iets anders. *"no such
  table"* = het plan is in deze tree nog nooit geopend, dus er staat niets op het spel. `0` = wel
  gezaaid, nog niets afgerond. Een getal boven nul = er staat werk mét onderbouwing in dat
  bestand dat nergens anders bestaat, en dán is de vraag urgent.
  (De eerste versie van deze check noemde die middelste uitkomst niet en las "no such table" als
  een fout — gemeten bij de eerste uitvoering, op 2026-09-16.)
- **Volgende zet:** beslissen wat genoeg is. De markdown-export (`/api/plan/export?formaat=md`) is
  er al en is deterministisch, dus hem periodiek in de repo of in een map met back-up zetten kost
  één commando. Zwaarder — Supabase, zoals cashflow — is een andere app dan deze.
- **Status:** open

## 2026-09-16 — De seed kan maar één keer, en de tekst van de acties is daarmee bevroren · [risico]
- **Bevinding:** `zaaiPlan` draait één keer per `SEED_VERSIE` en doet daarna nooit meer een UPDATE.
  Dat is precies wat de opdracht vroeg (gebruikerswijzigingen overleven elke deploy), maar het
  betekent ook dat een tikfout of een betere formulering in `seed-inhoud.ts` na de eerste run
  nergens meer aankomt. Wie dat niet weet, wijzigt de tekst, ziet niets veranderen, en trekt de
  verkeerde conclusie over de seed.
- **Check:** **eerst** `/plan` één keer laden zodat de seed gedraaid heeft — toets dat met
  `sqlite3 apps/jobradar/.data/jobradar.db "SELECT value FROM settings WHERE key='plan.seed_versie';"`,
  die moet een getal geven. Wijzig **dan** pas een titel in `lib/plan/seed-inhoud.ts`, herstart, en
  kijk of `/plan` hem toont. Blijft de oude titel staan, dan werkt de poort zoals bedoeld.
  Die voorwaarde is het halve punt: op een database waar nog nooit gezaaid is, wordt de gewijzigde
  titel gewoon ingezaaid en toont `/plan` hem wél — wat leest als "de poort werkt niet" terwijl er
  niets mis is. Gemeten bij de eerste uitvoering, op 2026-09-16.
- **Volgende zet:** niets bouwen. Wel weten: tekst wijzig je vanaf nu ín de app, niet in het
  bestand. `SEED_VERSIE` verhogen mag alleen om nieuwe keys toe te voegen; dat staat in de kop van
  `seed-inhoud.ts`.
- **Status:** open

## 2026-09-16 — Het plan is gebouwd, beoordeeld en nog nooit gebruikt · [next-step]
- **Bevinding:** `/plan` is af, door 1315 invarianten, 61 HTTP-asserties en een onafhankelijke
  finish-review gehaald, en draagt nul echt werk. De database van deze machine heeft de
  `plan_*`-tabellen nog niet eens: ze ontstaan pas bij het eerste bezoek. Alles wat er nu over het
  scherm te zeggen valt, komt van instrumenten en van geforceerde toestanden — niet van iemand die
  er een ochtend mee gewerkt heeft. De drie ernstigste defecten van vandaag kwamen ook niet uit de
  suite maar uit een lezer die het geheel beoordeelde; de instrumenten dekken de API en de
  afleiding, niet de weg die een mens door het scherm neemt.
- **Check:** `sqlite3 apps/jobradar/.data/jobradar.db "SELECT count(*) FROM plan_actions WHERE
  status != 'niet_gestart' AND status != 'uitgesteld';" 2>&1` — *"no such table"* of `0` betekent
  dat het plan nog nooit echt gebruikt is en dit item nog leeft. Een getal boven nul betekent dat
  het eerste gebruik geweest is.
- **Volgende zet:** open `/plan`, zet A01 op bezig en schrijf er een volgende stap bij. Dat is de
  goedkoopste manier om te zien wat een review per definitie niet kan zien: of de volgorde van de
  secties klopt wanneer je iets wílt doen in plaats van iets beoordeelt, en of de eerstvolgende
  actie bovenaan werkelijk de actie is waar je aan denkt.
- **Status:** open
