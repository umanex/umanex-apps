/**
 * Fase 3 — het dashboard (`/`): lijst na een sync, filtertelling, lege toestanden, prospects-fout,
 * kaart/lijst-toggle, paginering, scoreopbouw en de namen van de kaartlinks.
 * Items c01, c05–c12 van `briefings/2026-09-17-feature-a11y-fouten.tcebc.md`.
 *
 * Draait op de echte database. Deze module klikt nergens op iets dat schrijft behalve Sync nu, en
 * die klik gebeurt op een KOPIE van de database, op een tweede server uit dezelfde build, ná een
 * geslaagde onderschepping. De vingerafdruk van de echte database wordt vóór de eerste en na de
 * laatste klik genomen. Een prospects-fout wordt opgewekt door een GET te onderscheppen (lezen is
 * veilig); de geforceerde 500's worden uit de console gehaald en geteld.
 *
 * Elke check leest gedrag: focus (`document.activeElement`), berekende stijl, namen uit de
 * toegankelijkheidsboom van Chromium (CDP), tekst in de live-regio en de URL. Een check die niets
 * vindt om te meten, faalt.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const POORT = 3106;

const exact = (tekst) => new RegExp(`^${tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
const wacht = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * De naam en rol zoals Chromium ze berekent, per element van een locator (in dezelfde volgorde).
 * Via een tijdelijk attribuut, zodat CDP precies deze elementen vindt; een data-attribuut verandert
 * geen naam.
 */
async function axNamen(page, locator) {
  const n = await locator.evaluateAll((els) => {
    els.forEach((e, i) => e.setAttribute('data-harness-ax', String(i)));
    return els.length;
  });
  const cdp = await page.context().newCDPSession(page);
  try {
    const uit = new Array(n).fill(null);
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    const { nodeIds } = await cdp.send('DOM.querySelectorAll', { nodeId: root.nodeId, selector: '[data-harness-ax]' });
    for (const nodeId of nodeIds) {
      const { attributes } = await cdp.send('DOM.getAttributes', { nodeId });
      const i = Number(attributes[attributes.indexOf('data-harness-ax') + 1]);
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      const eigen = nodes.find((x) => !x.ignored) ?? nodes[0];
      uit[i] = { rol: eigen?.role?.value ?? null, naam: String(eigen?.name?.value ?? '').trim(), genegeerd: Boolean(eigen?.ignored) };
    }
    return uit;
  } finally {
    await page.evaluate(() => document.querySelectorAll('[data-harness-ax]').forEach((e) => e.removeAttribute('data-harness-ax'))).catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

/**
 * Staat er een ring die je ZIET? Een stringvergelijking volstaat hier niet: `focus:ring-0` en
 * `focus:outline-none` veranderen de berekende waarden (schaduwen van 0 px, een transparante outline
 * van 2 px) zonder dat er iets te zien is. Zichtbaar = een outline met stijl, breedte en dekking, of
 * een schaduw met dekking en een uitloop, vervaging of verschuiving groter dan nul.
 */
const ring = (loc) =>
  loc.evaluate((el) => {
    const s = getComputedStyle(el);
    const dekking = (kleur) => {
      if (!kleur || kleur === 'transparent') return 0;
      const m = kleur.match(/rgba?\(([^)]+)\)/);
      if (!m) return 1;
      const delen = m[1].split(/[\s,/]+/).filter(Boolean);
      return delen.length > 3 ? Number(delen[3]) : 1;
    };
    const outline = s.outlineStyle !== 'none' && s.outlineStyle !== 'hidden' && parseFloat(s.outlineWidth) > 0 && dekking(s.outlineColor) > 0;
    const schaduwen = s.boxShadow === 'none' ? [] : s.boxShadow.split(/,(?![^(]*\))/).map((x) => x.trim());
    const zichtbaar = schaduwen.filter((sh) => {
      const kleur = sh.match(/rgba?\([^)]*\)/)?.[0];
      const maten = (sh.replace(/rgba?\([^)]*\)/, '').match(/-?[\d.]+px/g) ?? []).map(parseFloat);
      return dekking(kleur) > 0 && maten.some((x) => x !== 0);
    });
    return { zichtbaar: outline || zichtbaar.length > 0, waarde: `outline ${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}; shadow ${s.boxShadow}` };
  });

/**
 * De achtergrond die je ZIET: de eigen kleur samengesteld over die van de voorouders tot een
 * dekkende laag. Geeft ook de ruwe waarden terug, zodat een melding aanwijst wat er gemeten werd.
 */
const zichtbareAchtergrond = (loc) =>
  loc.evaluate((el) => {
    const lees = (s) => {
      let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
      if (!m) m = s.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
      if (!m) return null;
      const schaal = s.startsWith('color(') ? 255 : 1;
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
      return { r: Number(m[1]) * schaal, g: Number(m[2]) * schaal, b: Number(m[3]) * schaal, a };
    };
    const lagen = [];
    let onleesbaar = null;
    for (let n = el; n; n = n.parentElement) {
      const ruw = getComputedStyle(n).backgroundColor;
      const k = lees(ruw);
      if (!k) { onleesbaar = ruw; break; }
      if (k.a > 0) lagen.push(k);
      if (k.a >= 1) break;
    }
    if (onleesbaar) return { onleesbaar };
    const dekkend = lagen.length && lagen[lagen.length - 1].a >= 1;
    let c = dekkend ? lagen.pop() : { r: 255, g: 255, b: 255, a: 1 };
    while (lagen.length) {
      const l = lagen.pop();
      c = { r: l.r * l.a + c.r * (1 - l.a), g: l.g * l.a + c.g * (1 - l.a), b: l.b * l.a + c.b * (1 - l.a), a: 1 };
    }
    return { r: c.r, g: c.g, b: c.b, eigen: getComputedStyle(el).backgroundColor, dekkend: Boolean(dekkend) };
  });

