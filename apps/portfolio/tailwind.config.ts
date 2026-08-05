import type { Config } from 'tailwindcss';
import preset from '@umanex/config/tailwind/preset';

// Kleuren, borderRadius, fontFamily, darkMode en de animate-plugin komen uit de
// gedeelde preset. Hier hoort alleen nog wat écht app-specifiek is.
//
// De fontFamily-stack stond hier met --umanexFontSans / --umanexFontSerif als
// tussenlaag, om die token-primitives niet wees te laten staan. Dat werkte averechts:
// een var() naar een property die straks verdwijnt, maakt de hele declaratie invalid.
// De preset lost het correct op met var(--font-sans, ui-sans-serif).
const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/components/**/*.{ts,tsx}',
    '../../packages/ui/lib/**/*.{ts,tsx}',
  ],
};

export default config;
