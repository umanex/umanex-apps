#!/usr/bin/env node
/**
 * De bediening van /plan, door een browser, tegen de wegwerp-database van `plan:probe`.
 *
 * Waarom dit bestaat: de flow-harness draait tegen `.data/jobradar.db` van de tree — de database
 * waarin Jeroen werkt — en mag daarom nooit op Start of Afronden klikken. Alles wat een gevúld
 * plan vraagt (drie lopende acties, een afronding met gevolg, een 409 op de focusregel) had tot
 * 2026-09-17 geen instrument: het werd één keer met de hand gezet en gefotografeerd. Deze pass
 * draait aan het eind van `plan-probe.sh`, op de toestand die de HTTP-gevallen achterlaten, en
 * klikt dus alleen in een database die na de run weggegooid wordt.
 *
 * Omgeving (gezet door plan-probe.sh):
 *   BASE   http://127.0.0.1:3118
 *   SHOT   optioneel: map voor opnames
 *
 * Exit 0 = alle asserties geslaagd, 1 = minstens één gezakt, 2 = de opstelling klopt niet.
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE;
const SHOT = process.env.SHOT || '';
if (!BASE) {
  console.error('BASE ontbreekt');
  process.exit(2);
}

let gezakt = 0;
const v = (label, verwacht, gemeten) => {
  const gelijk = JSON.stringify(verwacht) === JSON.stringify(gemeten);
  if (gelijk) console.log(`  ✓ ${label.padEnd(66)} ${JSON.stringify(gemeten)}`);
  else {
    console.log(`  ✗ ${label.padEnd(66)} verwacht ${JSON.stringify(verwacht)}, kreeg ${JSON.stringify(gemeten)}`);
    gezakt++;
  }
};

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const opname = async (naam) => {
  if (SHOT) await page.screenshot({ path: `${SHOT}/${naam}.png`, fullPage: true });
};

// `hasText` en niet `h3:text-matches(…)`: die pseudo-klasse kiest het kleinste element met de
// tekst, en zodra de kop een knop draagt (Geblokkeerd) is dat de knop — de h3 zelf matcht dan
// niet meer. Gemeten bij de eerste run: "inklapknop 0" terwijl hij er stond.
const groep = (titel) =>
  page.locator('section').filter({ has: page.locator('h3', { hasText: new RegExp(`^${titel}`) }) });
const planJson = async () => (await (await fetch(`${BASE}/api/plan`)).json()).plan;
const patchApi = async (key, body) => {
  const plan = await planJson();
  const versie = plan.acties.find((a) => a.key === key).versie;
  return fetch(`${BASE}/api/plan/acties/${key}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...body, versie }),
  });
};

/**
 * Wat afronden van X zou moeten vrijgeven, uit de ruwe velden van het plan — status,
 * startuitzondering en afhankelijkheden — en nooit uit `uitvoerbaarheid`: anders vergelijkt deze
 * pass de app met zichzelf. Vlak vóór elke afronding berekend, op de toestand van dat moment.
 */
const orakel = async (x) => {
  const plan = await planJson();
  const status = new Map(plan.acties.map((a) => [a.key, a.status]));
  return plan.acties
    .filter(
      (y) =>
        y.status === 'niet_gestart' &&
        !y.startUitzondering &&
        y.afhankelijkheden.includes(x) &&
        y.afhankelijkheden.every((d) => d === x || status.get(d) === 'gereed')
    )
    .map((y) => y.key)
    .sort();
};

const achtergrond = (locator) => locator.evaluate((el) => getComputedStyle(el).backgroundColor);

// ── Hulp voor de fase-3-gevallen (c28–c41, 2026-09-17) ──────────────────────
const dialog = page.locator('[role="dialog"]');
const wacht = (ms) => page.waitForTimeout(ms);
/**
 * Een antwoord-belofte die nooit ongevangen afwijst. `page.waitForResponse` vóór een klik aanmaken en
 * pas ná die klik awaiten, liet bij een uitblijvend verzoek (een knop die onder een tegenproef niets
 * meer verstuurt) de belofte afwijzen terwijl de klik nog wachtte: een unhandled rejection die de hele
 * probe stopte, en elk geval daarna liep niet — gemeten in tegenproef-set T1, 2026-09-17. Nu wordt het
 * één rode regel ("geen antwoord") en lopen de volgende gevallen gewoon.
 */
const antwoordOp = (pred) => page.waitForResponse(pred).catch(() => null);
const httpStatus = (res) => res?.status() ?? 'geen antwoord';
/** Een geval dat zijn opstelling niet vindt, faalt: stil groen zou "ik keek nergens naar" zijn. */
const niets = (label) => {
  console.log(`  ✗ ${label} — dit meet niets`);
  gezakt++;
};
/**
 * Waar de focus staat, en of het verzoek nog loopt. `bezigSelector` wijst een veld aan dat
 * `disabled={bezig}` draagt: dat is de positieve controle dat een meting "tijdens" ook echt
 * tijdens het verzoek viel, en niet erna.
 */
const focusStand = (bezigSelector = null) =>
  page.evaluate((sel) => {
    const a = document.activeElement;
    const body = !a || a === document.body;
    const naam = body ? '' : (a.getAttribute('aria-label') || a.textContent || a.id || '').trim().slice(0, 32);
    return {
      body,
      beschrijving: body ? 'body' : `${a.tagName.toLowerCase()}${a.getAttribute('role') ? `[role=${a.getAttribute('role')}]` : ''} "${naam}"`,
      bezig: sel ? Boolean(document.querySelector(sel)?.disabled) : null,
    };
  }, bezigSelector);
/** Een verzoek vertragen en daarna gewoon laten doorgaan: de toestand "tijdens" wordt meetbaar. */
const vertraag = (glob, methode, ms) =>
  page.route(glob, async (route) => {
    if (route.request().method() !== methode) return route.continue();
    await new Promise((r) => setTimeout(r, ms));
    return route.continue().catch(() => {});
  });
/** Een verzoek beantwoorden zonder de server — de database blijft staan. */
const beantwoord = (glob, methode, status, body) =>
  page.route(glob, (route) =>
    route.request().method() === methode
      ? route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      : route.continue()
  );
/**
 * POSITIEVE CONTROLE op een onderschepping: dezelfde methode naar hetzelfde pad, vanuit de pagina.
 * De body is ongeldig, dus mocht de route níet werken, dan weigert de server hem met een 400 — een
 * andere status dan de geforceerde, en niets in de database.
 */
const onderschept = (pad, methode) =>
  page.evaluate(
    ([p, m]) =>
      fetch(p, {
        method: m,
        headers: { 'content-type': 'application/json' },
        body: m === 'GET' ? undefined : '{"ui-probe":"controle"}',
      }).then(
        (r) => r.status,
        () => 'afgebroken'
      ),
    [pad, methode]
  );
/** Sluit een open paneel; vraagt het om bevestiging, dan weggooien. Voor opruimen, niet om te meten. */
const sluit = async () => {
  if (!(await dialog.count())) return;
  await page.keyboard.press('Escape');
  await wacht(250);
  const weg = dialog.locator('[data-sluit-vraag] button', { hasText: /^Weggooien$/ });
  if (await weg.count()) await weg.click();
  await dialog.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
};
/**
 * Escape, en meten of het paneel zónder bevestigingsvraag sluit. Vroeger een `waitFor` die gooide:
 * een vraag die verschijnt brak dan de hele probe af in plaats van één regel rood te maken.
 */
const sluitZonderVraag = async () => {
  await page.keyboard.press('Escape');
  const dicht = await dialog.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
  if (!dicht) await sluit();
  return dicht;
};
/** Eén geval per blok: breekt er één af, dan faalt dat blok zichtbaar en lopen de volgende gewoon. */
const blok = async (naam, fn) => {
  try {
    await fn();
  } catch (e) {
    console.log(`  ✗ ${naam}: brak af — ${e.message.split('\n')[0]}`);
    gezakt++;
    await page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
    await sluit().catch(() => {});
  }
  await page.setViewportSize({ width: 1280, height: 900 });
};

