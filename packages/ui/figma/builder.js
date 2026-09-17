// ---------------------------------------------------------------------------
// Figma-builder voor packages/ui — draait in de plugin via figma/bouw-batch.js.
//
// Adapter `dom-tailwind` op apps/rowtrack/figma/builder.js (2026-09-16). Gelijk gehouden: de
// meldingen-basislijn (MELDING_SOORTEN), `zetRek` met terugleescontrole, `bouwhash` + `poort`,
// het hergebruik van set en varianten op naam (update in place, keys blijven), de slots als
// component properties met hergebruik op stamnaam, en de uitkomst in één object.
//
// Anders dan rowtrack, elk om een gemeten reden:
//  · DE VARIANT IS HET ELEMENT, GEEN WRAPPER. De vijftien handgebouwde componenten in dit bestand
//    hebben de knop zelf als variant-node, met zijn eigen vulling en padding; `geometry-parity`
//    meet precies die wortel. Rowtrack had een wrapper nodig voor de app-achtergrond en voor
//    RN-portalen, geen van beide speelt hier.
//  · HUG WORDT GEZET. Rowtrack zet FIXED of FILL; een knop die zijn label volgt en een dialoog die
//    met zijn inhoud meegroeit, zijn in een library HUG. De pruner geeft de as (`hug`) alleen waar
//    de code geen maat oplegt; hier wordt hij gezet, teruggelezen en bij afwijking FIXED.
//  · RANDEN TELLEN MEE IN DE LAYOUT (`strokesIncludedInLayout`), zoals een CSS-rand in een
//    border-box. Zonder dat staat de inhoud van DialogContent 1 px te hoog en te ver links.
//  · ICONEN WORDEN VECTOREN (`createNodeFromSvg`), geen placeholder: lucide is SVG in de DOM.
//  · DE POORT KENT EEN DERDE BEZWAAR: een component op de pagina zónder bouwhash is handwerk van
//    vóór deze keten, en die leegt de builder nooit (`__force` uitgezonderd).
//  · EEN NIEUWE EFFECT STYLE ALLEEN OP TOESTEMMING. Een schaduw heeft geen tokenbron (BACKLOG
//    2026-08-25); de builder maakt er alleen één aan als `SPEC.__toegestaan.effectStyles` hem noemt.
//
// Invoer: SPEC = { __doel, __stamp, __force, __toegestaan, <Component>: { primair, assen, slots, varianten } }
// ---------------------------------------------------------------------------
await figma.loadAllPagesAsync();
const DOEL = SPEC.__doel;
if (!DOEL || figma.fileKey !== DOEL.fileKey) return { fout: 'verkeerde file: ' + figma.fileKey };
const V = new Map();
for (const c of await figma.variables.getLocalVariableCollectionsAsync())
  for (const id of c.variableIds) {
    const v = await figma.variables.getVariableByIdAsync(id);
    V.set(`${c.name}:${v.name}`, v);
  }
const TS = new Map((await figma.getLocalTextStylesAsync()).map(s => [s.name, s]));
const ES = new Map((await figma.getLocalEffectStylesAsync()).map(s => [s.name, s]));
const meldingen = [];
const STAMP = SPEC.__stamp || '';
const TOEGESTAAN = SPEC.__toegestaan ?? {};

/**
 * Soorten meldingen — de basislijn. Elke `meldingen.push` hoort op precies één van deze regexen
 * te matchen, en elke regex hoort minstens één push-plek te dekken; scripts/figma/poort-selftest.mjs
 * toetst beide kanten statisch op deze brontekst. Geen `[`/`]` in de regexen — de selftest knipt
 * de lijst op de sluitende `];`.
 */
