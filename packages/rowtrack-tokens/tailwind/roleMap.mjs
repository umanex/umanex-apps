/**
 * De afbeelding van rolnamen op Tailwind-namen — één keer, voor twee consumenten.
 *
 * `tailwind/preset.ts` gebruikt hem om de theme-map te bouwen; `scripts/guard.mjs`
 * gebruikt hem om te bepalen welke utility-klassen bestaan. Zouden die twee elk hun
 * eigen kopie hebben, dan bewaakt de guard iets anders dan de preset genereert — en
 * dan is de guard erger dan geen guard, want hij wekt vertrouwen dat hij niet waar
 * kan maken.
 *
 * Plain .mjs met een .d.mts ernaast, zodat zowel de TypeScript-preset als het
 * Node-script hem kan importeren zonder buildstap.
 */

/**
 * Rollen die als groep horen te landen. Zonder deze lijst zou `bg-base` een losse
 * kleur "bg-base" worden in plaats van bg.base, en zou `accent-hover` niet onder
 * accent vallen maar ernaast.
 */
export const COLOR_GROUPS = ['bg', 'fg', 'border', 'accent', 'achievement', 'gradient'];

/**
 * Splitst een kleurrol in zijn groep en zijn sleutel binnen die groep.
 *
 * `accent` en `accent-default` landen allebei op DEFAULT, zodat de utility
 * `bg-accent` heet en niet `bg-accent-default`.
 *
 * Gooit op een rol buiten elke groep. Stil laten vallen zou hem uit de utilities
 * laten verdwijnen terwijl hij in Tokens Studio bestaat — onzichtbaar in plaats van
 * zichtbaar kapot.
 */
export function splitColorRole(name) {
  const group = COLOR_GROUPS.find((g) => name === g || name.startsWith(`${g}-`));
  if (!group) {
    throw new Error(
      `[rowtrack-tokens] kleurrol "${name}" hoort bij geen enkele groep uit COLOR_GROUPS ` +
      `(${COLOR_GROUPS.join(', ')}). Voeg de groep toe in packages/rowtrack-tokens/tailwind/roleMap.mjs.`
    );
  }
  const raw = name === group ? 'DEFAULT' : name.slice(group.length + 1);
  return { group, key: raw === 'default' ? 'DEFAULT' : raw };
}

/** Alle kleurrollen als { role, group, key }. */
export function colorEntries(colorRoles) {
  return colorRoles.map((role) => ({ role, ...splitColorRole(role) }));
}

/**
 * De Tailwind-KLEURNAAM per rol — het deel ná de utility-prefix.
 *
 *   bg.base        -> "bg-base"      => bg-bg-base, text-bg-base, …
 *   border.default -> "border"       => border-border
 *   accent.hover   -> "accent-hover" => bg-accent-hover
 */
export function colorClassNames(colorRoles) {
  return colorEntries(colorRoles).map(({ group, key }) =>
    key === 'DEFAULT' ? group : `${group}-${key}`
  );
}

/** Scalars per prefix uitpakken: 'radius-card' met prefix 'radius' -> 'card'. */
export function scalarNames(scalarRoles, prefix) {
  return scalarRoles
    .filter((name) => name.startsWith(`${prefix}-`))
    .map((name) => name.slice(prefix.length + 1));
}

/**
 * De eerste segmenten van een verzameling namen — de "wortels" waaraan de guard een
 * klasse herkent als bedoeld-als-token.
 *
 *   ['button-primary', 'button-outline', 'card'] -> ['button', 'card']
 *
 * Daarmee is `shadow-button-primry` (tikfout) herkenbaar als een schaduw die een
 * token had willen zijn, terwijl `shadow-lg` van Tailwind ongemoeid blijft.
 */
export function nameRoots(names) {
  return [...new Set(names.map((n) => n.split('-')[0]))];
}
