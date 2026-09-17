# TC-EBC — /plan: de bediening volgt de groep

- **Datum:** 2026-09-17
- **Type:** feature
- **Project:** jobradar
- **Klant:** umanex
- **Status:** gevalideerd

---

```
TASK:        Laat op /plan per actie zien wat je er nú mee kunt: één actieknop per groep, geblokkeerd
             stil, en afronden met een zichtbaar gevolg.
CONTEXT:     jobradar /plan (voorbereidingsplan umanex 2027), nog nooit echt gebruikt. Critique
             2026-09-17, issue 1 (P1); plan delightful-stirring-blossom, fase 1. Bouwt voort op
             briefings/2026-09-16-feature-bedrijfsplan-2027.tcebc.md.
ELEMENTS:    ActieRij — actieknop per groep (Start · Afronden…), blokkadechip mét titel, statuspil
             alleen in de Acties-tab · ActieGroep — inklapknop voor Geblokkeerd · Eerstvolgende als
             Card met knop · ActiePanel — blok "nu beschikbaar" na afronden, gevolgen bij vervallen ·
             PATCH-antwoord `vrijgekomen`.
BEHAVIOUR:   Start → PATCH bezig; een 409 (focus of afhankelijkheid) opent het paneel zoals nu ·
             Afronden… → paneel op het bewijsveld · Geblokkeerd/Wacht/Uitgesteld: de titel opent het
             paneel, geen actieknop · Geblokkeerd klapt open/dicht · na Markeer gereed meldt een
             aria-live-regio welke acties vrijkwamen, met Start-knoppen · bij voorstel vervallen staat
             vóór het bevestigen welke acties daardoor hard blokkeren · status kiezen alleen in het paneel.
CONSTRAINTS: Alleen @umanex/ui (Button, Card, Badge) en rol-utilities · desktop-first, /plan op 400 px
             blijft zonder overloop · lib/plan blijft synchroon · blokkade blijft afgeleid · geen nieuwe
             primitive, geen nieuwe dependency.
```

---

## Open vragen

_(geen — typologie, states, interactie en randgevallen zijn beantwoord in het goedgekeurde plan en
hieronder uitgeschreven)_

## Aannames

- [ASSUMPTION: de statuspil verdwijnt uit de overzichtsrijen — de groepskop zegt de status al (Nu bezig
  = bezig, Geblokkeerd = niet gestart, …). In de Acties-tab, gegroepeerd per prioriteit, blijft hij.]
- [ASSUMPTION: "vrijgekomen" = acties die door déze ene statuswissel van uitvoerbaarheid `geblokkeerd`
  naar `beschikbaar` gingen. Een actie die al beschikbaar was via een startuitzondering telt niet.]
- [ASSUMPTION: de open/dicht-stand van Geblokkeerd wordt niet onthouden over herladen — dicht is de default.]
- [ASSUMPTION: Eerstvolgende met reden `beschikbaar` krijgt "Start", met `actief` of `actief_zonder_stap`
  een knop die het paneel opent.]
- [ASSUMPTION: de gevolgen bij vervallen komen client-side uit `actie.afhankelijken` en hun status —
  geen extra API-call.]

## Acceptatie

Instrumenten: **plan-ui-probe** = nieuwe Playwright-pass aan het eind van `pnpm --filter jobradar
plan:probe <werkmap>`, tegen de wegwerp-database van de probe (eindstand: A01, A02, A09 bezig · A15
wacht op input · A07 niet gestart) · **flow-harness** = `pnpm --filter jobradar flow` · **scenarios** =
`pnpm --filter jobradar scenarios`.

Herroepen uit `2026-09-16-feature-bedrijfsplan-2027.tcebc.md` (bewust, door deze briefing):
r.131 "de status-select op een rij stuurt één PATCH" — er is geen select meer in een rij ·
r.143 "inzet leeg toont 'inzet onbekend'" in een rij — weggelaten in de rij, blijft in de voortgang ·
het harness-anker `li:has(select)` uit r.118 wordt `li[data-actie]` ·
r.164 "22 selects van 103 px en 22 knoppen Afronden…" — er is geen select meer in een rij, en Afronden…
staat alleen op lopende acties ·
r.132 "Gereed kiezen in een rij opent de sheet" — kan nu alleen nog vanaf een lopende actie ·
r.124 het bewijs citeert de chiptekst "wacht op A07 (bezig)" — de chip draagt nu ook de titel, en
Geblokkeerd staat standaard dicht. De eis zelf (elke geblokkeerde actie heeft een chip) blijft.
**Niet** herroepen: r.83/r.122 "geen kicker" — die eis geldt ook voor de Eerstvolgende-kaart.

