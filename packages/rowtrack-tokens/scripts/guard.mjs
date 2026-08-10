#!/usr/bin/env node
/**
 * Rol-utility guard.
 *
 * De preset garandeert dat je geen kleur kunt gebruiken die geen rol is: de
 * utility-set wordt uit de tokens gegenereerd, dus wat geen rol is heeft geen
 * utility. Die garantie heeft één gat, en dat is geen theoretisch gat — het is een
 * bug die in deze repo al gerenderd heeft:
 *
 *     className="border-l border-border-default"
 *
 * `border.default` landt in de preset als de DEFAULT-sleutel, dus de utility heet
 * `border-border`. `border-border-default` bestaat niet. In `@apply` faalt dat hard,
 * maar in een `className` slaat Tailwind een onbekende klasse stil over: de rand
 * verscheen gewoon in Tailwinds eigen grijs. Geen foutmelding, geen rode CI, en een
 * kleur op het scherm die uit geen enkel token komt.
 *
 * Deze guard vangt precies dat geval. Hij herkent een klasse als BEDOELD-als-token
 * aan zijn wortel — `bg-`, `fg-`, `accent-`, `achievement-`, `gradient-`, en de
 * wortels van de radius-, stroke-, size- en shadow-rollen — en eist dan dat de rest
 * ervan een bestaande rol is. Tailwinds eigen utilities (`border-b`, `text-lg`,
 * `shadow-lg`, `h-full`, `bg-cover`) dragen die wortels niet en blijven dus buiten
 * schot; dat is de reden dat er op wortel gefilterd wordt en niet op prefix.
 *
 *   pnpm --filter @umanex/rowtrack-tokens guard
 *   pnpm --filter @umanex/rowtrack-tokens guard --selftest   # bewijst dat hij kán falen
 *
 * De namen komen uit tailwind/roleMap.mjs — dezelfde module die de preset gebruikt.
 * Een eigen kopie zou betekenen dat de guard iets anders bewaakt dan de preset
 * genereert, en dat is erger dan geen guard.
 */
import { readFile, glob } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COLOR_GROUPS,
  colorClassNames,
  nameRoots,
  scalarNames,
} from '../tailwind/roleMap.mjs';
import { distance } from './distance.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '../../..');

/** Apps die op RowTrack's rollaag draaien. */
const SCOPES = ['apps/rowtrack-web'];

const { hslRoles, rawRoles, scalarRoles, shadowRoles } = await import(
  join(HERE, '../build/roles.mjs')
);

const shadowNames = shadowRoles.map((n) => n.replace(/^shadow-/, ''));
const radiusNames = scalarNames(scalarRoles, 'radius');
const strokeNames = scalarNames(scalarRoles, 'stroke');
const sizeNames = scalarNames(scalarRoles, 'size');

/**
 * Per as: welke utility-prefixes hem kunnen dragen, welke namen geldig zijn, en aan
 * welke wortels we een klasse herkennen als bedoeld-als-token.
 */
const AXES = [
  {
    as: 'kleur',
    prefixes: ['bg', 'text', 'border', 'ring', 'fill', 'stroke', 'decoration', 'outline', 'divide', 'from', 'via', 'to', 'caret'],
    valid: colorClassNames([...hslRoles, ...rawRoles]),
    roots: COLOR_GROUPS,
  },
  { as: 'schaduw', prefixes: ['shadow'], valid: shadowNames, roots: nameRoots(shadowNames) },
  { as: 'radius', prefixes: ['rounded'], valid: radiusNames, roots: nameRoots(radiusNames) },
  { as: 'randbreedte', prefixes: ['border'], valid: strokeNames, roots: nameRoots(strokeNames) },
  { as: 'hoogte', prefixes: ['h', 'min-h'], valid: sizeNames, roots: nameRoots(sizeNames) },
];

for (const axis of AXES) {
  if (!axis.valid.length) {
    throw new Error(
      `[rowtrack-guard] as "${axis.as}" heeft geen enkele geldige naam — dat wijst op een ` +
      `lege of niet-gebouwde build/roles.mjs, en zou de guard stil laten slagen op alles.`
    );
  }
  // De wortels staan op lengte gesorteerd, zodat de langste wint. Anders zou
  // 'border' uit COLOR_GROUPS ook 'border-subtle' afsnijden op de korte variant.
  const roots = [...axis.roots].sort((a, b) => b.length - a.length).join('|');
  const prefixes = [...axis.prefixes].sort((a, b) => b.length - a.length).join('|');

  // Eén regex die ELKE waarde achter een prefix van deze as vangt — ook waarden die
  // geen bekende wortel dragen. Dat is nodig voor de nabijheidscheck hieronder.
  axis.re = new RegExp(`(?<![\\w-])(?:${prefixes})-([a-z0-9]+(?:-[a-z0-9]+)*)(?![\\w-])`, 'g');
  axis.rootRe = new RegExp(`^(?:${roots})(?:-[a-z0-9]+)*$`);
  axis.set = new Set(axis.valid);
}

