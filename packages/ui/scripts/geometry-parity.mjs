#!/usr/bin/env node
/**
 * geometry-parity.mjs — de maat-as tussen Figma en de browser, per variant-node.
 *
 * `figma-sync-check.mjs` toetst namen, assen, tokenwaarden en typografie-herkomst.
 * `geometry-check.mjs` toetst de gerenderde maten tegen een basislijn van zichzelf.
 * Geen van beide legt de twee kanten naast elkaar. Dit script doet dat.
 *
 * De join-sleutel zijn de variant-nodes uit `figma/geometry.figma.json` (68 stuks): een
 * Figma-variant heet `variant=default, size=sm, disabled=false`, en precies die assen zijn
 * de args van de Storybook-playground. Zonder die nodes bestond de koppeling niet — dat was
 * tot 2026-09-07 het gat waardoor deze as niet gebouwd kón worden.
 *
 * WAT ER VERGELEKEN WORDT, en waarom juist dit:
 *   hoogte · horizontale padding · gap · radius · border-breedte · opacity · vulling/rand
 *
 * WAT ER BEWUST BUITEN BLIJFT:
 *   · BREEDTE — tekstgedreven. Figma's tekstengine en Chromium's font-metrics geven andere
 *     getallen bij identieke tekst; gemeten in CI als zestien valse verschillen op één dag.
 *   · VERTICALE PADDING — bij een vaste hoogte bepaalt die de doos niet. Figma zet 0 met een
 *     frame van 40px, de code zet `py-2` binnen `h-10`. Beide renderen 40. Vergelijken zou
 *     op elke knop een verschil geven dat er niet is.
 *   · KLEUR, SCHADUW, ICOONVORM — daarvoor is een beeldvergelijking nodig, en die is in
 *     Chromium geen identiteitstoets (≤18px AA-ruis, umanex-os LEARNINGS 2026-08-25). Wel
 *     vergeleken wordt de AANWEZIGHEID van een vulling, rand of effect: een getal dat niets
 *     tekent is anders ook een groene meting.
 *
 * Gebruik:  node scripts/geometry-parity.mjs [--verbose]
 * Vereist `pnpm --filter @umanex/ui build-storybook`.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ui = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = join(ui, 'storybook-static');
const VERBOSE = process.argv.includes('--verbose');

/**
 * Component set → story-id én de selector van het component zélf.
 *
 * De selector is niet te raden. Elke story zit achter dezelfde decorator uit `preview.tsx`
 * (`div.bg-background.p-6`), en bij Checkbox, Slider en Separator zit het component nóg een
 * of twee niveaus dieper in een voorbeeldopstelling. De eerste versie van dit script nam het
 * eerste kind van `#storybook-root` en mat daardoor 72px hoog met 24px padding voor élke
 * variant — de decorator, niet het component. Deze selectors zijn afgelezen uit de
 * gerenderde DOM, niet afgeleid uit de code.
 */
const STORY = {
  Badge:       { id: 'componenten-badge--playground',      sel: '[class*="rounded-full"]' },
  Button:      { id: 'componenten-button--playground',     sel: 'button' },
  Checkbox:    { id: 'componenten-checkbox--playground',   sel: 'button[role="checkbox"]' },
  Input:       { id: 'componenten-input--playground',      sel: 'input' },
  // De select zelf, niet de omhulling: die draagt de rand, de padding (pl-3 pr-9) en de
  // hoogte. Het pijltje staat absoluut en telt niet mee in de doos — zo ook in Figma.
  NativeSelect: { id: 'componenten-nativeselect--playground', sel: 'select' },
  Textarea:    { id: 'componenten-textarea--playground',   sel: 'textarea' },
  // De story volgt de variant: één vaste story zou de verticale variant tegen de
  // horizontale render leggen (gemeten: Figma 80 tegen code 1 — mijn harnas, geen drift).
  Separator:   { perVariant: v => ({
                   id: `componenten-separator--${v.split('=')[1]}`,
                   sel: `[data-orientation="${v.split('=')[1]}"]`,
                   // `h-full w-[1px]` bij vertical: de hoogte ís die van de ouder, dus een
                   // vergelijking meet de story-opstelling en niet het component.
                   nietVergelijkbaar: v.includes('vertical') ? ['hoogte'] : [] }) },
  // Slider: hoogte NIET vergelijkbaar. Figma's frame is 20px hoog omdat het de thumb omvat;
  // de root in code is 8px (de track, h-2) met een absoluut gepositioneerde thumb van h-5
  // die buiten de doos valt. Twee verschillende dozen om hetzelfde ding — gemeten 20 tegen 8.
  Slider:      { id: 'componenten-slider--playground', sel: '[class*="touch-none"]',
                 nietVergelijkbaar: ['hoogte'] },
  // state komt uit Radix' data-state, niet uit een prop — geen playground met deze as.
  TabsTrigger: null,
  // mode is interne useState, geen prop. Zelfde uitsluiting als FIGMA_ONLY in de sync-guard.
  ThemeToggle: null,
};

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.png': 'image/png' };
function serve(root) {
  return new Promise(res => {
    const s = createServer((req, rep) => {
      const pad = join(root, decodeURIComponent(req.url.split('?')[0]));
      if (!existsSync(pad) || statSync(pad).isDirectory()) { rep.statusCode = 404; return rep.end(); }
      rep.setHeader('content-type', MIME[extname(pad)] ?? 'application/octet-stream');
      rep.end(readFileSync(pad));
    });
    s.listen(0, '127.0.0.1', () => res({ server: s, poort: s.address().port }));
  });
}

