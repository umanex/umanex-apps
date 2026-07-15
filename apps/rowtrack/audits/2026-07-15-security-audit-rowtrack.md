# Security- & robustheids-audit — RowTrack

**Datum:** 2026-07-15
**Geaudit:** `apps/rowtrack` — React Native + Expo (SDK 54) roei-tracker, Supabase-backend
**Auditor:** Claude (security-audit skill, checklist-gedreven) + fan-out van 7 categorieën met adversariële verificatie (24 sub-agents, 0 errors)
**Type:** statische code-review + live read-only DB-verificatie (RLS/policies/indexes/ledger via Supabase MCP). Geen penetratietest.

## Scope

**Wél in scope** (backend-/data-oppervlak aanwezig → scope-gate voldaan):
- Supabase data-laag: tabellen, RLS-policies, triggers, indexes, migrations (`supabase/schema.sql`, `supabase/migrations/*`, live DB)
- Auth-flows: `lib/auth.ts`, `lib/auth-context.tsx`, `lib/recovery-link.ts`, `app/(auth)/*`
- Client DB-toegang: `app/(tabs)/*`, `lib/hooks/*`
- Config & secrets: `.env`, `.gitignore`, `app.json`, `eas.json`, CI (`.github/workflows/`)
- Externe input: BLE/FTMS-parser (`lib/ble/*`)

**Niet in scope:** UI-/design-/layout-kwaliteit (hoort bij `ux-audit`); pure presentatie-componenten.

**Stack-eigenschappen die het risicoprofiel bepalen:** client-only app (géén eigen server, géén API-routes, géén serverless/edge functions, géén betalingen, géén LLM/AI). De enige externe I/O naast Supabase is Bluetooth. Alle DB-toegang loopt via de **publieke anon/publishable key + Row-Level Security** — RLS is dus de enige echte autorisatielaag.

---

## Samenvatting

**P0: 0 · P1: 2 · P2: 9 · P3: 16 · Niet-verifieerbaar (dashboard/runtime): 8**

De **security-fundamenten zijn sterk**. RLS is live-geverifieerd correct op alle drie tabellen (`auth.uid()`-gebonden CRUD, geen IDOR, `handle_new_user` gehard met `search_path=''`), er staan **geen secrets in de repo** (alleen de publieke Supabase-URL + publishable anon-key, `.env` gitignored én niet getrackt), alle queries zijn geparametriseerd (geen injectie-oppervlak), en zowel de write-paden als de FTMS/BLE-parser zijn defensief (elke veld-read bounds-checked, elke mutatie checkt `{error}`). Er is geen P0.

Het **kern-risico is niet technisch maar compliance**: RowTrack verzamelt en bewaart gezondheids-nabije persoonsgegevens (hartslag als volledige per-tick tijdreeks + gewicht/lengte/geboortedatum/geslacht) zonder **privacybeleid, rechtsgrond, consent of account-verwijderpad**. Voor een Belgische/EU-ontwikkelaar is dat een echte AVG-blootstelling én — het ontbrekende account-verwijderpad — een **zekere afwijzing bij App Store / Google Play submission**. Dat zijn de twee P1's.

Daaronder zit een consistente **robustheids-/observability-laag die ontbreekt** (leesfouten worden stil ingeslikt en als "leeg" getoond, geen crash-/error-monitoring, een voltooide workout gaat verloren als opslaan faalt/offline) en een handvol **schaal-** en **hardening**-punten.

**Top-3 om nu te fixen:**
1. **Privacybeleid + rechtsgrond + consent** voor de gezondheidsdata (P1, F).
2. **In-app account-verwijdering** (AVG art. 17 + Apple 5.1.1(v)/Play store-blocker) (P1, F).
3. **Session-JWT + refresh-token in versleutelde opslag** (nu plain AsyncStorage) + **stil ingeslikte leesfouten** zichtbaar maken (P2, critic/D).

---

## Checklist-resultaat

