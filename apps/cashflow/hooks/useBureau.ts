'use client';

import { useCashflowStore } from '../store/cashflow';
import { useBureauUi } from '../store/bureau-ui';
import { toIsoDate } from '../lib/bureau/periods';
import type { BureauData, IsoDate } from '../lib/bureau/types';

export function useBureau(): BureauData {
  return useCashflowStore((s) => s.bureau);
}

export function useMutateBureau() {
  return useCashflowStore((s) => s.mutateBureau);
}

export function useBureauYear(): [number, (year: number) => void] {
  return [useBureauUi((s) => s.year), useBureauUi((s) => s.setYear)];
}

export function useAnnounce() {
  return useBureauUi((s) => s.announce);
}

/** Vandaag als datum. Eén bron, zodat elke berekening op dezelfde dag rekent. */
export function useToday(): IsoDate {
  return toIsoDate(new Date());
}
