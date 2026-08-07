#!/usr/bin/env node
/**
 * Flow-harness: rijdt een sleep tussen twee maandkolommen uit, met toetsenbord én muis.
 *
 *   pnpm --filter cashflow flow             # beide paden
 *   pnpm --filter cashflow flow --selftest  # bewijst dat hij kan falen
 *   pnpm --filter cashflow flow --headed    # meekijken terwijl het gebeurt
 *
 * Waarom dit bestaat: het slepen van een post tussen maanden viel tot nu toe buiten élk
 * vangnet. De scenario-scripts raken alleen de rekenkern, `@umanex/tokens contrast` alleen
 * de rollaag, en zowel `render-screens.tsx` als `dom-sweep.mjs` laten `MonthCard` bewust
 * weg omdat die aan dnd-kit én de store hangt. Het grootste scherm van de app was dus
 * alleen gelezen, nooit uitgereden — en toen het op 2026-08-07 één keer met de hand
 * uitgereden werd, faalde het meteen. Een handmatige sessie is geen vangnet: hij draait
 * niet in CI en hij draait niet opnieuw.
 *
 * Waarom hij de échte app aanstuurt en niet een gemockte `MonthCard`: dnd-kit meet
 * rechthoeken op. Een harness die de kolommen zelf neerzet, meet zijn eigen layout —
 * precies de as waarop dit gedrag stukgaat. Dit rijdt op de gebouwde app, dezelfde
 * bundel die `next start` serveert.
 *
 * Waarom hij tóch geen productiedata kan raken: élk verzoek naar de Supabase-origin wordt
 * onderschept. Wat de harness kent (login, het document, de snapshots, de wegschrijf-call)
 * beantwoordt hij uit een fixture; al het overige wordt afgebroken en geteld als lek — één
 * lek en de run faalt. Er gaat dus geen enkele byte naar `cashflow_state` van de echte
 * gebruiker, ook niet wanneer het slepen slaagt en de app wíl wegschrijven.
 *
 * Eigen server op een eigen poort (3100): de PM2-app op 3000 serveert een andere build uit
 * een andere map. Die mag deze harness niet herstarten en niet overschrijven.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');
const require_ = createRequire(import.meta.url);

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const HEADED = args.includes('--headed');
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3100);
const BASE = `http://127.0.0.1:${PORT}`;

// ── Fixture ──────────────────────────────────────────────────────────────────
// Eén post in de eerste kolom, met een bedrag dat nergens anders voorkomt zodat de
// saldo-assertie hem niet met een andere waarde kan verwarren.
const USER_ID = '00000000-0000-4000-8000-000000000001';
const LABEL = 'Harnaspost';
const AMOUNT = 137.42;

/** 'YYYY-MM' voor vandaag + n maanden. De app toont drie kolommen vanaf de huidige maand. */
function monthKey(offset = 0) {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const BRON = monthKey(0);
const DOEL = monthKey(1);

function fixtureData() {
  return {
    referenceBalance: 5000,
    referenceMonth: BRON,
    historyStartMonth: BRON,
    balanceOverrides: [],
    expenseItems: [{ id: 'harness-1', monthKey: BRON, label: LABEL, amount: AMOUNT, paid: false }],
    incomeItems: [],
    recurringItems: [],
    recurringSettlements: [],
    reservationSettlements: [],
    reservations: [],
    reservationPayments: [],
    recurringDefers: [],
    reservationDefers: [],
    reopenedMonths: [],
  };
}

function session() {
  const nu = Math.floor(Date.now() / 1000);
  return {
    access_token: 'harness-access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: nu + 3600,
    refresh_token: 'harness-refresh-token',
    user: {
      id: USER_ID,
      aud: 'authenticated',
      role: 'authenticated',
      email: 'harness@umanex.be',
      app_metadata: {},
      user_metadata: {},
      created_at: new Date(0).toISOString(),
    },
  };
}

// ── Supabase-origin: alles onderscheppen, de rest afbreken ───────────────────
function supabaseUrl() {
  // De omgevingsvariabele gaat voor, zodat CI dezelfde placeholder kan meegeven als de
  // build (zie ci.yml) — `.env.local` staat niet in git en bestaat daar dus niet.
  const uitEnv = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (uitEnv) return uitEnv.trim().replace(/\/+$/, '');

  const env = resolve(APP, '.env.local');
  if (!existsSync(env)) {
    throw new Error(
      `Geen NEXT_PUBLIC_SUPABASE_URL in de omgeving en geen ${env}.\n` +
        'Zonder die waarde weet de harness niet welke origin hij moet afsluiten, en dat is de hele veiligheidsgarantie.',
    );
  }
  const match = readFileSync(env, 'utf8').match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m);
  if (!match) throw new Error('NEXT_PUBLIC_SUPABASE_URL ontbreekt in .env.local.');
  return match[1].trim().replace(/\/+$/, '');
}

