/**
 * Fase 3 — wat de server rendert: foutpagina (c02), titels (c03), een kapotte KBO-spiegel (c04),
 * Sync nu (c13) en de laadtoestanden (c14).
 *
 * Drie regels die hier dragen:
 *
 * 1. **De echte database verandert nooit.** Vingerafdruk vóór en na; Sync nu gaat alleen door een
 *    onderschepte POST (positieve controle eerst). Wat een kapotte of gewijzigde database vraagt,
 *    draait op een tweede `next start` uit dezelfde build, met een pad in een werkmap buiten de app:
 *    een tekstbestand als database (better-sqlite3 gooit "file is not a database" bij de eerste
 *    pragma, en schrijft er niets in — gemeten 2026-09-17) of een `.backup`-kopie.
 * 2. **Gedrag, geen bestanden.** "Er is een loading.tsx" is waar zodra het bestand bestaat; de vraag
 *    is of de laadtoestand in beeld staat terwijl de server rendert. Idem: een link naar `/` bewijst
 *    niets tot een klik een documentnavigatie geeft.
 * 3. **Geforceerde fouten tellen we zelf uit de console.** Alleen de meldingen die bij de kapotte
 *    server horen, en alleen in het venster waarin we die server bezochten.
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const POORT_KAPOT = 3104;
const POORT_SPIEGEL = 3105;

const LIVE = '[aria-live]:not([aria-live="off"]),[role="status"],[role="alert"],[role="log"]';

/** Wacht tot `test()` waar is of de tijd op is; geeft de laatste uitkomst terug. */
async function wachtOp(test, ms, stap = 100) {
  const eind = Date.now() + ms;
  let uit = await test();
  while (!uit && Date.now() < eind) {
    await new Promise((r) => setTimeout(r, stap));
    uit = await test();
  }
  return uit;
}

export default async function fase3Server(m) {
  const { APP, fail, ok, notes } = m;
  const dbVoor = await m.dbVingerafdruk();
  if (String(dbVoor).startsWith('onleesbaar')) {
    fail(`server: database-vingerafdruk ${dbVoor} — zonder nulmeting geen klik`);
    return;
  }

  // Een werkmap buiten de app: nooit iets naast `.data`. FLOW_WERKMAP kan hem sturen (sessie-scratchpad).
  const basis = resolve(process.env.FLOW_WERKMAP ?? tmpdir());
  if (basis === APP || basis.startsWith(APP + '/')) {
    fail(`server: werkmap ${basis} ligt in de app — geweigerd`);
    return;
  }
  const werk = mkdtempSync(join(basis, 'fase3-server-'));

  const secties = [
    ['c03', () => titels(m)],
    ['c14', () => laadtoestanden(m)],
    ['c13', () => sync(m)],
    ['c04', () => spiegelFout(m, werk)],
    ['c02', () => foutpagina(m, werk)],
  ];
  try {
    for (const [sleutel, sectie] of secties) {
      try {
        await sectie();
      } catch (e) {
        fail(`${sleutel}: sectie gooide ${String(e).split('\n')[0]}`);
      } finally {
        await m.stopOnderschepping();
        await m.page.unroute(`${m.BASE}/**`).catch(() => {});
      }
    }
  } finally {
    rmSync(werk, { recursive: true, force: true });
  }

  const dbNa = await m.dbVingerafdruk();
  if (dbNa !== dbVoor) fail(`server: de database veranderde (${dbVoor} → ${dbNa}) — een klik lekte`);
  else ok(`server: de database is ongemoeid (vingerafdruk ${dbNa}, vóór én na)`);
  notes.push(`server: werkmap ${werk} gebruikt en opgeruimd`);
}

