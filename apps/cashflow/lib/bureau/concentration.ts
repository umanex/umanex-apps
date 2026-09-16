/**
 * Klantconcentratie: welk deel van de jaaromzet van één klant (of klantgroep) komt.
 *
 * Twee bases, nooit door elkaar: **gerealiseerd** (mijlpalen gerealiseerd in het jaar) en
 * **prognose** (gerealiseerd plus resterend getekend werk gepland in het jaar). Voorstellen en
 * kansen tellen in geen van beide. Elke basis draagt haar eigen noemer; bij noemer 0 is er geen
 * aandeel — geen 0 %, want "niets" is geen spreiding.
 *
 * Dezelfde mijlpaal-emmers als de omzet (`bucketMilestones`), zodat de noemer hier altijd gelijk
 * is aan het omzetcijfer elders.
 */
import type { BureauData } from './types.ts';
import { bucketMilestones } from './revenue.ts';
import { round2 } from './money.ts';

export type ConcentrationBasis = 'gerealiseerd' | 'prognose';
export type ConcentrationGrouping = 'klant' | 'groep';

export type ConcentrationRow = {
  /** Klant-id, of groep-id bij groepering. */
  key: string;
  label: string;
  clientIds: string[];
  amount: number;
  /** Fractie (0,42), of `null` bij noemer 0. */
  share: number | null;
  aboveLimit: boolean;
};

export type Concentration = {
  year: number;
  basis: ConcentrationBasis;
  grouping: ConcentrationGrouping;
  denominator: number;
  limit: number | null;
  rows: ConcentrationRow[];
};

export function clientConcentration(
  bureau: BureauData,
  year: number,
  basis: ConcentrationBasis,
  grouping: ConcentrationGrouping,
  limit: number | null,
): Concentration {
  const { buckets } = bucketMilestones(bureau);
  const telt = buckets.filter((b) => b.year === year && (basis === 'prognose' || b.kind === 'gerealiseerd'));
  const clientById = new Map(bureau.clients.map((c) => [c.id, c]));
  const groupById = new Map(bureau.clientGroups.map((g) => [g.id, g]));

  const rows = new Map<string, ConcentrationRow>();
  for (const b of telt) {
    const client = clientById.get(b.clientId);
    const group = grouping === 'groep' && client?.groupId ? groupById.get(client.groupId) : undefined;
    const key = group ? `groep:${group.id}` : `klant:${b.clientId}`;
    const row = rows.get(key) ?? {
      key: group ? group.id : b.clientId,
      label: group ? group.name : (client?.name ?? 'Onbekende klant'),
      clientIds: [],
      amount: 0,
      share: null,
      aboveLimit: false,
    };
    row.amount += b.amount;
    if (!row.clientIds.includes(b.clientId)) row.clientIds.push(b.clientId);
    rows.set(key, row);
  }

  const denominator = round2([...rows.values()].reduce((s, r) => s + r.amount, 0));
  const out = [...rows.values()]
    .map((r) => {
      const amount = round2(r.amount);
      const share = denominator > 0 ? amount / denominator : null;
      return { ...r, amount, share, aboveLimit: share !== null && limit !== null && share > limit };
    })
    .filter((r) => r.amount !== 0)
    .sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label));

  return { year, basis, grouping, denominator, limit, rows: out };
}
