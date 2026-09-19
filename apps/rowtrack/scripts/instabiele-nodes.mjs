#!/usr/bin/env node
/**
 * Meet welke nodes NIET reproduceerbaar zijn — en levert daarmee de enige eerlijke
 * uitsluitingslijst voor `geometry-parity.mjs`.
 *
 * HET PROBLEEM. De eerste recursieve parity-run (2026-09-08) gaf 134 verschillen, waarvan 114
 * op nodes die per meetmoment een andere maat hebben. Twee bronnen:
 *
 *  · De `<ActivityIndicator>` ROTEERT (react-native-web 0.21.2, exports/ActivityIndicator:
 *    `animationKeyframes: 0% rotate(0deg) -> 100% rotate(360deg)`, 0,75 s, oneindig).
 *    `getBoundingClientRect()` geeft de AS-GELIJNDE omhullende doos, en die is voor een
 *    geroteerd vierkant `zijde * (|cos t| + |sin t|)` — tussen 20 en 28,3 px voor een zijde
 *    van 20. Welk getal je meet hangt af van het moment waarop de walker kijkt.
 *  · De confetti in MotivationalToast is GERANDOMISEERD (`size = 6 + random * 8`).
 *
 * WAAROM DIT EEN SCRIPT IS EN GEEN LIJST IN DE CODE. Een handgeschreven uitsluiting is een
 * bewering; deze is een meting die zijn eigen bewijs draagt. Draai dezelfde walker twee keer
 * en vergelijk node voor node op boompad: wat tussen twee runs van ONGEWIJZIGDE code verschilt,
 * kan per definitie door geen enkele statische vergelijking gemeten worden. Wat stabiel is,
 * blijft in de meting — dus een echte afwijking kan zich hier niet in verstoppen.
 *
 * Gemeten 2026-09-08: 140 van 2 094 nodes instabiel (68 spinnerArc, 34 spinnerBox,
 * 34 spinnerSvg, 4 confetti-item). De 20 tekst-hoogteverschillen die parity óók meldde staan
 * er NIET in — die zijn reproduceerbaar en dus een echt verschil tussen de twee tekstengines.
 *
 * Kost: twee volledige walker-runs. Draai hem opnieuw wanneer er een animatie of een
 * gerandomiseerde node bij komt of weggaat; de uitkomst is een gecommit artefact.
 *
 * Gebruik: node scripts/instabiele-nodes.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { echteKinderen, kindPad } from './spec-boom.mjs';

const APP = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIN = join(APP, 'figma/build-spec.min.json');
const runs = [];

for (const n of [1, 2]) {
  process.stderr.write(`run ${n}/2 …\n`);
  execFileSync('npm', ['run', '--silent', 'figma:spec'], { cwd: APP, stdio: ['ignore', 'ignore', 'inherit'] });
  const kopie = join(tmpdir(), `rowtrack-spec-run${n}.json`);
  copyFileSync(MIN, kopie);
  runs.push(JSON.parse(readFileSync(kopie, 'utf8')));
}

const [a, b] = runs;
const paden = new Set();
let bezocht = 0;

/**
 * Alle velden die de STRENGSTE consument vergelijkt (`spec-diff.mjs`), niet alleen die van
 * `parity`. Een node die tussen twee runs van ónveranderde code op wélk veld dan ook verschilt,
 * kan door geen enkele statische vergelijking gemeten worden — dat geldt net zo goed voor
 * tekstinhoud als voor een maat.
 *
 * Gemeten 2026-09-08: met alleen de geometrie-velden bleef `ActivePhase[Samenvatting] > dateText`
 * buiten de lijst, terwijl die de KLOK toont (`new Date()` in `summaryDateLabel`). De twee runs
 * liggen minuten uit elkaar, dus de brede vergelijking vangt hem vanzelf — geen handmatige
 * uitzondering nodig. Snede 8 maakt hem overbodig: `SummaryTitle` krijgt `dateLabel` als prop,
 * en dan zet de story een vaste waarde.
 */