// ── c03 — een eigen <title> per route ────────────────────────────────────────
async function titels({ page, BASE, APP, ok, fail, notes, consoleErrors }) {
  // De referentie is de layouttitel: een route zonder eigen metadata erft precies die. Uniek zijn
  // alléén volstaat niet — één route die terugvalt, blijft uniek naast drie eigen titels.
  const layout = readFileSync(join(APP, 'app/layout.tsx'), 'utf8').match(/title:\s*'([^']+)'/)?.[1];
  if (!layout) {
    fail('c03: geen layouttitel gevonden in app/layout.tsx — de vergelijking meet niets');
    return;
  }
  const routes = [['/', '/'], ['/plan', '/plan'], ['/instellingen', '/instellingen'], ['404', `/bestaat-niet-${Date.now()}`]];
  const gemeten = [];
  for (const [label, pad] of routes) {
    const foutenVoor = consoleErrors.length;
    const res = await page.goto(BASE + pad, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    if (label === '404') {
      // De 404 is hier opzettelijk; alleen díe melding eruit, de rest blijft staan.
      const venster = consoleErrors.splice(foutenVoor);
      const geforceerd = venster.filter((t) => /status of 404/.test(t));
      consoleErrors.push(...venster.filter((t) => !/status of 404/.test(t)));
      notes.push(`c03: ${geforceerd.length} geforceerde 404-melding(en) gefilterd, ${venster.length - geforceerd.length} andere behouden`);
    }
    // Next 15 kan metadata in de body streamen; tel dus elke <title> buiten svg, niet alleen in <head>.
    const stand = await page.evaluate(() => ({
      titel: document.title,
      aantal: [...document.querySelectorAll('title')].filter((t) => !t.closest('svg')).length,
    }));
    gemeten.push({ label, pad, status: res?.status() ?? 0, ...stand });
  }
  for (const g of gemeten) {
    const anderen = gemeten.filter((x) => x !== g && x.titel === g.titel).map((x) => x.label);
    if (g.label === '404' && g.status !== 404) fail(`c03: ${g.pad} gaf HTTP ${g.status}, verwacht 404 — de 404-titel meet niets`);
    else if (g.label !== '404' && g.status >= 400) fail(`c03: ${g.pad} gaf HTTP ${g.status} — de titel meet niets`);
    else if (g.aantal !== 1) fail(`c03: ${g.label} heeft ${g.aantal} <title>-elementen, verwacht 1`);
    else if (!g.titel.trim() || g.titel === layout) fail(`c03: ${g.label} draagt de layouttitel "${g.titel}", geen eigen titel`);
    else if (anderen.length) fail(`c03: ${g.label} deelt de titel "${g.titel}" met ${anderen.join(', ')}`);
    else ok(`c03: ${g.label} heeft een eigen titel "${g.titel}" (1 <title>, ≠ layout "${layout}")`);
  }
}

// ── c14 — de laadtoestand staat in beeld terwijl de server rendert ────────────
/**
 * Een client-navigatie via de echte link, met het navigatie-RSC-verzoek 2,5 s vastgehouden. De
 * prefetch (header `next-router-prefetch`) laten we door: die haalt de boom tot aan loading.tsx op,
 * en dat is precies het mechanisme waarmee Next de laadtoestand meteen toont. Zonder loading.tsx
 * blijft de vorige pagina staan; met een lege loading.tsx is het scherm leeg — beide rood hieronder.
 */
async function laadtoestanden(m) {
  await laadtoestand(m, {
    // "Radar", niet meer "Terug naar het dashboard": die link verdween op 2026-09-19 met de
    // eigen kop van /instellingen; de balk van de layout draagt hem nu.
    sleutel: 'c14a', van: '/instellingen', naar: '/', linkNaam: 'Radar',
    // Laden van het dashboard: de instellingenpagina is weg, de tabbladen zijn er nog niet.
    isLaden: (s) => s.laden && !s.h1.includes('Instellingen') && s.tablists === 0,
    isKlaar: (s) => s.tablists > 0 && !s.laden,
  });
  await laadtoestand(m, {
    sleutel: 'c14b', van: '/', naar: '/instellingen', linkNaam: 'Instellingen',
    // Laden van de instellingen, niet de laadtoestand van het dashboard erboven (root loading.tsx):
    // de kop noemt de route, het dashboard is weg, het formulier is er nog niet.
    //
    // `!h1.includes('Radar')` en niet meer `!h1.includes('JobRadar')`: sinds 2026-09-19 draagt
    // geen enkele h1 nog het woord "JobRadar" (dat staat in de balk, en die is geen kop), dus die
    // clausule was per constructie waar en scheidde de twee laadtoestanden niet meer. De kop van
    // app/loading.tsx heet nu "Radar" — onzichtbaar, maar wél in de boom.
    isLaden: (s) => s.laden && s.h1.includes('Instellingen') && !s.h1.includes('Radar') && s.tablists === 0 && s.velden === 0,
    isKlaar: (s) => s.velden > 0 && !s.laden,
  });
}

