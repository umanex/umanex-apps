import { useOf } from '@storybook/addon-docs/blocks';
import { muted } from '../lib/docsStyles';

/**
 * Docs-blok dat de deep-link naar de Figma-pagina van dit component toont.
 *
 * Leest `parameters.figma.url` uit het stories-bestand. Elke component heeft in
 * het Figma-bestand "Component library" een eigen pagina; de URL wijst naar de
 * component(set) op die pagina, zodat Figma meteen op het juiste ding opent.
 *
 * De link is geen decoratie maar een controleerbare koppeling:
 * `scripts/figma-sync-check.mjs` toetst dat elke story er één heeft, dat hij naar
 * de juiste fileKey wijst en dat het node-id in `figma/manifest.json` bestaat.
 *
 * Bewust geen @storybook/addon-designs: die addon doet hetzelfde met een embed,
 * maar is een extra dependency (en de embed vereist een gedeeld Figma-bestand).
 */
export const FigmaLink = () => {
  const resolved = useOf('meta', ['meta']);
  const url: unknown = resolved.preparedMeta.parameters?.figma?.url;
  if (typeof url !== 'string') return null;

  return (
    <p style={{ ...muted, marginTop: '-0.5rem' }}>
      <a href={url} target="_blank" rel="noreferrer">
        Open in Figma →
      </a>
    </p>
  );
};
