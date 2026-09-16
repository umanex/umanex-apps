#!/usr/bin/env node
/**
 * Tegenproef voor de poort en de meldingen-basislijn in packages/ui/figma/builder.js.
 *
 * Kopie van apps/rowtrack/scripts/figma-poort-selftest.mjs (2026-09-16). De poort draait in de
 * Figma-plugin, dus hij is niet vanaf de commandoregel aan te roepen; deze zelftest haalt
 * `bouwhash`, `poort`, `soortVan` en `telPerSoort` LETTERLIJK uit de brontekst en draait ze tegen
 * stub-nodes. Hernoem je een van die functies, dan valt deze test om in plaats van een oude kopie
 * te blijven toetsen.
 *
 * Eén geval erbij tegenover rowtrack, en het is de reden dat deze poort hier bestaat: een
 * COMPONENT of COMPONENT_SET zónder bouwhash is niet door de builder gemaakt. In rowtrack liet de
 * poort die door ("de eerste run na de invoering mag niet blokkeren"); in packages/ui staan vijftien
 * handgebouwde componenten waarvan de node-ids deep-linked zijn, dus die moeten geweigerd worden.
 *
 * Gebruik: node scripts/figma/poort-selftest.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BRON = readFileSync(join(UI, 'figma/builder.js'), 'utf8');

function pak(naam) {
  const start = BRON.search(new RegExp(`^(async )?function ${naam}\\(`, 'm'));
  if (start < 0) throw new Error(`functie ${naam} niet gevonden in figma/builder.js — hernoemd?`);
  let i = BRON.indexOf('{', start), diepte = 0;
  for (let j = i; j < BRON.length; j++) {
    if (BRON[j] === '{') diepte++;
    else if (BRON[j] === '}' && --diepte === 0) return BRON.slice(start, j + 1);
  }
  throw new Error(`functie ${naam}: geen sluitende accolade`);
}

const meldingen = [];
const { bouwhash, poort } = await new (Object.getPrototypeOf(async function () {}).constructor)(
  'meldingen', `${pak('bouwhash')}\n${pak('poort')}\nreturn { bouwhash, poort };`)(meldingen);

const T = (naam, tekst) => ({ type: 'TEXT', name: naam, width: 100, height: 20, characters: tekst });
const F = (naam, kinderen = [], w = 320, h = 48, type = 'COMPONENT') => ({ type, name: naam, width: w, height: h, children: kinderen });
const boom = (type = 'COMPONENT') => F('DialogContent', [F('header', [T('title', 'Project archiveren'), T('description', 'Kan later terug.')], 462, 44, 'FRAME')], 512, 150, type);

function pagina(kind, { status = 'UNPUBLISHED', hash = null } = {}) {
  const data = hash === null ? {} : { bouwhash: hash };
  kind.getPublishStatusAsync = async () => status;
  kind.getPluginData = (k) => data[k] ?? '';
  return { children: [kind] };
}

const gevallen = [];
const eis = (naam, ok, detail = '') => gevallen.push({ naam, ok, detail });

// --- 1. doorlaten wanneer er niets aan de hand is -----------------------------------------
eis('lege pagina bouwt gewoon', (await poort({ children: [] }, 'Dialog', false)) === null);
{
  const b = boom();
  eis('eigen component met kloppende hash bouwt gewoon', (await poort(pagina(b, { hash: bouwhash(b) }), 'Dialog', false)) === null);
}

// --- 2. het nieuwe bezwaar: onbekende herkomst ---------------------------------------------
{
  const r = await poort(pagina(boom('COMPONENT')), 'Button', false);
  eis('COMPONENT zonder bouwhash wordt geweigerd (handgebouwd)', Array.isArray(r) && r.length === 1 && /onbekende herkomst/.test(r[0]), JSON.stringify(r));
}
{
  const r = await poort(pagina(boom('COMPONENT_SET')), 'Button', false);
  eis('COMPONENT_SET zonder bouwhash wordt geweigerd', Array.isArray(r) && /onbekende herkomst/.test(r?.[0] ?? ''), JSON.stringify(r));
}
{
  const r = await poort(pagina(boom('FRAME')), 'Overzicht', false);
  eis('CONTROLE: een FRAME zonder bouwhash blokkeert niet', r === null, JSON.stringify(r));
}

// --- 3. publicatie ------------------------------------------------------------------------
{
  const b = boom();
  const r = await poort(pagina(b, { status: 'PUBLISHED', hash: bouwhash(b) }), 'Dialog', false, false);
  eis('gepubliceerd ZONDER hergebruik: geweigerd', Array.isArray(r) && r.length === 1 && /VERVANGEN/.test(r[0]), JSON.stringify(r));
}
{
  const b = boom();
  const r = await poort(pagina(b, { status: 'PUBLISHED', hash: bouwhash(b) }), 'Dialog', false, true);
  eis('gepubliceerd MET hergebruik: geen bezwaar', r === null, JSON.stringify(r));
}

// --- 4. handwerk --------------------------------------------------------------------------
const mutaties = {
  hernoemd: (n) => { n.children[0].name = 'kop'; },
  hertypt: (n) => { n.children[0].children[0].characters = 'Project verwijderen'; },
  vergroot: (n) => { n.children[0].width = 400; },
  toegevoegd: (n) => { n.children.push(T('badge', 'Nieuw')); },
  weggehaald: (n) => { n.children[0].children.pop(); },
  omgedraaid: (n) => { const k = n.children[0].children; k.push(k.shift()); },
  verplaatst: (n) => { const k = n.children[0].children; n.children.push(k.pop()); },
};
for (const [naam, muteer] of Object.entries(mutaties)) {
  const oud = bouwhash(boom());
  const b = boom(); muteer(b);
  const r = await poort(pagina(b, { hash: oud }), 'Dialog', false, true);
  eis(`handwerk gedetecteerd: ${naam}`, Array.isArray(r) && /met de hand gewijzigd/.test(r[0]), JSON.stringify(r));
}
{
  const oud = bouwhash(boom());
  const b = boom(); b.x = 512; b.children[0].width = 462.4; b.children[0].children[0].height = 19.7;
  eis('CONTROLE: positie en subpixel-ruis zijn géén handwerk', (await poort(pagina(b, { hash: oud }), 'Dialog', false, true)) === null);
}

// --- 5. de ontsnapping is zichtbaar ---------------------------------------------------------
{
  meldingen.length = 0;
  const r = await poort(pagina(boom('COMPONENT_SET')), 'Button', true);
  eis('__force laat door', r === null);
  eis('__force logt wat het overschreef', meldingen.length === 1 && /GEFORCEERD OVERSCHREVEN/.test(meldingen[0]), JSON.stringify(meldingen));
}
eis('bouwhash is deterministisch', bouwhash(boom()) === bouwhash(boom()));
eis('bouwhash draagt het knooppunt-aantal', bouwhash(boom()).split(':')[1] === '4');

// --- 6. de meldingen-basislijn: elke push-plek een soort, elke soort een plek ---------------
{
  const lijst = BRON.slice(BRON.indexOf('const MELDING_SOORTEN = ['));
  const eind = lijst.indexOf('\n];');
  if (eind < 0) throw new Error('MELDING_SOORTEN: geen sluitende `];` op eigen regel');
  const { MELDING_SOORTEN, soortVan, telPerSoort } = new Function(
    `${lijst.slice(0, eind + 3)}\n${pak('soortVan')}\n${pak('telPerSoort')}\nreturn { MELDING_SOORTEN, soortVan, telPerSoort };`)();
  function pushPlekken(bron) {
    const uit = []; let i = 0;
    for (;;) {
      const j = bron.indexOf('meldingen.push(', i); if (j < 0) break;
      let k = j + 'meldingen.push('.length, d = 1, q = null;
      while (d && k < bron.length) {
        const c = bron[k];
        if (q) { if (c === '\\') k++; else if (c === q) q = null; }
        else if (c === '`' || c === '"' || c === "'") q = c;
        else if (c === '(') d++;
        else if (c === ')') d--;
        k++;
      }
      uit.push({ regel: bron.slice(0, j).split('\n').length, arg: bron.slice(j + 'meldingen.push('.length, k - 1) });
      i = k;
    }
    return uit;
  }
  const voorbeeld = (arg) => new Function(`return (${arg.replace(/\$\{[^}]*\}/g, 'X')});`)();
  const plekken = pushPlekken(BRON).map((p) => ({ ...p, tekst: voorbeeld(p.arg) })).map((p) => ({ ...p, soort: soortVan(p.tekst) }));
  eis('push-plekken gevonden in de bron (positieve controle)', plekken.length >= 20, `${plekken.length}`);
  const zonderSoort = plekken.filter((p) => p.soort === 'onbekend');
  eis(`kant A: elke push-plek heeft een soort (${plekken.length} plekken)`, zonderSoort.length === 0,
    zonderSoort.map((p) => `regel ${p.regel}: ${p.tekst.slice(0, 70)}`).join('\n        '));
  const zonderPlek = MELDING_SOORTEN.map(([s]) => s).filter((s) => !plekken.some((p) => p.soort === s));
  eis(`kant B: elke soort dekt een plek (${MELDING_SOORTEN.length} soorten)`, zonderPlek.length === 0, zonderPlek.join(', '));
  const t = telPerSoort(['X: tekstkleur ongebonden', 'X: tekstkleur ongebonden', 'iets wat nog niet bestaat']);
  eis('telPerSoort telt per soort', t.perSoort['kleur-ongebonden'] === 2 && t.perSoort.onbekend === 1, JSON.stringify(t.perSoort));
  eis('tegenproef A: een verzonnen melding valt door kant A', soortVan('X: iets wat geen enkele regel kent') === 'onbekend');
  const nep = [...MELDING_SOORTEN, ['verouderde-soort', /zal nooit matchen 9f1c/]];
  eis('tegenproef B: een soort zonder plek valt door kant B',
    nep.map(([s]) => s).filter((s) => !plekken.some((p) => p.soort === s)).join() === 'verouderde-soort');
}

const stuk = gevallen.filter((g) => !g.ok);
for (const g of gevallen) console.log(`${g.ok ? '  ok' : 'FOUT'}  ${g.naam}${g.ok ? '' : `\n        ${g.detail}`}`);
console.log(`\n${gevallen.length - stuk.length}/${gevallen.length} geslaagd`);
process.exit(stuk.length ? 1 : 0);
