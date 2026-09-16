'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@umanex/ui/components/ui/button';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Label } from '@umanex/ui/components/ui/label';
import { formatAmount } from '../../lib/cashflow/recurring';
import { useAnnounce, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import { INVOICE_KINDS, type Project } from '../../lib/bureau/types';
import { INVOICE_KIND_LABEL } from '../../lib/bureau/labels';
import { addInvoice } from '../../lib/bureau/mutations';
import { emptyInvoiceDraft, invoiceFromDraft, projectCash, type InvoiceDraft, type InvoiceDraftField } from '../../lib/bureau/invoice-draft';
import { TextField } from './fields/TextField';
import { SelectField } from './fields/SelectField';
import { NumberField } from './fields/NumberField';
import { InvoiceRow } from './InvoiceRow';

/**
 * Facturen en betalingen van één project. Cash-kant, incl. btw: ze raken de omzet niet — die
 * volgt de mijlpalen. Een factuur kan meteen een inkomstenpost in de prognose zetten.
 */
export function InvoiceList({ project: p }: { project: Project }) {
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [draft, setDraft] = useState<InvoiceDraft>(() => emptyInvoiceDraft(today));
  const [errors, setErrors] = useState<Partial<Record<InvoiceDraftField, string>>>({});
  const [melding, setMelding] = useState<string | null>(null);
  const zet = <K extends keyof InvoiceDraft>(key: K, value: InvoiceDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const cash = projectCash(p);
  const idBasis = `factuur-nieuw-${p.id}`;

  const toevoegen = (e: FormEvent) => {
    e.preventDefault();
    const r = invoiceFromDraft(draft);
    if (!r.ok) {
      setErrors(r.errors);
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`form[data-form="${idBasis}"] [aria-invalid="true"]`)?.focus());
      return;
    }
    const label = r.invoice.label;
    const uitkomst = mutate((d) =>
      addInvoice(d, p.id, { id: crypto.randomUUID(), ...r.invoice }, r.toLedger ? { incomeItemId: crypto.randomUUID(), label: `${p.name} — ${label}` } : null),
    );
    setErrors({});
    setMelding(uitkomst === 'afgesloten-maand' ? `${label} toegevoegd, maar niet in de prognose: die maand is afgesloten.` : null);
    announce(r.toLedger && uitkomst === 'ok' ? `Factuur ${label} toegevoegd en in de prognose gezet.` : `Factuur ${label} toegevoegd.`);
    setDraft(emptyInvoiceDraft(today));
  };

  return (
    <section aria-labelledby={`facturen-${p.id}`} className="space-y-3 rounded-xl border border-accent bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`facturen-${p.id}`} className="text-base font-semibold">
          Facturen en betalingen
        </h3>
        {cash.count > 0 && (
          <p className="text-sm text-muted-foreground" data-invoice-summary>
            gefactureerd <span className="font-medium text-foreground tabular-nums">{formatAmount(cash.invoiced)}</span> · ontvangen{' '}
            <span className="font-medium text-foreground tabular-nums">{formatAmount(cash.received)}</span> · openstaand{' '}
            <span className="font-medium text-foreground tabular-nums">{formatAmount(cash.outstanding)}</span> · incl. btw
          </p>
        )}
      </div>
      <p className="max-w-prose text-xs text-muted-foreground">Een factuur of betaling verandert de omzet niet — die volgt de mijlpalen. Een voorschot is dus gefactureerd, geen omzet.</p>
      {p.invoices.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nog geen facturen.</p>
      ) : (
        <ul className="space-y-0.5">
          {[...p.invoices]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((inv, i) => (
              <InvoiceRow key={inv.id} project={p} invoice={inv} striped={i % 2 === 1} />
            ))}
        </ul>
      )}

      <form onSubmit={toevoegen} noValidate data-form={idBasis} aria-labelledby={`${idBasis}-titel`} className="space-y-4 border-t border-border pt-4">
        <h4 id={`${idBasis}-titel`} className="text-sm font-semibold">
          Nieuwe factuur
        </h4>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TextField id={`${idBasis}-label`} label="Omschrijving of nummer" value={draft.label} onChange={(v) => zet('label', v)} error={errors.label} className="lg:col-span-2" />
          <SelectField id={`${idBasis}-soort`} label="Soort" value={draft.kind} onChange={(v) => zet('kind', v as InvoiceDraft['kind'])} options={INVOICE_KINDS.map((k) => ({ value: k, label: INVOICE_KIND_LABEL[k] }))} error={errors.kind} />
          <TextField id={`${idBasis}-datum`} type="date" label="Factuurdatum" value={draft.date} onChange={(v) => zet('date', v)} error={errors.date} />
          <NumberField id={`${idBasis}-bedrag`} label="Bedrag ex btw" unit="€" value={draft.amountExVat} onChange={(v) => zet('amountExVat', v)} error={errors.amountExVat} />
          <NumberField id={`${idBasis}-btw`} label="Btw" unit="%" value={draft.vatRate} onChange={(v) => zet('vatRate', v)} error={errors.vatRate} />
          <TextField id={`${idBasis}-verval`} type="date" label="Vervaldatum" value={draft.dueDate} onChange={(v) => zet('dueDate', v)} error={errors.dueDate} />
          <TextField id={`${idBasis}-verwacht`} type="date" label="Verwachte betaling (optioneel)" value={draft.expectedPaymentDate} onChange={(v) => zet('expectedPaymentDate', v)} error={errors.expectedPaymentDate} />
        </div>
        <div className="flex items-start gap-3">
          <Checkbox id={`${idBasis}-prognose`} checked={draft.toLedger} onCheckedChange={(v) => zet('toLedger', v === true)} aria-describedby={`${idBasis}-prognose-hint`} />
          <div className="space-y-1">
            <Label htmlFor={`${idBasis}-prognose`} className="leading-5">
              Zet in de prognose
            </Label>
            <p id={`${idBasis}-prognose-hint`} className="text-xs text-muted-foreground">
              Als inkomstenpost incl. btw, in de maand van de verwachte betaling — of anders van de vervaldatum.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          {melding && <p className="text-sm" role="status">{melding}</p>}
          {conflict && <p id={`${idBasis}-conflict`} className="text-sm text-destructive">Eerst herladen — elders gewijzigd.</p>}
          <Button type="submit" disabled={conflict} aria-describedby={conflict ? `${idBasis}-conflict` : undefined}>
            Factuur toevoegen
          </Button>
        </div>
      </form>
    </section>
  );
}