/**
 * Beantwoordt wat de app nodig heeft en breekt al het overige af. Fail-closed: een pad dat
 * hier niet staat, komt niet op het netwerk maar in `lekken` — en laat de run vallen. Dat
 * is de hele veiligheidsgarantie, dus hier nooit een `route.continue()` toevoegen.
 */
function maakRouteHandler(state) {
  return async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const pad = url.pathname;
    const json = (body, status = 200, headers = {}) =>
      route.fulfill({ status, contentType: 'application/json', headers, body: JSON.stringify(body) });

    // Auth — inloggen, verversen, en de gebruiker opvragen.
    if (pad.startsWith('/auth/v1/token') || pad === '/auth/v1/signup') return json(session());
    if (pad === '/auth/v1/user') return json(session().user);
    if (pad === '/auth/v1/logout') return route.fulfill({ status: 204, body: '' });
    if (pad.includes('/.well-known/jwks.json')) return json({ keys: [] });

    // Het document. `maybeSingle()` wil één object, geen array.
    if (pad === '/rest/v1/cashflow_state') {
      if (req.method() === 'GET') return json(state.document, 200);
      // Elke schrijfpoging wordt geteld en beantwoord alsof ze lukte: de app moet
      // verder kunnen, en het bewijs dat er niets weglekte is juist dat we hier staan.
      state.schrijfpogingen.push(`${req.method()} ${pad}`);
      state.revision += 1;
      return json([{ revision: state.revision }], 200);
    }

    if (pad === '/rest/v1/cashflow_snapshots') {
      if (req.method() === 'GET') return json([]);
      state.schrijfpogingen.push(`${req.method()} ${pad}`);
      return json([], 200);
    }

    state.lekken.push(`${req.method()} ${pad}`);
    return route.abort();
  };
}

// ── Server ───────────────────────────────────────────────────────────────────

