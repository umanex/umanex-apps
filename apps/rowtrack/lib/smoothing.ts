/**
 * Lichte smoothing voor live metric-weergave tijdens een active workout.
 *
 * Exponential moving average (EMA): `s = α·x + (1−α)·s_prev`. Eén stap per
 * BLE-notificatie (~1–2 Hz), dus α bepaalt hoe "rustig" de waarde oogt — lager
 * = trager/rustiger, hoger = responsiever. Bewust display-only: voed dit NOOIT
 * terug in de opgeslagen/geaccumuleerde waarden (die blijven rauw, cf. de
 * SPM-halved-regel: corrigeren bij weergave, rauw opslaan).
 *
 * `previous === null` seedt op het eerste sample, zodat de waarde niet vanaf 0
 * inloopt (geen zichtbare lag bij de start van een rit).
 */
export function ema(previous: number | null, sample: number, alpha: number): number {
  if (previous === null) return sample;
  return alpha * sample + (1 - alpha) * previous;
}

/**
 * Smoothing-factoren per metric (per BLE-notificatie). Split is heel-seconde en
 * daardoor van nature stapsgewijs → iets sterker gesmooth dan watts/spm.
 */
export const SMOOTHING = {
  watts: 0.4,
  spm: 0.4,
  split: 0.35,
} as const;
