/**
 * Fase 3 — /instellingen, de zoekopdracht (c42, c43).
 *
 * Test, Opslaan en Herstel schrijven (Opslaan en Herstel in `.data/jobradar.db`) of roepen Adzuna aan
 * (Test). Elke druk gaat daarom door `onderschepSchrijven` met positieve controle, mét een vertraging:
 * c42 vraagt de focus ook TIJDENS het verzoek, en zonder vertraging is "tijdens" niet te meten. De
 * database krijgt een vingerafdruk vóór en na.
 *
 * c43 meet niet of `[data-zoekopdracht-melding]` tekst draagt, maar of de tekst van het resultaat in
 * een live-regio staat: vanaf de tekstnode omhoog naar aria-live/role, zonder aria-hidden erboven.
 * Een resultaat dat alleen in de zichtbare melding staat, telt dan niet.
 */

const TELLINGEN = [
  { regio: 'WVL', treffers: 120, afgekapt: false, bovengrens: false },
  { regio: 'OVL', treffers: 98, afgekapt: false, bovengrens: false },
  { regio: 'BRU', treffers: 600, afgekapt: true, bovengrens: true },
];
const VERTRAGING = 1200;

/** Waar staat de focus? `body` is het defect. */
function focusStand(page) {
  return page.evaluate(() => {
    const el = document.activeElement;
    const body = !el || el === document.body || el === document.documentElement;
    return {
      body,
      actie: el?.getAttribute?.('data-zoekopdracht-actie') ?? null,
      wat: body ? 'body' : `${el.tagName.toLowerCase()}${el.getAttribute('data-zoekopdracht-actie') ? `[${el.getAttribute('data-zoekopdracht-actie')}]` : ''} "${(el.textContent ?? '').trim().slice(0, 30)}"`,
    };
  });
}

/**
 * Elke tekstnode die `zin` bevat, met de live-regio waarin hij staat (of null) en of die regio er al
 * stond bij het laden (`data-harness-live-bij-laden`, gezet door `merkLiveRegios`).
 */
function waarStaat(page, zin) {
  return page.evaluate((zin) => {
    const uit = [];
    const loper = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = loper.nextNode(); n; n = loper.nextNode()) {
      if (!n.data.includes(zin)) continue;
      let live = null;
      let verborgen = false;
      for (let e = n.parentElement; e && e !== document.documentElement; e = e.parentElement) {
        if (e.getAttribute('aria-hidden') === 'true' || e.inert) verborgen = true;
        if (live) continue;
        const a = e.getAttribute('aria-live');
        const rol = e.getAttribute('role');
        if (a && a !== 'off') live = { soort: a, el: e };
        else if (rol === 'status' || rol === 'log') live = { soort: 'polite', el: e };
        else if (rol === 'alert') live = { soort: 'assertive', el: e };
      }
      uit.push({
        live: live && !verborgen ? live.soort : null,
        bijLaden: Boolean(live?.el.hasAttribute('data-harness-live-bij-laden')),
        tekst: n.data.trim().slice(0, 140),
      });
    }
    return uit;
  }, zin);
}

/** Markeert elke live-regio die er nu staat, zodat later te zien is of een regio al bestond vóór zijn inhoud. */
function merkLiveRegios(page) {
  return page.evaluate(() => {
    const regios = document.querySelectorAll('[aria-live]:not([aria-live="off"]), [role="status"], [role="log"], [role="alert"]');
    for (const r of regios) r.setAttribute('data-harness-live-bij-laden', '');
    return [...regios].map((r) => ({ tekst: (r.textContent ?? '').trim().slice(0, 40) }));
  });
}

/**
 * Drukt een actieknop met het toetsenbord, onderschept, en meet de focus tijdens en na het verzoek.
 * Geeft null als er niet gedrukt mocht worden.
 */
async function drukMetToetsenbord(m, { actie, pad, methode, antwoord, sleutel }) {
  const { page, fail } = m;
  const knop = page.locator(`[data-zoekopdracht-actie="${actie}"]`);
  if ((await knop.count()) !== 1) {
    fail(`${sleutel}: ${await knop.count()} knoppen [data-zoekopdracht-actie="${actie}"], verwacht 1 — dit meet niets`);
    return null;
  }
  if (!(await m.onderschepSchrijven({ status: 200, vertraging: VERTRAGING, body: antwoord }))) {
    fail(`${sleutel}: onderschepping niet bevestigd — ${actie} niet ingedrukt`);
    return null;
  }
  const verzoeken = [];
  const luister = (r) => { if (new URL(r.url()).pathname === pad && r.method() === methode) verzoeken.push(Date.now()); };
  page.on('request', luister);
  let binnen = false;
  const res = page.waitForResponse((r) => new URL(r.url()).pathname === pad && r.request().method() === methode, { timeout: 15_000 })
    .then((r) => { binnen = true; return r; })
    .catch(() => null);
  await knop.focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  const tijdens = { ...(await focusStand(page)), verzoeken: verzoeken.length, binnen, ariaDisabled: await knop.getAttribute('aria-disabled').catch(() => '(weg)') };
  // Tweede druk terwijl het verzoek loopt: de guard hoort hem te negeren.
  await page.keyboard.press('Enter');
  const antwoordRes = await res;
  await page.waitForTimeout(500);
  const na = await focusStand(page);
  page.off('request', luister);
  return { tijdens, na, res: antwoordRes, verzoeken: verzoeken.length, knopNa: await knop.count() };
}

