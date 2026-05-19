import { format, addMonths } from 'date-fns';
import type { MonthKey } from './types';

export function getCurrentMonthKey(): MonthKey {
  return format(new Date(), 'yyyy-MM');
}

export function getMonthLabel(monthKey: MonthKey): string {
  const parts = monthKey.split('-');
  const date = new Date(parseInt(parts[0]!, 10), parseInt(parts[1]!, 10) - 1, 1);
  const label = date.toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function addMonth(monthKey: MonthKey, count = 1): MonthKey {
  const base = new Date(`${monthKey}-01`);
  return format(addMonths(base, count), 'yyyy-MM');
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('nl-BE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function roundTo2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function limitDecimals(value: string): string {
  const sepIdx = value.search(/[,.]/);
  if (sepIdx === -1) return value;
  return value.slice(0, sepIdx + 1) + value.slice(sepIdx + 1).replace(/[,.]/g, '').slice(0, 2);
}
