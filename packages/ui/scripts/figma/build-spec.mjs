#!/usr/bin/env node
/**
 * Leidt per component en per variant-combinatie een Figma-bouwspec af uit de GERENDERDE DOM.
 *
 * Adapter `dom-tailwind` op de walker van apps/rowtrack/scripts/figma-build-spec.mjs
 * (2026-09-16). Het spec-schema, de functienamen (`lees`, `bind`, `markeerSlots`, `combinaties`,
 * `meet`) en de poort vóór het schrijven zijn gelijk gehouden, zodat een latere extractie naar
 * een gedeeld pakket een verplaatsing is en geen herontwerp (BACKLOG 2026-09-09). Wat rowtrack
 * voor react-native-web nodig heeft — de StyleSheet-sleutelkaart, spinner- en modal-herkenning,
 * schermen — is NIET meegekopieerd: in de DOM vuurt het nooit, en dode takken zonder tegenproef
 * verouderen onzichtbaar. Wat er in de plaats kwam, staat per plek hieronder.
 *
 * WAAROM UIT DE RENDER. De code is de bron, maar de render is wat de code OPLEVERT — inclusief
 * wat de Tailwind-preset en de tokenbuild ermee doen. Elke waarde hier komt uit een meting.
 *
 * EN ELKE WAARDE BINDT, OF STAAT IN `ongebonden`. Een kleur bindt aan de Theme-rol die de KLASSE
 * noemt (`bg-card`) — niet aan de eerste rol met dezelfde waarde: in light mode delen `background`,
 * `card`, `popover` en `primary-foreground` exact hetzelfde wit. Zegt de klasse rol X en rendert
 * de browser iets anders dan X, dan is dat een FOUT (`klasse-waarde-mismatch`), geen binding.
 *
 * Uitvoer: figma/build-spec.json (gitignored), gelezen door build-prune.mjs.
 *
 *   node scripts/figma/build-spec.mjs [--slots-uit]
 *
 * `--slots-uit` is de NEGATIEVE CONTROLE: hij haalt vóór de meting elke `data-slot` uit de DOM.
 * De walker vindt dan geen wortel, elke component levert nul varianten, en de poort onderaan
 * hoort te weigeren (exit 2) en de bestaande spec ongemoeid te laten.
 */
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { fontSize as TYPO_SIZE, fontWeight as TYPO_WEIGHT, fontFamily as TYPO_FAMILY }
  from '../../../tokens/build/typography.mjs';
import { NIET_VISUEEL, primairVan } from './doel.mjs';
import { paddingRollen, gapRol } from './layout-rollen.mjs';

const UI = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const STATIC = join(UI, 'storybook-static');
const SLOTS_UIT = process.argv.includes('--slots-uit');
const assen = JSON.parse(readFileSync(join(UI, 'figma/story-axes.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(UI, 'figma/manifest.json'), 'utf8'));

// ---------------------------------------------------------------------------
// De rollaag, uit dezelfde bron die de browser rendert.
// ---------------------------------------------------------------------------
/**
 * Waarden uit theme.css, namen uit het manifest. Twee bronnen met elk één taak: theme.css zegt
 * welke kleur de browser voor een rol tekent (de manifest-waarden zijn op 0,1 afgerond, dus een
 * tweede afgeleide), het manifest zegt welke rollen als Figma-variabele BESTAAN — een binding naar
 * een variabele die er niet is, is een binding die de builder stil laat vallen.
 */
function hslNaarRgb(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return { r: 255 * f(0), g: 255 * f(8), b: 255 * f(4), a: 1 };
}
const themeCss = readFileSync(join(UI, '../tokens/build/theme.css'), 'utf8');
const lichtBlok = themeCss.match(/:root\s*\{([^}]*)\}/)?.[1] ?? '';
const ROLLEN = new Map();
for (const [, naam, waarde] of lichtBlok.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) {
  const hsl = waarde.match(/^([\d.]+)\s+([\d.]+)%\s+([\d.]+)%$/);
  const rgba = waarde.match(/^rgba?\(([^)]+)\)$/);
  if (hsl) ROLLEN.set(naam, hslNaarRgb(+hsl[1], +hsl[2], +hsl[3]));
  else if (rgba) { const d = rgba[1].split(',').map(x => parseFloat(x)); ROLLEN.set(naam, { r: d[0], g: d[1], b: d[2], a: d[3] ?? 1 }); }
}
const THEMA = new Set(manifest.collections.Theme.variables);
for (const naam of [...ROLLEN.keys()]) if (!THEMA.has(naam)) ROLLEN.delete(naam);   // --radius en niet-gespiegelde rollen vallen af
if (ROLLEN.size !== THEMA.size) {
  console.error(`rollaag: ${ROLLEN.size} rollen uit theme.css tegen ${THEMA.size} Theme-variabelen in het manifest — meet niets tot die gelijk zijn`);
  process.exit(2);
}
const BASE = manifest.collections.Base.variables;                  // naam -> getal
const TEKSTSTIJLEN = new Map(manifest.textStyles.map(t => [t.name, t]));

const gelijkKleur = (rol, k) => Math.abs(rol.r - k.r) < 0.6 && Math.abs(rol.g - k.g) < 0.6
  && Math.abs(rol.b - k.b) < 0.6 && (rol.a < 1 ? Math.abs(rol.a - k.a) < 0.01 : true);

// ---------------------------------------------------------------------------
// Statische server + browser
// ---------------------------------------------------------------------------
const MIME = { '.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css',
  '.json':'application/json','.svg':'image/svg+xml','.woff2':'font/woff2','.woff':'font/woff',
  '.ttf':'font/ttf','.png':'image/png','.map':'application/json' };
const server = createServer((q, r) => {
  let p = join(STATIC, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end('404'); }
  r.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
});
await new Promise(r => server.listen(0, r));
const poort = server.address().port;
const browser = await chromium.launch();
// Zelfde viewport als scripts/geometry-check.mjs en geometry-parity.mjs: `sm:`-varianten gelden
// dan, en de twee maat-assen meten hetzelfde document.
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });

