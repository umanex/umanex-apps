#!/usr/bin/env node
/**
 * WALKER-BLINDVLEKKEN — telt in de gebouwde Storybook wat `figma-build-spec.mjs` per
 * constructie NIET meet, zodat elk van die klassen een getal heeft in plaats van een vermoeden.
 *
 * WAAROM DIT BESTAAT. De beeldvergelijking van 2026-09-09 vond vijf klassen verschillen die
 * geen enkele guard-as kon zien, en die alle vijf één oorzaak delen: de walker leest een
 * eigenschap niet, dus de builder kan hem niet bouwen, dus parity (die op dezelfde meting
 * rust) kan hem niet missen. Een lege meting is daar niet te onderscheiden van "geen
 * probleem". Dit script leest de DOM rechtstreeks, buiten de walker om, en is daarmee de
 * positieve controle: staat hier een getal, dan is het gat echt.
 *
 *   randkleur    — een node met VERSCHILLENDE KLEUREN op zijn gezette zijden. Figma's
 *                  `strokes` is één verfarray voor de hele node, dus dat is er niet in uit te
 *                  drukken; de builder zet de eerste kleur en meldt het.
 *                  Hier stond tot 2026-09-09 `rand` — randen met verschillende BREEDTES per
 *                  zijde — met 110 treffers. Die zijn geen blinde vlek meer: de walker meet
 *                  sinds die dag alle vier de zijden en de builder zet `strokeTopWeight` c.s.
 *                  Een teller die een gedicht gat blijft tellen, is een vals alarm; wat er
 *                  van dat gat OVER is, is de kleur. Gemeten over alle 257 stories: 333 nodes
 *                  met rand, 138 asymmetrisch in twee vormen (99x `0/0/1/0`, 39x `1/0/1/0`),
 *                  en **0** met meer dan één kleur. Dit is dus een wachtpost op nul, en dat
 *                  hoort erbij te staan — anders is "nul" straks niet te onderscheiden van
 *                  een teller die niets meet.
 *   placeholder  — `<input placeholder>` zonder waarde; een attribuut, geen tekstnode, dus
 *                  het veld staat leeg in Figma
 *   gescrold     — containers met `scrollTop > 0`; de walker meet geen scrollpositie, dus de
 *                  WheelPicker toont zijn lijst vanaf item 1
 *   overloop     — inhoud hoger dan de container zonder `overflow` die knipt; de builder zet
 *                  `clipsContent = false`, dus de lijst loopt onder de knop door
 *   inline       — een element met eigen tekst én een kind met tekst (geneste `<Text>`); de
 *                  builder maakt er een frame met een los label van, zonder inline-stroom
 *   center/right — tekst met `textAlign` center of right; sinds 2026-09-09 reist dit mee
 *                  (`t.al`), het getal hier is de referentie waar de spec tegen te tellen is
 *   marge        — een niet-nul CSS-marge; Figma's auto-layout kent geen per-kind marge, dus
 *                  die ruimte verdwijnt en alles eronder schuift op. Gemeten op
 *                  WorkoutDetail/Playground: `margin-top: 28` op de tab-rij, waardoor de rij
 *                  in Figma op y=84 staat en in de browser op y=112. Zonder Figma erbij te
 *                  halen: 84+54+682+84 = 904 tegen een frame van 932
 *
 * Positieve controle, gemeten 2026-09-09 mét dit script (niet afgeleid):
 *
 *   42 schermstories : randkleur 0 (metRand 226) · placeholder 4 · gescrold 11 · overloop 16
 *                      · inline 3 · center/right 32 · marge 40
 *   alle 257 stories : randkleur 0 (metRand 333) · placeholder 7 · gescrold 18 · overloop 93
 *                      · inline 3 · center/right 64 · marge 57
 *
 * `metRand` staat er als de positieve controle bij `randkleur`: zonder hem is nul niet te
 * onderscheiden van een selectie die niets raakt. Die 333 komt bovendien onafhankelijk uit een
 * tweede telling tijdens de bouw van klasse J — twee scripts, hetzelfde getal.
 * `overloop` schommelt (15-16 op de schermstories): een node die precies één pixel overloopt
 * valt aan beide kanten van de `+1`-drempel, afhankelijk van de fontrendering van die run. Over alle 257 stories: marge 57 van
 * 13 237 nodes, verspreid over 38 stories, twaalf unieke waarden. LoginScreen/Playground
 * alleen: placeholder 1, inline 1, center/right 4.
 *
 *   node scripts/walker-blindvlekken.mjs              # totalen + voorbeelden + ratel
 *   node scripts/walker-blindvlekken.mjs --verbose    # plus een regel per story
 *   node scripts/walker-blindvlekken.mjs --alle       # alle stories, niet alleen de schermen
 *   node scripts/walker-blindvlekken.mjs --geen-ratel # alleen rapporteren
 *   node scripts/walker-blindvlekken.mjs --selftest   # elke as één keer opwekken, plus de lege controle
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = join(APP, 'storybook-static');
const VERBOSE = process.argv.includes('--verbose');
const ALLE = process.argv.includes('--alle');
const GEEN_RATEL = process.argv.includes('--geen-ratel');
const SELFTEST = process.argv.includes('--selftest');

/**
 * TWEEZIJDIGE RATEL, op de standaard-scope (de 42 schermstories). Hoger = een nieuwe blinde
 * vlek, lager = winst die je vastlegt door de constante te verlagen. Beide kanten falen; een
 * eenrichtingsratel laat een verbetering stil meereizen en is daarna geen basislijn meer.
 *
 * `stories` staat erbij als NOEMER: valt een story weg, dan dalen alle tellers mee en dat
 * leest als winst. En `leeg` moet nul zijn — een story die niet rendert telt niets, en dat is
 * geen nul maar een gat.
 *
 * `geanimeerd` staat BEWUST NIET in de ratel: die teller schommelt per constructie (14-16
 * gemeten over vier runs), want hij telt containers waarvan de scrollHeight van het
 * meetmoment afhangt. Een ratel eromheen zou één op de drie runs vals alarm slaan, en een
 * wachter die dat doet leer je negeren.
 */
