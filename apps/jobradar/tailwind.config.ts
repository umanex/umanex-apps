import type { Config } from 'tailwindcss'
import preset from '@umanex/config/tailwind/preset'

// Kleuren, borderRadius, fontFamily, darkMode en de animate-plugin komen uit de
// gedeelde preset. Hier hoort alleen nog wat écht app-specifiek is: de
// accordion-keyframes die Radix' content-height-variabele gebruiken.
const config: Config = {
  presets: [preset],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/ui/components/**/*.{ts,tsx}',
    '../../packages/ui/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
}

export default config
