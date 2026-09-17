/**
 * Fase 3, toegevoegd 2026-09-17 op vraag van Jeroen: het vinkje "Alleen nieuw bij de laatste sync" en
 * de hernoemde statusoptie "Niet beoordeeld" (c44–c48 in de briefing).
 *
 * Alleen lezen en client-state: het vinkje stuurt geen verzoek, dus hier wordt niets onderschept. De
 * vingerafdruk van de database vóór en na bewijst dat, in plaats van het aan te nemen.
 *
 * De oracle voor c45 komt uit de database zelf (sqlite -readonly), met dezelfde definitie als de
 * pagina: de vorige sync is de op één na laatste met status `done`. Niet uit de DOM — een telling
 * tegen wat de pagina zelf toont, kan een verkeerde voorwaarde nooit betrappen.
 */
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const NAAM = 'Alleen nieuw bij de laatste sync';

export default async function (m) {
  const { page, APP, ok, fail, notes, laad, dbVingerafdruk } = m;
  const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
  const sql = (q) => execFileSync('sqlite3', ['-readonly', DB, q]).toString().trim();
  const esc = (s) => s.replace(/'/g, "''");

  const vorige = sql("SELECT started_at FROM sync_runs WHERE status = 'done' ORDER BY started_at DESC LIMIT 1 OFFSET 1;") || '1970-01-01T00:00:00.000Z';
  const verwachtJobs = Number(sql(`SELECT count(*) FROM jobs WHERE first_seen_at >= '${esc(vorige)}' AND job_status != 'dismissed';`));
  const openJobs = Number(sql("SELECT count(*) FROM jobs WHERE job_status != 'dismissed';"));
  const verwachtLeads = Number(sql(`SELECT count(*) FROM companies WHERE first_seen_at >= '${esc(vorige)}' AND lead_status != 'dismissed';`));
  const openLeads = Number(sql("SELECT count(*) FROM companies WHERE lead_status != 'dismissed';"));
  notes.push(`nieuw: vorige sync ${vorige}; oracle ${verwachtJobs}/${openJobs} open vacatures en ${verwachtLeads}/${openLeads} open leads nieuw`);

  const dbVoor = await dbVingerafdruk();
  const vinkje = page.locator('#alleen-nieuw');
  const tab = (naam) => page.locator('[role="tab"]', { hasText: naam }).first();
  const telling = async () => (await page.locator('[data-filter-telling]').innerText()).trim();

  await laad('/');

  // ── c44: het vinkje staat er, met die naam, op Vacatures en Leads ───────────
  for (const [tabNaam, sleutel] of [['Vacatures', 'Vacatures'], ['Leads', 'Leads']]) {
    await tab(tabNaam).click();
    await page.waitForTimeout(300);
    const perNaam = await page.getByRole('checkbox', { name: NAAM, exact: true }).count();
    if (perNaam !== 1) fail(`c44: op ${sleutel} ${perNaam} vinkjes met de naam "${NAAM}" in de toegankelijkheidsboom, verwacht 1`);
    else ok(`c44: op ${sleutel} staat één vinkje met de naam "${NAAM}"`);
  }
  await tab('Prospects').click();
  await page.waitForTimeout(300);
  notes.push(`nieuw: op Prospects ${await vinkje.count()} vinkje(s) (aanname: 0 — prospects komen niet uit een sync)`);

  // ── c45: aangevinkt = precies de vacatures van de laatste sync ──────────────
  await laad('/');
  if (verwachtJobs === 0 || verwachtJobs === openJobs) {
    notes.push(`c45: [NIET TE VERIFIËREN — ${verwachtJobs} van ${openJobs} open vacatures nieuw in deze database; het vinkje filtert dan niets weg of alles]`);
  } else if ((await vinkje.count()) !== 1) {
    fail(`c45: ${await vinkje.count()} vinkjes op Vacatures — dit meet niets`);
  } else {
    await vinkje.click();
    await page.waitForTimeout(700);
    const t = await telling();
    const g = t.match(/^(\d+) vacatures? vanaf score \d+, (\d+) lager$/);
    const getoond = g ? Number(g[1]) + Number(g[2]) : null;
    if (getoond === null) fail(`c45: na het aanvinken leest de telling "${t}" — geen telling om te vergelijken`);
    else if (getoond !== verwachtJobs) fail(`c45: aangevinkt toont Vacatures ${getoond} (${t}), de database zegt ${verwachtJobs} nieuw bij de laatste sync`);
    else ok(`c45: aangevinkt toont Vacatures ${getoond} vacatures ("${t}") = ${verwachtJobs} in de database, van ${openJobs} open`);
  }

  // ── c45b: idem Leads (de leadkaarten staan allemaal in de DOM) ───────────────
  await laad('/?tab=leads');
  const leadKaarten = page.locator('[role="tabpanel"]:visible [data-item^="lead-"]');
  const zonder = await leadKaarten.count();
  if (verwachtLeads === 0 || verwachtLeads === openLeads) {
    notes.push(`c45b: [NIET TE VERIFIËREN — ${verwachtLeads} van ${openLeads} open leads nieuw]`);
  } else if (zonder !== openLeads) {
    fail(`c45b: zonder vinkje ${zonder} leadkaarten, de database zegt ${openLeads} open — de telling zelf klopt niet, dit meet niets`);
  } else if ((await vinkje.count()) !== 1) {
    // Tellen vóór klikken: zonder deze tak wachtte de klik 30 s op een vinkje dat er niet is en gooide
    // de module, zodat c46–c48 niet meer liepen (tegenproef c44, 2026-09-17).
    fail(`c45b: ${await vinkje.count()} vinkjes op Leads — dit meet niets`);
  } else {
    await vinkje.click();
    await page.waitForTimeout(500);
    const met = await leadKaarten.count();
    if (met !== verwachtLeads) fail(`c45b: aangevinkt ${met} leadkaarten, de database zegt ${verwachtLeads} nieuw bij de laatste sync`);
    else ok(`c45b: aangevinkt toont Leads ${met} kaarten = ${verwachtLeads} in de database (zonder vinkje ${zonder})`);

    // ── c46: de stand overleeft herladen ─────────────────────────────────────
    const url = new URL(page.url());
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const naHerladen = { nieuw: url.searchParams.get('nieuw'), vinkje: await vinkje.getAttribute('aria-checked').catch(() => null), kaarten: await leadKaarten.count() };
    if (naHerladen.nieuw !== '1') fail(`c46: na het aanvinken staat nieuw=${naHerladen.nieuw} in de URL, verwacht 1`);
    else if (naHerladen.vinkje !== 'true' || naHerladen.kaarten !== verwachtLeads) fail(`c46: na herladen ${JSON.stringify(naHerladen)}, verwacht vinkje aan en ${verwachtLeads} kaarten`);
    else ok(`c46: het vinkje overleeft herladen (?${url.searchParams}, ${naHerladen.kaarten} kaarten)`);
  }

  // ── c47: leeg door het vinkje noemt het vinkje ───────────────────────────────
  // Een zoekterm die alleen oude vacatures raakt: dan is het vinkje aantoonbaar de enige oorzaak.
  const kandidaten = sql(`SELECT company FROM jobs GROUP BY company HAVING max(first_seen_at) < '${esc(vorige)}' AND sum(job_status != 'dismissed') > 0 ORDER BY count(*) DESC LIMIT 20;`).split('\n').filter(Boolean);
  const term = kandidaten.find((c) => Number(sql(`SELECT count(*) FROM jobs WHERE first_seen_at >= '${esc(vorige)}' AND (lower(title) LIKE '%${esc(c.toLowerCase())}%' OR lower(company) LIKE '%${esc(c.toLowerCase())}%');`)) === 0);
  if (!term) {
    notes.push('c47: [NIET TE VERIFIËREN — geen bedrijf met alleen oude vacatures in deze database]');
  } else {
    await laad(`/?zoek=${encodeURIComponent(term)}`);
    const zonderVinkje = await page.locator('[role="tabpanel"]:visible [data-status]').count();
    await laad(`/?zoek=${encodeURIComponent(term)}&nieuw=1`);
    const leeg = await page.locator('[role="tabpanel"]:visible').innerText();
    if (zonderVinkje === 0) fail(`c47: "${term}" geeft ook zonder vinkje 0 vacatures — het vinkje is niet de oorzaak, dit meet niets`);
    else if (!leeg.includes(`zet "${NAAM}" uit`)) fail(`c47: leeg door het vinkje ("${term}", zonder vinkje ${zonderVinkje}) leest: "${leeg.replace(/\s+/g, ' ').slice(0, 160)}"`);
    else ok(`c47: leeg door het vinkje noemt het vinkje ("${term}": ${zonderVinkje} zonder, 0 met)`);
  }

  // ── c48: de statusoptie heet "Niet beoordeeld" ───────────────────────────────
  await laad('/');
  const opties = await page.locator('select[aria-label="Status"] option').evaluateAll((o) => o.map((x) => ({ waarde: x.value, tekst: x.textContent.trim() })));
  const nieuw = opties.filter((o) => o.waarde === 'new');
  if (opties.length === 0) fail('c48: geen statusfilter gevonden — dit meet niets');
  else if (nieuw.length !== 1 || nieuw[0].tekst !== 'Niet beoordeeld') fail(`c48: de optie new leest ${JSON.stringify(nieuw)}, verwacht "Niet beoordeeld"`);
  else ok(`c48: de optie new heet "Niet beoordeeld" (${opties.length} opties: ${opties.map((o) => o.tekst).join(', ')})`);

  const dbNa = await dbVingerafdruk();
  if (dbNa !== dbVoor) fail(`nieuw: de database veranderde (${dbVoor} → ${dbNa})`);
  else ok(`nieuw: de database is ongemoeid (${dbNa})`);
}
