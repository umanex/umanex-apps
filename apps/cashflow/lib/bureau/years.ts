/**
 * Welke boekjaren de jaarkiezer aanbiedt: van het vroegste jaar waarover iets geregistreerd
 * staat tot het volgende jaar — doelen voor volgend jaar vastleggen hoort te kunnen, verder
 * vooruit alleen als er al iets gepland staat.
 */
import type { BureauData } from './types.ts';

const jaar = (s: string): number | null => {
  const n = Number(s.slice(0, 4));
  return Number.isInteger(n) && n > 1900 ? n : null;
};

export function selectableYears(bureau: BureauData, currentYear: number): { min: number; max: number } {
  const jaren: number[] = [currentYear, currentYear + 1];
  for (const key of Object.keys(bureau.goals)) { const j = jaar(key); if (j) jaren.push(j); }
  for (const p of bureau.projects) for (const s of [p.plannedStart, p.plannedEnd, p.contractDate]) { const j = jaar(s); if (j) jaren.push(j); }
  for (const e of bureau.timeEntries) { const j = jaar(e.date); if (j) jaren.push(j); }
  for (const o of bureau.opportunities) { const j = jaar(o.createdAt); if (j) jaren.push(j); }
  return { min: Math.min(...jaren), max: Math.max(...jaren) };
}
