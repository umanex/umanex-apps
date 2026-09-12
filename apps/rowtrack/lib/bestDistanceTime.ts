/**
 * Snelste tijd over een vaste afstand binnen één training.
 *
 * Gegeven een tijdreeks van cumulatieve {t, d}-samples (t = seconden sinds de
 * start, d = meters sinds de start): vind het snelste aaneengesloten venster dat
 * exact `targetMeters` dekt — bijvoorbeeld de beste 2000 m binnen een langer stuk.
 *
 * Aanpak (O(N)):
 *  - Two-pointer sliding window i.p.v. een naïeve O(N²) dubbele lus.
 *  - Lineaire interpolatie op de virtuele start- én eindgrens, zodat de tijd
 *    tot op de milliseconde klopt ook al eindigt geen enkel datapunt exact op
 *    de doelafstand.
 *
 * Waarom twee passes: de tijd-om-target-te-dekken f(x) = T(x+target) − T(x)
 * is stuksgewijs lineair in de startafstand x (constante snelheid binnen een
 * segment). Het minimum ligt dus altijd op een breekpunt: een venster waarvan
 * óf het einde óf het begin exact op een sample valt. Pass A verankert het
 * einde op een sample (interpoleert de start); pass B verankert de start
 * (interpoleert het einde). De unie dekt het globale minimum bewijsbaar.
 *
 * Randgevallen:
 *  - Sessie korter dan target → null (geen crash, geen 0).
 *  - BLE-dropout: bij een gat > maxGapSeconds in de device-tijd missen we data;
 *    een venster mag zo'n gat niet overspannen (interpolatie is dan onbetrouwbaar).
 *    We splitsen in aaneengesloten runs en rekenen per run. Conservatief: we
 *    geven nooit een te-snelle waarde terug over ontbrekende data heen.
 *  - Pauzes: RowTrack bewaart de device-elapsedTime, die op een Concept2/FTMS-erg
 *    zelf bevriest bij stilstand — pauzes tellen dus niet mee in `t`. Telt een
 *    goedkopere erg wél door tijdens stilstand, dan zit de pauze ín het venster
 *    en wordt de 2k trager i.p.v. sneller — conservatief, nooit een valse PR.
 */

export type Sample = {
  /** Cumulatieve seconden sinds de start van de inspanning. Niet-dalend. */
  t: number;
  /** Cumulatieve meters sinds de start van de inspanning. Niet-dalend. */
  d: number;
  /** Momentane hartslag (bpm) op dit sample, indien beschikbaar. Ontbreekt op
   *  workouts van vóór de HR-in-samples-invoering. */
  hr?: number;
};

/** Reconstrueer Sample[] uit de compacte [t,d]- of [t,d,hr]-tuples zoals opgeslagen in de DB. */
export function samplesFromTuples(tuples: number[][] | null | undefined): Sample[] {
  if (!tuples) return [];
  return tuples.map(([t, d, hr]) => (hr != null ? { t, d, hr } : { t, d }));
}

export type BestTimeOptions = {
  /**
   * Absolute ondergrens (seconden) voor de dropout-drempel. Een gat telt pas als
   * BLE-dropout wanneer het zowel deze ondergrens als een veelvoud van de mediane
   * cadans van de reeks overschrijdt — zodat een toestel dat legitiem om de paar
   * seconden meldt niet aangezien wordt voor een stroom die pakketten verloor.
   * Standaard 3.
   */
  maxGapSeconds?: number;
};

/** Een gat boven GAP_FACTOR × de mediane cadans (én de ondergrens) is een dropout. */
const GAP_FACTOR = 4;

/**
 * Snelste tijd (in seconden, fractioneel) over exact `targetMeters`.
 * Geeft null wanneer de training `targetMeters` nooit in één ononderbroken
 * stuk aflegt.
 */
export function bestTimeForDistance(
  samples: Sample[],
  targetMeters: number,
  options: BestTimeOptions = {},
): number | null {
  const maxGap = options.maxGapSeconds ?? 3;
  if (!(targetMeters > 0) || samples.length < 2) return null;

  const clean = sanitize(samples);
  if (clean.length < 2) return null;

  const threshold = Math.max(maxGap, medianInterval(clean) * GAP_FACTOR);

  let best = Infinity;
  for (const run of splitRuns(clean, threshold)) {
    const t = bestInRun(run, targetMeters);
    if (t != null && t < best) best = t;
  }
  return Number.isFinite(best) ? best : null;
}

/**
 * Geïnterpoleerde cumulatieve tijd (fractionele seconden) op cumulatieve afstand
 * `dMeters`. Null als de reeks die afstand nooit haalt. Interpoleert lineair over
 * de gesaneerde reeks — dropout-splitsing wordt hier bewust genegeerd (goed genoeg
 * voor per-split weergave; de zwaardere PR-logica gebruikt bestTimeForDistance).
 */
