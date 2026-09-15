# Cockpit — één gemeten stand over alle klanten en projecten

- **Datum:** 2026-09-15
- **Type:** feature
- **Project:** dashboard
- **Klant:** umanex
- **Status:** gebouwd — 2026-09-15, branch `feature/cockpit`

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

- [x] `/cockpit` is een eigen route-boom, geen overlay of modal op `/` — bewijs: `ls apps/dashboard/app/cockpit/**/page.tsx` geeft vier bestanden (`page`, `[klant]`, `[klant]/[project]`, `systeem`)
- [x] Het bestaande bedieningspaneel op `/` is ongewijzigd — bewijs: `git diff origin/main -- apps/dashboard/app/page.tsx apps/dashboard/components/DashboardGrid.tsx` → 0 regels
- [x] De vier cockpit-routes renderen elk met status 200 — bewijs: `pnpm --filter dashboard flow` blok 1, 4/4 routes 200 én elk met eigen markertekst
- [x] Het woord "dashboard" komt niet voor in een cockpit-URL of in zichtbare UI-tekst — bewijs: `grep -ri dashboard app/cockpit components/cockpit` buiten commando's en importpaden → 0 treffers

**States**

- [ ] Elk datablok toont een expliciete laadstatus vóór zijn data er is — **niet gebouwd**: de pagina's zijn server-componenten die synchroon renderen met de data al gelezen, dus er is geen client-fetch om een laadstatus voor te tonen. Wat ontbreekt is een `app/cockpit/loading.tsx` voor de navigatie ertussen. Bewust open gelaten in plaats van zacht afgevinkt
- [ ] Een klant zonder projecten toont een empty-state, geen lege lijst — **niet gemeten**: alle vier de geregistreerde klanten hebben projecten, dus dit geval is met de echte data niet op te wekken. Vraagt een fixture-klant in de harness
- [x] Een onleesbaar signaalbestand toont een error-state met de bestandsnaam — bewijs: harness blok 5 schrijft `{ dit is geen json` in `index.json`, de pagina geeft 200 en noemt `index.json` in de reden
- [x] Een meting ouder dan `verouderd_na_dagen` toont de tegel gedempt mét het aantal dagen — bewijs: harness blok 5 zet `measured_at` 40 dagen terug → "verouderd — 40 d"; positieve controle: bij de verse meting staat dat woord er níet
- [x] Een ontbrekend signaalbestand toont "ontbreekt", nooit `0` — bewijs: harness blok 5, `index.json` weg → "Niet gemeten" mét het collect-commando; en een ontbrekend déélsignaal zegt "niet gemeten" en leent niet de verklaring van een repo zonder `.tsx`

**Interactie**

- [x] Elk aggregaat op `/cockpit` telt op uit de regels waar het naartoe linkt — bewijs: harness blok 2, drie invarianten (`open_items` == rijen in werkvoorraad, som(handoff+backlog+learnings) == idem, `projecten` == rijen in index.data)
- [ ] Elke aggregaat-link is met het toetsenbord bereikbaar en bedienbaar — **niet gemeten**: de tegels zijn `<Link>`-elementen en dus per constructie focusbaar, maar dat is een gevolgtrekking en geen waarneming. Vraagt een DOM-telling in de harness
- [ ] Een Check draait pas na een klik op dát item — **niet gemeten**: structureel waar (de aanroep hangt aan `onClick`), maar de harness kan geen uitgaande calls tellen. Vraagt een teller op de route

**Edge cases**

- [x] `apps/alpine` verschijnt als project ondanks het ontbreken van `package.json` — bewijs: `.stand/umanex/index.json` telt 10 projecten en bevat `alpine`
- [x] Columba en Luminus zonder root-`briefings/` tonen 0, geen fout — bewijs: `briefings.json` geeft voor beide 0 rijen met project `(root)` naast 38 resp. 99 totaal, en de collect-run gaf exit 0
- [x] Een klant-slug gelijk aan een gereserveerd routesegment wordt geweigerd — bewijs: tweezijdig, `slugGeldig()` weigert `systeem`, `cockpit`, `api`, leeg, `Umanex` en `a/b` en laat `umanex` en `luminus` door; `stand.sh` weigert dezelfde slugs met exit 2
- [x] De Check-poort weigert een deel van de echte commando's — bewijs: over alle 144 gemeten checks in de vier repo's **104 doorgelaten, 40 geweigerd** met reden (12× `figma_execute`, 9× een scriptbestand, 6× een redirect). Was dit 144/144, dan was de poort geen poort
- [ ] Een repo die niet op schijf staat toont "ontbreekt" met de reden, en de andere klanten renderen door — **niet gemeten**: alle vier de repo's staan op schijf. `collect.mjs` heeft het pad wél (`✗ <slug>: <pad> bestaat niet — overgeslagen`), maar dat is de schrijfkant, niet het scherm

