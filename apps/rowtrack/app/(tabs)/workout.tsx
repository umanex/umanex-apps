import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useBle } from '@/lib/ble/ble-context';
import { useHealthConsent } from '@/lib/health-consent-context';
import { useWorkoutPhase } from '@/lib/workout-phase-context';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { enqueueWorkout, removeQueued, UNIQUE_VIOLATION, type PendingWorkout } from '@/lib/pendingWorkout';
import { markPrMetricsMissing } from '@/lib/prColumn';
/** Postgres: kolom bestaat niet. Zie de fallback in syncWorkout. */
const UNDEFINED_COLUMN = '42703';
import type { GoalType, WorkoutGoal } from '@/lib/workout-goals';
import { userInputToTarget } from '@/lib/workout-goals';
import { useWorkoutMetrics } from '@/lib/hooks/useWorkoutMetrics';
import { useGoalProgress } from '@/lib/hooks/useGoalProgress';
import { isWorthSaving } from '@/lib/storableWorkout';
import { buildWorkoutRow } from '@/lib/workoutRow';
import { mean } from '@/lib/sessionAccumulator';
import { type PrEntry } from '@/lib/personalRecords';
import { IdlePhase } from '@/components/workout/IdlePhase';
import { ActivePhase } from '@/components/workout/ActivePhase';
import { t } from '@/i18n';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function WorkoutScreen() {
  const { user } = useAuth();
  const {
    status, deviceName, metrics: bleMetrics, error: bleError, startScan, disconnect,
    hrStatus, hrDeviceName, hrBpm, hrError, startHRScan, stopHR,
    devices, picking, selectDevice, cancelSelection, autoConnect,
  } = useBle();
  const { granted: healthGranted } = useHealthConsent();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // --- Core state ---
  const { phase, setPhase } = useWorkoutPhase();
  const [goal, setGoal] = useState<WorkoutGoal | null>(null);

  // Idle goal setup state
  const [idleGoalType, setIdleGoalType] = useState<GoalType | null>(null);
  const [idleGoalInput, setIdleGoalInput] = useState('');
  const [idleDurMin, setIdleDurMin] = useState('');
  const [idleDurSec, setIdleDurSec] = useState('');

  // --- Hooks ---
  const { state: metricsState, session, resetAll, hasProfileWeight } = useWorkoutMetrics(phase, bleMetrics, hrBpm, healthGranted);
  const {
    toastMsg, splits, goalReached,
    avgWatts, avgSpm, avgSplit,
    dismissToast, fetchPRs, resetGameState, prBaseline,
  } = useGoalProgress(phase, goal, metricsState, session, user?.id);

  /**
   * De records die déze rit gebroken heeft, met de waarde die ze verving. Wordt één keer
   * gevuld bij het opslaan — uit de eindwaarden, niet uit een lopend gemiddelde — en
   * voedt zowel de samenvatting als `workouts.pr_metrics`.
   */
  const [prEntries, setPrEntries] = useState<PrEntry[]>([]);

  // Einde-van-rit guards: rit exact één keer opslaan, doel-einde exact één keer afhandelen.
  const savedRef = useRef(false);
  const goalEndedRef = useRef(false);

  // Hier stond een effect dat `goal` terugschreef naar de vier idle-velden. Het was een
  // no-op-lus: `handleStart` bouwt `goal` uit exact die velden, dus het effect schreef er
  // altijd dezelfde waarden in terug. Wél was het een dérde schrijver op de staat waarvan
  // F2 vraagt dat er precies één bron is — picker, chips en Start lezen nu alle drie deze
  // vier velden, en alleen de gebruiker verandert ze.

  // --- Handlers ---

  const handleStart = useCallback(() => {
    if (status !== 'connected') {
      Alert.alert(t.workout.notConnectedTitle, t.workout.notConnectedBody);
      return;
    }

    // Build goal from idle inputs
    let newGoal: WorkoutGoal | null = null;
    if (idleGoalType === 'duration') {
      const target = (parseInt(idleDurMin || '0', 10) * 60) + parseInt(idleDurSec || '0', 10);
      if (target > 0) newGoal = { type: 'duration', target };
    } else if (idleGoalType) {
      const val = parseFloat(idleGoalInput);
      if (!isNaN(val) && val > 0) {
        newGoal = { type: idleGoalType, target: userInputToTarget(idleGoalType, val) };
      }
    }
    setGoal(newGoal);

    resetAll();
    resetGameState();
    setPrEntries([]);
    fetchPRs();
    savedRef.current = false;
    goalEndedRef.current = false;

    // Already connected — no startScan needed
    setPhase('active');
  }, [status, fetchPRs, resetAll, resetGameState, idleGoalType, idleDurMin, idleDurSec, idleGoalInput]);

  /**
   * Legt de rit lokaal vast en probeert hem daarna naar Supabase te schrijven — in die
   * volgorde, en dat is de hele fix van F1.
   *
   * Tot 2026-09-16 ging de insert eerst en werd er pas lokaal bewaard nádat die had gefaald.
   * Tussen "de gebruiker stopt" en "de server antwoordt" bestond er dus geen enkele kopie:
   * sluit de app in dat venster af en de rit is weg. Nu staat hij lokaal vóór er één byte de
   * deur uitgaat.
   *
   * Drie uitkomsten, en alleen de laatste is een probleem voor de gebruiker:
   *  - de insert slaagt (of geeft 23505: hij stond er al) → uit de wachtrij, klaar;
   *  - de insert faalt maar de rit staat lokaal → stil; de volgende home-focus druint hem af;
   *  - de rit staat nérgens → dan pas een melding, want alleen dan is er iets te verliezen
   *    en kan de gebruiker er iets aan doen.
   */
  const syncWorkout = useCallback(async (row: PendingWorkout): Promise<void> => {
    const bewaard = await enqueueWorkout(row);

    let { error } = await supabase.from('workouts').insert(row);

    // Overgangsmaatregel, bewust een patch: `pr_metrics` komt via een handmatige migratie
    // (supabase/migrations/add_workout_pr_metrics.sql). Draait deze app-versie vóór die
    // migratie, dan zou een ontbrekende kolom een échte rit kosten — en de reden van een
    // record weegt niet op tegen de rit zelf. Weg zodra de migratie overal gedraaid is.
    if (error?.code === UNDEFINED_COLUMN) {
      markPrMetricsMissing();
      const { pr_metrics: _pending, ...rowWithoutPrMetrics } = row;
      ({ error } = await supabase.from('workouts').insert(rowWithoutPrMetrics));
      // Alleen melden wanneer de tweede poging slaagde: bij een échte fout rapporteert de
      // tak hieronder al, en twee meldingen over hetzelfde voorval lezen als twee fouten.
      if (!error) {
        reportError(new Error('workouts.pr_metrics ontbreekt — rit opgeslagen zonder PR-detail'), {
          where: 'workout.save.prMetricsFallback',
        });
      }
    }

    if (!error || error.code === UNIQUE_VIOLATION) {
      // Identiteits-gebonden: raakt alleen de sleutel van déze rit, zodat een andere rit die
      // nog op een nieuwe poging wacht blijft staan.
      await removeQueued(row);
      return;
    }

    reportError(error, { where: 'workout.save' });
    if (bewaard) return;

    // Niets op de server én niets op het toestel. Dit is de enige uitkomst waar een melding
    // op zijn plaats is; een rit die netjes in de wachtrij staat is geen fout maar gewoon
    // offline zijn, en daar hoort geen alarm bij.
    Alert.alert(t.workout.saveFailedTitle, t.workout.saveFailedBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.common.retry, onPress: () => { void syncWorkout(row); } },
    ]);
  }, []);

  // Slaat de rit op de achtergrond op — exact één keer (savedRef). Een lege rit wordt
  // overgeslagen.
  //
  // TWEE GUARDS, want de eerste meet niet wat hij lijkt te meten. `tickCount` telt ELK
  // binnengekomen pakket, ook een dat alleen hartslag draagt — en een hartslagband stuurt
  // door terwijl er niet geroeid wordt. Gemeten: de rit van 2026-08-22 12:40:57 stond met
  // 0 m, 0 s en één sample in de historiek, mét `avg_heart_rate` 90. Die kwam dus langs de
  // tick-guard heen. De tweede guard toetst waar een rit werkelijk uit bestaat: afstand én
  // duur. Geen van beide is een verzonnen drempel — bij nul is er letterlijk niets te tonen,
  // elke KPI op zo'n rit leest 0 of "—" en hij telt wél mee in de periodetotalen.
  const saveWorkout = useCallback(async () => {
    if (!user) return;
    if (savedRef.current) return;
    if (session.current.packets === 0) return;
    if (!isWorthSaving(metricsState.distanceMeters, metricsState.seconds)) {
      // savedRef tóch zetten: de beslissing is genomen, en een retry zou hem herhalen.
      savedRef.current = true;
      return;
    }
    savedRef.current = true;

    // De rij wordt ÉÉN keer gebouwd en vastgehouden. Dat is geen optimalisatie: `started_at`
    // valt terug op `new Date()` wanneer de starttijd ontbreekt, en die terugval per poging
    // opnieuw uitvoeren zou de identiteit van de rit elke keer veranderen — precies de sleutel
    // waarop de wachtrij hem bewaart en waarop de unieke index een dubbele insert herkent.
    const s = session.current;
    const { row, prEntries: entries } = buildWorkoutRow({
      userId: user.id,
      startedAt: s.startedAt?.toISOString() ?? new Date().toISOString(),
      seconds: metricsState.seconds,
      distanceMeters: metricsState.distanceMeters,
      calories: metricsState.calories,
      resistanceLevel: metricsState.resistanceLevel,
      ticks: s.packets,
      // Elke som draagt zijn eigen teller: som en noemer zijn één object, dus delen door een
      // vreemde teller kan niet meer.
      watts: s.watts,
      spm: s.spm,
      split: s.split,
      heartRate: s.heartRate,
      maxWatts: s.maxWatts,
      maxSpm: s.maxSpm,
      maxHeartRate: s.maxHeartRate,
      bestSplit: s.bestSplit,
      totalStrokes: s.totalStrokes,
      samples: s.samples,
      goal,
      goalReached,
      splits,
      healthGranted,
      // De stand van vóór deze rit (opgehaald bij de start), dus een record meet zich nooit
      // tegen zichzelf.
      prBaseline: prBaseline.current,
    });

    setPrEntries(entries);
    await syncWorkout(row);
  }, [user, metricsState, goal, goalReached, splits, session, prBaseline, healthGranted, syncWorkout]);

  // Bij het openen van dit scherm verbinden met de toestellen van vorige keer.
  // Alleen in de idle-fase: tijdens een rit staat er al een verbinding, en op de
  // samenvatting hoort de app niets meer te zoeken. Bewust hier en niet bij
  // app-start — dan zou de app ook Bluetooth doen als je enkel je historiek bekijkt.
  useFocusEffect(
    useCallback(() => {
      // Op de samenvatting hoort de app niets meer te zoeken.
      if (phase === 'summary') return;
      // Zonder toestemming blijft de hartslagmeter buiten beeld — ook hier, niet
      // alleen achter de knop.
      if (phase === 'idle') autoConnect({ hr: healthGranted });

      // Terugkeren uit een andere app is het tweede moment waarop een toestel weg
      // kan zijn — en daar kwam niets langs dat het merkte: `useFocusEffect` vuurt
      // niet op een app-wissel, dus een verbinding die tijdens het wegkijken sneuvelde
      // bleef de rest van de rit weg. Bewust óók in de active-fase: juist dán kijk je
      // even weg. `autoConnect` slaat alles over wat al hangt, bezig is of door de
      // gebruiker zelf verbroken werd, dus in het normale geval kost dit niets.
      const sub = AppState.addEventListener('change', (next) => {
        if (next !== 'active') return;
        autoConnect({ hr: healthGranted });
      });
      return () => sub.remove();
    }, [phase, autoConnect, healthGranted]),
  );

  // Handmatig stoppen → rit opslaan (achtergrond) + BLE stoppen + naar de samenvatting.
  const handleStop = useCallback(() => {
    saveWorkout();
    // `auto`: het einde van een rit is geen keuze om niet meer te verbinden, dus
    // autoconnect blijft voor de volgende sessie gewoon aan staan.
    disconnect({ auto: true });
    stopHR({ auto: true });
    setPhase('summary');
  }, [saveWorkout, disconnect, stopHR]);

  // Samenvatting "Ga verder" → naar huis (de rit is al op de achtergrond opgeslagen).
  const handleContinue = useCallback(() => {
    setPhase('idle');
    router.replace('/(tabs)');
  }, [router]);

  // Celebration "Ga verder" → naar de samenvatting (rit al opgeslagen + BLE al gestopt).
  const handleCelebrationContinue = useCallback(() => {
    dismissToast();
    setPhase('summary');
  }, [dismissToast]);

  // Doel bereikt → rit meteen op de achtergrond opslaan + BLE stoppen (net als een
  // handmatige stop). De celebration (toastMsg uit useGoalProgress) verschijnt; "Ga
  // verder" leidt naar de samenvatting. Exact één keer via goalEndedRef.
  useEffect(() => {
    if (phase === 'active' && goalReached && !goalEndedRef.current) {
      goalEndedRef.current = true;
      saveWorkout();
      disconnect({ auto: true });
      // Ook de hartslagmeter loslaten, symmetrisch met de roeier. Bleef die hangen,
      // dan adverteerde de band niet meer en was hij bij de volgende rit onvindbaar
      // — de app hield zelf vast wat ze daarna zocht.
      stopHR({ auto: true });
    }
  }, [phase, goalReached, saveWorkout, disconnect, stopHR]);

  // --- Summary computed values ---
  const summary = session.current;
  const summaryMaxWatts = summary.maxWatts > 0 ? summary.maxWatts : null;
  const summaryBestSplit = Number.isFinite(summary.bestSplit) ? Math.round(summary.bestSplit) : null;
  const summaryAvgHrRaw = mean(summary.heartRate);
  const summaryAvgHr = summaryAvgHrRaw != null ? Math.round(summaryAvgHrRaw) : null;
  const summaryMaxSpm = summary.maxSpm > 0 ? Math.round(summary.maxSpm) : null;
  const summaryMaxHr = summary.maxHeartRate > 0 ? summary.maxHeartRate : null;
  const summaryTotalStrokes = summary.totalStrokes > 0 ? summary.totalStrokes : null;

  // --- Render ---

  if (phase === 'idle') {
    return (
      <IdlePhase
        bleStatus={status}
        deviceName={deviceName}
        onConnect={startScan}
        onDisconnect={disconnect}
        hrStatus={hrStatus}
        hrDeviceName={hrDeviceName}
        hrError={hrError}
        onHRConnect={startHRScan}
        onHRDisconnect={stopHR}
        devices={devices}
        picking={picking}
        onSelectDevice={selectDevice}
        onCancelSelection={cancelSelection}
        idleGoalType={idleGoalType}
        setIdleGoalType={setIdleGoalType}
        idleGoalInput={idleGoalInput}
        setIdleGoalInput={setIdleGoalInput}
        idleDurMin={idleDurMin}
        setIdleDurMin={setIdleDurMin}
        idleDurSec={idleDurSec}
        setIdleDurSec={setIdleDurSec}
        onStart={handleStart}
        insets={insets}
      />
    );
  }

  return (
    <ActivePhase
      phase={phase}
      metricsState={metricsState}
      bleStatus={status}
      deviceName={deviceName}
      bleError={bleError}
      startScan={startScan}
      goal={goal}
      toastMsg={toastMsg}
      splits={splits}
      prEntries={prEntries}
      avgWatts={avgWatts}
      avgSpm={avgSpm}
      avgSplit={avgSplit}
      summaryMaxWatts={summaryMaxWatts}
      summaryBestSplit={summaryBestSplit}
      summaryAvgHr={summaryAvgHr}
      summaryMaxSpm={summaryMaxSpm}
      summaryMaxHr={summaryMaxHr}
      summaryTotalStrokes={summaryTotalStrokes}
      onStop={handleStop}
      onContinue={handleContinue}
      onGoalContinue={handleCelebrationContinue}
      hasProfileWeight={hasProfileWeight}
      hrStatus={hrStatus}
      hrBpm={hrBpm}
      startHRScan={startHRScan}
      healthGranted={healthGranted}
      insets={insets}
    />
  );
}
