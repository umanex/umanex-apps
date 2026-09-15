#!/usr/bin/env node
/**
 * Tegenproef voor lib/guardRules.mjs — beide kanten van beide regels.
 *
 * Waarom dit bestaat: de enige app die vandaag onder PM2 draait is cashflow, en zijn
 * server is een productiebuild op :3000. De "guard zwijgt"-kant meten door
 * `pm2 stop cashflow` te doen zou die server platleggen. Dus draait de regel hier op
 * synthetische PM2- en branch-staat, mét de échte scripttekst uit de package.json
 * van de app — de helft die wél uit de werkelijkheid moet komen.
 *
 * De tabel mengt bewust "blokkeert" en "vrij". Geven alle regels dezelfde uitkomst,
 * dan meet deze opstelling het defect niet en is dat de bevinding, geen bevestiging.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blokkade, commandoTekst } from '../lib/guardRules.mjs';
import { ontleed, weigering, zoekCheck } from '../lib/cockpitCheckRules.mjs';

const hier = dirname(fileURLToPath(import.meta.url));
const appsDir = join(hier, '../../');

const scriptsVan = (id) => JSON.parse(readFileSync(join(appsDir, id, 'package.json'), 'utf8')).scripts ?? {};

const START = { cashflow: 'pnpm dev', portfolio: 'pnpm dev', rowtrack: 'npx expo start --dev-client' };

/** [app, knop, pm2Naam, branch, moetBlokkeren, waarom deze regel er staat] */
const GEVALLEN = [
  ['cashflow',  'start', 'cashflow',  'feature/x', true,  'regel 1 vuurt: dev wist .next onder de PM2-server'],
  ['cashflow',  'start', null,        'feature/x', false, 'regel 1 zwijgt zonder PM2 — de kant die productie nooit toont'],
  ['cashflow',  'build', 'cashflow',  'feature/x', true,  'regel 2 vuurt: next build op een feature branch'],
  ['cashflow',  'build', 'cashflow',  'main',      false, 'regel 2 zwijgt op main — de branch-conditie doet echt iets'],
  ['portfolio', 'start', 'portfolio', 'feature/x', false, 'regel 1 keert op de scripttekst, niet op de appnaam'],
  ['portfolio', 'build', 'portfolio', 'feature/x', true,  'regel 2 is app-agnostisch, niet aan cashflow vastgeknoopt'],
  ['rowtrack',  'start', null,        'feature/x', false, 'expo raakt geen van beide regels'],
];

const fouten = [];

// Rail: laat het instrument het object éérst terugvinden. Blokkeert regel 1 omdat
// `pnpm dev` correct oploste naar de dev-tekst, of omdat er toevallig iets matchte?
const cashflowStart = commandoTekst(scriptsVan('cashflow'), START.cashflow, 'start');
if (!/rm\s+-rf\s+\S*\.next/.test(cashflowStart)) {
  fouten.push(`commandoTekst loste 'pnpm dev' niet op naar cashflow's dev-script — kreeg: ${cashflowStart}`);
}

for (const [app, knop, pm2Naam, branch, moetBlokkeren, waarom] of GEVALLEN) {
  const tekst = commandoTekst(scriptsVan(app), START[app] ?? '', knop);
  const reden = blokkade(tekst, { pm2Naam, branch });
  const geblokkeerd = reden !== null;
  const status = geblokkeerd === moetBlokkeren ? 'ok  ' : 'FAIL';
  if (geblokkeerd !== moetBlokkeren) {
    fouten.push(`${app}/${knop} (pm2=${pm2Naam}, branch=${branch}): verwacht ${moetBlokkeren ? 'blokkade' : 'vrij'}, kreeg ${geblokkeerd ? `blokkade "${reden}"` : 'vrij'}`);
  }
  console.log(`  ${status} ${app}/${knop} → ${geblokkeerd ? 'blokkeert' : 'vrij'} — ${waarom}`);
}

// Een tabel die maar één uitkomst kent, kan het defect niet opwekken.
const uitkomsten = new Set(GEVALLEN.map((g) => g[4]));
if (uitkomsten.size < 2) fouten.push('alle gevallen verwachten dezelfde uitkomst — deze opstelling toetst niets');

// ── Tweede poort: lib/cockpitCheckRules.mjs ─────────────────────────────────────────
//
// De cockpit kan het commando uit een `- **Check:**`-regel draaien. Die poort hoort
// dezelfde tegenproef te krijgen als de blokkade hierboven: een tabel die alleen weigert
// of alleen doorlaat, meet niets.
//
// Let op de ontleed-gevallen. Een naïeve split op `|` snijdt door `grep -E 'a|b'` heen en
// leest het brokstuk daarna als commandonaam. Gemeten 2026-09-15 over 144 echte checks gaf
// dat weigeringen op "pathname", "Overlay" en "/resultaten" — stukjes uit het midden van
// een geldig commando. Een poort die om de verkeerde reden weigert, leert je hem te omzeilen.

