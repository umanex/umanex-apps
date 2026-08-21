---
name: learnings-verwerken
description: Verifieert openstaande LEARNINGS-entries en hardt bewezen lessen structureel — promotie naar de juiste CLAUDE.md-laag (globaal/klant/project) of een code-guard — en werkt de status bij. Dit is de verwerk-helft van de eval-loop die `vastleggen` opent. Gebruik deze skill altijd wanneer de gebruiker een openstaande learning wil verifiëren, testen of promoveren, een les naar CLAUDE.md wil harden, de feedback-loop wil sluiten, of zegt "verwerk de learnings", "promoveer deze les", "test de openstaande learnings", "verifieer deze learning", "harden naar CLAUDE.md", "sluit de eval-loop".
---

## Werkwijze

Deze skill is de **verwerk-helft** van de eval/feedback-loop van umanex-os; `vastleggen` is de capture-helft. Waar `vastleggen` een fout met zijn letterlijke trigger-input vastlegt op status `open`, neemt deze skill die entry op, **verifieert** of de fout nog optreedt, **hardt** de bewezen les structureel, en werkt de status bij: `open` → `verified` → `promoted`.

Waarom dit nodig is: een entry op `open` in een `LEARNINGS.md` is **inert** — `LEARNINGS.md` wordt nergens in een sessie ingeladen (geen `@`-import, geen hook). Een learning voorkomt een fout pas wanneer de les óf als regel in een CLAUDE.md-laag staat (die elke sessie via `@`-import geladen wordt) óf in een code-guard zit. Deze skill verzorgt precies die overgang.

De skill werkt op alle drie de lagen (globaal / klant / project) en reist daarom als repo-bestand mee: hij staat in `.claude/skills/` van umanex-os zelf én — via de sync-pipeline — van elke klant-repo, en triggert dus overal (sinds 2026-08-17; daarvóór user-level via `~/.claude/skills/`). De kop van de bron-`LEARNINGS.md` legt de statussen en het entry-format uit — dupliceer die uitleg hier niet.

### Stap 0 — Sanity check

- Gaat dit over het verifiëren of promoveren van een **bestaande** learning? → door.
- Gaat het over het **vastleggen** van een nieuwe fout? → dat is de `vastleggen` skill, niet deze. Verwijs en stop.
- Iets anders (feature bouwen, een vraag beantwoorden)? → geen `learnings-verwerken`-taak; zeg dat en stop.

### Stap 1 — Bepaal de bron-LEARNINGS en kies de entry(s)

Path-resolutie spiegelt `vastleggen` — dezelfde drie lagen. Bepaal welke `LEARNINGS.md` in scope is:

| Niveau | Bron-bestand |
|--------|--------------|
| Globaal | `~/Documents/umanex-os/LEARNINGS.md` (altijd dit absolute pad) |
| Klant | `git rev-parse --show-toplevel` → `{repo-root}/LEARNINGS.md` |
| Project | `apps/{app}/LEARNINGS.md` binnen de actieve klant-repo |

Edge case: is de actieve repo umanex-os zélf, dan is alleen globaal zinvol.

Lees de bron en filter entries op status: `open` (te verifiëren) en `verified` (klaar om te promoveren). Toon de te-verwerken entries en vraag welke. Noemde de gebruiker al een specifieke learning → neem die. "Alle" mag, maar verwerk dan één voor één grondig — niet oppervlakkig batchen.

### Stap 2 — Classificeer de fix-route

Bepaal per entry hóe de fout structureel voorkomen wordt. Dit stuurt zowel de verify (stap 3) als de fix (stap 4). Drie routes:

| Route | Wanneer | Fix landt in |
|---|---|---|
| **A — Instructie** | gedragsfout die met een regel te voorkomen is, en die regel **ontbreekt** (of staat te zwak) in de juiste CLAUDE.md-laag | CLAUDE.md-regel (= promotie) |
| **B — Code/tooling** | de fout is het best structureel onmogelijk te maken in een script/config/guard | code-guard (geen CLAUDE.md) |
| **C — Regel genegeerd** | de regel **staat al** in CLAUDE.md maar werd niet nageleefd | versterking van de bestaande regel — niet dupliceren |