/** `variant=default, size=sm, disabled=false` → Storybook-args. Booleans krijgen `!`. */
const argsVan = naam => naam.split(',').map(p => {
  const [k, v] = p.trim().split('=');
  return `${k}:${v === 'true' || v === 'false' ? '!' + v : v}`;
}).join(';');

const meet = (sel) => {
  const root = document.querySelector('#storybook-root');
  const treffers = [...(root ? root.querySelectorAll(sel) : [])];
  if (!treffers.length) return { fout: `0 treffers op '${sel}'` };
  // Tel eerst. Meer dan één treffer betekent niet meteen een fout — de vertical-story van
  // Separator rendert er twee — maar je mag er pas een eigenschap van aflezen als ze
  // aantoonbaar dezelfde doos zijn. Anders zegt de meting iets over een willekeurige node.
  if (treffers.length > 1) {
    const doos = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      return [Math.round(r.height * 100) / 100, c.padding, c.borderRadius, c.borderWidth, c.opacity].join('|'); };
    const eerste = doos(treffers[0]);
    if (!treffers.every(e => doos(e) === eerste))
      return { fout: `${treffers.length} treffers op '${sel}' met verschillende dozen` };
  }
  const el = treffers[0];
  const meervoud = treffers.length > 1 ? treffers.length : 0;
  const s = getComputedStyle(el), r = el.getBoundingClientRect();
  const kleurZichtbaar = c => c && c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent';
  return {
    h: Math.round(r.height * 100) / 100,
    padX: [parseFloat(s.paddingRight), parseFloat(s.paddingLeft)],
    gap: s.columnGap === 'normal' ? 0 : parseFloat(s.columnGap) || 0,
    r: parseFloat(s.borderTopLeftRadius),
    bw: parseFloat(s.borderTopWidth),
    op: Math.round(parseFloat(s.opacity) * 100) / 100,
    fills: kleurZichtbaar(s.backgroundColor) ? 1 : 0,
    strokes: (parseFloat(s.borderTopWidth) > 0 && kleurZichtbaar(s.borderTopColor)) ? 1 : 0,
    eff: s.boxShadow && s.boxShadow !== 'none' ? 1 : 0,
    meervoud,
  };
};

/**
 * Bekende afwijkingen: gemeten verschillen die geen fout in dit script zijn maar een echt
 * verschil tussen de twee kanten, met de richting van de oplossing erbij. Tweezijdig, net
 * als BEKENDE_GATEN in de dekkings-as: een nieuw verschil faalt, én een verschil dat is
 * opgelost faalt óók, zodat de lijst niet stil veroudert.
 */
const BEKENDE_AFWIJKINGEN = {
  'Badge/variant=default hoogte': 'code geeft élke Badge `border` (1px, transparant op de gevulde varianten) → 22px; Figma tekent alleen op `outline` een stroke → 20px. Code is de bron, dus Figma hoort een transparante 1px-stroke te krijgen.',
  'Badge/variant=secondary hoogte': 'idem — transparante border in de code, geen stroke in Figma',
  'Badge/variant=destructive hoogte': 'idem — transparante border in de code, geen stroke in Figma',
  'Badge/variant=success hoogte': 'idem — transparante border in de code, geen stroke in Figma',
  'Badge/variant=warning hoogte': 'idem — transparante border in de code, geen stroke in Figma',
};

