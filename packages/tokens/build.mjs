import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hexToHslTriplet } from './lib/hslTriplet.mjs';

// Alle paden absoluut t.o.v. dit bestand — de build hing op process.cwd() en brak
// zodra hij vanaf de repo-root draaide (turbo doet dat niet, een handmatige
// `node packages/tokens/build.mjs` wel).
const HERE = dirname(fileURLToPath(import.meta.url));
const R = (...p) => join(HERE, ...p);

register(StyleDictionary, { excludeParentKeys: true });

// ---------------------------------------------------------------------------
// Set-conventie
//
// De mode komt uit de SET-NAAM, niet uit het token-pad. Dat is de kern van deze
// opzet. Voorheen waren light/dark groepen bínnen één set, en haakten drie plekken
// in de build op `token.path[0] === 'light' | 'dark' | 'radius'` — magic strings die
// stil kapotgaan zodra iemand een semantische groep 'light' noemt. Bovendien maakte
// het Figma variable modes onmogelijk: light/dark als padsegment levert 64 losse
// variabelen op in plaats van 32 met twee mode-waarden.
//
//   Theme/light, Theme/dark        -> rollaag, per mode
//   Theme/base                     -> rollaag, mode-blind (alleen in :root)
//   Semantic/light, Semantic/dark  -> domeinlaag, per mode
//   al de rest                     -> primitives (variables.css)
//
// De build leest $themes NIET voor de mode-keuze. Tokens Studio's multi-theme zit
// achter een betaald plan; door de conventie in de set-naam te leggen werkt deze
// pipeline op elk plan, en blijft de structuur klaar voor Figma-modes.
// ---------------------------------------------------------------------------

const MODES = ['light', 'dark'];
const MODE_SELECTOR = { light: ':root', dark: '.dark' };
const ROLE_GROUPS = ['Theme', 'Semantic'];

function classifySet(name) {
  const [group, leaf] = name.split('/');
  if (!ROLE_GROUPS.includes(group)) return { kind: 'primitive' };
  if (leaf === undefined) return { kind: 'primitive' }; // 'Semantic' zonder mode-suffix
  if (MODES.includes(leaf)) return { kind: 'role', mode: leaf };
  return { kind: 'role', mode: null }; // Theme/base
}

const raw = JSON.parse(await readFile(R('tokens.json'), 'utf-8'));
const { $themes, $metadata, ...tokenSets } = raw;

// Resolutievolgorde komt uit $metadata.tokenSetOrder — dat is wat Tokens Studio als
// canoniek hanteert. De sleutelvolgorde van selectedTokenSets is een toevallige
// JSON-volgorde en wijkt er vandaag van af; bij de eerste override tussen twee sets
// zou dat een stille, niet-reproduceerbare uitkomst geven.
const ORDER = $metadata.tokenSetOrder;
for (const name of Object.keys(tokenSets)) {
  if (!ORDER.includes(name)) {
    throw new Error(`[tokens] set "${name}" ontbreekt in $metadata.tokenSetOrder`);
  }
}
for (const name of ORDER) {
  if (!tokenSets[name]) throw new Error(`[tokens] $metadata.tokenSetOrder noemt onbekende set "${name}"`);
}

const SETS = ORDER.map((name) => ({ name, ...classifySet(name), tokens: tokenSets[name] }));
const primitiveSets = SETS.filter((s) => s.kind === 'primitive');
// Sets die geresolved moeten worden voor deze mode: de mode-eigen sets plus de
// mode-blinde. Los van de vraag of ze ook geëmit worden.
const roleSetsFor = (mode) =>
  [...SETS.filter((s) => s.kind === 'role' && s.mode === mode),
   ...SETS.filter((s) => s.kind === 'role' && s.mode === null)];

