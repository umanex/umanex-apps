# Redactie- en code review — RowTrack

**Datum:** 2026-09-12
**Bereik:** `apps/rowtrack` — React Native + Expo (SDK 54), Supabase-backend. 16 746 regels TS/TSX in `app/`, `components/`, `lib/`, `i18n/`, `types/`, plus `supabase/` en `scripts/`.
**Type:** volledige app-review op twee assen — **redactie** (alle user-facing Nederlandse copy) en **code review** — niet een diff-review.
**Werkwijze:** 17 review-assen in drie parallelle workflows, elke bevinding daarna sceptisch getoetst tegen de bron (batch-verificatie), en elke zware bevinding nog een tweede, onafhankelijke lens. De hoofdagent heeft de P0's en P1's zelf nagemeten. Wat de verificatie niet overleefde staat in §8, wat niemand bekeken heeft in §9.

**Niet in bereik:** `apps/rowtrack-web` (aparte commerciële site) — met één uitzondering in §7.3, want die is dringend.

---

## 1. Samenvatting

**222 bevindingen onderzocht, 214 overeind, 9 weerlegd (§8). Na mijn eigen hertriage: P0 1 · P1 25 · P2 98 · P3 90.** Tweeëndertig ervan staan al in `TODO.md`, `BACKLOG.md` of `HANDOFF.md` en zijn als bekend gemarkeerd.

Twee bevindingen kwamen als P0 uit de assen en zijn door mij verlaagd: `workouts.is_pr` en `workouts.max_spm` staan in geen enkel DDL-bestand terwijl de app ze schrijft en leest. Het codefeit klopt, maar de app draait — dus die kolommen bestaan live, met de hand aangemaakt buiten de migraties om. Dat is **drift**, geen crash, en het hoort bij de DDL-bevinding in §5. Eén bevinding is juist verhóógd tot de enige P0: de wis-actie op de toestemmingsgate (§4-B1).

De app is **goed gebouwd en uitzonderlijk goed gedocumenteerd**. De guard-laag doet wat hij belooft (§2), de BLE-code is defensief en verantwoordt zijn keuzes in commentaar, en `lib/auth.ts` classificeert foutsoorten met een precisie die je zelden ziet. Deze review vindt dan ook weinig slordigheid en veel *randen* — plekken waar een bewuste regel op één plaats wél en op de andere niet is toegepast.

Dat patroon is de rode draad, en het komt in vier gedaanten terug — bij alle vier staat het juiste antwoord al ergens in deze codebase:

1. **De toestemmingslaag gate't de schrijfactie, niet de bron.** Gezondheidsdata wordt gemeten, vastgehouden en getoond zonder toestemming; alleen het wegschrijven naar de database is afgeschermd. Vier symptomen, één oorzaak.
2. **De doeltoets gebruikt een andere grootheid dan het scherm.** Het scherm toont de gesmoothe waarde, de toets leest de rauwe — en de code documenteert dat onderscheid zelf, op de regel ernaast.
3. **"Laden" is een eindtoestand.** De BLE-laag draagt vier benoemde deadlines en legt drie keer uit waarom; de Supabase-laag heeft er één. Nergens anders een `AbortController` of `Promise.race`, dus elke hangende round-trip is een scherm dat niet meer terugkomt.
4. **`??` waar `||` hoort.** Twee plaatsen doen het goed mét geschreven motivering, drie doen het fout — en die drie maken de Nederlandse foutmeldingen van het inlogpad onbereikbaar.

De redactie-helft heeft geen P0 maar wel een consistent beeld: de stringtabel is zorgvuldig opgebouwd en van commentaar voorzien, en juist daarom vallen de afwijkingen op — vier woorden voor één ding, drie schrijfwijzen voor één eenheid, en een handvol meldingen die de gebruiker in het Engels bereiken.

---

## 2. Wat er staat, gemeten en niet afgeleid

Alles hieronder is uitgevoerd op deze tree, en waar een groene uitkomst iets moest bewijzen is de tegenproef er ook gedraaid — een instrument dat alleen kan slagen meet niets.

| Instrument | Uitkomst | Tegenproef |
|---|---|---|
| `tsc --noEmit` op `apps/rowtrack` | **exit 0**, 0 fouten | met een opzettelijke typefout: **exit 2**, fout op de juiste regel. Bestand daarna verwijderd en de tree geverifieerd schoon. |
| `node --test` (6 suites) | **57/57 groen** | — (de suites bevatten zelf tweezijdige gevallen) |
| `build-storybook` + `render:sweep` | **257 stories over 54 componenten, 0 console-fouten, 0 lege renders** | met één weggehaalde JS-chunk: **18 van 257 stories rood**. Chunk hersteld. |
| `parity:selftest` | exit 0 — 9 gevallen, controle groen, zes mutaties rood | is zelf de tegenproef |
| `laagnamen:selftest` | exit 0 — 5/5 | idem |
| `spec-diff:selftest` | exit 0 — controle 0 verschillen over 3 800 nodes, drie mutaties elk 1 | idem |
| `figma:poort:selftest` | exit 0 — 30/30, beide kanten | idem |
| `figma:check:selftest` | exit 0 — **49/49**, met één as expliciet overgeslagen | de as `producent` kan in CI niet draaien (`figma/build-spec.json` is gitignored) — het script meldt dat zelf |
| `pnpm audit --prod` | zie §6 | — |

**De claims in `CLAUDE.md` kloppen.** Steekproef op de Verify-pad-tabel: "257 stories over 54 componenten" → gemeten 257 en 54. "57 tests over 6 suites" → gemeten 57 en 6. Dat is zeldzaam en het is de reden dat de rest van dit document die tabel als betrouwbaar behandelt.

---
## 3. Deel A — Redactie

51 bevindingen onderzocht, 50 overeind, 1 weerlegd. **P1: 2 · P2: 24 · P3: 24.**

De stringtabel is goed opgezet: één bestand, commentaar bij de niet-evidente keuzes, functie-sleutels voor geparametriseerde zinnen, en een `Translations`-type dat een latere `en.ts` volledigheid afdwingt. De aanspreekvorm is over 468 regels consequent je-vorm — geen enkele u-vorm (gemeten). De fouten hieronder zijn dus randen, geen slordigheid.

### A1 · De Nederlandse foutmelding bereikt de gebruiker niet — drie schermen