// `--figma=<pad>` leest een andere Figma-meting — voor de tegenproef in Figma zelf, zodat de echte
// lezing niet overschreven hoeft te worden om een gemuteerde te toetsen.
const figmaFlag = process.argv.find(a => a.startsWith('--figma='));
const fig = JSON.parse(readFileSync(figmaFlag ? figmaFlag.slice('--figma='.length) : join(ui, 'figma/geometry.figma.json'), 'utf8'));

/**
 * DE PAGINA'S VAN DE BUILDER — recursief, node per node, tegen figma/build-spec.min.json.
 *
 * De legacy-sets hierboven worden per WORTEL tegen de browser gelegd, met een handgeschreven
 * selector per set. Voor de componenten die scripts/figma/ bouwt bestaat een betere referentie: de
 * min-spec, die zelf een meting van de browser is en per node dezelfde velden draagt. Zo wordt elke
 * node vergeleken, niet alleen de wortel — een padding drie niveaus diep valt anders nooit op.
 *
 * Buiten de vergelijking, en waarom: BREEDTE (tekstgedreven, zie de kop), de HOOGTE VAN EEN TEKST
 * die Figma zelf bepaalt (`WIDTH_AND_HEIGHT` — dan meet je twee tekstengines, niet de bouw), en de
 * INHOUD VAN EEN ICOON (vectorpaden uit de SVG-import, niet uit de spec). Een Check 0 op inhoud
 * doet figma/toets-batch.js, tegen een DOM-telling buiten de walker om.
 */
const TEKST_HOOGTE_VAST = 8, VULLING = 1, RAND = 2, EFFECT = 4;
function vergelijkPaginas(paginas, spec) {
  const uit = []; let nodes = 0, varianten = 0;
  const nul4 = [0, 0, 0, 0];
  const dichtbij = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.51;
  // Opacity is een fractie, geen pixel: met 0,51 viel elk verschil tot en met een halve dekking
  // stil binnen de tolerantie (gemeten 2026-09-16 — de sluitknop van Dialog op 0,8 in Figma tegen
  // 0,7 in de spec gaf groen). Daarom een eigen tolerantie.
  const dichtbijFractie = (a, b) => Math.abs(Number(a) - Number(b)) <= 0.01;
  function loop(f, s, pad, isWortel) {
    nodes++;
    const [naam, type, h, padding, gap, radius, rand, opacity, vlaggen, layoutMode, kinderen = []] = f;
    const tekst = type === 'TEXT';
    const verschil = (wat, a, b) => uit.push(`${pad} ${wat}: Figma ${a} tegen spec ${b}`);
    if (!isWortel && naam !== s.naam) verschil('naam', naam, s.naam);
    if (!tekst || (vlaggen & TEKST_HOOGTE_VAST)) { if (!dichtbij(h, s.h)) verschil('hoogte', h, s.h); }
    if (!dichtbijFractie(opacity, s.opacity ?? 1)) verschil('opacity', opacity, s.opacity ?? 1);
    if (tekst || s.svg) return;
    const P = s.padding ?? nul4, R = s.radius ?? nul4;
    ['boven', 'rechts', 'onder', 'links'].forEach((z, i) => { if (!dichtbij(padding[i], P[i])) verschil(`padding-${z}`, padding[i], P[i]); });
    if (layoutMode !== 'NONE' && !dichtbij(gap, s.gap ?? 0)) verschil('gap', gap, s.gap ?? 0);
    ['lb', 'rb', 'ro', 'lo'].forEach((z, i) => { if (!dichtbij(radius[i], R[i])) verschil(`radius-${z}`, radius[i], R[i]); });
    const Z = s.border ? (s.borderZijden ?? [s.border, s.border, s.border, s.border]) : nul4;
    ['boven', 'rechts', 'onder', 'links'].forEach((z, i) => { if (!dichtbij(rand[i], Z[i])) verschil(`rand-${z}`, rand[i], Z[i]); });
    if (!!(vlaggen & VULLING) !== !!s.bg) verschil('vulling', vlaggen & VULLING ? 1 : 0, s.bg ? 1 : 0);
    if (!!(vlaggen & EFFECT) !== !!s.schaduwStyle) verschil('effect', vlaggen & EFFECT ? 1 : 0, s.schaduwStyle ? 1 : 0);
    const sk = s.k ?? [];
    if (kinderen.length !== sk.length) { verschil('kinderen', kinderen.length, sk.length); return; }
    kinderen.forEach((k, i) => loop(k, sk[i], `${pad}>${sk[i].naam ?? i}`, false));
  }
  for (const [comp, p] of Object.entries(paginas ?? {})) {
    const c = spec.componenten?.[comp];
    if (!c) { uit.push(`${comp}: pagina van de builder zonder component in build-spec.min.json`); continue; }
    for (const v of c.varianten) {
      const f = p.varianten[v.naam];
      if (!f) { uit.push(`${comp}/${v.naam}: variant staat in de spec maar niet in Figma`); continue; }
      varianten++;
      loop(f, v.boom, `${comp}/${v.naam}`, true);
    }
    for (const naam of Object.keys(p.varianten)) if (!c.varianten.some(v => v.naam === naam)) uit.push(`${comp}/${naam}: variant staat in Figma maar niet in de spec`);
  }
  return { verschillen: uit, nodes, varianten };
}
const SPEC_MIN = existsSync(join(ui, 'figma/build-spec.min.json')) ? JSON.parse(readFileSync(join(ui, 'figma/build-spec.min.json'), 'utf8')) : null;

