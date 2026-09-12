# Redactie- en code review — RowTrack

**Datum:** 2026-09-12
**Bereik:** `apps/rowtrack` — React Native + Expo (SDK 54), Supabase-backend. 16 746 regels TS/TSX in `app/`, `components/`, `lib/`, `i18n/`, `types/`, plus `supabase/` en `scripts/`.
**Type:** volledige app-review op twee assen — **redactie** (alle user-facing Nederlandse copy) en **code review** — niet een diff-review.
**Werkwijze:** 17 review-assen in drie parallelle workflows, elke bevinding daarna sceptisch getoetst tegen de bron (batch-verificatie), en elke zware bevinding nog een tweede, onafhankelijke lens. De hoofdagent heeft de P0's en P1's zelf nagemeten. Wat de verificatie niet overleefde staat in §7, wat niemand bekeken heeft in §8.

**Niet in bereik:** `apps/rowtrack-web` (aparte commerciële site) — met één uitzondering in §6, want die is dringend.

---

## 1. Samenvatting

De app is **goed gebouwd en uitzonderlijk goed gedocumenteerd**. De guard-laag doet wat hij belooft (§2), de BLE-code is defensief en verantwoordt zijn keuzes in commentaar, en `lib/auth.ts` classificeert foutsoorten met een precisie die je zelden ziet. Deze review vindt dan ook weinig slordigheid en veel *randen* — plekken waar een bewuste regel op één plaats wél en op de andere niet is toegepast.

Dat patroon is de rode draad, en het is één oorzaak in drie gedaanten:

1. **De toestemmingslaag gate't de schrijfactie, niet de bron.** Gezondheidsdata wordt gemeten, vastgehouden en getoond zonder toestemming; alleen het wegschrijven naar de database is afgeschermd. Vier symptomen, één oorzaak.
2. **De doeltoets gebruikt een andere grootheid dan het scherm.** Het scherm toont de gesmoothe waarde, de toets leest de rauwe — en de code documenteert dat onderscheid zelf, op de regel ernaast.
3. **`??` waar `||` hoort.** Twee plaatsen doen het goed mét geschreven motivering, drie doen het fout — en die drie maken de Nederlandse foutmeldingen van het inlogpad onbereikbaar.

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

**P1.** Fix: `||` op die drie regels. Dezelfde `catch (e: any)` zijn bovendien de enige vier `any`'s in gecommitte niet-testcode (gemeten: 4, geen enkele met `// TODO`), tegen de projectregel in.

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

Zie §3-A1. Dit is één regel op drie plaatsen en tegelijk de zichtbaarste redactiefout van de app.

### B6 · P1 — `fetchProfile` en de doel-read tonen een mislukte read als leegte

`profile.tsx:183` destructureert alleen `data`, niet `error`. Bij een netwerk- of RLS-fout staan naam, geslacht, geboortedatum, lengte en gewicht alle vijf op leeg of `—`, niet te onderscheiden van een leeg profiel. Idem `profile.tsx:123`: `usePeriodGoal` levert `loading` en `error`, maar het scherm leest alleen `goalProgress` en rendert bij een fout de *"stel een doel in"*-rij.

Dat is exact de verwisseling die `HANDOFF.md:426` als **F6** beschrijft en die op 2026-08-10 **alleen op Home** is gefixt. Home heeft nu de vier-uitkomsten-boom (`index.tsx:231-256`: skeleton / ErrorState+retry / kaart / CTA); Profiel heeft hem niet gekregen.

---