`login.tsx:36`, `forgot-password.tsx:37` en `reset-password.tsx:71` doen alle drie:

```ts
setSubmitError(e.message ?? t.auth.login.failed);
```

`??` valt alleen terug op `null`/`undefined`. Een Supabase `AuthError` heeft altijd een `message`, dus `t.auth.login.failed` ('Inloggen mislukt.'), `t.auth.forgot.failed` en `t.auth.reset.failed` zijn **onbereikbaar**. Wie een verkeerd wachtwoord intypt leest *"Invalid login credentials"*; wie offline is leest *"Network request failed"*.

Dat dit een vergissing is en geen keuze, staat in dezelfde codebase op twee plaatsen:

- `i18n/bleErrors.ts:21` gebruikt `||` mét motivering: *"`||` (niet `??`): een lege BLE-message valt terug op de vaste melding"*.
- `register.tsx:58` gebruikt `raw || t.auth.register.failed` — correct.

**P1.** Dezelfde `catch (e: any)` zijn bovendien de enige vier `any`'s in gecommitte niet-testcode (gemeten: 4, geen enkele met `// TODO`), tegen de projectregel in.

> **Correctie, 2026-09-12 (na het schrijven van deze paragraaf).** Dit rapport stelde eerst `||` in plaats van `??` voor als fix. Dat is **onvoldoende**: `e.message` is in het normale geval een niet-lege string, dus `||` valt net zo min terug — de gebruiker leest nog steeds *"Invalid login credentials"*. `||` repareert alleen het lege-string-geval. De werkelijke fix is `e.message` helemaal niet tonen maar naar `reportError` sturen, en de Nederlandse zin tonen — met een aparte zin voor offline, want "Inloggen mislukt." zonder reden is precies het defect uit §3-A2. Zo is het gebouwd.

### A2 · Rauwe Engelse servertekst in de UI — vier andere plekken

Hetzelfde patroon, andere vorm:

| Plek | Wat de gebruiker leest |
|---|---|
| `i18n/bleErrors.ts:24,26` | `error.detail \|\| t.errors.rower.scanFailed` — het BLE-detail is Engels en wint; de NL-zin is de fallback. Andersom dan `scanError` op :20, dat het detail juist ín een NL-frame zet. |
| `profile.tsx:277` | `t.common.saveFailed(error.message)` interpoleert een Postgres-fout in *"Opslaan mislukt: …"* |
| `profile.tsx:362` | `setEmailError(updateError.message)` — geen fallback; lekt bovendien of een adres al bestaat, waar registratie daar juist een neutrale melding voor heeft (`failedNeutral`) |
| `lib/auth.ts:32` e.v. | `signIn`/`signUp` gooien ongeclassificeerd door, terwijl `deleteAccount` in hetzelfde bestand een voorbeeldige `classifyAuthError` heeft |

### A3 · Eén ding, meerdere namen

Telling over user-facing waarden in `nl.ts`:

- **Het object van een rit** heet *training* (13×), *rit* (5×), *workout* (3×) en *sessie* (2×). Op Home staan er twee onder elkaar: `index.tsx:309` rendert *"Recente trainingen"*, `:320` daaronder *"Nog geen workouts"*.
- **Het toestel** heet *roeitrainer* op vier plaatsen (`:134`, `:144`, `:289`, `:375`) en *roeier* op twee (`:151`, `:442`) — terwijl `:118` *roeier* voor de mens gebruikt (*"Goedemorgen, roeier"*). `:442` luidt daardoor letterlijk *"Controleer of de roeier aan staat"*.
- **De split-eenheid** kent drie schrijfwijzen: `500/m` (`:169`, `:178`), `/500M` (`:193`) en `/500m` (`:209`). De rest van de codebase staat consequent op `/500m` (`prDisplay.ts:30`, `history/[id].tsx:339`, `:349`), en `HANDOFF.md:267` legt díe vorm vast als bewuste keuze. `500/m` leest bovendien als "500 per meter" — de betekenis staat om.
- **Duur** kent drie vormen op Home: `formatDurationLabel` geeft *"1 u 5 min"*, `WorkoutCard.tsx:38` geeft *"1:05:30 uur"*, `GoalProgressCard.tsx:32` geeft *"1 u 5 min"*.
- **Afstand** kent twee: `formatDistance` rondt op 2 decimalen (*7,50 km*), `buildDistItems` op 1 (*7,5 km*) — beide zichtbaar op Home.

Kleinere gevallen: `'Totaal afstand'` (`:182`) naast `'Totale afstand'` (`:165`) in hetzelfde object · `'Totaal Kcal'` (`:184`) waar elk ander scherm `kcal` rendert · `'Email'` (`:292`) als enige van dertien e-mailvermeldingen zonder koppelteken · `'2000m'` (`:126`) naast `'2000 m'` (`:221`) · zes maal `...` tegen twee maal `…`, met **dezelfde string in beide vormen**: `'Verbinden...'` (`:152`) en `'Verbinden…'` (`:380`).

### A4 · Geen enkelvoud waar n=1 een normaal pad is

`nl.ts:205` bewijst dat het bestand meervoudslogica kent (`min === 1 ? 'minuut' : 'minuten'`). Drie zusters missen die:

- `splitFaster`/`splitSlower` (`:172`, `:173`) → *"Je bent 1 seconden sneller"*. `ActivePhase.tsx:199` vuurt bij één seconde verschil — dat is de meest voorkomende afwijking, niet de zeldzame.
- `remainingWorkouts` (`:371`) → *"1 trainingen resterend"*. Dat is de laatste stand vóór een periodedoel gehaald is.
- `workout-goals.ts:38` zet `unit: t.units.sessions` als vaste meervoudsvorm, dus de streefwaarde-wheel toont *"1 sessies"*.

### A5 · De claim boven de tabel klopt niet

`nl.ts:1` zegt *"the single source for every user-facing string"*. Gemeten: **41 user-facing literalen buiten de tabel, over 11 bestanden** — de hele eenhedenlaag (km, m, kcal, W, cm, kg, /500m, 2K) staat erbuiten, terwijl `units:` op `:26-33` wél u/uur/min/sec/sessies bevat. `GoalPill.tsx:48` zet `unit: 'min'` hardgecodeerd naast `:58` `unit: t.workout.active.goalUnitSplit` — beide kanten in één functie.

