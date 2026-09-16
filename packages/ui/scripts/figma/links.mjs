#!/usr/bin/env node
/**
 * Schrijft `parameters.figma.url` in elk stories-bestand van een component die de keten bouwde,
 * uit figma/manifest.json — nooit met de hand.
 *
 * Kopie in opzet van apps/rowtrack/scripts/figma-links.mjs (2026-09-16), met de vorm van de stories
 * in packages/ui: `parameters: { tokens: { source }, … }`, in zowel `const meta = { … } satisfies
 * Meta` als `const meta: Meta<…> = { … }`.
 *
 * WAAROM UIT HET MANIFEST. Een node-id wordt door Figma UITGEGEVEN; wie hem overtikt of voorspelt,
 * schrijft een bewering over een node die er misschien niet is. De [link]-as van figma-sync-check
 * legt de url naast `pages[<naam>].primary.id` — dat klopt alleen als beide uit dezelfde lezing komen.
 *
 * VOLGORDE (rowtrack, 2026-09-08): eerst het manifest verversen, dán dit script, dán figma:check.
 * Omgekeerd schrijft dit script de ids van de vórige bouw.
 *
 *   node scripts/figma/links.mjs          schrijft
 *   node scripts/figma/links.mjs --check  schrijft niets; exit 1 als een story een andere url zou krijgen
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEGACY } from './doel.mjs';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CHECK = process.argv.includes('--check');
const manifest = JSON.parse(readFileSync(join(UI, 'figma/manifest.json'), 'utf8'));
const dir = join(UI, 'components/ui');

const gewijzigd = [], problemen = [], gelijk = [];
for (const bestand of readdirSync(dir).filter(f => f.endsWith('.stories.tsx')).sort()) {
  const pad = join(dir, bestand);
  const src = readFileSync(pad, 'utf8');
  const titel = src.match(/title:\s*['"]Componenten\/([\w-]+)['"]/)?.[1];
  if (!titel || LEGACY.includes(titel)) continue;
  const primary = manifest.pages[titel]?.primary;
  if (!primary) { problemen.push(`${bestand}: geen Figma-pagina "${titel}" met een primary in het manifest — bouw eerst`); continue; }
  const url = `https://www.figma.com/design/${manifest.fileKey}/${encodeURIComponent(manifest.fileName).replace(/%20/g, '-')}?node-id=${primary.id.replace(':', '-')}`;
  const regel = `figma: { url: '${url}' },`;
  let nieuw;
  const bestaand = src.match(/figma:\s*\{\s*url:\s*'[^']*'\s*\},?/g) ?? [];
  if (bestaand.length > 1) { problemen.push(`${bestand}: ${bestaand.length} figma-urls — verwacht er hoogstens één`); continue; }
  if (bestaand.length === 1) nieuw = src.replace(bestaand[0], regel);
  else {
    const anker = src.match(/(\n(\s*)tokens:\s*\{\s*source\s*\},?)/);
    if (!anker) { problemen.push(`${bestand}: geen \`tokens: { source }\` in parameters — kan de url niet plaatsen`); continue; }
    nieuw = src.replace(anker[1], `${anker[1].replace(/,?$/, ',')}\n${anker[2]}${regel}`);
  }
  if (nieuw === src) { gelijk.push(titel); continue; }
  gewijzigd.push(`${bestand} -> node-id=${primary.id}`);
  if (!CHECK) writeFileSync(pad, nieuw);
}

for (const g of gewijzigd) console.log(`${CHECK ? 'zou wijzigen' : 'geschreven'}: ${g}`);
for (const p of problemen) console.log(`PROBLEEM: ${p}`);
console.log(`${gelijk.length} al juist, ${gewijzigd.length} ${CHECK ? 'te wijzigen' : 'gewijzigd'}, ${problemen.length} probleem/problemen`);
if (problemen.length || (CHECK && gewijzigd.length)) process.exit(1);
