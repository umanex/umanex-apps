/**
 * Best-time-for-a-fixed-distance over a rowing session.
 *
 * Given a time-series of cumulative {t, d} samples (t = seconds since start,
 * d = meters since start), find the fastest contiguous window that covers
 * exactly `targetMeters` — e.g. the best 2000m inside a longer piece.
 *
 * Aanpak (professioneel, O(N)):
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
  /** Cumulative seconds since the start of the effort. Non-decreasing. */
  t: number;
  /** Cumulative meters since the start of the effort. Non-decreasing. */
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
   * Absolute floor (seconds) for the dropout threshold. A gap only counts as a
   * BLE dropout when it exceeds both this floor and a multiple of the run's
   * median cadence — so a device that legitimately reports every few seconds
   * isn't mistaken for a stream that dropped packets. Default 3.
   */
  maxGapSeconds?: number;
};

/** A gap beyond GAP_FACTOR × median cadence (and the absolute floor) is a dropout. */
const GAP_FACTOR = 4;

/**
 * Fastest time (in seconds, fractional) to cover exactly `targetMeters`.
 * Returns null when the session never covers `targetMeters` in a single
 * uninterrupted run.
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
 * Drop non-finite points, enforce a non-decreasing series in both t and d
 * (BLE glitches can send a point that goes backwards), and collapse exact
 * duplicates. The result is monotone in both axes.
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
 * Cadence estimate: the lower median of the gaps between consecutive samples.
 * We use the lower median (no averaging of the two middle values) on purpose —
 * a single large dropout gap must not pollute the very statistic used to detect
 * it. With few samples the averaging median of e.g. [1, 99] would be 50 and hide
 * the dropout; the lower median is 1, so the threshold stays near the true
 * cadence and the dropout is split out.
 */
function medianInterval(clean: Sample[]): number {
  const gaps: number[] = [];
  for (let i = 1; i < clean.length; i++) gaps.push(clean[i].t - clean[i - 1].t);
  if (gaps.length === 0) return 0;
  gaps.sort((a, b) => a - b);
  return gaps[(gaps.length - 1) >> 1];
}

/** Split at BLE dropouts: a device-time gap larger than the threshold breaks the run. */
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

  // Pass A — end anchored on each sample, interpolate the start boundary.
  // left is a monotone trailing pointer: the largest index with d ≤ startDist.
  let left = 0;
  for (let right = 1; right < n; right++) {
    const startDist = s[right].d - target;
    if (startDist < s[0].d) continue; // not enough distance behind `right` yet
    while (left + 1 < right && s[left + 1].d <= startDist) left++;
    const tStart = interpTime(startDist, s[left], s[left + 1]);
    const cand = s[right].t - tStart;
    if (cand < best) best = cand;
  }

  // Pass B — start anchored on each sample, interpolate the end boundary.
  // right is a monotone leading pointer: the smallest index with d ≥ endDist.
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
 * Linear interpolation of the time at distance `dTarget`, assumed to lie in
 * the segment [a, b] (a.d ≤ dTarget ≤ b.d). Guards a zero-distance segment
 * (a pause captured as same-d, rising-t) by returning the segment's own time.
 * Frac is clamped to [0,1] against floating-point drift at the boundaries.
 */
function interpTime(dTarget: number, a: Sample, b: Sample): number {
  if (b.d <= a.d) return a.t;
  let frac = (dTarget - a.d) / (b.d - a.d);
  if (frac < 0) frac = 0;
  else if (frac > 1) frac = 1;
  return a.t + frac * (b.t - a.t);
}