// Bijgesteld 2026-09-14: de noemer ging van 42 naar 46 schermstories — drie auth-schermen
// kregen een `Met Fout` en ActivePhase een `Samenvatting Zonder Gewicht`. Geen enkele teller
// hieronder is een NIEUWE klasse; het zijn dezelfde klassen over meer stories (metRand +19,
// inline +3 — één per foutmelding, centerRight +13, marge +7).
const BEKEND = { stories: 46, randkleur: 0, metRand: 245, placeholder: 4, gescrold: 11,
  overloop: 0, inline: 6, centerRight: 45, marge: 47 };
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.map': 'application/json' };

const SLEUTELS = ['randkleur', 'metRand', 'placeholder', 'gescrold', 'overloop', 'geanimeerd', 'inline', 'centerRight', 'marge'];

/**
 * De ratel als functie, zodat de zelftest hem op BEIDE kanten kan draaien: op de basislijn
 * zelf (leeg) en op een basislijn die één as verschuift (precies die as). Een ratel die alleen
 * in de groene richting gedraaid is, is een aanname over zijn eigen rode kant.
 */
const ratelAfwijkingen = (tot, geteld, leeg, basis) => {
  const uit = [];
  if (geteld !== basis.stories) uit.push(`stories ${geteld} (basislijn ${basis.stories}) — de noemer verschoof, dus elke teller hieronder meet een andere verzameling`);
  if (leeg) uit.push(`${leeg} story/stories zonder render — die tellen nul zonder nul te zijn`);
  for (const k of SLEUTELS) {
    if (k === 'geanimeerd') continue;
    if (tot[k] !== basis[k]) uit.push(`${k} ${tot[k]} (basislijn ${basis[k]}) — ${tot[k] > basis[k] ? 'nieuwe blinde vlek' : 'winst: verlaag de constante in dit script'}`);
  }
  return uit;
};

