// ---------------------------------------------------------------------------
// Toetst wat de builder gebouwd heeft, per component in BATCH, op de runtime (niet op de cloud).
// Parameters (AsyncFunction): BATCH, STAMP, POORT, figma
//
// Vier assen, elk met een eigen referentie die NIET de gebouwde node zelf is:
//  1. CHECK 0 — tekstinhoud en iconen tegen figma/check0.json (de DOM, buiten de walker om).
//  2. LEESBAARHEID — elke laagnaam in het vocabulaire van de min-spec, geen cijfer- of copy-namen,
//     geen GROUP, auto-layout op elk frame met kinderen, elke tekst een style tenzij de spec zegt
//     dat er geen bestaat, en een description met het bronpad.
//  3. RAUWE WAARDEN — elke zichtbare kleur, padding, gap, radius en schaduw gebonden.
//  4. READ-BACK (7b) — de wortel van elke variant naast zijn spec: hoogte, padding, gap, radius,
//     aantal vullingen en randen, layoutMode. Waarde en verwachting in dezelfde regel.
//
// Uitkomst: POST naar /toets-<STAMP>.json én als return (samenvatting).
// ---------------------------------------------------------------------------
if (figma.fileKey !== 'ko2OuasYxyY2YRD69MYhWX') return { fout: 'verkeerde file: ' + figma.fileKey };
await figma.loadAllPagesAsync();
const min = await (await fetch(`http://localhost:${POORT}/build-spec.min.json`)).json();
const check0 = await (await fetch(`http://localhost:${POORT}/check0.json`)).json();
const rond = n => Math.round(n * 100) / 100;
const zichtbaar = arr => Array.isArray(arr) ? arr.filter(p => p.visible !== false && (p.opacity ?? 1) > 0) : [];

