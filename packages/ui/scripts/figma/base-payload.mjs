#!/usr/bin/env node
/**
 * tokens.json → figma/base-payload.json: wat de Figma-collectie Base hoort te dragen.
 *
 * Base was tot 2026-09-17 een tweede bron: spacing, border en icon-stroke bestonden alleen in
 * Figma, met Tailwinds defaults als stille oorsprong. Sinds Layout/Scale in tokens.json staat, is
 * Figma ontvanger. Dit script zegt wat er moet staan; `figma/zet-base.js` zet het in Figma, bij
 * naam, zodat bestaande variabele-ids (en daarmee elke binding) blijven.
 *
 * Niet in de payload: de radius-stappen. Die leidt de preset met calc() af van één token; ze
 * blijven een bekend gat in figma-sync-check (BEKENDE_GATEN).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const tokens = JSON.parse(readFileSync(join(UI, '../tokens/tokens.json'), 'utf8'));
const layout = tokens['Layout/Scale'];
const base = tokens['Theme/base'] ?? {};
if (!layout?.spacing) { console.error('✗ Layout/Scale ontbreekt in tokens.json'); process.exit(1); }
if (!layout.icon?.stroke) { console.error('✗ Layout/Scale mist icon.stroke'); process.exit(1); }

const px = (node) => {
  const t = String(node.$value ?? node.value);
  if (t.endsWith('rem')) return parseFloat(t) * 16;
  const n = parseFloat(t);
  if (Number.isNaN(n)) throw new Error(`geen getal: ${t}`);
  return n;
};

// Tokens Studio mag op groepsniveau `$type` of `$description` schrijven; dat is geen stap.
const stappen = (groep) => Object.entries(groep ?? {}).filter(([k]) => !k.startsWith('$'));

const schaal = [
  ...stappen(layout.spacing).map(([k, v]) => ({ naam: `spacing-${k}`, px: px(v) })),
  ...stappen(layout.border).map(([k, v]) => ({ naam: `border-${k}`, px: px(v) })),
  { naam: 'icon-stroke', px: px(layout.icon.stroke) },
];
const schaalNamen = new Set(schaal.map(s => s.naam));

// Figma-scope per rolgroep: GAP dekt padding en gap in auto layout, WIDTH_HEIGHT de afmetingen.
// Zo verschijnt spacing-surface niet in het hoogteveld en size-control-md niet bij padding.
const SCOPES = { spacing: ['GAP'], size: ['WIDTH_HEIGHT'] };
const rollen = [];
for (const [groep, scopes] of Object.entries(SCOPES)) {
  for (const [k, v] of stappen(base[groep])) {
    const ref = String(v.$value ?? v.value).match(/^\{spacing\.([\w]+)\}$/);
    if (!ref) { console.error(`✗ ${groep}.${k} is geen alias naar een spacing-stap: ${v.$value}`); process.exit(1); }
    const alias = `spacing-${ref[1]}`;
    if (!schaalNamen.has(alias)) { console.error(`✗ ${groep}.${k} wijst naar ${alias}, die niet in Layout/Scale staat`); process.exit(1); }
    rollen.push({ naam: `${groep}-${k}`, alias, scopes });
  }
}

const uit = {
  $comment: 'Gegenereerd door scripts/figma/base-payload.mjs uit packages/tokens/tokens.json — niet met de hand bewerken.',
  schaal,
  rollen,
};
const doel = join(UI, 'figma/base-payload.json');
const inhoud = JSON.stringify(uit, null, 2) + '\n';
// --check: het gecommitte bestand moet gelijk zijn aan wat tokens.json nu oplevert. Een push uit
// Tokens Studio bouwt packages/tokens, niet deze payload; zonder de check schrijft zet-base.js
// daarna stil de oude waarden naar Figma.
if (process.argv.includes('--check')) {
  const huidig = existsSync(doel) ? readFileSync(doel, 'utf8') : '';
  if (huidig !== inhoud) {
    console.error('✗ figma/base-payload.json loopt achter op tokens.json — draai `pnpm --filter @umanex/ui figma:base`');
    process.exit(1);
  }
  console.log(`✓ figma/base-payload.json actueel: ${schaal.length} schaalvariabelen, ${rollen.length} rollen`);
} else {
  writeFileSync(doel, inhoud);
  console.log(`✓ figma/base-payload.json: ${schaal.length} schaalvariabelen, ${rollen.length} rollen`);
}
