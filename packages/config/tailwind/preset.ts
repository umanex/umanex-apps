import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * De gedeelde umanex Tailwind-preset.
 *
 * Dit is de ENIGE plek waar de semantische rollaag op Tailwind-utilities gemapt
 * wordt. Voorheen herhaalde elke app dezelfde kleur-map in zijn eigen
 * tailwind.config.ts; die kopieën liepen uit elkaar, en de rollen die alleen in
 * packages/ui/tailwind.config.ts stonden (chart-*, sidebar-*) bestonden in geen
 * enkele app — dat bestand werd nooit gecompileerd.
 *
 * Consequentie, en dat is het punt: een rol die niet in de tokens staat, heeft
 * geen utility. App-code kan geen kleur gebruiken die de rollaag niet kent.
 *
 * De waarden komen uit @umanex/tokens en landen als :root/.dark custom
 * properties. Hier staan ze nog handgeschreven; een volgende stap genereert deze
 * map uit build/roles.mjs zodat een nieuwe token automatisch een utility wordt.
 *
 * Geen <alpha-value>: Tailwind v3 injecteert de slash-alpha zelf bij een kale
 * hsl(var(--x)), dus bg-primary/50 werkt al.
 */

const hsl = (name: string) => `hsl(var(--${name}))`;

const preset: Config = {
  content: [],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: hsl('border'),
        input: hsl('input'),
        ring: hsl('ring'),
        background: hsl('background'),
        foreground: hsl('foreground'),
        primary: {
          DEFAULT: hsl('primary'),
          foreground: hsl('primary-foreground'),
        },
        secondary: {
          DEFAULT: hsl('secondary'),
          foreground: hsl('secondary-foreground'),
        },
        muted: {
          DEFAULT: hsl('muted'),
          foreground: hsl('muted-foreground'),
        },
        accent: {
          DEFAULT: hsl('accent'),
          foreground: hsl('accent-foreground'),
        },
        destructive: {
          DEFAULT: hsl('destructive'),
          foreground: hsl('destructive-foreground'),
        },
        // shadcn kent alleen destructive; success en warning zijn een umanex-
        // uitbreiding volgens dezelfde x / x-foreground conventie.
        success: {
          DEFAULT: hsl('success'),
          foreground: hsl('success-foreground'),
        },
        warning: {
          DEFAULT: hsl('warning'),
          foreground: hsl('warning-foreground'),
        },
        card: {
          DEFAULT: hsl('card'),
          foreground: hsl('card-foreground'),
        },
        popover: {
          DEFAULT: hsl('popover'),
          foreground: hsl('popover-foreground'),
        },
        chart: {
          1: hsl('chart-1'),
          2: hsl('chart-2'),
          3: hsl('chart-3'),
          4: hsl('chart-4'),
          5: hsl('chart-5'),
        },
        sidebar: {
          DEFAULT: hsl('sidebar'),
          foreground: hsl('sidebar-foreground'),
          primary: hsl('sidebar-primary'),
          'primary-foreground': hsl('sidebar-primary-foreground'),
          accent: hsl('sidebar-accent'),
          'accent-foreground': hsl('sidebar-accent-foreground'),
          border: hsl('sidebar-border'),
          ring: hsl('sidebar-ring'),
        },
      },
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
