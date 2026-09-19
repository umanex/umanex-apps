#!/usr/bin/env node
/**
 * Flow-harness — rijdt de app uit op een verse build, in een echte browser.
 *
 *   pnpm --filter jobradar flow             # volle run
 *   pnpm --filter jobradar flow --selftest  # bewijst dat hij kán falen
 *   pnpm --filter jobradar flow --headed    # meekijken terwijl het gebeurt
 *   pnpm --filter jobradar flow --shot=.flow-shots  # render per route vastleggen
 *   pnpm --filter jobradar flow --alleen=fase3-kaart,routes  # alleen deze secties
 *   pnpm --filter jobradar flow --alleen=navigatie           # de balk en zijn randgevallen
 *   pnpm --filter jobradar flow --hergebruik-build   # geen build als .next-harness nieuwer is dan elke bron
 *
 * Waarom dit bestaat: zonder uitvoerbaar pad valt de flow-as van `verify` terug op
 * "overgeslagen", en dan is elk acceptatie-item dat door de UI loopt onverifieerbaar.
 * Een screenshot bewijst dat er iets rendert; dit bewijst dat de pagina's laden, dat de
 * navigatie werkt en dat de console schoon is.
 *
 * Vier ontwerpkeuzes, elk tegen een concrete faalvorm:
 *
 * 1. **Verse build, eigen poort.** Draait `next build` en start op een poort die 100 hoger
 *    ligt dan de dev-poort, en weigert als daar al iets luistert. Een dev-server van
 *    iemand anders wordt dus nooit overschreven of herstart — de Beoordeel-stap schrijft,
 *    en dat mag nooit buiten deze harness landen.
 * 2. **Elke externe origin wordt afgebroken en geteld.** Eén lek en de run faalt. Zo kan
 *    deze harness per constructie geen echte data raken, ook niet als de app dat wil.
 * 3. **Console-fouten zijn bevindingen.** Een pagina die rendert maar in de console
 *    schreeuwt, is niet in orde; dat is precies het soort defect dat een screenshot mist.
 * 4. **`--selftest` voegt een scenario toe dat hóórt te falen.** Een harness die alleen
 *    ooit geslaagd is, bewijst niet dat hij meet. Zonder die kant weet je niet of groen
 *    "alles goed" betekent of "ik kijk nergens naar".
 * 5. **Toegankelijkheid wordt gemeten, niet gelezen.** Twee dingen die de UX-audit van
 *    2026-08-11 met de hand vaststelde en daarna stil konden verlopen: de kopstructuur
 *    (h1 → h3, geen h2) en de focus-zichtbaarheid. De toetsenbord-pass loopt de echte
 *    tab-volgorde af en toetst per stop of de computed stijl bij focus verandert — een
 *    differentiële meting, niet een grep op klassenamen. De audit kon dit niet: zijn
 *    browserautomatisering kreeg geen Tab in de pagina (BACKLOG, 2026-08-11).
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const HEADED = args.includes('--headed');
const SHOT = args.find((a) => a.startsWith('--shot='))?.slice(7) ?? null;
const PORT = Number(args.find((a) => a.startsWith('--port='))?.slice(7) ?? 3103);
// Secties apart draaien. Bestaat voor wie één as bouwt: een volle run kost minuten, en elke
// sectie meet op zichzelf (eigen goto, eigen onderschepping). De zelftest volgt `--selftest`.
const ALLEEN = args.find((a) => a.startsWith('--alleen='))?.slice(9).split(',').filter(Boolean) ?? null;
const doe = (sectie) => !ALLEEN || ALLEEN.includes(sectie);
// Hergebruik alleen op een meting: de build blijft staan als zijn BUILD_ID nieuwer is dan elk
// bronbestand dat hij bundelt. Een vlag die blind hergebruikt, zou de belofte "je test per
// definitie de huidige code" stil breken — precies bij een tegenproef, die de bron muteert.
const HERGEBRUIK = args.includes('--hergebruik-build');
// Eén extra opname op een smallere breedte, alleen bij --shot. Bewust géén tweede
// meetronde: de BACKLOG verwierp meten op meerdere viewports (jobradar is een
// desktop-triagescherm), maar één beeld om te kunnen kíjken is iets anders dan een as
// die rood kan worden.
const SMAL = Number(args.find((a) => a.startsWith('--smal='))?.slice(7) ?? 0);
// Waar de smalle breedte een ÉIS is en niet alleen een beeld. Het dashboard is een vastgelegd
// desktop-doelwit (`BACKLOG.md`: "mobiel is voor jobradar geen doelwit") en loopt met echte
// vacaturedata over op 400 px — gemeten 2026-09-16: 756 px, opgeteld uit de titels in `JobCard`,
// die `truncate` dragen zonder `min-w-0` en dus niet krimpen. Dat rood laten staan zou de harness
// elke run rood maken om een reden die allang aanvaard is, en dan leert iedereen rood te lezen als
// ruis. De andere routes krijgen hun opname en een notitie; alleen `/plan` faalt erop.
const SMAL_ROUTES = ['/plan'];
const BASE = `http://127.0.0.1:${PORT}`;

/** Routes die moeten laden. Uitbreiden zodra er een scherm bijkomt. */
const ROUTES = ['/', '/instellingen', '/plan'];

/**
 * Fase 3 (fouten en toegankelijkheid, 2026-09-17): één module per oppervlak, elk met een
 * `export default async function (m)` die het meetcontext-object hieronder krijgt. Losse bestanden
 * zodat de assen apart te lezen en apart te draaien zijn (`--alleen=fase3-kaart`).
 */
const FASE3_MODULES = [
  ['fase3-server', 'flow/fase3-server.mjs'],
  ['fase3-dashboard', 'flow/fase3-dashboard.mjs'],
  ['fase3-kaart', 'flow/fase3-kaart.mjs'],
  ['fase3-opvolging', 'flow/fase3-opvolging.mjs'],
  ['fase3-instellingen', 'flow/fase3-instellingen.mjs'],
  ['fase3-nieuw', 'flow/fase3-nieuw.mjs'],
];

const fails = [];
const notes = [];
function fail(msg) { fails.push(msg); console.log(`  ✗ ${msg}`); }
function ok(msg) { console.log(`  ✓ ${msg}`); }

function portFree(port) {
  return new Promise((res) => {
    const s = createServer()
      .once('error', () => res(false))
      .once('listening', () => s.close(() => res(true)))
      .listen(port, '127.0.0.1');
  });
}