**Contract en isolatie**

- [x] Geen bestand onder `components/cockpit/` importeert `node:*`, `child_process` of de leeslaag — bewijs: `pnpm --filter dashboard purity` → 6 views schoon; tegenproef `purity:selftest` 5/5, waaronder een lege map die als *meting ongeldig* leest in plaats van als groen
- [x] Een collect-run laat geen enkel getrackt bestand achter — bewijs: na `cockpit:collect` over vier klanten geeft `git status --porcelain -uall` 0 regels voor `.stand/` en `stand.local.json`
- [x] Elk aggregaat is gelijk aan de som van zijn ontleding — bewijs: harness blok 2 (drie assen) plus `test-stand.sh` in umanex-os (13 invarianten), beide tweezijdig getoetst met een gefabriceerd aggregaat
- [x] De open-telling van de collector is gelijk aan die van een tweede parser — bewijs: `test-lus-entries.sh` vergelijkt met `loop-aging.sh` én met `templates/session-start-handoff.sh` over de vier repo's; twaalf vergelijkingen gelijk, en één item erbij beweegt beide kanten mee. *(Afwijking van het plan: de sessiestart-hook was pas bruikbaar als teller nadat `MAX_OPEN` injecteerbaar werd; dat is in dezelfde ronde gebeurd.)*
- [x] Elke tegel toont het `measured_at` uit de JSON en niet het moment van laden — bewijs: harness blok 5, dezelfde pagina toont "verouderd — 40 d" ná het terugzetten van `measured_at` en niets ná het herstel, terwijl het laadmoment in beide gevallen nu is
- [x] `POST /api/cockpit/check` weigert een niet-lokale Host-header — bewijs: harness blok 4 via `curl -H 'Host: 10.0.0.5:3110'` → 403; met loopback-Host geen 403. *Via curl en niet via fetch: `Host` is een forbidden header name, Node zet hem stil niet en de assertie meet dan iets anders (gemeten: 404 in plaats van 403).*
- [x] Er komt geen enkele nieuwe runtime-dependency bij — bewijs: `git diff origin/main -- apps/dashboard/package.json` raakt alleen het `scripts`-blok (vier regels erbij, `clean` uitgebreid)
- [x] Een kanarie-string uit een fixture-`LEARNINGS.md` komt niet voor in de klant-zichtbare uitvoer — bewijs: `test-stand.sh` in umanex-os, tweezijdig (afwezig buiten `cockpit/`, aanwezig erbinnen); tegenproef: LEARNINGS-rijen in `backlog.json` laten lekken maakt de as rood en noemt het bestand

**Afgeschreven assen**

- [x] Figma-parity n.v.t. — bewijs: `grep -rc '@figma' apps/dashboard/components/cockpit/` → 0 bestanden met een Figma-header; deze views renderen gemeten data, geen ontworpen scherm
- [x] Design-snapshot-vergelijking n.v.t. — bewijs: `ls apps/dashboard/*.design-snapshot.md` → geen enkel bestand; er is geen basislijn voor een scherm dat vandaag ontstaat. Vanaf de tweede ronde is deze as wél van toepassing

**Stand: 22 van 27 afgevinkt, alle 5 de open items met hun reden.** Status blijft daarom
`gebouwd` en niet `gevalideerd`: dat woord vraagt dat élk item op bewijs staat.

## Beslissingsgeschiedenis

- 2026-09-15: Landingsplaats van nieuwe app naar tweede route in `apps/dashboard` — de cockpit is lokaal en Jeroen-only, dus de loopback-sluis is geen belemmering maar precies goed. De verplaatsbaarheid naar de klant-app wordt in plaats daarvan door een purity-guard gedragen.
- 2026-09-15: `zichtbaarheid` toegevoegd aan het signaalcontract van `de-stand.md`, als mappenstructuur (`<outdir>/cockpit/`) in plaats van een veld dat een filter moet lezen. Reden: de nooit-naar-de-klant-lijst mag niet afhangen van een if die iemand vergeet.
- 2026-09-15: Verificatieschuld wordt per cohort van briefing-datum getoond in plaats van als één totaal. Reden: een deel van de 928 vinkjes zonder `bewijs:` dateert van vóór die conventie, en één beschuldigend getal dat niemand kan verkleinen is geen signaal.
- 2026-09-15: Design-debt kreeg een derde uitkomst naast "een getal" en "geen .tsx": een ontbrekend signaalbestand zegt nu "niet gemeten". De eerste versie leende daar de verklaring van een repo zonder `.tsx`, wat `null ≠ 0` half toepast — geen nul, wél een verklaring die niet klopt. De harness vond het.
