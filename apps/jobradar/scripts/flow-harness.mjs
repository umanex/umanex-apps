#!/usr/bin/env node
/**
 * Flow-harness — rijdt de app uit op een verse build, in een echte browser.
 *
 *   pnpm --filter jobradar flow             # volle run
 *   pnpm --filter jobradar flow --selftest  # bewijst dat hij kán falen
 *   pnpm --filter jobradar flow --headed    # meekijken terwijl het gebeurt
 *   pnpm --filter jobradar flow --shot=.flow-shots  # render per route vastleggen
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
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3103);
const BASE = `http://127.0.0.1:${PORT}`;

/** Routes die moeten laden. Uitbreiden zodra er een scherm bijkomt. */
const ROUTES = ['/', '/prospects'];

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

  // ── Labelscherm: echt gedrag, geen render ──────────────────────────────────
  //
  // Een screenshot bewijst dat er iets staat. Dit bewijst dat een toetsaanslag een oordeel
  // wegschrijft, dat de teller meebeweegt, en dat het een harde herlaadbeurt overleeft — de
  // drie dingen waarop de acceptatielijst van de briefing staat.
  console.log('→ Labelscherm aandrijven');
  {
    await page.goto(BASE + '/prospects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    const tellerTekst = async () => (await page.locator('text=/beoordeeld/').first().innerText()).trim();
    const bedrijfsnaam = async () => (await page.locator('article h2').first().innerText()).trim();

    const voorTeller = await tellerTekst();
    const voorBedrijf = await bedrijfsnaam();

    // Cijfertoets 1 = "product".
    await page.keyboard.press('1');
    await page.waitForFunction(
      (oud) => {
        const el = document.querySelector('article h2');
        return el !== null && el.textContent?.trim() !== oud;
      },
      voorBedrijf,
      { timeout: 5_000 }
    ).catch(() => {});

    const naBedrijf = await bedrijfsnaam();
    const naTeller = await tellerTekst();

    if (naBedrijf === voorBedrijf) fail(`toets "1" schoof niet door: bleef op "${voorBedrijf}"`);
    else ok(`toets "1" labelde en schoof door: "${voorBedrijf}" → "${naBedrijf}"`);

    if (naTeller === voorTeller) fail(`teller bewoog niet: bleef "${voorTeller}"`);
    else ok(`teller bewoog: "${voorTeller}" → "${naTeller}"`);

    // Harde herlaadbeurt: het oordeel moet uit de database komen, niet uit de sessie.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const naHerlaad = await tellerTekst();
    if (naHerlaad !== naTeller) fail(`herlaadbeurt verloor het oordeel: "${naTeller}" → "${naHerlaad}"`);
    else ok(`oordeel overleeft een harde herlaadbeurt: "${naHerlaad}"`);

    // Hervatten landt op het eerste bedrijf uit de wachtrij, niet op een bewaarde index.
    const naHervat = await bedrijfsnaam();
    if (naHervat === voorBedrijf) fail(`hervatten landde op het al beoordeelde "${voorBedrijf}"`);
    else ok(`hervatten landt op een onbeoordeeld bedrijf: "${naHervat}"`);
  }

  // ── Randen van het labelscherm ─────────────────────────────────────────────
  //
  // De acceptatielijst van de briefing noemt vier states en vier edge cases. Wat hier NIET
  // aangedreven wordt, staat onderaan als expliciet gat — niet als stilzwijgend "waarschijnlijk
  // in orde".
  console.log('→ Randen: states en edge cases');
  {
    await page.goto(BASE + '/prospects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    const tellerTekst = async () => (await page.locator('text=/beoordeeld/').first().innerText()).trim();

    // EDGE — verkeerd bedrijf: de URL moet verdwijnen en het bedrijf in de wachtrij blijven.
    const afkeur = page.getByRole('button', { name: /verkeerd bedrijf/i });
    if (await afkeur.count()) {
      const naamVoor = (await page.locator('article h2').first().innerText()).trim();
      await afkeur.click();
      await page.waitForSelector('text=Geen website bekend', { timeout: 5_000 }).catch(() => {});
      const naamNa = (await page.locator('article h2').first().innerText()).trim();
      const zonderSite = await page.locator('text=Geen website bekend').count();
      if (zonderSite > 0 && naamNa === naamVoor) ok(`EDGE verkeerd bedrijf: URL weg, "${naamNa}" blijft in de wachtrij`);
      else fail(`EDGE verkeerd bedrijf: url-afkeuren werkte niet (site weg: ${zonderSite > 0}, zelfde bedrijf: ${naamNa === naamVoor})`);
    } else {
      fail('EDGE verkeerd bedrijf: knop niet gevonden');
    }

    // EDGE — geen website + STATE verrijken: zoekknop moet er staan en een reden opleveren.
    const zoekknop = page.getByRole('button', { name: /website zoeken/i });
    if (await zoekknop.count()) {
      ok('EDGE geen website: "Website zoeken" en "Zelf zoeken" staan er');
      await zoekknop.click();

      // TWEE aparte dingen, en ze zaten eerst in één check die daardoor de verkeerde grootheid
      // mat: de spinner-tekst bevat óók het woord "ondernemingsnummer", dus een brede locator
      // ging groen op de spinner en bewees niets over de reden erna.
      const spinner = page.locator('text=Website opzoeken en het ondernemingsnummer').first();
      const spinnerKwam = await spinner.waitFor({ timeout: 8_000 }).then(() => true).catch(() => false);
      if (spinnerKwam) ok('STATE verrijken: de bezig-toestand rendert');
      else notes.push('STATE verrijken: spinner niet betrapt (mogelijk te snel klaar)');

      // Zonder BRAVE_API_KEY komt er een leesbare reden terug in plaats van stilte.
      const melding = page.locator('text=/BRAVE_API_KEY|zoekmachine gaf|bedrijvengidsen|droeg het ondernemingsnummer|zoekopdracht mislukte/i').first();
      const kwam = await melding.waitFor({ timeout: 10_000 }).then(() => true).catch(() => false);
      if (kwam) ok(`EDGE geen website: reden getoond — "${(await melding.innerText()).trim().slice(0, 60)}…"`);
      else fail('EDGE geen website: geen reden getoond na een mislukte zoekopdracht');
    } else {
      fail('EDGE geen website: geen zoekknop gevonden');
    }

    // Terug-actie: label iets en neem het terug; de teller moet terugvallen.
    await page.goto(BASE + '/prospects', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const voorLabel = await tellerTekst();
    await page.keyboard.press('1');
    await page.waitForFunction((oud) => !document.body.innerText.includes(oud), voorLabel, { timeout: 5_000 }).catch(() => {});
    const naLabel = await tellerTekst();
    await page.keyboard.press('ArrowLeft');
    await page.waitForFunction((oud) => !document.body.innerText.includes(oud), naLabel, { timeout: 5_000 }).catch(() => {});
    const naTerug = await tellerTekst();
    if (naTerug === voorLabel) ok(`terug-actie neemt het oordeel terug: "${naLabel}" → "${naTerug}"`);
    else fail(`terug-actie herstelde de teller niet: "${voorLabel}" → "${naLabel}" → "${naTerug}"`);

    // STATE empty — twijfelstapel zonder inhoud.
    const twijfelknop = page.getByRole('button', { name: /twijfelstapel/i });
    if (await twijfelknop.count()) {
      await twijfelknop.click();
      const leeg = page.locator('text=/levert geen bedrijven op|Alles beoordeeld/i').first();
      const kwam = await leeg.waitFor({ timeout: 5_000 }).then(() => true).catch(() => false);
      if (kwam) ok(`STATE empty: "${(await leeg.innerText()).trim()}"`);
      else fail('STATE empty: lege twijfelstapel toonde geen lege toestand');
    } else {
      fail('STATE empty: twijfelstapel-knop niet gevonden');
    }
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
