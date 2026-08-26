/**
 * Toetst of de Storybook-kant (packages/ui) en de Figma-kant (figma/manifest.json)
 * nog één op één staan. Draait in CI en lokaal via `pnpm --filter @umanex/ui figma:check`.
 *
 * Wat dit WEL vangt: een variant die in de code bijkomt of verdwijnt, een component
 * zonder Figma-pagina, een ontbrekende of overtollige tokenrol, een kapotte deep-link,
 * een radius/spacing-afgeleide die niet meer uit de bron volgt.
 *
 * Wat dit NIET vangt: iemand die in Figma iets wijzigt zonder de manifest te
 * verversen. De manifest is een neergeslagen meting, geen live verbinding — CI heeft
 * geen Figma-toegang. Het verversen staat in packages/ui/CLAUDE.md (## Verify-pad).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
// Gesynct vanuit umanex-os (templates/figma-token-coverage.mjs). Onderhoud hem daar:
// een kopie die hier meegroeit is een tweede waarheid.
import { tokenPaden, bouwIndex, dek } from '../../../scripts/figma-token-coverage.mjs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// --root=<pad> laat de selftest de guard op een gemuteerde kopie draaien; zonder de
// flag is de root gewoon packages/ui.
const rootFlag = process.argv.find(a => a.startsWith('--root='));
const root = rootFlag ? rootFlag.slice('--root='.length) : join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'figma/manifest.json'), 'utf8'));
const componentsDir = join(root, 'components/ui');

const fails = [];
const checks = [];
const fail = (as, msg) => fails.push(`[${as}] ${msg}`);
const ok = (as, msg) => checks.push(`[${as}] ${msg}`);

/** Pakt het `variants: { … }` object uit een cva-aanroep met brace-matching. */
function cvaVariants(source) {
  const start = source.indexOf('variants: {');
  if (start === -1) return null;
  let i = source.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < source.length; j++) {
    if (source[j] === '{') depth++;
    else if (source[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end === -1) return null;
  const body = source.slice(i + 1, end);
  // top-level keys van `variants`, elk met hun eigen sub-keys
  const out = {};
  let k = 0;
  while (k < body.length) {
    const m = /(\w+)\s*:\s*\{/g;
    m.lastIndex = k;
    const hit = m.exec(body);
    if (!hit) break;
    let d = 0, s = body.indexOf('{', hit.index), e = -1;
    for (let j = s; j < body.length; j++) {
      if (body[j] === '{') d++;
      else if (body[j] === '}') { d--; if (d === 0) { e = j; break; } }
    }
    if (e === -1) break;
    const inner = body.slice(s + 1, e);
    out[hit[1]] = [...inner.matchAll(/^\s*([\w'"-]+)\s*:/gm)].map(x => x[1].replace(/['"]/g, ''));
    k = e + 1;
  }
  return Object.keys(out).length ? out : null;
}

/**
 * Props die de code kent maar die GEEN visuele variant-as zijn. Elke uitsluiting
 * draagt zijn reden, zodat ze telbaar is in plaats van stilzwijgend weggelaten —
 * een weggelaten as ziet er in het rapport identiek uit aan een as die klopt.
 *
 * Numerieke controls (Slider.min/max/step) staan hier bewust NIET in: `control: 'number'`
 * levert geen options, dus argTypeAssen() ziet ze per constructie al niet als as. Een
 * uitsluiting die nooit vuurt zou een filtering suggereren die niet plaatsvindt.
 */
const NIET_VISUEEL = {
  'Input.type':      'HTML input-type; verandert het uiterlijk van het veld niet',
  'Tooltip.side':    'bepaalt de plaatsing t.o.v. de trigger, niet het uiterlijk van TooltipContent',
};

/**
 * Assen die alleen in Figma bestaan omdat de code ze als interne state draagt
 * (geen prop, dus niet uit cva of argTypes af te leiden). Ook hier: mét reden.
 */
const FIGMA_ONLY = {
  'ThemeToggle.mode': 'useState(isDark) bepaalt Moon vs Sun; interne state, geen prop',
};

/** Leest de argTypes-assen uit een stories-bestand: select/radio met options, of boolean. */
function argTypeAssen(src) {
  const start = src.indexOf('argTypes:');
  if (start === -1) return {};
  let i = src.indexOf('{', start), depth = 0, end = -1;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) { end = j; break; } }
  }
  if (end === -1) return {};
  const body = src.slice(i + 1, end);
  const out = {};
  for (const m of body.matchAll(/(\w+)\s*:\s*\{([^}]*)\}/g)) {
    const naam = m[1], spec = m[2];
    if (/control:\s*'boolean'/.test(spec)) { out[naam] = ['false', 'true']; continue; }
    const opts = spec.match(/options:\s*\[([^\]]*)\]/);
    if (opts && /control:\s*'(select|radio)'/.test(spec)) {
      out[naam] = [...opts[1].matchAll(/'([^']+)'/g)].map(x => x[1]);
    }
  }
  return out;
}

// ---- 1. Elke story een pagina, elke pagina een story ----
const storyFiles = readdirSync(componentsDir).filter(f => f.endsWith('.stories.tsx'));
const storyComponents = storyFiles.map(f => {
  const src = readFileSync(join(componentsDir, f), 'utf8');
  const t = src.match(/title:\s*['"]Componenten\/([\w-]+)['"]/);
  return { file: f, component: t ? t[1] : null, src };
});
const missingTitle = storyComponents.filter(s => !s.component);
if (missingTitle.length) fail('pagina', `story zonder 'Componenten/<naam>'-titel: ${missingTitle.map(s => s.file).join(', ')}`);

const manifestPages = Object.keys(manifest.pages).filter(p => p !== 'Overzicht');
const codeComponents = storyComponents.map(s => s.component).filter(Boolean).sort();
const zonderPagina = codeComponents.filter(c => !manifestPages.includes(c));
const zonderStory = manifestPages.filter(p => !codeComponents.includes(p));
if (zonderPagina.length) fail('pagina', `component in Storybook zonder Figma-pagina: ${zonderPagina.join(', ')}`);
if (zonderStory.length) fail('pagina', `Figma-pagina zonder Storybook-component: ${zonderStory.join(', ')}`);
if (!zonderPagina.length && !zonderStory.length) ok('pagina', `${codeComponents.length} componenten ↔ ${manifestPages.length} pagina's, 1-op-1`);

// ---- 2. Varianten: cva uit de bron + argTypes uit de story, minus de uitsluitingen ----
const uitgesloten = [];
for (const { component, src: storySrc } of storyComponents) {
  if (!component) continue;
  const page = manifest.pages[component];
  if (!page) continue;
  const bron = readdirSync(componentsDir).find(f =>
    f.toLowerCase() === `${component.toLowerCase()}.tsx` && !f.includes('.stories.'));
  if (!bron) { fail('variant', `geen bronbestand voor ${component}`); continue; }

  const verwacht = { ...(cvaVariants(readFileSync(join(componentsDir, bron), 'utf8')) ?? {}) };
  for (const [as, waarden] of Object.entries(argTypeAssen(storySrc))) {
    if (NIET_VISUEEL[`${component}.${as}`]) { uitgesloten.push(`${component}.${as} — ${NIET_VISUEEL[`${component}.${as}`]}`); continue; }
    verwacht[as] ??= waarden;
  }
  for (const sleutel of Object.keys(FIGMA_ONLY)) {
    const [comp, as] = sleutel.split('.');
    if (comp === component) verwacht[as] = manifest.pages[comp]?.primary?.variantProperties?.[as] ?? [];
  }

  const werkelijk = page.primary?.variantProperties ?? null;
  const codeAssen = Object.keys(verwacht).sort();
  const figmaAssen = werkelijk ? Object.keys(werkelijk).sort() : [];

  if (!codeAssen.length) {
    if (figmaAssen.length) fail('variant', `${component}: code kent geen visuele as, Figma wel (${figmaAssen.join(', ')})`);
    else ok('variant', `${component}: geen varianten, beide kanten`);
    continue;
  }
  if (!werkelijk) { fail('variant', `${component}: code kent assen (${codeAssen.join(', ')}), Figma geen enkele`); continue; }
  if (codeAssen.join('|') !== figmaAssen.join('|')) {
    fail('variant', `${component}: variant-assen verschillen — code [${codeAssen}] vs Figma [${figmaAssen}]`);
    continue;
  }
  let gelijk = true;
  for (const as of codeAssen) {
    const c = [...verwacht[as]].sort().join(',');
    const f = [...werkelijk[as]].sort().join(',');
    if (c !== f) { fail('variant', `${component}.${as}: code [${c}] vs Figma [${f}]`); gelijk = false; }
  }
  if (gelijk) ok('variant', `${component}: ${codeAssen.map(a => `${a}=${verwacht[a].length}`).join(' × ')} — gelijk`);
}

// ---- 3. Tokenrollen: roles.mjs ↔ collection Theme ----
const rolesSrc = readFileSync(join(root, '../tokens/build/roles.mjs'), 'utf8');
const lijst = naam => {
  const m = rolesSrc.match(new RegExp(`export const ${naam} = \\[([\\s\\S]*?)\\];`));
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]) : [];
};
const codeRoles = [...lijst('hslRoles'), ...lijst('rawRoles')].sort();
const figmaRoles = [...manifest.collections.Theme.variables].sort();
const rolTekort = codeRoles.filter(r => !figmaRoles.includes(r));
const rolTeveel = figmaRoles.filter(r => !codeRoles.includes(r));
if (rolTekort.length) fail('token', `rol in code zonder Figma-variable: ${rolTekort.join(', ')}`);
if (rolTeveel.length) fail('token', `Figma-variable zonder rol in code: ${rolTeveel.join(', ')}`);
if (!rolTekort.length && !rolTeveel.length) ok('token', `${codeRoles.length} kleurrollen ↔ ${figmaRoles.length} Theme-variabelen, 1-op-1`);

const modes = manifest.collections.Theme.modes;
if (modes.join(',') !== 'Light,Dark') fail('token', `Theme-modes zijn [${modes}], verwacht [Light,Dark]`);
else ok('token', 'Theme heeft precies de modes Light en Dark');

// ---- 4. Afgeleide schalen volgen hun rekenregel ----
const B = manifest.collections.Base.variables;
const R = B['radius'];
const regels = [
  ['radius-lg', R, 'var(--radius)'],
  ['radius-md', R - 2, 'calc(var(--radius) - 2px)'],
  ['radius-sm', R - 4, 'calc(var(--radius) - 4px)'],
];
for (const [naam, verwacht, bron] of regels) {
  if (B[naam] !== verwacht) fail('schaal', `${naam} = ${B[naam]}, maar ${bron} geeft ${verwacht}`);
}
if (!fails.some(f => f.startsWith('[schaal]'))) ok('schaal', `radius-afgeleiden volgen de preset (radius=${R} → lg/md/sm = ${R}/${R - 2}/${R - 4})`);

// Elke Base-variabele moet in een categorie vallen die een regel draagt. Een naam die
// nergens onder valt is drift: hij komt uit geen enkele bron en niets toetst zijn waarde.
const BASE_CATEGORIE = [
  [/^radius(-lg|-md|-sm|-full)?$/, 'radius-schaal uit de preset'],
  [/^spacing-[\d_]+$/,             'Tailwind-spacingschaal (n × 4px)'],
  [/^border-[12]$/,                'Tailwind border-width'],
  [/^icon-stroke$/,                'lucide-react stroke-width'],
];
const zonderCategorie = Object.keys(B).filter(n => !BASE_CATEGORIE.some(([re]) => re.test(n)));
if (zonderCategorie.length) fail('schaal', `Base-variabele zonder bekende categorie (drift): ${zonderCategorie.join(', ')}`);
else ok('schaal', `${Object.keys(B).length} Base-variabelen vallen in ${BASE_CATEGORIE.length} bekende categorieën`);
if (B['icon-stroke'] !== 2) fail('schaal', `icon-stroke = ${B['icon-stroke']}, maar lucide-react tekent op stroke-width 2`);
if (B['border-1'] !== 1 || B['border-2'] !== 2) fail('schaal', `border-1/border-2 = ${B['border-1']}/${B['border-2']}, verwacht 1/2`);

const spacingFout = Object.entries(B)
  .filter(([n]) => n.startsWith('spacing-'))
  .filter(([n, v]) => v !== Number(n.slice('spacing-'.length).replace('_', '.')) * 4);
if (spacingFout.length) fail('schaal', `spacing wijkt af van de Tailwind-schaal (n × 4px): ${spacingFout.map(([n, v]) => `${n}=${v}`).join(', ')}`);
else ok('schaal', `${Object.keys(B).filter(n => n.startsWith('spacing-')).length} spacing-stappen volgen n × 4px`);

// ---- 5b. Token-dekking: elke variabele hangt aan een pad in tokens.json ----
// Een variabele aanmaken voor een waarde die nergens in de token-bron staat, verplaatst
// het hardcoded getal van de node naar de variabele: de bindingscheck wordt groen terwijl
// de waarde nog altijd uit niets komt, en Figma wordt een tweede bron van waarheid
// (LEARNINGS umanex-os, 2026-08-25 — collectie Base mat 1/21).
//
// De twintig namen hieronder zijn bekende schuld, geen uitzondering: de maat-schaal heeft
// nog geen token-bron (BACKLOG 2026-08-25, "Spacing-, border- en shadow-schaal hebben geen
// token-bron"). De lijst werkt twee kanten op — een níeuw gat faalt, en een naam die géén
// gat meer is faalt óók. Zonder die tweede kant veroudert de lijst stil en dekt hij op den
// duur precies datgene af wat de as moet vangen.
const BEKENDE_GATEN = new Set([
  'radius-lg', 'radius-md', 'radius-sm', 'radius-full',
  'spacing-0_5', 'spacing-1', 'spacing-1_5', 'spacing-2', 'spacing-2_5', 'spacing-3',
  'spacing-4', 'spacing-5', 'spacing-6', 'spacing-8', 'spacing-9', 'spacing-10', 'spacing-11',
  'border-1', 'border-2', 'icon-stroke',
]);
const tokensPad = join(root, '../tokens/tokens.json');
if (!existsSync(tokensPad)) {
  fail('dekking', `token-bron niet gevonden op ${tokensPad}`);
} else {
  const paden = tokenPaden(JSON.parse(readFileSync(tokensPad, 'utf8')));
  // De twee collecties dragen een andere vorm: Theme is een lijst namen, Base een
  // naam→waarde-object. Object.keys() op de lijst gaf indices (0, 6, 7, …) die tegen
  // Primitives/Chart/1 aan matchten — een meting over de verkeerde grootheid.
  const namenVan = c => Array.isArray(c.variables) ? c.variables : Object.keys(c.variables ?? {});
  const vars = Object.entries(manifest.collections)
    .flatMap(([col, c]) => namenVan(c).map(naam => ({ naam, col })));
  if (vars.some(v => /^\d+$/.test(String(v.naam)))) {
    fail('dekking', 'variabelenamen lezen als indices — manifest-vorm veranderd, meting ongeldig');
  }
  const per = dek(vars, bouwIndex(paden));
  const gaten = [...per.values()].flatMap(c => c.gaten);
  // "niets gevonden" en "instrument kapot" mogen niet hetzelfde type dragen: mapt er
  // niets, dan is dat een bron- of normalisatiefout, geen twintig bevindingen.
  if (!paden.length || ![...per.values()].some(c => c.gedekt)) {
    fail('dekking', `geen enkele van ${vars.length} variabelen mapt op ${paden.length} tokenpaden — instrumentfout, geen bevinding`);
  } else {
    const nieuwGat = gaten.filter(n => !BEKENDE_GATEN.has(n));
    const verouderd = [...BEKENDE_GATEN].filter(n => !gaten.includes(n));
    if (nieuwGat.length) fail('dekking', `variabele zonder token in de bron: ${nieuwGat.join(', ')}`);
    if (verouderd.length) fail('dekking', `heeft nu wél een token — haal uit BEKENDE_GATEN: ${verouderd.join(', ')}`);
    if (!nieuwGat.length && !verouderd.length) {
      ok('dekking', `${vars.length - gaten.length}/${vars.length} variabelen gedekt door tokens.json; ${gaten.length} bekende gaten (maat-schaal, zie BACKLOG)`);
    }
  }
}

// ---- 5. Deep-links wijzen naar een bestaande node ----
const alleNodeIds = new Set();
for (const p of Object.values(manifest.pages)) {
  if (p.primary) alleNodeIds.add(p.primary.id);
  for (const e of p.extra ?? []) alleNodeIds.add(e.id);
}
for (const { file, component, src } of storyComponents) {
  if (!component) continue;
  const m = src.match(/figma:\s*\{\s*url:\s*['"]([^'"]+)['"]/);
  if (!m) { fail('link', `${file}: geen parameters.figma.url`); continue; }
  const url = m[1];
  if (!url.includes(manifest.fileKey)) { fail('link', `${file}: URL wijst niet naar fileKey ${manifest.fileKey}`); continue; }
  const nodeMatch = url.match(/node-id=([\w-]+)/);
  if (!nodeMatch) { fail('link', `${file}: URL heeft geen node-id`); continue; }
  const nodeId = nodeMatch[1].replace('-', ':');
  if (!alleNodeIds.has(nodeId)) { fail('link', `${file}: node-id ${nodeId} bestaat niet in de manifest`); continue; }
  const verwachtId = manifest.pages[component]?.primary?.id;
  if (nodeId !== verwachtId) { fail('link', `${file}: linkt naar ${nodeId}, maar ${component} staat op ${verwachtId}`); continue; }
}
if (!fails.some(f => f.startsWith('[link]'))) ok('link', `${codeComponents.length} deep-links wijzen naar de juiste node`);

// ---- Rapport ----
console.log('figma-sync-check — packages/ui ↔ Figma "%s" (%s)\n', manifest.fileName, manifest.fileKey);
for (const c of checks) console.log('  ok   ' + c);
for (const u of uitgesloten) console.log('  --   [uitgesloten] ' + u);
for (const [k, v] of Object.entries(FIGMA_ONLY)) console.log('  --   [figma-only]  ' + k + ' — ' + v);
if (fails.length) {
  console.log('');
  for (const f of fails) console.log('  FAIL ' + f);
  console.log(`\n${fails.length} verschil(len). Code en Figma staan niet in sync.`);
  console.log('Fix de code, of werk Figma bij en ververs figma/manifest.json (zie packages/ui/CLAUDE.md → Verify-pad).');
  process.exit(1);
}
console.log(`\n${checks.length} checks groen. Code en Figma staan in sync.`);
