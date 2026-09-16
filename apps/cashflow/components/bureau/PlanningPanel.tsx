'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { NativeSelect } from '@umanex/ui/components/ui/native-select';
import { cn } from '@umanex/ui/lib/utils';
import { useAnnounce, useBureau, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { BusinessGoals, PlannedWork, WorkCategory } from '../../lib/bureau/types';
import { WORK_CATEGORIES } from '../../lib/bureau/types';
import { CATEGORY_LABEL } from '../../lib/bureau/labels';
import { removePlannedWork, upsertPlannedWork } from '../../lib/bureau/mutations';
import { weekCapacity } from '../../lib/bureau/capacity';
import { formatDays, parseNumber, weekLabel } from '../../lib/bureau/format';
import { isoWeekKey, weekRange, weeksFrom } from '../../lib/bureau/periods';

/**
 * Resterend werk inplannen per week of per maand, en de weken ernaast met hun belasting tegenover
 * het weekplafond. Gepland is wat nog moet gebeuren — niet wat al geregistreerd is.
 */
export function PlanningPanel({ goals }: { goals: BusinessGoals | null }) {
  const bureau = useBureau();
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const weken = useMemo(() => weeksFrom(today, 13), [today]);
  const [soort, setSoort] = useState<'week' | 'month'>('week');
  const [periode, setPeriode] = useState(isoWeekKey(today));
  const [maand, setMaand] = useState(today.slice(0, 7));
  const [categorie, setCategorie] = useState<WorkCategory>('klantwerk');
  const [projectId, setProjectId] = useState('');
  const [dagen, setDagen] = useState('');
  const [fout, setFout] = useState<string | null>(null);

  const rijen = goals ? weekCapacity(bureau, goals, weken, today) : [];
  const toekomst = bureau.plannedWork
    .filter((w) => (w.periodKind === 'week' ? weekRange(w.periodKey).to >= today : `${w.periodKey}-31` >= today))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey));
  const projectNaam = (id: string | null) => bureau.projects.find((p) => p.id === id)?.name ?? null;

  const plan = (e: FormEvent) => {
    e.preventDefault();
    const n = parseNumber(dagen);
    if (n === null || n <= 0) return setFout('Vul dagen in, meer dan 0 — bv. 2 of 0,5.');
    if (categorie === 'klantwerk' && !projectId) return setFout('Kies een project voor klantwerk.');
    const w: PlannedWork = { id: crypto.randomUUID(), periodKind: soort, periodKey: soort === 'week' ? periode : maand, category: categorie, projectId: categorie === 'klantwerk' ? projectId : null, days: n };
    mutate((d) => upsertPlannedWork(d, w));
    announce(`${formatDays(n)} ${CATEGORY_LABEL[categorie]} gepland in ${soort === 'week' ? weekLabel(periode) : maand}.`);
    setDagen('');
    setFout(null);
  };

  return (
    <div className="space-y-5">
      {!goals ? (
        <p className="text-sm text-muted-foreground">Zonder doelen voor dit jaar is er geen weekplafond om tegen te plannen.</p>
      ) : (
        <div data-scroll-x className="overflow-x-auto rounded-xl border border-accent bg-card">
          <table className="w-full min-w-[36rem] text-dense">
            <caption className="px-3 pt-3 text-left text-sm text-muted-foreground">
              13 weken vanaf deze week · plafond {formatDays(goals.daysPerWeek)} per week · gepland is resterend werk
            </caption>
            <thead className="border-b border-border">
              <tr>
                {['Week', 'Besteed', 'Gepland', 'Belasting', 'Ruimte'].map((h, i) => (
                  <th key={h} scope="col" className={cn('px-3 py-2 text-xs font-medium text-muted-foreground', i === 0 ? 'text-left' : 'text-right')}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rijen.map((r, i) => (
                <tr key={r.weekKey} data-week-row={r.weekKey} className={cn('border-b border-border last:border-0', i % 2 === 1 && 'bg-muted')}>
                  <th scope="row" className="px-3 py-1.5 text-left font-normal">{weekLabel(r.weekKey)}</th>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatDays(r.spentDays)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatDays(r.plannedDays)}{r.monthPlannedDays > 0 && <span className="block text-xs text-muted-foreground">+ {formatDays(r.monthPlannedDays)} maandplan</span>}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatDays(r.loadDays)}</td>
                  <td className={cn('px-3 py-1.5 text-right tabular-nums', r.overbookedDays > 0 && 'bg-finance-negative-surface/10 font-medium text-finance-negative')}>
                    {r.overbookedDays > 0 ? `overboekt ${formatDays(r.overbookedDays)}` : formatDays(r.ceilingDays - r.loadDays)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form onSubmit={plan} noValidate aria-labelledby="plan-titel" className="space-y-3 rounded-xl border border-accent bg-card p-5">
        <h4 id="plan-titel" className="text-sm font-semibold">Resterend werk inplannen</h4>
        <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[8rem_12rem_12rem_1fr_6rem_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-soort">Per</Label>
            <NativeSelect id="plan-soort" value={soort} onChange={(e) => setSoort(e.target.value as 'week' | 'month')}>
              <option value="week">Week</option>
              <option value="month">Maand</option>
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-periode">{soort === 'week' ? 'Week' : 'Maand'}</Label>
            {soort === 'week' ? (
              <NativeSelect id="plan-periode" value={periode} onChange={(e) => setPeriode(e.target.value)}>
                {weken.map((w) => <option key={w} value={w}>{weekLabel(w)}</option>)}
              </NativeSelect>
            ) : (
              <Input id="plan-periode" type="month" value={maand} onChange={(e) => setMaand(e.target.value)} />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-categorie">Categorie</Label>
            <NativeSelect id="plan-categorie" value={categorie} onChange={(e) => setCategorie(e.target.value as WorkCategory)}>
              {WORK_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-project">Project</Label>
            <NativeSelect id="plan-project" value={categorie === 'klantwerk' ? projectId : ''} disabled={categorie !== 'klantwerk'} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">{categorie === 'klantwerk' ? 'Kies een project' : 'Alleen bij klantwerk'}</option>
              {bureau.projects.filter((p) => p.status !== 'afgerond' && p.status !== 'geannuleerd').map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="plan-dagen">Dagen</Label>
            <Input id="plan-dagen" inputMode="decimal" className="text-right tabular-nums" value={dagen} onChange={(e) => setDagen(e.target.value)} />
          </div>
          <Button type="submit" disabled={conflict}>Inplannen</Button>
        </div>
        {fout && <p className="text-xs text-destructive" role="alert">{fout}</p>}
      </form>

      {toekomst.length > 0 && (
        <section aria-labelledby="gepland-titel" className="space-y-2">
          <h4 id="gepland-titel" className="text-sm font-semibold">Ingepland</h4>
          <ul className="space-y-0.5">
            {toekomst.map((w, i) => (
              <li key={w.id} className={cn('flex flex-wrap items-center gap-3 rounded-sm px-2 py-1 text-dense', i % 2 === 1 && 'bg-muted')}>
                <span className="w-44 tabular-nums">{w.periodKind === 'week' ? weekLabel(w.periodKey) : w.periodKey}</span>
                <span className="flex-1">{CATEGORY_LABEL[w.category]}{projectNaam(w.projectId) ? ` · ${projectNaam(w.projectId)}` : ''}</span>
                <span className="font-semibold tabular-nums">{formatDays(w.days)}</span>
                <Button size="sm" variant="ghost" disabled={conflict} onClick={() => { mutate((d) => removePlannedWork(d, w.id)); announce('Planning verwijderd.'); }} aria-label={`Verwijder planning ${formatDays(w.days)} ${CATEGORY_LABEL[w.category]}`}>
                  Verwijderen
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
