#!/usr/bin/env node
/**
 * BEELD-PARITY — legt de gerenderde browser naast de gerenderde Figma-node.
 *
 * WAAROM DIT BESTAAT. `geometry-parity.mjs` vergelijkt maten en vlaggen en is daar exact in,
 * maar hij kan per constructie drie dingen NIET zien: kleurwaarde, icoonvorm en
 * `text-transform`. Die laatste is bewezen misleidend — de browser rendert "500M" waar
 * `textContent` "500m" is, over 42 nodes in 12 componenten. En op 2026-09-09 bleek het erger:
 * een `FormField`-instance stond 390 breed met een inhoud van 224, elk scherm met een
 * formulier zag er in Figma anders uit dan in de app, en dertien guard-assen stonden groen
 * met nul parity-verschillen. Breedte staat namelijk buiten parity (tekstengines meten tekst
 * anders), dus daar leefde de drift. Alleen een beeld vond het.
 *
 * WAT DIT NIET IS. Geen pixel-voor-pixel-eis. Twee renderers (Skia in Figma, Blink in
 * Chromium) hinten tekst anders, en 275 Ionicons-glyphs bestaan in Figma helemaal niet — die
 * staan er als placeholder-kader omdat het font er niet is. Een kale pixeldiff zou elke run
 * rood zijn en daarmee nutteloos. Dit script meet dus twee drempels naast elkaar (zichtbaar
 * en grof), maskeert wat structureel verschilt, en rapporteert WAAR het verschil zit in
 * plaats van alleen hoeveel.
 *
 * DE DREMPEL KIES JE ALS LAATSTE. Een tolerantie vooraf verzinnen is de klassieke manier om
 * een beeld-as onbruikbaar te maken. De volgorde is: eerst de echte verschillen wegwerken,
 * dan meten wat er aan onherleidbare renderer-ruis overblijft, en dan de drempel daarboven
 * leggen. Zonder `--drempel` rapporteert dit script alleen; hij faalt pas als je hem een
 * getal geeft.
 *
 * GEEN DEPENDENCY. Chromium decodeert de PNG's en rekent de diff op een canvas — playwright
 * staat er al voor `render-sweep`. Een extra beeldbibliotheek zou een "eerst bevestigen"-
 * actie zijn voor iets dat de browser gratis kan.
 *
 * DE RATEL STAAT OP `overig`, PER FRAME. Een som van `grof` is een richting zonder vloer: 24
 * frames delen één getal, dus een frame dat verdubbelt verdwijnt achter een frame dat daalt.
 * En `grof` bevat de tekst-engine-ruis waar de bouw niets aan kan doen. De basislijn staat in
 * `figma/beeld-basislijn.json`, één `overig` per frame, en is TWEEZIJDIG: erboven is een
 * regressie, eronder is winst die je vastlegt. Het aantal frames telt mee als noemer.
 *
 * DE BASISLIJN IS PER PLATFORM GEMETEN, en dat is geen detail: de getallen komen uit de
 * fontrendering van de machine die meet. Hij hoort dus geschreven te worden op het doelwit
 * waar de guard draait (CI), niet op de Mac waar hij bedacht is — vandaar
 * `--schrijf-basislijn` in plaats van een met de hand ingetypt getal.
 *
 * TOLERANTIE. 23 van de 24 frames gaven over drie runs exact hetzelfde getal; alleen
 * `ActivePhase/Doel-Bereikt` beweegt (3,81 · 3,82 · 3,86), want de confetti van
 * `MotivationalToast` is `6 + random * 8` en wordt bij elke render opnieuw gerandomiseerd.
 * De tolerantie dekt die spreiding en niet meer. Het BACKLOG-item over het maskeren van
 * niet-reproduceerbare nodes blijft daarnaast staan: een tolerantie is een omweg om een
 * instabiel frame heen, geen oplossing ervoor.
 *
 *   node scripts/beeld-parity.mjs                      # rapport + ratel tegen de basislijn
 *   node scripts/beeld-parity.mjs --geen-ratel         # alleen rapporteren
 *   node scripts/beeld-parity.mjs --schrijf-basislijn  # de huidige meting als basislijn vastleggen
 *   node scripts/beeld-parity.mjs --drempel=1.5        # daarnaast: faalt boven 1,5% overig, ongeacht de basislijn
 *   node scripts/beeld-parity.mjs --schrijf            # 3-luik per frame naar figma/beeld-diff/
 *   node scripts/beeld-parity.mjs --selftest           # tegenproef: rood op een mutatie, groen zonder
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = join(APP, 'storybook-static');
const BEELDEN = join(APP, 'figma/beelden');
const DIFFDIR = join(APP, 'figma/beeld-diff');
const vlag = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split('=')[1];
const SCHAAL = Number(vlag('schaal') ?? 1);
const DREMPEL = vlag('drempel') !== undefined ? Number(vlag('drempel')) : null;
const SCHRIJF = process.argv.includes('--schrijf');
const BASISLIJN_PAD = join(APP, 'figma/beeld-basislijn.json');
const SCHRIJF_BASISLIJN = process.argv.includes('--schrijf-basislijn');
const GEEN_RATEL = process.argv.includes('--geen-ratel');
const SELFTEST = process.argv.includes('--selftest');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };

if (!existsSync(BEELDEN) || !readdirSync(BEELDEN).length) {
  console.error(`geen beelden in figma/beelden/ — exporteer eerst uit Figma (zie apps/rowtrack/CLAUDE.md)`);
  process.exit(2);
}
if (!existsSync(join(STATIC, 'index.json'))) {
  console.error('geen storybook-static/index.json — draai eerst `pnpm --filter rowtrack build-storybook`');
  process.exit(2);
}

const index = JSON.parse(readFileSync(join(STATIC, 'index.json'), 'utf8'));
const slug = (s) => String(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Van bestandsnaam naar story-id. `HistoryScreen__Een-Record.figma.png` -> de story. */
function storyVan(bestand) {
  const [comp, rest] = bestand.replace(/\.figma\.png$/, '').split('__');
  const kandidaten = Object.values(index.entries).filter((e) => e.type === 'story');
  return kandidaten.find((e) => slug(e.title.split('/').pop()) === comp && slug(e.name) === rest)
      ?? kandidaten.find((e) => slug(e.title.split('/').pop()) === comp && slug(e.name) === rest.replace(/-/g, ''));
}