const verslag = {};
for (const comp of BATCH) {
  const d = min.componenten[comp];
  const page = figma.root.children.find(p => p.name === comp);
  const hoofd = page?.children.find(c => c.getPluginData('primair') === '1');
  if (!d || !hoofd) { verslag[comp] = { fout: !d ? 'niet in de spec' : 'geen primary met pluginData primair' }; continue; }
  const knopen = hoofd.type === 'COMPONENT_SET' ? [...hoofd.children] : [hoofd];
  const vocab = new Set([...d.vocab, 'path']);
  const r = { check0: [], leesbaarheid: {}, rauw: [], readback: [] };

  // --- 1. Check 0 --------------------------------------------------------------------------
  for (const v of d.varianten) {
    const knoop = hoofd.type === 'COMPONENT_SET' ? knopen.find(k => k.name === v.naam) : hoofd;
    const ref = check0.componenten?.[comp]?.[v.naam];
    if (!knoop || !ref) { r.check0.push({ variant: v.naam, fout: !knoop ? 'variant-node ontbreekt' : 'geen check0-referentie' }); continue; }
    const teksten = knoop.findAll(n => n.type === 'TEXT').map(n => n.characters.replace(/\s+/g, ' ').trim()).sort();
    const iconen = knoop.findAll(n => n.name === 'icon').length;
    const verfdozen = [knoop, ...knoop.findAll(n => n.type === 'FRAME' || n.type === 'COMPONENT')]
      .filter(n => n.name !== 'icon' && (zichtbaar(n.fills).length || zichtbaar(n.strokes).length || zichtbaar(n.effects).length)).length;
    const gelijk = JSON.stringify(teksten) === JSON.stringify(ref.teksten) && iconen === ref.iconen && verfdozen === ref.verfdozen;
    r.check0.push({ variant: v.naam, gelijk, figma: { teksten: teksten.length, iconen, verfdozen }, dom: { teksten: ref.teksten.length, iconen: ref.iconen, verfdozen: ref.verfdozen },
      ...(gelijk ? {} : { verschil: { figma: teksten, dom: ref.teksten } }) });
  }

  // --- 2. Leesbaarheid ---------------------------------------------------------------------
  const alle = hoofd.findAll(() => true).filter(n => !(n.parent && n.parent.name === 'icon'));
  const verwachtZonderStyle = new Set();
  for (const v of d.varianten) (function loop(n) { if (n.t && !n.t.style && !n.t.styleNieuw) verwachtZonderStyle.add(n.naam); (n.k ?? []).forEach(loop); })(v.boom);
  const buitenVocab = alle.filter(n => !vocab.has(n.name));
  r.leesbaarheid = {
    buitenVocab: [...new Set(buitenVocab.map(n => n.name))].slice(0, 20), buitenVocabAantal: buitenVocab.length,
    numeriek: alle.filter(n => /^\d+$/.test(n.name)).length,
    naarInhoudVernoemd: alle.filter(n => n.type === 'TEXT' && n.name === n.characters).length,
    groepen: alle.filter(n => n.type === 'GROUP').length,
    zonderAutoLayout: alle.filter(n => (n.type === 'FRAME' || n.type === 'COMPONENT') && n.name !== 'icon' && 'children' in n && n.children.length && n.layoutMode === 'NONE').map(n => n.name),
    tekstZonderStyle: alle.filter(n => n.type === 'TEXT' && !n.textStyleId).map(n => n.name),
    tekstZonderStyleVerwacht: [...verwachtZonderStyle],
    description: hoofd.description || null,
  };

  // --- 3. Rauwe waarden --------------------------------------------------------------------
  const pad = n => { const p = []; for (let x = n; x && x !== hoofd.parent; x = x.parent) p.unshift(x.name); return p.join('>'); };
  for (const n of [hoofd, ...hoofd.findAll(() => true)]) {
    if (n.type === 'COMPONENT_SET') continue;
    const bv = n.boundVariables ?? {};
    for (const [veld, verven] of [['fills', n.fills], ['strokes', n.strokes]])
      for (const p of zichtbaar(verven)) if (p.type === 'SOLID' && !p.boundVariables?.color) r.rauw.push(`${pad(n)}: ${veld} ongebonden`);
    if (n.layoutMode && n.layoutMode !== 'NONE') {
      for (const veld of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'itemSpacing'])
        if (n[veld] > 0 && !bv[veld]) r.rauw.push(`${pad(n)}: ${veld} ${n[veld]} ongebonden`);
    }
    for (const veld of ['topLeftRadius', 'topRightRadius', 'bottomRightRadius', 'bottomLeftRadius'])
      if (typeof n[veld] === 'number' && n[veld] > 0 && !bv[veld]) r.rauw.push(`${pad(n)}: ${veld} ${n[veld]} ongebonden`);
    if (zichtbaar(n.effects).length && !n.effectStyleId) r.rauw.push(`${pad(n)}: effect zonder effect style`);
  }

  // --- 3b. Bindingnamen -----------------------------------------------------------------------
  // De read-back hieronder vergelijkt waarden; p-6 en p-surface renderen allebei 24. Hier de naam:
  // spec en Figma parallel (de builder hangt kinderen in spec-volgorde), per veld de variabele
  // die de spec noemt tegen de variabele die op de node staat.
  const varNaam = new Map();
  for (const c of await figma.variables.getLocalVariableCollectionsAsync())
    for (const id of c.variableIds) varNaam.set(id, `${c.name}:${(await figma.variables.getVariableByIdAsync(id)).name}`);
  r.bindingen = [];
  const PAD_VELDEN = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'];
  const vergelijk = (s, n, pad) => {
    if (!s || !n) return;
    const bv = n.boundVariables ?? {};
    const naamOp = veld => (bv[veld]?.id ? varNaam.get(bv[veld].id) : null) ?? null;
    const paren = [
      ...PAD_VELDEN.map((veld, i) => [veld, s.paddingVar?.[i] ?? null]),
      ['itemSpacing', s.gapVar ?? null], ['height', s.hVar ?? null], ['width', s.wVar ?? null],
    ];
    for (const [veld, verwacht] of paren) {
      const echt = naamOp(veld);
      if (verwacht !== echt && (verwacht || echt)) r.bindingen.push(`${pad} ${veld}: spec ${verwacht ?? '—'}, Figma ${echt ?? '—'}`);
    }
    const kinderen = 'children' in n ? n.children : [];
    (s.k ?? []).forEach((k, i) => vergelijk(k, kinderen[i], `${pad}>${k.naam ?? i}`));
  };
  for (const v of d.varianten) {
    const n = hoofd.type === 'COMPONENT_SET' ? knopen.find(k => k.name === v.naam) : hoofd;
    vergelijk(v.boom, n, v.naam);
  }

  // --- 4. Read-back van de wortel ------------------------------------------------------------
  for (const v of d.varianten) {
    const n = hoofd.type === 'COMPONENT_SET' ? knopen.find(k => k.name === v.naam) : hoofd;
    if (!n) continue;
    const s = v.boom, P = s.padding ?? [0, 0, 0, 0];
    const paren = [
      ['hoogte', rond(n.height), s.h], ['layoutMode', n.layoutMode, s.k?.length && s.rij !== undefined ? (s.rij ? 'HORIZONTAL' : 'VERTICAL') : 'NONE'],
      ['padding', [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].join('/'), P.join('/')],
      ['gap', n.itemSpacing, s.gap ?? 0], ['radius', n.topLeftRadius, s.radius?.[0] ?? 0],
      ['vullingen', zichtbaar(n.fills).length, s.bg ? 1 : 0], ['randen', zichtbaar(n.strokes).length, s.border ? 1 : 0],
      ['opacity', rond(n.opacity), s.opacity ?? 1],
    ];
    for (const [wat, figmaW, specW] of paren) {
      const gelijk = typeof specW === 'number' ? Math.abs(Number(figmaW) - specW) <= 0.5 : String(figmaW) === String(specW);
      if (!gelijk) r.readback.push(`${v.naam} ${wat}: Figma ${figmaW} tegen spec ${specW}`);
    }
  }
  r.samenvatting = {
    check0Gelijk: `${r.check0.filter(x => x.gelijk).length}/${r.check0.length}`,
    buitenVocab: r.leesbaarheid.buitenVocabAantal, numeriek: r.leesbaarheid.numeriek, naarInhoud: r.leesbaarheid.naarInhoudVernoemd,
    groepen: r.leesbaarheid.groepen, zonderAutoLayout: r.leesbaarheid.zonderAutoLayout.length,
    tekstZonderStyle: `${r.leesbaarheid.tekstZonderStyle.length} (verwacht: ${r.leesbaarheid.tekstZonderStyleVerwacht.join(', ') || 'geen'})`,
    description: !!r.leesbaarheid.description, rauw: r.rauw.length, readbackVerschillen: r.readback.length, bindingVerschillen: r.bindingen.length,
  };
  verslag[comp] = r;
}
const uit = { stamp: STAMP, batch: BATCH, verslag };
try { await fetch(`http://localhost:${POORT}/toets-${STAMP}.json`, { method: 'POST', body: JSON.stringify(uit, null, 1) }); } catch { /* de return draagt de samenvatting */ }
return Object.fromEntries(Object.entries(verslag).map(([c, r]) => [c, r.fout ? r : { ...r.samenvatting, rauwVoorbeeld: r.rauw.slice(0, 5), readback: r.readback.slice(0, 8), bindingen: r.bindingen.slice(0, 8), check0Verschil: r.check0.filter(x => !x.gelijk) }]));
