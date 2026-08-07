# CLAUDE.md — cashflow app

## Verify-pad

Wat de `verify`-skill hier kan uitvoeren. Vastgesteld 2026-08-07 door alle vijf te draaien,
niet door ze af te leiden. Staat er "geen", dan is dat een gat dat gebouwd moet worden —
geen vergetelheid.

| Capability | Commando / status |
|---|---|
| **Render vastleggen** | `pnpm --filter cashflow verify:visual` — rendert `.screens-preview.html` en `.charts-preview.html` (statisch, light en dark naast elkaar, geen server en geen sessie) en sweept ze meteen op contrast. Dekt 451 tekstelementen; `MonthCard` en de modals staan er bewust niet in. Het échte scherm zien: `pnpm --filter cashflow flow --headed`. |
| **Flow aandrijven** | `pnpm --filter cashflow flow` — Playwright rijdt de sleep tussen twee maandkolommen uit, met toetsenbord én muis. Start zijn eigen `next start` op **3100** en weigert te draaien als daar al iets luistert. `--selftest` voegt een scenario toe dat hóórt te falen, `--headed` laat meekijken, `--port=` wijkt uit. Vereist een build in `apps/cashflow/.next`; hij bouwt bewust niet zelf. |
| **State forceren** | De fixture in `scripts/flow-harness.mjs` (`fixtureData()`): één post met een uniek bedrag in de eerste van drie kolommen. Loading, empty en error zijn hiermee nog **niet** op te wekken — de route-handler antwoordt altijd meteen en goed. **Geen testaccount:** er is één Supabase-gebruiker en dat is de echte data van Jeroen. |
| **Invariant draaien** | `pnpm exec tsx --tsconfig scripts/tsconfig.json scripts/buffer-scenarios.ts` (546 checks) en hetzelfde voor `scripts/anchor-scenarios.ts` (48). `scripts/calc-baseline.ts` is een diff-vangnet in plaats van een test: dump vóór en ná een refactor, `diff` de twee bestanden. **Geen van de drie draait in CI en geen heeft een package-script** — een harness die door niets aangeroepen wordt, meet niets. |
| **Verse build** | Twee doelwitten, houd ze uit elkaar. De PM2-app op **:3000** draait uit de hoofd-tree: `pnpm --filter cashflow pm2:rebuild`, daarna hard refresh — zie Server management hieronder. De flow-harness bouwt en serveert in zijn éígen worktree op 3100 en raakt :3000 niet aan. Toets of :3000 leeft met `curl -s -o /dev/null -w "%{http_code}" localhost:3000`, **niet** met `pm2 status`: die meldde op 2026-08-07 `online` terwijl er niets luisterde en het proces geen pid had. |

**Destructieve paden — de harness kan er niet bij.** Élk verzoek naar de Supabase-origin
wordt onderschept: wat de harness kent (login, document, snapshots, de wegschrijf-call)
beantwoordt hij uit de fixture, al het overige breekt hij af en telt hij als lek, en één lek
laat de run vallen. Ook een geslaagde verplaatsing schrijft dus niets weg — de PATCH die de
app dan stuurt, verschijnt in de teller "schrijfpogingen onderschept". Richt hem nooit op
:3000: daar draait de app mét jouw echte sessie en echte data. De poortcheck weigert dat al,
maar de reden hoort hier te staan. Zie rail 5 in de `verify`-skill.

## Server management

De cashflow app draait als production server (`next start --port 3000`), beheerd door **PM2** (app-naam `cashflow`, `autorestart: true`, config in `ecosystem.config.js`). Het is **geen** `next dev` — de browser ziet de vooraf-gebouwde `.next`, niet je live source.

### Harde regel: na elke code-wijziging build + PM2 restart

Een source-wijziging is pas zichtbaar op localhost na een nieuwe build én een PM2 restart:

```bash
pnpm --filter cashflow build && pm2 restart cashflow
```

Beide commando's staan in de allowlist van `.claude/settings.local.json`. Daarna in de browser een **hard refresh** (Cmd+Shift+R) — het open tabblad heeft de oude chunk-hashes nog gecached.

**Reden:** `next start` serveert chunks met content hashes. Na een rebuild zijn die hashes veranderd; een lopende server kent alleen de oude hashes en geeft `ChunkLoadError` in de browser. Hard refresh van het tabblad alleen volstaat niet — de server zelf moet de nieuwe build laden.

**Niet manueel killen.** PM2 `autorestart` respawnt het proces direct, en een handmatige `pnpm start &` ernaast geeft een tweede, conflicterende server op dezelfde poort. Gebruik altijd `pm2 restart cashflow`.

Logs: `pm2 logs cashflow` of `/Users/jeroen/.pm2/logs/cashflow-{out,error}.log`.
