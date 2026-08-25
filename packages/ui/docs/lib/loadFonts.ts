import { fontFamily, fontWeight } from '@umanex/tokens/typography';

/**
 * De apps laden hun font via next/font en zetten --font-sans / --font-serif;
 * Storybook heeft geen next/font. Dit haalt dezelfde families op via Google Fonts
 * en zet dezelfde variabelen — de familienamen komen uit de tokens, niet uit een
 * string hier, zodat een font-wissel in Tokens Studio ook Storybook meeneemt.
 */
export function loadFonts(): void {
  if (typeof document === 'undefined') return;
  const sans = fontFamily.sans;
  const serif = fontFamily.serif;
  const sansWeights = Object.values(fontWeight).join(';');

  const params: string[] = [];
  if (sans) params.push(`family=${sans.replace(/\s+/g, '+')}:wght@${sansWeights}`);
  // Merriweather bestaat op Google Fonts niet in 500/600; de apps laden 400 + 700.
  if (serif) params.push(`family=${serif.replace(/\s+/g, '+')}:wght@400;700`);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?${params.join('&')}&display=swap`;
  document.head.appendChild(link);

  const root = document.documentElement.style;
  if (sans) root.setProperty('--font-sans', `'${sans}'`);
  if (serif) root.setProperty('--font-serif', `'${serif}'`);
}
