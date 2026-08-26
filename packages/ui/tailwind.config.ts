import type { Config } from 'tailwindcss';
import preset from '@umanex/config/tailwind/preset';

// Alleen voor Storybook. De apps compileren packages/ui met hun eigen config
// (content-glob op ../../packages/ui); dit bestand bestaat omdat Storybook een
// eigen Vite/PostCSS-keten draait en anders geen utilities zou genereren.
// Kleuren, radius, fonts en de animate-plugin komen uit de gedeelde preset.
const config: Config = {
  presets: [preset],
  content: ['./components/**/*.{ts,tsx}', './docs/**/*.{ts,tsx,mdx}', './.storybook/**/*.{ts,tsx}'],
};

export default config;