export function timeAtDistance(samples: Sample[], dMeters: number): number | null {
  if (!(dMeters >= 0) || samples.length < 2) return null;
  const clean = sanitize(samples);
  if (clean.length < 2) return null;
  if (dMeters < clean[0].d || dMeters > clean[clean.length - 1].d) return null;
  for (let i = 1; i < clean.length; i++) {
    if (clean[i].d >= dMeters) return interpTime(dMeters, clean[i - 1], clean[i]);
  }
  return clean[clean.length - 1].t;
}

/**
 * Gooit niet-eindige punten weg, dwingt een niet-dalende reeks af op zowel t als d
 * (een BLE-hikje kan een punt sturen dat teruggaat) en vouwt exacte duplicaten
 * samen. Het resultaat is monotoon op beide assen.
 */
function sanitize(samples: Sample[]): Sample[] {
  const clean: Sample[] = [];
  for (const s of samples) {
    if (!Number.isFinite(s.t) || !Number.isFinite(s.d)) continue;
    const prev = clean[clean.length - 1];
    if (!prev) {
      clean.push({ t: s.t, d: s.d, hr: s.hr });
      continue;
    }
    if (s.t < prev.t || s.d < prev.d) continue; // non-monotonic → drop
    if (s.t === prev.t && s.d === prev.d) continue; // exact duplicate → drop
    clean.push({ t: s.t, d: s.d, hr: s.hr });
  }
  return clean;
}

/**
 * Cadans-schatting: de ondermediaan van de gaten tussen opeenvolgende samples.
 * Bewust de ondermediaan (geen gemiddelde van de twee middelste waarden) — één
 * groot dropout-gat mag juist de statistiek niet vervuilen waarmee hij ontdekt
 * wordt. Bij weinig samples zou de middelende mediaan van bv. [1, 99] op 50
 * uitkomen en de dropout verbergen; de ondermediaan is 1, dus de drempel blijft
 * bij de werkelijke cadans en de dropout wordt eruit gesneden.
 */
function medianInterval(clean: Sample[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < clean.length; i++) gaps.push(clean[i].t - clean[i - 1].t);
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[(gaps.length - 1) >> 1];
}

/** Knip op BLE-dropouts: een gat in toesteltijd boven de drempel breekt de reeks. */
function splitRuns(clean: Sample[], threshold: number): Sample[][] {
  const runs: Sample[][] = [];
  let run: Sample[] = [clean[0]];
  for (let i = 1; i < clean.length; i++) {
    if (clean[i].t - clean[i - 1].t > threshold) {
      runs.push(run);
      run = [clean[i]];
    } else {
      run.push(clean[i]);
    }
  }
  runs.push(run);
  return runs;
}

/** Min time to cover `target` within one uninterrupted run. */
function bestInRun(s: Sample[], target: number): number | null {
  const n = s.length;
  if (n < 2) return null;
  if (s[n - 1].d - s[0].d < target) return null; // run too short

  let best = Infinity;

  // Ronde A — einde verankerd op elk sample, startgrens geïnterpoleerd.
  // `left` is een monotone naloop-wijzer: de grootste index met d ≤ startDist.
  let left = 0;
  for (let right = 1; right < n; right++) {
    const startDist = s[right].d - target;
    if (startDist < s[0].d) continue; // not enough distance behind `right` yet
    while (left + 1 < right && s[left + 1].d <= startDist) left++;
    const tStart = interpTime(startDist, s[left], s[left + 1]);
    const cand = s[right].t - tStart;
    if (cand < best) best = cand;
  }

  // Ronde B — start verankerd op elk sample, eindgrens geïnterpoleerd.
  // `right` is een monotone voorloop-wijzer: de kleinste index met d ≥ endDist.
  let right = 1;
  for (let l = 0; l < n - 1; l++) {
    const endDist = s[l].d + target;
    if (endDist > s[n - 1].d) break; // no later start can reach target
    if (right <= l) right = l + 1;
    while (right < n - 1 && s[right].d < endDist) right++;
    const tEnd = interpTime(endDist, s[right - 1], s[right]);
    const cand = tEnd - s[l].t;
    if (cand < best) best = cand;
  }

  return Number.isFinite(best) ? best : null;
}

/**
 * Lineaire interpolatie van de tijd op afstand `dTarget`, aangenomen dat die in
 * segment [a, b] ligt (a.d ≤ dTarget ≤ b.d). Vangt een segment zonder afstand op
 * (een pauze, vastgelegd als gelijke d met stijgende t) door de eigen tijd van het
 * segment terug te geven. `frac` wordt op [0,1] geklemd tegen drijvendekomma-drift
 * aan de randen.
 */
function interpTime(dTarget: number, a: Sample, b: Sample): number {
  if (b.d <= a.d) return a.t;
  let frac = (dTarget - a.d) / (b.d - a.d);
  if (frac < 0) frac = 0;
  else if (frac > 1) frac = 1;
  return a.t + frac * (b.t - a.t);
}
