/** Bedragen van het bureau-domein. Omzet ex btw, facturen met btw erbovenop. */
import type { Invoice, Project } from './types.ts';

export const EPSILON = 0.005;

export function round2(n: number): number {
  const v = Math.round(n * 100) / 100;
  return Object.is(v, -0) ? 0 : v;
}

/** Goedgekeurde projectprijs ex btw: vaste prijs plus goedgekeurde uitbreidingen. */
export function approvedTotal(p: Project): number {
  return round2(p.fixedPriceExVat + p.extensions.reduce((s, e) => s + e.amount, 0));
}

/** Factuurbedrag incl. btw — wat er op de rekening hoort te komen. */
export function invoiceGross(i: Invoice): number {
  return round2(i.amountExVat * (1 + i.vatRate / 100));
}
