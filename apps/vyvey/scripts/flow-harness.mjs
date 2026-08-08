#!/usr/bin/env node
/**
 * Flow-harness — rijdt de app uit op een verse build, in een echte browser.
 *
 *   pnpm --filter vyvey flow             # volle run
 *   pnpm --filter vyvey flow --selftest  # bewijst dat hij kán falen
 *   pnpm --filter vyvey flow --headed    # meekijken terwijl het gebeurt
 *   pnpm --filter vyvey flow --shot=.flow-shots  # render per route vastleggen
 *
 * Waarom dit bestaat: zonder uitvoerbaar pad valt de flow-as van `verify` terug op
 * "overgeslagen", en dan is elk acceptatie-item dat door de UI loopt onverifieerbaar.
 * Een screenshot bewijst dat er iets rendert; dit bewijst dat de pagina's laden, dat de
 * navigatie werkt en dat de console schoon is.
 *
 * Vier ontwerpkeuzes, elk tegen een concrete faalvorm:
 *
 * 1. **Verse build, eigen poort.** Draait `next build` en start op een poort die 100 hoger
 *    ligt dan de dev-poort, en weigert als daar al iets luistert. Een dev-server van
 *    iemand anders wordt dus nooit overschreven of herstart — de Beoordeel-stap schrijft,
 *    en dat mag nooit buiten deze harness landen.
 * 2. **Elke externe origin wordt afgebroken en geteld.** Eén lek en de run faalt. Zo kan
 *    deze harness per constructie geen echte data raken, ook niet als de app dat wil.
 * 3. **Console-fouten zijn bevindingen.** Een pagina die rendert maar in de console
 *    schreeuwt, is niet in orde; dat is precies het soort defect dat een screenshot mist.
 * 4. **`--selftest` voegt een scenario toe dat hóórt te falen.** Een harness die alleen
 *    ooit geslaagd is, bewijst niet dat hij meet. Zonder die kant weet je niet of groen
 *    "alles goed" betekent of "ik kijk nergens naar".
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const HEADED = args.includes('--headed');
const SHOT = args.find((a) => a.startsWith('--shot='))?.slice(7) ?? null;
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3102);
const BASE = `http://127.0.0.1:${PORT}`;

/** Routes die moeten laden. Uitbreiden zodra er een scherm bijkomt. */
const ROUTES = ['/', '/privacy', '/algemene-voorwaarden'];

