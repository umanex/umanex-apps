'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Label } from '@umanex/ui/components/ui/label';
import { formatCurrency } from '../../lib/cashflow/recurring';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { BusinessGoals } from '../../lib/bureau/types';
import { WORK_CATEGORIES } from '../../lib/bureau/types';
import { draftFromGoals, draftSums, goalsFromDraft, type DraftField, type GoalsDraft, type SignalKey } from '../../lib/bureau/goals-draft';
import { formatDays, parseNumber } from '../../lib/bureau/format';
import { CATEGORY_LABEL } from '../../lib/bureau/labels';
import type { RegisteredOutflow } from '../../lib/bureau/goals';
import { NumberField } from './fields/NumberField';
import { SumLine } from './SumLine';
import { FormSection } from './FormSection';

type GoalsFormProps = {
  year: number;
  initial: BusinessGoals;
  /** Nog niet opgeslagen: startwaarden of een kopie van een ander jaar. */
  isNew: boolean;
  /** Wat de maandprognose vandaag per maand aan uitgaven draagt — om de cashbehoefte naast te leggen. */
  registered: RegisteredOutflow | null;
  onSave: (goals: BusinessGoals) => void;
  onDiscard?: () => void;
};

const signaalTekst: Record<SignalKey, { titel: string; uitleg: string }> = {
  negativeCash: { titel: 'Verwacht negatief vrij saldo', uitleg: 'In een van de komende 13 weken zakt het vrije saldo onder de vloer.' },
  overbooking: { titel: 'Overboekte capaciteit', uitleg: 'Besteed plus gepland gaat boven het dagbudget, ook nadat de buffer is opgebruikt.' },
  projectOverrun: { titel: 'Projectuitloop', uitleg: 'Bestede plus verwachte resterende uren gaan boven de begrote uren van een project.' },
  clientConcentration: { titel: 'Klantconcentratie boven de grens', uitleg: 'Eén klant of klantgroep draagt meer dan het maximale aandeel hierboven.' },
  overdueSalesAction: { titel: 'Verlopen verkoopactie', uitleg: 'De volgende actie van een open kans is over datum.' },
  revenueGap: { titel: 'Omzetgat zonder genoeg klantdagen', uitleg: 'Wat nog te verkopen is, past niet in de vrije klantdagen tegen het doeltarief.' },
};

const metTeken = (n: number, eenheid: (v: number) => string) => `${n > 0 ? '+' : '−'}${eenheid(Math.abs(n))}`;

