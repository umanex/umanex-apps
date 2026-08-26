---
name: cyclus-tot-validatie
description: Voert de PLAN → BOUW → BEOORDEEL lus uit tot een bouwtaak de status gevalideerd bereikt — met de rol-mapping per stap, het reviewer-panel (code-review, verify, ux-audit, security-audit), de scheidsrechter-consolidatie tot één P0–P3 fix-lijst, en de gecontroleerde stop bij niet-convergeren. Gebruik deze skill wanneer een substantiële bouwtaak de poort uit CLAUDE.md passeert — design-to-code, nieuw component, feature-flow, business-logica met afhankelijke berekeningen — of wanneer de gebruiker zegt "draai de cyclus", "bouw tot gevalideerd", "review en fix tot het klopt".
---

## Wat deze skill is

De uitvoerings-helft van het Plan / Bouw / Beoordeel werkprincipe. De *poort* (wanneer wel, wanneer niet) en de *exit-criteria* staan altijd geladen in `CLAUDE.md`. Deze skill bevat de rol-mapping, het panel, en wat er gebeurt als de lus niet convergeert.

Bouwt niets nieuws — het knoopt bestaande rollen aan elkaar. Het is de snelle, per-taak tegenhanger van de trage eval-loop (`vastleggen` → `learnings-verwerken`).

**Stap 0 — poort opnieuw toetsen.** Voor je de lus start: past deze taak echt? De poort weegt of de Beoordeel-stap iets *meetbaars* heeft om tegen te valideren. Zo niet → geen cyclus, gewoon bouwen. Een cyclus over een één-regel-fix is overkill en kost meer dan hij oplevert.

---

## De drie rollen

Mapping naar bestaande primitieven, geen nieuwe machinerie.

### PLAN

- **Design-taak** → TC-EBC via de `tc-ebc` skill. **Main-agent only** — harde rail, nooit naar een sub-agent, omdat de `@`-import CLAUDE.md-keten buiten de main-agent niet gegarandeerd meekomt.
- **Refactor / bugfix / infra** waar TC-EBC bewust wordt overgeslagen → een licht **taak-contract**: doel / invariants-regressiechecks / done-criteria.

Beide leveren hetzelfde: één machine-leesbare **acceptatie-checklist** (`- [ ]`). Zonder die checklist heeft de Beoordeel-stap niets om tegen te valideren en is de cyclus zinloos.

### BOUW

- **Main-agent** (erft de `@`-import CLAUDE.md-keten met git-, Figma- en token-rails), of
- de **bouw-skill bij het taaktype**: `nieuw-component`, `figma-naar-code`, `code-naar-figma`.

Een build-sub-agent alleen bewust en met reden — `@`-import-erving is buiten de main-agent niet gegarandeerd, dus een sub-agent bouwt mogelijk zonder de rails.

### BEOORDEEL

Een panel langs verschillende assen, elk met een eigen bril:

| As | Skill | Blokkeert? |
|---|---|---|
| Diff-correctheid | `code-review` | ja, bij P0/P1 |
| Gedrag tegen BEHAVIOUR | `verify` | ja, bij P0/P1 |
| Design | `ux-audit` | nee |
| Backend-security & robustheid | `security-audit` | ja bij backend-werk, P0/P1 |

Bij design-to-code is de **design-snapshot** (het traceability-`.md` uit `figma-naar-code` stap 4b) plus parity- en token-checklist de meetbare as: `verify` dift de gebouwde code tegen die snapshot in plaats van tegen een vluchtige in-context mapping.

Bij **business-logica met afhankelijke berekeningen** is de meetbare as de **invariant**, niet het scherm — zie *Discipline in de Beoordeel-stap* in CLAUDE.md. `verify` rekent die invariant uit over een echte dataset; een scenario-harness die dat doet hoort in CI naast de bestaande guards, anders meet ze niets.

De main-agent is **scheidsrechter**: hij consolideert alle bevindingen tot één geprioriteerde P0–P3 fix-lijst.

**Harde rail:** geef een reviewer-sub-agent **nooit** een hint over de verwachte fout. Dat besmet de test — zelfde discipline als `learnings-verwerken` stap 3.

**Review-assen draaien bij voorkeur als read-only agent in een verse context.** Voor de assen die niet hoeven uit te voeren (design-review, diff-review) bestaat het agent-type **`design-reviewer`** (`.claude/agents/design-reviewer.md`): geen Write/Edit-tools — een reviewer die fysiek niet kán fixen — en geen zicht op de bouw-conversatie, dus geen self-review-bias. Dat maakt twee bestaande instructies machinaal: "de reviewer schrijft niet" en de blinde-replay-rail hierboven. `verify` blijft buiten dit patroon: die as moet flows aandrijven en houdt zijn volledige gereedschap.

---

## De cyclus

Itereer BOUW → BEOORDEEL zolang er P0/P1 openstaan.

EXIT (status `gevalideerd`) geldt pas wanneer **alle drie** waar zijn:

1. elk acceptatie-item afgevinkt `- [x]`, mét het bewijs ín de regel (`— bewijs: <meting + instrument>`) — een vinkje zonder bewijs telt als open;
2. geen P0/P1 in `code-review`, `verify` of (bij backend-werk) `security-audit`;
3. Open vragen leeg.

### Harde rail: max 3 iteraties

Convergeert het niet binnen 3 → **gecontroleerde stop**:

1. roep `vastleggen` niet-interactief aan — de taak-input als Input, de aanhoudende bevinding als Fout;
2. escaleer naar Jeroen met wat er blijft falen en wat je al geprobeerd hebt.

Nooit stil afsluiten alsof gevalideerd.

### Ontbrekende meetbare as

Is er geen render-pad, dan vallen `verify` en parity terug op "overgeslagen". Meld dat **expliciet** en draai de Beoordeel-stap niet alsof hij geslaagd is. Een groene review die niets gemeten heeft is erger dan geen review — hij geeft valse zekerheid.

Maar melden alleen laat het gat open. Valt binnen één app dezelfde as een **tweede keer** weg, dan is het ontbrekende pad zélf het werk: leg het vast als `next-step` in de `HANDOFF.md` van die app, met wat het concreet moet meten (render-pad, scenario-harness, device-check). Een verify-pad is een deliverable, geen bijproduct — het ontstaat niet vanzelf uit bouwtaken, en vanaf de tweede melding is "overgeslagen" geen informatie meer maar een gewoonte.

---

## Brug naar de eval-loop

Een gefaalde review die een **terugkerende faalklasse** blootlegt is een `vastleggen`-trigger. De triade is de *feeder* van de trage loop, geen duplicaat.

Houd de twee assen uit elkaar:

- **triade-status** — `gepland → gebouwd → gevalideerd`, per taak;
- **learning-status** — `open → verified → promoted`, over sessies heen.

Die brug is het enige raakpunt.

---

## Rijping

Zoals TC-EBC: eerst principe, dan hardenen.

- **v1** — het werkprincipe in `CLAUDE.md` (model-gedreven, geen skill).
- **v2** — deze skill: de lus is triggerbaar, met een Stap-0 overkill-poort; propageerde destijds user-level via `sync-os.sh`, sinds 2026-08-17 als repo-bestand (`.claude/skills/`) via de sync-pipeline.
- **v3** — een deterministisch Workflow-script plus render-paden per app, pas wanneer de Beoordeel-as echt machine-checkbaar meet. De design-snapshot (`figma-naar-code` stap 4b) is de eerste bouwsteen daarvan: een persistente, diff-bare toetssteen in plaats van een vluchtige in-context mapping.