function loop(x, y, pad) {
  if (!x || !y) return;
  bezocht++;
  const anders = ['w', 'h', 'gap', 'opacity', 'border', 'rij', 'justify', 'align', 'positie'].some((v) => (x[v] ?? null) !== (y[v] ?? null))
    || (x.radius ?? [0])[0] !== (y.radius ?? [0])[0]
    || (x.padding ?? [0, 0, 0, 0]).join() !== (y.padding ?? [0, 0, 0, 0]).join()
    || (x.t?.s ?? null) !== (y.t?.s ?? null);
  if (anders) paden.add(pad);
  // DEZELFDE kindregel als parity: zonder de opgevouwen achtergrondkinderen. Anders lopen de
  // indices uiteen en sluit deze lijst paden uit die in de vergelijking niet bestaan
  // (gemeten 2026-09-08: 31 van 140 matchten).
  const k1 = echteKinderen(x), k2 = echteKinderen(y);
  if (k1.length !== k2.length) paden.add(pad);
  for (let i = 0; i < Math.min(k1.length, k2.length); i++)
    loop(k1[i], k2[i], kindPad(pad, i, k1[i]));
}

for (const [soort, uit] of [['componenten', (d) => d.varianten], ['schermen', (d) => d.frames]])
  for (const [comp, d] of Object.entries(a[soort] ?? {})) {
    const e = b[soort]?.[comp];
    if (!e) continue;
    uit(d).forEach((v, i) => {
      const w = uit(e)[i];
      if (!w) return;
      loop(v.boom, w.boom, `${comp}[${v.naam}]`);
      (v.overlays ?? []).forEach((o, j) => loop(o, (w.overlays ?? [])[j], `${comp}[${v.naam}]#overlay${j}`));
    });
  }

/**
 * SLUITEN, EN WAAROM DAT NODIG BLIJFT. De rauwe meting krimpt en groeit door meetgeluk: drie
 * runs op ongewijzigde code gaven 4, 4 en 7 paden. Een node die op twee meetmomenten toevallig
 * dezelfde maat had, valt uit de lijst en komt daarna terug als "echt verschil". Een
 * uitsluitingslijst die per run wisselt is geen uitsluitingslijst.
 *
 * De sluiting wordt getoetst: ze moet een SUPERSET van de meting zijn. Is ze dat niet, dan
 * beschrijft ze niet wat er gemeten is en stopt het script. Hoe ze werkt, staat hieronder.
 */
const gemeten = paden.size;
const gemetenPaden = new Set(paden);

/**
 * OMHOOG, EN ÉÉN NIVEAU OMLAAG — en niet meer.
 *
 * Tot 2026-09-19 sloot dit `spinnerBox` en alles eronder. Dat was juist zolang de walker de
 * geroteerde doos van de `ActivityIndicator` mat, maar sinds de spinner-normalisatie
 * (2026-09-14) geeft hij elke node bínnen een spinner de doos van de ongeroteerde ouder. Drie
 * runs op ongewijzigde code: **nul** spinner-nodes gemeten instabiel, terwijl de sluiting er
 * 292 uitsloot — 73 `spinnerBox`, 73 `spinnerSvg`, 146 `spinnerArc`. `parity` vergeleek die
 * dus niet, niet omdat ze bewegen maar omdat de rolnaam in de sluiting stond.
 *
 * Wat er WEL beweegt is de confetti, en die beweegt anders dan de spinner: `size = 6 +
 * random * 8` verandert de maat van de node zélf én daarmee van elke VOOROUDER die om hem
 * heen sluit. Gemeten over drie runs: 4, 4 en **7** — en die drie extra waren `MotivationalToast`,
 * zijn `overlay` en zijn `card`, geen nieuwe confetti. Een padlijst van alleen de gemeten
 * nodes is daarom per run anders, en dat is precies de flakiness waartegen de oude sluiting
 * bedoeld was.
 *
 * De sluiting volgt nu de MECHANIEK in plaats van een rolnaam:
 *  - **omhoog**, elke voorouder tot de variantwortel: de maat van een ouder hangt af van zijn
 *    kinderen, dus een instabiel kind maakt zijn hele keten instabiel;
 *  - **omlaag vanaf de OUDER** van een gemeten node: broertjes met dezelfde herkomst (de vier
 *    confetti-items) zijn hetzelfde soort ding, en welke van de vier een run betrapt is een
 *    dobbelsteen.
 *
 * Dat is stabiel over runs — run 1 (4 items) sluit dezelfde set als run 3 (7) — en het is
 * afgeleid van wat er gemeten is, niet van wat iemand ooit opschreef. Sluit een toekomstige
 * regressie de spinner weer in, dan komt hij er vanzelf weer bij.
 */