Dat is geen ramp, maar de kopregel maakt er een gebroken belofte van. Kies één van twee en schrijf hem op: de eenheden erbij halen, óf een comment dat SI-eenheden bewust locale-invariant blijven (en dan horen `minuteShort`/`hourShort` er juist uít).

### A6 · Documentatie

- **`README.md` is op vier van zes secties fout.** Tech Stack noemt **NativeWind** — niet in `package.json`, geen `tailwind.config`, geen `className=` in app-code, en `CLAUDE.md` zegt expliciet *"Preset: geen"*. "Aan de slag" zegt `npm install` in een pnpm-workspace. "Database" zegt *"Voer `supabase/schema.sql` uit om de tabellen aan te maken"* — dat schema mist dertien migraties en levert een database waarop de app niet draait. En "Design Tokens" zegt *"De bronwaarden staan in `constants/`"* — precies omgekeerd: elk bestand daar begint met `// Auto-generated by Style Dictionary — do not edit manually`, gegenereerd uit `tokens/tokens.json`. Die laatste is de gevaarlijkste: hij nodigt uit tot handmatig bewerken van gegenereerde bestanden.
- **`docs/privacybeleid.md` spreekt zichzelf tegen.** §2.5 (regel 116) is correct: *"Uitloggen wist dit alles. Zowel uitloggen als je account verwijderen ruimt de niet-verstuurde rit en de onthouden bluetooth-toestellen op"* — dat dekt `auth.ts:21-24` exact. Maar de bewaartermijnentabel in §7 zegt op regel 210 dat een niet-verstuurde rit blijft *"tot je je account verwijdert"* en op regel 211 dat onthouden toestellen blijven *"tot je de app van je telefoon verwijdert"*. Twee rijen, allebei fout, terwijl het juiste antwoord honderd regels hoger in hetzelfde bestand staat.
- **Commentaartaal is gemengd.** Gemeten over 103 bestanden: **1 100 ondubbelzinnig Nederlandse commentaarregels tegen 129 Engelse**, met **13 bestanden die beide dragen** (`bestDistanceTime.ts` NL 10 / EN 28, `formatters.ts` NL 8 / EN 10, `IdlePhase.tsx` NL 8 / EN 12). De globale regel in `.umanex-os/CLAUDE.md` schrijft Engels commentaar voor; de praktijk is 90% Nederlands. Root cause boven patch: dit los je niet op door 1 100 regels te vertalen, maar door de afwijking in `apps/rowtrack/CLAUDE.md` te declareren en de 13 gemengde bestanden gelijk te trekken.
- **Vijf onopgeloste `\uXXXX`-escapes staan als letterlijke tekst in commentaar** (`formatters.ts:128, 140, 149, 170, 181`): een lezer ziet `Eén bron` en `5–180 minutes` in plaats van `Één bron` en `5–180 minutes`. In commentaar worden escapes niet geïnterpreteerd.

---
## 4. Deel B — Code: de zware bevindingen

Alles in deze paragraaf is door de hoofdagent zelf nagelezen in de bron, niet alleen door een review-agent gemeld.

### B1 · P0 — Weigeren op het toestemmingsscherm wist onaangekondigd alle bestaande gezondheidsdata

`app/(tabs)/_layout.tsx:116`:

```tsx
<HealthConsentScreen visible={!loading && consent === null} onGrant={grant} onDecline={revoke} />
```

`revoke()` (`health-consent-context.tsx:95-107`) roept `revoke_health_consent()` aan. Die RPC (`migrations/add_health_consent.sql:50-75`) nult `gender`, `birth_date`, `height_cm` en `weight_kg`, knipt het derde element uit élke `samples`-tuple van de gebruiker, en nult `avg_heart_rate`/`max_heart_rate` op al zijn ritten. Onomkeerbaar.

Het commentaar boven `ConsentGate` zegt zelf waarom dit een bestaand account raakt: *"Toont het toestemmingsscherm zolang er geen keuze vastligt — ook op een bestaand account, want daar staat de data die nog geen grondslag heeft."* Een gebruiker met maanden hartslaghistoriek krijgt dit scherm dus één keer te zien, en één tik op **"Nee, zonder deze gegevens"** wist die historiek. Zonder bevestiging, zonder waarschuwing.

De knoptekst dekt dat niet: *"zonder deze gegevens"* leest als *verdergaan zonder ze te verzamelen*, niet als *wis wat er al staat*. En de app heeft de juiste copy en het juiste patroon al — vanuit Profiel gaat dezelfde RPC via `t.consent.revokeTitle` / `revokeBody` (*"Je hartslag wordt uit al je opgeslagen ritten gewist … Dit kan niet ongedaan gemaakt worden."*) / `revokeConfirm`, mét `Alert`-bevestiging (`profile.tsx:418-438`).

Het gedrag zelf is verdedigbaar — wie weigert, wil die verwerking niet. Het defect is dat het onaangekondigd en onbevestigd gebeurt terwijl het alternatief twintig regels verderop al bestaat.

**Fix:** dezelfde `Alert` vóór `revoke` op de gate, of de keuze splitsen in *"niets meer verzamelen"* en *"ook wissen"*.

### B2 · P0 — De toestemmingsgate zit op de schrijfactie, niet op de bron

Eén oorzaak, vier symptomen. `lib/hooks/useWorkoutMetrics.ts` kent het begrip toestemming niet: `grep -c "healthGranted\|consent"` geeft **0**. Hij accumuleert hartslag uit twee bronnen (`:266-268`):

```ts
const hr = (hrBpm != null && hrBpm > 0) ? hrBpm
  : (bleMetrics.heartRate != null && bleMetrics.heartRate > 0) ? bleMetrics.heartRate : null;
```

De tweede bron is de FTMS-hartslag van de erg zelf (`ftms-parser.ts:122`, doorgegeven als `hr` op `:157`) — die heeft geen borstband en dus geen enkele knop nodig.

| Laag | Gegate? | Bewijs |
|---|---|---|
| Meten en accumuleren | **nee** | `useWorkoutMetrics.ts:266-271` |
| HR-knop in de idle-fase | ja | `workout.tsx:321` `onHRConnect={healthGranted ? startHRScan : noop}` |
| HR-knop in de active-fase | **nee** | `workout.tsx:368` `startHRScan={startHRScan}` |
| Samenvattingswaarden | **nee** | `workout.tsx:302`, `:306` — geen `healthGranted` |
| Wegschrijven naar de database | ja | `workout.tsx:144`, `:187`, `:190` |
| Lokaal geparkeerde rit bij intrekken | **nee** | `revoke()` raakt alleen Postgres |

