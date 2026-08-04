'use client';

import Link from 'next/link';
import { useHydrated, useMonths } from '../../hooks/useCashflow';
import { useCashflowStore } from '../../store/cashflow';
import { bufferSeries, computeRunway } from '../../lib/cashflow/analysis';
import { RunwayCard } from '../../components/cashflow/RunwayCard';
import { BufferChart } from '../../components/cashflow/BufferChart';
import { WaterfallChart } from '../../components/cashflow/WaterfallChart';

export default function AnalysePage() {
  const hydrated = useHydrated();
  const months = useMonths(3);
  const monthSnapshots = useCashflowStore((s) => s.monthSnapshots);

  const runway = computeRunway(monthSnapshots, months[0]);
  const points = bufferSeries(monthSnapshots, months);
  const currentMonth = months[0];

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
        <div className="space-y-5">
          <div className="h-40 rounded-xl border border-[var(--umanexPrimary50)] bg-card animate-pulse" />
          <div className="h-80 rounded-xl border border-[var(--umanexPrimary50)] bg-card animate-pulse" />
        </div>
      ) : (
        <div className="space-y-5">
          <RunwayCard runway={runway} />
          {currentMonth && <WaterfallChart month={currentMonth} />}
          <BufferChart points={points} closedMonths={runway.closedMonths} />
        </div>
      )}
    </main>
  );
}