/** Alle combinaties van de assen, als lijst van {naam, args}. */
function combinaties(assenObj) {
  const namen = Object.keys(assenObj);
  if (!namen.length) return [{ naam: 'default', args: {} }];
  let uit = [{}];
  for (const n of namen) {
    const nieuw = [];
    for (const basis of uit) for (const w of assenObj[n]) nieuw.push({ ...basis, [n]: w });
    uit = nieuw;
  }
  return uit.map(args => ({ naam: namen.map(n => `${n}=${args[n]}`).join(', '), args }));
}
const argsQuery = args => Object.entries(args)
  .map(([k, v]) => `${k}:${typeof v === 'boolean' ? '!' + v : v}`).join(';');

// ---------------------------------------------------------------------------
// De walker — draait in de pagina, levert rauwe waarden. Binden gebeurt in Node.
// ---------------------------------------------------------------------------
const WALKER = ({ primairSlot, rollen }) => {
  const treffers = document.querySelectorAll(`[data-slot="${primairSlot}"]`);
  if (treffers.length !== 1)
    return { fout: `${treffers.length} element(en) met data-slot="${primairSlot}" — verwacht precies 1` };
  const wortel = treffers[0];
  const ROL = new Set(rollen);
  const KAP = 12;
  let weggelatenNodes = 0, weggelatenTekst = 0;
  const overgeslagen = { srOnly: 0, verborgenInvoer: 0 };

  const px = v => { const n = parseFloat(v); return Number.isNaN(n) ? 0 : n; };
  const rgba = v => {
    const m = String(v).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const d = m[1].split(/[\s,/]+/).filter(Boolean).map(x => parseFloat(x));
    return { r: d[0], g: d[1], b: d[2], a: d[3] ?? 1 };
  };

  /**
   * WELKE KLASSEN GELDEN NU. Een Tailwind-klasse draagt voorvoegsels (`data-[state=checked]:`,
   * `disabled:`, `sm:`), en alleen een voorvoegsel dat op dít element in déze toestand waar is,
   * telt mee voor de binding. `hover:`, `focus:`, `group-*`, `peer-*` en arbitraire selectors
   * (`[&_svg]:`, die op een KIND slaan) gelden in de rusttoestand nooit — de hover-kleur van een
   * knop hoort niet de binding van zijn rusttoestand te worden.
   */
  const BP = { sm: 640, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };
  function variantGeldt(el, v) {
    if (v === 'dark') return document.documentElement.classList.contains('dark');
    if (v in BP) return window.innerWidth >= BP[v];
    if (v === 'disabled') return el.matches(':disabled');
    if (v === 'enabled') return el.matches(':enabled');
    if (v === 'checked') return el.matches(':checked');
    if (['first', 'last', 'odd', 'even', 'empty'].includes(v))
      return el.matches({ first: ':first-child', last: ':last-child', odd: ':nth-child(odd)', even: ':nth-child(even)', empty: ':empty' }[v]);
    let m = v.match(/^data-\[([^\]=]+)(?:=([^\]]+))?\]$/);
    if (m) return m[2] === undefined ? el.hasAttribute('data-' + m[1]) : el.getAttribute('data-' + m[1]) === m[2];
    m = v.match(/^aria-\[([^\]=]+)=([^\]]+)\]$/);
    if (m) return el.getAttribute('aria-' + m[1]) === m[2];
    if (/^aria-(checked|disabled|expanded|hidden|pressed|readonly|required|selected)$/.test(v)) return el.getAttribute(v) === 'true';
    return false;
  }
  function klassenVan(el) {
    const uit = [];
    for (const tok of String(el.getAttribute('class') || '').split(/\s+/).filter(Boolean)) {
      const delen = []; let d = 0, huidig = '';
      for (const ch of tok) {
        if (ch === '[') d++;
        if (ch === ']') d--;
        if (ch === ':' && d === 0) { delen.push(huidig); huidig = ''; continue; }
        huidig += ch;
      }
      const basis = huidig.replace(/^!/, '');
      if (delen.every(v => variantGeldt(el, v))) uit.push(basis);
    }
    return uit;
  }
  /** `bg-card/80` -> 'card'; alleen een naam die een rol IS. */
  const rolIn = (klassen, prefix) => {
    for (const k of klassen) {
      const m = k.match(new RegExp(`^${prefix}-(.+?)(?:\\/\\d+)?$`));
      if (m && ROL.has(m[1])) return m[1];
    }
    return null;
  };
  /** De tekstkleur erft — dus de rol staat op het element zelf of op de dichtstbijzijnde voorouder. */
  function geerfdeRol(el, prefix) {
    for (let x = el; x && x !== document.documentElement; x = x.parentElement) {
      const r = rolIn(klassenVan(x), prefix);
      if (r) return r;
    }
    return null;
  }

  /**
   * NIET ELK ELEMENT IS ONTWERP. Twee soorten die de DOM draagt en die in Figma niets tonen:
   *  · `sr-only` — een schermlezerlabel (1×1, clip). De sluitknop van Dialog draagt er één.
   *  · een onzichtbare formulier-invoer die Radix naast een control zet (opacity 0, absoluut,
   *    pointer-events none) zodra hij in een <form> staat.
   * Beide worden geteld, niet stil weggelaten.
   */
  function zichtbaar(k) {
    const c = getComputedStyle(k);
    if (c.display === 'none' || c.visibility === 'hidden') return false;
    const r = k.getBoundingClientRect();
    if (c.position === 'absolute' && r.width <= 1 && r.height <= 1 && /hidden|clip/.test(c.overflow)) { overgeslagen.srOnly++; return false; }
    if (c.position === 'absolute' && parseFloat(c.opacity) === 0 && c.pointerEvents === 'none') { overgeslagen.verborgenInvoer++; return false; }
    return true;
  }

  /**
   * DE LAYOUT, genormaliseerd naar wat Figma's auto-layout kent: een rij of een kolom.
   *
   * In react-native-web is elke View flex; in de DOM niet, en dat is het grootste verschil met de
   * rowtrack-walker. Een blok-element stapelt zijn kinderen verticaal (`CardContent` is een
   * `<div class="p-6">`), en een grid met één kolom doet hetzelfde (`DialogContent` is
   * `grid gap-4`). Beide worden hier een kolom. Een grid met meer kolommen heeft in auto-layout
   * geen vorm: `rasterKolommen` reist mee en de builder meldt het.
   */
  function layoutVan(el, cs) {
    const d = cs.display;
    if (d.includes('flex')) {
      const rij = cs.flexDirection.startsWith('row');
      return { richting: rij ? 'row' : 'column', omgekeerd: cs.flexDirection.endsWith('reverse'),
               gap: px(rij ? cs.columnGap : cs.rowGap), justify: cs.justifyContent, align: cs.alignItems };
    }
    if (d.includes('grid')) {
      const kolommen = cs.gridTemplateColumns === 'none' ? 1 : cs.gridTemplateColumns.trim().split(/\s+/).length;
      if (kolommen > 1) return { richting: null, rasterKolommen: kolommen };
      return { richting: 'column', gap: px(cs.rowGap), justify: cs.alignContent, align: 'stretch' };
    }
    if (['block', 'list-item', 'inline-block', 'flow-root'].includes(d)) return { richting: 'column', gap: 0, justify: 'normal', align: 'stretch' };
    return { richting: null };
  }
  const blokNiveau = d => ['block', 'flex', 'grid', 'list-item', 'table', 'flow-root'].includes(d);

  function lees(el, diepte, ouderRect, isWortel) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const klassen = klassenVan(el);
    // Een expliciete maat per as: dan is FIXED de intentie, en rekt het element niet mee met zijn
    // ouder ook al zegt `align-items: stretch` dat.
    const maat = {
      h: klassen.some(k => /^-?(w|min-w|max-w|size)-/.test(k)) || !!el.style?.width,
      v: klassen.some(k => /^-?(h|min-h|max-h|size)-/.test(k)) || !!el.style?.height,
    };
    const o = {
      tag, w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100,
      slot: el.getAttribute('data-slot') || null,
      klassen, maat,
      padding: [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)],
      marge: [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)],
      radius: [px(cs.borderTopLeftRadius), px(cs.borderTopRightRadius), px(cs.borderBottomRightRadius), px(cs.borderBottomLeftRadius)],
      bg: rgba(cs.backgroundColor),
      backgroundImage: cs.backgroundImage !== 'none' ? cs.backgroundImage.slice(0, 200) : null,
      borderWidths: [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)],
      opacity: parseFloat(cs.opacity),
      boxShadow: cs.boxShadow !== 'none' ? cs.boxShadow : null,
      overflow: cs.overflow,
      positie: cs.position,
      dx: ouderRect ? Math.round((r.left - ouderRect.left) * 100) / 100 : 0,
      dy: ouderRect ? Math.round((r.top - ouderRect.top) * 100) / 100 : 0,
      animatie: cs.animationName !== 'none' ? cs.animationName : undefined,
    };
    o.borderWidth = Math.max(...o.borderWidths);
    {
      const kleuren = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];
      const i = o.borderWidths.findIndex(x => x > 0);
      o.borderColor = i < 0 ? null : rgba(kleuren[i]);
      o.borderKleurenVerschillen = new Set(kleuren.filter((_, j) => o.borderWidths[j] > 0)).size > 1;
    }
    // Een absoluut kind houdt zijn anker: `right-4 top-4` hoort in Figma rechts te blijven hangen
    // als iemand de component breder maakt.
    if (cs.position === 'absolute')
      o.anker = { h: cs.right !== 'auto' && cs.left === 'auto' ? 'MAX' : 'MIN', v: cs.bottom !== 'auto' && cs.top === 'auto' ? 'MAX' : 'MIN' };
    const lay = layoutVan(el, cs);
    Object.assign(o, lay);
    o.rolKlassen = { bg: rolIn(klassen, 'bg'), border: rolIn(klassen, 'border') ?? 'border', tekst: geerfdeRol(el, 'text') ?? 'foreground' };

    /**
     * EEN TRANSFORM IS GEEN STROOM. `translate-x-5` op de thumb van Switch verschuift hem in beeld
     * zonder dat de flex-layout het weet; in Figma's auto-layout bestaat die verschuiving niet, en
     * de thumb zou in beide toestanden links staan. Gemeten 2026-09-16 op de pilot: dezelfde flow-
     * positie voor checked en unchecked. Zo'n kind wordt daarom ABSOLUUT geplaatst op zijn gemeten
     * plek — dat is wat de browser tekent. Een identiteitsmatrix (`translate-x-0`) telt niet.
     */
    if (!isWortel && cs.transform !== 'none' && !new DOMMatrixReadOnly(cs.transform).isIdentity) {
      o.getransformeerd = cs.transform;
      if (o.positie === 'static' || o.positie === 'relative') o.positie = 'absolute';
    }
    // DE SIZING-INTENTIE, per as, uit de OUDER gelezen (zie rowtrack: FILL = rekt mee). Een
    // absoluut kind staat buiten de stroom en rekt dus nergens mee.
    if (!isWortel && el.parentElement && !['absolute', 'fixed'].includes(o.positie)) {
      const p = el.parentElement, pc = getComputedStyle(p), pl = layoutVan(p, pc);
      if (pl.richting) {
        const rij = pl.richting === 'row';
        const flex = pc.display.includes('flex');
        const groei = flex && parseFloat(cs.flexGrow) > 0;
        let strek;
        if (flex) { const zelf = cs.alignSelf !== 'auto' ? cs.alignSelf : pc.alignItems; strek = zelf === 'stretch' || zelf === 'normal'; }
        else if (pc.display.includes('grid')) { const js = cs.justifySelf !== 'auto' ? cs.justifySelf : pc.justifyItems; strek = ['stretch', 'normal', 'legacy'].includes(js); }
        else strek = blokNiveau(cs.display);        // blokstroom: een blok-kind vult de breedte, een inline-kind niet
        const H = rij ? groei : (strek && !maat.h);
        const V = rij ? (strek && !maat.v) : groei;
        o.rekt = (H ? 'H' : '') + (V ? 'V' : '') || null;
        // Een inline-blok in een blokstroom staat links; een flex-kind met eigen align-self wijkt af.
        if (flex && cs.alignSelf !== 'auto' && cs.alignSelf !== pc.alignItems)
          o.zelf = { 'flex-start': 'MIN', start: 'MIN', center: 'CENTER', 'flex-end': 'MAX', end: 'MAX', stretch: 'STRETCH' }[cs.alignSelf] ?? null;
      }
    }

    // EEN ICOON IS EEN BLAD. Een lucide-svg draagt paden die in Figma een vector worden; erin
    // afdalen zou elk pad een frame maken.
    if (tag === 'svg') {
      const kleur = rgba(cs.color);
      const hex = kleur ? '#' + [kleur.r, kleur.g, kleur.b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('') : '#000000';
      o.svg = {
        html: el.outerHTML.replace(/currentColor/g, hex),
        naam: (String(el.getAttribute('class') || '').match(/\blucide-([a-z0-9-]+)/) ?? [])[1] ?? null,
        kleur, streep: parseFloat(el.getAttribute('stroke-width')) || null,
        vulling: el.getAttribute('fill') !== 'none',
      };
      return o;
    }

    const tekstKinderen = [...el.childNodes].filter(n => n.nodeType === 3);
    const scheider = n => n.previousSibling && n.nextSibling && (n.previousSibling.nodeType === 1 || n.nextSibling.nodeType === 1);
    const eigenTekst = tekstKinderen.some(n => n.textContent.trim())
      ? tekstKinderen.filter(n => n.textContent.trim() || scheider(n)).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim()
      : '';
    const veld = tag === 'textarea' || (tag === 'input' && ['text', 'email', 'password', 'search', 'tel', 'url', 'number'].includes(el.type));
    if (eigenTekst || veld) {
      const eersteElement = [...el.childNodes].findIndex(n => n.nodeType === 1);
      const eersteTekst = [...el.childNodes].findIndex(n => n.nodeType === 3 && n.textContent.trim());
      o.tekst = {
        inhoud: veld ? (el.value || el.placeholder || '') : eigenTekst,
        veld: veld || undefined,
        voorop: eersteTekst >= 0 && (eersteElement < 0 || eersteTekst < eersteElement),
        family: cs.fontFamily.replace(/["']/g, '').split(',')[0].trim(),
        size: px(cs.fontSize), gewicht: parseInt(cs.fontWeight, 10),
        lineHeight: cs.lineHeight === 'normal' ? null : px(cs.lineHeight),
        letterSpacing: cs.letterSpacing === 'normal' ? 0 : px(cs.letterSpacing),
        kleur: rgba(cs.color),
        align: cs.textAlign, transform: cs.textTransform,
        inhoudBreedte: veld ? 0 : (() => {
          // Alleen de TEKSTKNOPEN meten, niet de kinderen: bij "tekst + icoon" is de run de tekst.
          let w = 0;
          for (const n of tekstKinderen) { if (!n.textContent.trim()) continue; const rg = document.createRange(); rg.selectNodeContents(n); w += rg.getBoundingClientRect().width; }
          return Math.round(w * 100) / 100;
        })(),
        regelHoogte: (() => {
          const n = tekstKinderen.find(x => x.textContent.trim());
          if (!n) return null;
          const rg = document.createRange(); rg.selectNodeContents(n);
          return Math.round(rg.getBoundingClientRect().height * 100) / 100;
        })(),
      };
    }
    // Een DOOS draagt eigen verf of eigen ruimte. Tekst in een doos wordt in Figma een frame met
    // een label-kind — een knop is geen tekstnode. In RN kwam dit niet voor (tekst staat daar
    // altijd in een eigen <Text>), in de DOM wel: `<button class="px-4 bg-primary">Opslaan</button>`.
    o.doos = (o.bg && o.bg.a > 0) || o.borderWidth > 0 || o.padding.some(x => x > 0)
      || o.radius.some(x => x > 0) || !!o.boxShadow || cs.display.includes('flex') || cs.display.includes('grid');

    if (diepte < KAP) {
      const kids = [...el.children].filter(zichtbaar);
      if (kids.length) o.kinderen = kids.map(k => lees(k, diepte + 1, r, false));
    } else {
      const gekapt = [...el.querySelectorAll('*')].filter(k => getComputedStyle(k).display !== 'none');
      weggelatenNodes += gekapt.length;
      weggelatenTekst += gekapt.filter(k => k.children.length === 0 && k.textContent.trim()).length;
    }
    return o;
  }

  const boom = lees(wortel, 0, null, true);
  const fonts = [...document.fonts].filter(f => f.status === 'loaded').map(f => `${f.family.replace(/["']/g, '')} ${f.weight}`);
  return { boom, weggelatenNodes, weggelatenTekst, overgeslagen, fonts: [...new Set(fonts)] };
};

// ---------------------------------------------------------------------------
// Doorloop
// ---------------------------------------------------------------------------
const spec = { walkerVersie: 3, adapter: 'dom-tailwind', componenten: {}, ongebonden: [], fouten: [], uitgesloten: [],
               overgeslagen: { srOnly: 0, verborgenInvoer: 0 }, weggelatenNodes: 0, weggelatenTekst: 0 };

async function meet(storyId, args, primairSlot) {
  const q = Object.keys(args).length ? `&args=${encodeURIComponent(argsQuery(args))}` : '';
  await page.goto(`http://localhost:${poort}/iframe.html?id=${storyId}&viewMode=story${q}`, { waitUntil: 'networkidle', timeout: 20000 });
  // ANIMATIES UIT, en wachten tot ze echt stil staan. `reducedMotion` alleen volstaat niet:
  // tailwindcss-animate kent geen reduced-motion-variant, dus `animate-in` op DialogContent
  // speelt gewoon — en een meting midden in `zoom-in-95` levert een doos die 5% te klein is.
  await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' });
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  // DE RUSTTOESTAND. Een Radix-overlay zet bij het openen de focus op zijn eerste focusbare
  // element, en `focus-visible:ring-2` tekent dan een ring die de walker als schaduw meet —
  // gemeten 2026-09-16: de knop "Annuleren" in DialogContent kwam binnen met een rode ring.
  // Een component in Figma is de toestand zonder focus; hover en focus zijn bewust geen variant.
  await page.evaluate(() => { if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur(); });
  await page.waitForTimeout(30);
  if (SLOTS_UIT) await page.evaluate(() => document.querySelectorAll('[data-slot]').forEach(e => e.removeAttribute('data-slot')));
  const r = await page.evaluate(WALKER, { primairSlot, rollen: [...ROLLEN.keys()] });
  r.args = await page.evaluate(async (id) => {
    try { const ctx = await window.__STORYBOOK_PREVIEW__?.loadStory?.({ storyId: id }); return ctx?.initialArgs ?? null; }
    catch { return null; }
  }, storyId);
  return r;
}

/** Zie rowtrack: koppel alleen wat ONDUBBELZINNIG is — een waarde die precies één keer als tekst voorkomt. */
function markeerSlots(comp, items, assenObj, fouten) {
  const asNamen = new Set(Object.keys(assenObj ?? {}));
  const gevonden = new Set();
  for (const it of items) {
    for (const [prop, waarde] of Object.entries(it.args ?? {})) {
      if (asNamen.has(prop) || typeof waarde !== 'string' || !waarde.trim()) continue;
      const treffers = [];
      (function loop(n) { if (n.tekst && n.tekst.inhoud === waarde) treffers.push(n); for (const k of n.kinderen ?? []) loop(k); })(it.boom);
      if (treffers.length === 1) { treffers[0].slotProp = prop; gevonden.add(prop); }
      else if (treffers.length > 1) fouten.push(`${comp} [${it.naam}]: prop "${prop}" komt ${treffers.length}x voor als tekst — dubbelzinnig, geen slot`);
    }
  }
  return [...gevonden];
}

/** Tailwind 3-defaults — de bron van `shadow/*`. Geen token in tokens.json (BACKLOG 2026-08-25). */
const SCHADUWEN = {
  sm: [[0, 1, 2, 0, 0.05]],
  default: [[0, 1, 3, 0, 0.1], [0, 1, 2, -1, 0.1]],
  md: [[0, 4, 6, -1, 0.1], [0, 2, 4, -2, 0.1]],
  lg: [[0, 10, 15, -3, 0.1], [0, 4, 6, -4, 0.1]],
  xl: [[0, 20, 25, -5, 0.1], [0, 8, 10, -6, 0.1]],
  '2xl': [[0, 25, 50, -12, 0.25]],
};
/** "rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, …" -> lagen, zonder de lege ring-lagen van Tailwind. */
function schaduwLagen(css) {
  const lagen = [];
  for (const deel of css.split(/,(?![^(]*\))/)) {
    const k = deel.match(/rgba?\(([^)]+)\)/);
    const getallen = deel.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).filter(Boolean).map(parseFloat);
    const kl = k ? k[1].split(/[\s,/]+/).filter(Boolean).map(parseFloat) : [0, 0, 0, 1];
    const [x = 0, y = 0, blur = 0, spread = 0] = getallen;
    const a = kl[3] ?? 1;
    if (a === 0 || (x === 0 && y === 0 && blur === 0 && spread === 0)) continue;
    lagen.push({ x, y, blur, spread, kleur: { r: kl[0], g: kl[1], b: kl[2], a } });
  }
  return lagen;
}

