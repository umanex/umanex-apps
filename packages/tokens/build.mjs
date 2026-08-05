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
//   al de rest                     -> primitives (resolve-only, geen output)
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

// De primitives krijgen GEEN eigen CSS-output meer. Ze bestonden als
// --umanexNeutral500 en zo verder in een variables.css die elke app importeerde,
// en dat was precies de ontsnappingsroute: app-code kon een primitive rechtstreeks
// aanspreken en zo de mode-aware rollaag overslaan (158 keer in cashflow).
//
// Primitives zijn nu resolve-only: ze bestaan om door de rollaag gealiast te
// worden en verlaten het pakket niet. Je kunt niet consumeren wat er niet is.

// --- Één pass per mode -> de rollaag ----------------------------------------
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
  const kinds = new Map();
  for (const set of emitSetsFor(mode)) {
    for (const name of leafPaths(set.tokens)) {
      const key = name.replace(/\./g, '-');
      const token = byName.get(key);
      if (!token) throw new Error(`[tokens] rol "${key}" uit set ${set.name} niet gevonden na resolve`);
      const { value, kind } = formatValue(token);
      lines.push(`    --${key}: ${value};`);
      kinds.set(key, kind);
    }
  }
  return { lines, kinds };
}

// De soort bepaalt hoe de Tailwind-preset de variabele moet uitpakken:
//   hsl    -> hsl(var(--x))  (en dus werkende /alpha-modifiers)
//   raw    -> var(--x)       (alpha-kleur; een triplet kan hier per definitie niet)
//   scalar -> var(--x)       (geen kleur; radius en later spacing/type)
function formatValue({ value, type }) {
  const v = String(value);
  if (type === 'color') {
    // Alleen een 6-cijferige hex kan een HSL-triplet worden. Alpha-kleuren gaan
    // rauw naar buiten; hexToHslTriplet zou erop gooien.
    return HEX6.test(v)
      ? { value: hexToHslTriplet(v), kind: 'hsl' }
      : { value: v, kind: 'raw' };
  }
  if (type === 'borderRadius' && !v.includes('rem')) {
    return { value: `${parseFloat(v) / 16}rem`, kind: 'scalar' };
  }
  return { value: v, kind: 'scalar' };
}

// De rollaag gaat NIET in `@layer base`. Twee redenen:
//
// 1. theme.css wordt los geïmporteerd, en Next draait de PostCSS-keten op elk
//    global CSS-bestand apart. Een bestand met `@layer base` maar zonder
//    `@tailwind base` faalt hard: "`@layer base` is used but no matching
//    `@tailwind base` directive is present". Dat ontsnapte alleen zolang het blok
//    ín packages/ui/globals.css geïnjecteerd werd.
// 2. Ongelaagd wint van gelaagd. Een app die één rol wil overschrijven kan dat met
//    een gewone :root-regel ná de import, zonder specificiteitstrucs.
const blocks = [];
const roleKinds = new Map(); // rolnaam -> 'hsl' | 'raw' | 'scalar'
for (const mode of MODES) {
  const { lines, kinds } = await resolveMode(mode);
  for (const [name, kind] of kinds) roleKinds.set(name, kind);
  blocks.push(`${MODE_SELECTOR[mode]} {`, ...lines.map((l) => l.replace(/^ {2}/, '')), '}');
  if (mode !== MODES[MODES.length - 1]) blocks.push('');
}
const header = [
  '/**',
  ' * Do not edit directly, this file was auto-generated by packages/tokens/build.mjs.',
  ' * Bron: packages/tokens/tokens.json (Theme/* sets, één blok per mode).',
  ' */',
  '',
];
await writeFile(R('build/theme.css'), [...header, ...blocks, ''].join('\n'));

// De rolnamen als data, zodat packages/config/tailwind/preset.ts de kleur-map
// genereert in plaats van hem te herhalen. Daarmee is de utility-set per definitie
// gelijk aan de tokenset: een rol toevoegen in Tokens Studio levert de utility op,
// en een rol die niet bestaat heeft er geen.
const asList = (kind) =>
  [...roleKinds].filter(([, k]) => k === kind).map(([n]) => n);
await writeFile(
  R('build/roles.mjs'),
  [
    '/**',
    ' * Do not edit directly, this file was auto-generated by packages/tokens/build.mjs.',
    ' * Bron: packages/tokens/tokens.json (Theme/* en Semantic/* sets).',
    ' *',
    ' * hslRoles    -> hsl(var(--x)); kleuren als HSL-triplet, dus /alpha werkt',
    ' * rawRoles    -> var(--x); kleuren met alpha, die geen triplet kunnen zijn',
    ' * scalarRoles -> var(--x); niet-kleuren (radius, later spacing en type)',
    ' */',
    '',
    ...['hsl', 'raw', 'scalar'].map(
      (kind) => `export const ${kind}Roles = ${JSON.stringify(asList(kind), null, 2)};\n`
    ),
  ].join('\n')
);