async function laadtoestand({ page, BASE, ok, fail, notes, laad }, { sleutel, van, naar, linkNaam, isLaden, isKlaar }) {
  const prefetch = [];
  const luister = (r) => {
    if (r.url().startsWith(BASE) && new URL(r.url()).pathname === naar && r.headers()['next-router-prefetch']) prefetch.push(r.url());
  };
  page.on('request', luister);
  await laad(van);
  await wachtOp(() => prefetch.length > 0, 5_000);
  page.off('request', luister);

  const vastgehouden = [];
  await page.route(`${BASE}/**`, async (route) => {
    const r = route.request();
    const h = r.headers();
    if (h['rsc'] === '1' && !h['next-router-prefetch'] && new URL(r.url()).pathname === naar) {
      vastgehouden.push(r.url());
      await new Promise((res) => setTimeout(res, 2_500));
    }
    return route.fallback();
  });

  const link = page.getByRole('link', { name: linkNaam, exact: true });
  const aantal = await link.count();
  if (aantal !== 1) {
    fail(`${sleutel}: ${aantal} links "${linkNaam}" op ${van}, verwacht 1 — dit meet niets`);
    await page.unroute(`${BASE}/**`);
    return;
  }
  await link.click();
  await page.waitForTimeout(700);
  const stand = () => page.evaluate(() => {
    const zichtbaar = (el) => el.checkVisibility();
    // Met het beletselteken: "herladen" of een vacaturetitel mag hier niet voor een laadtoestand doorgaan.
    const laden = document.body.innerText.split('\n').find((regel) => /laden…/i.test(regel)) ?? null;
    return {
      h1: [...document.querySelectorAll('h1')].filter(zichtbaar).map((h) => h.textContent.trim()).join(' | '),
      laden,
      live: [...document.querySelectorAll('[aria-live]:not([aria-live="off"])')].map((e) => e.textContent.trim()).filter((t) => /laden…/i.test(t)).join(' | '),
      tablists: document.querySelectorAll('[role="tablist"]').length,
      velden: document.querySelectorAll('main input, main select, main textarea').length,
      pad: location.pathname,
    };
  });
  const tijdens = await stand();
  const klaar = await wachtOp(async () => { const s = await stand(); return isKlaar(s) ? s : null; }, 15_000, 200);
  await page.unroute(`${BASE}/**`);

  if (vastgehouden.length === 0) {
    fail(`${sleutel}: het navigatieverzoek naar ${naar} werd niet vastgehouden — dit meet niets`);
  } else if (isLaden(tijdens)) {
    ok(`${sleutel}: tijdens het renderen van ${naar} staat de laadtoestand in beeld ("${tijdens.laden}", kop "${tijdens.h1}", live-regio "${tijdens.live}")`);
  } else {
    fail(`${sleutel}: 700 ms na de klik naar ${naar} geen laadtoestand van die route: ${JSON.stringify(tijdens)}`);
  }
  if (!klaar) fail(`${sleutel}: ${naar} was 15 s na de klik nog niet geladen — de positieve controle faalt`);
  notes.push(`${sleutel}: prefetch van ${naar} ${prefetch.length ? 'gezien' : 'NIET gezien'}; ${vastgehouden.length} navigatieverzoek(en) 2,5 s vastgehouden; daarna ${klaar ? `geladen op ${klaar.pad}` : 'niet geladen'}`);
}

