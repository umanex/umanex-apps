#!/usr/bin/env node
/**
 * Toetst of élke Figma-variabele een tegenhanger heeft in de token-bron.
 *
 * Wat dit WEL vangt: een variabele die in Figma is aangemaakt voor een waarde die
 * nergens in tokens.json staat — het hardcoded getal is dan van de node naar de
 * variabele verplaatst en Figma is een tweede bron van waarheid geworden. Gemeten
 * op de umanex Component library (2026-08-25): collectie Base 1/21.
 *
 * Wat dit NIET vangt: of de wáárde achter de variabele klopt. Dit is een
 * dekkingscheck op namen, geen parity-check op waarden — die staat in `token-audit`.
 *
 * De Figma-kant is een neergeslagen meting (dump), geen live verbinding: CI heeft
 * geen Bridge. Het verversen staat in de `## Verify-pad`-sectie van de app.
 *
 * Matching gebeurt op de **staart** van het tokenpad, niet op een vaste groep-strip:
 * `Semantic/light/finance/positive` levert de kandidaten `positive`,
 * `finance-positive`, `light-finance-positive`, … Zo werkt dezelfde check op
 * umanex (`Theme/light/x`), rowtrack (`Core|Theme|Component`) en Columba
 * (`semantic/color/text/primary`, geen mode-laag) zonder per-klant configuratie.
 *
 * Exit: 0 = alles gedekt · 1 = gaten gevonden · 2 = meting ongeldig (instrumentfout).
 * Die twee laatste zijn bewust verschillend: "niets gevonden" en "instrument kapot"
 * mogen niet hetzelfde type dragen.
 */
import { readFileSync } from 'node:fs';

const arg = (naam, dflt = null) => {
  const hit = process.argv.find(a => a.startsWith(`--${naam}=`));
  return hit ? hit.slice(naam.length + 3) : dflt;
};
const heeft = naam => process.argv.includes(`--${naam}`);

/** Alle leaf-paden uit een DTCG (of classic) tokens.json. */
export function tokenPaden(node, pad = []) {
  const uit = [];
  for (const [k, v] of Object.entries(node)) {
    if (k === '$themes' || k === '$metadata') continue;
    if (!v || typeof v !== 'object') continue;
    if ('$value' in v || 'value' in v) uit.push([...pad, k].join('/'));
    else uit.push(...tokenPaden(v, [...pad, k]));
  }
  return uit;
}

/** Elke staart van een pad, met '-' geplakt en lowercase: de kandidaat-namen. */
export function staarten(pad) {
  const s = pad.split('/');
  const uit = [];
  for (let i = s.length - 1; i >= 0; i--) uit.push(s.slice(i).join('-').toLowerCase());
  return uit;
}

/** naam -> [tokenpaden die op die naam kunnen eindigen] */
export function bouwIndex(paden) {
  const idx = new Map();
  for (const p of paden) for (const naam of staarten(p)) {
    if (!idx.has(naam)) idx.set(naam, []);
    idx.get(naam).push(p);
  }
  return idx;
}

/** vars: [{naam, col}] of {collectie: [namen]}. */
export function normaliseerVars(raw) {
  if (Array.isArray(raw)) return raw.map(v => ({ naam: v.naam ?? v.name, col: v.col ?? v.collectie ?? '?' }));
  return Object.entries(raw).flatMap(([col, namen]) => namen.map(naam => ({ naam, col })));
}

/**
 * Twee paden die op precies één segment verschillen zijn hetzelfde token in een
 * andere mode (`Theme/light/primary` vs `Theme/dark/primary`) — geen ambiguïteit.
 * Zonder deze regel gaat de waarschuwing af op élk goed opgebouwd multi-mode
 * bestand: 43 van 43 op de umanex-library, en een wachter die altijd afgaat leert
 * je hem te negeren.
 */
export function echtDubbelzinnig(paden) {
  const uniek = [...new Set(paden)];
  if (uniek.length < 2) return false;
  const [ref, ...rest] = uniek.map(p => p.split('/'));
  return rest.some(p => p.length !== ref.length || p.filter((seg, i) => seg !== ref[i]).length > 1);
}

export function dek(vars, idx) {
  const per = new Map();
  for (const { naam, col } of vars) {
    if (!per.has(col)) per.set(col, { totaal: 0, gedekt: 0, gaten: [], dubbelzinnig: [] });
    const c = per.get(col);
    c.totaal++;
    const treffers = idx.get(String(naam).toLowerCase());
    if (!treffers) c.gaten.push(naam);
    else {
      c.gedekt++;
      if (echtDubbelzinnig(treffers)) c.dubbelzinnig.push(`${naam} → ${[...new Set(treffers)].join(' | ')}`);
    }
  }
  return per;
}

// ---- CLI ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const tokensPad = arg('tokens'), varsPad = arg('vars');
  if (!tokensPad || !varsPad) {
    console.error('gebruik: figma-token-coverage.mjs --tokens=<tokens.json> --vars=<figma-vars.json> [--json]');
    process.exit(2);
  }
  let paden, vars;
  try { paden = tokenPaden(JSON.parse(readFileSync(tokensPad, 'utf8'))); }
  catch (e) { console.error(`meting ongeldig: token-bron onleesbaar (${e.message})`); process.exit(2); }
  try { vars = normaliseerVars(JSON.parse(readFileSync(varsPad, 'utf8'))); }
  catch (e) { console.error(`meting ongeldig: variabelen-dump onleesbaar (${e.message})`); process.exit(2); }

  if (!paden.length) { console.error('meting ongeldig: 0 tokenpaden gelezen — instrumentfout, geen afwezigheidsbewijs'); process.exit(2); }
  if (!vars.length) { console.error('meting ongeldig: 0 variabelen in de dump — instrumentfout, geen afwezigheidsbewijs'); process.exit(2); }

  const per = dek(vars, bouwIndex(paden));
  const totaalGedekt = [...per.values()].reduce((n, c) => n + c.gedekt, 0);

  if (totaalGedekt === 0) {
    console.error(`meting ongeldig: geen énkele van ${vars.length} variabelen mapt op ${paden.length} tokenpaden.`);
    console.error('Dat is eerder een normalisatie- of bronfout dan een bevinding — controleer of je de juiste tokens.json meegeeft.');
    process.exit(2);
  }

  const gaten = [];
  const regels = [];
  for (const [col, c] of per) {
    regels.push(`${c.gaten.length ? '✗' : '✓'} ${col}: ${c.gedekt}/${c.totaal} gedekt`);
    if (c.gaten.length) { gaten.push(...c.gaten); regels.push(`    zonder token: ${c.gaten.join(', ')}`); }
    if (c.dubbelzinnig.length) regels.push(`    ⚠ dubbelzinnig: ${c.dubbelzinnig.join(' · ')}`);
  }
  if (heeft('json')) console.log(JSON.stringify({ tokenpaden: paden.length, collecties: Object.fromEntries(per), gaten }, null, 2));
  else { console.log(regels.join('\n')); console.log(`\n${paden.length} tokenpaden · ${vars.length} variabelen · ${gaten.length} zonder token`); }
  process.exit(gaten.length ? 1 : 0);
}
