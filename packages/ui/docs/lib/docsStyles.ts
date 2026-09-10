import type { CSSProperties } from 'react';

/**
 * Inline stijlen voor de docs-tabellen. De docs-pagina is Storybooks eigen canvas
 * (altijd licht), dus rol-utilities (text-foreground) zouden daar in dark mode
 * onleesbaar worden. Alles hier erft de tekstkleur en werkt met currentColor.
 */
const hairline = 'color-mix(in srgb, currentColor 18%, transparent)';

export const table: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: '0.8125rem',
  lineHeight: 1.4,
  marginBottom: '1.5rem',
};

export const th: CSSProperties = {
  textAlign: 'left',
  fontWeight: 600,
  padding: '0.5rem 0.625rem',
  borderBottom: `1px solid ${hairline}`,
  whiteSpace: 'nowrap',
};

export const td: CSSProperties = {
  padding: '0.5rem 0.625rem',
  borderBottom: `1px solid ${hairline}`,
  verticalAlign: 'middle',
};

export const code: CSSProperties = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: '0.75rem',
};

export const muted: CSSProperties = {
  opacity: 0.65,
};

export const swatch = (background: string): CSSProperties => ({
  display: 'inline-block',
  width: '1.5rem',
  height: '1.5rem',
  borderRadius: '0.25rem',
  background,
  border: `1px solid ${hairline}`,
  verticalAlign: 'middle',
  marginRight: '0.5rem',
  flexShrink: 0,
});
