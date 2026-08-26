/**
 * Leidt uit de broncode van een component af welke tokens hij raakt.
 *
 * Geen handgeschreven lijst per component — die drijft weg zodra iemand een
 * className wijzigt. Dit leest de class-strings zoals ze in het bestand staan,
 * haalt de variant-prefixen weg (hover:, data-[state=checked]:, [&_svg]:) en
 * herkent de utility als rol-, radius- of typografie-token. Een utility die geen
 * token is (flex, h-10, rounded-full) valt er stil uit: die is hier geen onderwerp.
 */
import { colorRoleByName, typeScale, weights, trackings, families, type ColorRole } from './tokenCatalog';

export type TokenUse = {
  kind: 'color' | 'radius' | 'typography';
  /** Tokens Studio-pad (primary, radius, font.size.sm). */
  token: string;
  /** De utilities zoals ze in de bron staan, variant-prefix inbegrepen. */
  utilities: string[];
  role?: ColorRole;
  /** Voor radius en typografie: de waarde die de utility oplevert. */
  value?: string;
};

// Volgorde telt: ring-offset vóór ring, anders eet `ring-` de offset op.
const COLOR_PREFIXES = [
  'bg', 'text', 'border', 'ring-offset', 'ring', 'fill', 'stroke', 'from', 'via', 'to',
  'divide', 'outline', 'placeholder', 'caret', 'accent', 'decoration', 'shadow',
];

const RADIUS = /^rounded(?:-[trblse]{1,2})?-(sm|md|lg)$/;
const RADIUS_VALUE: Record<string, string> = {
  lg: 'var(--radius)',
  md: 'calc(var(--radius) - 2px)',
  sm: 'calc(var(--radius) - 4px)',
};

/** Knip de variant-prefixen weg: de laatste `:` buiten vierkante haken scheidt ze van de utility. */
export function stripVariants(cls: string): string {
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < cls.length; i++) {
    const ch = cls[i];
    if (ch === '[') depth++;
    else if (ch === ']') depth--;
    else if (ch === ':' && depth === 0) cut = i;
  }
  return cut === -1 ? cls : cls.slice(cut + 1);
}

/** Alle string-literals uit een bronbestand, gesplitst op whitespace. */
function classesIn(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const literal = m[2];
    if (literal) out.push(...literal.split(/\s+/).filter(Boolean));
  }
  return out;
}

function classify(utility: string): Omit<TokenUse, 'utilities'> | null {
  const radius = utility.match(RADIUS);
  if (radius?.[1]) return { kind: 'radius', token: 'radius', value: RADIUS_VALUE[radius[1]] };

  const size = utility.match(/^text-(.+)$/)?.[1];
  const step = size ? typeScale.find((s) => s.key === size) : undefined;
  if (step) return { kind: 'typography', token: step.path, value: `${step.size} / ${step.lineHeight}` };

  const font = utility.match(/^font-(.+)$/)?.[1];
  const family = font ? families.find((f) => f.key === font) : undefined;
  if (family) return { kind: 'typography', token: family.path, value: family.value };
  const weight = font ? weights.find((w) => w.key === font) : undefined;
  if (weight) return { kind: 'typography', token: weight.path, value: weight.value };

  const track = utility.match(/^tracking-(.+)$/)?.[1];
  const tracking = track ? trackings.find((t) => t.key === track) : undefined;
  if (tracking) return { kind: 'typography', token: tracking.path, value: tracking.value };

  for (const prefix of COLOR_PREFIXES) {
    if (!utility.startsWith(`${prefix}-`)) continue;
    const name = utility.slice(prefix.length + 1).replace(/\/\d+$/, '');
    const role = colorRoleByName.get(name);
    if (role) return { kind: 'color', token: role.path, role };
    return null;
  }
  return null;
}

export function tokensFromSource(source: string): TokenUse[] {
  const byToken = new Map<string, TokenUse>();
  for (const cls of classesIn(source)) {
    const hit = classify(stripVariants(cls));
    if (!hit) continue;
    const existing = byToken.get(hit.token);
    if (existing) {
      if (!existing.utilities.includes(cls)) existing.utilities.push(cls);
    } else {
      byToken.set(hit.token, { ...hit, utilities: [cls] });
    }
  }
  const order = { color: 0, radius: 1, typography: 2 };
  return [...byToken.values()].sort((a, b) => order[a.kind] - order[b.kind]);
}
