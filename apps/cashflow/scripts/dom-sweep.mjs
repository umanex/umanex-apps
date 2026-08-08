#!/usr/bin/env node
/**
 * Contrast-sweep over een gerenderde DOM.
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
 * De twee lessen uit die handmatige ronde zitten hier ingebakken:
 *   1. Nooit meten terwijl er iets beweegt. De harness meet een statisch bestand en dooft
 *      bovendien elke transition — een sweep midden in `transition-colors` meet een
 *      tussenkleur die nergens op het scherm blijft staan.
 *   2. Alleen elementen die zelf tekst dragen. `input[class*="border-input"]` matchte
 *      destijds ook de checkbox; dit script kijkt naar directe tekst-nodes, niet naar
 *      class-namen.
 *
 * Wat hij NIET dekt, en dat is bewust:
 *   - `MonthCard` en de modals — die hangen aan dnd-kit en de store en staan niet in de
 *     harness. Het grootste scherm van de app blijft dus ongedekt (zie HANDOFF).
 *   - tekst boven een gradient of afbeelding. Die worden geteld en gemeld als
 *     "onmeetbaar", niet stil overgeslagen.
 */
import { chromium } from 'playwright';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = resolve(HERE, '..');

const AA_NORMAAL = 4.5;
const AA_GROOT = 3.0;

// Grote tekst volgens WCAG: >=24px, of >=18.66px wanneer hij bold is.
const GROOT_PX = 24;
const GROOT_BOLD_PX = 18.66;
const BOLD = 700;

const DEFAULT_PAGINAS = [
  { pad: `${APP}/.screens-preview.html`, maak: 'pnpm --filter cashflow render:screens' },
  { pad: `${APP}/.charts-preview.html`, maak: 'pnpm --filter cashflow render:charts' },
];

// ── De meting, uitgevoerd ín de pagina ───────────────────────────────────────
// Alles binnen deze functie draait in de browser. Ze geeft rauwe getallen terug; het
// oordeel (drempel, pass/fail) valt in Node, zodat het hier testbaar en leesbaar blijft.

function meetInPagina() {
  const parseKleur = (waarde) => {
    const m = waarde.match(/^rgba?\(([^)]+)\)$/);
    if (!m) return null;
    const d = m[1].split(',').map((v) => parseFloat(v.trim()));
    if (d.length < 3 || d.some(Number.isNaN)) return null;
    return { r: d[0], g: d[1], b: d[2], a: d.length > 3 ? d[3] : 1 };
  };

  /** src over dst leggen. Standaard alpha-compositing, niet "eerste ondoorzichtige wint". */
  const overElkaar = (src, dst) => ({
    r: src.r * src.a + dst.r * (1 - src.a),
    g: src.g * src.a + dst.g * (1 - src.a),
    b: src.b * src.a + dst.b * (1 - src.a),
    a: 1,
  });

  const zichtbaar = (el) => {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false;
    if (parseFloat(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };

  /**
   * WCAG 2.1 SC 1.4.3 zondert inactieve componenten expliciet uit: "text ... that is
   * part of an inactive user interface component ... has no contrast requirement".
   * Zonder deze uitzondering meldt élke `disabled:opacity-50`-knop een fout, en dan
   * leert de sweep je alleen maar om hem te negeren.
   */
  const inactief = (el) => el.closest('[disabled],[aria-disabled="true"],:disabled') !== null;

  const resultaten = [];
  const onmeetbaar = [];
  let vrijgesteld = 0;

  for (const el of document.querySelectorAll('*')) {
    // Alleen elementen met eigen tekst. Een wrapper erft geen meetplicht van zijn kind:
    // die tekst wordt bij het kind zelf al gemeten.
    const eigenTekst = [...el.childNodes]
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!eigenTekst) continue;

    if (inactief(el)) { vrijgesteld += 1; continue; }

    // Een onzichtbare ouder maakt het kind onzichtbaar; loop de keten af.
    let keten = el;
    let verborgen = false;
    while (keten && keten !== document.documentElement) {
      if (!zichtbaar(keten)) { verborgen = true; break; }
      keten = keten.parentElement;
    }
    if (verborgen) continue;

    const stijl = getComputedStyle(el);
    const fontSize = parseFloat(stijl.fontSize);
    if (!fontSize) continue;

    const tekstKleur = parseKleur(stijl.color);
    if (!tekstKleur || tekstKleur.a === 0) continue;

    // Effectieve achtergrond: van het element omhoog compositen tot ondoorzichtig.
    // De opacity van élke laag telt mee in zijn alpha — anders meet je een vlak dat
    // op 40% staat alsof het vol is.
    let onder = { r: 0, g: 0, b: 0, a: 0 };
    let node = el;
    let gradient = null;

    while (node) {
      const s = getComputedStyle(node);
      if (s.backgroundImage && s.backgroundImage !== 'none' && !gradient) {
        gradient = node === el ? 'op het element zelf' : 'op een ouder';
      }
      const bg = parseKleur(s.backgroundColor);
      if (bg && bg.a > 0) {
        const laag = { ...bg, a: bg.a * parseFloat(s.opacity || '1') };
        // `onder` is wat we al verzameld hebben (dichter bij de tekst), dus die gaat
        // bovenop deze diepere laag.
        onder = onder.a === 0 ? laag : overElkaar(onder, laag);
        if (onder.a >= 0.999) break;
      }
      node = node.parentElement;
    }

    if (onder.a < 0.999) {
      // Niets ondoorzichtigs gevonden tot aan de wortel: de canvas-kleur is wit.
      onder = overElkaar(onder, { r: 255, g: 255, b: 255, a: 1 });
    }

    if (gradient) {
      onmeetbaar.push({ tekst: eigenTekst.slice(0, 60), reden: `achtergrondafbeelding/gradient ${gradient}` });
      continue;
    }

    const tekst = tekstKleur.a < 1 ? overElkaar(tekstKleur, onder) : tekstKleur;

    // Kort pad voor de melding — genoeg om het terug te vinden, niet het hele DOM-pad.
    const beschrijf = (n) =>
      n.tagName.toLowerCase() +
      (n.id ? `#${n.id}` : '') +
      (typeof n.className === 'string' && n.className.trim()
        ? `.${n.className.trim().split(/\s+/).slice(0, 3).join('.')}`
        : '');
    const pad = [el.parentElement, el].filter(Boolean).map(beschrijf).join(' > ');

    resultaten.push({
      pad,
      tekst: eigenTekst.slice(0, 60),
      fontSize,
      fontWeight: parseInt(stijl.fontWeight, 10) || 400,
      voor: [tekst.r, tekst.g, tekst.b],
      achter: [onder.r, onder.g, onder.b],
    });
  }

  return { resultaten, onmeetbaar, vrijgesteld };
}