function run(cmd, cmdArgs, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, { cwd: APP, stdio: 'inherit', ...opts });
    p.on('exit', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exit ${code}`))));
  });
}

async function waitForServer(url, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { redirect: 'manual' });
      if (r.status < 500) return true;
    } catch { /* nog niet op */ }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

/**
 * Kopstructuur: geen overgeslagen niveau.
 *
 * Meet op de DOM in documentvolgorde, niet op de bron: de kaarttitels worden per rij
 * gerenderd, dus alleen de gerenderde pagina weet hoeveel het er zijn en in welke
 * volgorde ze staan.
 */
/** Nieuwste mtime over alles wat de build bundelt — voor `--hergebruik-build`. */
function nieuwsteBron() {
  const wortels = ['app', 'components', 'lib', 'public', '../../packages/ui/components', '../../packages/ui/lib', '../../packages/config', '../../packages/tokens/build'];
  // Géén tsconfig.json en next-env.d.ts: de build zelf herschrijft die en de harness zet ze bij
  // exit terug, dus hun mtime ligt na elke run ná de BUILD_ID en hergebruik zou nooit gebeuren.
  const losse = ['next.config.mjs', 'next.config.js', 'next.config.ts', 'package.json', 'tailwind.config.ts', 'tailwind.config.js', 'postcss.config.mjs', 'postcss.config.js'];
  let max = 0;
  const loop = (map) => {
    let kinderen;
    try { kinderen = readdirSync(map, { withFileTypes: true }); } catch { return; }
    for (const k of kinderen) {
      if (k.name === 'node_modules' || k.name.startsWith('.')) continue;
      const pad = join(map, k.name);
      if (k.isDirectory()) loop(pad);
      else max = Math.max(max, statSync(pad).mtimeMs);
    }
  };
  for (const w of wortels) loop(join(APP, w));
  for (const l of losse) { try { max = Math.max(max, statSync(join(APP, l)).mtimeMs); } catch { /* bestaat niet */ } }
  return max;
}

/**
 * Vingerafdruk van de database die de server leest: sha256 over `.dump`, alleen-lezen geopend.
 * Grover dan een telling per status, en dat is de bedoeling: een module die klikt, moet elk lek
 * zien — ook in een tabel waar hij niet aan dacht (contactmomenten, instellingen, plan).
 */
async function dbVingerafdruk() {
  const { execFileSync } = await import('node:child_process');
  const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
  try {
    const dump = execFileSync('sqlite3', ['-readonly', DB, '.dump'], { maxBuffer: 256 * 1024 * 1024 });
    return createHash('sha256').update(dump).digest('hex').slice(0, 16);
  } catch (e) {
    return `onleesbaar: ${String(e).split('\n')[0]}`;
  }
}

async function kopstructuur(page) {
  return page.evaluate(() => {
    const koppen = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      niveau: Number(h.tagName[1]),
      tekst: (h.textContent ?? '').trim().slice(0, 40),
    }));
    const problemen = [];
    if (koppen.length && koppen[0].niveau !== 1) {
      problemen.push(`eerste kop is h${koppen[0].niveau}, geen h1`);
    }
    for (let i = 1; i < koppen.length; i++) {
      const sprong = koppen[i].niveau - koppen[i - 1].niveau;
      if (sprong > 1) {
        problemen.push(
          `h${koppen[i - 1].niveau} → h${koppen[i].niveau} bij "${koppen[i].tekst}" (niveau overgeslagen)`
        );
      }
    }
    return { aantal: koppen.length, niveaus: [...new Set(koppen.map((k) => k.niveau))].sort(), problemen };
  });
}

/**
 * Toetsenbordvolgorde + focus-zichtbaarheid.
 *
 * De meting is DIFFERENTIEEL: per tab-stop wordt de computed stijl mét focus bewaard,
 * daarna wordt alles geblurd en dezelfde eigenschappen opnieuw gelezen. Verandert er
 * niets, dan is er geen zichtbare focus — ongeacht welke klassen het element draagt.
 * Een absolute meting zou hier liegen: een kaart met `shadow-md` heeft een box-shadow
 * zonder ooit focus te tonen.
 *
 * `positieve tabindex` wordt apart gemeld: die breekt de documentvolgorde en is de
 * klassieke oorzaak van een volgorde die niet met het beeld overeenkomt.
 */
/**
 * Bedienbare elementen zonder naam, zoals de BROWSER die berekent (2026-09-17).
 *
 * Geen eigen heuristiek over aria-label of <label>: de toegankelijkheidsboom van Chromium via CDP is
 * wat een schermlezer krijgt, inclusief wat Radix of een `role="img"` eromheen ermee doet. Een
 * element dat buiten de boom valt (`ignored`) telt niet mee als bedienbaar — dat is een ander defect
 * (bv. knoppen onder een img) en de reden dat de kaart ook zijn eigen check heeft.
 *
 * Elke naamloze telt, met rol en een korte beschrijving van het DOM-element, zodat een melding
 * aanwijst wát er mist in plaats van alleen hoeveel.
 */
const BEDIENBARE_ROLLEN = new Set(['button', 'link', 'textbox', 'searchbox', 'combobox', 'listbox', 'checkbox', 'radio', 'slider', 'spinbutton', 'switch', 'tab', 'menuitem', 'menuitemcheckbox', 'menuitemradio']);
async function naamloos(page) {
  const cdp = await page.context().newCDPSession(page);
  try {
    const { nodes } = await cdp.send('Accessibility.getFullAXTree');
    const bedienbaar = nodes.filter((n) => !n.ignored && BEDIENBARE_ROLLEN.has(n.role?.value));
    const zonder = bedienbaar.filter((n) => !String(n.name?.value ?? '').trim());
    const beschreven = [];
    for (const n of zonder) {
      let wat = '?';
      if (n.backendDOMNodeId) {
        const { node } = await cdp.send('DOM.describeNode', { backendNodeId: n.backendDOMNodeId }).catch(() => ({ node: null }));
        if (node) {
          const attrs = Object.fromEntries((node.attributes ?? []).reduce((acc, v, i, a) => (i % 2 ? acc : [...acc, [v, a[i + 1]]]), []));
          wat = `${node.nodeName.toLowerCase()}${attrs.id ? '#' + attrs.id : ''}${attrs.class ? '.' + attrs.class.split(/\s+/).slice(0, 2).join('.') : ''}`;
        }
      }
      beschreven.push({ rol: n.role.value, wat });
    }
    return { totaal: bedienbaar.length, zonder: beschreven };
  } finally {
    await cdp.detach().catch(() => {});
  }
}

/**
 * Geen uitzonderingen meer. Tot 2026-09-17 stond hier één: de slider-thumb van "Min. score", die
 * geen naam kón krijgen omdat `@umanex/ui` er geen prop voor had. Fase 4a gaf Slider `thumbLabel`
 * en `FilterBar` geeft hem mee, dus de as eist nu nul naamloze bedienbare elementen — strenger dan
 * een uitzondering die zichzelf telt.
 */
function naamUitzonderingen(route, zonder) {
  return { rest: zonder, uitzondering: 0 };
}

/**
 * De balk uit `app/layout.tsx` (sinds 2026-09-19): drie links, precies één met
 * `aria-current="page"`, en het wordmerk is géén kop.
 *
 * Alle drie de tellingen dragen hun noemer, want dat is precies waar deze as stil kan worden:
 * "één link met aria-current" is ook waar wanneer er nog maar één link over is.
 *
 * Een functie, zodat `--selftest` het kenmerk kan weghalen en zien dat hij omvalt.
 */
async function navigatie(page) {
  return page.evaluate(() => {
    const balk = document.querySelector('header');
    if (!balk) return { balk: false };
    const links = [...balk.querySelectorAll('a')];
    const huidig = links.filter((a) => a.getAttribute('aria-current') === 'page');
    return {
      balk: true,
      links: links.length,
      namen: links.map((a) => a.textContent.trim()),
      huidig: huidig.length,
      // Het `href` en niet de linktekst: een label kan hernoemd worden zonder dat de markering
      // van doel verandert, en dan zou de check een naam toetsen in plaats van een bestemming.
      huidigPad: huidig[0] ? new URL(huidig[0].href).pathname : null,
      koppen: balk.querySelectorAll('h1,h2,h3,h4,h5,h6').length,
    };
  });
}

/** Eén aanroep die de hele balk beoordeelt en per afwijking één regel schrijft. */
function toetsNavigatie(nav, waar, verwachtPad, { ok, fail }) {
  if (!nav.balk) return fail(`${waar} navigatie: geen <header> in de pagina — de balk van de layout ontbreekt`);
  if (nav.links !== 3) return fail(`${waar} navigatie: ${nav.links} links in de balk, verwacht 3 (${nav.namen.join(', ') || 'geen'})`);
  if (nav.koppen !== 0) return fail(`${waar} navigatie: ${nav.koppen} kop(pen) in de balk — het wordmerk mag geen kop zijn, anders begint elke route bij dezelfde h1`);
  if (nav.huidig !== 1) return fail(`${waar} navigatie: ${nav.huidig} van ${nav.links} links met aria-current="page", verwacht precies 1`);
  if (verwachtPad !== null && nav.huidigPad !== verwachtPad) return fail(`${waar} navigatie: aria-current staat op ${nav.huidigPad}, verwacht ${verwachtPad}`);
  return ok(`${waar} navigatie: ${nav.huidig} van ${nav.links} links met aria-current (${nav.huidigPad ?? 'geen'}), 0 koppen in de balk`);
}

/**
 * Selects op kaarten, lage-scorerijen of prospectrijen. Sinds 2026-09-17 hoort dat nul te zijn:
 * de status is een knop, geen randloze select. Een functie, zodat `--selftest` er een defect in
 * kan spuiten en zien dat hij omvalt.
 */
async function triageSelects(page) {
  return page.locator('[role="tabpanel"]:visible .grid select, [data-lage-score] select').evaluateAll((els) => els.map((e) => e.outerHTML.slice(0, 60)));
}

/** Per StatusActies: dragen ze de knoppen van hun status, en klopt aria-pressed met "bewaard"? */
async function triageKnoppen(page) {
  const items = await page.locator('[role="tabpanel"]:visible [data-status]').evaluateAll((els) =>
    els.map((el) => {
      const s = el.getAttribute('data-status');
      const n = (sel) => el.querySelectorAll(sel).length;
      const bewaar = n('button[aria-label^="Bewaar "]');
      const afwijzen = n('button[aria-label^="Afwijzen "]');
      const heropen = n('button[aria-label^="Heropen "]');
      const pressed = el.querySelector('button[aria-label^="Bewaar "]')?.getAttribute('aria-pressed') ?? null;
      const goed =
        s === 'dismissed' ? heropen === 1 && bewaar === 0 && afwijzen === 0
        : s === 'contacted' ? bewaar === 0 && afwijzen === 1
        : bewaar === 1 && afwijzen === 1 && heropen === 0 && pressed === String(s === 'saved');
      return { s, goed };
    })
  );
  return { totaal: items.length, fout: items.filter((i) => !i.goed).map((i) => i.s) };
}

async function toetsenbord(page, maxStops = 80) {
  await page.evaluate(() => {
    // `blur()` alleen is niet genoeg: het vertrekpunt voor sequentiële focus blijft dan op
    // het laatst gefocuste element staan, en de walk begint dáár in plaats van bovenaan het
    // document. Na een klik op een tabblad zag de pass daardoor alleen wat ná die knop komt.
    // Focus expliciet op body verzet het vertrekpunt wél.
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    for (const el of document.querySelectorAll('[data-tabstop]')) el.removeAttribute('data-tabstop');
  });

  const volgorde = [];
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab');
    const stop = await page.evaluate((index) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      if (el.hasAttribute('data-tabstop')) return { rond: true };
      el.setAttribute('data-tabstop', String(index));
      const s = getComputedStyle(el);
      return {
        index,
        tag: el.tagName.toLowerCase(),
        naam: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
        tabindex: el.getAttribute('tabindex'),
        gefocust: `${s.outlineStyle}|${s.outlineWidth}|${s.outlineColor}|${s.boxShadow}`,
      };
    }, i);
    if (stop === null) break;      // terug op body: de cyclus is rond
    if (stop.rond) break;          // dit element hadden we al
    volgorde.push(stop);
  }

  const ongefocust = await page.evaluate(() => {
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
    const uit = {};
    for (const el of document.querySelectorAll('[data-tabstop]')) {
      const s = getComputedStyle(el);
      uit[el.getAttribute('data-tabstop')] = `${s.outlineStyle}|${s.outlineWidth}|${s.outlineColor}|${s.boxShadow}`;
    }
    return uit;
  });

  const problemen = [];
  for (const stop of volgorde) {
    if (ongefocust[String(stop.index)] === stop.gefocust) {
      problemen.push(`geen zichtbare focus: <${stop.tag}> "${stop.naam || '(zonder tekst)'}"`);
    }
    if (stop.tabindex && Number(stop.tabindex) > 0) {
      problemen.push(`positieve tabindex (${stop.tabindex}) op <${stop.tag}> "${stop.naam}" — breekt de documentvolgorde`);
    }
  }
  return { stops: volgorde.length, volgorde, problemen };
}

/**
 * De build-map van de harness. Letterlijk, geen vlag: `next build` wíst zijn doelmap, dus
 * vrije invoer is een wisser. `.next` blijft van de dev-server en van de productie-build.
 */
const DIST = '.next-harness';

async function main() {
  if (!(await portFree(PORT))) {
    console.error(`✗ Poort ${PORT} is bezet. Deze harness start zijn eigen server en mag`);
    console.error(`  nooit een draaiend proces overnemen. Stop dat proces of geef --port=<vrij>.`);
    process.exit(2);
  }

  // Eigen build-map. `.next` is van de dev-server op 3003 en van een eventuele
  // productie-build; `next build` maakt zijn doelmap eerst leeg, dus daar bouwen betekent
  // die server slopen. Een vaste naam en geen vrije invoer: de waarde wordt gewist.
  const env = { ...process.env, NEXT_DIST_DIR: DIST };

  // De nulmeting hoort VÓÓR de handeling die ze moet betrappen. Gemeten 2026-09-09: een
  // eerdere versie las hem er ná uit en bleef groen terwijl de build wél in `.next` was
  // beland — een nulmeting na de handeling meet niets.
  //
  // En niet de mtime van de máp: die beweegt alleen bij toevoegen of verwijderen van een
  // direct kind. `BUILD_ID` is de inhoud zelf en krijgt bij elke build een nieuwe waarde,
  // dus dát is het anker.
  const gedeeld = join(APP, '.next');
  const buildId = (map) => {
    try {
      return readFileSync(join(map, 'BUILD_ID'), 'utf8').trim();
    } catch {
      return null;
    }
  };
  const gedeeldVoor = buildId(gedeeld);

  // `next build` met een eigen NEXT_DIST_DIR herschrijft twee GETRACKTE bestanden zodat ze
  // naar díe build-map wijzen: `next-env.d.ts` en `tsconfig.json`. Deze harness is een
  // meetinstrument, en een instrument dat de bron muteert waaruit je commit, legt die
  // mutatie vast in je volgende commit. Gemeten 2026-09-16: twee probe-runs lieten
  // `next-env.d.ts` naar `.next-planprobe` wijzen in een verder schone tree.
  //
  // Inhoud bewaren en terugzetten, niet `git checkout`: dat laatste zou een échte
  // openstaande wijziging aan tsconfig.json weggooien.
  const BRONBESTANDEN = ['next-env.d.ts', 'tsconfig.json'];
  const bewaard = new Map();
  for (const naam of BRONBESTANDEN) {
    try {
      bewaard.set(naam, readFileSync(join(APP, naam), 'utf8'));
    } catch {
      /* bestaat niet — dan valt er ook niets te herstellen */
    }
  }
  const herstelBronbestanden = () => {
    for (const [naam, inhoud] of bewaard) {
      try {
        if (readFileSync(join(APP, naam), 'utf8') !== inhoud) writeFileSync(join(APP, naam), inhoud);
      } catch {
        /* onleesbaar of weg; niets te doen */
      }
    }
  };
  process.on('exit', herstelBronbestanden);

  const idBestand = join(APP, DIST, 'BUILD_ID');
  const bron = nieuwsteBron();
  if (HERGEBRUIK && existsSync(idBestand) && statSync(idBestand).mtimeMs > bron) {
    console.log(`→ Build hergebruikt: ${DIST}/BUILD_ID (${new Date(statSync(idBestand).mtimeMs).toISOString()}) is nieuwer dan de nieuwste bron (${new Date(bron).toISOString()})`);
  } else {
    if (HERGEBRUIK) console.log('→ --hergebruik-build: de build is ouder dan de bron (of ontbreekt) — toch bouwen');
    console.log(`→ Verse build in ${DIST}`);
    await run('npx', ['next', 'build'], { env });
  }

  // "Bouwt in .next-harness" mag niet van de vlag komen: als `distDir` niet zou werken,
  // schrijft de build gewoon in `.next` en zegt de log iets anders dan er gebeurde.
  if (!existsSync(join(APP, DIST))) {
    console.error(`✗ ${DIST} bestaat niet na de build — distDir werkt niet zoals verwacht.`);
    process.exit(2);
  }

  console.log(`→ Server op ${BASE} (uit ${DIST})`);
  const server = spawn('npx', ['next', 'start', '--port', String(PORT)], {
    cwd: APP, stdio: 'ignore', detached: false, env,
  });
  const stop = () => { try { server.kill('SIGTERM'); } catch { /* al weg */ } };
  process.on('exit', stop);
  process.on('SIGINT', () => { stop(); process.exit(130); });

  if (!(await waitForServer(BASE))) {
    stop();
    console.error('✗ Server kwam niet op binnen 60s.');
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !HEADED });
  const ctx = await browser.newContext();

  // Alles buiten de eigen origin wordt afgebroken en geteld.
  const leaks = new Set();
  // Eigen origins: de hoofdserver, plus wat een module er via `extraServer` bij start (een tweede
  // `next start` uit dezelfde build, met een kapotte database om de foutpagina op te wekken).
  const eigenOrigins = new Set([BASE]);
  await ctx.route('**/*', (route) => {
    const url = route.request().url();
    if ([...eigenOrigins].some((o) => url.startsWith(o)) || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    leaks.add(new URL(url).origin);
    return route.abort();
  });

  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));

  if (doe('routes')) console.log('→ Routes');
  for (const route of doe('routes') ? ROUTES : []) {
    const res = await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
    const status = res?.status() ?? 0;
    // Alleen 4xx/5xx is een fout. Een 3xx is dat niet: de Next App Router beantwoordt een
    // `redirect()` met een 307 **mét** HTML-body die client-side doorstuurt, zonder
    // Location-header. Gemeten op partner-portal — `/` en `/partnerzone` gaven 307 terwijl
    // ze gewoon renderen. Wie op de statuscode oordeelt meldt daar twee defecten die er
    // niet zijn; het oordeel hoort te gaan over wat er uiteindelijk op het scherm staat.
    if (status >= 400) { fail(`${route} → HTTP ${status}`); continue; }
    // `domcontentloaded` is te vroeg voor een client-gerenderde app: die heeft dan nog
    // niets in de body staan. Gemeten op enviro-mobile — daar leverde het 0 tekens op een
    // pagina die na de client-side redirect gewoon rendert, dus een vals "wit scherm" op
    // een werkende app. Wachten tot het netwerk stil is; blijft dat uit (long polling,
    // service worker), dan lezen we alsnog wat er staat in plaats van te blijven hangen.
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const text = (await page.locator('body').innerText().catch(() => '')).trim();
    const landed = new URL(page.url()).pathname;
    const where = landed === route ? `${route}` : `${route} → ${landed}`;
    if (text.length < 20) fail(`${where} rendert vrijwel niets (${text.length} tekens)`);
    else ok(`${where} → ${status}, ${text.length} tekens tekst`);

    toetsNavigatie(await navigatie(page), route, route, { ok, fail });

    // "Sync nu" is een actie van één pagina, geen navigatie: hij hoort in `main` te staan en niet
    // in de balk. Beide kanten tellen — alleen "0 in de balk" is ook waar als de knop nergens meer
    // staat.
    if (route === '/') {
      const sync = await page.evaluate(() => ({
        balk: document.querySelectorAll('header [data-sync-knop]').length,
        pagina: document.querySelectorAll('main [data-sync-knop]').length,
      }));
      if (sync.balk !== 0 || sync.pagina !== 1) fail(`/ sync-knop: ${sync.balk} in de balk, ${sync.pagina} in de pagina — verwacht 0 en 1`);
      else ok('/ sync-knop: 0 in de balk, 1 in de pagina');
    }

    const koppen = await kopstructuur(page);
    if (koppen.problemen.length) for (const p of koppen.problemen) fail(`${route} kopstructuur: ${p}`);
    else ok(`${route} kopstructuur: ${koppen.aantal} koppen, niveaus ${koppen.niveaus.map((n) => 'h' + n).join(' → ')}`);

    // De h1 van `/` is `sr-only` (de balk zegt "JobRadar" al), die van de andere twee staat in
    // beeld. Op de breedte meten en niet op de klasse: `sr-only` is een afspraak, 1 px is een feit.
    const h1Breed = await page.locator('h1').first().evaluate((el) => Math.round(el.getBoundingClientRect().width));
    const hoortZichtbaar = route !== '/';
    if (hoortZichtbaar && h1Breed <= 1) fail(`${route}: de h1 is ${h1Breed}px breed — hij hoort in beeld te staan`);
    else if (!hoortZichtbaar && h1Breed > 1) fail(`${route}: de h1 is ${h1Breed}px breed — op het dashboard hoort hij onzichtbaar te zijn, de balk draagt het wordmerk`);
    else ok(`${route}: h1 ${hoortZichtbaar ? 'zichtbaar' : 'onzichtbaar'} (${h1Breed}px breed)`);

    const tb = await toetsenbord(page);
    if (tb.problemen.length) for (const p of tb.problemen) fail(`${route} toetsenbord: ${p}`);
    else ok(`${route} toetsenbord: ${tb.stops} stops, elk met zichtbare focus`);
    notes.push(`${route} tab-volgorde: ${tb.volgorde.map((s) => `${s.tag}${s.naam ? `(${s.naam.slice(0, 18)})` : ''}`).join(' → ') || '(geen)'}`);

    // De balk staat in de layout, dus vóór de inhoud van elke route — op élke route dezelfde
    // drie eerste stops. Op de naam en niet alleen op de tag: drie willekeurige links vooraan
    // zouden anders ook slagen.
    const eerste = tb.volgorde.slice(0, 3).map((s) => `${s.tag}:${s.naam}`).join(' → ');
    const verwachteStops = 'a:Radar → a:Plan → a:Instellingen';
    if (eerste !== verwachteStops) fail(`${route} tab-volgorde: eerste drie stops "${eerste}", verwacht "${verwachteStops}"`);
    else ok(`${route} tab-volgorde: de balk is de eerste drie stops`);

    const namen = await naamloos(page);
    const { rest, uitzondering } = naamUitzonderingen(route, namen.zonder);
    if (namen.totaal === 0) fail(`${route} namen: nul bedienbare elementen in de toegankelijkheidsboom — dit meet niets`);
    else if (rest.length) fail(`${route} namen: ${rest.length} van ${namen.totaal} bedienbare elementen zonder naam (${rest.slice(0, 4).map((z) => `${z.rol} ${z.wat}`).join('; ')})`);
    else ok(`${route} namen: ${namen.totaal} bedienbare elementen, elk met een naam${uitzondering ? ` (+ ${uitzondering} uitzondering)` : ''}`);
    if (uitzondering !== 0) fail(`${route} namen: ${uitzondering} uitzondering(en) — sinds fase 4a hoort naamUitzonderingen() er geen te maken`);
    if (SHOT) {
      const name = route === '/' ? 'index' : route.replace(/\//g, '-').replace(/^-/, '');
      const file = resolve(process.cwd(), `${SHOT}/${name}.png`);
      await page.screenshot({ path: file, fullPage: true });
      ok(`render vastgelegd: ${file}`);

      if (SMAL) {
        await page.setViewportSize({ width: SMAL, height: 900 });
        await page.waitForTimeout(300);
        const smalFile = resolve(process.cwd(), `${SHOT}/${name}-${SMAL}.png`);
        await page.screenshot({ path: smalFile, fullPage: true });
        // Horizontaal scrollen is het defect dat een smalle opname hoort te vangen, en het
        // is meetbaar — dus meten we het in plaats van er alleen naar te kijken.
        const breed = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        const teBreed = breed.scroll > breed.client + 1;
        if (teBreed && SMAL_ROUTES.includes(route)) {
          fail(`${route} op ${SMAL}px: scrollWidth ${breed.scroll} > ${breed.client} — horizontale scrollbalk`);
        } else if (teBreed) {
          notes.push(`${route} op ${SMAL}px: ${breed.scroll} > ${breed.client} — loopt over, maar deze route is geen smal doelwit`);
        } else {
          ok(`${route} op ${SMAL}px: geen horizontale overloop (${breed.scroll} ≤ ${breed.client})`);
        }
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.waitForTimeout(300);
      }
    }
  }

  // De randgevallen van de balk: een querystring en een hash horen de markering niet uit te
  // zetten (`usePathname` geeft het pad zonder allebei, maar dat is een eigenschap van een
  // bibliotheek en geen meting), en op een onbekende route hoort de balk er gewoon te staan —
  // juist daar wil je weten waar je heen kunt.
  if (doe('navigatie')) {
    console.log('→ Navigatie (randgevallen)');
    const gevallen = [
      { url: '/?tab=leads&status=alle', pad: '/', waarom: 'querystring' },
      { url: '/instellingen#bedrijfsplan', pad: '/instellingen', waarom: 'hash' },
      // Geen aria-current: een onbekende route ís geen van de drie. De balk hoort er wél te staan,
      // dus `verwachtPad` is hier niet van toepassing en de telling moet 0 zijn, niet 1.
      { url: '/bestaat-niet-' + Date.now(), pad: null, waarom: '404', huidig: 0 },
    ];
    for (const geval of gevallen) {
      const foutenVoor = consoleErrors.length;
      await page.goto(BASE + geval.url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      if (geval.waarom === '404') {
        // Deze 404 vragen we zelf aan; alleen díe melding eruit, de rest blijft staan — anders
        // dekt dit geval elke consolefout af die toevallig in hetzelfde venster valt.
        const venster = consoleErrors.splice(foutenVoor);
        const geforceerd = venster.filter((t) => /status of 404/.test(t));
        consoleErrors.push(...venster.filter((t) => !/status of 404/.test(t)));
        notes.push(`navigatie (404): ${geforceerd.length} geforceerde 404-melding(en) gefilterd, ${venster.length - geforceerd.length} andere behouden`);
      }
      const nav = await navigatie(page);
      if (geval.huidig === 0) {
        if (!nav.balk) fail(`navigatie (${geval.waarom}): geen <header> op ${geval.url}`);
        else if (nav.links !== 3) fail(`navigatie (${geval.waarom}): ${nav.links} links in de balk op ${geval.url}, verwacht 3`);
        else if (nav.huidig !== 0) fail(`navigatie (${geval.waarom}): ${nav.huidig} van ${nav.links} links met aria-current op ${geval.url}, verwacht 0 — deze route is geen van de drie`);
        else ok(`navigatie (${geval.waarom}): 3 links, 0 van 3 met aria-current op ${geval.url}`);
      } else {
        toetsNavigatie(nav, `navigatie (${geval.waarom})`, geval.pad, { ok, fail });
      }
    }

    // De balk op 400 px. Bewust de balk en niet de route: `/` loopt daar met zijn kaartengrid
    // sowieso over (gemeten 480 > 400) en is geen smal doelwit — mobiel staat als verworpen in
    // BACKLOG. Wat deze balk wél moet kunnen, is zelf niet overlopen, op élke route.
    await page.setViewportSize({ width: 400, height: 900 });
    for (const route of ROUTES) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      const b = await page.evaluate(() => {
        const balk = document.querySelector('header');
        if (!balk) return null;
        // De inhoud van de balk tegen de breedte van het venster: een `header` die zelf meegroeit
        // met een te breed kind meldt gelijke waarden en zou dit stil laten passeren.
        const kinderen = [...balk.querySelectorAll('*')].map((e) => Math.ceil(e.getBoundingClientRect().right));
        return { rechts: Math.max(0, ...kinderen), venster: document.documentElement.clientWidth };
      });
      if (!b) fail(`navigatie (400px): geen <header> op ${route}`);
      else if (b.rechts > b.venster) fail(`navigatie (400px): de balk op ${route} loopt tot ${b.rechts}px in een venster van ${b.venster}px`);
      else ok(`navigatie (400px): de balk op ${route} past (${b.rechts} ≤ ${b.venster})`);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
  }

  // Eén echte interactie. Volgorde is bewust: een `select` wijzigen is overal veilig,
  // een interne link ook. Knoppen worden NIET blind aangeklikt — op dit dashboard heet er
  // één "Sync nu" en die haalt externe data op. Dat zou de origin-guard hierboven terecht
  // als lek tellen en de run laten falen op iets dat geen defect is.
  if (doe('interactie')) {
  console.log('→ Interactie (echt aangedreven, geen goto)');
  // De route-lus eindigt op de láátste route. Zonder deze regel zou de interactie
  // meeverhuizen naar /instellingen zodra daar een route bijkomt — daar is geen
  // status-select, dus hij zou stil terugvallen op een linkklik en het filter niet
  // meer aandrijven. De interactie hoort op het dashboard.
  await page.goto(BASE + ROUTES[0], { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  const select = page.locator('select:visible').first();
  // Een link naar de pagina waar je al staat (het logo, meestal) bewijst niets: die
  // "navigeert" naar zichzelf en slaagt altijd. Sluit het huidige pad dus uit.
  const here = new URL(page.url()).pathname;
  const link = page.locator(`a[href^="/"]:visible:not([href="${here}"])`).first();

  if (await select.count()) {
    const options = await select.locator('option').allTextContents();
    const before = await select.inputValue();
    const values = await select.locator('option').evaluateAll((els) => els.map((e) => e.value));
    const target = values.find((v) => v !== before);
    if (target === undefined) {
      notes.push(`select heeft maar één optie (${options[0] ?? '?'}) — niet te wijzigen`);
    } else {
      await select.selectOption(target);
      const after = await select.inputValue();
      if (after === target) ok(`select gewijzigd: "${before}" → "${after}"`);
      else fail(`select nam de wijziging niet aan: bleef "${after}"`);
    }
  } else if (await link.count()) {
    const href = await link.getAttribute('href');
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    const landed = new URL(page.url()).pathname;
    if (landed === href) ok(`klik: ${here} → ${landed}`);
    else notes.push(`klik op ${href} kwam uit op ${landed} (redirect of anchor)`);
  } else {
    notes.push('geen select en geen interne link op de eerste route — interactie niet uitgereden');
  }
  }

  // ── Dashboard-triage (2026-09-17) ──────────────────────────────────────────
  // Draait op de database van de tree — de echte. Daarom: geen enkele klik die kan muteren zonder
  // dat ALLE schrijfverzoeken naar /api eerst onderschept worden, en een positieve controle dat die
  // onderschepping werkt vóór er iets aangeklikt wordt. Lezen (filters, URL, herladen) mag vrij.
  // Na elke onderschepte reeks telt de harness in de database elke status ongelijk aan `new`,
  // vóór en na: een lek van Bewaar zou een telling van alleen `dismissed` niet zien.
  if (doe('triage')) {
    console.log('→ Dashboard-triage');
    const { execFileSync } = await import('node:child_process');
    const DB = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
    const dbStand = () => {
      try {
        return execFileSync('sqlite3', ['-readonly', DB,
          "SELECT (SELECT count(*) FROM jobs WHERE job_status != 'new') || '/' || (SELECT count(*) FROM companies WHERE lead_status != 'new');",
        ]).toString().trim();
      } catch (e) {
        return `onleesbaar: ${String(e).split('\n')[0]}`;
      }
    };
    const exact = (tekst) => new RegExp(`^${tekst.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);
    const kaartMetTitel = (titel) =>
      page.locator('[role="tabpanel"]:visible .grid > div').filter({ has: page.locator('h3', { hasText: exact(titel) }) });
    const onderschep = async (antwoord) => {
      await page.route(`${BASE}/api/**`, async (route) => {
        const m = route.request().method();
        if (m === 'GET' || m === 'HEAD') return route.continue();
        if (antwoord.vertraging) await new Promise((r) => setTimeout(r, antwoord.vertraging));
        return route.fulfill({ status: antwoord.status, contentType: 'application/json', body: JSON.stringify(antwoord.body) });
      });
      const controle = await page.evaluate(async () => {
        const r = await fetch('/api/jobs/0', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' });
        return { status: r.status, body: await r.text() };
      });
      return controle.status === antwoord.status && controle.body.includes('harness');
    };
    const laad = async (pad) => {
      await page.goto(BASE + pad, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    };

    await laad('/');
    const items = await page.locator('[role="tabpanel"]:visible [data-status]').count();
    if (items === 0) {
      // Een verse tree heeft een lege database. De assen hieronder hebben dan niets om op te meten;
      // dat melden in plaats van rood te worden of te crashen (design-review 2026-09-17).
      notes.push('triage: [NIET TE VERIFIËREN — lege database, nul vacatures in de weergave] alle triage-assen overgeslagen');
    } else {
      const dbVoor = dbStand();

      // Vóór elke klik op een tabblad: de Prospects-telling mag geen "0" zijn die nog niet gemeten is.
      const prospectsTrigger = (await page.locator('[role="tab"]', { hasText: 'Prospects' }).first().innerText()).trim();
      if (/\b0\b/.test(prospectsTrigger) || !prospectsTrigger.includes('—')) fail(`triage: Prospects-tabblad toont "${prospectsTrigger}" vóór het laden, verwacht "—"`);
      else ok(`triage: Prospects-tabblad vóór het laden: "${prospectsTrigger.replace(/\s+/g, ' ')}"`);

      const status = page.locator('select[aria-label="Status"]');
      if ((await status.count()) !== 1) fail(`triage: ${await status.count()} statusfilters met aria-label "Status", verwacht 1`);
      else if ((await status.inputValue()) !== 'open') fail(`triage: statusfilter staat bij het openen op "${await status.inputValue()}", verwacht "open"`);
      else ok('triage: statusfilter staat bij het openen op Open');

      const selects = await triageSelects(page);
      if (selects.length) fail(`triage: ${selects.length} select(s) op kaarten of rijen`);
      else ok('triage: nul selects op kaarten en lage-scorerijen');

      const knoppen = await triageKnoppen(page);
      if (knoppen.totaal === 0) fail('triage: nul StatusActies in het vacaturepaneel — dit meet niets');
      else if (knoppen.fout.length) fail(`triage: ${knoppen.fout.length} van ${knoppen.totaal} items dragen niet de knoppen van hun status (${knoppen.fout.slice(0, 3)})`);
      else ok(`triage: ${knoppen.totaal} items, elk met de knoppen van zijn status (Bewaar ⇔ aria-pressed)`);

      // Tabteller = kaarten; de rijen tellen in hun eigen sectiekop.
      const kaarten = await page.locator('[role="tabpanel"]:visible .grid > div').count();
      const teller = Number((await page.locator('[role="tab"]', { hasText: 'Vacatures' }).first().innerText()).replace(/\D+/g, ''));
      if (teller !== kaarten) fail(`triage: tabblad Vacatures telt ${teller}, er staan ${kaarten} kaarten`);
      else ok(`triage: tabblad Vacatures telt de kaarten (${teller})`);

      // URL: filterwijziging zonder documentnavigatie, en terug na herladen, refresh en Back.
      const navigaties = [];
      const luister = (r) => { if (r.url().startsWith(BASE + '/') && (r.resourceType() === 'document' || r.headers()['rsc'] === '1' || r.url().includes('_rsc='))) navigaties.push(r.url()); };
      page.on('request', luister);
      await status.selectOption('dismissed');
      const bru = page.getByRole('checkbox', { name: 'Brussel' });
      if (await bru.count()) await bru.click();
      await page.locator('[role="slider"]').first().focus();
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(400);
      page.off('request', luister);
      const verwacht = JSON.stringify({ status: 'dismissed', regio: 'WVL,OVL', score: '10' });
      const urlStand = () => {
        const u = new URL(page.url());
        return JSON.stringify({ status: u.searchParams.get('status'), regio: u.searchParams.get('regio'), score: u.searchParams.get('score') });
      };
      if (urlStand() !== verwacht) fail(`triage: URL na filteren ${urlStand()}, verwacht ${verwacht}`);
      else ok(`triage: filters staan in de URL (${new URL(page.url()).search})`);
      if (navigaties.length) fail(`triage: filteren veroorzaakte ${navigaties.length} navigatie(s): ${navigaties[0]}`);
      else ok('triage: filteren zonder documentnavigatie of RSC-verzoek');

      // router.refresh() is een GET; hij schrijft niets. Vroeger zette hij de URL van bij het laden terug.
      await page.evaluate(() => window.next?.router?.refresh());
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
      if (urlStand() !== verwacht) fail(`triage: na router.refresh() is de URL ${urlStand()}, verwacht ${verwacht}`);
      else ok('triage: de URL overleeft router.refresh()');

      const selectNa = () => page.locator('select[aria-label="Status"]').inputValue();
      // De link heet sinds 2026-09-19 "Plan" en staat in de balk van de layout, niet meer in de
      // kop van het dashboard. Mét telling: `.first()` klikte stil door op de verkeerde link als
      // er meer dan één was, en dan meet dit geval niets.
      const planLink = page.getByRole('link', { name: 'Plan', exact: true });
      const planLinks = await planLink.count();
      if (planLinks !== 1) fail(`triage: ${planLinks} links "Plan" op /, verwacht 1 — de Back-check meet niets`);
      await planLink.click();
      await page.waitForURL(/\/plan/, { timeout: 10_000 }).catch(() => {});
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      await page.waitForTimeout(500);
      const naBack = { select: await selectNa(), url: urlStand() };
      if (naBack.select !== 'dismissed' || naBack.url !== verwacht) fail(`triage: na /plan en Back ${JSON.stringify(naBack)}`);
      else ok('triage: na /plan en Back staan filter én URL nog op de gefilterde stand');

      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
      const terug = {
        status: await selectNa(),
        bru: await page.getByRole('checkbox', { name: 'Brussel' }).getAttribute('data-state'),
        score: await page.locator('[role="slider"]').first().getAttribute('aria-valuenow'),
      };
      if (terug.status !== 'dismissed' || terug.bru !== 'unchecked' || terug.score !== '10') fail(`triage: na herladen ${JSON.stringify(terug)}`);
      else ok('triage: na herladen staan status, regio en score terug');

      // Lage score: dicht, telling klopt, rijen compact, geen kaart onder de grens, geen badge in rijen.
      await laad('/?status=alle');
      const sectie = page.locator('[data-lage-score]');
      if ((await sectie.count()) !== 1) {
        notes.push('triage: geen sectie "Score onder 10" — geen vacatures onder de grens in deze database');
      } else {
        const knop = sectie.locator('h3 button[aria-expanded]');
        const telling = parseInt((await sectie.locator('[data-telling]').innerText()).replace(/\D+/g, ''), 10);
        const naam = (await knop.innerText()).replace(/\s+/g, ' ').trim();
        const dicht = (await knop.getAttribute('aria-expanded')) === 'false' && (await sectie.locator('li:visible').count()) === 0;
        await knop.click();
        const open = (await knop.getAttribute('aria-expanded')) === 'true';
        const zichtbaar = await sectie.locator('li:visible').count();
        if (!dicht) fail('triage: "Score onder 10" is niet dicht bij het laden');
        else if (!open || zichtbaar !== telling) fail(`triage: na openen ${zichtbaar} rijen zichtbaar, kop zegt ${telling}`);
        else ok(`triage: "Score onder 10" dicht bij het laden, na openen ${zichtbaar} = ${telling} rijen`);
        if (!/^Score onder 10 · \d+ vacatures?$/.test(naam)) fail(`triage: sectiekop leest "${naam}"`);
        else ok(`triage: sectiekop "${naam}"`);
        const hoogte = await sectie.locator('li:visible').evaluateAll((li) => Math.max(...li.map((l) => Math.round(l.getBoundingClientRect().height))));
        if (hoogte > 36) fail(`triage: een lage-scorerij is ${hoogte} px hoog, verwacht ≤ 36`);
        else ok(`triage: lage-scorerijen zijn compact (max ${hoogte} px)`);
        const badges = await sectie.locator('[data-nieuw], :text-is("nieuw")').count();
        if (badges) fail(`triage: ${badges} nieuw-badge(s) in de lage-scorerijen`);
        else ok('triage: nul nieuw-badges onder de grens');
      }
      const kaartScores = await page.locator('[role="tabpanel"]:visible .grid > div').evaluateAll((k) => k.map((x) => Number(x.querySelector('.tabular-nums')?.textContent ?? 'NaN')));
      const onderGrens = kaartScores.filter((s) => !(s >= 10));
      if (kaartScores.length === 0) notes.push('triage: geen kaarten vanaf score 10 in deze database');
      else if (onderGrens.length) fail(`triage: ${onderGrens.length} van ${kaartScores.length} kaarten scoren onder 10 (${onderGrens.slice(0, 3)})`);
      else ok(`triage: ${kaartScores.length} kaarten, alle vanaf score 10`);
      const nieuw = await page.locator('[data-nieuw]').evaluateAll((els) => ({ n: els.length, gevuld: els.filter((e) => getComputedStyle(e).backgroundColor !== 'rgba(0, 0, 0, 0)').length }));
      if (nieuw.n === 0) notes.push('triage: geen nieuw-badges op kaarten — "outline" niet gemeten deze run');
      else if (nieuw.gevuld) fail(`triage: ${nieuw.gevuld} van ${nieuw.n} nieuw-badges zijn gevuld`);
      else ok(`triage: nieuw-badges zijn outline (${nieuw.n} gemeten)`);

      // Meta-rij: geen overloop en geen overlap met "Bekijk", op 1280 én 1024 px.
      for (const breedte of [1280, 1024]) {
        await page.setViewportSize({ width: breedte, height: 900 });
        await page.waitForTimeout(300);
        const meta = await page.locator('[data-meta]').evaluateAll((els) => els.map((e) => {
          const link = e.parentElement?.querySelector('a');
          const r = e.getBoundingClientRect();
          const l = link?.getBoundingClientRect();
          return { overloop: e.scrollWidth > e.clientWidth + 1, overlap: Boolean(l && r.right > l.left + 1), hoogte: Math.round(r.height) };
        }));
        const slecht = meta.filter((m) => m.overloop || m.overlap);
        if (meta.length === 0) notes.push(`triage: geen meta-rijen op ${breedte} px`);
        else if (slecht.length) fail(`triage: op ${breedte} px ${slecht.length} van ${meta.length} meta-rijen met overloop of overlap met "Bekijk"`);
        else ok(`triage: op ${breedte} px ${meta.length} meta-rijen zonder overloop of overlap (max ${Math.max(...meta.map((m) => m.hoogte))} px hoog)`);
      }
      await page.setViewportSize({ width: 1280, height: 720 });

      const bronnen = Number(execFileSync('sqlite3', ['-readonly', DB, 'SELECT count(DISTINCT source) FROM jobs;']).toString().trim());
      const chips = await page.locator('[data-bron]').count();
      if (bronnen <= 1 && chips > 0) fail(`triage: ${chips} bronchips terwijl er ${bronnen} bron is`);
      else if (bronnen > 1 && chips === 0 && kaartScores.length) fail(`triage: geen bronchips terwijl er ${bronnen} bronnen zijn`);
      else ok(`triage: ${chips} bronchips bij ${bronnen} bron(nen)`);

      // Lege grid: een zoekterm die alleen een lage-scorevacature raakt.
      const laagTitels = await page.locator('[data-lage-score] li .font-medium').allInnerTexts();
      let leegGemeten = false;
      for (const titel of laagTitels.slice(0, 8)) {
        await laad(`/?status=alle&zoek=${encodeURIComponent(titel)}`);
        if ((await page.locator('[role="tabpanel"]:visible .grid > div').count()) > 0) continue;
        leegGemeten = true;
        if ((await page.locator('[data-geen-kaarten]').count()) !== 1) fail(`triage: zoekterm "${titel}" geeft geen kaarten maar ook geen diagnose`);
        else ok(`triage: zonder kaarten vanaf 10 staat de diagnose er ("${titel.slice(0, 30)}")`);
        break;
      }
      if (!leegGemeten) notes.push('triage: geen zoekterm gevonden die alleen lage scores raakt — lege grid niet gemeten');

      // Voorwaartse client-navigatie mét query — de sprong "Open in dashboard" vanuit /plan. Een Link
      // doet `router.push`; de URL wordt pas in de commit gezet, dus een beginstand die de adresbalk
      // leest, kan hier nog /plan zien (criticus 2026-09-17). Alleen lezen: navigeren muteert niets.
      {
        const naam = execFileSync('sqlite3', ['-readonly', DB, 'SELECT company_name FROM companies ORDER BY id LIMIT 1;']).toString().trim();
        if (!naam) {
          notes.push('triage: geen lead in de database — voorwaartse navigatie met query niet gemeten');
        } else {
          await laad('/plan');
          const doel = `/?tab=leads&zoek=${encodeURIComponent(naam)}`;
          await page.evaluate((u) => window.next?.router?.push(u), doel);
          await page.waitForURL((u) => u.pathname === '/', { timeout: 10_000 }).catch(() => {});
          await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
          await page.waitForTimeout(600);
          const stand = {
            tab: (await page.locator('[role="tab"][data-state="active"]').first().innerText().catch(() => '')).replace(/\s+\d+$|\s+—$/, '').trim(),
            zoek: await page.locator('input[type="search"]').first().inputValue().catch(() => '(geen veld)'),
            url: new URL(page.url()).search,
          };
          if (stand.tab !== 'Leads' || stand.zoek !== naam || !stand.url.includes('tab=leads')) fail(`triage: navigatie naar ${doel} gaf ${JSON.stringify(stand)}`);
          else ok(`triage: voorwaartse navigatie met query landt op Leads met "${naam}" (${stand.url})`);
        }
      }

      // Doorklik vanaf een lead en herladen: de lijst hoort op de bedrijfssleutel te blijven matchen.
      // Alleen lezen — "toon deze vacatures" verandert niets in de database.
      await laad('/?tab=leads');
      const doorklik = page.locator('[role="tabpanel"]:visible button', { hasText: 'toon deze vacatures' }).first();
      if (!(await doorklik.count())) {
        notes.push('triage: geen lead met "toon deze vacatures" — doorklik niet gemeten');
      } else {
        await doorklik.click();
        // Sinds fase 3 (2026-09-17) komt de doorklik-telling 400 ms na de klik in de filtertelling, en
        // bij herladen blijft die regio bewust leeg (geen aankondiging bij het laden). De vorige vorm
        // pakte de eerste sr-only live-regio — dat werd de lege sync-melding — en vergeleek de melding
        // na herladen. Wat "overleeft herladen" betekent, staat in de URL en in de lijst: via=bedrijf,
        // dezelfde zoekterm en precies dezelfde items. De melding vóór herladen is de positieve controle
        // dat de doorklik iets filterde, en zijn getal moet de lijst tellen.
        const telling = page.locator('[data-filter-telling]');
        await page.waitForFunction(() => (document.querySelector('[data-filter-telling]')?.textContent ?? '').trim() !== '', null, { timeout: 3_000 }).catch(() => {});
        const stand = async () => {
          const u = new URL(page.url());
          return {
            via: u.searchParams.get('via'),
            zoek: u.searchParams.get('zoek'),
            // Kaarten én (ingeklapte) lage-scorerijen: samen de gefilterde lijst.
            items: (await page.locator('[role="tabpanel"]:visible [data-item]').evaluateAll((els) => els.map((e) => e.getAttribute('data-item')))).sort(),
          };
        };
        const tellingen = await telling.count();
        const voor = { ...(await stand()), melding: tellingen === 1 ? (await telling.innerText()).trim() : '' };
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
        const na = await stand();
        const getal = Number(voor.melding.match(/^(\d+) vacatures? van /)?.[1] ?? NaN);
        if (tellingen !== 1) fail(`triage: ${tellingen} filtertellingen ([data-filter-telling]), verwacht 1 — doorklik niet gemeten`);
        else if (voor.via !== 'bedrijf') fail(`triage: na de doorklik staat via=${voor.via} in de URL, verwacht "bedrijf"`);
        else if (Number.isNaN(getal) || voor.items.length === 0) fail(`triage: na de doorklik geen melding "N vacatures van …" of nul items ("${voor.melding}", ${voor.items.length}) — dit meet niets`);
        else if (getal !== voor.items.length) fail(`triage: de doorklik-melding zegt ${getal}, de lijst telt ${voor.items.length} items`);
        else if (na.via !== voor.via || na.zoek !== voor.zoek || JSON.stringify(na.items) !== JSON.stringify(voor.items)) fail(`triage: na herladen ${JSON.stringify({ via: na.via, zoek: na.zoek, items: na.items.length })}, vóór ${JSON.stringify({ via: voor.via, zoek: voor.zoek, items: voor.items.length })}${JSON.stringify(na.items) !== JSON.stringify(voor.items) ? ' — andere items' : ''}`);
        else ok(`triage: doorklik overleeft herladen (via=bedrijf, zoek "${voor.zoek}", dezelfde ${voor.items.length} items; vóór herladen "${voor.melding}")`);
      }

      // ── Onderschept met een GESLAAGD antwoord: de client-toestand zonder de database te raken ──
      await laad('/');
      if (!(await onderschep({ status: 200, body: { ok: true, harness: 'onderschept' } }))) {
        fail('triage: onderschepping (geslaagd antwoord) niet bevestigd — kliks overgeslagen');
      } else {
        ok('triage: positieve controle — schrijfverzoeken worden onderschept (200)');

        // Bewaar: beide standen.
        const eerste = page.locator('[role="tabpanel"]:visible .grid > div').first();
        const titelB = (await eerste.locator('h3').innerText()).trim();
        const statusB = kaartMetTitel(titelB).locator('[data-status]');
        const bewaar = statusB.locator('button[aria-label^="Bewaar "]');
        await bewaar.click();
        await page.waitForTimeout(300);
        const aan = { pressed: await bewaar.getAttribute('aria-pressed'), status: await statusB.getAttribute('data-status'), fill: await bewaar.locator('svg').evaluate((s) => getComputedStyle(s).fill) };
        await bewaar.click();
        await page.waitForTimeout(300);
        const uit = await bewaar.getAttribute('aria-pressed');
        if (aan.pressed !== 'true' || aan.status !== 'saved' || aan.fill === 'none') fail(`triage: na Bewaar ${JSON.stringify(aan)}`);
        else ok(`triage: Bewaar zet aria-pressed="true", data-status="saved" en vult het icoon (${aan.fill})`);
        if (uit !== 'false') fail(`triage: tweede klik op Bewaar laat aria-pressed="${uit}"`);
        else ok('triage: tweede klik op Bewaar zet aria-pressed="false"');

        // Afwijzen met het TOETSENBORD: kaart weg uit Open, focus naar de volgende, en een melding.
        const kaartenVoor = await page.locator('[role="tabpanel"]:visible .grid > div h3').allInnerTexts();
        const titelA = kaartenVoor[0]?.trim();
        const volgende = kaartenVoor[1]?.trim();
        if (!titelA || !volgende) {
          notes.push('triage: minder dan twee kaarten — focus na Afwijzen niet gemeten');
        } else {
          await kaartMetTitel(titelA).locator('button[aria-label^="Afwijzen "]').focus();
          await page.keyboard.press('Enter');
          await page.waitForTimeout(600);
          const inOpen = await kaartMetTitel(titelA).count();
          const focus = await page.evaluate(() => ({
            body: document.activeElement === document.body,
            titel: document.activeElement?.closest('[data-item]')?.querySelector('h3')?.textContent?.trim() ?? null,
          }));
          const melding = (await page.locator('[data-status-melding]').innerText()).trim();
          if (inOpen !== 0) fail(`triage: "${titelA}" staat na Afwijzen nog in de open-weergave`);
          else ok('triage: Afwijzen haalt de kaart uit de open-weergave');
          if (focus.body) fail('triage: na Afwijzen met het toetsenbord staat de focus op body');
          else ok('triage: na Afwijzen staat de focus niet op body');
          if (focus.titel !== volgende) fail(`triage: focus na Afwijzen staat in "${focus.titel}", verwacht "${volgende}"`);
          else ok('triage: de focus staat in de volgende kaart');
          if (melding !== `${titelA} afgewezen`) fail(`triage: live-melding "${melding}", verwacht "${titelA} afgewezen"`);
          else ok('triage: een live-regio meldt "<titel> afgewezen"');

          await page.locator('select[aria-label="Status"]').selectOption('dismissed');
          await page.waitForTimeout(300);
          if ((await kaartMetTitel(titelA).locator('button[aria-label^="Heropen "]').count()) !== 1) fail(`triage: "${titelA}" staat niet met Heropen onder Afgewezen`);
          else ok('triage: onder Afgewezen staat hij, met Heropen (positieve controle op Open)');
        }

        // Leads: hetzelfde pad op het tweede tabblad.
        await laad('/?tab=leads');
        const lead = page.locator('[role="tabpanel"]:visible .grid > div').first();
        if (!(await lead.count())) {
          notes.push('triage: geen leads in de weergave — leadpaneel niet gemeten');
        } else if (!(await onderschep({ status: 200, body: { ok: true, harness: 'onderschept' } }))) {
          fail('triage: onderschepping op het leadpaneel niet bevestigd — klik overgeslagen');
        } else {
          const naam = (await lead.locator('h3').first().innerText()).trim();
          await lead.locator('button[aria-label^="Afwijzen "]').click();
          await page.waitForTimeout(500);
          const nogOpen = await page.locator('[role="tabpanel"]:visible .grid > div h3', { hasText: exact(naam) }).count();
          await page.locator('select[aria-label="Status"]').selectOption('dismissed');
          await page.waitForTimeout(300);
          const onderAfgewezen = await page.locator('[role="tabpanel"]:visible .grid > div').filter({ has: page.locator('h3', { hasText: exact(naam) }) }).locator('button[aria-label^="Heropen "]').count();
          if (nogOpen !== 0 || onderAfgewezen !== 1) fail(`triage: lead "${naam}" — nog open ${nogOpen}, onder Afgewezen met Heropen ${onderAfgewezen}`);
          else ok('triage: Afwijzen op een lead haalt hem uit Open en zet hem onder Afgewezen met Heropen');
        }
        await page.unroute(`${BASE}/api/**`);
      }

      // ── Onderschept met een 500: fout en loading ───────────────────────────────
      await laad('/');
      const foutenVoor = consoleErrors.length;
      if (!(await onderschep({ status: 500, vertraging: 600, body: { ok: false, error: 'harness-onderschept' } }))) {
        fail('triage: onderschepping (500) niet bevestigd — klik overgeslagen');
      } else {
        ok('triage: positieve controle — schrijfverzoeken worden onderschept (500)');
        const eerste = page.locator('[role="tabpanel"]:visible .grid > div').first();
        const titel = (await eerste.locator('h3').innerText()).trim();
        const item = kaartMetTitel(titel).locator('[data-status]');
        const voor = await item.getAttribute('data-status');
        const afwijzen = item.locator('button[aria-label^="Afwijzen "]');
        await afwijzen.click();
        await page.waitForTimeout(150);
        const bezig = await afwijzen.getAttribute('aria-disabled');
        await page.waitForTimeout(900);
        const nogDaar = (await item.count()) === 1;
        const alert = nogDaar ? await item.locator('[role="alert"]').innerText().catch(() => '') : '';
        const na = nogDaar ? await item.getAttribute('data-status') : '(kaart verdwenen)';
        if (bezig !== 'true') fail(`triage: Afwijzen draagt aria-disabled="${bezig}" tijdens de PATCH`);
        else ok('triage: Afwijzen draagt aria-disabled tijdens de PATCH');
        if (!alert.includes('harness-onderschept')) fail(`triage: geen alert bij het item na een 500 (kreeg "${alert}")`);
        else ok('triage: een 500 toont een alert bij het item');
        if (na !== voor) fail(`triage: status veranderde van ${voor} naar ${na} na een mislukte PATCH`);
        else ok(`triage: status blijft "${voor}" na een mislukte PATCH`);
      }
      await page.unroute(`${BASE}/api/**`);
      const inVenster = consoleErrors.splice(foutenVoor);
      const geforceerd = inVenster.filter((m) => /status of 500/.test(m));
      consoleErrors.push(...inVenster.filter((m) => !/status of 500/.test(m)));
      notes.push(`triage: ${geforceerd.length} geforceerde 500-melding(en) uit de console gefilterd, ${inVenster.length - geforceerd.length} andere behouden`);

      const dbNa = dbStand();
      if (dbNa !== dbVoor) fail(`triage: de database veranderde (niet-new vacatures/leads ${dbVoor} → ${dbNa}) — een onderschepping lekte`);
      else ok(`triage: de database is ongemoeid (niet-new vacatures/leads ${dbNa}, vóór én na)`);
    }
  }

  // ── Prospects-tabblad ──────────────────────────────────────────────────────
  // Dit tabblad haalt zijn eigen pagina op en rendert dus pas na een klik. Zonder deze stap
  // meten de kopstructuur- en toetsenbord-passes hierboven een paneel dat nooit gemount is.
  // Een tab-trigger aanklikken is veilig: hij navigeert niet en raakt geen externe bron.
  if (doe('prospects')) {
    console.log('→ Prospects-tabblad');
    const trigger = page.locator('[role="tab"]', { hasText: 'Prospects' }).first();
    if (!(await trigger.count())) {
      notes.push('geen Prospects-tabblad gevonden — overgeslagen');
    } else {
      const antwoord = page.waitForResponse((r) => r.url().includes('/api/prospects'), { timeout: 20_000 })
        .catch(() => null);
      await trigger.click();
      const res = await antwoord;
      if (!res) {
        fail('prospects: geen antwoord van /api/prospects binnen 20s');
      } else if (res.status() >= 400) {
        fail(`prospects: /api/prospects → HTTP ${res.status()}`);
      } else {
        const body = await res.json().catch(() => null);
        ok(`prospects: HTTP ${res.status()}, ${body?.totaal ?? '?'} in totaal, spiegel ${body?.staat?.soort ?? '?'}`);
        await page.waitForTimeout(600);

        // De harde grens uit de briefing: hoogstens één pagina in de DOM.
        const kaarten = await page.locator('[role="tabpanel"]:visible h3').count();
        if (body?.staat?.soort === 'ontbreekt') {
          notes.push('prospects: geen KBO-spiegel op deze machine — kaartentelling niet zinvol');
          const melding = await page.locator('[role="tabpanel"]:visible', { hasText: 'kbo:sync' }).count();
          if (melding) ok('prospects: lege staat legt uit wat er moet gebeuren');
          else fail('prospects: geen spiegel én geen uitleg — dat is een stille nul');
        } else if (kaarten > 60) {
          fail(`prospects: ${kaarten} kaarten in de DOM, hoogstens 60 verwacht`);
        } else {
          ok(`prospects: ${kaarten} kaarten in de DOM (grens 60)`);
        }

        const koppen = await kopstructuur(page);
        if (koppen.problemen.length) for (const p of koppen.problemen) fail(`prospects kopstructuur: ${p}`);
        else ok(`prospects kopstructuur: ${koppen.aantal} koppen, niveaus ${koppen.niveaus.map((n) => 'h' + n).join(' → ')}`);

        const tb = await toetsenbord(page);
        if (tb.problemen.length) for (const p of tb.problemen) fail(`prospects toetsenbord: ${p}`);
        else ok(`prospects toetsenbord: ${tb.stops} stops, elk met zichtbare focus`);

        // ── De herkomst- en winstfilters ─────────────────────────────────────
        // Deze twee zijn interne controls: ze veranderen een querystring naar de eigen
        // origin, dus de origin-guard hierboven blijft geldig. Een `select` is het niet —
        // de herkomst is een segmented control uit knoppen — dus de select-interactie
        // eerder in deze run verhuist er niet stil naartoe.
        if (body?.staat?.soort !== 'ontbreekt') {
          // Ankeren op de ROL binnen het zichtbare paneel, niet op één attribuut: de groep
          // werd van `aria-label` naar `aria-labelledby` verbouwd, en een selector op het
          // oude attribuut vond hem toen niet meer. De rol is wat het ding ís; het label is
          // een bewering erover. Tellen hoort erbij — één radiogroup, niet "minstens één".
          const groep = page.locator('[role="tabpanel"]:visible [role="radiogroup"]');
          const aantalGroepen = await groep.count();
          if (aantalGroepen !== 1) {
            fail(`prospects: ${aantalGroepen} radiogroup(s) in het paneel, verwacht 1`);
          } else {
            // Een groep zonder toegankelijke naam is voor een schermlezer naamloos.
            const naam = await groep.evaluate((el) => {
              const via = el.getAttribute('aria-labelledby');
              return via
                ? (document.getElementById(via)?.textContent ?? '').trim()
                : (el.getAttribute('aria-label') ?? '').trim();
            });
            if (naam) ok(`prospects: de herkomst-groep heet "${naam}"`);
            else fail('prospects: de herkomst-groep heeft geen toegankelijke naam');
            const gekozen = await groep.locator('[role="radio"][aria-checked="true"]').innerText();
            if (gekozen.trim() === 'Beide') ok('prospects: herkomst staat standaard op "Beide"');
            else fail(`prospects: herkomst staat bij het laden op "${gekozen.trim()}", verwacht "Beide"`);

            // Roving tabindex: één stop in de tabvolgorde, niet drie. Dat is wat een
            // radiogroup onderscheidt van een rij losse knoppen, en het is meetbaar.
            const inTab = await groep.locator('[role="radio"][tabindex="0"]').count();
            const buitenTab = await groep.locator('[role="radio"][tabindex="-1"]').count();
            if (inTab === 1 && buitenTab === 2) ok('prospects: herkomst is één tabstop (roving tabindex 1/2)');
            else fail(`prospects: herkomst heeft ${inTab} tabstop(s) en ${buitenTab} buiten de volgorde, verwacht 1 en 2`);

            // Pijltjesbediening: de interactie-as van de briefing. Focus de gekozen optie
            // en stap één naar rechts; de selectie hoort mee te verspringen.
            await groep.locator('[role="radio"][tabindex="0"]').focus();
            await page.keyboard.press('ArrowRight');
            await page.waitForTimeout(200);
            const naPijl = (await groep.locator('[role="radio"][aria-checked="true"]').innerText()).trim();
            if (naPijl !== gekozen.trim()) ok(`prospects: pijltje verplaatst de keuze "${gekozen.trim()}" → "${naPijl}"`);
            else fail(`prospects: pijltje veranderde de keuze niet, blijft "${naPijl}"`);

            const lijstAntwoord = page
              .waitForResponse((r) => r.url().includes('/api/prospects') && r.url().includes('herkomst=csv'), { timeout: 20_000 })
              .catch(() => null);
            await groep.locator('[role="radio"]', { hasText: 'Lijst' }).click();
            const lijstRes = await lijstAntwoord;
            if (!lijstRes) {
              fail('prospects: klik op "Lijst" leverde geen verzoek met herkomst=csv');
            } else {
              const lijstBody = await lijstRes.json().catch(() => null);
              const totaalCsv = lijstBody?.totaal ?? -1;
              if (totaalCsv > 0 && totaalCsv < (body?.totaal ?? Infinity)) {
                ok(`prospects: herkomst "Lijst" versmalt ${body?.totaal} → ${totaalCsv}`);
              } else {
                fail(`prospects: herkomst "Lijst" gaf ${totaalCsv}, verwacht een kleiner getal dan ${body?.totaal}`);
              }
              // De rijen zonder KBO-tegenhanger horen gemeld te worden, niet verzwegen.
              if ((lijstBody?.zonderKbo ?? 0) > 0) {
                await page.waitForTimeout(400);
                const melding = await page
                  .locator('[role="tabpanel"]:visible', { hasText: 'niet in de KBO-spiegel' })
                  .count();
                if (melding) ok(`prospects: de ${lijstBody.zonderKbo} rijen buiten de spiegel worden gemeld`);
                else fail(`prospects: ${lijstBody.zonderKbo} rijen vallen buiten de selectie zonder melding`);
              }
            }

            // Sortering: de reden dat dit bestaat is dat de aangeleverde lijst anders
            // onvindbaar is — de CSV-bedrijven landen op rang 221+ van 2939 wanneer er op
            // oprichtingsdatum geordend wordt.
            const sorteer = page.locator('#prospect-sortering');
            if (!(await sorteer.count())) {
              fail('prospects: geen sorteerkeuze gevonden');
            } else {
              const eersteVoor = await page.locator('[role="tabpanel"]:visible h3').first().innerText();
              const sorteerAntwoord = page
                .waitForResponse((r) => r.url().includes('/api/prospects') && r.url().includes('sortering=omvang'), { timeout: 20_000 })
                .catch(() => null);
              await sorteer.selectOption('omvang');
              const sortRes = await sorteerAntwoord;
              if (!sortRes) {
                fail('prospects: sorteren op omvang leverde geen verzoek met sortering=omvang');
              } else {
                await page.waitForTimeout(600);
                const eersteNa = await page.locator('[role="tabpanel"]:visible h3').first().innerText();
                if (eersteNa !== eersteVoor) ok(`prospects: sorteren op omvang verandert de kop "${eersteVoor.trim()}" → "${eersteNa.trim()}"`);
                else fail(`prospects: sorteren op omvang liet de kop op "${eersteVoor.trim()}" staan`);
              }
            }

            // ── Het opvolgingspaneel ──────────────────────────────────────────
            // De briefing kiest een sheet boven een modal of inline uitklappen omdát de
            // kaartlijst zichtbaar blijft. Dat is dus de check: telt het grid nog evenveel
            // kaarten terwijl het paneel open staat?
            const opvolgKnop = page.locator('[role="tabpanel"]:visible button', { hasText: /^Opvolging$/ }).first();
            if (!(await opvolgKnop.count())) {
              fail('prospects: geen Opvolging-knop op de kaarten');
            } else {
              const kaartenVoor = await page.locator('[role="tabpanel"]:visible h3').count();
              const historiek = page
                .waitForResponse((r) => r.url().includes('/api/opvolging?'), { timeout: 20_000 })
                .catch(() => null);
              await opvolgKnop.click();
              const res = await historiek;
              if (!res) {
                fail('opvolging: klik vroeg geen historiek op');
              } else {
                await page.waitForTimeout(500);
                const paneel = page.locator('[role="dialog"]');
                if ((await paneel.count()) !== 1) {
                  fail(`opvolging: ${await paneel.count()} dialogen, verwacht 1`);
                } else {
                  ok('opvolging: het paneel opent als dialog');

                  // Dit onderscheidt een sheet van een modal die de lijst vervangt.
                  const kaartenNa = await page.locator('[role="tabpanel"]:visible h3').count();
                  if (kaartenNa >= kaartenVoor) ok(`opvolging: de kaartlijst blijft staan (${kaartenVoor} → ${kaartenNa})`);
                  else fail(`opvolging: kaartlijst kromp van ${kaartenVoor} naar ${kaartenNa}`);

                  const heeftFormulier = await paneel.locator('#contact-datum').count();
                  if (heeftFormulier) ok('opvolging: het formulier staat in het paneel');
                  else fail('opvolging: geen formulier in het paneel');

                  // NIET de generieke toetsenbord-pass: die zet focus op `document.body` en
                  // loopt vandaar het document af, en een modal trapt focus juist — dus die
                  // aanname geldt hier niet. Gemeten 2026-09-09: hij rapporteerde "1 stops"
                  // voor een paneel met acht bedienbare elementen, en meldde dat als groen.
                  // Voor een dialog is de trap zélf de eigenschap die telt.
                  const trap = await (async () => {
                    await paneel.locator('#contact-datum').focus();
                    const stops = [];
                    for (let i = 0; i < 20; i++) {
                      await page.keyboard.press('Tab');
                      const s = await page.evaluate(() => {
                        const el = document.activeElement;
                        if (!el) return null;
                        const dlg = el.closest('[role="dialog"]');
                        const st = getComputedStyle(el);
                        return {
                          sleutel: (el.id || el.tagName + ':' + (el.textContent ?? '').trim().slice(0, 20)),
                          binnen: !!dlg,
                          zichtbaar: st.outlineStyle !== 'none' || st.boxShadow !== 'none',
                        };
                      });
                      if (!s) break;
                      stops.push(s);
                    }
                    return stops;
                  })();

                  const uniek = new Set(trap.map((s) => s.sleutel)).size;
                  const buiten = trap.filter((s) => !s.binnen).length;
                  const zonderRing = trap.filter((s) => !s.zichtbaar).length;

                  if (uniek >= 5) ok(`opvolging: ${uniek} bedienbare elementen in het paneel`);
                  else fail(`opvolging: slechts ${uniek} bedienbare elementen — de pass meet vermoedelijk niets`);

                  if (buiten === 0) ok('opvolging: focus blijft in het paneel (trap werkt)');
                  else fail(`opvolging: focus verliet het paneel ${buiten}× — de trap lekt`);

                  if (zonderRing === 0) ok('opvolging: elke stop toont focus');
                  else
                    fail(
                      `opvolging: ${zonderRing} stop(s) zonder zichtbare focus — ` +
                        trap.filter((s) => !s.zichtbaar).map((s) => s.sleutel).join(', ')
                    );

                  await page.keyboard.press('Escape');
                  await page.waitForTimeout(400);
                  if ((await page.locator('[role="dialog"]').count()) === 0) ok('opvolging: Escape sluit het paneel');
                  else fail('opvolging: Escape sloot het paneel niet');
                }
              }
            }

            // ── De kaart ──────────────────────────────────────────────────────
            // Er is geen kaart-library en geen basemap, dus de kaart mag per constructie
            // geen enkel verzoek naar buiten doen. De origin-guard hierboven bewijst dat
            // voor de hele run; hier tellen we wat er getekend staat.
            //
            // Eerst de bron terugzetten op "Beide". De stappen hierboven laten hem op
            // "Lijst" staan, en dan opent de kaart in een toestand zónder lead-vermoedens:
            // de markervorm-checks hieronder zouden dan `0 leads → 0 ruiten` melden en
            // vacuüm slagen, en de filter-tegenproef verderop zou al in zijn eindtoestand
            // beginnen. Een check die niet meer rood kán worden is geen check.
            {
              const bronGroep = page.locator('[role="tabpanel"]:visible [role="radiogroup"]');
              if (await bronGroep.count()) {
                const beideAntwoord = page
                  .waitForResponse((r) => r.url().includes('/api/prospects'), { timeout: 20_000 })
                  .catch(() => null);
                await bronGroep.locator('[role="radio"]', { hasText: 'Beide' }).click();
                await beideAntwoord;
                await page.waitForTimeout(400);
              }
            }

            const kaartKnop = page.locator('[role="tabpanel"]:visible button', { hasText: /^Kaartweergave$/ });
            if (!(await kaartKnop.count())) {
              fail('prospects: geen kaart/lijst-toggle gevonden');
            } else {
              const kaartAntwoord = page
                .waitForResponse((r) => r.url().includes('/api/kaart'), { timeout: 20_000 })
                .catch(() => null);
              await kaartKnop.click();
              const kres = await kaartAntwoord;
              if (!kres) {
                fail('prospects: de kaart vroeg /api/kaart niet op');
              } else {
                const kbody = await kres.json().catch(() => null);
                await page.waitForTimeout(800);

                const svg = page.locator('[role="tabpanel"]:visible svg[data-kaart]');
                if ((await svg.count()) !== 1) {
                  fail(`kaart: ${await svg.count()} svg's gevonden, verwacht 1`);
                } else {
                  ok(`kaart: ${kbody?.punten?.length ?? '?'} punten uit /api/kaart`);

                  const vlakken = await svg.locator('path').count();
                  if (vlakken === 3) ok('kaart: drie provincievlakken');
                  else fail(`kaart: ${vlakken} vlakken, verwacht 3`);

                  // Elke marker is een aanklikbare groep; clusters tellen als één.
                  const markers = await svg.locator('[role="button"]').count();
                  if (markers > 0 && markers <= (kbody?.punten?.length ?? 0)) {
                    ok(`kaart: ${markers} markers voor ${kbody.punten.length} punten (clusters meegeteld als één)`);
                  } else {
                    fail(`kaart: ${markers} markers bij ${kbody?.punten?.length} punten`);
                  }

                  // Twee vormen: cirkel voor een bronadres, ruit (rect) voor een vermoeden.
                  // Twee vormen én een derde geval: een cluster waarin een vermoeden zit.
                  // Zonder die derde valt het onderscheid weg waar het het drukst is.
                  const ruiten = await svg.locator('rect').count();
                  const gestreept = await svg.locator('circle[stroke-dasharray]').count();
                  const leads = (kbody?.punten ?? []).filter((p) => p.herkomst === 'lead').length;
                  if (leads === 0 || ruiten + gestreept >= 1) {
                    ok(`kaart: ${leads} lead-punten → ${ruiten} losse ruiten + ${gestreept} gestreepte clusters`);
                  } else {
                    fail(`kaart: ${leads} lead-punten maar geen enkele afwijkende markering`);
                  }
                  // De scherpste: elk lead-punt zit óf in een ruit óf in een gestreept
                  // cluster. Anders staat een gok als feit op de kaart.
                  const gedekt = await svg.evaluate((el) => {
                    const ruit = el.querySelectorAll('rect').length;
                    let inCluster = 0;
                    for (const g of el.querySelectorAll('[role="button"]')) {
                      const label = g.getAttribute('aria-label') ?? '';
                      const m = label.match(/waarvan (\d+) op een KBO-vermoeden/);
                      if (m) inCluster += Number(m[1]);
                    }
                    return ruit + inCluster;
                  });
                  if (leads === 0 || gedekt >= leads) ok(`kaart: alle ${leads} vermoedens zijn gemarkeerd (${gedekt} gedekt)`);
                  else fail(`kaart: ${leads} vermoedens, maar slechts ${gedekt} gemarkeerd`);

                  // De kaart zit achter twee klikken, dus hij staat in geen enkele
                  // route-snapshot. Zonder deze regel is "de kaart klopt" een bewering
                  // zonder beeld.
                  if (SHOT) {
                    const pad = join(SHOT, 'prospects-kaart.png');
                    await page.locator('[role="tabpanel"]:visible').screenshot({ path: pad });
                    ok(`render vastgelegd: ${pad}`);
                  }

                  // Wat er niet op staat, hoort erbij te staan.
                  if ((kbody?.leadsZonderAdres ?? 0) > 0) {
                    const melding = await page
                      .locator('[role="tabpanel"]:visible', { hasText: 'geen adres' })
                      .count();
                    if (melding) ok(`kaart: de ${kbody.leadsZonderAdres} leads zonder adres worden gemeld`);
                    else fail(`kaart: ${kbody.leadsZonderAdres} leads zonder adres, zonder melding`);
                  }

                  // Een marker moet met het toetsenbord te bereiken zijn.
                  // Roving tabindex (fase 3): precies één marker staat in de tab-volgorde. `.focus()`
                  // alleen bewees dat niet meer — dat slaagt ook op tabindex -1.
                  const stops = svg.locator('[role="button"][tabindex="0"]');
                  const aantalStops = await stops.count();
                  if (aantalStops !== 1) {
                    fail(`kaart: ${aantalStops} markers met tabindex 0, verwacht precies 1`);
                  } else {
                    await stops.focus();
                    const heeftFocus = await stops.evaluate((el) => el === document.activeElement);
                    if (heeftFocus) ok('kaart: precies één marker in de tab-volgorde, en die krijgt focus');
                    else fail('kaart: de marker met tabindex 0 kan geen focus krijgen');
                  }

                  // ── Volgt de kaart het filter? ─────────────────────────────
                  // Dit is de scherpste check van het hele kaart-blok, want het is de
                  // enige die rood was toen alles eromheen groen stond: tot 2026-09-09
                  // las `/api/kaart` geen enkele parameter en bleef de kaart op al zijn
                  // punten staan bij elke filterkeuze, terwijl de tellingen hierboven
                  // netjes klopten met een antwoord dat zélf het filter negeerde. Een
                  // telling tegen het antwoord kan die klasse per constructie niet zien;
                  // alleen een tweede filterstand kan dat.
                  const bron = page.locator('[role="tabpanel"]:visible [role="radiogroup"]');
                  if (!(await bron.count())) {
                    fail('kaart: geen bronfilter zichtbaar in de kaartweergave');
                  } else {
                    const naFilter = page
                      .waitForResponse(
                        (r) => r.url().includes('/api/kaart') && r.url().includes('herkomst=csv'),
                        { timeout: 20_000 }
                      )
                      .catch(() => null);
                    await bron.locator('[role="radio"]', { hasText: 'Lijst' }).click();
                    const fres = await naFilter;
                    if (!fres) {
                      fail('kaart: bron "Lijst" leverde geen /api/kaart-verzoek met herkomst=csv');
                    } else {
                      const fbody = await fres.json().catch(() => null);
                      await page.waitForTimeout(800);
                      const voor = kbody?.punten?.length ?? 0;
                      const na = fbody?.punten?.length ?? 0;
                      if (na > 0 && na < voor) ok(`kaart: bron "Lijst" versmalt ${voor} → ${na} punten`);
                      else fail(`kaart: bron "Lijst" gaf ${na} punten bij ${voor} — het filter doet niets`);

                      // Een lead is geen rij uit de aangeleverde lijst; onder "Lijst"
                      // hoort er geen enkel vermoeden meer te staan.
                      const nogLeads = (fbody?.punten ?? []).filter((p) => p.herkomst === 'lead').length;
                      if (nogLeads === 0) ok('kaart: bron "Lijst" laat geen lead-vermoedens staan');
                      else fail(`kaart: bron "Lijst" toont nog ${nogLeads} lead-vermoedens`);

                      // Wat wegvalt door een keuze van de gebruiker, hoort geteld te
                      // worden — anders is een smaller filter niet te onderscheiden van
                      // een geocoder die niets vond.
                      if ((fbody?.buitenFilter ?? 0) > 0) {
                        const gemeld = await page
                          .locator('[role="tabpanel"]:visible', { hasText: 'buiten je huidige filters' })
                          .count();
                        if (gemeld) ok(`kaart: de ${fbody.buitenFilter} punten buiten het filter worden gemeld`);
                        else fail(`kaart: ${fbody.buitenFilter} punten vallen weg zonder telling`);
                      }
                    }
                    // Terug naar "Beide", zodat de checks hierna dezelfde stand zien.
                    const terug = page
                      .waitForResponse((r) => r.url().includes('/api/kaart'), { timeout: 20_000 })
                      .catch(() => null);
                    await bron.locator('[role="radio"]', { hasText: 'Beide' }).click();
                    await terug;
                    await page.waitForTimeout(400);
                  }

                  // ── Blijft een status in de lijst naast de kaart staan? (2026-09-17) ──
                  // De status leefde alleen in de gekozen rij; een andere stip kiezen en terug
                  // toonde de oude. Onderschept, met positieve controle, en met een telling in de
                  // database vóór en na — dit draait op de echte data.
                  const tel = async () => {
                    const { execFileSync } = await import('node:child_process');
                    const db = process.env.JOBRADAR_DB_PATH ?? join(APP, '.data/jobradar.db');
                    return execFileSync('sqlite3', ['-readonly', db, "SELECT count(*) || '/' || coalesce(sum(status != 'new'), 0) FROM prospect_status;"]).toString().trim();
                  };
                  const markerLijst = svg.locator('[role="button"]');
                  const aantalM = await markerLijst.count();
                  let metStatus = -1;
                  for (let i = 0; i < Math.min(aantalM, 40); i++) {
                    await markerLijst.nth(i).click();
                    await page.waitForTimeout(150);
                    const k = page.locator('[role="tabpanel"]:visible [data-status="new"] button[aria-label^="Bewaar "]');
                    if ((await k.count()) >= 1) { metStatus = i; break; }
                  }
                  if (metStatus < 0 || aantalM < 2) {
                    notes.push('kaart: geen marker met een lijst-prospect op "nieuw" (of één marker) — status na herkiezen niet gemeten');
                  } else {
                    const dbVoor = await tel();
                    await page.route(`${BASE}/api/**`, (route) => {
                      const m = route.request().method();
                      if (m === 'GET' || m === 'HEAD') return route.continue();
                      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, harness: 'onderschept' }) });
                    });
                    const controle = await page.evaluate(async () => (await fetch('/api/prospects/0000000000', { method: 'PATCH', body: '{}' })).text());
                    if (!controle.includes('onderschept')) {
                      fail('kaart: onderschepping niet bevestigd — klik overgeslagen');
                    } else {
                      const knop = page.locator('[role="tabpanel"]:visible [data-status] button[aria-label^="Bewaar "]').first();
                      const naam = (await knop.getAttribute('aria-label')) ?? '';
                      await knop.click();
                      await page.waitForTimeout(300);
                      await markerLijst.nth(metStatus === 0 ? 1 : 0).click();
                      await page.waitForTimeout(200);
                      await markerLijst.nth(metStatus).click();
                      await page.waitForTimeout(300);
                      const terugKnop = page.locator(`[role="tabpanel"]:visible button[aria-label="${naam.replace(/"/g, '\\"')}"]`);
                      const pressed = (await terugKnop.count()) ? await terugKnop.first().getAttribute('aria-pressed') : '(niet gevonden)';
                      if (pressed !== 'true') fail(`kaart: na Bewaar, een andere stip en terug staat aria-pressed op "${pressed}"`);
                      else ok('kaart: een bewaarde status blijft staan na een andere stip kiezen en terug');
                    }
                    await page.unroute(`${BASE}/api/**`);
                    const dbNa = await tel();
                    if (dbNa !== dbVoor) fail(`kaart: prospect_status veranderde (${dbVoor} → ${dbNa}) — de onderschepping lekte`);
                    else ok(`kaart: prospect_status ongemoeid (${dbNa})`);
                  }
                }
              }

              // Terug naar de lijst, zodat de checks hieronder hun paneel terugvinden.
              await page.locator('[role="tabpanel"]:visible button[aria-pressed="true"]', { hasText: /^Kaartweergave$/ }).click();
              await page.waitForTimeout(400);
            }

            // Winstzeef: hij hoort UIT te staan bij het laden, en aangezet hoort hij
            // te melden dat de KBO-herkomst geen EBITDA draagt.
            const winst = page.locator('#alleen-winstgevend');
            if (!(await winst.count())) {
              fail('prospects: geen winstgevendheidsfilter gevonden');
            } else {
              const aanBijStart = await winst.getAttribute('data-state');
              if (aanBijStart === 'unchecked') ok('prospects: "Alleen winstgevend" staat bij het laden uit');
              else fail(`prospects: "Alleen winstgevend" staat bij het laden op "${aanBijStart}", verwacht uit`);

              const winstAntwoord = page
                .waitForResponse((r) => r.url().includes('/api/prospects') && r.url().includes('winstgevend=1'), { timeout: 20_000 })
                .catch(() => null);
              await winst.click();
              const winstRes = await winstAntwoord;
              if (!winstRes) {
                fail('prospects: winstfilter leverde geen verzoek met winstgevend=1');
              } else {
                await page.waitForTimeout(400);
                const uitleg = await page
                  .locator('[role="tabpanel"]:visible', { hasText: 'zeeft op EBITDA' })
                  .count();
                if (uitleg) ok('prospects: de winstzeef legt uit waarom de KBO-herkomst wegvalt');
                else fail('prospects: winstzeef aan zonder uitleg over de wegvallende KBO-herkomst');
              }
            }
          }
        }
      }
    }
  }

  if (doe('plan')) {
    console.log('→ Bedrijfsplan');
    await page.goto(BASE + '/plan', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

    // Het tabblad Acties: eigen kopstructuur en eigen tab-volgorde. Radix ontkoppelt de
    // inactieve panelen, dus dit is echt een ander DOM-oppervlak dan het overzicht.
    const actiesTab = page.locator('[role="tab"]', { hasText: 'Acties' }).first();
    if (!(await actiesTab.count())) {
      fail('plan: geen tabblad Acties gevonden');
    } else {
      await actiesTab.click();
      await page.waitForTimeout(400);

      // Ankeren op wat een actierij ís — een `li` met `data-actie` — en niet op elke `li`: de
      // blokkade-chips zitten óók in lijstitems, en die telling gaf 40 waar er 22 acties zijn.
      // Tot 2026-09-17 was het anker `li:has(select)`; sinds de status-select uit de rij naar
      // het paneel verhuisde, zou dat 0 geven. Een anker op een attribuut dat de rij zelf zet,
      // beweegt niet mee met wat er toevallig in de rij staat.
      const rijen = await page.locator('[role="tabpanel"]:visible li[data-actie]').count();
      if (rijen !== 22) fail(`plan: ${rijen} actierijen in de DOM, precies 22 verwacht`);
      else ok(`plan: ${rijen} actierijen in de DOM`);

      const koppen = await kopstructuur(page);
      if (koppen.problemen.length) for (const p of koppen.problemen) fail(`plan/acties kopstructuur: ${p}`);
      else ok(`plan/acties kopstructuur: ${koppen.aantal} koppen, niveaus ${koppen.niveaus.map((n) => 'h' + n).join(' → ')}`);

      const tb = await toetsenbord(page);
      if (tb.problemen.length) for (const p of tb.problemen) fail(`plan/acties toetsenbord: ${p}`);
      else ok(`plan/acties toetsenbord: ${tb.stops} stops, elk met zichtbare focus`);

      // Het paneel. Twee dingen die alleen hier te meten zijn: het is een dialog (en dus
      // geen inline uitklapping die de lijst uit elkaar duwt), en de lijst blijft staan.
      const voor = await page.locator('[role="tabpanel"]:visible li[data-actie]').count();
      const titel = page.locator('[role="tabpanel"]:visible li button').first();
      if (!(await titel.count())) {
        fail('plan: geen actietitel om aan te klikken');
      } else {
        await titel.click();
        await page.waitForTimeout(600);

        const dialogen = await page.locator('[role="dialog"]').count();
        if (dialogen !== 1) fail(`plan: ${dialogen} dialog(s) na het openen van een actie, verwacht 1`);
        else ok('plan: het actiepaneel opent als dialog');

        const na = await page.locator('[role="tabpanel"]:visible li[data-actie]').count();
        if (na !== voor) fail(`plan: de actielijst veranderde van ${voor} naar ${na} rijen bij het openen`);
        else ok(`plan: de actielijst blijft staan (${voor} → ${na})`);

        const tbPaneel = await toetsenbord(page, 40);
        if (tbPaneel.problemen.length) for (const p of tbPaneel.problemen) fail(`plan-paneel toetsenbord: ${p}`);
        else ok(`plan-paneel toetsenbord: ${tbPaneel.stops} stops, elk met zichtbare focus`);

        // De focusval apart, en NIET als vervolg op de pass hierboven: die begint en eindigt
        // op `document.body` om het vertrekpunt te resetten, dus `activeElement` erna zegt
        // iets over de opruiming van de harness en niets over het paneel. Gemeten 2026-09-16:
        // die vorm meldde "de focus liep het paneel uit" terwijl de val gewoon werkte.
        // Hier focussen we het láátste element in het paneel en tabben één keer: blijft de
        // focus dan binnen, dan is de val echt.
        const stops = page.locator('[role="dialog"] button, [role="dialog"] input, [role="dialog"] select, [role="dialog"] textarea, [role="dialog"] summary');
        const aantal = await stops.count();
        if (aantal === 0) {
          fail('plan-paneel: geen enkel bedienbaar element in het paneel');
        } else {
          await stops.nth(aantal - 1).focus();
          await page.keyboard.press('Tab');
          const binnen = await page.evaluate(() =>
            document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false
          );
          if (!binnen) fail('plan-paneel: na de laatste stop loopt de focus het paneel uit');
          else ok(`plan-paneel: de focus blijft binnen het paneel (${aantal} bedienbare elementen)`);
        }

        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const dicht = await page.locator('[role="dialog"]').count();
        if (dicht !== 0) fail('plan-paneel: Escape sluit het paneel niet');
        else ok('plan-paneel: Escape sluit het paneel');
      }
    }
  }

  // ── Fase 3-modules ─────────────────────────────────────────────────────────
  {
    const laad = async (pad, base = BASE) => {
      await page.goto(base + pad, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    };
    /**
     * Onderschept elk schrijvend verzoek naar /api (alles behalve GET/HEAD) en toetst eerst met een
     * eigen fetch dat de onderschepping werkt. `{ status, body, vertraging }` beantwoordt, `{ abort: true }`
     * laat de fetch gooien (netwerkfout). Geeft false als de positieve controle faalt: klik dan NIET.
     */
    const onderschepSchrijven = async (antwoord, base = BASE) => {
      await page.unroute(`${base}/api/**`).catch(() => {});
      await page.route(`${base}/api/**`, async (route) => {
        const m = route.request().method();
        if (m === 'GET' || m === 'HEAD') return route.continue();
        if (antwoord.vertraging) await new Promise((r) => setTimeout(r, antwoord.vertraging));
        if (antwoord.abort) return route.abort('failed');
        return route.fulfill({ status: antwoord.status ?? 200, contentType: 'application/json', body: JSON.stringify(antwoord.body ?? { harness: true }) });
      });
      const controle = await page.evaluate(async () => {
        try {
          const r = await fetch('/api/jobs/0', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: '{}' });
          return { status: r.status, body: await r.text() };
        } catch (e) {
          return { gegooid: String(e) };
        }
      });
      if (antwoord.abort) return Boolean(controle.gegooid);
      return controle.status === (antwoord.status ?? 200) && JSON.stringify(antwoord.body ?? { harness: true }) === controle.body;
    };
    const stopOnderschepping = (base = BASE) => page.unroute(`${base}/api/**`).catch(() => {});
    /** Tweede `next start` uit dezelfde build, met eigen env. Stopt vanzelf bij exit. */
    const extraServer = async ({ port, env: extra }) => {
      if (!(await portFree(port))) throw new Error(`poort ${port} is bezet`);
      const proc = spawn('npx', ['next', 'start', '--port', String(port)], { cwd: APP, stdio: 'ignore', env: { ...env, ...extra } });
      const halt = () => { try { proc.kill('SIGTERM'); } catch { /* al weg */ } };
      process.on('exit', halt);
      const base = `http://127.0.0.1:${port}`;
      if (!(await waitForServer(base))) { halt(); throw new Error(`extra server op ${port} kwam niet op`); }
      eigenOrigins.add(base);
      return { base, stop: () => { halt(); eigenOrigins.delete(base); } };
    };
    const meetCtx = {
      page, browserContext: ctx, browser, BASE, APP, HERE, DIST, env, ok, fail, notes, consoleErrors,
      laad, onderschepSchrijven, stopOnderschepping, extraServer, dbVingerafdruk, kopstructuur, toetsenbord, naamloos,
      navigatie, toetsNavigatie,
    };
    for (const [naam, pad] of FASE3_MODULES) {
      if (!doe(naam)) continue;
      console.log(`→ ${naam}`);
      const bestand = join(HERE, pad);
      if (!existsSync(bestand)) { fail(`${naam}: module scripts/${pad} ontbreekt — deze assen meten niets`); continue; }
      const mod = await import(bestand);
      try {
        await mod.default(meetCtx);
      } catch (e) {
        fail(`${naam}: module gooide ${String(e).split('\n')[0]}`);
      } finally {
        await stopOnderschepping();
      }
    }
  }

  if (SELFTEST) {
    console.log('→ Zelftest (dit scenario hóórt te falen)');
    await page.goto(BASE + '/deze-route-bestaat-niet-' + Date.now(), { waitUntil: 'domcontentloaded' })
      .catch(() => {});
    const res = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    if (res?.status() === 200) fail('ZELFTEST: bewust gefaalde assertie — de harness kan falen');

    // De twee a11y-passes krijgen elk hun eigen defect ingespoten. Een pass die groen
    // blijft op een pagina waar het defect er aantoonbaar ín zit, meet niets.
    await page.evaluate(() => {
      const kop = document.createElement('h5');
      kop.textContent = 'zelftest: overgeslagen niveau';
      document.body.appendChild(kop);
      const knop = document.createElement('button');
      knop.textContent = 'zelftest: onzichtbare focus';
      // !important, anders wint de ring-utility alsnog en toont de knop gewoon focus.
      knop.style.setProperty('outline', 'none', 'important');
      knop.style.setProperty('box-shadow', 'none', 'important');
      // PREPEND, niet append: het dashboard heeft honderden tab-stops en de pass loopt
      // er maxStops af. Achteraan viel de knop buiten het bereik en bleef de zelftest
      // stil groen — gemeten op 2026-08-27, precies de vorm die deze zelftest hoort te
      // vangen. Vooraan is hij de eerste stop, op elke pagina.
      document.body.prepend(knop);
    });
    const kopZelftest = await kopstructuur(page);
    if (kopZelftest.problemen.length) fail(`ZELFTEST kopstructuur: ${kopZelftest.problemen[0]}`);
    else console.log('  ! kopstructuur-pass zag het ingespoten defect NIET');
    const tbZelftest = await toetsenbord(page);
    if (tbZelftest.problemen.length) fail(`ZELFTEST toetsenbord: ${tbZelftest.problemen[0]}`);
    else console.log('  ! toetsenbord-pass zag het ingespoten defect NIET');

    // Naam-as: een naamloze select vooraan. De browser moet hem als combobox zonder naam tonen.
    await page.evaluate(() => document.body.prepend(document.createElement('select')));
    const naamZelftest = naamUitzonderingen('/', (await naamloos(page)).zonder);
    if (naamZelftest.rest.length) fail(`ZELFTEST namen: ${naamZelftest.rest.length} naamloos (${naamZelftest.rest[0].rol} ${naamZelftest.rest[0].wat})`);
    else console.log('  ! naam-as zag het ingespoten defect NIET');

    // Navigatie-as (2026-09-19): het kenmerk weghalen bij de link van de huidige route. Dat is
    // precies het defect waarvoor de as bestaat — de balk staat er nog, met drie links, en toont
    // alleen niet meer waar je bent. Een check die alleen de balk telt, blijft hierop groen.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const voorNav = await navigatie(page);
    const weggehaald = await page.evaluate(() => {
      const el = document.querySelector('header a[aria-current="page"]');
      if (!el) return false;
      el.removeAttribute('aria-current');
      return true;
    });
    if (!weggehaald) {
      fail(`ZELFTEST navigatie: geen link met aria-current om weg te halen (balk=${voorNav.balk}, links=${voorNav.links}) — dit meet niets`);
    } else {
      const navZelftest = await navigatie(page);
      if (navZelftest.huidig !== 1 && navZelftest.links === 3) fail(`ZELFTEST navigatie: ${navZelftest.huidig} van ${navZelftest.links} links met aria-current`);
      else console.log('  ! navigatie-as zag het ingespoten defect NIET');
    }

    // Triage (2026-09-17): een select in een kaart, en een Bewaar-knop die "ingedrukt" zegt op een
    // item dat niet bewaard is. Alleen in de DOM van deze pagina — de database blijft onaangeroerd.
    await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
    const geinjecteerd = await page.evaluate(() => {
      const kaart = document.querySelector('[role="tabpanel"] .grid > div');
      const bewaar = document.querySelector('[role="tabpanel"] [data-status="new"] button[aria-label^="Bewaar "]');
      if (!kaart || !bewaar) return false;
      kaart.appendChild(document.createElement('select'));
      bewaar.setAttribute('aria-pressed', 'true');
      return true;
    });
    if (!geinjecteerd) {
      console.log('  ! triage-zelftest: geen kaart of Bewaar-knop om een defect in te spuiten (lege database?)');
    } else {
      const sel = await triageSelects(page);
      if (sel.length) fail(`ZELFTEST triage-selects: ${sel.length} select(s) op kaarten`);
      else console.log('  ! triage-selects zag het ingespoten defect NIET');
      const kn = await triageKnoppen(page);
      if (kn.fout.length) fail(`ZELFTEST triage-knoppen: ${kn.fout.length} item(s) met verkeerde knoppen`);
      else console.log('  ! triage-knoppen zag het ingespoten defect NIET');
    }
  }

  if (consoleErrors.length) {
    for (const e of [...new Set(consoleErrors)].slice(0, 5)) fail(`console: ${e.slice(0, 160)}`);
  } else ok('console schoon');

  const gedeeldNa = buildId(gedeeld);
  if (gedeeldVoor !== gedeeldNa) {
    fail(`de gedeelde .next is herbouwd (BUILD_ID ${gedeeldVoor} → ${gedeeldNa}) — een dev-server daarop zou nu kapot zijn`);
  } else if (gedeeldVoor !== null) {
    ok(`de gedeelde .next is ongemoeid gebleven (BUILD_ID ${gedeeldVoor})`);
  } else {
    notes.push('geen .next met BUILD_ID aanwezig — niets om te beschermen deze run');
  }

  if (leaks.size) fail(`lek naar externe origin(s): ${[...leaks].join(', ')}`);
  else ok('geen enkel verzoek buiten de eigen origin');

  await browser.close();
  stop();

  console.log('');
  for (const n of notes) console.log(`  • ${n}`);
  if (SELFTEST) {
    // Elke as apart: één gefaalde assertie bewees vroeger alleen dat de routecheck meet.
    const assen = ['ZELFTEST:', 'ZELFTEST kopstructuur', 'ZELFTEST toetsenbord', 'ZELFTEST triage-selects', 'ZELFTEST triage-knoppen', 'ZELFTEST namen', 'ZELFTEST navigatie'];
    const gemist = assen.filter((a) => !fails.some((f) => f.startsWith(a)));
    console.log(gemist.length === 0
      ? `✓ zelftest: alle ${assen.length} assen falen wanneer ze horen te falen`
      : `✗ zelftest: deze as/assen faalden NIET — ${gemist.join(', ')}`);
    process.exit(gemist.length === 0 ? 0 : 1);
  }
  console.log(fails.length ? `✗ ${fails.length} bevinding(en)` : '✓ alle checks geslaagd');
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
