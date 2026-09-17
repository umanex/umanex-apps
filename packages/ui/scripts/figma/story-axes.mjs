#!/usr/bin/env node
/**
 * Leest de variant-assen per component uit de GEBOUWDE Storybook, niet uit de TS-bron.
 *
 * Kopie van apps/rowtrack/scripts/story-axes.mjs (2026-09-16), met drie verschillen:
 *  · leest packages/ui/storybook-static;
 *  · de handgebouwde LEGACY-componenten doen niet mee — hun Figma-pagina bestaat en wordt niet
 *    herbouwd — en worden apart gemeld in plaats van stil overgeslagen;
 *  · een component zónder Playground-story is een FOUT (exit 1), geen melding: de parity- en
 *    bouwketen joint op die story, dus zonder hem bestaat het component voor de keten niet.
 *
 * WAAROM RUNTIME. `argTypes` is wat Storybook uiteindelijk oplost; een regex over het
 * bronbestand ziet een uitgeschakelde control niet. De assen zijn de JOIN-SLEUTEL tussen de
 * Figma component set en de Playground-story.
 *
 * DE REGEL, één zin: een prop is een visuele as wanneer zijn control niet uitgeschakeld is én hij
 * ofwel `options` heeft (select/radio) ofwel een boolean is.
 *
 * Uitvoer: figma/story-axes.json
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { LEGACY } from './doel.mjs';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC = join(UI, 'storybook-static');
if (!existsSync(join(STATIC, 'index.json'))) {
  console.error('geen storybook-static — draai eerst `pnpm --filter @umanex/ui build-storybook`');
  process.exit(2);
}
const index = JSON.parse(readFileSync(join(STATIC, 'index.json'), 'utf8'));
const stories = Object.values(index.entries).filter(e => e.type === 'story' && e.title.startsWith('Componenten/'));
const titels = [...new Set(stories.map(e => e.title))];
const legacy = titels.filter(t => LEGACY.includes(t.slice('Componenten/'.length)));
const nieuw = titels.filter(t => !legacy.includes(t));
const playgrounds = stories.filter(e => e.name === 'Playground' && nieuw.includes(e.title));
const zonderPlayground = nieuw.filter(t => !playgrounds.some(p => p.title === t));

const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff',
  '.ttf':'font/ttf','.png':'image/png','.map':'application/json' };
const server = createServer((q, r) => {
  let p = join(STATIC, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
});
await new Promise(r => server.listen(0, r));
const poort = server.address().port;

const browser = await chromium.launch();
const page = await browser.newPage();
const uit = {};
const fouten = zonderPlayground.map(t => `${t}: geen Playground-story — de keten joint op die story`);

for (const s of playgrounds) {
  await page.goto(`http://localhost:${poort}/iframe.html?id=${s.id}&viewMode=story`,
    { waitUntil: 'networkidle', timeout: 20000 });
  const data = await page.evaluate(async (storyId) => {
    const prev = window.__STORYBOOK_PREVIEW__;
    const st = await prev.storyStore.loadStory({ storyId });
    const assen = {}, uitgesloten = {};
    for (const [naam, at] of Object.entries(st.argTypes)) {
      const uitgezet = at.control === false || at.control?.disable === true;
      const heeftOpties = Array.isArray(at.options) && at.options.length > 0;
      const isBool = at.type?.name === 'boolean' || at.control?.type === 'boolean';
      if (!heeftOpties && !isBool) continue;
      if (uitgezet) { uitgesloten[naam] = heeftOpties ? at.options : [false, true]; continue; }
      // false vóór true, zoals figma-sync-check.mjs de booleaanse as leest.
      assen[naam] = heeftOpties ? at.options : [false, true];
    }
    return { assen, uitgesloten };
  }, s.id).catch(e => ({ fout: e.message }));

  if (data.fout) { fouten.push(`${s.title}: ${data.fout}`); continue; }
  const component = s.title.slice('Componenten/'.length);
  const aantal = Object.values(data.assen).reduce((n, w) => n * w.length, 1);
  uit[component] = { storyId: s.id, titel: s.title, assen: data.assen,
                     uitgesloten: data.uitgesloten, variantNodes: aantal };
}
await browser.close(); server.close();

const totaal = Object.values(uit).reduce((n, c) => n + c.variantNodes, 0);
writeFileSync(join(UI, 'figma/story-axes.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/figma/story-axes.mjs uit de gebouwde Storybook. Niet met de hand bewerken.',
  componenten: uit, legacy: legacy.map(t => t.slice('Componenten/'.length)), fouten, totaalVariantNodes: totaal,
}, null, 1) + '\n');

console.log(`${Object.keys(uit).length} componenten met een Playground-story, ${legacy.length} legacy overgeslagen`);
for (const [c, d] of Object.entries(uit).sort((a, b) => b[1].variantNodes - a[1].variantNodes)) {
  const as = Object.entries(d.assen).map(([n, w]) => `${n}=${w.length}`).join(' × ') || '(geen as)';
  console.log(`  ${String(d.variantNodes).padStart(3)}  ${c.padEnd(24)} ${as}`);
}
if (fouten.length) { console.log('FOUTEN:'); for (const f of fouten) console.log('  ' + f); process.exitCode = 1; }
