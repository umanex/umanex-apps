#!/usr/bin/env node
/**
 * Serveert `packages/ui/figma/` op een poort die de Figma-plugin mág bereiken.
 *
 * Kopie van apps/rowtrack/scripts/figma-serve.mjs (2026-09-16), met één verschil: de map.
 *
 * De plugin-sandbox mag `fetch` doen naar localhost, maar alleen op de poorten uit
 * `~/.figma-console-mcp/plugin/manifest.json` -> `networkAccess.allowedDomains` (9223–9232).
 * Daarbuiten krijg je `Failed to fetch` — exact dezelfde melding als bij een server die niet
 * draait. Toets dus eerst met `curl` dat de server leeft.
 *
 * GET `/<naam>` levert een bestand uit figma/; POST `/<naam>` schrijft het lichaam daar weg. Zo
 * reizen spec (tientallen KB), builder en manifest niet door de tool-call.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'figma');
const POORTEN = [9229, 9230, 9232, 9228, 9227, 9231, 9226, 9225, 9224];

function veilig(p) {
  const vol = normalize(join(DIR, p));
  return vol.startsWith(DIR) ? vol : null;
}

const server = createServer((req, rep) => {
  const u = new URL(req.url, 'http://x');
  rep.setHeader('Access-Control-Allow-Origin', '*');
  const pad = veilig(decodeURIComponent(u.pathname.slice(1)));
  if (!pad) { rep.writeHead(403); return rep.end('buiten figma/'); }
  if (req.method === 'POST') {
    const stukken = [];
    req.on('data', (c) => stukken.push(Buffer.from(c)));
    req.on('end', () => {
      const rauw = Buffer.concat(stukken);
      const png = pad.endsWith('.png');
      const inhoud = png ? Buffer.from(rauw.toString('utf8'), 'base64') : rauw;
      mkdirSync(dirname(pad), { recursive: true });
      writeFileSync(pad, inhoud);
      process.stdout.write(`  <- ${u.pathname} (${inhoud.length} bytes${png ? ', uit base64' : ''})\n`);
      rep.writeHead(200); rep.end(String(inhoud.length));
    });
    return;
  }
  if (!existsSync(pad) || statSync(pad).isDirectory()) { rep.writeHead(404); return rep.end('404'); }
  rep.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
  rep.end(readFileSync(pad));
  process.stdout.write(`  -> ${u.pathname}\n`);
});

let i = 0;
server.on('error', (e) => {
  if (e.code !== 'EADDRINUSE' || i >= POORTEN.length - 1) { console.error(e.message); process.exit(1); }
  server.listen(POORTEN[++i]);
});
server.listen(POORTEN[0], () =>
  console.log(`packages/ui/figma/ op http://localhost:${server.address().port} — binnen networkAccess.allowedDomains`));
