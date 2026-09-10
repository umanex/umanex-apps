import type { Config } from 'tailwindcss';
import preset from '@umanex/config/tailwind/preset';

// Alleen voor Storybook. De apps compileren packages/ui met hun eigen config
// (content-glob op ../../packages/ui); dit bestand bestaat omdat Storybook een
// eigen Vite/PostCSS-keten draait en anders geen utilities zou genereren.
// Kleuren, radius, fonts en de animate-plugin komen uit de gedeelde preset.
const config: Config = {
  presets: [preset],
  // `lib/**` staat erbij sinds de focus-ring een constante is (lib/focus.ts): Tailwind
  // genereert alleen wat hij in de content-globs terugvindt. Zonder deze glob overleefde
  // de ring in Storybook alleen omdat input, checkbox, slider en tabs de reeks nog
  // letterlijk dragen — gemeten: met content op enkel button.tsx verdwijnt hij.
  content: [
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    './docs/**/*.{ts,tsx,mdx}',
    './.storybook/**/*.{ts,tsx}',
  ],
};

export default config;
