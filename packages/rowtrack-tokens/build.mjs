import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hexToHslTriplet } from './lib/hslTriplet.mjs';

// Alle paden absoluut t.o.v. dit bestand, om dezelfde reden als in
// packages/tokens/build.mjs: op process.cwd() breekt een handmatige run vanaf de
// repo-root, terwijl turbo hem wél vanuit de package-map start.
const HERE = dirname(fileURLToPath(import.meta.url));
const R = (...p) => join(HERE, ...p);

// De bron is de tokenset van de RN-app. Die blijft daar staan omdat hij het
// Tokens Studio sync-target is; deze package leest hem alleen en levert de
// web-helft. De RN-helft blijft apps/rowtrack/style-dictionary.config.mjs.
const SOURCE = R('../../apps/rowtrack/tokens/tokens.json');

register(StyleDictionary, { excludeParentKeys: true });

// ---------------------------------------------------------------------------
// Set-conventie
//
// RowTrack's tokenset is dark-only en heeft geen mode-assen — anders dan
// packages/tokens, waar de mode uit de set-naam komt. Er is dus één blok, :root,
// met color-scheme: dark. Een light-variant bestaat niet in de bron en wordt hier
// niet verzonnen.
//
//   Theme      -> rollaag, de enige set met CSS-output
//   Core       -> ruwe ramps; resolve-only
//   Component  -> RN-componenttokens; niet van toepassing op web
//
// Elke andere set gooit. Zonder die lijst valt een nieuwe set stil in de
// resolve-only-bak en verdwijnt hij zonder foutmelding uit de output.
// ---------------------------------------------------------------------------

const ROLE_SET = 'Theme';
const RESOLVE_ONLY = {
  Core: 'ruwe ramps (neutral/red/gold/alpha, spacing, type-primitieven) — resolve-only',
  Component: 'RN-componenttokens (button, kpiTile, tabBar, …) — geen web-equivalent',
};

function classifySet(name) {
  if (name === ROLE_SET) return 'role';
  if (name in RESOLVE_ONLY) return 'resolve-only';
  throw new Error(
    `[rowtrack-tokens] onbekende set "${name}" — ik weet niet hoe die geleverd moet worden.\n` +
    `  Kies in packages/rowtrack-tokens/build.mjs:\n` +
    `    - wordt het een rollaag met CSS-output? Dan hoort hij bij ROLE_SET (nu: "${ROLE_SET}").\n` +
    `    - of bestaat hij alleen om gealiast te worden? Zet "${name}" in RESOLVE_ONLY met de reden.`
  );
}

const raw = JSON.parse(await readFile(SOURCE, 'utf-8'));
const { $themes, $metadata, ...tokenSets } = raw;

// Resolutievolgorde uit $metadata.tokenSetOrder, net als in packages/tokens: de
// sleutelvolgorde van het JSON-object is toevallig en zou bij de eerste override
// tussen twee sets een stille, niet-reproduceerbare uitkomst geven.
//
// Let op: apps/rowtrack/tokens/$metadata.json is een LOSSTAAND, verouderd bestand
// dat een andere volgorde claimt (["primitives","semantic"] — sets die niet
// bestaan). Dat bestand wordt hier bewust niet gelezen; de canonieke $metadata zit
// ín tokens.json, precies zoals de RN-generator hem ook leest.
const ORDER = $metadata?.tokenSetOrder;
if (!Array.isArray(ORDER)) {
  throw new Error(`[rowtrack-tokens] ${SOURCE} mist $metadata.tokenSetOrder`);
}
for (const name of Object.keys(tokenSets)) {
  if (!ORDER.includes(name)) throw new Error(`[rowtrack-tokens] set "${name}" ontbreekt in $metadata.tokenSetOrder`);
}
for (const name of ORDER) {
  if (!tokenSets[name]) throw new Error(`[rowtrack-tokens] $metadata.tokenSetOrder noemt onbekende set "${name}"`);
}

const SETS = ORDER.map((name) => ({ name, kind: classifySet(name), tokens: tokenSets[name] }));
if (!SETS.some((s) => s.kind === 'role')) {
  throw new Error(`[rowtrack-tokens] geen enkele set is de rollaag — verwacht "${ROLE_SET}"`);
}

// DTCG-leaves dragen $value. De `value`-fallback staat er voor een bron die ooit
// in classic format terugkomt; dan is de build kapot, maar zichtbaar kapot.
function isLeaf(v) {
  return v && typeof v === 'object' && ('$value' in v || 'value' in v);
}