export function GoalsForm({ year, initial, isNew, registered, onSave, onDiscard }: GoalsFormProps) {
  const start = useMemo(() => draftFromGoals(initial), [initial]);
  const [draft, setDraft] = useState<GoalsDraft>(start);
  const [errors, setErrors] = useState<Partial<Record<DraftField, string>>>({});
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(start);
  const sums = draftSums(draft);

  const zet = <K extends keyof GoalsDraft>(key: K, value: GoalsDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const fout = (f: DraftField) => errors[f];

  const opslaan = (e: FormEvent) => {
    e.preventDefault();
    const r = goalsFromDraft(year, draft);
    if (!r.ok) {
      setErrors(r.errors);
      // Focus naar het eerste veld met een fout, in documentvolgorde.
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setErrors({});
    onSave(r.goals);
  };

  const afgeleidA = (() => {
    const omzet = parseNumber(draft.revenueTarget);
    const dagen = parseNumber(draft.daysPerCategory.klantwerk);
    return omzet !== null && dagen !== null && dagen > 0 ? formatCurrency(omzet / dagen) : null;
  })();
  const cashNood = parseNumber(draft.monthlyCashNeed);

  return (
    <form onSubmit={opslaan} noValidate className="max-w-4xl space-y-5">
      <FormSection title="Omzet" description="Managementdoel, exclusief btw. Een aanname die je bijstelt, geen regel.">
        <NumberField id="doel-omzet" label="Omzetdoel (ex btw)" unit="€" value={draft.revenueTarget} onChange={(v) => zet('revenueTarget', v)} error={fout('revenueTarget')} className="max-w-xs" />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {(['Q1', 'Q2', 'Q3', 'Q4'] as const).map((q, i) => (
            <NumberField
              key={q}
              id={`doel-${q.toLowerCase()}`}
              label={`${q} (optioneel)`}
              unit="€"
              value={draft.quarters[i] ?? ''}
              onChange={(v) => zet('quarters', draft.quarters.map((x, j) => (j === i ? v : x)) as GoalsDraft['quarters'])}
              error={i === 0 ? fout('quarters') : undefined}
            />
          ))}
        </div>
        {draft.quarters.some((q) => q.trim() !== '') && (
          <SumLine
            label="Som kwartalen"
            sum={sums.quarters ? formatCurrency(sums.quarters.sum) : ''}
            against={sums.quarters ? `jaardoel ${formatCurrency(sums.quarters.target)}` : ''}
            deviation={sums.quarters && Math.abs(sums.quarters.deviation) > 0.005 ? metTeken(sums.quarters.deviation, formatCurrency) : null}
            unreadable={!sums.quarters}
          />
        )}
      </FormSection>

      <FormSection title="Eigen tijd" description="Dagen eigen actieve inzet. De buffer is gereserveerde capaciteit, geen categorie: wat je eruit gebruikt, registreer je bij de echte activiteit.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <NumberField id="doel-dagen-totaal" label="Totaal eigen dagen" unit="d" value={draft.daysTotal} onChange={(v) => zet('daysTotal', v)} error={fout('daysTotal')} />
          {WORK_CATEGORIES.map((c) => (
            <NumberField
              key={c}
              id={`doel-dagen-${c}`}
              label={CATEGORY_LABEL[c]}
              unit="d"
              value={draft.daysPerCategory[c]}
              onChange={(v) => zet('daysPerCategory', { ...draft.daysPerCategory, [c]: v })}
              error={fout(`days.${c}`)}
            />
          ))}
          <NumberField id="doel-dagen-buffer" label="Onverdeelde buffer" unit="d" value={draft.daysBuffer} onChange={(v) => zet('daysBuffer', v)} error={fout('daysBuffer')} />
        </div>
        <SumLine
          label="Som categorieën en buffer"
          sum={sums.days ? formatDays(sums.days.sum) : ''}
          against={sums.days ? `totaal ${formatDays(sums.days.total)}` : ''}
          deviation={sums.days && Math.abs(sums.days.deviation) > 0.005 ? metTeken(sums.days.deviation, formatDays) : null}
          unreadable={!sums.days}
        />
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <NumberField
            id="doel-uren-per-dag"
            label="Uren per dag"
            unit="u"
            value={draft.hoursPerDay}
            onChange={(v) => zet('hoursPerDay', v)}
            error={fout('hoursPerDay')}
            hint="Rekenconventie. Een wijziging geldt voor nieuwe registraties; bestaande houden hun uren per dag."
          />
          <NumberField id="doel-dagen-per-week" label="Dagen per week" unit="d" value={draft.daysPerWeek} onChange={(v) => zet('daysPerWeek', v)} error={fout('daysPerWeek')} hint="Weekplafond voor overboeking." />
        </div>
      </FormSection>

      <FormSection title="Rendement" description="Twee verschillende maten, elk met een eigen doel. A is omzet per eigen projectdag. B is opbrengst na directe externe kosten per eigen projectdag — geen nettowinst: algemene bedrijfskosten zitten er niet in.">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField
            id="doel-a"
            label="Doel A — omzet per projectdag (optioneel)"
            unit="€"
            value={draft.targetRevenuePerDay}
            onChange={(v) => zet('targetRevenuePerDay', v)}
            error={fout('targetRevenuePerDay')}
            placeholder={afgeleidA ?? ''}
            hint={afgeleidA ? `Leeg = afgeleid: omzetdoel ÷ klantwerkdagen = ${afgeleidA}.` : 'Leeg = afgeleid uit omzetdoel en klantwerkdagen.'}
          />
          <NumberField
            id="doel-b"
            label="Doel B — na externe kosten per projectdag (optioneel)"
            unit="€"
            value={draft.targetMarginPerDay}
            onChange={(v) => zet('targetMarginPerDay', v)}
            error={fout('targetMarginPerDay')}
            hint="Leeg = geen doel. B wordt nooit met het doel voor A vergeleken."
          />
        </div>
      </FormSection>

      <FormSection title="Klanten">
        <NumberField
          id="doel-klantaandeel"
          label="Maximaal aandeel van één klant"
          unit="%"
          value={draft.maxClientShare}
          onChange={(v) => zet('maxClientShare', v)}
          error={fout('maxClientShare')}
          hint="Van de jaaromzet. Klanten in dezelfde klantgroep tellen samen."
          className="max-w-xs"
        />
      </FormSection>

      <FormSection title="Cash" description="De cashbehoefte is een planningsaanname. Ze wordt nooit bovenop de uitgaven in je prognose geteld — alleen ernaast gelegd.">
        <NumberField id="doel-cashbehoefte" label="Maandelijkse cashbehoefte (aanname)" unit="€" value={draft.monthlyCashNeed} onChange={(v) => zet('monthlyCashNeed', v)} error={fout('monthlyCashNeed')} className="max-w-xs" />
        <div className="text-sm" data-registered-outflow>
          {registered ? (
            <>
              <p>
                <span className="text-muted-foreground">Geregistreerd in de prognose: </span>
                <span className="font-medium tabular-nums">{formatCurrency(registered.perMonth.total)}</span>
                <span className="text-muted-foreground"> per maand</span>
                {cashNood !== null && (
                  <span className="text-muted-foreground">
                    {' '}· aanname {formatCurrency(cashNood)} · verschil{' '}
                    <span className="font-medium text-foreground tabular-nums">{metTeken(cashNood - registered.perMonth.total, formatCurrency)}</span>
                  </span>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Gemiddelde over {registered.months.length} {registered.months.length === 1 ? 'maand' : 'maanden'} na deze: vaste uitgaven {formatCurrency(registered.perMonth.recurring)} · eenmalig {formatCurrency(registered.perMonth.oneOff)} · budgetten {formatCurrency(registered.perMonth.budgets)} · provisies {formatCurrency(registered.perMonth.provisions)}. Provisies bevatten ook een btw-pot als je die hebt; de buffer telt niet mee.
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Nog geen maand na deze in de prognose om mee te vergelijken.</p>
          )}
        </div>
      </FormSection>

      <FormSection title="Signalen" description="Wat het overzicht bovenaan meldt. Ontbrekende gegevens verschijnen als onzeker, nooit als in orde.">
        <ul className="divide-y divide-border">
          {(Object.keys(signaalTekst) as SignalKey[]).map((key) => {
            const id = `signaal-${key}`;
            const drempel: Record<SignalKey, ReactNode> = {
              negativeCash: <NumberField id="signaal-vloer" label="Vloer" unit="€" value={draft.negativeCashFloor} onChange={(v) => zet('negativeCashFloor', v)} error={fout('negativeCashFloor')} disabled={!draft.signalsEnabled.negativeCash} />,
              overbooking: <NumberField id="signaal-tolerantie" label="Tolerantie" unit="d" value={draft.overbookingToleranceDays} onChange={(v) => zet('overbookingToleranceDays', v)} error={fout('overbookingToleranceDays')} disabled={!draft.signalsEnabled.overbooking} />,
              projectOverrun: <NumberField id="signaal-uitloop" label="Vanaf" unit="%" value={draft.projectOverrunPercent} onChange={(v) => zet('projectOverrunPercent', v)} error={fout('projectOverrunPercent')} disabled={!draft.signalsEnabled.projectOverrun} />,
              clientConcentration: null,
              overdueSalesAction: <NumberField id="signaal-marge" label="Na" unit="d" value={draft.overdueGraceDays} onChange={(v) => zet('overdueGraceDays', v)} error={fout('overdueGraceDays')} disabled={!draft.signalsEnabled.overdueSalesAction} />,
              revenueGap: null,
            };
            return (
              <li key={key} className="flex flex-wrap items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <Checkbox
                    id={id}
                    className="mt-0.5"
                    checked={draft.signalsEnabled[key]}
                    onCheckedChange={(v) => zet('signalsEnabled', { ...draft.signalsEnabled, [key]: v === true })}
                    aria-describedby={`${id}-uitleg`}
                  />
                  <div className="min-w-0">
                    <Label htmlFor={id}>{signaalTekst[key].titel}</Label>
                    <p id={`${id}-uitleg`} className="mt-1 text-sm text-muted-foreground">
                      {signaalTekst[key].uitleg}
                    </p>
                  </div>
                </div>
                {drempel[key] && <div className="w-40 shrink-0">{drempel[key]}</div>}
              </li>
            );
          })}
        </ul>
      </FormSection>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={conflict || !dirty} aria-describedby={conflict ? 'doelen-conflict' : undefined}>
          {isNew ? `Doelen ${year} opslaan` : 'Wijzigingen opslaan'}
        </Button>
        {dirty && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(start);
              setErrors({});
              onDiscard?.();
            }}
          >
            {isNew ? 'Annuleren' : 'Wijzigingen ongedaan maken'}
          </Button>
        )}
        <p className="text-sm text-muted-foreground" role="status">
          {conflict ? (
            <span id="doelen-conflict">Eerst herladen — elders gewijzigd.</span>
          ) : Object.keys(errors).length > 0 ? (
            `${Object.keys(errors).length} ${Object.keys(errors).length === 1 ? 'veld vraagt' : 'velden vragen'} aandacht.`
          ) : isNew ? (
            'Nog niet opgeslagen.'
          ) : dirty ? (
            'Niet opgeslagen wijzigingen.'
          ) : (
            ''
          )}
        </p>
      </div>
    </form>
  );
}