const ranked = (name, valid) =>
  [...valid].sort((a, b) => distance(name, a) - distance(name, b));

const suggest = (name, valid) => ranked(name, valid).slice(0, 3);

/**
 * Hoe ver een klasse van een echte rol mag afliggen voordat we hem als tikfout
 * behandelen in plaats van als een gewone Tailwind-utility.
 *
 * Dit vangt de tikfout in het WORTELsegment — `rounded-cardd`, `border-defualt` —
 * die de wortelherkenning per definitie mist, want daar is de wortel zelf verminkt.
 *
 * De drempel is GEMETEN, niet gekozen: `node scripts/margin.mjs` legt elke
 * Tailwind-klasse uit de vier bestaande web-apps naast onze rolnamen en rapporteert
 * de kleinste afstand. Die is 2 — `rounded-full` ligt twee bewerkingen van onze rol
 * `pill`. Op drempel 2 zou de guard dus een doodgewone Tailwind-klasse afkeuren.
 *
 * Vandaar 1, en vandaar Damerau: een omgewisseld letterpaar (`defualt`) telt als één
 * bewerking en wordt gevangen, terwijl het toevallige buurpaar `full`/`pill` op 2
 * blijft liggen. margin.mjs faalt wanneer die marge verdwijnt.
 */
const TYPO_DISTANCE = 1;

function scan(rel, text) {
  const lines = text.split('\n');
  const found = [];

  for (const axis of AXES) {
    lines.forEach((line, i) => {
      for (const m of line.matchAll(axis.re)) {
        const naam = m[1];
        if (axis.set.has(naam)) continue;

        const dichtstbij = ranked(naam, axis.valid);
        const afstand = distance(naam, dichtstbij[0]);

        // Twee manieren om fout te zijn. Draagt de klasse een bekende wortel, dan is
        // de bedoeling onmiskenbaar en is elke onbekende staart fout. Draagt hij die
        // niet, dan kan het net zo goed een Tailwind-utility zijn — dus pas bij een
        // treffer dicht tegen een echte rol noemen we het een tikfout.
        const wortel = axis.rootRe.test(naam);
        if (!wortel && afstand > TYPO_DISTANCE) continue;

        found.push({
          rel,
          line: i + 1,
          axis: axis.as,
          klasse: m[0],
          naam,
          reden: wortel
            ? `"${naam}" draagt een bekende wortel maar is geen rol`
            : `"${naam}" ligt ${afstand} bewerking(en) van een rol — vermoedelijk een tikfout`,
          suggesties: suggest(naam, axis.valid),
          tekst: line.trim().slice(0, 100),
        });
      }
    });
  }

  return found;
}

const SELFTEST = process.argv.includes('--selftest');

if (SELFTEST) {
  // De tegenproef. Een guard die draait is nog geen guard die meet, dus hier staat
  // één geval dat hij MOET vangen — de echte bug uit de geschiedenis van deze repo.
  // Let op de omkering: deze run slaagt (exit 0) wanneer de guard inderdaad afgaat.
  const sample = '<li className="border-l border-border-default pl-4">';
  const hits = scan('<zelftest>', sample);

  if (!hits.length) {
    console.error('\n✗ zelftest: de guard vond niets in een regel die hij hóórt af te keuren.');
    console.error(`    ${sample}`);
    console.error('  Hij meet dus niets, ongeacht hoe groen een gewone run is.\n');
    process.exit(1);
  }

  console.log(`\n✓ zelftest: de guard gaat af waar hij hoort (${hits[0].klasse} → ${hits[0].suggesties[0]})`);
  process.exit(0);
}

const violations = [];
let scanned = 0;

for (const scope of SCOPES) {
  for await (const file of glob(`${scope}/**/*.{ts,tsx,css}`, { cwd: ROOT })) {
    if (file.includes('node_modules') || file.includes('.next')) continue;
    scanned++;
    violations.push(...scan(file, await readFile(join(ROOT, file), 'utf-8')));
  }
}

if (violations.length) {
  console.error(`\n✗ rol-utilities: ${violations.length} klasse(n) die geen bestaande rol zijn\n`);
  for (const v of violations) {
    console.error(`  ${v.rel}:${v.line}`);
    console.error(`    [${v.axis}] "${v.klasse}" — ${v.reden}`);
    console.error(`    bedoelde je: ${v.suggesties.join(', ')}`);
    console.error(`    ${v.tekst}\n`);
  }
  console.error('  Tailwind negeert zo\'n klasse zonder foutmelding; het scherm toont dan');
  console.error('  zijn eigen kleur in plaats van een token. Vandaar dat dit hard faalt.\n');
  process.exit(1);
}

console.log(`\n✓ rol-utilities: ${scanned} bestanden schoon`);
