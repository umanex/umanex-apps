/**
 * Is deze rit het bewaren waard?
 *
 * WAAROM DIT EEN EIGEN MODULE IS. De guard in `saveWorkout` stond er al, maar hij toetste
 * `tickCount` — en dat telt ELK binnengekomen BLE-pakket, ook een dat alleen hartslag draagt.
 * Een band die doorstuurt terwijl er niet geroeid wordt, levert dus ticks zonder rit. Gemeten:
 * de rit van 2026-08-22 12:40:57 stond met 0 m, 0 s en één sample in de historiek, mét een
 * gemiddelde hartslag van 90. Die kwam langs de tick-guard.
 *
 * Los van het scherm, zonder imports, zodat `node --test` hem kan draaien: een guard op het
 * opslagpad is anders alleen met een erg en een hartslagband te toetsen.
 *
 * GEEN VERZONNEN DREMPEL. Niet "minstens 30 seconden" — dat getal zou nergens vandaan komen.
 * De eis is dat er iets te tonen valt: bij nul afstand of nul duur leest elke KPI op die rit
 * 0 of "—", terwijl hij wél meetelt in de periodetotalen van het historiek-scherm.
 */
export function isWorthSaving(distanceMeters: number, seconds: number): boolean {
  // Afronden zoals het opslagpad dat doet: 0,4 m landt als 0 in een integer-kolom, dus een
  // rit die pas ná afronding leeg is, hoort hier ook al leeg te heten.
  const meters = Math.round(distanceMeters);
  const duration = Math.round(seconds);
  // Niet-eindige waarden (NaN uit een kapot pakket) zijn geen rit.
  if (!Number.isFinite(meters) || !Number.isFinite(duration)) return false;
  return meters > 0 && duration > 0;
}
