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
  const antwoord409 = page.waitForResponse((r) => r.request().method() === 'PATCH');
  await eersteStart.click();
  await page.waitForTimeout(150);
  v('UI 8. Start staat disabled tijdens de PATCH', true, await page.locator(`button[aria-label="Start ${startKey}"]`).first().isDisabled());
  const r409 = await antwoord409;
  v('   bij drie lopende acties: HTTP 409', 409, r409.status());
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
    const antwoord = page.waitForResponse((r) => r.request().method() === 'PATCH');
    await page.locator('[role="dialog"] button', { hasText: 'Markeer gereed' }).click();
    const json = await (await antwoord).json();
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
    const conflict = page.waitForResponse((r) => r.request().method() === 'PATCH');
    await page.locator(`[data-vrijgekomen] button[aria-label="Start ${vrijKey}"]`).click();
    v(`   Start ${vrijKey} vanuit het paneel: HTTP 409`, 409, (await conflict).status());
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
      const bewaard = page.waitForResponse((r) => r.request().method() === 'PATCH');
      await page.locator('[role="dialog"] button', { hasText: /^Bewaar$/ }).click();
      v('   een veldwijziging in het paneel: HTTP 200', 200, (await bewaard).status());
      await page.waitForTimeout(700);
      v(`   opstelling: ${vrijK} is nu geblokkeerd`, 'geblokkeerd', (await planJson()).acties.find((a) => a.key === vrijK).uitvoerbaarheid);
      v(`   het blok noemt ${vrijK} nog`, 1, await page.locator('[data-vrijgekomen] li', { hasText: vrijK }).count());
      v(`   maar zonder Start-knop voor ${vrijK}`, 0, await page.locator(`[data-vrijgekomen] button[aria-label="Start ${vrijK}"]`).count());
    }
    await page.fill('#plan-heropen', 'ui-probe: toch niet af');
    const heropen = page.waitForResponse((r) => r.request().method() === 'PATCH');
    await page.locator('[role="dialog"] button', { hasText: 'Heropen' }).click();
    v(`   Heropen ${k}: HTTP 200`, 200, (await heropen).status());
    await page.waitForTimeout(700);
    v('   na Heropen: geen blok "nu beschikbaar"', 0, await page.locator('[data-vrijgekomen]').count());
    v('   na Heropen: de live-regio is leeg', '', (await page.locator('[data-vrijgekomen-melding]').innerText()).trim());
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 });
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
    await page.keyboard.press('Escape');
    await page.locator('[role="dialog"]').waitFor({ state: 'detached', timeout: 5000 });
  }

  // ── Focus na een geslaagde Start vanaf een rij ─────────────────────────────
  const planVoor13 = await planJson();
  if (planVoor13.overzicht.nuBezig.length >= planVoor13.instellingen.focusLimiet) {
    console.log(`  ✗ UI 13. focusregel vol (${planVoor13.overzicht.nuBezig}) — dit geval meet niets`);
    gezakt++;
  } else {
    const start2 = groep('Beschikbaar').locator('button[aria-label^="Start "]').first();
    const key2 = (await start2.getAttribute('aria-label')).replace('Start ', '');
    const antwoord200 = page.waitForResponse((r) => r.request().method() === 'PATCH');
    await start2.click();
    v('UI 13. Start met ruimte in de focusregel: HTTP 200', 200, (await antwoord200).status());
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
