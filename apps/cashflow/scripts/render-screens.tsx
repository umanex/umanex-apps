/**
 * Rendert de rollaag en de componenten die erop leunen naar één HTML-bestand.
 * Alleen light: cashflow heeft geen dark mode.
 *
 *   pnpm --filter cashflow render:screens && open apps/cashflow/.screens-preview.html
 *
 * Waarom dit bestaat: de token-refactor is twaalf stappen lang op CSS-niveau
 * geverifieerd, en de echte fouten kwamen pas boven toen we in een browser keken —
 * achter de login gate, met de hand, en met drie meetfouten onderweg. Dit bestand
 * zet dezelfde informatie op één pagina zonder server, zonder sessie en zonder store.
 *
 * Aanvulling op, geen vervanging van:
 *   - `pnpm --filter @umanex/tokens contrast` rekent de rollaag door (96 combinaties)
 *   - `pnpm --filter @umanex/tokens guard` bewaakt de laag-discipline in de code
 * Die twee draaien in CI. Dit is het stuk dat een mens moet zien: of het er goed uitziet.
 *
 * Bewust geen route in de app — deze scenario's horen niet mee te reizen naar productie.
 * Zelfde afspraak als render-charts.tsx.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement as h, type ReactNode } from 'react';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

import { Badge } from '@umanex/ui/components/ui/badge';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { Separator } from '@umanex/ui/components/ui/separator';
import { Card, CardHeader, CardTitle, CardContent } from '@umanex/ui/components/ui/card';

import { SectionBar } from '../components/cashflow/SectionBar';
import { RunwayCard } from '../components/cashflow/RunwayCard';
import { BalanceFooter } from '../components/cashflow/BalanceFooter';
import { StartBalanceRow } from '../components/cashflow/StartBalanceRow';

const ROOT = new URL('..', import.meta.url).pathname;

// ── Rollen uit de gebouwde theme.css ─────────────────────────────────────────
// Uit het :root-blok, zodat de swatch-matrix automatisch meegroeit met de tokens
// in plaats van een handgeschreven lijst te zijn die uit de pas loopt.

const themeCss = readFileSync(`${ROOT}../../packages/tokens/build/theme.css`, 'utf8');
const rootBlok = themeCss.slice(themeCss.indexOf(':root {'), themeCss.indexOf('.dark {'));
const ROLLEN = [...rootBlok.matchAll(/--([a-z0-9-]+):/g)]
  .map((m) => m[1])
  // radius is geen kleur en heeft geen swatch. De type-guard is nodig omdat een
  // regex-capture `string | undefined` oplevert.
  .filter((n): n is string => n !== undefined && n !== 'radius');

// Rollen die een tekstkleur zijn, niet een vlak — die tonen we als letter op de
// achtergrond in plaats van als gevuld blokje.
const TEKST_ROLLEN = new Set([
  'foreground', 'muted-foreground', 'card-foreground', 'popover-foreground',
  'primary-foreground', 'secondary-foreground', 'accent-foreground',
  'destructive-foreground', 'success-foreground', 'warning-foreground',
  'sidebar-foreground', 'sidebar-primary-foreground', 'sidebar-accent-foreground',
  'finance-positive', 'finance-negative', 'finance-deferred',
  'finance-deferred-strong', 'finance-total',
]);

// ── Bouwstenen ───────────────────────────────────────────────────────────────

const Sectie = ({ titel, kind }: { titel: string; kind: ReactNode }) =>
  h('section', { className: 'mb-8' },
    h('h2', { className: 'text-sm font-semibold text-muted-foreground mb-3' }, titel),
    kind);

const Rij = ({ kind }: { kind: ReactNode }) =>
  h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' }, kind);

// Een `x-foreground` hoort per shadcn-conventie op `x` en nergens anders. Zet je hem
// als los "Aa" op de paginakleur, dan toon je wit op wit: onleesbaar in de harness,
// terwijl de rol in de app prima werkt. De swatch toont daarom het páár.
const basisVan = (rol: string) =>
  rol.endsWith('-foreground') ? rol.slice(0, -'-foreground'.length) : null;

const Swatch = ({ rol }: { rol: string }) => {
  const isTekst = TEKST_ROLLEN.has(rol);
  const basis = basisVan(rol);
  return h('div', { className: 'flex items-center gap-2 w-64', key: rol },
    h('div', {
      className: 'h-8 w-8 rounded-sm border border-border shrink-0 flex items-center justify-center text-2xs font-semibold',
      style: isTekst
        ? {
            color: `hsl(var(--${rol}))`,
            // `foreground` zelf heeft geen basis — die landt echt op de paginakleur.
            ...(basis ? { background: `hsl(var(--${basis}))` } : {}),
          }
        : { background: `hsl(var(--${rol}))` },
    }, isTekst ? 'Aa' : null),
    h('code', { className: 'text-2xs text-muted-foreground truncate' },
      basis ? `--${rol} op --${basis}` : `--${rol}`));
};

/** Alles wat we willen zien, één keer. Wordt twee keer aangeroepen: light en dark. */
const Inhoud = () => h('div', null,

  h(Sectie, { titel: 'Rollen', kind:
    h('div', { className: 'flex flex-wrap gap-x-4 gap-y-1' },
      ROLLEN.map((r) => h(Swatch, { rol: r, key: r }))) }),

  h(Sectie, { titel: 'Badge', kind:
    h(Rij, { kind: (['default','secondary','destructive','outline','success','warning'] as const)
      .map((v) => h(Badge, { variant: v, key: v }, v)) }) }),

  h(Sectie, { titel: 'Button', kind: h('div', null,
    h(Rij, { kind: (['default','secondary','outline','ghost','destructive','link'] as const)
      .map((v) => h(Button, { variant: v, key: v }, v)) }),
    h(Rij, { kind: (['sm','default','lg'] as const)
      .map((s) => h(Button, { size: s, key: s }, `size ${s}`))
      .concat(h(Button, { key: 'dis', disabled: true }, 'disabled')) })) }),

  h(Sectie, { titel: 'Formulier', kind:
    h('div', { className: 'flex flex-wrap items-end gap-3' },
      h('div', null, h(Label, { htmlFor: 'x' }, 'Label'), h(Input, { id: 'x', defaultValue: 'waarde' })),
      h(Input, { placeholder: 'placeholder' }),
      h(Input, { disabled: true, defaultValue: 'disabled' })) }),

  h(Sectie, { titel: 'Card', kind:
    h(Card, { className: 'max-w-sm' },
      h(CardHeader, null, h(CardTitle, null, 'Kaarttitel')),
      h(CardContent, null,
        h('p', { className: 'text-sm text-muted-foreground' }, 'Tekst op een card-oppervlak.'),
        h(Separator, { className: 'my-3' }),
        h('p', { className: 'text-dense' }, 'text-dense — de 13px-stap'))) }),

  h(Sectie, { titel: 'Typografie', kind:
    h('div', { className: 'space-y-1' },
      (['2xs','xs','dense','sm','base','lg','xl','2xl'] as const).map((s) =>
        h('p', { className: `text-${s}`, key: s }, `text-${s} — Aa Bb 0123 €1.234,56`))) }),

  // Let op het teken: bij direction 'out' is een POSITIEF bedrag de uitgave (rood,
  // met een min ervoor) en een negatief bedrag juist een creditering (groen). Dat is
  // wat isInflow() doet, en de app geeft uitgaven dan ook positief door.
  h(Sectie, { titel: 'SectionBar', kind: h('div', { className: 'space-y-1 max-w-lg' },
    h(SectionBar, { label: 'Inkomsten', amount: 2116, direction: 'in', onAdd: () => {} }),
    h(SectionBar, { label: 'Vaste uitgaves', amount: 6124.61, direction: 'out', showPaid: false, onFilterToggle: () => {}, onAdd: () => {} }),
    h(SectionBar, { label: 'Uitgaves met creditering', amount: -50, direction: 'out' }),
    h(SectionBar, { label: 'Beginsaldo', amount: 22728, direction: 'neutral' }),
    h(SectionBar, { label: 'Nul', amount: 0, direction: 'out' }),
    h(SectionBar, { label: 'Zonder bedrag' })) }),

  h(Sectie, { titel: 'StartBalanceRow', kind: h('div', { className: 'space-y-1 max-w-lg' },
    h(StartBalanceRow, { balance: 22728, onChange: () => {} }),
    h(StartBalanceRow, { balance: -1250.5 })) }),

  h(Sectie, { titel: 'BalanceFooter — de vier standen', kind:
    h('div', { className: 'grid grid-cols-2 gap-3 max-w-3xl' },
      h('div', null, h(BalanceFooter, { delta: 500, total: 4074.62, uncovered: 0, hasBuffer: true, showUncovered: false })),
      h('div', null, h(BalanceFooter, { delta: -900, total: 120, uncovered: 0, hasBuffer: true, showUncovered: true })),
      h('div', null, h(BalanceFooter, { delta: -900, total: 0, uncovered: 780.25, hasBuffer: true, showUncovered: true })),
      h('div', null, h(BalanceFooter, { delta: 0, total: 0, uncovered: 0, hasBuffer: false, showUncovered: false }))) }),

  h(Sectie, { titel: 'RunwayCard — te weinig data, gezond, krap, geen tekort', kind:
    h('div', { className: 'grid grid-cols-2 gap-3 max-w-3xl' },
      h(RunwayCard, { runway: { months: null, buffer: 0, netBurn: 0, closedMonths: 1, hasEnoughData: false } }),
      h(RunwayCard, { runway: { months: 9.4, buffer: 12000, netBurn: 1280, closedMonths: 6, hasEnoughData: true } }),
      h(RunwayCard, { runway: { months: 1.2, buffer: 1500, netBurn: 1250, closedMonths: 4, hasEnoughData: true } }),
      h(RunwayCard, { runway: { months: null, buffer: 8000, netBurn: 0, closedMonths: 5, hasEnoughData: true } })) }),
);

