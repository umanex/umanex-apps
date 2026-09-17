/**
 * Fase 3 — het opvolgingspaneel (`components/ContactPanel.tsx`), items c21–c27 van
 * `briefings/2026-09-17-feature-a11y-fouten.tcebc.md`.
 *
 * Draait op de ECHTE database. Drie regels die dat veilig houden:
 * - elk scenario zet eerst een vangnet op alle schrijfverzoeken naar /api, met positieve controle;
 *   faalt die, dan wordt er niet geklikt;
 * - een verzonnen contactmoment (voor Verwijderen) komt uit een onderschepte GET, nooit uit de database;
 * - de vingerafdruk van de database vóór en na moet gelijk zijn.
 *
 * Gemeten wordt gedrag: rollen en namen zoals de browser ze berekent (`getByRole`), `activeElement`,
 * tekst in een live-regio die er vóór de klik al stond, en rechthoeken. Geen klassen.
 */

const LEADS = '/?tab=leads';
const VERZONNEN_NOTITIE = 'harness: verzonnen contactmoment';
const VERZONNEN_DATUM = '2026-09-01';
const ACTIE_DATUM = '2026-12-01';

const isHistoriek = (url) => new URL(url).pathname === '/api/opvolging';
const isHistoriekGet = (r) => r.method() === 'GET' && isHistoriek(r.url());

