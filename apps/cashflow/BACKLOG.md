# BACKLOG.md — gemeld, niet gebouwd

Dit bestand vangt het werk dat **buiten scope** viel: wat er benoemd is maar niet gedaan, plus de P3-bevindingen uit `ux-audit` en `security-audit`. Zonder deze lijst is "buiten scope gelaten" alleen een zin in een antwoord dat wegscrollt — de melding bestaat dan wel, het werk niet, en niemand kan er later op terugkomen.

Entries komen erbij **op het moment van de melding**, niet aan het einde van de sessie. Een sessie die zonder reflectie afloopt mag geen scope-drop verliezen; dat is precies de vorm waarin ze vandaag verdwijnen.

## Waarom dit geen HANDOFF is

Een handoff-item is **sessie-gebonden**: het zorgt dat de volgende sessie niet koud begint en verdwijnt zodra het opgepakt is. Een backlog-item is **werk** — het blijft bestaan tot het gebouwd of bewust verworpen is, ook als er tien sessies overheen gaan. Ze in één bestand gooien maakt het sessiestart-signaal onbruikbaar: de handoff-lijst hoort kort te zijn, een backlog mag lang worden.

| Soort bevinding | Huis |
|---|---|
| Werk dat benoemd is maar niet gebouwd (scope-drop) | **hier** |
| P3 / nice-to-have uit `ux-audit` of `security-audit` | **hier** |
| Waargenomen fout van een skill of werkprincipe | `LEARNINGS.md` (via `vastleggen`) |
| Onzekerheid, aanname, risico, next-step van déze sessie | `HANDOFF.md` (via `sessie-reflectie`) |
| Durend feit over Jeroen of het project | auto-memory |

## Statussen

- `open` — vastgelegd, nog geen beslissing over genomen. Telt mee bij sessiestart.
- `gepland` — dit gebeurt; het wacht op een plek in de planning.
- `gebouwd` — gedaan. Blijft staan als spoor, met commit of PR erbij.
- `verworpen` — bewust niet doen. **Reden verplicht**, anders komt hetzelfde voorstel over drie maanden terug en begint de afweging van nul.

## Types

`feature` · `refactor` · `fix` · `test` · `infra` · `ux` · `security` · `docs`

## Format

Elke entry staat onder een laag-header (`# Globaal`, `# Klant — {naam}`, `# Project — {app}`) en heeft deze vorm:

    ## YYYY-MM-DD — {korte titel} · [{type}]
    - **Wat:** {1-2 zinnen — wat er gebouwd zou worden}
    - **Waarom niet nu:** {waarom het buiten scope viel}
    - **Eerste zet:** {concreet startpunt of "-"}
    - **Status:** open

<!-- De eerste entry maakt hieronder de juiste laag-header aan. -->

# Project — cashflow

## 2026-08-25 — flow-harness deelt `.next` met de PM2-app · [test]
- **Wat:** `scripts/flow-harness.mjs` bouwt bewust niet (zijn eigen check: *"een build overschrijft de .next waar een draaiende server uit leest"*) en serveert `apps/cashflow/.next` op `:3100` — dezelfde map waar PM2 op `:3000` uit leest. Dat was sluitend zolang cashflow in een eigen zusmap-worktree met een eigen `.next` stond; sinds app-werk in de hoofdtree gebeurt (2026-08-25) toetst de harness op een feature branch alleen de laatst gebouwde staat, en een `next build` om de eigen wijziging te toetsen breekt de draaiende server (gemeten 2026-08-07). Gevolg: het verify-pad "flow-harness op `:3100`" uit de globale laag (`.umanex-os/CLAUDE.md` → Git workflow → Parallel werk) geldt hier alleen voor de gebouwde `main`; feature-werk valt terug op CI.
- **Waarom niet nu:** De fix raakt `next.config.mjs` (config — vooraf bevestigen) en verandert het gedrag van `pnpm --filter cashflow flow`; buiten de scope van docs-PR #306.
- **Eerste zet:** `distDir: process.env.NEXT_DIST_DIR ?? '.next'` in `next.config.mjs`; de harness bouwt zélf met `NEXT_DIST_DIR=.next-harness` en spawnt `next start` met dezelfde env; `.next-harness/` in `.gitignore`; de `BUILD_ID`-check en de chunk-scan van de harness verhuizen naar die map. Tegenproef: `pnpm --filter cashflow flow` op een feature branch terwijl PM2 draait — `:3000` serveert vóór en ná dezelfde `BUILD_ID`, en een bewust gebroken scenario op de branch wordt rood op `:3100`.
- **Status:** gebouwd — 2026-08-25, branch `feature/cashflow-harness-distdir`. Tegenproef gemeten in een tijdelijke tree terwijl PM2 uit de hoofdtree serveerde: `pnpm --filter cashflow flow` bouwde in 16 s in `.next-harness` (BUILD_ID `Kd9L5l…`), 10/10 groen, géén `.next` aangemaakt, `tsconfig.json` niet door Next herschreven; `--selftest --no-build` 19/19 op dezelfde build; label "Opnieuw proberen" op de branch gewijzigd → nieuwe BUILD_ID `_7FJaQr9…`, `state — fout` rood (exit 1), dus de harness rijdt branch-code; `--dist=.next` zonder build en `--no-build` zonder harness-build weigeren elk met hun eigen boodschap en maken niets aan. `:3000` serveerde vóór en ná `_buildManifest.js` van BUILD_ID `6549…` (200) en `.next/BUILD_ID` in de hoofdtree hield zijn datum (10 aug. 13:36).

