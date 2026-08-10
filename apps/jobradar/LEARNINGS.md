# LEARNINGS.md — waargenomen fouten (staging)

Dit bestand is de **rauwe vangst** van momenten waarop een skill of werkprincipe faalde. Het staat los van CLAUDE.md: CLAUDE.md blijft schone instructie, LEARNINGS.md is de staging-area waaruit bewezen regels later naar de juiste CLAUDE.md **promoveren**.

Entries worden toegevoegd via de `vastleggen` skill — niet handmatig bewerken tenzij je een status bijwerkt.

## Waarom dit bestaat

Lessen verdampen anders. Door de fout én de **letterlijke input die hem uitlokte** te bewaren, wordt elke entry later herbruikbaar als verificatie-test: speel de input opnieuw af in een fresh sessie en kijk of de fout weg is.

## Statussen

Een entry doorloopt drie statussen:

- `open` — vastgelegd, nog niet gefixt.
- `verified` — gefixt én de input opnieuw getest in een fresh sessie; de fout is weg.
- `promoted` — de regel is gehard naar de juiste CLAUDE.md-laag (globaal / klant / project).

Geen score, geen severity, geen categorie. Bewust minimaal — capture moet wrijvingsloos zijn.

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

```
## YYYY-MM-DD — {skill of principe dat faalde}
- **Input:** {letterlijke prompt of bestandspad dat de fout uitlokte}
- **Fout:** {wat er misging, 1-2 zinnen}
- **Status:** open
```

<!-- De vastleggen skill voegt hieronder de juiste laag-header toe bij de eerste capture. -->

# Project — jobradar

## 2026-08-10 — Root cause boven patch (classificatie in lib/signals.ts)
- **Input:** `"Fix Adzuna en leid de signalen af uit de vacaturedata"` — branch `fix/jobradar-bronlaag`. Ook reproduceerbaar zonder de prompt, vanuit `apps/jobradar`:
  `node --import ./scripts/ts-resolve.mjs --input-type=module -e "import {classificeer} from './lib/signals.ts'; console.log(classificeer({title:'Visual Designer', description:'Je ontwerpt schermen in Figma voor ons platform, gebouwd in React en TypeScript.'}))"`
  — hoort `design` te geven, gaf `dev`.
- **Fout:** Twee reviewrondes op rij een P1 in dezelfde classificatie-logica, telkens opgelost door de heuristiek bij te stellen in plaats van de oorzaak weg te nemen. Ronde 2: design werd vóór dev getest over de volledige tekst, dus één terloopse UX-zin maakte van een dev-vacature designbudget. Ronde 3: na de fix ("de titel beslist") kantelt het de andere kant op — 10 van 13 gangbare designtitels matchen geen enkel keyword op titelniveau, dus beslist de omschrijving alsnog en wint de webstack. Root cause: `SKILL_KEYWORDS` bevat *skills*, geen *rollen* — er is geen woord voor designer/ontwerper/vormgever of developer/engineer/ontwikkelaar, dus een skill-lijst kan de rolvraag principieel niet beantwoorden en elke ronde verplaatst de fout naar de andere kant. Meetbaar bijeffect: drie designtools vallen samen in één `figma`-cluster terwijl de webstack over vier clusters spreidt, wat tellen structureel dev-gunstig maakt.
- **Fix:** Code-guard in `apps/jobradar/scripts/config-scenarios.ts`, aangesloten op `pnpm --filter jobradar scenarios` en daarmee op CI. Hij toetst de *vorm* van de configuratie in plaats van instanties: geen persoonswoorden in `SKILL_KEYWORDS` (met baseline en reden), elk keyword moet zichzelf kunnen vinden, de omschrijving mag de rol nooit veranderen wanneer de titel er een noemt, en de twee assen staan in één `CLUSTERS`-verklaring waaruit `SCORE_SKILLS`/`DESIGN_SKILLS`/`DEV_SKILLS`/`KEYWORD_WEIGHTS` afgeleid worden — plus een vastgepinde verwachtingstabel, zodat een aswijziging op twee plekken moet gebeuren. Tegenproef gedraaid op een kopie in `/private/tmp`: alle drie de historische defecten opnieuw ingevoerd, alle drie gevangen (`'product manager'` → persoonswoord-check; `backend` weer op score 5 → pin-check, óók met een tweede nul-cluster als maskering; onvoorwaardelijk `\b` → `.net` en `c#` vinden zichzelf niet meer). Input opnieuw afgespeeld → `design`, waar de entry `dev` vastlegde. **Grens:** de guard dwingt de keuze zichtbaar af, maar kan niet beoordelen óf een nieuw cluster de juiste as krijgt — dat blijft een oordeel, alleen niet langer een stilzwijgend oordeel.
- **Status:** promoted
