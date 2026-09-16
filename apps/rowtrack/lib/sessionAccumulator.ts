/**
 * Alles wat er tijdens één rit wordt opgeteld, als pure functie van de binnenkomende pakketten.
 *
 * WAAROM DIT GEEN HOOK MEER IS. Deze logica woonde in `useWorkoutMetrics`, en daarmee was ze
 * alleen met een roeitrainer en een hartslagband te toetsen. Twee fouten uit de functionele
 * review zaten er precies daar:
 *
 * F7 — het effect draaide óók op een hartslag-update, en alleen de EMA was daartegen
 * beschermd. De sommen telden het láátste roeipakket dan opnieuw mee. Het commentaar zei dat
 * dat zichzelf corrigeert ("ze zelf-corrigeren via hun eigen teller"), en dat klopt niet: de
 * weging verschuift. 100 W en 200 W geven 150 W, maar één extra telling van die 200 maakt er
 * 167 van — en of dat gebeurt hangt af van hoeveel hartslag-updates er toevallig tussen twee
 * roeipakketten vielen. Die getallen belanden in `avg_watts`, `avg_spm`, `avg_split_seconds`
 * en in de recordvergelijking. De oplossing is niet een guard erbij maar de aanname omkeren:
 * `step` wordt alleen aangeroepen voor een échte nieuwe meting, en de hartslag wordt op die
 * cadans bemonsterd.
 *
 * F9 — afstand, tijd en slagen werden berekend als "huidige toestelteller min de teller bij
 * de start". Komt de erg na uit- en inschakelen op nul terug, dan wordt dat verschil negatief
 * en loopt de rit achteruit. `readCounter` herkent een nieuwe reeks en telt hem op bij wat er
 * al stond.
 *
 * Puur en zonder `@/`-alias, zodat `node --test lib/sessionAccumulator.test.ts` een hele
 * pakketreeks door de rekenkern kan spelen zonder hardware.
 */
import type { RowerMetrics } from './ble/types.ts';
import type { Sample } from './bestDistanceTime.ts';
import { calculateCalories } from './calories.ts';
import { ema, SMOOTHING } from './smoothing.ts';

/** Zoveel opeenvolgende idle-packets vóór de live-waarden naar 0 zakken. */
const IDLE_PACKETS_BEFORE_ZERO = 2;

/** Om de hoeveel toestelseconden de calorieën bijgeteld worden. */
const KCAL_INTERVAL_S = 5;

/**
 * Een som met de teller die in dezelfde stap optelde.
 *
 * Eén type in plaats van twee losse refs per grootheid. Dat is niet cosmetisch: op 2026-08-17
 * deelden vijf plekken door een vreemde teller en stonden alle gemiddelden stelselmatig te
 * laag, zonder dat één scherm er raar uitzag. Met `add` en `mean` kán dat niet meer.
 */
export type Acc = { sum: number; count: number };

export function emptyAcc(): Acc {
  return { sum: 0, count: 0 };
}

export function add(acc: Acc, value: number): void {
  acc.sum += value;
  acc.count += 1;
}

/** Het gemiddelde, of null wanneer er niets geteld is. Deelt altijd door zijn eigen teller. */
export function mean(acc: Acc): number | null {
  return acc.count > 0 ? acc.sum / acc.count : null;
}

/**
 * Een cumulatieve toestelteller die opnieuw kan beginnen.
 *
 * `base` is de stand waarop deze reeks begon, `offset` wat er vóór deze reeks al stond. Een
 * lezing die lager uitkomt dan de vorige is geen achteruitgang maar een nieuwe reeks.
 */
export type Counter = { base: number | null; last: number | null; offset: number };

export function emptyCounter(): Counter {
  return { base: null, last: null, offset: 0 };
}

/**
 * De sessiewaarde van een cumulatieve teller, gegeven de nieuwste toestellezing.
 *
 * Is de lezing lager dan de vorige, dan is de teller opnieuw begonnen: wat deze reeks tot nu
 * toe opleverde wordt geboekt en de nieuwe reeks telt daarbovenop. Het resultaat is per
 * constructie niet-dalend — precies wat afstand, tijd en slagen horen te zijn, en wat de
 * `{t, d}`-reeks nodig heeft om bruikbaar te blijven voor de beste-2000m.
 *
 * Wat er tijdens de onderbreking gebeurde, weet niemand. Die meters zijn niet te herstellen;
 * dit zorgt er alleen voor dat ze niet ook nog van het totaal worden afgetrokken.
 */
export function readCounter(counter: Counter, reading: number): number {
  if (counter.base === null) {
    counter.base = reading;
    counter.last = reading;
    return 0;
  }
  if (counter.last !== null && reading < counter.last) {
    counter.offset += counter.last - counter.base;
    counter.base = reading;
  }
  counter.last = reading;
  return counter.offset + (reading - counter.base);
}

