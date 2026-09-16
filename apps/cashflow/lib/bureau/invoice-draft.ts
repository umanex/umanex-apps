/**
 * Facturen op een project: het formulier als tekst, de stand tegenover de maandprognose, en de
 * cash-kant per project.
 *
 * De cash-kant raakt de omzet nooit. Gefactureerd, ontvangen en openstaand zijn bedragen incl.
 * btw — wat er op de rekening hoort te komen — en staan los van de mijlpalen.
 */
import { addDays, format, parseISO } from 'date-fns';
import type { IncomeItem, MonthKey } from '../cashflow/types.ts';
import type { Invoice, InvoiceKind, IsoDate, Project } from './types.ts';
import { INVOICE_KINDS } from './types.ts';
import { invoiceGross, round2 } from './money.ts';
import { parseNumber } from './format.ts';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type InvoiceDraft = {
  label: string;
  kind: InvoiceKind;
  date: string;
  amountExVat: string;
  vatRate: string;
  dueDate: string;
  expectedPaymentDate: string;
  /** Maak meteen een inkomstenpost in de prognose. */
  toLedger: boolean;
};

export type InvoiceDraftField = keyof InvoiceDraft;

/** Standaard: vandaag gefactureerd, 30 dagen betaaltermijn, 21 % btw, meteen in de prognose. */
export function emptyInvoiceDraft(today: IsoDate): InvoiceDraft {
  return {
    label: '', kind: 'termijn', date: today, amountExVat: '', vatRate: '21',
    dueDate: format(addDays(parseISO(today), 30), 'yyyy-MM-dd'), expectedPaymentDate: '', toLedger: true,
  };
}

export type InvoiceDraftResult =
  | { ok: true; invoice: Omit<Invoice, 'id' | 'incomeItemId'>; toLedger: boolean }
  | { ok: false; errors: Partial<Record<InvoiceDraftField, string>> };

export function invoiceFromDraft(d: InvoiceDraft): InvoiceDraftResult {
  const errors: Partial<Record<InvoiceDraftField, string>> = {};
  if (!d.label.trim()) errors.label = 'Geef de factuur een omschrijving of nummer.';
  if (!INVOICE_KINDS.includes(d.kind)) errors.kind = 'Kies een soort.';
  if (!ISO_DATE.test(d.date)) errors.date = 'Een datum, bv. 2027-03-01.';
  const bedrag = parseNumber(d.amountExVat);
  if (bedrag === null) errors.amountExVat = d.amountExVat.trim() ? 'Geen bedrag — bv. 4.000.' : 'Vul het bedrag ex btw in.';
  else if (bedrag <= 0) errors.amountExVat = 'Meer dan 0.';
  const btw = parseNumber(d.vatRate);
  if (btw === null || btw < 0 || btw > 100) errors.vatRate = 'Een percentage tussen 0 en 100, bv. 21.';
  if (!ISO_DATE.test(d.dueDate)) errors.dueDate = 'Een datum, bv. 2027-03-31.';
  else if (!errors.date && d.dueDate < d.date) errors.dueDate = 'De vervaldatum ligt vóór de factuurdatum.';
  const verwacht = d.expectedPaymentDate.trim();
  if (verwacht && !ISO_DATE.test(verwacht)) errors.expectedPaymentDate = 'Een datum, of leeg.';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    toLedger: d.toLedger,
    invoice: {
      label: d.label.trim(), kind: d.kind, date: d.date, amountExVat: bedrag!, vatRate: btw!, dueDate: d.dueDate,
      expectedPaymentDate: verwacht || null, paidOn: null, paidAmount: null,
    },
  };
}

export type LedgerState =
  | { kind: 'in-prognose'; monthKey: MonthKey; frozen: boolean }
  /** Geen post, of de post is op de prognose verwijderd. */
  | { kind: 'niet-in-prognose' }
  /** Betaald en de post is weg — zoals het hoort. */
  | { kind: 'betaald-uit-prognose' };

/** `frozenMonths`: de maanden met een snapshot — daar blijft een post staan, ook na betaling. */
export function ledgerState(inv: Invoice, incomeItems: IncomeItem[], frozenMonths: ReadonlySet<MonthKey>): LedgerState {
  const item = inv.incomeItemId ? incomeItems.find((i) => i.id === inv.incomeItemId) : undefined;
  if (item) return { kind: 'in-prognose', monthKey: item.monthKey, frozen: frozenMonths.has(item.monthKey) };
  return inv.paidOn ? { kind: 'betaald-uit-prognose' } : { kind: 'niet-in-prognose' };
}

export type InvoiceStatus = { kind: 'betaald'; on: IsoDate } | { kind: 'vervallen'; since: IsoDate } | { kind: 'open'; due: IsoDate };

/** Vervallen = de vervaldatum is voorbij en er is niet betaald; de verwachte betaaldatum verschuift dat niet. */
export function invoiceStatus(inv: Invoice, today: IsoDate): InvoiceStatus {
  if (inv.paidOn) return { kind: 'betaald', on: inv.paidOn };
  return inv.dueDate < today ? { kind: 'vervallen', since: inv.dueDate } : { kind: 'open', due: inv.dueDate };
}

export type ProjectCash = { invoiced: number; received: number; outstanding: number; count: number };

/** Per project, incl. btw: gefactureerd, ontvangen (werkelijk bedrag) en nog openstaand. */
export function projectCash(p: Project): ProjectCash {
  const invoiced = round2(p.invoices.reduce((s, i) => s + invoiceGross(i), 0));
  const received = round2(p.invoices.reduce((s, i) => s + (i.paidOn ? (i.paidAmount ?? invoiceGross(i)) : 0), 0));
  const outstanding = round2(p.invoices.filter((i) => !i.paidOn).reduce((s, i) => s + invoiceGross(i), 0));
  return { invoiced, received, outstanding, count: p.invoices.length };
}
