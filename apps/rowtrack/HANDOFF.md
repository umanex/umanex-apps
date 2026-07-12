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
    - **Volgende zet:** {concreet actiepunt of "-"}
    - **Status:** open

<!-- De sessie-reflectie skill voegt hieronder de juiste laag-header toe bij de eerste entry. -->

# Project — rowtrack

## 2026-07-09 — IdlePhase merge + resterende varianten verifiëren · [next-step]
- **Bevinding:** IdlePhase goal-redesign zit op branch `feature/idlephase-goal-redesign` (commit `5635f6f`), niet gemerged. Enkel de Duur-variant is live op de simulator geverifieerd; none/distance/split/watts leunen op gedeelde-componenten-redenering.
- **Volgende zet:** De 5 doeltypes doorklikken op de simulator (m.n. Watt = actief segment uiterst rechts, en distance single-chip full-width + komma-decimaal), dan merge naar main + branch opruimen.
- **Status:** resolved — v1 gemerged (`9ce14f5`). Het variant-doorklik-punt keert terug in de v2 TC-EBC (branch `feature/idlephase-goal-suggestions`): enkel Duur live geverifieerd, geen idb voor auto-taps.

## 2026-07-09 — Scope-onzekerheid goal-redesign · [risico]
- **Bevinding:** De delta is afgeleid uit een Figma deep-read vs code, zonder zicht op het vórige design. Spacing (section 28, doel/picker 20), chip-hoogte 44→40 en de 0.20-fill kunnen bestaande drift zijn i.p.v. deel van "de aanpassing".
- **Volgende zet:** Bij Jeroen aftoetsen of enkel de nudge-bar/segments bedoeld waren; zo ja, de spacing/chip-extra's terugdraaien.
- **Status:** resolved — v2 (2026-07-09): Jeroen vroeg expliciet de toestel-, suggestie- én nudge-wijzigingen; de spacing/chip-drift is dus bewust deel van het design, niet terug te draaien.

## 2026-07-09 — 0.20 accent-selectie-fill zonder token · [debt]
- **Bevinding:** De actieve chip (Chip.tsx) én het actieve segment (GoalSegments.tsx) gebruiken `rgba(240,84,84,0.20)` hardcoded; er bestaat enkel `accent.muted` (0.12) en `accent.subtle` (0.06). Twee `// TODO`-markers wijzen ernaar.
- **Volgende zet:** Een `accent.selected` (0.20) token toevoegen via Tokens Studio → `tokens.json`, rebuilden, beide hardcodes vervangen.
- **Status:** open

## 2026-07-09 — Chip value/unit-split is fragiele heuristiek · [risico]
- **Bevinding:** IdlePhase splitst de chip-value/unit met `label.endsWith(' ${unit}')`. Dit is gekoppeld aan het exacte label-formaat van de formatters; een wijziging daar breekt stil de italic-unit-rendering (of toont een verkeerde unit).
- **Volgende zet:** Overwegen om `{value, unit}` gestructureerd uit de WheelItem-builders door te geven i.p.v. het label te parsen.
- **Status:** resolved — v2 (2026-07-09): split gecentraliseerd in gedeelde `wheelItemParts(item)` (formatters.ts), nu de enige bron voor zowel WheelPicker als de chips. Nog steeds label-gebaseerd, maar op één plek i.p.v. gedupliceerd.

## 2026-07-09 — Out-of-scope design-vragen IdlePhase · [onzekerheid]
- **Bevinding:** (1) Figma toont Roeitrainer-dot + Hartslag-hartje in accent-rood, ook disconnected; code toont ze grijs (Ble/HrStatusBar state-logica). (2) `buttonTokens.primary.height` = 48 maar `Button.sizeLg` = `space['44']` (44) — Start-knop rendert 44.
- **Volgende zet:** Bij Jeroen bevestigen of (1) de indicator-kleur gelijkgetrokken moet en (2) `Button.sizeLg` naar `buttonTokens.primary.height` moet.
- **Status:** open — (1) resolved in v2: nieuwe DeviceRow toont accent-rode dot/hart disconnected (Figma 32:374 bevestigde dit). (2) blijft open — Button.sizeLg (44) vs buttonTokens.primary.height (48) niet aangeraakt.

