#!/usr/bin/env node
/**
 * Meet de veiligheidsmarge van TYPO_DISTANCE in scripts/guard.mjs.
 *
 * De guard behandelt een klasse als tikfout wanneer hij dicht genoeg bij een echte
 * rolnaam ligt. "Dicht genoeg" is alleen te verantwoorden als er een gat zit tussen
 * onze rolnamen en de klassen die mensen écht schrijven. Dit script meet dat gat in
 * plaats van het te beredeneren.
 *
 * Corpus: elke Tailwind-klasse die de vier bestaande web-apps in deze repo gebruiken
 * (cashflow, jobradar, portfolio, vyvey). Die draaien niet op RowTrack's tokens, dus
 * elke treffer daar is per definitie géén rol — en dus een kandidaat voor vals alarm.
 *
 *   node scripts/margin.mjs
 */
import { readFile, glob } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { colorClassNames, scalarNames } from '../tailwind/roleMap.mjs';
import { distance } from './distance.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');
const CORPUS = ['apps/cashflow', 'apps/jobradar', 'apps/portfolio', 'apps/vyvey', 'packages/ui'];

const { hslRoles, rawRoles, scalarRoles, shadowRoles } = await import(
  join(HERE, '../build/roles.mjs')
);

const AXES = [
  {
    as: 'kleur',
    prefixes: ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'decoration', 'outline', 'divide', 'from', 'via', 'to', 'caret'],
    valid: colorClassNames([...hslRoles, ...rawRoles]),
  },
  { as: 'schaduw', prefixes: ['shadow'], valid: shadowRoles.map((n) => n.replace(/^shadow-/, '')) },
  { as: 'radius', prefixes: ['rounded'], valid: scalarNames(scalarRoles, 'radius') },
  { as: 'randbreedte', prefixes: ['border'], valid: scalarNames(scalarRoles, 'stroke') },
  { as: 'hoogte', prefixes: ['h', 'min-h'], valid: scalarNames(scalarRoles, 'size') },
];

for (const axis of AXES) {
  const prefixes = [...axis.prefixes].sort((a, b) => b.length - a.length).join('|');
  axis.re = new RegExp(`(?<![\\w-])(?:${prefixes})-([a-z0-9]+(?:-[a-z0-9]+)*)(?![\\w-])`, 'g');
  axis.gezien = new Set();
}

let bestanden = 0;
for (const scope of CORPUS) {
  for await (const file of glob(`${scope}/**/*.{ts,tsx,css}`, { cwd: ROOT })) {
    if (file.includes('node_modules') || file.includes('.next')) continue;
    bestanden++;
    const text = await readFile(join(ROOT, file), 'utf-8');
    for (const axis of AXES) {
      for (const m of text.matchAll(axis.re)) axis.gezien.add(m[1]);
    }
  }
}

console.log(`\nCorpus: ${bestanden} bestanden uit ${CORPUS.join(', ')}\n`);
console.log('as'.padEnd(14) + 'klassen'.padStart(8) + 'min.afstand'.padStart(13) + '  dichtstbijzijnde paar');

let globaalMin = Infinity;
for (const axis of AXES) {
  let min = Infinity;
  let paar = null;
  for (const naam of axis.gezien) {
    // Een exacte treffer is per definitie geldig — de guard kort daarop af vóór hij
    // aan de nabijheidscheck toekomt. Hem meetellen zou een marge van 0 rapporteren
    // voor een geval dat nooit vals alarm kan geven.
    if (axis.valid.includes(naam)) continue;
    for (const rol of axis.valid) {
      const d = distance(naam, rol);
      if (d < min) {
        min = d;
        paar = `${naam} ↔ ${rol}`;
      }
    }
  }
  globaalMin = Math.min(globaalMin, min);
  console.log(
    axis.as.padEnd(14) +
    String(axis.gezien.size).padStart(8) +
    String(min === Infinity ? '—' : min).padStart(13) +
    '  ' + (paar ?? '—')
  );
}

console.log(`\nKleinste afstand over alle assen: ${globaalMin}`);
const DREMPEL = 1;
console.log(`TYPO_DISTANCE moet daar strikt ONDER blijven. Nu: ${DREMPEL} → marge ${globaalMin - DREMPEL}.`);
if (globaalMin <= DREMPEL) {
  console.error('\n✗ De marge is weg: een echte Tailwind-klasse ligt binnen de drempel en zou vals alarm geven.');
  process.exit(1);
}
console.log('✓ marge intact');
