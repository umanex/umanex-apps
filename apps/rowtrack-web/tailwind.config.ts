import type { Config } from 'tailwindcss';
import preset from '@umanex/rowtrack-tokens/tailwind/preset';

/**
 * RowTrack-DNA, niet umanex-DNA. Deze app consumeert bewust NIET
 * @umanex/config/tailwind/preset — de site moet eruitzien als de app, en die heeft
 * een eigen dark-only rollaag.
 *
 * De preset draagt de volledige kleur-, radius-, stroke-, size- en shadow-map, en
 * die is gegenereerd uit de tokens. Hier hoort dus niets aan `theme` bij te komen:
 * wat geen rol is, heeft geen utility.
 */
const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
};

export default config;
