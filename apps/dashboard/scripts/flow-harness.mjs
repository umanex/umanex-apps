#!/usr/bin/env node
// flow-harness.mjs — bouwt de app naar een eigen distDir, serveert hem op :3110 en loopt
// de vier cockpit-routes af.
//
// ── Waarom hij bestaat ──────────────────────────────────────────────────────────────
// Het Verify-pad van deze app zei tot vandaag letterlijk: *"Flow aandrijven — geen; één
// scherm, geen navigatie; bouw hem als er routes bijkomen."* Er zijn er vier bijgekomen,
// dus die verplichting is opengegaan.
//
// ── Waarom :3110 en een eigen distDir ───────────────────────────────────────────────
// :3010 draait de PM2-productiebuild en :3011 is de dev-server. Bouwen in `.next` zou de
// vloer weghalen onder de server die Jeroen op dat moment openheeft — dat gebeurde op
// 2026-09-09 en zette PM2 op `errored`. `.next-harness` raakt geen van beide, en :3110
// volgt de conventie van cashflow (:3000 → :3100).
//
// ── Wat hij toetst ──────────────────────────────────────────────────────────────────
//   1. de vier routes geven 200 en dragen hun eigen inhoud
//   2. het aggregaat op /cockpit is de som van de regels waar het naartoe linkt
//   3. een gerenderd getal komt uit de meting en niet uit het niets
//   4. /api/cockpit/check weigert een niet-lokale Host-header
//   5. een onbekende klant geeft 404, niet een leeg scherm

import { execFileSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const POORT = 3110;
const BASIS = `http://127.0.0.1:${POORT}`;

let geslaagd = 0;
const gefaald = [];
const zegt = (naam, ok, detail = '') => {
  if (ok) {
    console.log(`  ✓ ${naam}`);
    geslaagd += 1;
  } else {
    console.log(`  ✗ ${naam}${detail ? `  ${detail}` : ''}`);
    gefaald.push(naam);
  }
};

const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

async function haal(pad, opties = {}) {
  const res = await fetch(`${BASIS}${pad}`, opties);
  return { status: res.status, tekst: await res.text() };
}

// ── 0. Is er iets om te meten? ──────────────────────────────────────────────────────
const STAND = join(APP, '.stand');
const REGISTRY = join(APP, 'stand.local.json');
if (!existsSync(REGISTRY) || !existsSync(STAND)) {
  console.error('✗ flow-harness: geen registry of geen meting — draai eerst `cockpit:collect`.');
  console.error('  Zonder meting toetst deze harness alleen lege schermen, en dat is geen groen.');
  process.exit(2);
}
const slugs = readdirSync(STAND).filter((s) => existsSync(join(STAND, s, 'index.json')));
if (slugs.length === 0) {
  console.error('✗ flow-harness: .stand bestaat maar bevat geen enkele index.json');
  process.exit(2);
}
const slug = slugs[0];
const index = JSON.parse(readFileSync(join(STAND, slug, 'index.json'), 'utf8'));
const werk = JSON.parse(readFileSync(join(STAND, slug, 'cockpit/werkvoorraad.json'), 'utf8'));

// `next build` herschrijft `next-env.d.ts` en `tsconfig.json` naar de distDir waarmee hij
// draait. Met NEXT_DIST_DIR=.next-harness gaat `next-env.d.ts` wijzen naar een gitignorede
// map, en dan hangt `type-check` af van een harness-run die er in CI niet is. Een
// verificatiestap hoort de tree niet vuil achter te laten — dus back-up vooraf, herstel na
// afloop, mét een uitkomst op het effect.
const GERAAKT = ['next-env.d.ts', 'tsconfig.json'].map((n) => join(APP, n));
const VOORAF = Object.fromEntries(GERAAKT.map((p) => [p, readFileSync(p, 'utf8')]));
const herstelConfig = () => {
  const stuk = [];
  for (const p of GERAAKT) {
    if (readFileSync(p, 'utf8') !== VOORAF[p]) writeFileSync(p, VOORAF[p]);
    if (readFileSync(p, 'utf8') !== VOORAF[p]) stuk.push(p);
  }
  return stuk;
};
process.on('exit', () => {
  const stuk = herstelConfig();
  if (stuk.length) console.error(`✗ kon niet herstellen: ${stuk.join(', ')}`);
});

console.log(`── bouwen naar .next-harness (${slugs.length} gemeten klant(en)) ──`);
try {
  execFileSync('npx', ['next', 'build'], {
    cwd: APP,
    env: { ...process.env, NEXT_DIST_DIR: '.next-harness' },
    stdio: 'pipe',
    timeout: 300_000,
  });
} catch (e) {
  console.error('✗ build faalde:');
  console.error((e.stdout || '').toString().split('\n').slice(-25).join('\n'));
  console.error((e.stderr || '').toString().split('\n').slice(-10).join('\n'));
  process.exit(1);
}
console.log('  ✓ build geslaagd');

const server = spawn(
  'npx',
  ['next', 'start', '--hostname', '127.0.0.1', '--port', String(POORT)],
  { cwd: APP, env: { ...process.env, NEXT_DIST_DIR: '.next-harness' }, stdio: 'pipe', detached: true },
);

const stop = () => {
  try {
    process.kill(-server.pid, 'SIGTERM');
  } catch {
    /* al weg */
  }
};
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

try {
  let op = false;
  for (let i = 0; i < 60; i += 1) {
    await slaap(500);
    try {
      await fetch(`${BASIS}/cockpit`);
      op = true;
      break;
    } catch {
      /* nog niet */
    }
  }
  if (!op) {
    console.error(`✗ server kwam niet omhoog op ${BASIS}`);
    process.exit(1);
  }

  console.log('\n── 1. de vier routes ──');
  const project = index.data[0]?.project ?? '(root)';
  const routes = [
    ['/cockpit', 'Stand van het werk'],
    [`/cockpit/${slug}`, 'Projecten'],
    [`/cockpit/${slug}/${encodeURIComponent(project)}`, 'Open werk'],
    ['/cockpit/systeem', 'Systeem'],
  ];
  const paginas = new Map();
  for (const [pad, marker] of routes) {
    const r = await haal(pad);
    paginas.set(pad, r.tekst);
    zegt(`${pad} geeft 200`, r.status === 200, `kreeg ${r.status}`);
    zegt(`${pad} draagt eigen inhoud ("${marker}")`, r.tekst.includes(marker));
  }

  console.log('\n── 2. het aggregaat is de som van zijn ontleding ──');
  const som = (veld) => index.data.reduce((n, r) => n + (r[veld] ?? 0), 0);
  zegt(
    'index.noemer.open_items == rijen in werkvoorraad',
    index.noemer.open_items === werk.data.length,
    `${index.noemer.open_items} ≠ ${werk.data.length}`,
  );
  zegt(
    'som(handoff+backlog+learnings) == rijen in werkvoorraad',
    som('handoff') + som('backlog') + som('learnings') === werk.data.length,
  );
  zegt('index.noemer.projecten == rijen in index.data', index.noemer.projecten === index.data.length);

  console.log('\n── 3. een gerenderd getal komt uit de meting ──');
  const portfolio = paginas.get('/cockpit') ?? '';
  const totaalOpen = slugs.reduce((n, s) => {
    const i = JSON.parse(readFileSync(join(STAND, s, 'index.json'), 'utf8'));
    return n + i.noemer.open_items;
  }, 0);
  zegt(
    `/cockpit toont het totaal van ${totaalOpen} open items`,
    portfolio.includes(String(totaalOpen)),
  );
  // Tegenproef op deze as: een getal dat niet in de meting zit hoort er níet te staan.
  // Zonder deze kant zou "de pagina bevat een getal" ook slagen op een toevallige match.
  const onzin = totaalOpen + 100_000;
  zegt(`en niet het verzonnen getal ${onzin}`, !portfolio.includes(String(onzin)));

  console.log('\n── 4. de loopback-sluis ──');
  // Via `curl`, niet via `fetch`. `Host` is een forbidden header name in de fetch-spec:
  // Node zet hem stil niet, de request komt als lokaal binnen en de assertie meet dan of
  // de entry bestaat in plaats van of de sluis dicht is. Gemeten 2026-09-15: 404 in plaats
  // van 403, en dat zag eruit als een kapotte guard terwijl het instrument het probleem was.
  const curlStatus = (headers) => {
    const args = ['-s', '-o', '/dev/null', '-w', '%{http_code}', '-X', 'POST',
      '-H', 'content-type: application/json',
      ...headers.flatMap((h) => ['-H', h]),
      '--data', JSON.stringify({ klant: slug, bestand: 'x', datum: '2026-01-01' }),
      `${BASIS}/api/cockpit/check`];
    return Number(execFileSync('curl', args, { encoding: 'utf8', timeout: 15_000 }).trim());
  };
  zegt(
    'POST met een vreemde Host geeft 403',
    curlStatus(['Host: 10.0.0.5:3110']) === 403,
    `kreeg ${curlStatus(['Host: 10.0.0.5:3110'])}`,
  );
  // De andere kant, met hetzelfde instrument: zonder die header hoort de sluis open te
  // staan. Zou curl zélf de request blokkeren, dan faalden beide kanten en zou "403" niets
  // over de guard zeggen.
  zegt('en met een loopback-Host komt hij door de sluis', curlStatus([]) !== 403);
  const lokaal = await fetch(`${BASIS}/api/cockpit/check`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ klant: slug, bestand: 'bestaat-niet', datum: '2026-01-01' }),
  });
  zegt(
    'en zonder die header komt hij wél binnen (404 op de entry, niet 403)',
    lokaal.status === 404,
    `kreeg ${lokaal.status}`,
  );

  console.log('\n── 5. de staten, geforceerd door het feit te maken ──');
  // De routes zijn `force-dynamic` en lezen bij elk verzoek van schijf, dus een staat
  // forceer je door het signaalbestand te veranderen. Twee doelwitten, want ze dragen een
  // andere staat: `index.json` bepaalt de héle pagina, `design-debt.json` alleen zijn tegel.
  // Mijn eerste versie saboteerde alleen de tweede en zocht toen naar paginabrede tekst —
  // drie valse rode assen, en de fout zat in de harness (gemeten 2026-09-15).
  const doelen = {
    index: join(STAND, slug, 'index.json'),
    debt: join(STAND, slug, 'design-debt.json'),
  };
  const backups = Object.fromEntries(
    Object.entries(doelen).map(([k, pad]) => [k, readFileSync(pad, 'utf8')]),
  );
  const herstel = () => {
    let heel = true;
    for (const [k, pad] of Object.entries(doelen)) {
      writeFileSync(pad, backups[k]);
      if (readFileSync(pad, 'utf8') !== backups[k]) heel = false;
    }
    // Een herstelstap die per constructie niet kan klagen is geen handeling maar een
    // aanname. Dus eist hij een uitkomst op het effect.
    if (!heel) {
      console.error('✗ herstel van .stand faalde — draai `cockpit:collect` opnieuw');
      process.exitCode = 1;
    }
    return heel;
  };

  try {
    const oud = JSON.parse(backups.index);
    oud.measured_at = new Date(Date.now() - 40 * 86_400_000).toISOString().replace('Z', '+02:00');
    writeFileSync(doelen.index, JSON.stringify(oud));
    const naVerouderd = await haal(`/cockpit/${slug}`);
    zegt('een meting van 40 d oud toont "verouderd"', naVerouderd.tekst.includes('verouderd'));
    // React zet bij SSR `<!-- -->`-markers tussen letterlijke tekst en een expressie, dus
    // een regex op de rauwe HTML breekt op `verouderd — <!-- -->40<!-- --> d`. Eerst tags
    // en commentaar eruit, dan pas zoeken.
    const plat = (h) => h.replace(/<!--.*?-->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    zegt('en noemt het aantal dagen', /verouderd\s*—?\s*40 d/.test(plat(naVerouderd.tekst)));
    writeFileSync(doelen.index, backups.index);

    // Positieve controle op diezelfde as: met de verse meting staat het woord er NIET.
    const naVers = await haal(`/cockpit/${slug}`);
    zegt('en bij een verse meting staat "verouderd" er niet', !naVers.tekst.includes('verouderd'));

    rmSync(doelen.index);
    const naWeg = await haal(`/cockpit/${slug}`);
    zegt('een ontbrekende index toont "Niet gemeten"', naWeg.tekst.includes('Niet gemeten'));
    zegt('mét het commando om het te verhelpen', naWeg.tekst.includes('cockpit:collect'));
    writeFileSync(doelen.index, backups.index);

    writeFileSync(doelen.index, '{ dit is geen json');
    const naKapot = await haal(`/cockpit/${slug}`);
    zegt('onleesbare JSON geeft 200 met een reden, geen crash', naKapot.status === 200);
    zegt('en die reden noemt het bestand', naKapot.tekst.includes('index.json'));
    writeFileSync(doelen.index, backups.index);

    // De tegel-staat apart: een ontbrekend deelsignaal hoort "niet gemeten" te zeggen en
    // niet de verklaring te lenen van een repo die geen .tsx heeft.
    rmSync(doelen.debt);
    const naDebtWeg = await haal(`/cockpit/${slug}`);
    zegt('een ontbrekend deelsignaal zegt "niet gemeten"', naDebtWeg.tekst.includes('niet gemeten'));
    zegt(
      'en leent niet de verklaring van een repo zonder .tsx',
      !naDebtWeg.tekst.includes('geen .tsx onder apps/'),
    );
  } finally {
    zegt('alle signaalbestanden byte-identiek hersteld', herstel());
  }
  const naHerstel = await haal(`/cockpit/${slug}`);
  zegt('na herstel rendert de pagina weer normaal', naHerstel.status === 200 && naHerstel.tekst.includes('Projecten'));

  console.log('\n── 6. randen ──');
  const onbekend = await haal('/cockpit/bestaat-niet');
  zegt('een onbekende klant geeft 404', onbekend.status === 404, `kreeg ${onbekend.status}`);
  const gereserveerd = await haal('/cockpit/systeem');
  zegt('de gereserveerde slug `systeem` blijft de systeempagina', gereserveerd.status === 200);
} finally {
  stop();
}

zegt('de build liet next-env.d.ts en tsconfig.json ongewijzigd achter', herstelConfig().length === 0);

console.log(`\nresultaat: ${geslaagd} geslaagd, ${gefaald.length} gefaald`);
process.exit(gefaald.length === 0 ? 0 : 1);
