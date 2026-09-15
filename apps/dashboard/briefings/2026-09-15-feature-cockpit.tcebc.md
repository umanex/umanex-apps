# Cockpit — één gemeten stand over alle klanten en projecten

- **Datum:** 2026-09-15
- **Type:** feature
- **Project:** dashboard
- **Klant:** umanex
- **Status:** gepland

---

```
TASK:        Een lezend overzicht in apps/dashboard dat de gemeten staat van alle klanten
             en hun projecten toont — werkvoorraad, verificatieschuld, systeemstand umanex-os
             en design-debt — met per item de mogelijkheid zijn Check-commando lokaal te draaien.

CONTEXT:     Vier repo's, drie klanten, vijftien projecten. De data bestaat al in een vaste
             grammatica (de drie lussen, briefings, context.json, canon.tsv) maar niets
             aggregeert ze; recurrente metingen landen als GitHub-issue of exit-code.
             Dit is fase 0 van umanex-os/docs/de-stand.md, met een lokaal venster in plaats
             van de klant-app uit fase 1. Signaalnamen, envelop en ontwerpprincipes komen
             ongewijzigd uit dat document.

ELEMENTS:    Klantkaart (naam, projecten, vier assen met noemer) · Projecttabel · Assentegel
             (getal + noemer + measured_at + status) · Lusregel (datum, type, leeftijd, Check)
             · Briefingregel (status + driedeling afgevinkt-met-bewijs/zonder/open) ·
             Design-debt-reeks (inline SVG) · Laagstandtabel (canon-rij, blob-sha, verdict) ·
             Checkpaneel (commando zichtbaar, exit-code, eerste regels) · Navigatie in RepoBar.

BEHAVIOUR:   Vier routes: /cockpit (portfolio) → /cockpit/[klant] → /cockpit/[klant]/[project],
             plus /cockpit/systeem. Elk aggregaat is klikbaar naar de regels die het optellen.
             Een Check draait per item op klik, nooit automatisch en nooit in bulk; het
             commando staat zichtbaar vóór uitvoering. / blijft het bestaande bedieningspaneel.

CONSTRAINTS: Loopback-only (erft lib/localOnly.ts). Views raken nooit shell, node:* of de
             start/stop-laag — afgedwongen met een purity-guard, zodat ze naar de klant-app
             kunnen verhuizen. umanex-apps is PUBLIC: gemeten klantdata landt uitsluitend in
             gitignorede paden. Cockpit-only signalen (HANDOFF, LEARNINGS) worden door een
             mappenstructuur van klant-zichtbare gescheiden, niet door een filter. Geen nieuwe
             dependency. @umanex/config/tailwind/preset + @umanex/ui; rollaag-utilities only.
             Het woord "dashboard" komt niet voor in URL of UI.
```

---

## Open vragen

Geen. De vier kritische items zijn beantwoord in de planronde van 2026-09-15.

## Aannames

- `[ASSUMPTION: de cockpit wordt uitsluitend door Jeroen bekeken, op deze machine — geen
  tweede gebruiker, geen auth, geen rolmodel. De klant-kijker komt pas in fase 1 van de-stand.md.]`
- `[ASSUMPTION: de vier klantrepo's staan op /Users/jeroen/Documents/<naam>. Een repo die daar
  niet staat is geen fout maar een "ontbreekt"-toestand — zie edge cases.]`
- `[ASSUMPTION: de drempel voor "verouderd" is verouderd_na_dagen uit de JSON, zoals de-stand.md
  regel 93 voorschrijft (9 dagen bij een interval van 7). Niet zelf gekozen.]`

## Acceptatie

**Typologie**

- [ ] `/cockpit` is een eigen route-boom, geen overlay of modal op `/` — bewijs: `ls apps/dashboard/app/cockpit/` toont de vier `page.tsx`-bestanden
- [ ] Het bestaande bedieningspaneel op `/` is ongewijzigd — bewijs: `git diff origin/main -- apps/dashboard/app/page.tsx apps/dashboard/components/DashboardGrid.tsx` is leeg
- [ ] De vier cockpit-routes renderen elk met status 200 — bewijs: `pnpm --filter dashboard flow` (harness op `:3110`) rapporteert 4/4
- [ ] Het woord "dashboard" komt niet voor in een cockpit-URL of in zichtbare UI-tekst — bewijs: `grep -ri dashboard apps/dashboard/app/cockpit apps/dashboard/components/cockpit` → 0 treffers buiten importpaden

**States**