const MELDING_SOORTEN = [
  ['variabele-ontbreekt',          /: variabele .* bestaat niet in dit bestand/],
  ['style-aangemaakt',             /: (text|effect) style .* aangemaakt/],
  ['effect-style-niet-toegestaan', /: effect style .* ontbreekt en is niet toegestaan/],
  ['font-ontbreekt',               /: font .* niet beschikbaar/],
  ['tekst-zonder-text-style',      /: tekst zonder text style/],
  ['kleur-ongebonden',             /: (achtergrond|randkleur|tekstkleur|icoonkleur) ongebonden$/],
  ['icoon-mislukt',                /: icoon .* niet te importeren/],
  ['icoonstreep-geschaald',        /: icoonstreep .* niet gebonden/],
  ['layout-geen-vorm',             /: (grid met .* kolommen|omgekeerde volgorde) — /],
  ['flex-mapping-onbekend',        /kent deze mapping niet$/],
  ['layoutalign-geweigerd',        /: layoutAlign=.* geweigerd/],
  ['fill-geweigerd',               /=FILL geweigerd/],
  ['fill-stil-genegeerd',          /=FILL stil genegeerd/],
  ['hug-geweigerd',                /: HUG .* geweigerd/],
  ['rand-per-zijde-geweigerd',     /: rand per zijde .* geweigerd/],
  ['randbreedte-niet-te-binden',   /: randbreedte niet te binden/],
  ['randkleur-per-zijde',          /: randkleuren verschillen per zijde/],
  ['marge-zonder-equivalent',      /: marge .* op kind ".*" heeft geen Figma-equivalent/],
  ['component-property-mislukt',   /: component property ".*" mislukt/],
  ['eigenschap-zonder-node-verwijderd', /: eigenschap ".*" zonder node verwijderd/],
  ['geforceerd-overschreven',      /^GEFORCEERD OVERSCHREVEN — /],
];
function soortVan(m) {
  for (const [soort, re] of MELDING_SOORTEN) if (re.test(String(m))) return soort;
  return 'onbekend';
}
function telPerSoort(lijst) {
  const perSoort = {}; const onbekend = [];
  for (const m of lijst) { const s = soortVan(m); perSoort[s] = (perSoort[s] ?? 0) + 1; if (s === 'onbekend') onbekend.push(String(m)); }
  return { perSoort, onbekend: onbekend.slice(0, 8) };
}

const FAM = new Set((await figma.listAvailableFontsAsync()).map(f => `${f.fontName.family}|${f.fontName.style}`));
const STIJL = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' };
const geladen = new Map();
const laadFont = (f) => { const k = f.family + '|' + f.style; if (!geladen.has(k)) geladen.set(k, figma.loadFontAsync(f)); return geladen.get(k); };
const rgb = o => ({ r: o.r / 255, g: o.g / 255, b: o.b / 255 });

/** Een verf, gebonden aan zijn variabele wanneer de spec er één noemt. */
function verf(kleur, varNaam, opacity, pad, wat) {
  const p = { type: 'SOLID', color: rgb(kleur), opacity: opacity ?? kleur.a ?? 1 };
  // Eén letterlijke melding per soort, geen `${wat}`: de basislijn in poort-selftest.mjs leest de
  // push-plekken als tekst en kan een melding die zijn woorden uit een parameter haalt niet indelen.
  if (!varNaam) {
    if (wat === 'achtergrond') meldingen.push(`${pad}: achtergrond ongebonden`);
    else if (wat === 'randkleur') meldingen.push(`${pad}: randkleur ongebonden`);
    else if (wat === 'icoonkleur') meldingen.push(`${pad}: icoonkleur ongebonden`);
    else meldingen.push(`${pad}: tekstkleur ongebonden`);
    return p;
  }
  const v = V.get(varNaam);
  if (!v) { meldingen.push(`${pad}: variabele ${varNaam} bestaat niet in dit bestand`); return p; }
  return figma.variables.setBoundVariableForPaint(p, 'color', v);
}
function bind(node, veld, varNaam, pad) {
  if (!varNaam) return;
  const v = V.get(varNaam);
  if (!v) { meldingen.push(`${pad}: variabele ${varNaam} bestaat niet in dit bestand`); return; }
  node.setBoundVariable(veld, v);
}