// ── c13 — Sync nu: focus, verstreken tijd, live-regio, "+N vacatures" ─────────
async function sync({ page, ok, fail, notes, laad, onderschepSchrijven, stopOnderschepping }) {
  // Vanaf Leads met status Alle en het vinkje uit: zo is "+N vacatures" op drie assen een echte wissel
  // (tabblad → Vacatures, status → Open, vinkje "Alleen nieuw bij de laatste sync" → aan).
  await laad('/?tab=leads&status=alle');
  const knopLoc = page.getByRole('button', { name: 'Sync nu', exact: true });
  const aantal = await knopLoc.count();
  if (aantal !== 1) {
    fail(`c13a: ${aantal} knoppen "Sync nu", verwacht 1 — dit meet niets`);
    return;
  }
  const antwoord = { status: 200, vertraging: 3_000, body: { ok: true, jobsAdded: 2, leadsAdded: 1, sourceStatuses: {} } };
  if (!(await onderschepSchrijven(antwoord))) {
    fail('c13: onderschepping van schrijfverzoeken niet bevestigd — Sync nu niet aangeklikt');
    return;
  }
  ok('c13: positieve controle — POST naar /api wordt onderschept (200, 3 s vertraging)');
  const posts = [];
  const luister = (r) => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/sync') posts.push(r.url()); };
  page.on('request', luister);

  // Elke live-regio die er vóór de klik al stond. Een regio die pas mét zijn inhoud verschijnt, wordt
  // niet betrouwbaar voorgelezen, dus het resultaat moet in een van déze staan.
  await page.evaluate((sel) => { window.__harnessLiveVoor = new Set(document.querySelectorAll(sel)); }, LIVE);
  const knop = await knopLoc.elementHandle();
  await knop.focus();
  await page.keyboard.press('Enter');

  await page.waitForTimeout(400);
  const focusTijdens = await page.evaluate((k) => ({
    opKnop: document.activeElement === k,
    body: document.activeElement === document.body || document.activeElement === null,
    wat: document.activeElement ? `${document.activeElement.tagName.toLowerCase()} "${(document.activeElement.textContent ?? '').trim().slice(0, 20)}"` : 'null',
    ariaDisabled: k.getAttribute('aria-disabled'),
    tekst: (k.textContent ?? '').trim(),
  }), knop);

  // De verstreken tijd: een zichtbaar blad naast de knop met "<n> s", twee keer gelezen.
  const leesDuur = () => page.evaluate((k) => {
    const rij = k.parentElement;
    return [...(rij?.querySelectorAll('*') ?? [])]
      .filter((e) => e !== k && !k.contains(e) && e.children.length === 0 && /^\d+\s*s$/.test((e.textContent ?? '').trim()) && e.checkVisibility())
      .map((e) => Number((e.textContent ?? '').trim().match(/^\d+/)[0]));
  }, knop);
  await page.waitForTimeout(1_000); // ± 1,4 s na de klik
  const duur1 = await leesDuur();
  await page.waitForTimeout(1_100); // ± 2,5 s na de klik, nog vóór het antwoord (3 s)
  const duur2 = await leesDuur();

  const afgerond = await wachtOp(() => page.evaluate((k) => (k.textContent ?? '').trim() === 'Sync nu', knop), 8_000);
  await page.waitForTimeout(300);
  const focusNa = await page.evaluate((k) => ({
    opKnop: document.activeElement === k,
    wat: document.activeElement ? `${document.activeElement.tagName.toLowerCase()} "${(document.activeElement.textContent ?? '').trim().slice(0, 20)}"` : 'null',
  }), knop);
  const regios = await page.evaluate((sel) => [...document.querySelectorAll(sel)]
    .filter((r) => /\b2 vacatures\b/.test(r.textContent ?? ''))
    .map((r) => ({ tekst: (r.textContent ?? '').trim(), bestondAl: window.__harnessLiveVoor?.has(r) ?? false, soort: r.getAttribute('aria-live') ?? r.getAttribute('role') })), LIVE);
  page.off('request', luister);

  if (posts.length === 0) {
    fail('c13: Enter op Sync nu stuurde geen POST /api/sync — de sync-assen meten niets');
    await stopOnderschepping();
    return;
  }
  // c13a
  if (focusTijdens.tekst !== 'Bezig…') fail(`c13a: 400 ms na Enter leest de knop "${focusTijdens.tekst}", verwacht "Bezig…" — de sync liep niet`);
  else if (!focusTijdens.opKnop) fail(`c13a: tijdens de sync staat de focus op ${focusTijdens.body ? 'body' : focusTijdens.wat}, niet op de knop`);
  else ok('c13a: tijdens de sync blijft de focus op de knop (niet op body)');
  if (focusTijdens.ariaDisabled !== 'true') fail(`c13a: de knop draagt aria-disabled="${focusTijdens.ariaDisabled}" tijdens de sync, verwacht "true"`);
  else ok('c13a: de knop draagt aria-disabled="true" tijdens de sync');
  if (!afgerond) fail('c13a: de sync was 8 s na Enter nog niet afgerond');
  else if (!focusNa.opKnop) fail(`c13a: na de sync staat de focus op ${focusNa.wat}, niet op de knop`);
  else ok('c13a: na de sync staat de focus nog op Sync nu');
  // c13b
  if (duur1.length !== 1 || duur2.length !== 1) fail(`c13b: verstreken tijd naast de knop gevonden ${duur1.length}× en ${duur2.length}× (verwacht 1) — niet in beeld`);
  else if (!(duur1[0] >= 1 && duur2[0] > duur1[0])) fail(`c13b: de verstreken tijd loopt niet op: ${duur1[0]} s na ±1,4 s, ${duur2[0]} s na ±2,5 s`);
  else ok(`c13b: de verstreken tijd staat in beeld en loopt op (${duur1[0]} s → ${duur2[0]} s)`);
  // c13c
  const goed = regios.filter((r) => r.bestondAl && /\b1 lead\b/.test(r.tekst));
  if (!afgerond) fail('c13c: de sync rondde niet af — geen resultaat om te meten');
  else if (goed.length === 0) fail(`c13c: het resultaat (2 vacatures, 1 lead) staat in geen live-regio die er vóór de sync al stond (${JSON.stringify(regios)})`);
  else ok(`c13c: het resultaat staat in een live-regio (${goed[0].soort}): "${goed[0].tekst}"`);

  // c13d en c13e — de "+N"-knoppen zetten "Alleen nieuw bij de laatste sync" aan op het juiste tabblad.
  // Niet meer de status Nieuw: dat is "nog niet beoordeeld", een andere as (briefing, 2026-09-17).
  const status = page.locator('select[aria-label="Status"]');
  const vinkje = page.locator('#alleen-nieuw');
  const actiefTab = async () => ((await page.locator('[role="tab"][aria-selected="true"]').first().textContent()) ?? '').trim();
  const stand = async () => ({
    status: (await status.count()) === 1 ? await status.inputValue() : null,
    vinkje: (await vinkje.count()) === 1 ? await vinkje.getAttribute('aria-checked') : null,
    tab: await actiefTab(),
    url: Object.fromEntries(new URL(page.url()).searchParams),
  });
  const plusKnop = async (sleutel, naam, verwachtTab, urlTab) => {
    const knop = page.getByRole('button', { name: naam });
    const n = await knop.count();
    if (n !== 1) {
      fail(`${sleutel}: ${n} knoppen ${naam}, verwacht 1 — dit meet niets`);
      return;
    }
    const voor = await stand();
    await knop.click();
    await page.waitForTimeout(600);
    const na = await stand();
    if (voor.vinkje !== 'false' || voor.status === 'open' || voor.tab.startsWith(verwachtTab)) {
      fail(`${sleutel}: beginstand ${JSON.stringify(voor)} verschilt niet op alle drie de assen — de wissel meet niets`);
    } else if (na.vinkje !== 'true' || na.status !== 'open' || !na.tab.startsWith(verwachtTab) || na.url.nieuw !== '1' || (na.url.tab ?? null) !== urlTab) {
      fail(`${sleutel}: na ${naam} ${JSON.stringify(na)}, verwacht vinkje aan, status open, tabblad ${verwachtTab}, ?nieuw=1${urlTab ? `&tab=${urlTab}` : ''} (vóór ${JSON.stringify(voor)})`);
    } else {
      ok(`${sleutel}: ${naam} zet "Alleen nieuw bij de laatste sync" aan en opent ${verwachtTab} (status ${voor.status} → open, ${JSON.stringify(na.url)})`);
    }
  };
  await plusKnop('c13d', /^\+2 vacatures/, 'Vacatures', null);
  // Terug naar een beginstand die op de drie assen verschilt, zonder te herladen: het resultaat van de
  // sync staat alleen in de state van SyncButton.
  if ((await vinkje.count()) === 1 && (await vinkje.getAttribute('aria-checked')) === 'true') await vinkje.click();
  if ((await status.count()) === 1) await status.selectOption('alle');
  await page.waitForTimeout(300);
  await plusKnop('c13e', /^\+1 lead/, 'Leads', 'leads');
  await stopOnderschepping();
  notes.push(`c13: ${posts.length} POST /api/sync onderschept (verwacht 1)`);
}

