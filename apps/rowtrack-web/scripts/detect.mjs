/**
 * detect.mjs — de deterministische helft van een UX-audit: wat zonder LLM te meten is.
 *
 * Kopieer dit bestand naar `apps/<app>/scripts/detect.mjs` en zet ernaast een
 * `.detect.config.json` met de routes en het start-commando van die app. Zet daarna de
 * aanroep in de `## Verify-pad`-sectie van `apps/<app>/CLAUDE.md`. "Geen" is daar een
 * geldig antwoord: een app zonder render-pad heeft geen detector, en dat hoort er te
 * staan in plaats van weg te blijven.
 *
 * VIER INSTRUMENTEN, VIER ROLLEN — en één regel die ze alle vier bindt: elke telling
 * draagt zijn noemer, en wat niet gemeten kón worden is een eigen getal, geen stilte.
 *
 *   1. axe-core        structuur en semantiek (WCAG 2.x A/AA + best-practice).
 *                      Óók `incomplete`: axe' "needs review" voor contrast op verlopen,
 *                      alpha en afbeeldingen. Die werd tot 2026-09-14 weggegooid, en
 *                      daarmee was contrast een stille as — de enige categorie waar het
 *                      instrument zelf zegt "ik weet het niet" verdween uit de uitslag.
 *   2. impeccable      maat en overloop: regellengte, tekst-overloop, krappe padding.
 *                      Per regel-id te negeren mét reden in `.impeccable/config.json` —
 *                      niet met `--scope`, want dat is een domeinfilter: het gooit
 *                      `skipped-heading` en `broken-image` weg sámen met de smaakregels.
 *   3. touch targets   geen van beide andere instrumenten meet ze (gemeten 2026-09-11:
 *                      impeccable heeft er geen regel voor, axe' `target-size` laat een
 *                      kleine knop door op de afstand-uitzondering). Drempel uit de
 *                      gedeclareerde norm: WCAG 2.2 AA = 24, AAA/HIG = 44.
 *   4. contrast        alleen effen-op-effen; alles met een verloop, alpha of een
 *                      afbeelding eronder komt terug als `onmeetbaar` mét reden. Dat
 *                      getal is het punt: impeccable's eigen `low-contrast` las een
 *                      alpha-stop als effen kleur en meldde 1.8:1 waar de pixels 7.7:1
 *                      gaven, dus hier wordt niet geraden.
 *
 *   node scripts/detect.mjs                  # verse build, eigen server
 *   node scripts/detect.mjs --no-build       # bestaande build hergebruiken
 *   node scripts/detect.mjs --full           # zonder ignores (tegenproef)
 *   node scripts/detect.mjs --out=.detect-out
 *   node scripts/detect.mjs --target=44      # AAA/HIG in plaats van de geconfigureerde norm
 *
 * Exit 0 = geen bevindingen · 2 = bevindingen · 1 = minstens één meting ontbreekt.
 * Die 1 is geen detail: een run waarin een instrument niet draaide, is geen schone run.
 *
 * DE IN-PAGINA-METING IS OP DRIE KANTEN GETOETST (2026-09-14, Chrome, op de twee fixtures
 * van `evals/ux-audit-geplante-defecten/`):
 *   · vuil @24 → 1 van 5 interactieve elementen te klein (18×18) en 3 tekstnodes op
 *     2,17:1 — dat cijfer klopt met de handberekening voor #b0b0b0 op wit, dus de
 *     contrastformule hier is onafhankelijk bevestigd;
 *   · schoon @24 → 0 en 0: de check kán groen worden, hij staat niet vast op rood;
 *   · schoon @44 → 3 van 5 te klein: de drempel bewéégt de uitkomst, dus `--target=` is
 *     een echte parameter en geen versiering.
 * De axe- en impeccable-helft is overgenomen uit `apps/rowtrack-web/scripts/detect.mjs`
 * (umanex-apps#457), waar twee runs identiek per regel per route waren.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const DEFAULTS = {
  routes: ['/'],
  viewports: [[1280, 800], [390, 844]],
  port: 3104,
  build: ['npx', 'next', 'build'],
  start: ['npx', 'next', 'start', '--port', '{port}'],
  targetMin: 24,
  // Selectors die van de touch-target-meting uitgezonderd zijn, met per app de reden in de
  // Verify-pad-rij. SC 2.5.8 kent een "essential"-uitzondering, en een kaartspeld op zijn
  // echte geografische positie valt daaronder: groter maken verplaatst hem. Gemeten
  // 2026-09-14 op Columba/verkeersanalyse: 148 van de 200 treffers waren
  // `.leaflet-marker-icon`. Zonder deze uitzondering rapporteer je 200 schendingen waarvan
  // er 52 echt zijn — en een klant die dat één keer narekent, gelooft de volgende telling
  // niet meer. Leeg laten is de default: uitzonderen doe je bewust, per app.
  targetExclude: [],
  impeccable: 'impeccable@4.1.0',
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'],
};

const cfgPath = resolve(APP, '.detect.config.json');
let cfg = { ...DEFAULTS };
if (existsSync(cfgPath)) {
  try { cfg = { ...DEFAULTS, ...JSON.parse(readFileSync(cfgPath, 'utf8')) }; }
  catch (e) { console.error(`✗ ${cfgPath} is geen leesbare JSON — ${e.message}`); process.exit(1); }
} else {
  console.log(`· geen .detect.config.json — defaults (routes ${DEFAULTS.routes.join(' ')}, poort ${DEFAULTS.port})`);
}

const args = process.argv.slice(2);
const NO_BUILD = args.includes('--no-build');
const FULL = args.includes('--full');
const OUT = args.find((a) => a.startsWith('--out='))?.slice(6) ?? null;
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? cfg.port);
const TARGET_MIN = Number(args.find((a) => a.startsWith('--target='))?.slice(9) ?? cfg.targetMin);
const BASE = `http://127.0.0.1:${PORT}`;
const { routes: ROUTES, viewports: VIEWPORTS, axeTags: AXE_TAGS } = cfg;

const vpName = ([w, h]) => `${w}x${h}`;
const sub = (a) => a.map((x) => String(x).replace('{port}', String(PORT)));

function portFree(port) {
  return new Promise((res) => {
    const s = createServer()
      .once('error', () => res(false))
      .once('listening', () => s.close(() => res(true)))
      .listen(port, '127.0.0.1');
  });
}

function run(cmd, cmdArgs) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, { cwd: APP, stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exit ${code}`))));
  });
}

/** Als `run`, maar vangt stdout en levert de exit code — impeccable geeft bewust 0/1/2. */
function capture(cmd, cmdArgs) {
  return new Promise((res) => {
    const p = spawn(cmd, cmdArgs, { cwd: APP, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    p.on('exit', (code) => res({ code, out, err }));
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const r = await fetch(url, { redirect: 'manual' }); if (r.status < 500) return true; }
    catch { /* nog niet op */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runImpeccable() {
  const results = []; let failed = false;
  for (const vp of VIEWPORTS) {
    // Geen `--scope`: dat filtert hele domeinen weg, inclusief meetbare regels als
    // `skipped-heading` en `broken-image`. Ruis hoort per regel-id uit te staan, mét
    // reden, in `.impeccable/config.json`. `--full` zet ook die ignores uit.
    const flags = ['detect', '--json', '--viewport', vpName(vp), ...(FULL ? ['--no-config'] : [])];
    const { code, out, err } = await capture('npx', ['--yes', cfg.impeccable, ...flags, ...ROUTES.map((r) => BASE + r)]);
    if (code === 1 || !out.trim()) {
      failed = true;
      console.log(`  ✗ impeccable ${vpName(vp)}: niet gemeten (exit ${code}) — ${err.trim().split('\n').pop() ?? ''}`);
      continue;
    }
    let findings;
    try { findings = JSON.parse(out); }
    catch { failed = true; console.log(`  ✗ impeccable ${vpName(vp)}: geen leesbare JSON`); continue; }
    for (const f of findings) results.push({ viewport: vpName(vp), route: String(f.file ?? '').replace(BASE, ''), ...f });
  }
  return { results, failed };
}

/**
 * In de pagina gemeten, op de gerenderde layout. Twee dingen tegelijk, want ze delen één
 * render: de maat van elk zichtbaar interactief element, en het contrast van elke
 * tekstnode waarvan de achtergrond effen is.
 */
const IN_PAGINA = `(min, uitgezonderd) => {
  const zichtbaar = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0;
  };
  const pad = (el) => {
    const p = [];
    for (let n = el; n && n.nodeType === 1 && p.length < 4; n = n.parentElement) {
      p.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/)[0] : ''));
    }
    return p.join(' > ');
  };

  // ── maat ──────────────────────────────────────────────────────────────────────
  const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=tab], [tabindex]:not([tabindex="-1"])';
  const alle = Array.from(document.querySelectorAll(SEL)).filter(zichtbaar);
  // Uitgezonderde selectors tellen wel in de noemer van "gemeten", maar niet in de
  // bevindingen — anders verdwijnt uit de uitslag dat er iets is uitgezonderd.
  const uit = uitgezonderd.length ? alle.filter((el) => uitgezonderd.some((s) => el.matches(s))) : [];
  const interactief = alle.filter((el) => !uit.includes(el));
  const teKlein = [];
  for (const el of interactief) {
    const r = el.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (w < min || h < min) teKlein.push({ selector: pad(el), w, h, tekst: (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 40) });
  }

  // ── contrast ──────────────────────────────────────────────────────────────────
  const ontleed = (kleur) => {
    const m = String(kleur).match(/rgba?\\(([^)]+)\\)/);
    if (!m) return null;
    const d = m[1].split(',').map((x) => parseFloat(x));
    return { r: d[0], g: d[1], b: d[2], a: d.length > 3 ? d[3] : 1 };
  };
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };

  const laag = [], onmeetbaar = [];
  const loop = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const gezien = new Set();
  let n;
  while ((n = loop.nextNode())) {
    const tekst = n.nodeValue.trim();
    if (!tekst) continue;
    const el = n.parentElement;
    if (!el || gezien.has(el) || !zichtbaar(el)) continue;
    gezien.add(el);
    const s = getComputedStyle(el);
    const vg = ontleed(s.color);
    if (!vg) continue;
    if (vg.a < 1) { onmeetbaar.push({ selector: pad(el), reden: 'tekstkleur met alpha', tekst: tekst.slice(0, 40) }); continue; }

    // Zoek de eerste voorouder met een effen achtergrond. Een verloop, een alpha of een
    // afbeelding onderweg maakt de meting ongeldig — dan is dit onmeetbaar, niet groen.
    let bg = null, reden = null;
    for (let p = el; p; p = p.parentElement) {
      const ps = getComputedStyle(p);
      if (ps.backgroundImage && ps.backgroundImage !== 'none') { reden = 'verloop of afbeelding als achtergrond'; break; }
      const c = ontleed(ps.backgroundColor);
      if (!c || c.a === 0) continue;
      if (c.a < 1) { reden = 'achtergrond met alpha'; break; }
      bg = c; break;
    }
    if (reden) { onmeetbaar.push({ selector: pad(el), reden, tekst: tekst.slice(0, 40) }); continue; }
    if (!bg) bg = { r: 255, g: 255, b: 255, a: 1 };

    const px = parseFloat(s.fontSize);
    const vet = Number(s.fontWeight) >= 700;
    const groot = px >= 24 || (px >= 18.66 && vet);
    const eis = groot ? 3 : 4.5;
    const rr = ratio(vg, bg);
    if (rr < eis) laag.push({ selector: pad(el), ratio: Math.round(rr * 100) / 100, eis, px: Math.round(px), tekst: tekst.slice(0, 40) });
  }

  return {
    interactief: interactief.length, uitgezonderd: uit.length, teKlein,
    tekstnodes: gezien.size, laag, onmeetbaar,
  };
}`;

async function runBrowser() {
  const targets = [], contrast = [], onmeetbaar = [];
  let failed = false, nInteractief = 0, nTekst = 0, nUit = 0;
  const axe = { results: [], passes: 0, incomplete: [] };
  const browser = await chromium.launch({ executablePath: process.env.DETECT_BROWSER || undefined });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle' });

        const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        axe.passes += r.passes.length;
        for (const v of r.violations) {
          axe.results.push({ viewport: vpName(vp), route, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((x) => x.target.join(' ')) });
        }
        // `incomplete` is axe' eigen "ik weet het niet" — meestal contrast op een verloop
        // of een afbeelding. Weggooien maakt van een onbekende een groene.
        for (const v of r.incomplete) {
          axe.incomplete.push({ viewport: vpName(vp), route, id: v.id, nodes: v.nodes.length, help: v.help });
        }

        const m = await page.evaluate(`(${IN_PAGINA})(${TARGET_MIN}, ${JSON.stringify(cfg.targetExclude ?? [])})`);
        nInteractief += m.interactief; nTekst += m.tekstnodes; nUit += m.uitgezonderd;
        for (const t of m.teKlein) targets.push({ viewport: vpName(vp), route, ...t });
        for (const c of m.laag) contrast.push({ viewport: vpName(vp), route, ...c });
        for (const o of m.onmeetbaar) onmeetbaar.push({ viewport: vpName(vp), route, ...o });
      } catch (e) {
        failed = true;
        console.log(`  ✗ ${vpName(vp)} ${route}: niet gemeten — ${String(e.message).split('\n')[0]}`);
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  return { axe, targets, contrast, onmeetbaar, failed, nInteractief, nTekst, nUit };
}

function printGrouped(label, rows, line) {
  const groups = new Map();
  for (const r of rows) {
    const k = `${r.viewport} ${r.route}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  for (const [k, list] of groups) {
    console.log(`  ${k}: ${list.length}`);
    for (const r of list) console.log(`     ${line(r)}`);
  }
  if (!rows.length) console.log(`  (geen ${label}-bevindingen)`);
}

async function main() {
  if (!(await portFree(PORT))) {
    console.error(`✗ Poort ${PORT} is bezet. Dit script start zijn eigen server en mag nooit een`);
    console.error('  draaiend proces overnemen. Stop dat proces of geef --port=<vrij>.');
    process.exit(1);
  }

  if (NO_BUILD) console.log('→ Geen build (--no-build): meet de bestaande build');
  else { console.log(`→ Verse build: ${cfg.build.join(' ')}`); await run(cfg.build[0], cfg.build.slice(1)); }

  console.log(`→ Server op ${BASE}`);
  // Eigen procesgroep: een `npx`-wrapper start de echte server als kleinkind, en een kill
  // op alleen de wrapper laat dat kleinkind op de poort staan — gemeten 2026-09-11: de
  // tweede run weigerde met "poort bezet". De groep als geheel stoppen ruimt beide op.
  const st = sub(cfg.start);
  const server = spawn(st[0], st.slice(1), { cwd: APP, stdio: 'ignore', detached: true });
  const stop = () => {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* groep al weg */ }
    try { server.kill('SIGTERM'); } catch { /* al weg */ }
  };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });
  if (!(await waitForServer(BASE))) { stop(); console.error('✗ Server kwam niet op binnen 60s.'); process.exit(1); }

  console.log(`\n→ impeccable ${cfg.impeccable} — ${FULL ? 'zonder ignores (--full)' : 'met .impeccable/config.json'}`);
  const imp = await runImpeccable();
  const primary = imp.results.filter((r) => r.severity !== 'advisory');
  printGrouped('impeccable', imp.results, (r) => `${String(r.antipattern).padEnd(28)} ${String(r.severity).padEnd(8)} ${(r.snippet ?? '').slice(0, 100)}`);

  console.log(`\n→ browser — axe (${AXE_TAGS.join(', ')}), touch targets ≥ ${TARGET_MIN}px, contrast`);
  const b = await runBrowser();
  printGrouped('axe', b.axe.results, (r) => `${r.id.padEnd(28)} ${String(r.impact).padEnd(8)} n=${r.nodes}  ${r.help.slice(0, 70)}`);
  printGrouped('touch-target', b.targets, (r) => `${String(r.w) + '×' + String(r.h)}px`.padEnd(12) + `${r.selector}  "${r.tekst}"`);
  printGrouped('contrast', b.contrast, (r) => `${r.ratio}:1 (eis ${r.eis})`.padEnd(20) + `${r.px}px  ${r.selector}  "${r.tekst}"`);

  stop();

  if (OUT) {
    mkdirSync(resolve(APP, OUT), { recursive: true });
    writeFileSync(resolve(APP, OUT, 'impeccable.json'), JSON.stringify(imp.results, null, 2));
    writeFileSync(resolve(APP, OUT, 'axe.json'), JSON.stringify({ violations: b.axe.results, incomplete: b.axe.incomplete }, null, 2));
    writeFileSync(resolve(APP, OUT, 'targets.json'), JSON.stringify(b.targets, null, 2));
    writeFileSync(resolve(APP, OUT, 'contrast.json'), JSON.stringify({ laag: b.contrast, onmeetbaar: b.onmeetbaar }, null, 2));
    console.log(`\n→ Ruwe JSON in ${OUT}/`);
  }

  const cellen = ROUTES.length * VIEWPORTS.length;
  console.log(`\nimpeccable:    ${primary.length} bevindingen (+${imp.results.length - primary.length} advisory) over ${cellen} route×viewport-cellen`);
  console.log(`axe-core:      ${b.axe.results.length} violations (${b.axe.results.reduce((n, r) => n + r.nodes, 0)} nodes) over ${cellen} cellen, ${b.axe.passes} passes`);
  console.log(`               ${b.axe.incomplete.length} incomplete (${b.axe.incomplete.reduce((n, r) => n + r.nodes, 0)} nodes) — axe weet het daar níet; met de hand nameten`);
  console.log(`touch targets: ${b.targets.length} onder ${TARGET_MIN}px van ${b.nInteractief} gemeten interactieve elementen` +
    (b.nUit ? ` · ${b.nUit} uitgezonderd via targetExclude (${(cfg.targetExclude ?? []).join(', ')})` : ''));
  console.log(`contrast:      ${b.contrast.length} onder de eis van ${b.nTekst} gemeten tekstnodes; ${b.onmeetbaar.length} onmeetbaar (verloop, alpha of afbeelding)`);

  if (b.onmeetbaar.length) {
    const perReden = new Map();
    for (const o of b.onmeetbaar) perReden.set(o.reden, (perReden.get(o.reden) ?? 0) + 1);
    console.log(`               onmeetbaar per oorzaak: ${[...perReden].map(([k, v]) => `${k} ${v}`).join(' · ')}`);
  }

  const failed = imp.failed || b.failed;
  if (failed) console.log('✗ Minstens één meting ontbreekt — deze uitkomst is geen bewijs.');
  const bevindingen = primary.length + b.axe.results.length + b.targets.length + b.contrast.length;
  process.exit(failed ? 1 : bevindingen ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
