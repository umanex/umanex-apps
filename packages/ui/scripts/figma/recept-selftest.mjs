#!/usr/bin/env node
/**
 * Tegenproef voor figma/lees-manifest.js en figma/lees-geometrie.js — de twee scripts die de
 * Figma-staat neerslaan waar figma-sync-check.mjs en geometry-parity.mjs op rusten.
 *
 * DE KLASSE DIE DIT SLUIT (LEARNINGS 2026-09-09, drie keer gemeten): een leesrecept in markdown liep
 * uit de pas met de guard die zijn uitvoer leest — een helper die niet bestond, een geneste vorm
 * waar een platte gelezen werd, Base als lijst waar een object gelezen werd. Elke keer meldde de
 * guard daarna "fix de code, of werk Figma bij": de verkeerde oorzaak. Een recept dat door niets
 * wordt uitgevoerd, kan zo drie keer breken zonder dat iets rood wordt.
 *
 * DE MANIER: bouw een stub-`figma` UIT de gecommitte bestanden, draai de echte scripts erop (als
 * AsyncFunction, zoals de plugin), en eis dat ze die bestanden teruggeven — op `gegenereerd` na.
 * Een script dat een andere vorm schrijft dan wat er gecommit staat, is dan rood.
 *
 * EN DE TEGENPROEF, twee kanten: een gemuteerd SCRIPT (de afvlakking van `variantGroupProperties`
 * eruit — precies het defect van 2026-09-09) en een gemuteerde STUB (een hernoemde variant) moeten
 * elk een verschil geven. Blijven ze groen, dan kan deze opstelling het defect niet opwekken.
 *
 * Gebruik: node scripts/figma/recept-selftest.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MANIFEST = JSON.parse(readFileSync(join(UI, 'figma/manifest.json'), 'utf8'));
const GEOMETRIE = JSON.parse(readFileSync(join(UI, 'figma/geometry.figma.json'), 'utf8'));
const F = Object.getPrototypeOf(async function () {}).constructor;

function hslNaarRgbFloat(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: f(0), g: f(8), b: f(4), a: 1 };
}

/** Een stub die de plugin-API zo ver nabootst als de twee scripts hem lezen — niet verder. */
function stubVan(manifest, geometrie, { muteer } = {}) {
  const variabelen = new Map();
  const collecties = [];
  for (const [naam, c] of Object.entries(manifest.collections)) {
    const modes = c.modes.map((m, i) => ({ modeId: `${naam}:${i}`, name: m }));
    const ids = [];
    const namen = Array.isArray(c.variables) ? c.variables : Object.keys(c.variables);
    for (const vn of namen) {
      const id = `${naam}/${vn}`; ids.push(id);
      const valuesByMode = {};
      for (const m of modes) {
        if (!Array.isArray(c.variables)) { valuesByMode[m.modeId] = c.variables[vn]; continue; }
        const w = c.waarden?.[vn]?.[m.name];
        const hsl = String(w).match(/^([\d.]+) ([\d.]+)% ([\d.]+)%$/);
        const rgba = String(w).match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
        valuesByMode[m.modeId] = hsl ? hslNaarRgbFloat(+hsl[1], +hsl[2], +hsl[3])
          : rgba ? { r: +rgba[1] / 255, g: +rgba[2] / 255, b: +rgba[3] / 255, a: +rgba[4] } : w;
      }
      variabelen.set(id, { name: vn, valuesByMode });
    }
    collecties.push({ name: naam, modes, variableIds: ids });
  }

  const telbaar = n => Array.from({ length: n }, () => ({ visible: true }));
  const variantNode = (set, v) => {
    const g = geometrie.gemeten?.[set]?.[v.name];
    return { name: v.name, id: v.id, type: 'COMPONENT', getPluginData: () => '',
      ...(g ? { height: g.h, layoutMode: g.lay, paddingTop: g.pad[0], paddingRight: g.pad[1], paddingBottom: g.pad[2], paddingLeft: g.pad[3],
                itemSpacing: g.gap, cornerRadius: g.r, strokeWeight: g.bw, fills: telbaar(g.fills), strokes: telbaar(g.strokes),
                effects: telbaar(g.eff), opacity: g.op } : {}) };
  };
  // Een pagina die de builder maakte draagt `pluginData('primair')` op zijn primary — zo herkennen
  // beide leesscripts hem. Welke pagina's dat zijn, zegt de gecommitte geometrie (`paginas`). Zonder
  // dit leest de stub Switch als handgebouwde set en telt hem mee in `gemeten` (gemeten 2026-09-16:
  // 12 sets tegen 11 — een fout van de stub, niet van het script).
  const builderPaginas = new Set(Object.keys(geometrie.paginas ?? {}));
  const componentNode = (d, isBuilderPrimary = false) => {
    const n = { name: d.name, id: d.id, type: d.type, getPluginData: (k) => (k === 'primair' && isBuilderPrimary ? '1' : '') };
    if (d.type === 'COMPONENT_SET') {
      n.variantGroupProperties = Object.fromEntries(Object.entries(d.variantProperties ?? {}).map(([as, w]) => [as, { values: w }]));
      n.children = (d.varianten ?? []).map(v => variantNode(d.name, v));
    }
    return n;
  };
  const alleNodes = [];
  const paginas = Object.entries(manifest.pages).map(([naam, p]) => {
    const kinderen = [...(p.primary ? [componentNode(p.primary, builderPaginas.has(naam))] : []), ...p.extra.map(d => componentNode(d))];
    alleNodes.push(...kinderen);
    return { name: naam, id: p.pageId, children: kinderen };
  });
  if (muteer) muteer({ paginas });

  const zoek = (fn) => { const uit = []; (function loop(ns) { for (const n of ns) { if (fn(n)) uit.push(n); loop(n.children ?? []); } })(paginas.flatMap(p => p.children)); return uit; };
  return {
    fileKey: manifest.fileKey,
    root: { name: manifest.fileName, children: paginas, findAll: zoek },
    loadAllPagesAsync: async () => {},
    variables: {
      getLocalVariableCollectionsAsync: async () => collecties,
      getVariableByIdAsync: async (id) => variabelen.get(id),
    },
    getLocalTextStylesAsync: async () => manifest.textStyles.map(t => ({
      name: t.name, fontName: { family: t.family, style: t.style }, fontSize: t.fontSize,
      lineHeight: typeof t.lineHeight === 'number' ? { unit: 'PIXELS', value: t.lineHeight } : { unit: t.lineHeight },
      letterSpacing: { unit: 'PERCENT', value: t.letterSpacing } })),
    getLocalEffectStylesAsync: async () => manifest.effectStyles.map(name => ({ name })),
  };
}