/** Luistert er al iets op de poort? Zo ja: niet starten. */
async function poortBezet() {
  try {
    await fetch(BASE, { redirect: 'manual', signal: AbortSignal.timeout(1500) });
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  if (!existsSync(resolve(APP, '.next/BUILD_ID'))) {
    throw new Error(
      'Geen build in apps/cashflow/.next. Draai eerst `pnpm --filter cashflow build`.\n' +
        'De harness bouwt bewust niet zelf: een build overschrijft de .next waar een draaiende server uit leest.',
    );
  }

  // Zonder deze check test de harness wat er tóevallig op de poort staat. `next start`
  // valt dan om met EADDRINUSE terwijl de eerste fetch slaagt tegen de vréémde server —
  // en de run rapporteert over een app die hij nooit gestart heeft.
  if (await poortBezet()) {
    throw new Error(
      `Er luistert al iets op ${BASE}. De harness start zijn eigen server en weigert een vreemde te testen.\n` +
        `Ruim hem op of geef een andere poort: --port=3105`,
    );
  }

  const bin = require_.resolve('next/dist/bin/next');
  // Eigen procesgroep, zodat de teardown de hele boom kan afsluiten. Een SIGTERM naar
  // alleen het bovenste proces liet hier een luisterende server achter.
  const proc = spawn(process.execPath, [bin, 'start', '--port', String(PORT)], {
    cwd: APP,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });

  let logs = '';
  proc.stdout.on('data', (d) => (logs += d));
  proc.stderr.on('data', (d) => (logs += d));

  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`next start viel om (exit ${proc.exitCode}):\n${logs}`);
    try {
      const res = await fetch(BASE, { redirect: 'manual' });
      if (res.status < 500) return proc;
    } catch {
      /* nog niet op */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  stopServer(proc);
  throw new Error(`next start werd niet bereikbaar op ${BASE} binnen 60s:\n${logs}`);
}

function stopServer(proc) {
  try {
    process.kill(-proc.pid, 'SIGTERM');
  } catch {
    try {
      proc.kill('SIGTERM');
    } catch {
      /* al weg */
    }
  }
}

// ── Pagina klaarzetten ───────────────────────────────────────────────────────
const KOLOM = '.grid.grid-cols-3 > div';

async function openApp(context, state) {
  const page = await context.newPage();
  page.on('pageerror', (err) => state.paginafouten.push(String(err).slice(0, 200)));
  await page.route(`${state.origin}/**`, maakRouteHandler(state));
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });

  // Elke wachtstap meldt wat er wél op het scherm stond. Een kale "Timeout waiting for
  // #email" laat je raden of de app niet hydrateerde, of al ingelogd was, of viel.
  const wacht = async (selector, wat) => {
    try {
      await page.waitForSelector(selector, { timeout: 20_000, state: 'visible' });
    } catch {
      const tekst = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 240));
      throw new Error(`${wat} verscheen niet. Op het scherm stond: "${tekst}"`);
    }
  };

  // supabase-js bewaart de sessie in localStorage, dus een tweede scenario in dezelfde
  // context komt al ingelogd binnen. Elk scenario krijgt hier een eigen context, maar de
  // check blijft staan: hem weglaten kostte een run aan een timeout op een formulier dat
  // er terecht niet was.
  const loginZichtbaar = await page
    .waitForSelector('#email', { timeout: 5_000, state: 'visible' })
    .then(() => true)
    .catch(() => false);

  if (loginZichtbaar) {
    await page.fill('#email', 'harness@umanex.be');
    await page.fill('#password', 'harness');
    await page.click('button[type=submit]');
  }

  await wacht(KOLOM, 'de maandkolommen');
  await wacht(`text=${LABEL}`, `de fixture-post "${LABEL}"`);
  return page;
}

/** In welke kolom (0-based) staat de post nu? -1 wanneer hij nergens staat. */
async function kolomVanPost(page, label) {
  return page.evaluate(
    ([sel, l]) => [...document.querySelectorAll(sel)].findIndex((k) => k.textContent.includes(l)),
    [KOLOM, label],
  );
}

/** De sleepgreep van de post: de knop 'Versleep' in de rij die het label draagt. */
function greep(page, label) {
  return page.locator('div', { hasText: label }).locator('button[aria-label="Versleep"]').last();
}

// ── De twee paden ────────────────────────────────────────────────────────────

/**
 * Toetsenbord. dnd-kit's KeyboardSensor activeert op Spatie, beweegt op pijltjes en laat
 * los op Spatie.
 *
 * Eén ArrowRight, niet meer: de coordinateGetter springt per stap naar de dichtstbijzijnde
 * kolom in die richting, dus één stap hoort exact één kolom op te schuiven. Ruimer drukken
 * maakt de assertie zwakker — twintig stappen landden bij het eerste groene resultaat in
 * kolom 2, en dat had ook "beweegt onvoorspelbaar" kunnen betekenen.
 */
async function toetsenbordpad(page) {
  const handle = greep(page, LABEL);
  await handle.focus();
  await page.keyboard.press('Space');
  await page.waitForTimeout(150);

  const opgepakt = await page.evaluate(() => {
    const el = document.activeElement;
    return el?.getAttribute('aria-pressed') === 'true';
  });
  if (!opgepakt) throw new Error('de post werd niet opgepakt (aria-pressed bleef uit)');

  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await page.waitForTimeout(400);
}

/**
 * Muis. PointerSensor heeft `activationConstraint: { distance: 8 }`, dus één sprong van
 * A naar B activeert de sleep niet — er moeten tussenliggende bewegingen zijn. Dat is
 * precies waarom `left_click_drag` uit een browser-tool hier niets bewees.
 */