if (process.argv.includes('--selftest')) {
  // Tegenproef op de recursie, zonder browser: de gecommitte meting moet groen zijn, en een
  // mutatie diep in de boom moet rood worden op precies dat pad.
  const kopie = () => JSON.parse(JSON.stringify(fig.paginas ?? {}));
  const r0 = vergelijkPaginas(fig.paginas, SPEC_MIN);
  const eisen = [['controle: de gecommitte meting is groen', r0.verschillen.length === 0 && r0.nodes > 0, r0.verschillen.slice(0, 3).join(' | ') || `${r0.nodes} nodes`]];
  const p1 = kopie(); const dialoog = p1.Dialog?.varianten?.default;
  if (dialoog) {
    dialoog[10][1][10][0][3][3] += 4;                        // footer > eerste knop: padding-links +4
    const r1 = vergelijkPaginas(p1, SPEC_MIN);
    eisen.push(['padding +4 op een knop drie niveaus diep: precies één verschil', r1.verschillen.length === 1 && /footer>button padding-links/.test(r1.verschillen[0]), r1.verschillen.join(' | ')]);
    const p2 = kopie(); p2.Dialog.varianten.default[10].pop();   // de sluitknop weg
    const r2 = vergelijkPaginas(p2, SPEC_MIN);
    const p3 = kopie(); p3.Dialog.varianten.default[10].find(k => k[0] === 'close')[7] = 0.8;
    const r3 = vergelijkPaginas(p3, SPEC_MIN);
    eisen.push(['opacity 0,7 -> 0,8: rood (een fractie, geen pixel)', r3.verschillen.length === 1 && /close opacity/.test(r3.verschillen[0]), r3.verschillen.join(' | ')]);
    eisen.push(['een verdwenen kind: rood op kinderen', r2.verschillen.some(v => /kinderen: Figma 2 tegen spec 3/.test(v)), r2.verschillen.join(' | ')]);
  } else eisen.push(['Dialog staat in geometry.figma.json (positieve controle)', false, 'geen Dialog-pagina']);
  for (const [naam, ok, detail] of eisen) console.log(`${ok ? '  ok' : 'FOUT'}  ${naam}${ok ? '' : `\n        ${detail}`}`);
  process.exit(eisen.every(e => e[1]) ? 0 : 1);
}

