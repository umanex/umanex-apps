'use client';

import { useMonths } from '../../hooks/useCashflow';
import { AppHeader } from '../../components/layout/AppHeader';
import { useCashflowStore } from '../../store/cashflow';
import { getCurrentMonthKey } from '../../lib/cashflow/recurring';
import { bufferSeries, computeRunway } from '../../lib/cashflow/analysis';
import { RunwayCard } from '../../components/cashflow/RunwayCard';
import { BufferChart } from '../../components/cashflow/BufferChart';
import { WaterfallChart } from '../../components/cashflow/WaterfallChart';
import { VarianceChart } from '../../components/cashflow/VarianceChart';

export default function AnalysePage() {
  // Altijd vanaf vandaag rekenen: de analyse mag niet meebewegen met waar je op de
  // prognosepagina naartoe genavigeerd bent.
  const months = useMonths(3, getCurrentMonthKey());
  const monthSnapshots = useCashflowStore((s) => s.monthSnapshots);

  const runway = computeRunway(monthSnapshots, months[0]);
  const points = bufferSeries(monthSnapshots, months);
  const currentMonth = months[0];
  const sortedSnapshots = [...monthSnapshots].sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  return (
    <main className="min-h-screen bg-background px-4 py-8 space-y-8">
      <AppHeader title="Analyse" />

      <div className="space-y-5">
        <RunwayCard runway={runway} />
        {currentMonth && <WaterfallChart month={currentMonth} />}
        <BufferChart points={points} closedMonths={runway.closedMonths} />
        <VarianceChart snapshots={sortedSnapshots} />
      </div>
    </main>
  );
}