- [ ] Elk datablok toont een expliciete laadstatus vóór zijn data er is — bewijs: harness telt de laad-markers op de eerste render, gelijk aan het aantal blokken
- [ ] Een klant zonder projecten toont een empty-state, geen lege lijst — bewijs: forceer met een klant-entry zonder `apps/` in `stand.local.json`
- [ ] Een onleesbaar signaalbestand toont een error-state met de bestandsnaam — bewijs: schrijf ongeldige JSON in `.stand/<slug>/briefings.json`, herlaad
- [ ] Een meting ouder dan `verouderd_na_dagen` toont de tegel gedempt mét het aantal dagen — bewijs: zet `measured_at` 40 dagen terug, lees de tegeltekst
- [ ] Een ontbrekend signaalbestand toont "ontbreekt", nooit `0` — bewijs: verwijder `.stand/<slug>/design-debt.json`, lees de tegel

**Interactie**

- [ ] Elk aggregaat op `/cockpit` navigeert naar de regels die het optellen — bewijs: harness volgt elke aggregaat-link en vergelijkt het getal met het aantal rijen op de bestemming
- [ ] Elke aggregaat-link is met het toetsenbord bereikbaar en bedienbaar — bewijs: harness telt `tabIndex`-bereikbare links, gelijk aan het aantal aggregaten
- [ ] Een Check draait pas na een klik op dát item — bewijs: harness laadt alle vier de routes en meet nul aanroepen van `/api/cockpit/check`

**Edge cases**

- [ ] `apps/alpine` verschijnt als project ondanks het ontbreken van `package.json` — bewijs: `/cockpit/umanex` toont 9 projecten
- [ ] Columba en Luminus zonder root-`briefings/` tonen 0, geen fout — bewijs: collect-run op beide geeft exit 0 en `briefings.json` met root-noemer 0
- [ ] Een klant-slug gelijk aan een gereserveerd routesegment wordt geweigerd — bewijs: `stand.local.json` met slug `systeem` laat `stand.sh` exit 2 geven
- [ ] De Check-poort weigert een deel van de echte commando's — bewijs: draai de poort over alle `Check`-commando's in de vier repo's, rapporteer geslaagd/totaal; is dat getal gelijk, dan is de poort geen poort
- [ ] Een repo die niet op schijf staat toont "ontbreekt" met de reden, en de andere klanten renderen door — bewijs: verwijs in `stand.local.json` naar een niet-bestaand pad

**Contract en isolatie**

- [ ] Geen bestand onder `components/cockpit/` importeert `node:*`, `child_process`, `lib/launch` of `lib/processes` — bewijs: `node apps/dashboard/scripts/cockpit-purity.mjs`, tweezijdig getoetst met `--selftest`
- [ ] Een collect-run laat geen enkel getrackt bestand achter — bewijs: `git status --porcelain -uall` is leeg ná `pnpm --filter dashboard cockpit:collect`
- [ ] Een kanarie-string in een fixture-`LEARNINGS.md` komt niet voor in de klant-zichtbare uitvoer — bewijs: `test-stand.sh` grept de kanarie over `<outdir>/*.json` buiten `cockpit/`
- [ ] Elk aggregaat is gelijk aan de som van zijn ontleding — bewijs: invariant-script over de gegenereerde JSON, op beide kanten getoetst met een gemanipuleerd aggregaat
- [ ] De open-telling van `stand.sh` is per repo gelijk aan die van `templates/session-start-handoff.sh` — bewijs: `test-stand.sh` cross-check over de vier repo's
- [ ] Elke tegel toont het `measured_at` uit de JSON en niet het moment van laden — bewijs: bevries de JSON, herlaad twee keer met een minuut ertussen, de tekst verandert niet
- [ ] `POST /api/cockpit/check` weigert een niet-lokale Host-header — bewijs: `curl -H 'Host: 10.0.0.5:3010' … ` → 403
- [ ] Er komt geen enkele nieuwe runtime-dependency bij — bewijs: `git diff origin/main -- apps/dashboard/package.json` raakt alleen het `scripts`-blok

**Afgeschreven assen**

- [ ] Figma-parity n.v.t. — de cockpit heeft geen Figma-bron; hij rendert gemeten data, geen ontworpen scherm
- [ ] Design-snapshot-vergelijking n.v.t. — er bestaat geen basislijn voor een scherm dat nog niet bestaat; vanaf de tweede ronde wél

## Beslissingsgeschiedenis

- 2026-09-15: Landingsplaats van nieuwe app naar tweede route in `apps/dashboard` — de cockpit is lokaal en Jeroen-only, dus de loopback-sluis is geen belemmering maar precies goed. De verplaatsbaarheid naar de klant-app wordt in plaats daarvan door een purity-guard gedragen.
- 2026-09-15: `zichtbaarheid` toegevoegd aan het signaalcontract van `de-stand.md`, als mappenstructuur (`<outdir>/cockpit/`) in plaats van een veld dat een filter moet lezen. Reden: de nooit-naar-de-klant-lijst mag niet afhangen van een if die iemand vergeet.
- 2026-09-15: Verificatieschuld wordt per cohort van briefing-datum getoond in plaats van als één totaal. Reden: een deel van de 928 vinkjes zonder `bewijs:` dateert van vóór die conventie, en één beschuldigend getal dat niemand kan verkleinen is geen signaal.
