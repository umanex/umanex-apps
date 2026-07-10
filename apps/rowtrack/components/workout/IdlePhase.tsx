import { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ConnectionStatus, HRFoundDevice, HRStatus } from '@/lib/ble/types';
import type { GoalType } from '@/lib/workout-goals';
import { buildGoalSuggestions } from '@/lib/workout-goals';
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
  wheelItemParts,
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
  layout,
} from '@/constants';
import { useAuth } from '@/lib/auth-context';
import { useRecentGoals } from '@/lib/hooks/useRecentGoals';

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

const DEFAULT_DUR_IDX   = 5;   // 30 min (step 5 min)
const DEFAULT_DIST_IDX  = 9;   // 5 km
const DEFAULT_SPLIT_IDX = 6;   // 2:00 /500m (step 5 s)
const DEFAULT_WATT_IDX  = 26;  // 180 W

// --- Props ---

type IdlePhaseProps = {
  bleStatus: ConnectionStatus;
  deviceName: string | null;
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
  const { width: screenWidth } = useWindowDimensions();

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

  // A suggestion chip only reads as "active" once the user has actually chosen a
  // value. At the default (untouched) nothing highlights, so landing on any
  // segment looks the same whether or not its default happens to match a chip.
  const [goalTouched, setGoalTouched] = useState(false);

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
        return { items: durItems, idx: durIdx, setIdx: setDurIdx, sync: syncDur };
      case 'distance':
        return { items: distItems, idx: distIdx, setIdx: setDistIdx, sync: syncDist };
      case 'split':
        return { items: splitItems, idx: splitIdx, setIdx: setSplitIdx, sync: syncSplit };
      case 'watts':
        return { items: wattItems, idx: wattIdx, setIdx: setWattIdx, sync: syncWatt };
    }
  }

  // --- Segment change ---

  function handleSegmentChange(segment: GoalSegmentType) {
    const goalType = SEGMENT_TO_GOAL[segment];
    setIdleGoalType(goalType);
    setGoalTouched(false);
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
    const { items, idx, setIdx, sync } = getModeConfig(goalType);
    const suggestions = buildGoalSuggestions(goalType, recents);

    return (
      <View style={styles.pickerArea}>
        {/* Suggestions — always 3 chips (recent picks padded with defaults) */}
        <View style={styles.chipRow}>
          {suggestions.map((chipIdx) => {
            const { value, unit } = wheelItemParts(items[chipIdx]);
            return (
              <Chip
                key={chipIdx}
                value={value}
                unit={unit}
                active={goalTouched && chipIdx === idx}
                onPress={() => {
                  setGoalTouched(true);
                  setIdx(chipIdx);
                  sync(chipIdx);
                }}
              />
            );
          })}
        </View>

        {/* Wheel picker — the only value selector */}
        <WheelPicker
          items={items}
          selectedIndex={idx}
          onIndexChange={(newIdx) => {
            setGoalTouched(true);
            setIdx(newIdx);
            sync(newIdx);
          }}
        />
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
        {/* Fixed top group: header, devices, goal segments */}
        <View style={styles.topGroup}>
          <View>
            <Text style={styles.header}>Nieuwe training</Text>
          </View>

          {/* Toestellen */}
          <View style={styles.toestelSection}>
            <Text style={styles.sectionLabel}>TOESTELLEN</Text>
            <View style={styles.deviceCard}>
              <BleStatusBar
                bleStatus={bleStatus}
                deviceName={deviceName}
                onConnect={onConnect}
                onDisconnect={onDisconnect}
              />
              <View style={styles.deviceDivider} />
              <HrStatusBar
                hrStatus={hrStatus}
                hrDeviceName={hrDeviceName}
                onConnect={onHRConnect}
                onDisconnect={onHRDisconnect}
              />
            </View>
          </View>

          {/* Doel header + segments */}
          <View style={styles.doelHeader}>
            <Text style={styles.sectionLabel}>DOEL</Text>
            {/* Full-bleed: definite screen width so the segments distribute evenly */}
            <View style={{ width: screenWidth, marginLeft: -layout.screenHorizontal }}>
              <GoalSegments selected={selectedSegment} onChange={handleSegmentChange} />
            </View>
          </View>
        </View>

        {/* Picker — vertically centred in the remaining space, responsive to
            height. "Geen" is a static line, so it hugs the top instead. */}
        <View style={[styles.pickerCenter, selectedSegment === 'Geen' && styles.pickerTop]}>
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
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 20, // segments ↔ picker breathing room
  },
  // Natural-height top block; the picker below it fills the rest and centres.
  topGroup: {
    gap: 28,
  },
  // Picker sits in the space between the segments and the CTA, vertically
  // centred and elastic so it adapts to any screen height.
  pickerCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  pickerTop: {
    justifyContent: 'flex-start',
  },

  header: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },

  toestelSection: {
    gap: 8,
  },
  // Grouped device card: one rounded container holding both rows, split by a
  // hairline divider. The rows themselves are transparent (DeviceRow).
  deviceCard: {
    backgroundColor: bg.elevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.default,
    overflow: 'hidden',
  },
  deviceDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
  sectionLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },

  doelHeader: {
    gap: 8,
  },

  // Geen placeholder
  geenText: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },

  // Goal input area — chips then wheel
  pickerArea: {
    gap: 20,
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