function leafPaths(node, prefix = []) {
  const out = [];
  for (const [k, v] of Object.entries(node)) {
    if (isLeaf(v)) out.push([...prefix, k].join('.'));
    else if (v && typeof v === 'object') out.push(...leafPaths(v, [...prefix, k]));
  }
  return out;
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

if (!existsSync(R('build'))) await mkdir(R('build'), { recursive: true });

// Alles resolven (Core levert de waarden waar Theme naar wijst), maar alleen de
// rollaag emitten. Zo verlaten de primitives het pakket niet en kan app-code de
// rollaag niet omzeilen — je kunt niet consumeren wat er niet is.
const merged = {};
for (const set of SETS) deepMerge(merged, set.tokens);
const mergedFile = R('build/_merged.json');
await writeFile(mergedFile, JSON.stringify(merged, null, 2));

const sd = new StyleDictionary({
  source: [mergedFile],
  log: { verbosity: 'silent' },
  platforms: { resolve: { transformGroup: 'tokens-studio' } },
});
const dict = await sd.getPlatformTokens('resolve');

// Naam = het VOLLEDIGE pad, nooit path.at(-1) — anders levert `accent.default`
// en `radius.default` allebei stil `--default` op en overschrijft de één de ander.
const byName = new Map();
for (const t of dict.allTokens) {
  byName.set(t.path.join('.'), { value: t.$value ?? t.value, type: t.$type ?? t.type });
}

// camelCase -> kebab, per padsegment. `size.buttonPrimaryHeight` wordt
// --size-button-primary-height, niet --size-buttonPrimaryHeight: custom properties
// zijn hoofdlettergevoelig en een half-kebab naam is een blijvende leesval.
const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
const cssName = (path) => path.split('.').map(kebab).join('-');

const HEX6 = /^#[0-9a-fA-F]{6}$/;
const NUMERIC = /^-?\d*\.?\d+$/;

const px = (v) => (NUMERIC.test(String(v)) ? `${v}px` : String(v));
const toRem = (v) => `${parseFloat(v) / 16}rem`;

function composeShadow(value) {
  // sd-transforms' `shadow/css/shorthand` levert doorgaans al een string. Blijft
  // het een object, dan stellen we hem hier samen — een object dat via String()
  // in de CSS belandt wordt "[object Object]" en dat is precies het soort stille
  // schade waar tokens-sync.yml elders al op guardt.
  if (typeof value === 'string') return value;
  const list = Array.isArray(value) ? value : [value];
  return list
    .map((s) => [
      s.type === 'innerShadow' ? 'inset' : null,
      px(s.x), px(s.y), px(s.blur), px(s.spread), s.color,
    ].filter(Boolean).join(' '))
    .join(', ');
}

// De soort bepaalt hoe de Tailwind-preset de variabele uitpakt:
//   hsl    -> hsl(var(--x))  (en dus werkende /alpha-modifiers)
//   raw    -> var(--x)       (alpha-kleur; een triplet kan hier per definitie niet)
//   scalar -> var(--x)       (radius, stroke, size)
//   shadow -> var(--x)       (samengestelde box-shadow)
function formatValue(path, { value, type }) {
  switch (type) {
    case 'color': {
      const v = String(value);
      return HEX6.test(v)
        ? { value: hexToHslTriplet(v), kind: 'hsl' }
        : { value: v, kind: 'raw' };
    }
    case 'borderRadius':
      return { value: toRem(value), kind: 'scalar' };
    case 'sizing':
      return { value: toRem(value), kind: 'scalar' };
    case 'borderWidth':
      // Bewust px en geen rem. Een hairline die met de root-fontsize meegroeit is
      // op 200% zoom een 2px-rand — zichtbaar zwaarder dan het ontwerp bedoelt.
      return { value: px(value), kind: 'scalar' };
    case 'boxShadow':
      return { value: composeShadow(value), kind: 'shadow' };
    default:
      throw new Error(
        `[rowtrack-tokens] rol "${path}" heeft $type "${type}" en die kent deze build niet.\n` +
        `  Stil overslaan zou hem uit theme.css laten verdwijnen terwijl hij in Tokens Studio bestaat.\n` +
        `  Voeg een tak toe aan formatValue() in packages/rowtrack-tokens/build.mjs, of — als hij\n` +
        `  bewust niet naar web gaat — zet hem bij SKIPPED_TYPES met de reden.`
      );
  }
}

// `typography` is een composiet van fontFamily/size/lineHeight/letterSpacing en is
// in deze bron MOBIEL geschaald (fontSize 114, 44, 28 …). Die schaal op web
// hergebruiken zou een telefoon-typografie op een 1440px-canvas zetten. De
// web-schaal ontbreekt en wordt hier niet verzonnen — zie TOKENS-TODO.md.
//
// Ze verdwijnen niet stilzwijgend: hun namen worden geëxporteerd als
// pendingWebTypeRoles en de build meldt het aantal.
const SKIPPED_TYPES = {
  typography: 'mobiele typeschaal; web-schaal ontbreekt — zie TOKENS-TODO.md',
};

const roleSet = SETS.find((s) => s.kind === 'role');
const lines = [];
const kinds = new Map();
const pendingWebType = [];

for (const path of leafPaths(roleSet.tokens)) {
  const token = byName.get(path);
  if (!token) throw new Error(`[rowtrack-tokens] rol "${path}" niet gevonden na resolve`);

  if (token.type in SKIPPED_TYPES) {
    pendingWebType.push(path);
    continue;
  }

  const name = cssName(path);
  const { value, kind } = formatValue(path, token);

  if (String(value).includes('{')) {
    throw new Error(
      `[rowtrack-tokens] rol "${path}" bevat een onopgeloste alias: ${value}\n` +
      `  De waarde verwijst naar een token dat niet in Core of Theme staat.`
    );
  }
  if (String(value).includes('[object Object]')) {
    throw new Error(`[rowtrack-tokens] rol "${path}" serialiseerde naar [object Object]`);
  }

  lines.push(`  --${name}: ${value};`);
  kinds.set(name, kind);
}

// Vloer tegen een stil leeggelopen output. tokens-sync.yml hanteert dezelfde
// truc voor packages/tokens: een build die slaagt met nul variabelen is erger dan
// een build die faalt, want de app rendert dan zonder kleur zónder foutmelding.
const FLOOR = 25;
if (lines.length < FLOOR) {
  throw new Error(
    `[rowtrack-tokens] slechts ${lines.length} custom properties gegenereerd (vloer: ${FLOOR}).\n` +
    `  Dat wijst op een leeggelopen of verkeerd geclassificeerde bron, niet op een geslaagde build.`
  );
}

// De rollaag gaat NIET in `@layer base`, om dezelfde twee redenen als in
// packages/tokens: Next draait de PostCSS-keten per global CSS-bestand, en een
// bestand met `@layer base` zonder `@tailwind base` faalt hard; en ongelaagd wint
// van gelaagd, zodat een app één rol met een gewone :root-regel kan overschrijven.
const header = [
  '/**',
  ' * Do not edit directly, this file was auto-generated by packages/rowtrack-tokens/build.mjs.',
  ' * Bron: apps/rowtrack/tokens/tokens.json (set Theme).',
  ' *',
  ' * RowTrack is dark-only: één :root-blok, geen .dark-tegenhanger.',
  ' */',
  '',
];
await writeFile(
  R('build/theme.css'),
  [...header, ':root {', '  color-scheme: dark;', ...lines, '}', ''].join('\n')
);

// De fontfamilies komen uit Core en zijn dus primitives — ze krijgen géén CSS-variabele.
// Ze worden wél als data geleverd, om dezelfde reden als Typography/Scale in
// packages/tokens: Tailwind heeft de familie op CONFIGURATIENIVEAU nodig om er een
// utility van te maken, en next/font zet de @font-face in layout.tsx. Zonder deze
// export zou de familienaam op twee plekken met de hand herhaald worden en stil
// uit elkaar lopen — precies waar de font-token-drift-guard van packages/tokens
// voor bestaat.
const coreFamilies = SETS.find((s) => s.name === 'Core')?.tokens?.fontFamily;
if (!coreFamilies) throw new Error('[rowtrack-tokens] set "Core" mist de fontFamily-groep');
const fontFamily = Object.fromEntries(
  Object.entries(coreFamilies).map(([k, v]) => [k, String(v.$value ?? v.value)])
);

const asList = (kind) => [...kinds].filter(([, k]) => k === kind).map(([n]) => n);
await writeFile(
  R('build/roles.mjs'),
  [
    '/**',
    ' * Do not edit directly, this file was auto-generated by packages/rowtrack-tokens/build.mjs.',
    ' * Bron: apps/rowtrack/tokens/tokens.json (set Theme).',
    ' *',
    ' * hslRoles            -> hsl(var(--x)); kleuren als HSL-triplet, dus /alpha werkt',
    ' * rawRoles            -> var(--x); kleuren met alpha, die geen triplet kunnen zijn',
    ' * scalarRoles         -> var(--x); radius, stroke, size',
    ' * shadowRoles         -> var(--x); samengestelde box-shadow',
    ' * pendingWebTypeRoles -> type.*-rollen zonder web-equivalent (zie TOKENS-TODO.md)',
    ' * fontFamily          -> uit Core; nodig op configuratieniveau, niet als CSS-variabele',
    ' */',
    '',
    ...['hsl', 'raw', 'scalar', 'shadow'].map(
      (kind) => `export const ${kind}Roles = ${JSON.stringify(asList(kind), null, 2)};\n`
    ),
    `export const pendingWebTypeRoles = ${JSON.stringify(pendingWebType, null, 2)};\n`,
    `export const fontFamily = ${JSON.stringify(fontFamily, null, 2)};\n`,
  ].join('\n')
);

await writeFile(
  R('build/roles.d.ts'),
  [
    '/** Do not edit directly, generated by packages/rowtrack-tokens/build.mjs. */',
    'export declare const hslRoles: string[];',
    'export declare const rawRoles: string[];',
    'export declare const scalarRoles: string[];',
    'export declare const shadowRoles: string[];',
    'export declare const pendingWebTypeRoles: string[];',
    'export declare const fontFamily: Record<string, string>;',
    '',
  ].join('\n')
);

console.log(
  `\n✓ @umanex/rowtrack-tokens build complete → theme.css (${lines.length} rollen) + roles.mjs` +
  `\n  ${pendingWebType.length} type.*-rollen overgeslagen (mobiele schaal) — zie TOKENS-TODO.md`
);
