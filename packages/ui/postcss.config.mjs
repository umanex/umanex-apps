import { fileURLToPath } from 'node:url';

// Expliciet pad: Tailwind zoekt zijn config anders in process.cwd(), en die is
// niet per se packages/ui wanneer Storybook via turbo of vanuit de root start.
/** @type {import('postcss').ProcessOptions} */
const config = {
  plugins: {
    tailwindcss: { config: fileURLToPath(new URL('./tailwind.config.ts', import.meta.url)) },
    autoprefixer: {},
  },
};

export default config;
