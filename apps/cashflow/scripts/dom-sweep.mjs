#!/usr/bin/env node
/**
 * Contrast-sweep over een gerenderde DOM — driver A: statische bestanden.
 *
 *   pnpm --filter cashflow sweep            # de twee harness-bestanden
 *   pnpm --filter cashflow sweep --selftest # bewijst dat hij kan falen
 *   node scripts/dom-sweep.mjs pad/naar.html [nog-een.html]
 *
 * Waarom dit bestaat: `@umanex/tokens contrast` toetst de rollaag — elke combinatie die
 * volgens de tokens mág voorkomen. Wat het niet weet is welke combinaties er in een
 * component écht ontstaan: tekst op een geneste achtergrond, een alpha-vlak boven een
 * ander vlak, een kleur die pas door overerving zijn ondergrond krijgt. Die helft werd
 * tot nu toe met de hand in een browserconsole gedaan, met drie meetfouten onderweg.
 *
 * De meting zelf staat in `contrast.mjs` en wordt gedeeld met `flow-harness.mjs`, die
 * hem op de dráaiende app draait. Deze driver dekt wat statisch te renderen is; die
 * andere dekt `MonthCard` en de modals, die aan dnd-kit en de store hangen.
 *
 * Wat hij NIET dekt, en dat is bewust: tekst boven een gradient of afbeelding. Die
 * worden geteld en gemeld als "onmeetbaar", niet stil overgeslagen.
 */
import { chromium } from 'playwright';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { beoordeel, beschrijfFout, meetInPagina, STIL_CSS } from './contrast.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const DEFAULT_PAGINAS = [
  { pad: `${APP}/.screens-preview.html`, maak: 'pnpm --filter cashflow render:screens' },
  { pad: `${APP}/.charts-preview.html`, maak: 'pnpm --filter cashflow render:charts' },
];

// ── Zelftest ─────────────────────────────────────────────────────────────────
// Een guard die nooit faalt is decoratie. Deze fixture dwingt elk pad één keer af:
// een echte fout, een geldig geval, de grote-tekst-uitzondering, alpha-compositing
// (waar "eerste ondoorzichtige wint" het verkeerde antwoord geeft), een verborgen
// element, en tekst op een gradient.

const SELFTEST_HTML = `<!doctype html><meta charset="utf-8"><body style="background:#fff">
  <p id="zakt" style="color:#9a9a9a;background:#ffffff;font-size:14px">grijs op wit, 2.8:1</p>
  <p id="haalt" style="color:#333333;background:#ffffff;font-size:14px">donkergrijs op wit</p>
  <p id="groot" style="color:#949494;background:#ffffff;font-size:28px">groot en grijs, mag 3.0</p>
  <p id="grootzakt" style="color:#bbbbbb;background:#ffffff;font-size:28px">groot maar te licht</p>
  <div style="background:#000000">
    <div style="background:rgba(255,255,255,0.92)">
      <p id="alpha" style="color:#8a8a8a;font-size:14px">op een 92%-wit vlak boven zwart</p>
    </div>
  </div>
  <p id="verborgen" style="color:#fefefe;background:#ffffff;display:none">onzichtbaar, telt niet</p>
  <p id="opacity0" style="color:#fefefe;background:#ffffff;opacity:0">ook onzichtbaar</p>
  <div style="background:#111111">
    <p id="donker" style="color:#3a3a3a;font-size:14px">te donker op donker</p>
  </div>
  <p id="gradient" style="background:linear-gradient(#fff,#000);color:#888;font-size:14px">onmeetbaar</p>
  <button id="uit" disabled style="color:#cccccc;background:#ffffff;font-size:14px">inactieve knop</button>
  <fieldset disabled style="background:#ffffff">
    <span id="uit2" style="color:#cccccc;font-size:14px">in een uitgeschakelde fieldset</span>
  </fieldset>
</body>`;

// Wat er moet uitkomen. `null` = mag niet als fout verschijnen.
const SELFTEST_VERWACHT = [
  { tekst: 'grijs op wit', faalt: true },
  { tekst: 'donkergrijs op wit', faalt: false },
  { tekst: 'groot en grijs', faalt: false }, // 3.03:1 — zakt onder 4.5 maar haalt de grote-tekstdrempel
  { tekst: 'groot maar te licht', faalt: true },
  { tekst: 'op een 92%-wit vlak', faalt: true },
  { tekst: 'onzichtbaar, telt niet', faalt: false },
  { tekst: 'ook onzichtbaar', faalt: false },
  { tekst: 'te donker op donker', faalt: true }, // een donker paneel binnen een light pagina
  { tekst: 'inactieve knop', faalt: false }, // WCAG 1.4.3 zondert inactieve componenten uit
  { tekst: 'in een uitgeschakelde fieldset', faalt: false }, // de uitzondering erft
];

