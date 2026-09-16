import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { RowerMetrics } from '@/lib/ble/types';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { createSession, step, type Session } from '@/lib/sessionAccumulator';

const log: (...args: unknown[]) => void = __DEV__
  ? (...args: unknown[]) => console.log('[kcal]', ...args)
  : () => {};

// --- State + Reducer ---

export interface WorkoutMetricsState {
  seconds: number;
  watts: number;
  spm: number;
  splitSeconds: number;
  distanceMeters: number;
  calories: number;
  resistanceLevel: number | null;
  // Gesmoothe huidige waarden (EMA) — enkel voor live weergave. De rauwe
  // watts/spm/splitSeconds hierboven blijven de bron voor opslag/accumulatie.
  wattsSmoothed: number;
  spmSmoothed: number;
  splitSmoothed: number;
}

type MetricsAction =
  | { type: 'BLE_UPDATE'; metrics: Partial<WorkoutMetricsState> }
  | { type: 'RESET' };

const initialState: WorkoutMetricsState = {
  seconds: 0,
  watts: 0,
  spm: 0,
  splitSeconds: 0,
  distanceMeters: 0,
  calories: 0,
  resistanceLevel: null,
  wattsSmoothed: 0,
  spmSmoothed: 0,
  // Oneindig = "geen tempo" → `formatSplit` toont "—". Vóór de eerste haal is een
  // split net zo ongedefinieerd als tijdens een rustpauze; 0 zou "oneindig snel" zijn.
  splitSmoothed: Infinity,
};

function metricsReducer(state: WorkoutMetricsState, action: MetricsAction): WorkoutMetricsState {
  switch (action.type) {
    case 'BLE_UPDATE':
      return { ...state, ...action.metrics };
    case 'RESET':
      return initialState;
  }
}

/** Wat de consumenten van deze hook uitlezen: het optel-werk van de lopende rit. */
export type SessionRef = React.MutableRefObject<Session>;

// --- Hook ---

type Phase = 'idle' | 'active' | 'summary';

/**
 * De live metingen van een rit.
 *
 * Het rekenwerk zit sinds 2026-09-16 in `lib/sessionAccumulator.ts` en niet meer hier. Deze
 * hook doet nog drie dingen: hij haalt het profielgewicht op, hij beslist wélke pakketten de
 * accumulator in gaan, en hij duwt de live-waarden naar de reducer.
 *
 * Die tweede is de kern van F7. Dit effect draait óók op een hartslag-update — `hrBpm` zit in
 * de dependency-array omdat de hartslag bemonsterd moet worden — en dan is `bleMetrics`
 * dezelfde gemergede referentie als daarvoor. Alleen de EMA was daartegen beschermd; de sommen
 * telden het laatste roeipakket opnieuw mee. De referentievergelijking staat nu vóór álle
 * accumulatie, dus een pakket telt precies één keer.
 */
export function useWorkoutMetrics(
  phase: Phase,
  bleMetrics: RowerMetrics | null,
  hrBpm?: number | null,
  /**
   * Mag de hartslag verzameld worden? Zonder toestemming komt hij deze hook niet eens in —
   * ook niet de hartslag die de roeitrainer zélf meestuurt, waar geen borstband en dus geen
   * knop aan te pas komt. De filter bij het opslaan blijft als tweede grendel staan.
   */
  collectHr: boolean = true,
) {
  const [state, dispatch] = useReducer(metricsReducer, initialState);

  const session = useRef<Session>(createSession());
  const weightKgRef = useRef<number | null>(null);

  /**
   * De laatst verwerkte pakket-referentie. Dit effect her-draait ook op een hartslag-update,
   * en dan is `bleMetrics` hetzelfde object — verwerken zou het dubbel tellen.
   */
  const lastProcessedMetricsRef = useRef<RowerMetrics | null>(null);

  /**
   * De laatste hartslag, als ref en niet uit de closure. De accumulator bemonstert hem op de
   * cadans van de roeipakketten; een band die doorstuurt terwijl er niet geroeid wordt, hoort
   * geen extra metingen op te leveren.
   */
  const hrRef = useRef<number | null>(null);
  hrRef.current = hrBpm ?? null;

  // --- Load profile weight ---
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('weight_kg')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) log('profile weight fetch failed, using default:', error.message);
        weightKgRef.current = data?.weight_kg ?? null;
      });
  }, [user]);

  // --- BLE metrics effect ---
  useEffect(() => {
    if (phase !== 'active' || !bleMetrics) return;
    // Eén pakket, één stap. Zie de kop: dit is de poort van F7, en hij staat bewust vóór alles.
    if (bleMetrics === lastProcessedMetricsRef.current) return;
    lastProcessedMetricsRef.current = bleMetrics;

    const live = step(session.current, bleMetrics, hrRef.current, {
      weightKg: weightKgRef.current,
      collectHr,
    });
    if (live.calories != null) {
      log('tick — watts:', session.current.currentWatts, 'weight:', weightKgRef.current, 'total:', live.calories);
    }
    dispatch({ type: 'BLE_UPDATE', metrics: live });
  }, [bleMetrics, phase, hrBpm, collectHr]);

  // --- Reset ---
  const resetAll = useCallback(() => {
    dispatch({ type: 'RESET' });
    // Eén verse sessie in plaats van twintig losse refs terugzetten. Een nieuwe accumulator
    // vergeten te resetten kan zo niet meer: er is er maar één.
    session.current = createSession();
    session.current.startedAt = new Date();
    lastProcessedMetricsRef.current = null;
  }, []);

  return { state, session, resetAll, hasProfileWeight: weightKgRef.current !== null };
}
