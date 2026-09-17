// ---------------------------------------------------------------------------
// Leest de Figma-staat die figma/manifest.json vastlegt (schema 2). Draait in de plugin:
//
//   const bron = await (await fetch('http://localhost:<poort>/lees-manifest.js')).text();
//   const F = Object.getPrototypeOf(async function () {}).constructor;
//   const m = await (new F('figma', bron))(figma);
//
// WAAROM EEN BESTAND EN GEEN RECEPT. Tot 2026-09-16 stond dit als codeblok in packages/ui/CLAUDE.md,
// en het liep drie keer uit de pas met de guard die zijn uitvoer leest (LEARNINGS 2026-09-09): een
// helper die niet gedefinieerd was, een geneste vorm waar de guard een platte las, en Base als lijst
// waar de guard een object las. Een recept in markdown wordt door niets uitgevoerd. Dit bestand wel:
// scripts/figma/recept-selftest.mjs draait het op een stub-`figma` uit het gecommitte manifest en
// eist dat het dat manifest teruggeeft.
//
// Eén verschil met het recept: de primary van een pagina die de builder maakte, draagt
// `pluginData('primair')`. Die gaat vóór de naamregels — een builder-pagina met een set én een
// extra node kan dan niet op volgorde of naam verkeerd gekozen worden.
// ---------------------------------------------------------------------------
if (figma.fileKey !== 'ko2OuasYxyY2YRD69MYhWX') return { fout: 'verkeerde file: ' + figma.fileKey };
await figma.loadAllPagesAsync();

const cols = await figma.variables.getLocalVariableCollectionsAsync();
const collections = {};
for (const c of cols) {
  const modeNaam = Object.fromEntries(c.modes.map(m => [m.modeId, m.name]));
  const vars = await Promise.all(c.variableIds.map(id => figma.variables.getVariableByIdAsync(id)));
  if (c.name === 'Base') {
    // Een layout-rol (spacing-surface) is een alias naar een schaalstap (spacing-6). `variables`
    // blijft naam -> getal, want build-spec en de guard rekenen ermee; de verwijzing zelf staat
    // apart in `aliassen`, zodat de guard kan toetsen dat hij naar de stap uit tokens.json wijst.
    const perId = new Map(vars.map(v => [v.id, v]));
    const waarde = (v, diepte = 0) => {
      const w = Object.values(v.valuesByMode)[0];
      if (w && typeof w === 'object' && w.type === 'VARIABLE_ALIAS') {
        const doel = perId.get(w.id);
        return doel && diepte < 5 ? waarde(doel, diepte + 1) : null;
      }
      return w;
    };
    const aliassen = {};
    for (const v of vars) {
      const w = Object.values(v.valuesByMode)[0];
      if (w && typeof w === 'object' && w.type === 'VARIABLE_ALIAS') aliassen[v.name] = perId.get(w.id)?.name ?? `onbekend:${w.id}`;
    }
    collections[c.name] = { modes: c.modes.map(m => m.name), variables: Object.fromEntries(vars.map(v => [v.name, waarde(v)])), ...(Object.keys(aliassen).length ? { aliassen } : {}) };
    continue;
  }
  collections[c.name] = { modes: c.modes.map(m => m.name), variables: vars.map(v => v.name) };
  if (c.name === 'Theme') {
    const w = {};
    for (const v of vars) {
      w[v.name] = {};
      for (const [modeId, val] of Object.entries(v.valuesByMode)) {
        w[v.name][modeNaam[modeId]] = (typeof val === 'object' && val.r !== undefined)
          ? (val.a < 0.999
              ? `rgba(${Math.round(val.r * 255)}, ${Math.round(val.g * 255)}, ${Math.round(val.b * 255)}, ${Math.round(val.a * 100) / 100})`
              : rgbNaarHslTriplet(val))
          : val;
      }
    }
    collections[c.name].waarden = w;
  }
}
function rgbNaarHslTriplet({ r, g, b }) {
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let hu = 0, sa = 0;
  if (mx !== mn) {
    const d = mx - mn;
    sa = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    hu = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    hu *= 60;
  }
  const rond = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
  return `${rond(hu)} ${rond(sa * 100)}% ${rond(l * 100)}%`;
}

const platteAssen = (n) => {
  if (!n || n.type !== 'COMPONENT_SET' || !n.variantGroupProperties) return null;
  return Object.fromEntries(Object.entries(n.variantGroupProperties).map(([as, v]) => [as, v.values]));
};

const pages = {};
for (const p of figma.root.children) {
  const kinderen = p.children;
  const comps = kinderen.filter(c => c.type === 'COMPONENT_SET' || c.type === 'COMPONENT');
  const hoofd = comps.find(c => c.getPluginData('primair') === '1')
    ?? comps.find(c => c.name === p.name)
    ?? comps.find(c => c.name.startsWith(p.name))
    ?? comps.find(c => c.type === 'COMPONENT_SET')
    ?? comps.find(c => c.type === 'COMPONENT') ?? null;
  pages[p.name] = {
    pageId: p.id,
    primary: hoofd ? {
      name: hoofd.name, id: hoofd.id, type: hoofd.type,
      variantProperties: platteAssen(hoofd),
      varianten: hoofd.type === 'COMPONENT_SET' ? hoofd.children.map(v => ({ name: v.name, id: v.id })) : null,
    } : null,
    extra: kinderen.filter(c => c !== hoofd).map(c => ({
      name: c.name, id: c.id, type: c.type, variantProperties: platteAssen(c),
      varianten: c.type === 'COMPONENT_SET' ? c.children.map(v => ({ name: v.name, id: v.id })) : null })),
  };
}

return {
  $comment: 'Neergeslagen Figma-staat. NIET met de hand bewerken — ververs via packages/ui/CLAUDE.md.',
  schemaVersie: 2,
  fileKey: figma.fileKey, fileName: figma.root.name,
  gegenereerd: new Date().toISOString().slice(0, 10),
  collections,
  textStyles: (await figma.getLocalTextStylesAsync()).map(t => ({
    name: t.name, family: t.fontName.family, style: t.fontName.style,
    fontSize: t.fontSize,
    lineHeight: t.lineHeight.unit === 'PIXELS' ? t.lineHeight.value : t.lineHeight.unit,
    letterSpacing: t.letterSpacing.value ?? 0 })),
  effectStyles: (await figma.getLocalEffectStylesAsync()).map(e => e.name),
  pages,
};
