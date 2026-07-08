import type { Config } from 'tailwindcss';

// Zelfstandig Vyvey-theme — GEEN @umanex/config preset, GEEN umanex-tokens.
// Palet, type scale en breakpoints zijn afgeleid uit de originele Framer-site.
const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Framer-breakpoints exact nagebootst (mobile-first). Default = Phone (≤809px).
    screens: {
      tablet: '810px',
      desktop: '1200px',
      xl: '1440px',
    },
    extend: {
      colors: {
        cream: '#f9f7f0',
        ink: '#414141',
        graphite: '#393e46', // wordmark / donkerste brand-ink
        accent: {
          DEFAULT: '#9c7460',
          emphasis: '#976b54',
          deep: '#8a5f4a',
        },
        mute: '#b3b3b3',
      },
      fontFamily: {
        sans: ['var(--font-lexend-deca)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        content: '1152px',
      },
      borderRadius: {
        field: '28px', // translucent contact-form velden
      },
      boxShadow: {
        card: '0 0 24px rgba(224, 224, 224, 0.5)',
        'card-soft': '0 4px 4px rgba(0, 0, 0, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