## 2026-07-10 — Reanimated toegevoegd: schone build vereist prebuild + pods · [next-step]
- **Bevinding:** De IdlePhase-animaties draaien nu op `react-native-reanimated` ~4.1 + `react-native-worklets` (native module, babel worklets-plugin). `/ios` + `/android` zijn gitignored (prebuild-patroon), dus de native module zit niet in git.
- **Volgende zet:** Op een verse checkout / na `pnpm install`: draai `expo prebuild` + `pod install` (of gewoon `expo run:ios`) vóór je bouwt — anders crasht de app op de ontbrekende native module. `pnpm install` alleen volstaat niet meer.
- **Status:** resolved — 2026-07-10 (eerdere "resolved: stale cache" was fout, herzien). De WorkletsError bleef terugkomen; na drie voorbarige root-cause-aannames (prebuild+pods → dubbele Metro → stale Metro-cache, elk gefalsifieerd) bleek het **doelwit** de sleutel. Op de **simulator** werkte de app schoon: de sim-binary bevat de native module wel degelijk (`nm RowTrack.debug.dylib` → 7330 worklets-symbolen incl. `WorkletsModule`), 3× screenshot-geverifieerd (10:11/10:24/10:32). De error kwam van de **fysieke iPhone 13 "umanex"** via de Expo dev-client (LAN `192.168.68.60`) — door Jeroen bevestigd. Die dev-client-build dateerde van vóór worklets → miste de native module. Config zelf overal correct (New Arch aan, babel-plugin `react-native-worklets/plugin` aanwezig, één install 0.5.1 binnen peer-range 0.5–0.8). Cache-clearen / sim-rebuild loste dit NIET op — de native module moest in de *toestel*-binary.
- **Fix (uitgevoerd + geverifieerd):** (1) Signing was onbestaand (0 identities, geen `DEVELOPMENT_TEAM`) → in Xcode via *Signing & Capabilities* een Apple ID + personal team gezet (cert "Apple Development: Jeroen Colpaert", team `7365H2CNR5`). (2) `npx expo run:ios --device "iPhone umanex"` → verse device-build compileerde de worklets-codegen (`rnworklets-generated.mm`), signde en installeerde op de telefoon. (3) Verificatie op het juiste doelwit: gelogde Metro op 8082 (poort die het toestel onthoudt) + app gelaunchd via `devicectl` → device haalde de app-bundle op (1541 modules) en voerde die uit met **0 Worklets-errors, 0 ERROR-regels, 0 "missing default export"-warnings** (die laatste wáren het crash-symptoom). Jeroen bevestigde visueel dat de app op de telefoon werkt. **Signing-caveat:** gratis cert vervalt na ~7 dagen → dan opnieuw `run:ios --device`.
- **Verfijning (diagnose-volgorde bij `WorkletsError`):** (0) **Identificeer eerst het doelwit** — sim én fysiek toestel kunnen tegelijk aan dezelfde Metro hangen; verifieer op hetzelfde toestel waar de gebruiker de fout ziet (deze hele saga kwam doordat ik op de sim verifieerde terwijl Jeroen op zijn telefoon keek). (1) Zit de native module in de draaiende binary? `nm <app>/RowTrack.debug.dylib | grep -ic worklet` (debug-code zit in de dylib, niet in het launcher-executable — `nm RowTrack` geeft misleidend 0). (2) `grep -i worklets babel.config.js` — plugin aanwezig? (3) `grep -i reanimated ios/Podfile.lock` — pod gelinkt? Mist de doelwit-binary de module → rebuild+install op dát toestel (`expo run:ios --device` voor fysiek, `expo run:ios` voor sim); op een verse checkout zonder `ios/` eerst `expo prebuild` + pods. Zie ook [[rowtrack-verify-render-path]].

## 2026-07-10 — Profile-datumpicker erft de wheel-restyle · [onzekerheid]
- **Bevinding:** `WheelPicker` wordt gedeeld door de Geboortedatum-BottomSheet in `profile.tsx` (dag/maand/jaar). Die erft nu 5 rijen (i.p.v. 3, hoogte 132→250) én de edge-fade naar `bg.base`, terwijl de BottomSheet-surface `bg.elevated` is (fade ~ΔE 2-3, quasi onzichtbaar). Review flagde dit als cosmetisch, niet-blokkerend (BottomSheet scrollt, geen clipping).
- **Volgende zet:** Bij Jeroen aftoetsen of de datumpicker de trainings-wheel-look mag erven, of een `surfaceColor`/`visibleRows`-prop verdient.
- **Status:** open

## 2026-07-10 — Segment-breedte snapt (Fabric layout-animatie taboe) · [debt]
- **Bevinding:** De actieve goal-segment verbreedt instant (snap) i.p.v. vloeiend te morphen. Zowel RN `LayoutAnimation` als Reanimated `LinearTransition` herintroduceren de Fabric stale-width clipping (gedeactiveerd segment houdt label-breedte). Enkel de remount ruimt die op, en remount sluit een layout-animatie uit. Verschijning (pill+label) is wél buttery via Reanimated `entering`.
- **Volgende zet:** Bij een latere Reanimated/Fabric-versie opnieuw proberen, of een gelijk-brede-segmenten + schuivende-pill variant overwegen (wijkt af van de variabele-breedte Figma-look — nu bewust afgewezen door Jeroen).
- **Status:** open