Dat laatste is het scherpst. Faalt de insert (`workout.tsx:228`), dan schrijft `savePendingWorkout(row)` de volledige rij — inclusief `[t,d,hr]`-samples en `avg/max_heart_rate` — naar AsyncStorage. Trekt de gebruiker daarna toestemming in, dan wist de RPC de server; de lokale slot blijft staan en `runDrain` (`pendingWorkout.ts:112`) schrijft hem later alsnog terug. `purgePendingWorkout()` bestáát en draait al bij uitloggen en verwijderen (`auth.ts:21-24`) — alleen niet bij intrekken.

Netto voor wie weigerde: op een erg met hartslagsensor wordt zijn hartslag gemeten, vastgehouden en op de samenvatting getoond, terwijl `nl.ts:413` belooft *"alleen je hartslag en lichaamsgegevens blijven weg"*. Niet weggeschreven — dat scheelt, en dat is waarom dit P0/P1 is en geen datalek.

**Fix (root cause):** de gate één laag dieper. `useWorkoutMetrics` een `healthGranted`-parameter geven die de accumulatie én het derde sample-element overslaat; `ble-context.startHRScan` de check zelf laten doen zodat geen call-site hem kan missen; en `revoke()` de lokale slot laten opruimen.

### B3 · P1 — Een doel is bereikt bij het eerste pakket, en de rit stopt dan meteen

`lib/workout-goals.ts:143-145`:

```ts
case 'watts': {
  const current = metrics.avgWatts;          // = wattsSum / wattsCount
  return { …, reached: current >= target };
}
```

Bij het eerste pakket met vermogen is `wattsCount === 1`, dus `avgWatts` is die ene haal. Eén harde start van 200 W op een doel van 150 W zet `reached`, en `workout.tsx:288-296` slaat de rit dan op en verbreekt de erg — na een paar seconden roeien.

Het splitdoel heeft dezelfde vorm én een tweede probleem: `:136` toetst `metrics.splitSeconds`, en dat is de **rauwe** `instantaneousPace` (`useWorkoutMetrics.ts:203`). Het scherm toont `splitSmoothed` (`:211`). De code documenteert dat onderscheid zelf op `useWorkoutMetrics.ts:26-27`: *"Gesmoothe huidige waarden (EMA) — enkel voor live weergave. De rauwe watts/spm/splitSeconds hierboven blijven de bron voor opslag/accumulatie."* De doeltoets nam stilzwijgend de rauwe tak.

Er is geen minimum-ticks-poort op dit pad. Die bestaat elders wél: `MIN_PR_TICKS = 10` (`workout.tsx:16`) voor records, `tickCount.current < 5` (`useGoalProgress.ts:105`) voor de paceZone.

**Fix:** de doeltoets op dezelfde grootheid als de weergave, plus een volgehouden conditie (N opeenvolgende ticks) of een warmup-drempel in dezelfde vorm als `MIN_PR_TICKS`.

### B4 · P1 — Een font-laadfout laat de app voorgoed op de splash staan

`app/_layout.tsx` toont `null` zolang `fontsLoaded` false is, en verbergt de splash alleen wanneer hij true wordt. Getoetst aan de geïnstalleerde bron (`expo-font@14.0.12`, `build/FontHooks.js`): bij een afgewezen `loadAsync` draait **alleen** `setError` — `loaded` blijft voorgoed `false`.

De `console.warn` ernaast staat achter `if (fontError && __DEV__)`, dus in productie is er geen signaal. Het commentaar erboven zegt letterlijk dat de log er is *"zodat een kapot/ontbrekend font-asset zichtbaar is i.p.v. een eeuwige splash"* — precies de toestand die in een release-build overblijft.

Er is bovendien nergens een React error boundary (`grep` op `ErrorBoundary|componentDidCatch|ErrorUtils` over `app/`, `components/`, `lib/`: **0 treffers**), en `lib/monitoring.ts` `reportError` is in productie een no-op met **24 aanroepplaatsen**. Een crash of laadfout in productie is dus onzichtbaar én onrapporteerbaar. Dat laatste is bekend (`HANDOFF` 2026-07-15, security-audit P2-3), het eerste niet.

### B5 · P1 — De Nederlandse foutmelding van het inlogpad is dode code

Zie §3-A1, inclusief de correctie op de voorgestelde fix. Dit is één regel op drie plaatsen en tegelijk de zichtbaarste redactiefout van de app.

### B6 · P1 — `fetchProfile` en de doel-read tonen een mislukte read als leegte

`profile.tsx:183` destructureert alleen `data`, niet `error`. Bij een netwerk- of RLS-fout staan naam, geslacht, geboortedatum, lengte en gewicht alle vijf op leeg of `—`, niet te onderscheiden van een leeg profiel. Idem `profile.tsx:123`: `usePeriodGoal` levert `loading` en `error`, maar het scherm leest alleen `goalProgress` en rendert bij een fout de *"stel een doel in"*-rij.

Dat is exact de verwisseling die `HANDOFF.md:426` als **F6** beschrijft en die op 2026-08-10 **alleen op Home** is gefixt. Home heeft nu de vier-uitkomsten-boom (`index.tsx:231-256`: skeleton / ErrorState+retry / kaart / CTA); Profiel heeft hem niet gekregen.

---
### B7 · P1 — "Laden" is een eindtoestand: geen enkele Supabase-aanroep heeft een deadline

Dit is de tweede oorzaak met veel symptomen, en de codebase weet het antwoord al. De BLE-laag draagt **vier** benoemde deadlines — `ADAPTER_READY_TIMEOUT_MS`, `SCAN_TIMEOUT_MS`, `KNOWN_CONNECT_TIMEOUT_MS`, `HR_DATA_TIMEOUT_MS` — en `ble-service.ts` legt drie keer in commentaar uit waaróm: *"zonder timer bleef de rij dán voorgoed op 'Zoeken…' staan met een uitgeschakelde knop — geen fout, geen uitgang, alleen een app-herstart."*

De Supabase-kant heeft er precies **één**: `DELETE_TIMEOUT_MS` op `deleteAccount` (`lib/auth.ts:52`). Gemeten over `app/`, `lib/` en `components/` buiten `lib/ble/`: geen tweede `TIMEOUT`, geen `AbortController`, geen `Promise.race`.

