import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ConnectionStatus, FoundDevice, HRStatus } from '@/lib/ble/types';
import { DeviceSelectionModal, type DeviceSelectionKind } from './DeviceSelectionModal';
import type { GoalType } from '@/lib/workout-goals';
import { buildGoalSuggestions, goalTargetToWheelIndex } from '@/lib/workout-goals';
// DIRECTE imports, geen barrel. `@/components` her-exporteert alles, dus één import trok de
// StyleSheet.create van elke component de preview-iframe in — en die sleutels concurreren
// daarna om élke node, want react-native-web deelt zijn atomaire klassen globaal. Vite
// tree-shaket een top-level StyleSheet.create niet weg.
import type { GoalSegmentType } from '@/components/GoalSegments';
import { Chip } from '@/components/Chip';
import { DeviceSection } from './idle/DeviceSection';
import { GoalHeader } from './idle/GoalHeader';
import { StartCta } from './idle/StartCta';
import { WheelPicker } from '@/components/WheelPicker';
import {
  buildDurItems,
  buildDistItems,
  buildSplitItems,
  buildWattItems,
  wheelItemParts,
} from '@/lib/formatters';
import { bg, fg, typeStyles, space } from '@/constants';
import { useAuth } from '@/lib/auth-context';
import { useRecentGoals } from '@/lib/hooks/useRecentGoals';
import { t } from '@/i18n';

// --- Default picker indices (spec: 30 min, 5 km, 2:00, 180 W) ---

const DEFAULT_DUR_IDX   = 5;   // 30 min (step 5 min)
const DEFAULT_DIST_IDX  = 9;   // 5 km
const DEFAULT_SPLIT_IDX = 6;   // 2:00 /500m (step 5 s)
const DEFAULT_WATT_IDX  = 26;  // 180 W

const DEFAULT_IDX: Record<GoalType, number> = {
  duration: DEFAULT_DUR_IDX,
  distance: DEFAULT_DIST_IDX,
  split: DEFAULT_SPLIT_IDX,
  watts: DEFAULT_WATT_IDX,
};

// --- Waarde → wielindex ---

/**
 * De streefwaarde die de ouder vasthoudt, terug naar de index in de wielrij.
 *
 * `null` (leeg veld, onleesbaar getal, nul of buiten bereik) valt terug op de standaardstand
 * van dat doeltype. Dat is geen verdoezeling: een doel van 0 of een waarde die in geen enkele
 * rij voorkomt is geen keuze, en de standaard is dan wat de gebruiker ook ziet.
 */
function wheelIndexFor(type: GoalType, target: number | null): number {
  if (target === null) return DEFAULT_IDX[type];
  return goalTargetToWheelIndex(type, target) ?? DEFAULT_IDX[type];
}