/** Voegt variabele-verwijzingen toe aan een gemeten boom — of meldt waarom niet. */
function bind(node, pad, comp) {
  const meld = (wat, waarde) => spec.ongebonden.push(`${comp} ${pad || 'wortel'}: ${wat} = ${waarde}`);
  const fout = (wat) => spec.fouten.push(`${comp} ${pad || 'wortel'}: ${wat}`);
  const kandidaten = (k) => [...ROLLEN].filter(([, rol]) => gelijkKleur(rol, k)).map(([n]) => n);
  /** Kleur -> { var, opacity } via de rol die de klasse noemt; anders alleen bij één kandidaat. */
  const kleurBinding = (k, klasseRol, wat) => {
    if (!k || k.a === 0) return null;
    if (klasseRol) {
      const rol = ROLLEN.get(klasseRol);
      if (!gelijkKleur(rol, k)) { fout(`klasse-waarde-mismatch — ${wat}: klasse zegt ${klasseRol}, browser rendert rgba(${[k.r, k.g, k.b, k.a].join(',')})`); return null; }
      return { var: `Theme:${klasseRol}`, opacity: rol.a < 1 ? 1 : k.a };
    }
    const c = kandidaten(k);
    if (c.length === 1) return { var: `Theme:${c[0]}`, opacity: ROLLEN.get(c[0]).a < 1 ? 1 : k.a };
    meld(wat, c.length ? `dubbelzinnig (${c.join('|')}) zonder klasse` : `rgba(${[k.r, k.g, k.b, k.a].join(',')})`);
    return null;
  };
  const spacingVar = (v) => {
    const naam = 'spacing-' + String(v / 4).replace('.', '_');
    return BASE[naam] === v ? `Base:${naam}` : null;
  };

  if (node.animatie) fout(`animatie "${node.animatie}" liep nog tijdens de meting — de maat is een meetmoment`);
  if (node.rasterKolommen) meld('grid', `${node.rasterKolommen} kolommen — geen auto-layout-vorm`);

  if (node.bg && node.bg.a > 0) {
    const b = kleurBinding(node.bg, node.rolKlassen.bg, 'achtergrond');
    if (b) { node.bgVar = b.var; node.bgOpacity = b.opacity; }
  }
  if (node.borderWidth > 0 && node.borderColor && node.borderColor.a > 0) {
    const b = kleurBinding(node.borderColor, node.rolKlassen.border, 'randkleur');
    if (b) { node.borderColorVar = b.var; node.borderOpacity = b.opacity; }
    node.borderWidthVar = BASE[`border-${node.borderWidth}`] === node.borderWidth ? `Base:border-${node.borderWidth}` : null;
    if (!node.borderWidthVar) meld('randbreedte', node.borderWidth);
  }
  // Radius per hoek, gebonden via de klasse (`rounded-md` -> radius-md) en de waarde samen:
  // `rounded` (Tailwinds 4 px) valt numeriek samen met radius-sm, maar is geen rol — die zou
  // stil meebewegen als --radius verandert.
  node.radiusVar = node.radius.map((v) => {
    if (!v) return null;
    if (v >= 9999) return 'Base:radius-full';
    const naam = { 8: 'radius-lg', 6: 'radius-md', 4: 'radius-sm' }[v];
    const klasse = naam && node.klassen.some(k => new RegExp(`^rounded(-[a-z]{1,2})?-${naam.slice(7)}$`).test(k));
    if (klasse) return `Base:${naam}`;
    meld('radius', v);
    return null;
  });
  // Een layout-rol in de klasse beslist (p-surface → spacing-surface), mits de browser de waarde
  // van die rol rendert; anders is het een fout, zoals bij een kleurrol. Zonder rol: op waarde.
  const rolVar = (rol, v, wat) => {
    if (BASE[rol] === v) return `Base:${rol}`;
    fout(`klasse-waarde-mismatch — ${wat}: klasse zegt ${rol} (${BASE[rol]}), browser rendert ${v}`);
    return null;
  };
  const padRol = paddingRollen(node.klassen);
  node.paddingVar = node.padding.map((v, i) => (!v ? null : padRol[i] ? rolVar(padRol[i], v, 'padding') : spacingVar(v)));
  node.padding.forEach((v, i) => { if (v && !node.paddingVar[i] && !padRol[i]) meld('padding', v); });
  if (node.gap) {
    const gr = gapRol(node.klassen, ['gap', node.richting === 'row' ? 'gap-x' : 'gap-y']);
    node.gapVar = gr ? rolVar(gr, node.gap, 'gap') : spacingVar(node.gap);
    if (!node.gapVar && !gr) meld('gap', node.gap);
  }
  if (node.opacity < 1) meld('opacity', node.opacity);
  if (node.boxShadow) {
    const lagen = schaduwLagen(node.boxShadow);
    if (lagen.length) {
      const sleutel = Object.entries(SCHADUWEN).find(([, def]) => def.length === lagen.length
        && def.every(([x, y, b, s, a], i) => lagen[i].x === x && lagen[i].y === y && lagen[i].blur === b && lagen[i].spread === s && Math.abs(lagen[i].kleur.a - a) < 0.01))?.[0];
      if (sleutel) { node.schaduwStyle = `shadow/${sleutel}`; node.schaduwLagen = lagen; }
      else meld('schaduw', node.boxShadow.slice(0, 80));
    }
  }
  if (node.backgroundImage) meld('achtergrondafbeelding', node.backgroundImage.slice(0, 60));
  if (node.svg) {
    const b = kleurBinding(node.svg.kleur, node.rolKlassen.tekst, 'icoonkleur');
    if (b) { node.svg.kleurVar = b.var; node.svg.opacity = b.opacity; }
    if (node.svg.streep && node.svg.streep !== BASE['icon-stroke']) meld('icoonstreep', node.svg.streep);
  }
  if (node.tekst) {
    const b = kleurBinding(node.tekst.kleur, node.rolKlassen.tekst, 'tekstkleur');
    if (b) { node.tekst.kleurVar = b.var; node.tekst.opacity = b.opacity; }
    // TEXT STYLE `sans/<stap>-<gewicht>`, alleen wanneer ALLE getallen uit de tokenschaal komen —
    // dezelfde eis als de [typografie]-as van figma-sync-check.mjs. `leading-none` op
    // DialogTitle geeft een regelhoogte die geen token is: dan géén style (een style zou hem
    // stil op de tokenregelhoogte zetten en de hoogte van zijn ouder veranderen), maar een
    // melding — het beeld blijft getrouw en het gat staat telbaar in `ongebonden`.
    const t = node.tekst;
    const stap = Object.entries(TYPO_SIZE).find(([, [rem]]) => Math.abs(parseFloat(rem) * 16 - t.size) < 0.01)?.[0];
    const gewicht = Object.entries(TYPO_WEIGHT).find(([, w]) => +w === t.gewicht)?.[0];
    const lhToken = stap ? parseFloat(TYPO_SIZE[stap][1].lineHeight) * (TYPO_SIZE[stap][1].lineHeight.endsWith('rem') ? 16 : t.size) : null;
    const familieOk = t.family === TYPO_FAMILY.sans;
    const naam = stap && gewicht ? `sans/${stap}-${gewicht}` : null;
    const bestaand = naam ? TEKSTSTIJLEN.get(naam) : null;
    const lsVerwacht = bestaand ? (bestaand.letterSpacing ?? 0) * t.size / 100 : 0;
    const redenen = [];
    if (!familieOk) redenen.push(`familie ${t.family}`);
    if (!stap) redenen.push(`grootte ${t.size}px buiten de schaal`);
    if (!gewicht) redenen.push(`gewicht ${t.gewicht} buiten de schaal`);
    if (lhToken !== null && t.lineHeight !== null && Math.abs(t.lineHeight - lhToken) > 0.01) redenen.push(`regelhoogte ${t.lineHeight} ≠ token ${lhToken}`);
    if (Math.abs(t.letterSpacing - lsVerwacht) > 0.02) redenen.push(`tracking ${t.letterSpacing}px ≠ ${Math.round(lsVerwacht * 100) / 100}px`);
    if (!redenen.length) {
      t.styleRef = naam;
      if (!bestaand) t.styleNieuw = { naam, family: TYPO_FAMILY.sans, gewicht: t.gewicht, fontSize: t.size, lineHeight: lhToken, letterSpacing: 0 };
    } else meld('text style', `${t.size}px/${t.lineHeight ?? 'normal'} ${t.gewicht} — ${redenen.join(', ')}`);
  }
  (node.kinderen ?? []).forEach((k, i) => bind(k, `${pad}>${k.slot ?? k.tag}${i}`, comp));
}

