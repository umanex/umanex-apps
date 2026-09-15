import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../docs/**/*.mdx', '../components/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    /**
     * De MCP-server hangt hier aan, niet ernaast: `@storybook/addon-mcp` haakt in op de
     * dev-server (`devServer` + `app.post`) en publiceert op `/mcp`. Dat betekent dat de
     * MCP alleen bestaat zolang `pnpm --filter @umanex/ui storybook` draait — er is géén
     * losse server om aan te zetten.
     *
     * Gevolg, en dat is de rail uit CLAUDE.md (*een server die jíj start, is even vast aan
     * zijn branch geklonken*): dit proces serveert uit één tree op één branch. Wissel je van
     * branch terwijl hij draait, dan blijft de poort open en verwijzen de MCP-tools naar
     * stories die daar niet meer staan. Stop hem dus bij het afsluiten, of noem de branch
     * erbij wanneer je de URL doorgeeft.
     *
     * Toolsets: `dev` (stories.preview · stories.changed · stories.findByComponent),
     * `docs` (review.create) en `test` (test.run). Die laatste vraagt
     * `@storybook/addon-vitest` — een optionele peer die hier NIET geïnstalleerd is, want
     * die sleept vitest, @vitest/browser en playwright mee. `test.run` is hier dus
     * onbeschikbaar; de andere vier werken.
     */
    '@storybook/addon-mcp',
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  core: { disableTelemetry: true },
  /**
   * RowTrack hangt hier als `ref`, niet als tweede losse installatie.
   *
   * CLAUDE.md → Design-systeem-bron: een app met een eigen tokenbron verantwoordt een eigen
   * componentlaag, en de vorm daarvan is een eigen Storybook die híer als ref hangt. RowTrack
   * heeft die eigen bron (`apps/rowtrack/tokens/tokens.json`, dark-only, geen Tailwind) en
   * rendert React Native via react-native-web — een andere framework-builder, dus samenvoegen
   * in één Storybook kan niet.
   *
   * De ref wijst naar de dev-server op :6007. Draait die niet, dan toont Storybook de ref als
   * niet-beschikbaar in plaats van om te vallen; start hem met
   * `pnpm --filter rowtrack storybook`.
   */
  refs: {
    rowtrack: {
      title: 'RowTrack (mobile)',
      url: 'http://localhost:6007',
      expanded: false,
    },
  },
};

export default config;