Gevolg per plek:

| Plek | Wat er blijft staan |
|---|---|
| `index.tsx:117` | `await drainPendingWorkout(user.id)` staat vóór de reads en vóór `setLoading(false)` (`:161`). Hangt de drain, dan blijft Home op zijn laadtoestand — en `onRefresh` (`:173-176`) wacht op dezelfde gedeelde `drainInFlight`-promise, dus pull-to-refresh hangt mee. |
| `workout.tsx:207` | `savedRef.current = true` staat op `:127`, vóór de await; `savePendingWorkout(row)` pas op `:227`, achter `if (error …)`. Een app-kill tijdens de round-trip verliest de rit volledig — er bestaat op dat moment geen lokale kopie. |
| `health-consent-context.tsx:79` | Toestemming opslaan zonder deadline zet de hele app achter een modal die niet te sluiten is. |
| `auth-context.tsx:31` | `supabase.auth.getSession().then(…)` zonder `.catch` — een gooiende SecureStore-lezing laat `isLoading` staan, en `RootNavigator` redirect dan nooit. |
| `usePeriodGoal.ts:62`, `usePrHistory.ts:42` | "laden" is een eindtoestand; de `ErrorState` die er wél is, is onbereikbaar. |

Het venijn zit in de samenloop: de drain draait *alleen* wanneer er een geparkeerde rit is, en die bestaat *juist* wanneer het netwerk al haperde. De faalmodus selecteert zijn eigen voorwaarde.

**Fix:** één helper die elke Supabase-round-trip in een `Promise.race` met een deadline zet, in dezelfde vorm als `DELETE_TIMEOUT_MS` — en de pending-slot schrijven **vóór** de insert in plaats van erna.

---

## 5. Deel B — de overige code-bevindingen

76 bevindingen onderzocht in de kern-groep, 72 overeind, **4 weerlegd**. Alle vier op de gevolgketen, niet op het codefeit — dat is de juiste vorm van weerleggen (zie §8).

### Per as, samengevat

**BLE-roeier** — behalve de twee P1's uit §4: `startMonitoring` overschrijft een lopend abonnement zonder het te verwijderen terwijl de transactionId een vaste string is (`:524`); een 403 op beide characteristics laat abonnement én verbinding staan (`:547`); `connectKnown` negeert de `isConnecting`-poort (`:127`); de 2 s-fallbacktimer abonneert op het toestel van tóén (`:537`). Plus: **`ftms-parser.ts` en `ble-service.ts` — de twee grootste faalbronnen van de app — hebben geen enkele test**, terwijl `parseRowerData` puur is en elk getal draagt dat de roeier ziet.

**BLE-hartslag** — een band die stilvalt krijgt geen herstelpoging waar een GATT-disconnect er drie krijgt (`hr-service.ts:682`); `connectToDeviceById` toetst het generatie-token niet (`:397`); `HrStatusBar` mist de error-tak die `BleStatusBar` wél heeft; de `BleContext`-provider-value is een verse objectliteral per render.

**Rekenlogica** — dezelfde rit toont twee verschillende gemiddelde splits in samenvatting en historiek (`useGoalProgress.ts:83`); de samenvatting toont `0` en `0:00` waar de rit `null` opslaat en de detailpagina `—` toont; de PR-drempel telt BLE-pakketten in plaats van tijd en is met een hartslagband ongeveer twee keer zo zwak (`workout.tsx:159`); `calculateCalories` heeft geen ondergrens op het gewicht (0 kg → `NaN`); de live timer rolt niet naar uren terwijl de samenvatting van dezelfde rit dat wél doet.

**Hooks en state** — `refs` is bij elke render een nieuw object, dus elke `useMemo` in `useGoalProgress` cachet nooit en de countdown-`Animated.loop` herstart per render; profielgewicht wordt na de eerste read nooit ververst en een mislukte her-read wist het; `usePeriodGoal` en `useRecentGoals` hebben geen volgorde-guard, dus de traagste van twee fetches wint.

**Auth** — de recovery-deep-link wordt zonder pad- of herkomstbinding tot sessie gepromoveerd (`reset-password.tsx:38`); de SecureStore-probe vangt élke fout af en zet de app voor de rest van de sessie stil op platte opslag (`secureStorage.ts:107`); een oude platte sessie in AsyncStorage wordt na de migratie naar SecureStore nooit gewist (`:175`); `completePasswordReset` laat bij netwerkfout precies de recovery-sessie staan die zijn eigen commentaar zegt op te ruimen.

**Backend en data** — hier zit het scherpste na §4:

- **`supabase/schema.sql` is niet meer uitvoerbaar als opbouwpad.** `add_workout_goals.sql` botst met `schema.sql` en breekt een verse opbouw halverwege af. De kolommen `max_spm` en `is_pr` worden door **geen enkel** SQL-bestand aangemaakt. En `README.md` verwijst wél naar dit bestand als de manier om de database op te zetten.
- `delete-account` doet geen server-side her-authenticatie — de wachtwoordcheck zit alleen in de client (`auth.ts:120`). Wie een geldig token heeft, kan de functie rechtstreeks aanroepen.
- `add_period_goals.sql` is half idempotent: de `ADD CONSTRAINT` faalt bij een tweede run.
- `revoke_health_consent()` laat `profiles.age` staan, terwijl `add_profile_body_metrics.sql` die kolom in dezelfde migratie aanmaakt als de vier die wél gewist worden.
- Drie overlappende indexen op `workouts(user_id, started_at)`; `workout_intervals` is dode oppervlakte zonder UPDATE-policy.
- `CLAUDE.md:746` telt elf migraties, er staan er twaalf op schijf.

**Positief, en het verdient vermelding:** de RLS zelf houdt. Elke policy is aan `auth.uid()` gebonden, `handle_new_user` is gehard met `search_path = ''`, en `revoke_health_consent()` haalt de user-id uit `auth.uid()` en niet uit een argument — met een comment dat precies uitlegt waarom een parameter daar een gat zou zijn. Er is geen IDOR gevonden.

---
## 6. Deel B — het schermoppervlak

95 bevindingen onderzocht, 92 overeind, 3 weerlegd.

