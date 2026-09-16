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

## 2026-09-16 — De functionele review van 2026-09-15: F3 vraagt nog een doelmodel, F6 en de losse eindjes staan open · [feature]
- **Wat:** Van de tien bevindingen in `audits/2026-09-15-functionele-review.md` is Reeks A gebouwd (F1, F2, F4, F5, F6, F7, F8, F9, F10 en het deel van F3 dat geen ontwerp vraagt). Wat overblijft:
  1. **F3, het volledige model** — een streefzone (tempo of vermogen) bínnen een tijd- of afstandsdoel, zoals Jeroen op 2026-09-16 koos. Vraagt een eigen TC-EBC, ontwerp in Figma (`QkRgMc7Quqtbow71DiYa1n`) en een migratie op `workouts`: `goal_zone_type`, `goal_zone_target`, `seconds_in_zone`, plus de bestaande `CHECK (goal_type IN …)` en `workouts_goal_consistency` aanpassen. Losse `split`/`watts`-doelen verdwijnen dan uit de picker; oude ritten blijven leesbaar.
  2. **De opslagstatus op de samenvatting** — "Opgeslagen op dit toestel" · "Synchroniseren…" · "Gesynchroniseerd" · "Opslaan mislukt". De wachtrij weet dit sinds PR umanex-apps#494 allemaal al; alleen het tonen ontbreekt. Eén nieuwe tekstnode in een *Screens v2*-frame, dus Figma eerst (`parity` telt kinderen).
  3. **De losse eindjes uit §"Overige"** van de review: `hrError` tijdens een rit (staat al als eigen item van 2026-08-28), Sentry (idem, 2026-09-07), de DDL die niet opnieuw uitvoerbaar is (README), en dat Maestro geen BLE kan aandrijven — daar is de accumulator-suite van PR umanex-apps#497 het haalbare alternatief voor.
  4. **Productvoorstellen** uit de review, geen defects: "Herhaal deze training", vergelijking met de vorige vergelijkbare rit, een expliciete pauze/hervat-keuze, en data-export.
- **Waarom niet nu:** 1 en 2 zijn ontwerpwerk en Jeroen tekent eerst in Figma — dat is zijn keuze van 2026-09-16, en de code-kant volgt via de scoped `figma-naar-code` skill. 3 en 4 hebben elk hun eigen afweging.
- **Eerste zet:** de TC-EBC voor de streefzone, in de main agent (kritische items: typologie van de tweede as in `IdlePhase`, states in-zone/onder/boven, viering zonder einde, en wat een zone zonder eindpunt betekent).
- **Check:** `grep -n "goal_zone_type" apps/rowtrack/supabase/migrations/*.sql` — geen treffer = het zone-model bestaat nog niet.
- **Status:** open