Runs waarop het bewijs rust (2026-09-17, allemaal op de definitieve code tenzij "tegenproef"):
plan:probe slotrun 152/152 · scenarios 1411 checks over 9 suites · flow-harness slotrun groen met
`--smal=400` · `flow --selftest` groen · `opvolging:probe` PROBE KLAAR. Tegenproeven: drie
aparte runs met gerichte defecten, elk daarna byte-gelijk hersteld (md5).

**Typologie**
- [x] Elke Beschikbaar-rij op het overzicht draagt precies één knop "Start" — bewijs: plan-ui-probe UI 1, per rij geteld `[1,1,1,1]` bij 4 rijen = API
- [x] Elke Nu bezig-rij op het overzicht draagt precies één knop "Afronden…" — bewijs: plan-ui-probe UI 2, per rij `[1,1,1]`
- [x] De groep Geblokkeerd bevat, opengeklapt, nul knoppen "Start" of "Afronden…" — bewijs: plan-ui-probe UI 3, 0 bij 9 zichtbare rijen; tegenproef (Start ook op geblokkeerd) gaf "verwacht 0, kreeg 9"
- [x] Geen enkele actierij bevat nog een `select` — bewijs: plan-ui-probe UI 4 (overzicht) en UI 15 (Acties-tab, 23 rijen), beide 0
- [x] Eerstvolgende staat vóór de eerste groep in een Card met één knop — bewijs: plan-ui-probe UI 5, 1 kaart, 1 knop, `compareDocumentPosition` = volgt
- [x] `packages/ui` is ongewijzigd — bewijs: `git diff --stat origin/main -- packages/ui` gaf 0 regels
- [x] `pnpm ds:guard` blijft groen — bewijs: rc=0, "9/9 apps gedeclareerd en in lijn met de schijf"

**States**
- [x] Loading: tijdens een lopende PATCH staat de aangeklikte Start-knop op `disabled` — bewijs: plan-ui-probe UI 8, PATCH 800 ms vertraagd via `page.route`, `isDisabled()` = true
- [x] Error 409 focus: Start op een Beschikbaar-rij bij drie actieve acties opent het paneel met de parkeerkeuze — bewijs: plan-ui-probe UI 8, HTTP 409 en Parkeer-knoppen in de dialog
- [x] Error overig: een PATCH die 500 geeft toont een `role="alert"` op de pagina — bewijs: plan-ui-probe UI 9, `fulfill(500)`, 1 alert met de geforceerde tekst
- [x] Success: na Markeer gereed op A01 noemt het paneel precies de keys uit `vrijgekomen` van het antwoord — bewijs: plan-ui-probe UI 10, orakel `["A04"]` = API `["A04"]` = paneel `["A04"]`
- [x] Success leeg: afronden van een actie zonder vrijgekomen afhankelijken toont geen lijst "nu beschikbaar" — bewijs: plan-ui-probe UI 12 (A09), API `[]`, 0 blokken
- [x] Empty: Geblokkeerd zonder acties toont geen inklapknop — bewijs: plan-ui-probe UI 17, onderschept PATCH-antwoord met `geblokkeerd: []`; inklapknop 1 → 0 en "Niets geblokkeerd." staat er