async function zelftest(browser) {
  const tijdelijk = `${APP}/.dom-sweep-selftest.html`;
  writeFileSync(tijdelijk, SELFTEST_HTML);
  try {
    const uitkomst = await sweepPagina(browser, tijdelijk);
    const { fouten, onmeetbaar } = beoordeel(uitkomst);
    const problemen = [];

    for (const verwacht of SELFTEST_VERWACHT) {
      const gevonden = fouten.find((f) => f.voorbeeldTekst.includes(verwacht.tekst));
      if (verwacht.faalt && !gevonden) {
        problemen.push(`"${verwacht.tekst}" had als fout gemeld moeten worden, maar glipte door`);
      } else if (!verwacht.faalt && gevonden) {
        problemen.push(`"${verwacht.tekst}" is ten onrechte als fout gemeld (${gevonden.ratio.toFixed(2)}:1)`);
      }
    }

    if (!onmeetbaar.some((o) => o.tekst.includes('onmeetbaar'))) {
      problemen.push('tekst op een gradient had als onmeetbaar gemeld moeten worden');
    }

    if (problemen.length) {
      console.error('\n✗ zelftest: de sweep meet niet wat hij hoort te meten\n');
      for (const p of problemen) console.error(`  - ${p}`);
      console.error('');
      return false;
    }
    console.log(`✓ zelftest: ${SELFTEST_VERWACHT.length} gevallen + de gradient-uitzondering kloppen`);
    return true;
  } finally {
    unlinkSync(tijdelijk);
  }
}

// ── Uitvoeren ────────────────────────────────────────────────────────────────

async function sweepPagina(browser, pad) {
  const page = await browser.newPage();
  // Geen enkele animatie of transition mag lopen tijdens het meten — dat was
  // meetfout nummer één van de handmatige ronde.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(pathToFileURL(pad).href, { waitUntil: 'load' });
  await page.addStyleTag({ content: STIL_CSS });
  const uitkomst = await page.evaluate(meetInPagina);
  await page.close();
  return uitkomst;
}

const argumenten = process.argv.slice(2);
const isZelftest = argumenten.includes('--selftest');
const opgegeven = argumenten.filter((a) => !a.startsWith('--'));

const browser = await chromium.launch();
let faalt = false;

try {
  if (isZelftest) {
    faalt = !(await zelftest(browser));
  } else {
    const paginas = opgegeven.length
      ? opgegeven.map((p) => ({ pad: resolve(p), maak: null }))
      : DEFAULT_PAGINAS;

    const ontbrekend = paginas.filter((p) => !existsSync(p.pad));
    if (ontbrekend.length) {
      console.error('\n✗ dom-sweep: er valt niets te meten\n');
      for (const o of ontbrekend) {
        console.error(`  ${o.pad} bestaat niet${o.maak ? `\n      maak hem met: ${o.maak}` : ''}`);
      }
      console.error('');
      process.exit(1);
    }

    // De zelftest draait altijd mee. Een sweep die 0 fouten meldt zegt alleen iets
    // als bewezen is dat hij fouten kán melden.
    if (!(await zelftest(browser))) faalt = true;

    let totaalGemeten = 0;
    let totaalOnmeetbaar = 0;
    let totaalVrijgesteld = 0;

    for (const { pad } of paginas) {
      const { fouten, gemeten, onmeetbaar, vrijgesteld } = beoordeel(await sweepPagina(browser, pad));
      totaalGemeten += gemeten;
      totaalOnmeetbaar += onmeetbaar.length;
      totaalVrijgesteld += vrijgesteld;
      const naam = pad.replace(`${APP}/`, '');

      if (fouten.length) {
        faalt = true;
        console.error(`\n✗ ${naam}: ${fouten.length} kleurcombinatie(s) onder AA (${gemeten} tekstelementen gemeten)\n`);
        for (const f of fouten) console.error(`${beschrijfFout(f)}\n`);
      } else {
        console.log(`✓ ${naam}: ${gemeten} tekstelementen, alles boven AA`);
      }

      if (onmeetbaar.length) {
        console.log(`  ${onmeetbaar.length} niet gemeten (${onmeetbaar[0].reden}) — tel ze niet als geslaagd`);
      }
    }

    if (!faalt) {
      console.log(`\n✓ dom-sweep: ${totaalGemeten} tekstelementen boven AA`);
      if (totaalOnmeetbaar) console.log(`  ${totaalOnmeetbaar} onmeetbaar, met de hand te beoordelen`);
      if (totaalVrijgesteld) console.log(`  ${totaalVrijgesteld} vrijgesteld (inactieve componenten, WCAG 1.4.3)`);
      console.log('  MonthCard en de modals zitten in de flow-harness, niet hier.');
    }
  }
} finally {
  await browser.close();
}

process.exit(faalt ? 1 : 0);
