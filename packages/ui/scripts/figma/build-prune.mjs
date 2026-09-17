#!/usr/bin/env node
/**
 * Snoeit figma/build-spec.json tot wat er in Figma gebouwd wordt, en beslist de laagnamen.
 *
 * Adapter `dom-tailwind` op apps/rowtrack/scripts/figma-build-prune.mjs (2026-09-16). Gelijk
 * gehouden: `vouwMarges` (marges -> padding/gap/spacer, met de spacer-hoogte `marge − gap`),
 * `rektVoorTekst` (tekst hugt tenzij de doos aantoonbaar breder is dan de run), de min-spec-
 * sleutels (`k`, `t`, `rekt`, `abs`, `dx`, `dy`, `padding`, `paddingVar`, …) en de gaten-inventaris
 * in `ongebonden.json`. Niet meegekopieerd: afgeleide slots uit schermvoorkomens (packages/ui
 * heeft geen schermen), schaduw-mapping op rowtrack-styles en de StyleSheet-laagnamen.
 *
 * DRIE VERTALINGEN DIE DE DOM NODIG HEEFT EN RN NIET:
 *
 *  1. TEKST IN EEN DOOS WORDT EEN LABEL-KIND. `<button class="px-4 bg-primary">Opslaan</button>`
 *     is in Figma een frame met een tekstnode erin, geen tekstnode met padding (die bestaat niet).
 *     Het kind staat hier in de spec en niet als syntheseregel in de builder, zodat parity het
 *     één-op-één vergelijkt — dezelfde reden waarom rowtrack zijn spacers in de spec zet.
 *  2. EEN TRANSPARANTE RAND IS PADDING. De rand van Switch (`border-2 border-transparent`) tekent
 *     niets maar neemt 2 px in. Een onzichtbare stroke zou een ongebonden verf zijn; padding is
 *     wat hij doet. De binding wijst naar `border-2`, want daar komt de ruimte vandaan.
 *  3. DE LAAGNAAM KOMT UIT `data-slot`. `dialog-header` heet in Figma `header`; een icoon `icon`,
 *     een label `label`. Een element zonder slot krijgt zijn tag en telt als `heuristiek` —
 *     de teller hoort op nul te staan.
 *
 * Uitvoer: figma/build-spec.min.json, figma/ongebonden.json, figma/laagnamen.json
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FILE_KEY, LEGACY, kebab } from './doel.mjs';
import { gapRol } from './layout-rollen.mjs';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = JSON.parse(readFileSync(join(UI, 'figma/manifest.json'), 'utf8')).collections.Base.variables;
/** Een spacing-waarde die exact een stap van de schaal is, bindt — ook als ze uit een marge komt. */
const spacingVar = v => { const naam = 'spacing-' + String(v / 4).replace('.', '_'); return BASE[naam] === v ? `Base:${naam}` : null; };
const spec = JSON.parse(readFileSync(join(UI, 'figma/build-spec.json'), 'utf8'));
if (spec.walkerVersie !== 3 || spec.adapter !== 'dom-tailwind') {
  console.error(`figma/build-spec.json draagt walkerVersie ${spec.walkerVersie} / adapter ${spec.adapter} — deze pas eist 3 / dom-tailwind`);
  process.exit(2);
}

const MAX_BROERS = 12;
const MAX_DIEPTE = 12;
const TEKST_BLOK_DREMPEL = 4;
const r2 = n => typeof n === 'number' ? Math.round(n * 100) / 100 : n;
let afgekaptTotaal = 0;
const afkappingen = [];
const perBron = { component: 0, slot: 0, label: 0, icon: 0, spacer: 0, heuristiek: 0 };
const heuristiek = [];

const isBlok = (node) => typeof node.tekst?.inhoudBreedte === 'number' && node.w - node.tekst.inhoudBreedte > TEKST_BLOK_DREMPEL;
const rektVoorTekst = (node) => (node.rekt ?? '').replace('H', isBlok(node) ? 'H' : '') || null;