// ---- Styles die de spec nodig heeft ----------------------------------------------------
// Text styles MOGEN aangemaakt worden: hun getallen komen uit de tokenschaal (build-spec.mjs
// maakt `styleNieuw` alleen wanneer grootte, regelhoogte en gewicht alle drie een token zijn).
for (const [comp, d] of Object.entries(SPEC)) {
  if (comp.startsWith('__')) continue;
  const nodig = [];
  for (const v of d.varianten) (function loop(n) { if (n.t?.styleNieuw) nodig.push(n.t.styleNieuw); (n.k ?? []).forEach(loop); })(v.boom);
  for (const s of nodig) {
    if (TS.has(s.naam)) continue;
    const font = { family: s.family, style: STIJL[s.gewicht] };
    if (!FAM.has(`${font.family}|${font.style}`)) { meldingen.push(`${comp}: font ${font.family} ${font.style} niet beschikbaar — text style ${s.naam} niet gemaakt`); continue; }
    await laadFont(font);
    const st = figma.createTextStyle();
    st.name = s.naam; st.fontName = font; st.fontSize = s.fontSize;
    st.lineHeight = { unit: 'PIXELS', value: s.lineHeight }; st.letterSpacing = { unit: 'PERCENT', value: 0 };
    TS.set(s.naam, st);
    meldingen.push(`${comp}: text style ${s.naam} aangemaakt (${s.fontSize}/${s.lineHeight} ${font.style})`);
  }
  const schaduwen = new Map();
  for (const v of d.varianten) (function loop(n) { if (n.schaduwStyle) schaduwen.set(n.schaduwStyle, n.schaduwLagen); (n.k ?? []).forEach(loop); })(v.boom);
  for (const [naam, lagen] of schaduwen) {
    if (ES.has(naam)) continue;
    if (!(TOEGESTAAN.effectStyles ?? []).includes(naam)) { meldingen.push(`${comp}: effect style ${naam} ontbreekt en is niet toegestaan — schaduw weggelaten`); continue; }
    const es = figma.createEffectStyle();
    es.name = naam;
    es.effects = lagen.map(l => ({ type: 'DROP_SHADOW', color: { r: l.kleur.r / 255, g: l.kleur.g / 255, b: l.kleur.b / 255, a: l.kleur.a },
      offset: { x: l.x, y: l.y }, radius: l.blur, spread: l.spread, visible: true, blendMode: 'NORMAL' }));
    ES.set(naam, es);
    meldingen.push(`${comp}: effect style ${naam} aangemaakt (${lagen.length} lagen, Tailwind-default)`);
  }
}

let slotVangst = [];
let rekGezet = 0, rekTeruggedraaid = 0, rekGeweigerd = 0, hugGezet = 0, hugTeruggedraaid = 0;
const hugAfwijkingen = [];

/** Zie rowtrack: FILL zetten, teruglezen, terugdraaien bij een andere maat. Pas ná alle kinderen. */
function zetRek(f, kinderen) {
  if (f.layoutMode === 'NONE') return;
  for (const { kind, k, pad } of kinderen) {
    if (k.abs) continue;
    if (k.zelf && k.zelf !== 'STRETCH') {
      let ok = false;
      try { kind.layoutAlign = k.zelf; ok = kind.layoutAlign === k.zelf; } catch (e) { /* hieronder gemeld */ }
      if (!ok) meldingen.push(`${pad}: layoutAlign=${k.zelf} geweigerd — Figma negeert een per-kind uitlijning`);
    }
    if (!k.rekt) continue;
    for (const [as, veld, maat, doel] of [['H', 'layoutSizingHorizontal', 'width', k.w], ['V', 'layoutSizingVertical', 'height', k.h]]) {
      if (!k.rekt.includes(as)) continue;
      let voor;
      try { voor = kind[veld]; kind[veld] = 'FILL'; } catch (e) { rekGeweigerd++; meldingen.push(`${pad}: ${veld}=FILL geweigerd — ${e.message}`); continue; }
      if (kind[veld] !== 'FILL') { rekGeweigerd++; meldingen.push(`${pad}: ${veld}=FILL stil genegeerd`); continue; }
      if (Math.abs(kind[maat] - doel) > 0.5) {
        try { kind[veld] = voor === 'FILL' ? 'FIXED' : voor; kind.resize(as === 'H' ? doel : kind.width, as === 'H' ? kind.height : doel); } catch { /* laat staan */ }
        rekTeruggedraaid++;
      } else rekGezet++;
    }
  }
}

/**
 * HUG op de assen die de pruner vrijgaf, met terugleescontrole. Op de breedte volgt een HUG de
 * TEKST, en Figma's tekstengine meet dezelfde tekst anders dan Chromium (rowtrack, 2026-09-07:
 * 162,78 tegen 136). Daar mag hij dus verder afwijken (4 px, de blok-drempel van de pruner) —
 * breedte zit bewust niet in parity. Elke afwijking wordt wél genoteerd in `hugAfwijkingen`.
 */
