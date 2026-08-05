/**
 * Laag-discipline als lint-regels — de editor-helft van de guard.
 *
 * De regel: app-code raakt uitsluitend de ROLLAAG aan, via een utility uit
 * @umanex/config/tailwind/preset. Geen primitive, geen rauwe paletkleur, geen
 * hardcoded hex, geen arbitrary type- of radius-waarde.
 *
 * Gebruik (eslintrc, ESLint 8):
 *
 *   { "extends": ["next/core-web-vitals", "@umanex/config/eslint/tokens"] }
 *
 * .cjs en niet .js: dit package is `"type": "module"`, en ESLint 8 laadt een
 * shareable config via require(). Als .js zou Node hem als ESM behandelen en
 * weigeren te laden.
 *
 * Dit dekt bewust niet alles. SVG-attributen (fill=, stroke=) en .css-bestanden
 * vallen buiten de Literal/TemplateElement-selectors, en packages/ui heeft geen
 * eslint-config. Daarvoor is `pnpm --filter @umanex/tokens guard`, die in CI draait.
 * De twee zijn complementair, niet dubbelop.
 */

const PALET = [
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
].join('|');

const UTILITY = 'bg|text|border|ring|fill|stroke|accent|decoration|outline';

const VERBODEN = [
  {
    re: /var\(--umanex/,
    msg:
      'primitive-token in app-code — gebruik een rol-utility (bg-muted, text-foreground, ' +
      'text-finance-negative). De primitives hebben sinds de token-refactor bewust geen ' +
      'CSS-output meer.',
  },
  {
    re: new RegExp(`\\b(${UTILITY})-(${PALET})-\\d{2,3}\\b`),
    msg:
      'rauwe Tailwind-paletkleur — gebruik de semantische rol (text-success, bg-warning, ' +
      'text-muted-foreground). Een paletkleur is mode-blind en breekt in dark mode.',
  },
  {
    re: /\b(bg|text|border)-(white|black)\b/,
    msg: 'bg-white / text-black is mode-blind — gebruik bg-background / text-foreground.',
  },
  {
    re: new RegExp(`\\b(${UTILITY})-\\[#`),
    msg:
      'hardcoded hex — voeg een rol toe in Theme/light én Theme/dark via Tokens Studio. ' +
      'De build faalt op mode-asymmetrie, dus je kunt er niet één vergeten.',
  },
  {
    re: /\btext-\[\d+(\.\d+)?(px|rem)\]/,
    msg:
      'arbitrary font-size — gebruik een schaal-key (text-2xs, text-dense, text-sm). ' +
      'De schaal staat in de set Typography/Scale.',
  },
  {
    re: /\brounded(-[a-z]+)?-\[\d+px\]/,
    msg: 'arbitrary radius — gebruik rounded-sm / -md / -lg, afgeleid van --radius.',
  },
];

// Elke regel geldt zowel voor een gewone string als voor een template-literal, want
// de klassen worden op beide manieren geschreven (className="..." en `${...}`).
const restricties = VERBODEN.map(({ re, msg }) => ({
  selector: `Literal[value=/${re.source}/], TemplateElement[value.raw=/${re.source}/]`,
  message: `[tokens] ${msg}`,
}));

module.exports = {
  rules: {
    'no-restricted-syntax': ['error', ...restricties],
  },
};
