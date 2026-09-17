# TC-EBC — dashboard: triage met gewicht

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Laat het dashboard openen op wat triage vraagt: open werk eerst, vacatures onder score 10
             compact en ingeklapt, afwijzen en bewaren als knoppen, en een filterstand die een
             herlaadbeurt overleeft.
CONTEXT:     jobradar `/`, het triagescherm. Critique 2026-09-17 issue 2 (P1) en de stille statusfout
             uit issue 3 / audit 2026-08-11 (P2). Plan delightful-stirring-blossom, fase 2. Gemeten:
             309 van 334 vacatures scoren < 5, de rest 10–45. Drempel 10 gekozen door Jeroen.
ELEMENTS:    FilterBar — statusoptie "Open" als default · StatusActies (nieuw, vervangt StatusDropdown
             op JobCard, LeadCard, ProspectCard en de lijst naast de kaart) — Bewaar (aria-pressed),
             Afwijzen, Heropen, foutmelding · LageScoreLijst (nieuw) — inklapbare sectie met compacte
             rijen · JobCard — stillere nieuw-badge, geen bronchip bij één bron, meta-rij op één regel
             · Prospects-telling "—" tot geladen · `lib/triage.ts` — filter en URL als pure functies.
BEHAVIOUR:   Filters (status, regio, score, tab, zoek) staan in de URL via history.replaceState, zonder
             server-rondreis, en komen bij herladen terug · Open = alles behalve Afgewezen · afwijzen
             haalt de kaart uit de open-weergave · een mislukte statuswijziging toont een melding bij
             de kaart en laat de status staan · "Score onder 10 · N vacatures" is dicht bij het laden ·
             knoppen zijn aria-disabled tijdens hun PATCH.
CONSTRAINTS: Alleen @umanex/ui (Button, Badge, Card) en rol-utilities · geen nieuwe primitive, geen
             dependency · desktop-first; 400 px blijft buiten scope (BACKLOG, verworpen) · de harness
             draait op de echte database: elke klik die kan muteren gaat door een onderschepping met
             positieve controle vooraf · de verworpen items "Min. score per tab" en "signaalbadges
             gewicht" blijven verworpen.