const server = createServer((q, r) => {
  let p = join(STATIC, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<!doctype html><title>leeg</title>'); }
  r.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' });
  r.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const poort = server.address().port;
const browser = await chromium.launch();

/**
 * De vergelijking zelf, in de browser. Twee drempels:
 *  · 8  — ZICHTBAAR: alles boven anti-aliasing-ruis;
 *  · 40 — GROF: een andere kleur, een ontbrekend element, verschoven layout.
 * De blokkenkaart (20x20) maakt van een percentage een plaats.
 */
async function vergelijk(page, aPng, bPng, maskers, teksten = []) {
  return page.evaluate(async ([a, b, mask, tekst]) => {
    const laad = (u) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = u; });
    const [ia, ib] = await Promise.all([laad(a), laad(b)]);
    const W = Math.min(ia.width, ib.width), H = Math.min(ia.height, ib.height);
    const ctx = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h;
      return c.getContext('2d', { willReadFrequently: true }); };
    const ca = ctx(W, H), cb = ctx(W, H);
    ca.drawImage(ia, 0, 0); cb.drawImage(ib, 0, 0);
    // Maskeren gebeurt op BEIDE beelden identiek, dus een masker kan nooit een verschil maken
    // dat er niet is — hij kan er alleen een verbergen, en dat is precies de bedoeling bij
    // een glyph die in Figma niet bestaat.
    for (const m of mask) { for (const c of [ca, cb]) { c.fillStyle = '#000'; c.fillRect(m.x, m.y, m.w, m.h); } }
    const da = ca.getImageData(0, 0, W, H).data, db = cb.getImageData(0, 0, W, H).data;
    let zicht = 0, grof = 0, grofTekst = 0;
    /**
     * HET AGGREGAAT ONTLEED. Eén `grof`-percentage per frame telt heterogene oorzaken op —
     * Figma's tekstengine die dezelfde tekst breder meet dan Chromium, een kleurverschil,
     * een echt layoutdefect — en die som heeft geen vloer: hij daalde van 74,36 naar 56,18
     * over 24 frames (2026-09-10) zonder dat iemand kon zeggen wat er in die 56,18 zat. Een
     * aggregaat zonder zijn grootste bijdrager is een richting, geen meting. Daarom hier per
     * grof pixel: valt hij in een tekstgebied van de browser-render, of daarbuiten? `tekst`
     * is de engine-ruis waar de bouw niets aan kan doen; `overig` is wat een klasse verdient.
     * De iconen zijn al gemaskeerd en tellen in geen van beide mee.
     */
    const inTekst = (px, py) => { for (const t of tekst) if (px >= t.x && px < t.x + t.w && py >= t.y && py < t.y + t.h) return true; return false; };
    const blok = 20, cols = Math.ceil(W / blok), rows = Math.ceil(H / blok);
    const kaart = Array.from({ length: rows }, () => new Array(cols).fill(0));
    const cd = ctx(W, H); const diff = cd.createImageData(W, H);
    for (let i = 0; i < da.length; i += 4) {
      const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
      if (d > 8) { const px = (i / 4) % W, py = Math.floor((i / 4) / W); zicht++; kaart[Math.floor(py / blok)][Math.floor(px / blok)]++; }
      if (d > 40) { grof++; if (inTekst((i / 4) % W, Math.floor((i / 4) / W))) grofTekst++; }
      const v = d > 40 ? 255 : d > 8 ? 120 : 0;
      diff.data[i] = v; diff.data[i + 1] = v > 200 ? 0 : v; diff.data[i + 2] = 0; diff.data[i + 3] = 255;
    }
    cd.putImageData(diff, 0, 0);
    const drie = ctx(W * 3 + 24, H);
    drie.fillStyle = '#111'; drie.fillRect(0, 0, W * 3 + 24, H);
    drie.drawImage(ia, 0, 0); drie.drawImage(ib, W + 12, 0); drie.drawImage(cd.canvas, W * 2 + 24, 0);
    const heet = [];
    kaart.forEach((rij, y) => rij.forEach((n, x) => { if (n > blok * blok * 0.25) heet.push(`${x * blok},${y * blok}`); }));
    const tot = W * H;
    return { W, H, zicht: +(zicht / tot * 100).toFixed(2), grof: +(grof / tot * 100).toFixed(2),
      tekst: +(grofTekst / tot * 100).toFixed(2), overig: +((grof - grofTekst) / tot * 100).toFixed(2),
      heet: heet.length, blokken: cols * rows, plaatsen: heet.slice(0, 6), png: drie.canvas.toDataURL('image/png') };
  }, [aPng, bPng, maskers, teksten]);
}