**Profiel en Home.** Het profielscherm is met 1 004 regels het grootste bestand van de app en draagt de meeste bevindingen. Naast de twee leesfouten uit §4-B6: `handleEmailChange` (`:342`) mist de `try/catch/finally` die zijn twee buren wél hebben mét motivering, waardoor `emailChanging` bij een keychain-fout voorgoed op `true` blijft en de knop de rest van de sessie een spinner is. De dag-wheel telt altijd 31 dagen (`:57`), dus 31 februari is kiesbaar en Opslaan toont de rauwe Postgres-fout `22008`. De returntoets op het wachtwoordveld van *Account verwijderen* (`:837`) is rechtstreeks aan `handleDeleteAccount` gehangen — terwijl dezelfde toets in de e-mailsheet negen regels eerder wél achter een validatiepoort zit; "Gereed" op het toetsenbord leest niet als "verwijder mijn account definitief". En na een `uncertain`-verwijdering levert de door de copy aanbevolen tweede poging *"Wachtwoord klopt niet"* op, omdat het account dan al weg is en `classifyAuthError` een 400 op een niet-bestaande gebruiker als `wrong_password` leest.

**Trainingsflow.** Terugkeren uit de achtergrond tijdens de viering verbindt de erg opnieuw en laat de metrics doorlopen ná de opgeslagen rit (`workout.tsx:256`) — de fase blijft `active` bij doel bereikt, dus de `AppState`-listener staat nog aan. De live BPM-tegel leest alleen `hrBpm` (`ActivePhase.tsx:279`) terwijl de accumulator óók de FTMS-hartslag pakt: wie zijn band aan de erg koppelt ziet de hele rit `—` en tikt daar dus op — precies de knop uit §4-B2. En bij de tweede rit toont de doel-wheel de standaardwaarde terwijl Start het doel van de vorige rit gebruikt (`IdlePhase.tsx:113`): `workout.tsx:76-83` schrijft de vorige keuze terug in de parent-state, maar `IdlePhase` wordt bij elke fasewissel ge-unmount en start op `DEFAULT_DUR_IDX`. `goalTargetToWheelIndex` bestaat al en doet precies wat hier nodig is.

**Toegankelijkheid** is de zwakste as, en dat is zichtbaar consistent: `WheelPicker` — het enige invoermiddel voor de doelwaarde én voor lengte, gewicht en geboortedatum — heeft **nul** accessibility-props en is met VoiceOver niet te bedienen; beide schakelaars in het profiel zijn naamloos (de rol komt uit React Native zelf, de naam niet); `Chip` mist de `accessibilityRole` en `selected`-state die zijn twee zusters `Segmented` en `GoalSegments` wél dragen; de auth-links missen `accessibilityRole="link"` en zijn ±18 pt hoog tegen de 44 pt-norm; `KpiRow` heeft een vaste hoogte van 56 met een 28 px-cijfer en geen `maxFontSizeMultiplier`, terwijl elk ander component met vaste hoogte die cap wél zet. En de app reageert nergens op *verminder beweging*: `MotivationalToast` laat 60 deeltjes oneindig vallen tot er getikt wordt, want de viering heeft bewust geen auto-dismiss.

**Token-discipline is juist goed** — dat verdient vermelding, want de meting weerlegde de verwachting. Gemeten: 12 hexwaarden over 5 bestanden, waarvan 5 in commentaar; 7 in echte code, geconcentreerd in `Icon.tsx:12` en de decoratieve `CONFETTI_COLORS`; 11 `rgba(`; nul `hsl(`. Beide echte gevallen staan al in `TODO.md`. Wat er wél zit is subtieler: 22 layoutgetallen in `profile.tsx` waar de rol bestaat, 34 met de hand opgebouwde tekststijlen in `WheelPicker` waarvan er vier letterlijk gelijk zijn aan een bestaande `typeStyle`, en 11 van de 31 `TouchableOpacity`'s zonder `activeOpacity` — die dimmen naar 0.2 in plaats van de voorgeschreven 0.8.

**Tooling** — behalve §7.1: de BLE-plugin krijgt geen `neverForLocation`, dus de app vraagt op Android 12+ locatietoestemming die ze niet nodig heeft (`app.json:48`). De token-drift-guard in CI diff't `packages/tokens/build` maar niet het even goed herbouwde `apps/rowtrack/constants`. En tien imports in `ActivePhase.tsx` zijn nergens meer gebruikt — wat niemand ziet, omdat er geen lint draait.

---

## 7. Dependencies en CI

### 7.1 ·  Rowtrack is de enige app zonder `type-check` en zonder `lint`

`apps/rowtrack/package.json` heeft 28 scripts en geen van beide. De CI-stap in `.github/workflows/ci.yml:43` draait `pnpm turbo type-check lint build`, dus turbo slaat rowtrack over — voor alle drie de taken. Van de acht apps in de monorepo is dit de enige zonder allebei (gemeten over `apps/*/package.json`).

De code is er niet slechter van geworden: `tsc --noEmit` is vandaag groen. Maar er is niets dat het morgen tegenhoudt, en 16 746 regels zijn precies het oppervlak waar dat gaat schuiven. **Fix:** `"type-check": "tsc --noEmit"` toevoegen; dat is één regel en turbo pikt hem vanzelf op.

Ruimer beeld: van de guards die het Verify-pad in `CLAUDE.md` opsomt — `figma:check`, `parity`, `beeld`, `spec-diff`, `laagnamen`, `render:sweep`, plus hun zelftests — draait er **geen enkele** in CI. Ze zijn alle acht groen (§2), maar ze draaien alleen wanneer iemand eraan denkt. Dat is precies de norm die deze repo elders zelf stelt: *"een test die alleen draait wanneer iemand eraan denkt, meet niets"* (`ci.yml:69`).

### 7.2 ·  `app.json`: de permissielijst is volledig overbodig

`android.permissions` bevat zes regels: `BLUETOOTH`, `BLUETOOTH_ADMIN` en `BLUETOOTH_CONNECT`, elk **twee keer**. `TODO.md:67` heeft dit als open item met als fix "duplicaten verwijderen".

De echte oorzaak ligt een laag dieper. De config-plugin voegt diezelfde drie zelf al toe — `node_modules/react-native-ble-plx/plugin/build/withBLE.js:25-27` — en `withBLEAndroidManifest.js:51-62` voegt daarnaast `BLUETOOTH_SCAN` toe plus de locatiepermissies. De hele array in `app.json` is dus redundant, niet alleen de duplicaten. **Fix:** de array weghalen, niet ontdubbelen.