/** Alle paden waarop twee JSON-waarden verschillen, `gegenereerd` uitgezonderd. */
function verschillen(a, b, pad = '') {
  if (pad === '.gegenereerd') return [];
  if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return [`${pad}: ${JSON.stringify(a)?.slice(0, 60)} ≠ ${JSON.stringify(b)?.slice(0, 60)}`];
  if (a && typeof a === 'object') {
    const sleutels = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...sleutels].flatMap(k => verschillen(a[k], b[k], `${pad}.${k}`));
  }
  return a === b ? [] : [`${pad}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`];
}

const bronManifest = readFileSync(join(UI, 'figma/lees-manifest.js'), 'utf8');
const bronGeometrie = readFileSync(join(UI, 'figma/lees-geometrie.js'), 'utf8');
const draai = (bron, figma) => new F('figma', bron)(figma);

const gevallen = [];
const eis = (naam, ok, detail = '') => gevallen.push({ naam, ok, detail });

// 1. De scripts reproduceren wat er gecommit staat.
{
  const uit = await draai(bronManifest, stubVan(MANIFEST, GEOMETRIE));
  const d = verschillen(uit, MANIFEST);
  eis(`lees-manifest.js reproduceert figma/manifest.json (${Object.keys(MANIFEST.pages).length} pagina's)`, d.length === 0, d.slice(0, 5).join('\n        '));
}
{
  const uit = await draai(bronGeometrie, stubVan(MANIFEST, GEOMETRIE));
  // `schema`, `velden` en `paginas` komen erbij voor builder-pagina's; het gecommitte bestand kan
  // van vóór die uitbreiding zijn. De legacy-helft moet exact gelijk zijn.
  const legacy = { $comment: uit.$comment, fileKey: uit.fileKey, gegenereerd: uit.gegenereerd, sets: uit.sets, varianten: uit.varianten, gemeten: uit.gemeten };
  const bewaard = { $comment: GEOMETRIE.$comment, fileKey: GEOMETRIE.fileKey, gegenereerd: GEOMETRIE.gegenereerd, sets: GEOMETRIE.sets, varianten: GEOMETRIE.varianten, gemeten: GEOMETRIE.gemeten };
  const d = verschillen(legacy, bewaard);
  eis(`lees-geometrie.js reproduceert de ${GEOMETRIE.varianten} legacy-metingen`, d.length === 0, d.slice(0, 5).join('\n        '));
  const verwacht = Object.keys(GEOMETRIE.paginas ?? {}).sort();
  eis(`lees-geometrie.js herkent precies de builder-pagina's (${verwacht.join(', ') || 'geen'}) — de filter op pluginData werkt`,
    JSON.stringify(Object.keys(uit.paginas).sort()) === JSON.stringify(verwacht), JSON.stringify(Object.keys(uit.paginas)));
}

// 2. Tegenproef op het SCRIPT: het defect van 2026-09-09 (geneste assen) moet rood worden.
{
  const kapot = bronManifest.replace('[as, v.values]', '[as, v]');
  eis('tegenproef: de mutatie raakte het script', kapot !== bronManifest);
  const d = verschillen(await draai(kapot, stubVan(MANIFEST, GEOMETRIE)), MANIFEST);
  eis('tegenproef: geneste variant-assen geven een verschil', d.length > 0, `${d.length} verschillen`);
}
{
  const kapot = bronManifest.replace("if (c.name === 'Base') {", "if (c.name === 'NietBase') {");
  eis('tegenproef: de Base-mutatie raakte het script', kapot !== bronManifest);
  const d = verschillen(await draai(kapot, stubVan(MANIFEST, GEOMETRIE)), MANIFEST);
  eis('tegenproef: Base als lijst geeft een verschil', d.length > 0, `${d.length} verschillen`);
}
// 3. Tegenproef op de STUB: een Figma-wijziging (hernoemde variant) moet rood worden.
{
  const figma = stubVan(MANIFEST, GEOMETRIE, { muteer: ({ paginas }) => { paginas.find(p => p.name === 'Button').children[0].children[0].name = 'variant=hernoemd'; } });
  const d = verschillen(await draai(bronManifest, figma), MANIFEST);
  eis('tegenproef: een hernoemde variant in Figma geeft een verschil', d.length === 1 && /Button/.test(d[0]), d.join(' | '));
}

const stuk = gevallen.filter(g => !g.ok);
for (const g of gevallen) console.log(`${g.ok ? '  ok' : 'FOUT'}  ${g.naam}${g.ok ? '' : `\n        ${g.detail}`}`);
console.log(`\n${gevallen.length - stuk.length}/${gevallen.length} geslaagd`);
process.exit(stuk.length ? 1 : 0);
