/**
 * Deterministische detector-run over de routes van rowtrack-web: het meetbare deel van
 * een UX-audit, zonder LLM. Twee instrumenten, twee rollen:
 *
 *   - axe-core (via @axe-core/playwright): structuur en semantiek — WCAG 2.x A/AA + best-practice
 *   - impeccable detect (`--scope type,layout`): maat en overloop — regellengte, tekst-overloop,
 *     krappe padding — met de ignores uit `.impeccable/config.json`
 *
 *   pnpm --filter rowtrack-web exec node scripts/detect.mjs               # verse build, eigen server op :3104
 *   pnpm --filter rowtrack-web exec node scripts/detect.mjs --no-build    # bestaande .next hergebruiken
 *   pnpm --filter rowtrack-web exec node scripts/detect.mjs --full        # zonder scope en ignores (tegenproef)
 *   pnpm --filter rowtrack-web exec node scripts/detect.mjs --out=.detect-out   # ruwe JSON per instrument
 *
 * Exit 0 = geen bevindingen · 2 = bevindingen · 1 = minstens één route of instrument kon niet meten.
 * Elke telling draagt zijn noemer (routes × viewports, axe-passes). Een schone run is bewijs dat
 * de mechanische fouten weg zijn — niet dat het scherm goed is; hiërarchie, woorden en waarde
 * blijven bij `ux-audit`. Gemeten 2026-09-11: impeccable's `low-contrast` leest de alpha-stop van
 * de card-sheen als effen kleur (1.8:1 gemeld, 7.70:1 op de pixels) en staat daarom uit; touch
 * targets vangt geen van beide instrumenten — die blijven een meting van de audit zelf.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const args = process.argv.slice(2);
const NO_BUILD = args.includes('--no-build');
const FULL = args.includes('--full');
const OUT = args.find((a) => a.startsWith('--out='))?.slice(6) ?? null;
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3104);
const BASE = `http://127.0.0.1:${PORT}`;

/** Dezelfde routes als de flow-harness; publiek bereikbaar betekent meetbaar. */
const ROUTES = ['/nl', '/nl/support', '/nl/privacy', '/nl/voorwaarden'];
const VIEWPORTS = [[1280, 800], [390, 844]];
const IMPECCABLE = 'impeccable@4.1.0';
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'];

function portFree(port) {
  return new Promise((res) => {
    const s = createServer()
      .once('error', () => res(false))
      .once('listening', () => s.close(() => res(true)))
      .listen(port, '127.0.0.1');
  });
}

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, { cwd: APP, stdio: 'inherit', ...opts });
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
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status < 500) return true;
    } catch { /* nog niet op */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

const vpName = ([w, h]) => `${w}x${h}`;

async function runImpeccable() {
  const results = []; let failed = false;
  for (const vp of VIEWPORTS) {
    const flags = ['detect', '--json', '--viewport', vpName(vp), ...(FULL ? ['--no-config'] : ['--scope', 'type,layout'])];
    const { code, out, err } = await capture('npx', ['--yes', IMPECCABLE, ...flags, ...ROUTES.map((r) => BASE + r)]);
    if (code === 1 || !out.trim()) {
      failed = true;
      console.log(`  ✗ impeccable ${vpName(vp)}: niet gemeten (exit ${code}) — ${err.trim().split('\n').pop() ?? ''}`);
      continue;
    }
    let findings;
    try { findings = JSON.parse(out); } catch { failed = true; console.log(`  ✗ impeccable ${vpName(vp)}: geen leesbare JSON`); continue; }
    for (const f of findings) results.push({ viewport: vpName(vp), route: f.file.replace(BASE, ''), ...f });
  }
  return { results, failed };
}

async function runAxe() {
  const results = []; let failed = false; let passes = 0;
  const browser = await chromium.launch({ executablePath: process.env.DETECT_BROWSER || undefined });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp[0], height: vp[1] } });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      try {
        await page.goto(BASE + route, { waitUntil: 'networkidle' });
        const r = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        passes += r.passes.length;
        for (const v of r.violations) results.push({ viewport: vpName(vp), route, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) });
      } catch (e) {
        failed = true;
        console.log(`  ✗ axe ${vpName(vp)} ${route}: niet gemeten — ${String(e.message).split('\n')[0]}`);
      }
      await page.close();
    }
    await ctx.close();
  }
  await browser.close();
  return { results, failed, passes };
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
    console.error(`  draaiend proces overnemen. Stop dat proces of geef --port=<vrij>.`);
    process.exit(1);
  }

  if (NO_BUILD) console.log('→ Geen build (--no-build): meet de bestaande .next');
  else { console.log('→ Verse build'); await run('npx', ['next', 'build']); }

  console.log(`→ Server op ${BASE}`);
  // Eigen procesgroep: `npx` start `next-server` als kleinkind, en een kill op alleen de
  // wrapper laat dat kleinkind op de poort staan — gemeten 2026-09-11: de tweede run
  // weigerde met "poort bezet". De groep als geheel stoppen ruimt beide op.
  const server = spawn('npx', ['next', 'start', '--port', String(PORT)], { cwd: APP, stdio: 'ignore', detached: true });
  const stop = () => {
    try { process.kill(-server.pid, 'SIGTERM'); } catch { /* groep al weg */ }
    try { server.kill('SIGTERM'); } catch { /* al weg */ }
  };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });
  if (!(await waitForServer(BASE))) { stop(); console.error('✗ Server kwam niet op binnen 60s.'); process.exit(1); }

  const scope = FULL ? 'zonder scope en ignores (--full)' : 'scope type,layout + .impeccable/config.json';
  console.log(`\n→ impeccable ${IMPECCABLE} — ${scope}`);
  const imp = await runImpeccable();
  const primary = imp.results.filter((r) => r.severity !== 'advisory');
  printGrouped('impeccable', imp.results, (r) => `${r.antipattern.padEnd(28)} ${String(r.severity).padEnd(8)} ${(r.snippet ?? '').slice(0, 100)}`);

  console.log(`\n→ axe-core — tags ${AXE_TAGS.join(', ')}`);
  const axe = await runAxe();
  printGrouped('axe', axe.results, (r) => `${r.id.padEnd(28)} ${String(r.impact).padEnd(8)} n=${r.nodes}  ${r.help.slice(0, 70)}  → ${r.targets[0] ?? ''}`);

  stop();

  if (OUT) {
    mkdirSync(resolve(APP, OUT), { recursive: true });
    writeFileSync(resolve(APP, OUT, 'impeccable.json'), JSON.stringify(imp.results, null, 2));
    writeFileSync(resolve(APP, OUT, 'axe.json'), JSON.stringify(axe.results, null, 2));
    console.log(`\n→ Ruwe JSON in ${OUT}/`);
  }

  const cells = ROUTES.length * VIEWPORTS.length;
  console.log(`\nimpeccable: ${primary.length} bevindingen (+${imp.results.length - primary.length} advisory) over ${cells} route×viewport-cellen`);
  console.log(`axe-core:   ${axe.results.length} violations (${axe.results.reduce((n, r) => n + r.nodes, 0)} nodes) over ${cells} cellen, ${axe.passes} passes`);
  const failed = imp.failed || axe.failed;
  if (failed) console.log('✗ Minstens één meting ontbreekt — uitkomst is geen bewijs.');
  process.exit(failed ? 1 : primary.length || axe.results.length ? 2 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