const ouderPaden = new Set(
  [...gemetenPaden].map((p) => p.slice(0, p.lastIndexOf('>'))).filter((p) => p.includes('>') || p.includes('[')),
);
for (const p of gemetenPaden) {
  let q = p;
  while (q.includes('>')) {
    q = q.slice(0, q.lastIndexOf('>'));
    paden.add(q);
  }
}
function sluitAf(node, pad, binnen) {
  const in2 = binnen || ouderPaden.has(pad);
  if (in2) paden.add(pad);
  echteKinderen(node).forEach((k, i) => sluitAf(k, kindPad(pad, i, k), in2));
}
for (const [soort, uit] of [['componenten', (d) => d.varianten], ['schermen', (d) => d.frames]])
  for (const [comp, d] of Object.entries(a[soort] ?? {}))
    uit(d).forEach((v) => {
      sluitAf(v.boom, `${comp}[${v.naam}]`, null);
      (v.overlays ?? []).forEach((o, j) => sluitAf(o, `${comp}[${v.naam}]#overlay${j}`, null));
    });

for (const p of gemetenPaden)
  if (!paden.has(p)) {
    console.error(`de klasse-sluiting mist een GEMETEN instabiel pad: ${p}`);
    console.error('de klasse beschrijft niet wat er gemeten is — pas hem aan, sluit niets uit.');
    process.exit(2);
  }

/**
 * EEN TWEEDE LIJST, MET EEN ANDERE REDEN — en die reden is het hele punt.
 *
 * Toen de spinner uit de uitsluiting verdween, werd `parity` rood op **208 nodes, alle 208 een
 * spinner en alle 208 een hoogteverschil**: de browser meet 20 (de genormaliseerde, ongeroteerde
 * maat) en Figma 17,5 tot 22,6 — elk een andere rotatiehoek. Dat is geen instabiliteit. Dat is
 * een Figma-document dat zijn spinners gebouwd heeft uit de gerótéerde metingen van vóór de
 * normalisatie van 2026-09-14, en sindsdien niet herbouwd is.
 *
 * Die nodes horen dus wél overgeslagen te worden, maar niet onder de vlag "niet te meten".
 * Onder die vlag is het een eigenschap van de werkelijkheid en sluit niemand het ooit; onder
 * deze vlag is het schuld met een datum en een uitweg. Herbouw de spinners in Figma, lees de
 * geometrie opnieuw, en deze lijst hoort leeg te worden — dát is de tegenproef.
 *
 * `parity` telt ze apart en noemt ze bij naam, zodat het aantal niet stil kan groeien.
 */
const verouderdInFigma = [];
function sluitVerouderd(node, pad, binnen) {
  const in2 = binnen || node.naam === 'spinnerBox';
  if (in2 && !paden.has(pad)) verouderdInFigma.push(pad);
  echteKinderen(node).forEach((k, i) => sluitVerouderd(k, kindPad(pad, i, k), in2));
}
for (const [soort, uit] of [['componenten', (d) => d.varianten], ['schermen', (d) => d.frames]])
  for (const [comp, d] of Object.entries(a[soort] ?? {}))
    uit(d).forEach((v) => {
      sluitVerouderd(v.boom, `${comp}[${v.naam}]`, null);
      (v.overlays ?? []).forEach((o, j) => sluitVerouderd(o, `${comp}[${v.naam}]#overlay${j}`, null));
    });

