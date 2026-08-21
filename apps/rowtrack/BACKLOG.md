# BACKLOG.md — gemeld, niet gebouwd

Dit bestand vangt het werk dat **buiten scope** viel: wat er benoemd is maar niet gedaan, plus de P3-bevindingen uit `ux-audit` en `security-audit`. Zonder deze lijst is "buiten scope gelaten" alleen een zin in een antwoord dat wegscrollt — de melding bestaat dan wel, het werk niet, en niemand kan er later op terugkomen.

Entries komen erbij **op het moment van de melding**, niet aan het einde van de sessie. Een sessie die zonder reflectie afloopt mag geen scope-drop verliezen; dat is precies de vorm waarin ze vandaag verdwijnen.

## Waarom dit geen HANDOFF is

Een handoff-item is **sessie-gebonden**: het zorgt dat de volgende sessie niet koud begint en verdwijnt zodra het opgepakt is. Een backlog-item is **werk** — het blijft bestaan tot het gebouwd of bewust verworpen is, ook als er tien sessies overheen gaan. Ze in één bestand gooien maakt het sessiestart-signaal onbruikbaar: de handoff-lijst hoort kort te zijn, een backlog mag lang worden.

| Soort bevinding | Huis |
|---|---|
| Werk dat benoemd is maar niet gebouwd (scope-drop) | **hier** |
| P3 / nice-to-have uit `ux-audit` of `security-audit` | **hier** |
| Waargenomen fout van een skill of werkprincipe | `LEARNINGS.md` (via `vastleggen`) |
| Onzekerheid, aanname, risico, next-step van déze sessie | `HANDOFF.md` (via `sessie-reflectie`) |
| Durend feit over Jeroen of het project | auto-memory |

## Statussen

- `open` — vastgelegd, nog geen beslissing over genomen. Telt mee bij sessiestart.
- `gepland` — dit gebeurt; het wacht op een plek in de planning.
- `gebouwd` — gedaan. Blijft staan als spoor, met commit of PR erbij.
- `verworpen` — bewust niet doen. **Reden verplicht**, anders komt hetzelfde voorstel over drie maanden terug en begint de afweging van nul.

## Types

`feature` · `refactor` · `fix` · `test` · `infra` · `ux` · `security` · `docs`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Wat:** {1-2 zinnen — wat er gebouwd zou worden}
    - **Waarom niet nu:** {waarom het buiten scope viel}
    - **Eerste zet:** {concreet startpunt of "-"}
    - **Status:** open

<!-- De eerste entry maakt hieronder de juiste laag-header aan. -->

# Project — rowtrack

## 2026-08-17 — `spm_halved`-toggle heroverwegen nu de aanleiding een andere oorzaak blijkt te hebben · [fix]
- **Wat:** De per-profiel 'SPM halveren'-instelling (`profiles.spm_halved`, `correctSpm`, `useSpmHalved`, migratie, profielscherm, 5 weergavepunten) is gebouwd omdat de slagfrequentie te hoog oogde. De meting van 2026-08-16 wees uit dat de Apollo XL enkelvoudig telt; de doc-comment van `correctSpm` codificeert de aanname nog steeds als feit ("trainers die de slagfrequentie dubbel tellen"). Beslissen: verwijderen, of laten staan met een eerlijke omschrijving voor ergs die het wél doen.
- **Waarom niet nu:** Gebruikersgerichte beslissing met een datamigratie eraan vast (bestaande profielen met de toggle aan), en de vandaag gefixte noemer-bug verklaarde de lage *gemiddelden* — of de live-tegel óók afwijkt hangt af van de FTMS-parser (`/2`) en de bit 0/bit 1-substitutie, en dat vraagt een meting op het toestel.
- **Eerste zet:** Live-tegel tegen een handtelling van 30 s leggen. Wijkt die af → parser-oorzaak; klopt hij → de toggle heeft geen grond meer en kan weg.
- **Status:** open

## 2026-08-17 — Som en teller als één accumulator, zodat de verkeerde noemer niet meer kán · [refactor]
- **Wat:** `wattsSum`/`wattsCount`, `spmSum`/`spmCount`, `splitSum`/`splitTickCount`, `heartRateSum`/`heartRateCount` zijn vier losse ref-paren die per conventie bij elkaar horen. Vervang ze door één type — `{ sum, count }` met `add(acc, v)` en `mean(acc)` — zodat een gemiddelde structureel niet meer door een vreemde teller kán delen.
- **Waarom niet nu:** De fix van vandaag corrigeert alle vijf de foute call-sites en is met een enumererende sweep geverifieerd, maar houdt de conventie in stand: een nieuwe som die een teller vergeet, herhaalt de klasse. Dat is een refactor over alle accumulatoren, breder dan de gemelde bug.
- **Eerste zet:** `lib/accumulator.ts` met `type Accumulator = { sum: number; count: number }`, `add`, `mean`; eerst watts en spm omzetten, daarna split en hartslag.
- **Status:** open