### A — Secrets & configuratie
| Check | Status | Bewijs | P |
|---|---|---|---|
| Geen secrets in repo | ok | `.env` gitignored (`.gitignore:34`) + niet getrackt (`git ls-files` leeg); geen JWT/`service_role` in tree of history; `app.json`/`eas.json` bevatten niets geheim | — |
| Server-only secrets | ok | Alleen `EXPO_PUBLIC_SUPABASE_URL` + publishable anon-key in de bundle (`lib/supabase.ts:5-6`) — publishable key is client-safe *by design*, veilig **mits RLS** | — |
| Sleutel-rotatie | ok | Geen hardcoded key; `lib/supabase.ts:5-13` leest uit env, throwt indien afwezig | — |
| Omgevingsscheiding | gap | `eas.json` build-profielen declareren geen expliciete `environment`; dev/preview/prod delen mogelijk één Supabase-project (niet uit repo te bepalen) | P3 |
| `.env.example` onboarding | gap | Ontbreekt; var-namen alleen uit throw-message afleidbaar | P3 |

### B — Authenticatie, autorisatie & tenant-isolatie
| Check | Status | Bewijs | P |
|---|---|---|---|
| Authz voorbij login | ok | Writes binden `user_id` uit de sessie (`workout.tsx:121`, `profile.tsx:354`), nooit uit client-input; geen rol-concept (single-role app) | — |
| Geen IDOR | ok | `history/[id].tsx:96` delete + `:51` read op route-`id` zonder `user_id`-filter, maar RLS `using (auth.uid()=user_id)` geeft 0 rijen voor vreemde UUID's | P3 (defense-in-depth) |
| Tenant-isolatie afgedwongen | ok | **Live-geverifieerd:** RLS enabled op `profiles`/`workouts`/`workout_intervals`; policies `auth.uid()`-gebonden; anon-client kan RLS niet omzeilen | — |
| Adversariële isolatie-test | gap | Geen enkele test in de repo (`find *.test.*` leeg) — RLS is al geverifieerd correct, dus enkel regressie-risico | P3 |
| Account-lifecycle: reset-token | niet te verifiëren | Single-use + expiry zijn Supabase-dashboard-defaults; niet uit code te bewijzen | — |
| User enumeration (login/reset) | ok | Supabase geeft generieke "Invalid login credentials"; reset onthult niets | — |
| User enumeration (signup) | gap | `register.tsx:48-49` toont rauwe `e.message` → "User already registered" verraadt bestaand account | P2 |
| Sessie-invalidatie na wachtwoord-wijziging | ok | `completePasswordReset` (`auth.ts:62`) doet global `signOut` na `updateUser` | P3 |

### C — Input, rate limiting & anti-abuse
| Check | Status | Bewijs | P |
|---|---|---|---|
| Input-validatie (auth) | ok | `lib/validation.ts` client-side + Supabase Auth server-side | — |
| Input-validatie (profiel vrije tekst) | gap | `display_name`/`gender` hebben **geen** DB-CHECK/lengte (`profile.tsx:344-345`; live: geen `pg_constraint` op die kolommen); geen `maxLength` op de TextInput | P2 |
| Input-validatie (numeriek: lengte/gewicht/doel) | gap | Client-clamped (WheelPicker/GoalSetupModal), maar geen server-side range-CHECK | P3 |
| Injectie-oppervlak | ok | 100% supabase-js (geparametriseerd); deep-link via `URLSearchParams`; geen string-concat/eval/shell | — |
| Input-validatie (BLE/FTMS) | ok | `ftms-parser.ts` bounds-checkt élke veld-read → geen crash op hostile packet | — |
| Rate limiting (auth) | niet te verifiëren | Leunt volledig op Supabase-defaults; alleen client loading-disable | — |
| Bot-bescherming / CAPTCHA | gap | `signUp`/`resetPasswordForEmail` sturen geen `captchaToken` (`auth.ts:13-37`) | P3 |
| E-mailverificatie vóór activatie | niet te verifiëren | Geen "check je inbox"-scherm; "Confirm email" is dashboard-instelling | — |