// Wat er daadwerkelijk in het mode-blok terechtkomt. Een mode-blinde set (Theme/base
// met --radius) hoort ALLEEN in :root: hij per mode herhalen zet dezelfde waarde
// nog eens in .dark, wat suggereert dat hij per mode kan verschillen. Mode-set
// eerst, mode-blinde daarna — zo staat --radius achteraan in :root.
const emitSetsFor = (mode) =>
  [...SETS.filter((s) => s.kind === 'role' && s.mode === mode),
   ...(mode === MODES[0] ? SETS.filter((s) => s.kind === 'role' && s.mode === null) : [])];

// --- Guard: mode-symmetrie --------------------------------------------------
// Een vergeten dark-tegenhanger is anders een bug die je pas ziet als je de toggle
// omzet. Dit is precies de faalklasse die we uitroeien, dus hij faalt hard.
function leafPaths(node, prefix = []) {
  const out = [];
  for (const [k, v] of Object.entries(node)) {
    if (isLeaf(v)) out.push([...prefix, k].join('.'));
    else if (v && typeof v === 'object') out.push(...leafPaths(v, [...prefix, k]));
  }
  return out;
}
for (const group of ROLE_GROUPS) {
  const light = tokenSets[`${group}/light`];
  const dark = tokenSets[`${group}/dark`];
  if (!light || !dark) continue;
  const kl = leafPaths(light).sort();
  const kd = leafPaths(dark).sort();
  if (kl.join() !== kd.join()) {
    const diff = [
      ...kl.filter((k) => !kd.includes(k)).map((k) => `alleen in light: ${k}`),
      ...kd.filter((k) => !kl.includes(k)).map((k) => `alleen in dark: ${k}`),
    ];
    throw new Error(`[tokens] ${group}/light en ${group}/dark zijn niet symmetrisch:\n  ${diff.join('\n  ')}`);
  }
}

// DTCG-leaves dragen $value, niet value. De oude guard testte op `'value' in value`
// en was daardoor bij elk DTCG-token false: elke leaf werd als GROEP behandeld en
// veld-per-veld gemerged in plaats van vervangen. Onschadelijk zolang geen twee sets
// dezelfde key dragen, fataal bij de eerste override — en met Theme/light naast
// Theme/dark is die situatie er nu.
function isLeaf(v) {
  return v && typeof v === 'object' && ('$value' in v || 'value' in v);
}

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !isLeaf(value)) {
      target[key] = target[key] || {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

function mergeSets(sets) {
  const merged = {};
  for (const set of sets) deepMerge(merged, set.tokens);
  return merged;
}

if (!existsSync(R('build'))) await mkdir(R('build'), { recursive: true });

// --- Pass 1: primitives -> variables.css ------------------------------------
// Ongewijzigd gedrag: de primitives (en voorlopig de mode-blinde Semantic-set)
// gaan met het umanex-prefix naar variables.css.
const ALLOWED_TYPES = ['color', 'spacing', 'borderRadius', 'fontFamilies', 'fontSizes', 'lineHeights', 'fontWeights'];

await writeFile(R('build/_merged.json'), JSON.stringify(mergeSets(primitiveSets), null, 2));

const sdPrimitives = new StyleDictionary({
  source: [R('build/_merged.json')],
  // GEEN errors.brokenReferences-override: die degradeerde een onopgeloste alias tot
  // een logregel, waarna de build met exit 0 kapotte CSS opleverde en de auto-commit
  // in tokens-sync.yml hem naar main publiceerde. SD v4 gooit standaard — terecht.
  log: { verbosity: 'default' },
  platforms: {
    css: {
      transformGroup: 'tokens-studio',
      prefix: 'umanex',
      buildPath: R('build') + '/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
        filter: (token) => ALLOWED_TYPES.includes(token.$type ?? token.type),
        options: { selector: ':root', outputReferences: false },
      }],
    },
  },
});
await sdPrimitives.buildAllPlatforms();

