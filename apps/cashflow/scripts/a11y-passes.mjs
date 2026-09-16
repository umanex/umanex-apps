/**
 * Twee toegankelijkheidspassen op een draaiende pagina, voor de flow-harness.
 *
 * Overgenomen uit `apps/jobradar/scripts/flow-harness.mjs` (kopstructuur, toetsenbord): een tweede app
 * met dezelfde meting, nog geen derde (rule of three). Eén inhoudelijke afwijking: de toetsenbordpass
 * herkent de segmenten van een date- of month-veld (zie daar) — de jobradar-versie stopt op het eerste.
 */

/** Koppen in documentvolgorde: begint bij h1 en slaat geen niveau over. */
export async function kopstructuur(page) {
  return page.evaluate(() => {
    const koppen = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => ({
      niveau: Number(h.tagName[1]),
      tekst: (h.textContent ?? '').trim().slice(0, 40),
    }));
    const problemen = [];
    if (koppen.length && koppen[0].niveau !== 1) problemen.push(`eerste kop is h${koppen[0].niveau}, geen h1`);
    if (koppen.filter((k) => k.niveau === 1).length > 1) problemen.push(`${koppen.filter((k) => k.niveau === 1).length} h1's op één pagina`);
    for (let i = 1; i < koppen.length; i++) {
      const sprong = koppen[i].niveau - koppen[i - 1].niveau;
      if (sprong > 1) problemen.push(`h${koppen[i - 1].niveau} → h${koppen[i].niveau} bij "${koppen[i].tekst}" (niveau overgeslagen)`);
    }
    return { aantal: koppen.length, niveaus: [...new Set(koppen.map((k) => k.niveau))].sort(), problemen };
  });
}

/**
 * Toetsenbordvolgorde + focus-zichtbaarheid. Differentieel: per tabstop de stijl mét focus,
 * daarna alles geblurd en opnieuw gelezen. Verandert er niets, dan is er geen zichtbare focus —
 * ongeacht welke klassen het element draagt.
 */
export async function toetsenbord(page, maxStops = 120, { herkenSegmenten = true } = {}) {
  await page.evaluate(() => {
    document.activeElement instanceof HTMLElement && document.activeElement.blur();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    for (const el of document.querySelectorAll('[data-tabstop]')) el.removeAttribute('data-tabstop');
  });

  const volgorde = [];
  let segmenten = 0;
  for (let i = 0; i < maxStops; i++) {
    await page.keyboard.press('Tab');
    const vorige = volgorde.length ? String(volgorde[volgorde.length - 1].index) : null;
    const stop = await page.evaluate(([index, vorige, herken]) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const merk = el.getAttribute('data-tabstop');
      // Een date- of month-veld heeft in Chromium een tabstop per segment (dag, maand, jaar),
      // terwijl `activeElement` hetzelfde input blijft. Dat is geen ronde maar hetzelfde veld:
      // de eerste versie van deze pass stopte hier, en zag op de projectpagina niets meer ná
      // het eerste maandveld — de telling bleef op 17 staan zonder dat er iets faalde.
      if (herken && merk !== null && merk === vorige) return { zelfde: true };
      if (merk !== null) return { rond: true };
      el.setAttribute('data-tabstop', String(index));
      const s = getComputedStyle(el);
      return {
        index,
        tag: el.tagName.toLowerCase(),
        naam: (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40),
        tabindex: el.getAttribute('tabindex'),
        gefocust: `${s.outlineStyle}|${s.outlineWidth}|${s.outlineColor}|${s.boxShadow}`,
      };
    }, [i, vorige, herkenSegmenten]);
    if (stop === null || stop.rond) break;
    if (stop.zelfde) { segmenten++; continue; }
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
    if (ongefocust[String(stop.index)] === stop.gefocust) problemen.push(`geen zichtbare focus: <${stop.tag}> "${stop.naam || '(zonder tekst)'}"`);
    if (stop.tabindex && Number(stop.tabindex) > 0) problemen.push(`positieve tabindex (${stop.tabindex}) op <${stop.tag}> "${stop.naam}"`);
  }
  return { stops: volgorde.length, segmenten, volgorde, problemen };
}

/** Scrollt de pagina horizontaal? Een tabel mag binnen zijn eigen container scrollen, de body niet. */
export async function horizontaleOverflow(page) {
  return page.evaluate(() => {
    const breedte = document.documentElement.clientWidth;
    const scroll = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const boosdoeners = scroll > breedte
      ? [...document.querySelectorAll('body *')]
          .filter((el) => el.getBoundingClientRect().right > breedte + 0.5)
          .filter((el) => !el.closest('[data-scroll-x]'))
          .slice(0, 3)
          .map((el) => `<${el.tagName.toLowerCase()} class="${(el.className?.toString?.() ?? '').slice(0, 60)}">`)
      : [];
    return { breedte, scroll, boosdoeners };
  });
}