### D — Robustheid & error-handling
| Check | Status | Bewijs | P |
|---|---|---|---|
| DB-write-failures gevangen | ok | Elke mutatie checkt `{error}` + Alert (`workout.tsx:153`, `profile.tsx:358`, `history/[id].tsx:98`) | — |
| Geen unhandled await/rejection | ok | BLE-service wrapt elke async-tak in try/catch; reconnect begrensd | — |
| Netwerkfout ≠ lege data | gap | **Élke read gooit de `error` weg** en toont leeg i.p.v. een foutstaat (`history/index.tsx:69-70`, `index.tsx:118-134`, hooks) — offline == "geen workouts" | P2 |
| Geen ephemeral prod-store | ok | Supabase Postgres, geen SQLite/lokale prod-store | — |
| Observability (error-monitoring) | gap | Geen Sentry/Crashlytics/equivalent in deps; alle logging `__DEV__`-gated | P2 |
| Global error boundary / crash-recovery | gap | Geen `ErrorBoundary`/`setGlobalHandler` (`app/_layout.tsx`) | P3 |
| Durability voltooide workout | gap | Bij faalende/offline insert (`workout.tsx:120-158`) enkel een Alert → de workout is **verloren**, geen queue/retry | P2 |
| Gestructureerde logs | gap | Plain `console.log`, geen levels | P3 |

### E — Data-laag & schaalbaarheid
| Check | Status | Bewijs | P |
|---|---|---|---|
| Geen N+1 | ok | Vaste, gebatchte query-counts; `samples` jsonb enkel op detail-view, uitgesloten uit lijst/PR-queries | — |
| Indexen | gap | Aanwezig: `user_id`, `started_at DESC`, partial `(user_id,best_2k)`. Ontbrekend: composite `(user_id, started_at DESC)` voor de dominante lijst-query; partials voor PR-lookups (`best_split`, `distance`) | P2 |
| Pagination | gap | `history/index.tsx` "alle"-filter heeft **geen `.gte` én geen `.limit()`** → haalt élke workout op; non-virtualized `ScrollView` render | P2 |
| Zwaar werk async | gap | KPI-aggregaties (`reduce` over alle rijen) client-side op JS-thread i.p.v. DB-aggregaten | P3 |
| Migrations-discipline | gap | Basis-schema+RLS+trigger leven in `schema.sql` (git-getrackt) maar **niet in de migration-ledger** (6 entries, allemaal ALTER, geen baseline); **ledger-drift**: `add_total_strokes` is op de live-DB toegepast maar staat niet in de ledger → handmatige SQL-Editor-apply | P3 |
| Werkt onder last | gap | Synthese: "alle"-fetch + non-virtualized render + client-side reduces degraderen samen bij hoge workout-counts (bounded door single-user volume) | P2 |

### F — Data-bescherming & compliance (AVG)
| Check | Status | Bewijs | P |
|---|---|---|---|
| Privacybeleid + rechtsgrond | gap | Geen enkele privacy/policy/gdpr-referentie in de app (grep leeg); `register.tsx` verzamelt e-mail+wachtwoord zonder notice | **P1** |
| Bijzondere categorie (gezondheid) | gap | Hartslag (avg/max + volledige per-tick tijdreeks in `workouts.samples`) + gewicht/lengte/geboortedatum/geslacht zonder AVG art. 9-grond/consent | P2 |
| Recht op verwijdering (art. 17) | gap | Geen in-app account-verwijdering; `profiles` heeft geen DELETE-policy | **P1** (zie noot) |
| Recht op inzage / portabiliteit | gap | Geen export-pad | P3 |
| Retentie & minimalisatie | gap | Geen retentiebeleid; `samples` bewaart de volledige tijdreeks onbeperkt | P3 |
| Consent/transparantie bij collectie | gap | Geen consent-checkbox/policy-link bij signup | P3 |

### G — Betalingen
| Check | Status | Bewijs | P |
|---|---|---|---|
| Betaal-flow aanwezig? | n.v.t. | Geen betaal-/IAP-SDK, geen purchase/billing-logica; alle greps zijn false positives (CSS `stripe`, BLE `Subscription`) | — |

