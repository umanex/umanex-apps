'use client';

import { useMemo } from 'react';
import { useCashflowStore } from '../store/cashflow';
import { useBureauUi } from '../store/bureau-ui';
import { toIsoDate } from '../lib/bureau/periods';
import type { BureauData, IsoDate } from '../lib/bureau/types';
import type { IncomeItem, MonthKey } from '../lib/cashflow/types';

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

/** De inkomstenposten van de maandprognose — facturen koppelen eraan. */
export function useIncomeItems(): IncomeItem[] {
  return useCashflowStore((s) => s.incomeItems);
}

/** Maanden met een snapshot: daar verandert een post niet meer. */
export function useFrozenMonths(): ReadonlySet<MonthKey> {
  const snapshots = useCashflowStore((s) => s.monthSnapshots);
  return useMemo(() => new Set(snapshots.map((s) => s.monthKey)), [snapshots]);
}
