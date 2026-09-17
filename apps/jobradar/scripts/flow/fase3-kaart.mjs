/**
 * Fase 3 — de prospectkaart (c15–c20).
 *
 * Draait op de echte database: de enige klik die kan schrijven (Bewaar in het paneel, c17) gaat
 * door `onderschepSchrijven` met positieve controle, en de module neemt een vingerafdruk van de
 * database vóór de eerste en na de laatste klik. De kaartfout (c19) wordt opgewekt met een eigen
 * onderschepping van GET /api/kaart — lezen, dus veilig — ook met positieve controle.
 *
 * Wat hier gemeten wordt, is wat een gebruiker krijgt: de toegankelijkheidsboom van Chromium (niet
 * aria-attributen), pixels (niet klassen), de echte tab-volgorde en `elementFromPoint`.
 */

const KAART = 'svg[data-kaart]';
const STATUS_WOORD = { new: 'nieuw', saved: 'bewaard', contacted: 'gecontacteerd', dismissed: 'afgewezen' };
const WOORDEN = Object.values(STATUS_WOORD);
/**
 * ARIA-rollen met "Children Presentational: True", in de ARIA- én de Chromium-spelling die CDP teruggeeft
 * (`img` heet daar `image`). Een knop onder zo'n voorouder hoort voor een schermlezer niet te bestaan.
 * Nodig omdat Chromium hem in zijn eigen boom wél laat staan: gemeten 2026-09-17 met een losse proef,
 * `<svg role="img">` met `<g role="button">` erin gaf in getFullAXTree gewoon benoemde, bereikbare knoppen.
 */
const PRESENTATIEVE_KINDEREN = new Set(['img', 'image', 'button', 'checkbox', 'math', 'menuitemcheckbox', 'menuItemCheckBox', 'menuitemradio', 'menuItemRadio', 'meter', 'option', 'listBoxOption', 'progressbar', 'progressIndicator', 'radio', 'radioButton', 'scrollbar', 'scrollBar', 'separator', 'splitter', 'slider', 'switch', 'tab']);