function zetHug(f, n, pad) {
  if (!n.hug || f.layoutMode === 'NONE') return;
  for (const as of n.hug) {
    const hoofd = (as === 'H') === (f.layoutMode === 'HORIZONTAL');
    const veld = hoofd ? 'primaryAxisSizingMode' : 'counterAxisSizingMode';
    const maat = as === 'H' ? 'width' : 'height';
    const doel = as === 'H' ? n.w : n.h;
    const tol = as === 'H' ? 4 : 0.5;
    try { f[veld] = 'AUTO'; } catch (e) { meldingen.push(`${pad}: HUG ${as} geweigerd — ${e.message}`); continue; }
    const verschil = Math.round((f[maat] - doel) * 100) / 100;
    if (Math.abs(verschil) > tol) {
      f[veld] = 'FIXED';
      f.resize(as === 'H' ? doel : f.width, as === 'H' ? f.height : doel);
      hugTeruggedraaid++;
      hugAfwijkingen.push(`${pad} ${as}: ${verschil} -> FIXED`);
    } else { hugGezet++; if (verschil) hugAfwijkingen.push(`${pad} ${as}: ${verschil} (binnen ${tol})`); }
  }
}

const J = { center: 'CENTER', 'space-between': 'SPACE_BETWEEN', 'flex-end': 'MAX', end: 'MAX', 'flex-start': 'MIN', start: 'MIN', normal: 'MIN' };
const A = { center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', 'flex-start': 'MIN', start: 'MIN', baseline: 'BASELINE', normal: null, stretch: null };
const VELDEN_BINDBAAR = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing',
  'topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius',
  'strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight',
  'width', 'height'];

async function maakTekst(n, pad) {
  const t = figma.createText();
  const stijl = n.t.style ? TS.get(n.t.style) : null;
  if (stijl) {
    await laadFont(stijl.fontName);
    t.fontName = stijl.fontName;
    t.characters = String(n.t.s);
    await t.setTextStyleIdAsync(stijl.id);
  } else {
    const font = { family: n.t.f, style: STIJL[n.t.gw] ?? 'Regular' };
    if (!FAM.has(`${font.family}|${font.style}`)) meldingen.push(`${pad}: font ${font.family} ${font.style} niet beschikbaar — Figma-default gebruikt`);
    else { await laadFont(font); t.fontName = font; }
    t.characters = String(n.t.s);
    t.fontSize = n.t.px;
    t.letterSpacing = { unit: 'PIXELS', value: n.t.ls };
    if (n.t.lh) t.lineHeight = { unit: 'PIXELS', value: n.t.lh };
    meldingen.push(`${pad}: tekst zonder text style (${n.t.px}/${n.t.lh ?? 'auto'} ${n.t.gw})`);
  }
  if (n.t.tc) t.textCase = n.t.tc;
  t.fills = [verf(n.t.k, n.t.kVar, n.t.kVar ? n.t.kOp : n.t.k.a, pad, 'tekstkleur')];
  t.textAlignHorizontal = n.t.al ?? 'LEFT';
  const eenRegel = n.t.lh ?? n.t.px * 1.35;
  if (n.t.veld) { t.textAutoResize = 'NONE'; t.resize(Math.max(1, n.w), Math.max(1, n.h)); t.textAlignVertical = 'CENTER'; }
  else if (n.t.blok || n.h > eenRegel * 1.5) { t.textAutoResize = 'HEIGHT'; t.resize(Math.max(1, n.w), Math.max(1, n.h)); }
  else t.textAutoResize = 'WIDTH_AND_HEIGHT';
  // NA `characters`: Figma hernoemt anders de laag naar zijn tekst (leesbaarheidscontract, regel 1).
  t.name = n.naam || 'label';
  if (n.slot) slotVangst.push({ slot: n.slot, node: t, standaard: String(n.t.s) });
  return t;
}

/**
 * Een lucide-svg als vector. De frame heet `icon`, zijn inhoud wordt één `path` (platgeslagen:
 * een GROUP heeft geen layout en telt als naam-gat), en elke streep en vulling bindt aan de kleur
 * die de pagina rendert.
 */