/** [commando, moetWeigeren, waarom deze regel er staat] */
const CHECKS = [
  ['grep -c FIXTURE apps/a/HANDOFF.md', false, 'een kale grep mag'],
  ['grep -c x a.md | wc -l', false, 'een pijplijn van lezende commandos mag'],
  ["grep -E 'open|verified' HANDOFF.md", false, 'een pipe BINNEN quotes is geen splitser'],
  ["awk -F'\\t' '$1==\"x\"' bestand.tsv", false, 'quotes en tabs breken de ontleding niet'],
  ["curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3010/", false, 'een lezende curl mag'],
  ["node -e 'console.log(1)'", false, 'node -e is leesbaar te toetsen'],
  ['git log --oneline -3', false, 'lezende git mag'],
  ['rm -rf .next', true, 'verwijdert bestanden'],
  ['git push origin main', true, 'verandert de remote'],
  ['git checkout main', true, 'verandert de werkkopie'],
  ['grep -c x a.md > uit.txt', true, 'leidt uitvoer naar een bestand'],
  ['grep -c x a.md > /dev/null', false, 'maar /dev/null is geen bestand dat je kwijtraakt'],
  ['bash scripts/doctor.sh ~/repo', true, 'bash maakt de allowlist betekenisloos'],
  ['node scripts/detect.mjs', true, 'een scriptbestand valt buiten wat de poort kan lezen'],
  ['pnpm add lodash', true, 'wijzigt dependencies'],
  ['pm2 restart cashflow', true, 'raakt een draaiend productieproces'],
  ['echo $(rm -rf /)', true, 'commando-substitutie valt buiten de poort'],
  ['grep -c x a.md | rm -rf b', true, 'élk segment wordt getoetst, niet alleen het eerste'],
  ["grep -c '>' a.md", false, 'een groter-dan BINNEN quotes is data, geen redirect'],
  ["grep -c 'x", true, 'een niet-gesloten quote is niet te ontleden'],
  ['', true, 'leeg commando'],
];

console.log('');
for (const [cmd, moetWeigeren, waarom] of CHECKS) {
  const reden = weigering(cmd);
  const geweigerd = reden !== null;
  const status = geweigerd === moetWeigeren ? 'ok  ' : 'FAIL';
  if (geweigerd !== moetWeigeren) {
    fouten.push(`check-poort "${cmd}": verwacht ${moetWeigeren ? 'weigering' : 'doorlaten'}, kreeg ${geweigerd ? reden : 'doorgelaten'}`);
  }
  console.log(`  ${status} ${geweigerd ? 'weigert ' : 'laat door'} — ${waarom}`);
}

const checkUitkomsten = new Set(CHECKS.map((c) => c[1]));
if (checkUitkomsten.size < 2) fouten.push('alle check-gevallen verwachten dezelfde uitkomst — deze opstelling toetst niets');

// zoekCheck: het commando komt uit de MÉTING, niet uit de request. Drie kanten.
const rijen = [
  { bestand: 'HANDOFF.md', datum: '2026-07-01', check: 'grep -c x a.md' },
  { bestand: 'HANDOFF.md', datum: '2026-07-02', check: '' },
  { bestand: 'dubbel.md', datum: '2026-07-03', check: 'ls' },
  { bestand: 'dubbel.md', datum: '2026-07-03', check: 'ls -la' },
];
const gevallen = [
  [['HANDOFF.md', '2026-07-01'], 'commando', 'een bestaande entry levert haar commando'],
  [['HANDOFF.md', '2026-07-02'], 'fout', 'een entry zonder commando wordt geweigerd'],
  [['bestaat.md', '2026-07-01'], 'fout', 'een verzonnen entry bestaat niet in de meting'],
  [['dubbel.md', '2026-07-03'], 'fout', 'twee entries op dezelfde sleutel: weigeren, niet gokken'],
];
for (const [[bestand, datum], verwacht, waarom] of gevallen) {
  const uit = zoekCheck(rijen, bestand, datum);
  const kreeg = 'fout' in uit ? 'fout' : 'commando';
  const status = kreeg === verwacht ? 'ok  ' : 'FAIL';
  if (kreeg !== verwacht) fouten.push(`zoekCheck(${bestand}, ${datum}): verwacht ${verwacht}, kreeg ${kreeg}`);
  console.log(`  ${status} zoekCheck → ${kreeg} — ${waarom}`);
}

// ontleed: de quote-bewuste splitsing zelf, want daar zat het defect.
const ONTLEED = [
  ["grep -E 'a|b' f", 1, 'een pipe binnen quotes splitst niet'],
  ['grep a f | wc -l', 2, 'een pipe erbuiten splitst wel'],
  ['a && b || c ; d', 4, 'alle vier de operatoren splitsen'],
];
for (const [cmd, n, waarom] of ONTLEED) {
  const uit = ontleed(cmd);
  const kreeg = 'fout' in uit ? -1 : uit.segmenten.length;
  const status = kreeg === n ? 'ok  ' : 'FAIL';
  if (kreeg !== n) fouten.push(`ontleed("${cmd}"): verwacht ${n} segment(en), kreeg ${kreeg}`);
  console.log(`  ${status} ontleed → ${kreeg} segment(en) — ${waarom}`);
}

console.log('');
if (fouten.length) {
  for (const f of fouten) console.error(`  FOUT ${f}`);
  process.exit(1);
}
console.log(`${GEVALLEN.length} start/build-gevallen en ${CHECKS.length + gevallen.length + ONTLEED.length} check-poort-gevallen groen — elke regel vuurt én zwijgt.`);
