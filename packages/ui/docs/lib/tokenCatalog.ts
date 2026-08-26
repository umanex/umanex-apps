/**
 * De token-catalogus voor Storybook: één plek die de gegenereerde build-output
 * (theme.css, roles.mjs, typography.mjs) en de bron (tokens.json) samenlegt.
 *
 * theme.css levert de waarde per mode, tokens.json de referentie naar de primitive
 * ({Primary.700}) en roles.mjs zegt welke rollen er zijn. Niets hier is met de hand
 * overgeschreven: verandert een token, dan verandert de docs-pagina mee.
 */
import themeCss from '@umanex/tokens/theme.css?raw';
import tokens from '@umanex/tokens/tokens.json';
import { hslRoles, rawRoles, scalarRoles } from '@umanex/tokens/roles';
import { fontFamily, fontSize, fontWeight, letterSpacing } from '@umanex/tokens/typography';

export type Mode = 'light' | 'dark';
export const MODES: Mode[] = ['light', 'dark'];

export type ColorRole = {
  /** Rolnaam: CSS-variabele zonder `--`, en de suffix van elke utility (bg-primary). */
  name: string;
  /** Pad in Tokens Studio-notatie binnen de set (finance.positive). */
  path: string;
  /** Rolgroep: Theme (shadcn-rollaag) of Semantic (domeinrollen). */
  group: 'Theme' | 'Semantic';
  /** hsl: triplet, /alpha werkt · raw: kleur met alpha, gaat rauw naar buiten. */
  kind: 'hsl' | 'raw';
  /** Uit theme.css, per mode. */
  value: Record<Mode, string>;
  /** Uit tokens.json, per mode: de referentie naar de primitive. */
  ref: Record<Mode, string>;
};

export type ScalarRole = {
  name: string;
  path: string;
  set: string;
  value: string;
  ref: string;
};

type TokenLeaf = { $value: string; $type: string };
type TokenTree = { [key: string]: TokenTree | TokenLeaf };

const isLeaf = (node: TokenTree | TokenLeaf): node is TokenLeaf => '$value' in node;

function leaves(tree: TokenTree, prefix: string[] = []): Array<[string, TokenLeaf]> {
  const out: Array<[string, TokenLeaf]> = [];
  for (const [key, node] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    const path = [...prefix, key];
    if (isLeaf(node)) out.push([path.join('.'), node]);
    else out.push(...leaves(node, path));
  }
  return out;
}

const sets = tokens as unknown as Record<string, TokenTree>;

function set(name: string): Map<string, TokenLeaf> {
  const tree = sets[name];
  if (!tree) throw new Error(`[tokens] set "${name}" ontbreekt in tokens.json`);
  return new Map(leaves(tree));
}

/** Parse één selector-blok uit theme.css naar { rolnaam: waarde }. */
function parseBlock(css: string, selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const body = css.match(new RegExp(`(?:^|\\n)${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
    if (m[1] !== undefined && m[2] !== undefined) out[m[1]] = m[2].trim();
  }
  return out;
}

const cssByMode: Record<Mode, Record<string, string>> = {
  light: parseBlock(themeCss, ':root'),
  dark: parseBlock(themeCss, '.dark'),
};

// Positieve controle: een lege parse ziet er identiek uit aan "geen rollen".
for (const mode of MODES) {
  if (Object.keys(cssByMode[mode]).length === 0) {
    throw new Error(`[tokens] theme.css: geen ${mode}-blok gevonden — parser of build kapot`);
  }
}

// Rolnaam = pad met punten als streepjes (finance.positive -> finance-negative),
// dezelfde afspraak als packages/tokens/build.mjs.
const roleName = (path: string) => path.replace(/\./g, '-');

const refs: Record<'Theme' | 'Semantic', Record<Mode, Map<string, TokenLeaf>>> = {
  Theme: { light: set('Theme/light'), dark: set('Theme/dark') },
  Semantic: { light: set('Semantic/light'), dark: set('Semantic/dark') },
};

function buildColorRole(name: string, kind: ColorRole['kind']): ColorRole {
  const group = (['Theme', 'Semantic'] as const).find((g) =>
    [...refs[g].light.keys()].some((path) => roleName(path) === name)
  );
  if (!group) throw new Error(`[tokens] rol "${name}" uit roles.mjs staat in geen enkele set van tokens.json`);
  const path = [...refs[group].light.keys()].find((p) => roleName(p) === name) ?? name;

  const value = {} as Record<Mode, string>;
  const ref = {} as Record<Mode, string>;
  for (const mode of MODES) {
    const v = cssByMode[mode][name];
    if (v === undefined) throw new Error(`[tokens] rol "${name}" heeft geen --${name} in het ${mode}-blok van theme.css`);
    value[mode] = v;
    ref[mode] = refs[group][mode].get(path)?.$value ?? '';
  }
  return { name, path, group, kind, value, ref };
}

export const colorRoles: ColorRole[] = [
  ...hslRoles.map((n) => buildColorRole(n, 'hsl')),
  ...rawRoles.map((n) => buildColorRole(n, 'raw')),
];

export const colorRoleByName = new Map(colorRoles.map((r) => [r.name, r]));

/** Rendert een rolwaarde uit theme.css als CSS-kleur. */
export const cssColor = (role: ColorRole, mode: Mode): string =>
  role.kind === 'hsl' ? `hsl(${role.value[mode]})` : role.value[mode];

const base = set('Theme/base');
export const scalars: ScalarRole[] = scalarRoles.map((name) => {
  const value = cssByMode.light[name];
  if (value === undefined) throw new Error(`[tokens] scalar "${name}" ontbreekt in theme.css`);
  return { name, path: name, set: 'Theme/base', value, ref: base.get(name)?.$value ?? '' };
});

/** Typografie: de gegenereerde schaal, met het Tokens Studio-pad per key. */
export type TypeStep = { key: string; path: string; size: string; lineHeight: string };
export const typeScale: TypeStep[] = Object.entries(fontSize).map(([key, [size, { lineHeight }]]) => ({
  key,
  path: `font.size.${key}`,
  size,
  lineHeight,
}));
export const weights = Object.entries(fontWeight).map(([key, value]) => ({ key, path: `font.weight.${key}`, value }));
export const trackings = Object.entries(letterSpacing).map(([key, value]) => ({ key, path: `font.tracking.${key}`, value }));
export const families = Object.entries(fontFamily).map(([key, value]) => ({ key, path: `font.family.${key}`, value }));
