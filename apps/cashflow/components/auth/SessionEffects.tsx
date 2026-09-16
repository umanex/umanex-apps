'use client';

import { useAutoCloseMonth } from '../../hooks/useCashflow';

/**
 * Wat één keer per sessie moet gebeuren zodra de gegevens geladen zijn, op welke route je ook
 * binnenkomt. De automatische maandafsluiting stond op de prognosepagina; wie de app op
 * `/bureau/cash` opende, rekende dan op een vorige maand die nog niet bevroren was en kreeg een
 * andere weekopening dan de ankerkolom op `/`.
 */
export function SessionEffects() {
  useAutoCloseMonth();
  return null;
}