## 2026-09-16 — Eén toestel-ronde sluit zeven open metingen uit de functionele review · [test]
- **Wat:** Reeks A van het plan bij `audits/2026-09-15-functionele-review.md` is gebouwd en gemerged (PR umanex-apps#492 t/m #499). Zeven uitspraken zijn alleen op de iPhone met de Apollo XL vast te stellen, en ze delen één opstelling:

  | # | wat | hoe |
  |---|---|---|
  | 1 | **F1** — twee offline ritten blijven allebei bestaan | vliegtuigmodus, twee ritten, app herstarten, weer online: elk precies één keer in de historiek |
  | 2 | **F2** — de onthouden doelkeuze | 10 km rijden, terug naar Training: de picker toont 10 km en Start rijdt 10 km |
  | 3 | **F4** — hartslag geblokkeerd zonder toestemming | BPM-rij tikken midden in een rit doet niets; een offline rit van vóór het intrekken brengt later geen hartslag terug (alleen op `rowtrack-test@umanex.be`) |
  | 4 | **F5** — herstel na een crash | halverwege force-quitten, app openen: de vraag verschijnt, de rit komt terug met hoogstens tien seconden verlies |
  | 5 | **F9** — herstart de erg zijn tellers? | tijdens een rit de Apollo XL uit en aan, in de `[BLE]`-log lezen of `elapsedTime` en `totalDistance` op nul beginnen, en of de afstand op het scherm blijft oplopen |
  | 6 | **F10** — een hangende verbinding | Network Link Conditioner op "100% loss" zetten met een open socket: Home komt binnen twintig seconden uit zijn laadtoestand |
  | 7 | **F3** — een tempodoel eindigt de rit niet meer | doel 2:00/500 m, kort onder de 2:00 duiken: de training loopt door |

- **Waarom niet nu:** geen van deze zeven is zonder hardware te meten. Ze staan hier bij elkaar omdat je ze in één ronde afhandelt — los waren het zeven redenen om de dev-client te booten, en dan wordt hij niet geboot.
- **Eerste zet:** `pnpm dev:rowtrack`, bundeldatum controleren (zie het Verify-pad), dan 2 en 7 — die hebben geen erg-trucje nodig. Registreer de ronde met een `Toestel-ronde:`-trailer in de commit, óók als je niets vond: dat is het verschil tussen "nog nooit gekeken" en "gekeken, niets gezien".
- **Check:** `cd apps/rowtrack && node scripts/toestel-schuld.mjs --kort` — staat de teller nog op "nog nooit een ronde", dan leeft dit item.
- **Verwant:** `apps/rowtrack/BACKLOG.md` 2026-09-09 *Eén toestel-ronde beantwoordt vijf vragen* — dezelfde opstelling, doe ze samen.
- **Status:** open

## 2026-09-16 — Uitloggen wist de wachtrij zonder hem eerst af te druinen · [fix]
- **Wat:** `signOut` roept `clearLocalUserData()` aan (`apps/rowtrack/lib/auth.ts:21-24`), en die wist de hele wachtrij. Wie offline uitlogt vlak na een rit, verliest die rit. Dat was vóór lokaal-eerst ook al zo — de wachtrij hield toen alleen ritten waarvan de insert al gefaald was — maar sinds elke rit door de wachtrij gaat, verdient het een expliciete keuze: eerst afdruinen, en bij restanten waarschuwen ("er wacht nog 1 training op synchronisatie") zonder het uitloggen te blokkeren.
- **Waarom niet nu:** buiten de scope van de F1-PR gehouden. `clearLocalUserData` kent de user-id noch de toestemmingsstatus, dus het vraagt een andere knip tussen `lib/auth.ts` en het profielscherm — en de waarschuwing zelf is een ontwerpvraagje (blokkeren mag niet, negeren is stil).
- **Eerste zet:** `countQueued(userId)` bestaat al in `lib/pendingWorkout.ts`. Roep hem aan op het profielscherm vóór `signOut`, druin één keer af, en toon de rest in de bevestiging.
- **Check:** `grep -n -A4 "async function clearLocalUserData" apps/rowtrack/lib/auth.ts` — staat er alleen `purgePendingWorkout()` zonder drain ervoor, dan leeft dit item.
- **Status:** open

## 2026-09-14 — De uitsluitingslijst sluit 292 nodes uit die weer stabiel zijn · [refactor]
- **Wat:** `figma/niet-reproduceerbaar.json` telt 296 paden, maar sinds de spinner-normalisatie van
  2026-09-14 zijn er nog maar **4** nodes werkelijk instabiel (de confetti-items). De overige 292 —
  146 `spinnerArc`, 73 `spinnerBox`, 73 `spinnerSvg` — sluit `instabiele-nodes.mjs` uit omdat zijn
  sluiting die rollen per constructie meeneemt, niet omdat ze bewegen. `parity` vergelijkt ze
  daardoor niet, terwijl dat nu wél zou kunnen.
- **Waarom niet nu:** de normalisatie zelf was de wijziging van die ronde, en de sluiting versmallen
  is een tweede. Ze in één keer doen maakt een verschoven parity-uitkomst niet toewijsbaar.
- **Eerste zet:** in `scripts/instabiele-nodes.mjs` de sluiting baseren op de MÉTING in plaats van op
  de rolnaam, dan `parity` draaien: hij hoort groen te blijven met ~292 nodes méér in de vergelijking.
  Blijft hij niet groen, dan is dát de uitkomst — een verschil dat de uitsluiting tot nu toe verborg.
- **Check:** `node -e 'const d=require("./apps/rowtrack/figma/niet-reproduceerbaar.json"); console.log(Array.isArray(d)?d.length:Object.keys(d).length)'` naast de regel `N van M nodes gemeten instabiel` uit `npm run instabiele-nodes` — staan die ver uit elkaar, dan sluit de lijst meer uit dan er beweegt.
- **Status:** open

## 2026-09-14 — `PaceZone.tsx` is dood sinds F18, maar niet verwijderd · [refactor]
- **Wat:** `components/PaceZone.tsx` (type `PaceZoneLevel` + functie `getPaceZone`) had precies één
  gebruiker: de `paceZone`-prop van `ActivePhase`. Die prop is op 2026-09-14 verwijderd omdat niets
  hem las (UX-audit F18), en daarmee is dit bestand dood — het hangt nog aan de barrel
  `components/workout/index.ts` en verder nergens.
- **Waarom niet nu:** het bestand stond niet in F18 en een bestand verwijderen is een actie die
  vooraf bevestigd hoort te worden. Het is bovendien geen component maar een pure helper, dus het
  kost niets om te blijven staan — behalve dat "dode laag" precies is wat F18 wilde opruimen.
- **Eerste zet:** vragen of het weg mag. Zo ja: bestand weg, twee regels uit
  `components/workout/index.ts`, `tsc --noEmit`. Zo nee: een comment in het bestand die zegt
  waarvoor het bewaard wordt, anders is het over drie maanden opnieuw een vondst.
- **Check:** `grep -rn "getPaceZone\|PaceZoneLevel" apps/rowtrack/app apps/rowtrack/components apps/rowtrack/lib | grep -v "components/PaceZone.tsx\|workout/index.ts"` — leeg betekent dat het bestand nog steeds nul gebruikers heeft.
- **Status:** open

## 2026-09-12 — Redactie- en code review: 214 bevindingen, 1 P0 en 25 P1 · [fix]
- **Wat:** Volledige review van `apps/rowtrack` op twee assen — alle user-facing NL-copy en de code — met 222 onderzochte en 214 overeind gebleven bevindingen. Het rapport staat in `apps/rowtrack/audits/2026-09-12-redactie-en-code-review.md`, mét bewijs per bevinding, de negen weerlegde beweringen en de zes gaten die niemand bekeek. Bewust één backlog-item en niet 214: dat zou het sessiestart-signaal slopen dat deze lijst juist moet dragen. Vier oorzaken dragen de meeste symptomen — de toestemmingsgate op de schrijfactie in plaats van op de bron, de doeltoets op een andere grootheid dan het scherm, "laden" als eindtoestand doordat geen enkele Supabase-aanroep een deadline heeft, en `??` waar `||` hoort.
- **Waarom niet nu:** De opdracht was reviewen, niet fixen. De P0 en de eerste drie punten uit §10 zijn samen minder dan twintig regels diff en verdienen een eigen ronde met een tegenproef per fix; de rest vraagt keuzes (terminologie, eenheden, a11y-strategie) die van Jeroen zijn.
- **Eerste zet:** §10 van het rapport, punt 1 tot en met 3: de `Alert` vóór `revoke` op de consent-gate (`app/(tabs)/_layout.tsx:116`), `||` in plaats van `??` op de drie auth-schermen, en `"type-check": "tsc --noEmit"` in `package.json`.
- **Status:** open

## 2026-08-28 — Dubbele `destroy()` op één gedeelde BleManager · [fix]
- **Wat:** `lib/ble/ble-context.tsx:146-148` roept in de effect-cleanup eerst `service.destroy()` en dan `hrService.destroy()` aan. Beide diensten delen één `BleManager` — de constructor van ble-plx geeft de bestaande instance terug (`BleManager.js:78-81`, geverifieerd in de geïnstalleerde 3.5.1-bron), en `BleManager.destroy()` zet `sharedInstance` op null (`:162-164`). De tweede aanroep vernietigt dus een al vernietigde client, en de eerste sloopt de manager onder de HR-dienst vandaan terwijl die nog operaties in de lucht kan hebben.
- **Waarom niet nu:** gevonden tijdens de HR-diagnose van 2026-08-28; die opdracht was instrumentatie plus het listener-lek. Dit raakt de levenscyclus van beide diensten en verdient een eigen ronde met een toestel ernaast — de faalmodus is vandaag niet waargenomen, alleen uit de bron afgeleid.
- **Eerste zet:** één eigenaar voor de gedeelde manager aanwijzen (de context, niet de diensten), zodat `destroy()` op een dienst alleen zijn eigen abonnementen opruimt. Toets daarna dat een provider-teardown gevolgd door een remount opnieuw kan verbinden — dat is de tak die vandaag per toeval goed gaat omdat `sharedInstance` genulld wordt.
- **Status:** open

## 2026-08-28 — Mislukte hartslagpoging is tijdens een rit niet van een dode knop te onderscheiden · [ux]
- **Wat:** `app/(tabs)/workout.tsx:355-373` geeft `hrError` niet door aan `ActivePhase`. In de idle-fase toont `IdlePhase.tsx:286` de foutzin onder de rij; midden in een training ziet de roeier alleen een BPM-tegel op "—" en een spinner, ongeacht of de band niet gevonden werd, geen data stuurde, of de knop niets deed.
- **Waarom niet nu:** de opdracht van 2026-08-28 was de meetbaarheid van het HR-pad, niet de weergave. Het is bovendien een ontwerpvraag — een foutzin midden in een inspanning concurreert met de metrics, dus het is geen kwestie van de prop doorgeven en klaar.
- **Eerste zet:** beslissen wat de active-fase toont bij `hrError`: de rij rood met "Opnieuw", een korte toast, of niets tot de rit voorbij is. Pas daarna de prop doorgeven.
- **Status:** open

## 2026-08-17 — `spm_halved`-toggle heroverwegen nu de aanleiding een andere oorzaak blijkt te hebben · [fix]
- **Wat:** De per-profiel 'SPM halveren'-instelling (`profiles.spm_halved`, `correctSpm`, `useSpmHalved`, migratie, profielscherm, 5 weergavepunten) is gebouwd omdat de slagfrequentie te hoog oogde. De meting van 2026-08-16 wees uit dat de Apollo XL enkelvoudig telt; de doc-comment van `correctSpm` codificeert de aanname nog steeds als feit ("trainers die de slagfrequentie dubbel tellen"). Beslissen: verwijderen, of laten staan met een eerlijke omschrijving voor ergs die het wél doen.
- **Waarom niet nu:** Gebruikersgerichte beslissing met een datamigratie eraan vast (bestaande profielen met de toggle aan), en de vandaag gefixte noemer-bug verklaarde de lage *gemiddelden* — of de live-tegel óók afwijkt hangt af van de FTMS-parser (`/2`) en de bit 0/bit 1-substitutie, en dat vraagt een meting op het toestel.
- **Eerste zet:** Live-tegel tegen een handtelling van 30 s leggen. Wijkt die af → parser-oorzaak; klopt hij → de toggle heeft geen grond meer en kan weg.
- **Status:** open

## 2026-08-17 — Som en teller als één accumulator, zodat de verkeerde noemer niet meer kán · [refactor]
- **Wat:** `wattsSum`/`wattsCount`, `spmSum`/`spmCount`, `splitSum`/`splitTickCount`, `heartRateSum`/`heartRateCount` zijn vier losse ref-paren die per conventie bij elkaar horen. Vervang ze door één type — `{ sum, count }` met `add(acc, v)` en `mean(acc)` — zodat een gemiddelde structureel niet meer door een vreemde teller kán delen.
- **Waarom niet nu:** De fix van vandaag corrigeert alle vijf de foute call-sites en is met een enumererende sweep geverifieerd, maar houdt de conventie in stand: een nieuwe som die een teller vergeet, herhaalt de klasse. Dat is een refactor over alle accumulatoren, breder dan de gemelde bug.
- **Eerste zet:** `lib/accumulator.ts` met `type Accumulator = { sum: number; count: number }`, `add`, `mean`; eerst watts en spm omzetten, daarna split en hartslag.
- **Status:** gebouwd — 2026-09-16, PR umanex-apps#497. `Acc = { sum, count }` met `add` en `mean` in `lib/sessionAccumulator.ts`; de twintig losse refs in `useWorkoutMetrics` zijn één sessie-object geworden. Delen door een vreemde teller is niet meer uit te drukken. De guard `check-averages` is meegegaan: die zocht naar een vorm die niet meer bestaat en vond nul delingen — nul is geen groene meting maar een wachter die niets ziet. Hij toetst nu dat `sum / count` alléén in `mean()` staat.

## 2026-08-17 — Guard: elk gemiddelde deelt door de teller uit zijn eigen guard · [test]
- **Wat:** Een check die alle `*Sum.current /`-delingen enumereert en faalt zodra de noemer niet de bijhorende `*Count`/`*TickCount` is. Vandaag met de hand gedraaid; dat vond één call-site méér (`useGoalProgress.ts:94`) dan de analyse had gemeld.
- **Waarom niet nu:** De fix zelf was de vraag; een guard is de duurzame helft en hoort in `scripts/` + CI, wat een eigen beslissing over de rowtrack-CI vraagt (die heeft vandaag geen testrunner-stap).
- **Eerste zet:** `scripts/check-averages.sh` naar het model van `umanex-os/scripts/test-guards.sh`, met een tegenproef op béide kanten: een bewust foute noemer moet hem doen afgaan, de huidige code moet hem doen zwijgen.
- **Check:** `ls apps/rowtrack/scripts/check-averages.sh` — bestaat niet = de guard is er niet, en de conventie hangt aan wie eraan denkt.
- **Relevantie 2026-09-14:** LEEFT. `check-averages.sh` bestaat niet; `grep -rn 'Sum.current /' apps/rowtrack/lib` geeft nog vijf delingen die alleen per conventie bij hun teller horen.
- **Status:** gebouwd — 2026-09-14, `scripts/check-averages.mjs` + CI-stap. Meet tien delingen, waarvan drie via een lokale hulpvariabele die hij terugvolgt. `.mjs` in plaats van de voorgestelde `.sh`: hij moet een variabele kunnen herleiden, en dat is geen grep-werk. Tegenproef op beide takken. Die tweede tak bleek nodig: mijn eerste zelftest muteerde een ternary-conditie in plaats van een noemer, zweeg terecht, en wees naar de guard in plaats van naar zichzelf.

## 2026-08-15 — `correctSpm` corrigeert ook een teller, geen frequentie · [refactor]
- **Wat:** `correctSpm(spm, halved)` uit `apps/rowtrack/lib/formatters.ts` wordt óók losgelaten op `total_strokes` — in `apps/rowtrack/app/(tabs)/history/[id].tsx:241` en `apps/rowtrack/components/workout/ActivePhase.tsx:621`. Dat is een correctie voor een *frequentie* toegepast op een *aantal*. Splits het in een eigen functie met eigen naam en eigen redenering, ook al is de rekensom vandaag dezelfde.
- **Waarom niet nu:** Kwam boven bij de spm-meting van 2026-08-15, waar de vraag "telt de erg dubbel?" de aandacht opeiste. De semantische fout staat daar los van: welke kant die vraag ook opvalt, een rate-correctiefunctie hoort niet op een teller. Buiten de scope van die analyse.
- **Eerste zet:** `correctStrokeCount(count, halved)` naast `correctSpm` zetten, beide call-sites omzetten, en in de doc-comment vastleggen waaróm ze toevallig hetzelfde doen.
- **Status:** open

## 2026-08-15 — Sla spm en watt op in `samples`, niet enkel `[t, d, hr]` · [feature]
- **Wat:** `samples` bevat per seconde alleen tijd, afstand en hartslag (`apps/rowtrack/lib/hooks/useWorkoutMetrics.ts:286`). Daardoor is een slagfrequentie- of vermogensverloop achteraf niet te reconstrueren uit de database — enkel de eindwaarden (`avg_spm`, `max_spm`) overleven.
- **Waarom niet nu:** Bleek pijnlijk op 2026-08-15: de vraag of de erg dubbel telt was uit de opgeslagen ritten *niet* te beantwoorden. Het antwoord moest uit een live Metro-log met rauwe FTMS-hex komen, wat een draaiende dev-client naast de training vereist. Uitbreiden van de payload raakt opslagformaat en `bestDistanceTime.ts`, dus geen bijzaak van een analyse.
- **Eerste zet:** De tuple-vorm in `apps/rowtrack/app/(tabs)/workout.tsx:126` is positioneel (`[t, d]` of `[t, d, hr]`) en dus niet uitbreidbaar zonder versieveld. Eerst beslissen: sleutel-object per sample, of een versienummer naast de array. Daarna pas velden toevoegen.
- **Check:** `grep -n 'samplesRef.current.push' -A6 apps/rowtrack/lib/hooks/useWorkoutMetrics.ts` — staat er geen `spm`/`watts` in het object, dan draagt de tijdreeks ze nog steeds niet.
- **Relevantie 2026-09-14:** LEEFT. De doc-comment noemt de reeks nog `{t, d, hr}` en het push-object draagt geen spm of watt.
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
- **Status:** gebouwd — 2026-09-16, PR umanex-apps#493. `lib/personalRecordsQuery.ts` haalt per metric één rij op over de volledige historiek, en Home én de rit-baseline lezen nu uit diezelfde bron — zo kunnen die twee elkaar ook niet meer tegenspreken. `.gt(kolom, 0)` is de `isUsable`-regel in de query én houdt NULL buiten: gemeten op het live schema zijn `avg_watts` en `avg_split_seconds` nullable, en Postgres sorteert NULLS FIRST bij DESC. Tegenproef read-only tegen productie: op de 22 echte ritten geven oud en nieuw hetzelfde antwoord (148 W), synthetisch met het record op rit 1 van 101 zegt oud 150 W en nieuw 300 W.

## 2026-08-22 — Ritten van 0 m / 0 s belanden in het archief · [ux]
- **Wat:** Een sessie die start en meteen gestopt wordt, wordt bewaard als volwaardige rit. In de historiek staat er zo één (2026-08-22 12:40:57: 0 m, 0 s, 1 sample, wel `avg_heart_rate` 90 uit de FTMS-fallback). Die rijen vervuilen de lijst en tellen mee in de periodetotalen. Voorstel: bij het opslaan een ondergrens (bv. `distance_meters > 0 && duration_seconds > 0`, of een minimum van ~30 s) en anders stil weggooien — of de gebruiker vragen.
- **Waarom niet nu:** Bovengekomen tijdens de HR-diagnose van 2026-08-22, niet de gevraagde taak. Raakt het opslagpad (`app/(tabs)/workout.tsx`) en vraagt een beslissing over wat er met de bestaande lege rijen gebeurt.
- **Eerste zet:** Drempel bepalen, dan de guard in `saveWorkout` vóór de insert; bestaande lege ritten apart opruimen (nooit blind — eerst tellen met een `select`).
- **Check:** `grep -n -B4 "from('workouts').insert" 'apps/rowtrack/app/(tabs)/workout.tsx'` — geen ondergrens op `distance_meters`/`duration_seconds` vóór de insert = een lege rit kan nog steeds bewaard worden.
- **Relevantie 2026-09-14:** LEEFT, maar de HELFT is vervallen. De guard ontbreekt nog steeds (de insert op regel 207 kent geen ondergrens), dus een nieuwe lege rit kan alsnog ontstaan. Het opruimen van bestaande rijen is niet meer nodig: gemeten op de productiedatabase (read-only `select`) staan er **0 lege ritten op 22**, dus de rit van 2026-08-22 12:40:57 uit dit item bestaat niet meer. Bouw dus alleen de drempel, en zoek geen opruimwerk dat er niet is.
- **Status:** gebouwd — 2026-09-14. De guard stond er al, maar toetste `tickCount`, en dát telt élk binnengekomen pakket — ook een dat alleen hartslag draagt. Zo kwam de rit van 2026-08-22 12:40:57 (0 m, 0 s, gemiddelde hartslag 90) er langs. `lib/storableWorkout.ts` toetst nu afstand én duur, met `lib/storableWorkout.test.ts` als tegenproef — die draagt die rit als geval. Geen verzonnen drempel van 30 s: bij nul is er letterlijk niets te tonen. Opruimen was niet meer nodig (0 lege ritten op 22).

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

## 2026-08-22 — Een wachtende BLE-scan overleeft wegnavigeren en achtergrond · [fix]
- **Wat:** `scan-lock.ts` zet een tweede scanaanvraag in de wachtrij. Verlaat de gebruiker het trainingsscherm of gaat de app naar de achtergrond, dan breekt niemand die aanvraag af. Er hangen sinds de AppState-fix wél twee listeners (`lib/ble/hr-service.ts` voor de stilte-deadline, `app/(tabs)/workout.tsx` voor autoconnect) en de `useFocusEffect` daar ruimt zichzelf op — maar géén van drieën raakt het scan-slot aan. Tot 25 s later start de scan alsnog, draait 15 s, en zet daarna een foutmelding klaar die de gebruiker ziet zodra hij terugkomt.
- **Waarom niet nu:** De trigger bouwen raakt de levenscyclus van beide diensten (focus-cleanup + AppState) en dat is een bredere wijziging dan de scan-serialisatie zelf. Het venster is bovendien begrensd (maxHoldMs), geen eeuwige hang.
- **Eerste zet:** Haak `stopScan()` op beide diensten aan de bestaande AppState-listener in `workout.tsx` en aan de cleanup van diezelfde `useFocusEffect` — de bedrading ligt er al, alleen het scan-slot hangt er niet aan.
- **Status:** open

## 2026-08-22 — De node:test-suites draaien niet in CI · [infra]
- **Wat:** `apps/rowtrack` heeft nu een `test`-script (`node --test "lib/**/*.test.ts"`, 47 tests), maar `.github/workflows/ci.yml` draait alleen type-check, lint en build. De enige wachters op de rekenkundige en concurrency-invarianten (`personalRecords`, `scan-lock`, `hrLink`, `bestDistanceTime`, `calories`, `period`) hangen dus aan iemand die eraan denkt ze met de hand te draaien.
- **Waarom niet nu:** `ci.yml` is gedeeld door vier apps; een stap toevoegen is een config-wijziging die Jeroens akkoord verdient, en er moet een keuze komen of andere apps hun eigen suite krijgen.
- **Eerste zet:** Eén stap `pnpm --filter rowtrack test` naast de token-guards in `ci.yml`, en beslissen of de andere apps volgen.
- **Status:** gebouwd — `ci.yml` draagt sinds dan de stap "Guard — invarianten (node:test)", waargenomen op 2026-08-25 in run 32819117593.

## 2026-08-25 — `scan-lock` faalt sporadisch in CI · [test]
- **Wat:** `apps/rowtrack/lib/ble/scan-lock.test.ts:93` ("het vangnet geeft het slot vrij als een dienst vergeet los te laten") faalde op `assert.ok(ownsScan(rower))` in run 32819117593, terwijl exact dezelfde commit in de parallelle run 32819121407 slaagde en beide runs erna opnieuw groen waren. 50 van 51 tests passeerden. De test leunt op een tijdgebonden vangnet, dus een trage runner is de waarschijnlijke oorzaak.
- **Waarom niet nu:** gevonden tijdens een portfolio-copywijziging; `fix(rowtrack):` hoort niet in een `feat(portfolio):`-PR, en de hook blokkeert dat terecht.
- **Eerste zet:** de test op een injecteerbare klok zetten in plaats van op echte tijd, zodat het vangnet deterministisch afgaat. Een wachter die één op de vier keer vals alarm slaat, leert je hem te negeren — en dat is schadelijker dan geen wachter.
- **Tweede meting (2026-08-25, 11:25):** run 32841975698 faalde op dezelfde test en dezelfde `assert.ok(ownsScan(rower))` (50/51), de parallelle run 32841979970 op dezelfde commit was groen. Tweemaal op één dag; de klok-injectie wordt dringender.
- **Oorzaak (gemeten 2026-08-25):** geen "trage runner" in het algemeen, maar ms-drift tussen twee `setTimeout`-aanroepen. De hr-guard wordt vóór de wachttimer gepland; valt er een ms-grens tussen, dan verloopt de roeier-guard (hr-start + 20 + 20) één ms vóór de wacht (start + 40) en vuurt hij eerst — lokaal 1/30 zonder geforceerde drift, 18/30 bij 1,5 ms, 29/30 bij 3 ms.
- **Status:** gebouwd — 2026-08-25, PR `fix/scan-lock-deterministic-test`: test op `t.mock.timers` (node:test), met de grens zelf getoetst (19 ms stil, 20 ms vuurt, ook voor de opvolger). Tegenproef: vangnet ×1000 → rood; `onPreempted` weg → rood; 30× groen; productiecode ongewijzigd.

## 2026-09-07 — 0.20 accent-selectie-fill zonder token · [refactor]

- **Wat:** Een `accent.selected`-alias (rgba(240,84,84,0.20)) toevoegen in Tokens Studio in beide mode-sets, tokens rebuilden en de drie hardcodes in components/Chip.tsx, components/GoalSegments.tsx en components/Segmented.tsx door het token vervangen (TODO's weg).
- **Waarom niet nu:** HANDOFF-item van 2026-07-09, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -rn "rgba(240, 84, 84, 0.20)" apps/rowtrack/components` → 3 treffers: GoalSegments.tsx:163, Chip.tsx:47, Segmented.tsx:91 (alle drie met `// TODO … accent.selected`). `grep -rn selected apps/rowtrack/tokens/tokens.json apps/rowtrack/constants/colors.ts`…
- **Eerste zet:** Tokens Studio → `accent.selected` = 0.20 op `accent.default` in beide mode-sets pushen (samen met bg.raised-alpha en de skeleton-rol uit de entry van 2026-08-10), dan `grep -rn "rgba(240, 84, 84, 0.20)" apps/rowtrack/components` moet 0 geven na de vervanging.
- **Check:** `grep -rn "rgba(240, 84, 84, 0.20)" apps/rowtrack/components` — treffers = de hardcode staat er nog en `accent.selected` is niet gepusht; leeg = token gepusht en de plekken vervangen.
- **Status:** open

## 2026-09-07 — Out-of-scope design-vragen IdlePhase · [fix]

- **Wat:** Button.sizeLg op de tokenwaarde zetten (buttonTokens.primary.height) in plaats van space['44'], of — als 44 de bedoelde hoogte is — de token in Tokens Studio op 44 zetten; daarbij de Theme-alias buttonPrimaryHeight (56) meenemen zodat er één bron overblijft. Het maxFontSizeMultiplier-commentaar in Button.tsx:107 volgt de gekozen hoogte.
- **Waarom niet nu:** HANDOFF-item van 2026-07-09, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -n "height:" apps/rowtrack/components/Button.tsx apps/rowtrack/constants/colors.ts | grep -E "space\['44'\]|height: 48"` → 2 regels (colors.ts:59 `height: 48`, Button.tsx:137 `height: space['44']`). tokens.json (python-walk op `$value`):…
- **Eerste zet:** Figma node 109-2214 (Button, file T1bGrvIzSNeLyh5CbarATZ) uitlezen op de primary-hoogte en Jeroen laten kiezen tussen 44/48/56; daarna `grep -n "height:" apps/rowtrack/components/Button.tsx apps/rowtrack/constants/colors.ts | grep -E "space\['44'\]|height: 48"` moet 1 regel geven.
- **Check:** `grep -n "height:" apps/rowtrack/components/Button.tsx apps/rowtrack/constants/colors.ts | grep -E "space\['44'\]|height: 48"` — twee regels = 44 (Button.sizeLg) en 48 (buttonTokens.primary) staan nog uiteen; één regel = de keuze is gemaakt.
- **Aanvulling 2026-09-07 (Figma-sync):** de keuze raakt ook `size="md"`, en die kant is nog
  niet benoemd. Gemeten op de Figma-variantnodes én de browser-render: **`lg` is 44px, `md`
  is 48px** — md is dus hóger dan lg. `styles.sizeLg` zet een vaste hoogte
  (`height: space['44']`), `styles.sizeMd` alleen `paddingVertical: space['12']`, dus de
  hoogte volgt daar uit de regelhoogte van 18px tekst plus 2×12. Neem `md` mee in dezelfde
  beslissing; anders wordt lg gefixt en blijft de omkering staan.
- **Status:** open

## 2026-09-07 — Best-2000m: BLE-reconnect midden in workout re-baselinet niet · [fix]

- **Wat:** Bij een auto-reconnect midden in een workout de baseline (initialElapsed/initialDistance) opnieuw zetten of lastMetrics resetten, en de {t,d}-samplereeks bewust in een nieuwe run laten starten in plaats van negatieve samples stil te laten wegvallen in sanitize().
- **Waarom niet nu:** HANDOFF-item van 2026-07-10, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -rn reconnect apps/rowtrack/lib/hooks/useWorkoutMetrics.ts` → leeg (rc=1). `grep -n lastMetrics apps/rowtrack/lib/ble/ble-service.ts` → resets alleen op regel 130 (connectKnown) en 203 (startScan); attemptReconnect (626-650) roept connectToDevice aan…
- **Eerste zet:** Eerst meten of het nodig is: op de Apollo XL tijdens een rit Bluetooth uit/aan zetten om een reconnect te forceren en in de `[BLE]`-log lezen of elapsedTime/totalDistance na de reconnect op 0 herstarten. Herstarten ze niet, dan is dit item met die meting als bewijs te sluiten.
- **Check:** `grep -rn reconnect apps/rowtrack/lib/hooks/useWorkoutMetrics.ts` — geen treffer = het meetpad kent geen reconnect en zet de baseline dus niet opnieuw.
- **Relevantie 2026-09-14:** LEEFT. Check gedraaid: `grep -rn reconnect apps/rowtrack/lib/hooks/useWorkoutMetrics.ts` geeft nul treffers (rc=1) — het meetpad kent nog steeds geen reconnect.
- **Status:** gebouwd — 2026-09-16, PR umanex-apps#497 (F9 uit de functionele review). `readCounter` in `lib/sessionAccumulator.ts` herkent een teller die opnieuw begint en telt de nieuwe reeks op bij wat er al stond; afstand, tijd en slagen zijn daarmee per constructie niet-dalend, en de `{t,d}`-reeks blijft monotoon. **De meting staat nog open**: of de Apollo XL na uit/aan werkelijk op nul herstart, is alleen op het toestel vast te stellen en staat in de toestel-ronde. Herstart hij niet, dan is de code onschadelijk en sluit die meting dit item definitief.

## 2026-09-07 — Segment-breedte snapt (Fabric layout-animatie taboe) · [ux]

- **Wat:** De actieve goal-segment vloeiend laten morphen in plaats van snappen: ofwel de remount-key vervangen door een Reanimated LinearTransition zodra een nieuwere Reanimated/RN-versie de Fabric stale-width clipping niet meer vertoont, ofwel de door Jeroen afgewezen variant (gelijk-brede segmenten + schuivende pill) alsnog voorleggen.
- **Waarom niet nu:** HANDOFF-item van 2026-07-10, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -nF '${selected === type}' apps/rowtrack/components/GoalSegments.tsx` → 1 treffer (regel 120, `key={\`${type}-${selected === type}\`}`). package.json: react-native-reanimated ~4.1.1, react-native 0.81.5, expo ~54.0.35; pnpm-lock:…
- **Eerste zet:** Bij de eerstvolgende bump van react-native-reanimated (major/minor boven 4.1) of react-native boven 0.81: in GoalSegments.tsx de key op regel 120 tijdelijk door `key={type}` + `layout={LinearTransition}` vervangen en op de sim toetsen of een gedeactiveerd segment zijn labelbreedte nog vasthoudt (Split/Watt actief maken en kijken of het laatste segment van het scherm loopt).
- **Check:** `grep -nF '${selected === type}' apps/rowtrack/components/GoalSegments.tsx` — een treffer = de remount-key (en dus de snap) staat er nog; leeg = vervangen door een layout-animatie of door gelijk-brede segmenten.
- **Relevantie 2026-09-14:** LEEFT, maar GEBLOKKEERD op zijn eigen voorwaarde. De remount-key staat er nog (`GoalSegments.tsx:123`), dus de snap is er. De *Eerste zet* begint echter bij "de eerstvolgende bump van react-native-reanimated boven 4.1 of react-native boven 0.81" — en beide staan onveranderd op `~4.1.1` en `0.81.5`. Nu oppakken betekent de Fabric-clipping opnieuw uitlokken die de remount-key juist oplost. Wacht op de bump, of leg Jeroen de eerder afgewezen variant (gelijk-brede segmenten) opnieuw voor.
- **Status:** open

## 2026-09-07 — BLE-replay test-harness voor de workout-flow · [test]

- **Wat:** Een replay-harness die een opgenomen FTMS-packetreeks (fixture) deterministisch door useWorkoutMetrics + useGoalProgress + de save-flow speelt, zodat dubbel-save, empty-guard en disconnect-timing zonder fysieke erg getest worden, als node:test-suite in CI.
- **Waarom niet nu:** HANDOFF-item van 2026-07-16, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `git ls-files apps/rowtrack | grep -Ei 'replay|fixture|\.test\.ts$'` → 6 bestanden: lib/authClockSkew.test.ts, lib/ble/adapterReady.test.ts, lib/ble/hrLink.test.ts, lib/ble/rowerCandidate.test.ts, lib/ble/scan-lock.test.ts, lib/personalRecords.test.ts — geen…
- **Eerste zet:** Eén type-B-pakketreeks opnemen via de opnameketen uit de referentiepagina (of uit de Metro-log van 2026-08-28), als `lib/ble/__fixtures__/apollo-xl-session.json` committen en een eerste `lib/hooks/useWorkoutMetrics.test.ts` schrijven die de reeks via ftms-parser voert en elapsed/distance/calories tegen de opgeslagen rit controleert; check daarna: `git ls-files apps/rowtrack | grep -Ei 'replay|fixture'` ≥1.
- **Check:** `git ls-files apps/rowtrack | grep -Ei 'replay|fixture|\.test\.ts$'` — alleen `lib/ble/adapterReady.test.ts`, `lib/ble/hrLink.test.ts` en `lib/ble/rowerCandidate.test.ts` (BLE-bedrading, geen flow) = nog geen packetreeks die door `useWorkoutMetrics` en de save-flow loopt.
- **Status:** open

## 2026-09-07 — Keychain-accessibility auth-refresh-fix nog device-verificatie nodig · [test]

- **Wat:** Toestel-verificatie van de keychain-accessibility-fix: bevestigen dat de GoTrue auto-refresh bij vergrendeld scherm geen 'User interaction is not allowed'-red-box meer geeft, en de uitkomst met datum vastleggen.
- **Waarom niet nu:** HANDOFF-item van 2026-07-16, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -n AFTER_FIRST_UNLOCK apps/rowtrack/lib/secureStorage.ts` → regel 147 (comment) en 154 (`keychainAccessible: ss!.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`). `git log --oneline --since=2026-07-16 -- apps/rowtrack/lib/secureStorage.ts` → 4f63d59 (de fix) en…
- **Eerste zet:** Op de iPhone met dev-client: inloggen → app één keer naar de voorgrond (herschrijft bestaande keychain-items met de nieuwe accessibility) → scherm vergrendelen → ≥ 1 refresh-tick afwachten (token-TTL) → Metro-log lezen op 'getValueWithKeyAsync'; geen treffer = resolved, treffer = bug-entry.
- **Check:** Alleen jij kunt dit beantwoorden: heb je op de iPhone na inloggen het scherm vergrendeld en een refresh-tick zonder red-box gezien? Nee = open.
- **Status:** open

## 2026-09-07 — Translucente celebration-card gebruikt hardcoded rgba · [refactor]

- **Wat:** Een translucente bg.raised-rol (bv. `bg.raisedTranslucent` = `{color.alpha.…}` @ 75%) toevoegen in Tokens Studio → tokens.json in beide mode-sets, rebuilden en de hardcode in MotivationalToast.tsx:196 (en de 0%-variant in WheelPicker.tsx:30) erdoor vervangen.
- **Waarom niet nu:** HANDOFF-item van 2026-07-16, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -rn 'rgba(33, 36, 44, 0.75)' apps/rowtrack/components` → 1 treffer: components/MotivationalToast.tsx:196. `grep -n -i 'overlay|alpha|0\.75|scrim' apps/rowtrack/tokens/tokens.json` → een `color.alpha`-groep (regel 116) met red-06/08/12/20, white-04/22,…
- **Eerste zet:** In tokens.json onder `color.alpha` een `raised-75`-primitive toevoegen en onder `bg` een alias ernaar, `pnpm tokens:build`, dan MotivationalToast.tsx:196 op de gebouwde constante zetten; check: `grep -rn 'rgba(33, 36, 44' apps/rowtrack/components` leeg.
- **Check:** `grep -rn "rgba(33, 36, 44, 0.75)" apps/rowtrack/components` — één treffer (`MotivationalToast.tsx:196`) = er is nog geen translucente `bg.raised`-rol; leeg = token gepusht en vervangen.
- **Status:** open

## 2026-09-07 — UX-audit P2: geen datavisualisatie (HR-verloop, split-trend) · [feature]

- **Wat:** Datavisualisatie op de ruwe `workouts.samples` (1 Hz t/d/hr): HR-over-tijd met zones op Detail-Hartslag, staafjes per 500 m op Detail-Splits, een mini-trend op Home — eerst als Figma-design, dan via figma-naar-code met react-native-svg (of Skia) als tekenlaag.
- **Waarom niet nu:** HANDOFF-item van 2026-07-16, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -c react-native-svg apps/rowtrack/package.json` → 0. `grep -rln 'victory|recharts|skia|chart' apps/rowtrack/package.json` → leeg. `git log --oneline --since=2026-08-06 -- apps/rowtrack` bevat geen commit over grafieken/visualisatie.
- **Eerste zet:** Figma: één detail-scherm ontwerpen (HR-verloop + zones) op basis van een echte rit uit het testaccount; daarna een TC-EBC schrijven en `pnpm --filter rowtrack add react-native-svg` (dependency → eerst bevestigen) plus native rebuild; check: `grep -c react-native-svg apps/rowtrack/package.json` ≥1.
- **Check:** `grep -c react-native-svg apps/rowtrack/package.json` — 0 = geen tekenlaag in de app, dus nog steeds nul grafieken.
- **Relevantie 2026-09-14:** LEEFT. Check gedraaid: `grep -c react-native-svg apps/rowtrack/package.json` → 0, en er is geen victory/recharts/skia. Nog steeds nul grafieken. Let op de omvang: dit is een feature met een nieuwe tekenlaag, geen opruimwerk — het vraagt een eigen TC-EBC én een dependency-beslissing.
- **Status:** open

## 2026-09-07 — UX-audit P3-verzamellijst (F13–F19) · [ux]

- **Wat:** De zeven P3-bevindingen uit audits/2026-07-16-ux-audit-rowtrack.md §5 als losse items: backlink-label vs tab-naam (F13), icon-only inactieve doelsegmenten (F14), onzichtbaar tappable BPM-rij (F15), Android-back op 3 modals (F16), dubbele afstand in geen-doel-variant (F17), dode UX-lagen opruimen — KPI.tsx, SectionHeader.tsx, paceZone/pulseAnim/prFlags-props, 3× rgba-0.20, confetti-kleuren (F18), kcal-asterisk-legende (F19).
- **Waarom niet nu:** HANDOFF-item van 2026-07-16, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `ls apps/rowtrack/components/KPI.tsx apps/rowtrack/components/SectionHeader.tsx` → beide bestaan; `grep -rn "KPI'\|SectionHeader'" apps/rowtrack/app apps/rowtrack/components | grep import` → leeg (alleen de barrel components/index.ts exporteert ze). `grep -c…
- **Eerste zet:** F18 eerst, want puur opruimwerk zonder designoordeel: KPI.tsx en SectionHeader.tsx verwijderen (bevestigen vóór delete), de barrel bijwerken, `paceZone`/`pulseAnim`/`prFlags` uit ActivePhase-props en workout.tsx/dev-active.tsx halen, `tsc --noEmit`; check daarna: `ls apps/rowtrack/components/KPI.tsx` faalt.
- **Check:** `ls apps/rowtrack/components/KPI.tsx apps/rowtrack/components/SectionHeader.tsx && grep -c "backLink: 'OVERZICHT'" apps/rowtrack/i18n/translations/nl.ts` — beide bestanden plus 1 = er is niets van F13–F19 opgepakt; verandert er iets, hertriageer de zeven tegen `audits/2026-07-16-ux-audit-rowtrack.md`.
- **Status:** gebouwd — 2026-09-14, branch `fix/rowtrack-ux-p3-lijst`, met een her-triage die tegen de code van vandaag gemeten is in plaats van tegen de audit van juli. **F13** en **F17** waren onderweg al opgelost (`backLink` leest 'HISTORIEK'; de doelloze KPI-lijst laat AFSTAND weg, mét comment). **F14 is verworpen** — de vier labels passen niet naast elkaar op 430px, de gelijk-brede-segmentenvariant is eerder afgewezen, en elk segment draagt al een `accessibilityLabel`, dus VoiceOver leest de betekenis voor; het gat is dus visueel en alleen bij de eerste kennismaking. **F15, F16, F19** gebouwd en op de node gemeten. **F18**: de dode props en de drie componenten zijn weg. Wat er NIET in zat: de 3× `rgba(240,84,84,0.20)` en de confetti-kleuren — die horen bij het aparte token-item van 2026-09-07 en wachten op een push uit Tokens Studio.

## 2026-09-07 — De Edge Function wordt door niets getypecheckt · [infra]

- **Wat:** Een CI-stap die `supabase/functions/**` typechecked met `deno check` (via denoland/setup-deno), zodat een tikfout in het account-verwijderpad in de PR faalt in plaats van bij deploy of bij de eerste echte aanroep.
- **Waarom niet nu:** HANDOFF-item van 2026-08-06, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -rn deno .github/workflows/` → leeg (rc=1). `ls apps/rowtrack/supabase/functions/` → alleen `delete-account` (index.ts); nog steeds één functie. `grep -rn 'deno|supabase functions' .github/workflows/*.yml apps/rowtrack/package.json turbo.json` → leeg:…
- **Eerste zet:** In .github/workflows/ci.yml een job `edge-functions` toevoegen: `denoland/setup-deno@v2` + `deno check apps/rowtrack/supabase/functions/delete-account/index.ts`; tegenproef: een opzettelijke type-fout in index.ts moet de job rood maken; check daarna: `grep -rq deno .github/workflows/`.
- **Check:** `grep -rq 'deno' .github/workflows/` → geen hit = `supabase/functions` wordt door niets getoetst.
- **Relevantie 2026-09-14:** LEEFT. Check gedraaid: geen `deno` in `.github/workflows/`, en `supabase/functions/` bevat nog altijd precies één functie (`delete-account`).
- **Status:** gebouwd — 2026-09-14, eigen job `edge-functions` in `ci.yml` met `denoland/setup-deno`. De tegenproef zit ín de job en draait vóór de echte check: een kopie mét een type-fout moet rood worden, én de uitvoer moet TS2322 noemen. Zonder die tweede eis zou "hij faalde" ook kunnen betekenen dat een import niet oplost, en dan bewijst de tegenproef niets. Deno staat niet lokaal geïnstalleerd, dus de job is de enige eerlijke plek voor dat bewijs.

## 2026-09-07 — Drie rekenkernen hebben geen enkele test · [test]

- **Wat:** Committed node:test-suites voor de drie pure modules die nu alleen ad hoc geverifieerd zijn: lib/bestDistanceTime.ts (19 cases + fuzz), lib/secureStorage.ts (chunking op bytes, nooit mid-character; 10 cases + fuzz) en lib/formatters.ts (duizendtal-punt, komma-decimaal, spatie vóór eenheid).
- **Waarom niet nu:** HANDOFF-item van 2026-08-06, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `git ls-files 'apps/rowtrack/lib/bestDistanceTime.test.ts' 'apps/rowtrack/lib/secureStorage.test.ts' 'apps/rowtrack/lib/formatters.test.ts'` → leeg (Check slaat aan). Maar: apps/rowtrack/package.json:11 `"test": "node --test \"lib/**/*.test.ts\""`;…
- **Eerste zet:** `apps/rowtrack/lib/secureStorage.test.ts` schrijven naar het patroon van lib/ble/scan-lock.test.ts (node:test + assert), met de 10 gerichte cases uit de chunk-fix (d180578) als startpunt; tegenproef: de byte-grens in de chunker één teken verschuiven en eisen dat de suite omvalt; check: `git ls-files apps/rowtrack/lib/secureStorage.test.ts` niet leeg.
- **Verwant:** `apps/rowtrack/BACKLOG.md` 2026-08-22 *De node:test-suites draaien niet in CI* (gebouwd): de runner en de CI-stap bestaan sinds 2026-08-25, dit item is de inhoud die erdoorheen moet.
- **Check:** `git ls-files 'apps/rowtrack/lib/bestDistanceTime.test.ts' 'apps/rowtrack/lib/secureStorage.test.ts' 'apps/rowtrack/lib/formatters.test.ts'` → leeg = geen van de drie modules heeft een committed test.
- **Hernoemd 2026-09-14** (was *Geen testrunner in de repo*, met akkoord van Jeroen): die titel was onwaar geworden en zou iemand een runner laten bouwen die er al staat.
- **Relevantie 2026-09-14:** de kern leeft, de oude titel niet. Er ÍS een runner: `apps/rowtrack/package.json` draagt `"test": "node --test"`, er staan zes `*.test.ts` in git, en CI draait ze sinds 2026-08-10 als stap *Guard — invarianten (node:test)*. Wat wél leeft is de oorspronkelijke Check: `bestDistanceTime.ts`, `secureStorage.ts` en `formatters.ts` hebben nog steeds geen enkele test (`git ls-files` op die drie geeft leeg). Herformuleer dit item naar *drie rekenkernen zonder test* vóór je het oppakt — anders bouwt iemand een runner die er al staat.
- **Status:** deels gebouwd — 2026-09-14. **`bestDistanceTime` heeft nu een suite** (`lib/bestDistanceTime.test.ts`, 7 tests, tegenproef: dropout-detectie uitzetten maakt hem rood). De andere twee zijn NIET bereikbaar voor de huidige runner, gemeten in plaats van aangenomen: `formatters.ts` valt om op zijn eigen extensieloze import van `./workout-goals` (Node ESM eist de extensie; de bestaande suites importeren daarom mét `.ts`), en `secureStorage.ts` op `typeof import('expo-secure-store')` plus zijn react-native-imports. Die twee vragen dus eerst een keuze — bronwijziging of een resolver/mock-laag voor tests — en dat is een eigen item, geen restje van dit.

## 2026-09-07 — HR- en roeier-dienst delen één BleManager-singleton · [test]

- **Wat:** Toestel-verificatie van de gedeelde BLE-scan en het tweede verbindingspad: (1) twee taps binnen een seconde in beide volgordes, (2) Stop tijdens een herstelpoging → rij blijft idle, (3) Verbinden + ander toestel tijdens een lopende herstelpoging → oude lus verbindt niet meer (generatie-token), (4) Verbinden terwijl de roeier scant → geen 'geen hartslagmeter gevonden' na een geslaagde directe verbinding. Uitkomst per scenario met datum in HANDOFF.
- **Waarom niet nu:** HANDOFF-item van 2026-08-06, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: `grep -c requestScan apps/rowtrack/lib/ble/scan-lock.ts` → 2 (serialisatie staat er nog). `git log --oneline --since=2026-08-22 -- apps/rowtrack/lib/ble/` → 928f7e7 (28/08, HR-pad meetbaar + disconnect-listener-leak), a79c883 (scan-lock-test deterministisch),…
- **Eerste zet:** Dev-client op de iPhone met horloge én Apollo XL aan, `rowtrack://dev-ble` open, scenario 1 (HR-tap dan roeier-tap binnen 1 s) rijden en in de `[BLE]`-log controleren dat beide scans binnen het venster een treffer geven (vóór de fix: 25 s stilte na 12:35:57 op 22/08); daarna 2-4.
- **Verwant:** `apps/rowtrack/BACKLOG.md` 2026-08-28 *Dubbele `destroy()` op één gedeelde BleManager* (open) raakt dezelfde context.
- **Check:** `grep -c 'requestScan' apps/rowtrack/lib/ble/scan-lock.ts` — 0 = de arbiter is weg of
- **Status:** open

## 2026-09-07 — sheetFieldLabel-token niet tegen sheet-design geverifieerd · [fix]

- **Wat:** De veld-labelkleur van de profiel-sheets (PERIODE/TYPE/WACHTWOORD e.d., `sheetFieldLabel` in profile.tsx) bevestigen tegen een echt sheet-frame (E-mail 53:10039 of Geslacht 52:9155) en gelijktrekken met de tegen 388:2256 bevestigde `fg.secondary` uit GoalSheet — of documenteren waarom de twee sheet-families bewust verschillen.
- **Waarom niet nu:** HANDOFF-item van 2026-07-14, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: Check gedraaid: `grep -n -A3 'sheetFieldLabel: {' 'apps/rowtrack/app/(tabs)/profile.tsx'` → regel 993-996: `color: fg.tertiary` (5 gebruikers: emailSheet currentEmail/newEmail/repeatEmail/password + deleteSheet password, regels 686-824). Tegenhanger:…
- **Eerste zet:** `figma_get_status` → deep-read van `53:10039` (07 – Profile/Mail) via de Desktop Bridge en de fill van het label 'HUIDIG E-MAILADRES' aflezen; daarna `grep -n -A3 'sheetFieldLabel: {' 'apps/rowtrack/app/(tabs)/profile.tsx'` — wijkt hij af, één regel (993-996) naar de bevestigde rol zetten.
- **Check:** `grep -n -A3 'sheetFieldLabel: {' 'apps/rowtrack/app/(tabs)/profile.tsx'` — `fg.tertiary` = de profiel-sheets wijken nog af van de tegen Figma 388:2256 bevestigde veld-labelkleur `fg.secondary` (`components/GoalSheet.tsx:194-199`).
- **Status:** open

## 2026-09-07 — 4-jul audit-re-triage: resterende werkstromen · [refactor]

- **Wat:** WS2: de component-tokenlaag (o.a. `goalPill` in tokens.json) door de build laten lopen naar `constants/colors.ts` en als laag in Tokens Studio exporteren; WS7: off-token designwaarden in Figma tokeniseren; dekking: vaststellen of Auth/Login 182-2642 en Auth/Register 182-2660 echte, actuele frames zijn (anders designen) en de stale GoalSetupModal-rij uit figma-map.md halen. Splits bij het aanmaken in drie items — dit is één bundel met drie eigenaars.
- **Waarom niet nu:** HANDOFF-item van 2026-07-14, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: Check gedraaid: `grep -c goalPill apps/rowtrack/tokens/tokens.json apps/rowtrack/constants/colors.ts` → `tokens.json:1` / `colors.ts:0` = legenda 'WS2 ligt er nog'. `git log --since=2026-07-14 -- apps/rowtrack/tokens/tokens.json` → enkel `3646cff 2026-07-14…
- **Eerste zet:** `grep -c goalPill apps/rowtrack/tokens/tokens.json apps/rowtrack/constants/colors.ts` (verwacht 1/0) om WS2 te bevestigen; daarna `figma_get_status` en de nodes 182-2642 / 182-2660 lezen om de auth-dekkingsvraag in één keer te sluiten en figma-map.md (Auth-sectie + GoalSetupModal-rij) bij te werken.
- **Check:** `grep -c goalPill apps/rowtrack/tokens/tokens.json apps/rowtrack/constants/colors.ts` — 1 in de bron en 0 in de build-output = WS2 (component-tokenlaag) ligt er nog; WS7 is Figma-zijde en niet uit de repo te lezen.
- **Status:** open

## 2026-09-07 — Geen privacybeleid / rechtsgrond / consent voor (gezondheids)PII · [infra]

- **Wat:** `PRIVACY_POLICY_URL` bereikbaar maken: rowtrack-web deployen (Vercel-project per rowtrack-web HANDOFF 2026-08-10) én de URL-mismatch oplossen — ofwel `lib/links.ts:11` naar de echte route (`/nl/privacy` op het domein van rowtrack-web) zetten, ofwel een redirect `/rowtrack/privacy → /nl/privacy` in rowtrack-web. Let op de volgorde-conflict: rowtrack-web zou pas ná de App Store-release live gaan, maar een consent-scherm dat naar een 404 linkt is zelf een pre-release-blocker.
- **Waarom niet nu:** HANDOFF-item van 2026-07-15, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: Check NIET gedraaid (curl = netwerk, buiten de grens). Wel: `grep -rn PRIVACY_POLICY_URL apps/rowtrack` → `lib/links.ts:11: export const PRIVACY_POLICY_URL = 'https://umanex.be/rowtrack/privacy'`, gebruikt in `components/HealthConsentScreen.tsx:77`. `git log…
- **Eerste zet:** Beslis eerst het domein/pad met Jeroen, pas `apps/rowtrack/lib/links.ts:11` (of een redirect in `apps/rowtrack-web/middleware.ts`) aan, deploy, en sluit af met de bestaande check `curl -sL -o /dev/null -w '%{http_code}' <PRIVACY_POLICY_URL>` → 200.
- **Check:** `curl -sL -o /dev/null -w '%{http_code}' https://umanex.be/rowtrack/privacy` → 404 = beleid nog niet bereikbaar, 200 = rond. De `-L` is niet optioneel: umanex.be stuurt apex-verkeer met een 308 naar `www`, en zonder volgen leest de check die redirect als antwoord — een derde uitkomst die de legenda niet kent. (Gemeten 2026-08-11: 308 → `www.umanex.be/rowtrack/privacy` → 404.)
- **Status:** open

## 2026-09-07 — Sentry error-/crash-monitoring: koppeling uitgesteld · [infra]

- **Wat:** Sentry-koppeling voor rowtrack: `@sentry/react-native` + expo config-plugin in app.json, `Sentry.init({ dsn })` in `initMonitoring()` (DSN via `EXPO_PUBLIC_SENTRY_DSN`, door Jeroen geleverd), `reportError()` in `lib/monitoring.ts` laten doorschrijven naar `Sentry.captureException`, een globale ErrorBoundary, en een native rebuild (`expo run:ios --device`) omdat een native module anders niet in de dev-client zit.
- **Waarom niet nu:** HANDOFF-item van 2026-07-15, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: Check gedraaid: `grep -n 'sentry' apps/rowtrack/package.json` → geen treffer (rc=1) = koppeling niet gelegd. `apps/rowtrack/lib/monitoring.ts` bestaat; regel 4-11: 'De echte Sentry-koppeling volgt in een latere fase (zie HANDOFF 2026-07-15…' en `//…
- **Eerste zet:** Dependency-install vraagt eerst bevestiging (CLAUDE.md 'altijd eerst bevestigen'): `pnpm --filter rowtrack add @sentry/react-native@~7.2.0` + `@sentry/react-native/expo` in `apps/rowtrack/app.json`; daarna de TODO op `apps/rowtrack/lib/monitoring.ts:11` invullen. Klaar-check: `grep -q '@sentry/react-native' apps/rowtrack/package.json`.
- **Check:** `grep -q '@sentry/react-native' apps/rowtrack/package.json` → geen hit = koppeling nog niet gelegd.
- **Status:** open

## 2026-09-07 — Wheel-sheets (#131 flexShrink + #133 pill/fade) niet op toestel geverifieerd · [test]

- **Wat:** De drie wheel-sheets (Lengte 52:9286, Gewicht 52:9424, Geboortedatum 52:9538) op de fysieke iPhone naast Figma leggen — wheels clippen niet, pill/fade conform #133 — en de uitkomst als gedateerd toestel-blok in HANDOFF/figma-map vastleggen.
- **Waarom niet nu:** HANDOFF-item van 2026-07-15, ouder dan 30 dagen bij de triage van 2026-09-07 (sessie-reflectie stap 1): werk dat blijft liggen, geen sessie-context. Triage-bewijs: Check NIET gedraaid (vraag aan Jeroen, geen commando). Wel: `git log --since=2026-07-15 -- apps/rowtrack/components/WheelPicker.tsx` → alleen `490b703 2026-07-15 fix(rowtrack): visible WheelPicker pill + surface-synced fade` (= #133 zelf); `--…
- **Eerste zet:** Eerst bevestigen dat de check nog over dezelfde code gaat: `git log --oneline 490b703.. -- apps/rowtrack/components/WheelPicker.tsx apps/rowtrack/components/BottomSheet.tsx` (vandaag alleen `cd09074`, i18n); daarna Profiel → Lengte / Gewicht / Geboortedatum openen op het toestel en per sheet één screenshot naast het Figma-frame leggen.
- **Check:** Alleen jij kunt dit beantwoorden: heb je Lengte, Gewicht en Geboortedatum op de iPhone naast Figma gelegd? Nee = open — geen commit of screenshot legt een toestel-check vast.
- **Status:** open

## 2026-09-07 — `fontFamily.sourceSerif` draagt een opzoeksleutel, geen familienaam · [tokens]

- **Wat:** `Core/fontFamily/sourceSerif` staat in `tokens/tokens.json` op `"Source Serif Pro"`,
  maar de app rendert **Source Serif 4** — de waarde is de `tokenFamily`-sleutel waarmee
  `style-dictionary.config.mjs` de FONTS-tabel opzoekt (`expoBase: 'SourceSerif4'`,
  `pkg: '@expo-google-fonts/source-serif-4'`), niet de naam van een lettertype. Adobe hernoemde
  Source Serif Pro in 2021 naar Source Serif 4; in Figma zijn het twee aparte families met
  verschillende stijlvoorraad (gemeten 2026-09-07 via `listAvailableFontsAsync`: Pro heeft geen
  Medium, 4 wél). De nette fix is de tokenwaarde in **Tokens Studio** op `"Source Serif 4"`
  zetten — handmatig bewerken wordt bij de eerstvolgende plugin-push overschreven.
- **Waarom niet nu:** Een tokenwijziging hoort via Tokens Studio te lopen en is Jeroens hand.
  Tot dan draagt de Figma-variabele bewust de gerenderde familie, zodat Figma en app hetzelfde
  lettertype tonen; `scripts/figma-tokens-payload.mjs` meldt die ene afwijking bij elke run
  ("AFWIJKING bron -> render") in plaats van hem te verbergen.
- **Eerste zet:** In Tokens Studio `Core/fontFamily/sourceSerif` op `Source Serif 4` zetten en
  pushen; daarna `node apps/rowtrack/scripts/figma-tokens-payload.mjs` — de AFWIJKING-regel
  hoort dan te verdwijnen, en `RENDER_FAMILIE` wordt een no-op in plaats van een correctie.
- **Check:** `node apps/rowtrack/scripts/figma-tokens-payload.mjs 2>/dev/null | grep -c AFWIJKING`
  — 1 = de afwijking leeft nog, 0 = het token is gefixt.
- **Status:** open

## 2026-09-07 — De scoped `figma-naar-code` skill draagt een hardcoded tokentabel · [tooling]

- **Wat:** `apps/rowtrack/.claude/skills/figma-naar-code/SKILL.md` bevat een eigen kleurtabel
  (`bg: '#0A0E1A'`, `surface: '#1A1F2E'`, `cyan: '#00E5FF'`) en spreekt van "Inter-gewichten".
  Geen van die waarden komt uit `tokens/tokens.json` (`bg.base` = `#15171C`,
  `bg.elevated` = `#1A1D24`, `accent.default` = `#F05454`, families Albert Sans / Source Serif).
  De zusterskill `code-naar-figma` had dezelfde tabel en is op 2026-09-07 verwijderd ten gunste
  van de umanex-os-versie; die is schoon en verbiedt hardcoded waarden expliciet.
- **Waarom niet nu:** Jeroen vroeg expliciet om `code-naar-figma`; een tweede skill verwijderen
  is scope-uitbreiding die zijn woord vraagt.
- **Eerste zet:** `git rm -r apps/rowtrack/.claude/skills/figma-naar-code` en toetsen dat
  `.claude/skills/figma-naar-code/SKILL.md` (umanex-os) de RowTrack-context genoeg dekt.
- **Check:** `grep -c "00E5FF" apps/rowtrack/.claude/skills/figma-naar-code/SKILL.md 2>/dev/null`
  — een treffer = de tabel leeft nog; "no such file" = opgelost.
- **Status:** open


## 2026-09-07 — Iconen staan als placeholder in het Figma design system · [design-system]

- **Wat:** In het bestand `QkRgMc7Quqtbow71DiYa1n` staan alle Ionicons als gestippeld
  placeholder-frame (`Icon <maat>`) in plaats van als icoon. react-native-web rendert een
  Ionicon als een tekstglyph in de font-familie `ionicons`, en die familie bestaat niet in
  Figma — `listAvailableFontsAsync()` kent hem niet, dus de builder valt terug op een
  zichtbaar slot in plaats van stil niets te tekenen. Raakt o.a. `Icon` (het hele component),
  `EmptyState`, `ErrorState`, `HrStatusBar` (5 varianten), `BleStatusBar`, `DeviceRow`,
  `GoalSegments` en de CTA-pijl in beide schermen; 8 maten in gebruik (14, 15, 16, 18, 20,
  24, 48, 64).
- **Waarom niet nu:** De oplossing vraagt een handeling op Jeroens machine (een font
  installeren), niet een codewijziging. Er zijn geen SVG's beschikbaar: `@expo/vector-icons`
  levert alleen de TTF plus een glyphmap, geen paden.
- **Eerste zet:** `Ionicons.ttf` in Font Book installeren vanaf
  `node_modules/.pnpm/@expo+vector-icons@*/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf`,
  Figma Desktop herstarten, en dan `figma/builder.js` zijn familie-match case-insensitief
  maken (de DOM meldt `ionicons`, Figma zal `Ionicons` heten). Daarna de bouw opnieuw:
  de placeholders worden dan echte glyphs, want de glyphmap (1357 tekens) zit in hetzelfde
  pakket en de tekstinhoud staat al in de bouwspec.
- **Check:** `figma_execute` met
  `(await figma.listAvailableFontsAsync()).some(f => /ionicons/i.test(f.fontName.family))`
  — false = het font staat er nog niet.
- **Status:** open

## 2026-09-07 — 17 gegenereerde bestanden staan ongetrackt in de tree · [infra]

- **Wat:** Beslissen of `apps/rowtrack/.storybook/fonts.css`, de 15 `.ttf`-bestanden onder `.storybook/public/fonts/` en `apps/rowtrack/figma/build-spec.json` in git horen of in `.gitignore`. Ze zijn alle drie output: de fonts uit `scripts/build-web-fonts.mjs` (`pnpm --filter rowtrack fonts:web`), de spec uit `scripts/figma-build-spec.mjs` (`pnpm --filter rowtrack figma:spec`). Vandaag zijn ze ongetrackt én ongenegeerd, wat de slechtste van de drie opties is: ze reizen mee bij elke `git checkout` naar een andere branch, precies het mechanisme uit CLAUDE.md → Git workflow.
- **Waarom niet nu:** Buiten scope van de dashboard-taak (PR #389). Opgemerkt doordat het nieuwe dev-dashboard "17 gewijzigd" op de rowtrack-kaart toonde terwijl `feature/dev-dashboard` vers van `origin/main` kwam.
- **Waarom verworpen (2026-09-07, zelfde dag):** De premisse klopt niet. De bestanden *zijn* genegeerd — `apps/rowtrack/.gitignore` regels 44-50, toegevoegd in `e1c8f2c` ("feat(rowtrack): storybook op react-native-web met token-trouwe render"), mét de reden erbij in comments ("Gegenereerd door scripts/build-web-fonts.mjs", "6 MB rauwe meting"). Die commit zit op `feature/rowtrack-storybook-figma` en niet op `origin/main`, dus vanaf `feature/dev-dashboard` bestond de ignore-regel niet en kwamen de bestanden daar als ongetrackt binnen. Ik keek naar de bestanden van branch A door de ignore-regels van branch B, en las het verschil als een gat in de repo in plaats van als een eigenschap van mijn eigen checkout. Bewijs: `git show origin/main:apps/rowtrack/.gitignore | grep -c "fonts\|build-spec"` → 0; `git show feature/rowtrack-storybook-figma:apps/rowtrack/.gitignore | grep -n "fonts\|build-spec"` → regels 45, 46, 50; `git check-ignore -v apps/rowtrack/figma/build-spec.json` op die branch → `apps/rowtrack/.gitignore:50`; en `git status --porcelain -uall -- apps/rowtrack` in de hoofdtree op die branch → `0`. Er valt niets te beslissen: het is al beslist, op de plek waar het hoort.
- **Eerste zet:** geen — er is niets te doen. Wat overblijft is een les over de meting, niet over de repo: een uitspraak over "ongetrackte bestanden" is altijd relatief aan de uitgecheckte `.gitignore`, dus hij hoort de branch te noemen waarop hij gemeten is. Vastgelegd als LEARNINGS-entry op globaal niveau (2026-09-07, dev-server/branch-eigen-map-klasse).
- **Check:** `git show feature/rowtrack-storybook-figma:apps/rowtrack/.gitignore | grep -c 'fonts\|build-spec'` → `≥ 2` = de regels staan er, item terecht verworpen.
- **Status:** verworpen
## 2026-09-08 — RowTracks Figma-guards draaien niet in CI · [ci]

- **Wat:** `ci.yml` draait de guards van `packages/ui` (`figma:check`, `figma:check:selftest`,
  `parity`) maar niet die van rowtrack. De Storybook-build komt er wél doorheen, want
  `pnpm turbo build-storybook` pakt elke package met dat script — dus een story die niet meer
  compileert maakt de PR nu al rood. Wat níet gedekt is: `figma:check` (tien assen),
  `figma:check:selftest` (13 mutaties), `parity`, en `render:sweep` (197 stories renderen).
  Die laatste is de enige die een lege render vangt, en dat is precies de fout die een groene
  build verbergt — gemeten 2026-09-07 op 26 stories.
- **Waarom niet nu:** `ci.yml` is een configbestand dat vooraf bevestigd hoort te worden
  (CLAUDE.md → acties die altijd eerst bevestigd moeten worden), en deze PR is al groot.
- **Eerste zet:** Vier stappen naast de bestaande `@umanex/ui`-guards, in dezelfde vorm:
  `pnpm --filter rowtrack figma:check` · `figma:check:selftest` · `parity` · `render:sweep`.
  Let op de volgorde: `render:sweep` en `parity` vragen een gebouwde Storybook, dus ze horen
  ná de `build-storybook`-stap. Playwright-browsers moeten in CI geïnstalleerd zijn
  (`npx playwright install chromium`), net als bij `@umanex/ui parity`.

  **Bijgesteld 2026-09-08: er is een vijfde stap.** `scripts/dev-sweep.mjs` meet het dev-pad, en
  dat is de enige stap die deze klasse kan vangen — gemeten die dag: `build-storybook` +
  `render:sweep` gaf 197/197 groen terwijl `storybook dev` niet eens startte. Hij vraagt wel een
  ándere vorm dan de vier hierboven: een draaiende server in plaats van een gebouwde map. In CI
  dus `pnpm --filter rowtrack storybook &`, wachten tot `:6007` luistert, `node scripts/dev-sweep.mjs`,
  en het proces daarna afbreken. Draai hem met een koude dep-cache
  (`rm -rf apps/rowtrack/node_modules/.cache/storybook`) — let op de map, die staat onder de app
  en niet in de repo-root, en `rm -rf` op het verkeerde pad geeft exit 0 zonder iets te zeggen.
- **Check (bijgesteld 2026-09-09):** De oude check was `grep -c 'filter rowtrack figma:check'`
  en die geeft sinds PR #420 **2** — volgens de letter dus "dicht", terwijl twee van de vijf
  stappen ontbreken. Een check die niet kan onderscheiden. Tel daarom per stap:
  ```bash
  for s in figma:check figma:check:selftest parity render:sweep dev-sweep; do
    printf '%-22s %s\n' "$s" "$(grep -c "$s" .github/workflows/ci.yml)"
  done
  ```
  Stand 2026-09-09: `figma:check` 2, `render:sweep` 0, `dev-sweep` 0. Elke nul is een gat.

  **Bijgesteld 2026-09-09 (later): twee stappen erbij.** `figma:instance-tekst` (offline, geen
  Storybook nodig — hoort bij de goedkope guards) en `node scripts/walker-blindvlekken.mjs`
  (vraagt `storybook-static`, dus ná `build-storybook`). Beide telbaar met dezelfde lus:
  `for s in … figma:instance-tekst walker-blindvlekken; do …`.
- **Status:** gebouwd — 2026-09-14, PR umanex-apps#469. Vijf stappen erbij, alle vijf groen in run 34824883673: instance-voorvlucht (+ tegenproef), `render:sweep` (build-pad), `dev-sweep` (dev-pad), `walker-blindvlekken` (+ tegenproef) en de beeld-as. Twee defecten kwamen onderweg boven en zijn opgelost, want zonder die twee was de stap ofwel rood bij aankomst ofwel een stap die niet kán falen: zes stories renderden leeg in dev (de dependency-optimizer pre-bundelde de échte `expo-router`, dus de mock vuurde daar niet — 257/257 op het build-pad op dezelfde commit), en `walker-blindvlekken` printte zeven getallen met altijd exit 0.

## 2026-09-08 — Storybook-fixes voor vite 8 heroverwegen bij de volgende Storybook-bump · [infra]
- **Wat:** Drie van de vier ingrepen in `.storybook/main.ts` van 2026-09-08 (de
  `expo-modules-core`-stub, de pnpm-bewuste babel-`exclude`, de `optimizeDeps.exclude` op
  `react-native-worklets`) zijn lokale compensaties voor gedrag dat upstream al bewogen is.
  `vite-plugin-rnw@0.0.12` zet `shimMissingExports: true` óók op `getOptimizeDepsOptions`
  (nagemeten in de tarball van de registry, `dist/index.mjs:294`); `0.0.11` doet dat alleen
  in `getBuildOptions`. `@storybook/react-native-web-vite@10.6.0` pint `vite-plugin-rnw:
  "^0.0.11"`, en `^0.0.11` sluit `0.0.12` uit — vandaar dat we `0.0.11` draaien.
- **Waarom niet nu:** De pin zit in een dependency van Storybook, niet in onze `package.json`.
  Hem forceren is een `pnpm.overrides`-ingreep: een config-wijziging met blast radius over de
  hele monorepo, en `shimMissingExports` demoot bovendien élke ontbrekende export naar
  `undefined` — ook een echte. De lokale stub raakt vijf bestanden waarvan `tsc` bewijst dat
  ze niets exporteren en laat de volgende echte `MISSING_EXPORT` gewoon afgaan. Dat is
  vandaag de betere ruil; bij een Storybook-bump kan hij kantelen.
- **Eerste zet:** Bij de eerstvolgende bump van `@storybook/react-native-web-vite`:
  `node -e "console.log(require('@storybook/react-native-web-vite/package.json').dependencies['vite-plugin-rnw'])"`.
  Staat daar een range die `0.0.12` of hoger toelaat, verwijder dan per ingreep één blok uit
  `.storybook/main.ts` en meet met de dev-sweep of hij nog dragend is — dezelfde tegenproef
  als op 2026-09-08 (vijf van zes rails werden toen rood, één bleek niet dragend en is
  daarop verwijderd).
- **Check:** `grep -E '"(storybook|vite)"' apps/rowtrack/package.json` — staat storybook nog op 10.6 en vite op 8, dan is de bump waar dit item op wacht niet gebeurd.
- **Relevantie 2026-09-14:** LEEFT, maar GEBLOKKEERD op zijn eigen trigger. `storybook ^10.6.0`, `@storybook/react-native-web-vite ^10.6.0`, `vite ^8` — ongewijzigd sinds het item geschreven is. Er is dus niets te heroverwegen tot er een bump is; de compensaties in `.storybook/main.ts` dragen elk hun eigen meting en blijven tot dan staan.
- **Gemeten 2026-09-14 op vite 8.3.0 (was 8.2.2):** alle drie de compensaties zijn nog nodig. Per
  stuk weggehaald en het dev-pad gedraaid, met een koude dep-cache:
  · **expo-modules-core-stubs** weg → de dev-server start niet, met exact de gedocumenteerde
    `[MISSING_EXPORT] "EventEmitter" is not exported by …/ts-declarations/EventEmitter.ts`.
  · **worklets-transform in de optimizer** weg → 54 van 246 stories leeg (GoalSegments en alles
    wat WheelPicker gebruikt).
  · **expo-router uit de optimizer** weg → 6 van 246 leeg (HistoryScreen 3, ProfileScreen 3).
  Storybook zelf is niet te bumpen: 10.6.0 ís de nieuwste. Dit item wacht dus op upstream, niet
  op ons — en de eerstvolgende heroverweging hoeft deze drie proeven niet te herhalen tot er een
  nieuwe storybook- of vite-minor is.
- **Status:** open

## 2026-09-08 — De bouwspec verandert bij elke run door de roterende spinner · [refactor]
- **Wat:** `figma/build-spec.min.json` is een gecommit artefact dat bij élke `figma:spec` een diff geeft, ook zonder codewijziging. Gemeten 2026-09-08 na de `testID`-ronde: 244 velden verschilden ten opzichte van HEAD, en alle 244 zaten binnen een `spinnerBox`-subboom — `getBoundingClientRect()` op de roterende `<ActivityIndicator>` geeft een as-gelijnde doos die per meetmoment anders is. Voorstel: de walker normaliseert die subboom naar de ongeroteerde maat (die staat op de `spinner`-ouder), zodat de spec deterministisch is en een diff erop weer iets betekent. Bijvangst: Figma bouwt de spinner dan op zijn echte maat in plaats van een willekeurige rotatiehoek.
- **Waarom niet nu:** `parity` is er al tegen beschermd via `figma/niet-reproduceerbaar.json` (gemeten, twee walker-runs), dus het is een leesbaarheids- en review-probleem, geen correctheidsprobleem. Het raakt bovendien de walker midden in de sneden-reeks van ingreep 2, en dat is precies het moment waarop je de meting niet wil verplaatsen.
- **Eerste zet:** In `scripts/figma-build-spec.mjs`, in `lees()`: is `rnwRol` gelijk aan `spinnerBox` of dieper, neem dan de maat van de dichtstbijzijnde `spinner`-ouder over in plaats van de eigen `getBoundingClientRect()`. Daarna `node scripts/instabiele-nodes.mjs` opnieuw draaien — die hoort dan alleen de vier confetti-nodes nog te vinden, en dat is de tegenproef.
- **Check:** twee keer `pnpm --filter rowtrack figma:spec` achter elkaar en `cmp` op `figma/build-spec.min.json` — verschillen ze, dan leeft het.
- **Relevantie 2026-09-14:** LEEFT, gemeten in plaats van aangenomen: twee runs op onveranderde code gaven **742 640 verschillende bytes**. (Artefacten daarna teruggezet met `git checkout -- apps/rowtrack/figma/`.)
- **Status:** gebouwd — 2026-09-14. `lees()` in `scripts/figma-build-spec.mjs` geeft elke node bínnen een spinner de doos van de spinner-ouder; die draait niet en is dus wél stabiel. Gemeten op twee runs met onveranderde code, structureel vergeleken in plaats van op bytes (het bestand staat op één regel, dus één veranderd cijfer verschuift alles erna — die maatstaf deugt niet): **584 verschillende velden vóór, 32 erná**, en die 32 zitten allemaal in `MotivationalToast`. `instabiele-nodes` gaat mee: **4 van 4210 nodes instabiel**, tegen 309 van 4117 op 2026-09-09, en die vier zijn de confetti-items. Bijvangst: de terugval-ratel van `figma:instance-tekst` daalde van 37 naar 36 — één instance week alleen af door zijn wisselende spinner-maat.

## 2026-09-09 — Drie auth-schermen hebben maar één frame, want hun tweede vorm zit in component-state · [feature]
- **Wat:** `LoginScreen`, `RegisterScreen` en `ForgotPasswordScreen` hebben in Storybook alleen een `Playground`-story, terwijl de vier andere route-schermen er minstens twee hebben. Hun enige tweede zichtbare vorm is de validatie- of servertfout (`FormField error`, `ErrorMessage`), en die staat in `useState` ná een submit — een story kan hem niet zetten zonder dat het scherm er een prop of een injecteerbare beginwaarde voor krijgt. Gevolg: de foutvorm van de drie schermen waar een gebruiker het vaakst een fout ziet, is nergens gemeten en staat niet in Figma.
- **Waarom niet nu:** het vraagt een wijziging aan de schermen zelf (een `initialError`-achtige ingang, of de foutstaat naar een prop tillen), en dat is gedrag toevoegen aan productiecode om een meting mogelijk te maken. Dat is een eigen afweging, geen bijvangst van de render-pad-ronde. Het acceptatie-item in `briefings/2026-09-08-feature-schermen-naar-rowtrack-design.tcebc.md` staat daarom bewust op `- [ ]` met 4/7, in plaats van te worden verzacht tot iets dat wél afvinkbaar is.
- **Eerste zet:** Kies de ingang — een `__storyError`-prop achter een `__DEV__`-guard is het goedkoopst, een gedeelde `useAuthForm`-hook met de fout als return-waarde het netst. Daarna per scherm één named story (`MetFout`), `figma:spec`, en de frames bouwen in `Screens v2`.
- **Status:** gebouwd — 2026-09-14, zelfde branch. Niet via de `useAuthForm`-route uit de *Eerste zet* maar via de goedkopere: de supabase-mock kan nu een auth-fout teruggeven (`parameters.supabase.authFout`) en een `play` vult het formulier en verstuurt het, zodat de story de échte foutweg doorloopt. Productiecode is ongewijzigd — precies de reden waarom dit item bleef liggen. Eén ding moest erbij: een story met een `play` is ná `networkidle` nog niet in zijn eindvorm, dus de preview zet `data-play="wacht"` en de walker wacht erop; zonder dat legt de bouwspec het lege formulier vast.

## 2026-09-09 — Instances vallen terug op een nagebouwde subboom omdat de library-variant een ander aantal kinderen heeft · [feature]
- **Wat:** De schermbouwer plaatst op elke gedeclareerde componentgrens een library-instance, en toetst daarna of die instance getrouw is. Waar niet, vervangt hij hem door de nagebouwde subboom — luid, met melding. Gemeten op 2026-09-09 over de 24 frames van `Screens v2` — en **drie instrumenten geven drie getallen die niet op elkaar te delen zijn**, dus ze staan alle drie:

  - de builder telde **49 vervangingen** over de laatste volledige herbouw (0 voor de vier auth-schermen, 28 voor History+Detail, 21 voor Profile+Idle+Active). Dat is een telling op **elke diepte**: `figma/builder.js:629` geeft `1 + toetsInstances(…)` terug en daalt dus af in zijn eigen vervangingen;
  - live op `Screens v2` staan **100 instances** over de 24 frames;
  - de bouwspec declareert **135 buitenste grenzen** (grenzen die niet zelf in een andere grens liggen).

  Een eerdere versie van dit item noemde **31**. Dat getal kwam uit een bouwronde vóór de variant-annotaties van `7209f3d` en is per ongeluk meegereisd naar een item dat ná de herbouw geschreven werd — precies de fout waar de audit van vandaag over ging. Wat in alle drie de tellingen hetzelfde blijft, is de **klasse**: het *aantal kinderen* van de library-variant verschilt van de gebruiksplek.


  | component | library-variant | gebruiksplek |
  |---|---|---|
  | `KpiSingle` | `valueRow > [value, unit]`, label van één regel, h=54,75 | `valueRow > [value]`, label van twee regels, h=68,5 — slotpad `0>1` bestaat daar niet |
  | `Segmented` | 3 kinderen | 4 (de historiek-filter heeft vier periodes) |
  | `WorkoutCard` | `dateRow` 1 kind | 2, zodra er een PR-badge staat |
  | `WheelPicker` | `scrollContent` h=2000 | h=4400 (meer rijen) |
  | `Button` | 1 kind | 2 (icoon + label) |

  Dit is geen bug in de builder maar de grens van wat variant-gebaseerd instantiëren kan uitdrukken: een instance kan een tekst overschrijven, maar geen kind bijkrijgen. `parity` blijft er groen op — de nagebouwde subboom is getrouw — dus de kost is niet correctheid maar **dekking**: 31 plekken in Figma zijn een kopie in plaats van een instance, en lopen dus niet mee met een library-wijziging.
- **Waarom niet nu:** de twee uitwegen zijn allebei een eigen afweging. Ofwel groeit de **library-variant** mee (een `KpiSingle` zonder unit, een `Segmented` per aantal opties — dat vermenigvuldigt de variant-nodes en maakt van een as een opsomming), ofwel krijgt de **builder** de bevoegdheid om kinderen aan een instance toe te voegen (dat kan de Figma-API niet voor een instance, alleen door hem los te koppelen — en dan is het geen instance meer). Beide keuzes raken het model, niet de code.
- **Eerste zet:** Meet eerst of het loont, en meet het in ÉÉN noemer — dat is wat vandaag misging. Draai één volledige herbouw en tel per scherm de `wijkt af`-meldingen; leg dat naast een live telling van instances per frame. Neem daarna één geval — `KpiSingle` is de goedkoopste, want `unit` is optioneel en een tweede variant `unit=false` lost vier van de 31 op — en kijk of de variant-explosie aanvaardbaar blijft vóór je de andere vier aanpakt.
- **Status:** open

## 2026-09-09 — 52 waarden in de code hebben geen token, en geen enkele heeft een backlog-item · [tokens]
- **Wat:** `figma/ongebonden.json` verzamelt elke waarde die de code gebruikt en waarvoor geen token bestaat: **52 uniek over 3 760 voorkomens** (stand 2026-09-09). De `[binding]`-as van `figma:check` ratelt op dat aantal, dus een nieuw gat valt op — maar de gaten zelf zijn nooit ergens uitgeschreven. Het bestand beweerde in zijn eigen `$comment` letterlijk *"Elk gat heeft een item in BACKLOG.md"*; gemeten op 2026-09-09: **nul** van de 52 kwam in dit bestand voor, en er stond geen enkel item over ongebonden waarden. Die zin is daarom uit de generator gehaald — een rapport dat zijn eigen antwoord inbakt, is geen meting.

  De drie die er vandaag bijkwamen door de zeven route-schermen: `radius = 10`, `radius = 100` en `text style = AlbertSans_400Regular 13px ls=0`. De drie WheelPicker-groottes (`AlbertSans_400Regular` 14px, 16px, 20px) staan er al langer in en zijn deze sessie alleen zichtbaarder geworden — niet nieuw.
- **Waarom niet nu:** een token toevoegen gaat via Tokens Studio, niet via een handmatige edit van `tokens/tokens.json` — dat wordt bij de eerstvolgende plugin-push overschreven. Het is dus werk van Jeroen in de plugin, en het vraagt eerst een keuze per waarde: hoort hij in de schaal (een `radius/10` tussen de bestaande stappen) of is hij eenmalig en hoort de code hem op te geven?

  **Vier erbij op 2026-09-09, en deze zijn een échte keuze.** De strikte tracking-filter in `styleRef` legt bloot dat vier gerenderde combinaties geen `Theme/type/*` hebben met die tracking:
  · `AlbertSans_600SemiBold 16px ls=3.2` — 14 nodes, `heroLabel`; hardcoded als `letterSpacing: 3.2, // 20% van 16` in `components/workout/active/HeroPanel.tsx:77`. `type/labelSection` draagt diezelfde 20 % maar op 13 px.
  · `SourceSerif4_400Regular 16px ls=-0.4` — 14 nodes, de wielwaarden. `type/kpiValue` heeft die −2,5 % wél, maar in Albert Sans.
  · `AlbertSans_700Bold 34px ls=0` en `AlbertSans_400Regular 18px ls=0` — samen 4 nodes in MotivationalToast, waar de code de tracking op nul zet terwijl elke kandidaat-style hem negatief heeft.
  Per waarde is de vraag dezelfde: hoort hier een token bij (dan in Tokens Studio), of hoort de code de bestaande schaal te volgen (dan een code-fix)? De eerste is de goedkoopste kandidaat: 20 % op 16 px is dezelfde stap als `labelSection` op 13.
- **Eerste zet:** `node -e 'require("./figma/ongebonden.json").uniek.forEach(x=>console.log(x))'` in `apps/rowtrack` geeft de volledige lijst; sorteer hem op soort (radius, text style, achtergrond, gradientstop, tekstkleur) en beslis per groep. De radii zijn de kleinste groep en de duidelijkste kandidaat voor de schaal.
- **Status:** open

## 2026-09-09 — De rnw-laagnamen zijn eerlijk maar lelijk in Figma · [refactor]
- **Wat:** Sinds ingreep 3c benoemt de walker react-native-web's eigen DOM aan zijn bron in plaats van aan een StyleSheet-sleutel die er toevallig op past. Dat is een winst — een node heet niet langer `base` omdat `Button.base` dezelfde atomaire klasse draagt — maar het levert boven elk sheet een stapel `modalAnimation > modalTrap > modalContent > modalContainer` op die geen ontwerper ooit getekend heeft. Gemeten: `grep -c modalAnimation figma/laagnamen.json`.
- **Waarom niet nu:** wegsnoeien raakt twee dingen die er juist om vragen: de 0×0-herstelstap (een portal-wortel heeft geen eigen maat en erft die van zijn kind) en de portal-tak van de walker zelf. Het is een aparte wijziging aan de meetketen, en die wil je niet doen in dezelfde ronde als een structuurwijziging — anders is een verschoven laagnaam niet toe te wijzen.
- **Eerste zet:** In `scripts/laagnamen.mjs`: vouw een rnw-keten zonder eigen sleutel samen tot één laag met de naam van de diepste (`modalContent`), en draai `--hernoem` vóór en ná om te tellen hoeveel namen er verschuiven. Rood/groen-tegenproef: de bestaande `laagnamen-selftest.mjs`, uitgebreid met een keten van vier rnw-lagen.
- **Status:** open

## 2026-09-09 — Ambiguïteit in de laagnamen is verdrievoudigd en geen enkele as ziet het · [refactor]
- **Wat:** `figma/laagnamen.json` telt per node hoeveel StyleSheet-sleutels even goed passen. Gemeten over drie commits: plan-baseline `f4824d9` 177 ambigu op 1 935 app-nodes (9,1%), na ronde D `dcef5b1` 97 op 2 982 (3,3%), main vandaag **302 op 3 700 (8,2%)**. De noemer groeide 24%, de ambiguïteit 211% — dus het is geen noemer-effect. `terugval` liep mee: 47 → 82 (1,6% → 2,2%), terwijl het plan daar ≈ 0 verwachtte.
- **En de guard is er per constructie blind voor.** Er is geen ratel: `scripts/figma-sync-check.mjs` rapporteert beide getallen alleen in `uitgesloten`. Erger, de tegenproef bevestigt de blindheid — `figma-sync-selftest.mjs` bevat `ok controle-ambigu — verdrievoudig het aantal ambigue nodes → exit 0 (hoort 0)`. De zelftest toont dus aan dat de as groen blijft bij precies de verandering die daarna echt plaatsvond.
- **Waarom niet nu:** een ratel zetten op een getal waarvan de oorzaak niet is toegewezen, bevriest de regressie in plaats van hem op te lossen. Eerst moet vaststaan welk deel van 97 → 302 uit de zeven route-schermen komt (nieuwe code die sleutels deelt met bestaande componenten) en welk deel uit de diepere dieptekap (nodes die er altijd waren en nu pas meetellen).
- **Eerste zet:** Twee attributie-runs met `node scripts/figma-build-spec.mjs --hernoem --root=<wegwerpmap>`: één op de spec zónder de zeven route-schermen (`scripts/schermen.mjs` tijdelijk inkorten), één met `--kap=8`. Het verschil van de twee `ambigu`-tellingen wijst de oorzaak aan. Pas dáárna beslissen: een ratel zoals `LAAGNAAM_DEKKING`, of de `o`-voorkeur in `rangschik()` scherper maken zodat een vreemde sleutel binnen een verklaarde grens nooit wint.
- **Status:** open

## 2026-09-09 — Eén toestel-ronde beantwoordt vijf vragen die maanden los blijven hangen · [test]
- **Wat:** Vijf open vragen delen dezelfde blokkade — ze zijn alleen op een echt toestel (of simulator) te beantwoorden, en dus blijven ze staan zolang niemand de dev-client boot. Ze staan hier bij elkaar omdat je ze in één ronde afhandelt, elk met zijn eigen check:

  | # | vraag | check |
  |---|---|---|
  | 1 | **HR-verbinding, vier gevallen met het horloge:** niet casten → kort oranje, nooit groen · wél casten → groen bij de eerste hartslag · casten midden in een rit uitzetten → BPM valt binnen ~12 s terug op `—` in plaats van te bevriezen (dít voorkwam verzonnen hartslag in opgeslagen ritten) · toestemming op Weigeren → autoconnect raakt de band niet aan | de vier gevallen gereden, met datum |
  | 2 | **De roeier meldt 'verbonden' op onbewezen grond** — de HR-kant heeft een datadeadline, de roeierkant niet | `grep -rln DATA_TIMEOUT apps/rowtrack/lib/ble/` — alleen `hr-service.ts` = gat leeft |
  | 3 | **Adverteert de Apollo XL FTMS in zijn advertisement-pakket?** Bepaalt of de kandidaat-filter op naam mag vertrouwen | `grep -c "is nog niet op het toestel" apps/rowtrack/lib/ble/rowerCandidate.ts` — 1 = onbeantwoord |
  | 4 | **Subtitle-action vuurt niet op synthetische taps; het a11y-frame van ALLE staat scheef** | Maestro-miniflow: `launchApp` → `tapOn: "(?i).*wijzig.*"` → opent de GoalSheet? |
  | 5 | **Niets is ooit op de simulator bekeken** — dev-active deep links (`?goal=distance`, `?goal=split`, `?summary=1`), duizendtal-punt, komma-decimaal, spatie vóór de eenheid; en de historiekschermen op echte data | met het oog, één ronde |
  | 6 | **Storybook is de aangenomen waarheid van de Figma-keten, en niemand heeft hem naast het toestel gelegd** (toegevoegd 2026-09-09). De beeld-as vergelijkt Figma met react-native-web in Chromium; wijkt díe render zelf af van de app, dan repareren we Figma naar het verkeerde beeld toe. Vier tekstzware schermen volstaan: HistoryScreen, WorkoutDetailScreen, ProfileScreen, ActivePhase/Samenvatting | `xcrun simctl io booted screenshot` naast `pnpm --filter rowtrack render:shot <story-id>`, met het oog; afwijking = eerst de Storybook-kant fixen |

  Rijdt mee in dezelfde ronde, maar houdt zijn eigen HANDOFF-entry omdat hij vers is: `dataSet` is alleen op web gemeten (31 call-sites over 18 bestanden sinds `7209f3d`) — grep de Metro-log op `dataSet` tijdens de doorloop.
- **Waarom niet nu:** vijf HANDOFF-items van 2026-08-10 en 2026-08-11, alle ouder dan 30 dagen bij de triage van 2026-09-09 (`sessie-reflectie` stap 1). Hun checks zijn gedraaid en zeggen alle vijf dat het gat leeft; het is dus geen sessie-context maar werk dat blijft liggen. Ze bij elkaar zetten is de winst: los waren het vijf redenen om de dev-client te booten en werd hij nooit geboot.
- **De vraag komt nu vanzelf op (2026-09-09).** Dit item was een lijst die je moest lézen, en dat is precies waarom hij bleef liggen. `pnpm --filter rowtrack toestel:schuld` meet nu wat er sinds de laatste `Toestel-ronde:`-trailer veranderde in code die het browser-render-pad per constructie niet toont, en `.githooks/pre-commit` meldt dat zodra een commit zo'n pad raakt. Stand bij het bouwen: **70 van de 410 commits van deze app**, en geen enkele ronde ooit geregistreerd. Registreren doe je met een trailer in de commit van de ronde, óók als je niets vond — dat is het verschil tussen "nog nooit gekeken" en "gekeken, niets gezien", en die twee zien er in elk ander register identiek uit.
- **Eerste zet:** `pnpm dev:rowtrack`, dan `expo run:ios --device` (na een native wijziging; anders volstaat de bestaande dev-client — controleer de datum van de bundle, zie het Verify-pad). Begin bij 1 en 2, want die delen de BLE-log; 5 kan zonder hardware op de simulator en is dus de goedkoopste om als eerste af te vinken.
- **Verwant:** `apps/rowtrack/BACKLOG.md` 2026-09-07 *HR- en roeier-dienst delen één BleManager-singleton* (open) vraagt dezelfde opstelling — horloge én Apollo XL aan.
- **Status:** open

## 2026-09-09 — Twee tokenkeuzes die code niet kan maken · [tokens]
- **Wat:** Twee waarden zonder rol. (1) Witte 18px-knoptekst op `accent.default` meet **3,44:1** en faalt daarmee AA voor kleine tekst; geen bestaande rol lost dat op — het is knoptekst zwaarder/donkerder óf het accent verdiepen. (2) Er is geen skeleton-/placeholder-rol: `components/Skeleton.tsx` leent `bg.raised` en `radii.xs`, allebei bestaand, dus geen verzonnen hex, maar wel rollen die iets anders betekenen dan waarvoor ze hier dienen.
- **Waarom niet nu:** HANDOFF-item van 2026-08-10, ouder dan 30 dagen bij de triage van 2026-09-09 (`sessie-reflectie` stap 1). Triage-bewijs: `grep -ic skeleton apps/rowtrack/tokens/tokens.json` → **0**, dus geen van beide keuzes is gemaakt. Het is bovendien geen code-werk: `tokens/tokens.json` is het Tokens Studio sync-target en een handmatige edit wordt bij de eerstvolgende push overschreven. Dit is dus een beslissing van Jeroen in de plugin.
- **Eerste zet:** Beide via Tokens Studio, in **beide** mode-sets (de build faalt op asymmetrie). Daarna `Skeleton.tsx` op de nieuwe rol zetten — één plek. Er staan al twee andere token-items open (`accent.selected` 0.20 en een `bg.raised`-alpha), dus dit kan in één push mee.
- **Check:** `grep -ic skeleton apps/rowtrack/tokens/tokens.json` — 0 = de skeleton-rol ontbreekt nog; staat `buttonTokens.primary` daarnaast nog op wit op `#F05454`, dan is ook de knoptekst-keuze niet gemaakt.
- **Status:** open

## 2026-09-09 — Tekstnodes worden in Figma afgekapt waar de browser ze volledig toont · [fix]
- **Wat:** De beeld-as (`pnpm --filter rowtrack beeld`) legt de gerenderde browser naast de gerenderde Figma-node en vond op 2026-09-09 een klasse die geen enkele bestaande as kán zien: tekst die in Figma smaller staat dan zijn inhoud en dus afknipt. Gemeten op `WorkoutDetailScreen/Zonder Hartslag`: de titel **"1 sep 2026" staat er als "1 sep"**, de terug-link "← OVERZICHT" ontbreekt, en in de statistiektabel plakt elk label tegen zijn waarde (`WATT208` in plaats van `WATT · 208 · 268`). Zichtbaar verschil 33,6% van het frame, grof 7,3% — het hoogste van de 24.
- **Waarom geen enkele as dit ziet:** `geometry-parity` sluit **breedte** uit op élke node, omdat Figma's tekstengine dezelfde tekst anders meet dan Chromium (gemeten: SectionHeader 162,78 tegen 136). Dat is terecht voor de *vergelijking*, maar het betekent dat een tekstnode die te smal gebouwd is nergens rood wordt. De hoogte klopt (de tekst breekt niet), de vlaggen kloppen, de tokens kloppen.
- **Waarom niet nu:** de fix zit in hoe de builder `textAutoResize` en de breedte van een tekstnode kiest, en dat raakt alle 1 489 tekstnodes tegelijk. Dat is een eigen ronde met parity als rechter, niet iets om aan het einde van een lange sessie in te schuiven — en de beeld-as staat er nu, dus de bevinding kan niet meer wegzakken.
- **Eerste zet:** Meet eerst de verdeling: hoeveel tekstnodes staan op `textAutoResize: 'WIDTH_AND_HEIGHT'` (hugt, kan niet afknippen) tegen `'HEIGHT'` (vaste breedte, knipt af als Figma breder meet)? `parity` rapporteert het eerste getal al — 1 212 van 3 516. Kijk daarna of de afkappende gevallen te herkennen zijn aan de bron: een tekst die in de browser niet breekt (`h ≈ lineHeight`) hoort in Figma te huggen, ongeacht de gemeten breedte.
- **Check:** `cd apps/rowtrack && node scripts/beeld-parity.mjs | head -3` — staat `WorkoutDetailScreen__Zonder-Hartslag` nog boven de 5% grof, dan leeft dit.
- **Status:** gebouwd (2026-09-09, branch `docs/rowtrack-figma-verschil-oorzaken`) — de oorzaak bleek niet `textAutoResize` maar `rekt`: `align-self: stretch` is de RNW-default van elk View-kind en werd als FILL-intentie gelezen, wat de breedte pint; de walker meet nu ook de run (`inhoudBreedte`), de pruner beslist hug/blok (`t.blok`, drempel 4 px, gemeten op 5 295 tekstnodes) en de builder zet `textAlignHorizontal` (`t.al`). Gemeten na herbouw van library én 24 schermframes: titel "1 sep 2026" op één regel, terug-link terug, tabelkolommen "WATT 208 268" gescheiden, auth-titels gecentreerd, "Wachtwoord vergeten?" rechts. Beeld-as: 12 frames beter, 0 slechter, 12 gelijk (die twaalf zijn instance-only en wachten op de library-publicatie). De Check hierboven blijft rood (6,97 %), want het restant van dat frame is klasse C/D — de Segmented-instance met library-tekst, 30 px te hoog — niet meer de tekstbreedte; zie `briefings/2026-09-09-audit-figma-verschilklassen.md`.

## 2026-09-09 — De beeld-as draait nog niet in CI · [ci]
- **Wat:** `scripts/beeld-parity.mjs` vergelijkt de gecommitte Figma-exports (`figma/beelden/`, 24 frames, ~900 KB) met een verse browser-render. De Figma-kant is dus CI-baar zoals `geometry.figma.json` dat is — maar de browser-kant vraagt een `build-storybook`, en dat is de dure stap (~1 min) die de zeven bestaande rowtrack-guards juist níet nodig hebben.
- **Waarom niet nu:** het is een afweging over CI-tijd die Jeroen hoort te maken, geen technische. En de drempel is nog niet vast: zonder `--drempel` rapporteert het script alleen. Die drempel kan pas gekozen worden als de tekstnode-afkapping (het item hierboven) weg is — nu zou elk getal boven de vloer van **0,02%** meteen 24 frames rood maken.
- **Eerste zet:** Eerst het tekstnode-item oplossen, dan de vloer opnieuw meten (`node scripts/beeld-parity.mjs` en het laagste getal aflezen), dan `--drempel` op ruim boven die vloer zetten en de stap toevoegen ná `build-storybook` in `ci.yml`.
- **Check:** `grep -c 'beeld' .github/workflows/ci.yml` — 0 = de as draait nog niet in CI.
- **Status:** gebouwd — 2026-09-14, PR umanex-apps#469. De drempel staat niet op een som van `grof` maar als tweezijdige ratel per frame op `tekst` én `overig`, tegen een basislijn PER PLATFORM: `IdlePhase/Toestel-Keuze` geeft 0,27 in CI tegen 0,54 op de Mac, ruim buiten de tolerantie van 0,1. Eén frame draagt geen ratel (`ActivePhase/Doel-Bereikt`, confetti met `Math.random`, spreiding 0,23 over vijf runs) — dat blijft het item hieronder over het maskeren van niet-reproduceerbare nodes.

## 2026-09-09 — Slot-detectie op gelijkheid met story-args: 23 instances tonen stil library-data · [fix]
- **Wat:** `markeerSlots` (`scripts/figma-build-spec.mjs`) markeert een tekstnode alleen als slot wanneer hij letterlijk gelijk is aan een string-arg van de story. Geformatteerde tekst — "27:00 min", "20 AUG 2026", de labels van een tab-rij — is dat nooit, dus de schermen-export plaatst instances die de story-data van de library tonen: de Historiek met vier ritten van "20 AUG 2026", WorkoutDetail met de tabs "Week Maand Jaar". Twee uitwegen: (a) slots afleiden uit de **prop-paden** die het component zelf declareert (`lib/variantData.ts` draagt al `data-variant`; een `data-slot` op de tekst-Views is dezelfde vorm), of (b) een diff tussen de story-render en de schermrender op hetzelfde componentpad — elke tekst die verschilt is per definitie een slot. (a) is expliciet en goedkoop per component; (b) is generiek maar rekent op de walker.
- **Waarom niet nu:** de klasse is vandaag pas gemeten en telbaar gemaakt; de keuze tussen (a) en (b) raakt het componentcontract en hoort niet in dezelfde ronde als de tekst-fix.
- **Eerste zet:** `pnpm --filter rowtrack figma:instance-tekst --lijst` — de 23 paden; WorkoutCard draagt er 16, dus daar begint (a) met de meeste winst per component.
- **Check:** `pnpm --filter rowtrack figma:instance-tekst | grep stil` — 23 = de klasse leeft onverminderd; lager = er zijn slots bijgekomen (en de ratel in het script moet mee).
- **Wat een ontwerppanel op 2026-09-09 vond, vóór iemand het bouwde — en het sloopte eerst de vraagstelling hierboven.** Weg (b) zoals dit item hem beschreef ("een tekstnode die tussen de story-varianten verschilt") dekt **0 van de 23**. Gemeten per component op elk van de 11 stille paden: varianten zijn stíjlassen, geen data-assen. `WorkoutCard` toont "20 aug 2026" in `index=0` én `index=1`; `Segmented` toont "Week/Maand/Jaar" in `filled` én `band`; `ActiveHeader` en `HeroPanel` hebben maar één variant, dus daar valt niets te diffen. De werkende vorm is een diff over **álle voorkomens van hetzelfde component in de spec** — elke story-variant plús elke plek waar een scherm hem als componentgrens draagt: 71 kandidaat-paden, en de 11 paden achter alle 23 stille nodes zitten erin. Weg (a), een `data-slot` in de componentcode, is verworpen op zijn eigen precedent: `data-variant` bestaat omdat de variant uit de geometrie niet af te leiden was (1 van 88 matchte), en dat geldt hier niet. Twee dingen die de uitwerking blootlegde: de slotnaam moet het **pad** dragen (`value_0_1_0_0`), want vier van de negen componenten hebben twee tekstnodes met dezelfde laagnaam en zouden anders stil één property delen; en de bestaande zelftest van `instance-tekst.mjs` wordt **rood van zijn eigen succes** — mutatie 1 leest `a.stil[0]`, en met nul stille nodes is dat `undefined`.
- **En op twee gemeten punten gesneuveld.** Ten eerste breekt hij de as die hij zou moeten dienen: `[eigenschappen]` in `figma-sync-check.mjs` doet `const basis = k => k.split('#')[0].replace(/\d+$/, '')` en faalt zodra twee tekst-properties dezelfde stam delen — de afgeleide namen (`subtitleText_1`, `subtitleText_2`) doen dat per constructie. De uitweg is goedkoop: laat een afgeleide slotnaam nooit op een cijfer eindigen (codeer het pad als letters, `0>1>2` → `abc`). Ten tweede: **7 van de 18 kandidaat-slots zijn een variant-as, geen data** — `BleStatusBar > actionText` heeft 8 varianten met 4 teksten (Verbinden, Verbinden…, Verbreken, …), en dat verschil is precies wat een variant uitdrukt. De diff kan die twee niet uit elkaar houden; weg (a), een expliciete annotatie in de componentcode, kan dat wél. Derde raakvlak dat het plan miste: `scripts/spec-diff.mjs` draagt `slot` in zijn `VELDEN`, dus de snede-poort ziet ~124 gewijzigde nodes.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — uitweg (b), maar niet de vorm die dit item beschreef. Een diff over de story-VARIANTEN dekt nul van de 23: een variant is een stijl-as en zijn tekst is per ontwerp constant (met varianten erbij kreeg WheelPicker 32 slots, één per wielrij, terwijl dat component in de schermen portaleert). Wat werkt is een diff over de VOORKOMENS: hetzelfde component, twee schermen, andere tekst op hetzelfde pad. `markeerAfgeleideSlots` in `scripts/figma-build-prune.mjs` doet dat, dwars door geneste componentgrenzen heen — in de library is een genest component gewoon een frame, dus ActiveHeader kan een property op een GoalPill-tekst hebben. De twee valkuilen uit dit item zijn allebei geraakt: de naam eindigt nooit op een cijfer (het pad gaat er als letters achter) en een pad waar de walker al een slot heeft wordt overgeslagen, anders ontstaat een property zonder node. Gemeten: 23 stil → **0**, 27 componenten met 60 slots, 0 stam-botsingen. De zelftest maakt zijn eigen defect nu (slot weg → 0/21, terug → 21/0), want de oude kant zocht een stil geval en verdween met het defect.

## 2026-09-09 — Geneste inline Text wordt frame plus los label · [fix]
- **Wat:** "Nog geen account? *Registreer*" is één `<Text>` met een geneste `<Text>`. De walker geeft de eigen tekst en het kind apart door, de builder maakt er een frame zonder auto layout van met een `label`-kind (`figma/builder.js:575`), en beide landen op x = 0 — "Registreer" over "Nog geen account?" heen, op Login, Register en Forgot. Figma kent geen inline-stroom; de getrouwe vorm is een HORIZONTAL auto-layout met HUG, of één tekstnode met gemengde stijl per bereik (`setRangeFills`/`setRangeTextStyleId`).
- **Waarom niet nu:** drie nodes, en de fix vraagt een keuze tussen twee vormen die elk een ander leesbaarheidscontract raken.
- **Eerste zet:** de tweede vorm proberen op LoginScreen — één tekstnode, de link als bereik met `textLink`-stijl en accentkleur; dat is ook wat de app rendert.
- **Check:** `node -e` op `figma/build-spec.min.json`: tel nodes met zowel `t` als `k`. **3** = de eigen tekstrun reist mee (Login, Register, Forgot); 0 = de fix is weggevallen. De DOM-teller (`walker-blindvlekken | grep inline`) blijft 3 en zegt nu niets over de fix — hij telt de bron, niet de vertaling.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — de eigen tekstrun van een node met elementkinderen blijft behouden, inclusief de witruimte die tussen twee elementen staat. Gemeten: 3 nodes (Login, Register, Forgot), alle drie met scheider. De inline-STROOM zelf blijft wat hij was — Figma kent hem niet; dit sluit alleen het verlies van de run.

## 2026-09-09 — Scroll-semantiek wordt niet getranscribeerd · [fix]
- **Wat:** De walker meet geen `scrollTop` en de builder zet `clipsContent = false` (`figma/builder.js:457`), dus de WheelPicker in IdlePhase toont zijn lijst vanaf item 1 in plaats van rond de geselecteerde waarde, en de lijst loopt onder de Start-knop door. Fix in twee delen: `scrollTop` meten en als negatieve `y` op de scrollinhoud zetten, en `clipsContent = true` op elke node met `overflow: hidden|auto|scroll`.
- **Waarom niet nu:** raakt de WheelPicker die sowieso terugvalt (BACKLOG 2026-09-09, instances), dus de winst is pas zichtbaar als die eerst een instance wordt.
- **Eerste zet:** `clipsContent` uit `overflow` afleiden — dat is één regel in de builder en de kleinste helft.
- **Check:** `node -e` op `figma/build-spec.min.json`: tel `knipt` en `gerold`. **393 en 9** = de fix staat er; 0 gerolde containers betekent dat de scrollpositie weer wegvalt. De DOM-tellers (`gescrold` 11, `overloop` 16) blijven staan — die meten de bron.
- **Wat een ontwerppanel op 2026-09-09 vond.** Splits dit in twee patches: (a) `clipsContent` uit `overflow` afleiden is drie coderegels en raakt geen enkel nieuw veld; (b) de scrollpositie vraagt een nieuw walker-veld en een absolute plaatsing. Beide dwingen een verse `figma:spec` af, en dáár zit de gemiste guard: de **`[publicatie]`-as** van `figma:check` vergelijkt de git-commit­tijd van `build-spec.min.json` met die van `manifest.json` en valt om zodra de spec jonger is dan een gepubliceerd manifest. De volgorde is dus: herbouwen in Figma → manifest verversen → en het manifest niet vóór de spec committen. Even belangrijk: `parity` en `beeld` zijn na deze patch **blind** zolang `geometry.figma.json`, `geometry.schermen.json` en de 24 PNG's niet opnieuw uit Figma gelezen zijn — ze vergelijken dan de nieuwe spec met een oude Figma-lezing en staan groen zonder iets te meten.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — beide helften. (a) `clipsContent` volgt `overflow`: 393 knippende nodes. (b) Een gerolde container laat zijn auto-layout vallen in plaats van een negatieve y op de scrollinhoud te zetten — de kinderen dragen de rolling al in hun gemeten offset, dus absolute plaatsing plus knippen is de hele fix, en dat kost geen extra wrapper die `kinderparen()` als vierde syntheseregel zou moeten kennen. Gemeten: 9 gerolde containers, kind-offset exact −scrollTop in alle negen (GoalSheet −950, 4× WheelPicker −150, IdlePhase −250/−450). De waarschuwing uit dit item staat: `parity` en `beeld` zijn blind tot de Figma-kant opnieuw gelezen is, en dat wacht op de Desktop Bridge.

## 2026-09-09 — Input-placeholder is een attribuut, geen tekstnode · [fix]
- **Wat:** De walker leest alleen `nodeType === 3` (`scripts/figma-build-spec.mjs:437`); een `<input placeholder="naam@voorbeeld.be">` zonder waarde heeft geen tekstnode en landt leeg in Figma — vier velden over Login, Register en Forgot. Fix: bij `INPUT`/`TEXTAREA` zonder waarde de `placeholder` als tekst meegeven, met de placeholder-kleur (`::placeholder` via `getComputedStyle(el, '::placeholder')`).
- **Waarom niet nu:** vier nodes; hoort in dezelfde walker-ronde als de andere blindvlekken.
- **Eerste zet:** de placeholder-tak in `lees()` naast `eigenTekst`.
- **Check:** `node -e` op `figma/build-spec.min.json`: tel tekstnodes met `t.veld`. **8** = de velden dragen hun placeholder; 0 = weggevallen. De DOM-teller (`placeholder` 4 op de schermen, 7 over alle stories) meet de bron.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — de walker leest `value`-of-`placeholder` op `<input>` en `<textarea>`, met de kleur uit `--placeholderTextColor`, `::placeholder` of de eigen kleur, in die volgorde; de builder pint de tekstdoos in plaats van hem te laten huggen, want een placeholder die hugt is smaller dan het veld eromheen. Gemeten: 8 veldnodes, 2 leeg. `FormField.stories.tsx` verloor zijn ingevulde waarde zodat de library-variant de placeholder toont — de staat die een design system hoort te laten zien.

## 2026-09-09 — Per-zijde randen worden samengevouwen · [fix]
- **Wat:** De walker leest alleen `borderTopWidth`; de builder zet één `strokeWeight`. Een `1/0/1/0` (Segmented, tab-rij) wordt in Figma een volledige doos, een `0/0/1/0` (rij-divider) verdwijnt. 110 elementen over 42 schermstories. Figma kent `strokeTopWeight` … `strokeLeftWeight`; de walker moet vier breedtes meten en de builder ze apart zetten.
- **Waarom niet nu:** de grootste groep, maar visueel klein per geval; hoort in dezelfde walker-ronde.
- **Eerste zet:** `border: [t, r, b, l]` in de walker, `o.rand` in de pruner, `strokeTopWeight` e.a. in de builder — en `geometry-parity.mjs` leest `strokeWeight` als één getal, dus die as krijgt er vier velden bij.
- **Check:** `node -e` op `figma/build-spec.min.json`: tel nodes met `borderZijden`. **77** = de vorm reist per zijde; 0 = de walker leest weer één zijde. **Let op:** de `rand`-as van `walker-blindvlekken` bestaat niet meer — hij heet sinds deze ronde `randkleur` en staat op 0 bij een positieve controle `metRand` van 226 (42 schermstories) of 333 (alle 257). Een oude `grep rand` matcht nu beide regels en leest als nul.
- **Wat een ontwerppanel op 2026-09-09 vond.** De vormverandering (één `strokeWeight` → vier zijden) hoort een schemabump te krijgen zodat een oude lezing geweigerd wordt, maar **de schemapoort dekt maar één van de twee Figma-bestanden**: `geometry-parity.mjs:347-352` merget `geometry.schermen.json` en leest daarna alleen `fig.schema` uit `geometry.figma.json`; `sch.schema` wordt nergens gelezen. Een schermlezing van het oude schema glipt er dus doorheen, precies bij de bestanden waar deze klasse het meest zichtbaar is. Fix de poort mee, ín het `existsSync`-blok vóór de merge. Tweede vondst: `n.border` is niet alleen een strokewaarde maar ook de **dekkings-tolerantie van de achtergrond-opvouwregel** (`builder.js:621` en `:918`, `spec-boom.mjs`); hem van `borderTopWidth` naar het maximum van vier zijden brengen verandert stil welke achtergrondkinderen opgevouwen worden.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — walker meet vier zijden, pruner draagt `borderZijden` alleen als ze verschillen, builder zet `strokeTopWeight` c.s. **ná** `strokeWeight` (die laatste zet de vier terug). Uitleesschema naar **3**: index 5 draagt vier breedtes in plaats van één. Gemeten in de DOM vóór de bouw, alle 257 stories: 333 nodes met rand, 138 asymmetrisch in twee vormen (99× `0/0/1/0`, 39× `1/0/1/0`), **0** met meer dan één kleur — dus de kleur blijft er één, met een melding als dat verandert. Beide vondsten van het panel zijn geraakt: de schemapoort toetst nu ook `geometry.schermen.json` (vóór de merge, met een zelftest op beide kanten in een apart proces), en de opvouwregel rekent per zijde in alle drie zijn kopieën. Dat laatste is NIET te valideren op een verschil in de uitvoer: 0 van de 77 asymmetrische nodes heeft een absoluut vullingskind, dus alle drie de definities geven 64 — geen bewijs dat ze het eens zijn, wel dat het geval hier niet voorkomt. Stille helft die dit item niet noemde: `isDoorvoer` toetste alleen `borderTopWidth`, dus een node met enkel `border-bottom` viel als doorvoer-wrapper weg mét zijn rand.

## 2026-09-09 — De text-style-keuze negeert tracking · [fix]
- **Wat:** `styleRef` (`scripts/figma-build-spec.mjs:829-834`) kiest de enige kandidaat op familie+grootte en kijkt pas naar `letterSpacing` bij meerdere kandidaten. "RESTERENDE TIJD" (SemiBold 16, tracking 3,2 px) krijgt zo `type/segmentActive` (−1,5 % = −0,24 px) en staat in Figma smaller dan in de app. 24 van 324 tekstnodes met style; twaalf `segmentActive`, twaalf `splitsRow`.
- **Waarom niet nu:** de juiste uitkomst is niet "kies een andere style" maar "er is geen style met deze tracking" — dat is een tokenvraag voor Jeroen (`Theme/type/*`), niet een walker-fix.
- **Eerste zet:** de kandidaat-toets altijd op tracking laten filteren, ook bij één kandidaat; wat dan zonder style valt komt in `ongebonden.json` en wordt een tokenkeuze.
- **Check:** `node -e 'const m=require("./figma/build-spec.min.json"),f=require("./figma/manifest.json");const s=new Map(f.textStyles.map(t=>[t.name,t]));let n=0;for(const x of Object.values(m.schermen))for(const fr of x.frames)(function l(k){if(k.t?.style&&s.has(k.t.style)){const t=s.get(k.t.style);if(Math.abs(t.letterSpacing/100*t.fontSize-(k.t.ls??0))>0.1)n++}(k.k??[]).forEach(l)})(fr.boom);console.log(n)'` in `apps/rowtrack` — 24 = leeft, 0 = dood. Gemeten vóór de fix: **24** (positieve controle — het instrument kán rood), erna: **0**.
- **Status:** gebouwd (2026-09-09, branch `fix/rowtrack-tracking-styleref`) — `styleRef` filtert sinds vandaag altijd op tracking, ook bij één kandidaat; juist dáár is de toets het hardst nodig, want er is niemand om tegen te vergelijken. De 32 geraakte tekstnodes verliezen hun onterechte style en komen als gat in `ongebonden.json` (52 → 56 uniek, 3 760 → 3 792 voorkomens, beide ratels gebumpt mét reden en tweezijdig getoetst). Het beeld wordt daarmee correcter: zonder style zet de builder `fontSize` en `letterSpacing` zelf uit de meting, mét style deed hij alleen `setTextStyleIdAsync` en won de verkeerde tracking. **Wat de fix niet oplost is de aanleiding** — er bestaat geen `Theme/type/*` met die tracking; die vier waarden staan hieronder in het tokens-item.

## 2026-09-09 — De Segmented-instance in WorkoutDetail zit 28 px te hoog: de walker meet geen marges · [fix]
- **Wat:** Op `WorkoutDetailScreen/Playground` staat de tab-rij in Figma op y=84 en in de browser op y=112, en alles eronder schuift mee (statistiektabel 138 tegen 166, knop 820 tegen 848). De eerste lezing van dit item noemde "30 px" en zocht de oorzaak in de override-laag van `maakInstance`; dat was een oogschatting op het drieluik, geen meting. **Gemeten in de DOM** (`storybook-static`, `root>0>0>1`): de node draagt `margin-top: 28`, en de walker leest `margin` niet. Figma's auto-layout kent geen per-kind marge, dus de ruimte verdwijnt. De instance zelf is correct: y=84 in Figma is exact wat de spec zegt, en `parity` is groen omdat die hoogtes vergelijkt en geen posities van stromende kinderen. De som van de vier kinderen (84 + 54 + 682 + 84 = 904) tegen de framehoogte (932) laat het verschil van 28 zien zonder Figma erbij te halen.
- **Omvang, gemeten over alle 257 stories:** 57 van 13 237 nodes dragen een niet-nul marge, verspreid over 38 stories. Twaalf unieke waarden, waaronder de negatieve breakout-marges van de Home-lijst (`[0,-20,0,-20]`) en `[28,0,0,0]` op elke `Segmented` in History en WorkoutDetail (14 nodes).
- **Waarom niet nu:** de vertaling is een keuze die het knopenaantal raakt en dus `parity` en de laagnamen. Figma kent geen marge; de eerlijke vormen zijn (a) een spacer-node tussen de zusters, (b) de marge in de `itemSpacing` van de ouder wanneer álle kinderen hem delen, (c) de marge in de padding van de ouder wanneer het het eerste of laatste kind is. Een spacer verandert `kinderen` in de geometrie-vergelijking, dus `kinderparen()` in `geometry-parity.mjs` moet hem overslaan zoals hij dat al doet voor opgevouwen achtergrondkinderen en gesynthetiseerde labels. Negatieve marges (de breakout) hebben geen Figma-equivalent en horen een melding te worden, geen stille nul.
- **Eerste zet:** `node /private/tmp/…/meet-marges.mjs` is een wegwerpscript; giet de telling in `scripts/walker-blindvlekken.mjs` als zesde as (`marge`), zodat het getal een `Check` heeft. Neem daarna geval (b) en (c) eerst: die voegen geen nodes toe. `[28,0,0,0]` op een middenkind valt onder (a).
- **Check:** `node -e` op `figma/build-spec.min.json`: som de kinderhoogtes van `WorkoutDetailScreen/Playground` tegen de framehoogte. **932 = 932** betekent dat de marge vertaald wordt; 904 betekent dat de spacer weg is. Tel er `naamBron === 'marge'` naast: **18** spacers. De DOM-teller (`walker-blindvlekken | grep marge`, 40 op de schermen en 57 over alle 257) blijft staan — die meet de bron, niet de vertaling.
- **Wat een ontwerppanel op 2026-09-09 vond.** De drie vertalingen (itemSpacing · padding · spacer) houden stand, maar de spacer-variant raakt een guard die in geen enkel plan voorkwam: `scripts/instabiele-nodes.mjs` schrijft zijn uitsluitingen als `${pad}>${i}:${naam}` — **index-gebaseerd** (`scripts/spec-boom.mjs:41`) — en `geometry-parity.mjs` leest ze zo terug. Een spacer tussen twee broers schuift elke volgende index op en maakt alle 328 uitgesloten paden ongeldig; parity gaat dan de instabiele spinner- en confettinodes wél vergelijken. Volgorde is dus: `figma:spec` → `instabiele-nodes` → `parity`, niet andersom. Twee andere vondsten: de spacer kan `o.k` boven de `MAX_BROERS`-kap van 8 duwen (tel hem mee in `o.afgekapt`, of voeg hem ná de kap in), en het zijn **11 spacers in 11 ouders**, niet 9 — de twee ontbrekende zitten op `WorkoutDetailScreen root>0>2>0>0` in beide frames.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — alle drie de vormen uit dit item. (b) en (c) eerst: de pruner vouwt een marge in de gap of de padding van de ouder waar dat kan. (a) waar het moet: een spacer-node voor een middenkind, buiten de noemer van de laagnaam-as gehouden want een spacer heeft geen codenaam. Wat Figma niet kan — negatief, kruis-as — gaat als `margeRest` naar de builder en wordt een benoemde melding, geen stille nul. Gemeten: 18 spacers, 17 ouders met een onvertaalbare rest, en de proef op de som sluit: WorkoutDetail/Playground telt 84+28+54+682+84 = **932** in een frame van 932, was 904.

## 2026-09-09 — De resterende verschilklassen vragen één ronde per LAAG, niet vijf ronden per klasse · [refactor]
- **Wat:** C (slots), E (inline tekst), F (scroll), G (placeholder), J (randen) en L (marges) hebben elk een uitgewerkt en adversarieel getoetst plan (zie de items hierboven). Een ontwerppanel legde ze naast elkaar en vond dat serieel afwerken vier keer terugkeert naar dezelfde regels. De botsingen, met regelnummers gemeten:

  | Plek | Klassen | Aard |
  |---|---|---|
  | `figma-build-prune.mjs:96` (`o.abs`/`o.dx`/`o.dy`) | E + F | harde botsing: E wil `dx` op inline-kinderen, F op `scrollContent` — één samengevoegde edit |
  | `builder.js` `MELDING_SOORTEN` | E + J + L | drie plannen voegen soorten toe aan dezelfde lijst (27 → 31, 39 → 43 pushes) — één edit |
  | `figma-build-spec.mjs` `lees()` regels 495-509 | J + L | aangrenzend: L zet `margin` naast `padding`, J vervangt `borderWidth` — ordenen volstaat |
  | `figma-build-spec.mjs` `eigenTekst`-blok | E + G | beide herdefiniëren wanneer een node tekst krijgt — G eerst (óf er tekst is), E daarna (wát erin staat) |
  | `geometry-parity.mjs` `synthetiseer()` | E + J | E voegt een syntheseregel toe, J bumpt het schema |
  | `figma-build-prune.mjs` `o.k` | L → C | L's spacers verschuiven elke broer-index, en C's slotnamen coderen het pad — C moet ná L, en opnieuw gemeten |
  | `n.border` op vier plekken | J | `border` is niet alleen een stroke maar de opvouw-tolerantie van achtergrondkinderen (`spec-boom.mjs`, `builder.js` ×2, `instance-tekst.mjs`) — J verandert daarmee het knopenaantal van parity |

- **De sessiepoort die in geen enkel plan stond:** de `[publicatie]`-as vergelijkt de git-commit­tijd van `build-spec.min.json` met die van `manifest.json` en valt om zodra de spec jónger is. Eén `figma:spec` plus een commit draait dat om en zet `figma:check` in CI op rood. Dat is geen eigenschap van een klasse maar van de sessievorm — één spec-run, één herbouw — en hoort dus in de gedeelde staart: herbouwen in Figma, manifest verversen, en het manifest niet vóór de spec committen.
- **Waarom niet nu:** het is één ronde van een halve dag met een Figma-herbouw aan het eind, geen zijstap. En vier van de zes plannen dragen nog een bijstelling uit hun weerlegging.
- **Eerste zet:** neem de laag-volgorde uit de tabel: walker (`lees()`: G, E, L, J) → pruner (regel 96 samengevoegd, dan L's spacers, dan C) → builder (`MELDING_SOORTEN` in één edit, dan de bouwtakken) → guards (parity-schema, ratels) → één `figma:spec` → selftests → één Figma-herbouw → manifest → parity → beeld.
- **Check:** `node scripts/walker-blindvlekken.mjs` — de basislijn van vóór de ronde was rand 110, placeholder 4, gescrold 11, overloop 15, inline 3, marge 40 (42 schermstories). **Die assen zijn niet meer één-op-één te vergelijken**: de `rand`-as is na de ronde `randkleur` geworden (randen per zijde zijn geen blinde vlek meer; wat er van het gat over is, is de kleur) en staat op 0 bij een positieve controle van 226. `placeholder`, `gescrold`, `overloop` en `marge` blijven staan omdat dit script de DOM meet en niet de spec — het gat zit nu in de vertaling, niet in de meting, en dat toetst `parity` na de Figma-herbouw. `pnpm --filter rowtrack figma:check` is 13/14 zolang die herbouw niet gedraaid is: `[publicatie]` meldt terecht dat de bouwspec jonger is dan de Figma-momentopname.
- **Status:** gebouwd (2026-09-09, branch `feat/rowtrack-verschilklassen`) — twee commits, per laag: E+G+L in het walker/pruner-paar, daarna J+C+F. Zie `briefings/2026-09-09-audit-figma-verschilklassen.md` → *De tweede ronde*. De Figma-helft (herbouw, manifest, geometrie, parity, beeld) is NIET uitgevoerd: de Desktop Bridge stond uit.

## 2026-09-09 — Het hero-label vraagt een derde stap in de 20 %-labelreeks · [tokens]
- **Wat:** `heroLabel` in `components/workout/active/HeroPanel.tsx:74-80` bouwt zijn tekststijl met de hand op: Albert Sans SemiBold 16 px met `letterSpacing: 3.2, // 20% van 16`. Die 20 % bestáát in de schaal, maar alleen op 13 px (`type/labelSection`, 2,6) en op 11 px (`type/labelGoalPrefix`, 2,2). Er is dus geen tekststijl op 16 px met 20 %, en daardoor plakte de walker er tot vandaag `type/segmentActive` op — dezelfde familie en grootte, maar −1,5 % in plaats van +20 %, een verschil van 3,44 px per teken op "RESTERENDE TIJD". Sinds de strikte tracking-filter (2026-09-09) is dat geen stille fout meer maar een zichtbaar gat: 14 nodes over HeroPanel en de zes ActivePhase-frames.
- **Beslissing Jeroen (2026-09-09):** een nieuwe stap toevoegen in Tokens Studio, naast `labelSection` en `labelGoalPrefix`. Niet terugvallen op 13 px, want dat verandert de hiërarchie van het actieve scherm.
- **Waarom niet nu:** een token toevoegen gaat via Tokens Studio en die push is werk van Jeroen; een handmatige edit van `tokens/tokens.json` wordt bij de eerstvolgende plugin-push overschreven.
- **Eerste zet (Jeroen):** in Tokens Studio een `Theme/type/*` bijzetten op Albert Sans SemiBold 16 px met 20 % tracking en `textCase: uppercase` (de reeks draagt dat ook), pushen, dan `pnpm --filter rowtrack tokens:build`. Daarna zet ik `HeroPanel.heroLabel` op `...typeStyles.<naam>` en verdwijnen de 14 nodes uit `ongebonden.json` (56 → 55 uniek, 3 792 → 3 778 voorkomens; de ratels in `figma-sync-check.mjs` moeten dan omlaag mét reden).
- **Check:** `grep -n 'letterSpacing: 3.2' apps/rowtrack/components/workout/active/HeroPanel.tsx` — een treffer betekent dat de code de waarde nog met de hand zet en het gat leeft.
- **Status:** open

## 2026-09-09 — De beeld-as sluit niet-reproduceerbare nodes niet uit, en één frame is daardoor onmeetbaar · [test]
- **Wat:** `scripts/geometry-parity.mjs` slaat de 328 paden uit `figma/niet-reproduceerbaar.json` over — nodes die tussen twee runs van ónveranderde code van maat verschillen, zoals de roterende `ActivityIndicator` en de confetti van `MotivationalToast` (`size = 6 + Math.random() * 8`). `scripts/beeld-parity.mjs` kent die uitsluiting niet: hij vergelijkt hele frames als pixels. Gevolg, gemeten 2026-09-09 met drie runs op onveranderde invoer: `ActivePhase/Doel Bereikt` geeft 6,06 · 6,02 · 6,11 % grof, terwijl `IdlePhase/Playground` in dezelfde drie runs exact 2,29 blijft. Een spreiding van 0,09 op één frame, en dat is nog de gunstige helft: de confetti wordt óók opnieuw gerandomiseerd bij elke Figma-bouw, dus tussen twee exports kan het verschil veel groter zijn. Dat frame kan dus niet als bewijs dienen voor welke wijziging dan ook — en het is precies het frame waar de toast in staat.
- **Waarom dit meer is dan één frame:** de beeld-as heeft geen enkel begrip van "deze node kán niet stabiel gemeten worden", dus elke toekomstige gerandomiseerde of geanimeerde decoratie maakt stil een heel frame onbruikbaar. Bij `parity` is dat opgelost met een expliciete lijst plus een exit-2 als de sluiting geen superset van de meting is; bij `beeld` bestaat dat niet.
- **Eerste zet:** `beeld-parity.mjs` maskeert al de Ionicons-glyphs op beide beelden identiek (die bestaan in Figma niet). Dezelfde weg werkt hier: bereken uit `niet-reproduceerbaar.json` de rechthoeken van de instabiele nodes in de browser-render en maskeer ze aan beide kanten. De tegenproef staat al klaar — drie runs op onveranderde invoer horen daarna hetzelfde getal te geven, en dat doen ze vandaag niet.
- **Check:** `for i in 1 2 3; do node scripts/beeld-parity.mjs | grep Doel-Bereikt; done` — drie verschillende percentages = de klasse leeft.
- **Status:** open

## 2026-09-14 — 12 van 35 tikbare elementen hebben rol noch label · [ux]
- **Wat:** 34 % van de `Pressable`/`Touchable*` in `components/` en `app/` draagt geen `accessibilityLabel` en geen `accessibilityRole`. Het scherpste geval is `app/(tabs)/history/[id].tsx:196`: de datum in de header is een terug-knop zonder rol, vijf regels boven een tweede terug-affordance die er wél een heeft (`:201`) — VoiceOver leest er dus één van de twee. Verder `components/Chip.tsx:14` (ook zonder `accessibilityState` terwijl `active` een prop is, waar `Segmented.tsx:48` en `GoalSegments.tsx:73` dat wél doen), `components/workout/active/KpiRow.tsx:51`, en 5× `linkContainer` in de auth-schermen. Twee schermvullende scrims (`BottomSheet.tsx:132`, `MotivationalToast.tsx:159`) horen juist `accessibilityElementsHidden` te krijgen: nu kan de focus op een onzichtbaar element landen.
- **Waarom niet nu:** De designreview van 2026-09-14 leverde één P0 en acht P1's; dit is P2 en raakt twaalf bestanden zonder dat er een ontwerpbeslissing in zit. `BACKLOG 2026-07-16` noemt a11y-strategie al als een keuze die van Jeroen is — dit item is het concrete deel daarvan, niet de strategie.
- **Eerste zet:** De twaalf oplijsten met `grep -rn 'Pressable\|TouchableOpacity\|TouchableHighlight' apps/rowtrack/components apps/rowtrack/app` en per geval rol + label toevoegen; `accessibilityState` op Chip en KpiRow naar het voorbeeld van `Segmented.tsx:48`. Begin met `history/[id].tsx:196`, want dat is de enige waar twee affordances hetzelfde doen en er één onzichtbaar is.
- **Check:** `grep -c accessibilityState apps/rowtrack/components/Chip.tsx` → 0 = nog niet opgepakt.
- **Status:** open

## 2026-09-14 — De meest gebruikte labelstijl staat op 11 px, de kleinste op 9 · [ux]
- **Wat:** `labelGoalPrefix` is 11 px uppercase met 2,2 tracking (`constants/typography.ts:157-163`) en staat op **19 plekken over 14 bestanden**, inclusief het tabbar-label (`TabLabel.tsx:22`) en elk sectie- en StatsTable-label. `labelMicro` is 9 px en staat op `PrBadge.tsx:78`, `PrBanner.tsx:92` en `history/[id].tsx:523`. Alleen `TabLabel` en `DeviceRow` cappen Dynamic Type (`maxFontSizeMultiplier={1.2}` → maximaal 13,2 px).
- **Waarom niet nu:** Het is de meest gebruikte labelstijl van de app, dus de grens ophogen verschuift 19 plekken en daarmee de geometrie-basislijn van `parity` en `beeld`. Dat is een eigen ronde met een eigen meting, geen bijzaak van een andere fix. Anders dan het tracking-item van 2026-09-09 gaat dit over de **grootte**, niet over de tracking.
- **Eerste zet:** Meten wat er breekt: `labelGoalPrefix` naar 12 px zetten, `pnpm --filter rowtrack parity` draaien en tellen hoeveel nodes van hoogte veranderen. Valt dat mee, dan is dit één tokenwijziging; valt het tegen, dan is het een gefaseerde uitrol per scherm.
- **Check:** `grep -A2 'labelGoalPrefix' apps/rowtrack/constants/typography.ts | grep -c '11'` → treffer = nog op 11 px.
- **Status:** open

## 2026-09-14 — Geen instrument bewaakt rauwe kleur of maat in rowtrack's componentbron · [infra]
- **Wat:** `pnpm ds:guard` staat groen op 9/9 apps maar meet voor rowtrack nul token-discipline: `Preset: geen` laat `echtePreset()` op `null` vallen, en `Componentbron: eigen` slaat de assen `[dubbel]` en `[adoptie]` allebei over — van de vijf assen doen er twee iets, en die toetsen de *declaratie*, niet de code. `figma:check [hardcoded]` scant uitsluitend `*.stories.tsx` (`scripts/figma-sync-check.mjs:212`, `:439`), dus de componentbron valt er per constructie buiten. Er is geen ESLint-config in `apps/rowtrack`, terwijl de monorepo-CLAUDE.md "ESLint-regels per app" belooft voor de consumptieregel. Gemeten gevolg in dat gat: **13 hardcoded kleurvoorkomens in 7 van 60 bestanden** en **60 numerieke layoutliterals over 25 van 63 bestanden**, waaronder `borderRadius: 8` op drie plekken waar `radii.sm` bestaat (`GoalPill.tsx:80`, `SubtitleProgress.tsx:59`, `dev-active.tsx:158`) en `gap: 20/28/8` in `IdlePhase.tsx:314,320,355`.
- **Waarom niet nu:** Een guard bouwen die rood wordt op bestaande code betekent eerst die code opruimen, anders is hij vanaf dag één uitgeschakeld. Dat is twee rondes werk en de designreview leverde dringender dingen. Maar zonder dit item blijft het gat onzichtbaar — een groene guard die de bron niet leest, is stilte met een teller.
- **Eerste zet:** De guard schrijven met een uitsluitingslijst die de huidige 13 + 60 bevat (zoals `BEKENDE_GATEN = 50` in `figma-sync-check.mjs:110` al doet), zodat hij vandaag groen is en morgen rood op elke nieuwe. Tweezijdige tegenproef verplicht: één rauwe hex toevoegen moet hem rood maken, weghalen weer groen.
- **Check:** `ls apps/rowtrack/.eslintrc* apps/rowtrack/eslint.config.*` → geen treffer = nog geen lint-laag in deze app.
- **Status:** open

## 2026-09-14 — Drie kleuren buiten het merksysteem op betekenisdragende plekken · [tokens]
- **Wat:** Gemeten pixelwaarden op de gebouwde app: de voortgangstrack is `#c9b894` (warm zand), de "op tempo"-balk is `#4caf50` (Material Design green 500) en de records-badge is `#e8dcc4`. `#c9b894` betekent *wat je niet gehaald hebt*, het bijna identieke `#e8dcc4` betekent *wat je wél presteerde* — en de track is lichter dan de vulling, dus het onafgemaakte deel domineert de voortgangsbalk visueel.
- **Waarom niet nu:** Het is niet vastgesteld of deze drie al in de 50 ongebonden waarden van `figma/ongebonden.json` zitten (BACKLOG 2026-09-09). Dat moet eerst gemeten, anders staat dezelfde waarde in twee items. Bovendien raakt het de tokenlaag, en die wacht al op een push uit Tokens Studio voor het accent-item van 2026-09-07.
- **Eerste zet:** `grep -i 'c9b894\|4caf50\|e8dcc4' apps/rowtrack/figma/ongebonden.json apps/rowtrack/constants/*.ts` — treffers bepalen of dit een nieuw item is of een deelverzameling van 2026-09-09. Pas daarna een rol kiezen.
- **Check:** `grep -ril 'c9b894' apps/rowtrack/constants apps/rowtrack/tokens` → geen treffer = de waarde komt nog nergens uit een token.
- **Status:** open

## 2026-09-14 — Uitloggen is de prominentste knop van het profielscherm · [ux]
- **Wat:** `Uitloggen` is een volle rode pil met glow — exact dezelfde behandeling als `Start training`, de primaire actie van de app. Pal eronder staat `Account verwijderen` als muted rij, en bovenaan het scherm staat `GEEN DOEL INGESTELD` als de allerlichtste tekst. De hiërarchie staat om: de uitgang schreeuwt, het verwijderen fluistert, en het instellen van een doel — de motor onder het motivatiemechanisme dat Home aandrijft — is bijna onzichtbaar.
- **Waarom niet nu:** Vraagt een keuze over wat de primaire actie van het profielscherm ís. Dat is een productbeslissing, geen opruimwerk, en ze raakt ook de plek waar het doel ingesteld wordt.
- **Eerste zet:** `Uitloggen` naar een tekstknop degraderen en meten of er iets misgaat in de flow; daarna apart beslissen of "doel instellen" een echte primaire actie krijgt mét de huidige waarde erbij.
- **Check:** Screenshot van `app/(tabs)/profile.tsx` onderaan — is `Uitloggen` nog de enige gevulde knop op het scherm?
- **Status:** open

## 2026-09-14 — Emoji dragen de celebration en de records-badge · [ux]
- **Wat:** Een trofee- en biceps-emoji in "Doel bereikt!", een medaille-emoji in de `3 RECORDS`-badge op Home. Emoji renderen per OS-versie anders en botsen met het verder strakke Ionicons-systeem. Uitgerekend op het moment dat het merk het meest zichzelf zou moeten zijn — het vieren van een gehaald doel — leent de app een systeemglyph.
- **Waarom niet nu:** Er is geen eigen viermarkering in de tokens, dus dit vraagt een getekend icoon of een typografische oplossing. Dat is ontwerpwerk, geen vervanging.
- **Eerste zet:** Beslissen of de viering een icoon krijgt of typografisch gedragen wordt; bij een icoon hoort het in de Ionicons-set of als eigen asset door de Figma-keten.
- **Check:** `grep -rn '🏆\|💪\|🥇' apps/rowtrack/components apps/rowtrack/app` → treffers = nog niet vervangen.
- **Status:** open

## 2026-09-14 — Drie dubbele koppen: het label zegt wat er direct onder staat · [ux]
- **Wat:** Drie keer dezelfde vorm van ruis. (1) Op Profiel lezen de sectiekop (`app/(tabs)/profile.tsx:585`) en het rijlabel eronder (`:589`) allebei dezelfde sleutel `t.consent.settingLabel` — "Gezondheidsgegevens", `i18n/translations/nl.ts:458`. Sectiekop en veldlabel delen bovendien dezelfde stijl (uppercase, tracking, grijs), waardoor de sectiestructuur niet leesbaar is. (2) Op WorkoutDetail staat de eyebrow `OVERZICHT` pal boven een tab die ook `Overzicht` heet. (3) Het maanddoelblok staat identiek op Home én Profiel — zelfde cijfers, zelfde `WIJZIG`, zelfde "46 % voldaan".
- **Waarom niet nu:** (3) kan een bewuste snelkoppeling zijn in plaats van duplicatie; dat is Jeroens keuze en niet uit de code af te leiden. (1) en (2) zijn klein maar zitten in twee schermen die in briefing 4 sowieso opengaan — daar meenemen is goedkoper dan een eigen ronde.
- **Eerste zet:** (1) en (2) meenemen in briefing 4 (`2026-09-14-screen-hierarchie-en-eindscherm`); (3) apart beslissen.
- **Check:** `grep -c 't.consent.settingLabel' 'apps/rowtrack/app/(tabs)/profile.tsx'` → 2 = de sectiekop en het rijlabel delen nog dezelfde string.
- **Status:** open

## 2026-09-14 — Vaste breedte 165 op labels zonder numberOfLines, zes plekken · [fix]
- **Wat:** `StatsTable.tsx:59` en `:80` plus `history/[id].tsx:594,615,656,670` zetten `width: 165` op een label in `labelGoalPrefix` — 11 px uppercase met 2,2 tracking. Geen van de zes heeft `numberOfLines`; `numberOfLines` staat in de hele app op 7 van 204 `<Text>`. Een label dat 165 px overschrijdt breekt naar twee regels en verschuift de rij. Dit is dezelfde klasse als de afgebroken `HISTORIEK`-tab, en `apps/rowtrack/CLAUDE.md` registreert de Figma-spiegel ervan al ("de labelkolom van StatsTable was anders 'WATT208'").
- **Waarom niet nu:** Vandaag past elk label; het is een latente breuk die pas bij een langer woord of grotere Dynamic Type zichtbaar wordt. Hangt bovendien samen met het 11 px-item hierboven — die twee samen oppakken voorkomt dat de fix twee keer gemeten wordt.
- **Eerste zet:** `numberOfLines={1}` plus `adjustsFontSizeToFit` op de zes; daarna `parity` draaien om te zien of er een rijhoogte verschuift.
- **Check:** `grep -c 'width: 165' apps/rowtrack/components/workout/active/StatsTable.tsx` → treffer = nog vaste breedte.
- **Status:** open

## 2026-09-14 — Op Profiel scrollt de content onder de systeemstatusbalk door · [fix]
- **Wat:** Na scrollen op het profielscherm staat de klok van het toestel bovenop de rijen `VOORNAAM` en `E-MAIL`; er is geen safe-area-achtergrond bovenaan. De systeemtijd leest daardoor als een waarde in het formulier.
- **Waarom niet nu:** Klein, permanent zichtbaar, en het raakt de scroll-container van één scherm. Geen ontwerpbeslissing, wel een meting waard omdat `react-native-safe-area-context` in het browser-render-pad nul insets geeft — dit is per constructie niet in Storybook te zien, alleen op het toestel.
- **Eerste zet:** Een dekkend vlak ter hoogte van `insets.top` boven de scroll-container, of een header die meescrollt met een dekkende vulling. Verifiëren met `xcrun simctl io booted screenshot` ná scrollen, niet ervoor.
- **Check:** Screenshot van Profiel na scrollen — staat de systeemklok nog op de inhoud?
- **Status:** open

## 2026-09-14 — Icon.tsx is een dode primitive met een hardcoded kleur · [refactor]
- **Wat:** `components/Icon.tsx:12` heeft `color = '#FFFFFF'` als default-prop. Die waarde is exact `fg.onAccent`, dus het token bestaat — het wordt alleen niet geïmporteerd. Gemeten gevolg is vandaag nul: `<Icon>` wordt in **nul** app- en componentbestanden gebruikt; de enige referentie is de herexport in `components/index.ts:20`. Zelfde klasse als `PaceZone` (BACKLOG 2026-09-14, dood sinds F18).
- **Waarom niet nu:** Verwijderen vraagt bevestiging (CLAUDE.md-regel), en het hoort bij dezelfde opruimronde als `PaceZone` in plaats van los.
- **Eerste zet:** Samen met het `PaceZone`-item beslissen: weg, of in gebruik nemen. Bij weg: `components/Icon.tsx` en `Icon.stories.tsx` verwijderen, de barrel bijwerken, `tsc --noEmit`.
- **Check:** `grep -rln "from '@/components/Icon'\|<Icon " apps/rowtrack/app apps/rowtrack/components --include=*.tsx | grep -v stories` → leeg = nog steeds dood.
- **Status:** open

## 2026-09-14 — app.json dubbelt drie Android-BLE-permissies · [fix]
- **Wat:** `apps/rowtrack/app.json` somt `android.permissions` op met zes entries en drie unieke waarden: `BLUETOOTH`, `BLUETOOTH_ADMIN` en `BLUETOOTH_CONNECT` staan er elk twee keer.
- **Waarom niet nu:** Geen functioneel gevolg gemeten; het is opruimwerk in een configbestand, en configwijzigingen vragen bevestiging (CLAUDE.md-regel).
- **Eerste zet:** De drie duplicaten weghalen en een Android-build draaien om te bevestigen dat de permissielijst ongewijzigd uitkomt.
- **Check:** `grep -c BLUETOOTH apps/rowtrack/app.json` → 6 = nog gedubbeld.
- **Status:** open