const dataUri = (p) => 'data:image/png;base64,' + readFileSync(p).toString('base64');

/** Rendert één story en geeft het PNG plus de rects van elke Ionicons-glyph terug. */
async function browserBeeld(page, storyId, breedte, hoogte) {
  await page.setViewportSize({ width: Math.round(breedte), height: Math.round(hoogte) });
  await page.goto(`http://localhost:${poort}/iframe.html?id=${storyId}&viewMode=story`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const el = await page.$('#storybook-root > *');
  if (!el) return null;
  const png = await el.screenshot();
  // De iconen komen uit de DOM, niet uit de spec: de spec draagt alleen relatieve posities
  // voor absolute kinderen, dus absolute rects zijn daar niet uit te rekenen.
  const { iconen, teksten } = await page.evaluate(() => {
    const w = document.getElementById('storybook-root').children[0].getBoundingClientRect();
    const rect = (e, marge) => { const r = e.getBoundingClientRect();
      return { x: Math.floor(r.x - w.x) - marge, y: Math.floor(r.y - w.y) - marge, w: Math.ceil(r.width) + 2 * marge, h: Math.ceil(r.height) + 2 * marge }; };
    const bladeren = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0);
    const isIcoon = (e) => getComputedStyle(e).fontFamily.toLowerCase().includes('ionicons');
    return {
      iconen: bladeren.filter(isIcoon).map((e) => rect(e, 2)),
      // De TEKSTGEBIEDEN, om het verschil te ontleden: een tekstnode met inhoud, geen icoon.
      // Een `<input>` telt mee — zijn placeholder is tekst die de engine anders meet.
      teksten: bladeren.filter((e) => !isIcoon(e) && (e.textContent.trim() || e.tagName === 'INPUT' || e.tagName === 'TEXTAREA')).map((e) => rect(e, 1)),
    };
  });
  return { png: 'data:image/png;base64,' + png.toString('base64'), iconen, teksten };
}

