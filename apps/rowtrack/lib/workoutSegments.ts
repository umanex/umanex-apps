// lib/workoutSegments.ts
//
// Afgeleide per-segment statistieken uit de {t,d,hr}-samplereeks van een workout.
// Alles fractioneel waar de data het toelaat (split-tienden). Geeft lege arrays of
// null terug — nooit een crash — wanneer er geen (hr-)samples zijn; de UI valt dan
// terug op de opgeslagen scalars/integers (oude workouts).

import { bestTimeForDistance, timeAtDistance, type Sample } from './bestDistanceTime';

/** Per-`segment`-meter split-tijd (fractionele seconden), geïnterpoleerd op elke grens. */
export type SegmentSplit = { distance: number; seconds: number };

export function segmentSplitTimes(
  samples: Sample[] | null | undefined,
  segment = 500,
): SegmentSplit[] {
  if (!samples || samples.length < 2 || segment <= 0) return [];
  const maxD = samples[samples.length - 1].d;
  const out: SegmentSplit[] = [];
  let prevT = timeAtDistance(samples, 0) ?? samples[0].t;
  for (let boundary = segment; boundary <= maxD + 1e-6; boundary += segment) {
    const t = timeAtDistance(samples, boundary);
    if (t == null) break;
    out.push({ distance: boundary, seconds: t - prevT });
    prevT = t;
  }
  return out;
}

/** Snelste aaneengesloten `segment`-meter split (fractioneel), of null bij te weinig data. */
export function fastestSplit(
  samples: Sample[] | null | undefined,
  segment = 500,
): number | null {
  return bestTimeForDistance(samples ?? [], segment);
}

/**
 * Gemiddelde split (fractioneel) = tijd per `segment` meter over de hele afstand.
 * Werkt zonder samples (enkel duur + afstand). Null bij afstand/duur 0.
 */
export function averageSplit(
  durationSeconds: number,
  distanceMeters: number,
  segment = 500,
): number | null {
  if (!(distanceMeters > 0) || !(durationSeconds > 0)) return null;
  return durationSeconds / (distanceMeters / segment);
}

/** GEM/BEST per vaste afstand (500/1000/2000m …) voor de Overzicht-tabel. */
export type DistanceSplit = { meters: number; gem: number | null; best: number | null };

export function distanceSplits(
  samples: Sample[] | null | undefined,
  durationSeconds: number,
  distanceMeters: number,
  distances: number[] = [500, 1000, 2000],
): DistanceSplit[] {
  return distances.map((m) => ({
    meters: m,
    gem: distanceMeters >= m ? averageSplit(durationSeconds, distanceMeters, m) : null,
    best: bestTimeForDistance(samples ?? [], m),
  }));
}

/** Per-`segment`-meter hartslag GEM/PIEK uit de hr-dragende samples. Leeg zonder hr-data. */
export type SegmentHr = { distance: number; gem: number | null; piek: number | null };

export function segmentHeartRates(
  samples: Sample[] | null | undefined,
  segment = 500,
): SegmentHr[] {
  if (!samples || samples.length < 2 || segment <= 0) return [];
  const withHr = samples.filter((s) => s.hr != null && Number.isFinite(s.hr));
  if (withHr.length === 0) return [];
  const maxD = samples[samples.length - 1].d;
  const out: SegmentHr[] = [];
  for (let boundary = segment; boundary <= maxD + 1e-6; boundary += segment) {
    const lo = boundary - segment;
    const inSeg = withHr.filter((s) => s.d > lo && s.d <= boundary);
    if (inSeg.length === 0) {
      out.push({ distance: boundary, gem: null, piek: null });
      continue;
    }
    let sum = 0;
    let piek = 0;
    for (const s of inSeg) {
      const hr = s.hr as number;
      sum += hr;
      if (hr > piek) piek = hr;
    }
    out.push({ distance: boundary, gem: Math.round(sum / inSeg.length), piek: Math.round(piek) });
  }
  return out;
}