function maakIcoon(n, pad) {
  let f;
  try { f = figma.createNodeFromSvg(n.svg.html); }
  catch (e) { meldingen.push(`${pad}: icoon ${n.svg.naam} niet te importeren — ${e.message}`); f = figma.createFrame(); f.resize(Math.max(1, n.w), Math.max(1, n.h)); }
  f.name = 'icon';
  f.fills = [];
  f.clipsContent = false;
  if (Math.abs(f.width - n.w) > 0.01 || Math.abs(f.height - n.h) > 0.01) f.resize(Math.max(1, n.w), Math.max(1, n.h));
  const vectoren = f.findAll(x => x.type === 'VECTOR' || x.type === 'GROUP' || x.type === 'BOOLEAN_OPERATION' || x.type === 'ELLIPSE' || x.type === 'RECTANGLE' || x.type === 'LINE');
  if (vectoren.length) {
    const pad0 = vectoren.length === 1 && vectoren[0].type === 'VECTOR' ? vectoren[0] : figma.flatten(f.children, f);
    pad0.name = 'path';
    const kleur = verf(n.svg.k, n.svg.kVar, n.svg.kVar ? n.svg.kOp : n.svg.k.a, pad, 'icoonkleur');
    if (Array.isArray(pad0.strokes) && pad0.strokes.length) pad0.strokes = [kleur];
    if (n.svg.vulling && Array.isArray(pad0.fills) && pad0.fills.length) pad0.fills = [kleur];
    const sw = pad0.strokeWeight;
    if (typeof sw === 'number' && Math.abs(sw - 2) < 0.01 && V.get('Base:icon-stroke')) pad0.setBoundVariable('strokeWeight', V.get('Base:icon-stroke'));
    else if (typeof sw === 'number' && sw > 0) meldingen.push(`${pad}: icoonstreep ${Math.round(sw * 100) / 100} niet gebonden — de SVG-schaal wijkt af van icon-stroke`);
  }
  return f;
}