export default async function opvolging(m) {
  const { page, ok, fail, notes } = m;
  const dialoog = () => page.locator('[role="dialog"]');
  const leadKaarten = () => page.locator('[role="tabpanel"]:visible [data-item^="lead-"]');
  const opvolgKnop = (kaart) => kaart.getByRole('button', { name: 'Opvolging', exact: true });

  // Console: een eigen spiegel van dezelfde events, mét de URL van de bron. Zo filteren we alleen de
  // fouten die we zelf forceerden (abort en 500 op /api/opvolging, en de positieve controle op
  // /api/jobs/0), en blijft elke andere consolefout staan.
  const spiegel = [];
  const opConsole = (msg) => { if (msg.type() === 'error') spiegel.push({ tekst: msg.text(), url: msg.location()?.url ?? '' }); };
  const opPaginafout = (e) => spiegel.push({ tekst: String(e), url: '' });
  page.on('console', opConsole);
  page.on('pageerror', opPaginafout);
  const consoleStart = m.consoleErrors.length;

  // ── Onderschepping ──────────────────────────────────────────────────────────
  /** Vangnet op schrijfverzoeken. Zonder bevestigde onderschepping: geen klik. */
  const vangnet = async (sleutel, antwoord = { status: 200, body: { ok: true, harness: 'opvolging' } }) => {
    const bevestigd = await m.onderschepSchrijven(antwoord);
    if (!bevestigd) fail(`${sleutel}: onderschepping van schrijfverzoeken niet bevestigd (${JSON.stringify(antwoord).slice(0, 60)}) — geen klik`);
    return bevestigd;
  };

  // De GET van de historiek. Moet ná `onderschepSchrijven` geregistreerd worden: Playwright laat de
  // jongste route eerst beslissen, en die van de harness doet `continue()` op een GET — dat slaat
  // elke oudere route over. Niet-GET gaat met `fallback()` door naar het vangnet.
  let historiekRoute = null;
  const matchHistoriek = (url) => url.pathname === '/api/opvolging';
  const stopHistoriek = async () => {
    if (!historiekRoute) return;
    await page.unroute(matchHistoriek, historiekRoute).catch(() => {});
    historiekRoute = null;
  };
  const onderschepHistoriek = async (behandel) => {
    await stopHistoriek();
    let treffers = 0;
    historiekRoute = async (route) => {
      if (route.request().method() !== 'GET') return route.fallback();
      treffers++;
      return behandel(route);
    };
    await page.route(matchHistoriek, historiekRoute);
    return () => treffers;
  };

  // ── Paneel ──────────────────────────────────────────────────────────────────
  const eersteLead = async (sleutel, pad = LEADS) => {
    const n = await leadKaarten().count();
    if (n === 0) {
      fail(`${sleutel}: nul leadkaarten op ${pad} — dit meet niets`);
      return null;
    }
    return leadKaarten().first();
  };

  /** Wacht tot de historiek geladen is óf faalde; dan is het paneel bedienbaar. */
  const wachtGeladen = () =>
    page
      .waitForFunction(() => {
        const d = document.querySelectorAll('[role="dialog"]');
        if (d.length !== 1) return false;
        if (d[0].querySelector('[data-historiek-fout]')) return true;
        const kop = [...d[0].querySelectorAll('h3')].find((h) => h.textContent.trim() === 'Historiek');
        return Boolean(kop) && !/Laden…/.test(kop.parentElement?.textContent ?? '');
      }, null, { timeout: 10_000 })
      .catch(() => {});

  /** Opent het paneel met een muisklik en merkt de knop, zodat "de knop die opende" niet op tekst leunt. */
  const openPaneel = async (knop, { toetsenbord = false } = {}) => {
    const n = await knop.count();
    if (n !== 1) throw new Error(`Opvolging-knop telt ${n}, verwacht 1`);
    await page.evaluate(() => document.querySelectorAll('[data-probe-opener]').forEach((e) => e.removeAttribute('data-probe-opener')));
    await knop.evaluate((e) => e.setAttribute('data-probe-opener', ''));
    const get = page.waitForRequest(isHistoriekGet, { timeout: 15_000 }).catch(() => null);
    if (toetsenbord) {
      await knop.focus();
      await page.keyboard.press('Enter');
    } else {
      await knop.click();
    }
    await get;
    await wachtGeladen();
    const dialogen = await dialoog().count();
    if (dialogen !== 1) throw new Error(`${dialogen} dialogen na het openen, verwacht 1`);
  };

  const wachtDicht = async () => {
    await page.waitForFunction(() => document.querySelectorAll('[role="dialog"]').length === 0, null, { timeout: 5_000 }).catch(() => {});
    // Radix geeft de focus terug in een setTimeout ná het ontkoppelen.
    await page.waitForTimeout(250);
    return dialoog().count();
  };

  const focusStand = () =>
    page.evaluate(() => {
      const a = document.activeElement;
      const dlg = document.querySelector('[role="dialog"]');
      return {
        body: !a || a === document.body || a === document.documentElement,
        container: Boolean(dlg) && a === dlg,
        opener: Boolean(a?.hasAttribute?.('data-probe-opener')),
        tag: a?.tagName?.toLowerCase() ?? '(geen)',
        tekst: (a?.getAttribute?.('aria-label') ?? a?.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40),
        item: a?.closest?.('[data-item]')?.getAttribute('data-item') ?? null,
        tabpanel: a?.getAttribute?.('role') === 'tabpanel',
      };
    });
  const beschrijf = (f) =>
    f.body ? 'body' : f.container ? 'de dialoogcontainer' : `<${f.tag}> "${f.tekst}"${f.item ? ` in ${f.item}` : ''}${f.tabpanel ? ' (tabpaneel)' : ''}`;

  const sluitwijzen = [
    ['Escape', () => page.keyboard.press('Escape')],
    ['sluitkruis', async () => {
      const kruis = dialoog().getByRole('button', { name: 'Sluiten', exact: true });
      const n = await kruis.count();
      if (n !== 1) throw new Error(`sluitkruis telt ${n}, verwacht 1`);
      await kruis.click();
    }],
    // Links op de overlay: het paneel komt van rechts en is hoogstens 448 px breed.
    ['overlay-klik', () => page.mouse.click(12, 200)],
  ];

  /**
   * "Aangekondigd" = de tekst staat in een live-regio die er vóór de handeling al stond. Een regio die
   * pas met zijn inhoud verschijnt, leest een schermlezer niet betrouwbaar voor; daarom merken we de
   * regio's vóór de klik en eisen we de tekst in een gemerkte.
   */
  const markeerLive = () =>
    page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return -1;
      const regios = d.querySelectorAll('[aria-live]:not([aria-live="off"]),[role="status"],[role="log"],[role="alert"]');
      for (const r of regios) r.setAttribute('data-probe-live', '');
      return regios.length;
    });
  const aangekondigd = (bron) =>
    page.evaluate((bron) => {
      const re = new RegExp(bron);
      const d = document.querySelector('[role="dialog"]');
      if (!d) return { metMarker: [], zonderMarker: [], verborgen: [] };
      const regios = [...d.querySelectorAll('[aria-live]:not([aria-live="off"]),[role="status"],[role="log"],[role="alert"]')];
      const treffers = regios.filter((r) => re.test((r.textContent ?? '').trim()));
      const tekst = (r) => (r.textContent ?? '').trim().slice(0, 90);
      return {
        metMarker: treffers.filter((r) => r.hasAttribute('data-probe-live') && !r.closest('[aria-hidden="true"]')).map(tekst),
        zonderMarker: treffers.filter((r) => !r.hasAttribute('data-probe-live')).map(tekst),
        verborgen: treffers.filter((r) => r.closest('[aria-hidden="true"]')).map(tekst),
      };
    }, bron);

  /** Elke plek in het paneel die een onbekende historiek als leeg zou tonen. */
  const nulTekst = () =>
    page.evaluate(() => {
      const d = document.querySelector('[role="dialog"]');
      if (!d) return null;
      return [...(d.textContent ?? '').matchAll(/Nog geen contactmomenten|(?<!\d)0 contactmomenten/g)].map((x) => x[0]);
    });

  const scenario = async (sleutel, fn) => {
    try {
      await fn();
    } catch (e) {
      fail(`${sleutel}: scenario gooide ${String(e).split('\n')[0]}`);
    } finally {
      await m.stopOnderschepping();
      await stopHistoriek();
    }
  };

  const dbVoor = await m.dbVingerafdruk();
  try {
    if (dbVoor.startsWith('onleesbaar')) {
      fail(`opvolging-db: vingerafdruk vóór ${dbVoor} — zonder nulmeting geen enkele klik`);
      return;
    }

    // ── c23: mislukte historiek-lading ────────────────────────────────────────
    for (const vorm of ['500', 'netwerkfout']) {
      await scenario(`c23 (${vorm})`, async () => {
        await m.laad(LEADS);
        if (!(await vangnet('c23'))) return;
        const kaart = await eersteLead(`c23 (${vorm})`);
        if (!kaart) return;
        const treffers = await onderschepHistoriek((route) =>
          vorm === '500'
            ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'harness-historiek' }) })
            : route.abort('failed')
        );
        await openPaneel(opvolgKnop(kaart));
        if (treffers() === 0) {
          fail(`c23 (${vorm}): de historiek-GET werd niet onderschept — dit meet niets`);
          return;
        }
        const d = dialoog();
        const alert = d.getByRole('alert').filter({ hasText: /Historiek niet geladen/ });
        const nAlert = await alert.count();
        if (nAlert === 1) ok(`c23 (${vorm}): een mislukte historiek-lading toont een alert ("${(await alert.innerText()).trim()}")`);
        else fail(`c23 (${vorm}): ${nAlert} alert(s) "Historiek niet geladen" na een mislukte lading, verwacht 1`);

        const nul = await nulTekst();
        if (nul === null) fail(`c23 (${vorm}): geen dialoog om te lezen — dit meet niets`);
        else if (nul.length === 0) ok(`c23 (${vorm}): geen "Nog geen contactmomenten" of "0 contactmomenten" in het paneel of zijn live-regio`);
        else fail(`c23 (${vorm}): na een mislukte lading staat er "${nul.join('" + "')}" — een onbekende historiek toont zich als leeg`);

        // Positieve controle op de nul-detector hierboven: dezelfde lead, nu écht geladen. Heeft hij
        // in de database nul momenten, dan MOET de detector nu iets vinden — anders kon hij dat nooit.
        await stopHistoriek();
        const opnieuw = d.getByRole('button', { name: 'Opnieuw proberen', exact: true });
        if ((await opnieuw.count()) !== 1) {
          fail(`c23 (${vorm}): geen knop "Opnieuw proberen" bij de fout — herstel niet gemeten`);
          return;
        }
        const antwoord = page.waitForResponse((r) => isHistoriekGet(r.request()), { timeout: 10_000 }).catch(() => null);
        await opnieuw.click();
        const res = await antwoord;
        const body = res ? await res.json().catch(() => null) : null;
        await page.waitForTimeout(500);
        if (!body?.ok) {
          fail(`c23 (${vorm}): de echte herlading gaf geen geldig antwoord — positieve controle niet gemeten`);
          return;
        }
        const naAlert = await d.getByRole('alert').filter({ hasText: /Historiek niet/ }).count();
        const naNul = (await nulTekst()) ?? [];
        if (body.momenten.length === 0) {
          if (naAlert === 0 && naNul.length > 0) ok(`c23 (${vorm}): positieve controle — na een geslaagde herlading (0 momenten) is de fout weg en vindt de detector "${naNul[0]}"`);
          else fail(`c23 (${vorm}): positieve controle — na een geslaagde herlading met 0 momenten: ${naAlert} fout(en), detector vond ${JSON.stringify(naNul)}`);
        } else {
          notes.push(`c23 (${vorm}): deze lead heeft ${body.momenten.length} momenten — positieve controle op de nul-detector niet mogelijk`);
          if (naAlert !== 0) fail(`c23 (${vorm}): na een geslaagde herlading staat de fout er nog`);
        }
      });
    }

    // ── c21: een gegooide fetch in elk van de drie mutaties ───────────────────
    await scenario('c21 Vastleggen', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c21 Vastleggen'))) return;
      const kaart = await eersteLead('c21 Vastleggen');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      const notitie = d.getByLabel('Notitie', { exact: true });
      if ((await notitie.count()) !== 1) throw new Error(`notitieveld telt ${await notitie.count()}`);
      await notitie.fill('harness c21: niet vastleggen');
      if (!(await vangnet('c21 Vastleggen', { abort: true }))) return;
      const post = page.waitForRequest((r) => r.method() === 'POST' && isHistoriek(r.url()), { timeout: 5_000 }).catch(() => null);
      await d.getByRole('button', { name: 'Vastleggen', exact: true }).click();
      if (!(await post)) {
        fail('c21 Vastleggen: de klik stuurde geen POST — dit meet niets');
        return;
      }
      const alert = d.getByRole('alert').filter({ hasText: /^Niet vastgelegd/ });
      await alert.first().waitFor({ timeout: 3_000 }).catch(() => {});
      const n = await alert.count();
      if (n === 1) ok(`c21 Vastleggen: een gegooide fetch toont een alert ("${(await alert.innerText()).trim().slice(0, 60)}")`);
      else fail(`c21 Vastleggen: ${n} alert(s) "Niet vastgelegd…" na een gegooide fetch, verwacht 1`);
      const blijft = await notitie.inputValue();
      if (blijft === 'harness c21: niet vastleggen') ok('c21 Vastleggen: de getypte notitie blijft staan na de fout');
      else fail(`c21 Vastleggen: na de fout staat de notitie op "${blijft}"`);
    });

    await scenario('c21 Bewaren', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c21 Bewaren'))) return;
      const kaart = await eersteLead('c21 Bewaren');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      await d.getByLabel('Datum van de volgende actie', { exact: true }).fill(ACTIE_DATUM);
      await d.getByLabel('Omschrijving van de volgende actie', { exact: true }).fill('harness c21 actie');
      const knop = d.getByRole('button', { name: /^(Bewaren|Bijwerken)$/ });
      if ((await knop.count()) !== 1) throw new Error(`Bewaren/Bijwerken telt ${await knop.count()}`);
      if (!(await vangnet('c21 Bewaren', { abort: true }))) return;
      const put = page.waitForRequest((r) => r.method() === 'PUT' && new URL(r.url()).pathname === '/api/opvolging/actie', { timeout: 5_000 }).catch(() => null);
      await knop.click();
      if (!(await put)) {
        fail('c21 Bewaren: de klik stuurde geen PUT — dit meet niets');
        return;
      }
      const alert = d.getByRole('alert').filter({ hasText: /^Actie niet bewaard/ });
      await alert.first().waitFor({ timeout: 3_000 }).catch(() => {});
      const n = await alert.count();
      if (n === 1) ok(`c21 Bewaren: een gegooide fetch toont een alert ("${(await alert.innerText()).trim().slice(0, 60)}")`);
      else fail(`c21 Bewaren: ${n} alert(s) "Actie niet bewaard…" na een gegooide fetch, verwacht 1`);
    });

    await scenario('c21 Verwijderen', async () => {
      await m.laad(LEADS);
      // Het vangnet vóór de GET-route: zie `onderschepHistoriek`.
      if (!(await vangnet('c21 Verwijderen', { abort: true }))) return;
      const kaart = await eersteLead('c21 Verwijderen');
      if (!kaart) return;
      const key = ((await kaart.getAttribute('data-item')) ?? '').replace(/^lead-/, '');
      await onderschepHistoriek((route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ok: true,
            momenten: [{ id: 999999, subjectType: 'lead', subjectKey: key, datum: VERZONNEN_DATUM, kanaal: 'mail', notitie: VERZONNEN_NOTITIE, rechtsgrond: 'harness', createdAt: `${VERZONNEN_DATUM}T10:00:00.000Z` }],
            actie: null,
            optOut: false,
            status: 'new',
          }),
        })
      );
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      if ((await d.getByText(VERZONNEN_NOTITIE, { exact: true }).count()) !== 1) {
        fail('c21 Verwijderen: het verzonnen contactmoment staat niet in de historiek — dit meet niets');
        return;
      }
      const prullenbak = d.getByRole('button', { name: `Contactmoment van ${VERZONNEN_DATUM} verwijderen`, exact: true });
      if ((await prullenbak.count()) !== 1) throw new Error(`verwijderknop telt ${await prullenbak.count()}`);
      // De bevestiging in twee stappen vervangt de knop met de focus door twee andere, en terug.
      // Beide wissels met het toetsenbord: waar staat de focus daarna?
      await prullenbak.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const naVraag = await focusStand();
      if (naVraag.body || naVraag.container) fail(`c21 Verwijderen: na Enter op de prullenbak staat de focus op ${beschrijf(naVraag)}`);
      else ok(`c21 Verwijderen: na Enter op de prullenbak staat de focus op ${beschrijf(naVraag)}, niet op body of de dialoogcontainer`);
      const annuleer = d.getByRole('button', { name: 'Annuleren', exact: true });
      if ((await annuleer.count()) !== 1) throw new Error(`Annuleren telt ${await annuleer.count()}`);
      await annuleer.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(300);
      const naAnnuleer = await focusStand();
      if (naAnnuleer.body || naAnnuleer.container) fail(`c21 Verwijderen: na Annuleren (toetsenbord) staat de focus op ${beschrijf(naAnnuleer)}`);
      else ok(`c21 Verwijderen: na Annuleren (toetsenbord) staat de focus op ${beschrijf(naAnnuleer)}, niet op body of de dialoogcontainer`);
      if ((await prullenbak.count()) !== 1) throw new Error(`verwijderknop telt na Annuleren ${await prullenbak.count()}`);
      await prullenbak.click();
      const bevestig = d.getByRole('button', { name: 'Verwijderen', exact: true });
      if ((await bevestig.count()) !== 1) throw new Error(`bevestigknop Verwijderen telt ${await bevestig.count()}`);
      const isDelete = (r) => r.method() === 'DELETE' && new URL(r.url()).pathname === '/api/opvolging/moment/999999';
      const del = page.waitForRequest(isDelete, { timeout: 5_000 }).catch(() => null);
      // Met het toetsenbord: de focus na een mislukte poging is een toetsenbordvraag.
      await bevestig.focus();
      await page.keyboard.press('Enter');
      if (!(await del)) {
        fail('c21 Verwijderen: Enter stuurde geen DELETE — dit meet niets');
        return;
      }
      const alert = d.getByRole('alert').filter({ hasText: /^Niet verwijderd/ });
      await alert.first().waitFor({ timeout: 3_000 }).catch(() => {});
      const n = await alert.count();
      if (n === 1) ok(`c21 Verwijderen: een gegooide fetch toont een alert ("${(await alert.innerText()).trim().slice(0, 60)}")`);
      else fail(`c21 Verwijderen: ${n} alert(s) "Niet verwijderd…" na een gegooide fetch, verwacht 1`);
      // Buiten de letter van c21, maar op hetzelfde pad en in hetzelfde bestand: een knop die tijdens
      // het verzoek `disabled` werd, gaf de focus af (gemeten 2026-09-17: de dialoogcontainer).
      const f = await focusStand();
      if (f.body || f.container) fail(`c21 Verwijderen: na de mislukte verwijdering (toetsenbord) staat de focus op ${beschrijf(f)}`);
      else ok(`c21 Verwijderen: na de mislukte verwijdering (toetsenbord) staat de focus op ${beschrijf(f)}, niet op body of de dialoogcontainer`);

      // Het geslaagde pad: het moment en zijn knoppen verdwijnen terecht, de vraag is waar de focus heen
      // gaat. Een nieuw vangnet (200) staat vóór de GET-route van de historiek, dus de herlading leest de
      // echte database — waar dit verzonnen moment niet in staat.
      if (!(await vangnet('c21 Verwijderen', { status: 200, body: { ok: true, harness: 'opvolging' } }))) return;
      if ((await bevestig.count()) !== 1) {
        fail('c21 Verwijderen: na de fout stond de bevestigknop er niet meer — geslaagd pad niet gemeten');
        return;
      }
      const herlading = page.waitForResponse((r) => isHistoriekGet(r.request()), { timeout: 8_000 }).catch(() => null);
      await bevestig.focus();
      await page.keyboard.press('Enter');
      const res = await herlading;
      await page.waitForTimeout(400);
      const weg = await d.getByText(VERZONNEN_NOTITIE, { exact: true }).count();
      const naSucces = await focusStand();
      if (!res || weg !== 0) fail(`c21 Verwijderen: het geslaagde pad haalde het moment niet weg (herlading ${res ? 'ja' : 'nee'}, nog ${weg}) — dit meet niets`);
      else if (naSucces.body || naSucces.container) fail(`c21 Verwijderen: na een geslaagde verwijdering (toetsenbord) staat de focus op ${beschrijf(naSucces)}`);
      else ok(`c21 Verwijderen: na een geslaagde verwijdering (toetsenbord) staat de focus op ${beschrijf(naSucces)}, niet op body of de dialoogcontainer`);
    });

    // ── c24 + c22a + c26b: één geslaagd Vastleggen met het toetsenbord, drie aparte assen ──
    await scenario('c24', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c24'))) return;
      const kaart = await eersteLead('c24');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      const regios = await markeerLive();
      const kanaal = d.getByLabel('Kanaal', { exact: true });
      await kanaal.selectOption('linkedin');
      const kanaalVoor = await kanaal.inputValue();
      await d.getByLabel('Notitie', { exact: true }).fill('harness c22a/c24/c26b');
      // Vertraagd, zodat "tijdens" een meetbaar venster is. Het antwoord draagt de status zoals de
      // server hem zou geven; onder Open blijft de kaart staan.
      if (!(await vangnet('c24', { status: 200, vertraging: 1_000, body: { ok: true, status: 'contacted', harness: 'opvolging' } }))) return;

      const knop = d.getByRole('button', { name: 'Vastleggen', exact: true });
      if ((await knop.count()) !== 1) throw new Error(`Vastleggen telt ${await knop.count()}`);
      let antwoordBinnen = false;
      const post = page.waitForRequest((r) => r.method() === 'POST' && isHistoriek(r.url()), { timeout: 5_000 }).catch(() => null);
      const antwoord = page
        .waitForResponse((r) => r.request().method() === 'POST' && isHistoriek(r.url()), { timeout: 8_000 })
        .then((r) => { antwoordBinnen = true; return r; })
        .catch(() => null);
      await knop.focus();
      await page.keyboard.press('Enter');
      const verzoek = await post;
      await page.waitForTimeout(200);
      const tijdens = await focusStand();
      const binnenTijdens = antwoordBinnen;

      if (!verzoek) fail('c24: Enter op Vastleggen stuurde geen POST — dit meet niets');
      else if (binnenTijdens) fail('c24: het antwoord was er al vóór de meting — "tijdens" niet gemeten');
      else if (tijdens.body || tijdens.container) fail(`c24: tijdens Vastleggen (toetsenbord) staat de focus op ${beschrijf(tijdens)}`);
      else ok(`c24: tijdens Vastleggen (toetsenbord) staat de focus op ${beschrijf(tijdens)}, niet op body`);

      // "Na" = na het antwoord én de herlading van de historiek die erop volgt.
      const herlading = page.waitForResponse((r) => isHistoriekGet(r.request()), { timeout: 8_000 }).catch(() => null);
      const res = await antwoord;
      const get = await herlading;
      await page.waitForTimeout(400);
      const na = await focusStand();
      if (!res || !get) fail(`c24: geen ${!res ? 'antwoord op de POST' : 'herlading van de historiek'} — "na" niet gemeten`);
      else if (na.body || na.container) fail(`c24: na Vastleggen (toetsenbord) staat de focus op ${beschrijf(na)}`);
      else ok(`c24: na Vastleggen (toetsenbord) staat de focus op ${beschrijf(na)}, niet op body`);

      if (regios < 1) fail('c22a: vóór Vastleggen stond er geen enkele live-regio in het paneel — dit meet niets');
      else {
        const a = await aangekondigd('^Contactmoment van \\d{4}-\\d{2}-\\d{2} vastgelegd');
        if (a.metMarker.length) ok(`c22a: een geslaagd Vastleggen staat in een live-regio die er vóór de klik al was ("${a.metMarker[0]}")`);
        else if (a.zonderMarker.length) fail(`c22a: de melding staat in een regio die pas ná de klik verscheen ("${a.zonderMarker[0]}") — niet betrouwbaar voorgelezen`);
        else if (a.verborgen.length) fail(`c22a: de melding staat in een aria-hidden regio ("${a.verborgen[0]}")`);
        else fail('c22a: na een geslaagd Vastleggen staat "Contactmoment van … vastgelegd" in geen enkele live-regio');
      }

      const kanaalNa = await kanaal.inputValue();
      if (kanaalVoor !== 'linkedin') fail(`c26b: het kanaal stond vóór Vastleggen op "${kanaalVoor}", niet op linkedin — dit meet niets`);
      else if (!res) fail('c26b: geen geslaagd antwoord — dit meet niets');
      else if (kanaalNa === 'linkedin') ok('c26b: na een geslaagd Vastleggen blijft het gekozen kanaal (LinkedIn) staan');
      else fail(`c26b: na een geslaagd Vastleggen staat het kanaal op "${kanaalNa}", gekozen was "linkedin"`);
    });

    // ── c22b: een geslaagd Bewaren van de volgende actie ──────────────────────
    await scenario('c22b', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c22b'))) return;
      const kaart = await eersteLead('c22b');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      const regios = await markeerLive();
      await d.getByLabel('Datum van de volgende actie', { exact: true }).fill(ACTIE_DATUM);
      await d.getByLabel('Omschrijving van de volgende actie', { exact: true }).fill('harness c22b');
      const knop = d.getByRole('button', { name: /^(Bewaren|Bijwerken)$/ });
      if ((await knop.count()) !== 1) throw new Error(`Bewaren/Bijwerken telt ${await knop.count()}`);
      // Het antwoord zoals de route het geeft: `actie` met wat opgeslagen is.
      if (!(await vangnet('c22b', { status: 200, body: { ok: true, actie: { datum: ACTIE_DATUM, omschrijving: 'harness c22b' } } }))) return;
      const put = page.waitForResponse((r) => r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/opvolging/actie', { timeout: 5_000 }).catch(() => null);
      await knop.click();
      if (!(await put)) {
        fail('c22b: Bewaren stuurde geen PUT — dit meet niets');
        return;
      }
      await page.waitForTimeout(400);
      if (regios < 1) {
        fail('c22b: vóór Bewaren stond er geen enkele live-regio in het paneel — dit meet niets');
        return;
      }
      const a = await aangekondigd(`^Volgende actie (bewaard|bijgewerkt) voor ${ACTIE_DATUM}: harness c22b\\.$`);
      if (a.metMarker.length) ok(`c22b: een geslaagd Bewaren staat in een live-regio die er vóór de klik al was ("${a.metMarker[0]}")`);
      else if (a.zonderMarker.length) fail(`c22b: de melding staat in een regio die pas ná de klik verscheen ("${a.zonderMarker[0]}")`);
      else if (a.verborgen.length) fail(`c22b: de melding staat in een aria-hidden regio ("${a.verborgen[0]}")`);
      else fail('c22b: na een geslaagd Bewaren staat "Volgende actie bewaard voor …" in geen enkele live-regio');
    });

    // ── c25: focus terug op de knop die opende ────────────────────────────────
    for (const [naam, sluit] of sluitwijzen) {
      await scenario(`c25 ${naam}`, async () => {
        await m.laad(LEADS);
        if (!(await vangnet(`c25 ${naam}`))) return;
        const kaart = await eersteLead(`c25 ${naam}`);
        if (!kaart) return;
        await openPaneel(opvolgKnop(kaart));
        await sluit();
        const nog = await wachtDicht();
        if (nog !== 0) {
          fail(`c25 ${naam}: het paneel sloot niet (${nog} dialoog) — dit meet niets`);
          return;
        }
        const f = await focusStand();
        if (f.opener) ok(`c25 ${naam}: na sluiten staat de focus op de Opvolging-knop die het paneel opende`);
        else fail(`c25 ${naam}: na sluiten staat de focus op ${beschrijf(f)}, niet op de Opvolging-knop die opende`);
      });
    }

    await scenario('c25 toetsenbord', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c25 toetsenbord'))) return;
      const kaart = await eersteLead('c25 toetsenbord');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart), { toetsenbord: true });
      await page.keyboard.press('Escape');
      if ((await wachtDicht()) !== 0) {
        fail('c25 toetsenbord: Escape sloot het paneel niet — dit meet niets');
        return;
      }
      const f = await focusStand();
      if (f.opener) ok('c25 toetsenbord: geopend met Enter, gesloten met Escape — de focus staat op de Opvolging-knop');
      else fail(`c25 toetsenbord: geopend met Enter, gesloten met Escape — de focus staat op ${beschrijf(f)}`);
    });

    await scenario('c25 prospect', async () => {
      await m.laad('/?tab=prospects');
      if (!(await vangnet('c25 prospect'))) return;
      const knop = page.locator('[role="tabpanel"]:visible').getByRole('button', { name: 'Opvolging', exact: true });
      await knop.first().waitFor({ timeout: 30_000 }).catch(() => {});
      if ((await knop.count()) === 0) {
        fail('c25 prospect: geen prospectkaart met Opvolging op /?tab=prospects — dit meet niets');
        return;
      }
      await openPaneel(knop.first());
      await page.keyboard.press('Escape');
      if ((await wachtDicht()) !== 0) {
        fail('c25 prospect: Escape sloot het paneel niet — dit meet niets');
        return;
      }
      const f = await focusStand();
      if (f.opener) ok('c25 prospect: na sluiten staat de focus op de Opvolging-knop van de prospectkaart');
      else fail(`c25 prospect: na sluiten staat de focus op ${beschrijf(f)}, niet op de Opvolging-knop die opende`);
    });

    // ── c25b: de kaart verdwijnt onder Niet beoordeeld na Vastleggen ────────────────────
    // Open = alles behalve afgewezen (lib/triage.ts), dus alleen onder Niet beoordeeld of Opgeslagen verlaat de kaart
    // de lijst. Het onderschepte antwoord draagt `status: 'contacted'`, zoals de route dat teruggeeft;
    // alleen dan neemt de client de status over.
    for (const [naam, sluit] of sluitwijzen.slice(0, 2)) {
      await scenario(`c25b ${naam}`, async () => {
        const pad = '/?tab=leads&status=new';
        await m.laad(pad);
        if (!(await vangnet(`c25b ${naam}`, { status: 200, body: { ok: true, status: 'contacted', harness: 'opvolging' } }))) return;
        const filter = page.locator('select[aria-label="Status"]');
        if ((await filter.count()) !== 1 || (await filter.inputValue()) !== 'new') {
          fail(`c25b ${naam}: het statusfilter staat niet op Niet beoordeeld (new) — dit meet niets`);
          return;
        }
        const ids = await leadKaarten().evaluateAll((els) => els.map((e) => e.getAttribute('data-item')));
        if (ids.length < 3) {
          fail(`c25b ${naam}: ${ids.length} leadkaarten onder Niet beoordeeld, minstens 3 nodig — dit meet niets`);
          return;
        }
        const doel = ids[1];
        await openPaneel(opvolgKnop(page.locator(`[role="tabpanel"]:visible [data-item="${doel}"]`)));
        const post = page.waitForResponse((r) => r.request().method() === 'POST' && isHistoriek(r.url()), { timeout: 5_000 }).catch(() => null);
        await dialoog().getByRole('button', { name: 'Vastleggen', exact: true }).click();
        if (!(await post)) {
          fail(`c25b ${naam}: Vastleggen stuurde geen POST — dit meet niets`);
          return;
        }
        await page.waitForTimeout(700);
        if ((await page.locator(`[data-item="${doel}"]`).count()) !== 0) {
          fail(`c25b ${naam}: ${doel} bleef na Vastleggen onder Niet beoordeeld staan — de kaart verdween niet, dit meet niets`);
          return;
        }
        await sluit();
        if ((await wachtDicht()) !== 0) {
          fail(`c25b ${naam}: het paneel sloot niet — dit meet niets`);
          return;
        }
        // Wat er nú op de plek van de verdwenen kaart staat, gemeten in de lijst en niet afgeleid.
        const opPlek = await leadKaarten().nth(1).getAttribute('data-item').catch(() => null);
        const f = await focusStand();
        if (f.body) fail(`c25b ${naam}: de kaart verdween en na sluiten staat de focus op body`);
        else if (f.item === opPlek && f.tekst === 'Opvolging') ok(`c25b ${naam}: de kaart verdween; de focus staat op Opvolging van de kaart die nu op die plek staat (${opPlek})`);
        else if (f.tabpanel) ok(`c25b ${naam}: de kaart verdween; de focus staat op het tabpaneel`);
        else fail(`c25b ${naam}: na sluiten staat de focus op ${beschrijf(f)}, verwacht Opvolging in ${opPlek} of het tabpaneel`);
      });
    }

    // ── c26: sluiten met onbewaarde invoer vraagt eerst ───────────────────────
    const vraagNaam = 'Onbewaarde wijzigingen weggooien?';
    for (const [naam, sluit] of sluitwijzen) {
      await scenario(`c26 ${naam}`, async () => {
        await m.laad(LEADS);
        if (!(await vangnet(`c26 ${naam}`))) return;
        const kaart = await eersteLead(`c26 ${naam}`);
        if (!kaart) return;
        await openPaneel(opvolgKnop(kaart));
        const d = dialoog();
        const notitie = d.getByLabel('Notitie', { exact: true });
        await notitie.fill('harness c26: onbewaard');
        await sluit();
        await page.waitForTimeout(500);
        const dialogen = await dialoog().count();
        const vraag = d.getByRole('group', { name: vraagNaam, exact: true });
        const nVraag = dialogen === 1 ? await vraag.count() : 0;
        if (dialogen === 1 && nVraag === 1) ok(`c26 ${naam}: met onbewaarde invoer blijft het paneel open en vraagt het "${vraagNaam}"`);
        else {
          fail(`c26 ${naam}: met onbewaarde invoer ${dialogen === 0 ? 'sloot het paneel zonder te vragen' : `${nVraag} vraag/vragen in het paneel, verwacht 1`}`);
          return;
        }
        await d.getByRole('button', { name: 'Terug', exact: true }).click();
        await page.waitForTimeout(300);
        const na = { vraag: await vraag.count(), dialogen: await dialoog().count(), notitie: await notitie.inputValue() };
        if (na.vraag === 0 && na.dialogen === 1 && na.notitie === 'harness c26: onbewaard') ok(`c26 ${naam}: Terug houdt het paneel open, met de invoer`);
        else fail(`c26 ${naam}: na Terug ${JSON.stringify(na)}`);
      });
    }

    await scenario('c26 Weggooien', async () => {
      await m.laad(LEADS);
      if (!(await vangnet('c26 Weggooien'))) return;
      const kaart = await eersteLead('c26 Weggooien');
      if (!kaart) return;
      await openPaneel(opvolgKnop(kaart));
      const d = dialoog();
      await d.getByLabel('Notitie', { exact: true }).fill('harness c26: weggooien');
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);
      const weggooien = d.getByRole('button', { name: 'Weggooien', exact: true });
      if ((await dialoog().count()) !== 1 || (await weggooien.count()) !== 1) {
        fail('c26 Weggooien: Escape met onbewaarde invoer gaf geen vraag met Weggooien — Weggooien niet gemeten');
        return;
      }
      await weggooien.click();
      if ((await wachtDicht()) !== 0) {
        fail('c26 Weggooien: Weggooien sloot het paneel niet');
        return;
      }
      ok('c26 Weggooien: na de vraag sluit Weggooien het paneel');
      const f = await focusStand();
      if (f.opener) ok('c25 Weggooien: na Weggooien staat de focus op de Opvolging-knop die het paneel opende');
      else fail(`c25 Weggooien: na Weggooien staat de focus op ${beschrijf(f)}, niet op de Opvolging-knop die opende`);
    });

    // ── c27: een fout staat in beeld ──────────────────────────────────────────
    // Laag venster, en de knop tegen de onderrand van het scrollende paneel: een melding die eronder
    // verschijnt, valt dan per constructie buiten beeld tenzij het paneel ernaartoe scrollt.
    for (const bron of ['actie', 'contact']) {
      await scenario(`c27 ${bron}`, async () => {
        await page.setViewportSize({ width: 1280, height: 420 });
        await m.laad(LEADS);
        if (!(await vangnet(`c27 ${bron}`))) return;
        const kaart = await eersteLead(`c27 ${bron}`);
        if (!kaart) return;
        await openPaneel(opvolgKnop(kaart));
        const d = dialoog();
        let knop;
        if (bron === 'actie') {
          await d.getByLabel('Datum van de volgende actie', { exact: true }).fill(ACTIE_DATUM);
          await d.getByLabel('Omschrijving van de volgende actie', { exact: true }).fill('harness c27');
          knop = d.getByRole('button', { name: /^(Bewaren|Bijwerken)$/ });
        } else {
          await d.getByLabel('Notitie', { exact: true }).fill('harness c27');
          knop = d.getByRole('button', { name: 'Vastleggen', exact: true });
        }
        if ((await knop.count()) !== 1) throw new Error(`knop telt ${await knop.count()}`);
        if (!(await vangnet(`c27 ${bron}`, { status: 500, body: { ok: false, error: 'harness-c27' } }))) return;
        const voor = await knop.evaluate((b) => {
          const dlg = b.closest('[role="dialog"]');
          b.scrollIntoView({ block: 'end' });
          const dr = dlg.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return { rand: Math.round(dr.bottom - br.bottom), scrollbaar: dlg.scrollHeight > dlg.clientHeight + 1 };
        });
        if (!voor.scrollbaar || Math.abs(voor.rand) > 2) {
          fail(`c27 ${bron}: de knop staat niet tegen de onderrand van een scrollend paneel (${JSON.stringify(voor)}) — dit meet niets`);
          return;
        }
        // Toetsenbord zonder scrollen: een klik van Playwright zou zelf nog kunnen scrollen.
        await knop.evaluate((b) => b.focus({ preventScroll: true }));
        await page.keyboard.press('Enter');
        const alert = d.getByRole('alert').filter({ hasText: /harness-c27/ });
        await alert.first().waitFor({ timeout: 3_000 }).catch(() => {});
        const n = await alert.count();
        if (n !== 1) {
          fail(`c27 ${bron}: ${n} alert(s) met de fout na een 500, verwacht 1 — dit meet niets`);
          return;
        }
        await page.waitForTimeout(300);
        const r = await alert.evaluate((a) => {
          const dr = a.closest('[role="dialog"]').getBoundingClientRect();
          const ar = a.getBoundingClientRect();
          return { a: [Math.round(ar.top), Math.round(ar.bottom)], d: [Math.round(dr.top), Math.round(dr.bottom)], vh: innerHeight };
        });
        const binnen = r.a[0] >= r.d[0] - 1 && r.a[1] <= r.d[1] + 1 && r.a[1] <= r.vh + 1;
        if (binnen) ok(`c27 ${bron}: de fout staat in beeld (alert y ${r.a[0]}–${r.a[1]} binnen paneel ${r.d[0]}–${r.d[1]})`);
        else fail(`c27 ${bron}: de fout staat buiten beeld (alert y ${r.a[0]}–${r.a[1]}, paneel ${r.d[0]}–${r.d[1]})`);
      });
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  } finally {
    await m.stopOnderschepping();
    await stopHistoriek();
    await page.setViewportSize({ width: 1280, height: 720 }).catch(() => {});
    page.off('console', opConsole);
    page.off('pageerror', opPaginafout);

    const venster = m.consoleErrors.splice(consoleStart);
    if (venster.length !== spiegel.length) {
      m.consoleErrors.push(...venster);
      notes.push(`opvolging: console-spiegel telde ${spiegel.length}, de harness ${venster.length} — niets gefilterd`);
    } else {
      const geforceerd = (s) => /^Failed to load resource/.test(s.tekst) && /\/api\/(opvolging|jobs\/0)(\/|\?|$)/.test(s.url);
      const houden = venster.filter((_, i) => !geforceerd(spiegel[i]));
      m.consoleErrors.push(...houden);
      notes.push(`opvolging: ${venster.length - houden.length} geforceerde fout-melding(en) uit de console gefilterd (abort/500 op /api/opvolging en de positieve controle op /api/jobs/0), ${houden.length} andere behouden`);
    }

    if (!dbVoor.startsWith('onleesbaar')) {
      const dbNa = await m.dbVingerafdruk();
      if (dbNa !== dbVoor) fail(`opvolging-db: de database veranderde (${dbVoor} → ${dbNa}) — een schrijfverzoek lekte`);
      else ok(`opvolging-db: de database is ongemoeid (vingerafdruk ${dbNa}, vóór én na)`);
    }
  }
}
