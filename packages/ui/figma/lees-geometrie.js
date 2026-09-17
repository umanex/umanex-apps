// ---------------------------------------------------------------------------
// Leest de Figma-kant van `geometry-parity.mjs` (figma/geometry.figma.json). Draait in de plugin,
// zelfde aanroep als lees-manifest.js.
//
// Twee delen, elk voor een ander soort pagina:
//
//  · `gemeten` — per variant-WORTEL van elke handgebouwde component set, precies zoals het recept
//    in packages/ui/CLAUDE.md het tot 2026-09-16 deed (gereconstrueerd, en toen tegen alle bestaande
//    varianten nagemeten). Een pagina van de builder hoort hier NIET in: dan blijven de legacy-
//    metingen byte-gelijk en joint parity ze met zijn STORY-map zoals voorheen.
//
//  · `paginas` — per variant de VOLLEDIGE BOOM van elke pagina die de builder maakte (herkend aan
//    `pluginData('primair')`). Een node is een array (`velden` beschrijft de posities) met zijn
//    kinderen op de laatste plek; zo past een batch in de payload van de Bridge. Een icoon (`icon`)
//    is een blad: zijn vectorpaden komen niet uit de spec maar uit de SVG-import.
// ---------------------------------------------------------------------------
if (figma.fileKey !== 'ko2OuasYxyY2YRD69MYhWX') return { fout: 'verkeerde file: ' + figma.fileKey };
await figma.loadAllPagesAsync();

const tel = arr => Array.isArray(arr) ? arr.filter(p => p.visible !== false).length : 0;
const vanBuilder = s => s.getPluginData('primair') === '1';

const gemeten = {};
let varianten = 0;
for (const s of figma.root.findAll(n => n.type === 'COMPONENT_SET')) {
  if (vanBuilder(s)) continue;
  gemeten[s.name] = {};
  for (const v of s.children) {
    varianten++;
    gemeten[s.name][v.name] = {
      h: Math.round(v.height * 100) / 100, lay: v.layoutMode,
      pad: [v.paddingTop, v.paddingRight, v.paddingBottom, v.paddingLeft], gap: v.itemSpacing,
      r: typeof v.cornerRadius === 'number' ? v.cornerRadius : v.topLeftRadius,
      bw: typeof v.strokeWeight === 'number' ? v.strokeWeight : v.strokeTopWeight,
      fills: tel(v.fills), strokes: tel(v.strokes), eff: tel(v.effects), op: v.opacity,
    };
  }
}

const VULLING = 1, RAND = 2, EFFECT = 4, TEKST_HOOGTE_VAST = 8;
const getal = w => (typeof w === 'number' ? Math.round(w * 100) / 100 : 0);
function lees(n) {
  const vlaggen = (tel(n.fills) ? VULLING : 0) | (tel(n.strokes) ? RAND : 0)
    | ((tel(n.effects) || n.effectStyleId) ? EFFECT : 0)
    | (n.type === 'TEXT' && n.textAutoResize !== 'WIDTH_AND_HEIGHT' ? TEKST_HOOGTE_VAST : 0);
  const zijden = 'strokeTopWeight' in n
    ? [n.strokeTopWeight, n.strokeRightWeight, n.strokeBottomWeight, n.strokeLeftWeight].map(getal)
    : [0, 0, 0, 0].map(() => getal(n.strokeWeight));
  const uit = [
    n.name, n.type, Math.round(n.height * 100) / 100,
    [n.paddingTop, n.paddingRight, n.paddingBottom, n.paddingLeft].map(getal), getal(n.itemSpacing),
    [n.topLeftRadius, n.topRightRadius, n.bottomRightRadius, n.bottomLeftRadius].map(getal),
    tel(n.strokes) ? zijden : [0, 0, 0, 0], getal(n.opacity ?? 1), vlaggen, n.layoutMode ?? 'NONE',
  ];
  if ('children' in n && n.children.length && n.name !== 'icon') uit.push(n.children.map(lees));
  return uit;
}
const paginas = {};
for (const p of figma.root.children) {
  const hoofd = p.children.find(c => (c.type === 'COMPONENT_SET' || c.type === 'COMPONENT') && vanBuilder(c));
  if (!hoofd) continue;
  const knopen = hoofd.type === 'COMPONENT_SET' ? hoofd.children : [hoofd];
  paginas[p.name] = { id: hoofd.id, type: hoofd.type, varianten: Object.fromEntries(knopen.map(v => [hoofd.type === 'COMPONENT_SET' ? v.name : 'default', lees(v)])) };
}

return {
  $comment: 'Gemeten Figma-kant per variant-node. NIET met de hand bewerken — ververs via packages/ui/CLAUDE.md. Breedte staat er bewust NIET in: die is tekstgedreven en niet vergelijkbaar met een browser.',
  fileKey: figma.fileKey,
  gegenereerd: new Date().toISOString().slice(0, 10),
  sets: Object.keys(gemeten).length,
  varianten,
  gemeten,
  schema: 3,
  velden: ['naam', 'type', 'h', 'padding', 'gap', 'radius', 'randZijden', 'opacity', 'vlaggen', 'layoutMode', 'kinderen'],
  paginas,
};