## 2026-07-10 — Best-2000m: BLE-reconnect midden in workout re-baselinet niet · [debt]
- **Bevinding:** De nieuwe `{t,d}`-samplereeks (voor de exacte beste-2000m) baselinet `initialElapsed`/`initialDistance` enkel in `resetAll` (bij Start), niet op een auto-reconnect. `ble-service.attemptReconnect()` reset `lastMetrics` ook niet. Reset een erg zijn eigen elapsed/distance-tellers bij reconnect (onbekend voor Concept2, "sommige FTMS"), dan gaan post-reconnect samples negatief → `sanitize()` in `bestDistanceTime.ts` gooit ze weg. Faalmodus is veilig: **nooit een vals-snelle PR**, hooguit data-verlies van het na-reconnect-fragment (best-2k uit het vóór-fragment of `null`). Review reproduceerde de mechaniek maar zette het op `real=false` wegens onzekere trigger + veilige degradatie.
- **Volgende zet:** Als een reële erg dit ooit vertoont: op reconnect de baseline opnieuw zetten (of `lastMetrics` resetten) en de reeks bewust in een nieuwe run laten starten i.p.v. stil te droppen. Nu bewust niet gebouwd.
- **Status:** open

## 2026-07-10 — Best-2000m capture end-to-end onbevestigd op echte erg · [next-step]
- **Bevinding:** Het `bestTimeForDistance`-algoritme is machine-geverifieerd (19/19 unittests + 800k fuzz vs O(N²)-referentie), maar de capture in `useWorkoutMetrics` draaide nooit op echte hardware. Drie onbevestigde aannames: (1) Jeroens erg bundelt distance+elapsed in één packet (CLAUDE.md zegt ja, code is er defensief tegen); (2) notificatie-cadans zit ver onder de 3s-dropout-floor (~1Hz) — een trage erg rond 2-3s kan spurious splits geven; (3) de dedup-per-hele-seconde laat de laatste fractionele seconde vóór 2000m vallen (bewust, geschat <1s ruis). `samples`-payloadgrootte op een lange rit ook niet gemeten.
- **Volgende zet:** Eén echte ≥2000m rit op de fysieke iPhone-build → de opgeslagen `samples` in Supabase inspecteren (vorm, dichtheid, grootte, monotoon), best-2k tegen een handberekening checken, en bevestigen dat de tile een plausibele tijd toont. Bij trage cadans: de 3s-floor heroverwegen. **Dit is de #1 eerste zet.**
- **Status:** resolved — 2026-07-12: geverifieerd op een echte ≥2000m rit (workout `1cd91154`, 4269m/1288s, 1289 samples). `best_2k_seconds`=583.667 → tile toont **9:43.7** (2:25.9/500m) — happy-path getal rendert ✓. Samples exact 1Hz (min=max Δt=1s), monotoon (0 non-monotoon t, 0 dalende d), 0 dropouts >3s, first `[0,0]`/last `[1288,4269]`. Payload **9.4 KB** jsonb voor 4269m → ruim binnen grenzen (open vraag payloadgrootte beantwoord). Opgeslagen `best_2k_seconds` == herberekening met het échte `bestTimeForDistance` op de opgeslagen samples (delta **0.000s**) → sluit tegelijk de [aanname] dat de bevroren afgeleide betrouwbaar is. Bonus uit dezelfde reeks: 500m 2:24.0 / 1000m 2:24.6 (splits lopen fysiologisch plausibel op); 5000m → `null` (rit te kort, geen crash). Eerdere 657m-verificatie (2026-07-11, workout `ec6844d3`) dekte al de te-korte-sessie edge case en de conservatieve pauze-afhandeling.

## 2026-07-10 — best_2k_seconds is een bevroren afgeleide waarde · [aanname]
- **Bevinding:** `best_2k_seconds` wordt bij opslaan berekend en opgeslagen (net als `best_split`). De ruwe `samples` staan er ook, dus herberekening is mogelijk — maar niets herberekent automatisch. Wijzigt de algoritme- of pauze-/moving-time-semantiek later, dan houden bestaande rijen hun oude waarde tot een expliciete backfill.
- **Volgende zet:** Bij een semantiek-wijziging: een migratie/script dat `best_2k_seconds` (en toekomstige 500m/1k/5k) uit `samples` herberekent voor alle rijen. Nu niet nodig.
- **Status:** open
