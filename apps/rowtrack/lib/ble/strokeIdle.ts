/**
 * Roei je nog? Gemeten aan de slagenteller, niet afgeleid uit het vermogen.
 *
 * Als je stopt met halen meldt de erg vrijwel meteen 0 W, maar houdt hij zijn
 * slagfrequentie nog seconden vast. De rust-transitie wacht op die frequentie, dus
 * tot zolang dooft de watt-tegel uit via de EMA — vanaf 180 W leest hij 108, 65, 39,
 * 23, 14 en pas na een seconde of twaalf een afgeronde 0.
 *
 * Die staart eerder afkappen kan niet op het vermogen alleen: "0 W terwijl de spm
 * nog nasleept" is na je laatste haal niet te onderscheiden van een recovery. Dat is
 * geen implementatiedetail maar een grens — beide duren bij 1 Hz twee à drie
 * packets, dus er ligt geen drempel tussen, en ook geen leerregel die er een vindt.
 *
 * `strokeCount` heeft die dubbelzinnigheid niet. Hij loopt op bij elke haal en staat
 * stil zodra je stopt, dus "er is te lang geen slag geweest" meet rechtstreeks wat
 * we willen weten. Te lang = langer dan de slagperiode die je eigen tempo impliceert,
 * zodat de grens meeschaalt: bij 18 spm mag een pauze langer duren dan bij 30, en
 * niemand hoeft iets in te stellen of te onthouden.
 *
 * Ook op een dubbeltellende trainer klopt dit: die verhoogt `strokeCount` én
 * `strokeRate` even hard, dus de gemeten tussentijd en de berekende slagperiode
 * schuiven samen op. Zie [[rowtrack-spm-handling]] voor waarom we die correctie
 * verder alleen bij weergave doen.
 */

/**
 * Marge op de slagperiode. Boven 1 omdat een slag nooit exact op tempo valt: je
 * haalt niet metronomisch, en het tempo zakt aan het eind van een stuk.
 */
export const STROKE_PERIOD_FACTOR = 1.25;

/** Ondergrens, zodat een absurd hoge gemelde slagfrequentie geen valse rust oplevert. */
export const MIN_IDLE_MS = 2_000;

/**
 * Bovengrens. Daarboven heeft afkappen geen zin meer — de EMA is dan zelf al onder
 * de afronding gezakt en de erg heeft zijn slagfrequentie allang losgelaten.
 */
export const MAX_IDLE_MS = 8_000;

/**
 * Hoe lang zonder nieuwe slag voordat we concluderen dat je niet meer roeit.
 *
 * De slagenteller loopt één keer per slag op en we zien dat pas bij het eerstvolgende
 * packet. De waargenomen tussentijd is dus de slagperiode plus maximaal één
 * packetinterval, óók terwijl je gewoon doorroeit — vandaar dat het interval erbij op
 * moet en niet weggelaten mag worden. Zonder dat zou de tegel bij een trage cadans op
 * nul springen tussen twee normale halen door.
 */
export function strokeIdleThresholdMs(spm: number | null, packetIntervalMs: number): number {
  // Geen bruikbare slagfrequentie → geen slagperiode om tegen af te zetten. Dan de
  // bovengrens, wat neerkomt op "laat de bestaande rust-transitie het maar doen".
  if (spm == null || spm <= 0) return MAX_IDLE_MS;
  const period = 60_000 / spm;
  const raw = period * STROKE_PERIOD_FACTOR + Math.max(0, packetIntervalMs);
  return Math.min(Math.max(raw, MIN_IDLE_MS), MAX_IDLE_MS);
}

/**
 * De beslissing zoals de hook hem neemt. Apart en puur, zodat hij te toetsen is
 * zonder een BLE-verbinding na te bootsen.
 *
 * `msSinceLastStroke` is `null` vóór de eerste slag van een rit — dan valt er niets
 * te concluderen en blijft de tegel op zijn beginwaarde staan.
 */
export function isStrokeIdle(args: {
  power: number | null;
  spm: number | null;
  msSinceLastStroke: number | null;
  packetIntervalMs: number;
}): boolean {
  // Meldt de erg vermogen, dan lever je kracht — ook als er even geen slag afgerond
  // wordt (een statische hold). Dat is geen rust en mag de tegel niet nullen.
  if (args.power != null && args.power > 0) return false;
  if (args.msSinceLastStroke == null) return false;
  return args.msSinceLastStroke > strokeIdleThresholdMs(args.spm, args.packetIntervalMs);
}