Route C is de subtiele: promoveren zou de regel kopiëren die er al staat — zinloos. Hier scherp je de bestaande regel aan (prominenter, explicieter, of een harde checklist/rail), of erken je dat instructie alleen niet volstaat en stel je een hook of code-guard voor. Dupliceer nooit een regel die al bestaat.

Bij twijfel A vs C: lees éérst de doel-CLAUDE.md of de regel er al staat.

### Stap 3 — Verifieer

Doel: bewijs of de fout nog optreedt. De methode volgt uit de route.

**Route A & C — replay van de trigger-input.** Twee methodes; kies op geldigheid:

- **Sub-agent replay (geautomatiseerd, default).** Spawn een sub-agent met *uitsluitend* de letterlijke `Input` uit de entry als prompt — **geef geen hint over de verwachte fout**, anders besmet je de test (de sub-agent zou de fout dan bewust ontwijken). Jij (hoofd-agent) bent de scheidsrechter: vergelijk het gedrag en de output van de sub-agent met de vastgelegde `Fout`.
  - Fout treedt nog op → de fix ontbreekt of werkt niet → blijf `open`, ga naar stap 4.
  - Fout treedt niet meer op → kandidaat voor `verified`.
- **Begeleide fresh sessie (handmatig — voor main-agent-only gedrag).** Sommige principes gelden per definitie alleen in de main-agent context — TC-EBC schrijft bijvoorbeeld expliciet voor dat het *niet* aan een sub-agent uitbesteed wordt. Een sub-agent replay is daar **ongeldig**. Geef Jeroen dan de exacte input om in een verse top-level sessie te plakken, plus wat te observeren, en laat hem het resultaat terugrapporteren. Valideer de verwachte outputs van dat test-plan (paden, bestandsnamen) éérst tegen de actieve klant-/projectoverrides — een fout verwacht-pad maakt het test-plan een valse oracle die een correcte replay als mislukt zou markeren.

Wees eerlijk over de grens van sub-agent replay: de sub-agent krijgt wél de CLAUDE.md-context mee (precies wat we willen testen), maar is geen 100% verse top-level sessie. Voor reproduceerbare, niet-main-agent-only inputs is het een geldige eerste test. Eist Jeroen hardere zekerheid voor `verified`, dan een echte verse sessie.

**Route B — verifieer de guard.** Geen replay nodig: lees de guard/code, of draai hem droog met de oorspronkelijke input, en bevestig dat hij nu weigert of waarschuwt zoals bedoeld.

Kun je de fout niet betrouwbaar repliceren (te breed, niet-deterministisch, te duur)? Zeg dat, **verzin geen bewijs**, en laat de status op `open` — of zet `verified` alleen met Jeroens expliciete akkoord.

### Stap 4 — Hard de fix (alleen als de fout nog optreedt)

Treedt de fout bij verify niet meer op → de fix bestaat al; sla deze stap over en ga naar stap 6 (status → `verified`/`promoted` naargelang er al een regel/guard is).

Treedt hij nog op → hard hem nu, volgens de route:

- **Route A** — schrijf de regel in de juiste CLAUDE.md-laag (routing in stap 5), in de juiste **bestaande** sectie (een git-regel onder *Git workflow*, niet willekeurig onderaan).
- **Route C** — scherp de bestaande regel aan op zijn huidige plek; voeg geen duplicaat toe. Leg je voorgestelde versterking expliciet naast de bestaande regel-tekst: herhaalt ze enkel wat er al staat, dan is het een verkapt duplicaat — schrappen. Alleen écht nieuwe handhaving (bv. een deterministische hook in `settings.json`) is een legitieme versterking; die landt dan in `settings.json`, niet als herhaalde regel in CLAUDE.md.
- **Route B** — implementeer/repareer de guard in code. Valt dat buiten een instructie-wijziging, meld het als aparte code-taak.

**Kritieke valkuil — de gesynced kopie.** Een **globale** regel hardt je ALTIJD in `~/Documents/umanex-os/CLAUDE.md`, NOOIT in een lokale `.umanex-os/CLAUDE.md` binnen een klant-repo — die is een gesyncte kopie en wordt bij de volgende sync overschreven. Klant- en projectregels gaan wél naar de echte repo-CLAUDE.md (`{repo-root}/CLAUDE.md`, `apps/{app}/CLAUDE.md`) — dat zijn geen kopieën.