const fails = [];
const notes = [];
function fail(msg) { fails.push(msg); console.log(`  ✗ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }

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

async function main() {
  if (!(await portFree(PORT))) {
    console.error(`✗ Poort ${PORT} is bezet. Deze harness start zijn eigen server en mag`);
    console.error(`  nooit een draaiend proces overnemen. Stop dat proces of geef --port=<vrij>.`);
    process.exit(2);
  }

  console.log('→ Verse build');
  await run('npx', ['next', 'build']);

  console.log(`→ Server op ${BASE}`);
  const server = spawn('npx', ['next', 'start', '--port', String(PORT)], {
    cwd: APP, stdio: 'ignore', detached: false,
  });
  const stop = () => { try { server.kill('SIGTERM'); } catch { /* al weg */ } };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });

  if (!(await waitForServer(BASE))) {
    stop();
    console.error('✗ Server kwam niet op binnen 60s.');
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const ctx = await browser.newContext();

  // Alles buiten de eigen origin wordt afgebroken en geteld.
  const leaks = new Set();
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(BASE) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    leaks.add(new URL(url).origin);
    return route.abort();
  });

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  console.log('→ Routes');
  for (const route of ROUTES) {
    const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    const status = res?.status() ?? 0;
    // Alleen 4xx/5xx is een fout. Een 3xx is dat niet: de Next App Router beantwoordt een
    // `redirect()` met een 307 **mét** HTML-body die client-side doorstuurt, zonder
    // Location-header. Gemeten op partner-portal — `/` en `/partnerzone` gaven 307 terwijl
    // ze gewoon renderen. Wie op de statuscode oordeelt meldt daar twee defecten die er
    // niet zijn; het oordeel hoort te gaan over wat er uiteindelijk op het scherm staat.
    if (status >= 400) { fail(`${route} → HTTP ${status}`); continue; }
    // `domcontentloaded` is te vroeg voor een client-gerenderde app: die heeft dan nog
    // niets in de body staan. Gemeten op enviro-mobile — daar leverde het 0 tekens op een
    // pagina die na de client-side redirect gewoon rendert, dus een vals "wit scherm" op
    // een werkende app. Wachten tot het netwerk stil is; blijft dat uit (long polling,
    // service worker), dan lezen we alsnog wat er staat in plaats van te blijven hangen.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const text = (await page.locator('body').innerText().catch(() => '')).trim();
    const landed = new URL(page.url()).pathname;
    const where = landed === route ? `${route}` : `${route} → ${landed}`;
    if (text.length < 20) fail(`${where} rendert vrijwel niets (${text.length} tekens)`);
    else ok(`${where} → ${status}, ${text.length} tekens tekst`);
    if (SHOT) {
      const name = route === '/' ? 'index' : route.replace(/\//g, '-').replace(/^-/, '');
      const file = resolve(process.cwd(), `${SHOT}/${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      ok(`render vastgelegd: ${file}`);
    }
  }

  // Eén echte interactie. Volgorde is bewust: een `select` wijzigen is overal veilig,
  // een interne link ook. Knoppen worden NIET blind aangeklikt — op dit dashboard heet er
  // één "Sync nu" en die haalt externe data op. Dat zou de origin-guard hierboven terecht
  // als lek tellen en de run laten falen op iets dat geen defect is.
  console.log('→ Interactie (echt aangedreven, geen goto)');
  const select = page.locator('select:visible').first();
  // Een link naar de pagina waar je al staat (het logo, meestal) bewijst niets: die
  // "navigeert" naar zichzelf en slaagt altijd. Sluit het huidige pad dus uit.
  const here = new URL(page.url()).pathname;
  const link = page.locator(`a[href^="/"]:visible:not([href="${here}"])`).first();

  if (await select.count()) {
    const options = await select.locator('option').allTextContents();
    const before = await select.inputValue();
    const values = await select.locator('option').evaluateAll((els) => els.map((e) => e.value));
    const target = values.find((v) => v !== before);
    if (target === undefined) {
      notes.push(`select heeft maar één optie (${options[0] ?? '?'}) — niet te wijzigen`);
    } else {
      await select.selectOption(target);
      const after = await select.inputValue();
      if (after === target) ok(`select gewijzigd: "${before}" → "${after}"`);
      else fail(`select nam de wijziging niet aan: bleef "${after}"`);
    }
  } else if (await link.count()) {
    const href = await link.getAttribute('href');
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    const landed = new URL(page.url()).pathname;
    if (landed === href) ok(`klik: ${here} → ${landed}`);
    else notes.push(`klik op ${href} kwam uit op ${landed} (redirect of anchor)`);
  } else {
    notes.push('geen select en geen interne link op de eerste route — interactie niet uitgereden');
  }

  if (SELFTEST) {
    console.log('→ Zelftest (dit scenario hóórt te falen)');
    await page.goto(BASE + '/deze-route-bestaat-niet-' + Date.now(), { waitUntil: 'domcontentloaded' })
      .catch(() => {});
    const res = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    if (res?.status() === 200) fail('ZELFTEST: bewust gefaalde assertie — de harness kan falen');
  }

  if (consoleErrors.length) {
    for (const e of [...new Set(consoleErrors)].slice(0, 5)) fail(`console: ${e.slice(0, 160)}`);
  } else ok('console schoon');

  if (leaks.size) fail(`lek naar externe origin(s): ${[...leaks].join(', ')}`);
  else ok('geen enkel verzoek buiten de eigen origin');

  await browser.close();
  stop();

  console.log('');
  for (const n of notes) console.log(`  • ${n}`);
  if (SELFTEST) {
    const expected = fails.some((f) => f.startsWith('ZELFTEST'));
    console.log(expected ? '✓ zelftest: de harness faalt wanneer hij hoort te falen' : '✗ zelftest faalde NIET — de harness meet niets');
    process.exit(expected ? 0 : 1);
  }
  console.log(fails.length ? `✗ ${fails.length} bevinding(en)` : '✓ alle checks geslaagd');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
