---
name: worktree
description: De procedure voor een tweede git-worktree — wanneer er één mag bestaan, waar hij hoort te staan, hoe je hem bijwerkt zonder een losse HEAD te krijgen, en wat je doet met een oude zusmap die je aantreft. Gebruik deze skill altijd wanneer een tweede working tree in beeld komt: bij een sub-agent die mag schrijven, wanneer Jeroen om twee gelijktijdige taken vraagt, wanneer `git worktree list` meer dan één tree toont, wanneer `git checkout main` faalt met "already used by worktree", of wanneer de gebruiker zegt "worktree", "tweede tree", "zusmap", "parallel werken", "aparte kopie van de repo".
---

## Werkwijze

De rail staat in `CLAUDE.md` (*Git workflow* → *Parallel werk — één tree: de hoofdtree*): app-werk gebeurt in de hoofdtree, in `<repo>/apps/<app>`, op een feature branch. Deze skill draagt de uitzonderingen en de procedure — hij vervangt die rail niet.

---

## Waarom de zusmap weg is

De conventie "één app, één worktree" stond in `CLAUDE.md` tot 2026-08-25 en is geschrapt.

GEMETEN op 2026-08-25: twee sessies maakten op gezag van de oude regel `~/Documents/umanex-apps-soda-plus` en `~/Documents/umanex-apps-portfolio` aan. Jeroen trof twee extra kopieën van de repo naast de echte in Documents, en één daarvan bevatte een scaffold-commit plus drie ongetrackte bestanden die nérgens anders bestonden — niet op `origin`, niet onder `umanex-apps/apps/`, waar hij ze verwachtte.

De prijs van de conventie bleek groter dan wat ze oploste: per tree 1 GB `node_modules` en een eigen install, een `.env.local` dat niet meereist, dev-servers die niet twee keer kunnen draaien, een hoofdtree die na een merge achterblijft, en een tree-guard in `commit-msg` die — zolang zo'n zusmap ergens stond — precies het commit blokkeerde dat Jeroen wil: aan `apps/<app>` in de hoofdtree. Elk van die gaten kreeg een eigen regel of hook; de bron ervan was de zusmap zelf.

**Wat de zusmap oploste, blijft echt** — twee taken tegelijk in één working tree lopen door elkaar, gegarandeerd. Die remedie is nu discipline mét hooks en staat in `CLAUDE.md`: één taak tegelijk per repo, stage per pad, de hooks als vangnet. Lees die daar; ze bijten ook zonder deze skill.

---

## Wanneer een tweede tree wél mag — twee gevallen, allebei ín de repo, allebei tijdelijk

### 1. Een sub-agent die mag schrijven

`isolation: "worktree"` op de Agent-tool (`opts.isolation` in een Workflow-stap) geeft hem een verse tree in `.claude/worktrees/agent-<id>/`; jouw bestanden kan hij dan niet raken.

Dat is de énige remedie die werkt: wie een bestand schreef staat niet ín dat bestand, dus achteraf detecteren kan per definitie niet — een formatterings-handtekening scoorde 79% op het echte defect tegen 71% op gewoon werk, en elke drempel daartussen is een wachter die permanent afgaat.

GEMETEN op 2026-08-21 met positieve controle: twee agents kregen dezelfde vier commando's. Die **zonder** isolatie schreef in `~/Documents/umanex-os` — ook in het getrackte `README.md`, precies het schadegeval. Die **mét** isolatie liet daar nul sporen achter.

Let op wáár die tree staat: **ín de repo**. Bij de meting van 2026-08-21 negeerde alleen Columba dat pad — elders was de isolatie-map zelf ongetrackte repo-inhoud die een `git add -A` meeneemt, de klasse die je net sloot, terug via de achterdeur. Sinds die dag staat `.claude/worktrees/` in alle vier de `.gitignore`s (hermeten 2026-08-25 met `git check-ignore`), en `.githooks/pre-commit` blokkeert daarbovenop een gestaged pad eronder.

