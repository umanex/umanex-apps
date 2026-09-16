'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@umanex/ui/components/ui/button';
import { useBureau, useBureauYear } from '../../../hooks/useBureau';
import { bucketMilestones, coverage } from '../../../lib/bureau/revenue';
import { projectProfitability } from '../../../lib/bureau/profitability';
import { hoursPerDayFor } from '../../../lib/bureau/goals';
import { approvedTotal } from '../../../lib/bureau/money';
import type { ProjectStatus } from '../../../lib/bureau/types';
import { EmptyState } from '../../../components/feedback/EmptyState';
import { ProjectSheet } from '../../../components/bureau/ProjectSheet';
import { ProjectTable, type ProjectRow } from '../../../components/bureau/ProjectTable';
import { SelectField } from '../../../components/bureau/fields/SelectField';

type Filter = 'actief' | 'alle' | 'gesloten';
const ACTIEF: ProjectStatus[] = ['gepland', 'lopend', 'gepauzeerd'];

export default function ProjectenPage() {
  const bureau = useBureau();
  const [year] = useBureauYear();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('actief');

  const rows = useMemo<ProjectRow[]>(() => {
    const { buckets } = bucketMilestones(bureau);
    const uurPerDag = hoursPerDayFor(bureau, new Date().getFullYear());
    return bureau.projects
      .filter((p) => (filter === 'alle' ? true : filter === 'actief' ? ACTIEF.includes(p.status) : !ACTIEF.includes(p.status)))
      .sort((a, b) => a.plannedStart.localeCompare(b.plannedStart) || a.name.localeCompare(b.name))
      .map((p) => {
        const eigen = buckets.filter((b) => b.projectId === p.id && b.year === year);
        return {
          project: p,
          client: bureau.clients.find((c) => c.id === p.clientId),
          approved: approvedTotal(p),
          realizedInYear: eigen.filter((b) => b.kind === 'gerealiseerd').reduce((s, b) => s + b.amount, 0),
          remainingInYear: eigen.filter((b) => b.kind === 'resterend').reduce((s, b) => s + b.amount, 0),
          profitability: projectProfitability(p, bureau.timeEntries, uurPerDag),
          coverageDelta: coverage(p).delta,
        };
      });
  }, [bureau, year, filter]);

  const geenProjecten = bureau.projects.length === 0;

  return (
    <section aria-labelledby="projecten-titel" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="projecten-titel" className="text-xl font-semibold">
            Projecten
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Getekend werk tegen vaste prijs. Omzet volgt de mijlpalen; A en B rekenen met eigen dagen — B is geen nettowinst.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {!geenProjecten && (
            <SelectField
              id="projecten-filter"
              label="Toon"
              value={filter}
              onChange={(v) => setFilter(v as Filter)}
              options={[
                { value: 'actief', label: 'Gepland, lopend en gepauzeerd' },
                { value: 'gesloten', label: 'Afgerond en geannuleerd' },
                { value: 'alle', label: 'Alle projecten' },
              ]}
              className="w-64"
            />
          )}
          <ProjectSheet trigger={<Button>Nieuw project</Button>} onCreated={(id) => router.push(`/bureau/projecten/${id}`)} />
        </div>
      </div>

      {geenProjecten ? (
        <EmptyState title="Nog geen projecten">
          Een project is één getekende opdracht: vaste prijs, geplande periode en begrote uren. Daaruit volgen omzet, resterend getekend werk en rendement. Gewonnen kans? Maak het project vanuit Verkoop, dan blijft de koppeling bewaard.
        </EmptyState>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Geen projecten in deze selectie.</p>
      ) : (
        <ProjectTable rows={rows} year={year} caption={`Projecten — ${rows.length} getoond, omzetkolommen voor ${year}`} />
      )}
    </section>
  );
}
