#!/usr/bin/env node
// cockpit-purity.mjs — bewaakt dat de cockpit-views niets aanraken wat ze niet mee kunnen
// verhuizen.
//
// ── Waarom dit een guard is en geen afspraak ────────────────────────────────────────
// Het plan zegt dat de cockpit-views later naar een app moeten kunnen die klanten wél
// zien. Zo'n app draait op Vercel en heeft geen shell, geen `lsof` en geen pid-bestanden.
// Zolang "de views raken dat niet aan" een goed voornemen is, is het waar tot de eerste
// keer dat iemand snel een gemeten getal nodig heeft — en dan is het niet waar, en merkt
// niemand het tot de verhuizing.
//
// De grens loopt hier: `components/cockpit/**` krijgt data als props en doet er niets mee
// dan renderen. Lezen van schijf gebeurt in `lib/stand/**` en in de server-componenten;
// die blijven achter bij een verhuizing en worden vervangen door een fetch.
//
// ── Tegenproef ─────────────────────────────────────────────────────────────────────
// `--selftest` schrijft een overtredend bestand in een wegwerpmap en eist dat de guard
// daarop rood wordt, plus een schoon bestand waarop hij groen blijft. Een guard die
// alleen groen kan worden meet niets.

import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const MAP = join(APP, 'components/cockpit');

/** Wat een view nooit mag importeren, en waarom dat erg is. */
const VERBODEN = [
  { re: /from\s+['"]node:/, reden: 'een node-builtin — bestaat niet in een browser-bundel' },
  { re: /from\s+['"](fs|path|child_process|os|net|http|https)['"]/, reden: 'een node-builtin' },
  { re: /require\(\s*['"]node:/, reden: 'een node-builtin via require' },
  { re: /from\s+['"]@\/lib\/(launch|processes|guards|appScripts|paths|status|git)['"]/,
    reden: 'de meet- of uitvoerlaag van het bedieningspaneel' },
  { re: /from\s+['"]@\/lib\/stand\/(lezen|registry)['"]/,
    reden: 'de leeslaag — die leest van schijf en verhuist niet mee' },
  { re: /\bexecFileSync\b|\bexecSync\b|\bspawn\b/, reden: 'shell-uitvoering' },
  { re: /\breadFileSync\b|\bwriteFileSync\b|\bexistsSync\b/, reden: 'directe schijftoegang' },
];

function bestanden(dir) {
  let uit = [];
  let items;
  try {
    items = readdirSync(dir);
  } catch {
    return uit;
  }
  for (const naam of items) {
    const pad = join(dir, naam);
    if (statSync(pad).isDirectory()) uit = uit.concat(bestanden(pad));
    else if (/\.(tsx|ts|mjs|js)$/.test(naam)) uit.push(pad);
  }
  return uit;
}

function scan(dir, wortel) {
  const bevindingen = [];
  const lijst = bestanden(dir);
  for (const pad of lijst) {
    const inhoud = readFileSync(pad, 'utf8');
    inhoud.split('\n').forEach((regel, i) => {
      for (const { re, reden } of VERBODEN) {
        if (re.test(regel)) {
          bevindingen.push({ pad: relative(wortel, pad), regel: i + 1, reden, tekst: regel.trim() });
        }
      }
    });
  }
  return { bevindingen, gescand: lijst.length };
}

function selftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'cockpit-purity-'));
  let fouten = 0;
  const zegt = (naam, ok) => {
    console.log(`  ${ok ? '✓' : '✗'} ${naam}`);
    if (!ok) fouten += 1;
  };

  writeFileSync(join(tmp, 'Schoon.tsx'), "import Link from 'next/link';\nexport const A = () => <Link href='/' />;\n");
  zegt('een schone view geeft nul bevindingen', scan(tmp, tmp).bevindingen.length === 0);

  writeFileSync(join(tmp, 'Vies.tsx'), "import { readFileSync } from 'node:fs';\nexport const B = () => null;\n");
  const na = scan(tmp, tmp).bevindingen;
  zegt('een view die node:fs importeert wordt gemeld', na.length > 0);
  zegt('en de melding noemt het bestand', na.some((b) => b.pad.includes('Vies')));

  writeFileSync(join(tmp, 'Leeslaag.tsx'), "import { leesIndex } from '@/lib/stand/lezen';\nexport const C = () => null;\n");
  zegt(
    'een view die de leeslaag importeert wordt ook gemeld',
    scan(tmp, tmp).bevindingen.some((b) => b.pad.includes('Leeslaag')),
  );

  // Een lege map is geen groen: dan is er niets gescand en bewijst de guard niets.
  const leeg = mkdtempSync(join(tmpdir(), 'cockpit-purity-leeg-'));
  zegt('een lege map levert nul gescande bestanden op', scan(leeg, leeg).gescand === 0);

  rmSync(tmp, { recursive: true, force: true });
  rmSync(leeg, { recursive: true, force: true });
  console.log(fouten === 0 ? '\n✓ selftest: 5 van 5' : `\n✗ selftest: ${fouten} gefaald`);
  return fouten;
}

if (process.argv.includes('--selftest')) {
  process.exit(selftest());
}

const { bevindingen, gescand } = scan(MAP, APP);

// Nul bevindingen op nul bestanden is geen groen maar een stille meting. De noemer hoort
// er altijd bij te staan — zonder die regel leest een kapotte glob als succes.
if (gescand === 0) {
  console.error(`✗ cockpit-purity: geen enkel bestand gescand in ${relative(APP, MAP)} — meting ongeldig`);
  process.exit(2);
}

if (bevindingen.length === 0) {
  console.log(`✓ cockpit-purity: ${gescand} view(s) schoon — geen node-builtins, geen shell, geen leeslaag`);
  process.exit(0);
}

console.error(`✗ cockpit-purity: ${bevindingen.length} bevinding(en) in ${gescand} bestand(en)`);
for (const b of bevindingen) {
  console.error(`  ${b.pad}:${b.regel} — ${b.reden}`);
  console.error(`      ${b.tekst}`);
}
console.error('\n  Views krijgen data als props. Lezen hoort in lib/stand/ of in een server-component.');
process.exit(1);
