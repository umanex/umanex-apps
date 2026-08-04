'use client';

import Link from 'next/link';
import { useHydrated, useMonths } from '../../hooks/useCashflow';
import { useCashflowStore } from '../../store/cashflow';
import { computeRunway } from '../../lib/cashflow/analysis';
import { RunwayCard } from '../../components/cashflow/RunwayCard';

export default function AnalysePage() {
  const hydrated = useHydrated();
  const months = useMonths(3);
  const monthSnapshots = useCashflowStore((s) => s.monthSnapshots);

  const runway = computeRunway(monthSnapshots, months[0]);

  return (
    <main className="min-h-screen bg-background px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Analyse</h1>
        <Link
          href="/"
          className="inline-flex items-center h-9 px-4 rounded-md border border-input bg-background text-sm font-medium hover:bg-muted transition-colors"
        >
          Naar de prognose
        </Link>
      </header>

      {!hydrated ? (
        <div className="h-40 rounded-xl border border-[var(--umanexPrimary50)] bg-card animate-pulse" />
      ) : (
        <div className="space-y-5">
          <RunwayCard runway={runway} />
          <p className="text-sm text-[var(--umanexNeutral500)]">
            De bufferopbouw-grafiek wacht op het gelijktrekken van react en react-dom in de
            monorepo — zie de briefing.
          </p>
        </div>
      )}
    </main>
  );
}
