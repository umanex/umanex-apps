import { Controls, Description, Primary, Stories, Subtitle, Title } from '@storybook/addon-docs/blocks';
import { TokensUsed } from './TokensUsed';

/** De standaard autodocs-opbouw, met de tokens-tabel tussen de controls en de overige stories. */
export const DocsTemplate = () => (
  <>
    <Title />
    <Subtitle />
    <Description />
    <Primary />
    <Controls />
    <TokensUsed />
    <Stories />
  </>
);