try {
  // Eén lopende actie krijgt een volgende stap, zodat de Eerstvolgende-kaart de reden `actief`
  // draagt — de enige toestand waarin de stap zelf als instructie in de kaart staat.
  const stap = await patchApi('A01', { volgendeStap: 'ui-probe: bespreek de scope' });
  if (stap.status !== 200) {
    console.error(`✗ Volgende stap op A01 zetten gaf HTTP ${stap.status}.`);
    process.exit(2);
  }
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });

  // POSITIEVE CONTROLE: de toestand die de HTTP-gevallen achterlieten. Klopt die niet, dan meet
  // alles hieronder iets anders dan bedoeld.
  const plan0 = await planJson();
  if (plan0.overzicht.nuBezig.length !== 3 || plan0.overzicht.beschikbaar.length === 0) {
    console.error(
      `✗ Verwacht 3 lopende en minstens 1 beschikbare actie na de HTTP-gevallen, kreeg ${plan0.overzicht.nuBezig.length} en ${plan0.overzicht.beschikbaar.length}.`
    );
    process.exit(2);
  }
  console.log(
    `UI 0. positieve controle: 3 lopend, ${plan0.overzicht.beschikbaar.length} beschikbaar, ${plan0.overzicht.geblokkeerd.length} geblokkeerd`
  );

  // ── Typologie, per rij ─────────────────────────────────────────────────────
  const perRij = async (sectie, selector) =>
    sectie.locator('li[data-actie]').evaluateAll(
      (rijen, sel) => rijen.map((r) => r.querySelectorAll(sel).length),
      selector
    );
  const beschikbaar = groep('Beschikbaar');
  const startPerRij = await perRij(beschikbaar, 'button[aria-label^="Start "]');
  v('UI 1. Beschikbaar: rijen = API', plan0.overzicht.beschikbaar.length, startPerRij.length);
  v('   elke rij precies één Start', startPerRij.map(() => 1), startPerRij);
  v('   geen Afronden in Beschikbaar', 0, await beschikbaar.locator('button[aria-label^="Afronden "]').count());

  const nuBezig = groep('Nu bezig');
  const afrondPerRij = await perRij(nuBezig, 'button[aria-label^="Afronden "]');
  v('UI 2. Nu bezig: rijen', 3, afrondPerRij.length);
  v('   elke rij precies één Afronden…', [1, 1, 1], afrondPerRij);
  v('   Afronden… draagt aria-haspopup="dialog"', 3, await nuBezig.locator('button[aria-label^="Afronden "][aria-haspopup="dialog"]').count());

  const geblokkeerd = groep('Geblokkeerd');
  const toggle = geblokkeerd.locator('h3 button[aria-expanded]');
  v('UI 3. Geblokkeerd heeft een inklapknop', 1, await toggle.count());
  v('   dicht bij het laden', 'false', await toggle.getAttribute('aria-expanded'));
  v('   rijen onzichtbaar zolang dicht', 0, await geblokkeerd.locator('li[data-actie]:visible').count());
  const hoogte = (sectie) => sectie.locator('h3').first().evaluate((h) => Math.round(h.getBoundingClientRect().height));
  const hB = await hoogte(beschikbaar);
  const hG = await hoogte(geblokkeerd);
  v(`   kop Geblokkeerd even hoog als Beschikbaar (${hG} vs ${hB} px, ≤ 4)`, true, Math.abs(hG - hB) <= 4);
  await opname('plan-overzicht');
  await toggle.click();
  v('   open na één klik', 'true', await toggle.getAttribute('aria-expanded'));
  v('   rijen zichtbaar = API', plan0.overzicht.geblokkeerd.length, await geblokkeerd.locator('li[data-actie]:visible').count());
  v('   nul Start/Afronden in Geblokkeerd', 0, await geblokkeerd.locator('button[aria-label^="Start "], button[aria-label^="Afronden "]').count());
  await opname('plan-geblokkeerd-open');

  v('UI 4. geen select in een actierij (overzicht)', 0, await page.locator('li[data-actie] select').count());

  const kaart = page.locator('[data-eerstvolgende]');
  v('UI 5. Eerstvolgende-kaart', 1, await kaart.count());
  v('   met precies één knop', 1, await kaart.locator('button').count());
  v('   één h3, die "Eerstvolgende" en de key draagt', true, await kaart.locator('h3').evaluateAll((hs, key) => hs.length === 1 && hs[0].textContent.includes('Eerstvolgende') && hs[0].textContent.includes(key), plan0.overzicht.volgendeActie.key));
  v('   geen los label boven de kop', 0, await kaart.locator('p', { hasText: /^Eerstvolgende$/ }).count());
  const kaartVoorGroep = await page.evaluate(() => {
    const k = document.querySelector('[data-eerstvolgende]');
    const h = [...document.querySelectorAll('section h3')].find((x) => !k.contains(x));
    return Boolean(k && h && k.compareDocumentPosition(h) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  v('   staat vóór de eerste groep', true, kaartVoorGroep);

  // ── Gewicht: berekende kleuren, geen klassen ──────────────────────────────
  const pagina = await achtergrond(page.locator('body'));
  const kaartKnop = await achtergrond(kaart.locator('button'));
  const rijKnop = await achtergrond(nuBezig.locator('button[aria-label^="Afronden "]').first());
  v('UI 5b. de kaartknop is primair (achtergrond ≠ pagina)', true, kaartKnop !== pagina && kaartKnop !== 'rgba(0, 0, 0, 0)');
  v('   Afronden… op een rij is outline (achtergrond = pagina)', pagina, rijKnop);
  v('   opstelling: de kaart heeft reden "actief"', 'actief', plan0.overzicht.volgendeActie.reden);
  const [uitleg, voorgrond, muted] = await Promise.all([
    kaart.locator('[data-eerstvolgende-uitleg]').evaluate((el) => getComputedStyle(el).color),
    page.locator('h1').evaluate((el) => getComputedStyle(el).color),
    kaart.locator('h3 span').first().evaluate((el) => getComputedStyle(el).color),
  ]);
  v('   de volgende stap in de kaart staat in de voorgrondkleur', voorgrond, uitleg);
  v('   (en die kleur verschilt van muted — anders meet dit niets)', true, voorgrond !== muted);

  // ── Randgevallen ───────────────────────────────────────────────────────────
  let chips = 0;
  let chipsMetTitel = 0;
  for (const a of plan0.acties.filter((x) => plan0.overzicht.geblokkeerd.includes(x.key))) {
    const teksten = await page.locator(`li[data-actie="${a.key}"] ul[aria-label^="Waarop"] li`).allInnerTexts();
    for (const b of a.blokkade) {
      chips++;
      if (teksten.some((t) => t.includes(b.titel))) chipsMetTitel++;
    }
  }
  v(`UI 6. blokkadechips met titel (van ${chips})`, chips, chipsMetTitel);
  if (chips === 0) { console.log('  ✗ nul chips gemeten — dit geval meet niets'); gezakt++; }

  const rijTekst = await page.locator('li[data-actie]').allInnerTexts();
  v('UI 7. geen rij met "inzet onbekend"', 0, rijTekst.filter((t) => t.includes('inzet onbekend')).length);
  const voortgang = groep('Voortgang per prioriteit');
  v('   de voortgang is precies één sectie', 1, await voortgang.count());
  v('   en noemt onbekende inzet nog', true, /\d+ onbekend/.test(await voortgang.innerText()));

  // ── States en interactie: 409 focus, met loading ──────────────────────────
  const eersteStart = beschikbaar.locator('button[aria-label^="Start "]').first();
  const startKey = (await eersteStart.getAttribute('aria-label')).replace('Start ', '');
  const patches = [];
  page.on('request', (r) => {
    if (r.method() === 'PATCH' && r.url().includes('/api/plan/acties/')) patches.push({ url: r.url(), body: r.postData() });
  });
  await page.route('**/api/plan/acties/*', async (route) => {
    if (route.request().method() !== 'PATCH') return route.continue();
    await new Promise((r) => setTimeout(r, 800));
    return route.continue();
  });
  const antwoord409 = antwoordOp((r) => r.request().method() === 'PATCH');
  await eersteStart.click();
  await page.waitForTimeout(150);
  v('UI 8. Start staat disabled tijdens de PATCH', true, await page.locator(`button[aria-label="Start ${startKey}"]`).first().isDisabled());
  const r409 = await antwoord409;
  v('   bij drie lopende acties: HTTP 409', 409, httpStatus(r409));
  v('   precies één PATCH verstuurd', 1, patches.length);
  v('   met status bezig', 'bezig', JSON.parse(patches[0]?.body ?? '{}').status);
  await page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
  v('   het paneel opent met de parkeerkeuze', true, (await page.locator('[role="dialog"] button', { hasText: 'Parkeer' }).count()) > 0);
  await page.unroute('**/api/plan/acties/*');
  await page.keyboard.press('Escape');
  await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 });

  // ── Error: een 500 ─────────────────────────────────────────────────────────
  await page.route('**/api/plan/acties/*', (route) =>
    route.request().method() === 'PATCH'
      ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'ui-probe: geforceerde fout' }) })
      : route.continue()
  );
  await beschikbaar.locator('button[aria-label^="Start "]').first().click();
  await page.waitForTimeout(500);
  v('UI 9. een 500 toont een alert op de pagina', 1, await page.locator('[role="alert"]', { hasText: 'geforceerde fout' }).count());
  await page.unroute('**/api/plan/acties/*');
  await page.reload({ waitUntil: 'networkidle' });

  // ── Success: afronden, met en zonder gevolg ────────────────────────────────
  const rondAf = async (key, label) => {
    const verwacht = await orakel(key);
    await page.locator(`button[aria-label="Afronden ${key}"]`).click();
    await page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
    const focusOpBewijs = await page.evaluate(() => document.activeElement?.id === 'plan-bewijs');
    await page.fill('#plan-bewijs', `ui-probe: ${key} is af`);
    const antwoord = antwoordOp((r) => r.request().method() === 'PATCH');
    await page.locator('[role="dialog"] button', { hasText: 'Markeer gereed' }).click();
    const res = await antwoord;
    const json = res ? await res.json().catch(() => ({})) : {};
    await page.waitForTimeout(700);
    const api = [...(json.vrijgekomen ?? [])].sort();
    const ui = (await page.locator('[data-vrijgekomen] li').allInnerTexts()).map((t) => t.trim().split(/\s/)[0]).sort();
    const melding = page.locator('[data-vrijgekomen-melding]');
    v(`${label} Afronden ${key} opent op het bewijsveld`, true, focusOpBewijs);
    v('   API vrijgekomen = orakel uit de ruwe velden', verwacht, api);
    v('   paneel toont precies de API-keys', api, ui);
    v('   de melding staat in een aria-live-regio', 'polite', await melding.getAttribute('aria-live'));
    v('   en noemt de afronding', true, (await melding.innerText()).includes(`${key} afgerond`));
    const inBeeld = await page.evaluate((selector) => {
      const dialog = document.querySelector('[role="dialog"]');
      const doel = selector === 'afgerond'
        ? [...(dialog?.querySelectorAll('h3') ?? [])].find((h) => h.textContent?.trim() === 'Afgerond')
        : dialog?.querySelector(selector);
      if (!dialog || !doel) return 'niet gevonden';
      const d = dialog.getBoundingClientRect();
      const r = doel.getBoundingClientRect();
      return r.top >= d.top && r.top < d.bottom;
    }, api.length > 0 ? '[data-vrijgekomen]' : 'afgerond');
    v(`   ${api.length > 0 ? 'het blok "nu beschikbaar"' : 'de kop "Afgerond"'} staat in beeld`, true, inBeeld);
    v(
      '   de focus staat binnen het paneel',
      true,
      await page.evaluate(() => document.activeElement !== document.body && Boolean(document.querySelector('[role="dialog"]')?.contains(document.activeElement)))
    );
    v(
      '   en niet op het resultaatblok (geen dubbele aankondiging)',
      false,
      await page.evaluate(() => Boolean(document.activeElement?.closest('[data-vrijgekomen]')))
    );
    return api;
  };

  const vrijA01 = await rondAf('A01', 'UI 10.');
  if (vrijA01.length === 0) { console.log('  ✗ A01 hoort in deze toestand iets vrij te geven — dit geval meet niets'); gezakt++; }
  await opname('plan-paneel-vrijgekomen');
  const planNa10 = await planJson();
  const startIffBeschikbaar = await page.locator('[data-vrijgekomen] li').evaluateAll(
    (lis, acties) => lis.map((li) => {
      const key = li.textContent.trim().split(/\s/)[0];
      const a = acties.find((x) => x.key === key);
      return Boolean(li.querySelector('button[aria-label^="Start "]')) === (a?.uitvoerbaarheid === 'beschikbaar');
    }),
    planNa10.acties.map((a) => ({ key: a.key, uitvoerbaarheid: a.uitvoerbaarheid }))
  );
  v('   Start in het blok ⇔ uitvoerbaarheid beschikbaar (per actie)', startIffBeschikbaar.map(() => true), startIffBeschikbaar);

  // ── P2-3: een conflict vanuit het paneel, terwijl het detail nog laadt ────
  // Een derde actie starten buiten de browser om, zodat Start in het blok op de focusregel strandt.
  const derde = planNa10.acties.find((a) => a.uitvoerbaarheid === 'beschikbaar' && !vrijA01.includes(a.key));
  const vrijKey = vrijA01[0];
  if (!derde || !vrijKey) {
    console.log('  ✗ UI 10b. geen derde beschikbare actie of geen vrijgekomen actie — dit geval meet niets');
    gezakt++;
  } else {
    v(`UI 10b. ${derde.key} buiten de browser om gestart`, 200, (await patchApi(derde.key, { status: 'bezig' })).status);
    await page.route(`**/api/plan/acties/${vrijKey}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      await new Promise((r) => setTimeout(r, 1500));
      return route.continue();
    });
    const conflict = antwoordOp((r) => r.request().method() === 'PATCH');
    await page.locator(`[data-vrijgekomen] button[aria-label="Start ${vrijKey}"]`).click();
    v(`   Start ${vrijKey} vanuit het paneel: HTTP 409`, 409, httpStatus(await conflict));
    await page.waitForTimeout(400);
    const titelsTijdensLaden = await page.locator('[role="dialog"] h2').allInnerTexts();
    v('   tijdens het laden staat A01 niet meer in een sheet-titel', false, titelsTijdensLaden.some((t) => t.includes('A01')));
    await page.locator('[role="dialog"] h2', { hasText: vrijKey }).waitFor({ timeout: 5000 });
    v(`   na het laden: het paneel van ${vrijKey} met de parkeerkeuze`, true, (await page.locator('[role="dialog"] button', { hasText: 'Parkeer' }).count()) > 0);
    await page.unroute(`**/api/plan/acties/${vrijKey}`);
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 });
  }

  // ── P1-1: Heropen in hetzelfde paneel ruimt het resultaat op ──────────────
  const lopend = (await planJson()).overzicht.nuBezig;
  const metGevolg = [];
  for (const k of lopend) if ((await orakel(k)).length > 0) metGevolg.push(k);
  if (metGevolg.length === 0) {
    console.log(`  ✗ UI 11. geen lopende actie met gevolg (lopend: ${lopend}) — dit geval meet niets`);
    gezakt++;
  } else {
    const k = metGevolg[0];
    const vrij = await rondAf(k, 'UI 11.');
    v('   het blok staat er vóór Heropen', vrij.length > 0, (await page.locator('[data-vrijgekomen]').count()) > 0);

    // P1-1c: het blok staat nog, maar de vrijgekomen actie is intussen weer geblokkeerd. Dat
    // gebeurt hier buiten de browser om (een extra afhankelijkheid), en een veldwijziging in het
    // paneel ververst het plan zonder het resultaat te wissen. Status zegt dan nog altijd "niet
    // gestart"; alleen de uitvoerbaarheid zegt dat Start niet kan. Dit is de enige opstelling
    // waarin een Start op status in plaats van uitvoerbaarheid zichtbaar fout gaat.
    const vrijK = vrij[0];
    const planP = await planJson();
    const extra = planP.acties.find((a) => a.status === 'niet_gestart' && a.key !== vrijK && a.afhankelijkheden.length === 0);
    if (!extra) {
      console.log('  ✗ P1-1c. geen niet-gestarte actie zonder afhankelijkheden om aan te hangen — dit geval meet niets');
      gezakt++;
    } else {
      const deps = planP.acties.find((a) => a.key === vrijK).afhankelijkheden;
      v(`   P1-1c. ${vrijK} krijgt buiten de browser om ${extra.key} als afhankelijkheid`, 200, (await patchApi(vrijK, { afhankelijkheden: [...deps, extra.key] })).status);
      const titel = await page.inputValue('#plan-titel');
      await page.fill('#plan-titel', `${titel} ·`);
      const bewaard = antwoordOp((r) => r.request().method() === 'PATCH');
      await page.locator('[role="dialog"] button', { hasText: /^Bewaar$/ }).click();
      v('   een veldwijziging in het paneel: HTTP 200', 200, httpStatus(await bewaard));
      await page.waitForTimeout(700);
      v(`   opstelling: ${vrijK} is nu geblokkeerd`, 'geblokkeerd', (await planJson()).acties.find((a) => a.key === vrijK).uitvoerbaarheid);
      v(`   het blok noemt ${vrijK} nog`, 1, await page.locator('[data-vrijgekomen] li', { hasText: vrijK }).count());
      v(`   maar zonder Start-knop voor ${vrijK}`, 0, await page.locator(`[data-vrijgekomen] button[aria-label="Start ${vrijK}"]`).count());
    }
    await page.fill('#plan-heropen', 'ui-probe: toch niet af');
    const heropen = antwoordOp((r) => r.request().method() === 'PATCH');
    await page.locator('[role="dialog"] button', { hasText: 'Heropen' }).click();
    v(`   Heropen ${k}: HTTP 200`, 200, httpStatus(await heropen));
    await page.waitForTimeout(700);
    v('   na Heropen: geen blok "nu beschikbaar"', 0, await page.locator('[data-vrijgekomen]').count());
    v('   na Heropen: de live-regio is leeg', '', (await page.locator('[data-vrijgekomen-melding]').innerText()).trim());
    // c39: de heropen-reden is verwerkt en telt niet meer als onbewaard.
    v('c39: na Heropen sluit Escape het paneel zonder vraag', true, await sluitZonderVraag());
  }

  // ── Afronden zonder gevolg ─────────────────────────────────────────────────
  const zonder = [];
  for (const k of (await planJson()).overzicht.nuBezig) if ((await orakel(k)).length === 0) zonder.push(k);
  if (zonder.length === 0) {
    console.log('  ✗ UI 12. geen lopende actie zonder gevolg — dit geval meet niets');
    gezakt++;
  } else {
    await rondAf(zonder[0], 'UI 12.');
    v('   zonder gevolg: geen lijst "nu beschikbaar"', 0, await page.locator('[data-vrijgekomen]').count());
    // c39: het bewijs is verwerkt en telt niet meer als onbewaard.
    v('c39: na Markeer gereed sluit Escape het paneel zonder vraag', true, await sluitZonderVraag());
    // c38b: Afronden… (de opener) en de rij zijn weg — een gereed-actie staat in geen overzichtsgroep.
    await wacht(200);
    const naAfronden = await focusStand();
    v(`c38b: na Afronden → gereed → sluiten: focus op een anker (${naAfronden.beschrijving})`, false, naAfronden.body);
  }

  // ── Focus na een geslaagde Start vanaf een rij ─────────────────────────────
  const planVoor13 = await planJson();
  if (planVoor13.overzicht.nuBezig.length >= planVoor13.instellingen.focusLimiet) {
    console.log(`  ✗ UI 13. focusregel vol (${planVoor13.overzicht.nuBezig}) — dit geval meet niets`);
    gezakt++;
  } else {
    const start2 = groep('Beschikbaar').locator('button[aria-label^="Start "]').first();
    const key2 = (await start2.getAttribute('aria-label')).replace('Start ', '');
    const antwoord200 = antwoordOp((r) => r.request().method() === 'PATCH');
    await start2.click();
    v('UI 13. Start met ruimte in de focusregel: HTTP 200', 200, httpStatus(await antwoord200));
    await page.waitForTimeout(500);
    v('   de focus staat daarna in de rij van die actie', key2, await page.evaluate(() => document.activeElement?.closest('[data-actie]')?.getAttribute('data-actie') ?? null));
  }

  // ── Vervallen: de gevolgen vóór bevestigen, per actie ─────────────────────
  const plan1 = await planJson();
  const open = (k) => { const d = plan1.acties.find((x) => x.key === k); return d && d.status !== 'gereed' && d.status !== 'vervallen'; };
  const metAfhankelijken = plan1.acties.find((a) => a.status === 'niet_gestart' && a.afhankelijken.some(open));
  if (!metAfhankelijken) {
    console.log('  ✗ UI 14. geen actie met open afhankelijken gevonden — dit geval meet niets');
    gezakt++;
  } else {
    const k = metAfhankelijken.key;
    const verwacht = metAfhankelijken.afhankelijken.filter(open).sort();
    const g = groep('Geblokkeerd').locator('h3 button[aria-expanded="false"]');
    if (await g.count()) await g.click();
    await page.locator(`li[data-actie="${k}"] button`).first().click();
    await page.locator('[role="dialog"]').waitFor({ timeout: 5000 });
    await page.selectOption('[role="dialog"] select[aria-label="Status wijzigen"]', 'vervallen');
    await page.waitForTimeout(200);
    const regels = await page.locator('[data-vervallen-gevolg] li').allInnerTexts();
    v(`UI 14. vervallen ${k}: gevolgen vóór bevestigen`, verwacht, regels.map((t) => t.trim().split(/\s/)[0]).sort());
    const perActie = regels.every((t) => {
      const key = t.trim().split(/\s/)[0];
      const st = plan1.acties.find((x) => x.key === key)?.status;
      return st === 'bezig' ? t.includes('loopt door') : t.includes('kan daarna niet starten');
    });
    v('   elke regel noemt het eigen gevolg', true, perActie);
    v('   geen zin die alles tegelijk "hard blokkeert"', 0, await page.locator('[data-vervallen-gevolg]', { hasText: 'blokkeert' }).count());
    v('   en er is nog niets verstuurd', 'niet_gestart', (await planJson()).acties.find((a) => a.key === k).status);
    await page.locator('[role="dialog"] button', { hasText: 'Annuleer' }).click();
    await page.keyboard.press('Escape');
  }

  // ── Acties-tab ─────────────────────────────────────────────────────────────
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
  await page.locator('[role="tab"]', { hasText: 'Acties' }).first().click();
  await page.waitForTimeout(400);
  const plan2 = await planJson();
  v('UI 15. Acties-tab: rijen = API', plan2.acties.length, await page.locator('[role="tabpanel"]:visible li[data-actie]').count());
  v('   geen select in een actierij', 0, await page.locator('[role="tabpanel"]:visible li[data-actie] select').count());

  // ── 400 px, gevuld, met de langste chips in beeld ──────────────────────────
  // Een vervallen afhankelijkheid levert de langste chiptekst op. Zonder die toestand en met
  // Geblokkeerd dicht kon de harness-check op 400 px de nieuwe inhoud per constructie niet zien.
  const teVervallen = plan2.acties.find((a) => a.status === 'niet_gestart' && a.afhankelijken.some((k) => plan2.acties.find((x) => x.key === k)?.status === 'niet_gestart'));
  if (teVervallen) v(`UI 16. ${teVervallen.key} op vervallen gezet voor de langste chip`, 200, (await patchApi(teVervallen.key, { status: 'vervallen', reden: 'ui-probe' })).status);
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
  const knop400 = groep('Geblokkeerd').locator('h3 button[aria-expanded="false"]');
  if (await knop400.count()) await knop400.click();
  await page.waitForTimeout(300);
  const hardeChips = await page.locator('li[data-actie] ul[aria-label^="Waarop"] li', { hasText: 'is vervallen' }).count();
  v('   op 400 px staan harde chips in beeld (positieve controle)', true, hardeChips > 0);
  const overloop = () => page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  const o1 = await overloop();
  v(`   overzicht op 400 px, Geblokkeerd open: geen overloop (${o1.scroll} ≤ ${o1.client})`, true, o1.scroll <= o1.client);
  await opname('plan-400-gevuld');
  await page.locator('[role="tab"]', { hasText: 'Acties' }).first().click();
  await page.waitForTimeout(400);
  const o2 = await overloop();
  v(`   Acties-tab op 400 px: geen overloop (${o2.scroll} ≤ ${o2.client})`, true, o2.scroll <= o2.client);

  // ── Empty: Geblokkeerd zonder acties ───────────────────────────────────────
  // Geen enkele echte toestand van deze probe heeft nul geblokkeerde acties. Het plan komt
  // server-side binnen, maar elke geslaagde mutatie vervangt het door `data.plan` uit het
  // antwoord — dus één onderschept PATCH-antwoord met een lege groep zet de toestand, zonder
  // debug-code in de app.
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
  const planLeeg = await planJson();
  const startLeeg = groep('Beschikbaar').locator('button[aria-label^="Start "]').first();
  if (!(await startLeeg.count())) {
    console.log('  ✗ UI 17. geen Start-knop om een mutatie mee te versturen — dit geval meet niets');
    gezakt++;
  } else {
    v('UI 17. opstelling: vóór de onderschepping heeft Geblokkeerd een inklapknop', 1, await groep('Geblokkeerd').locator('h3 button[aria-expanded]').count());
    const leeg = { ...planLeeg, overzicht: { ...planLeeg.overzicht, geblokkeerd: [] } };
    await page.route('**/api/plan/acties/*', (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, plan: leeg, vrijgekomen: [] }) })
        : route.continue()
    );
    await startLeeg.click();
    await page.waitForTimeout(500);
    const g = groep('Geblokkeerd');
    v('   daarna: geen inklapknop', 0, await g.locator('h3 button[aria-expanded]').count());
    v('   en de diagnose "Niets geblokkeerd." staat er', true, (await g.innerText()).includes('Niets geblokkeerd.'));
    await page.unroute('**/api/plan/acties/*');
  }

  // ══ Fase 3: fouten en toegankelijkheid (briefing 2026-09-17-feature-a11y-fouten, c28–c41) ══
  // Elk blok leidt zijn opstelling af uit de API op het moment zelf, en elke regel draagt de
  // sleutel van zijn acceptatie-item. Geforceerde fouten gaan via `page.route` met een positieve
  // controle; al het andere schrijft gewoon, want deze database gaat na de run weg.
  page.setDefaultTimeout(8000);
  const ruimte = (plan) => plan.acties.filter((a) => a.status === 'niet_gestart').map((a) => a.key);
  const beslismomenten = page.locator('section', { has: page.locator('h3', { hasText: /^Beslismomenten$/ }) });

  // ── c29 + c41: het status-select van het actiepaneel ──────────────────────
  await blok('c29', async () => {
    const k = ruimte(await planJson())[0];
    if (!k) return niets('c29: geen niet-gestarte actie');
    await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    const select = dialog.locator('select[aria-label="Status wijzigen"]');
    v(`c29: opstelling: het paneel van ${k} heeft één status-select`, 1, await select.count());
    // Elke PATCH krijgt een 500 zonder de server te raken: een pijl die toch verstuurt, telt, maar
    // start geen actie en schrijft geen geschiedenis.
    await beantwoord('**/api/plan/acties/*', 'PATCH', 500, { ok: false, error: 'ui-probe: c29 geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 500)', 500, await onderschept(`/api/plan/acties/${k}`, 'PATCH'));
    const voor = patches.length;
    await select.evaluate((el) => {
      window.__wissels = [];
      el.addEventListener('change', () => window.__wissels.push(el.value));
    });
    await select.focus();
    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('ArrowDown');
      await wacht(150);
    }
    let wissels = await page.evaluate(() => window.__wissels);
    // Op macOS opent een pijl de lijst soms in plaats van de waarde te verzetten; een letter
    // (typeahead) verzet hem op elk platform. Pauze > 1 s, anders worden de letters één zoekterm.
    if (wissels.length < 2) {
      for (const letter of ['b', 'w', 'v']) {
        await page.keyboard.press(letter);
        await wacht(1100);
      }
      wissels = await page.evaluate(() => window.__wissels);
    }
    await wacht(600);
    v(`c29: positieve controle: het toetsenbord verzette de select (${wissels.join(' → ') || 'geen'})`, true, wissels.length >= 2);
    v('c29: pijltoetsen/letters door het status-select: 0 PATCH-verzoeken', 0, patches.length - voor);
    v('   het bevestigblok staat er', 1, await dialog.locator('[data-status-bevestig]').count());
    v('   de focus staat nog op de select', true, await select.evaluate((el) => document.activeElement === el));
    // De teller zelf kan tellen: de knop die wél verstuurt, telt precies één.
    await select.selectOption('bezig');
    const zet = dialog.locator('[data-status-bevestig] button', { hasText: /^Zet op/ });
    if ((await zet.count()) !== 1) niets('c29: positieve controle: geen knop "Zet op bezig"');
    else {
      await zet.click();
      await wacht(600);
      v('c29: positieve controle: "Zet op bezig" telt precies één PATCH', 1, patches.length - voor);
    }
    await page.unroute('**/api/plan/acties/*');

    // c41: vervallen, zoals de select het toont. Kiezen verstuurt niets (c29), dus meten mag.
    await select.selectOption('vervallen');
    await wacht(400);
    const c41 = await select.evaluate((el) => {
      const rgb = (s) => {
        const m = s.match(/rgba?\(([^)]+)\)/);
        if (!m) return null;
        const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
        return { r, g, b, a };
      };
      const lum = ({ r, g, b }) => {
        const f = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      const mix = (x, y, a) => ({ r: a * x.r + (1 - a) * y.r, g: a * x.g + (1 - a) * y.g, b: a * x.b + (1 - a) * y.b });
      const st = getComputedStyle(el);
      // De opacity van de select en al zijn voorouders: die dimt tekst én vlak samen over wat eronder ligt.
      let alpha = 1;
      for (let n = el; n; n = n.parentElement) alpha *= Number(getComputedStyle(n).opacity);
      let achter = null;
      for (let n = el.parentElement; n && !achter; n = n.parentElement) {
        const c = rgb(getComputedStyle(n).backgroundColor);
        if (c && c.a === 1) achter = c;
      }
      const tekst = rgb(st.color);
      const eigen = rgb(st.backgroundColor);
      if (!tekst || !achter) return { fout: `kleur niet te lezen: ${st.color}` };
      const vlak = eigen && eigen.a === 1 ? eigen : achter;
      const t = mix(mix(tekst, vlak, tekst.a), achter, alpha);
      const b = mix(vlak, achter, alpha);
      const [l1, l2] = [lum(t), lum(b)].sort((x, y) => y - x);
      return { waarde: el.value, ratio: Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100, alpha, kleur: st.color };
    });
    if (c41.fout || c41.waarde !== 'vervallen') niets(`c41: ${c41.fout ?? `de select toont ${c41.waarde}, niet vervallen`}`);
    else v(`c41: vervallen in het status-select: ${c41.ratio}:1 (opacity ${c41.alpha}, ${c41.kleur}) ≥ 4,5`, true, c41.ratio >= 4.5);
    await sluit();
  });

  // ── c30 + c30c: Bewaar en Zet op in het actiepaneel ───────────────────────
  await blok('c30', async () => {
    const k = ruimte(await planJson())[1];
    if (!k) return niets('c30: geen tweede niet-gestarte actie');
    await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    const regio = dialog.locator('[data-paneel-melding]');
    v(`c30: opstelling: het paneel van ${k} heeft één meldingsregio`, 1, await regio.count());
    v('c30: die regio staat er vóór een handeling, met aria-live="polite"', { live: 'polite', tekst: '' }, { live: await regio.getAttribute('aria-live'), tekst: (await regio.textContent()).trim() });
    const selectBezig = '[role="dialog"] select[aria-label="Status wijzigen"]';
    const titel = await page.inputValue('#plan-titel');
    await page.fill('#plan-titel', `${titel} ·`);
    const bewaar = dialog.locator('button', { hasText: /^Bewaar$/ });
    v('   opstelling: één knop Bewaar', 1, await bewaar.count());

    // Eerst geweigerd: een regio die ook dán spreekt, zegt niets over de handeling.
    await beantwoord(`**/api/plan/acties/${k}`, 'PATCH', 500, { ok: false, error: 'ui-probe: c30 geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 500)', 500, await onderschept(`/api/plan/acties/${k}`, 'PATCH'));
    await bewaar.click();
    await wacht(500);
    v('c30: een geweigerde Bewaar kondigt niets aan', '', (await regio.textContent()).trim());
    await page.unroute(`**/api/plan/acties/${k}`);

    await vertraag(`**/api/plan/acties/${k}`, 'PATCH', 1500);
    await bewaar.focus();
    const r1 = antwoordOp((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/acties/${k}`));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t1 = await focusStand(selectBezig);
    v(`c30c: tijdens Bewaar staat de focus niet op body (${t1.beschrijving})`, false, t1.body);
    v('   positieve controle: het verzoek liep nog (status-select uitgeschakeld)', true, t1.bezig);
    v('   Bewaar: HTTP 200', 200, httpStatus(await r1));
    await wacht(500);
    v(`c30: Bewaar wordt aangekondigd ("${(await regio.textContent()).trim()}")`, true, (await regio.textContent()).includes('wijzigingen bewaard'));

    const select = dialog.locator('select[aria-label="Status wijzigen"]');
    await select.selectOption('wacht_op_input');
    await page.fill('#plan-wachtreden', 'ui-probe: c30 wacht op een antwoord');
    const zet = dialog.locator('[data-status-bevestig] button', { hasText: /^Zet op/ });
    v('   opstelling: één knop "Zet op wacht op input"', 1, await zet.count());
    await zet.focus();
    const r2 = antwoordOp((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/acties/${k}`));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t2 = await focusStand(selectBezig);
    v(`c30c: tijdens Zet op staat de focus niet op body (${t2.beschrijving})`, false, t2.body);
    v('   positieve controle: het verzoek liep nog (status-select uitgeschakeld)', true, t2.bezig);
    v('   Zet op: HTTP 200', 200, httpStatus(await r2));
    await page.unroute(`**/api/plan/acties/${k}`);
    await wacht(700);
    const m2 = (await regio.textContent()).trim();
    v(`c30: de statuswissel wordt aangekondigd ("${m2}")`, true, m2.includes('staat nu op wacht op input'));
    await sluit();
  });

  // ── c30b + c30c: een wissel vanaf gereed ──────────────────────────────────
  await blok('c30b', async () => {
    const gereed = (await planJson()).acties.filter((a) => a.status === 'gereed').map((a) => a.key);
    if (gereed.length < 2) return niets(`c30b: minder dan twee gereed-acties (${gereed})`);
    const [h, s] = gereed;
    const selectBezig = '[role="dialog"] select[aria-label="Status wijzigen"]';

    await page.goto(`${BASE}/plan?actie=${h}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    const heropen = dialog.locator('button', { hasText: /^Heropen$/ });
    v(`c30b: opstelling: ${h} is gereed en heeft één knop Heropen`, 1, await heropen.count());
    await page.fill('#plan-heropen', 'ui-probe: c30b toch niet af');
    await vertraag(`**/api/plan/acties/${h}`, 'PATCH', 1500);
    await heropen.focus();
    const r1 = antwoordOp((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/acties/${h}`));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t1 = await focusStand(selectBezig);
    v(`c30c: tijdens Heropen staat de focus niet op body (${t1.beschrijving})`, false, t1.body);
    v('   positieve controle: het verzoek liep nog (status-select uitgeschakeld)', true, t1.bezig);
    v('   Heropen: HTTP 200', 200, httpStatus(await r1));
    await page.unroute(`**/api/plan/acties/${h}`);
    await wacht(700);
    const m1 = (await dialog.locator('[data-paneel-melding]').textContent()).trim();
    v(`c30b: Heropen kondigt de nieuwe status aan ("${m1}")`, true, m1.includes('heropend') && m1.includes('niet gestart'));
    await sluit();

    await page.goto(`${BASE}/plan?actie=${s}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    await dialog.locator('select[aria-label="Status wijzigen"]').selectOption('uitgesteld');
    await page.fill('#plan-wachtreden', 'ui-probe: c30b later bekijken');
    const r2 = antwoordOp((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/acties/${s}`));
    await dialog.locator('[data-status-bevestig] button', { hasText: /^Zet op/ }).click();
    v(`   ${s} van gereed naar uitgesteld: HTTP 200`, 200, httpStatus(await r2));
    await wacht(700);
    const m2 = (await dialog.locator('[data-paneel-melding]').textContent()).trim();
    v(`c30b: vanaf gereed via de select kondigt de nieuwe status aan ("${m2}")`, true, m2.includes('heropend') && m2.includes('uitgesteld'));
    await sluit();
  });

  // ── c31 + c31b: de volgende stap in een actierij ──────────────────────────
  await blok('c31', async () => {
    const k = (await planJson()).overzicht.nuBezig[0];
    if (!k) return niets('c31: geen lopende actie');
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const rij = page.locator(`li[data-actie="${k}"]`);
    v(`c31: opstelling: één rij ${k} in Nu bezig`, 1, await rij.count());
    const wijzig = rij.locator('button', { hasText: /^Wijzig$/ });
    const veld = rij.locator(`input[aria-label="Volgende stap van ${k}"]`);
    const bewaar = rij.locator('button', { hasText: /^Bewaar$/ });
    await wijzig.click();
    v('   Wijzig opent één veld', 1, await veld.count());
    await veld.fill('ui-probe: c31 eerste stap');
    await beantwoord(`**/api/plan/acties/${k}`, 'PATCH', 500, { ok: false, error: 'ui-probe: c31 geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 500)', 500, await onderschept(`/api/plan/acties/${k}`, 'PATCH'));
    await bewaar.focus();
    await page.keyboard.press('Enter');
    await wacht(600);
    const naFout = { veld: await veld.count(), tekst: (await veld.count()) ? await veld.inputValue() : null };
    v('c31: een geweigerde Bewaar laat het veld open met de getypte tekst', { veld: 1, tekst: 'ui-probe: c31 eerste stap' }, naFout);
    v('   de fout staat bij de rij (role=alert)', 1, await rij.locator('[data-stap-fout][role="alert"]').count());
    v('   en niet in de banner bovenaan', 0, await page.locator('[data-plan-fout]').count());
    await page.unroute(`**/api/plan/acties/${k}`);
    // De tegenkant: bij een geslaagd antwoord sluit het wél — anders bewijst "blijft open" niets.
    // Viel het veld hierboven toch dicht, dan eerst opnieuw openen: de rest van het blok moet blijven meten.
    if (!(await veld.count())) {
      await wijzig.click();
      await veld.fill('ui-probe: c31 eerste stap');
    }
    const r = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
    await bewaar.focus();
    await page.keyboard.press('Enter');
    v('   opnieuw, zonder onderschepping: HTTP 200', 200, httpStatus(await r));
    await wacht(500);
    v('c31: na een geslaagd antwoord sluit het veld en toont de rij de stap', { veld: 0, inRij: true }, { veld: await veld.count(), inRij: (await rij.innerText()).includes('ui-probe: c31 eerste stap') });

    // c31b: een echte 409. De versie gaat over HTTP omhoog terwijl het veld open staat.
    await wijzig.click();
    await veld.fill('ui-probe: c31b getypt');
    v('c31b: opstelling: tussendoor een PATCH over HTTP', 200, (await patchApi(k, { volgendeStap: 'ui-probe: elders gewijzigd' })).status);
    const r409 = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
    await bewaar.focus();
    await page.keyboard.press('Enter');
    v('   Bewaar met de oude versie: HTTP 409 van de server', 409, httpStatus(await r409));
    await wacht(500);
    const herlaad = rij.locator('[data-stap-fout] button', { hasText: /^Herlaad plan$/ });
    v('c31b: het versieconflict biedt Herlaad plan bij de rij', 1, await herlaad.count());
    v('c31b: de getypte tekst blijft staan', 'ui-probe: c31b getypt', (await veld.count()) ? await veld.inputValue() : null);
    v('   en de banner bovenaan zwijgt', 0, await page.locator('[data-plan-fout]').count());
    if (await herlaad.count()) {
      const rPlan = antwoordOp((x) => x.request().method() === 'GET' && x.url().endsWith('/api/plan'));
      await herlaad.focus();
      await page.keyboard.press('Enter');
      await rPlan;
      await wacht(400);
      v('   na Herlaad: fout weg, tekst staat er nog', { fout: 0, tekst: 'ui-probe: c31b getypt' }, { fout: await rij.locator('[data-stap-fout]').count(), tekst: (await veld.count()) ? await veld.inputValue() : null });
      const r2 = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
      await bewaar.click();
      v('   en Bewaar slaagt daarna: HTTP 200', 200, httpStatus(await r2));
    }
  });

  // ── c50: Wijzig opent met de actuele volgende stap ────────────────────────
  // De rij hield een kopie van de stap van bij het mounten. Wijzig je de stap in het paneel, dan opende
  // Wijzig daarna met de oude tekst — en Bewaar schreef die terug over de nieuwere (de versie klopte).
  await blok('c50', async () => {
    const k = (await planJson()).overzicht.nuBezig[0];
    if (!k) return niets('c50: geen lopende actie');
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const rij = page.locator(`li[data-actie="${k}"]`);
    v(`c50: opstelling: één rij ${k} in Nu bezig`, 1, await rij.count());
    const wijzig = rij.locator('button', { hasText: /^Wijzig$/ });
    const veld = rij.locator(`input[aria-label="Volgende stap van ${k}"]`);
    // Eerst één keer openen en sluiten: zo staat de kopie in de rij zeker op de stap van nu.
    await wijzig.click();
    const voorTekst = await veld.inputValue();
    await rij.locator('button', { hasText: /^Annuleer$/ }).click();
    const nieuw = `ui-probe: c50 in het paneel ${voorTekst.length}`;
    await rij.locator('button').first().click();
    await dialog.waitFor();
    await wacht(400);
    await page.fill('#plan-stap', nieuw);
    const r = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
    await dialog.locator('button', { hasText: /^Bewaar$/ }).click();
    v('   Bewaar in het paneel: HTTP 200', 200, httpStatus(await r));
    await wacht(500);
    v('   het paneel sluit zonder vraag', true, await sluitZonderVraag());
    v('   de rij toont de nieuwe stap', true, (await rij.innerText()).includes(nieuw));
    await wijzig.click();
    v('c50: Wijzig opent met de stap uit het paneel, niet met de kopie van bij het mounten', nieuw, (await veld.count()) ? await veld.inputValue() : null);
    await rij.locator('button', { hasText: /^Annuleer$/ }).click();
  });

  // ── c39: de sluitvraag na een geslaagde afronding, vóór het detail binnen is ──
  // De koppeling die UI 11 en UI 12 zouden verbergen: de handelingsvelden worden leeggemaakt
  // zodra het vernieuwde detail binnenkomt, en de UI-gevallen wachten daar 700 ms op. Hier komt
  // dat detail 2,5 s te laat, en wordt Escape direct na het geslaagde antwoord gedrukt.
  await blok('c39-race', async () => {
    const k = (await planJson()).overzicht.nuBezig.at(-1);
    if (!k) return niets('c39: geen lopende actie om af te ronden');
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    await page.locator(`button[aria-label="Afronden ${k}"]`).click();
    await dialog.waitFor();
    await wacht(300);
    await page.fill('#plan-bewijs', 'ui-probe: c39 bewijs');
    // Eigen vertraging met een vlag: de positieve controle dat het detail bij Escape écht nog
    // onderweg was. Uit wat het paneel toont afleiden kan niet — dat is precies wat hier gemeten wordt.
    const detail = { gevraagd: 0, binnen: 0 };
    await page.route(`**/api/plan/acties/${k}`, async (route) => {
      if (route.request().method() !== 'GET') return route.continue();
      detail.gevraagd++;
      await new Promise((res) => setTimeout(res, 2500));
      detail.binnen++;
      return route.continue().catch(() => {});
    });
    const r = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
    await dialog.locator('button', { hasText: /^Markeer gereed$/ }).click();
    v(`   opstelling: ${k} Markeer gereed: HTTP 200`, 200, httpStatus(await r));
    // Pas als de client het antwoord verwerkt heeft (bezig voorbij, select weer bedienbaar) — anders
    // meet Escape een verzoek dat nog loopt, en dat is een andere vraag.
    await dialog.locator('select[aria-label="Status wijzigen"]:not([disabled])').waitFor({ timeout: 2000 });
    await wacht(100);
    v('   positieve controle: het vernieuwde detail is gevraagd en nog niet binnen', { gevraagd: true, binnen: 0 }, { gevraagd: detail.gevraagd > 0, binnen: detail.binnen });
    await page.keyboard.press('Escape');
    await wacht(300);
    const stand = { vraag: await dialog.locator('[data-sluit-vraag]').count(), open: await dialog.count() };
    v('c39: Escape direct na een geslaagde afronding (detail nog onderweg): geen vraag, paneel dicht', { vraag: 0, open: 0 }, stand);
    await sluit();
    await wacht(2600);
    await page.unroute(`**/api/plan/acties/${k}`);
  });

  // ── c32: Bewaar in het beslissingspaneel ──────────────────────────────────
  await blok('c32', async () => {
    const b = (await planJson()).beslissingen.find((x) => x.soort !== 'start' && !x.beslissing);
    if (!b) return niets('c32: geen open beslismoment');
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const knop = beslismomenten.locator('li', { hasText: b.key }).locator('button');
    v(`c32: opstelling: één knop voor ${b.key} in Beslismomenten`, 1, await knop.count());
    await knop.click();
    await dialog.waitFor();
    await wacht(300);
    const regio = dialog.locator('[data-paneel-melding]');
    v('c32: de meldingsregio staat er vóór Bewaar, met aria-live="polite"', { n: 1, live: 'polite', tekst: '' }, { n: await regio.count(), live: await regio.getAttribute('aria-live'), tekst: (await regio.textContent()).trim() });
    await page.fill('#beslissing-tekst', 'ui-probe: c32 besloten');
    const bewaar = dialog.locator('button', { hasText: /^Bewaar$/ });
    await beantwoord(`**/api/plan/beslissingen/${b.key}`, 'PATCH', 500, { ok: false, error: 'ui-probe: c32 geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 500)', 500, await onderschept(`/api/plan/beslissingen/${b.key}`, 'PATCH'));
    await bewaar.click();
    await wacht(500);
    v('c32: een geweigerde Bewaar kondigt niets aan (en toont de fout)', { tekst: '', fout: 1 }, { tekst: (await regio.textContent()).trim(), fout: await dialog.locator('[data-paneel-fout]').count() });
    await page.unroute(`**/api/plan/beslissingen/${b.key}`);
    const r = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/beslissingen/${b.key}`));
    await bewaar.click();
    v('   Bewaar: HTTP 200', 200, httpStatus(await r));
    await wacht(500);
    const m = (await regio.textContent()).trim();
    v(`c32: Bewaar in het beslissingspaneel wordt aangekondigd ("${m}")`, true, m.includes(`${b.key} vastgelegd`));
    await sluit();
  });

  // ── c33: een idee dat niet toegevoegd wordt ────────────────────────────────
  await blok('c33', async () => {
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    await page.locator('[role="tab"]', { hasText: 'Ideeën' }).click();
    const veld = page.locator('input[aria-label="Nieuw idee"]');
    v('c33: opstelling: één invoerveld Nieuw idee', 1, await veld.count());
    await veld.fill('ui-probe: c33 idee');
    await beantwoord('**/api/plan/ideeen', 'POST', 500, { ok: false, error: 'ui-probe: c33 geweigerd' });
    v('   onderschepping werkt (eigen POST → 500)', 500, await onderschept('/api/plan/ideeen', 'POST'));
    await page.locator('button', { hasText: /^Voeg toe$/ }).click();
    await wacht(500);
    v('c33: de titel blijft staan wanneer toevoegen mislukt', 'ui-probe: c33 idee', await veld.inputValue());
    v('   de fout staat bij het veld (role=alert), niet in de banner', { bijVeld: 1, banner: 0 }, { bijVeld: await page.locator('[data-idee-fout][role="alert"]').count(), banner: await page.locator('[data-plan-fout]').count() });
    await page.unroute('**/api/plan/ideeen');
    const r = antwoordOp((x) => x.request().method() === 'POST' && x.url().endsWith('/api/plan/ideeen'));
    await page.locator('button', { hasText: /^Voeg toe$/ }).click();
    v('   opnieuw, zonder onderschepping: HTTP 200', 200, httpStatus(await r));
    await wacht(400);
    v('c33: na een geslaagde toevoeging is het veld leeg', '', await veld.inputValue());
  });

  // ── c34: een detail dat niet laadt ─────────────────────────────────────────
  await blok('c34', async () => {
    await page.goto(`${BASE}/plan?actie=A99`, { waitUntil: 'networkidle' });
    await wacht(400);
    const banner = page.locator('[data-plan-fout][role="alert"]');
    const b1 = { banner: await banner.count(), tekst: (await banner.count()) ? (await banner.innerText()).includes('A99 kon niet geopend worden') : false, dialog: await dialog.count() };
    v('c34: /plan?actie=A99 toont een melding en geen paneel', { banner: 1, tekst: true, dialog: 0 }, b1);

    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const k = await page.locator('li[data-actie]').first().getAttribute('data-actie');
    await page.route(`**/api/plan/acties/${k}`, (route) => (route.request().method() === 'GET' ? route.abort('failed') : route.continue()));
    v(`   onderschepping werkt (eigen GET ${k} → afgebroken)`, 'afgebroken', await onderschept(`/api/plan/acties/${k}`, 'GET'));
    await page.locator(`li[data-actie="${k}"] button`).first().click();
    await wacht(600);
    const b2 = { banner: await banner.count(), tekst: (await banner.count()) ? (await banner.innerText()).includes(`${k} kon niet geopend worden`) : false, dialog: await dialog.count() };
    v(`c34: een afgebroken detail-lading van ${k} toont een melding en geen paneel`, { banner: 1, tekst: true, dialog: 0 }, b2);
    await page.unroute(`**/api/plan/acties/${k}`);
  });

  // ── c35: een herlading die mislukt ─────────────────────────────────────────
  await blok('c35', async () => {
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    // De banner via een geweigerde Opslaan in Aannames: die staat er altijd, en hangt niet af van
    // de detail-lading die c34 meet.
    await page.route('**/api/plan', (route) => {
      const m = route.request().method();
      if (m === 'PUT') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'ui-probe: c35 opslaan geweigerd' }) });
      if (m === 'GET') return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'ui-probe: c35 herladen geweigerd' }) });
      return route.continue();
    });
    v('   onderschepping werkt (eigen GET /api/plan → 500)', 500, await onderschept('/api/plan', 'GET'));
    const details = page.locator('details', { has: page.locator('textarea[aria-label="Planningsaannames"]') });
    await details.locator('summary').click();
    const veld = details.locator('textarea');
    await veld.fill(`${await veld.inputValue()} c35`);
    await details.locator('button', { hasText: /^Opslaan$/ }).click();
    await wacht(500);
    const banner = page.locator('[data-plan-fout]');
    v('c35: opstelling: een geweigerde Opslaan zet de banner met Herlaad plan', 1, await banner.locator('button', { hasText: /^Herlaad plan$/ }).count());
    await banner.locator('button', { hasText: /^Herlaad plan$/ }).focus();
    await page.keyboard.press('Enter');
    await wacht(600);
    const na = {
      tekst: (await banner.count()) ? (await banner.innerText()).includes('Plan niet herladen') : false,
      knop: await banner.locator('button', { hasText: /^Herlaad plan$/ }).count(),
      focus: await page.evaluate(() => document.activeElement?.closest('[data-plan-fout]') !== null && document.activeElement?.textContent?.trim() === 'Herlaad plan'),
    };
    v('c35: een mislukte Herlaad plan (banner) toont een melding, de knop en zijn focus blijven', { tekst: true, knop: 1, focus: true }, na);
    await page.unroute('**/api/plan');
    // Alleen als de knop er nog staat: anders wacht de volgende stap op een verzoek dat nooit komt,
    // en valt het paneelgeval hieronder mee weg.
    if (na.knop) {
      const rPlan = antwoordOp((x) => x.request().method() === 'GET' && x.url().endsWith('/api/plan'));
      await banner.locator('button', { hasText: /^Herlaad plan$/ }).focus();
      await page.keyboard.press('Enter');
      await rPlan;
      await wacht(400);
      const gelukt = {
        banner: await banner.count(),
        melding: (await page.locator('[data-plan-melding]').textContent()).trim(),
        focus: await page.evaluate(() => document.activeElement?.getAttribute('role') === 'tab' && document.activeElement?.getAttribute('aria-selected') === 'true'),
      };
      v('   daarna geslaagd: banner weg, "Plan herladen.", focus op het actieve tabblad', { banner: 0, melding: 'Plan herladen.', focus: true }, gelukt);
    }

    // Het paneel: een versieconflict op Bewaar, daarna een herlading die mislukt.
    const k = ruimte(await planJson())[0];
    if (!k) return niets('c35: geen niet-gestarte actie voor het paneel');
    await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    await page.fill('#plan-titel', `${await page.inputValue('#plan-titel')} c35`);
    await beantwoord(`**/api/plan/acties/${k}`, 'PATCH', 409, { ok: false, conflict: 'versie', error: 'deze actie is intussen elders gewijzigd' });
    await beantwoord('**/api/plan', 'GET', 500, { error: 'ui-probe: c35 herladen geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 409)', 409, await onderschept(`/api/plan/acties/${k}`, 'PATCH'));
    await dialog.locator('button', { hasText: /^Bewaar$/ }).click();
    await wacht(500);
    const herlaad = dialog.locator('[data-paneel-fout] button', { hasText: /^Herlaad plan$/ });
    v('   opstelling: het paneel toont het conflict met Herlaad plan', 1, await herlaad.count());
    await herlaad.click();
    await wacht(600);
    const fout = dialog.locator('[data-paneel-fout]');
    v('c35: een mislukte Herlaad plan (paneel) toont een melding en houdt de knop', { tekst: true, knop: 1 }, { tekst: (await fout.count()) ? (await fout.innerText()).includes('niet herladen') : false, knop: await herlaad.count() });
    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await sluit();
  });

  // ── c38: de focus terug naar de opener ─────────────────────────────────────
  await blok('c38', async () => {
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const k = await page.locator('li[data-actie]').first().getAttribute('data-actie');
    v(`c38: opstelling: één rij ${k}`, 1, await page.locator(`li[data-actie="${k}"]`).count());
    const opener = page.locator(`li[data-actie="${k}"] button`).first();
    const kruis = dialog.getByRole('button', { name: 'Sluiten', exact: true });
    const wegen = [
      ['Escape', () => page.keyboard.press('Escape')],
      ['het sluitkruis', () => kruis.click()],
      ['een klik op de overlay', () => page.mouse.click(40, 450)],
    ];
    for (const [weg, doe] of wegen) {
      await opener.focus();
      await page.keyboard.press('Enter');
      await dialog.waitFor();
      await wacht(300);
      await doe();
      const dicht = await dialog.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
      await wacht(200);
      const f = await focusStand();
      v(`c38: actiepaneel via ${weg}: focus terug op de titel van ${k} (${f.beschrijving})`, { dicht: true, opOpener: true }, { dicht, opOpener: await opener.evaluate((el) => document.activeElement === el) });
      if (!dicht) await sluit();
    }
    const bKnop = beslismomenten.locator('li button').first();
    v('c38: opstelling: een knop in Beslismomenten', true, (await bKnop.count()) === 1);
    for (const [weg, doe] of wegen.slice(0, 2)) {
      await bKnop.focus();
      await page.keyboard.press('Enter');
      await dialog.waitFor();
      await wacht(300);
      await doe();
      const dicht = await dialog.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false);
      await wacht(200);
      const f = await focusStand();
      v(`c38: beslissingspaneel via ${weg}: focus terug op de opener (${f.beschrijving})`, { dicht: true, opOpener: true }, { dicht, opOpener: await bKnop.evaluate((el) => document.activeElement === el) });
      if (!dicht) await sluit();
    }
  });

  // ── c39: de sluitvraag bij onbewaarde invoer ──────────────────────────────
  await blok('c39', async () => {
    const vraag = dialog.locator('[data-sluit-vraag]');
    const kruis = dialog.getByRole('button', { name: 'Sluiten', exact: true });
    const wegen = [
      ['Escape', () => page.keyboard.press('Escape')],
      ['het sluitkruis', () => kruis.click()],
      ['een klik op de overlay', () => page.mouse.click(40, 450)],
    ];
    const vraagt = async (label, openen, n = wegen.length) => {
      await openen();
      for (const [weg, doe] of wegen.slice(0, n)) {
        if (!(await dialog.count())) await openen();
        await doe();
        await wacht(300);
        const stand = {
          open: await dialog.count(),
          vraag: await vraag.count(),
          focus: await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''),
        };
        v(`c39: ${label}, ${weg}: vraagt eerst bevestiging`, { open: 1, vraag: 1, focus: 'Terug' }, stand);
        if (stand.vraag) {
          await vraag.locator('button', { hasText: /^Terug$/ }).click();
          await wacht(200);
        }
      }
      if (await dialog.count()) {
        v(`   ${label}: Terug laat het paneel open en de vraag weg`, { open: 1, vraag: 0 }, { open: await dialog.count(), vraag: await vraag.count() });
        await page.keyboard.press('Escape');
        await wacht(250);
        const weg = vraag.locator('button', { hasText: /^Weggooien$/ });
        if (await weg.count()) await weg.click();
        v(`   ${label}: Weggooien sluit het paneel`, true, await dialog.waitFor({ state: 'detached', timeout: 3000 }).then(() => true, () => false));
      }
    };

    const k = ruimte(await planJson())[0];
    if (!k) return niets('c39: geen niet-gestarte actie');
    const openActie = async () => {
      await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
      await dialog.waitFor();
      await wacht(300);
      await page.fill('#plan-titel', `${await page.inputValue('#plan-titel')} c39`);
    };
    await vraagt(`actiepaneel ${k} met onbewaarde titel`, openActie);

    // Na een geslaagde Bewaar telt de invoer niet meer — ook niet met een regeleinde achteraan,
    // dat de server wegtrimt.
    await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    await page.fill('#plan-resultaat', 'ui-probe: c39 resultaat\n');
    const r = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/acties/${k}`));
    await dialog.locator('button', { hasText: /^Bewaar$/ }).click();
    v('   actiepaneel: Bewaar met een regeleinde achteraan: HTTP 200', 200, httpStatus(await r));
    await wacht(600);
    v('c39: actiepaneel na een geslaagde Bewaar: Escape sluit zonder vraag', true, await sluitZonderVraag());

    const b = (await planJson()).beslissingen.find((x) => x.soort !== 'start' && !x.beslissing);
    if (!b) return niets('c39: geen open beslismoment');
    const openBeslissing = async () => {
      await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
      await beslismomenten.locator('li', { hasText: b.key }).locator('button').click();
      await dialog.waitFor();
      await wacht(300);
      await page.fill('#beslissing-tekst', 'ui-probe: c39 nog niet bewaard');
    };
    await vraagt(`beslissingspaneel ${b.key} met onbewaarde tekst`, openBeslissing);

    await openBeslissing();
    await page.fill('#beslissing-tekst', 'ui-probe: c39 besloten\n');
    const rb = antwoordOp((x) => x.request().method() === 'PATCH' && x.url().endsWith(`/beslissingen/${b.key}`));
    await dialog.locator('button', { hasText: /^Bewaar$/ }).click();
    v('   beslissingspaneel: Bewaar met een regeleinde achteraan: HTTP 200', 200, httpStatus(await rb));
    await wacht(600);
    v('c39: beslissingspaneel na een geslaagde Bewaar: Escape sluit zonder vraag', true, await sluitZonderVraag());
  });

  // ── c40: een fout in een gescrold paneel ───────────────────────────────────
  await blok('c40', async () => {
    const inBeeld = () =>
      page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const f = d?.querySelector('[data-paneel-fout]');
        if (!d || !f) return { gevonden: false };
        const dr = d.getBoundingClientRect();
        const fr = f.getBoundingClientRect();
        return { gevonden: true, inBeeld: fr.top >= dr.top && fr.top < dr.bottom, top: Math.round(fr.top - dr.top), focusInFout: f.contains(document.activeElement) };
      });
    const naarOnder = () =>
      dialog.evaluate((d) => {
        d.scrollTop = d.scrollHeight;
        const kop = d.querySelector('h2').getBoundingClientRect();
        return { scroll: Math.round(d.scrollTop), kopWeg: kop.bottom < d.getBoundingClientRect().top };
      });

    await page.setViewportSize({ width: 1280, height: 600 });
    const k = ruimte(await planJson())[0];
    if (!k) return niets('c40: geen niet-gestarte actie');
    await page.goto(`${BASE}/plan?actie=${k}`, { waitUntil: 'networkidle' });
    await dialog.waitFor();
    await wacht(300);
    await page.fill('#plan-bewijs', 'ui-probe: c40 bewijs');
    await beantwoord(`**/api/plan/acties/${k}`, 'PATCH', 400, { ok: false, error: 'ui-probe: c40 geweigerd' });
    v('   onderschepping werkt (eigen PATCH → 400 met eigen melding)', 400, await onderschept(`/api/plan/acties/${k}`, 'PATCH'));
    const voor = await naarOnder();
    v(`c40: opstelling: actiepaneel onderaan gescrold (${voor.scroll} px), kop buiten beeld`, true, voor.scroll > 100 && voor.kopWeg);
    await dialog.locator('button', { hasText: /^Markeer gereed$/ }).click();
    await wacht(600);
    const na = await inBeeld();
    v(`c40: de fout in het actiepaneel staat in beeld (top ${na.top} px)`, { gevonden: true, inBeeld: true }, { gevonden: na.gevonden, inBeeld: na.inBeeld ?? false });
    v('   en de focus is niet naar de melding verplaatst', false, na.focusInFout ?? false);
    await page.unroute(`**/api/plan/acties/${k}`);
    await sluit();

    await page.setViewportSize({ width: 1280, height: 480 });
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const bKnop = beslismomenten.locator('li button').first();
    const bKey = (await beslismomenten.locator('li').first().innerText()).trim().split(/\s/)[0];
    await bKnop.click();
    await dialog.waitFor();
    await wacht(300);
    await page.fill('#beslissing-onderbouwing', 'ui-probe: c40 onderbouwing');
    await beantwoord(`**/api/plan/beslissingen/${bKey}`, 'PATCH', 400, { ok: false, error: 'ui-probe: c40 geweigerd' });
    v(`   onderschepping werkt (eigen PATCH ${bKey} → 400)`, 400, await onderschept(`/api/plan/beslissingen/${bKey}`, 'PATCH'));
    const bVoor = await naarOnder();
    v(`c40: opstelling: beslissingspaneel onderaan gescrold (${bVoor.scroll} px), kop buiten beeld`, true, bVoor.scroll > 100 && bVoor.kopWeg);
    await dialog.locator('button', { hasText: /^Bewaar$/ }).click();
    await wacht(600);
    const bNa = await inBeeld();
    v(`c40: de fout in het beslissingspaneel staat in beeld (top ${bNa.top} px)`, { gevonden: true, inBeeld: true }, { gevonden: bNa.gevonden, inBeeld: bNa.inBeeld ?? false });
    await page.unroute(`**/api/plan/beslissingen/${bKey}`);
    await sluit();
  });

  // ── c28 + c28b: Aannames ───────────────────────────────────────────────────
  await blok('c28', async () => {
    await page.goto(`${BASE}/plan`, { waitUntil: 'networkidle' });
    const plan = await planJson();
    const details = page.locator('details', { has: page.locator('textarea[aria-label="Planningsaannames"]') });
    v('c28: opstelling: één Aannames-blok', 1, await details.count());
    await details.locator('summary').click();
    const veld = details.locator('textarea');
    const opslaan = details.locator('button', { hasText: /^Opslaan$/ });
    const herstel = details.locator('button', { hasText: /^Herstel de standaard$/ });
    const veldBezig = 'details textarea[aria-label="Planningsaannames"]';
    await veld.fill(`${plan.aannames.tekst}\nui-probe: c28 eigen regel`);

    await vertraag('**/api/plan', 'PUT', 1200);
    await opslaan.focus();
    const r1 = antwoordOp((x) => x.request().method() === 'PUT' && x.url().endsWith('/api/plan'));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t1 = await focusStand(veldBezig);
    v(`c28b: tijdens Opslaan staat de focus niet op body (${t1.beschrijving})`, false, t1.body);
    v('   positieve controle: het verzoek liep nog (veld uitgeschakeld)', true, t1.bezig);
    v('   Opslaan: HTTP 200', 200, httpStatus(await r1));
    await wacht(500);
    const n1 = await focusStand();
    v(`c28b: na Opslaan staat de focus niet op body (${n1.beschrijving})`, false, n1.body);
    v('   opstelling: de eigen tekst is bewaard', false, (await planJson()).aannames.isStandaard);

    await herstel.focus();
    const r2 = antwoordOp((x) => x.request().method() === 'PUT' && x.url().endsWith('/api/plan'));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t2 = await focusStand(veldBezig);
    v(`c28b: tijdens Herstel staat de focus niet op body (${t2.beschrijving})`, false, t2.body);
    v('   positieve controle: het verzoek liep nog (veld uitgeschakeld)', true, t2.bezig);
    v('   Herstel: HTTP 200', 200, httpStatus(await r2));
    await page.unroute('**/api/plan');
    await wacht(500);
    const n2 = await focusStand();
    v(`c28b: na Herstel staat de focus niet op body (${n2.beschrijving})`, false, n2.body);
    const api = (await planJson()).aannames;
    const waarde = await veld.inputValue();
    v(`c28: na Herstel toont het veld de standaardtekst (${waarde.length} tekens, standaard ${api.tekst.length}, eigen regel ${waarde.includes('c28 eigen regel') ? 'nog' : 'niet meer'} aanwezig)`, true, api.isStandaard && waarde === api.tekst);
  });

  // ── c36: de planinstellingen op /instellingen ──────────────────────────────
  await blok('c36', async () => {
    await page.goto(`${BASE}/instellingen`, { waitUntil: 'networkidle' });
    const sectie = page.locator('section#bedrijfsplan');
    const uren = sectie.locator('#plan-uren');
    const opslaan = sectie.locator('button', { hasText: /^Opslaan$/ });
    const melding = sectie.locator('[data-planinstellingen-melding]');
    v('c36: opstelling: één uren-veld, één Opslaan, één meldingsregel', [1, 1, 1], [await uren.count(), await opslaan.count(), await melding.count()]);
    const v0 = await uren.inputValue();
    const live = await melding.evaluate((el) => ({ rol: el.getAttribute('role'), live: el.getAttribute('aria-live'), tekst: el.textContent.trim() }));
    v(`c36b: de meldingsregel staat vóór Opslaan in een live-regio (role=${live.rol}, aria-live=${live.live})`, { live: true, tekst: '' }, { live: live.rol === 'status' || live.live === 'polite' || live.live === 'assertive', tekst: live.tekst });
    // Een waarde die de server afrondt: vergelijkt het formulier met wat het stúúrde, dan blijft het
    // "gewijzigd" na een geslaagde bewaring.
    const [nieuw, bewaard] = Number(v0) === 7 ? ['8.333', '8.33'] : ['7.333', '7.33'];
    await uren.fill(nieuw);
    v('   opstelling: met een nieuwe waarde is Opslaan bedienbaar', 'false', await opslaan.getAttribute('aria-disabled'));
    const r = antwoordOp((x) => x.request().method() === 'PUT' && x.url().endsWith('/api/plan'));
    await opslaan.click();
    v('   Opslaan: HTTP 200', 200, httpStatus(await r));
    await wacht(400);
    v(`c36a: na Opslaan: veld = bewaarde waarde en niet meer "gewijzigd"`, { veld: bewaard, ariaDisabled: 'true' }, { veld: await uren.inputValue(), ariaDisabled: await opslaan.getAttribute('aria-disabled') });
    v('c36b: "Opgeslagen." staat in de live-regio', true, (await melding.textContent()).includes('Opgeslagen.'));
    await uren.fill(v0);
    v(`c36a: de vorige waarde (${v0}) terugzetten telt als wijziging tegenover de bewaarde (${bewaard})`, 'false', await opslaan.getAttribute('aria-disabled'));
    v('c36b: een nieuwe wijziging maakt de melding leeg', '', (await melding.textContent()).trim());
    const terug = antwoordOp((x) => x.request().method() === 'PUT' && x.url().endsWith('/api/plan'));
    await opslaan.click();
    v(`   opruimen: ${v0} weer bewaard`, 200, httpStatus(await terug));
  });

  // ── c37: Koppel in het opvolgingspaneel, op het dashboard van de wegwerp-database ──
  await blok('c37', async () => {
    await page.goto(`${BASE}/?tab=leads`, { waitUntil: 'networkidle' });
    const kaart = page.locator('[data-item="lead-1"]');
    v('c37: opstelling: de leadkaart uit de fixture (lead-1, Testbedrijf NV)', 1, await kaart.count());
    await kaart.locator('button', { hasText: /^Opvolging$/ }).click();
    await dialog.waitFor();
    const select = dialog.locator('select[aria-label="Actie om aan te koppelen"]');
    await select.waitFor();
    await wacht(300);
    const regio = dialog.locator('[data-koppeling-melding]');
    v('c37b: de live-regio staat er vóór Koppel', { n: 1, live: 'polite', tekst: '' }, { n: await regio.count(), live: await regio.getAttribute('aria-live'), tekst: (await regio.textContent()).trim() });
    const keuze = await select.evaluate((el) => [...el.options].find((o) => o.value)?.value ?? null);
    if (!keuze) return niets('c37: geen actie om te koppelen');
    await select.selectOption(keuze);
    const koppel = dialog.locator('button', { hasText: /^Koppel$/ });
    v(`   opstelling: één knop Koppel, ${keuze} gekozen`, 1, await koppel.count());
    await vertraag('**/api/plan/koppelingen', 'PUT', 1200);
    await koppel.focus();
    const r = antwoordOp((x) => x.request().method() === 'PUT' && x.url().includes('/api/plan/koppelingen'));
    await page.keyboard.press('Enter');
    await wacht(400);
    const t = await focusStand('[role="dialog"] select[aria-label="Actie om aan te koppelen"]');
    v(`c37a: tijdens Koppel staat de focus niet op body (${t.beschrijving})`, false, t.body);
    v('   positieve controle: het verzoek liep nog (keuzelijst uitgeschakeld)', true, t.bezig);
    v('   Koppel: HTTP 200', 200, httpStatus(await r));
    await page.unroute('**/api/plan/koppelingen');
    await wacht(800);
    const n = await focusStand();
    v(`c37a: na Koppel staat de focus niet op body (${n.beschrijving})`, false, n.body);
    v('c37b: het resultaat van Koppel wordt aangekondigd', `Gekoppeld aan ${keuze}.`, (await regio.textContent()).trim());
    const gekoppeld = (await (await fetch(`${BASE}/api/plan/koppelingen?type=lead&key=1`)).json()).gekoppeld ?? [];
    v(`   en de koppeling staat in de database (${gekoppeld})`, true, gekoppeld.includes(keuze));
    await sluit();
  });
} catch (e) {
  console.log(`  ✗ UI-probe brak af: ${e.message.split('\n')[0]}`);
  gezakt++;
} finally {
  await browser.close();
}

if (gezakt > 0) {
  console.log(`\n✗ UI-PROBE GEZAKT — ${gezakt} assertie(s)`);
  process.exit(1);
}
console.log('\n✓ UI-PROBE KLAAR');