/** Zie rowtrack: een hoofdas-marge wordt padding (eerste/laatste kind), gap (alle gaten), of een spacer. */
function vouwMarges(node) {
  const uit = { gap: 0, padding: [0, 0, 0, 0], voor: new Map(), rest: [] };
  const kids = (node.kinderen ?? []).filter(k => !['absolute', 'fixed'].includes(k.positie));
  if (!kids.length || !node.richting) return uit;
  const rij = node.richting === 'row';
  const [start, eind] = rij ? [3, 1] : [0, 2];
  const kruis = rij ? [0, 2] : [3, 1];
  const m = k => k.marge ?? [0, 0, 0, 0];
  for (const k of kids) {
    const eigen = m(k);
    if (eigen.some(v => v < 0) || kruis.some(i => eigen[i] > 0)) uit.rest.push([k.slot ?? k.tag, eigen]);
  }
  uit.padding[start] = Math.max(0, m(kids[0])[start]);
  uit.padding[eind] = Math.max(0, m(kids[kids.length - 1])[eind]);
  const gaten = kids.slice(1).map((k, i) => Math.max(0, m(kids[i])[eind]) + Math.max(0, m(k)[start]));
  if (!gaten.length) return uit;
  uit.gap = Math.min(...gaten);
  const gapEff = (node.gap ?? 0) + uit.gap;
  gaten.forEach((g, i) => {
    const overschot = g - uit.gap;
    if (overschot <= 0) return;
    const hoogte = overschot - gapEff;
    if (hoogte > 0.01) uit.voor.set(kids[i + 1], hoogte);
    else uit.rest.push([kids[i + 1].slot ?? kids[i + 1].tag, `marge ${overschot} kleiner dan gap ${gapEff} — een spacer zou ruimte TOEVOEGEN`]);
  });
  return uit;
}

/** De laagnaam en waar hij vandaan komt. */
function naamVan(node, comp, isWortel) {
  if (isWortel) return ['component', comp];
  if (node.svg) return ['icon', 'icon'];
  if (node.slot) {
    const prefix = kebab(comp) + '-';
    return ['slot', node.slot.startsWith(prefix) ? node.slot.slice(prefix.length) : node.slot];
  }
  if (node.tekst && !node.kinderen && !node.doos) return ['label', 'label'];
  return ['heuristiek', node.tag];
}

/** De tekst van een node, in de min-spec-vorm. */
function tekstVan(node) {
  const t = node.tekst;
  const o = { s: t.inhoud, f: t.family, px: r2(t.size), gw: t.gewicht, ls: r2(t.letterSpacing), lh: t.lineHeight ? r2(t.lineHeight) : null, k: t.kleur };
  if (t.kleurVar) { o.kVar = t.kleurVar; o.kOp = t.opacity; }
  if (t.styleRef) o.style = t.styleRef;
  if (t.styleNieuw) o.styleNieuw = t.styleNieuw;
  const TC = { uppercase: 'UPPER', lowercase: 'LOWER', capitalize: 'TITLE' };
  if (TC[t.transform]) o.tc = TC[t.transform];
  const AL = { center: 'CENTER', right: 'RIGHT', end: 'RIGHT', justify: 'JUSTIFIED' };
  if (AL[t.align]) o.al = AL[t.align];
  if (t.veld) o.veld = true;
  return o;
}