*(Bijvangst uit dezelfde controle: `BLUETOOTH_SCAN` ontbreekt niet, ook al staat hij niet in `app.json` — de plugin injecteert hem. Dat vermoeden is dus weerlegd vóór het in dit rapport kwam.)*

### 7.3 · Kwetsbare dependencies — nauwkeurig gescheiden

`pnpm audit --prod` over de monorepo geeft 4 critical, 65 high, 35 moderate, 5 low. Voor `apps/rowtrack` afzonderlijk: **2 critical, 37 high, 17 moderate, 3 low distincte adviezen** — meer dan elke andere app (die zitten op 10-11 high).

Dat getal is misleidend zonder de ontleding. Alle adviezen bereiken rowtrack via de **Expo/Metro-bouwketen** (`@expo/cli` en zijn boom): `shell-quote`, `tar`, `@xmldom/xmldom`, `browserslist`, `postcss`, `js-yaml`, `image-size`, `nanoid`, `undici`, `ws`, `brace-expansion`, `@babel/core`. Gemeten: **geen enkel app-bestand importeert een van deze pakketten rechtstreeks** (grep over `app/`, `components/`, `lib/`, `i18n/`, `types/` op `from '<pkg>'` en `require('<pkg>')`: nul treffers). Metro bundelt alleen wat geïmporteerd wordt, dus dit is bouwgereedschap, geen app-oppervlak.

Eén uitzondering verdient een blik: `ws` komt óók binnen via `@supabase/supabase-js`, en dat pakket wordt wél gebundeld. In React Native gebruikt supabase-js de native WebSocket, dus waarschijnlijk raakt het de bundel niet — maar dat is een gevolgtrekking, geen meting. `[NIET GEMETEN — vereist een bundel-analyse van een echte build]`

**Buiten bereik maar dringend:** de vier critical-adviezen op `next` treffen zeven Next.js-apps, waaronder **`apps/rowtrack-web`** op `next: "^14"` (opgelost in ≥ 15.5.24). Eén daarvan is *Unauthenticated Remote Code Execution in de Image Optimization API bij AVIF-bestanden* (CWE-1395) — die geldt ook op Linux, dus ook op Vercel. Dit valt buiten de scope van deze review, maar het is de enige bevinding in dit document die vandaag een draaiende, publiek bereikbare server raakt.

---
## 8. Wat de verificatie niet overleefde

Negen beweringen zijn gesneuveld: acht in de verificatieronde, één door mijn eigen meting. Ze staan hier omdat een review zonder deze lijst niet te wegen is.

| Bewering | Waarom ze viel |
|---|---|
| De viering-emoji is nergens als keuze vastgelegd | Ze is dat wél; het bestand en een briefing leggen hem vast |
| Na een preemptie stopt de dienst zijn eigen native scan nooit | Codefeit juist, gevolgketen niet: `SCAN_TIMEOUT_MS` (15 s) ligt onder `MAX_HOLD_MS` (25 s), dus het venster bestaat niet |
| `dev-ble` geeft de hr-gate niet door | Codefeit juist, gevolg onmogelijk: `opts?.hr === false` is de enige poort en `undefined` valt daar niet in |
| `usePrHistory` deelt zijn in-flight fetch zonder userId-toets | Vereist een gebruikerswissel tijdens een vlucht; dat pad bestaat niet |
| `useSpmHalved` houdt de instelling van de vorige gebruiker vast | Vereist dat de hook-instantie een gebruikerswissel overleeft; dat doet ze niet |
| Slagtotaal wordt gehalveerd door de SPM-correctie | De gedocumenteerde grond van de toggle is dubbel *tellen*, niet een rate-artefact |
| Detailscherm haalt de volledige historiek op vóór de rit | Gedocumenteerde, bewust uitgestelde afweging — de bevinding citeerde haar eigen weerlegging |
| Hex-telling wijst op token-drift | De telling klopt maar is klein en grotendeels commentaar; dit is een gezonde as |
| Het `test`-script mist de strip-types-vlag die CI wél zet | **Zelf gemeten:** `npm run test` geeft 57/57 op Node 22.22.2 zónder de vlag. `ci.yml:77` schrijft zelf al dat hij op nieuwere versies "een geaccepteerde no-op" is |

Alle negen vielen op de **gevolgketen**, niet op het codefeit. Dat is het patroon om te onthouden: de assen zagen de code goed en overschatten wat eruit volgt.

---

## 9. Wat niemand bekeken heeft

Geen stille afkappingen. De volledigheidscritici noemden negen gaten; drie zijn nagelopen (de auth-foutafhandeling, het privacybeleid en de `supabase/`-map — alle drie leverden bevindingen op). Deze zes staan open:

1. **Alle transactionele e-mailcopy.** Wachtwoordreset, e-mailwijziging en bevestiging hebben nergens in de repo een bron — geen `supabase/config.toml`, geen templates-map. Dat is dus de Supabase-default, in het Engels, en het is het enige copy-kanaal dat de app verlaat.
2. **De gesproken copy.** Wat VoiceOver voorleest is nooit als redactie-oppervlak bekeken; `t.a11y` telt drie strings voor de hele app, de rest wordt uit visuele afkortingen samengesteld (`SPM`, `GEM`, `PIEK`, `/500M`).
3. **Geheugen en payload over een lange rit.** De `samples`-array groeit onbegrensd op ~1 Hz en gaat in zijn geheel drie keer door het systeem. Een rit van twee uur is 7 200 punten.
4. **De Storybook-mocklaag.** Elke render-, parity-, beeld- en Figma-guard staat erop, en geen enkele as heeft hem bekeken. Hij kan per constructie geen fout- of laadtoestand tonen.
5. **Dependency-versies.** `.storybook/main.ts` leunt op interne implementatiedetails van vite 8.2.2 terwijl `package.json` `"vite": "^8"` zegt.
6. **Offline en trage verbinding als eigen faalklasse.** §4-B7 dekt de deadline-kant, maar niemand heeft de 24 Supabase-aanroepen systematisch op netwerkdetectie en herstel doorgelopen.

Verder buiten bereik gebleven, bewust: `apps/rowtrack-web` (39 bestanden, eigen `type-check` en `lint`), de Figma-keten zelf, en de 24 scripts in `scripts/` — die zijn wél gedraaid (§2) maar niet gereviewd.