// ── Pagina ───────────────────────────────────────────────────────────────────

const cssDir = `${ROOT}.next/static/css`;
let cssFiles: string[] = [];
try {
  cssFiles = readdirSync(cssDir).filter((f) => f.endsWith('.css'));
} catch {
  throw new Error(`Geen ${cssDir} — draai eerst \`pnpm --filter cashflow build\`.`);
}
if (cssFiles.length === 0) throw new Error(`Geen gebouwde CSS in ${cssDir} — eerst builden.`);
const css = cssFiles.map((f) => readFileSync(`${cssDir}/${f}`, 'utf8')).join('\n');

// Eén kolom, want de app draait alleen in light. De rollaag komt uit het :root-blok
// van theme.css; er staat geen mode-class op.
const kolom = () =>
  `<div class="bg-background text-foreground p-6 min-w-0">
     ${renderToStaticMarkup(h(Inhoud))}
   </div>`;

const html = `<!doctype html><html lang="nl"><head><meta charset="utf-8">
<title>umanex — rollaag en componenten</title>
<style>${css}</style>
<style>
  html { color-scheme: light; }
  body { margin: 0; font-family: var(--font-sans, ui-sans-serif), system-ui, sans-serif; }
</style>
</head><body>
${kolom()}
</body></html>`;

const out = process.argv[2] ?? `${ROOT}.screens-preview.html`;
writeFileSync(out, html);
console.log(`✓ ${ROLLEN.length} rollen + componenten → ${out}`);
