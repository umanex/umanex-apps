import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { derivePrHistory, parsePrEntries, type PrEntry } from '@/lib/personalRecords';

/** Wat een lijstrij zelf over zijn records weet. */
export type PrRow = {
  id: string;
  is_pr?: boolean | null;
  pr_metrics?: unknown;
};

const EMPTY = new Map<string, PrEntry[]>();

/**
 * Zegt per rit welke records hij brak.
 *
 * Twee bronnen, in deze volgorde. Ritten van ná 2026-08-22 dragen het antwoord zelf mee in
 * `workouts.pr_metrics` — dat is wat de app destijds gemeten heeft en dus de waarheid.
 * Oudere ritten dragen alleen `is_pr`; daarvoor wordt de reden afgeleid uit de chronologie.
 *
 * Die afleiding vraagt de vólledige historiek, niet de zichtbare lijst: de historiek filtert
 * op periode, en binnen één week is bijna elke rit wel ergens de beste. Vandaar een eigen,
 * smalle query in plaats van meeliften op de lijst-query.
 */
export function usePrHistory(userId: string | undefined) {
  const [derived, setDerived] = useState<Map<string, PrEntry[]>>(EMPTY);
  /** Pas ná de eerste fetch mag een lege uitkomst 'geen metric bekend' betekenen. */
  const [ready, setReady] = useState(false);
  /** Deelt één vlucht: mount en focus vragen anders twee keer dezelfde tabel op. */
  const inFlight = useRef<Promise<void> | null>(null);
  /** Stabiele referenties per rij, zodat de memo van WorkoutCard blijft werken. */
  const cache = useRef(new Map<string, PrEntry[] | null>());

  const refresh = useCallback(async () => {
    if (!userId) {
      setDerived(EMPTY);
      cache.current.clear();
      setReady(true);
      return;
    }
    if (inFlight.current) return inFlight.current;

    inFlight.current = (async () => {
      const { data, error } = await supabase
        .from('workouts')
        .select('id, started_at, avg_watts, avg_split_seconds, distance_meters, best_2k_seconds')
        .eq('user_id', userId);

      if (error) {
        // Een badge is versiering, geen inhoud: bij een leesfout blijft de lijst gewoon
        // renderen — zonder metric-tekst, niet zonder rijen.
        reportError(error, { where: 'usePrHistory.fetch' });
        return;
      }
      if (data) {
        cache.current.clear();
        setDerived(derivePrHistory(data));
      }
    })().finally(() => {
      inFlight.current = null;
      // Ook wissen wanneer de fetch faalde: tijdens het laden is er `null` gecached voor
      // rijen zonder opgeslagen metric, en zonder deze clear blijft die 'nog niet klaar'
      // hangen als 'geen badge'.
      cache.current.clear();
      setReady(true);
    });

    return inFlight.current;
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * `null` = geen record, dus geen badge. Een lege array = record zonder bekende metric:
   * de badge verschijnt kaal. Dat onderscheid is het verschil tussen "niets te vieren" en
   * "we weten alleen niet meer waarom", en die twee mogen er niet hetzelfde uitzien.
   *
   * Zolang de afleiding nog loopt geeft een rit zonder opgeslagen `pr_metrics` `null`: dan
   * verschijnt de badge één keer, in plaats van eerst kaal te tonen en daarna van breedte
   * te springen zodra de metric binnenkomt.
   *
   * Het resultaat wordt gecached omdat `WorkoutCard` in `memo()` zit: een verse array per
   * render zou die memo bij elke render breken.
   */
  const entriesFor = useCallback(
    (row: PrRow): PrEntry[] | null => {
      if (row.is_pr !== true) return null;
      const hit = cache.current.get(row.id);
      if (hit !== undefined) return hit;

      const stored = parsePrEntries(row.pr_metrics);
      const result = stored.length > 0 ? stored : ready ? (derived.get(row.id) ?? []) : null;
      cache.current.set(row.id, result);
      return result;
    },
    [derived, ready],
  );

  return { entriesFor, refresh, ready };
}