const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: SCHAAL });
const leegPage = await browser.newPage();
await leegPage.goto(`http://localhost:${poort}/__leeg`);

const rijen = [];
for (const bestand of readdirSync(BEELDEN).filter((f) => f.endsWith('.figma.png')).sort()) {
  const story = storyVan(bestand);
  if (!story) { rijen.push({ bestand, fout: 'geen bijpassende story' }); continue; }
  const fig = join(BEELDEN, bestand);
  const maat = await leegPage.evaluate((u) => new Promise((res) => {
    const i = new Image(); i.onload = () => res({ w: i.width, h: i.height }); i.src = u;
  }), dataUri(fig));
  const b = await browserBeeld(page, story.id, maat.w / SCHAAL, maat.h / SCHAAL);
  if (!b) { rijen.push({ bestand, fout: 'story rendert niets' }); continue; }
  const r = await vergelijk(leegPage, b.png, dataUri(fig), b.iconen, b.teksten);
  const { png, ...rest } = r;
  rijen.push({ bestand, story: story.id, ...rest, iconenGemaskeerd: b.iconen.length });
  if (SCHRIJF) { mkdirSync(DIFFDIR, { recursive: true });
    writeFileSync(join(DIFFDIR, bestand.replace('.figma.png', '.3luik.png')), Buffer.from(png.split(',')[1], 'base64')); }
}

if (SELFTEST) {
  // TEGENPROEF. Eén beeld tegen zichzelf hoort 0,00% te geven; hetzelfde beeld met een vlak
  // van 60x60 erover hoort ver boven nul te komen. Geven beide dezelfde uitkomst, dan meet de
  // opstelling niets — dat is de enige conclusie die dan geldig is.
  const eerste = readdirSync(BEELDEN).find((f) => f.endsWith('.figma.png'));
  const uri = dataUri(join(BEELDEN, eerste));
  const zelf = await vergelijk(leegPage, uri, uri, []);
  const gemuteerd = await leegPage.evaluate(async (u) => {
    const i = await new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
    const c = document.createElement('canvas'); c.width = i.width; c.height = i.height;
    const x = c.getContext('2d'); x.drawImage(i, 0, 0);
    x.fillStyle = '#00ff88'; x.fillRect(40, 40, 60, 60);
    return c.toDataURL('image/png');
  }, uri);
  const mut = await vergelijk(leegPage, uri, gemuteerd, []);
  console.log(`\nzelftest op ${eerste}`);
  console.log(`  controle (zelfde beeld) : grof ${zelf.grof}%  (hoort 0)`);
  console.log(`  mutatie  (vlak 60x60)   : grof ${mut.grof}%  (hoort > 0)`);
  const ok = zelf.grof === 0 && mut.grof > 0;
  console.log(ok ? '  ok — de opstelling wordt rood op een echte mutatie en blijft groen zonder.'
                 : '  XX — beide kanten geven hetzelfde: deze opstelling meet niets.');
  await browser.close(); server.close();
  process.exit(ok ? 0 : 1);
}

