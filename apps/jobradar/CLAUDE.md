# jobradar — projectcontext

Vacature- en lead-tracker voor UX/UI-freelancers. Next.js 14 (App Router), dev op poort 3003.

Dit bestand is bewust **minimaal**: het bevat alleen wat gemeten is. Vul de rest aan wanneer er
echt aan deze app gewerkt wordt — verzonnen projectcontext is schadelijker dan geen.

## Bronnen en bereik

| | |
|---|---|
| **Vacatures** | Adzuna (`lib/sources/adzuna.ts`). Zoektermen en ophaal-grenzen in `lib/config/profile.ts`. |
| **Leads** | Afgeleid uit de vacaturedata (`lib/signals.ts`, bron `vacatures`). KBO bestaat alleen als fixtures — de live-tak is niet gebouwd. |
| **Twee assen** | De **vacaturescore** (`SCORE_SKILLS`) zegt hoe interessant werk is om zélf te doen; de **classificatie** (`DESIGN_SKILLS`/`DEV_SKILLS` + de rolwoorden) zegt of het bedrijf een lead is. Backend staat bewust alleen in de tweede (beslissing 2026-08-10): een .NET-vacature scoort 0, maar het .NET-huis zonder designer is wél een lead. Laat die assen niet samenvallen — dat is precies de faalklasse in `LEARNINGS.md`. |
| **Regio's** | WVL · OVL · BRU, en **dat blijft zo** (beslissing 2026-08-10). De zoekstraal rond de ankers loopt over de provinciegrens, dus Adzuna levert ook Vlaams-Brabant; die vacatures vallen weg en de bron meldt hoeveel. Bewuste keuze, geen gat. |
| **Pagineringsplafond** | 5 pagina's × 50 per regio (beslissing 2026-08-10). Brussel heeft er meer dan 600, dus dit kápt af — de bron zet dat als waarschuwing in `sourceStatuses`. Ook bewust. |

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-08 en bijgewerkt 2026-08-10, telkens
door het te draaien, niet door het af te leiden. Staat er "geen", dan is dat een gat dat gebouwd
moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter jobradar flow --shot=.flow-shots` — legt per route een full-page PNG vast op de verse build. Gemeten: `index.png`, 27 KB. `.flow-shots/` is gitignored: het is bewijs van één run, geen artefact om te bewaren. |
| **Flow aandrijven** | `pnpm --filter jobradar flow` — Playwright op een verse build. Laadt elke route, drijft één echte interactie aan (het **status**-filter: `"" → "new"` — de harness pakt `select:visible` en het regio-filter bestaat uit checkboxes), en telt console-fouten. `--headed` om mee te kijken. |
| **State forceren** | **Gedeeltelijk.** De harness meet wat er in `.data/jobradar.db` van díe tree staat: in een verse worktree is dat de lege staat (*"Geen vacatures gevonden"*), in een tree waar ooit gesynchroniseerd is de gevulde. Loading en error zijn **niet** op te wekken — er is geen fixture-laag en geen mock-route. Wie die states wil toetsen, bouwt eerst een onderschepte route zoals `apps/cashflow/scripts/flow-harness.mjs` die heeft. |
| **Invariant draaien** | `pnpm --filter jobradar scenarios` — 580 invarianten over vier suites: de scorekern en signaal-afleiding (`signal-scenarios.ts`), de sync-upserts tegen een `:memory:`-database met het echte schema (`upsert-scenarios.ts`), de Adzuna-ophaallaag met een gestubde `fetch` (`adzuna-scenarios.ts`), en de configuratielaag zelf (`config-scenarios.ts` — de gehardende faalklasse uit `LEARNINGS.md`: geen rolwoorden in de vaardighedenlijst, elk keyword vindt zichzelf, de omschrijving beslist nooit de rol, en de twee assen staan vastgepind). Elke suite draait zijn tegenproef ervóór — `SCENARIO_SELFTEST=1` injecteert één check die móét falen, en die run hoort niet-nul te eindigen. Geen netwerk, geen database op schijf, geen transpiler: Node 24 stript de types zelf en `scripts/ts-resolve.mjs` lost de extensieloze relatieve imports op. |
| **Sync tegen de echte bron** | Kan, maar **nooit tegen `.data/jobradar.db`** — dat is de database die je zelf gebruikt. Bouw, start op een vrije poort met een wegwerp-pad, en synchroniseer daartegen: `JOBRADAR_DB_PATH=/tmp/wegwerp.db node_modules/.bin/next start --port 3113`, dan `curl -X POST 127.0.0.1:3113/api/sync`.<br><br>**Twee keer draaien is géén idempotentie-bewijs.** Adzuna geeft niet elke aanroep dezelfde set: op 2026-08-10 gaf run 1 een `HTTP 429` op pagina 3 van WVL, waarna run 2 de ontbrekende 136 vacatures alsnog toevoegde. `jobsAdded > 0` op de tweede run kan dus de bron zijn, niet je code — lees eerst de waarschuwingen in `sourceStatuses`. Wat je op live data wél hard kunt toetsen is dat er geen duplicaten ontstaan (`COUNT(*) == COUNT(DISTINCT source, external_id) == COUNT(DISTINCT dedupe_hash)`). Idempotentie zelf wordt deterministisch bewezen in `upsert-scenarios.ts`. |
| **Verse build** | Zit ín de harness: die draait altijd eerst `next build` en start `next start` op **3103**, en weigert te draaien als daar al iets luistert. Je test dus per definitie de huidige code, nooit een oude bundel. Een dev-server op 3003 wordt met rust gelaten. |

**Waarom de harness geen knoppen aanklikt.** Het dashboard heeft een knop *"Sync nu"* die externe
bronnen ophaalt. Elke aanvraag buiten de eigen origin wordt door de harness afgebroken en geteld
als lek — één lek en de run faalt. Dat is de bedoeling (zo kan hij per constructie geen echte data
raken), maar het betekent ook dat een blinde klik op die knop een *valse* bevinding zou opleveren.
De harness bedient daarom `select`-elementen en interne links, nooit willekeurige knoppen.

**De harness kan falen, en dat is getoetst.** `pnpm --filter jobradar flow --selftest` voegt een
scenario toe dat hóórt te falen. Let op de omkering: die run eindigt op **exit 0** wanneer de
bewuste assertie inderdaad faalde — de zelftest slaagt dán. Blijft hij groen zónder die melding,
dan meet de harness niets en is exit 1 het juiste antwoord. Zonder die kant weet je niet of groen
"alles goed" betekent of "ik kijk nergens naar".