const { server, poort } = await serve(STATIC);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const verschillen = [], overgeslagen = [], onmeetbaar = new Set(), bekend = new Set();
let getoetst = 0;
for (const [set, varianten] of Object.entries(fig.gemeten)) {
  const cfg = STORY[set];
  if (!cfg) { overgeslagen.push(`${set}: geen playground met deze assen als props`); continue; }
  for (const [naam, f] of Object.entries(varianten)) {
    const story = cfg.perVariant ? { ...cfg, ...cfg.perVariant(naam) } : cfg;
    const url = `http://127.0.0.1:${poort}/iframe.html?id=${story.id}&viewMode=story&args=${encodeURIComponent(argsVan(naam))}`;
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const c = await page.evaluate(meet, story.sel);
    if (!c) { verschillen.push(`${set}/${naam}: story rendert niets`); continue; }
    if (c.fout) { verschillen.push(`${set}/${naam}: ${c.fout}`); continue; }
    if (c.meervoud) onmeetbaar.add(`${set}: ${c.meervoud} identieke exemplaren in de story, eerste gemeten`);
    getoetst++;
    const paren = [
      ['hoogte', f.h, c.h], ['radius', f.r === 9999 ? c.r : f.r, c.r],
      ['padding-links', f.pad[3], c.padX[1]], ['padding-rechts', f.pad[1], c.padX[0]],
      ['gap', f.gap, c.gap], ['opacity', f.op, c.op],
      ['vulling', f.fills > 0 ? 1 : 0, c.fills], ['rand', f.strokes > 0 ? 1 : 0, c.strokes],
      ['effect', f.eff > 0 ? 1 : 0, c.eff],
    ];
    for (const [wat, a, b] of paren) {
      if (story.nietVergelijkbaar?.includes(wat)) { onmeetbaar.add(`${set}: ${wat}`); continue; }
      const sleutel = `${set}/${naam} ${wat}`;
      // Dezelfde val als in `vergelijkPaginas`: opacity is een fractie, dus 0,51 liet elk verschil
      // tot een halve dekking door. Tot 2026-09-16 kon deze as een opacity-afwijking niet zien.
      const afwijkt = Math.abs(Number(a) - Number(b)) > (wat === 'opacity' ? 0.01 : 0.51);
      if (afwijkt && BEKENDE_AFWIJKINGEN[sleutel]) { bekend.add(sleutel); continue; }
      if (!afwijkt && BEKENDE_AFWIJKINGEN[sleutel]) {
        verschillen.push(`${sleutel}: staat als bekende afwijking maar is nu gelijk — haal hem uit BEKENDE_AFWIJKINGEN`);
        continue;
      }
      if (afwijkt) verschillen.push(`${sleutel}: Figma ${a} tegen code ${b}`);
    }
    if (VERBOSE) console.log(`  · ${set}/${naam}: h ${f.h}/${c.h} r ${f.r}/${c.r} pad ${f.pad[3]}/${c.padX[1]} op ${f.op}/${c.op}`);
  }
}
await browser.close(); server.close();

if (!getoetst) { console.error('✗ nul varianten getoetst — de as meet niets.'); process.exit(1); }
const boom = fig.paginas ? vergelijkPaginas(fig.paginas, SPEC_MIN) : { verschillen: [], nodes: 0, varianten: 0 };
verschillen.push(...boom.verschillen);
if (SPEC_MIN) for (const comp of Object.keys(SPEC_MIN.componenten)) if (!fig.paginas?.[comp]) console.log(`  ~~ ${comp}: in de spec, nog niet in Figma gebouwd`);
for (const o of overgeslagen) console.log('  ~~ ' + o);
for (const o of onmeetbaar) console.log('  ~~ onmeetbaar — ' + o);
for (const b of bekend) console.log(`  !!  bekende afwijking — ${b}: ${BEKENDE_AFWIJKINGEN[b]}`);
if (verschillen.length) {
  console.error(`\n✗ geometry-parity — ${verschillen.length} verschil(len) over ${getoetst} varianten:\n`);
  for (const v of verschillen.slice(0, 30)) console.error('  ' + v);
  if (verschillen.length > 30) console.error(`  … en ${verschillen.length - 30} meer`);
  process.exit(1);
}
console.log(`\n✓ geometry-parity: ${getoetst} varianten, Figma en browser gelijk op hoogte, padding, gap, radius, rand, opacity en de aanwezigheid van vulling/rand/effect.`);
console.log(`✓ keten-pagina's: ${boom.varianten} varianten, ${boom.nodes} nodes recursief gelijk aan build-spec.min.json.`);
console.log(`  Niet vergeleken: breedte (tekstgedreven), verticale padding (bij vaste hoogte), en kleur/schaduw/icoonvorm.`);
if (overgeslagen.length) console.log(`  ${overgeslagen.length} set(s) overgeslagen — zie de ~~-regels.`);