for (const [comp, d] of Object.entries(assen.componenten)) {
  const gebruikteAssen = {};
  for (const [as, waarden] of Object.entries(d.assen)) {
    const sleutel = `${comp}.${as}`;
    if (NIET_VISUEEL[sleutel]) { spec.uitgesloten.push(`${sleutel} — ${NIET_VISUEEL[sleutel]}`); continue; }
    gebruikteAssen[as] = waarden;
  }
  const primair = primairVan(comp);
  const combis = combinaties(gebruikteAssen);
  const varianten = [];
  const fontsGezien = new Set();
  for (const c of combis) {
    const r = await meet(d.storyId, c.args, primair.slot);
    if (r.fout) { spec.fouten.push(`${comp} [${c.naam}]: ${r.fout}`); continue; }
    for (const f of r.fonts ?? []) fontsGezien.add(f);
    bind(r.boom, '', comp);
    spec.overgeslagen.srOnly += r.overgeslagen.srOnly;
    spec.overgeslagen.verborgenInvoer += r.overgeslagen.verborgenInvoer;
    spec.weggelatenNodes += r.weggelatenNodes;
    spec.weggelatenTekst += r.weggelatenTekst;
    varianten.push({ naam: c.naam, args: c.args, boom: r.boom, storyArgs: r.args });
  }
  // FONT-POORT. Zonder het geladen font meet de browser de fallback, en elke tekstbreedte en
  // regelhoogte in de spec is dan van een ánder font — gevuld, geloofwaardig en verkeerd.
  if (varianten.length && ![...fontsGezien].some(f => f.startsWith(TYPO_FAMILY.sans)))
    spec.fouten.push(`${comp}: ${TYPO_FAMILY.sans} niet geladen tijdens de meting (geladen: ${[...fontsGezien].join(', ') || 'niets'}) — tekstmaten zijn van een fallback-font`);
  const slots = markeerSlots(comp, varianten.map(v => ({ naam: v.naam, boom: v.boom, args: v.storyArgs })), gebruikteAssen, spec.fouten);
  spec.componenten[comp] = { storyId: d.storyId, primair, assen: gebruikteAssen, slots, varianten };
  process.stderr.write(`  ${comp}: ${varianten.length}/${combis.length}\n`);
}
await browser.close(); server.close();

