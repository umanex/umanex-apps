import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import {
  EMPTY_BASELINE,
  LOWER_IS_BETTER,
  PR_METRICS,
  type PrBaseline,
  type PrMetric,
} from '@/lib/personalRecords';

/**
 * De staande persoonlijke records, over de VOLLEDIGE historiek.
 *
 * WAAROM DIT BESTAAT. `useGoalProgress.fetchPRs` haalde de laatste honderd ritten op en
 * bouwde de baseline daaruit op. Zodra rit 101 er is, valt de oudste uit beeld: een record dat
 * daarbuiten ligt telt niet meer mee, en een zwakkere prestatie wordt opnieuw als "nieuw
 * record" gevierd (functionele review F6, backlog 2026-08-22). Bij negentien ritten was dat
 * nog niet bereikbaar — en zodra het bereikbaar wordt, is het onzichtbaar: er staat gewoon
 * een plausibel record.
 *
 * Honderd rijen ophalen om er vier getallen uit te halen was sowieso de omgekeerde volgorde.
 * Vier gerichte queries laten de database sorteren en leveren elk één rij.
 *
 * TWEE DINGEN DIE DE QUERY ZELF MOET DRAGEN:
 *
 * 1. `.gt(kolom, 0)` is de `isUsable`-regel uit `personalRecords.ts` — nul en negatief zijn
 *    geen prestatie maar een ontbrekende meting. Hij doet nog iets tweeds: hij houdt NULL
 *    buiten. Dat is niet theoretisch. Gemeten op het live schema (2026-09-16,
 *    `information_schema.columns`): `avg_watts` en `avg_split_seconds` zijn nullable, en
 *    Postgres sorteert NULLS FIRST bij DESC — zonder filter zou het wattrecord een lege rij
 *    zijn. (`distance_meters` is NOT NULL; die had het niet nodig, maar dezelfde vorm voor
 *    alle vier is hier goedkoper dan vier uitzonderingen.)
 * 2. De tweede `order` op `started_at` oplopend houdt bij een gedeeld record de VROEGSTE rit
 *    als houder — "je staat op 142 W sinds …". Dat deed de oude opbouw ook, door de lijst om
 *    te keren voor hij hem samenvouwde; zonder deze regel zou dat stil omslaan naar de laatste.
 */

/** De kolom per metric — exact de kolomnamen uit `workouts`. */
const KOLOM: Record<PrMetric, string> = {
  distance: 'distance_meters',
  best2k: 'best_2k_seconds',
  watts: 'avg_watts',
  split: 'avg_split_seconds',
};

type RecordRij = Record<string, unknown> & { started_at?: string };

/**
 * Haalt per metric het staande record op.
 *
 * Faalt één van de queries, dan komt de héle baseline leeg terug. Dat is dezelfde keuze als
 * voorheen en het is de veilige kant: een lege baseline levert géén records op (elke metric
 * mist zijn voorganger), terwijl een half gevulde baseline records zou claimen tegen waarden
 * die er niet zijn.
 */
export async function fetchPrBaseline(userId: string): Promise<PrBaseline> {
  const resultaten = await Promise.all(
    PR_METRICS.map(async (metric) => {
      const kolom = KOLOM[metric];
      // Als `string` getypeerd en niet als template-literal: postgrest-js leest de kolomlijst
      // op typeniveau en struikelt over een dynamische staart. Zelfde reden als in
      // `history/index.tsx` en `home`.
      const columns: string = `${kolom}, started_at`;
      const { data, error } = await supabase
        .from('workouts')
        .select(columns)
        .eq('user_id', userId)
        .gt(kolom, 0)
        .order(kolom, { ascending: LOWER_IS_BETTER[metric] })
        .order('started_at', { ascending: true })
        .limit(1);
      return { metric, kolom, rij: (data as RecordRij[] | null)?.[0] ?? null, error };
    }),
  );

  const stuk = resultaten.find((r) => r.error);
  if (stuk) {
    reportError(stuk.error, { where: 'personalRecordsQuery.fetchPrBaseline', metric: stuk.metric });
    return EMPTY_BASELINE;
  }

  const baseline: PrBaseline = { ...EMPTY_BASELINE };
  for (const { metric, kolom, rij } of resultaten) {
    const waarde = rij?.[kolom];
    if (typeof waarde !== 'number' || !Number.isFinite(waarde) || waarde <= 0) continue;
    if (typeof rij?.started_at !== 'string') continue;
    baseline[metric] = { value: waarde, at: rij.started_at };
  }
  return baseline;
}
