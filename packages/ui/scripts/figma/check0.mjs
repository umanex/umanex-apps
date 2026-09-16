#!/usr/bin/env node
/**
 * CHECK 0 — de referentie voor "staat er íets in de gebouwde node?", buiten de walker om.
 *
 * WAAROM APART VAN build-spec.mjs. De builder bouwt uit de spec, en de spec komt uit de walker. Een
 * volledigheidscheck die de gebouwde node naast de SPEC legt, bevestigt per constructie wat de
 * walker wegliet: beide kanten missen dezelfde nodes (code-naar-figma, "de referentie mag niet door
 * het instrument lopen dat je toetst"; gemeten in rowtrack 2026-09-09, 3 018 weggekapte nodes).
 * Dit script leest de DOM zelf, met een eigen, minimale definitie — geen code gedeeld met de walker.
 *
 * Per variant: de gesorteerde tekstruns onder de primaire `data-slot` (een run = de eigen tekst van
 * één element, witruimte genormaliseerd) en het aantal `<svg>`-iconen. Een schermlezerlabel
 * (1×1, clip) telt niet: dat tekent niets, dus in Figma hoort het er ook niet te staan.
 *
 * Uitvoer: figma/check0.json. Vereist storybook-static en figma/story-axes.json.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { primairVan, NIET_VISUEEL } from './doel.mjs';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC = join(UI, 'storybook-static');
const assen = JSON.parse(readFileSync(join(UI, 'figma/story-axes.json'), 'utf8'));

const server = createServer((q, r) => {
  let p = join(STATIC, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' }[extname(p)] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
});
await new Promise(r => server.listen(0, r));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const tel = (slot) => {
  const wortels = document.querySelectorAll(`[data-slot="${slot}"]`);
  if (wortels.length !== 1) return { fout: `${wortels.length} wortels` };
  const verborgen = (el) => {
    for (let x = el; x; x = x.parentElement) {
      const c = getComputedStyle(x), r = x.getBoundingClientRect();
      if (c.display === 'none' || c.visibility === 'hidden') return true;
      if (c.position === 'absolute' && r.width <= 1 && r.height <= 1) return true;
      if (x === wortels[0]) return false;
    }
    return false;
  };
  const teksten = [], alle = [wortels[0], ...wortels[0].querySelectorAll('*')];
  let iconen = 0, verfdozen = 0;
  const zichtbareKleur = k => k && !/rgba\(\d+, \d+, \d+, 0\)/.test(k) && k !== 'transparent';
  for (const el of alle) {
    if (verborgen(el)) continue;
    if (el.tagName.toLowerCase() === 'svg') { iconen++; continue; }
    if (el.closest('svg')) continue;
    // Een component zonder tekst (Switch) kan op teksten en iconen alleen nul tegen nul scoren —
    // een ontbrekende thumb bleef dan groen. Een element met eigen verf is de telling die dat ziet.
    const c = getComputedStyle(el);
    if (zichtbareKleur(c.backgroundColor) || (parseFloat(c.borderTopWidth) > 0 && zichtbareKleur(c.borderTopColor)) || c.boxShadow !== 'none') verfdozen++;
    const eigen = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim();
    if (eigen) teksten.push(eigen);
  }
  return { teksten: teksten.sort(), iconen, verfdozen };
};

const uit = {};
for (const [comp, d] of Object.entries(assen.componenten)) {
  const assenNu = Object.fromEntries(Object.entries(d.assen).filter(([as]) => !NIET_VISUEEL[`${comp}.${as}`]));
  let combis = [{}];
  for (const [as, w] of Object.entries(assenNu)) combis = combis.flatMap(c => w.map(x => ({ ...c, [as]: x })));
  uit[comp] = {};
  for (const args of combis) {
    const naam = Object.keys(assenNu).length ? Object.entries(args).map(([k, v]) => `${k}=${v}`).join(', ') : 'default';
    const q = Object.keys(args).length ? `&args=${encodeURIComponent(Object.entries(args).map(([k, v]) => `${k}:${typeof v === 'boolean' ? '!' + v : v}`).join(';'))}` : '';
    await page.goto(`http://localhost:${server.address().port}/iframe.html?id=${d.storyId}&viewMode=story${q}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(150);
    uit[comp][naam] = await page.evaluate(tel, primairVan(comp).slot);
  }
}
await browser.close(); server.close();
writeFileSync(join(UI, 'figma/check0.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/figma/check0.mjs, buiten de walker om. Referentie voor Check 0 in figma/toets-batch.js.',
  componenten: uit,
}, null, 1) + '\n');
const fouten = Object.entries(uit).flatMap(([c, v]) => Object.entries(v).filter(([, x]) => x.fout).map(([n, x]) => `${c} [${n}]: ${x.fout}`));
for (const [c, v] of Object.entries(uit)) console.log(`  ${c}: ${Object.entries(v).map(([n, x]) => `${n} → ${x.teksten?.length ?? '?'} tekst, ${x.iconen ?? '?'} icoon, ${x.verfdozen ?? '?'} verfdoos`).join(' · ')}`);
if (fouten.length) { console.error('FOUTEN:\n  ' + fouten.join('\n  ')); process.exit(1); }