/** Bouwt een node uit de min-spec. `doel` is een bestaande (geleegde) COMPONENT die de wortel wordt. */
async function maak(n, pad, doel = null) {
  for (const [kind, m] of n.margeRest ?? [])
    meldingen.push(`${pad}: marge ${JSON.stringify(m)} op kind "${kind}" heeft geen Figma-equivalent (negatief of kruis-as)`);
  if (n.t && !n.k && !doel) return maakTekst(n, pad);
  if (n.svg && !doel) return maakIcoon(n, pad);

  const f = doel ?? figma.createFrame();
  if (!doel) f.name = n.naam || 'frame';
  // Een hergebruikte component draagt nog bindingen van de vorige bouw; weg ermee vóór het zetten.
  if (doel) for (const veld of VELDEN_BINDBAAR) { try { f.setBoundVariable(veld, null); } catch { /* veld bestaat niet op dit type */ } }
  f.clipsContent = !!n.knipt;
  if (n.rasterKolommen) meldingen.push(`${pad}: grid met ${n.rasterKolommen} kolommen — geen auto-layout-vorm, kinderen absoluut geplaatst`);
  if (n.omgekeerd) meldingen.push(`${pad}: omgekeerde volgorde — kinderen in beeldvolgorde gezet`);
  if (n.k?.length && n.rij !== undefined) {
    f.layoutMode = n.rij ? 'HORIZONTAL' : 'VERTICAL';
    f.primaryAxisSizingMode = 'FIXED';
    f.counterAxisSizingMode = 'FIXED';
    if (n.justify) { if (J[n.justify]) f.primaryAxisAlignItems = J[n.justify]; else meldingen.push(`${pad}: justify-content '${n.justify}' kent deze mapping niet`); }
    else f.primaryAxisAlignItems = 'MIN';
    if (n.align) { if (A[n.align]) f.counterAxisAlignItems = A[n.align]; else if (!(n.align in A)) meldingen.push(`${pad}: align-items '${n.align}' kent deze mapping niet`); }
    else f.counterAxisAlignItems = 'MIN';
    const P = n.padding ?? [0, 0, 0, 0], PV = n.paddingVar ?? [];
    ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((veld, i) => { f[veld] = P[i]; bind(f, veld, PV[i], pad); });
    f.itemSpacing = n.gap ?? 0;
    bind(f, 'itemSpacing', n.gapVar, pad);
  } else f.layoutMode = 'NONE';
  f.resize(Math.max(0.01, n.w), Math.max(0.01, n.h));
  // Een maat met een layout-rol (h-control-md) bindt aan size-control-md; zonder rol blijft hij een getal.
  bind(f, 'height', n.hVar, pad);
  bind(f, 'width', n.wVar, pad);

  f.fills = n.bg ? [verf(n.bg, n.bgVar, n.bgVar ? n.bgOp : n.bg.a, pad, 'achtergrond')] : [];
  if (n.border) {
    f.strokes = [verf(n.borderKleur, n.borderKleurVar, n.borderKleurVar ? n.borderOp : n.borderKleur.a, pad, 'randkleur')];
    f.strokeAlign = 'INSIDE';
    if (f.layoutMode !== 'NONE') f.strokesIncludedInLayout = true;
    const zijVelden = ['strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight'];
    f.strokeWeight = n.border;
    let perZijde = false;
    if (n.borderZijden) {
      try { n.borderZijden.forEach((w, i) => { f[zijVelden[i]] = w; }); perZijde = true; }
      catch (e) { f.strokeWeight = n.border; meldingen.push(`${pad}: rand per zijde ${JSON.stringify(n.borderZijden)} geweigerd (${e.message}) — volle doos gezet`); }
    }
    if (n.borderVar && V.get(n.borderVar)) {
      try {
        if (perZijde) n.borderZijden.forEach((w, i) => { if (w > 0) f.setBoundVariable(zijVelden[i], V.get(n.borderVar)); });
        else f.setBoundVariable('strokeWeight', V.get(n.borderVar));
      } catch (e) { meldingen.push(`${pad}: randbreedte niet te binden (${e.message})`); }
    }
    if (n.randKleurRest) meldingen.push(`${pad}: randkleuren verschillen per zijde — Figma kent één strokes-array, de eerste kleur is gezet`);
  } else f.strokes = [];
  const hoeken = ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'];
  hoeken.forEach((veld, i) => { f[veld] = n.radius?.[i] ?? 0; bind(f, veld, n.radiusVar?.[i], pad); });
  f.opacity = n.opacity ?? 1;
  if (n.schaduwStyle && ES.get(n.schaduwStyle)) await f.setEffectStyleIdAsync(ES.get(n.schaduwStyle).id);
  else f.effects = [];

  const aangehangen = [];
  for (const [i, k] of (n.k ?? []).entries()) {
    const kindPad = `${pad}>${k.naam ?? i}`;
    const kind = await maak(k, kindPad);
    f.appendChild(kind);
    // Buiten de stroom: absoluut in een auto-layout, en in een frame zónder auto-layout staat élk
    // kind op zijn gemeten plek — anders landen ze allemaal op (0,0).
    if (k.abs || f.layoutMode === 'NONE') {
      try { if (f.layoutMode !== 'NONE') kind.layoutPositioning = 'ABSOLUTE'; } catch { /* geen auto-layout */ }
      kind.x = k.dx ?? 0;
      kind.y = k.dy ?? 0;
      if (k.anker) try { kind.constraints = { horizontal: k.anker.h, vertical: k.anker.v }; } catch { /* niet elk type */ }
    }
    aangehangen.push({ kind, k, pad: kindPad });
  }
  zetRek(f, aangehangen);
  zetHug(f, n, pad);
  return f;
}

/** Zie rowtrack: pad, type, naam, afgeronde maat en tekst — genoeg om handwerk te zien, ongevoelig voor subpixel-ruis. */
function bouwhash(node) {
  const delen = [];
  (function loop(n, pad) {
    delen.push(`${pad}|${n.type}|${n.name}|${Math.round(n.width)}x${Math.round(n.height)}` + (n.type === 'TEXT' ? '|' + n.characters : ''));
    if ('children' in n) n.children.forEach((k, i) => loop(k, `${pad}/${i}`));
  })(node, '');
  let h = 0x811c9dc5;
  const str = delen.join('\n');
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36) + ':' + delen.length;
}

/**
 * De poort vóór het legen van een pagina. Drie bezwaren:
 *  · GEPUBLICEERD én niet te hergebruiken — dan wordt de node écht vervangen en ontkoppelt elke instance;
 *  · HANDWERK — de bouwhash van de vorige run klopt niet meer met de live node;
 *  · ONBEKENDE HERKOMST — een component of set zonder bouwhash is niet door deze builder gemaakt
 *    (de vijftien handgebouwde componenten zijn daar het voorbeeld van).
 */
