export type PaceZoneLevel = 'on_pace' | 'slightly_off' | 'off_pace';

export function getPaceZone(current: number, target: number, lowerIsBetter: boolean): PaceZoneLevel {
  const ratio = lowerIsBetter ? current / target : target / current;
  // ratio > 1 means worse than target
  if (ratio <= 1.05) return 'on_pace';
  if (ratio <= 1.15) return 'slightly_off';
  return 'off_pace';
}
