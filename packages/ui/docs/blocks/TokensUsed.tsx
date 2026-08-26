import { Heading, useOf } from '@storybook/addon-docs/blocks';
import { tokensFromSource } from '../lib/tokensFromSource';
import { muted } from '../lib/docsStyles';
import { TokenUseTable } from './TokenUseTable';

/**
 * Docs-blok voor de autodocs-pagina van een component. Leest `parameters.tokens.source`
 * (de broncode van het component, via een `?raw`-import in het stories-bestand) en
 * toont de tokens die daarin voorkomen. Zonder die parameter rendert het niets.
 */
export const TokensUsed = () => {
  const resolved = useOf('meta', ['meta']);
  const source: unknown = resolved.preparedMeta.parameters?.tokens?.source;
  if (typeof source !== 'string') return null;

  const uses = tokensFromSource(source);

  return (
    <>
      <Heading>Tokens</Heading>
      <p style={muted}>
        Afgeleid uit de class-strings in de bron van dit component. Het pad is de Tokens
        Studio-notatie; de waarde per mode komt uit <code>theme.css</code>.
      </p>
      {uses.length ? (
        <TokenUseTable uses={uses} />
      ) : (
        <p style={muted}>Dit component raakt geen enkele token rechtstreeks aan.</p>
      )}
    </>
  );
};
