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
import { useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivePhase } from '@/components/workout/ActivePhase';
import { accent, bg, fg } from '@/constants';
import type { WorkoutGoal } from '@/lib/workout-goals';
import type { WorkoutMetricsState } from '@/lib/hooks/useWorkoutMetrics';

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
  const params = useLocalSearchParams<{ goal?: string }>();

  if (!__DEV__) return null;

  // Param-gedreven (geen useState): zo schakelt zowel een deep-link (?goal=…)
  // als de switcher (router.setParams) de variant.
  const i = Math.max(0, VARIANTS.findIndex(v => v.key === (params.goal ?? 'duration')));

  return (
    <View style={styles.root}>
      <ActivePhase
        phase="active"
        metricsState={MOCK_METRICS}
        bleStatus="connected"
        deviceName="MockErg"
        bleError={null}
        startScan={() => {}}
        goal={VARIANTS[i].goal}
        isCountdown={false}
        paceZone={null}
        milestoneMsg={null}
        toastMsg={null}
        dismissMilestone={() => {}}
        dismissToast={() => {}}
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
        onStop={() => {}}
        onSave={() => {}}
        onDiscard={() => {}}
        onSetGoal={() => {}}
        onClearGoal={() => {}}
        saving={false}
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