// ── c04 — een spiegel die niet opent, geeft een dashboard zonder koppelingen ──
async function spiegelFout({ page, BASE, APP, ok, fail, notes, laad, extraServer, consoleErrors }, werk) {
  const leesStand = () => page.evaluate(() => ({
    foutpagina: [...document.querySelectorAll('h1')].filter((h) => h.textContent.trim() === 'Er ging iets mis').length,
    leads: document.querySelectorAll('[role="tabpanel"] [data-item^="lead-"]').length,
    melding: [...document.querySelectorAll('[role="tabpanel"] [data-spiegel-fout]')].filter((e) => e.checkVisibility()).map((e) => e.textContent.trim()),
    kbo: [...document.querySelectorAll('[role="tabpanel"] [data-item^="lead-"] span')].filter((s) => s.textContent.trim() === 'KBO?').length,
  }));

  // Positieve controle op de hoofdserver: met de gewone spiegel hoort de melding er níet te staan.
  await laad('/?tab=leads');
  const hoofd = await leesStand();
  if (hoofd.melding.length) fail(`c04: de spiegelmelding staat er ook met de gewone spiegel ("${hoofd.melding[0].slice(0, 50)}…")`);
  else ok(`c04: positieve controle — met de gewone spiegel geen spiegelmelding (${hoofd.leads} leads, ${hoofd.kbo} KBO-vermoedens)`);

  const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
  const kopie = join(werk, 'jobradar-spiegel-kopie.db');
  execFileSync('sqlite3', ['-readonly', DB, `.backup '${kopie}'`]);
  const kapotteSpiegel = join(werk, 'kbo-kapot.db');
  writeFileSync(kapotteSpiegel, 'dit is geen sqlite-database\n');

  const foutenVoor = consoleErrors.length;
  const server = await extraServer({ port: POORT_SPIEGEL, env: { JOBRADAR_DB_PATH: kopie, KBO_DB_PATH: kapotteSpiegel } });
  try {
    await laad('/?tab=leads', server.base);
    const s = await leesStand();
    if (s.foutpagina) fail(`c04: een kapotte KBO-spiegel geeft de foutpagina (${s.leads} leads)`);
    else if (s.leads === 0) fail('c04: geen foutpagina, maar ook nul leadkaarten — dit meet niets');
    else ok(`c04: een kapotte KBO-spiegel geeft het dashboard met ${s.leads} leads, geen foutpagina`);
    if (s.melding.length !== 1) fail(`c04: ${s.melding.length} zichtbare spiegelmeldingen op Leads, verwacht 1`);
    else ok(`c04: de leads zeggen waarom ("${s.melding[0].slice(0, 60)}…")`);
    if (s.kbo !== 0) fail(`c04: ${s.kbo} KBO-vermoedens op leadkaarten terwijl de spiegel niet opent`);
    else if (!s.foutpagina && s.leads) ok(`c04: nul KBO-vermoedens op ${s.leads} leadkaarten (hoofdserver: ${hoofd.kbo})`);
    if (hoofd.kbo === 0) notes.push('c04: [kanttekening] ook de hoofdserver toont nul KBO-vermoedens — "zonder koppelingen" is hier geen verschil, alleen afwezigheid');
  } finally {
    server.stop();
    const venster = consoleErrors.splice(foutenVoor);
    consoleErrors.push(...venster);
    notes.push(`c04: ${venster.length} consolefout(en) tijdens de kapotte spiegel, niets gefilterd${venster.length ? ` (${venster[0].slice(0, 80)})` : ''}`);
  }
}

