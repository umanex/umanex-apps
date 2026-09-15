// Pure regels voor de cockpit: tekst en getallen in, een oordeel uit. Geen fs, geen
// shell, geen Next — zodat `scripts/guards-selftest.mjs` ze zonder testrunner kan draaien
// en de views ze kunnen importeren zonder iets mee te slepen. Zelfde opzet als
// `lib/guardRules.mjs`, dat dezelfde reden had.

/** Gereserveerde URL-segmenten. Spiegelt de lijst in `umanex-os/scripts/stand.sh`. */
export const GERESERVEERDE_SLUGS = ['systeem', 'cockpit', 'api', '_next', 'static', 'login'];

/**
 * Is deze slug bruikbaar als `/cockpit/<slug>`?
 *
 * `systeem` is een statisch routesegment naast de dynamische `[klant]`-route. Next kiest
 * bij een botsing het statische segment, dus een klant die zo heet zou stil onbereikbaar
 * zijn — geen foutmelding, gewoon het verkeerde scherm. De collector weigert zo'n slug al
 * met exit 2; deze functie is de tweede sluis, aan de leeskant.
 */
export function slugGeldig(slug) {
  if (typeof slug !== 'string' || slug === '') return false;
  if (GERESERVEERDE_SLUGS.includes(slug)) return false;
  return /^[a-z0-9][a-z0-9-]*$/.test(slug);
}

/**
 * Hoe oud is deze meting, en telt hij nog?
 *
 * Drie uitkomsten, niet twee. `ontbreekt` is geen nul maar een ander antwoord: er is
 * nooit gemeten, of het bestand is weg. Een tegel die dat als `0` toont, beweert iets
 * wat niemand gemeten heeft (`null ≠ 0`, ontwerpprincipe 6 in de-stand.md).
 *
 * De leeftijd komt uit `measured_at` in de JSON en nooit uit het moment van laden —
 * anders is elke meting per definitie vers en zegt de tegel niets.
 */
export function versheid(measuredAt, verouderdNaDagen, nu = Date.now()) {
  if (typeof measuredAt !== 'string' || measuredAt === '') {
    return { staat: 'ontbreekt', dagen: null, reden: 'geen measured_at in de envelop' };
  }
  const t = Date.parse(measuredAt);
  if (Number.isNaN(t)) {
    return { staat: 'ontbreekt', dagen: null, reden: `onleesbaar measured_at: ${measuredAt}` };
  }
  const drempel = Number.isFinite(verouderdNaDagen) ? verouderdNaDagen : 9;
  // Naar beneden afronden: een meting van 23 uur oud is nul dagen oud, niet één.
  const dagen = Math.floor((nu - t) / 86_400_000);
  return { staat: dagen > drempel ? 'verouderd' : 'vers', dagen, reden: null };
}

/** Sommeert één veld over een lijst rijen. Ontbrekende of niet-numerieke waarden tellen als 0. */
export function telOp(rijen, veld) {
  if (!Array.isArray(rijen)) return 0;
  return rijen.reduce((n, r) => n + (Number.isFinite(r?.[veld]) ? r[veld] : 0), 0);
}

/**
 * Toetst of een aggregaat gelijk is aan de som van zijn ontleding.
 *
 * Dit is de invariant waar `CLAUDE.md` op staat: *"een aggregaat als bewijs draagt zijn
 * ontleding — anders is een daling een richting zonder vloer"*. Elk getal dat de cockpit
 * op een overzichtspagina toont, hoort op te tellen uit de regels waar hij naartoe linkt.
 * Geeft `null` bij gelijkheid, anders een leesbare reden.
 */
export function aggregaatKlopt(naam, aggregaat, rijen, veld) {
  const som = telOp(rijen, veld);
  if (aggregaat === som) return null;
  return `${naam}: aggregaat ${aggregaat} ≠ som van ${rijen?.length ?? 0} regels (${som})`;
}

/**
 * De drie cohorten van de verificatieschuld.
 *
 * Bewust drie getallen en geen score. Een vinkje zónder `bewijs:`-regel telt per contract
 * als open — *"een `- [ ]` dat er anders uitziet"* — maar het is geen gat van dezelfde
 * soort als een item dat nooit is aangeraakt. Eén samengesteld cijfer verbergt precies
 * het verschil waar je naar wil kijken.
 */
export function verificatieschuld(briefings) {
  const r = { met_bewijs: 0, zonder_bewijs: 0, open: 0, items: 0, briefings: 0 };
  if (!Array.isArray(briefings)) return r;
  for (const b of briefings) {
    r.briefings += 1;
    r.met_bewijs += Number.isFinite(b?.af_met_bewijs) ? b.af_met_bewijs : 0;
    r.zonder_bewijs += Number.isFinite(b?.af_zonder_bewijs) ? b.af_zonder_bewijs : 0;
    r.open += Number.isFinite(b?.open) ? b.open : 0;
  }
  r.items = r.met_bewijs + r.zonder_bewijs + r.open;
  return r;
}

/**
 * Splitst briefings in cohorten rond de invoerdatum van de `bewijs:`-conventie.
 *
 * Zonder die splitsing is "928 vinkjes zonder bewijs" één beschuldigend getal dat niemand
 * kan verkleinen: een groot deel dateert van vóór de conventie bestond. Met de splitsing
 * is het twee getallen waarvan er één beweegt.
 */
export const BEWIJS_CONVENTIE_VANAF = '2026-08-25';

export function cohorten(briefings, vanaf = BEWIJS_CONVENTIE_VANAF) {
  const voor = [];
  const na = [];
  for (const b of Array.isArray(briefings) ? briefings : []) {
    const d = typeof b?.datum === 'string' ? b.datum : '';
    (d !== '' && d >= vanaf ? na : voor).push(b);
  }
  return { voor: verificatieschuld(voor), na: verificatieschuld(na), vanaf };
}
