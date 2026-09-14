#!/usr/bin/env node
/**
 * Guard — geen niet-gedeclareerde route in de tabbar, en geen story in de routeboom.
 *
 * Waarom dit bestaat. Op 2026-09-14 stond `app/(tabs)/profile.stories.tsx` als VIJFDE tab in de
 * uitgeleverde app: expo-router rendert élke route in de `(tabs)`-map als tab, en `Tabs.Screen`
 * configureert alleen opties — een niet-gedeclareerde route krijgt er dus stil één bij, met de
 * rauwe bestandsnaam als label. Aantikken gaf een Render Error, want het `export default` van een
 * CSF-bestand is een object en geen component. De vijfde tab stal bovendien de breedte waardoor
 * "HISTORIEK" afbrak tot "HISTORIE / K".
 *
 * Twee assen, allebei tweezijdig getoetst door `guard-tabbar-routes.selftest.mjs`:
 *
 *   [tabs]    de routes die expo-router in `(tabs)/` aanmaakt zijn exact de namen in
 *             `<Tabs.Screen name=…>`. Niet "hoogstens vier" — dat is een symptoom.
 *   [stories] geen enkel bestand onder `app/` eindigt op `.stories.*`. `app/` IS de routeboom;
 *             expo-router 6.0.23 sluit in `_ctx.ios.js` alleen `+api`, `+html` en `+middleware`
 *             uit, en dat is niet configureerbaar (gelezen in node_modules, niet aangenomen).
 *
 * Drie regels uit expo-router die de eerste versie van deze guard NIET kende. Alle drie gemeten
 * op 2026-09-14 tegen gemuteerde kopieën van de echte boom; alle drie lieten de guard groen of
 * gaven een vals alarm, en staan nu als eigen zelftest-geval:
 *
 *   1  Alléén `_layout` is een layout (`getRoutesCore.js`: `isLayout = naam === '_layout'`).
 *      Elk ánder bestand met een underscore — `_helpers.tsx` — is gewoon een route. De eerste
 *      versie sloeg alles met `_` over en zag die vijfde tab dus niet.
 *   2  Een map ZONDER `_layout` bestaat niet als eigen navigator: zijn routes worden gehesen
 *      naar de dichtstbijzijnde `_layout` erboven. `history/_layout.tsx` weghalen maakt van één
 *      gedeclareerde tab twee ongedeclareerde. De eerste versie telde elke map als één tab.
 *   3  Een map zonder enig routebestand levert géén route op. De eerste versie meldde die als
 *      ongedeclareerde tab — een vals alarm dat naar een fix wees die zelf fout was.
 *
 * Exit 0 = schoon, exit 2 = bevinding of een opstelling die niet kán meten.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = fileURLToPath(new URL('.', import.meta.url));
const WORTEL = process.env.GUARD_APP_ROOT ?? join(HIER, '..');
const APP = join(WORTEL, 'app');
const TABS = join(APP, '(tabs)');
const LAYOUT = join(TABS, '_layout.tsx');

/** Bestandsextensies die expo-router als route oppakt. */
const ROUTE_EXT = /\.(tsx|ts|jsx|js)$/;
/** Platformsuffix (`login.ios.tsx`) hoort niet bij de routenaam. */
const PLATFORM = /\.(ios|android|web|native)$/;

const kaalNaam = (bestand) => bestand.replace(ROUTE_EXT, '').replace(PLATFORM, '');
const isStory = (naam) => /\.stories\.(tsx|ts|jsx|js)$/.test(naam);
/** `_layout` is de ENIGE layout. `+html`, `+api`, `+native-intent` staan buiten de context-regex. */
const isLayout = (bestand) => kaalNaam(bestand) === '_layout';
const isSpeciaal = (bestand) => /^\+/.test(bestand) || /\+api$/.test(kaalNaam(bestand));

function stop(reden) {
  console.error(`❌ deze guard kan hier niet meten — ${reden}`);
  process.exit(2);
}

if (!existsSync(APP)) stop(`geen app/ onder ${WORTEL}`);
if (!existsSync(TABS)) stop(`geen app/(tabs)/ onder ${WORTEL}`);
if (!existsSync(LAYOUT)) stop('geen app/(tabs)/_layout.tsx — zonder declaratie valt er niets te vergelijken');

function loopAf(map, uit = []) {
  for (const item of readdirSync(map)) {
    const pad = join(map, item);
    if (statSync(pad).isDirectory()) loopAf(pad, uit);
    else uit.push(pad);
  }
  return uit;
}

/**
 * De routenamen die expo-router in de `(tabs)`-navigator zal aanmaken.
 * Een map mét `_layout` is één route (zijn eigen navigator); een map zónder `_layout` levert
 * zijn routes gehesen aan, op hun pad; een map zonder routebestanden levert niets.
 */