// --- Pass 2..n: één pass per mode -> de rollaag ------------------------------
// Per mode wordt alles geresolved (primitives als bron), maar alleen de rol-sets
// worden geëmit. Zo blijven de primitives buiten de rollaag zonder padfilter.
const HEX6 = /^#[0-9a-fA-F]{6}$/;

async function resolveMode(mode) {
  const sets = [...primitiveSets, ...roleSetsFor(mode)];
  const file = R(`build/_merged.${mode}.json`);
  await writeFile(file, JSON.stringify(mergeSets(sets), null, 2));

  const sd = new StyleDictionary({
    source: [file],
    log: { verbosity: 'silent' },
    platforms: { resolve: { transformGroup: 'tokens-studio' } },
  });
  const dict = await sd.getPlatformTokens('resolve');

  // Naam = het VOLLEDIGE pad, nooit path.at(-1). Dat laatste liet een groep als
  // `sidebar/border` — de natuurlijke notatie in de plugin — stil `--border`
  // produceren en de echte --border overschrijven.
  const byName = new Map();
  for (const t of dict.allTokens) {
    byName.set(t.path.join('-'), { value: t.$value ?? t.value, type: t.$type ?? t.type, path: t.path });
  }

  // Emit-volgorde volgt de JSON-volgorde van de rol-sets, niet de traversal van
  // Style Dictionary — deterministisch en leesbaar gegroepeerd per concern.
  const lines = [];
  for (const set of emitSetsFor(mode)) {
    for (const name of leafPaths(set.tokens)) {
      const key = name.replace(/\./g, '-');
      const token = byName.get(key);
      if (!token) throw new Error(`[tokens] rol "${key}" uit set ${set.name} niet gevonden na resolve`);
      lines.push(`    --${key}: ${formatValue(token)};`);
    }
  }
  return lines;
}

function formatValue({ value, type }) {
  const v = String(value);
  if (type === 'color') {
    // Alleen een 6-cijferige hex kan een HSL-triplet worden. Alpha-kleuren gaan
    // rauw naar buiten; hexToHslTriplet zou erop gooien.
    return HEX6.test(v) ? hexToHslTriplet(v) : v;
  }
  if (type === 'borderRadius' && !v.includes('rem')) return `${parseFloat(v) / 16}rem`;
  return v;
}

const blocks = [];
for (const mode of MODES) {
  const lines = await resolveMode(mode);
  blocks.push(`  ${MODE_SELECTOR[mode]} {`, ...lines, '  }');
  if (mode !== MODES[MODES.length - 1]) blocks.push('');
}
await writeFile(R('build/shadcn.css'), ['@layer base {', ...blocks, '}', ''].join('\n'));

console.log('\n✓ @umanex/tokens build complete → build/variables.css + build/shadcn.css');

// Inject the generated shadcn block into the consumed @umanex/ui globals.css, between
// markers. The hand-written @tailwind directives and the @layer base body (border-border
// / body) live outside the markers and are preserved.
const shadcnBlock = (await readFile(R('build/shadcn.css'), 'utf-8')).trimEnd();
const globalsPath = R('../ui/globals.css');
const globalsSrc = await readFile(globalsPath, 'utf-8');
const markerRe = /\/\* @umanex\/tokens:start[\s\S]*?@umanex\/tokens:end \*\//;
if (!markerRe.test(globalsSrc)) {
  throw new Error('packages/ui/globals.css: @umanex/tokens:start / :end markers not found');
}
const startLine = '/* @umanex/tokens:start — generated by packages/tokens/build.mjs, do not edit by hand */';
const endLine = '/* @umanex/tokens:end */';
const updated = globalsSrc.replace(markerRe, `${startLine}\n${shadcnBlock}\n${endLine}`);
if (updated !== globalsSrc) {
  await writeFile(globalsPath, updated);
  console.log('✓ synced shadcn vars into packages/ui/globals.css');
} else {
  console.log('✓ packages/ui/globals.css already up to date');
}