export default async function (m) {
  const { page, ok, fail, notes } = m;
  const dbVoor = await m.dbVingerafdruk();
  if (dbVoor.startsWith('onleesbaar')) fail(`instellingen: database-vingerafdruk ${dbVoor} — het lek-vangnet werkt niet`);

  await m.laad('/instellingen');
  const regiosBijLaden = await merkLiveRegios(page);
  notes.push(`instellingen: ${regiosBijLaden.length} live-regio('s) bij het laden (${regiosBijLaden.map((r) => `"${r.tekst}"`).join(', ')})`);

  // Lezen mag: de huidige en de standaard zoekopdracht, voor geloofwaardige antwoorden van de onderschepping.
  const instelling = await page.evaluate(async () => (await fetch('/api/settings')).json()).catch(() => null);
  if (!instelling?.zoek || !instelling?.standaard) {
    fail('c42: GET /api/settings gaf geen zoekopdracht — dit meet niets');
    fail('c43: GET /api/settings gaf geen zoekopdracht — dit meet niets');
    return;
  }

  // ── Test ────────────────────────────────────────────────────────────────────
  const voorTest = await waarStaat(page, 'Test klaar.');
  const test = await drukMetToetsenbord(m, {
    actie: 'testen', pad: '/api/settings/test', methode: 'POST', sleutel: 'c42',
    antwoord: { ok: true, tellingen: TELLINGEN },
  });
  if (test) {
    const t = test.tijdens;
    if (t.verzoeken < 1 || t.binnen) fail(`c42: de meting "tijdens Test" viel niet tijdens het verzoek (${t.verzoeken} verzoek(en), antwoord al binnen: ${t.binnen}) — dit meet niets`);
    else if (t.body) fail(`c42: tijdens Test (Enter, onderschept ${VERTRAGING} ms) staat de focus op body`);
    else ok(`c42: tijdens Test (Enter, onderschept ${VERTRAGING} ms) staat de focus op ${t.wat} (aria-disabled="${t.ariaDisabled}")`);
    if (!test.res) fail('c42: Test kreeg geen antwoord — "na Test" meet niets');
    else if (test.na.body) fail('c42: na Test staat de focus op body');
    else ok(`c42: na Test staat de focus op ${test.na.wat}`);
    notes.push(`c42: Test twee keer Enter tijdens het verzoek → ${test.verzoeken} POST /api/settings/test`);

    // c43: het resultaat in een live-regio, die er al stond en tijdens het verzoek leeg was.
    const na = await waarStaat(page, 'Test klaar.');
    const inLive = na.filter((h) => h.live);
    const tekst = inLive[0]?.tekst ?? '';
    const volledig = ['WVL: 120 treffers', 'OVL: 98 treffers', 'BRU: hoogstens 600 treffers, wordt afgekapt'].every((z) => tekst.includes(z));
    if (!test.res) fail('c43: Test kreeg geen antwoord — dit meet niets');
    else if (voorTest.some((h) => h.live)) fail('c43: "Test klaar." stond al in een live-regio vóór de test — geen wijziging om aan te kondigen');
    else if (!inLive.length) fail(`c43: het resultaat van Test staat in geen enkele live-regio (${na.length} plek(ken) met "Test klaar.": ${na.map((h) => `"${h.tekst.slice(0, 40)}" live=${h.live}`).join('; ') || 'geen'})`);
    else if (!volledig) fail(`c43: de live-regio na Test zegt "${tekst}" — de regio's ontbreken`);
    else ok(`c43: het resultaat van Test staat in een live-regio (${inLive[0].live}): "${tekst}"`);
    if (inLive.length && !inLive.every((h) => h.bijLaden)) fail('c43: de live-regio met het testresultaat bestond niet bij het laden — hij verscheen samen met zijn inhoud');
    else if (inLive.length) ok('c43: de live-regio met het testresultaat stond er al bij het laden, zonder die tekst');
  }

  // ── Opslaan ─────────────────────────────────────────────────────────────────
  const veld = page.getByLabel('Zoektermen', { exact: true });
  if ((await veld.count()) !== 1) {
    fail(`c42: ${await veld.count()} velden "Zoektermen", verwacht 1 — Opslaan niet te meten`);
    fail('c43: Opslaan niet te meten (geen veld om iets te wijzigen) — dit meet niets');
  } else {
    await veld.fill('harnessterm');
    await veld.press('Enter');
    await page.waitForTimeout(200);
    const opgeslagen = { ...instelling.zoek, termen: [...instelling.zoek.termen, 'harnessterm'] };
    const aan = await page.locator('[data-zoekopdracht-actie="opslaan"]').getAttribute('aria-disabled');
    if (aan !== 'false') notes.push(`c42: Opslaan draagt na een wijziging aria-disabled="${aan}"`);
    const voorOpslaan = await waarStaat(page, 'Opgeslagen.');
    const opslaan = await drukMetToetsenbord(m, {
      actie: 'opslaan', pad: '/api/settings', methode: 'PUT', sleutel: 'c42',
      antwoord: { ok: true, zoek: opgeslagen, isStandaard: false },
    });
    if (opslaan) {
      const t = opslaan.tijdens;
      if (t.verzoeken < 1 || t.binnen) fail(`c42: de meting "tijdens Opslaan" viel niet tijdens het verzoek (${t.verzoeken} verzoek(en), antwoord al binnen: ${t.binnen}) — dit meet niets`);
      else if (t.body) fail(`c42: tijdens Opslaan (Enter, onderschept ${VERTRAGING} ms) staat de focus op body`);
      else ok(`c42: tijdens Opslaan (Enter, onderschept ${VERTRAGING} ms) staat de focus op ${t.wat} (aria-disabled="${t.ariaDisabled}")`);
      if (!opslaan.res) fail('c42: Opslaan kreeg geen antwoord — "na Opslaan" meet niets');
      else if (opslaan.na.body) fail('c42: na Opslaan staat de focus op body');
      else ok(`c42: na Opslaan staat de focus op ${opslaan.na.wat}`);
      notes.push(`c42: Opslaan twee keer Enter tijdens het verzoek → ${opslaan.verzoeken} PUT /api/settings`);

      const na = await waarStaat(page, 'Opgeslagen.');
      const inLive = na.filter((h) => h.live);
      if (!opslaan.res) fail('c43: Opslaan kreeg geen antwoord — dit meet niets');
      else if (voorOpslaan.some((h) => h.live)) fail('c43: "Opgeslagen." stond al in een live-regio vóór Opslaan — geen wijziging om aan te kondigen');
      else if (!inLive.length) fail(`c43: het resultaat van Opslaan staat in geen enkele live-regio (${na.length} plek(ken) met "Opgeslagen.": ${na.map((h) => `"${h.tekst.slice(0, 40)}" live=${h.live}`).join('; ') || 'geen'})`);
      else ok(`c43: het resultaat van Opslaan staat in een live-regio (${inLive[0].live}): "${inLive[0].tekst}"`);
    }

    // ── Herstel ───────────────────────────────────────────────────────────────
    // Verschijnt pas na een opgeslagen afwijking van de standaard (het onderschepte PUT-antwoord hierboven).
    const herstel = await drukMetToetsenbord(m, {
      actie: 'herstellen', pad: '/api/settings', methode: 'DELETE', sleutel: 'c42',
      antwoord: { ok: true, zoek: instelling.standaard, isStandaard: true },
    });
    if (herstel) {
      const t = herstel.tijdens;
      if (t.verzoeken < 1 || t.binnen) fail(`c42: de meting "tijdens Herstel" viel niet tijdens het verzoek (${t.verzoeken} verzoek(en), antwoord al binnen: ${t.binnen}) — dit meet niets`);
      else if (t.body) fail(`c42: tijdens Herstel (Enter, onderschept ${VERTRAGING} ms) staat de focus op body`);
      else ok(`c42: tijdens Herstel (Enter, onderschept ${VERTRAGING} ms) staat de focus op ${t.wat} (aria-disabled="${t.ariaDisabled}")`);
      // Het defect vraagt dat de knop verdwijnt; blijft hij staan, dan is "niet op body" vanzelf waar.
      if (!herstel.res) fail('c42: Herstel kreeg geen antwoord — "na Herstel" meet niets');
      else if (herstel.knopNa !== 0) fail(`c42: Herstel staat er na een geslaagd antwoord met isStandaard nog (${herstel.knopNa}) — het verdwijnen is niet opgewekt, dit meet niets`);
      else if (herstel.na.body) fail('c42: na Herstel (de knop verdween) staat de focus op body');
      else ok(`c42: na Herstel (de knop verdween) staat de focus op ${herstel.na.wat}`);
      const teruggezet = (await waarStaat(page, 'Teruggezet')).filter((h) => h.live);
      notes.push(`c42/c43: na Herstel staat "Teruggezet…" ${teruggezet.length ? `in een live-regio (${teruggezet[0].live})` : 'in geen live-regio'}`);
    }
  }
  await m.stopOnderschepping();

  const dbNa = await m.dbVingerafdruk();
  if (dbNa !== dbVoor) fail(`instellingen: de database veranderde (${dbVoor} → ${dbNa}) — een onderschepping lekte`);
  else ok(`instellingen: de database is ongemoeid (vingerafdruk ${dbNa}, vóór én na)`);
}