---

## 10. Wat ik eerst zou doen

1. **`_layout.tsx:116`** — de `Alert` uit `profile.tsx:418-438` vóór `revoke` op de consent-gate. Kleinste diff, grootste gevolg: het stopt onomkeerbaar dataverlies op één tik.
2. **De rauwe Engelse melding niet tonen** op `login.tsx`, `forgot-password.tsx` en `reset-password.tsx`: `e.message` naar `reportError`, de Nederlandse zin naar het scherm, en een aparte zin voor offline. (Niet `||` in plaats van `??` — zie de correctie in §3-A1.)
3. **`"type-check": "tsc --noEmit"`** in `package.json`. Eén regel; turbo pikt hem vanzelf op en CI dekt vanaf dan 16 746 regels die hij nu overslaat.
4. **De consent-gate naar de bron** — `useWorkoutMetrics` een `healthGranted`-parameter, de check in `ble-context.startHRScan`, en `revoke()` de lokale slot laten opruimen. Dat sluit vier symptomen met één ingreep.
5. **Een deadline-helper** rond elke Supabase-round-trip, in de vorm van `DELETE_TIMEOUT_MS`, plus de pending-slot schrijven vóór de insert.
6. **De doeltoets** op `splitSmoothed` en achter een minimum-tickspoort in de vorm van `MIN_PR_TICKS`.
7. **`README.md` en `docs/privacybeleid.md` §7** — goedkoop, en het zijn de twee documenten die een nieuwe lezer als eerste vertrouwt.

Punt 1 tot en met 3 zijn samen minder dan twintig regels diff.

---

## 11. Wat er in dezelfde ronde gefixt is

Besluit Jeroen, 2026-09-12, op vier voorgelegde keuzes. Wat hieronder staat zit in deze branch; de rest van dit rapport staat nog open.

**De P0.** `app/(tabs)/_layout.tsx` — de `Alert` uit `profile.tsx` staat nu vóór `revoke`, met dezelfde copy (`t.consent.revokeTitle` / `revokeBody` / `revokeConfirm`). Het contract van `HealthConsentScreen.onDecline` is verbreed naar `Promise<boolean | null>`: `null` betekent "bevestiging afgebroken", zodat annuleren niet als mislukte opslag leest en de foutmelding toont. Getoetst aan de geïnstalleerde bron dat `Alert.alert` zonder opties `cancelable: false` zet (`react-native/Libraries/Alert/Alert.js:90`) — de belofte kan dus niet onopgelost blijven doordat iemand de dialoog wegtikt. *Ruwe rand, bewust blijven staan:* de titel luidt "Toestemming intrekken" terwijl de gebruiker op de gate weigert in plaats van intrekt, en een vers account heeft niets om te wissen.

**Het auth-foutpad.** `e.message` verdwijnt van het scherm op alle vier de auth-schermen; het detail gaat naar `reportError`, de gebruiker krijgt de Nederlandse zin, en offline krijgt een eigen zin (`t.auth.offline`) via de nieuwe `isOfflineAuthError` — dezelfde duck-typing die `classifyAuthError` al deed. Daarmee zijn ook de vier `any`'s weg: `catch (e: unknown)`.

**Terminologie.** Eén woord voor het object: *training*. Gewijzigd in `nl.ts` (home, historiek, detail, doelen, consent- en verwijdercopy) en in `docs/privacybeleid.md` (19 voorkomens). `'Je sessie is verlopen'` blijft staan — dat gaat over de loginsessie, een ander referent.

**Eenheden.** De `units`-laag draagt nu ook `meter`, `kilometer`, `watt`, `kcal`, `centimeter`, `kilogram`, `per500m`, `workouts` en `workoutCount(n)`. Dertig call-sites over tien bestanden zijn erop gezet; `GoalPill` hardcodeerde `'min'` náást een sleutel uit de tabel, dat is nu één bron. De kopregel van `nl.ts` klopt daarmee voor het eerst.

**Commentaartaal.** De afwijking staat gedeclareerd in `CLAUDE.md` → *Conventies* → *Code*, met de meting als grond. De gemengde bestanden zijn van **14 naar 0**; de tien regels die de meter nog aanwijst zijn Nederlandse zinnen met een Engelse vakterm of een geciteerde foutmelding erin (`value`, `user-id`, `"User interaction is not allowed"`) — die hoor je niet te vertalen. Engelse commentaarregels: van 129 naar 56.

**Losse fixes.** `formatSplit` rondt eerst af op hele seconden en rolt dus door naar de volgende minuut (`8:60` → `9:00`) · `"type-check": "tsc --noEmit"` in `package.json`, zodat turbo de app niet meer overslaat · `README.md` herschreven op de vier foute secties · de bewaartermijnentabel in `docs/privacybeleid.md` §7 gelijkgetrokken met §2.5 en met `auth.ts:21-24` · de vijf `\uXXXX`-escapes in commentaar · de migratietelling in `CLAUDE.md` (11 → 12) · de KPI-stories die de oude copy kopieerden.

**Verificatie na de wijziging**, dezelfde instrumenten als §2: `tsc --noEmit` **exit 0** · `node:test` **57/57** · `build-storybook` + `render:sweep` **257/257, geen console-fout, geen lege render** — dezelfde uitkomst als de baseline, op een instrument waarvan §2 bewijst dat het rood kan worden.

**Niet gefixt, en waarom.** De diepe gedragsfixes uit §10 punt 4 tot 6 — de consent-gate naar de bron, de deadline-helper, de doeltoets op de gesmoothe waarde — vragen een toestel om te toetsen (`xcrun`, Maestro), en dat is hier niet beschikbaar. Ze schrijven zonder ze te kunnen meten maakt er aannames van. Ook open: de zeven Next-apps (zie §7.3) — er is **geen 14.x-patch**, dus dat is een major van 14 naar ≥ 15.5.24 over zeven productie-apps, geen bump. Gemeten: alle zeven staan op `^14`, zes gebruiken `next/image` en geen enkele zet de optimizer uit. `images.unoptimized` is géén mitigatie voor zover ik kon vaststellen: het houdt de eigen componenten van het endpoint af (`get-img-props.js:234`), maar ik vond geen server-side gate die `/_next/image` zelf sluit.
