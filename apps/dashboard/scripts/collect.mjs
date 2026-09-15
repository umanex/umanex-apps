#!/usr/bin/env node
// collect.mjs — draait de collector van umanex-os over elke klant uit de registry.
//
//   pnpm --filter dashboard cockpit:collect            alle klanten
//   pnpm --filter dashboard cockpit:collect luminus    één klant
//
// ── Waarom dit script zo dun is ─────────────────────────────────────────────────────
// Het meet niets zelf. De parsers wonen in umanex-os — daar staan ze al (loop-aging,
// doctor) en daar draait fase 1 ze straks vanuit CI. Dit is de lokale aandrijving: lees
// de registry, roep `stand.sh` aan per klant, schrijf naar `.stand/<slug>/`. Zou dit
// script zelf gaan meten, dan had je twee bronnen voor dezelfde getallen.
//
// ── Wat het níet doet ───────────────────────────────────────────────────────────────
// Geen `git fetch`, geen checkout, geen schrijfactie in de gemeten repo's. Dat is geen
// nettigheid: op deze machine werkt geregeld een tweede sessie in een van die trees, en
// een collector die daar iets aanraakt maakt van een meting een ingreep.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = join(APP, 'stand.local.json');
const UIT = join(APP, '.stand');

function stop(boodschap, code = 1) {
  console.error(`✗ ${boodschap}`);
  process.exit(code);
}

if (!existsSync(REGISTRY)) {
  stop(
    `geen registry op ${REGISTRY}\n` +
      '  Kopieer het voorbeeld en vul de paden in:\n' +
      '    cp apps/dashboard/stand.local.example.json apps/dashboard/stand.local.json',
  );
}

let registry;
try {
  registry = JSON.parse(readFileSync(REGISTRY, 'utf8'));
} catch (e) {
  stop(`registry is geen geldige JSON: ${e}`);
}

const osRoot = registry.osRoot;
if (typeof osRoot !== 'string' || osRoot === '') stop('registry mist `osRoot`');

const stand = join(osRoot, 'scripts/stand.sh');
if (!existsSync(stand)) {
  // Dit gebeurt echt: de umanex-os working tree kan op een andere branch staan omdat er
  // een tweede sessie in werkt. Dat is geen fout van de registry, en de melding hoort dat
  // te zeggen in plaats van naar het pad te wijzen alsof het verkeerd ingevuld staat.
  stop(
    `${stand} bestaat niet\n` +
      '  Staat de umanex-os working tree op een branch zonder de collector? Controleer met:\n' +
      `    git -C ${osRoot} rev-parse --abbrev-ref HEAD\n` +
      '  Werkt daar een andere sessie, laat die tree dan met rust en wacht tot hij vrij is.',
  );
}

const gevraagd = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const klanten = (Array.isArray(registry.klanten) ? registry.klanten : []).filter(
  (k) => gevraagd.length === 0 || gevraagd.includes(k.slug),
);

if (klanten.length === 0) {
  stop(
    gevraagd.length === 0
      ? 'de registry bevat geen klanten'
      : `geen klant in de registry met slug ${gevraagd.join(', ')}`,
  );
}

let geslaagd = 0;
const gefaald = [];

for (const k of klanten) {
  if (!existsSync(k.repo)) {
    console.error(`  ✗ ${k.slug}: ${k.repo} bestaat niet — overgeslagen`);
    gefaald.push(k.slug);
    continue;
  }
  try {
    const uit = execFileSync('bash', [stand, k.repo, k.slug, join(UIT, k.slug)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    process.stdout.write(uit);
    geslaagd += 1;
  } catch (e) {
    const err = e;
    console.error(`  ✗ ${k.slug}: ${(err.stderr || err.message || '').toString().trim()}`);
    gefaald.push(k.slug);
  }
}

// Altijd de noemer erbij, ook bij groen: "3 van 4" maakt een overgeslagen klant zichtbaar
// in plaats van hem als succes te laten lezen.
console.log(`\n${geslaagd} van ${klanten.length} gemeten → ${UIT}`);
if (gefaald.length > 0) {
  console.error(`gefaald: ${gefaald.join(', ')}`);
  process.exit(1);
}
