// app/dev-active.tsx
//
// __DEV__-only preview van het active-workout scherm met mock-data. De active
// fase blokkeert normaal op de BLE-connect-gate (isConnecting), dus zonder
// verbonden erg is ze niet te zien op de simulator. Dit pad rendert ActivePhase
// met bleStatus:'connected' + fake metrics, zodat alle vijf de doeltype-hero-
// varianten + KPI's op de sim te verifiëren zijn zonder hardware.
//
// Gebruik:
//   - deep-link per variant (schone screenshot): rowtrack://dev-active?goal=duration
//     (goal = none | duration | distance | split | watts)
//   - of interactief: de switcher-balk onderaan.
// Niet in een tab-group; in productie rendert het niets.
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivePhase } from '@/components/workout/ActivePhase';
import { allowAllOrientations, lockPortrait } from '@/lib/orientation';
import { accent, bg, fg } from '@/constants';
import type { WorkoutGoal } from '@/lib/workout-goals';
import type { WorkoutMetricsState } from '@/lib/hooks/useWorkoutMetrics';
import type { ConnectionStatus } from '@/lib/ble/types';

// ?ble=… → forceer een niet-connected status om de connect-overlay (spinner/error +
// verstreken tijd + Stop-uitgang) zonder hardware te renderen.
// Record over de volledige union: komt er een ConnectionStatus bij, dan breekt de
// build hier — de harness kan dan geen status stil missen.
const BLE_STATUS_SET: Record<ConnectionStatus, true> = {
  idle: true, scanning: true, connecting: true, discovering: true,
  connected: true, reconnecting: true, disconnecting: true, error: true,
};
const BLE_STATUSES = Object.keys(BLE_STATUS_SET) as ConnectionStatus[];

const MOCK_METRICS: WorkoutMetricsState = {
  seconds: 300, // 05:00 verstreken
  watts: 170,
  spm: 38,
  splitSeconds: 140, // 2:20/500m
  distanceMeters: 2500,
  calories: 48,
  resistanceLevel: null,
  // Gesmoothe huidige waarden (EMA) — de KPI-lijst + split/watts-hero tonen deze.
  wattsSmoothed: 170,
  spmSmoothed: 38,
  splitSmoothed: 140, // 2:20/500m
};

const VARIANTS: { key: string; label: string; goal: WorkoutGoal | null }[] = [
  { key: 'none', label: 'Geen', goal: null },
  { key: 'duration', label: 'Duur', goal: { type: 'duration', target: 1200 } }, // 20 min
  { key: 'distance', label: 'Afstand', goal: { type: 'distance', target: 10000 } }, // 10 km
  { key: 'split', label: 'Split', goal: { type: 'split', target: 140 } }, // 2:20/500m
  { key: 'watts', label: 'Watt', goal: { type: 'watts', target: 180 } },
];

export default function DevActivePreview() {
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;
  const params = useLocalSearchParams<{ goal?: string; toast?: string; summary?: string; ble?: string }>();

  // Sta landscape toe in de harness (active-workout is landscape-capable), zodat de
  // landscape-layouts + celebration hier te verifiëren zijn. Herstel portrait bij verlaten.
  useEffect(() => {
    allowAllOrientations();
    return () => { lockPortrait(); };
  }, []);

  if (!__DEV__) return null;

  // ?toast=1 → toon de doel-bereikt celebration (MotivationalToast) voor visuele check.
  const toastMsg = params.toast === '1' ? 'Je hebt 20 minuten geroeid. Geweldig gedaan! 💪' : null;

  // Param-gedreven (geen useState): zo schakelt zowel een deep-link (?goal=…)
  // als de switcher (router.setParams) de variant.
  const i = Math.max(0, VARIANTS.findIndex(v => v.key === (params.goal ?? 'duration')));

  // expo-router kan bij herhaalde query-keys een string[] geven — enkel een kale
  // string telt; alles anders valt terug op 'connected'.
  const bleParam = typeof params.ble === 'string' ? params.ble : undefined;
  const bleStatus: ConnectionStatus = BLE_STATUSES.find(s => s === bleParam) ?? 'connected';

  return (
    <View style={styles.root}>
      <ActivePhase
        phase={params.summary === '1' ? 'summary' : 'active'}
        metricsState={MOCK_METRICS}
        bleStatus={bleStatus}
        deviceName="MockErg"
        bleError={bleStatus === 'error' ? 'Verbinding verloren. Probeer opnieuw.' : null}
        startScan={() => {}}
        goal={VARIANTS[i].goal}
        isCountdown={false}
        paceZone={null}
        toastMsg={toastMsg}
        splits={[]}
        prFlags={{ watts: false, split: false, distance: false }}
        hasPR={false}
        pulseAnim={pulse}
        avgWatts={142}
        avgSpm={38}
        avgSplit={140}
        summaryMaxWatts={null}
        summaryBestSplit={null}
        summaryAvgHr={null}
        summaryMaxSpm={null}
        summaryMaxHr={null}
        summaryTotalStrokes={190}
        onStop={() => {}}
        onContinue={() => {}}
        onGoalContinue={() => {}}
        onSetGoal={() => {}}
        onClearGoal={() => {}}
        hasProfileWeight
        hrStatus="connected"
        hrBpm={140}
        startHRScan={() => {}}
        insets={insets}
      />

      {/* Dev-only doeltype-switcher (thin bar, onderaan boven de home-indicator) */}
      <View
        style={[styles.switcher, { paddingBottom: Math.max(insets.bottom, 6) }]}
        pointerEvents="box-none"
      >
        {VARIANTS.map((v, idx) => (
          <Pressable
            key={v.key}
            onPress={() => router.setParams({ goal: v.key })}
            style={[styles.chip, i === idx && styles.chipOn]}
          >
            <Text style={[styles.chipText, i === idx && styles.chipTextOn]}>{v.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: bg.base },
  switcher: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  chipOn: { backgroundColor: accent.default, borderColor: accent.default },
  chipText: { color: fg.secondary, fontSize: 12 },
  chipTextOn: { color: fg.onAccent, fontSize: 12 },
});
