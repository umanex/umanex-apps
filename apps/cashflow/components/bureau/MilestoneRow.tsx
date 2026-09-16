'use client';

import { useState } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Input } from '@umanex/ui/components/ui/input';
import { cn } from '@umanex/ui/lib/utils';
import { formatCurrency } from '../../lib/cashflow/recurring';
import type { Extension, Milestone } from '../../lib/bureau/types';
import { parseNumber, toInputValue } from '../../lib/bureau/format';

type MilestoneRowProps = {
  milestone: Milestone;
  extension: Extension | undefined;
  striped: boolean;
  today: string;
  disabled: boolean;
  onSave: (m: Milestone) => void;
  onRealize: (realized: boolean) => void;
  onRemove: () => void;
};

/** Eén mijlpaal: lezen, afvinken als gerealiseerd, of bewerken met OK / Annuleren. */
export function MilestoneRow({ milestone: m, extension, striped, today, disabled, onSave, onRealize, onRemove }: MilestoneRowProps) {
  const [bewerk, setBewerk] = useState(false);
  const [label, setLabel] = useState(m.label);
  const [maand, setMaand] = useState(m.plannedMonth);
  const [bedrag, setBedrag] = useState(toInputValue(m.amount));
  const [op, setOp] = useState(m.realizedOn ?? today);
  const [werkelijk, setWerkelijk] = useState(toInputValue(m.realizedAmount));
  const [fout, setFout] = useState<string | null>(null);

  const td = 'px-3 py-2 align-middle';
  const idBasis = `mijlpaal-${m.id}`;

  if (bewerk) {
    const opslaan = () => {
      const n = parseNumber(bedrag);
      const w = werkelijk.trim() === '' ? null : parseNumber(werkelijk);
      if (!label.trim()) return setFout('Geef de mijlpaal een omschrijving.');
      if (!/^\d{4}-\d{2}$/.test(maand)) return setFout('Geplande maand ontbreekt.');
      if (n === null || n < 0) return setFout('Het bedrag is geen getal van 0 of meer.');
      if (m.realizedOn !== null && !/^\d{4}-\d{2}-\d{2}$/.test(op)) return setFout('De realisatiedatum ontbreekt.');
      if (werkelijk.trim() !== '' && (w === null || w < 0)) return setFout('Het gerealiseerde bedrag is geen getal van 0 of meer.');
      onSave({ ...m, label: label.trim(), plannedMonth: maand, amount: n, realizedOn: m.realizedOn === null ? null : op, realizedAmount: m.realizedOn === null ? null : w });
      setFout(null);
      setBewerk(false);
    };
    return (
      <tr className={cn('border-b border-border', striped && 'bg-muted')}>
        <td className={td} colSpan={5}>
          <div className="grid gap-3 sm:grid-cols-[1fr_9rem_8rem]">
            <Input aria-label="Omschrijving" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input aria-label="Geplande maand" type="month" value={maand} onChange={(e) => setMaand(e.target.value)} />
            <Input aria-label="Gepland bedrag ex btw" inputMode="decimal" className="text-right tabular-nums" value={bedrag} onChange={(e) => setBedrag(e.target.value)} />
            {m.realizedOn !== null && (
              <>
                <span className="self-center text-sm text-muted-foreground sm:text-right">Gerealiseerd op en voor</span>
                <Input aria-label="Realisatiedatum" type="date" value={op} onChange={(e) => setOp(e.target.value)} />
                <Input aria-label="Gerealiseerd bedrag ex btw" inputMode="decimal" className="text-right tabular-nums" placeholder={toInputValue(m.amount)} value={werkelijk} onChange={(e) => setWerkelijk(e.target.value)} />
              </>
            )}
          </div>
          {fout && <p className="mt-2 text-xs text-destructive" role="alert">{fout}</p>}
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={opslaan} disabled={disabled}>OK</Button>
            <Button size="sm" variant="outline" onClick={() => { setBewerk(false); setFout(null); }}>Annuleren</Button>
          </div>
        </td>
      </tr>
    );
  }

  const gerealiseerd = m.realizedOn !== null;
  return (
    <tr data-milestone-row={m.id} className={cn('border-b border-border last:border-0', striped && 'bg-muted')}>
      <th scope="row" className={cn(td, 'text-left font-normal')}>
        {m.label}
        {extension && <p className="text-xs text-muted-foreground">uitbreiding: {extension.label}</p>}
      </th>
      <td className={cn(td, 'tabular-nums')}>{m.plannedMonth}</td>
      <td className={cn(td, 'text-right tabular-nums')}>{formatCurrency(m.amount)}</td>
      <td className={td}>
        <div className="flex items-center gap-2">
          <Checkbox id={`${idBasis}-gerealiseerd`} checked={gerealiseerd} disabled={disabled} onCheckedChange={(v) => onRealize(v === true)} />
          <label htmlFor={`${idBasis}-gerealiseerd`} className="text-sm">
            {gerealiseerd ? (
              <>
                op <span className="tabular-nums">{m.realizedOn}</span>
                {m.realizedAmount !== null && m.realizedAmount !== m.amount && <> · <span className="tabular-nums">{formatCurrency(m.realizedAmount)}</span></>}
              </>
            ) : (
              <span className="text-muted-foreground">nog niet</span>
            )}
          </label>
        </div>
      </td>
      <td className={cn(td, 'whitespace-nowrap text-right')}>
        <Button size="sm" variant="ghost" onClick={() => setBewerk(true)} disabled={disabled} aria-label={`Bewerk mijlpaal ${m.label}`}>
          Bewerken
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          disabled={disabled || gerealiseerd}
          aria-label={`Verwijder mijlpaal ${m.label}`}
        >
          Verwijderen
        </Button>
      </td>
    </tr>
  );
}