async function poort(page, comp, force, hergebruikMogelijk) {
  const bezwaren = [];
  for (const kind of page.children) {
    if (typeof kind.getPublishStatusAsync === 'function' && !hergebruikMogelijk) {
      const status = await kind.getPublishStatusAsync();
      if (status !== 'UNPUBLISHED') bezwaren.push(`${comp}/${kind.name}: ${status} — deze node wordt VERVANGEN (geen bruikbare variant om te hergebruiken), dus elke instance eruit ontkoppelt`);
    }
    const vorige = typeof kind.getPluginData === 'function' ? kind.getPluginData('bouwhash') : '';
    if (vorige) {
      const nu = bouwhash(kind);
      if (nu !== vorige) bezwaren.push(`${comp}/${kind.name}: met de hand gewijzigd sinds de laatste bouw (${vorige} -> ${nu})`);
    } else if (kind.type === 'COMPONENT' || kind.type === 'COMPONENT_SET') {
      bezwaren.push(`${comp}/${kind.name}: ${kind.type} zonder bouwhash — onbekende herkomst (handgebouwd?), niet legen`);
    }
  }
  if (bezwaren.length && !force) return bezwaren;
  if (bezwaren.length && force) for (const b of bezwaren) meldingen.push(`GEFORCEERD OVERSCHREVEN — ${b}`);
  return null;
}