if (!SELFTEST && !existsSync(join(STATIC, 'index.json'))) {
  console.error('geen storybook-static/index.json — draai eerst `pnpm --filter rowtrack build-storybook`');
  process.exit(2);
}
const index = SELFTEST ? { entries: {} } : JSON.parse(readFileSync(join(STATIC, 'index.json'), 'utf8'));
const SCHERMEN = new Set(['ActivePhase', 'IdlePhase', 'LoginScreen', 'RegisterScreen', 'ForgotPasswordScreen',
  'ResetPasswordScreen', 'HistoryScreen', 'WorkoutDetailScreen', 'ProfileScreen']);
const stories = Object.values(index.entries).filter(e => e.type === 'story' && (ALLE || SCHERMEN.has(e.title.split('/').pop())));
if (!SELFTEST && !stories.length) { console.error('geen stories gevonden in de index'); process.exit(2); }

const server = createServer((q, r) => {
  let p = join(STATIC, decodeURIComponent(q.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': MIME[extname(p)] ?? 'application/octet-stream' }); r.end(readFileSync(p));
});
await new Promise(r => server.listen(0, r));
const poort = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage();
const tot = Object.fromEntries(SLEUTELS.map(k => [k, 0]));
const voorbeelden = [];
let geteld = 0, leeg = 0;

/**
 * De telling zelf, als losse functie zodat de ZELFTEST hem op een synthetische pagina kan
 * draaien. Zolang hij in de story-lus ingebakken zat, was elke as alleen tegen echte
 * stories te toetsen — en twee van de negen (randkleur, overloop) staan op nul, waar een as
 * die niets meet er identiek uitziet als een as die niets vindt.
 */
const meetPagina = () => {
  const root = document.getElementById('storybook-root');
  if (!root || !root.children.length) return null;
  const px = v => parseFloat(v) || 0;
  const uit = { randkleur: 0, metRand: 0, placeholder: 0, gescrold: 0, overloop: 0, geanimeerd: 0, inline: 0, centerRight: 0, marge: 0, vb: [] };
  // Een container met een DRAAIENDE afstammeling heeft geen vaste scrollHeight: de
  // as-gelijnde doos van een roterende node verandert per meetmoment. Gemeten op
  // ActivePhase/Hartslag Zoeken: clientHeight 20, scrollHeight 20 of 23, 30 van 40
  // metingen op dezelfde pagina "overloop" — de teller flipte dus tussen 15 en 16
  // zonder dat er iets veranderde. Dezelfde oorzaak als figma/niet-reproduceerbaar.json
  // (de ActivityIndicator, RNW-keyframes 0->360 in 0,75 s). Zulke containers gaan naar
  // een eigen teller in plaats van de meting: ze verdwijnen niet, ze tellen apart.
  const draaitIets = (el) => [...el.querySelectorAll('*')].some(k => getComputedStyle(k).animationName !== 'none');
  for (const el of root.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const b = [px(cs.borderTopWidth), px(cs.borderRightWidth), px(cs.borderBottomWidth), px(cs.borderLeftWidth)];
    // `metRand` is de POSITIEVE CONTROLE bij `randkleur`: zonder hem is nul niet te
    // onderscheiden van een selectie die niets raakt.
    if (Math.max(...b) > 0) {
      uit.metRand++;
      const k = [cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor];
      if (new Set(k.filter((_, i) => b[i] > 0)).size > 1) {
        uit.randkleur++;
        if (uit.vb.length < 2) uit.vb.push(`randkleur ${b.join('/')} ${k.join(' ')}`);
      }
    }
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.placeholder && !el.value) uit.placeholder++;
    if (el.scrollTop > 0 || el.scrollLeft > 0) uit.gescrold++;
    if (el.scrollHeight > el.clientHeight + 1 && !/hidden|auto|scroll/.test(cs.overflowY)) {
      if (draaitIets(el)) uit.geanimeerd++; else uit.overloop++;
    }
    const eigen = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (eigen && [...el.children].some(k => k.textContent.trim())) { uit.inline++; uit.vb.push(`inline "${el.textContent.trim().slice(0, 36)}"`); }
    if (eigen && /^(center|right|end)$/.test(cs.textAlign)) uit.centerRight++;
    const m = [px(cs.marginTop), px(cs.marginRight), px(cs.marginBottom), px(cs.marginLeft)];
    if (m.some((x) => x !== 0)) { uit.marge++; if (uit.vb.length < 3) uit.vb.push(`marge ${JSON.stringify(m)}${el.getAttribute('data-testid') ? ' testid=' + el.getAttribute('data-testid') : ''}`); }
  }
  return uit;
};

/**
 * ZELFTEST — wekt elke as precies één keer op, op een synthetische pagina, en eist daarnaast
 * dat een pagina ZONDER die vormen overal nul geeft. Twee assen staan op de echte stories op
 * nul (`randkleur`, sinds vandaag ook `overloop`); zonder deze kant is zo'n nul niet te
 * onderscheiden van een teller die niets meet.
 *
 * Het geanimeerde geval draagt het defect zelf: twee IDENTIEKE dozen, één met een draaiend
 * kind. De eerste hoort `overloop` te zijn, de tweede `geanimeerd` — beweegt die scheiding
 * niet, dan sluit de uitsluiting niets uit.
 */
if (SELFTEST) {
  const eis = (naam, ok, detail = '') => {
    console.log(`  ${ok ? 'ok  ' : 'FOUT'}  ${naam}${detail ? ` — ${detail}` : ''}`);
    if (!ok) process.exitCode = 1;
  };
  const FIXTURE = `<style>
      * { margin: 0; padding: 0; box-sizing: border-box; font: 12px sans-serif; }
      /* De browser geeft een <input> vanzelf een rand; zonder deze regel telt \`metRand\` er
         twee en meet de fixture niet meer "precies één van elk" (gemeten). */
      input { border: 0; }
      @keyframes draai { to { transform: rotate(360deg); } }
    </style>
    <div id="storybook-root">
      <div style="width:40px;height:10px;border-top:1px solid rgb(255,0,0);border-bottom:1px solid rgb(0,0,255)"></div>
      <input placeholder="tekst">
      <div id="scroll" style="width:40px;height:20px;overflow:auto"><div style="height:80px"></div></div>
      <div style="width:40px;height:20px;overflow:visible"><div style="height:60px"></div></div>
      <div style="width:40px;height:20px;overflow:visible"><div style="height:60px;animation:draai .75s linear infinite"></div></div>
      <p>tekst <b>kind</b></p>
      <div style="text-align:center">gecentreerd</div>
      <div style="margin-top:4px">marge</div>
    </div>`;
  await page.setContent(FIXTURE);
  await page.evaluate(() => { document.getElementById('scroll').scrollTop = 5; });
  const f = await page.evaluate(meetPagina);
  console.log('\n  fixture — elke as hoort precies één keer te vuren:');
  for (const k of SLEUTELS) eis(k, f && f[k] === 1, f ? `${f[k]}` : 'geen render');

  await page.setContent('<div id="storybook-root"><div>enkel tekst, geen enkele vorm</div></div>');
  const c = await page.evaluate(meetPagina);
  console.log('\n  controle — een pagina zonder die vormen hoort overal nul te geven:');
  for (const k of SLEUTELS) eis(k, c && c[k] === 0, c ? `${c[k]}` : 'geen render');

  console.log('\n  ratel — op de basislijn stil, één as ernaast rood:');
  const basis = { ...BEKEND };
  const opBasislijn = Object.fromEntries(SLEUTELS.map(k => [k, k === 'geanimeerd' ? 99 : basis[k]]));
  eis('basislijn zelf geeft nul afwijkingen', ratelAfwijkingen(opBasislijn, basis.stories, 0, basis).length === 0);
  eis('geanimeerd buiten de ratel (99 tegen de basislijn)', ratelAfwijkingen(opBasislijn, basis.stories, 0, basis).length === 0);
  for (const k of SLEUTELS) {
    if (k === 'geanimeerd') continue;
    for (const delta of [1, -1]) {
      if (basis[k] + delta < 0) continue;
      const m = { ...opBasislijn, [k]: basis[k] + delta };
      const a = ratelAfwijkingen(m, basis.stories, 0, basis);
      eis(`${k} ${delta > 0 ? '+1' : '-1'} → rood, en alleen op ${k}`, a.length === 1 && a[0].startsWith(k + ' '), a[0] ?? 'stil');
    }
  }
  eis('een story minder → rood op de noemer', ratelAfwijkingen(opBasislijn, basis.stories - 1, 0, basis).some(x => x.startsWith('stories ')));
  eis('een story zonder render → rood', ratelAfwijkingen(opBasislijn, basis.stories, 1, basis).some(x => x.includes('zonder render')));

  await browser.close(); server.close();
  console.log(process.exitCode ? '\n  ZELFTEST GEFAALD' : '\n  zelftest ok');
  process.exit(process.exitCode ?? 0);
}

for (const s of stories) {
  const land = /landscape/i.test(s.name);
  await page.setViewportSize({ width: land ? 932 : 430, height: land ? 430 : 932 });
  await page.goto(`http://localhost:${poort}/iframe.html?id=${s.id}&viewMode=story`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);

  const r = await page.evaluate(meetPagina);
  const naam = `${s.title.split('/').pop()}/${s.name}`;
  if (!r) { leeg++; if (VERBOSE) console.log(`  ${naam}: geen render`); continue; }
  geteld++;
  for (const k of SLEUTELS) tot[k] += r[k];
  for (const v of r.vb) if (voorbeelden.length < 8) voorbeelden.push(`${naam}: ${v}`);
  if (VERBOSE) console.log(`  ${naam}: randkleur=${r.randkleur}/${r.metRand} placeholder=${r.placeholder} gescrold=${r.gescrold} overloop=${r.overloop} inline=${r.inline} center/right=${r.centerRight} marge=${r.marge}`);
}
await browser.close(); server.close();

console.log(`\nwalker-blindvlekken — ${geteld} stories geteld${leeg ? `, ${leeg} zonder render` : ''}\n`);
for (const k of SLEUTELS) console.log(`  ${k.padEnd(12)} ${String(tot[k]).padStart(5)}`);
if (voorbeelden.length) { console.log('\n  voorbeelden:'); voorbeelden.forEach(v => console.log('    ' + v)); }

if (GEEN_RATEL || ALLE) {
  console.log(`\n  ratel overgeslagen (${ALLE ? '--alle: andere scope dan de basislijn' : '--geen-ratel'}).`);
  console.log('  Elk getal boven nul is een eigenschap die de walker niet leest.');
} else {
  const afwijkingen = ratelAfwijkingen(tot, geteld, leeg, BEKEND);
  console.log(`\n  geanimeerd ${tot.geanimeerd} staat buiten de ratel (meetmoment-afhankelijk, gemeten 14-16).`);
  if (afwijkingen.length) {
    console.error(`\n  RATEL — ${afwijkingen.length} afwijking(en) van de basislijn:`);
    afwijkingen.forEach(a => console.error('    ' + a));
    process.exit(1);
  }
  console.log(`  ok — ${SLEUTELS.length - 1} assen op de basislijn, over ${geteld} stories.`);
}