**Interactie**
- [x] De inklapknop van Geblokkeerd draagt `aria-expanded="false"` bij het laden — bewijs: plan-ui-probe UI 3, `"false"`, 0 zichtbare rijen
- [x] Na één klik staat `aria-expanded` op `"true"` en zijn de rijen zichtbaar — bewijs: plan-ui-probe UI 3, `"true"`, 9 zichtbare rijen = API
- [x] Een klik op Start verstuurt precies één PATCH met `status: "bezig"` — bewijs: plan-ui-probe UI 8, 1 request, body `status` = `"bezig"`
- [x] Na een geslaagde Start vanaf een rij staat de focus binnen `[data-actie="<key>"]` — bewijs: plan-ui-probe UI 13, HTTP 200, `activeElement.closest('[data-actie]')` = de gestarte key
- [x] De melding "nu beschikbaar" staat in een element met `aria-live` — bewijs: plan-ui-probe UI 10–12, `aria-live="polite"`, tekst bevat "<key> afgerond"
- [x] Na Markeer gereed staat het blok "nu beschikbaar" binnen het zichtbare deel van het paneel — bewijs: plan-ui-probe UI 10 en 11, bovenrand binnen de dialog-rechthoek; op de oude code rood (eerste tegenproef)
- [x] Na Markeer gereed zonder gevolg staat de kop "Afgerond" binnen het zichtbare deel van het paneel — bewijs: plan-ui-probe UI 12 true; op de oude code rood, en opnieuw rood toen de wacht op `gereed` in iteratie 2 werd weggehaald
- [x] Na Markeer gereed staat de focus binnen het paneel, niet op `body` — bewijs: plan-ui-probe UI 10–12 true. Let op: ook op de oude code true (focusval van de sheet); dit item bewijst geen fix, alleen dat het zo blijft
- [x] Bij voorstel vervallen op een actie met afhankelijken staan die afhankelijken in het redenblok, vóór bevestigen — bewijs: plan-ui-probe UI 14 (A03 → `["A05"]`), status na de check nog `niet_gestart`
- [x] flow-harness: nul stops zonder zichtbare focus op `/plan` — bewijs: slotrun "43 stops, elk met zichtbare focus" (overzicht), 37 (Acties), 9 (paneel)
- [x] flow-harness: het aantal tab-stops op het overzicht daalt t.o.v. `origin/main` op dezelfde database — bewijs: nulmeting op main-code (wijzigingen geparkeerd, diff daarna identiek) overzicht 80 (plafond, dus ≥ 80) → 43; Acties-tab 76 → 37

**Randgevallen**
- [x] Elke blokkadechip bevat de titel van de actie waarop gewacht wordt — bewijs: plan-ui-probe UI 6, 15 van 15
- [x] Geen overzichtsrij bevat de tekst "inzet onbekend" — bewijs: plan-ui-probe UI 7, 0 rijen
- [x] De voortgang per prioriteit toont het aantal onbekende inzetten nog — bewijs: plan-ui-probe UI 7, precies 1 sectie, `/\d+ onbekend/` matcht
- [x] Invariant over het hele model: voor elke seed-actie X is `vrijgekomen(X)` gelijk aan de acties waarvan X de enige onvervulde afhankelijkheid was — bewijs: scenarios sectie 23, 22 van 22 gelijk aan het orakel uit de seed-constanten; 6 acties met gevolg, 9 in totaal; A01 → A02, A04, A13
- [x] De scenario-suite valt om als `vrijgekomenActies` een lege lijst teruggeeft (tegenproef) — bewijs: rc=1, 8 FAIL; daarna hersteld, 0 resten
- [x] plan:probe: A13 afronden via HTTP geeft `vrijgekomen` gelijk aan de uit de database afgeleide verwachting — bewijs: geval 31, SQL-verwachting `A16` = antwoord `A16`, met check dat de verwachting niet leeg is
- [x] flow-harness `--smal=400`: `/plan` heeft geen horizontale overloop — bewijs: slotrun "400 ≤ 400"