/** Dashboard → Prospects → Kaartweergave, met het antwoord van /api/kaart. */
async function openKaart(m) {
  const { page } = m;
  await m.laad('/');
  const tab = page.locator('[role="tab"]', { hasText: 'Prospects' });
  if ((await tab.count()) !== 1) return { fout: `${await tab.count()} tabbladen "Prospects", verwacht 1` };
  const prospects = page.waitForResponse((r) => r.url().includes('/api/prospects'), { timeout: 20_000 }).catch(() => null);
  await tab.click();
  await prospects;
  const toggle = page.locator('[role="tabpanel"]:visible button', { hasText: /^Kaartweergave$/ });
  if ((await toggle.count()) !== 1) return { fout: `${await toggle.count()} kaart/lijst-toggles, verwacht 1` };
  const kaart = page.waitForResponse((r) => r.url().includes('/api/kaart'), { timeout: 20_000 }).catch(() => null);
  await toggle.click();
  const res = await kaart;
  if (!res) return { fout: 'de kaart vroeg /api/kaart niet op' };
  const body = await res.json().catch(() => null);
  await page.locator(KAART).waitFor({ timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(600);
  if ((await page.locator(KAART).count()) !== 1) return { fout: `${await page.locator(KAART).count()} kaarten na het laden, verwacht 1` };
  return { body, toggle };
}

/** Per marker: rol en naam zoals de browser ze in de toegankelijkheidsboom zet. */
async function axKaart(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const zoek = async (selector) => (await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector })).nodeIds;
    const beschrijf = async (nodeId) => (await cdp.send('DOM.describeNode', { nodeId })).node;
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const perBackend = new Map();
    for (const n of nodes) if (n.backendDOMNodeId) perBackend.set(n.backendDOMNodeId, n);
    // Bereikbaar = te vinden door de boom vanaf de wortel af te lopen, zoals een schermlezer dat doet.
    const perId = new Map(nodes.map((n) => [n.nodeId, n]));
    const bereikbaar = new Set();
    const stapel = nodes.filter((n) => !n.parentId).map((n) => n.nodeId);
    while (stapel.length) {
      const id = stapel.pop();
      if (bereikbaar.has(id)) continue;
      bereikbaar.add(id);
      stapel.push(...(perId.get(id)?.childIds ?? []));
    }

    const svgIds = await zoek(KAART);
    let svgRol = null;
    if (svgIds.length === 1) {
      const ax = perBackend.get((await beschrijf(svgIds[0])).backendNodeId);
      svgRol = !ax ? '(niet in de boom)' : ax.ignored ? '(genegeerd)' : ax.role?.value;
    }
    const markers = [];
    for (const id of await zoek(`${KAART} [data-marker]`)) {
      const node = await beschrijf(id);
      const a = node.attributes ?? [];
      const nummer = a[a.indexOf('data-marker') + 1];
      const ax = perBackend.get(node.backendNodeId);
      // Een node die ontbreekt of `ignored` is, bestaat voor een schermlezer niet — ook als hij focus kan krijgen.
      const inBoom = Boolean(ax && !ax.ignored);
      let presentatief = null;
      for (let p = ax?.parentId ? perId.get(ax.parentId) : null; p; p = p.parentId ? perId.get(p.parentId) : null) {
        if (!p.ignored && PRESENTATIEVE_KINDEREN.has(p.role?.value)) { presentatief = p.role.value; break; }
      }
      markers.push({
        nummer, inBoom, presentatief,
        bereikbaar: Boolean(ax && bereikbaar.has(ax.nodeId)),
        rol: inBoom ? ax.role?.value : null,
        naam: inBoom ? String(ax.name?.value ?? '').trim() : '',
      });
    }
    return { svgAantal: svgIds.length, svgRol, markers };
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/** DOM-volgorde van de markers; een cluster draagt zijn aantal als <text>. */
function domMarkers(page) {
  return page.locator(KAART).evaluate((svg) =>
    [...svg.querySelectorAll('[data-marker]')].map((g) => ({
      nummer: g.getAttribute('data-marker'),
      cluster: g.querySelector('text') ? Number(g.querySelector('text').textContent) : null,
    }))
  );
}

/** Tel verschillende pixels tussen twee PNG's (base64), binnen en buiten een regio. Gedecodeerd in de browser. */
function pixelVerschil(page, a, b, regio = null) {
  return page.evaluate(
    async ({ a, b, regio }) => {
      const laad = (b64) => createImageBitmap(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: 'image/png' }));
      const [ia, ib] = await Promise.all([laad(a), laad(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { maat: `${ia.width}×${ia.height} ≠ ${ib.width}×${ib.height}` };
      const lees = (img) => {
        const c = new OffscreenCanvas(img.width, img.height);
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        return x.getImageData(0, 0, img.width, img.height).data;
      };
      const da = lees(ia);
      const db = lees(ib);
      let binnen = 0;
      let buiten = 0;
      for (let y = 0; y < ia.height; y++) {
        for (let x = 0; x < ia.width; x++) {
          const i = (y * ia.width + x) * 4;
          const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
          // Onder 16 van 255 per kanaal is antialiasing-ruis, geen indicator.
          if (d < 16) continue;
          if (regio && x >= regio.x && x < regio.x + regio.w && y >= regio.y && y < regio.y + regio.h) binnen++;
          else buiten++;
        }
      }
      return { binnen, buiten, totaal: binnen + buiten };
    },
    { a, b, regio }
  );
}

export default async function (m) {
  const { page, ok, fail, notes } = m;
  const dbVoor = await m.dbVingerafdruk();
  if (dbVoor.startsWith('onleesbaar')) fail(`kaart: database-vingerafdruk ${dbVoor} — het lek-vangnet werkt niet`);
  // Hoog genoeg dat de hele kaart in beeld staat: elementFromPoint en de screenshots meten wat zichtbaar is.
  await page.setViewportSize({ width: 1280, height: 1400 });

  const kaart = await openKaart(m);
  if (kaart.fout) {
    for (const k of ['c15', 'c16', 'c17', 'c18', 'c19', 'c20']) fail(`${k}: ${kaart.fout} — dit meet niets`);
    await page.setViewportSize({ width: 1280, height: 720 });
    return;
  }
  const { body, toggle } = kaart;
  const punten = new Map((body?.punten ?? []).map((p) => [p.nummer, p]));
  const svg = page.locator(KAART);

  // ── c15: markers als knoppen met naam in de toegankelijkheidsboom ──────────
  const ax = await axKaart(page);
  {
    const n = ax.markers.length;
    const goedeKnop = (x) => x.inBoom && x.bereikbaar && x.rol === 'button' && x.naam && !x.presentatief;
    const slecht = ax.markers.filter((x) => !goedeKnop(x));
    const waarom = (x) => (!x.inBoom ? 'niet in de boom' : !x.bereikbaar ? 'niet bereikbaar vanaf de wortel' : x.presentatief ? `onder een voorouder met rol ${x.presentatief} (presentationele kinderen)` : `${x.rol} "${x.naam}"`);
    if (n === 0) fail('c15: nul markers in svg[data-kaart] — dit meet niets');
    else if (slecht.length) fail(`c15: ${n - slecht.length} van ${n} markers staan als knop met naam in de toegankelijkheidsboom (svg-rol ${ax.svgRol}; bv. ${slecht.slice(0, 2).map((x) => `${x.nummer}: ${waarom(x)}`).join('; ')})`);
    else ok(`c15: ${n} van ${n} markers staan als knop met naam in de toegankelijkheidsboom, bereikbaar vanaf de wortel, zonder voorouder met presentationele kinderen (svg-rol ${ax.svgRol})`);
    notes.push('c15: [NIET TE VERIFIËREN — platformlaag] wat NVDA of VoiceOver van de kaart krijgt, valt buiten CDP; de check toetst de boom van Blink plus de ARIA-regel over presentationele kinderen');
  }

  // ── c17: de naam noemt de status ──────────────────────────────────────────
  // Losse marker: zijn naam tegen de status in /api/kaart. Cluster: de telling tussen haakjes telt op
  // tot zijn aantal. En over de hele kaart: de statussen uit alle namen samen = die uit het antwoord.
  const dom = await domMarkers(page);
  {
    const naamVan = new Map(ax.markers.map((x) => [x.nummer, x.naam]));
    const uitNamen = Object.fromEntries(WOORDEN.map((w) => [w, 0]));
    const uitApi = Object.fromEntries(WOORDEN.map((w) => [w, 0]));
    for (const p of punten.values()) uitApi[STATUS_WOORD[p.status]] = (uitApi[STATUS_WOORD[p.status]] ?? 0) + 1;
    const fouten = [];
    let los = 0;
    let clusters = 0;
    const clusterPatroon = new RegExp(`^(\\d+) bedrijven bij .* \\(((?:\\d+ (?:${WOORDEN.join('|')})(?:, )?)+)\\)(?:, waarvan \\d+ op een KBO-vermoeden)?$`);
    for (const d of dom) {
      const naam = naamVan.get(d.nummer) ?? '';
      if (d.cluster === null) {
        los++;
        const p = punten.get(d.nummer);
        const woord = p ? STATUS_WOORD[p.status] : null;
        if (!woord) fouten.push(`${d.nummer}: niet in /api/kaart`);
        else if (!new RegExp(`, ${woord}(,|$)`).test(naam)) fouten.push(`"${naam}" noemt "${woord}" niet`);
        else uitNamen[woord]++;
      } else {
        clusters++;
        const t = naam.match(clusterPatroon);
        if (!t) { fouten.push(`cluster "${naam}" draagt geen statustelling`); continue; }
        const delen = [...t[2].matchAll(new RegExp(`(\\d+) (${WOORDEN.join('|')})`, 'g'))];
        const som = delen.reduce((s, x) => s + Number(x[1]), 0);
        if (Number(t[1]) !== d.cluster || som !== d.cluster) fouten.push(`cluster van ${d.cluster} heet "${naam}" (telling ${som})`);
        for (const x of delen) uitNamen[x[2]] += Number(x[1]);
      }
    }
    const somNamen = WOORDEN.map((w) => `${w} ${uitNamen[w]}`).join(', ');
    const somApi = WOORDEN.map((w) => `${w} ${uitApi[w]}`).join(', ');
    if (dom.length === 0) fail('c17: nul markers — dit meet niets');
    else if (fouten.length) fail(`c17: ${fouten.length} van ${dom.length} markernamen noemen de status niet — ${fouten.filter((f) => !f.startsWith('cluster')).length} van ${los} los, ${fouten.filter((f) => f.startsWith('cluster')).length} van ${clusters} clusters (${[fouten.find((f) => !f.startsWith('cluster')), fouten.find((f) => f.startsWith('cluster'))].filter(Boolean).join('; ')})`);
    else if (somNamen !== somApi) fail(`c17: de statussen in de markernamen (${somNamen}) ≠ /api/kaart (${somApi})`);
    else ok(`c17: ${dom.length} markernamen noemen de status (${los} los, ${clusters} clusters); samen ${somNamen} = /api/kaart`);
  }

  // ── c16: zichtbare focus, in pixels ────────────────────────────────────────
  // Drie opnames van de kaart: twee zonder focus op een marker (ruis), één na Tab. Het verschil telt
  // alleen binnen het klikdoel van de gefocuste marker (+3 px voor de ring die buiten de bbox valt).
  {
    await toggle.focus();
    const opname = async () => (await svg.screenshot()).toString('base64');
    const voor1 = await opname();
    const voor2 = await opname();
    let bereikt = null;
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press('Tab');
      const nr = await page.evaluate(() => document.activeElement?.getAttribute?.('data-marker') ?? null);
      if (nr) { bereikt = { nr, stops: i + 1 }; break; }
    }
    if (!bereikt) {
      fail('c16: Tab vanaf de kaart/lijst-toggle bereikte in 15 stops geen marker — dit meet niets');
    } else {
      const na = await opname();
      const regio = await page.evaluate((sel) => {
        const s = document.querySelector(sel).getBoundingClientRect();
        const k = document.activeElement.querySelector('[data-klikdoel]')?.getBoundingClientRect();
        if (!k) return null;
        return { x: Math.floor(k.left - s.left) - 3, y: Math.floor(k.top - s.top) - 3, w: Math.ceil(k.width) + 6, h: Math.ceil(k.height) + 6 };
      }, KAART);
      await page.keyboard.press('Shift+Tab');
      const terug = await opname();
      const ruis = await pixelVerschil(page, voor1, voor2);
      const focus = regio ? await pixelVerschil(page, voor1, na, regio) : null;
      const weg = await pixelVerschil(page, voor1, terug);
      if (!regio) fail(`c16: de gefocuste marker ${bereikt.nr} heeft geen [data-klikdoel] — dit meet niets`);
      else if (ruis.maat || focus.maat) fail(`c16: opnames hebben een andere maat (${ruis.maat ?? focus.maat})`);
      else if (ruis.totaal !== 0) fail(`c16: twee opnames zonder focus verschillen al ${ruis.totaal} px — de meting is ruis`);
      else if (focus.binnen < 40) fail(`c16: een marker met toetsenbordfocus verandert ${focus.binnen} px binnen zijn klikdoel (${regio.w}×${regio.h} px), verwacht ≥ 40 — geen zichtbare indicator`);
      else ok(`c16: een marker met toetsenbordfocus verandert ${focus.binnen} px binnen zijn klikdoel (${regio.w}×${regio.h} px) en ${focus.buiten} erbuiten; ruis 0 px; na Shift+Tab ${weg.totaal} px verschil`);
      notes.push(`c16: marker ${bereikt.nr} bereikt na ${bereikt.stops} Tab vanaf de toggle`);
    }
  }

  // ── c18: van de gekozen marker naar het paneel, zonder langs de andere markers ─
  {
    // Een losse lijst-marker (het paneel krijgt dan StatusActies, dus bedienbare elementen), vroeg in de
    // DOM-volgorde: hoe meer markers erna, hoe meer een tab-volgorde zonder roving tabindex zou kosten.
    const i = dom.findIndex((d, idx) => d.cluster === null && punten.get(d.nummer)?.herkomst === 'lijst' && dom.length - idx - 1 >= 2);
    if (i < 0) {
      fail('c18: geen losse lijst-marker met minstens twee markers erna — dit meet niets');
    } else {
      const nr = dom[i].nummer;
      const marker = svg.locator(`[data-marker="${nr}"]`);
      if ((await marker.count()) !== 1) {
        fail(`c18: ${await marker.count()} markers met data-marker="${nr}", verwacht 1`);
      } else {
        await marker.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(400);
        const paneelKnoppen = await page.locator('[data-kaart-paneel] button').count();
        const stops = [];
        for (let k = 0; k < 80; k++) {
          await page.keyboard.press('Tab');
          const s = await page.evaluate(() => {
            const el = document.activeElement;
            return {
              marker: el?.getAttribute?.('data-marker') ?? null,
              paneel: Boolean(el?.closest?.('[data-kaart-paneel]')),
              body: !el || el === document.body,
              wat: el ? `${el.tagName.toLowerCase()}${el.getAttribute('aria-label') ? `(${el.getAttribute('aria-label').slice(0, 30)})` : ''}` : null,
            };
          });
          stops.push(s);
          if (s.paneel || s.body) break;
        }
        const onderweg = stops.filter((s) => s.marker).length;
        const laatste = stops.at(-1);
        if (paneelKnoppen === 0) fail(`c18: na Enter op marker ${nr} staat er geen knop in het paneel — dit meet niets`);
        else if (!laatste?.paneel) fail(`c18: na Enter op marker ${nr} bereikte Tab het paneel niet (${stops.length} stops, laatste ${laatste?.wat}, ${onderweg} markers onderweg)`);
        else if (onderweg > 0) fail(`c18: van de gekozen marker tot het paneel ${stops.length} Tab-stops, waarvan ${onderweg} markers (${dom.length} markers op de kaart)`);
        else ok(`c18: van de gekozen marker tot het paneel ${stops.length} Tab-stop(s), 0 markers onderweg (${dom.length - i - 1} van ${dom.length} markers staan er in DOM-volgorde na; eerste stop ${laatste.wat})`);
      }
    }
  }

  // ── c17 (vervolg): de naam volgt een statuswissel in het paneel ─────────────
  {
    const d = dom.find((x) => x.cluster === null && punten.get(x.nummer)?.herkomst === 'lijst' && punten.get(x.nummer)?.status === 'new');
    if (!d) {
      fail('c17: geen losse lijst-marker op "nieuw" — statuswissel niet te meten, dit meet niets');
    } else {
      await svg.locator(`[data-marker="${d.nummer}"]`).click();
      await page.waitForTimeout(300);
      const bewaar = page.locator('[data-kaart-paneel] button[aria-label^="Bewaar "]');
      if ((await bewaar.count()) !== 1) {
        fail(`c17: ${await bewaar.count()} Bewaar-knoppen in het paneel na het kiezen van ${d.nummer}, verwacht 1`);
      } else if (!(await m.onderschepSchrijven({ status: 200, body: { ok: true, status: 'saved', harness: 'kaart' } }))) {
        fail('c17: onderschepping niet bevestigd — Bewaar niet aangeklikt');
      } else {
        const voor = (await axKaart(page)).markers.find((x) => x.nummer === d.nummer)?.naam ?? '';
        await bewaar.click();
        await page.waitForTimeout(500);
        const na = (await axKaart(page)).markers.find((x) => x.nummer === d.nummer)?.naam ?? '';
        if (/, nieuw(,|$)/.test(na) || !/, bewaard(,|$)/.test(na)) fail(`c17: na Bewaar (onderschept) heet de marker "${na}" (vóór: "${voor}")`);
        else ok(`c17: na Bewaar (onderschept) volgt de markernaam: "${voor}" → "${na}"`);
      }
      await m.stopOnderschepping();
    }
  }

  // ── c20: klikdoel ≥ 24 × 24 px, en niet door een buur overgenomen ──────────
  for (const breedte of [1280, 1024]) {
    await page.setViewportSize({ width: breedte, height: 1400 });
    await page.waitForTimeout(800);
    const r = await svg.evaluate((el) => {
      const uit = [];
      for (const g of el.querySelectorAll('[data-marker]')) {
        const nummer = g.getAttribute('data-marker');
        const doelen = g.querySelectorAll('[data-klikdoel]');
        if (doelen.length !== 1) { uit.push({ nummer, doelen: doelen.length }); continue; }
        g.scrollIntoView({ block: 'center', inline: 'center' });
        const b = doelen[0].getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        const naar = [];
        // Het middelpunt en zestien punten op 11 px: een klik daar hoort bij déze marker te landen.
        const proeven = [[0, 0], ...Array.from({ length: 16 }, (_, k) => [11 * Math.cos((k / 16) * 2 * Math.PI), 11 * Math.sin((k / 16) * 2 * Math.PI)])];
        for (const [dx, dy] of proeven) {
          const raak = document.elementFromPoint(cx + dx, cy + dy);
          if (raak?.closest('[data-marker]') !== g) naar.push(raak?.closest('[data-marker]')?.getAttribute('data-marker') ?? raak?.tagName?.toLowerCase() ?? 'niets');
        }
        // Ontleding: de straal × de schaal van de CTM (double) naast de bbox die de browser rapporteert.
        const ctm = doelen[0].getScreenCTM();
        const bedoeld = 2 * doelen[0].r.baseVal.value * (ctm?.a ?? NaN);
        uit.push({ nummer, doelen: 1, w: b.width, h: b.height, bedoeld, naar });
      }
      return { svgBreedte: el.clientWidth, ctmBreedte: (el.getScreenCTM()?.a ?? NaN) * Number(el.getAttribute('viewBox').split(' ')[2]), uit };
    });
    const n = r.uit.length;
    const klein = r.uit.filter((x) => x.doelen !== 1 || !(x.w >= 24 && x.h >= 24));
    const maten = r.uit.filter((x) => x.doelen === 1);
    const minW = Math.min(...maten.map((x) => x.w));
    const minH = Math.min(...maten.map((x) => x.h));
    if (n === 0) fail(`c20: bij ${breedte} px nul markers — dit meet niets`);
    else if (klein.length) fail(`c20: bij ${breedte} px ${klein.length} van ${n} klikdoelen kleiner dan 24 × 24 px (kleinste ${minW} × ${minH}; bv. ${klein.slice(0, 2).map((x) => (x.doelen !== 1 ? `${x.nummer}: ${x.doelen} klikdoelen` : `${x.nummer}: ${x.w} × ${x.h}`)).join('; ')}; svg ${r.svgBreedte} px)`);
    else ok(`c20: bij ${breedte} px ${n} van ${n} klikdoelen ≥ 24 × 24 px (kleinste ${minW} × ${minH}; svg ${r.svgBreedte} px)`);
    if (maten.length) notes.push(`c20: bij ${breedte} px ontleding — svg clientWidth ${r.svgBreedte} px, breedte volgens de CTM ${r.ctmBreedte} px; straal × CTM-schaal ${Math.min(...maten.map((x) => x.bedoeld))}–${Math.max(...maten.map((x) => x.bedoeld))} px; bbox ${minW}–${Math.max(...maten.map((x) => x.w))} px`);
    const overgenomen = r.uit.filter((x) => x.naar?.length);
    if (n === 0) fail(`c20: bij ${breedte} px geen markers voor de raaktest — dit meet niets`);
    else if (overgenomen.length) fail(`c20: bij ${breedte} px vangen ${overgenomen.length} van ${n} klikdoelen niet elke klik binnen 11 px van hun middelpunt (bv. ${overgenomen.slice(0, 2).map((x) => `${x.nummer} → ${x.naar.slice(0, 2).join(', ')}`).join('; ')})`);
    else ok(`c20: bij ${breedte} px vangt elk van de ${n} klikdoelen een klik op zijn middelpunt en op 11 px in 16 richtingen`);
  }
  await page.setViewportSize({ width: 1280, height: 1400 });
  await page.waitForTimeout(600);

  // ── c19: een kaartfout verdwijnt na een geslaagde lading ───────────────────
  // Twee wegen naar een geslaagde lading: Opnieuw proberen, en een filterwissel. Beide vertrekken van
  // een opgewekte fout (500 op GET /api/kaart, met positieve controle) die daarna weer doorgelaten wordt.
  {
    const foutenVoor = m.consoleErrors.length;
    const PATROON = '**/api/kaart**';
    const forceer = async () => {
      await page.route(PATROON, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: 'harness-kaartfout' }) }));
      const c = await page.evaluate(async () => {
        try { const r = await fetch('/api/kaart?harness=controle'); return { status: r.status, body: await r.text() }; } catch (e) { return { gegooid: String(e) }; }
      });
      return c.status === 500 && String(c.body).includes('harness-kaartfout');
    };
    const kaartToggle = page.locator('[role="tabpanel"]:visible button', { hasText: /^Kaartweergave$/ });
    // Lijst en terug: de kaart mount opnieuw en haalt /api/kaart opnieuw op, nu onderschept.
    const herlaadKaart = async () => {
      await kaartToggle.click();
      await page.waitForTimeout(300);
      await kaartToggle.click();
      await page.locator('[data-kaart-fout] [role="alert"]', { hasText: 'harness-kaartfout' }).waitFor({ timeout: 10_000 }).catch(() => {});
    };
    // Wachten op de uitkomst, niet een vaste pauze: /api/kaart met een filter gaat over de KBO-spiegel
    // en duurt soms langer. Blijft de fout staan (het defect), dan loopt de 10 s af en is de check rood.
    const wachtOpKaart = () =>
      page.waitForFunction((sel) => !document.querySelector('[data-kaart-fout]') && document.querySelectorAll(sel).length === 1, KAART, { timeout: 10_000 })
        .then(() => true).catch(() => false);
    /** Elk /api/kaart-verzoek met tijdstip, status of afbreekreden — het verloop achter een uitkomst. */
    const tijdlijn = () => {
      const t0 = Date.now();
      const regels = [];
      const kort = (u) => u.replace(/^.*\/api\/kaart\??/, '?').slice(0, 40);
      const aan = {
        request: (r) => { if (r.url().includes('/api/kaart')) regels.push(`+${Date.now() - t0}ms vraag ${kort(r.url())}`); },
        response: (r) => { if (r.url().includes('/api/kaart')) regels.push(`+${Date.now() - t0}ms ${r.status()} ${kort(r.url())}`); },
        requestfailed: (r) => { if (r.url().includes('/api/kaart')) regels.push(`+${Date.now() - t0}ms afgebroken (${r.failure()?.errorText}) ${kort(r.url())}`); },
      };
      for (const [e, f] of Object.entries(aan)) page.on(e, f);
      return () => { for (const [e, f] of Object.entries(aan)) page.off(e, f); return regels.join(' · ') || '(geen verzoeken)'; };
    };
    const foutStaat = async () => ({
      blok: await page.locator('[data-kaart-fout]').count(),
      alert: (await page.locator('[data-kaart-fout] [role="alert"]').allInnerTexts()).join(' ').trim(),
      kaart: await page.locator(KAART).count(),
    });

    // Weg 1: Opnieuw proberen, met het toetsenbord.
    if (!(await forceer())) {
      fail('c19: onderschepping van GET /api/kaart (500) niet bevestigd — dit meet niets');
    } else {
      await herlaadKaart();
      const opgewekt = await foutStaat();
      await page.unroute(PATROON);
      if (opgewekt.blok !== 1 || !opgewekt.alert.includes('harness-kaartfout')) {
        fail(`c19: een 500 op /api/kaart gaf geen kaartfout (${JSON.stringify(opgewekt)}) — het vertrekpunt ontbreekt, dit meet niets`);
      } else {
        const knop = page.locator('[data-kaart-fout] button', { hasText: 'Opnieuw proberen' });
        if ((await knop.count()) !== 1) {
          fail(`c19: ${await knop.count()} knoppen "Opnieuw proberen" bij de kaartfout, verwacht 1`);
        } else {
          const antwoord = page.waitForResponse((r) => r.url().includes('/api/kaart') && !r.url().includes('harness=') && r.status() === 200, { timeout: 20_000 }).catch(() => null);
          const stop = tijdlijn();
          await knop.focus();
          await page.keyboard.press('Enter');
          const res = await antwoord;
          await wachtOpKaart();
          const na = await foutStaat();
          notes.push(`c19: verloop Opnieuw proberen: ${stop()}`);
          const focus = await page.evaluate(() => { const el = document.activeElement; return !el || el === document.body ? 'body' : `${el.tagName.toLowerCase()}${el.getAttribute('data-marker') ? `[data-marker=${el.getAttribute('data-marker')}]` : ''}`; });
          if (!res) fail('c19: Opnieuw proberen leverde geen geslaagde lading van /api/kaart — dit meet niets');
          else if (na.blok !== 0 || na.kaart !== 1) fail(`c19: na Opnieuw proberen en een geslaagde lading (HTTP 200) staat de kaartfout er nog ("${na.alert}", ${na.blok} foutblok, ${na.kaart} kaart)`);
          else ok('c19: de kaartfout verdwijnt na Opnieuw proberen en een geslaagde lading (HTTP 200): 0 foutblokken, kaart terug');
          notes.push(`c19: focus na Opnieuw proberen met Enter: ${focus}`);
        }
      }
    }

    // Weg 2: een filterwissel die slaagt.
    if (!(await forceer())) {
      fail('c19: onderschepping van GET /api/kaart (500) voor de filterwissel niet bevestigd — dit meet niets');
    } else {
      await herlaadKaart();
      const opgewekt = await foutStaat();
      await page.unroute(PATROON);
      const bron = page.locator('[role="tabpanel"]:visible [role="radiogroup"]');
      if (opgewekt.blok !== 1 || !opgewekt.alert.includes('harness-kaartfout')) {
        fail(`c19: tweede 500 op /api/kaart gaf geen kaartfout (${JSON.stringify(opgewekt)}) — dit meet niets`);
      } else if ((await bron.count()) !== 1) {
        fail(`c19: ${await bron.count()} bronfilters, verwacht 1 — filterwissel niet te meten`);
      } else {
        const antwoord = page.waitForResponse((r) => r.url().includes('/api/kaart') && r.url().includes('herkomst=csv'), { timeout: 20_000 }).catch(() => null);
        const stop = tijdlijn();
        await bron.locator('[role="radio"]', { hasText: 'Lijst' }).click();
        const res = await antwoord;
        await wachtOpKaart();
        const na = await foutStaat();
        notes.push(`c19: verloop filterwissel: ${stop()}`);
        if (!res || res.status() !== 200) fail(`c19: de filterwissel gaf ${res ? `HTTP ${res.status()}` : 'geen verzoek'} op /api/kaart — dit meet niets`);
        else if (na.blok !== 0 || na.kaart !== 1) fail(`c19: na een filterwissel met een geslaagde lading (HTTP 200) staat de kaartfout er nog ("${na.alert}", ${na.blok} foutblok, ${na.kaart} kaart)`);
        else ok('c19: de kaartfout verdwijnt na een filterwissel met een geslaagde lading (HTTP 200)');
        const terug = page.waitForResponse((r) => r.url().includes('/api/kaart'), { timeout: 20_000 }).catch(() => null);
        await bron.locator('[role="radio"]', { hasText: 'Beide' }).click();
        await terug;
      }
    }
    await page.unroute(PATROON).catch(() => {});

    // Alleen de geforceerde 500's uit de console; alles anders blijft staan.
    const inVenster = m.consoleErrors.splice(foutenVoor);
    const geforceerd = inVenster.filter((t) => /status of 500/.test(t));
    m.consoleErrors.push(...inVenster.filter((t) => !/status of 500/.test(t)));
    notes.push(`c19: ${geforceerd.length} geforceerde 500-melding(en) uit de console gefilterd, ${inVenster.length - geforceerd.length} andere behouden`);
  }

  await page.setViewportSize({ width: 1280, height: 720 });
  const dbNa = await m.dbVingerafdruk();
  if (dbNa !== dbVoor) fail(`kaart: de database veranderde (${dbVoor} → ${dbNa}) — een onderschepping lekte`);
  else ok(`kaart: de database is ongemoeid (vingerafdruk ${dbNa}, vóór én na)`);
}
