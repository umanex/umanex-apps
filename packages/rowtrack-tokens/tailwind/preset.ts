import type { Config } from 'tailwindcss';
// Gegenereerd door packages/rowtrack-tokens/build.mjs uit apps/rowtrack/tokens/tokens.json.
import {
  hslRoles,
  rawRoles,
  scalarRoles,
  shadowRoles,
} from '@umanex/rowtrack-tokens/roles';

/**
 * De RowTrack Tailwind-preset — de web-helft van de app-DNA.
 *
 * Dit is de enige plek waar RowTrack's rollaag op Tailwind-utilities gemapt wordt,
 * en de map wordt GEGENEREERD uit de tokens. Consequentie, en dat is het punt: de
 * utility-set is per definitie gelijk aan de tokenset. Een rol toevoegen in Tokens
 * Studio levert de utility op; een kleur die geen rol is, heeft er geen. App-code
 * kan dus niet buiten de rollaag grijpen.
 *
 * Verschil met de umanex-preset (@umanex/config/tailwind/preset): die draagt een
 * light/dark rollaag met shadcn-rolnamen. RowTrack is dark-only en heeft zijn eigen
 * taxonomie (bg/fg/border/accent/achievement). De twee delen bewust geen code — het
 * zijn twee ontwerpsystemen, geen twee kopieën van één.
 *
 * NAAMGEVING — de Tailwind-naam is gelijk aan de rolnaam, ook waar dat redundant
 * oogt (`bg-bg-base`). De CSS-variabele heet `--bg-base`; hem hier `surface` noemen
 * zou één ding twee namen geven binnen hetzelfde systeem, en dat is een duurdere
 * leesval dan de dubbele prefix. Zeg je `bg.elevated`, dan typ je `bg-bg-elevated`.
 *
 * Geen <alpha-value>: Tailwind v3 injecteert de slash-alpha zelf bij een kale
 * hsl(var(--x)), dus bg-accent/50 werkt al.
 */

// Rollen die als groep horen te landen. Zonder deze lijst zou `bg-base` een losse
// kleur "bg-base" worden in plaats van bg.base, en zou `accent-hover` niet onder
// accent vallen maar ernaast.
const COLOR_GROUPS = ['bg', 'fg', 'border', 'accent', 'achievement', 'gradient'];

const colorRoles: string[] = [...hslRoles, ...rawRoles];
const colorValue = (name: string) =>
  hslRoles.includes(name) ? `hsl(var(--${name}))` : `var(--${name})`;

type Group = Record<string, string>;

function colorsFromRoles(): Record<string, Group> {
  const colors: Record<string, Group> = {};

  for (const name of colorRoles) {
    const ns = COLOR_GROUPS.find((g) => name === g || name.startsWith(`${g}-`));
    if (!ns) {
      // Hard falen in plaats van stil laten vallen: een nieuwe rolgroep in Tokens
      // Studio moet zichtbaar worden, niet onzichtbaar verdwijnen uit de utilities.
      throw new Error(
        `[rowtrack-preset] rol "${name}" hoort bij geen enkele groep uit COLOR_GROUPS ` +
        `(${COLOR_GROUPS.join(', ')}). Voeg de groep toe in packages/rowtrack-tokens/tailwind/preset.ts.`
      );
    }
    const group = (colors[ns] ??= {});
    // `accent.default` wordt `bg-accent`, niet `bg-accent-default`.
    const key = name === ns ? 'DEFAULT' : name.slice(ns.length + 1);
    group[key === 'default' ? 'DEFAULT' : key] = colorValue(name);
  }

  return colors;
}

/** Scalars per prefix uitpakken: radius-card -> borderRadius.card. */
function scalarsWithPrefix(prefix: string): Group {
  return Object.fromEntries(
    scalarRoles
      .filter((name) => name.startsWith(`${prefix}-`))
      .map((name) => [name.slice(prefix.length + 1), `var(--${name})`])
  );
}

const sizes = scalarsWithPrefix('size');

const preset: Config = {
  content: [],
  theme: {
    extend: {
      colors: colorsFromRoles(),
      borderRadius: scalarsWithPrefix('radius'),
      borderWidth: scalarsWithPrefix('stroke'),
      boxShadow: Object.fromEntries(
        shadowRoles.map((name) => [name.replace(/^shadow-/, ''), `var(--${name})`])
      ),
      // Dezelfde size-rollen leveren zowel een vaste als een minimum-hoogte. De
      // minimum-variant is wat je op web meestal wilt: een knop met langere tekst
      // of een grotere systeemfont moet mee kunnen groeien in plaats van te clippen.
      height: sizes,
      minHeight: sizes,
      fontFamily: {
        // De fallback staat BINNEN var(), niet erachter. Een var() naar een
        // ongedefinieerde property maakt de hele declaratie invalid-at-computed-
        // value-time — dan valt font-family terug op de browser-default in plaats
        // van op de volgende stack-entry.
        //
        // De familienaam zelf staat bewust niet hier: next/font hasht hem en levert
        // hem via --font-sans / --font-serif. De bedoeling ligt vast in het token
        // Core.fontFamily, dat als `fontFamily` uit @umanex/rowtrack-tokens/roles komt.
        sans: ['var(--font-sans, ui-sans-serif)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif, ui-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

export default preset;