**Iteratie 2 — bevindingen van de design-review (2026-09-17), één item per bevinding**
- [x] P1-1a: na Heropen in hetzelfde paneel staat er geen blok "nu beschikbaar" — bewijs: plan-ui-probe UI 11 (A02 → A03 vrij, dan Heropen), 0 blokken; tegenproef "verwacht 0, kreeg 1"
- [x] P1-1b: na Heropen is de live-regio leeg — bewijs: plan-ui-probe UI 11 `""`; tegenproef gaf "A02 afgerond. Nu beschikbaar: A03."
- [x] P1-1c: een Start-knop in het blok "nu beschikbaar" verschijnt alleen bij uitvoerbaarheid `beschikbaar`, niet op status `niet_gestart` — bewijs: plan-ui-probe UI 11, A03 buiten de browser om geblokkeerd (extra afhankelijkheid E01) terwijl het blok openstaat: 0 Start-knoppen; tegenproef met Start op status gaf "verwacht 0, kreeg 1"
- [x] P1-2a: `/plan` op 400 px zonder overloop, gevuld plan, Geblokkeerd opengeklapt — bewijs: plan-ui-probe UI 16, harde chips in beeld (positieve controle), 400 ≤ 400; tegenproef (`whitespace-nowrap` op de chips) 512 > 400
- [x] P1-2b: de Acties-tab op 400 px zonder overloop, gevuld plan — bewijs: plan-ui-probe UI 16, 400 ≤ 400; tegenproef 499 > 400
- [x] P2-3: bij een 409 vanuit het paneel toont de sheet nooit de titel van een andere actie dan die waarvoor het conflict geldt, ook niet terwijl het detail nog laadt — bewijs: plan-ui-probe UI 10b, detail-GET 1,5 s vertraagd, na 400 ms geen sheet-titel met A01; tegenproef zonder `detail.key === openActie` gaf true
- [x] P2-4a: Afronden… op een rij is een outline-knop (achtergrond gelijk aan de pagina) — bewijs: plan-ui-probe UI 5b, `rgb(255, 255, 255)` = body; tegenproef gaf `rgb(36, 99, 235)`
- [x] P2-4b: de knop in de Eerstvolgende-kaart is de primaire knop (achtergrond verschilt van de pagina) — bewijs: plan-ui-probe UI 5b true
- [x] P2-4c: de volgende stap in de kaart staat in de voorgrondkleur, niet muted — bewijs: plan-ui-probe UI 5b, opstelling reden `actief`, kleur `rgb(16, 24, 40)` = h1, en ≠ de muted span
- [x] P2-5a: de Eerstvolgende-kaart heeft geen los label boven de titel — het woord "Eerstvolgende" staat in dezelfde kop — bewijs: plan-ui-probe UI 5, 0 losse labels, 1 kop met "Eerstvolgende" en de key
- [x] P2-5b: die kop is een `h3`, en de kopstructuur van `/plan` blijft h1 → h2 → h3 — bewijs: flow-harness slotrun "/plan kopstructuur: 12 koppen, niveaus h1 → h2 → h3" (was 11)
- [x] P2-5c: `impeccable detect` op `components/plan` geeft `[]`, mét positieve controle op een wegwerpbestand in dezelfde run — bewijs: rc=0 `[]`; wegwerpbestand rc=2 met 2 bevindingen (`side-tab`, `gradient-text`). Kanttekening: het kicker-label in datzelfde wegwerpbestand werd níet gemeld — voor "geen kicker" is P2-5a het bewijs, niet de detector
- [x] P2-7: invariant over opeenvolgende afrondingen — na elke afronding in twee volgordes (A01→A22 en omgekeerd) is `vrijgekomen` gelijk aan het orakel uit de rijen, inclusief acties met meerdere afhankelijkheden (A03, A05, A10) — bewijs: scenarios 23b, 44 afrondingen, alle gelijk; dekkingscheck "A03,A05,A10"
- [x] P2-7b: een actie met een vervallen afhankelijkheid komt niet vrij door een andere afhankelijkheid af te ronden — bewijs: scenarios 23, A03 vervallen + A04 gereed → A05 niet in `vrijgekomen`
- [x] P2-8: een geparkeerde actie met startuitzondering (niet gestart, al beschikbaar) staat niet in `vrijgekomen` — bewijs: scenarios 23, opstellingscheck (status, uitzondering, uitvoerbaarheid) groen, A02 niet in `[A04, A13]`
- [x] P2-8b: de scenario-suite valt om als `vrijgekomenActies` de afhankelijkheden afloopt in plaats van de uitvoerbaarheid te vergelijken (tegenproef) — bewijs: rc=1, precies één FAIL: "een geparkeerde actie die al beschikbaar was, telt niet — [A02,A04,A13]"
- [x] P3-a: bij vervallen noemt het gevolgenblok per actie het eigen gevolg, zonder één zin die beide soorten tegelijk "hard blokkeert" — bewijs: plan-ui-probe UI 14, elke regel het eigen gevolg, 0 × "blokkeert"
- [x] P3-b: Afronden… op een rij draagt `aria-haspopup="dialog"` — bewijs: plan-ui-probe UI 2, 3 van 3
- [x] P3-c: de kop van Geblokkeerd is even hoog als de kop van Beschikbaar (verschil ≤ 4 px) — bewijs: plan-ui-probe UI 3, 24 vs 20 px; tegenproef zonder `h-auto py-0` 36 vs 20
- [x] P3-d: na afronden krijgt het resultaatblok geen programmatische focus meer (geen dubbele aankondiging naast de live-regio), maar staat het wel in beeld — bewijs: plan-ui-probe UI 10–12, `activeElement.closest('[data-vrijgekomen]')` = false én in beeld = true
- [x] P3-e: de UI-probe telt de knoppen per rij en eist minstens één Beschikbaar-rij — bewijs: `scripts/plan-ui-probe.mjs` `perRij()` en de positieve controle die met exit 2 stopt bij 0 beschikbaar; uitvoer `[1,1,1,1]`
- [x] P3-f: de UI-probe leidt de verwachting per afronding af vlak ervóór, uit de ruwe velden van het plan (status, afhankelijkheden, startuitzondering), niet uit `uitvoerbaarheid` — bewijs: `orakel()` in `scripts/plan-ui-probe.mjs`, aangeroepen als eerste regel van `rondAf()`; `grep -c uitvoerbaarheid` binnen `orakel` = 0