// ── c02 — de foutpagina ──────────────────────────────────────────────────────
async function foutpagina({ page, APP, ok, fail, notes, laad, extraServer, consoleErrors, navigatie, toetsNavigatie }, werk) {
  const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
  const kapot = join(werk, 'jobradar-kapot.db');
  writeFileSync(kapot, 'dit is geen sqlite-database\n');
  // Voor c02c: een geldige kopie die we straks óver het kapotte pad zetten, zodat Opnieuw proberen iets
  // kán herstellen. `getDb()` onthoudt geen mislukte verbinding, dus de volgende render opent het nieuwe bestand.
  const herstel = join(werk, 'jobradar-herstel.db');
  execFileSync('sqlite3', ['-readonly', DB, `.backup '${herstel}'`]);

  const foutenVoor = consoleErrors.length;
  const server = await extraServer({ port: POORT_KAPOT, env: { JOBRADAR_DB_PATH: kapot, KBO_DB_PATH: join(werk, 'kbo-bestaat-niet.db') } });
  const A = server.base;
  const opFoutpagina = () => page.evaluate(() => [...document.querySelectorAll('h1')].filter((h) => h.textContent.trim() === 'Er ging iets mis').length);
  try {
    // c02a — een zin voor mensen, de ruwe melding ingeklapt.
    await laad('/', A);
    if ((await opFoutpagina()) !== 1) {
      fail('c02a: een onleesbare database gaf op / geen foutpagina — c02 meet niets');
      return;
    }
    const tekst = await page.evaluate(() => {
      const details = [...document.querySelectorAll('details')];
      const ruwEl = details[0]?.querySelector('p');
      const ruw = (ruwEl?.textContent ?? '').trim();
      const zinnen = [...document.querySelectorAll('p')]
        .filter((p) => !p.closest('details') && p.checkVisibility())
        .map((p) => (p.textContent ?? '').trim())
        .filter(Boolean);
      const zichtbaarRuw = ruw ? [...document.querySelectorAll('body *')]
        .filter((e) => e.children.length === 0 && (e.textContent ?? '').trim() === ruw && e.checkVisibility()).length : -1;
      return { details: details.length, open: details[0]?.open ?? null, ruw, ruwZichtbaar: ruwEl ? ruwEl.checkVisibility() : null, zinnen, zichtbaarRuw };
    });
    const mens = tekst.zinnen.filter((z) => z.length >= 20 && !z.includes(tekst.ruw) && !tekst.ruw.includes(z));
    if (tekst.details !== 1 || !tekst.ruw) fail(`c02a: ${tekst.details} details met ruwe melding "${tekst.ruw.slice(0, 40)}" — dit meet niets`);
    else if (tekst.zichtbaarRuw !== 0 || tekst.open) fail(`c02a: de ruwe melding staat zichtbaar in beeld (${tekst.zichtbaarRuw}×, details open=${tekst.open}): "${tekst.ruw.slice(0, 60)}"`);
    else if (mens.length === 0) fail(`c02a: geen zichtbare zin naast de ruwe melding; zichtbaar: ${JSON.stringify(tekst.zinnen)}`);
    else ok(`c02a: de foutpagina toont "${mens[0]}"; de ruwe melding ("${tekst.ruw.slice(0, 40)}…") staat ingeklapt`);

    // c02e (2026-09-19) — de balk van de layout staat óók op de foutpagina. `error.tsx` is een
    // grens ónder de layout, dus dit hóórt te gelden; maar "hoort" is geen meting, en juist hier
    // wil je weten waar je heen kunt. De route is `/`, dus de markering hoort op `/` te staan.
    toetsNavigatie(await navigatie(page), 'c02e: foutpagina', '/', { ok, fail });

    // c02b — op elke route een eigen uitweg naar /, en een klik is een documentnavigatie.
    //
    // Sinds 2026-09-19 staat de balk van de layout óók op de foutpagina, en die draagt zelf een
    // link naar `/`. De telling hieronder gaat daarom over de eigen uitweg van de pagina
    // (`[data-fout-naar-huis]`) en niet meer over "elke zichtbare link naar /": die twee hebben
    // een ander doel én een ander mechanisme, en op één hoop leest de ene als de andere.
    for (const route of ['/', '/?tab=leads&zoek=x', '/plan']) {
      await laad(route, A);
      if ((await opFoutpagina()) !== 1) { fail(`c02b: ${route} gaf geen foutpagina — dit meet niets`); continue; }
      const links = page.locator('a');
      const naarHuis = await links.evaluateAll((as) => as
        .map((a, i) => ({ i, url: new URL(a.href, location.href), naam: (a.textContent ?? '').trim(), zichtbaar: a.checkVisibility(), eigen: a.hasAttribute('data-fout-naar-huis') }))
        .filter((x) => x.eigen && x.url.origin === location.origin && x.url.pathname === '/' && x.zichtbaar)
        .map((x) => ({ i: x.i, naam: x.naam, href: x.url.pathname + x.url.search })));
      if (naarHuis.length !== 1) { fail(`c02b: ${route} heeft ${naarHuis.length} zichtbare eigen uitwegen naar /, verwacht 1`); continue; }
      await page.evaluate(() => { window.__harnessMerk = 'voor-de-klik'; });
      const docVerzoek = page.waitForRequest((r) => r.isNavigationRequest() && r.frame() === page.mainFrame() && r.url().startsWith(A) && new URL(r.url()).pathname === '/', { timeout: 5_000 }).catch(() => null);
      await links.nth(naarHuis[0].i).click();
      const verzoek = await docVerzoek;
      await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(400);
      const merk = await page.evaluate(() => window.__harnessMerk ?? null).catch(() => 'onleesbaar');
      const pad = new URL(page.url()).pathname + new URL(page.url()).search;
      if (!verzoek || merk !== null) fail(`c02b: op ${route} gaf "${naarHuis[0].naam}" geen documentnavigatie (documentverzoek ${verzoek ? 'ja' : 'nee'}, pagina ${merk === null ? 'nieuw' : 'dezelfde'}, nu op ${pad})`);
      else ok(`c02b: op ${route} leidt "${naarHuis[0].naam}" (${naarHuis[0].href}) met een documentnavigatie naar ${pad}`);
    }

    // c02f (2026-09-19) — geen enkele link in de balk is op de foutpagina een dode link.
    //
    // Next reset de error-boundary alléén wanneer `pathname` verandert
    // (`next/dist/client/components/error-boundary.js:64`, 15.5.25). Daaruit volgen twee
    // verschillende eisen, en ze hebben elk hun eigen meting:
    //
    //  • de link naar een ándere route verandert het pad, en dát is wat de boundary leegt;
    //  • de link naar de route waar je al staat verandert het pad níet, dus die moet een
    //    volledige herlading doen — anders is het een zichtbare knop die niets doet.
    //
    // Bewust niet gemeten: of de foutpagina daarna wég is. Deze server draait op één kapotte
    // database, dus élke route toont er terecht de foutpagina; een check op "fout weg" zou hier
    // rood zijn om een reden die niets met de balk te maken heeft. Daarvoor is een opstelling
    // nodig met één kapotte route naast gezonde routes, en die bestaat hier niet.
    for (const { naam, pad, actief } of [
      { naam: 'Radar', pad: '/', actief: true },
      { naam: 'Plan', pad: '/plan', actief: false },
      { naam: 'Instellingen', pad: '/instellingen', actief: false },
    ]) {
      await laad('/', A);
      if ((await opFoutpagina()) !== 1) { fail(`c02f: / gaf geen foutpagina vóór "${naam}" — dit meet niets`); continue; }
      const link = page.locator('header a').getByText(naam, { exact: true });
      if ((await link.count()) !== 1) { fail(`c02f: ${await link.count()} links "${naam}" in de balk, verwacht 1`); continue; }
      await page.evaluate(() => { window.__harnessMerk = 'voor-de-klik'; });
      await link.click();
      await page.waitForLoadState('load', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(600);
      const merk = await page.evaluate(() => window.__harnessMerk ?? null).catch(() => 'onleesbaar');
      const nu = new URL(page.url()).pathname;
      if (nu !== pad) fail(`c02f: een klik op "${naam}" in de balk bracht de pagina naar ${nu}, verwacht ${pad}`);
      else if (actief && merk !== null) fail(`c02f: "${naam}" is de huidige route en deed geen volledige herlading (dezelfde pagina) — op de foutpagina is dat een dode link`);
      else if (!actief && merk === null) fail(`c02f: "${naam}" deed een volledige herlading; een andere route hoort via de router te gaan, want de padwissel is wat de boundary leegt`);
      else ok(`c02f: "${naam}" in de balk gaat naar ${nu} via ${actief ? 'een volledige herlading' : 'de router (padwissel leegt de boundary)'}`);
    }

    // c02c — Opnieuw proberen haalt de server-render opnieuw op, en herstelt als de oorzaak weg is.
    await laad('/', A);
    if ((await opFoutpagina()) !== 1) {
      fail('c02c: / gaf geen foutpagina — dit meet niets');
      return;
    }
    const rsc = [];
    const luister = (r) => {
      const h = r.headers();
      if (r.url().startsWith(A) && h['rsc'] === '1' && !h['next-router-prefetch']) rsc.push(r.url());
    };
    const knop = page.getByRole('button', { name: 'Opnieuw proberen', exact: true });
    if ((await knop.count()) !== 1) {
      fail(`c02c: ${await knop.count()} knoppen "Opnieuw proberen", verwacht 1 — dit meet niets`);
      return;
    }
    page.on('request', luister);
    await knop.click();
    await wachtOp(() => rsc.length > 0, 4_000);
    await page.waitForTimeout(600);
    page.off('request', luister);
    const nogFout = await opFoutpagina();
    if (rsc.length === 0) fail('c02c: Opnieuw proberen stuurde geen RSC-verzoek — alleen reset(), de server rendert niet opnieuw');
    else ok(`c02c: Opnieuw proberen stuurt ${rsc.length} RSC-verzoek(en) naar de server (fout blijft zolang de database kapot is: ${nogFout ? 'ja' : 'nee'})`);

    // Oorzaak weg: de geldige kopie over het kapotte pad. Nu hoort dezelfde knop het dashboard terug te geven.
    renameSync(herstel, kapot);
    const weer = await wachtOp(async () => (await knop.count()) === 1, 5_000);
    if (!weer) {
      fail('c02c: "Opnieuw proberen" kwam niet terug na de eerste poging — herstel niet gemeten');
    } else {
      await knop.click();
      const hersteld = await wachtOp(() => page.evaluate(() =>
        document.querySelectorAll('[role="tablist"]').length > 0 &&
        ![...document.querySelectorAll('h1')].some((h) => h.textContent.trim() === 'Er ging iets mis')), 15_000, 200);
      if (!hersteld) fail('c02c: met een leesbare database geeft Opnieuw proberen het dashboard niet terug');
      else ok('c02c: met een leesbare database geeft Opnieuw proberen het dashboard terug, zonder herladen');
    }
  } finally {
    server.stop();
    // Alleen wat de kapotte database opwekt: de server-renderfout en de 500 op het document.
    const venster = consoleErrors.splice(foutenVoor);
    const geforceerd = venster.filter((t) => /Server Components render|status of 500/.test(t));
    consoleErrors.push(...venster.filter((t) => !/Server Components render|status of 500/.test(t)));
    notes.push(`c02: ${geforceerd.length} geforceerde consolefout(en) gefilterd, ${venster.length - geforceerd.length} andere behouden`);
  }
}
