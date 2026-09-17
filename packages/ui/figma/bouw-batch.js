// ---------------------------------------------------------------------------
// Wikkel om figma/builder.js, met voortgang en uitkomst in pluginData op de root.
// Kopie van apps/rowtrack/figma/bouw-batch.js (2026-09-16).
//
// Parameters (AsyncFunction): BATCH, STAMP, FORCE, TOEGESTAAN, POORT, figma
//
// WAAROM NIET GEWOON DE RETURNWAARDE. `figma_execute` heeft een WACHTlimiet van 30 s, geen
// uitvoerlimiet: de plugin bouwt door nadat de tool-call is afgekapt, maar de returnwaarde is dan
// weg — en een `fetch` erna komt niet meer aan, `setPluginData` wél (rowtrack, 2026-09-08).
// Contract: vuur deze wikkel af; lees daarna in een korte call `bouwbezig`, `bouwvoortgang` en
// `bouwresultaat`. Zolang `bouwbezig` gevuld is, loopt er een batch — dan NIET een volgende starten.
// ---------------------------------------------------------------------------
if (figma.fileKey !== 'ko2OuasYxyY2YRD69MYhWX') return { fout: 'verkeerde file: ' + figma.fileKey };
if (figma.root.getPluginData('bouwbezig'))
  return { fout: 'er loopt nog een batch: ' + figma.root.getPluginData('bouwbezig') };

figma.root.setPluginData('bouwbezig', BATCH.join(','));
figma.root.setPluginData('bouwresultaat', '');
let uitkomst;
try {
  const min = await (await fetch(`http://localhost:${POORT}/build-spec.min.json`)).json();
  if (min.__doel?.fileKey !== figma.fileKey) throw new Error(`spec is voor ${min.__doel?.fileKey}, niet voor dit bestand`);
  const legacy = BATCH.filter(n => (min.__doel.legacy ?? []).includes(n));
  if (legacy.length) throw new Error('handgebouwde legacy-component(en) in de batch: ' + legacy.join(', '));
  const ontbreekt = BATCH.filter(n => !min.componenten[n]);
  if (ontbreekt.length) throw new Error('onbekende component(en): ' + ontbreekt.join(', '));

  const SPEC = Object.fromEntries(BATCH.map(n => [n, min.componenten[n]]));
  SPEC.__doel = min.__doel;
  SPEC.__stamp = STAMP;
  SPEC.__force = FORCE === true;
  SPEC.__toegestaan = TOEGESTAAN ?? {};
  const bron = await (await fetch(`http://localhost:${POORT}/builder.js`)).text();
  const F = Object.getPrototypeOf(async function () {}).constructor;
  const r = await (new F('SPEC', 'figma', bron))(SPEC, figma);
  uitkomst = { batch: BATCH, stamp: STAMP, ...r, fout: r.fout ?? null };
} catch (e) {
  uitkomst = { batch: BATCH, stamp: STAMP, fout: e.message, gebouwd: [] };
}
figma.root.setPluginData('bouwresultaat', JSON.stringify(uitkomst));
figma.root.setPluginData('bouwbezig', '');
return uitkomst;
