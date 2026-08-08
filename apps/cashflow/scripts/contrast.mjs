/**
 * De contrast-meting, losgemaakt van zijn driver.
 *
 * Twee drivers gebruiken hem:
 *   - `dom-sweep.mjs`    — statische bestanden (de rollaag, de charts)
 *   - `flow-harness.mjs` — de draaiende app, mét `MonthCard` en de modals open
 *
 * Waarom losgemaakt: de meting kon alleen een HTML-bestand lezen, dus alles wat een
 * draaiende app nodig heeft — de store, dnd-kit, een geopende modal — viel buiten élke
 * contrast-guard. Het grootste scherm van de app was dus ongedekt. Het antwoord daarop is
 * niet `MonthCard` nabouwen in een render-harness (dan meet je de layout die de harness
 * zelf neerzet), maar dezelfde meting op de échte pagina kunnen draaien.
 *
 * Twee lessen uit de handmatige ronde die hieraan voorafging zitten hier ingebakken:
 *   1. Nooit meten terwijl er iets beweegt — de driver dooft transitions vóór hij meet.
 *   2. Alleen elementen die zelf tekst dragen. `input[class*="border-input"]` matchte
 *      destijds ook de checkbox; dit kijkt naar directe tekst-nodes, niet naar classes.
 */

export const AA_NORMAAL = 4.5;
export const AA_GROOT = 3.0;

// Grote tekst volgens WCAG: >=24px, of >=18.66px wanneer hij bold is.
const GROOT_PX = 24;
const GROOT_BOLD_PX = 18.66;
const BOLD = 700;

/** Dooft alles wat beweegt. Draai dit vóór een meting, in elke driver. */
export const STIL_CSS = '*,*::before,*::after{transition:none!important;animation:none!important}';

// ── De meting, uitgevoerd ín de pagina ───────────────────────────────────────
// Alles binnen deze functie draait in de browser: ze wordt naar de pagina geserialiseerd,
// dus ze mag niets uit deze module afsluiten. Ze geeft rauwe getallen terug; het oordeel
// (drempel, pass/fail) valt in Node, zodat het daar testbaar en leesbaar blijft.

export function meetInPagina() {
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

export const hex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** Eén bevinding per kleurcombinatie, niet per element — anders spamt een zebra-tabel. */
export function beoordeel({ resultaten, onmeetbaar, vrijgesteld }) {
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

/** Eén fout, in de vorm waarin beide drivers hem melden. */
export function beschrijfFout(f) {
  const waar = f.aantal === 1 ? '1 element' : `${f.aantal} elementen`;
  return [
    `  ${f.voor} op ${f.achter} — ${waar}`,
    `      ${f.ratio.toFixed(2)}:1, nodig ${f.drempel}:1 (${f.fontSize}px/${f.fontWeight})`,
    `      "${f.voorbeeldTekst}"`,
    `      ${f.voorbeeldPad}`,
  ].join('\n');
}
