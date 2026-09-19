# Her-triage van de redactie- en code review van 2026-09-12

**Datum:** 2026-09-19 · **Bron:** `audits/2026-09-12-redactie-en-code-review.md` (214 bevindingen)

## Waarom deze her-triage vóór welke fix ook

Het backlog-item bij dat rapport wees als *Eerste zet* naar §10 punt 1 tot en met 3. Alle drie
bleken **al gebouwd** toen ik ze ging fixen: de `Alert` staat vóór `revoke`, de auth-schermen
dragen de `??`-redenering, en `"type-check": "tsc --noEmit"` staat in `package.json`. Drie op
drie is geen toeval maar een signaal: het rapport is zeven dagen oud in kalendertijd en veel
ouder in code-tijd, want er zijn sindsdien hele werkstromen doorheen gegaan (F1–F10 uit de
functionele review, de UX-P3-lijst, de verschilklassen-ronde).

Een fix bouwen op een bevinding die al opgelost is, is geen verspilde moeite maar een risico:
je herstelt een toestand die niet meer bestaat, en je kunt daarbij een latere, betere oplossing
overschrijven. Vandaar eerst meten, dan pas fixen.

**Wat hier NIET in staat.** De ~200 bevindingen uit §5 (per as samengevat) en §6 (schermoppervlak)
zijn niet één voor één hermeten — dat zijn geaggregeerde tellingen zonder losse code-referentie,
en hermeten vraagt de assen opnieuw te draaien. Deze her-triage dekt de **benoemde** bevindingen:
A1–A6 en B1–B7, plus §7. Dat is het deel dat een `Check` heeft.

## De vier oorzaken uit §1

Het rapport wees vier oorzaken aan die samen de meeste symptomen dragen. Gemeten stand vandaag:

| # | Oorzaak | Stand |
|---|---|---|
| 1 | De toestemmingsgate zit op de schrijfactie, niet op de bron | **grotendeels gebouwd** — zie B2 |
| 2 | De doeltoets gebruikt een andere grootheid dan het scherm | **vervallen van vorm** — zie B3 |
| 3 | "Laden" is een eindtoestand: geen deadline op Supabase-aanroepen | **leeft onverminderd** — zie B7 |
| 4 | `??` waar `||` hoort | **gebouwd** — zie B5 |

## Deel B — de zware bevindingen

| # | Bevinding | Stand | Bewijs |
|---|---|---|---|
| **B1** | P0 — weigeren wist onaangekondigd alle gezondheidsdata | **gebouwd** | `app/(tabs)/_layout.tsx`: `Alert.alert` op `:124`, `void revoke()` pas op `:130` — de bevestiging staat vóór de wis-actie |
| **B2a** | de HR-gate zit op elke call-site in plaats van op de bron | **gebouwd** | `lib/ble/ble-context.tsx` draagt `healthGrantedRef` (5 plekken) met de motivering erbij: *"Een poort die elke aanroeper zelf moet zetten, wordt vroeg of laat ergens vergeten"* |
| **B2b** | `useWorkoutMetrics` accumuleert hartslag zonder toestemming | **LEEFT** | `grep -c healthGranted lib/hooks/useWorkoutMetrics.ts` → **0**. De meetlaag kent de toestemming nog steeds niet; de FTMS-hartslag van de erg (`ftms-parser.ts`) heeft geen knop nodig |
| **B2c** | intrekken ruimt de lokale wachtrij niet op | **gebouwd** | `lib/health-consent-context.tsx:112-115` roept `stripHealthDataFromQueue()` én `stripHealthDataFromCheckpoint()` aan, ná een geslaagde RPC |
| **B3** | een doel is bereikt bij het eerste pakket en de rit stopt | **vervallen van vorm** | `lib/hooks/useGoalProgress.ts:106`: *"Alleen een EINDPUNT beëindigt de rit. Voor tempo en vermogen betekent `reached` 'je zit in de zone'"*. F3 heeft het model gewijzigd, dus de faalmodus bestaat niet meer. De minimum-ticks-poort is daarmee ook weg — dat is een gevolg, geen gat |
| **B4** | een font-laadfout laat de app voorgoed op de splash staan | **LEEFT** | `app/_layout.tsx:43` destructureert `fontError`, maar het effect op `:45-49` toetst alléén `fontsLoaded`. De fout wordt gelezen en nergens gebruikt |
| **B5** | de Nederlandse foutmelding van het inlogpad is dode code | **gebouwd** | `app/(auth)/login.tsx:41` gebruikt een ternary op `isOfflineAuthError(e)`, geen `??`, mét commentaar dat uitlegt waarom `??` de NL-zin per definitie onbereikbaar maakte |
| **B6a** | `fetchProfile` toont een mislukte read als leegte | **LEEFT** | `app/(tabs)/profile.tsx` destructureert nog steeds alleen `{ data }` uit de `supabase`-aanroep, geen `error` |
| **B6b** | het profielscherm negeert `usePeriodGoal`'s foutstand | **LEEFT** | de hook levert `error`; het scherm leest alleen `goalProgress` en `refetch` |
| **B7a** | geen deadline op welke Supabase-aanroep ook | **LEEFT** | `grep -rl 'Promise.race' lib/` → **0 bestanden**. De BLE-laag draagt vier benoemde deadlines, de datalaag nul |
| **B7b** | `getSession()` zonder `.catch` laat `isLoading` staan | **LEEFT** | `grep -c '\.catch' lib/auth-context.tsx` → **0** |
| **B7c** | de pending-slot wordt ná de insert geschreven | **gebouwd** | `app/(tabs)/workout.tsx:165` `await enqueueWorkout(row)` staat vóór `:167` `supabase.from('workouts').insert(row)`. Precies de volgorde die het rapport voorstelde |