// ── Oordeel, in Node ─────────────────────────────────────────────────────────

const kanaal = (v) => {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminantie = ([r, g, b]) => 0.2126 * kanaal(r) + 0.7152 * kanaal(g) + 0.0722 * kanaal(b);
const verhouding = (a, b) => {
  const [hoog, laag] = [luminantie(a), luminantie(b)].sort((p, q) => q - p);
  return (hoog + 0.05) / (laag + 0.05);
};

const drempelVoor = ({ fontSize, fontWeight }) =>
  fontSize >= GROOT_PX || (fontSize >= GROOT_BOLD_PX && fontWeight >= BOLD) ? AA_GROOT : AA_NORMAAL;

const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Eén bevinding per kleurcombinatie, niet per element — anders spamt een zebra-tabel. */
function beoordeel({ resultaten, onmeetbaar, vrijgesteld }) {
  const perCombinatie = new Map();

  for (const r of resultaten) {
    const ratio = verhouding(r.voor, r.achter);
    const drempel = drempelVoor(r);
    if (ratio >= drempel) continue;

    const sleutel = `${hex(r.voor)}|${hex(r.achter)}|${drempel}`;
    const bestaand = perCombinatie.get(sleutel);
    if (bestaand) {
      bestaand.aantal += 1;
      if (r.tekst.length > bestaand.voorbeeldTekst.length) {
        bestaand.voorbeeldTekst = r.tekst;
        bestaand.voorbeeldPad = r.pad;
      }
      continue;
    }
    perCombinatie.set(sleutel, {
      voor: hex(r.voor),
      achter: hex(r.achter),
      ratio,
      drempel,
      fontSize: r.fontSize,
      fontWeight: r.fontWeight,
      aantal: 1,
      voorbeeldTekst: r.tekst,
      voorbeeldPad: r.pad,
    });
  }

  return {
    fouten: [...perCombinatie.values()].sort((a, b) => a.ratio - b.ratio),
    gemeten: resultaten.length,
    onmeetbaar,
    vrijgesteld,
  };
}

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
  await page.addStyleTag({
    content: '*,*::before,*::after{transition:none!important;animation:none!important}',
  });
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
        for (const f of fouten) {
          const waar = f.aantal === 1 ? '1 element' : `${f.aantal} elementen`;
          console.error(`  ${f.voor} op ${f.achter} — ${waar}`);
          console.error(`      ${f.ratio.toFixed(2)}:1, nodig ${f.drempel}:1 (${f.fontSize}px/${f.fontWeight})`);
          console.error(`      "${f.voorbeeldTekst}"`);
          console.error(`      ${f.voorbeeldPad}\n`);
        }
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
      console.log('  Niet gedekt: MonthCard en de modals staan niet in de harness.');
    }
  }
} finally {
  await browser.close();
}

process.exit(faalt ? 1 : 0);
