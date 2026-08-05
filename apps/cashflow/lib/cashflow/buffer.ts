import type { MonthData } from './types';

/**
 * Wat de bufferpot in één maand doet. Eén afleiding voor de footer, de analyse en de
 * snapshots — anders zou elk van die drie zijn eigen optelling over `reservationPots`
 * maken en zouden ze uit de pas lopen zodra de pot ook betalingen of uitstel kent.
 */
export interface BufferSummary {
  /** Staat er een pot als buffer gemarkeerd in deze maand? */
  present: boolean;
  /**
   * Beweging van de pot deze maand: positief is opbouw, negatief een opname. Gemeten als
   * eindstand − beginstand, dus inclusief betalingen en toekomend uitstel — niet enkel de
   * afgeleide storting.
   */
  delta: number;
  /** Stand van de pot aan het einde van de maand. */
  total: number;
  /** Tekort dat de pot deze maand niet meer kon dekken. */
  uncovered: number;
}

export function bufferSummary(data: MonthData): BufferSummary {
  const pots = data.reservationPots.filter((p) => p.isDeficitBuffer);

  return {
    present: pots.length > 0,
    delta: pots.reduce((s, p) => s + (p.potBalance - p.deferredFromPrevious), 0),
    total: pots.reduce((s, p) => s + p.potBalance, 0),
    uncovered: pots.reduce((s, p) => s + p.deficitUncovered, 0),
  };
}
