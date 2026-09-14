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
 *   [tabs]    de routes op schijf in `app/(tabs)/` zijn exact de namen in `<Tabs.Screen name=…>`.
 *             Niet "hoogstens vier" — dat is een symptoom. Een route erbij die niemand declareert
 *             is de fout, ongeacht het aantal.
 *   [stories] geen enkel bestand onder `app/` eindigt op `.stories.*`. `app/` IS de routeboom;
 *             expo-router 6.0.23 sluit in `_ctx.ios.js` alleen `+api`, `+html` en `+middleware`
 *             uit, en dat is niet configureerbaar (gelezen in node_modules, niet aangenomen).
 *
 * Exit 0 = schoon, exit 2 = bevinding.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HIER = fileURLToPath(new URL('.', import.meta.url));
const WORTEL = process.env.GUARD_APP_ROOT ?? join(HIER, '..');
const APP = join(WORTEL, 'app');
const TABS = join(APP, '(tabs)');

/** Bestandsextensies die expo-router als route oppakt. */
const ROUTE_EXT = /\.(tsx|ts|jsx|js)$/;
/** Platformsuffix (`login.ios.tsx`) hoort niet bij de routenaam. */
const PLATFORM = /\.(ios|android|web|native)$/;

const isStory = (naam) => /\.stories\.(tsx|ts|jsx|js)$/.test(naam);

function loopAf(map, uit = []) {
  for (const item of readdirSync(map)) {
    const pad = join(map, item);
    if (statSync(pad).isDirectory()) loopAf(pad, uit);
    else uit.push(pad);
  }
  return uit;
}

/** De routenamen die expo-router in `(tabs)/` als tab zal renderen. */
function routesOpSchijf() {
  const namen = new Set();
  for (const item of readdirSync(TABS)) {
    const pad = join(TABS, item);
    if (statSync(pad).isDirectory()) {
      namen.add(item); // een map met een _layout is één tab
      continue;
    }
    if (!ROUTE_EXT.test(item)) continue;
    if (item.startsWith('_')) continue; // _layout
    if (isStory(item)) continue; // die vangt de [stories]-as, niet deze
    namen.add(item.replace(ROUTE_EXT, '').replace(PLATFORM, ''));
  }
  return namen;
}

/** De namen die `(tabs)/_layout.tsx` expliciet declareert. */
function routesGedeclareerd() {
  const bron = readFileSync(join(TABS, '_layout.tsx'), 'utf8');
  const namen = new Set();
  for (const m of bron.matchAll(/<Tabs\.Screen\b[^>]*?\bname=(["'])(.+?)\1/gs)) namen.add(m[2]);
  return namen;
}

const bevindingen = [];

// [tabs]
const opSchijf = routesOpSchijf();
const gedeclareerd = routesGedeclareerd();
if (gedeclareerd.size === 0) {
  bevindingen.push(
    '[tabs] nul <Tabs.Screen name=…> gevonden in app/(tabs)/_layout.tsx — dit meet niets. ' +
      'Is de declaratievorm veranderd, pas dan deze guard aan in plaats van hem te laten zwijgen.'
  );
} else {
  for (const naam of opSchijf) {
    if (!gedeclareerd.has(naam)) {
      bevindingen.push(
        `[tabs] route "${naam}" staat in app/(tabs)/ maar wordt niet gedeclareerd in _layout.tsx — ` +
          'expo-router geeft hem een tab met default-opties (de bestandsnaam als label).'
      );
    }
  }
  for (const naam of gedeclareerd) {
    if (!opSchijf.has(naam)) {
      bevindingen.push(
        `[tabs] _layout.tsx declareert "${naam}" maar er is geen route met die naam in app/(tabs)/.`
      );
    }
  }
}

// [stories]
for (const pad of loopAf(APP)) {
  if (isStory(pad)) {
    bevindingen.push(
      `[stories] ${relative(WORTEL, pad)} staat in de routeboom — app/ is wat expo-router scant, ` +
        'en het export default van een CSF-bestand is een object, geen component.'
    );
  }
}

const tabsTotaal = opSchijf.size;
if (bevindingen.length === 0) {
  console.log(
    `✅ tabbar-routes schoon — ${tabsTotaal} routes in app/(tabs)/, ${gedeclareerd.size} gedeclareerd, 0 stories in app/`
  );
  process.exit(0);
}
console.error(`❌ ${bevindingen.length} bevinding(en) — ${tabsTotaal} routes op schijf, ${gedeclareerd.size} gedeclareerd:`);
for (const b of bevindingen) console.error(`   · ${b}`);
process.exit(2);
