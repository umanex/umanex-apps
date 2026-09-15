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
    - **Check:** {hoe je in één handeling vaststelt of dit nog openstaat}
    - **Volgende zet:** {concreet actiepunt of "-"}
    - **Status:** open

## Schrijf de check, niet de staat

`Bevinding` is per definitie een waarneming van toen: "de guard matcht alleen Tailwind-syntax", "CLAUDE.md is 32 123 chars". Zulke zinnen worden onwaar zodra de code eronder verandert, en niets in de lus merkt dat — de SessionStart-hook blijft het item elke ochtend tonen als openstaand werk, ook nadat het opgelost is. Op 2026-08-10 stond tien van de zesendertig rowtrack-entries zo verkeerd open; één ervan lokte vijf dagen na zijn oplossing alsnog een productvraag uit die al beantwoord was.

Daarom hoort er bij elke nieuwe entry een **`Check`**: hoe je in één handeling vaststelt of dit item nog leeft. Een commando is het beste (`grep -q 'periodType' apps/rowtrack/lib/period.ts`), een vraag met een eenduidig antwoord mag ook ("draaien `history/index.tsx` en `usePeriodGoal` door dezelfde `lib/period.ts`?"). Kun je er geen formuleren, dan is het item te vaag om over drie weken nog te beoordelen — herformuleer het tot je er wel een hebt.

De check wordt bij sessiestart mee getoond, en `sessie-reflectie` draait hem bij stap 1 vóór een item open blijft staan. Een check die door niets aangeroepen wordt, meet niets.

## Een open item veroudert

Een handoff-item is sessie-gebonden en hoort binnen een paar sessies dicht. Blijft het langer dan **30 dagen** open, dan is het geen handoff meer maar een van drie andere dingen, en `sessie-reflectie` stap 1 kiest er expliciet één: **resolved** (de check zegt dat het niet meer leeft), een **`BACKLOG.md`-item** (het is werk dat blijft liggen — verplaats het, met de check als *Eerste zet*), of een **herformulering** met een scherpere check. Gemeten op rowtrack (2026-09-07): 29 open items, mediaan 53 dagen, 22 ouder dan 30 dagen, allemaal mét check — de lijst was een muur geworden die elke sessiestart werd overgeslagen.

De SessionStart-hook toont daarom per bestand de **vijf jongste** open items volledig en de rest als telling, en markeert elk getoond item dat ouder is dan 30 dagen. Een telling die groeit is het signaal; de triage gebeurt in de reflectie, niet in de hook.

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Project — dashboard

## 2026-09-15 — De Check-runner is nooit op een écht commando uitgevoerd · [onzekerheid]
- **Bevinding:** De poort is gemeten (104 van 144 echte commando's door), de route weigert een vreemde Host met 403, en de harness toetst 404 op een onbekende entry. Maar er is geen enkele keer op de knop gedrukt met een commando dat werkelijk draaide: de hele keten klik → route → `execFileSync('/bin/zsh', ['-lc', …])` → exit-code op het scherm is ongetest. Dat is precies het stuk waar een `cwd`, een PATH of een timeout stil anders kan uitpakken dan verwacht.
- **Check:** open `http://127.0.0.1:3010/cockpit/umanex` en klik op de Check-knop van een item met een `grep`-commando. Verschijnt er een exit-code met uitvoer, dan is dit item dicht; blijft er "draait…" staan of komt er een foutmelding, dan leeft het.
- **Volgende zet:** één klik, en bij een fout de melding in `app/api/cockpit/check/route.ts` naast wat er in de terminal gebeurt leggen.
- **Status:** open

## 2026-09-15 — Vijf acceptatie-items staan open, dus de briefing kan niet naar gevalideerd · [next-step]
- **Bevinding:** `briefings/2026-09-15-feature-cockpit.tcebc.md` staat op `gebouwd` met 22 van 27 items afgevinkt. De vijf open items dragen hun reden: een ontbrekende `loading.tsx`, een empty-state die met de echte data niet op te wekken is, toetsenbord-bereikbaarheid en "een Check draait pas na een klik" die de harness niet kan waarnemen, en een repo die niet op schijf staat.
- **Check:** `grep -c '^- \[ \]' apps/dashboard/briefings/2026-09-15-feature-cockpit.tcebc.md` — 5 betekent dat dit item leeft; 0 plus een Status op `gevalideerd` betekent dat de cyclus gesloten is.
- **Volgende zet:** de twee goedkoopste eerst — een `app/cockpit/loading.tsx` toevoegen, en een fixture-klant in de harness die de empty-state en het ontbrekende-repo-geval opwekt. De andere drie vragen een DOM-telling respectievelijk een teller op de route.
- **Status:** open

## 2026-09-15 — De meting is niet te verversen zolang de umanex-os tree op een andere branch staat · [risico]
- **Bevinding:** `cockpit:collect` roept `umanex-os/scripts/stand.sh` aan uit de working tree, niet uit git. De collector staat sinds vandaag op `main` (PR umanex-os#251), maar die tree stond bij het afsluiten op `feature/storybook-laag` van een parallelle sessie — en dan faalt collect luid met de juiste uitleg. De cockpit toont intussen de meting van 09:38 mét zijn tijdstempel, dus er liegt niets; hij veroudert alleen.
- **Check:** `pnpm --filter dashboard cockpit:collect umanex` — exit 0 betekent dat de tree weer bruikbaar is en dit item dicht kan; de melding "stand.sh bestaat niet" betekent dat het nog leeft.
- **Volgende zet:** collect opnieuw draaien zodra umanex-os op main staat. Overweeg daarna of de collector uit `git show main:scripts/stand.sh` zou moeten lezen in plaats van uit de werkkopie — dat maakt hem onafhankelijk van welke branch daar toevallig uitgecheckt is.
- **Status:** open