**Vijf van de twaalf zijn gebouwd, één is van vorm vervallen, zes leven.** De zes die leven
vallen in twee groepen: **B7a/B7b** (geen deadlines, geen `.catch`) is oorzaak 3 uit §1 en raakt
elk scherm dat leest; **B2b, B4, B6a, B6b** zijn elk één plek.

## Deel A — redactie

| # | Bevinding | Stand | Bewijs |
|---|---|---|---|
| **A1** | de NL-foutmelding bereikt de gebruiker niet, drie schermen | **gebouwd** | zie B5 — alle drie de auth-schermen dragen dezelfde redenering |
| **A2a** | `error.detail \|\| t.errors…` laat het Engelse detail winnen | **LEEFT** | `grep -c 'detail ||' i18n/bleErrors.ts` → **4** (was 2 in het rapport; de klasse is gegroeid) |
| **A2b** | `t.common.saveFailed(error.message)` interpoleert een Postgres-fout | **LEEFT** | 1 treffer in `profile.tsx` |
| **A2c** | `setEmailError(updateError.message)` zonder fallback | **LEEFT** | 1 treffer in `profile.tsx` — lekt bovendien of een adres al bestaat, waar registratie juist een neutrale melding heeft |
| **A2d** | `signIn`/`signUp` gooien ongeclassificeerd door | **gebouwd** | `classifyAuthError` staat op 4 plekken in `lib/auth.ts`, niet meer alleen bij `deleteAccount` |
| **A3** | één ding, meerdere namen | niet hermeten | vraagt een terminologiekeuze van Jeroen, geen code-meting |
| **A4** | geen enkelvoud waar n=1 een normaal pad is | **deels** | `workoutCount` bestaat als meervoudsregel en heeft 1 gebruiker; de klasse is niet uitputtend hermeten |
| **A5** | de claim boven de tabel klopt niet | niet hermeten | redactioneel |
| **A6** | documentatie | niet hermeten | redactioneel |

## §7 — dependencies en CI

| # | Bevinding | Stand |
|---|---|---|
| 7.1 | rowtrack is de enige app zonder `type-check` en zonder `lint` | **half gebouwd** — `"type-check"` staat er, `"lint"` niet (`grep -c '"lint"' package.json` → 0). Dat raakt het BACKLOG-item van 2026-09-14 over de ontbrekende lint-laag |
| 7.2 | `app.json`: de permissielijst is volledig overbodig | **deels** — de dubbelingen zijn weg (6 → 3 entries, 2026-09-19), maar of de drie die overblijven nódig zijn, is niet getoetst. Dat vraagt een Android-build |

## Wat dit betekent voor het backlog-item

Het item *2026-09-12 — Redactie- en code review: 214 bevindingen* blijft open, maar zijn
werkvoorraad is kleiner en scherper dan "214". Voorstel voor de volgende ronde, op volgorde van
wat de meeste symptomen draagt:

1. **B7a + B7b** — één deadline-helper over de Supabase-aanroepen, in dezelfde vorm als
   `DELETE_TIMEOUT_MS`, plus een `.catch` op `getSession()`. Dit is oorzaak 3 en raakt elk
   leesscherm.
2. **B6a + B6b** — een mislukte read tonen als fout in plaats van als leegte. Twee plekken,
   en de state-componenten bestaan al in `feedback/`.
3. **B2b** — `useWorkoutMetrics` een `healthGranted`-parameter geven. De gate zit nu op de
   context maar niet op de meetlaag, en de erg-hartslag komt buiten de knop om binnen.
4. **B4** — `fontError` laten doen wat hij belooft.
5. **A2a/A2b/A2c** — drie plekken waar rauwe servertekst de gebruiker bereikt.