## 2026-08-17 — Guard: elk gemiddelde deelt door de teller uit zijn eigen guard · [test]
- **Wat:** Een check die alle `*Sum.current /`-delingen enumereert en faalt zodra de noemer niet de bijhorende `*Count`/`*TickCount` is. Vandaag met de hand gedraaid; dat vond één call-site méér (`useGoalProgress.ts:94`) dan de analyse had gemeld.
- **Waarom niet nu:** De fix zelf was de vraag; een guard is de duurzame helft en hoort in `scripts/` + CI, wat een eigen beslissing over de rowtrack-CI vraagt (die heeft vandaag geen testrunner-stap).
- **Eerste zet:** `scripts/check-averages.sh` naar het model van `umanex-os/scripts/test-guards.sh`, met een tegenproef op béide kanten: een bewust foute noemer moet hem doen afgaan, de huidige code moet hem doen zwijgen.
- **Status:** open

## 2026-08-15 — `correctSpm` corrigeert ook een teller, geen frequentie · [refactor]
- **Wat:** `correctSpm(spm, halved)` uit `apps/rowtrack/lib/formatters.ts` wordt óók losgelaten op `total_strokes` — in `apps/rowtrack/app/(tabs)/history/[id].tsx:241` en `apps/rowtrack/components/workout/ActivePhase.tsx:621`. Dat is een correctie voor een *frequentie* toegepast op een *aantal*. Splits het in een eigen functie met eigen naam en eigen redenering, ook al is de rekensom vandaag dezelfde.
- **Waarom niet nu:** Kwam boven bij de spm-meting van 2026-08-15, waar de vraag "telt de erg dubbel?" de aandacht opeiste. De semantische fout staat daar los van: welke kant die vraag ook opvalt, een rate-correctiefunctie hoort niet op een teller. Buiten de scope van die analyse.
- **Eerste zet:** `correctStrokeCount(count, halved)` naast `correctSpm` zetten, beide call-sites omzetten, en in de doc-comment vastleggen waaróm ze toevallig hetzelfde doen.
- **Status:** open

## 2026-08-15 — Sla spm en watt op in `samples`, niet enkel `[t, d, hr]` · [feature]
- **Wat:** `samples` bevat per seconde alleen tijd, afstand en hartslag (`apps/rowtrack/lib/hooks/useWorkoutMetrics.ts:286`). Daardoor is een slagfrequentie- of vermogensverloop achteraf niet te reconstrueren uit de database — enkel de eindwaarden (`avg_spm`, `max_spm`) overleven.
- **Waarom niet nu:** Bleek pijnlijk op 2026-08-15: de vraag of de erg dubbel telt was uit de opgeslagen ritten *niet* te beantwoorden. Het antwoord moest uit een live Metro-log met rauwe FTMS-hex komen, wat een draaiende dev-client naast de training vereist. Uitbreiden van de payload raakt opslagformaat en `bestDistanceTime.ts`, dus geen bijzaak van een analyse.
- **Eerste zet:** De tuple-vorm in `apps/rowtrack/app/(tabs)/workout.tsx:126` is positioneel (`[t, d]` of `[t, d, hr]`) en dus niet uitbreidbaar zonder versieveld. Eerst beslissen: sleutel-object per sample, of een versienummer naast de array. Daarna pas velden toevoegen.
- **Status:** open

## 2026-08-11 — Scanfilter verfijnen op machine-type uit FTMS service data · [feature]
- **Wat:** De FTMS-advertentie bevat naast de service UUID een Service Data-veld (0x1826) met een Fitness Machine Type-bitfield; bit 4 = rower. Daarmee kunnen fietsen en loopbanden uit de keuzelijst geweerd worden in plaats van elk FTMS-toestel te tonen. Aanknopingspunt: `dev.serviceData` in de scan-callback, naast `isRowerCandidate` in `apps/rowtrack/lib/ble/rowerCandidate.ts`.
- **Waarom niet nu:** Een vals-positief is hier goedkoop (het toestel verschijnt hooguit in de `DeviceSelectionModal` en de connect-fase eist alsnog de Rower Data characteristic), terwijl een te streng filter een niet-conforme roeier onzichtbaar maakt. Eerst op echte toestellen zien welke advertenties binnenkomen (de nieuwe `adv:`-log), dan pas verfijnen.
- **Eerste zet:** `dev.serviceData?.[FTMS_SERVICE_UUID]` decoderen (base64 → flags-byte + 2-byte LE bitfield) in `rowerCandidate.ts`, met dezelfde vangnet-gedachte: geen service data → toestel tóch tonen.
- **Status:** open