const uit = [];
const geweigerd = [];
let hergebruikt = 0;
for (const [comp, d] of Object.entries(SPEC)) {
  if (comp.startsWith('__')) continue;
  figma.root.setPluginData('bouwvoortgang', comp);
  if ((DOEL.legacy ?? []).includes(comp)) { geweigerd.push(`${comp}: handgebouwde legacy-component — de keten herbouwt hem niet`); continue; }
  let page = figma.root.children.find(p => p.name === comp);
  if (!page) { page = figma.createPage(); page.name = comp; }
  await figma.setCurrentPageAsync(page);

  const naam = d.primair.naam;
  const metAssen = Object.keys(d.assen ?? {}).length > 0;
  const namenNu = d.varianten.map(v => v.naam);
  const bestaand = page.children.find(c => (c.type === 'COMPONENT_SET' || c.type === 'COMPONENT') && c.name === naam) ?? null;
  const knopen = !bestaand ? [] : bestaand.type === 'COMPONENT_SET' ? [...bestaand.children] : [bestaand];
  const kanHergebruiken = !!bestaand && (metAssen ? bestaand.type === 'COMPONENT_SET' : bestaand.type === 'COMPONENT');
  const bezwaren = await poort(page, comp, SPEC.__force === true, kanHergebruiken);
  if (bezwaren) { geweigerd.push(...bezwaren); continue; }

  // BEHOUD DE COMPONENT-NODES, VERVANG HUN INHOUD (zie rowtrack): alleen de key van de set en van
  // elke variant telt voor een instance, dus die blijven staan en alleen hun kinderen worden nieuw.
  const hergebruik = new Map();
  if (kanHergebruiken) {
    for (const v of knopen) {
      const sleutel = metAssen ? v.name : namenNu[0];
      if (namenNu.includes(sleutel) && !hergebruik.has(sleutel)) hergebruik.set(sleutel, v);
      else v.remove();
    }
  }
  for (const kind of [...page.children]) if (kind !== bestaand || !kanHergebruiken) { if (![...hergebruik.values()].includes(kind)) kind.remove(); }
  for (const v of hergebruik.values()) { for (const k of [...v.children]) k.remove(); hergebruikt++; }

  slotVangst = [];
  const comps = [];
  for (const v of d.varianten) {
    const c = hergebruik.get(v.naam) ?? figma.createComponent();
    if (!hergebruik.has(v.naam)) page.appendChild(c);
    await maak(v.boom, `${comp}[${v.naam}]`, c);
    c.name = metAssen ? v.naam : naam;
    comps.push(c);
  }

  // PLAATSING UIT DE SPEC (1g): een raster van vier kolommen op vaste afstanden, ook bij hergebruik.
  const MARGE = 24, TUSSEN = 32, KOL = 4;
  const kolB = Math.max(...comps.map(c => c.width)), rijH = Math.max(...comps.map(c => c.height));
  let hoofd;
  if (metAssen) {
    hoofd = bestaand && bestaand.type === 'COMPONENT_SET' && kanHergebruiken ? bestaand : null;
    if (hoofd) { for (const c of comps) if (c.parent !== hoofd) hoofd.appendChild(c); }
    else hoofd = figma.combineAsVariants(comps, page);
    comps.forEach((c, i) => { c.x = MARGE + (i % KOL) * (kolB + TUSSEN); c.y = MARGE + Math.floor(i / KOL) * (rijH + TUSSEN); });
    const kolommen = Math.min(KOL, comps.length), rijen = Math.ceil(comps.length / KOL);
    hoofd.resize(2 * MARGE + kolommen * kolB + (kolommen - 1) * TUSSEN, 2 * MARGE + rijen * rijH + (rijen - 1) * TUSSEN);
    hoofd.name = naam;
    // Geen vulling op de set: zo staan de handgebouwde sets in dit bestand (Checkbox, gemeten
    // 2026-09-16: 0 fills, 0 strokes). Een set-vulling reist niet mee naar een instance, maar een
    // tweede vorm naast de bestaande maakt de library inconsistent zonder dat iemand erom vroeg.
    hoofd.fills = [];
  } else {
    hoofd = comps[0];
  }
  hoofd.x = 0; hoofd.y = 0;
  hoofd.setPluginData('primair', '1');

  // ---- Slots -> component properties (zie rowtrack: hergebruik op stamnaam, wezen weg) ----
  const slotsGezet = {};
  if (slotVangst.length) {
    const perSlot = new Map();
    for (const s of slotVangst) { if (!perSlot.has(s.slot)) perSlot.set(s.slot, []); perSlot.get(s.slot).push(s); }
    const basis = k => k.split('#')[0];
    for (const [slot, lijst] of perSlot) {
      try {
        const defs = hoofd.componentPropertyDefinitions ?? {};
        let propId = Object.keys(defs).find(k => defs[k].type === 'TEXT' && basis(k) === slot) ?? null;
        if (propId) { if (defs[propId].defaultValue !== lijst[0].standaard) propId = hoofd.editComponentProperty(propId, { defaultValue: lijst[0].standaard }); }
        else propId = hoofd.addComponentProperty(slot, 'TEXT', lijst[0].standaard);
        for (const s of lijst) s.node.componentPropertyReferences = { characters: propId };
        slotsGezet[slot] = { propId, nodes: lijst.length };
      } catch (e) { meldingen.push(`${comp}: component property "${slot}" mislukt — ${e.message}`); }
    }
  }
  if (hoofd.componentPropertyDefinitions) {
    const defs = hoofd.componentPropertyDefinitions;
    const refs = {}; for (const k of Object.keys(defs)) if (defs[k].type !== 'VARIANT') refs[k] = 0;
    for (const n of hoofd.findAll(x => x.componentPropertyReferences))
      for (const id of Object.values(n.componentPropertyReferences)) if (id in refs) refs[id]++;
    for (const [k, n] of Object.entries(refs)) if (n === 0) {
      try { hoofd.deleteComponentProperty(k); meldingen.push(`${comp}: eigenschap "${k}" zonder node verwijderd`); }
      catch (e) { meldingen.push(`${comp}: component property "${k}" mislukt — verwijderen: ${e.message}`); }
    }
  }

  hoofd.description = `→ ${DOEL.bronPad?.[comp] ?? comp}\nGegenereerd uit de Storybook-render (scripts/figma/build-spec.mjs); niet met de hand bewerken.`;
  const hashes = [];
  for (const kind of page.children) {
    const h = bouwhash(kind);
    kind.setPluginData('bouwhash', h);
    kind.setPluginData('gebouwdOp', STAMP);
    hashes.push({ naam: kind.name, id: kind.id, hash: h });
  }
  uit.push({ component: comp, type: hoofd.type, id: hoofd.id, key: hoofd.key, nodes: comps.length,
             varianten: comps.map(c => ({ naam: c.name, id: c.id, key: c.key })),
             publishStatus: await hoofd.getPublishStatusAsync(), hashes,
             slots: Object.keys(slotsGezet).length ? slotsGezet : null });
}
figma.root.setPluginData('bouwvoortgang', '');
return { gebouwd: uit, geweigerd, hergebruikt, rekGezet, rekTeruggedraaid, rekGeweigerd, hugGezet, hugTeruggedraaid,
         hugAfwijkingen: hugAfwijkingen.slice(0, 20), aantalMeldingen: meldingen.length, ...telPerSoort(meldingen), meldingen: meldingen.slice(0, 20) };