// ---- Poort vóór het schrijven ----------------------------------------------------------
// Een component zonder enkele variant is per definitie een meetfout, en een meting die tóch
// wegschrijft vervangt een goede spec door een lege (gemeten in rowtrack, 2026-09-08).
const leeg = Object.entries(spec.componenten).filter(([, d]) => !d.varianten.length).map(([c]) => c);
if (leeg.length || !Object.keys(spec.componenten).length) {
  console.error(`\nGEEN SPEC GESCHREVEN — ${leeg.length} component(en) leverden nul varianten: ${leeg.join(', ')}`);
  console.error(`Eerste fouten:\n  ${spec.fouten.slice(0, 3).join('\n  ')}`);
  console.error('figma/build-spec.json is ONGEWIJZIGD gelaten.');
  process.exit(2);
}
writeFileSync(join(UI, 'figma/build-spec.json'), JSON.stringify(spec, null, 1));
const nVar = Object.values(spec.componenten).reduce((n, c) => n + c.varianten.length, 0);
console.log(`\ncomponenten : ${Object.keys(spec.componenten).length}  (${nVar} variant-nodes)`);
console.log(`uitgesloten : ${spec.uitgesloten.length} as(sen)`);
console.log(`overgeslagen: ${spec.overgeslagen.srOnly} sr-only, ${spec.overgeslagen.verborgenInvoer} verborgen invoer`);
console.log(`dieptekap   : ${spec.weggelatenNodes} node(s) weggekapt, waarvan ${spec.weggelatenTekst} met tekst`);
console.log(`ongebonden  : ${spec.ongebonden.length}`);
for (const o of [...new Set(spec.ongebonden.map(o => o.split(': ').slice(1).join(': ')))].slice(0, 25)) console.log('  ONGEBONDEN ' + o);
console.log(`fouten      : ${spec.fouten.length}`);
for (const f of spec.fouten.slice(0, 20)) console.log('  FOUT ' + f);
if (spec.fouten.length) process.exitCode = 1;