```

---

## Open vragen

_(geen — de drempel is beslist; typologie, states, interactie en randgevallen hieronder)_

## Aannames

- [ASSUMPTION: "Open" = alles behalve Afgewezen, niet "nieuw + opgeslagen" zoals het plan schreef. Een
  gecontacteerde lead is lopend werk; hem bij het openen verbergen zou de opvolging onzichtbaar maken.]
- [ASSUMPTION: de drempel 10 geldt voor de vacaturescore op het tabblad Vacatures. Leads houden hun
  kaarten: de leadscore is een andere schaal, en "Min. score per tab" is op 2026-08-27 verworpen.]
- [ASSUMPTION: "Gecontacteerd" zet je niet meer vanaf een kaart maar via de opvolging, waar het al
  gebeurt. Een gecontacteerd item toont die status als tekst, zonder Bewaar-knop, mét Afwijzen.]
- [ASSUMPTION: een filter op zijn standaardwaarde staat niet in de URL; `/` zonder parameters is de
  standaardweergave.]
- [ASSUMPTION: de open/dicht-stand van "Score onder 10" staat niet in de URL.]

## Acceptatie

_(wordt aangevuld met instrument en bewijs tijdens de bouw — elk item één meting)_

Runs waarop het bewijs rust (2026-09-17, op de definitieve code tenzij "tegenproef"): flow-harness
slotrun groen (sectie Dashboard-triage + kaart, op de echte database, die vóór en na op 0/0/0
afwijkende statussen stond) · `flow --selftest` 5 van 5 assen · `scenarios` 31.727 checks over 10
suites · `opvolging:probe` rc=0 met gevallen 13–17 16 van 16 (twee runs) · `plan:probe` 152/152 ·
`tsc`, lint, `ds:guard`, tokens-guard (396 bestanden) groen. Tegenproeven: run A (7 defecten, na
herstel regel voor regel teruggezet — de backups waren door een zsh-lus niet gemaakt), run B (6
defecten, md5-gelijk hersteld), heropen-regel (4 rood, md5-gelijk hersteld), URL-schrijver (14.400
FAIL).

**Typologie**
- [x] Geen enkele kaart of prospectrij bevat nog een status-`select` — bewijs: harness "nul selects op kaarten en lage-scorerijen"; selftest-as triage-selects valt om op een ingespoten select
- [x] Elke niet-afgewezen, niet-gecontacteerde kaart draagt precies één knop Bewaar en één knop Afwijzen — bewijs: harness "334 items, elk met de knoppen van zijn status"; selftest-as triage-knoppen valt om op een verkeerde `aria-pressed`
- [x] Elke afgewezen kaart draagt precies één knop Heropen — bewijs: harness, na onderschept Afwijzen onder Afgewezen "met Heropen" voor vacature én lead (de echte database heeft nul afgewezen items, dus alleen zo meetbaar)
- [x] Vacatures met score < 10 staan niet als kaart maar als rij in de sectie "Score onder 10" — bewijs: harness "25 kaarten, alle vanaf score 10" en "na openen 309 = 309 rijen"
- [x] `packages/ui` is ongewijzigd — bewijs: `git diff --stat origin/main -- packages/ui` 0 regels
- [x] `pnpm ds:guard` blijft groen — bewijs: rc=0

**States**
- [x] Default: bij het openen van `/` zonder parameters staat het statusfilter op Open — bewijs: harness "statusfilter staat bij het openen op Open"; tegenproef TP2/TP1 liet herladen op "open" terugvallen
- [x] Default: bij het openen staan er nul afgewezen items in de vacature- en leadlijst — bewijs: harness, onderschept Afwijzen haalt de kaart uit Open en zet hem onder Afgewezen, voor vacature én lead; tegenproef (Open laat alles door) gaf "staat na Afwijzen nog in de open-weergave"
- [x] Error: een PATCH die 500 geeft toont een `role="alert"` bij het item — bewijs: harness met onderschepte 500; tegenproef (geen `!res.ok`-tak) gaf "geen alert"
- [x] Error: na die 500 is de status van het item ongewijzigd — bewijs: harness "status blijft new"; tegenproef gaf "new → dismissed"
- [x] Loading: tijdens de PATCH is de knop onbruikbaar — bewijs: harness "Afwijzen draagt aria-disabled tijdens de PATCH" (600 ms vertraging); tegenproef met native `disabled` gaf `aria-disabled="null"`. Bewust `aria-disabled` i.p.v. `disabled`, zie P2-3a
- [x] Empty: zonder vacatures vanaf score 10 binnen de filters staat er een diagnose in plaats van een lege grid — bewijs: harness met `?zoek=Sales Advisor | Brugge | Vast` → `[data-geen-kaarten]` aanwezig, 0 kaarten
- [x] Prospects: het tabblad toont "—" zolang de telling niet geladen is, nooit "0" — bewijs: harness "Prospects —"; tegenproef (`?? 0`) rood

**Interactie**
- [x] Status-, regio- en scorefilter staan na een wijziging in de URL — bewijs: harness `?status=dismissed&regio=WVL%2COVL&score=10`
- [x] Na herladen met die URL staan dezelfde filterwaarden ingesteld — bewijs: harness status, Brussel-checkbox en slider-`aria-valuenow` terug
- [x] Een filterwijziging veroorzaakt geen documentnavigatie — bewijs: harness, 0 document- of RSC-verzoeken tijdens drie filterwijzigingen
- [x] "Score onder 10" draagt `aria-expanded="false"` bij het laden en de rijen zijn onzichtbaar — bewijs: harness; tegenproef (open bij laden) rood
- [x] Na één klik staat `aria-expanded` op `"true"` en is het aantal zichtbare rijen gelijk aan de telling in de kop — bewijs: harness 309 = 309
- [x] Bewaar draagt `aria-pressed` gelijk aan "status is opgeslagen" — bewijs: harness, onderschepte klik → `"true"`, `data-status="saved"`, icoon gevuld (`rgb(15, 23, 41)`); tweede klik → `"false"`
- [x] De flow-harness blijft groen, inclusief focus-pass op `/` — bewijs: slotrun "80 stops, elk met zichtbare focus", 0 bevindingen

**Randgevallen**
- [x] Invariant: voor elke combinatie van status, regio's, score, tab, zoekterm en via geeft lezen(schrijven(x)) = x — bewijs: `triage`-suite, 30.240 standen door een echte URL; tegenproef (score niet geschreven) 14.400 FAIL
- [x] Invariant: een onbekende of kapotte URL-waarde valt terug op de standaard, zonder fout — bewijs: `triage`-suite sectie 3, 12 kapotte gevallen plus de positieve kant (geldige waarden worden gelezen)
- [x] Invariant: kaarten en lage-scorerijen vormen samen precies de gefilterde lijst — disjunct, zonder verlies, volgorde behouden — bewijs: `triage`-suite sectie 5, 11 lijsten met de randen 9, 10 en 11
- [x] Nul gevulde nieuw-badges op vacatures onder score 10 — bewijs: harness "nul nieuw-badges onder de grens" en "nieuw-badges zijn outline (5 gemeten)"; tegenproef (variant default) "5 gevulde"
- [x] Geen bronchip wanneer alle vacatures uit één bron komen — bewijs: harness "0 bronchips bij 1 bron" (bron geteld met `sqlite3 -readonly`); tegenproef "25 bronchips"
- [x] De meta-rij staat op elke kaart op één regel — bewijs: harness 25 meta-rijen van 20 px op 1280 én 1024 px

**Iteratie 2 — bevindingen van de design-review (2026-09-17), één item per bevinding**
- [x] P1-1a: na filteren en `router.refresh()` staat de gefilterde stand nog in de URL — bewijs: harness "de URL overleeft router.refresh()"; tegenproef met `window.history.state` gaf `{"status":null,…}`
- [x] P1-1b: na filteren, naar `/plan` en Back staat het statusfilter nog op de gefilterde waarde — bewijs: harness "na /plan en Back staan filter én URL nog op de gefilterde stand"; tegenproef gaf `{"select":"open",…}`
- [x] P1-2a: Bewaar aanklikken zet `aria-pressed="true"`, `data-status="saved"` en een gevuld icoon; opnieuw klikken zet `aria-pressed="false"` — bewijs: harness, zie Interactie
- [x] P1-2b: op het tabblad Leads haalt Afwijzen de kaart uit de open-weergave en staat hij onder Afgewezen met Heropen — bewijs: harness "Afwijzen op een lead haalt hem uit Open en zet hem onder Afgewezen met Heropen"
- [x] P1-2c: de databasecontrole telt elke status ongelijk aan `new` in vacatures én leads, vóór en na gelijk — bewijs: harness "niet-new vacatures/leads 0/0, vóór én na", ook in beide tegenproef-runs
- [x] P2-3a: na Afwijzen met het toetsenbord staat de focus niet op `body` — bewijs: harness met `focus()` + Enter; tegenproef (geen focusverplaatsing) "staat de focus op body"
- [x] P2-3b: na Afwijzen onder Open staat de focus in het volgende item — bewijs: harness "de focus staat in de volgende kaart"; tegenproef "null"
- [x] P2-3c: na Afwijzen meldt een live-regio "<titel> afgewezen" — bewijs: harness, exacte tekst; tegenproef leeg
- [x] P2-4: Heropen van een afgewezen lead of prospect mét contactmomenten zet `contacted`, zonder `new` — bewijs: `opvolging:probe` 14–16 (antwoord én database), scenario `statusNaHeropenen` beide kanten; tegenproef 4 rood
- [x] P2-5: na een doorklik vanaf een lead en herladen matcht de lijst nog op de bedrijfssleutel — bewijs: `via=bedrijf` in `TriageStand`, rondreis in de `triage`-suite (30.240 standen incl. `via`); en in de browser: harness klikt "toon deze vacatures" op een lead, URL `via=bedrijf`, herladen geeft dezelfde 15 items én dezelfde melding "15 vacatures van Médiane Benelux"; tegenproef (`viaLead` altijd false) gaf na herladen een lege melding bij 15 items — het aantal alleen had het defect niet gezien
- [x] P2-6: in de kaartweergave blijft een gewijzigde status staan na een andere stip kiezen en terug — bewijs: harness "een bewaarde status blijft staan na een andere stip kiezen en terug", `prospect_status` ongemoeid; tegenproef (no-op callback) `aria-pressed "false"`
- [x] P2-7a: geen meta-rij heeft horizontale overloop of overlapt "Bekijk", op 1280 px — bewijs: harness 25 van 25
- [x] P2-7b: idem op 1024 px — bewijs: harness 25 van 25
- [x] P2-8: de triage-sectie crasht niet op een lege database en meldt de assen dan als niet te verifiëren — bewijs: harness met `JOBRADAR_DB_PATH` naar een nieuwe lege database — tussen "→ Dashboard-triage" en "→ Prospects-tabblad" nul triage-regels (gevuld, slotrun: 35), dus de guard-tak liep en de sectie crashte niet. De notitie zelf werd niet afgedrukt: een bestaande sorteercheck in Prospects (ook op `origin/main`) loopt daarna op de lege database in een timeout (BACKLOG)
- [x] P2-9: `flow --selftest` spuit minstens twee triage-defecten in en vangt ze — bewijs: "alle 5 assen falen", met `ZELFTEST triage-selects` en `ZELFTEST triage-knoppen`
- [x] P3-10: het tabblad Vacatures telt de kaarten; de sectiekop telt de rijen — bewijs: harness "telt de kaarten (25)"
- [x] P3-11: een lage-scorerij is ≤ 36 px hoog — bewijs: harness max 33 px; eerste meting 41 px (rood), tegenproef 41 px
- [x] P3-12: de sectiekop leest "Score onder 10 · N vacatures" — bewijs: harness `"Score onder 10 · 309 vacatures"`
- [x] P3-15: de harness verankert kaarten op de exacte titel en eist minstens één gemeten nieuw-badge (of meldt het) — bewijs: `kaartMetTitel()` met een `^…$`-regex, en de `nieuw.n === 0`-melding in `scripts/flow-harness.mjs`
- [x] P3-16: het Verify-pad beschrijft de interactie `open → alle` en de triage-sectie met haar databasebescherming — bewijs: `apps/jobradar/CLAUDE.md`, rijen "Flow aandrijven", "State forceren" en "Dashboard-triage"

**Bestaande werking**
- [x] `pnpm --filter jobradar scenarios` groen, met selftest die omvalt — bewijs: "31727 checks over 10 suite(s), en bewezen faalbaar"
- [x] `opvolging:probe` eindigt groen en de opvolging zet nog altijd Gecontacteerd — bewijs: rc=0; afgelezen: geval 1 `status=contacted` en `lead_status contacted`, geval 8 `prospect_status contacted`. Gevallen 1–12 vergelijken zelf niet (BACKLOG)
- [x] `plan:probe` eindigt groen — bewijs: 152 ✓ / 0 ✗
- [x] `flow --selftest` vangt alle ingespoten defecten — bewijs: 5 van 5 assen
- [x] `tsc --noEmit` en lint op jobradar groen — bewijs: beide rc=0 na de laatste wijziging

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt; drempel 10 gekozen door Jeroen op basis van de verdeling 309 < 5 / 25 ≥ 10.
  "Open" afgeweken van het plan (nieuw + opgeslagen → alles behalve afgewezen), zie Aannames.
- 2026-09-17: iteratie 2 na een onafhankelijke design-review (2 × P1, 7 × P2, P3's), bevindingen één op
  één als items toegevoegd vóór de fix. P1-1 getoetst aan de geïnstalleerde bron van Next 15.5.25
  (`app-router.js` r.324–331): `replaceState` met `window.history.state` draagt `__NA` en slaat de
  router over, dus de URL-stand viel terug bij `router.refresh()`. De sectiekop wordt "Score onder 10 ·
  N vacatures" in plaats van "Lage score (N)"; de uitlegzin eronder is geschrapt (een nieuwe bewering
  over vaardigheden).
