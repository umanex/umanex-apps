'use client';

import { useState } from 'react';
import { Badge } from '@umanex/ui/components/ui/badge';
import { Button } from '@umanex/ui/components/ui/button';
import { Checkbox } from '@umanex/ui/components/ui/checkbox';
import { Input } from '@umanex/ui/components/ui/input';
import { Label } from '@umanex/ui/components/ui/label';
import { cn } from '@umanex/ui/lib/utils';
import { formatAmount, getMonthLabel } from '../../lib/cashflow/recurring';
import { useAnnounce, useFrozenMonths, useIncomeItems, useMutateBureau, useToday } from '../../hooks/useBureau';
import { useSyncStatus } from '../../lib/cashflow/sync-status';
import type { Invoice, Project } from '../../lib/bureau/types';
import { INVOICE_KIND_LABEL } from '../../lib/bureau/labels';
import { invoiceGross } from '../../lib/bureau/money';
import { linkInvoiceToLedger, markInvoicePaid, removeInvoice, unmarkInvoicePaid, updateInvoice } from '../../lib/bureau/mutations';
import { invoiceStatus, ledgerState } from '../../lib/bureau/invoice-draft';
import { dateLabel } from '../../lib/bureau/format';

type InvoiceRowProps = { project: Project; invoice: Invoice; striped: boolean };

/**
 * Eén factuur: bedrag, status, en waar ze in de prognose staat. Betaald afvinken haalt de post
 * uit de prognose — het geld zit dan in je banksaldo — behalve in een afgesloten maand.
 */