function routesInNavigator(map, prefix = '') {
  const namen = new Set();
  for (const item of readdirSync(map)) {
    const pad = join(map, item);
    if (statSync(pad).isDirectory()) {
      const kinderen = readdirSync(pad);
      const heeftLayout = kinderen.some((k) => ROUTE_EXT.test(k) && isLayout(k));
      if (heeftLayout) {
        namen.add(prefix + item); // eigen navigator → één route
      } else {
        for (const n of routesInNavigator(pad, `${prefix}${item}/`)) namen.add(n); // gehesen
      }
      continue;
    }
    if (!ROUTE_EXT.test(item)) continue;
    if (isLayout(item) || isSpeciaal(item)) continue;
    if (isStory(item)) continue; // die vangt de [stories]-as
    namen.add(prefix + kaalNaam(item));
  }
  return namen;
}

/**
 * De namen die `(tabs)/_layout.tsx` declareert.
 * Knip de bron op elke `<Tabs.Screen` en lees per stuk de naam met `naamOpDiepteNul` hieronder.
 * Een regex over het hele stuk kan dit niet: `[^>]*?` struikelt over de `>` van een arrow-functie,
 * en een ruimer venster pakt de `name=` van een geneste node op. Beide gemeten, 2026-09-14.
 */
function routesGedeclareerd(bron) {
  const stukken = bron.split(/<Tabs\.Screen\b/).slice(1);
  const namen = new Set();
  let ongeparsed = 0;
  for (const stuk of stukken) {
    const naam = naamOpDiepteNul(stuk);
    if (naam) namen.add(naam);
    else ongeparsed++;
  }
  return { namen, gevonden: stukken.length, ongeparsed };
}

/**
 * Leest `name=` alléén als DIRECTE prop van de opening-tag.
 * Een venster-match pakt anders de `name=` van een geneste node op: gemeten 2026-09-14 gaf
 * een hernoemde prop niet onleesbaar maar `name="home-outline"` van de <Ionicons> in
 * `options` — een verkeerde naam is erger dan geen naam, want die oordeelt gewoon door.
 * Brace-diepte scheidt de twee: alles binnen `{…}` hoort bij een prop-waarde, niet bij de tag.
 * Dit lost meteen het `=>`-probleem op: een arrow-functie zit per definitie binnen braces.
 */
function naamOpDiepteNul(stuk) {
  let diepte = 0;
  for (let i = 0; i < stuk.length; i++) {
    const c = stuk[i];
    if (c === '{') { diepte++; continue; }
    if (c === '}') { diepte--; continue; }
    if (diepte !== 0) continue;
    if (c === '>' || (c === '/' && stuk[i + 1] === '>')) break; // einde opening-tag
    if (stuk.startsWith('name=', i)) {
      const m = stuk.slice(i).match(/^name=(["'])(.+?)\1/);
      if (m) return m[2];
    }
  }
  return null;
}

const bevindingen = [];

// [tabs]
const opSchijf = routesInNavigator(TABS);
const { namen: gedeclareerd, gevonden, ongeparsed } = routesGedeclareerd(readFileSync(LAYOUT, 'utf8'));

// Negatieve controle op de parser zelf — óók bij een GEDEELTELIJKE mislukking. Drie van de vier
// geparsed ziet er gezond uit en is het niet.
if (gevonden === 0) {
  stop('nul <Tabs.Screen> gevonden in app/(tabs)/_layout.tsx. Is de declaratievorm veranderd, pas dan deze guard aan in plaats van hem te laten zwijgen.');
}
if (ongeparsed > 0) {
  stop(`${ongeparsed} van ${gevonden} <Tabs.Screen> zonder leesbare name= — de parser mist er een, dus elk oordeel hieronder zou een gok zijn.`);
}

for (const naam of opSchijf) {
  if (!gedeclareerd.has(naam)) {
    bevindingen.push(
      `[tabs] route "${naam}" ontstaat in app/(tabs)/ maar wordt niet gedeclareerd in _layout.tsx — ` +
        'expo-router geeft hem een tab met default-opties (de bestandsnaam als label).'
    );
  }
}
for (const naam of gedeclareerd) {
  if (!opSchijf.has(naam)) {
    bevindingen.push(
      `[tabs] _layout.tsx declareert "${naam}" maar expo-router maakt geen route met die naam in app/(tabs)/.`
    );
  }
}

// [stories] — recursief over de HELE routeboom, niet alleen (tabs): vier van de zeven
// bestanden die dit defect veroorzaakten stonden in app/(auth)/.
for (const pad of loopAf(APP)) {
  if (isStory(pad)) {
    bevindingen.push(
      `[stories] ${relative(WORTEL, pad)} staat in de routeboom — app/ is wat expo-router scant, ` +
        'en het export default van een CSF-bestand is een object, geen component.'
    );
  }
}

if (bevindingen.length === 0) {
  console.log(
    `✅ tabbar-routes schoon — ${opSchijf.size} routes in app/(tabs)/, ${gedeclareerd.size} gedeclareerd, 0 stories in app/`
  );
  process.exit(0);
}
console.error(`❌ ${bevindingen.length} bevinding(en) — ${opSchijf.size} routes, ${gedeclareerd.size} gedeclareerd:`);
for (const b of bevindingen) console.error(`   · ${b}`);
process.exit(2);
