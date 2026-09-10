import type { Preview } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';

// Volgorde is functioneel, zoals in de app-layouts: theme.css levert de rollaag
// (:root + .dark), globals.css legt de Tailwind-lagen en de body-defaults erop.
import '@umanex/tokens/theme.css';
import '../globals.css';

import { DocsTemplate } from '../docs/blocks/DocsTemplate';
import { loadFonts } from '../docs/lib/loadFonts';

loadFonts();

const preview: Preview = {
  // Elk component krijgt een docs-pagina; de DocsTemplate voegt daar de tokens-tabel aan toe.
  tags: ['autodocs'],
  decorators: [
    // Dezelfde .dark-class op <html> als de ThemeToggle in de apps zet.
    withThemeByClassName({ themes: { light: '', dark: 'dark' }, defaultTheme: 'light' }),
    // Stories renderen op de rol-achtergrond — ook in de docs-pagina, die zelf
    // Storybooks eigen (lichte) canvas heeft. Zonder deze wrapper staat een dark-mode
    // component met lichte tekst op een wit vlak.
    (Story) => (
      <div className="bg-background p-6 font-sans text-foreground">
        <Story />
      </div>
    ),
  ],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    docs: { page: DocsTemplate },
    // De achtergrond komt uit de rollaag (bg-background); de backgrounds-toolbar zou
    // daar een tweede, token-loze bron naast zetten.
    backgrounds: { disable: true },
    options: {
      storySort: {
        order: ['Tokens', ['Overzicht', 'Kleurrollen', 'Typografie', 'Radius'], 'Componenten'],
      },
    },
  },
};

export default preview;