async function muispad(page) {
  const handle = greep(page, LABEL);
  const van = await handle.boundingBox();
  const doel = await page.locator(KOLOM).nth(1).boundingBox();
  if (!van || !doel) throw new Error('greep of doelkolom niet in beeld');

  await page.mouse.move(van.x + van.width / 2, van.y + van.height / 2);
  await page.mouse.down();
  // Eerst een korte beweging om de 8px-drempel te passeren, dan in stappen naar het doel.
  await page.mouse.move(van.x + van.width / 2 + 12, van.y + van.height / 2, { steps: 6 });
  await page.mouse.move(doel.x + doel.width / 2, doel.y + doel.height / 2, { steps: 25 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(400);
}

// ── Runner ───────────────────────────────────────────────────────────────────
/**
 * Eén scenario = één verse context. Anders erft het volgende scenario de sessie én de
 * localStorage van het vorige, en meet je de nasleep van de vorige run.
 */
async function draaiScenario(browser, state, naam, actie) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  try {
    const page = await openApp(context, state);
    const voor = await kolomVanPost(page, LABEL);
    if (voor !== 0) throw new Error(`de fixture staat niet in kolom 0 maar in ${voor}`);

    const schrijfVoor = state.schrijfpogingen.length;
    await actie(page);

    // `sync.ts` schrijft met 800ms debounce weg. Even wachten maakt van "er kan niets
    // weglekken" een waarneming in plaats van een redenering: bij een geslaagde
    // verplaatsing hoort hier een onderschepte PATCH te staan.
    await page.waitForTimeout(1_200);
    const geschreven = state.schrijfpogingen.length - schrijfVoor;

    const na = await kolomVanPost(page, LABEL);
    if (na === 1) {
      return {
        naam,
        ok: true,
        bewijs: `post verhuisde van kolom 0 naar kolom 1 (${BRON} → ${DOEL}); ${geschreven} wegschrijf-call onderschept`,
      };
    }
    if (na === 0) return { naam, ok: false, bewijs: 'post staat na afloop nog steeds in kolom 0 — er is niets verplaatst' };
    return { naam, ok: false, bewijs: `post belandde in kolom ${na}, verwacht was kolom 1` };
  } catch (err) {
    return { naam, ok: false, bewijs: err.message };
  } finally {
    await context.close();
  }
}

async function main() {
  const state = {
    origin: supabaseUrl(),
    revision: 1,
    lekken: [],
    schrijfpogingen: [],
    paginafouten: [],
    get document() {
      return { data: fixtureData(), revision: this.revision };
    },
  };

  console.log(`Flow-harness — ${BRON} → ${DOEL}, origin afgesloten: ${state.origin}`);

  const server = await startServer();
  const browser = await chromium.launch({ headless: !HEADED });

  const resultaten = [];
  try {
    resultaten.push(await draaiScenario(browser, state, 'toetsenbord', toetsenbordpad));
    resultaten.push(await draaiScenario(browser, state, 'muis', muispad));

    if (SELFTEST) {
      // Bewijst dat de assertie kán falen: pak op, doe niets, laat weer los. Een harness
      // die altijd groen is meldt "geen fouten" even overtuigend als een die werkt.
      resultaten.push(
        await draaiScenario(browser, state, 'zelftest (hoort te falen)', async (page) => {
          await greep(page, LABEL).focus();
          await page.keyboard.press('Space');
          await page.waitForTimeout(150);
          await page.keyboard.press('Escape');
          await page.waitForTimeout(200);
        }),
      );
    }
  } finally {
    await browser.close();
    stopServer(server);
  }

  console.log('');
  for (const r of resultaten) {
    const zelftest = r.naam.startsWith('zelftest');
    const geslaagd = zelftest ? !r.ok : r.ok;
    console.log(`  ${geslaagd ? '✓' : '✗'} ${r.naam.padEnd(26)} ${r.bewijs}`);
  }

  console.log('');
  console.log(`  schrijfpogingen onderschept: ${state.schrijfpogingen.length}`);
  console.log(`  verzoeken naar de echte origin: ${state.lekken.length}${state.lekken.length ? ` — ${state.lekken.join(', ')}` : ''}`);

  const echteFouten = resultaten.filter((r) => (r.naam.startsWith('zelftest') ? r.ok : !r.ok));
  const gezakt = echteFouten.length > 0 || state.lekken.length > 0;
  console.log('');
  console.log(gezakt ? `${echteFouten.length} pad(en) gefaald` : 'alle paden geslaagd');
  process.exit(gezakt ? 1 : 0);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