// --- Typografie -> build/typography.mjs -------------------------------------
// Levering gebeurt als JS, niet als CSS-variabelen: Tailwind heeft de schaal op
// configuratieniveau nodig om er utilities van te maken. Als custom properties
// zouden ze alleen bruikbaar zijn via arbitrary values — precies wat we uitroeien.
{
  const type = tokenSets['Typography/Scale']?.font;
  if (!type) throw new Error('[tokens] set "Typography/Scale" mist de font-groep');

  const val = (node) => String(node.$value ?? node.value);
  const map = (group, fn = val) =>
    Object.fromEntries(Object.entries(group ?? {}).map(([k, v]) => [k, fn(v)]));

  // Tailwind v3-defaults voor de gedeelde stappen. De ramp in Tokens Studio mag
  // eigen stappen toevoegen (2xs, dense), maar een gedeelde stap veranderen zou
  // stil elke bestaande text-sm / text-xs verschuiven — 135 respectievelijk 57
  // call-sites die niemand in de diff ziet. Vandaar deze guard.
  const TAILWIND_V3 = {
    xs: ['0.75rem', '1rem'], sm: ['0.875rem', '1.25rem'], base: ['1rem', '1.5rem'],
    lg: ['1.125rem', '1.75rem'], xl: ['1.25rem', '1.75rem'], '2xl': ['1.5rem', '2rem'],
    '3xl': ['1.875rem', '2.25rem'], '4xl': ['2.25rem', '2.5rem'],
    '5xl': ['3rem', '1'], '6xl': ['3.75rem', '1'],
  };
  for (const [key, [size, leading]] of Object.entries(TAILWIND_V3)) {
    const s = type.size?.[key] && val(type.size[key]);
    const l = type.leading?.[key] && val(type.leading[key]);
    if (s !== undefined && s !== size) {
      throw new Error(`[tokens] font.size.${key} is ${s}, Tailwind-default is ${size} — een gedeelde stap wijzigen verschuift bestaande text-${key} call-sites. Voeg een eigen stap toe i.p.v. deze te veranderen.`);
    }
    if (l !== undefined && l !== leading) {
      throw new Error(`[tokens] font.leading.${key} is ${l}, Tailwind-default is ${leading}`);
    }
  }

  // TUPLES, geen kale strings. Tailwinds eigen fontSize-schaal draagt per stap een
  // line-height; een override met alleen de size gooit die weg en laat elke
  // text-sm zonder leading achter.
  const fontSize = Object.fromEntries(
    Object.entries(type.size ?? {}).map(([k, v]) => {
      const leading = type.leading?.[k];
      if (!leading) throw new Error(`[tokens] font.size.${k} heeft geen font.leading.${k}`);
      return [k, [val(v), { lineHeight: val(leading) }]];
    })
  );

  await writeFile(
    R('build/typography.mjs'),
    [
      '/**',
      ' * Do not edit directly, this file was auto-generated by packages/tokens/build.mjs.',
      ' * Bron: packages/tokens/tokens.json (set Typography/Scale).',
      ' *',
      ' * fontSize bevat TUPLES [size, { lineHeight }] — Tailwinds schaal draagt per',
      ' * stap een line-height, en een override met kale strings gooit die weg.',
      ' */',
      '',
      `export const fontFamily = ${JSON.stringify(map(type.family), null, 2)};\n`,
      `export const fontSize = ${JSON.stringify(fontSize, null, 2)};\n`,
      `export const fontWeight = ${JSON.stringify(map(type.weight), null, 2)};\n`,
      `export const letterSpacing = ${JSON.stringify(map(type.tracking), null, 2)};\n`,
    ].join('\n')
  );

  // Types meegenereren. Zonder deze declaratie leidt TypeScript uit de .mjs een
  // (string | {lineHeight})[] af waar Tailwind een tuple van exact twee elementen
  // wil, en heeft elke consument een cast nodig — een cast die de vorm niet
  // controleert maar alleen de klacht wegdrukt.
  await writeFile(
    R('build/typography.d.ts'),
    [
      '/** Do not edit directly, generated by packages/tokens/build.mjs. */',
      'export declare const fontFamily: Record<string, string>;',
      'export declare const fontSize: Record<string, [string, { lineHeight: string }]>;',
      'export declare const fontWeight: Record<string, string>;',
      'export declare const letterSpacing: Record<string, string>;',
      '',
    ].join('\n')
  );
}

// Idem voor de rollen, zodat de preset ze zonder cast kan consumeren.
await writeFile(
  R('build/roles.d.ts'),
  [
    '/** Do not edit directly, generated by packages/tokens/build.mjs. */',
    'export declare const hslRoles: string[];',
    'export declare const rawRoles: string[];',
    'export declare const scalarRoles: string[];',
    '',
  ].join('\n')
);

console.log('\n✓ @umanex/tokens build complete → theme.css + roles.mjs + typography.mjs');