Hoeft de agent niets te schrijven, neem dan een read-only agent-type naar het model van `.claude/agents/design-reviewer.md` — met dit voorbehoud: dat type houdt `Bash`, en juist via Bash liep de `prettier --write` die dit veroorzaakte.

### 2. Jeroen vraagt er expliciet om

Twee lange taken die echt gelijktijdig moeten. Dan ook ín de repo, met een naam die zegt waarvoor:

```bash
git worktree add .claude/worktrees/<taak> -b <type>/<beschrijving> origin/main
```

Het pad staat in `.gitignore` en `pre-commit` weigert een gestaged pad eronder, dus de tree kan niet als repo-inhoud meereizen. Weg zodra de PR gemerged is:

```bash
git worktree remove .claude/worktrees/<taak>
```

Nooit in `~/Documents`, nooit permanent, en buiten geval 1 nooit op eigen initiatief — **de agent-tree kies jíj, de taak-tree kiest Jeroen.**

### Wat in zo'n tweede tree botst

Draaiende dev-servers en hun poorten, PM2-processen, native build-caches — en alles wat gitignored is (`.env.local`, `.env`) reist niet mee. Draai dezelfde app niet vanuit twee trees, en reken op een eigen install per tree (met pnpm is dat vooral tijd, nauwelijks schijf — de store linkt hard).

---

## Een worktree kan `main` niet uitchecken — en `origin/main` is geen vervanging

Git staat één branch in één worktree toe, dus in een linked worktree faalt `git checkout main` hard:

```
fatal: 'main' is already used by worktree at <pad>
```

Wie dan uitwijkt naar `git checkout origin/main` krijgt de juiste bestanden en stilzwijgend een **losse HEAD**, want `origin/main` is een remote-tracking pointer en geen branch. Commits die je daar maakt horen bij geen enkele branch en zijn onvindbaar zodra je wegnavigeert; `.githooks/pre-commit` blokkeert ze daarom. Gemeten op de lqb-worktree: vijf keer achter elkaar `checkout: moving from <commit> to origin/main` in de reflog, met als eindtoestand een worktree waarin niet meer te werken viel.

**Bijwerken zonder van branch te wisselen** doe je met `git merge origin/main` na een `git fetch` — dat haalt de nieuwe commits binnen en laat je branch staan:

```bash
git -C <map> fetch -q origin && git -C <map> merge origin/main
```

Neem `origin/main` en niet `main`. De lokale `main`-ref beweegt alleen wanneer main érgens uitgecheckt is en gepulld wordt, dus in een repo waar je alleen op feature branches werkt veroudert hij stil en antwoordt `git merge main` doodleuk *Already up to date* terwijl je twee commits achterloopt. Gemeten in Columba tien minuten na het schrijven van die regel: lokale `main` op `234ebfd`, `origin/main` op `3959453`, merge zonder effect. Wil je de lokale ref tóch bijwerken zonder hem uit te checken: `git fetch origin main:main`.

Moet je écht naar een andere branch, check dan een échte lokale branch uit — is er geen, vertak dan direct vanaf `origin/main`:

```bash
git checkout -b <type>/<beschrijving> origin/main
```

Een parkeerbranch (`work/<app>-parked`) hoorde bij de permanente app-worktree en is met die conventie weg: een tijdelijke tree draagt één taak en verdwijnt zodra die gemerged is.

---

## Tref je een oude zusmap aan

`../<repo>-<app>`, te vinden met `git worktree list`. **Verwijder hem niet zelf.**

```bash
git -C <map> fetch -q origin
git -C <map> status --short
git -C <map> log --oneline HEAD --not --remotes
```

Een commit die nergens op `origin` staat, of een ongetrackt bestand daar, bestaat nergens anders. Meld wat erin zit; verwijderen (`git worktree remove`) is Jeroens beslissing.

---

## Na de merge — de hoofdtree bijtrekken

Merge je vanuit een andere tree dan de hoofdtree, dan blijft die hoofdtree staan waar hij stond. De volledige regel en het afsluit-blok staan in `CLAUDE.md` (*Een merge is pas af als de tree die de gebruiker bekijkt erop staat*) — die bijt bij élke merge, ook zonder deze skill, en hoort daarom daar.