console.log(`\nbeeld-parity — ${rijen.length} beeld(en), schaal ${SCHAAL}\n`);
const breed = Math.max(...rijen.map((r) => r.bestand.length));
for (const r of rijen.sort((a, b) => (b.grof ?? 0) - (a.grof ?? 0))) {
  if (r.fout) { console.log(`  ??  ${r.bestand.padEnd(breed)}  ${r.fout}`); continue; }
  const vlag = DREMPEL !== null && r.overig > DREMPEL ? 'FAIL' : ' ok ';
  console.log(`  ${vlag} ${r.bestand.padEnd(breed)}  grof ${String(r.grof).padStart(5)}%  zichtbaar ${String(r.zicht).padStart(5)}%`
    + `  waarvan tekst ${String(r.tekst).padStart(5)}%  overig ${String(r.overig).padStart(5)}%  ${String(r.heet).padStart(3)}/${r.blokken} blokken  ${r.iconenGemaskeerd} icoon(en) gemaskeerd`
    + (r.plaatsen.length ? `  @ ${r.plaatsen.slice(0, 3).join(' ')}` : ''));
}
const ergst = Math.max(0, ...rijen.filter((r) => !r.fout).map((r) => r.grof));
const ergstOverig = Math.max(0, ...rijen.filter((r) => !r.fout).map((r) => r.overig));
console.log(`\nergste grof verschil: ${ergst}%   ergste overig: ${ergstOverig}%`);
writeFileSync(join(APP, 'figma/beeld-verschillen.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/beeld-parity.mjs. De browser naast de Figma-export, per frame.',
  gegenereerd: new Date().toISOString().slice(0, 10), schaal: SCHAAL, drempel: DREMPEL, rijen,
}, null, 1) + '\n');

/**
 * TOLERANTIE — de spreiding van het enige frame dat beweegt, plus lucht. Gemeten over drie
 * runs op onveranderde invoer: 23 frames exact gelijk, `ActivePhase/Doel-Bereikt` 3,81-3,86.
 * Een groter getal zou een echte regressie kunnen verbergen; een kleiner getal maakt dat ene
 * frame één op de drie runs rood, en een wachter die dat doet leer je negeren.
 */
const TOLERANTIE = 0.1;

/**
 * FRAMES DIE GEEN BEWIJS KUNNEN DRAGEN. `MotivationalToast` tekent zijn confetti met
 * `6 + Math.random() * 8` en randomiseert opnieuw bij elke render — aan beide kanten, want ook
 * de Figma-export komt uit een bouw. Gemeten over vijf runs op ONVERANDERDE invoer: 3,63 ·
 * 3,76 · 3,81 · 3,82 · 3,86, een spreiding van 0,23 tegen 0,00 op de 23 andere frames.
 *
 * Dat frame krijgt daarom geen ratel. Niet een RUIMERE tolerantie: een tolerantie om
 * randomisering heen is een getal dat je niet kunt meten, en hij zou op de 23 stabiele frames
 * meteen een echte regressie kunnen verbergen. Het frame blijft wél in het rapport staan, en
 * de noemer noemt de uitsluiting bij naam — anders is "24 frames groen" niet te onderscheiden
 * van "23 frames groen en één die niets zegt".
 *
 * Weg is dit zodra `beeld-parity` de niet-reproduceerbare nodes maskeert zoals
 * `geometry-parity` dat doet (BACKLOG 2026-09-09, "De beeld-as sluit niet-reproduceerbare
 * nodes niet uit"). Tot dan is dit de eerlijke vorm: een gat met een naam.
 */
const ZONDER_RATEL = { 'ActivePhase__Doel-Bereikt': 'confetti wordt per render gerandomiseerd (spreiding 0,23 over vijf runs)' };

/**
 * De basislijn is PER PLATFORM, want de getallen komen uit de fontrendering van de machine
 * die meet. Eén lijst zou betekenen dat de guard op precies één machine bruikbaar is: rood in
 * CI als je hem op een Mac schrijft, rood op de Mac als je hem in CI schrijft. Elk platform
 * krijgt dus zijn eigen sectie, en een platform zonder sectie is een fout en geen overslaan.
 */
const leesBasislijn = () => (existsSync(BASISLIJN_PAD) ? JSON.parse(readFileSync(BASISLIJN_PAD, 'utf8')) : null);
const gemetenOverig = () => Object.fromEntries(rijen.filter((r) => !r.fout).map((r) => [r.bestand.replace(/\.figma\.png$/, ''), r.overig]));