### Extra (completeness-critic — buiten A–G)
| Check | Status | Bewijs | P |
|---|---|---|---|
| Auth-gate (kan niet-ingelogde bij tabs?) | ok | `app/_layout.tsx:29-33` redirect naar login; RLS is de echte enforcement | — |
| Deep-link recovery (crafted `rowtrack://`) | ok | `parseRecoveryTokens` eist `type==='recovery'`; tokens gaan naar `setSession`, geen open redirect | — |
| Gevaarlijke API's (eval/Function/exec) | ok | Geen enkele | — |
| **Session-tokens at rest** | gap | Supabase-sessie + refresh-JWT in **onversleutelde AsyncStorage** (`lib/supabase.ts:17`); geen `expo-secure-store` | P2 |
| BLE device-name auto-connect | gap | `startDeviceScan(null,null,…)` scant ongefilterd + auto-connect op eerste naam-prefix-match | P3 |
| Android-permissions correctheid | gap | `app.json:32-39` lijst BLUETOOTH-perms **dubbel**; `ACCESS_FINE_LOCATION` alleen runtime | P3 |
| CI untrusted input | gap | Monorepo-root `umanex-os-sync.yml` `repository_dispatch` base64+gzip-decodet payload en `chmod +x` (geen checksum/signature) | P3 |

---

## Bevindingen (geprioriteerd)

### P1 — vóór launch

**P1-1 · Geen privacybeleid, rechtsgrond of consent voor (gezondheids)persoonsgegevens** · *Categorie F*
RowTrack verzamelt e-mail + voornaam én gezondheids-nabije data (hartslag avg/max + volledige per-tick HR-tijdreeks in `workouts.samples`, `app/(tabs)/workout.tsx:117`; gewicht/lengte/geboortedatum/geslacht in `profiles`). Er is nergens een privacybeleid, rechtsgrond (AVG art. 6), transparantie-notice (art. 13) of consent.
- **Risico:** AVG-overtreding voor een EU/Belgische verwerkingsverantwoordelijke; hartslag + biometrie kunnen als bijzondere categorie (art. 9) gelden → strengere grond vereist.
- **Fix:** Schrijf een privacybeleid (verantwoordelijke = umanex/Jeroen, datacategorieën incl. hartslag, rechtsgrond, retentie, verwerker = Supabase) en link het bij signup + in `Profiel`. Voor de gezondheidsdata: expliciete opt-in.

**P1-2 · Geen in-app account-verwijdering (AVG art. 17 + store-blocker)** · *Categorie F*
Geen verwijder-actie in de app; `profiles` heeft geen DELETE-RLS-policy (`supabase/schema.sql`), dus het datamodel ondersteunt het niet eens.
- **Risico:** AVG recht-op-vergetelheid niet invulbaar. **Zekere afwijzing** bij Apple (Guideline 5.1.1(v): apps met accountaanmaak *moeten* in-app verwijdering bieden) en Google Play. Dit blokkeert de store-launch, niet enkel "een risico".
- **Noot severity:** de adversariële verify beoordeelde dit puur als AVG-punt op P2; ik verhoog naar **P1** omdat de store-afwijzing een *zekerheid* is bij submission, niet een conditioneel risico. Als je niet naar de stores publiceert, is P2 verdedigbaar.
- **Fix:** Voeg een `Account verwijderen`-actie toe (Profiel) die een Supabase **Edge Function** met `supabase.auth.admin.deleteUser(user.id)` aanroept; de bestaande `ON DELETE CASCADE` op `workouts`/`profiles` ruimt de rest op. (Edge Function nodig omdat de client de admin-API niet mag; dit introduceert het eerste server-side stuk — apart inplannen.)

### P2 — vóór productie / volgende release