/** De streefwaarde uit het tekstveld, of null wanneer er geen bruikbaar getal in staat. */
function targetFromInput(raw: string): number | null {
  const v = parseFloat(raw);
  return Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * De duur in seconden uit de twee velden. Zelfde rekensom als `handleStart` in
 * `app/(tabs)/workout.tsx` — dat is precies het punt: wat de picker toont en wat Start
 * gebruikt komen uit dezelfde twee getallen.
 */
function targetFromDuration(min: string, sec: string): number | null {
  const total = (parseInt(min || '0', 10) * 60) + parseInt(sec || '0', 10);
  return Number.isFinite(total) && total > 0 ? total : null;
}

// --- Props ---

type IdlePhaseProps = {
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  hrStatus: HRStatus;
  hrDeviceName: string | null;
  hrError: string | null;
  onHRConnect: () => void;
  onHRDisconnect: () => void;
  devices: FoundDevice[];
  picking: DeviceSelectionKind | null;
  onSelectDevice: (deviceId: string) => void;
  onCancelSelection: () => void;
  idleGoalType: GoalType | null;
  setIdleGoalType: (type: GoalType | null) => void;
  /**
   * WAARDE ÉN SETTER, en dat is sinds 2026-09-16 de hele bedoeling.
   *
   * Hier stonden alleen de setters, met het argument dat dit component de waarden nooit
   * terugleest — "ze meegeven suggereert een tweerichtingsband die er niet is". Precies die
   * ontbrekende band was de bug (functionele review F2): de picker hield zijn eigen index in
   * `useState`, dus bij een remount (na een afgeronde training terug naar Training) sprong hij
   * naar 5 km terwijl `app/(tabs)/workout.tsx` de eerder gekozen 10 km nog vasthield en die
   * ook startte. Twee bronnen voor één waarde, en het scherm toonde de verkeerde.
   *
   * Nu bezit de ouder de waarde en leidt dit component zijn wielindex eruit af. De band is er
   * dus wél, en hij hoort er te zijn.
   */
  idleGoalInput: string;
  setIdleGoalInput: (v: string) => void;
  idleDurMin: string;
  setIdleDurMin: (v: string) => void;
  idleDurSec: string;
  setIdleDurSec: (v: string) => void;
  onStart: () => void;
  insets: EdgeInsets;
}


// --- Component ---

export function IdlePhase({
  bleStatus,
  deviceName,
  onConnect,
  onDisconnect,
  hrStatus,
  hrDeviceName,
  hrError,
  onHRConnect,
  onHRDisconnect,
  devices,
  picking,
  onSelectDevice,
  onCancelSelection,
  idleGoalType,
  setIdleGoalType,
  idleGoalInput,
  setIdleGoalInput,
  idleDurMin,
  setIdleDurMin,
  idleDurSec,
  setIdleDurSec,
  onStart,
  insets,
}: IdlePhaseProps) {
  const { user } = useAuth();
  const recents = useRecentGoals(user?.id, idleGoalType);
  // Laatste toesteltype dat koos — de sheet blijft tijdens zijn sluit-animatie in
  // beeld terwijl `picking` al null is.
  const lastPicking = useRef<DeviceSelectionKind>('rower');
  if (picking) lastPicking.current = picking;
  const { width: screenWidth } = useWindowDimensions();

  const selectedSegment: GoalSegmentType = idleGoalType ?? 'none';

  const durItems   = useMemo(() => buildDurItems(), []);
  const distItems  = useMemo(() => buildDistItems(), []);
  const splitItems = useMemo(() => buildSplitItems(), []);
  const wattItems  = useMemo(() => buildWattItems(), []);

  // Afgeleid uit de waarde die de ouder vasthoudt — geen eigen `useState` meer. Dát is de
  // fix voor F2: een tweede kopie van de keuze kan niet meer uit de pas lopen met de eerste.
  const durIdx   = wheelIndexFor('duration', targetFromDuration(idleDurMin, idleDurSec));
  const distIdx  = wheelIndexFor('distance', targetFromInput(idleGoalInput));
  const splitIdx = wheelIndexFor('split',    targetFromInput(idleGoalInput));
  const wattIdx  = wheelIndexFor('watts',    targetFromInput(idleGoalInput));

  // Een suggestie-chip leest pas als "actief" zodra de gebruiker echt een waarde
  // gekozen heeft. Op de standaardstand (onaangeraakt) licht er niets op, zodat elk
  // segment er hetzelfde uitziet ongeacht of zijn default toevallig een chip raakt.
  //
  // Bij het monteren telt een meegekregen waarde die van de standaard afwijkt óók als
  // gekozen: wie vorige keer 10 km reed, krijgt zijn chip terug en niet een doffe rij die
  // doet alsof er niets gekozen is. Alleen de beginwaarde — daarna stuurt de interactie hem.
  const [goalTouched, setGoalTouched] = useState(() => {
    if (!idleGoalType) return false;
    const idx = { duration: durIdx, distance: distIdx, split: splitIdx, watts: wattIdx }[idleGoalType];
    return idx !== DEFAULT_IDX[idleGoalType];
  });

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

  // --- Modus-config (brengt de vier doeltypes onder één vorm) ---

  function getModeConfig(goalType: GoalType) {
    switch (goalType) {
      case 'duration':
        return { items: durItems, idx: durIdx, sync: syncDur };
      case 'distance':
        return { items: distItems, idx: distIdx, sync: syncDist };
      case 'split':
        return { items: splitItems, idx: splitIdx, sync: syncSplit };
      case 'watts':
        return { items: wattItems, idx: wattIdx, sync: syncWatt };
    }
  }

  // --- Segment change ---

  function handleSegmentChange(segment: GoalSegmentType) {
    const goalType: GoalType | null = segment === 'none' ? null : segment;
    setIdleGoalType(goalType);
    setGoalTouched(false);
    // De indices volgen de waarden, dus resetten gebeurt door de standaardwaarde wég te
    // schrijven — hieronder. Dat moet ook: `idleGoalInput` is één veld voor afstand, split
    // én watt, dus een achtergebleven 5000 zou onder "Watt" een onzinnige stand geven.
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
    if (selectedSegment === 'none') {
      return (
        <Text style={styles.geenText}>
          {t.workout.idle.freeTraining}
        </Text>
      );
    }

    const goalType = idleGoalType!;
    const { items, idx, sync } = getModeConfig(goalType);
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
                  sync(chipIdx);
                }}
              />
            );
          })}
        </View>

        {/* Wheel picker — centred in the space below the chips so the selected
            value (pill) reads as the vertical anchor between chips and CTA. */}
        <View style={styles.wheelWrap}>
          <WheelPicker
            items={items}
            selectedIndex={idx}
            onIndexChange={(newIdx) => {
              setGoalTouched(true);
              sync(newIdx);
            }}
          />
        </View>
      </View>
    );
  }

  return (
    <View testID="IdlePhase" style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Fixed top group: header, devices, goal segments */}
        <View style={styles.topGroup}>
          <View>
            <Text style={styles.header}>{t.workout.idle.title}</Text>
          </View>

          {/* Toestellen */}
          <DeviceSection
            bleStatus={bleStatus}
            deviceName={deviceName}
            onConnect={onConnect}
            onDisconnect={onDisconnect}
            hrStatus={hrStatus}
            hrDeviceName={hrDeviceName}
            hrError={hrError}
            onHRConnect={onHRConnect}
            onHRDisconnect={onHRDisconnect}
          />

          {/* Doel header + segments */}
          <GoalHeader
            selectedSegment={selectedSegment}
            onChange={handleSegmentChange}
            screenWidth={screenWidth}
          />
        </View>

        {/* Picker — vertically centred in the remaining space, responsive to
            height. "Geen" is a static line, so it hugs the top instead. */}
        <View style={[styles.pickerCenter, selectedSegment === 'none' && styles.pickerTop]}>
          {renderGoalInput()}
        </View>
      </ScrollView>

      {/* Fixed CTA */}
      <StartCta onStart={onStart} />

      <DeviceSelectionModal
        visible={picking !== null}
        // Tijdens het wegschuiven is `picking` al null terwijl de sheet nog in beeld
        // is; zonder het laatste type te onthouden flitst de titel dan naar die van
        // het andere toestel.
        kind={picking ?? lastPicking.current}
        devices={devices}
        onSelect={onSelectDevice}
        onCancel={onCancelSelection}
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
    gap: 20, // segments ↔ picker breathing room
    // Geen paddingBottom: het vaste CTA-vlak eronder levert die ruimte al, en hem
    // terugnemen laat de wheel centreren in plaats van onder de CTA door te lopen.
  },
  // Bovenblok op natuurlijke hoogte; de picker eronder vult de rest en centreert.
  topGroup: {
    gap: 28,
  },
  // De picker zit in de ruimte tussen de segmenten en de CTA, verticaal gecentreerd
  // en elastisch, zodat hij zich naar elke schermhoogte voegt.
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




  // Geen placeholder
  geenText: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },

  // Doelinvoer — chips bovenaan vastgezet, wheel gecentreerd in de ruimte eronder.
  // Hier geen vaste gap: de flex-centrering van de wheel levert de ademruimte, zodat
  // de wheel van 250 pt gecentreerd kan zweven in plaats van tegen de CTA geduwd te
  // worden.
  pickerArea: {
    flex: 1,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  wheelWrap: {
    flex: 1,
    justifyContent: 'center',
  },

});