const perNaam = {};
for (const p of paden) {
  const n = p.split('>').pop().replace(/^\d+:/, '');
  perNaam[n] = (perNaam[n] ?? 0) + 1;
}
writeFileSync(join(APP, 'figma/niet-reproduceerbaar.json'), JSON.stringify({
  $comment: 'GEGENEREERD door scripts/instabiele-nodes.mjs — twee walker-runs, node voor node op boompad. '
    + 'Deze nodes hebben per meetmoment een andere maat (roterende spinner, gerandomiseerde confetti) en '
    + 'kunnen dus door geen enkele statische vergelijking gemeten worden. NIET met de hand aanvullen: een '
    + 'echte afwijking hoort hier niet in te kunnen verdwijnen.',
  gegenereerd: new Date().toISOString().slice(0, 10),
  bezocht, gemeten, instabiel: paden.size, perNaam,
 /**
  * De KLASSE, naast de paden. Een padlijst veroudert zodra er een component bijkomt dat
  * hetzelfde defect draagt: gemeten 2026-09-09 gaf `spec-diff` 56 verschillen op de spinners
  * van KpiRow, puur omdat die story ná de laatste hermeting in de basislijn kwam. Drie keer
  * hermeten voor iets waarvan de klasse al vaststaat, is geen meting maar onderhoud.
  *
  * Een consument sluit daarom uit: het pad staat in `paden`, ÓF een segment van het pad heet
  * zoals een naam in `klassen`. Alleen namen die `rnwRol` uitdeelt komen hierin — die zijn
  * per constructie uniek. `item` (confetti) en `dateText` (klok) blijven padgebonden: dat zijn
  * gewone laagnamen die elders iets anders kunnen betekenen.
  */
 klassen: [],
 redenen: {
  item: 'confetti in MotivationalToast — size = 6 + random * 8, dus per render een andere maat. '
    + 'De sluiting gaat OMHOOG (elke voorouder erft de instabiliteit van zijn kind) en één niveau '
    + 'omlaag vanaf de ouder (welk van de vier items een run betrapt, is een dobbelsteen). '
    + 'Gemeten over drie runs: 4, 4 en 7 gemeten nodes, dezelfde gesloten set.',
  spinner: 'NIET MEER UITGESLOTEN sinds 2026-09-19. De react-native-web ActivityIndicator roteert, '
    + 'maar sinds de spinner-normalisatie van 2026-09-14 geeft de walker elke node binnen een spinner '
    + 'de doos van de ongeroteerde ouder. Drie runs op ongewijzigde code gaven nul instabiele '
    + 'spinner-nodes, terwijl de oude rolnaam-sluiting er 292 uitsloot (73 spinnerBox, 73 spinnerSvg, '
    + '146 spinnerArc). Die vergelijkt parity nu weer.',
 },
  paden: [...paden].sort(),
 /**
  * Nodes die parity overslaat omdat de FIGMA-kant verouderd is, niet omdat ze bewegen.
  * Zie `sluitVerouderd` hierboven. Leeg = de Figma-spinners zijn herbouwd na de
  * normalisatie van 2026-09-14 en dit gat is dicht.
  */
 verouderdInFigma: verouderdInFigma.sort(),
 verouderdReden: 'spinner-nodes in Figma zijn gebouwd uit de GEROTEERDE metingen van vóór de '
   + 'normalisatie van 2026-09-14. Gemeten 2026-09-19: 208 hoogteverschillen, browser 20 tegen '
   + 'Figma 17,5-22,6. Herbouw de spinners in Figma en lees de geometrie opnieuw; dan hoort deze '
   + 'lijst leeg te zijn. Dit is schuld met een datum, geen eigenschap.',
}, null, 1));
console.log(`${gemeten} van ${bezocht} nodes gemeten instabiel, gesloten tot ${paden.size} -> figma/niet-reproduceerbaar.json`);
console.log(`${verouderdInFigma.length} nodes apart gezet als VEROUDERD IN FIGMA (spinner, gebouwd vóór de normalisatie van 2026-09-14) — dat is schuld, geen instabiliteit.`);
for (const [k, v] of Object.entries(perNaam).sort((x, y) => y[1] - x[1])) console.log(`  ${String(v).padStart(4)} ${k}`);
