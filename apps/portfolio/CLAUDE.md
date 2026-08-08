# portfolio — projectcontext

Portfoliosite. Next.js (App Router), dev op poort 3001.

Dit bestand is bewust **minimaal**: het bevat alleen wat gemeten is. Vul de rest aan wanneer er
echt aan deze app gewerkt wordt — verzonnen projectcontext is schadelijker dan geen.

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-08 door het te draaien, niet door
het af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden — geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter portfolio flow --shot=.flow-shots` — full-page PNG per route op de verse build. Gemeten: `index`, `werkwijze`, `cases`, `carriere`. `.flow-shots/` is gitignored: bewijs van één run, geen artefact. |
| **Flow aandrijven** | `pnpm --filter portfolio flow` — Playwright op een verse build. Laadt vier routes, klikt één echte interne link (gemeten: `/carriere → /`) en telt console-fouten. `--headed` om mee te kijken. |
| **State forceren** | **Geen.** Dit is een statische site zonder data-laag: er is niets dat kan laden, leeg zijn of falen. Loading/empty/error zijn hier niet van toepassing in plaats van onbereikbaar — dat verschil is belangrijk, want het is géén gat dat gedicht moet worden. |
| **Invariant draaien** | **Geen, en niet nodig.** Er is geen afgeleide berekening in deze app; de invariant-as heeft hier niets om over te gaan. |
| **Verse build** | Zit ín de harness: altijd eerst `next build`, dan `next start` op **3101**, en hij weigert als daar al iets luistert. Je test dus per definitie de huidige code. Een dev-server op 3001 blijft ongemoeid. |

**Vier routes, bewust geen dynamische.** `/cases/[slug]` staat niet in `ROUTES`: zonder een
bestaande slug is dat een 404 en dat zou een valse bevinding zijn. Voeg een concrete slug toe als
je die kant wilt dekken.

**De harness kan falen, en dat is getoetst.** `pnpm --filter portfolio flow --selftest` voegt een
scenario toe dat hóórt te falen. Let op de omkering: die run eindigt op **exit 0** wanneer de
bewuste assertie inderdaad faalde. Blijft hij groen zónder die melding, dan meet de harness niets.