/** WCAG 2.x relatieve luminantie en contrastverhouding. */
function contrast(a, b) {
  const kanaal = (v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const L = (k) => 0.2126 * kanaal(k.r) + 0.7152 * kanaal(k.g) + 0.0722 * kanaal(k.b);
  const [hoog, laag] = [L(a), L(b)].sort((x, y) => y - x);
  return (hoog + 0.05) / (laag + 0.05);
}
const rgb = (k) => `rgb(${Math.round(k.r)},${Math.round(k.g)},${Math.round(k.b)})`;

export default async function (m) {
  const { page, BASE, APP, ok, fail, notes, consoleErrors, laad } = m;
  const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
  const sql = (q, db = DB) => execFileSync('sqlite3', ['-readonly', db, q]).toString().trim();
  const paneel = () => page.locator('[role="tabpanel"]:visible');
  const kaarten = (soort) => paneel().locator(`.grid > [data-item^="${soort}-"]`);

  const vingerVoor = await m.dbVingerafdruk();
  if (vingerVoor.startsWith('onleesbaar')) {
    fail(`dashboard: de database is niet te lezen (${vingerVoor}) — niets gemeten`);
    return;
  }
  const aantalJobs = Number(sql('SELECT count(*) FROM jobs;'));
  const aantalLeads = Number(sql('SELECT count(*) FROM companies;'));
  if (aantalJobs === 0 || aantalLeads === 0) {
    // Een verse tree: de assen hieronder meten op kaarten. Melden als leemte, niet stil groen.
    notes.push(`dashboard: [NIET TE VERIFIËREN — ${aantalJobs} vacatures en ${aantalLeads} leads in de database] c05–c12 vragen kaarten`);
  }

  // ── c05: een filterwissel zet het nieuwe aantal in de live-regio (Vacatures en Leads) ─────────
  for (const [pad, soort, meervoud] of [['/', 'job', ['vacature', 'vacatures']], ['/?tab=leads', 'lead', ['lead', 'leads']]]) {
    await laad(pad);
    const regio = page.locator('[data-filter-telling]');
    const bru = page.getByRole('checkbox', { name: 'Brussel' });
    if ((await regio.count()) !== 1 || (await bru.count()) !== 1) {
      fail(`c05: ${await regio.count()} filtertelling(en) en ${await bru.count()} Brussel-checkbox(en) op ${pad}, verwacht 1 en 1 — dit meet niets`);
      continue;
    }
    const live = await regio.getAttribute('aria-live');
    const bijLaden = (await regio.textContent()).trim();
    const voorKaarten = await kaarten(soort).count();
    await bru.click();
    await page.waitForFunction(() => (document.querySelector('[data-filter-telling]')?.textContent ?? '').trim() !== '', null, { timeout: 3_000 }).catch(() => {});
    const tekst = (await regio.textContent()).trim();
    const n = await kaarten(soort).count();
    const woord = (x) => (x === 1 ? meervoud[0] : meervoud[1]);
    let verwacht;
    if (soort === 'job') {
      const laag = await paneel().locator('[data-lage-score] [data-item^="job-"]').count();
      verwacht = `${n} ${woord(n)} vanaf score 10, ${laag} lager`;
    } else {
      verwacht = `${n} ${woord(n)}`;
    }
    const tab = soort === 'job' ? 'Vacatures' : 'Leads';
    if (live !== 'polite' && live !== 'assertive') fail(`c05: de filtertelling draagt aria-live="${live}", geen live-regio`);
    else if (n === voorKaarten) fail(`c05: Brussel uitvinken veranderde het aantal ${tab.toLowerCase()} niet (${n}) — dit meet niets`);
    else if (tekst !== verwacht) fail(`c05: na Brussel uitvinken op ${tab} staat "${tekst}" in de live-regio, verwacht "${verwacht}" (vóór de wissel ${voorKaarten} kaarten)`);
    else ok(`c05: filterwissel op ${tab} → live-regio "${tekst}" (${voorKaarten} → ${n} kaarten; bij laden "${bijLaden}")`);
  }

  // ── c05b: terug naar een tabblad kondigt geen oude telling opnieuw aan ─────────────────────────
  {
    await laad('/');
    const regio = page.locator('[data-filter-telling]');
    await page.getByRole('checkbox', { name: 'Brussel' }).click();
    await page.waitForFunction(() => (document.querySelector('[data-filter-telling]')?.textContent ?? '').trim() !== '', null, { timeout: 3_000 }).catch(() => {});
    const oud = (await regio.count()) === 1 ? (await regio.textContent()).trim() : '';
    if (!oud) {
      fail('c05b: na een filterwissel kwam er geen telling in de live-regio — dit meet niets');
    } else {
      await page.waitForTimeout(200);
      await regio.evaluate((el) => {
        window.__tellingLog = [];
        new MutationObserver(() => window.__tellingLog.push(el.textContent.trim())).observe(el, { childList: true, characterData: true, subtree: true });
      });
      const leads = page.getByRole('tab', { name: /^Leads/ });
      const vacatures = page.getByRole('tab', { name: /^Vacatures/ });
      await leads.click();
      await page.waitForTimeout(900);
      const opLeads = await leads.getAttribute('aria-selected');
      await vacatures.click();
      await page.waitForTimeout(900);
      const terug = await vacatures.getAttribute('aria-selected');
      const log = await page.evaluate(() => window.__tellingLog);
      const aangekondigd = log.filter(Boolean);
      if (opLeads !== 'true' || terug !== 'true') fail(`c05b: de tabwissel lukte niet (Leads ${opLeads}, terug op Vacatures ${terug}) — dit meet niets`);
      else if (aangekondigd.length) fail(`c05b: na Vacatures → Leads → Vacatures schreef de live-regio ${aangekondigd.length}× tekst: ${JSON.stringify(aangekondigd)} (oude telling "${oud}")`);
      else ok(`c05b: na Vacatures → Leads → Vacatures schrijft de live-regio niets (${log.length} mutatie(s), alle leeg; oude telling "${oud}")`);
    }
  }

  // ── c06a / c06b: leeg door filters noemt de filters, niet "Sync nu" ────────────────────────────
  for (const [sleutel, pad, soort, tabel] of [['c06a', '/?score=100', 'job', 'vacatures'], ['c06b', '/?tab=leads&score=100', 'lead', 'leads']]) {
    const inDb = soort === 'job' ? aantalJobs : aantalLeads;
    await laad(pad);
    const items = await paneel().locator('[data-item]').count();
    const tekst = (await paneel().innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
    if (inDb === 0) fail(`${sleutel}: nul ${tabel} in de database — "leeg door filters" is niet op te wekken, dit meet niets`);
    else if (items !== 0) fail(`${sleutel}: ${pad} toont nog ${items} ${tabel} — de lege toestand is niet opgewekt, dit meet niets`);
    else if (/Sync nu/.test(tekst) || !/binnen je huidige filters/.test(tekst)) fail(`${sleutel}: ${tabel} leeg door minimumscore 100 (${inDb} in de database) toont "${tekst.slice(0, 140)}"`);
    else ok(`${sleutel}: ${tabel} leeg door minimumscore 100 (${inDb} in de database) noemt de filters: "${tekst.slice(0, 90)}"`);
  }

  // ── c10a–c10c: de scoreopbouw met het toetsenbord, op een vacature- en een leadkaart ──────────
  for (const [soort, pad, soortNaam, tabel, kolom] of [['job', '/', 'Score', 'jobs', 'score'], ['lead', '/?tab=leads', 'Leadscore', 'companies', 'lead_score']]) {
    await laad(pad);
    const kaart = kaarten(soort).first();
    if (!(await kaart.count())) {
      fail(`c10a: geen ${soort}kaart op ${pad} — dit meet niets`);
      fail(`c10c: geen ${soort}kaart op ${pad} — dit meet niets`);
      continue;
    }
    const id = Number((await kaart.getAttribute('data-item')).split('-')[1]);
    const [score, opbouwRuw] = sql(`SELECT ${kolom} || char(9) || score_breakdown FROM ${tabel} WHERE id = ${id};`).split('\t');
    const opbouw = Object.entries(JSON.parse(opbouwRuw || '{}'));
    const trigger = kaart.locator('[data-score-opbouw]');
    const aantal = await trigger.count();
    // De pil herkennen aan wat hij toont — het getal uit de database — niet alleen aan zijn attribuut.
    const getoond = aantal === 1 ? (await trigger.textContent()).trim() : null;
    if (aantal !== 1 || getoond !== score || opbouw.length === 0) {
      fail(`c10a: ${soort}kaart ${id}: ${aantal} opbouw-trigger(s), toont "${getoond}", database-score ${score}, ${opbouw.length} onderdelen — dit meet niets`);
      fail(`c10c: ${soort}kaart ${id}: geen trigger om Enter op te drukken — dit meet niets`);
      continue;
    }
    // Het tabpaneel (Radix: tabIndex 0) en dan Tab: de eerste stop in de eerste kaart hoort de pil te zijn.
    // Twee pogingen, want de eerste Tab kan vóór de hydratie vallen: dan krijgt de pil wél de focus maar
    // handelt React het focus-event niet af en blijft de tooltip dicht (gemeten 2026-09-17: run 1 open,
    // run 2 dicht, zelfde build). Het aantal pogingen staat in de uitvoer — blijft hij dicht, dan is het rood.
    await paneel().focus();
    await page.keyboard.press('Tab');
    const gefocust = await trigger.evaluate((el) => el === document.activeElement);
    const waar = await page.evaluate(() => {
      const a = document.activeElement;
      return a ? `<${a.tagName.toLowerCase()}> "${(a.getAttribute('aria-label') ?? a.textContent ?? '').trim().slice(0, 40)}"` : '(niets)';
    });
    const leesOpen = () =>
      trigger.evaluate((el) => {
        const id = el.getAttribute('aria-describedby');
        const tip = id ? document.getElementById(id) : null;
        const wraps = [...document.querySelectorAll('[data-radix-popper-content-wrapper]')];
        const zichtbaar = wraps.filter((w) => { const r = w.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
        return { state: el.getAttribute('data-state'), tip: tip ? tip.textContent.replace(/\s+/g, ' ') : null, zichtbaar: zichtbaar.length, beeld: zichtbaar[0]?.innerText.replace(/\s+/g, ' ') ?? '' };
      });
    const bevat = (tekst) => opbouw.every(([k, v]) => tekst.includes(k) && tekst.includes(`+${v}`));
    let open = await leesOpen();
    let pogingen = 1;
    for (let ronde = 0; ronde < 2; ronde++) {
      for (let i = 0; i < 15 && !(open.state !== 'closed' && open.tip && bevat(open.tip)); i++) {
        await page.waitForTimeout(100);
        open = await leesOpen();
      }
      if (open.state !== 'closed' && open.tip && bevat(open.tip)) break;
      if (ronde === 0 && gefocust) {
        pogingen = 2;
        await trigger.evaluate((el) => el.blur());
        await paneel().focus();
        await page.keyboard.press('Tab');
        open = await leesOpen();
      }
    }
    const isOpen = (o) => o.state !== 'closed' && o.tip !== null && bevat(o.tip) && o.zichtbaar === 1 && bevat(o.beeld);
    if (!gefocust) fail(`c10a: Tab vanaf het tabpaneel landt niet op de scorepil van ${soort}kaart ${id} maar op ${waar}`);
    else if (!isOpen(open)) fail(`c10a: de scorepil van ${soort}kaart ${id} heeft de toetsenbordfocus, maar de opbouw is niet open (${JSON.stringify(open)})`);
    else ok(`c10a: ${soort}kaart ${id}: Tab zet de focus op de scorepil en de opbouw staat open ("${open.beeld.slice(0, 60)}", ${opbouw.length} onderdelen uit de database, ${pogingen} poging(en))`);

    if (!gefocust || !isOpen(open)) {
      fail(`c10c: ${soort}kaart ${id}: de opbouw stond niet open met de toetsenbordfocus — Enter niet te meten, dit meet niets`);
    } else {
      await page.keyboard.press('Enter');
      await page.waitForTimeout(400);
      const na = await leesOpen();
      const nogFocus = await trigger.evaluate((el) => el === document.activeElement);
      if (!nogFocus || !isOpen(na)) fail(`c10c: na Enter op de scorepil van ${soort}kaart ${id}: focus ${nogFocus ? 'blijft' : 'weg'}, opbouw ${JSON.stringify(na)}`);
      else ok(`c10c: Enter op de scorepil van ${soort}kaart ${id} laat de opbouw open (data-state "${na.state}")`);
    }
  }

  // ── c10b: de naam van de trigger noemt de score (alle kaarten, met noemer) ────────────────────
  for (const [soort, pad, soortNaam] of [['job', '/', 'Score'], ['lead', '/?tab=leads', 'Leadscore']]) {
    await laad(pad);
    const n = await kaarten(soort).count();
    const triggers = kaarten(soort).locator('[data-score-opbouw]');
    const t = await triggers.count();
    // Noemer uit de database: elke getoonde kaart met een niet-lege opbouw hoort een trigger te dragen.
    const ids = (await kaarten(soort).evaluateAll((els) => els.map((e) => Number(e.getAttribute('data-item').split('-')[1])))).filter(Number.isInteger);
    const verwacht = ids.length ? Number(sql(`SELECT count(*) FROM ${soort === 'job' ? 'jobs' : 'companies'} WHERE id IN (${ids.join(',')}) AND score_breakdown NOT IN ('{}', '');`)) : 0;
    const getoond = await triggers.evaluateAll((els) => els.map((e) => e.textContent.trim()));
    const namen = await axNamen(page, triggers);
    const fout = namen
      .map((x, i) => ({ ...x, getoond: getoond[i] }))
      .filter((x) => x.rol !== 'button' || x.naam !== `${soortNaam} ${x.getoond}, opbouw tonen`);
    if (n === 0 || t === 0) fail(`c10b: ${t} opbouw-triggers op ${n} ${soort}kaarten — dit meet niets`);
    else if (t !== verwacht) fail(`c10b: ${t} opbouw-triggers op ${n} ${soort}kaarten, maar ${verwacht} kaarten hebben een opbouw in de database`);
    else if (fout.length) fail(`c10b: ${fout.length} van ${t} triggers op ${soort}kaarten hebben een naam zonder de score (${fout.slice(0, 3).map((x) => `${x.rol} "${x.naam}" bij getoond ${x.getoond}`).join('; ')})`);
    else ok(`c10b: ${t} van ${t} opbouw-triggers (${n} ${soort}kaarten, ${verwacht} met een opbouw in de database) heten "${soortNaam} <score>, opbouw tonen" (bv. "${namen[0].naam}")`);
  }

  // ── c10d: een muisklik op de trigger tekent geen focusring ───────────────────────────────────
  {
    await laad('/');
    const trigger = kaarten('job').first().locator('[data-score-opbouw]');
    if ((await trigger.count()) !== 1) {
      fail('c10d: geen scorepil op de eerste vacaturekaart — dit meet niets');
    } else {
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await page.waitForTimeout(250);
      const rust = await ring(trigger);
      const vak = await trigger.boundingBox();
      await page.mouse.click(vak.x + vak.width / 2, vak.y + vak.height / 2);
      await page.waitForTimeout(250);
      const naKlik = { focus: await trigger.evaluate((el) => el === document.activeElement), ring: await ring(trigger) };
      // Positieve controle: met het toetsenbord hoort er wél een ring te staan, anders ziet deze
      // meting geen ring, ook niet als hij er is.
      await page.mouse.move(0, 0);
      await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
      await paneel().focus();
      await page.keyboard.press('Tab');
      await page.waitForTimeout(250);
      const toetsenbord = { focus: await trigger.evaluate((el) => el === document.activeElement), ring: await ring(trigger) };
      if (rust.zichtbaar) fail(`c10d: de scorepil draagt al een ring zonder focus (${rust.waarde}) — dit meet niets`);
      else if (!naKlik.focus) fail('c10d: de muisklik gaf de scorepil geen focus — dit meet niets');
      else if (!toetsenbord.focus || !toetsenbord.ring.zichtbaar) fail(`c10d: ook met de toetsenbordfocus geen zichtbare ring op de scorepil (focus ${toetsenbord.focus}; ${toetsenbord.ring.waarde}) — dit meet niets`);
      else if (naKlik.ring.zichtbaar) fail(`c10d: na een muisklik tekent de scorepil een focusring (${naKlik.ring.waarde})`);
      else ok(`c10d: muisklik → focus zonder zichtbare ring; toetsenbordfocus → ring (${toetsenbord.ring.waarde.slice(0, 90)})`);
    }
  }

  // ── c11a / c11b: de Bekijk-links op vacaturekaarten ────────────────────────────────────────────
  {
    await laad('/');
    const n = await kaarten('job').count();
    // Herkend aan wat hij is: de link naar buiten (target _blank) met het zichtbare woord Bekijk.
    const links = kaarten('job').locator('a[target="_blank"]').filter({ hasText: /^\s*Bekijk\s*$/ });
    const l = await links.count();
    const namen = (await axNamen(page, links)).map((x) => x.naam);
    const uniek = new Set(namen).size;
    const dubbel = [...new Set(namen.filter((x, i) => namen.indexOf(x) !== i))];
    if (n === 0 || l !== n) fail(`c11a: ${l} Bekijk-links op ${n} vacaturekaarten, verwacht er één per kaart — dit meet niets`);
    else if (uniek !== l) fail(`c11a: ${uniek} unieke namen op ${l} Bekijk-links (dubbel: ${dubbel.slice(0, 3).map((x) => `"${x}"`).join(', ')})`);
    else ok(`c11a: ${l} Bekijk-links op ${n} vacaturekaarten, ${uniek} unieke namen (bv. "${namen[0]}")`);
    const zonder = namen.filter((x) => !/nieuw tabblad/i.test(x));
    if (l === 0) fail('c11b: nul Bekijk-links — dit meet niets');
    else if (zonder.length) fail(`c11b: ${zonder.length} van ${l} Bekijk-links melden het nieuwe tabblad niet (bv. "${zonder[0]}")`);
    else ok(`c11b: ${l} van ${l} Bekijk-links melden het nieuwe tabblad in hun naam`);
  }

  // ── c12: de doorklikknop op leadkaarten ────────────────────────────────────────────────────────
  {
    await laad('/?tab=leads');
    const n = await kaarten('lead').count();
    const knoppen = kaarten('lead').locator('button').filter({ hasText: exact('toon deze vacatures') });
    const l = await knoppen.count();
    const namen = (await axNamen(page, knoppen)).map((x) => x.naam);
    const uniek = new Set(namen).size;
    const dubbel = [...new Set(namen.filter((x, i) => namen.indexOf(x) !== i))];
    if (n === 0 || l !== n) fail(`c12: ${l} doorklikknoppen op ${n} leadkaarten, verwacht er één per kaart — dit meet niets`);
    else if (uniek !== l) fail(`c12: ${uniek} unieke namen op ${l} doorklikknoppen (dubbel: ${dubbel.slice(0, 3).map((x) => `"${x}"`).join(', ')})`);
    else ok(`c12: ${l} doorklikknoppen op ${n} leadkaarten, ${uniek} unieke namen (bv. "${namen[0]}")`);
  }

  // ── c07a / c07b: een mislukte eerste prospects-lading ─────────────────────────────────────────
  // GET onderscheppen is veilig (lezen). De 500's komen in de console en worden er straks uitgehaald.
  const foutenVoor = consoleErrors.length;
  let prospectsGeladen = false;
  {
    await laad('/');
    const FOUT = 'harness: prospects geforceerd 500';
    const patroon = `${BASE}/api/prospects**`;
    await page.route(patroon, (route) =>
      route.request().method() === 'GET'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ ok: false, error: FOUT }) })
        : route.fallback()
    );
    const controle = await page.evaluate(async () => {
      const r = await fetch('/api/prospects?pagina=1');
      return { status: r.status, body: await r.text() };
    });
    if (controle.status !== 500 || !controle.body.includes('geforceerd')) {
      fail(`c07a: onderschepping van /api/prospects niet bevestigd (${JSON.stringify(controle)}) — dit meet niets`);
      fail('c07b: onderschepping niet bevestigd — dit meet niets');
      await page.unroute(patroon);
    } else {
      const antwoord = page.waitForResponse((r) => r.url().includes('/api/prospects') && r.status() === 500, { timeout: 10_000 }).catch(() => null);
      await page.getByRole('tab', { name: /^Prospects/ }).click();
      const res = await antwoord;
      await page.waitForTimeout(1_500);
      const teller = paneel().locator('[data-prospects-teller]');
      const lees = async () => ({
        teller: (await teller.count()) === 1 ? (await teller.innerText()).trim() : `(${await teller.count()} tellers)`,
        pil: (await page.getByRole('tab', { name: /^Prospects/ }).innerText()).replace(/\s+/g, ' ').trim(),
        bezig: /Bezig/.test(await paneel().innerText()),
        alert: await paneel().locator('[role="alert"]').filter({ hasText: FOUT }).count(),
      });
      const eerst = await lees();
      await page.waitForTimeout(2_000);
      const later = await lees();
      if (!res) fail('c07a: de klik op Prospects vroeg /api/prospects niet op — dit meet niets');
      else if (eerst.alert !== 1) fail(`c07a: na een 500 staat de fout niet als alert in het paneel (${eerst.alert}) — dit meet niets`);
      else if (eerst.bezig || later.bezig || /Bezig/.test(eerst.pil + later.pil)) fail(`c07a: na een mislukte eerste lading staat er "Bezig…" (teller "${later.teller}", tab "${later.pil}", na 1,5 s ${eerst.bezig} en na 3,5 s ${later.bezig})`);
      else ok(`c07a: na een mislukte eerste lading geen "Bezig…" — teller "${later.teller}", tab "${later.pil}", alert met de fout (gemeten na 1,5 en 3,5 s)`);

      const opnieuw = paneel().getByRole('button', { name: 'Opnieuw proberen', exact: true });
      if ((await opnieuw.count()) !== 1) {
        fail(`c07b: ${await opnieuw.count()} knoppen "Opnieuw proberen" na een mislukte lading, verwacht 1`);
        await page.unroute(patroon);
      } else {
        // Tweede poging doorlaten: de onderschepping weg, dan Enter op de knop.
        await page.unroute(patroon);
        const tweede = page.waitForResponse((r) => r.url().includes('/api/prospects') && r.status() === 200, { timeout: 20_000 }).catch(() => null);
        await opnieuw.focus();
        await page.keyboard.press('Enter');
        const res2 = await tweede;
        await page.waitForTimeout(800);
        const na = {
          alert: await paneel().locator('[role="alert"]').filter({ hasText: FOUT }).count(),
          teller: (await teller.count()) === 1 ? (await teller.innerText()).trim() : '',
          kaarten: await paneel().locator('h3').count(),
          focusBody: await page.evaluate(() => document.activeElement === document.body || document.activeElement === null),
        };
        if (!res2) fail('c07b: Opnieuw proberen (Enter) haalde /api/prospects niet opnieuw op');
        else if (na.alert !== 0 || !/^\d+ prospects?$/.test(na.teller) || na.kaarten === 0) fail(`c07b: na een geslaagde tweede poging ${JSON.stringify(na)}`);
        else if (na.focusBody) fail('c07b: na Opnieuw proberen staat de focus op body');
        else {
          prospectsGeladen = true;
          ok(`c07b: "Opnieuw proberen" met Enter laadt opnieuw — fout weg, teller "${na.teller}", ${na.kaarten} kaarten, focus niet op body`);
        }
      }
    }
  }

  // ── c09: na Volgende met het toetsenbord staat de focus niet op body ───────────────────────────
  if (!prospectsGeladen) {
    fail('c09: de prospects zijn niet geladen (zie c07b) — paginering niet gemeten, dit meet niets');
  } else {
    const volgende = paneel().getByRole('button', { name: 'Volgende', exact: true });
    const stand = paneel().locator('span', { hasText: /^pagina \d+ van \d+$/ });
    if ((await volgende.count()) !== 1 || (await stand.count()) !== 1) {
      fail(`c09: ${await volgende.count()} Volgende-knop(pen) en ${await stand.count()} paginastand(en) — geen paginering, dit meet niets`);
    } else {
      const voor = (await stand.innerText()).trim();
      // De lading vertragen (lezen, dus veilig): zo duurt de toestand waarin de knop onbruikbaar is lang
      // genoeg om de focus kwijt te raken als hij disabled wordt.
      const patroon = `${BASE}/api/prospects**`;
      await page.route(patroon, async (route) => { await wacht(900); return route.fallback(); });
      const antwoord = page.waitForResponse((r) => r.url().includes('/api/prospects') && r.url().includes('pagina=2'), { timeout: 20_000 }).catch(() => null);
      await volgende.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const tijdens = await page.evaluate(() => document.activeElement === document.body || document.activeElement === null);
      const res = await antwoord;
      await page.waitForTimeout(600);
      await page.unroute(patroon);
      const na = (await stand.count()) === 1 ? (await stand.innerText()).trim() : '';
      const focus = await page.evaluate(() => {
        const a = document.activeElement;
        return { body: a === document.body || a === null, wat: a ? `<${a.tagName.toLowerCase()}> "${(a.textContent ?? '').trim().slice(0, 30)}"` : '(niets)' };
      });
      if (!res || !/^pagina 2 van/.test(na)) fail(`c09: Enter op Volgende bladerde niet ("${voor}" → "${na}") — dit meet niets`);
      else if (focus.body || tijdens) fail(`c09: na Volgende met het toetsenbord staat de focus op body (tijdens de lading ${tijdens}, erna ${focus.body})`);
      else ok(`c09: Enter op Volgende ("${voor}" → "${na}"): focus tijdens en na de lading op ${focus.wat}`);
    }
  }

  // ── c08 / c08b / c08c: de kaart/lijst-toggle ───────────────────────────────────────────────────
  if (!prospectsGeladen) {
    for (const k of ['c08', 'c08b', 'c08c']) fail(`${k}: de prospects zijn niet geladen (zie c07b) — dit meet niets`);
  } else {
    // Herkend aan zijn plek (naast de sortering) en aan wat hij is (een toggle), niet aan zijn naam: de
    // naam is juist wat gemeten wordt.
    // Anker op wat de knop zelf draagt, niet op zijn buur: sinds de sortering uit @umanex/ui komt,
    // zit die in een omhulling en is de `~`-relatie weg (fase 4b, 2026-09-17).
    const knop = paneel().locator('button[data-weergave][aria-pressed]');
    if ((await knop.count()) !== 1) {
      for (const k of ['c08', 'c08b', 'c08c']) fail(`${k}: ${await knop.count()} weergave-toggles in het paneel, verwacht 1 — dit meet niets`);
    } else {
      const lees = async () => {
        await page.mouse.move(0, 0);
        await page.waitForTimeout(450); // een eventuele transitie uitlopen (CLAUDE.md, Meten in dark mode)
        const [ax] = await axNamen(page, knop);
        return { naam: ax?.naam ?? '', rol: ax?.rol, pressed: await knop.getAttribute('aria-pressed'), bg: await zichtbareAchtergrond(knop) };
      };
      const lichtUit = await lees();
      const kaartAntwoord = page.waitForResponse((r) => r.url().includes('/api/kaart'), { timeout: 20_000 }).catch(() => null);
      await knop.click();
      await kaartAntwoord;
      const lichtAan = await lees();

      if (!lichtUit.naam || lichtUit.pressed !== 'false' || lichtAan.pressed !== 'true') fail(`c08: toggle vóór ${JSON.stringify({ naam: lichtUit.naam, pressed: lichtUit.pressed })}, na klik ${JSON.stringify({ naam: lichtAan.naam, pressed: lichtAan.pressed })} — aria-pressed wisselt niet van false naar true`);
      else if (lichtUit.naam !== lichtAan.naam) fail(`c08: de toggle heet "${lichtUit.naam}" (niet ingedrukt) en "${lichtAan.naam}" (ingedrukt)`);
      else ok(`c08: de toggle heet in beide standen "${lichtAan.naam}" (${lichtAan.rol}); aria-pressed false → true`);

      const oordeel = (sleutel, modus, uit, aan) => {
        if (uit.bg.onleesbaar || aan.bg.onleesbaar) return fail(`${sleutel}: achtergrondkleur niet te lezen (${uit.bg.onleesbaar ?? aan.bg.onleesbaar}) — dit meet niets`);
        if (!uit.bg.dekkend || !aan.bg.dekkend) notes.push(`${sleutel}: geen dekkende voorouder gevonden — samengesteld op wit`);
        const v = contrast(uit.bg, aan.bg);
        const tekst = `${modus}: ingedrukt ${rgb(aan.bg)} tegen niet-ingedrukt ${rgb(uit.bg)} = ${v.toFixed(2)}:1`;
        if (uit.pressed === aan.pressed) fail(`${sleutel}: beide metingen in dezelfde stand (aria-pressed ${aan.pressed}) — dit meet niets`);
        else if (v < 3) fail(`${sleutel}: ${tekst}, verwacht ≥ 3:1`);
        else ok(`${sleutel}: ${tekst}`);
      };
      oordeel('c08b', 'light', lichtUit, lichtAan);

      // Dark: geforceerd (er is geen schakelaar in de UI), en gemeten na het uitlopen van transities.
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      const donkerAan = await lees();
      await knop.click();
      const donkerUit = await lees();
      await page.evaluate(() => document.documentElement.classList.remove('dark'));
      if (rgb(donkerUit.bg) === rgb(lichtUit.bg)) fail(`c08c: de niet-ingedrukte achtergrond is in dark gelijk aan light (${rgb(lichtUit.bg)}) — dark niet actief, dit meet niets`);
      else oordeel('c08c', 'dark', donkerUit, donkerAan);
    }
  }

  const inVenster = consoleErrors.splice(foutenVoor);
  const geforceerd = inVenster.filter((x) => /status of 500/.test(x));
  consoleErrors.push(...inVenster.filter((x) => !/status of 500/.test(x)));
  notes.push(`dashboard: ${geforceerd.length} geforceerde 500-melding(en) (prospects) uit de console gehaald, ${inVenster.length - geforceerd.length} andere behouden`);

  // ── c01 + c05c: Sync nu op een KOPIE van de database ───────────────────────────────────────────
  // De enige plek waar deze module iets laat veranderen: een nieuwe vacature in de kopie, zodat de
  // server na `router.refresh()` echt een langere lijst teruggeeft. De POST naar /api/sync wordt
  // onderschept — Adzuna wordt nooit gevraagd.
  {
    // FLOW_WERKMAP: een map die de aanroeper zelf beheert. Zonder: een eigen tijdelijke map, die na
    // afloop weer weg is.
    const eigenMap = !process.env.FLOW_WERKMAP;
    const map = process.env.FLOW_WERKMAP ?? mkdtempSync(join(tmpdir(), 'jobradar-flow-'));
    const kopie = join(map, 'dashboard-kopie.db');
    for (const f of [kopie, `${kopie}-wal`, `${kopie}-shm`]) rmSync(f, { force: true });
    let extra = null;
    try {
      execFileSync('sqlite3', ['-readonly', DB, `.backup '${kopie}'`]);
      // Niet `-readonly`: de kopie draagt WAL-modus uit het origineel, en alleen-lezen kan zonder -shm
      // niet openen. Het is onze kopie; schrijven mag hier.
      const inKopie = existsSync(kopie) ? Number(execFileSync('sqlite3', ['-cmd', '.timeout 5000', kopie, 'SELECT count(*) FROM jobs;']).toString().trim()) : -1;
      if (inKopie !== aantalJobs) throw new Error(`kopie telt ${inKopie} vacatures, de database ${aantalJobs}`);
      extra = await m.extraServer({ port: POORT, env: { JOBRADAR_DB_PATH: kopie } });

      await laad('/', extra.base);
      const regio = page.locator('[data-filter-telling]');
      await page.locator('select[aria-label="Status"]').selectOption('alle');
      await page.waitForFunction(() => (document.querySelector('[data-filter-telling]')?.textContent ?? '').trim() !== '', null, { timeout: 3_000 }).catch(() => {});
      const oud = (await regio.textContent()).trim();
      const kaartenVoor = await kaarten('job').count();

      // De nieuwe vacature pas NA het laden: zo kan alleen de sync hem in beeld brengen.
      const nu = new Date().toISOString();
      const titel = `Harness c01 nieuwe vacature ${Date.now()}`;
      const nieuwId = Number(execFileSync('sqlite3', ['-cmd', '.timeout 5000', kopie,
        `INSERT INTO jobs (external_id, source, title, company, postcode, city, region, url, description, posted_at, dedupe_hash, score, score_breakdown, job_status, first_seen_at, last_seen_at)
         VALUES ('harness-c01-${nu}', 'adzuna', '${titel}', 'Harness BV', 1000, 'Brussel', 'BRU', 'https://example.invalid/harness-c01', NULL, '${nu}', 'harness-c01-${nu}', 40, '{"ux":20,"ui":20}', 'new', '${nu}', '${nu}');
         SELECT last_insert_rowid();`]).toString().trim());

      const geslaagd = { ok: true, jobsAdded: 1, leadsAdded: 0, sourceStatuses: {} };
      if (!(await m.onderschepSchrijven({ status: 200, body: geslaagd }, extra.base))) {
        fail('c01: onderschepping van schrijfverzoeken op de kopie niet bevestigd — Sync nu niet geklikt');
        fail('c05c: onderschepping niet bevestigd — dit meet niets');
      } else {
        const syncPosts = [];
        const luister = (r) => { if (r.url().includes('/api/sync') && r.method() === 'POST') syncPosts.push(r.url()); };
        page.on('request', luister);
        await page.evaluate(() => { window.__harnessZonderHerladen = true; });
        const sync = page.getByRole('button', { name: 'Sync nu', exact: true });
        if ((await sync.count()) !== 1) {
          fail(`c01: ${await sync.count()} knoppen "Sync nu", verwacht 1 — dit meet niets`);
        } else {
          await sync.click();
          const nieuw = kaarten('job').filter({ has: page.locator('h3', { hasText: exact(titel) }) });
          await nieuw.first().waitFor({ state: 'attached', timeout: 15_000 }).catch(() => {});
          await page.waitForTimeout(700);
          page.off('request', luister);
          const zonderHerladen = await page.evaluate(() => window.__harnessZonderHerladen === true);
          const n = await nieuw.count();
          const item = n === 1 ? await nieuw.getAttribute('data-item') : null;
          const kaartenNa = await kaarten('job').count();
          if (syncPosts.length !== 1) fail(`c01: ${syncPosts.length} POST(s) naar /api/sync na de klik, verwacht 1 — dit meet niets`);
          else if (!zonderHerladen) fail('c01: de pagina is herladen tijdens de sync — "zonder herladen" niet gemeten');
          else if (n !== 1 || item !== `job-${nieuwId}`) fail(`c01: na Sync nu staat "${titel}" (id ${nieuwId}) ${n}× in de lijst (${kaartenVoor} → ${kaartenNa} kaarten), zonder herladen`);
          else ok(`c01: na Sync nu (onderschept) staat de nieuwe vacature ${item} in de lijst zonder herladen (${kaartenVoor} → ${kaartenNa} kaarten)`);

          // c05c: de telling hoort bij de lijst van vóór de sync; na de sync mag dat getal er niet meer staan.
          const tekst = (await regio.textContent()).trim();
          const laag = await paneel().locator('[data-lage-score] [data-item^="job-"]').count();
          const actueel = `${kaartenNa} ${kaartenNa === 1 ? 'vacature' : 'vacatures'} vanaf score 10, ${laag} lager`;
          if (!oud) fail('c05c: vóór de sync stond er geen telling in de live-regio — dit meet niets');
          else if (kaartenNa === kaartenVoor) fail(`c05c: de sync veranderde de lijst niet (${kaartenNa} kaarten) — dit meet niets`);
          else if (tekst === oud || (tekst !== '' && tekst !== actueel)) fail(`c05c: na de sync (${kaartenVoor} → ${kaartenNa} kaarten) staat "${tekst}" in de telling-regio (vóór: "${oud}", actueel zou "${actueel}" zijn)`);
          else ok(`c05c: na de sync (${kaartenVoor} → ${kaartenNa} kaarten) staat er geen verouderd getal in de telling-regio ("${tekst}", vóór: "${oud}")`);
        }
        page.off('request', luister);
      }
    } catch (e) {
      fail(`c01: de kopie of de tweede server op ${POORT} faalde: ${String(e).split('\n')[0]}`);
      fail('c05c: geen kopie of tweede server — dit meet niets');
    } finally {
      await m.stopOnderschepping(extra?.base);
      if (extra) extra.stop();
      if (eigenMap) rmSync(map, { recursive: true, force: true });
      // Terug naar de hoofdserver, zodat een volgende sectie niet op de kopie begint.
      await laad('/').catch(() => {});
    }
  }

  const vingerNa = await m.dbVingerafdruk();
  if (vingerNa !== vingerVoor) fail(`dashboard: de database veranderde (${vingerVoor} → ${vingerNa}) — een klik lekte`);
  else ok(`dashboard: de database is ongemoeid (vingerafdruk ${vingerNa}, vóór én na)`);
}
