# CLAUDE.md — cashflow app

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
