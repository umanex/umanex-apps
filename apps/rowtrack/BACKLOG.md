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

## 2026-08-11 — Scanfilter verfijnen op machine-type uit FTMS service data · [feature]
- **Wat:** De FTMS-advertentie bevat naast de service UUID een Service Data-veld (0x1826) met een Fitness Machine Type-bitfield; bit 4 = rower. Daarmee kunnen fietsen en loopbanden uit de keuzelijst geweerd worden in plaats van elk FTMS-toestel te tonen. Aanknopingspunt: `dev.serviceData` in de scan-callback, naast `isRowerCandidate` in `apps/rowtrack/lib/ble/rowerCandidate.ts`.
- **Waarom niet nu:** Een vals-positief is hier goedkoop (het toestel verschijnt hooguit in de `DeviceSelectionModal` en de connect-fase eist alsnog de Rower Data characteristic), terwijl een te streng filter een niet-conforme roeier onzichtbaar maakt. Eerst op echte toestellen zien welke advertenties binnenkomen (de nieuwe `adv:`-log), dan pas verfijnen.
- **Eerste zet:** `dev.serviceData?.[FTMS_SERVICE_UUID]` decoderen (base64 → flags-byte + 2-byte LE bitfield) in `rowerCandidate.ts`, met dezelfde vangnet-gedachte: geen service data → toestel tóch tonen.
- **Status:** open

## 2026-08-22 — PR-baseline kijkt maar naar de laatste 100 ritten · [fix]
- **Wat:** `apps/rowtrack/lib/hooks/useGoalProgress.ts:126` haalt de PR-baseline op met `.order('started_at', desc).limit(100)`. Zodra rit 101 er is, valt de oudste rit uit de vergelijking en kan een verbroken record stil terugkeren als "nieuw record". Fix: aggregeren in de query (`max(avg_watts)`, `min(avg_split_seconds)`, `max(distance_meters)`, `min(best_2k_seconds)`) of een `personal_records`-view, in plaats van 100 rijen ophalen en client-side scannen.
- **Waarom niet nu:** Buiten scope gehouden bij de PR-detail-briefing van 2026-08-22 (Jeroen koos "2K erbij" zonder de baseline-verbreding). Bij 19 ritten is het gat nog niet bereikbaar — het bijt pas rond rit 101, en dan onzichtbaar.
- **Eerste zet:** De aggregatie in `fetchPRs` vervangen door één `select` met Postgres-aggregaten; de `derivePrMetrics()` uit de PR-detail-briefing kan daar de tegenproef voor leveren (dezelfde records over de volledige historiek).
- **Status:** open

## 2026-08-22 — Ritten van 0 m / 0 s belanden in het archief · [ux]
- **Wat:** Een sessie die start en meteen gestopt wordt, wordt bewaard als volwaardige rit. In de historiek staat er zo één (2026-08-22 12:40:57: 0 m, 0 s, 1 sample, wel `avg_heart_rate` 90 uit de FTMS-fallback). Die rijen vervuilen de lijst en tellen mee in de periodetotalen. Voorstel: bij het opslaan een ondergrens (bv. `distance_meters > 0 && duration_seconds > 0`, of een minimum van ~30 s) en anders stil weggooien — of de gebruiker vragen.
- **Waarom niet nu:** Bovengekomen tijdens de HR-diagnose van 2026-08-22, niet de gevraagde taak. Raakt het opslagpad (`app/(tabs)/workout.tsx`) en vraagt een beslissing over wat er met de bestaande lege rijen gebeurt.
- **Eerste zet:** Drempel bepalen, dan de guard in `saveWorkout` vóór de insert; bestaande lege ritten apart opruimen (nooit blind — eerst tellen met een `select`).
- **Status:** open

## 2026-08-22 — PR-historiek wordt per scherm opnieuw opgehaald · [refactor]
- **Wat:** `apps/rowtrack/lib/hooks/usePrHistory.ts` haalt de volledige ritlijst van de gebruiker op en hangt op drie schermen (home, historiek, detail). Navigeren home → historiek → detail is drie keer dezelfde query; het detailscherm haalt de hele historiek op om één badge van een label te voorzien. Eén gedeelde bron (context of module-cache met invalidatie na een save) haalt dat weg.
- **Waarom niet nu:** Bij 19 ritten onmeetbaar, en een gedeelde cache is scope-uitbreiding bovenop de PR-detail-briefing. De kost groeit wél met de gebruiker, niet met het scherm.
- **Eerste zet:** De hook achter een provider in `app/(tabs)/_layout.tsx` naast `BleProvider`, of `derivePrHistory` alleen voor de ene zichtbare rit draaien op het detailscherm.
- **Status:** open

## 2026-08-22 — De PR-banner leest niet meer als viering · [ux]
- **Wat:** De banner in de samenvatting stond op een rauwe `rgba(245,158,11,0.15)`. Die is vervangen door `bg.raised` + een `achievement.muted`-rand, maar `bg.raised` is exact het vlak van de KPI-band eronder. Een eigen rol — `achievement.surface`, een lage-alpha cream in de geest van `accent.subtle` — zou het vieringsmoment terugbrengen zonder hardcoded kleur.
- **Waarom niet nu:** Tokens wijzigen is een "altijd eerst bevestigen"-actie, en de token-bron is Tokens Studio: een handmatige edit in `tokens/tokens.json` wordt bij de eerstvolgende plugin-push overschreven.
- **Eerste zet:** Rol toevoegen in Tokens Studio (beide mode-sets, de build faalt op asymmetrie), `pnpm tokens:build`, dan `summaryStyles.prBanner` en `styles.prSection` erop zetten. Zie ook de `// TODO`-comments bij `borderLeftWidth: 2` — er is ook geen borderWidth-rol.
- **Status:** open

## 2026-08-22 — Home formatteert PR-waarden anders dan de badge · [fix]
- **Wat:** `fmtPrDistance` / `fmtPr2k` (`apps/rowtrack/app/(tabs)/index.tsx`) ronden af op één decimaal; `formatPrValue` in `lib/prDisplay.ts` gebruikt `formatDistanceDynamic` (twee decimalen). Op hetzelfde scherm staan dus twee schrijfwijzen van dezelfde grootheid — de records-tegel en de badge in de lijst eronder. De briefing wilde die formattering samenvoegen in de PR-module; dat is niet gebeurd omdat het de bestaande Home-weergave zichtbaar zou wijzigen.
- **Waarom niet nu:** Het is een weergavekeuze (1 vs 2 decimalen) die buiten de PR-detail-scope viel en Jeroens beslissing verdient.
- **Eerste zet:** Kiezen welke schrijfwijze wint, dan `fmtPrDistance`/`fmtPr2k` vervangen door `formatPrValue` uit `lib/prDisplay.ts`.
- **Status:** open

## 2026-08-22 — Split-record leest als een breuk in VoiceOver · [ux]
- **Wat:** `formatPrValue('split', …)` levert '2:14 /500m', wat VoiceOver uitspreekt als "2:14 slash 500 m". Een aparte gesproken variant ("2 minuten 14 per 500 meter") laat de visuele compactheid en de uitspraak los van elkaar evolueren.
- **Waarom niet nu:** Verstaanbaar, dus geen blokkade; het vraagt een tweede formatter-as die alleen voor a11y bestaat.
- **Eerste zet:** `prValueSpoken(metric, value)` naast `formatPrValue` in `apps/rowtrack/lib/prDisplay.ts`, gebruikt door `prAccessibilityLabel` en `prEntrySpoken`.
- **Status:** open
