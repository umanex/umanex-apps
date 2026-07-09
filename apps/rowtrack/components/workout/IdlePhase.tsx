import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  LayoutAnimation,
  Modal,
  FlatList,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ConnectionStatus, HRFoundDevice, HRStatus } from '@/lib/ble/types';
import type { GoalType } from '@/lib/workout-goals';
import { NUDGE_STEP_IDX, NUDGE_LABEL, goalTargetToWheelIndex } from '@/lib/workout-goals';
import {
  BleStatusBar,
  Button,
  HrStatusBar,
  GoalSegments,
  Chip,
  WheelPicker,
} from '@/components';
import type { GoalSegmentType } from '@/components';
import {
  buildDurItems,
  buildDistItems,
  buildSplitItems,
  buildWattItems,
} from '@/lib/formatters';
import {
  bg,
  fg,
  accent,
  border,
  status,
  typeStyles,
  fontFamily,
  fontSize,
  radii,
  componentRadius,
} from '@/constants';
import { useAuth } from '@/lib/auth-context';
import { useRecentGoals } from '@/lib/hooks/useRecentGoals';

// Spring LayoutAnimation used for segment transitions and goal mode changes
const LAYOUT_SPRING: Parameters<typeof LayoutAnimation.configureNext>[0] = {
  duration: 320,
  create: {
    duration: 180,
    type: LayoutAnimation.Types.spring,
    springDamping: 0.78,
    property: LayoutAnimation.Properties.opacity,
  },
  update: {
    duration: 320,
    type: LayoutAnimation.Types.spring,
    springDamping: 0.78,
  },
  delete: {
    duration: 100,
    type: LayoutAnimation.Types.easeOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

// --- Goal type mapping ---

const SEGMENT_TO_GOAL: Record<GoalSegmentType, GoalType | null> = {
  'Geen': null,
  'Duur': 'duration',
  'Afstand': 'distance',
  'Split': 'split',
  'Watt': 'watts',
};

const GOAL_TO_SEGMENT: Record<string, GoalSegmentType> = {
  'duration': 'Duur',
  'distance': 'Afstand',
  'split': 'Split',
  'watts': 'Watt',
};

// --- Default picker indices (spec: 30 min, 5 km, 2:00, 180 W) ---

const DEFAULT_DUR_IDX   = 29;
const DEFAULT_DIST_IDX  = 9;
const DEFAULT_SPLIT_IDX = 30;
const DEFAULT_WATT_IDX  = 26;

// --- NudgeButton ---

type NudgeButtonProps = {
  direction: 'increment' | 'decrement';
  stepLabel: string;
  disabled: boolean;
  onPress: () => void;
  position: 'left' | 'right';
};

function NudgeButton({ direction, stepLabel, disabled, onPress, position }: NudgeButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  function handlePressIn() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      style={[
        nudgeStyles.cell,
        position === 'left' ? nudgeStyles.cellLeft : nudgeStyles.cellRight,
        disabled && nudgeStyles.cellDisabled,
      ]}
    >
      <Animated.View style={[nudgeStyles.inner, { transform: [{ scale }] }]}>
        <Ionicons
          name={direction === 'increment' ? 'add' : 'remove'}
          size={20}
          color={fg.secondary}
        />
        <Text style={nudgeStyles.stepLabel}>{stepLabel}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const nudgeStyles = StyleSheet.create({
  // Cel binnen de samengevoegde nudge-bar: geen eigen rand/radius, enkel een
  // divider op de binnenrand. De buitenste bar levert border + radius.
  cell: {
    width: 64,
    backgroundColor: bg.raised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
  },
  cellLeft: {
    borderRightWidth: 1,
    borderRightColor: border.strong,
  },
  cellRight: {
    borderLeftWidth: 1,
    borderLeftColor: border.strong,
  },
  cellDisabled: {
    opacity: 0.4,
  },
  inner: {
    alignItems: 'center',
    gap: 8,
  },
  stepLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
});

// --- Props ---

type IdlePhaseProps = {
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  bleError: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  onHRConnect: () => void;
  onHRDisconnect: () => void;
  hrDevices: HRFoundDevice[];
  hrSelecting: boolean;
  onSelectHRDevice: (deviceId: string) => void;
  onCancelHRSelection: () => void;
  idleGoalType: GoalType | null;
  setIdleGoalType: (type: GoalType | null) => void;
  idleGoalInput: string;
  setIdleGoalInput: (v: string) => void;
  idleDurMin: string;
  setIdleDurMin: (v: string) => void;
  idleDurSec: string;
  setIdleDurSec: (v: string) => void;
  onStart: () => void;
  insets: EdgeInsets;
}

// --- Signal strength ---

function rssiLabel(rssi: number): { text: string; color: string } {
  if (rssi > -60) return { text: 'Sterk', color: status.success };
  if (rssi >= -80) return { text: 'Goed', color: accent.default };
  return { text: 'Zwak', color: status.error };
}

// --- HR Selection Modal ---

function HRSelectionModal({
  visible,
  devices,
  onSelect,
  onCancel,
}: {
  visible: boolean;
  devices: HRFoundDevice[];
  onSelect: (deviceId: string) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={modalStyles.backdrop}>
        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Kies hartslagmeter</Text>
          <FlatList
            data={devices}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const signal = rssiLabel(item.rssi);
              return (
                <TouchableOpacity onPress={() => onSelect(item.id)} style={modalStyles.deviceRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Ionicons name="heart" size={18} color={accent.default} />
                    <Text style={modalStyles.deviceName}>{item.name}</Text>
                  </View>
                  <Text style={[modalStyles.deviceSignal, { color: signal.color }]}>{signal.text}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity onPress={onCancel} style={modalStyles.cancelBtn}>
            <Text style={modalStyles.cancelText}>Annuleer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: bg.elevated, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 24, paddingBottom: 40, paddingHorizontal: 20 },
  title: { color: fg.primary, fontSize: fontSize['18'], fontFamily: fontFamily.displayBold, marginBottom: 16, textAlign: 'center' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: bg.raised, borderRadius: componentRadius.cardSm, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8 },
  deviceName: { color: fg.primary, fontSize: fontSize['15'], fontFamily: fontFamily.bodyMedium },
  deviceSignal: { fontSize: fontSize['13'], fontFamily: fontFamily.bodyMedium },
  cancelBtn: { marginTop: 8, paddingVertical: 14, borderRadius: componentRadius.cardSm, alignItems: 'center' },
  cancelText: { color: fg.tertiary, fontSize: fontSize['15'], fontFamily: fontFamily.bodySemiBold },
});

// --- Component ---

export function IdlePhase({
  bleStatus,
  deviceName,
  bleError,
  onConnect,
  onDisconnect,
  hrStatus,
  hrDeviceName,
  onHRConnect,
  onHRDisconnect,
  hrDevices,
  hrSelecting,
  onSelectHRDevice,
  onCancelHRSelection,
  idleGoalType,
  setIdleGoalType,
  setIdleGoalInput,
  setIdleDurMin,
  setIdleDurSec,
  onStart,
  insets,
}: IdlePhaseProps) {
  const { user } = useAuth();
  const recents = useRecentGoals(user?.id, idleGoalType);

  const selectedSegment: GoalSegmentType = idleGoalType
    ? GOAL_TO_SEGMENT[idleGoalType] ?? 'Geen'
    : 'Geen';

  const durItems   = useMemo(() => buildDurItems(), []);
  const distItems  = useMemo(() => buildDistItems(), []);
  const splitItems = useMemo(() => buildSplitItems(), []);
  const wattItems  = useMemo(() => buildWattItems(), []);

  const [durIdx,   setDurIdx]   = useState(DEFAULT_DUR_IDX);
  const [distIdx,  setDistIdx]  = useState(DEFAULT_DIST_IDX);
  const [splitIdx, setSplitIdx] = useState(DEFAULT_SPLIT_IDX);
  const [wattIdx,  setWattIdx]  = useState(DEFAULT_WATT_IDX);

  // --- Sync helpers (wheel index → parent goal props) ---

  function syncDur(idx: number) {
    const totalSec = durItems[idx].value;
    setIdleDurMin(String(Math.floor(totalSec / 60)));
    setIdleDurSec(String(totalSec % 60));
  }

  function syncDist(idx: number) {
    setIdleGoalInput(String(distItems[idx].value));
  }

  function syncSplit(idx: number) {
    setIdleGoalInput(String(splitItems[idx].value));
  }

  function syncWatt(idx: number) {
    setIdleGoalInput(String(wattItems[idx].value));
  }

  // --- Mode config (unifies the 4 goal modes) ---

  function getModeConfig(goalType: GoalType) {
    switch (goalType) {
      case 'duration':
        return { items: durItems, idx: durIdx, setIdx: setDurIdx, sync: syncDur,
                 nudgeStep: NUDGE_STEP_IDX.duration, nudgeLabel: NUDGE_LABEL.duration,
                 unit: 'min' as string | null,
                 nudgeDisplayValue: (i: number) => String(Math.round(durItems[i].value / 60)) };
      case 'distance':
        return { items: distItems, idx: distIdx, setIdx: setDistIdx, sync: syncDist,
                 nudgeStep: NUDGE_STEP_IDX.distance, nudgeLabel: NUDGE_LABEL.distance,
                 unit: 'km' as string | null,
                 nudgeDisplayValue: (i: number) => (distItems[i].value / 1000).toFixed(1).replace('.', ',') };
      case 'split':
        return { items: splitItems, idx: splitIdx, setIdx: setSplitIdx, sync: syncSplit,
                 nudgeStep: NUDGE_STEP_IDX.split, nudgeLabel: NUDGE_LABEL.split,
                 unit: '/ 500m' as string | null,
                 nudgeDisplayValue: (i: number) => splitItems[i].label };
      case 'watts':
        return { items: wattItems, idx: wattIdx, setIdx: setWattIdx, sync: syncWatt,
                 nudgeStep: NUDGE_STEP_IDX.watts, nudgeLabel: NUDGE_LABEL.watts,
                 unit: 'W' as string | null,
                 nudgeDisplayValue: (i: number) => String(Math.round(wattItems[i].value)) };
    }
  }

  // --- Segment change ---

  function handleSegmentChange(segment: GoalSegmentType) {
    LayoutAnimation.configureNext(LAYOUT_SPRING);
    const goalType = SEGMENT_TO_GOAL[segment];
    setIdleGoalType(goalType);
    setDurIdx(DEFAULT_DUR_IDX);
    setDistIdx(DEFAULT_DIST_IDX);
    setSplitIdx(DEFAULT_SPLIT_IDX);
    setWattIdx(DEFAULT_WATT_IDX);
    if (goalType === 'duration') {
      syncDur(DEFAULT_DUR_IDX);
      setIdleGoalInput('');
    } else if (goalType === 'distance') {
      syncDist(DEFAULT_DIST_IDX);
      setIdleDurMin('');
      setIdleDurSec('');
    } else if (goalType === 'split') {
      syncSplit(DEFAULT_SPLIT_IDX);
      setIdleDurMin('');
      setIdleDurSec('');
    } else if (goalType === 'watts') {
      syncWatt(DEFAULT_WATT_IDX);
      setIdleDurMin('');
      setIdleDurSec('');
    } else {
      setIdleGoalInput('');
      setIdleDurMin('');
      setIdleDurSec('');
    }
  }

  // --- Goal input rendering ---

  function renderGoalInput() {
    if (selectedSegment === 'Geen') {
      return (
        <Text style={styles.geenText}>
          Vrije training zonder vooraf bepaald doel.
        </Text>
      );
    }

    const goalType = idleGoalType!;
    const { items, idx, setIdx, sync, nudgeStep, nudgeLabel, unit, nudgeDisplayValue } = getModeConfig(goalType);
    const canDecrement = idx >= nudgeStep;
    const canIncrement = idx <= items.length - 1 - nudgeStep;

    function handleNudge(delta: number) {
      const newIdx = Math.max(0, Math.min(idx + delta, items.length - 1));
      if (newIdx !== idx) {
        setIdx(newIdx);
        sync(newIdx);
      }
    }

    return (
      <View style={styles.pickerArea}>
        {/* Nudge row — samengevoegde segmented bar (−/+ delen randen met de waarde) */}
        <View style={styles.nudgeRow}>
          <NudgeButton
            direction="decrement"
            stepLabel={nudgeLabel}
            disabled={!canDecrement}
            onPress={() => handleNudge(-nudgeStep)}
            position="left"
          />
          <View style={styles.nudgeDisplay}>
            <View style={styles.valueRow}>
              <Text style={styles.nudgeValue}>{nudgeDisplayValue(idx)}</Text>
              {unit && <Text style={styles.nudgeUnit}>{unit}</Text>}
            </View>
          </View>
          <NudgeButton
            direction="increment"
            stepLabel={nudgeLabel}
            disabled={!canIncrement}
            onPress={() => handleNudge(nudgeStep)}
            position="right"
          />
        </View>

        {/* Wheel picker */}
        <WheelPicker
          items={items}
          selectedIndex={idx}
          onIndexChange={(newIdx) => {
            setIdx(newIdx);
            sync(newIdx);
          }}
        />

        {/* Recents — hidden when empty */}
        {recents.length > 0 && (
          <View style={styles.recentsSection}>
            <Text style={styles.recentsLabel}>RECENT</Text>
            <View style={styles.chipRow}>
              {(() => {
                const seen = new Set<number>();
                return recents.map((target) => {
                  const chipIdx = goalTargetToWheelIndex(goalType, target);
                  if (chipIdx === null || seen.has(chipIdx)) return null;
                  seen.add(chipIdx);
                  const item = items[chipIdx];
                  const rawUnit = item?.unit;
                  const full = item?.label ?? String(target);
                  const hasUnit = !!rawUnit && full.endsWith(` ${rawUnit}`);
                  const value = hasUnit ? full.slice(0, full.length - rawUnit.length - 1) : full;
                  return (
                    <Chip
                      key={chipIdx}
                      value={value}
                      unit={hasUnit ? rawUnit : undefined}
                      active={chipIdx === idx}
                      onPress={() => {
                        setIdx(chipIdx);
                        sync(chipIdx);
                      }}
                    />
                  );
                });
              })()}
            </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View>
          <Text style={styles.header}>Nieuwe training</Text>
        </View>

        {/* Toestellen */}
        <View style={styles.toestelSection}>
          <Text style={styles.sectionLabel}>TOESTELLEN</Text>
          <View style={styles.barsStack}>
            <BleStatusBar
              bleStatus={bleStatus}
              deviceName={deviceName}
              bleError={bleError}
              onConnect={onConnect}
              onDisconnect={onDisconnect}
            />
            <HrStatusBar
              hrStatus={hrStatus}
              hrDeviceName={hrDeviceName}
              onConnect={onHRConnect}
              onDisconnect={onHRDisconnect}
            />
          </View>
        </View>

        {/* Doel */}
        <View style={styles.doelSection}>
          <View style={styles.doelHeader}>
            <Text style={styles.sectionLabel}>DOEL</Text>
            <GoalSegments selected={selectedSegment} onChange={handleSegmentChange} />
          </View>
          {renderGoalInput()}
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <View style={styles.ctaArea}>
        <Button
          title="Start training"
          variant="primary"
          icon="arrow-forward"
          iconPosition="trailing"
          onPress={onStart}
        />
      </View>

      <HRSelectionModal
        visible={hrSelecting}
        devices={hrDevices}
        onSelect={onSelectHRDevice}
        onCancel={onCancelHRSelection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: bg.base,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 28,
  },

  header: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },

  toestelSection: {
    gap: 8,
  },
  barsStack: {
    gap: 8,
  },
  sectionLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },

  doelSection: {
    gap: 20,
  },
  doelHeader: {
    gap: 8,
  },

  // Geen placeholder
  geenText: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },

  // Goal input area
  pickerArea: {
    gap: 20,
  },

  // Nudge row — één samengevoegde bar (buitenrand + radius; cellen gap 0)
  nudgeRow: {
    flexDirection: 'row',
    height: 64,
    alignItems: 'stretch',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.default,
    overflow: 'hidden',
  },
  nudgeDisplay: {
    flex: 1,
    backgroundColor: bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  nudgeValue: {
    fontFamily: fontFamily.sourceSerifRegular,
    fontSize: fontSize['34'],
    lineHeight: fontSize['34'],
    letterSpacing: -1.02,
    color: fg.primary,
  },
  nudgeUnit: {
    fontFamily: fontFamily.sourceSerifItalic,
    fontSize: fontSize['16'],
    lineHeight: fontSize['16'],
    color: fg.secondary,
  },

  // Recents
  recentsSection: {
    gap: 8,
  },
  recentsLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },

  // CTA
  ctaArea: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
});
