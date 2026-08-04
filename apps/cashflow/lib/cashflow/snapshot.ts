import type { MonthData, MonthKey, MonthSnapshot } from './types';

/**
 * Bevriest een doorgerekende maand tot historie.
 *
 * De volledige `MonthData` gaat mee, niet enkel de totalen: een afgesloten maand mag
 * niet veranderen wanneer je later een categorie hernoemt of een maandbedrag bijstelt.
 * Dat is het "Closing the Books"-patroon uit beide adviesrapporten — een afgesloten
 * periode wordt samengevat en bewaard, niet telkens opnieuw afgeleid.
 */
export function buildSnapshot(data: MonthData, closedAt: string): MonthSnapshot {
  return {
    monthKey: data.monthKey,
    closedAt,
    data,
    reserved: reservedIn(data),
    buffer: bufferIn(data),
  };
}

/** Provisies die aan het einde van de maand gereserveerd stonden (buffer niet meegeteld). */
export function reservedIn(data: MonthData): number {
  return data.reservationPots
    .filter((p) => p.potType === 'spaardoel' && !p.isDeficitBuffer)
    .reduce((s, p) => s + p.potBalance, 0);
}

/** Stand van de bufferpot aan het einde van de maand. */
export function bufferIn(data: MonthData): number {
  return data.reservationPots
    .filter((p) => p.isDeficitBuffer)
    .reduce((s, p) => s + p.potBalance, 0);
}

/** Snapshots op maandsleutel, zodat de calculator ze in één stap kan opzoeken. */
export function snapshotMap(snapshots: MonthSnapshot[]): Map<MonthKey, MonthSnapshot> {
  return new Map(snapshots.map((s) => [s.monthKey, s]));
}

/**
 * Het meest recente snapshot vóór `monthKey`. Dat is het vertrekpunt van de berekening:
 * alles daarvóór is afgesloten en hoeft niet opnieuw doorgerekend te worden.
 */
export function latestSnapshotBefore(
  snapshots: MonthSnapshot[],
  monthKey: MonthKey,
): MonthSnapshot | null {
  return snapshots
    .filter((s) => s.monthKey < monthKey)
    .reduce<MonthSnapshot | null>(
      (latest, s) => (latest === null || s.monthKey > latest.monthKey ? s : latest),
      null,
    );
}