- **P2-1 · Session-JWT + refresh-token in onversleutelde AsyncStorage** (`lib/supabase.ts:17`) — op een rooted/jailbroken toestel of via een device-backup zijn de tokens leesbaar → sessie-diefstal. *Fix:* een `expo-secure-store`-adapter als `auth.storage` (let op de ~2048-byte item-limiet → chunking-wrapper voor de JWT).
- **P2-2 · Leesfouten worden stil ingeslikt** (`history/index.tsx:69-70`, `index.tsx:118-134`, hooks) — offline/backend-fout rendert als lege staat i.p.v. een foutstaat. *Fix:* destructure + inspecteer `error` op elke read; toon een aparte "Kon niet laden — controleer je verbinding"-staat met retry.
- **P2-3 · Geen error-/crash-monitoring** — geen Sentry/equivalent; productie-storingen zijn blind debuggen. *Fix:* Sentry (Expo) voor unhandled JS + native crashes, en forward gevangen Supabase-fouten.
- **P2-4 · Voltooide workout gaat verloren bij faalende/offline opslag** (`workout.tsx:120-158`) — enkel een Alert, geen queue/retry. *Fix:* persisteer de pending workout in AsyncStorage bij stop, drain bij volgende connectiviteit; minimaal een "niet-opgeslagen workout"-recovery.
- **P2-5 · Unbounded "alle"-history-fetch + non-virtualized render** (`history/index.tsx:49-72`) — haalt élke workout op. *Fix:* `.range()`/`.limit()` + incrementeel laden, en `FlatList` i.p.v. `ScrollView`.
- **P2-6 · Ontbrekende indexen** — composite `(user_id, started_at DESC)` voor de dominante lijst-query; partials voor PR-lookups. *Fix:* voeg toe via een migration.
- **P2-7 · User enumeration op signup** (`register.tsx:48-49`) — "User already registered" verraadt bestaande accounts. *Fix:* map de duplicaat-fout naar een neutrale boodschap.
- **P2-8 · Profiel-vrije-tekst zonder DB-constraint** (`profile.tsx:344-345`) — `display_name`/`gender` zonder lengte/enum-CHECK. *Fix:* `CHECK (char_length(display_name) <= 60)` + `CHECK (gender IN ('male','female','other'))`, plus `maxLength` op de TextInput.
- **P2-9 · Degradatie onder last** (synthese van P2-5/6 + client-side reduces) — bounded door single-user volume, maar stapelt. *Fix:* pagineren + virtualiseren + de indexen.

### P3 — hardening / backlog
Migrations baseline in de ledger + ledger-drift wegwerken (`supabase db pull` → baseline-migration; `add_total_strokes` alsnog registreren) · adversariële isolatie-test toevoegen · redundante `user_id`-filter op read/delete (defense-in-depth IDOR) · CAPTCHA/Turnstile op signup/reset · numerieke range-CHECKs · global `ErrorBoundary` + crash-recovery UI · gestructureerde logs · KPI-aggregaties server-side · retentie-/minimalisatiebeleid (+ drop ongebruikte kolommen) · data-export-pad · consent-notice bij signup · `eas.json` expliciete `environment` per profiel + dev/prod-project-scheiding · `.env.example` · BLE-scan filteren op `FTMS_SERVICE_UUID` / device-keuze i.p.v. auto-connect · Android-permissions dedupliceren + `ACCESS_FINE_LOCATION` declareren · CI `repository_dispatch`-payload signen/checksummen (monorepo-root).

---

## Niet te verifiëren (dashboard / runtime — launch-gate)

Statische review kan deze niet bewijzen; check ze vóór launch en rapporteer nooit "ok" zonder runtime-bewijs:

- **Auth rate limits** — Supabase Dashboard → Authentication → Rate Limits: per-IP + e-mail-verzendlimieten aan en zinnig.
- **E-mailbevestiging vóór activatie** — Dashboard → Auth → Providers → Email: "Confirm email" aan.
- **Reset-token single-use + expiry** — Dashboard: OTP-expiry ≤1u, links single-use (defaults).
- **Leaked-password protection (HaveIBeenPwned)** — Dashboard → Auth → Password: aanzetten.
- **Dev/prod Supabase-project-scheiding** — bevestig of preview en production naar verschillende projecten/DB's wijzen.
- **Login én password-reset end-to-end** getest op een echte build (niet enkel sim).
- **DB-backups / PITR** — een restore effectief uitgevoerd (een niet-geteste backup is geen backup).
- **TLS** — n.v.t. voor de `*.supabase.co`-endpoints (Supabase-managed); relevant zodra een eigen domein/Edge Function bijkomt.

---

## Limieten van deze audit

