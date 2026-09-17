// Zet de Figma-collectie Base gelijk aan figma/base-payload.json (gegenereerd uit tokens.json).
//
// Functielichaam voor figma_execute, zelfde vorm als bouw-batch.js:
//   const bron = await (await fetch(`http://localhost:${POORT}/zet-base.js`)).text();
//   const F = Object.getPrototypeOf(async function () {}).constructor;
//   return await (new F('figma', 'POORT', 'SCHRIJF', bron))(figma, POORT, SCHRIJF);
//
// SCHRIJF = false is een droge run: hij meldt wat hij zou doen en raakt niets. Draai die eerst.
//
// Bij naam, nooit vervangen: een bestaande variabele houdt zijn id, dus elke binding op een node
// blijft staan. Wat niet in de payload staat (de radius-stappen) wordt niet aangeraakt; een
// onbekende naam wordt gemeld, niet verwijderd.
if (figma.fileKey !== 'ko2OuasYxyY2YRD69MYhWX') return { fout: `verkeerd bestand: ${figma.fileKey}` };

const payload = await (await fetch(`http://localhost:${POORT}/base-payload.json`)).json();
const collectie = (await figma.variables.getLocalVariableCollectionsAsync()).find(c => c.name === 'Base');
if (!collectie) return { fout: 'collectie Base niet gevonden' };
const modeId = collectie.modes[0].modeId;

const bestaand = new Map();
for (const id of collectie.variableIds) {
  const v = await figma.variables.getVariableByIdAsync(id);
  bestaand.set(v.name, v);
}
const log = [];
const huidige = (v) => {
  const w = v.valuesByMode[modeId];
  return w && typeof w === 'object' && w.type === 'VARIABLE_ALIAS' ? `alias:${w.id}` : w;
};

// 1. Schaal: getallen.
for (const { naam, px } of payload.schaal) {
  const v = bestaand.get(naam);
  if (!v) {
    log.push({ naam, actie: 'aanmaken', voor: null, na: px });
    if (SCHRIJF) {
      const nieuw = figma.variables.createVariable(naam, collectie, 'FLOAT');
      nieuw.setValueForMode(modeId, px);
      bestaand.set(naam, nieuw);
    }
  } else if (huidige(v) !== px) {
    log.push({ naam, actie: 'waarde', voor: huidige(v), na: px, id: v.id });
    if (SCHRIJF) v.setValueForMode(modeId, px);
  }
}

// 2. Rollen: aliassen naar een schaalvariabele, met een scope per groep.
for (const { naam, alias, scopes } of payload.rollen) {
  const doel = bestaand.get(alias);
  if (!doel) { log.push({ naam, actie: 'FOUT', reden: `aliasdoel ${alias} bestaat niet${SCHRIJF ? '' : ' (droge run: komt uit stap 1)'}` }); continue; }
  const v = bestaand.get(naam);
  const doelWaarde = { type: 'VARIABLE_ALIAS', id: doel.id };
  if (!v) {
    log.push({ naam, actie: 'aanmaken', voor: null, na: `alias:${alias}`, scopes });
    if (SCHRIJF) {
      const nieuw = figma.variables.createVariable(naam, collectie, 'FLOAT');
      nieuw.setValueForMode(modeId, doelWaarde);
      nieuw.scopes = scopes;
      bestaand.set(naam, nieuw);
    }
  } else {
    if (huidige(v) !== `alias:${doel.id}`) {
      log.push({ naam, actie: 'alias', voor: huidige(v), na: `alias:${alias}`, id: v.id });
      if (SCHRIJF) v.setValueForMode(modeId, doelWaarde);
    }
    if (JSON.stringify(v.scopes) !== JSON.stringify(scopes)) {
      log.push({ naam, actie: 'scopes', voor: v.scopes, na: scopes, id: v.id });
      if (SCHRIJF) v.scopes = scopes;
    }
  }
}

const bekend = new Set([...payload.schaal.map(s => s.naam), ...payload.rollen.map(r => r.naam)]);
const buitenPayload = [...bestaand.keys()].filter(n => !bekend.has(n));
return { schrijf: SCHRIJF, wijzigingen: log.length, log, buitenPayload, totaalNa: SCHRIJF ? collectie.variableIds.length : null };
