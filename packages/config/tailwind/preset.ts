import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';
// Gegenereerd door packages/tokens/build.mjs; TypeScript leidt de string[]-types
// rechtstreeks uit de .mjs af, dus er is geen .d.ts nodig.
import { hslRoles, rawRoles } from '@umanex/tokens/roles';

/**
 * De gedeelde umanex Tailwind-preset.
 *
 * Dit is de ENIGE plek waar de semantische rollaag op Tailwind-utilities gemapt
 * wordt, en de map wordt GEGENEREERD uit de tokens. Voorheen herhaalde elke app
 * dezelfde kleur-map in zijn eigen tailwind.config.ts; die kopieën liepen uit
 * elkaar, en de rollen die alleen in packages/ui/tailwind.config.ts stonden
 * (chart-*, sidebar-*) bestonden in geen enkele app — dat bestand werd nooit
 * gecompileerd.
 *
 * Consequentie, en dat is het punt: de utility-set is per definitie gelijk aan de
 * tokenset. Een rol toevoegen in Tokens Studio levert de utility op; een kleur die
 * geen rol is, heeft er geen. App-code kan dus niet buiten de rollaag grijpen.
 *
 * Geen <alpha-value>: Tailwind v3 injecteert de slash-alpha zelf bij een kale
 * hsl(var(--x)), dus bg-primary/50 werkt al.
 */

// Rollen die als groep horen te landen: bg-chart-1, bg-sidebar-accent,
// text-finance-positive. Zonder deze lijst zou 'chart-1' een losse kleur
// 'chart-1' worden in plaats van chart.1.
const NAMESPACES = ['chart', 'sidebar', 'finance', 'overlay'];

const all: string[] = [...hslRoles, ...rawRoles];
const has = (name: string) => all.includes(name);
const value = (name: string) =>
  hslRoles.includes(name) ? `hsl(var(--${name}))` : `var(--${name})`;

type ColorMap = Record<string, string | Record<string, string>>;

function colorsFromRoles(): ColorMap {
  const colors: ColorMap = {};

  for (const name of all) {
    const ns = NAMESPACES.find((g) => name === g || name.startsWith(`${g}-`));
    if (ns) {
      const group = (colors[ns] ??= {}) as Record<string, string>;
      group[name === ns ? 'DEFAULT' : name.slice(ns.length + 1)] = value(name);
      continue;
    }

    // shadcns x / x-foreground paring: de foreground landt als .foreground onder
    // zijn basis, niet als losse kleur.
    if (name.endsWith('-foreground') && has(name.slice(0, -'-foreground'.length))) continue;

    colors[name] = has(`${name}-foreground`)
      ? { DEFAULT: value(name), foreground: value(`${name}-foreground`) }
      : value(name);
  }

  return colors;
}

const preset: Config = {
  content: [],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: colorsFromRoles(),
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        // De fallback staat BINNEN var(), niet erachter. Een var() naar een
        // ongedefinieerde property maakt de hele declaratie invalid-at-computed-
        // value-time — dan valt font-family terug op de browser-default in plaats
        // van op de volgende stack-entry. Met var(--x, fallback) blijft de
        // declaratie geldig, ook in een app die deze font-variabele niet zet.
        sans: ['var(--font-sans, ui-sans-serif)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif, ui-serif)', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [animate],
};

export default preset;