if (SCHRIJF_BASISLIJN) {
  const overig = gemetenOverig();
  const bestaand = leesBasislijn();
  const platformen = { ...(bestaand?.platformen ?? {}), [process.platform]: { gemeten: new Date().toISOString().slice(0, 10), overig } };
  writeFileSync(BASISLIJN_PAD, JSON.stringify({
    $comment: 'GESCHREVEN door `beeld-parity.mjs --schrijf-basislijn`. Per frame het `overig`-percentage: het grove '
      + 'verschil buiten de tekstgebieden. PLATFORM-GEBONDEN, want de getallen komen uit de fontrendering van de '
      + 'machine die meet — schrijf een sectie op elk doelwit waar de guard draait.',
    schaal: SCHAAL, tolerantie: TOLERANTIE, platformen,
  }, null, 1) + '\n');
  console.log(`\nbasislijn geschreven: ${Object.keys(overig).length} frames onder "${process.platform}" -> figma/beeld-basislijn.json`);
  await browser.close(); server.close();
  process.exit(0);
}

let ratelFout = 0;
if (GEEN_RATEL) {
  console.log('\n  ratel overgeslagen (--geen-ratel): dit is een rapport en geen poort.');
} else if (!leesBasislijn()?.platformen?.[process.platform]) {
  console.error(`\n  GEEN BASISLIJN voor platform "${process.platform}" — deze run meet wel, maar toetst niets.`);
  console.error('  Draai `beeld-parity.mjs --schrijf-basislijn` op dit platform; een run zonder basislijn is een fout en geen overslaan.');
  ratelFout = 1;
} else {
  const basis = leesBasislijn().platformen[process.platform];
  const gemeten = gemetenOverig();
  const afwijkingen = [];
  // De NOEMER eerst: een frame dat wegvalt haalt zijn getal uit de vergelijking en dat leest
  // als winst. Een frame erbij is geen fout, maar wel een basislijn die hem niet kent.
  const weg = Object.keys(basis.overig).filter((k) => !(k in gemeten));
  const erbij = Object.keys(gemeten).filter((k) => !(k in basis.overig));
  if (weg.length) afwijkingen.push(`${weg.length} frame(s) uit de basislijn niet gemeten: ${weg.join(', ')}`);
  if (erbij.length) afwijkingen.push(`${erbij.length} nieuw frame(s) zonder basislijn: ${erbij.join(', ')} — draai --schrijf-basislijn`);
  // De uitsluiting mag niet stil verrotten: staat er een naam in die niet meer bestaat, dan
  // sluit de lijst iets uit dat er niet is en is dat een fout, geen stilte.
  for (const naam of Object.keys(ZONDER_RATEL)) {
    if (!(naam in gemeten)) afwijkingen.push(`${naam} staat in ZONDER_RATEL maar wordt niet gemeten — haal hem uit de lijst`);
  }
  for (const [naam, waarde] of Object.entries(gemeten)) {
    if (naam in ZONDER_RATEL) continue;
    const b = basis.overig[naam];
    if (b === undefined) continue;
    if (waarde > b + TOLERANTIE) afwijkingen.push(`${naam}: overig ${waarde}% tegen basislijn ${b}% — regressie`);
    else if (waarde < b - TOLERANTIE) afwijkingen.push(`${naam}: overig ${waarde}% tegen basislijn ${b}% — winst, leg hem vast met --schrijf-basislijn`);
  }
  if (afwijkingen.length) {
    console.error(`\n  RATEL — ${afwijkingen.length} afwijking(en) van figma/beeld-basislijn.json [${process.platform}, gemeten ${basis.gemeten}], tolerantie ${TOLERANTIE}:`);
    afwijkingen.forEach((a) => console.error('    ' + a));
    ratelFout = 1;
  } else {
    const uitgesloten = Object.keys(ZONDER_RATEL).filter((k) => k in gemeten);
    console.log(`\n  ok — ${Object.keys(gemeten).length - uitgesloten.length} van ${Object.keys(gemeten).length} frames op de basislijn (tolerantie ${TOLERANTIE}).`);
    uitgesloten.forEach((k) => console.log(`     zonder ratel: ${k} — ${ZONDER_RATEL[k]} (gemeten ${gemeten[k]}%)`));
  }
}

const drempelFout = DREMPEL !== null && ergstOverig > DREMPEL;
if (drempelFout) console.error(`\n  DREMPEL — ergste overig ${ergstOverig}% boven ${DREMPEL}%.`);

await browser.close(); server.close();
process.exit(ratelFout || drempelFout ? 1 : 0);