export function InvoiceRow({ project: p, invoice: inv, striped }: InvoiceRowProps) {
  const today = useToday();
  const mutate = useMutateBureau();
  const announce = useAnnounce();
  const incomeItems = useIncomeItems();
  const frozen = useFrozenMonths();
  const conflict = useSyncStatus((s) => s.state) === 'conflict';
  const [verwacht, setVerwacht] = useState(inv.expectedPaymentDate ?? '');
  const [melding, setMelding] = useState<string | null>(null);
  const [bevestig, setBevestig] = useState(false);

  const status = invoiceStatus(inv, today);
  const ledger = ledgerState(inv, incomeItems, frozen);
  const bruto = invoiceGross(inv);
  const postLabel = `${p.name} — ${inv.label}`;
  const id = `factuur-${inv.id}`;

  const betaald = (aan: boolean) => {
    setMelding(null);
    if (aan) {
      const r = mutate((d) => markInvoicePaid(d, p.id, inv.id, today, bruto));
      if (r === 'afgesloten-maand') setMelding('Betaald. De post staat in een afgesloten maand en blijft daar staan.');
      announce(r === 'verwijderd' ? `${inv.label} betaald; de post is uit de prognose gehaald.` : `${inv.label} betaald.`);
    } else {
      const r = mutate((d) => unmarkInvoicePaid(d, p.id, inv.id, { incomeItemId: crypto.randomUUID(), label: postLabel }));
      if (r === 'afgesloten-maand') setMelding('Weer open. De maand van de betaaldatum is afgesloten, dus er kwam geen post bij.');
      announce(r === 'ok' ? `${inv.label} weer open; de post staat terug in de prognose.` : `${inv.label} weer open.`);
    }
  };

  const zetVerwacht = () => {
    if (verwacht && !/^\d{4}-\d{2}-\d{2}$/.test(verwacht)) return setMelding('De verwachte betaaldatum is geen datum.');
    mutate((d) => updateInvoice(d, p.id, inv.id, { expectedPaymentDate: verwacht || null }));
    setMelding(null);
    announce(verwacht ? `${inv.label}: verwacht op ${dateLabel(verwacht)}.` : `${inv.label}: geen verwachte betaaldatum meer.`);
  };

  const inPrognose = () => {
    const r = mutate((d) => linkInvoiceToLedger(d, p.id, inv.id, crypto.randomUUID(), postLabel));
    if (r === 'afgesloten-maand') setMelding('De maand van de betaaldatum is afgesloten; zet eerst een latere verwachte betaaldatum.');
    else if (r === 'ok') announce(`${inv.label} staat in de prognose.`);
  };

  return (
    <li data-invoice-row={inv.id} className={cn('space-y-2 rounded-sm px-3 py-2.5 text-dense', striped && 'bg-muted')}>
      <div className="grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-baseline">
        <div className="min-w-0">
          <p className="truncate font-medium">{inv.label}</p>
          <p className="text-xs text-muted-foreground">
            {INVOICE_KIND_LABEL[inv.kind]} · gefactureerd {dateLabel(inv.date)} ·{' '}
            {status.kind === 'betaald' ? (
              <>betaald {dateLabel(status.on)}{inv.paidAmount !== null && inv.paidAmount !== bruto ? ` (${formatAmount(inv.paidAmount)})` : ''}</>
            ) : status.kind === 'vervallen' ? (
              <span className="font-medium text-destructive">vervallen sinds {dateLabel(status.since)}</span>
            ) : (
              <>vervalt {dateLabel(status.due)}</>
            )}
          </p>
        </div>
        <p className="tabular-nums sm:text-right">
          {formatAmount(inv.amountExVat)} <span className="text-xs text-muted-foreground">ex btw</span>
          <span className="block text-xs text-muted-foreground">{formatAmount(bruto)} incl. {inv.vatRate} %</span>
        </p>
        <div data-ledger={ledger.kind}>
          {ledger.kind === 'in-prognose' ? (
            <Badge variant="secondary">
              In prognose · {getMonthLabel(ledger.monthKey)}
              {ledger.frozen ? ' · afgesloten' : ''}
            </Badge>
          ) : ledger.kind === 'niet-in-prognose' ? (
            <Badge variant="outline">Niet in prognose</Badge>
          ) : (
            <Badge variant="outline">Uit prognose</Badge>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id={`${id}-betaald`} checked={inv.paidOn !== null} disabled={conflict} onCheckedChange={(v) => betaald(v === true)} aria-describedby={`${id}-betaald-hint`} />
          <Label htmlFor={`${id}-betaald`}>Betaald</Label>
          <span id={`${id}-betaald-hint`} className="text-xs text-muted-foreground">
            {inv.paidOn ? 'uitvinken zet de post terug' : 'haalt de post uit de prognose'}
          </span>
        </div>
        {!inv.paidOn && (
          <div className="flex items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor={`${id}-verwacht`} className="text-xs">
                Verwachte betaling
              </Label>
              <Input
                id={`${id}-verwacht`}
                type="date"
                className="h-9 w-40"
                value={verwacht}
                onChange={(e) => setVerwacht(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); zetVerwacht(); } }}
              />
            </div>
            <Button size="sm" variant="outline" disabled={conflict} onClick={zetVerwacht} aria-label={`Bewaar verwachte betaling voor ${inv.label}`}>
              OK
            </Button>
          </div>
        )}
        {ledger.kind === 'niet-in-prognose' && (
          <Button size="sm" variant="outline" disabled={conflict} onClick={inPrognose} aria-label={`Zet ${inv.label} in de prognose`}>
            Zet in prognose
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          {bevestig ? (
            <>
              <Button
                size="sm"
                variant="destructive"
                disabled={conflict}
                onClick={() => {
                  mutate((d) => removeInvoice(d, p.id, inv.id));
                  announce(ledger.kind === 'in-prognose' && !ledger.frozen ? `${inv.label} verwijderd, met de post uit de prognose.` : `${inv.label} verwijderd.`);
                }}
              >
                Ja, verwijderen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setBevestig(false)}>
                Niet verwijderen
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={conflict} onClick={() => setBevestig(true)} aria-label={`Verwijder factuur ${inv.label}`}>
              Verwijderen
            </Button>
          )}
        </div>
      </div>
      {bevestig && ledger.kind === 'in-prognose' && !ledger.frozen && <p className="text-xs text-muted-foreground">De post in {getMonthLabel(ledger.monthKey)} verdwijnt mee.</p>}
      {melding && (
        <p className="text-xs" role="status">
          {melding}
        </p>
      )}
    </li>
  );
}