function snoei(node, diepte, pad, comp, isWortel = false) {
  const o = { w: r2(node.w), h: r2(node.h) };
  const [bron, naam] = naamVan(node, comp, isWortel);
  o.naam = naam;
  perBron[bron]++;
  if (bron === 'heuristiek') heuristiek.push(`${comp}${pad || '>wortel'}: <${node.tag}>`);

  if (/hidden|clip/.test(node.overflow ?? '')) o.knipt = true;
  if (node.richting) o.rij = node.richting === 'row';
  const M = vouwMarges(node);

  // Padding: gemeten, plus marges van de kinderen, plus een transparante rand (vertaling 2).
  const transparanteRand = node.borderWidth > 0 && (!node.borderColor || node.borderColor.a === 0);
  const padding = node.padding.map((p, i) => p + M.padding[i] + (transparanteRand ? node.borderWidths[i] : 0));
  if (padding.some(p => p)) {
    o.padding = padding.map(r2);
    o.paddingVar = node.padding.map((p, i) => {
      if (M.padding[i]) return p || (transparanteRand && node.borderWidths[i]) ? null : spacingVar(M.padding[i]);   // opgeteld: geen schaalstap meer
      if (transparanteRand && node.borderWidths[i]) return p ? null : `Base:border-${node.borderWidths[i]}`;
      return node.paddingVar?.[i] ?? null;
    });
  }
  // Een gap uit ÉÉN bron (de gemeten gap óf de marges van de kinderen) is nog een schaalstap:
  // `space-y-1.5` levert 6 = spacing-1_5. Uit twee bronnen opgeteld is hij dat niet meer.
  if (node.gap || M.gap) {
    o.gap = r2((node.gap ?? 0) + M.gap);
    // `space-y-heading` komt als marge binnen; de klasse op de ouder zegt welke rol dat is.
    const margeRol = gapRol(node.klassen ?? [], [node.richting === 'row' ? 'space-x' : 'space-y']);
    const margeVar = margeRol && BASE[margeRol] === M.gap ? `Base:${margeRol}` : spacingVar(M.gap);
    const gv = !M.gap ? node.gapVar : (!node.gap ? margeVar : null);
    if (gv) o.gapVar = gv;
  }
  if (node.justify && !['normal', 'flex-start', 'start'].includes(node.justify)) o.justify = node.justify;
  if (node.align && !['normal', 'stretch'].includes(node.align)) o.align = node.align;
  if (node.omgekeerd) o.omgekeerd = true;
  if (node.rasterKolommen) o.rasterKolommen = node.rasterKolommen;

  if (node.radius.some(x => x)) { o.radius = node.radius.map(r2); if (node.radiusVar?.some(Boolean)) o.radiusVar = node.radiusVar; }
  if (node.bg && node.bg.a > 0) { o.bg = node.bg; if (node.bgVar) { o.bgVar = node.bgVar; o.bgOp = node.bgOpacity; } }
  if (node.borderWidth > 0 && !transparanteRand) {
    o.border = r2(node.borderWidth); o.borderKleur = node.borderColor;
    if (node.borderColorVar) { o.borderKleurVar = node.borderColorVar; o.borderOp = node.borderOpacity; }
    if (node.borderWidthVar) o.borderVar = node.borderWidthVar;
    if (new Set(node.borderWidths).size > 1) o.borderZijden = node.borderWidths.map(r2);
    if (node.borderKleurenVerschillen) o.randKleurRest = true;
  }
  if (node.opacity < 1) o.opacity = r2(node.opacity);
  if (node.schaduwStyle) { o.schaduwStyle = node.schaduwStyle; o.schaduwLagen = node.schaduwLagen; }
  if (!isWortel && ['absolute', 'fixed'].includes(node.positie)) {
    o.abs = true; o.dx = r2(node.dx); o.dy = r2(node.dy);
    if (node.anker) o.anker = node.anker;
  }
  if (node.rekt) { const r = node.tekst && !node.kinderen && !node.doos ? rektVoorTekst(node) : node.rekt; if (r) o.rekt = r; }
  if (node.zelf) o.zelf = node.zelf;
  // HUG per as: een auto-layout-frame zonder expliciete maat op die as, zonder kind dat op die as
  // vult. De builder zet hem, leest de maat terug en valt terug op FIXED bij een verschil.
  if (node.richting && (node.kinderen?.length || (node.tekst && node.doos))) {
    const kindVult = as => (node.kinderen ?? []).some(k => !['absolute', 'fixed'].includes(k.positie) && (k.rekt ?? '').includes(as));
    // En niet op een as waarop de node zelf zijn ouder vult: FILL wint daar toch, en een HUG die
    // eerst gezet en dan teruggedraaid wordt is ruis in `hugAfwijkingen` (gemeten 2026-09-16: de
    // footer van DialogContent, HUG 208 tegen 462 -> FIXED, daarna FILL).
    const vult = as => (node.rekt ?? '').includes(as);
    const hug = (node.maat.h || kindVult('H') || vult('H') ? '' : 'H') + (node.maat.v || kindVult('V') || vult('V') ? '' : 'V');
    if (hug) o.hug = hug;
  }
  if (M.rest.length) o.margeRest = M.rest;

  if (node.svg) {
    o.svg = { html: node.svg.html, naam: node.svg.naam, k: node.svg.kleur, vulling: node.svg.vulling };
    if (node.svg.kleurVar) { o.svg.kVar = node.svg.kleurVar; o.svg.kOp = node.svg.opacity; }
    return o;
  }

  // Tekst: een blad, of een label-kind van een doos (vertaling 1).
  const kids = (node.kinderen ?? []);
  let labelKind = null;
  if (node.tekst) {
    if (!kids.length && !node.doos) {
      o.t = tekstVan(node);
      if (isBlok(node)) o.t.blok = true;
      if (node.slotProp) o.slot = node.slotProp;
      return o;
    }
    labelKind = {
      w: r2(node.tekst.inhoudBreedte || node.w), h: r2(node.tekst.lineHeight ?? node.tekst.regelHoogte ?? node.h),
      naam: 'label', t: tekstVan(node), ...(node.slotProp ? { slot: node.slotProp } : {}),
    };
    perBron.label++;
  }

  if (kids.length && diepte < MAX_DIEPTE) {
    const houden = kids.slice(0, MAX_BROERS);
    if (kids.length > houden.length) {
      o.afgekapt = { van: kids.length, naar: houden.length };
      afgekaptTotaal += kids.length - houden.length;
      afkappingen.push(`${comp}${pad}: ${kids.length} kinderen -> ${houden.length}`);
    }
    const volgorde = node.omgekeerd ? [...houden].reverse() : houden;
    o.k = [];
    if (labelKind && node.tekst.voorop) o.k.push(labelKind);
    for (const k of volgorde) {
      const extra = M.voor.get(k);
      if (extra) { o.k.push({ w: r2(o.rij ? extra : 1), h: r2(o.rij ? 1 : extra), naam: 'spacer' }); perBron.spacer++; }
      o.k.push(snoei(k, diepte + 1, `${pad}>${o.k.length}`, comp));
    }
    if (labelKind && !node.tekst.voorop) o.k.push(labelKind);
  } else if (kids.length) {
    o.dieperWeggelaten = kids.length;
    afgekaptTotaal += kids.length;
    afkappingen.push(`${comp}${pad}: ${kids.length} kinderen onder diepte ${MAX_DIEPTE}`);
  } else if (labelKind) {
    o.k = [labelKind];
  }
  return o;
}

