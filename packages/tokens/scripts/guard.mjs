#!/usr/bin/env node
/**
 * Laag-discipline guard.
 *
 * De regel: app-code en packages/ui raken uitsluitend de ROLLAAG aan, via een
 * Tailwind-utility uit de gedeelde preset. Geen primitive, geen rauwe paletkleur,
 * geen hardcoded hex, geen arbitrary type- of radius-waarde.
 *
 * Waarom een script en niet alleen ESLint: de SVG fill=/stroke=-attributen en de
 * .css-bestanden vallen buiten ESLint's Literal/TemplateElement-selectors, en
 * packages/ui heeft geen eslint-config. Dit dekt alles wat op schijf staat.
 *
 * BASELINE bevat de bekend-geaccepteerde overtredingen. Die lijst mag krimpen,
 * nooit groeien — een nieuwe overtreding faalt de build ook als het totaal nog
 * onder het oude aantal ligt.
 */
import { readFile, glob } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');

// vyvey en rowtrack hebben bewust een eigen design-DNA en eigen tokens.
const SCOPES = ['apps/cashflow', 'apps/jobradar', 'apps/portfolio', 'packages/ui'];

const RULES = [
  {
    id: 'primitive-in-code',
    re: /var\(--umanex/,
    msg: 'primitive-token in app-code — gebruik een rol-utility (bg-muted, text-foreground, text-finance-negative)',
  },
  {
    id: 'raw-palette',
    re: /\b(bg|text|border|ring|fill|stroke|accent|decoration|outline)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/,
    msg: 'rauwe Tailwind-paletkleur — gebruik de semantische rol',
  },
  {
    id: 'hardcoded-color',
    re: /\b(bg|text|border|ring|fill|stroke|accent)-\[#[0-9a-fA-F]{3,8}\]/,
    msg: 'hardcoded hex — voeg een rol toe in Theme/light én Theme/dark',
  },
  {
    id: 'absolute-white-black',
    re: /\b(bg|text|border)-(white|black)\b/,
    msg: 'bg-white / text-black is mode-blind — gebruik bg-background / text-foreground',
  },
  {
    id: 'arbitrary-font-size',
    re: /\btext-\[\d+(\.\d+)?(px|rem)\]/,
    msg: 'arbitrary font-size — gebruik een schaal-key (text-2xs, text-dense, text-sm)',
  },
  {
    id: 'arbitrary-radius',
    re: /\brounded(-[a-z]+)?-\[\d+px\]/,
    msg: 'arbitrary radius — gebruik rounded-sm / -md / -lg (afgeleid van --radius)',
  },
];

// Bekend en geaccepteerd. Formaat: "<pad>:<regel-id>". Laat het krimpen.
const BASELINE = new Set([
  // Geen radius-schaal-stap voor 2px/3px; er een verzinnen is een designbeslissing,
  // geen migratie. Zie de open punten in het refactor-verslag.
  'apps/cashflow/components/cashflow/VarianceChart.tsx:arbitrary-radius',
  'apps/cashflow/components/cashflow/MonthCard.tsx:arbitrary-radius',
]);

const files = [];
for (const scope of SCOPES) {
  for await (const f of glob(join(ROOT, scope, '**/*.{ts,tsx,css}'))) {
    if (f.includes('/node_modules/') || f.includes('/.next/')) continue;
    files.push(f);
  }
}

const violations = [];
for (const file of files) {
  const rel = relative(ROOT, file);
  const lines = (await readFile(file, 'utf-8')).split('\n');
  for (const rule of RULES) {
    const hits = lines
      .map((line, i) => (rule.re.test(line) ? { line: i + 1, text: line.trim().slice(0, 100) } : null))
      .filter(Boolean);
    if (!hits.length) continue;
    if (BASELINE.has(`${rel}:${rule.id}`)) continue;
    for (const hit of hits) violations.push({ rel, rule, ...hit });
  }
}

// --- Extra: het font-token mag niet liegen ----------------------------------
// next/font hasht de familienaam en levert hem via --font-sans, dus font.family.sans
// kan het font niet zelf leveren. Zonder deze check drift de app er stil vanaf.
const { fontFamily } = await import(join(ROOT, 'packages/tokens/build/typography.mjs'));
const expected = fontFamily.sans.replace(/\s+/g, '_');
for (const app of ['cashflow', 'jobradar', 'portfolio']) {
  const layout = join(ROOT, 'apps', app, 'app/layout.tsx');
  const src = await readFile(layout, 'utf-8').catch(() => null);
  if (!src) continue;
  const m = src.match(/import\s*\{\s*([A-Za-z_]+)\s*\}\s*from\s*'next\/font\/google'/);
  if (m && m[1] !== expected) {
    violations.push({
      rel: relative(ROOT, layout),
      rule: { id: 'font-token-drift', msg: `laadt ${m[1]} terwijl font.family.sans "${fontFamily.sans}" zegt` },
      line: src.slice(0, src.indexOf(m[0])).split('\n').length,
      text: m[0],
    });
  }
}

if (violations.length) {
  console.error(`\n✗ laag-discipline: ${violations.length} overtreding(en)\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}`);
    console.error(`    [${v.rule.id}] ${v.rule.msg}`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

console.log(`✓ laag-discipline: ${files.length} bestanden schoon (${BASELINE.size} baseline-uitzonderingen)`);
