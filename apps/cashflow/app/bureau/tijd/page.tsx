'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@umanex/ui/components/ui/tabs';
import { useBureau, useBureauYear, useToday } from '../../../hooks/useBureau';
import { goalsFor } from '../../../lib/bureau/goals';
import { yearCapacity } from '../../../lib/bureau/capacity';
import { QuickTimeEntry } from '../../../components/bureau/QuickTimeEntry';
import { CapacitySummary } from '../../../components/bureau/CapacitySummary';
import { WeekList } from '../../../components/bureau/WeekList';
import { PlanningPanel } from '../../../components/bureau/PlanningPanel';

export default function TijdPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const today = useToday();
  const goals = goalsFor(bureau, year);
  const capaciteit = goals ? yearCapacity(bureau, goals, year, today) : null;

  return (
    <section aria-labelledby="tijd-titel" className="space-y-5">
      <div>
        <h2 id="tijd-titel" className="text-xl font-semibold">
          Tijd
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Eigen actieve inzet. Besteed is wat je registreert; gepland is het werk dat nog moet gebeuren. De buffer is gereserveerde capaciteit — wat je eruit gebruikt, registreer je bij de echte activiteit.
        </p>
      </div>
      <QuickTimeEntry />
      <CapacitySummary capacity={capaciteit} year={year} />
      <Tabs defaultValue="registratie">
        <TabsList>
          <TabsTrigger value="registratie">Registraties per week</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
        </TabsList>
        <TabsContent value="registratie" className="pt-2">
          <WeekList />
        </TabsContent>
        <TabsContent value="planning" className="pt-2">
          <PlanningPanel goals={goalsFor(bureau, new Date().getFullYear())} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