/** Alles wat één rit bij elkaar optelt. */
export type Session = {
  watts: Acc;
  spm: Acc;
  split: Acc;
  heartRate: Acc;
  /** Watt binnen het lopende 500m-segment; `takeSplitInterval` leest en leegt hem. */
  splitIntervalWatts: Acc;
  /** Aantal verwerkte roeipakketten. Sinds F7 dus géén hartslag-updates meer. */
  packets: number;
  maxWatts: number;
  maxSpm: number;
  maxHeartRate: number;
  /** `Infinity` = nog geen tempo gemeten. */
  bestSplit: number;
  distance: Counter;
  elapsed: Counter;
  strokes: Counter;
  totalStrokes: number;
  samples: Sample[];
  lastSampleSecond: number;
  seconds: number;
  distanceMeters: number;
  currentWatts: number;
  kcal: number;
  lastKcalElapsed: number;
  wattsEma: number | null;
  spmEma: number | null;
  splitEma: number | null;
  idlePackets: number;
  lastIdleDistance: number | null;
  startedAt: Date | null;
};

export function createSession(): Session {
  return {
    watts: emptyAcc(),
    spm: emptyAcc(),
    split: emptyAcc(),
    heartRate: emptyAcc(),
    splitIntervalWatts: emptyAcc(),
    packets: 0,
    maxWatts: 0,
    maxSpm: 0,
    maxHeartRate: 0,
    bestSplit: Infinity,
    distance: emptyCounter(),
    elapsed: emptyCounter(),
    strokes: emptyCounter(),
    totalStrokes: 0,
    samples: [],
    lastSampleSecond: -1,
    seconds: 0,
    distanceMeters: 0,
    currentWatts: 0,
    kcal: 0,
    lastKcalElapsed: 0,
    wattsEma: null,
    spmEma: null,
    splitEma: null,
    idlePackets: 0,
    lastIdleDistance: null,
    startedAt: null,
  };
}

/** De live-waarden die één stap oplevert; leeg gelaten velden blijven staan. */
export type LiveMetrics = {
  seconds?: number;
  watts?: number;
  spm?: number;
  splitSeconds?: number;
  distanceMeters?: number;
  calories?: number;
  resistanceLevel?: number | null;
  wattsSmoothed?: number;
  spmSmoothed?: number;
  splitSmoothed?: number;
};

export type StepOptions = {
  /** Profielgewicht voor de calorieberekening; `null` valt terug op het standaardgewicht. */
  weightKg: number | null;
  /** Zonder toestemming voor gezondheidsgegevens wordt hartslag niet verzameld. */
  collectHr: boolean;
};

/**
 * Verwerkt één roeipakket.
 *
 * ROEP HEM ALLEEN AAN VOOR EEN ÉCHT NIEUW PAKKET. Dat is de hele afspraak achter F7: twee
 * aanroepen met hetzelfde pakket tellen het twee keer, en dan verschuift het gemiddelde. De
 * hook die hem aanroept bewaakt dat met een referentievergelijking; deze functie kan het niet
 * zelf zien, want twee identieke metingen zijn een normaal verschijnsel.
 *
 * `hr` komt van buiten en wordt dus op de cadans van de roeipakketten bemonsterd — niet op die
 * van de hartslagband, die doorstuurt terwijl er niet geroeid wordt.
 */
