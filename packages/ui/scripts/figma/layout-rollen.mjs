/**
 * Welke layout-rol een klasse noemt, per kant — gedeeld door build-spec (padding, gap) en
 * build-prune (gap uit de marges van `space-x`/`space-y`).
 *
 * De binding volgt de KLASSE, niet de waarde: `p-surface` en `p-6` renderen allebei 24 px, maar
 * alleen de eerste beweegt mee als Theme/base de rol naar een andere stap laat wijzen. Wie op
 * waarde bindt, legt in Figma `spacing-6` vast waar de code `spacing-surface` zegt, en die twee
 * lopen uit elkaar bij de eerste wijziging van de rol.
 *
 * `klassen` komt uit de walker (`klassenVan`): varianten die niet gelden zijn er al uit, en een
 * geldende variant (`sm:` op 1280 px) staat er als kale klasse in.
 */
import { layoutRoleUtilities } from '../../../tokens/build/roles.mjs';

// Kanten in de volgorde van de walker: [top, right, bottom, left].
const KANT = { p: [0, 1, 2, 3], px: [1, 3], py: [0, 2], pt: [0], pr: [1], pb: [2], pl: [3] };
// Tailwind zet de padding-utilities in deze volgorde in de stylesheet: een pt- wint van een py-,
// die wint van een p-. Dezelfde voorrang hier, anders bindt `p-surface pt-0` de bovenkant aan de rol.
const VOORRANG = [['p'], ['px', 'py'], ['pt', 'pr', 'pb', 'pl']];

/** Per kant de rolnaam (`spacing-surface`) of null; een schaalklasse op een kant wist de rol. */
export function paddingRollen(klassen) {
  const kanten = [null, null, null, null];
  for (const fase of VOORRANG) {
    for (const k of klassen) {
      const m = k.match(/^(p|px|py|pt|pr|pb|pl)-(.+)$/);
      if (!m || !fase.includes(m[1])) continue;
      const rol = layoutRoleUtilities[m[2]] ?? null;
      for (const i of KANT[m[1]]) kanten[i] = rol;
    }
  }
  return kanten;
}

// gap-x/gap-y winnen van gap (ze staan later in de stylesheet); space-x/space-y staan apart.
const GAP_VOORRANG = [['gap', 'space-x', 'space-y'], ['gap-x', 'gap-y']];

/**
 * De rol achter de gap-klasse met de hoogste voorrang uit `prefixen`, of null. Net als bij
 * padding wist een schaalklasse op dezelfde as de rol: `gap-stack gap-y-2` rendert 8, niet 16.
 */
export function gapRol(klassen, prefixen) {
  let rol = null;
  for (const fase of GAP_VOORRANG) {
    for (const k of klassen) {
      const m = k.match(/^(gap-x|gap-y|gap|space-x|space-y)-(.+)$/);
      if (!m || !fase.includes(m[1]) || !prefixen.includes(m[1])) continue;
      rol = layoutRoleUtilities[m[2]] ?? null;
    }
  }
  return rol;
}

/**
 * Hoogte- en breedterol uit `h-`, `w-` en `size-` (size zet beide, h/w winnen erna). Een
 * schaalklasse op een as wist de rol. Alleen een rol telt, want een maat zonder rol bindt de
 * keten niet (hij heeft geen variabele voor h-10).
 */
export function maatRollen(klassen) {
  const uit = { h: null, w: null };
  for (const fase of [['size'], ['h', 'w']]) {
    for (const k of klassen) {
      const m = k.match(/^(size|h|w)-(.+)$/);
      if (!m || !fase.includes(m[1])) continue;
      const rol = layoutRoleUtilities[m[2]] ?? null;
      if (m[1] !== 'w') uit.h = rol;
      if (m[1] !== 'h') uit.w = rol;
    }
  }
  return uit;
}
