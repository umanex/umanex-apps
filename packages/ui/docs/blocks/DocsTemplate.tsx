import { Controls, Description, Primary, Stories, Subtitle, Title } from '@storybook/addon-docs/blocks';
import { FigmaLink } from './FigmaLink';
import { TokensUsed } from './TokensUsed';

/** De standaard autodocs-opbouw, met de Figma-link onder de titel en de tokens-tabel tussen de controls en de overige stories. */
export const DocsTemplate = () => (
  <>
    <Title />
    <Subtitle />
    <FigmaLink />
    <Description />
    <Primary />
    <Controls />
    <TokensUsed />
    <Stories />
  </>
);
