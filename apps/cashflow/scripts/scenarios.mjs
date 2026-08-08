#!/usr/bin/env node
/**
 * Draait de scenario-suites op de rekenkern, allebei, met hun eigen tegenproef ervoor.
 *
 *   pnpm --filter cashflow scenarios
 *   pnpm --filter cashflow scenarios:buffer   # één suite, rauw
 *
 * Waarom dit bestaat en niet gewoon `a && b`:
 *
 *   1. **`&&` verbergt de tweede suite.** Bij een rekenkern-wijziging die allebei breekt,
 *      zag je alleen de buffer-suite; de anker-suite kwam pas de volgende push boven. Deze
 *      runner draait beide, altijd, en telt de uitkomsten daarna bij elkaar op.
 *   2. **Een guard zonder tegenproef meet niets.** `dom-sweep.mjs` draait zijn zelftest
 *      altijd mee en de flow-harness heeft `--selftest`; de scenario's hadden niets. Een
 *      refactor waarna `check()` zijn `failures` niet meer ophoogt, laat de stap voor
 *      altijd groen "594/594 geslaagd" melden terwijl er niets meer bewaakt wordt.
 *      Daarom draait elke suite hier eerst één keer met `SCENARIO_SELFTEST=1` — dat injecteert
 *      één check die moet falen — en die run hóórt niet-nul te eindigen.
 */
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const SUITES = [
  { naam: 'buffer', bestand: 'scripts/buffer-scenarios.ts' },
  { naam: 'anker', bestand: 'scripts/anchor-scenarios.ts' },
];

/** Draait één suite en geeft exitcode + uitvoer terug. Gooit niet: de uitkomst ís het antwoord. */
function draai(bestand, env = {}) {
  return new Promise((klaar) => {
    const proc = spawn(
      'pnpm',
      ['exec', 'tsx', '--tsconfig', 'scripts/tsconfig.json', bestand],
      { cwd: APP, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let uitvoer = '';
    proc.stdout.on('data', (d) => (uitvoer += d));
    proc.stderr.on('data', (d) => (uitvoer += d));
    proc.on('close', (code) => klaar({ code, uitvoer }));
  });
}

/** De laatste regel met een telling — dat is de samenvatting die de suite zelf print. */
function samenvatting(uitvoer) {
  const regels = uitvoer.split('\n').filter((r) => /checks geslaagd/.test(r));
  return regels[regels.length - 1]?.trim() ?? '(geen samenvatting)';
}

let gezakt = false;

// ── Fase 1: de tegenproef ────────────────────────────────────────────────────
for (const suite of SUITES) {
  const { code, uitvoer } = await draai(suite.bestand, { SCENARIO_SELFTEST: '1' });
  if (code === 0) {
    gezakt = true;
    console.error(`✗ tegenproef ${suite.naam}: de suite meldde succes terwijl er een fout in zat`);
    console.error('  De ingebouwde zelftest-check werd niet als fout geteld — deze suite bewaakt niets meer.');
  } else {
    console.log(`✓ tegenproef ${suite.naam}: valt met exit ${code} op een geïnjecteerde fout — ${samenvatting(uitvoer)}`);
  }
}

// ── Fase 2: de echte run ─────────────────────────────────────────────────────
let totaal = 0;
for (const suite of SUITES) {
  const { code, uitvoer } = await draai(suite.bestand);
  const kop = samenvatting(uitvoer);
  const aantal = Number(kop.match(/\/(\d+) checks/)?.[1] ?? 0);
  totaal += aantal;

  if (code === 0) {
    console.log(`✓ ${suite.naam}: ${kop}`);
    continue;
  }
  gezakt = true;
  console.error(`\n✗ ${suite.naam}: ${kop}\n`);
  // Alleen de FAIL-regels: de suites loggen elke geslaagde check, en dat zijn er honderden.
  for (const regel of uitvoer.split('\n').filter((r) => r.includes('FAIL'))) {
    console.error(`  ${regel.trim()}`);
  }
  console.error('');
}

console.log('');
console.log(
  gezakt
    ? '✗ scenarios: de rekenkern is niet groen (of een suite kan niet meer falen)'
    : `✓ scenarios: ${totaal} checks over ${SUITES.length} suites, en allebei bewezen faalbaar`,
);

process.exit(gezakt ? 1 : 0);
