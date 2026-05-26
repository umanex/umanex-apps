# CLAUDE.md — cashflow app

## Server management

De cashflow app draait als production server (`next start`) op **port 3000**.

### Harde regel: herstart na elke build

Na elke build — via `pnpm --filter cashflow build`, `pnpm turbo build --filter=cashflow`, of equivalent — **moet** de server op port 3000 gekilled en herstart worden:

```bash
kill $(lsof -ti:3000) 2>/dev/null; sleep 1; cd /Users/jeroen/Documents/umanex-apps/apps/cashflow && pnpm start &
```

**Reden:** `next start` serveert chunks met content hashes. Na een rebuild zijn die hashes veranderd. Een lopende server kent alleen de oude hashes en geeft `ChunkLoadError` in de browser. Hard refresh helpt niet — de server zelf moet herstarten. Dit is eerder fout gegaan en heeft tot dataloss-situatie geleid.

Een PostToolUse hook in `.claude/settings.local.json` handelt dit automatisch af na iedere Bash-command die zowel "cashflow" als "build" bevat. Server logs gaan naar `/tmp/cashflow-server.log`.

**Uitzondering:** bij een monorepo-wide `pnpm turbo build` zonder cashflow-filter wordt de hook niet getriggerd — doe dit dan handmatig.