CLAUDE.md is gedeelde, hoog-hefboom instructie (de globale laag propageert naar álle repos). Behandel een wijziging eraan als een "altijd eerst bevestigen"-actie: toon de voorgestelde regel-tekst en de exacte doellocatie, en vraag akkoord vóór je schrijft.

### Stap 5 — Routing van de promotie

Spiegelt `vastleggen`, omgekeerd: van LEARNINGS-laag naar de corresponderende CLAUDE.md-laag. De laag blijkt uit de header (`# Globaal` / `# Klant — {naam}` / `# Project — {app}`) waaronder de entry staat.

| Laag | LEARNINGS-bron | CLAUDE.md-doel |
|---|---|---|
| Globaal | `~/Documents/umanex-os/LEARNINGS.md` | `~/Documents/umanex-os/CLAUDE.md` |
| Klant | `{repo-root}/LEARNINGS.md` | `{repo-root}/CLAUDE.md` |
| Project | `apps/{app}/LEARNINGS.md` | `apps/{app}/CLAUDE.md` |

### Stap 6 — Werk de entry bij

Gericht met de Edit-tool — nooit het bestand herschrijven (spiegelt `vastleggen`s append-discipline). Werk de `Status`-regel bij en voeg een `Fix`-regel toe die zelf-documenteert hóe en wáár het opgelost is:

- Verify gedaan, fout weg, nog niet gehard naar een regel/guard → `Status: verified`.
- Regel gehard naar CLAUDE.md (route A/C) of guard gebouwd/bevestigd (route B) → `Status: promoted`.
  - **Route B-drempel:** `promoted` mag alleen als de guard de volledige faalklasse van de learning dekt, niet enkel de letterlijke gecapturede input. Dekt hij de gecapturede conditie maar laat een adversariële check verwante gaten van dezelfde klasse open, hou dan `verified` en open een losse code-taak — promoveren zou impliceren dat het gat dicht is.

Voeg de `Fix`-regel in vóór de `Status`-regel (zoals de bestaande `verified` entries), in dit format:

```
- **Fix:** {wat opgelost is en waar — CLAUDE.md-sectie of commit-ref}. Input opnieuw afgespeeld → {uitkomst}.
- **Status:** verified
```

### Stap 7 — Git

Commit de CLAUDE.md- en LEARNINGS-wijzigingen volgens de globale git-workflow — **nooit direct op main**:

1. Feature branch: `docs/promote-{kort}` voor regel-harding, of `chore/...` / `fix/...` naargelang de wijziging.
2. Commit (Conventional Commits, Engels).
3. Betreft het de **globale laag** (`~/Documents/umanex-os/CLAUDE.md`), dan rolt de merge naar main de gehardende regel via de sync-pipeline uit naar álle klant-repos. Dat is de bedoeling — maar het is een merge naar main: geef de korte melding vooraf (globale CLAUDE.md, *Git workflow*).
4. PR aanbieden of openen volgens conventie.

### Stap 8 — Toon het resultaat

Niet stilzwijgend afronden. Toon per verwerkte learning, inline: de route (A/B/C), de verify-methode + uitkomst, wat er in welke CLAUDE.md of guard gewijzigd is (vol pad vanaf repo-root), de nieuwe status, en de git-stappen.

---

## Bewust niet in deze skill

- **Nieuwe fouten vastleggen** — dat is `vastleggen`. Deze skill verwerkt alleen bestaande entries.
- **Bewijs verzinnen** — een fout die niet betrouwbaar te repliceren is, blijft `open`; `verified` vereist echt bewijs of Jeroens expliciete akkoord.
- **Globale regels in de gesynced kopie schrijven** — globale harding hoort altijd in `~/Documents/umanex-os/`, nooit in een klant-repo's `.umanex-os/`.
- **Status terugdraaien** — deze skill beweegt alleen vooruit (`open` → `verified` → `promoted`). Een eerder gepromoveerde regel terugnemen doe je handmatig.
