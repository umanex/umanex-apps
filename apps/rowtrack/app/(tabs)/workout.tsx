import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Platform, UIManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { useBle } from '@/lib/ble/ble-context';
import { useWorkoutPhase } from '@/lib/workout-phase-context';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { savePendingWorkout, clearPendingWorkout } from '@/lib/pendingWorkout';
import type { GoalType, WorkoutGoal } from '@/lib/workout-goals';
import { userInputToTarget, targetToUserInput } from '@/lib/workout-goals';
import { useWorkoutMetrics } from '@/lib/hooks/useWorkoutMetrics';
import { useGoalProgress } from '@/lib/hooks/useGoalProgress';
import { bestTimeForDistance } from '@/lib/bestDistanceTime';
import { IdlePhase } from '@/components/workout/IdlePhase';
import { ActivePhase } from '@/components/workout/ActivePhase';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export default function WorkoutScreen() {
  const { user } = useAuth();
  const {
    status, deviceName, metrics: bleMetrics, error: bleError, startScan, disconnect,
    hrStatus, hrDeviceName, hrBpm, startHRScan, stopHR,
    hrDevices, hrSelecting, selectHRDevice, cancelHRSelection,
  } = useBle();
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
  const { state: metricsState, refs, resetAll, hasProfileWeight } = useWorkoutMetrics(phase, bleMetrics, hrBpm);
  const {
    toastMsg, splits, goalReached, prFlags, pulseAnim,
    avgWatts, avgSpm, avgSplit, isCountdown, paceZone, hasPR,
    dismissToast, fetchPRs, resetGameState, resetGoalReached,
  } = useGoalProgress(phase, goal, metricsState, refs, user?.id);

  // Einde-van-rit guards: rit exact één keer opslaan, doel-einde exact één keer afhandelen.
  const savedRef = useRef(false);
  const goalEndedRef = useRef(false);

  // --- Sync idle goal inputs from goal state ---
  useEffect(() => {
    if (goal) {
      setIdleGoalType(goal.type);
      if (goal.type === 'duration') {
        setIdleDurMin(String(Math.floor(goal.target / 60)));
        setIdleDurSec(String(goal.target % 60));
      } else {
        setIdleGoalInput(String(targetToUserInput(goal.type, goal.target)));
      }
    }
  }, [goal]);

  // --- Handlers ---

  const handleStart = useCallback(() => {
    if (status !== 'connected') {
      Alert.alert('Niet verbonden', 'Verbind eerst de roeitrainer via de knop bovenaan.');
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
    fetchPRs();
    savedRef.current = false;
    goalEndedRef.current = false;

    // Already connected — no startScan needed
    setPhase('active');
  }, [status, fetchPRs, resetAll, resetGameState, idleGoalType, idleDurMin, idleDurSec, idleGoalInput]);

  // Slaat de rit op de achtergrond op — exact één keer (savedRef). Een lege rit (geen
  // tick-data) wordt overgeslagen. Bij netwerkfout vangt de pendingWorkout-backstop +
  // home-focus-retry het op (security-audit P2-4); géén alert, want dit draait op de
  // achtergrond terwijl de gebruiker al richting de samenvatting is.
  const saveWorkout = useCallback(async () => {
    if (!user) return;
    if (savedRef.current) return;
    if (refs.tickCount.current === 0) return;
    savedRef.current = true;

    const t = refs.tickCount.current;
    const avgW = Math.round(refs.wattsSum.current / t);

    // Exacte beste 2000m uit de {tijd, afstand}-tijdreeks (two-pointer + interpolatie).
    // null wanneer de sessie < 2000m was. Samples compact als [t, d]-tuples opgeslagen.
    const samples = refs.samplesRef.current;
    const best2k = bestTimeForDistance(samples, 2000);
    const sampleTuples = samples.length > 0
      ? samples.map((s) => (s.hr != null ? [s.t, s.d, s.hr] : [s.t, s.d]))
      : null;

    const row = {
      user_id: user.id,
      started_at: refs.startedAtRef.current?.toISOString() ?? new Date().toISOString(),
      // Alle waardes die in integer-kolommen landen worden afgerond — de rauwe
      // BLE-/max-waardes kunnen floats zijn (bv. max_spm 45.5) en Postgres weigert
      // die anders ("invalid input syntax for type integer").
      duration_seconds: Math.round(metricsState.seconds),
      distance_meters: Math.round(metricsState.distanceMeters),
      avg_watts: avgW,
      avg_spm: Math.round(refs.spmSum.current / t),
      avg_split_seconds: refs.splitTickCount.current > 0
        ? Math.round(refs.splitSum.current / refs.splitTickCount.current)
        : null,
      calories: Math.round(metricsState.calories),
      max_watts: refs.maxWattsRef.current > 0 ? Math.round(refs.maxWattsRef.current) : null,
      max_spm: refs.maxSpmRef.current > 0 ? Math.round(refs.maxSpmRef.current) : null,
      best_split: refs.bestSplitRef.current < Infinity ? Math.round(refs.bestSplitRef.current) : null,
      avg_heart_rate: refs.heartRateCount.current > 0
        ? Math.round(refs.heartRateSum.current / refs.heartRateCount.current)
        : null,
      max_heart_rate: refs.maxHeartRateRef.current > 0 ? Math.round(refs.maxHeartRateRef.current) : null,
      resistance_level: metricsState.resistanceLevel != null ? Math.round(metricsState.resistanceLevel) : null,
      goal_type: goal?.type ?? null,
      goal_target: goal?.target ?? null,
      goal_reached: goal ? goalReached : null,
      splits: splits.length > 0 ? splits : null,
      is_pr: hasPR || null,
      samples: sampleTuples,
      best_2k_seconds: best2k,
      total_strokes: refs.totalStrokesRef.current > 0 ? refs.totalStrokesRef.current : null,
    };

    const { error } = await supabase.from('workouts').insert(row);
    if (error) {
      await savePendingWorkout(row);
      reportError(error, { where: 'workout.save' });
    } else {
      await clearPendingWorkout();
    }
  }, [user, metricsState, goal, goalReached, splits, refs, hasPR]);

  // Handmatig stoppen → rit opslaan (achtergrond) + BLE stoppen + naar de samenvatting.
  const handleStop = useCallback(() => {
    saveWorkout();
    disconnect();
    setPhase('summary');
  }, [saveWorkout, disconnect]);

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
      disconnect();
    }
  }, [phase, goalReached, saveWorkout, disconnect]);

  const handleSetGoal = useCallback((g: WorkoutGoal) => {
    setGoal(g);
    resetGoalReached();
  }, [resetGoalReached]);

  const handleClearGoal = useCallback(() => {
    setGoal(null);
    resetGoalReached();
  }, [resetGoalReached]);

  // --- Summary computed values ---
  const summaryMaxWatts = refs.maxWattsRef.current > 0 ? refs.maxWattsRef.current : null;
  const summaryBestSplit = refs.bestSplitRef.current < Infinity ? Math.round(refs.bestSplitRef.current) : null;
  const summaryAvgHr = refs.heartRateCount.current > 0
    ? Math.round(refs.heartRateSum.current / refs.heartRateCount.current)
    : null;
  const summaryMaxSpm = refs.maxSpmRef.current > 0 ? Math.round(refs.maxSpmRef.current) : null;
  const summaryMaxHr = refs.maxHeartRateRef.current > 0 ? refs.maxHeartRateRef.current : null;
  const summaryTotalStrokes = refs.totalStrokesRef.current > 0 ? refs.totalStrokesRef.current : null;

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
        onHRConnect={startHRScan}
        onHRDisconnect={stopHR}
        hrDevices={hrDevices}
        hrSelecting={hrSelecting}
        onSelectHRDevice={selectHRDevice}
        onCancelHRSelection={cancelHRSelection}
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
      isCountdown={isCountdown}
      paceZone={paceZone}
      toastMsg={toastMsg}
      splits={splits}
      prFlags={prFlags}
      hasPR={hasPR}
      pulseAnim={pulseAnim}
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
      onSetGoal={handleSetGoal}
      onClearGoal={handleClearGoal}
      hasProfileWeight={hasProfileWeight}
      hrStatus={hrStatus}
      hrBpm={hrBpm}
      startHRScan={startHRScan}
      insets={insets}
    />
  );
}
