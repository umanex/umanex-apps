'use client';

import { useMemo } from 'react';
import { useCashflowStore } from '../store/cashflow';
import { useMonths } from './useCashflow';
import { useBureau, useToday } from './useBureau';
import { monthOf, monthsCovering } from '../lib/bureau/periods';
import { buildWeeklyCashPlan, HORIZON_WEEKS } from '../lib/bureau/weekly-cash';
import { cashOutlook, type CashOutlook } from '../lib/cashflow/outlook';

/**
 * Het antwoord op "kom ik rond?", altijd vanaf vandaag gerekend — niet vanaf de maand waar de
 * ledger toevallig op staat. Dezelfde horizon en dezelfde rekenkern als `/bureau/cash`, zodat de
 * kaart op `/` en het kopgetal op Bureau per constructie hetzelfde getal tonen.
 */
export function useCashOutlook(): CashOutlook {
  const today = useToday();
  const bureau = useBureau();
  const incomeItems = useCashflowStore((s) => s.incomeItems);
  const anchor = monthOf(today);
  const months = useMonths(monthsCovering(today, HORIZON_WEEKS).filter((m) => m >= anchor).length, anchor);
  return useMemo(
    () => cashOutlook(buildWeeklyCashPlan({ asOf: today, months, incomeItems, bureau }), months),
    [today, months, incomeItems, bureau],
  );
}
