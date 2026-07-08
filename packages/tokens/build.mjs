import StyleDictionary from 'style-dictionary';
import { register } from '@tokens-studio/sd-transforms';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { hexToHslTriplet } from './lib/hslTriplet.mjs';

// Register Tokens Studio transforms
register(StyleDictionary, { excludeParentKeys: true });

// Custom transform: hex -> bare HSL triplet "H S% L%" for the shadcn :root/.dark
// layer. Applied ONLY to the Semantic/shadcn color tokens (path starts light|dark);
// primitives stay hex and the borderRadius `radius` token is left untouched.
// `transitive` so it runs after Tokens Studio aliases resolve to a hex value.
StyleDictionary.registerTransform({
  name: 'color/hslTriplet',
  type: 'value',
  transitive: true,
  filter: (token) => {
    const type = token.$type ?? token.type;
    return type === 'color' && (token.path[0] === 'light' || token.path[0] === 'dark');
  },
  transform: (token) => hexToHslTriplet(token.$value ?? token.value),
});

// Transform group = full Tokens Studio pipeline + our hex->HSL triplet step.
StyleDictionary.registerTransformGroup({
  name: 'shadcn',
  transforms: [...StyleDictionary.hooks.transformGroups['tokens-studio'], 'color/hslTriplet'],
});

// Custom format: write the Semantic/shadcn set as shadcn-v3 :root / .dark blocks.
// Color tokens arrive as bare HSL triplets (via color/hslTriplet); --radius stays a
// rem length and is emitted in :root only (mode-independent, never a triplet).
StyleDictionary.registerFormat({
  name: 'css/shadcn',
  format: ({ dictionary }) => {
    const light = [];
    const dark = [];
    let radius = '0.5rem';
    for (const token of dictionary.allTokens) {
      const group = token.path[0];
      const name = token.path[token.path.length - 1];
      const val = token.$value ?? token.value; // DTCG: de getransformeerde waarde staat op $value, niet op value
      if (group === 'light') light.push([name, val]);
      else if (group === 'dark') dark.push([name, val]);
      else if (group === 'radius' || name === 'radius') {
        const v = String(val);
        radius = v.includes('rem') ? v : `${parseFloat(v) / 16}rem`;
      }
    }
    const block = (pairs) => pairs.map(([k, v]) => `    --${k}: ${v};`).join('\n');
    return [
      '@layer base {',
      '  :root {',
      block(light),
      `    --radius: ${radius};`,
      '  }',
      '',
      '  .dark {',
      block(dark),
      '  }',
      '}',
      '',
    ].join('\n');
  },
});

// Read tokens.json
const raw = JSON.parse(await readFile('./tokens.json', 'utf-8'));
const { $themes, $metadata, ...tokenSets } = raw;

// Find umanex theme
const umanexTheme = $themes.find(t => t.name === 'umanex');
if (!umanexTheme) throw new Error('Theme "umanex" not found in $themes');

// Merge enabled token sets in order
const enabledSets = Object.entries(umanexTheme.selectedTokenSets)
  .filter(([, status]) => status === 'enabled')
  .map(([setName]) => setName);

function deepMerge(target, source) {
  for (const [key, value] of Object.entries(source)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && !('value' in value)) {
      target[key] = target[key] || {};
      deepMerge(target[key], value);
    } else {
      target[key] = value;
    }
  }
}

const mergedTokens = {};
for (const setName of enabledSets) {
  const setTokens = tokenSets[setName];
  if (setTokens) deepMerge(mergedTokens, setTokens);
}

if (!existsSync('./build')) await mkdir('./build', { recursive: true });
await writeFile('./build/_merged.json', JSON.stringify(mergedTokens, null, 2));

const ALLOWED_TYPES = ['color', 'spacing', 'borderRadius', 'fontFamilies', 'fontSizes', 'lineHeights', 'fontWeights'];

// Semantic/shadcn tokens (light/dark color + radius) are emitted by the shadcn
// platform; keep them out of the primitive variables.css / tailwind.js outputs.
const isShadcn = (token) => ['light', 'dark', 'radius'].includes(token.path[0]);

const sd = new StyleDictionary({
  source: ['./build/_merged.json'],
  log: {
    verbosity: 'default',
    errors: { brokenReferences: 'console' },
  },
  platforms: {
    css: {
      transformGroup: 'tokens-studio',
      prefix: 'umanex',
      buildPath: 'build/',
      files: [{
        destination: 'variables.css',
        format: 'css/variables',
        filter: (token) => ALLOWED_TYPES.includes(token.$type ?? token.type) && !isShadcn(token),
        options: {
          selector: ':root',
          outputReferences: false,
        },
      }],
    },
    shadcn: {
      transformGroup: 'shadcn',
      buildPath: 'build/',
      files: [{
        destination: 'shadcn.css',
        format: 'css/shadcn',
        filter: (token) => isShadcn(token),
      }],
    },
  },
});

await sd.buildAllPlatforms();
console.log('\n✓ @umanex/tokens build complete → build/variables.css + build/shadcn.css');

// Inject the generated shadcn block into the consumed @umanex/ui globals.css, between
// markers. The hand-written @tailwind directives and the @layer base body (border-border
// / body) live outside the markers and are preserved.
const shadcnBlock = (await readFile('./build/shadcn.css', 'utf-8')).trimEnd();
const globalsPath = '../ui/globals.css';
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
