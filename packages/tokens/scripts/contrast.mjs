#!/usr/bin/env node
/**
 * Contrast-check op de rollaag.
 *
 * Waarom dit bestaat: de twee echte a11y-fouten van de token-refactor zaten allebei
 * in de tokens, niet in een component. `finance.total` was in dark 1.21:1 op een card,
 * en `--primary` haalde 4.27:1 als tekst op een `bg-muted`-rij. Beide waren met een
 * rekensom te vinden, maar werden pas gevonden door met de hand in een browserconsole
 * te meten — drie keer met een meetfout onderweg.
 *
 * Deze check draait op `build/theme.css` en heeft dus geen browser nodig. Hij is een
 * SUPERSET: hij weet niet welke combinaties de apps echt gebruiken, maar toetst elke
 * combinatie die volgens de rollaag mag voorkomen. Faalt hij, dan is het een echte
 * fout; slaagt hij, dan is er nog steeds ruimte voor component-specifieke fouten die
 * alleen een DOM-sweep ziet.
 *
 * Wat hij NIET dekt: kleuren die in een component gemengd worden (alpha-modifiers als
 * `bg-primary/50`), opacity op een ouder, en tekst boven een afbeelding of gradient.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = join(HERE, '../build/theme.css');

const AA_NORMAAL = 4.5; // WCAG 2.1 AA voor tekst < 18.66px bold / < 24px
const AA_GROOT = 3.0;

// --- Wat er getoetst wordt ---------------------------------------------------

// 1. Gepaarde rollen: een vlak met zijn eigen tekstkleur. Dat is de knop/badge-vorm.
//    shadcns conventie is `x` + `x-foreground`, dus de paren volgen uit de namen.
const PAAR_SUFFIX = '-foreground';

// 2. Vrije tekstrollen op neutrale oppervlakken. Deze kleuren staan als tekst op een
//    achtergrond die ze niet zelf bepalen — daar zit de faalklasse die we misten.
const TEKST_ROLLEN = [
  'foreground',
  'muted-foreground',
  'primary',           // links en accenttekst
  'destructive',       // foutmeldingen; 19× als tekst in cashflow
  'finance-positive',
  'finance-negative',
  'finance-deferred',
  'finance-deferred-strong',
  'finance-total',
];

// Elk oppervlak waar vrije tekst op kan landen. `muted` hoort er expliciet bij: dat is
// de zebra-rij en het lichtste oppervlak, en juist daar zakte primary door de drempel.
const OPPERVLAKKEN = ['background', 'card', 'popover', 'muted'];

// Rollen die per definitie een VLAK zijn en nooit tekst — niet als tekstrol toetsen.
const ALLEEN_VLAK = new Set(['finance-negative-surface', 'overlay-scrim', 'border', 'input', 'ring']);

// --- Parsen ------------------------------------------------------------------

function parseBlokken(css) {
  const modes = {};
  for (const m of css.matchAll(/(^|\n)(:root|\.dark)\s*\{([^}]*)\}/g)) {
    const naam = m[2] === ':root' ? 'light' : 'dark';
    const rollen = {};
    for (const d of m[3].matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) rollen[d[1]] = d[2].trim();
    modes[naam] = rollen;
  }
  // .dark erft alles wat hij niet zelf zet (zoals --radius, dat :root-only is).
  if (modes.light && modes.dark) modes.dark = { ...modes.light, ...modes.dark };
  return modes;
}

// "H S% L%" -> [r,g,b]. Alles wat geen triplet is (alpha-kleuren) geeft null.
function hslTripletNaarRgb(waarde) {
  const m = waarde.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  if (!m) return null;
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100];
  const a = s * Math.min(l, 1 - l);
  const kanaal = (n) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return [kanaal(0), kanaal(8), kanaal(4)];
}

const lum = (rgb) => {
  const c = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// --- Uitvoeren ---------------------------------------------------------------

const css = await readFile(THEME, 'utf-8');
const modes = parseBlokken(css);
if (!Object.keys(modes).length) throw new Error(`[contrast] geen mode-blokken gevonden in ${THEME}`);

const fouten = [];
const gecontroleerd = [];

for (const [mode, rollen] of Object.entries(modes)) {
  const rgb = (naam) => {
    const w = rollen[naam];
    return w === undefined ? undefined : hslTripletNaarRgb(w);
  };

  // 1. gepaarde rollen
  for (const naam of Object.keys(rollen)) {
    if (!naam.endsWith(PAAR_SUFFIX)) continue;
    const basis = naam.slice(0, -PAAR_SUFFIX.length);
    const vlak = rgb(basis);
    const tekst = rgb(naam);
    if (!vlak || !tekst) continue; // alpha-kleur of onbekende basis
    const r = ratio(vlak, tekst);
    gecontroleerd.push([mode, `${naam} op ${basis}`, r]);
    if (r < AA_NORMAAL) {
      fouten.push({ mode, wat: `${naam} op ${basis}`, r, drempel: AA_NORMAAL, soort: 'paar' });
    }
  }

  // 2. vrije tekst op elk neutraal oppervlak
  for (const t of TEKST_ROLLEN) {
    if (ALLEEN_VLAK.has(t)) continue;
    const tekst = rgb(t);
    if (!tekst) continue;
    for (const s of OPPERVLAKKEN) {
      const vlak = rgb(s);
      if (!vlak) continue;
      const r = ratio(tekst, vlak);
      gecontroleerd.push([mode, `${t} op ${s}`, r]);
      if (r < AA_NORMAAL) {
        fouten.push({ mode, wat: `${t} op ${s}`, r, drempel: AA_NORMAAL, soort: 'tekst' });
      }
    }
  }
}

if (fouten.length) {
  console.error(`\n✗ contrast: ${fouten.length} combinatie(s) onder AA\n`);
  for (const f of fouten) {
    console.error(`  [${f.mode}] ${f.wat}`);
    console.error(`      ${f.r.toFixed(2)}:1, nodig ${f.drempel}:1`);
    console.error(
      f.soort === 'paar'
        ? `      Een vlak met zijn eigen tekstkleur — pas de foreground aan, of maak het vlak donkerder/lichter.\n`
        : `      Deze tekstrol landt op dit oppervlak. In dark hoort een lichtere primitive, in light een donkerdere.\n`
    );
  }
  console.error(`  Grote tekst (>=24px of >=18.66px bold) mag ${AA_GROOT}:1 — die uitzondering zit`);
  console.error(`  bewust niet in deze check: de rollaag weet niet hoe groot de tekst wordt.\n`);
  process.exit(1);
}

const laagste = gecontroleerd.sort((a, b) => a[2] - b[2])[0];
console.log(
  `✓ contrast: ${gecontroleerd.length} combinaties boven AA ` +
    `(krapste: ${laagste[1]} in ${laagste[0]}, ${laagste[2].toFixed(2)}:1)`
);
