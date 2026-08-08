# jobradar — projectcontext

Vacature- en lead-tracker voor UX/UI-freelancers. Next.js 14 (App Router), dev op poort 3003.

Dit bestand is bewust **minimaal**: het bevat alleen wat gemeten is. Vul de rest aan wanneer er
echt aan deze app gewerkt wordt — verzonnen projectcontext is schadelijker dan geen.

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-08 door het te draaien, niet door
het af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter jobradar flow --shot=.flow-shots` — legt per route een full-page PNG vast op de verse build. Gemeten: `index.png`, 27 KB. `.flow-shots/` is gitignored: het is bewijs van één run, geen artefact om te bewaren. |
| **Flow aandrijven** | `pnpm --filter jobradar flow` — Playwright op een verse build. Laadt elke route, drijft één echte interactie aan (het regio-filter: `"" → "new"`), en telt console-fouten. `--headed` om mee te kijken. |
| **State forceren** | **Gedeeltelijk.** De lege staat is de huidige staat: zonder sync toont het dashboard *"Geen vacatures gevonden"*, en dát is wat de harness vandaag meet. Loading en error zijn **niet** op te wekken — er is geen fixture-laag en geen mock-route. Wie die states wil toetsen, bouwt eerst een onderschepte route zoals `apps/cashflow/scripts/flow-harness.mjs` die heeft. |
| **Invariant draaien** | **Geen.** Node 24 draait TypeScript zonder transpiler, maar `lib/matching.ts` importeert `./config/profile` zónder extensie en dat lost de ESM-resolver van Node niet op (`ERR_MODULE_NOT_FOUND`). De scorelogica is dus headless niet aan te roepen tot die imports een extensie krijgen of er een resolver bij komt. |
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
