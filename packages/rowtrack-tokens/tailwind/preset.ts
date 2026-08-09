import type { Config } from 'tailwindcss';
// Gegenereerd door packages/rowtrack-tokens/build.mjs uit apps/rowtrack/tokens/tokens.json.
import {
  hslRoles,
  rawRoles,
  scalarRoles,
  shadowRoles,
} from '@umanex/rowtrack-tokens/roles';
// De rol -> Tailwind-naam-afbeelding, gedeeld met scripts/guard.mjs.
import { colorEntries, scalarNames } from './roleMap.mjs';

/**
 * De RowTrack Tailwind-preset — de web-helft van de app-DNA.
 *
 * Dit is de enige plek waar RowTrack's rollaag op Tailwind-utilities gemapt wordt,
 * en de map wordt GEGENEREERD uit de tokens. Consequentie, en dat is het punt: de
 * utility-set is per definitie gelijk aan de tokenset. Een rol toevoegen in Tokens
 * Studio levert de utility op; een kleur die geen rol is, heeft er geen.
 *
 * Wat die garantie NIET dekt is een tikfout: Tailwind negeert een onbekende klasse
 * in een className zonder één woord, dus `border-border-defualt` rendert stil niets.
 * Daarvoor bestaat `pnpm --filter @umanex/rowtrack-tokens guard`.
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

const colorValue = (name: string) =>
  hslRoles.includes(name) ? `hsl(var(--${name}))` : `var(--${name})`;

function colorsFromRoles(): Record<string, Record<string, string>> {
  const colors: Record<string, Record<string, string>> = {};

  for (const { role, group, key } of colorEntries([...hslRoles, ...rawRoles])) {
    (colors[group] ??= {})[key] = colorValue(role);
  }

  return colors;
}

/** Scalars als var()-verwijzing, met de rolnaam als sleutel. */
const scalars = (prefix: string): Record<string, string> =>
  Object.fromEntries(
    scalarNames(scalarRoles, prefix).map((name) => [name, `var(--${prefix}-${name})`])
  );

const sizes = scalars('size');

const preset: Config = {
  content: [],
  theme: {
    extend: {
      colors: colorsFromRoles(),
      borderRadius: scalars('radius'),
      borderWidth: scalars('stroke'),
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