const uit = {
  walkerVersie: spec.walkerVersie, adapter: spec.adapter,
  __doel: { fileKey: FILE_KEY, legacy: LEGACY, bronPad: {} },
  componenten: {}, uitgesloten: spec.uitgesloten, afkappingen,
};
const vocabVan = (boom, acc = new Set()) => { acc.add(boom.naam); for (const k of boom.k ?? []) vocabVan(k, acc); return acc; };
for (const [comp, d] of Object.entries(spec.componenten)) {
  const bron = `packages/ui/components/ui/${kebab(comp)}.tsx`;
  if (!existsSync(join(UI, '..', '..', bron))) { console.error(`bronbestand ontbreekt: ${bron}`); process.exit(2); }
  uit.__doel.bronPad[comp] = bron;
  const varianten = d.varianten.map(v => ({ naam: v.naam, boom: snoei(v.boom, 0, '', comp, true) }));
  const vocab = new Set([comp, d.primair.naam, ...varianten.map(v => v.naam)]);
  for (const v of varianten) vocabVan(v.boom, vocab);
  uit.componenten[comp] = { primair: d.primair, assen: d.assen, slots: d.slots ?? [], vocab: [...vocab].sort(), varianten };
}
writeFileSync(join(UI, 'figma/build-spec.min.json'), JSON.stringify(uit, null, 1) + '\n');

// ---- Gaten-inventaris ------------------------------------------------------------------
const uniek = [...new Set(spec.ongebonden.map(o => o.split(': ').slice(1).join(': ')))].sort();
const perComponent = {};
for (const o of spec.ongebonden) (perComponent[o.split(' ')[0]] ??= new Set()).add(o.split(': ').slice(1).join(': '));
writeFileSync(join(UI, 'figma/ongebonden.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/figma/build-prune.mjs. Waarden die de render gebruikt en waarvoor geen Figma-variabele of text style bestaat. De [binding]-as van figma:check ratelt op dit aantal, in beide richtingen.',
  aantalUniek: uniek.length, aantalVoorkomens: spec.ongebonden.length, uniek,
  perComponent: Object.fromEntries(Object.entries(perComponent).map(([k, v]) => [k, [...v].sort()])),
}, null, 1) + '\n');

// ---- Laagnamen ------------------------------------------------------------------------
const nodes = Object.values(perBron).reduce((a, b) => a + b, 0);
let indexNamen = 0, copyNamen = 0;
for (const d of Object.values(uit.componenten)) for (const v of d.varianten)
  (function loop(n) { if (/^\d+$/.test(String(n.naam))) indexNamen++; if (n.t && n.naam === n.t.s) copyNamen++; (n.k ?? []).forEach(loop); })(v.boom);
writeFileSync(join(UI, 'figma/laagnamen.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/figma/build-prune.mjs. Herkomst van elke laagnaam in de gesnoeide boom. `heuristiek` = een element zonder data-slot; hoort op 0.',
  nodes, perBron, heuristiek, indexNamen, copyNamen,
}, null, 1) + '\n');

console.log(`laagnamen: ${nodes} nodes — ${Object.entries(perBron).map(([k, v]) => `${k} ${v}`).join(', ')}; ${indexNamen} cijfernamen, ${copyNamen} copy-namen`);
for (const h of heuristiek.slice(0, 10)) console.log('  HEURISTIEK ' + h);
console.log(`afgekapt: ${afgekaptTotaal} node(s) over ${afkappingen.length} plek(ken)`);
console.log(`ongebonden: ${uniek.length} uniek over ${spec.ongebonden.length} voorkomens`);
for (const u of uniek) console.log('  ' + u);