- Statische code-review + **read-only** live-DB-inspectie (RLS/policies/indexes/ledger via Supabase MCP) — **geen penetratietest**, geen runtime-fuzzing, geen echte multi-user isolatie-run (die bestaat niet als test in de repo).
- Supabase Auth-**dashboard-instellingen** (rate limits, CAPTCHA, e-mailbevestiging, leaked-password protection) zijn niet uit de repo af te leiden → als expliciete runtime-checks opgenomen.
- Bevindingen zijn **evidence-based** (`bestand:regel` of live-query); geen enkele is speculatief. Waar een categorie runtime-inzicht vereist, staat dat als *niet te verifiëren* met de check-methode.
- De P1-verhoging van account-verwijdering t.o.v. de adversariële verify (P2) is expliciet gemarkeerd met rationale.

---

## Sterke punten (context)

Om eerlijk te blijven — dit is geen zwakke codebase: **RLS live-geverifieerd correct** op alle tabellen, `handle_new_user` gehard (`search_path=''`), **geen secrets in de repo**, **geen injectie-oppervlak** (100% geparametriseerd), **defensieve BLE-parser** (elke read bounds-checked), consistente `{error}`-checks op writes, en een correcte re-auth vóór e-mailwijziging. De gaten zitten in **compliance** (F), **observability/robustheid op de lees-as** (D) en **schaal-hardening** (E) — niet in de kern-autorisatie.

---

## Remediatie-status (2026-07-15, zelfde dag)

**P1 → naar `apps/rowtrack/HANDOFF.md`** (vooruitkijkend, apart in te plannen): P1-1 privacybeleid/consent en P1-2 account-verwijdering.

**P2 → in code gefixt** (tsc groen):
- **P2-1** ✅ **resolved (2026-07-15)** — Token-opslag: `expo-secure-store` (Keychain/Keystore) via een gechunkte adapter (`lib/secureStorage.ts`) i.p.v. platte AsyncStorage; valt veilig terug op AsyncStorage als de native module ontbreekt. **Native rebuild uitgevoerd** → encryptie actief (bestaande sessies logden 1× opnieuw in).
- **P2-2** Stille leesfouten: distincte `ErrorState` (met retry) op History-lijst, home-recent en workout-detail; `PGRST116` (0 rijen) blijft "niet gevonden". Swallowed hook-fouten → `reportError()`.
- **P2-3** Monitoring: **uitgesteld** (Sentry, jouw DSN) — console-gebaseerde `reportError()`-shim (`lib/monitoring.ts`) staat klaar; handoff-item toegevoegd.
- **P2-4** Workout-dataverlies: mislukte opslag wordt lokaal bewaard (`lib/pendingWorkout.ts`) en bij de volgende home-focus gedrained. *Tradeoff:* geen idempotency-key → een zeldzame dubbele opslag bij een netwerk-blip ná een geslaagde write is mogelijk (bewust geaccepteerd voor deze app-schaal).
- **P2-5** Unbounded History-render: `FlatList`-virtualisatie (was `ScrollView` + `.map`). *Nog steeds:* KPI-totalen lezen de volledige (kleine-kolom) set → server-side aggregatie is de P3-vervolgstap bij zeer hoge volumes.
- **P2-7** User enumeration: neutrale signup-foutmelding.
- **P2-8** Vrije-tekst: `maxLength={60}` op de voornaam-input (code) + CHECK-constraints migration (DB, zie onder).

**P2 → migrations toegepast + geverifieerd (2026-07-15, via Supabase SQL Editor):**
- **P2-6** ✅ `supabase/migrations/add_history_perf_indexes.sql`: composite `(user_id, started_at DESC)` + partial PR-indexes. Toegepast; 3 indexes geverifieerd via MCP.
- **P2-8** ✅ `supabase/migrations/add_profile_field_constraints.sql`: `display_name`-lengte + `gender`-enum CHECK (bestaande data geverifieerd compatibel). Toegepast; beide CHECK-constraints geverifieerd via MCP.

**Nog te doen (runtime/jouw hand):** ~~native rebuild voor SecureStore~~ ✅ (2026-07-15) · ~~beide migrations toepassen~~ ✅ (2026-07-15) · visuele check van de History-lijst na de FlatList-refactor · P2-3 Sentry-wiring (uitgesteld) · P3-lijst (backlog) · P1-compliance-werk.
