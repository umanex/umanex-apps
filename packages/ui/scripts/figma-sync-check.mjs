/**
 * Toetst of de Storybook-kant (packages/ui) en de Figma-kant (figma/manifest.json)
 * nog één op één staan. Draait in CI en lokaal via `pnpm --filter @umanex/ui figma:check`.
 *
 * Wat dit WEL vangt: een variant die in de code bijkomt of verdwijnt, een component
 * zonder Figma-pagina, een ontbrekende of overtollige tokenrol, een kapotte deep-link,
 * een radius/spacing-afgeleide die niet meer uit de bron volgt.
 *
 * Wat dit NIET vangt, en dat is breder dan het lijkt:
 *
 *  (a) Iemand die in Figma iets wijzigt zonder de manifest te verversen. De manifest is
 *      een neergeslagen meting, geen live verbinding — CI heeft geen Figma-toegang.
 *  (b) Elke eigenschap die bepaalt hoe een node ERUITZIET en die niet in de manifest
 *      staat: fills en strokes per node, auto-layout, padding, gap, radius per node,
 *      afmetingen, welk effect waar hangt, opacity, constraints en de kinderstructuur.
 *      GEMETEN op 2026-09-07 met een mutatietest op een wegwerpkopie: tien mutaties op
 *      manifest-velden die deze guard niet leest gaven alle tien exit 0 en "checks
 *      groen"; drie controle-mutaties op velden die hij wél leest gaven alle drie exit 1.
 *      Zelfde harnas, tegengestelde uitkomst — het harnas kán rood worden, die velden
 *      maken het niet rood.
 *
 * Daarom noemt de slotregel de assen en het bereik, en niet "in sync": die zin claimde
 * meer dan de assen dragen (HANDOFF 2026-08-25).
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs';
// Gesynct vanuit umanex-os (templates/figma-token-coverage.mjs). Onderhoud hem daar:
// een kopie die hier meegroeit is een tweede waarheid.
import { tokenPaden, bouwIndex, dek } from '../../../scripts/figma-token-coverage.mjs';
import { join, dirname } from 'node:path';
import { NIET_VISUEEL, FIGMA_ONLY, LEGACY, primairVan } from './figma/doel.mjs';
import { fileURLToPath } from 'node:url';

// --root=<pad> laat de selftest de guard op een gemuteerde kopie draaien; zonder de
// flag is de root gewoon packages/ui.
const rootFlag = process.argv.find(a => a.startsWith('--root='));
const root = rootFlag ? rootFlag.slice('--root='.length) : join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'figma/manifest.json'), 'utf8'));
const componentsDir = join(root, 'components/ui');

const fails = [];
const checks = [];
const overgeslagen = [];   // assen die niets konden meten — zichtbaar, niet stil
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

// De uitsluitingen (NIET_VISUEEL, FIGMA_ONLY) staan sinds 2026-09-16 in scripts/figma/doel.mjs,
// met hun redenen: de bouwspec leest dezelfde lijst, en twee kopieën van een oordeel lopen stil
// uiteen. Import, geen kopie.

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
  // Twee bestandsnaam-conventies leven naast elkaar in components/ui: PascalCase
  // (`ThemeToggle.tsx`) en kebab-case (`dropdown-menu.tsx`, de shadcn-vorm waar het
  // export-pad `./components/ui/dropdown-menu` aan hangt). Tot 2026-09-08 vergeleek
  // deze regel alleen lowercased, wat per constructie slaagde zolang élk component
  // één woord was (badge, button, card, …); het eerste tweewoordige component gaf
  // `geen bronbestand voor DropdownMenu` terwijl het bestand er gewoon stond.
  //
  // Precies die twee vormen, niet "koppeltekens genegeerd": dat laatste zou ook
  // `drop-down-menu.tsx` accepteren (gemeten — de guard bleef groen), en dan bewaakt
  // deze as de bestandsnaam niet meer.
  const kebab = n => n.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  const kandidaten = new Set([`${component.toLowerCase()}.tsx`, `${kebab(component)}.tsx`]);
  const bron = readdirSync(componentsDir).find(f =>
    kandidaten.has(f.toLowerCase()) && !f.includes('.stories.'));
  if (!bron) { fail('variant', `geen bronbestand voor ${component}`); continue; }

  const verwacht = { ...(cvaVariants(readFileSync(join(componentsDir, bron), 'utf8')) ?? {}) };
  for (const [as, waarden] of Object.entries(argTypeAssen(storySrc))) {
    if (NIET_VISUEEL[`${component}.${as}`]) { uitgesloten.push(`${component}.${as} — ${NIET_VISUEEL[`${component}.${as}`]}`); continue; }
    verwacht[as] ??= waarden;
  }
  // FIGMA_ONLY-assen worden aan BEIDE kanten weggelaten, niet uit de manifest gekopieerd.
  // Tot 2026-09-07 stond hier `verwacht[as] = manifest…variantProperties[as]` — dat maakt
  // verwacht gelijk aan werkelijk per constructie, dus die as kon nooit rood worden. Een
  // check die zichzelf bevestigt telde mee in het totaal.
  const figmaOnlyAssen = Object.keys(FIGMA_ONLY)
    .filter(k => k.split('.')[0] === component).map(k => k.split('.')[1]);

  const werkelijkRuw = page.primary?.variantProperties ?? null;
  const werkelijk = werkelijkRuw
    ? Object.fromEntries(Object.entries(werkelijkRuw).filter(([a]) => !figmaOnlyAssen.includes(a)))
    : null;
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
const IS_SCHAAL = /^(spacing-([\d_]+|px)|border-\d+|icon-stroke)$/;
const IS_LAYOUTROL = /^(spacing|size)-[a-z][a-z-]*$/;
const BASE_CATEGORIE = [
  [/^radius(-lg|-md|-sm|-full)?$/, 'radius-schaal uit de preset'],
  [/^spacing-([\d_]+|px)$/,        'Layout/Scale spacing'],
  [/^border-\d+$/,                 'Layout/Scale border'],
  [/^icon-stroke$/,                'Layout/Scale icon.stroke'],
  [IS_LAYOUTROL,                   'Theme/base layout-rol (alias) — spacing-px valt al onder de schaal'],
];
const zonderCategorie = Object.keys(B).filter(n => !BASE_CATEGORIE.some(([re]) => re.test(n)));
if (zonderCategorie.length) fail('schaal', `Base-variabele zonder bekende categorie (drift): ${zonderCategorie.join(', ')}`);
else ok('schaal', `${Object.keys(B).length} Base-variabelen vallen in ${BASE_CATEGORIE.length} bekende categorieën`);
// Spacing, border en icon-stroke toetsen tegen hun token in Layout/Scale (sinds 2026-09-17).
// Daarvoor was de bron een rekenregel (n × 4px) en lucide's default; de rekenregel bleef
// hier niet als tweede bron staan, want dan kunnen token en Figma samen verschuiven en
// blijft deze as groen.
const layoutPad = join(root, '../tokens/tokens.json');
const layout = existsSync(layoutPad) ? JSON.parse(readFileSync(layoutPad, 'utf8'))['Layout/Scale'] : null;
if (!layout?.spacing) {
  fail('schaal', `Layout/Scale niet gevonden in ${layoutPad} — spacing/border/icon-stroke niet te toetsen`);
} else {
  const px = v => { const t = String(v.$value ?? v.value); return t.endsWith('rem') ? parseFloat(t) * 16 : parseFloat(t); };
  const stappen = groep => Object.entries(groep ?? {}).filter(([k]) => !k.startsWith('$'));
  const verwacht = {
    ...Object.fromEntries(stappen(layout.spacing).map(([k, v]) => [`spacing-${k}`, px(v)])),
    ...Object.fromEntries(stappen(layout.border).map(([k, v]) => [`border-${k}`, px(v)])),
    'icon-stroke': px(layout.icon?.stroke ?? { $value: NaN }),
  };
  const schaalFout = [
    ...Object.entries(B).filter(([n]) => IS_SCHAAL.test(n)).filter(([n, v]) => v !== verwacht[n]),
    // Tweezijdig: een stap uit Layout/Scale die in Figma ontbreekt telt ook. [dekking] kijkt
    // alleen van Figma naar tokens, dus zonder deze regel viel een verdwenen icon-stroke stil.
    ...Object.keys(verwacht).filter(n => !(n in B)).map(n => [n, 'ontbreekt']),
  ];
  if (schaalFout.length) fail('schaal', `wijkt af van Layout/Scale in tokens.json: ${schaalFout.map(([n, v]) => `${n}=${v} (token ${verwacht[n]})`).join(', ')}`);
  else ok('schaal', `${Object.keys(B).filter(n => IS_SCHAAL.test(n)).length} spacing-, border- en icon-variabelen gelijk aan Layout/Scale`);

  // Layout-rollen: in Figma een alias naar de schaalstap die Theme/base noemt. Een rol met een
  // eigen getal zou kloppen tot de schaal verschuift, en daarna stil blijven staan.
  const themeBase = JSON.parse(readFileSync(layoutPad, 'utf8'))['Theme/base'] ?? {};
  const rolDoelen = {};
  for (const groep of ['spacing', 'size']) {
    for (const [k, v] of Object.entries(themeBase[groep] ?? {}).filter(([k]) => !k.startsWith('$'))) {
      const ref = String(v.$value ?? v.value).match(/^\{spacing\.([\w]+)\}$/);
      rolDoelen[`${groep}-${k}`] = ref ? `spacing-${ref[1]}` : `geen alias (${v.$value ?? v.value})`;
    }
  }
  const aliassen = manifest.collections.Base.aliassen ?? {};
  const rolFout = [
    ...Object.entries(rolDoelen).filter(([n]) => !(n in B)).map(([n]) => `${n} ontbreekt in Figma`),
    ...Object.entries(rolDoelen).filter(([n]) => n in B && aliassen[n] !== rolDoelen[n])
      .map(([n]) => `${n} wijst naar ${aliassen[n] ?? `een eigen waarde (${B[n]})`}, token zegt ${rolDoelen[n]}`),
    ...Object.keys(B).filter(n => IS_LAYOUTROL.test(n) && !IS_SCHAAL.test(n) && !(n in rolDoelen)).map(n => `${n} staat niet in Theme/base`),
  ];
  if (rolFout.length) fail('schaal', `layout-rollen: ${rolFout.join('; ')}`);
  else ok('schaal', `${Object.keys(rolDoelen).length} layout-rollen zijn in Figma een alias naar hun stap uit Theme/base`);
}

// ---- 5b. Token-dekking: elke variabele hangt aan een pad in tokens.json ----
// Een variabele aanmaken voor een waarde die nergens in de token-bron staat, verplaatst
// het hardcoded getal van de node naar de variabele: de bindingscheck wordt groen terwijl
// de waarde nog altijd uit niets komt, en Figma wordt een tweede bron van waarheid
// (LEARNINGS umanex-os, 2026-08-25 — collectie Base mat 1/21).
//
// De namen hieronder zijn bekende schuld, geen uitzondering. Spacing, border en icon-stroke
// kregen op 2026-09-17 hun token-bron (Layout/Scale); de radius-stappen niet — de preset
// leidt ze met calc() af van één token, en ze uitschrijven wijzigt de CSS-uitvoer van elke
// app (BACKLOG 2026-08-25). De lijst werkt twee kanten op — een níeuw gat faalt, en een naam
// die géén gat meer is faalt óók. Zonder die tweede kant veroudert de lijst stil en dekt hij
// op den duur precies datgene af wat de as moet vangen.
const BEKENDE_GATEN = new Set([
  'radius-lg', 'radius-md', 'radius-sm', 'radius-full',
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
      ok('dekking', `${vars.length - gaten.length}/${vars.length} variabelen gedekt door tokens.json; ${gaten.length} bekende gaten (radius-stappen, zie BACKLOG)`);
    }
  }
}

// ---- 5e. Variant-nodes: het aantal volgt uit de assen ----
//
// Deze as bestaat omdat de terugleescontrole bij het schema-2-verversen iets vond dat de
// eenentwintig groene checks niet zagen: de twee variant-nodes van TabsTrigger ontbraken in
// de manifest. Ze stonden onder `extra`, en `extra` kreeg toen nog geen `varianten`-lijst.
//
// Het aantal variant-nodes van een component set is per constructie het product van zijn
// variant-assen: Button 6 × 4 × 2 = 48, Checkbox 2 × 2 = 4. Dat is dus te toetsen zónder
// Figma, en het vangt precies de vorm waarin een ververs-fout binnenkomt — een lijst die er
// half is ziet er in de manifest uit als een lijst.
//
// Alleen op schema 2: schema 1 kende het veld niet, dus daar slaat de as zichtbaar over.
if ((manifest.schemaVersie ?? 1) < 2) {
  overgeslagen.push('[varianten] manifest schema 1 kent geen variant-nodes — ververs via packages/ui/CLAUDE.md');
} else {
  const varFout = [];
  let telNodes = 0;
  for (const [pagina, p] of Object.entries(manifest.pages)) {
    const knopen = [...(p.primary ? [p.primary] : []), ...(p.extra ?? [])];
    for (const n of knopen) {
      if (n.type !== 'COMPONENT_SET') {
        if (n.varianten?.length) varFout.push(`${pagina}/${n.name}: geen COMPONENT_SET maar wel ${n.varianten.length} varianten`);
        continue;
      }
      const assen = n.variantProperties;
      if (!assen || !Object.keys(assen).length) { varFout.push(`${pagina}/${n.name}: COMPONENT_SET zonder variant-assen`); continue; }
      const verwacht = Object.values(assen).reduce((n2, w) => n2 * w.length, 1);
      const werkelijk = n.varianten?.length ?? 0;
      telNodes += werkelijk;
      if (werkelijk !== verwacht) {
        const assenTekst = Object.entries(assen).map(([a, w]) => `${a}=${w.length}`).join(' × ');
        varFout.push(`${pagina}/${n.name}: ${werkelijk} variant-nodes, ${assenTekst} = ${verwacht} verwacht`);
      }
      // `?? []`: bij een ontbrekende lijst hoort deze as te MELDEN, niet te crashen. De
      // zelftest ving dat — het geval waarvoor de as gebouwd is (varianten weg op een
      // extra-node) liet het instrument omvallen in plaats van rood te worden.
      const dubbel = (n.varianten ?? []).map(v => v.id).filter((id, i, arr) => arr.indexOf(id) !== i);
      if (dubbel.length) varFout.push(`${pagina}/${n.name}: dubbele node-id ${[...new Set(dubbel)].join(', ')}`);
    }
  }
  if (varFout.length) for (const f of varFout) fail('varianten', f);
  else ok('varianten', `${telNodes} variant-nodes, elk aantal gelijk aan het product van zijn assen`);
}

// ---- 5c. Typografie: elke Figma text style komt uit de tokenschaal ----
//
// De vijf text styles stonden sinds 2026-08-25 in de manifest en werden door niets gelezen
// (gemeten: `textStyles` kwam nul keer voor in dit bestand; fontSize 14→99 en family →
// "Comic Sans MS" gaven allebei exit 0). Een style is de typografische tegenhanger van een
// variabele: zijn getallen horen uit `packages/tokens/build/typography.mjs` te komen, anders
// is Figma een tweede bron van waarheid — precies wat CLAUDE.md verbiedt.
//
// Wat deze as NIET zegt: dat élk component een style gebruikt. Een palet mag ruimer zijn dan
// zijn consumenten, en een component mag een regelhoogte overschrijven (`CardTitle` draagt
// `leading-none` bij een 2xl-style van 24/32). Dat is geen drift; de as toetst de herkomst
// van de getallen, niet de dekking van het palet.
const typo = await import(new URL('../../tokens/build/typography.mjs', import.meta.url + '/../').href)
  .catch(() => null);
if (!typo) {
  overgeslagen.push('[typografie] packages/tokens/build/typography.mjs niet gevonden — draai `pnpm --filter @umanex/tokens build`');
} else if (!Array.isArray(manifest.textStyles)) {
  overgeslagen.push('[typografie] manifest draagt geen textStyles — ververs via packages/ui/CLAUDE.md → Verify-pad');
} else {
  const px = v => Math.round(parseFloat(v) * 16);          // rem → px, basis 16
  const schaal = Object.fromEntries(Object.entries(typo.fontSize)
    .map(([k, v]) => [k, [px(v[0]), px(v[1].lineHeight)]]));
  const families = Object.values(typo.fontFamily);
  const typoFout = [];
  for (const st of manifest.textStyles) {
    const stap = String(st.name).split('/')[1]?.split('-')[0];
    const w = schaal[stap];
    if (!w) { typoFout.push(`${st.name}: stap '${stap}' bestaat niet in de tokenschaal`); continue; }
    if (w[0] !== st.fontSize || w[1] !== st.lineHeight)
      typoFout.push(`${st.name}: ${st.fontSize}/${st.lineHeight} tegen token ${stap} = ${w[0]}/${w[1]}`);
    if (!families.includes(st.family))
      typoFout.push(`${st.name}: family '${st.family}' staat niet in fontFamily`);
  }
  if (typoFout.length) for (const f of typoFout) fail('typografie', f);
  else ok('typografie', `${manifest.textStyles.length} text styles volgen de tokenschaal (grootte, regelhoogte, family)`);
}

// ---- 5d. Themawaarden: de kleur zelf, niet enkel de naam ----
//
// De [token]-as vergelijkt NAMEN. Verandert iemand `--primary` in Figma van rood naar blauw,
// dan blijft die as groen tot in de eeuwigheid. Deze as vergelijkt de waarde per mode met
// `packages/tokens/build/theme.css`, en is daarmee de enige as die "Figma ziet eruit als de
// code" afdwingt zonder pixels.
//
// Hij vraagt een manifest van schema 2: `collections.Theme.waarden` als naam → {Light, Dark}.
// Zolang die er niet is slaat hij zichtbaar over in plaats van groen te melden — een as die
// niets meet mag geen dekking suggereren.
// Ruim genoeg voor RGB-kwantisatie (gemeten maximaal 0,03), eng genoeg dat elke echte
// kleurwijziging afgaat: de kleinste zinvolle stap in de rollaag is meerdere procentpunten.
const TOL_HOEK = 0.5, TOL_PCT = 0.5;
const themaWaarden = manifest.collections?.Theme?.waarden;
if (!themaWaarden) {
  overgeslagen.push('[themawaarde] manifest schema 1 draagt alleen namen — ververs met het schema-2-commando in packages/ui/CLAUDE.md');
} else {
  const css = readFileSync(join(root, '../tokens/build/theme.css'), 'utf8');
  const blokVan = sel => {
    const m = css.match(new RegExp(sel.replace('.', '\\.') + '\\s*\\{([^}]*)\\}'));
    if (!m) return null;
    return Object.fromEntries([...m[1].matchAll(/--([\w-]+):\s*([^;]+);/g)].map(x => [x[1], x[2].trim()]));
  };
  const modi = { Light: blokVan(':root'), Dark: blokVan('.dark') };
  const waardeFout = [];
  for (const [naam, perMode] of Object.entries(themaWaarden)) {
    for (const [mode, waarde] of Object.entries(perMode)) {
      const bron = modi[mode]?.[naam];
      if (bron === undefined) { waardeFout.push(`${naam} (${mode}): geen tegenhanger in theme.css`); continue; }
      // Tolerantie, geen string-gelijkheid. Figma slaat een kleur op als RGB-float; theme.css
      // draagt de geschreven HSL. De heenweg door 8-bit RGB is per constructie niet exact
      // terug te rekenen: gemeten 2026-09-07 gaf `38 92.1% 50.2%` tegen `38 92.126% 50.1961%`
      // op zeven rollen. Dat is kwantisatie, geen drift — een échte kleurwijziging verschuift
      // de tint met tientallen graden en komt hier ruim doorheen.
      // rgba() aan beide kanten: numeriek vergelijken op de vier kanalen. Alleen HSL
      // parsen zou hier op het formaat omvallen in plaats van op de kleur.
      const rgbaVan = t => (String(t).match(/^rgba?\(([^)]+)\)$/) || [])[1]?.split(',').map(x => parseFloat(x));
      const ra = rgbaVan(waarde), rb = rgbaVan(bron);
      if (ra || rb) {
        if (!ra || !rb || ra.length !== rb.length || ra.some((v, i) => Math.abs(v - rb[i]) > 0.01))
          waardeFout.push(`${naam} (${mode}): Figma ${waarde} tegen theme.css ${bron}`);
        continue;
      }
      const ontleed = t => String(t).trim().split(/\s+/).map(x => parseFloat(x));
      const [h1, s1, l1] = ontleed(waarde), [h2, s2, l2] = ontleed(bron);
      const hoekAf = Math.min(Math.abs(h1 - h2), 360 - Math.abs(h1 - h2));
      if ([h1, s1, l1, h2, s2, l2].some(Number.isNaN)) {
        if (String(bron).replace(/\s+/g, ' ') !== String(waarde).replace(/\s+/g, ' '))
          waardeFout.push(`${naam} (${mode}): Figma ${waarde} tegen theme.css ${bron} (niet-numeriek)`);
      } else if (hoekAf > TOL_HOEK || Math.abs(s1 - s2) > TOL_PCT || Math.abs(l1 - l2) > TOL_PCT) {
        waardeFout.push(`${naam} (${mode}): Figma ${waarde} tegen theme.css ${bron}`);
      }
    }
  }
  if (waardeFout.length) for (const f of waardeFout.slice(0, 12)) fail('themawaarde', f);
  else ok('themawaarde', `${Object.keys(themaWaarden).length} rollen × 2 modes gelijk aan theme.css (tolerantie ${TOL_HOEK}° / ${TOL_PCT}pp)`);
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

// ---- 6. De Figma-keten: slots, binding, laagnamen ----
//
// Drie assen over de artefacten van scripts/figma/ (gecommit, dus leesbaar in CI zonder browser
// of Figma). Ze gelden voor de componenten die de keten bouwt — de handgebouwde LEGACY-set heeft
// geen bouwspec.
const ketenComponenten = codeComponents.filter(c => !LEGACY.includes(c));
const bronVan = comp => readdirSync(componentsDir).find(f => !f.includes('.stories.')
  && [`${comp.toLowerCase()}.tsx`, `${comp.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}.tsx`].includes(f.toLowerCase()));

// [slots] — de walker vindt een component aan zijn primaire `data-slot`. Ontbreekt die in de bron,
// dan meet `figma:spec` niets en weigert hij te schrijven; hier wordt het rood vóór iemand bouwt.
// En géén `dark:` in een component: de keten meet alleen light en bindt aan mode-variabelen, dus een
// dark-specifieke klasse zou in Figma stil wegvallen.
{
  let slotsOk = 0;
  for (const comp of ketenComponenten) {
    const bron = bronVan(comp);
    const slot = primairVan(comp).slot;
    if (!bron) { fail('slots', `${comp}: geen bronbestand`); continue; }
    if (!readFileSync(join(componentsDir, bron), 'utf8').includes(`data-slot="${slot}"`)) fail('slots', `${bron}: mist data-slot="${slot}" — de walker vindt ${comp} niet`);
    else slotsOk++;
  }
  const metDark = readdirSync(componentsDir).filter(f => f.endsWith('.tsx') && !f.includes('.stories.')
    && /(^|[\s'"`])dark:/.test(readFileSync(join(componentsDir, f), 'utf8')));
  if (metDark.length) fail('slots', `dark:-klasse in ${metDark.join(', ')} — de keten meet light en bindt aan modes; een dark-klasse valt in Figma weg`);
  if (slotsOk === ketenComponenten.length && !metDark.length) ok('slots', `${slotsOk} keten-componenten dragen hun primaire data-slot; 0 dark:-klassen`);
}

// [binding] — de waarden die de render gebruikt en waarvoor geen variabele of text style bestaat.
// Tweezijdig, zoals BEKENDE_GATEN: een nieuw gat is rood, en een gat dat verdwenen is óók — anders
// dekt de lijst na verloop van tijd af wat de as moet vangen.
const BEKENDE_ONGEBONDEN = {
  'opacity = 0.5': 'disabled:opacity-50 — Tailwinds opacity-schaal heeft geen token (Switch, disabled)',
  'opacity = 0.7': 'opacity-70 op de sluitknop van Dialog — idem',
  'text style = 18px/18 600 — regelhoogte 18 ≠ token 28, tracking -0.45px ≠ 0px':
    'DialogTitle draagt leading-none tracking-tight; geen text style past op de tokenschaal, dus rauw in Figma',
};
{
  const pad = join(root, 'figma/ongebonden.json');
  if (!existsSync(pad)) fail('binding', 'figma/ongebonden.json ontbreekt — draai `pnpm --filter @umanex/ui figma:spec`');
  else {
    const o = JSON.parse(readFileSync(pad, 'utf8'));
    const nieuw = o.uniek.filter(u => !BEKENDE_ONGEBONDEN[u]);
    const weg = Object.keys(BEKENDE_ONGEBONDEN).filter(u => !o.uniek.includes(u));
    if (nieuw.length) fail('binding', `nieuwe ongebonden waarde(n): ${nieuw.join(' | ')}`);
    if (weg.length) fail('binding', `bekend gat niet meer gemeten — haal uit BEKENDE_ONGEBONDEN: ${weg.join(' | ')}`);
    if (!nieuw.length && !weg.length) ok('binding', `${o.uniek.length} bekende ongebonden waarden over ${o.aantalVoorkomens} voorkomens, geen nieuwe`);
  }
}

// [laagnaam] — elke laagnaam komt uit de code (data-slot, icon, label), geen tag-gok, geen cijfer,
// geen tekstinhoud. En de positieve controle: elk keten-component staat in de gecommitte spec,
// anders zijn de nullen hierboven een uitspraak over een lege meting.
{
  const lpad = join(root, 'figma/laagnamen.json'), spad = join(root, 'figma/build-spec.min.json');
  if (!existsSync(lpad) || !existsSync(spad)) fail('laagnaam', 'figma/laagnamen.json of build-spec.min.json ontbreekt — draai figma:spec');
  else {
    const l = JSON.parse(readFileSync(lpad, 'utf8'));
    const spec = JSON.parse(readFileSync(spad, 'utf8'));
    const nietGemeten = ketenComponenten.filter(c => !spec.componenten?.[c]);
    if (nietGemeten.length) fail('laagnaam', `niet in build-spec.min.json: ${nietGemeten.join(', ')} — de spec is ouder dan de stories`);
    if (!l.nodes) fail('laagnaam', 'nul nodes in laagnamen.json — meting ongeldig');
    if (l.perBron?.heuristiek) fail('laagnaam', `${l.perBron.heuristiek} laagnaam(en) geraden uit de tag: ${(l.heuristiek ?? []).slice(0, 3).join(', ')} — geef het element een data-slot`);
    if (l.indexNamen || l.copyNamen) fail('laagnaam', `${l.indexNamen} cijfernamen, ${l.copyNamen} namen naar tekstinhoud`);
    if (!nietGemeten.length && l.nodes && !l.perBron?.heuristiek && !l.indexNamen && !l.copyNamen)
      ok('laagnaam', `${l.nodes} laagnamen over ${ketenComponenten.length} keten-componenten, allemaal uit de code`);
  }
}

// ---- Rapport ----
console.log('figma-sync-check — packages/ui ↔ Figma "%s" (%s)\n', manifest.fileName, manifest.fileKey);
for (const c of checks) console.log('  ok   ' + c);
for (const u of uitgesloten) console.log('  --   [uitgesloten] ' + u);
for (const [k, v] of Object.entries(FIGMA_ONLY)) console.log('  --   [figma-only]  ' + k + ' — ' + v);
for (const o of overgeslagen) console.log('  ~~   ' + o);
if (fails.length) {
  console.log('');
  for (const f of fails) console.log('  FAIL ' + f);
  console.log(`\n${fails.length} verschil(len). Code en Figma staan niet in sync.`);
  console.log('Fix de code, of werk Figma bij en ververs figma/manifest.json (zie packages/ui/CLAUDE.md → Verify-pad).');
  process.exit(1);
}
console.log(`\n${checks.length} checks groen — structuur, namen, schaal, typografie-herkomst en 86 themawaarden.`);
console.log('Niet gemeten: maten per node, kleur per node, auto-layout, schaduw, icoonvorm,');
console.log('hover/focus, en elke Figma-wijziging sinds ' + (manifest.gegenereerd ?? 'de laatste ververs') + '.');
if (overgeslagen.length) console.log(`${overgeslagen.length} as(sen) overgeslagen — zie de ~~-regels hierboven.`);