export function step(
  s: Session,
  packet: RowerMetrics,
  hr: number | null,
  opts: StepOptions,
): LiveMetrics {
  const live: LiveMetrics = {};

  if (packet.instantaneousPower != null) {
    live.watts = packet.instantaneousPower;
    add(s.watts, packet.instantaneousPower);
    add(s.splitIntervalWatts, packet.instantaneousPower);
    if (packet.instantaneousPower > s.maxWatts) s.maxWatts = packet.instantaneousPower;
    s.wattsEma = ema(s.wattsEma, packet.instantaneousPower, SMOOTHING.watts);
    live.wattsSmoothed = s.wattsEma;
  }

  if (packet.strokeRate != null) {
    // Rauwe SPM opslaan; de 'SPM halveren'-correctie gebeurt bij weergave (zie correctSpm +
    // useSpmHalved) zodat álle historiek consistent is.
    live.spm = packet.strokeRate;
    add(s.spm, packet.strokeRate);
    if (packet.strokeRate > s.maxSpm) s.maxSpm = packet.strokeRate;
    s.spmEma = ema(s.spmEma, packet.strokeRate, SMOOTHING.spm);
    live.spmSmoothed = s.spmEma;
  }

  if (packet.instantaneousPace != null && packet.instantaneousPace > 0) {
    live.splitSeconds = packet.instantaneousPace;
    add(s.split, packet.instantaneousPace);
    if (packet.instantaneousPace < s.bestSplit) s.bestSplit = packet.instantaneousPace;
    s.splitEma = ema(s.splitEma, packet.instantaneousPace, SMOOTHING.split);
    live.splitSmoothed = s.splitEma;
  }

  // Rust-transitie. De erg meldt geen kracht én geen slagen meer (ble-service nult die drie
  // samen zodra watts en spm allebei 0 zijn). De EMA stapt dan niet, dus bleef de "huidige"
  // waarde staan op wat je vóór de pauze trok — je las 180 W terwijl je uitblies. De EMA's
  // gaan mee leeg, zodat de eerste haal daarna vers seedt in plaats van vanaf de oude waarde
  // omhoog te kruipen.
  //
  // Twee opeenvolgende idle-packets vereist: één enkel 0/0-packet mag geen flikkering geven
  // als een erg tijdens de recovery even niets rapporteert. Tenzij het vliegwiel óók stilstaat
  // — tijdens een recovery loopt `totalDistance` gewoon door, bij een echte pauze staat die
  // teller stil, en dan is wachten op bevestiging een seconde waarin je 180 W leest terwijl je
  // uitblaast.
  const idle = packet.instantaneousPower == null && packet.strokeRate == null;
  s.idlePackets = idle ? s.idlePackets + 1 : 0;
  const distanceFrozen = packet.totalDistance != null && packet.totalDistance === s.lastIdleDistance;
  s.lastIdleDistance = packet.totalDistance ?? s.lastIdleDistance;

  if (idle && (distanceFrozen || s.idlePackets >= IDLE_PACKETS_BEFORE_ZERO)) {
    s.wattsEma = null;
    s.spmEma = null;
    s.splitEma = null;
    live.wattsSmoothed = 0;
    live.spmSmoothed = 0;
    // Split níet op 0 — dat leest als oneindig snel. Bij stilstand is het tempo ongedefinieerd,
    // en dat toont `formatSplit` als "—".
    live.splitSmoothed = Infinity;
  }

  if (packet.totalDistance != null) {
    s.distanceMeters = readCounter(s.distance, packet.totalDistance);
    live.distanceMeters = s.distanceMeters;
  }
  if (packet.strokeCount != null) {
    s.totalStrokes = readCounter(s.strokes, packet.strokeCount);
  }
  if (packet.elapsedTime != null) {
    s.seconds = readCounter(s.elapsed, packet.elapsedTime);
    live.seconds = s.seconds;
  }
  if (packet.resistanceLevel != null) {
    live.resistanceLevel = packet.resistanceLevel;
  }

  // HR: de externe band heeft voorrang, de hartslag van de erg is de terugval. `collectHr`
  // staat vooraan: die tweede bron komt binnen zonder dat er ooit een knop is aangeraakt.
  const gemetenHr = !opts.collectHr ? null
    : (hr != null && hr > 0) ? hr
    : (packet.heartRate != null && packet.heartRate > 0) ? packet.heartRate
    : null;
  if (gemetenHr != null) {
    add(s.heartRate, gemetenHr);
    if (gemetenHr > s.maxHeartRate) s.maxHeartRate = gemetenHr;
  }

  s.packets += 1;
  if (live.watts != null) s.currentWatts = live.watts;

  // Leg de {t, d}-tijdreeks vast op ~1 Hz (één punt per hele toestelseconde) voor de exacte
  // beste-2000m-berekening bij het opslaan. De elapsedTime van het toestel is in hele seconden
  // en bevriest bij een pauze, dus ontdubbelen op hele seconde houdt de payload klein én de
  // pauzes buiten de bewegende tijd.
  //
  // Bemonster op een VERSE elapsed-lezing én eis dat de afstand al een baseline heeft: een
  // toestel dat ooit een distance-only pakket stuurt vóór het eerste elapsed-veld zou anders
  // de opgebouwde afstand op t=0 samenvouwen en een vals-snelle beste 2k opleveren.
  if (live.seconds != null && s.distance.base !== null) {
    const heleSeconde = Math.floor(s.seconds);
    if (heleSeconde !== s.lastSampleSecond) {
      s.lastSampleSecond = heleSeconde;
      s.samples.push({
        t: s.seconds,
        d: s.distanceMeters,
        ...(gemetenHr != null ? { hr: gemetenHr } : {}),
      });
    }
  }

  // Cumulatieve calorieën: tel er elke KCAL_INTERVAL_S toestelseconden een interval bij.
  if (s.seconds > 0 && s.seconds >= s.lastKcalElapsed + KCAL_INTERVAL_S) {
    const intervalSecs = s.seconds - s.lastKcalElapsed;
    s.kcal += calculateCalories(s.currentWatts, intervalSecs, opts.weightKg ?? undefined);
    s.lastKcalElapsed = s.seconds;
    live.calories = Math.round(s.kcal);
  }

  return live;
}

/**
 * Het gemiddelde vermogen over het afgelopen 500m-segment, en leegt de teller voor het
 * volgende.
 *
 * Bestaat omdat `useGoalProgress` die twee velden vroeger zélf nulde. Dat werkte zolang de
 * accumulatoren losse refs waren; met één sessie-object is lezen-en-legen één handeling die
 * hier hoort, niet bij de aanroeper.
 */
export function takeSplitInterval(s: Session): number | undefined {
  const gemiddelde = mean(s.splitIntervalWatts);
  s.splitIntervalWatts = emptyAcc();
  return gemiddelde != null ? Math.round(gemiddelde) : undefined;
}