**Bestaande werking**
- [x] `pnpm --filter jobradar scenarios` groen, met selftest die omvalt — bewijs: "1411 checks over 9 suite(s), en bewezen faalbaar"; plan-tegenproef valt met exit 1
- [x] `plan:probe` eindigt op PROBE KLAAR — bewijs: slotrun rc=0, 152 ✓ / 0 ✗
- [x] `opvolging:probe` eindigt groen — bewijs: slotrun rc=0, PROBE KLAAR
- [x] `flow --selftest` vangt alle ingespoten defecten — bewijs: rc=0, "alle drie de assen falen wanneer ze horen te falen"
- [x] `tsc --noEmit` op jobradar groen — bewijs: rc=0 na de laatste wijziging

## Beslissingsgeschiedenis

- 2026-09-17: aangemaakt vanuit de critique (23/40) en het goedgekeurde plan; de status-select verhuist
  uit de rij naar het paneel, wat twee items uit de briefing van 2026-09-16 herroept.
- 2026-09-17: drie items toegevoegd na de eerste opname van de UI-probe — het blok "nu beschikbaar"
  verscheen bovenaan een paneel dat onderaan gescrold stond, dus buiten beeld. De asserties waren
  groen; alleen het beeld toonde het. Het vermoeden dat ook de focus wegviel met de knop Markeer
  gereed is **door meting weerlegd**: de tegenproef-run op de ongewijzigde code gaf "focus binnen het
  paneel: true" (de focusval van de sheet vangt hem op). Die check blijft staan maar bewijst niets
  over de fix — hij was al groen. De twee in-beeld-checks waren op dezelfde run rood. Het HTTP-geval
  gaat over A13 in plaats van A04: A04 afronden geeft in de eindtoestand van de probe niets vrij,
  en een geval met een lege verwachting meet niets.
- 2026-09-17: iteratie 2 na een onafhankelijke design-review (2 × P1, 6 × P2, P3's). Bevindingen één
  op één als items toegevoegd vóór de fix. Kantelpunten: het resultaatblok hangt nu aan
  `status === 'gereed'` en wordt gewist bij elke andere statuswissel; Start in dat blok leest de
  uitvoerbaarheid, niet de status; het paneel rendert alleen voor `openActie`; Afronden… op de rij
  werd outline en de kaart de primaire knop; het kicker-label werd één `h3`. Het blok krijgt geen
  programmatische focus meer (dubbele aankondiging). Drie extra herroepingen uit de briefing van
  2026-09-16 (r.124, r.132, r.164). Vijf P3's gingen naar `apps/jobradar/BACKLOG.md`. De detector
  bleek wél op TSX te vuren (positieve controle 2 bevindingen) — de critique meldde dat als
  onbewezen — maar ving het kicker-label niet.
