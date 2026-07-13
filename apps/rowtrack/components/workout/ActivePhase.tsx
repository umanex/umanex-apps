import { type ReactNode, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  ActivityIndicator,
  Animated,
  TouchableOpacity,
  useWindowDimensions,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ConnectionStatus, HRStatus } from '@/lib/ble/types';
import type { WorkoutGoal } from '@/lib/workout-goals';
import { Button, KPI, KpiSingle } from '@/components';
import {
  GoalSetupModal,
  MotivationalToast,
  MilestoneOverlay,
} from '@/components/workout';
import type { PaceZoneLevel, SplitEntry } from '@/components/workout';
import { formatTimer, formatTimerFull, formatSplit, formatDistanceDynamic, formatMetersDotted, correctSpm } from '@/lib/formatters';
import { useSpmHalved } from '@/lib/hooks/useSpmHalved';
import { bg, fg, accent, border, progressBar, status, fontFamily, space, radii, componentRadius, fontSize, typeStyles, layout } from '@/constants';
import type { WorkoutMetricsState } from '@/lib/hooks/useWorkoutMetrics';
import { styles } from './workout.styles';

// --- Types ---
type Phase = 'active' | 'summary';

// --- Helpers ---
function buildGoalLabel(goal: WorkoutGoal): string {
  switch (goal.type) {
    case 'duration': {
      const m = Math.floor(goal.target / 60);
      const s = goal.target % 60;
      return `DOEL: ${m}:${String(s).padStart(2, '0')} MIN`;
    }
    case 'distance':
      return goal.target >= 1000
        ? `DOEL: ${(goal.target / 1000).toFixed(1).replace('.', ',')} KM`
        : `DOEL: ${goal.target} M`;
    case 'split':
      return `DOEL: ${formatSplit(goal.target)}/500M`;
    case 'watts':
      return `DOEL: ${goal.target} W`;
  }
}

// --- Props ---
type ActivePhaseProps = {
  phase: Phase;
  metricsState: WorkoutMetricsState;
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  bleError: string | null;
  startScan: () => void;
  goal: WorkoutGoal | null;
  isCountdown: boolean;
  paceZone: PaceZoneLevel | null;
  milestoneMsg: string | null;
  toastMsg: string | null;
  dismissMilestone: () => void;
  dismissToast: () => void;
  splits: SplitEntry[];
  prFlags: { watts: boolean; split: boolean; distance: boolean };
  hasPR: boolean;
  pulseAnim: Animated.Value;
  avgWatts: number;
  avgSpm: number;
  avgSplit: number;
  summaryMaxWatts: number | null;
  summaryBestSplit: number | null;
  summaryAvgHr: number | null;
  summaryMaxSpm: number | null;
  summaryMaxHr: number | null;
  onStop: () => void;
  onSave: () => void;
  onDiscard: () => void;
  onSetGoal: (g: WorkoutGoal) => void;
  onClearGoal: () => void;
  saving: boolean;
  hasProfileWeight: boolean;
  hrStatus: HRStatus;
  hrBpm: number | null;
  startHRScan: () => void;
  insets: EdgeInsets;
}


// --- Component ---
export function ActivePhase({
  phase,
  metricsState,
  bleStatus,
  bleError,
  startScan,
  goal,
  milestoneMsg,
  toastMsg,
  dismissMilestone,
  dismissToast,
  splits,
  hasPR,
  avgWatts,
  avgSpm,
  avgSplit,
  summaryMaxWatts,
  summaryBestSplit,
  summaryAvgHr,
  summaryMaxSpm,
  summaryMaxHr,
  onStop,
  onSave,
  onDiscard,
  onSetGoal,
  onClearGoal,
  saving,
  hasProfileWeight,
  hrStatus,
  hrBpm,
  startHRScan,
  insets,
}: ActivePhaseProps) {
  const { seconds, watts, spm, splitSeconds, distanceMeters, calories } = metricsState;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;
  const spmHalved = useSpmHalved();

  // Landscape 50/50: measure the row and hand each column an explicit half-width.
  // A definite width can't be content-sized by the engine, so the split holds on
  // any RN version/architecture (old arch resolves `flex:1` → flexBasis 'auto',
  // which lets the wide KPI column starve the metric column — hero wraps).
  const [landColWidth, setLandColWidth] = useState<number | null>(null);
  const landColStyle = landColWidth != null
    ? { width: landColWidth, flexGrow: 0, flexShrink: 0 }
    : landscapeStyles.colGrow;

  const [showGoalModal, setShowGoalModal] = useState(false);

  const isConnecting = useMemo(
    () => phase === 'active' && bleStatus !== 'connected',
    [phase, bleStatus],
  );

  const formattedTimer = useMemo((): string => formatTimer(seconds), [seconds]);
  const formattedDistance = useMemo(() => formatDistanceDynamic(distanceMeters), [distanceMeters]);

  const summaryDateLabel = useMemo(() => {
    if (phase !== 'summary') return '';
    const now = new Date();
    const h = String(now.getHours());
    const m = String(now.getMinutes()).padStart(2, '0');
    return `Vandaag - ${h}:${m}`;
  }, [phase]);

  const handleSetGoal = useCallback((g: WorkoutGoal) => {
    onSetGoal(g);
    setShowGoalModal(false);
  }, [onSetGoal]);

  const handleClearGoal = useCallback(() => {
    onClearGoal();
    setShowGoalModal(false);
  }, [onClearGoal]);

  const handleCloseGoalModal = useCallback(() => setShowGoalModal(false), []);

  // --- Landscape: top section (pill top-aligned; hero + bar + subtitle centred) ---
  function renderTopSection() {
    const goalType = goal?.type ?? null;

    // Pill target label — portrait-parity structure; landscape splits get leading-zero minutes.
    let doelTargetLabel = '';
    if (goal) {
      switch (goal.type) {
        case 'duration': {
          const m = Math.floor(goal.target / 60);
          const s = goal.target % 60;
          doelTargetLabel = `${m}:${String(s).padStart(2, '0')} MIN`;
          break;
        }
        case 'distance':
          doelTargetLabel = goal.target >= 1000
            ? `${(goal.target / 1000).toFixed(1).replace('.', ',')} KM`
            : `${goal.target} M`;
          break;
        case 'split':
          doelTargetLabel = `${formatSplit(goal.target, true)}/500m`;
          break;
        case 'watts':
          doelTargetLabel = `${goal.target} W`;
          break;
      }
    }

    // Hero + progress bar descriptor + subtitle — mirrors the portrait per-goal logic.
    type Bar = { fillPct: number; color: string; radius: number; showDot: boolean };
    let heroText: string = formattedTimer;
    let bar: Bar | null = null;
    let subtitleNode: ReactNode = null;

    switch (goalType) {
      case null: {
        subtitleNode = (
          <Text style={[activeStyles.subtitleText, activeStyles.subtitleSpacer]}>
            {`${formatMetersDotted(distanceMeters)} m`}
          </Text>
        );
        break;
      }
      case 'duration': {
        const target = goal!.target;
        const pct = target > 0 ? Math.min(1, seconds / target) : 0;
        heroText = formatTimer(Math.max(0, target - seconds));
        bar = { fillPct: pct, color: accent.default, radius: radii.lg, showDot: true };
        subtitleNode = (
          <View style={[activeStyles.subtitleRow, activeStyles.subtitleSpacer]}>
            <Text style={activeStyles.subtitleRowText}>{formatTimer(seconds)}</Text>
            <View style={activeStyles.subtitleDivider} />
            <Text style={activeStyles.subtitleRowText}>{`${Math.floor(pct * 100)}% voltooid`}</Text>
          </View>
        );
        break;
      }
      case 'distance': {
        const target = goal!.target;
        const pct = target > 0 ? Math.min(1, distanceMeters / target) : 0;
        // Hero: remaining meters with dotted thousands, no unit (design 42:5934 '15.000').
        heroText = formatMetersDotted(Math.max(0, target - distanceMeters));
        bar = { fillPct: pct, color: accent.default, radius: radii.lg, showDot: true };
        subtitleNode = (
          <View style={[activeStyles.subtitleRow, activeStyles.subtitleSpacer]}>
            <Text style={activeStyles.subtitleRowText}>{`${formatMetersDotted(distanceMeters)} m`}</Text>
            <View style={activeStyles.subtitleDivider} />
            <Text style={activeStyles.subtitleRowText}>{`${Math.floor(pct * 100)}% voltooid`}</Text>
          </View>
        );
        break;
      }
      case 'split': {
        heroText = formatSplit(splitSeconds, true);
        const onTarget = splitSeconds > 0 && splitSeconds <= goal!.target;
        bar = { fillPct: 1, color: onTarget ? progressBar.successFill : progressBar.warningFill, radius: 6, showDot: false };
        let sub = 'Begin met roeien...';
        if (splitSeconds !== 0) {
          const diff = goal!.target - splitSeconds;
          const absDiff = Math.abs(Math.round(diff));
          sub = diff >= 0 ? `Je bent ${absDiff} seconden sneller` : `Je bent ${absDiff} seconden trager`;
        }
        subtitleNode = <Text style={[activeStyles.subtitleText, activeStyles.subtitleSpacer]}>{sub}</Text>;
        break;
      }
      case 'watts': {
        heroText = `${watts} W`;
        const onTarget = watts >= goal!.target;
        bar = { fillPct: 1, color: onTarget ? progressBar.successFill : progressBar.warningFill, radius: 6, showDot: false };
        let sub = 'Begin met roeien...';
        if (watts !== 0) {
          const diff = watts - goal!.target;
          const absDiff = Math.abs(Math.round(diff));
          sub = diff >= 0 ? `Je levert ${absDiff} W meer` : `Je levert ${absDiff} W minder dan je doel`;
        }
        subtitleNode = <Text style={[activeStyles.subtitleText, activeStyles.subtitleSpacer]}>{sub}</Text>;
        break;
      }
    }

    return (
      <>
        <View style={activeStyles.doelPill}>
          <Text style={activeStyles.doelPillLabel}>DOEL</Text>
          <View style={activeStyles.doelPillDivider} />
          <Text style={activeStyles.doelPillValue}>{goal ? doelTargetLabel : 'Geen doel'}</Text>
        </View>
        <View style={activeStyles.heroGroup}>
          <Text style={activeStyles.timerText}>{heroText}</Text>
          {bar && (
            <View style={[activeStyles.progressTrack, { borderRadius: bar.radius }]}>
              {bar.fillPct > 0 && (
                <View
                  style={[
                    activeStyles.progressFill,
                    {
                      width: `${Math.min(bar.fillPct * 100, 100)}%`,
                      backgroundColor: bar.color,
                      borderRadius: bar.radius,
                    },
                  ]}
                >
                  {bar.showDot && (
                    <View style={[activeStyles.progressDot, { backgroundColor: bar.color }]} />
                  )}
                </View>
              )}
            </View>
          )}
          {subtitleNode}
        </View>
      </>
    );
  }

  // --- Landscape: KPI rows ---
  function renderKPIs(compact: boolean) {
    const goalType = goal?.type ?? null;
    type KPIKey = 'SPLIT' | 'WATT' | 'SPM' | 'BPM' | 'AFSTAND' | 'TIJD' | 'KCAL';

    let kpiOrder: KPIKey[];
    switch (goalType) {
      case 'distance':
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'TIJD', 'KCAL'];
        break;
      case 'split':
        kpiOrder = ['WATT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      case 'watts':
        kpiOrder = ['SPLIT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      default:
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
    }

    function kpiLabel(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return 'SPLIT 500/M';
        case 'WATT': return 'WATT';
        case 'SPM': return 'SPM';
        case 'BPM': return 'BPM';
        case 'AFSTAND': return 'AFSTAND';
        case 'TIJD': return 'TIJD';
        case 'KCAL': return 'KCAL';
      }
    }

    function kpiValue(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return formatSplit(avgSplit, true);
        case 'WATT': return `${avgWatts} W`;
        case 'SPM': return `${correctSpm(avgSpm, spmHalved)}`;
        case 'BPM': return hrBpm != null && hrBpm > 0 ? `${hrBpm}` : '—';
        case 'AFSTAND': return `${formatMetersDotted(distanceMeters)} m`;
        case 'TIJD': return formattedTimer;
        case 'KCAL': return `${Math.round(calories)}${hasProfileWeight ? '' : '*'}`;
      }
    }

    return (
      <>
        {kpiOrder.map((key) =>
          key === 'BPM' ? (
            <KPI
              key="BPM"
              label="BPM"
              value={kpiValue('BPM')}
              compact={compact}
              fill={compact}
              onPress={startHRScan}
              loading={hrStatus === 'scanning'}
            />
          ) : (
            <KPI
              key={key}
              label={kpiLabel(key)}
              value={kpiValue(key)}
              compact={compact}
              fill={compact}
            />
          )
        )}
      </>
    );
  }

  // --- Portrait: 5 goal-type variants ---
  function renderPortrait() {
    const goalType = goal?.type ?? null;

    // DOEL pill: always "DOEL" on left, formatted target value on right
    let doelTargetLabel = '';
    if (goal) {
      switch (goal.type) {
        case 'duration': {
          const m = Math.floor(goal.target / 60);
          const s = goal.target % 60;
          doelTargetLabel = `${m}:${String(s).padStart(2, '0')} MIN`;
          break;
        }
        case 'distance':
          doelTargetLabel = goal.target >= 1000
            ? `${(goal.target / 1000).toFixed(1).replace('.', ',')} KM`
            : `${goal.target} M`;
          break;
        case 'split':
          doelTargetLabel = `${formatSplit(goal.target)}/500m`;
          break;
        case 'watts':
          doelTargetLabel = `${goal.target} W`;
          break;
      }
    }

    // Hero + progress fill pct (0–1) + subtitle node — computed per goal type
    let heroText = formattedTimer;
    let progressFillPct = 0;
    let progressBarColor: string = accent.default;
    let progressBarRadius: number = radii.lg;
    let subtitleNode: ReactNode = null;

    switch (goalType) {
      case null: {
        subtitleNode = (
          <Text style={portraitStyles.subtitleText}>
            {`${formatMetersDotted(distanceMeters)} m`}
          </Text>
        );
        break;
      }
      case 'duration': {
        const target = goal!.target;
        const remaining = Math.max(0, target - seconds);
        const pct = target > 0 ? Math.min(1, seconds / target) : 0;
        heroText = formatTimer(remaining);
        progressFillPct = pct;
        subtitleNode = (
          <View style={portraitStyles.subtitleRow}>
            <Text style={portraitStyles.subtitleRowText}>{formatTimer(seconds)}</Text>
            <View style={portraitStyles.subtitleDivider} />
            <Text style={portraitStyles.subtitleRowText}>
              {`${Math.floor(pct * 100)}% voltooid`}
            </Text>
          </View>
        );
        break;
      }
      case 'distance': {
        const target = goal!.target;
        const remaining = Math.max(0, target - distanceMeters);
        const pct = target > 0 ? Math.min(1, distanceMeters / target) : 0;
        // Hero: remaining meters with dotted thousands, no unit (design 85:2381 "15.000")
        heroText = formatMetersDotted(remaining);
        progressFillPct = pct;
        // Subtitle elapsed: comma as decimal separator (e.g. "5,0 km")
        const elapsedStr = distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
          : `${Math.round(distanceMeters)} m`;
        subtitleNode = (
          <View style={portraitStyles.subtitleRow}>
            <Text style={portraitStyles.subtitleRowText}>{elapsedStr}</Text>
            <View style={portraitStyles.subtitleDivider} />
            <Text style={portraitStyles.subtitleRowText}>
              {`${Math.floor(pct * 100)}% voltooid`}
            </Text>
          </View>
        );
        break;
      }
      case 'split': {
        progressFillPct = 1;
        progressBarColor = splitSeconds > 0 && splitSeconds <= goal!.target ? progressBar.successFill : progressBar.warningFill;
        progressBarRadius = 6;
        heroText = formatSplit(splitSeconds);
        let splitSubtitle = 'Begin met roeien...';
        if (splitSeconds !== 0) {
          const diff = goal!.target - splitSeconds;
          const absDiff = Math.abs(Math.round(diff));
          splitSubtitle = diff >= 0
            ? `Je bent ${absDiff} seconden sneller`
            : `Je bent ${absDiff} seconden trager`;
        }
        subtitleNode = (
          <Text style={portraitStyles.subtitleText}>{splitSubtitle}</Text>
        );
        break;
      }
      case 'watts': {
        progressFillPct = 1;
        progressBarColor = watts >= goal!.target ? progressBar.successFill : progressBar.warningFill;
        progressBarRadius = 6;
        heroText = `${watts} W`;
        let wattsSubtitle = 'Begin met roeien...';
        if (watts !== 0) {
          const diff = watts - goal!.target;
          const absDiff = Math.abs(Math.round(diff));
          wattsSubtitle = diff >= 0
            ? `Je levert ${absDiff} W meer`
            : `Je levert ${absDiff} W minder dan je doel`;
        }
        subtitleNode = (
          <Text style={portraitStyles.subtitleText}>{wattsSubtitle}</Text>
        );
        break;
      }
    }

    // KPI ordering per goal type
    type KPIKey = 'SPLIT' | 'WATT' | 'SPM' | 'BPM' | 'AFSTAND' | 'TIJD' | 'KCAL';
    let kpiOrder: KPIKey[];
    switch (goalType) {
      case 'distance':
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'TIJD', 'KCAL'];
        break;
      case 'split':
        kpiOrder = ['WATT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      case 'watts':
        kpiOrder = ['SPLIT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      default:
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
    }

    function kpiDisplayLabel(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return 'SPLIT 500/M';
        case 'WATT': return 'WATT';
        case 'SPM': return 'SPM';
        case 'BPM': return 'BPM';
        case 'AFSTAND': return 'AFSTAND';
        case 'TIJD': return 'TIJD';
        case 'KCAL': return 'KCAL';
      }
    }

    function kpiDisplayValue(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return formatSplit(avgSplit);
        case 'WATT': return `${avgWatts} W`;
        case 'SPM': return `${correctSpm(avgSpm, spmHalved)}`;
        case 'BPM': return hrBpm != null && hrBpm > 0 ? `${hrBpm}` : '—';
        case 'AFSTAND': return `${formattedDistance.value} ${formattedDistance.unit}`;
        case 'TIJD': return formattedTimer;
        case 'KCAL': return `${Math.round(calories)}${hasProfileWeight ? '' : '*'}`;
      }
    }

    return (
      <View style={portraitStyles.root}>
        {/* Top Section */}
        <View style={portraitStyles.topSection}>
          <View style={portraitStyles.doelPill}>
            <Text style={portraitStyles.doelPillLabel}>DOEL</Text>
            <View style={portraitStyles.doelPillDivider} />
            <Text style={portraitStyles.doelPillValue}>{goal ? doelTargetLabel : 'Geen doel'}</Text>
          </View>

          <View style={portraitStyles.heroGroup}>
            <Text style={portraitStyles.heroText}>{heroText}</Text>

            {goal && (
              <View style={[portraitStyles.progressTrack, { borderRadius: progressBarRadius }]}>
                {progressFillPct > 0 && (
                  <View
                    style={[
                      portraitStyles.progressFill,
                      {
                        width: `${Math.min(progressFillPct * 100, 100)}%`,
                        backgroundColor: progressBarColor,
                        borderRadius: progressBarRadius,
                      },
                    ]}
                  >
                    {goalType !== 'split' && goalType !== 'watts' && (
                      <View style={[portraitStyles.progressDot, { backgroundColor: progressBarColor }]} />
                    )}
                  </View>
                )}
              </View>
            )}

            {subtitleNode}
          </View>
        </View>

        {/* KPI Grid */}
        <View style={portraitStyles.kpiGrid}>
          {kpiOrder.map((key) => {
            if (key === 'BPM') {
              return (
                <TouchableOpacity
                  key="BPM"
                  style={portraitStyles.kpiRow}
                  onPress={startHRScan}
                  activeOpacity={0.8}
                >
                  <Text style={portraitStyles.kpiLabel}>BPM</Text>
                  {hrStatus === 'scanning' ? (
                    <ActivityIndicator size="small" color={fg.secondary} />
                  ) : (
                    <Text style={portraitStyles.kpiValue}>{kpiDisplayValue('BPM')}</Text>
                  )}
                </TouchableOpacity>
              );
            }
            return (
              <View key={key} style={portraitStyles.kpiRow}>
                <Text style={portraitStyles.kpiLabel}>{kpiDisplayLabel(key)}</Text>
                <Text style={portraitStyles.kpiValue}>{kpiDisplayValue(key)}</Text>
              </View>
            );
          })}
        </View>

        {/* Stop button */}
        <Button
          title="Stop training"
          variant="primary"
          size="md"
          icon="arrow-forward"
          iconPosition="trailing"
          onPress={onStop}
          style={{ alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  // Figma: landscape 20px rondom; portrait 20 L/R + 28 T/B. Elke rand is
  // max(design-padding, safe-area-inset) zodat content de notch/home-indicator
  // vrijhoudt. Horizontaal symmetrisch (max van beide insets) zodat het 50/50-blok
  // gecentreerd op het scherm blijft i.p.v. weggeduwd door de notch aan één kant.
  const edgePadV = isLandscape ? space['20'] : space['28'];
  const edgePadH = Math.max(layout.screenHorizontal, insets.left, insets.right);

  return (
    <View style={[styles.container, {
      paddingTop: Math.max(edgePadV, insets.top),
      paddingBottom: Math.max(edgePadV, insets.bottom),
      paddingLeft: edgePadH,
      paddingRight: edgePadH,
    }]}>
      {/* Milestone overlay */}
      <MilestoneOverlay message={milestoneMsg} onDismiss={dismissMilestone} />

      {/* Connection status overlay */}
      {isConnecting && (
        <View style={styles.connectionOverlay}>
          {bleStatus !== 'error' ? (
            <>
              <ActivityIndicator color={accent.default} size="large" />
              <Text style={styles.connectionText}>
                {(bleStatus === 'idle' || bleStatus === 'scanning') && 'Zoeken naar roeier...'}
                {bleStatus === 'connecting' && 'Verbinden...'}
                {bleStatus === 'discovering' && 'Services ontdekken...'}
                {bleStatus === 'reconnecting' && 'Opnieuw verbinden...'}
                {bleStatus === 'disconnecting' && 'Verbinding verbreken...'}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="warning-outline" size={40} color={fg.secondary} />
              <Text style={styles.connectionText}>{bleError}</Text>
              <Button title="Opnieuw proberen" onPress={startScan} size="md" variant="ghost" />
            </>
          )}
        </View>
      )}

      {!isConnecting && isLandscape ? (
        /* ===== LANDSCAPE LAYOUT ===== */
        <View
          style={landscapeStyles.root}
          onLayout={e => {
            const next = (e.nativeEvent.layout.width - space['40']) / 2;
            setLandColWidth(prev => (prev != null && Math.abs(prev - next) < 0.5 ? prev : next));
          }}
        >
          {/* Left column: timer + stop button */}
          <View style={[landscapeStyles.leftCol, landColStyle]}>
            <View style={landscapeStyles.leftTop}>
              {renderTopSection()}
            </View>
            <Button
              title="Stop training"
              variant="primary"
              size="md"
              icon="arrow-forward"
              iconPosition="trailing"
              onPress={onStop}
              style={{ alignSelf: 'stretch' }}
            />
          </View>

          {/* Right column: KPI list */}
          <View style={[landscapeStyles.rightCol, landColStyle]}>
            {renderKPIs(true)}
          </View>
        </View>
      ) : !isConnecting ? (
        /* ===== PORTRAIT LAYOUT ===== */
        renderPortrait()
      ) : null}

      {/* Goal setup (mid-workout) */}
      <GoalSetupModal
        visible={showGoalModal}
        currentGoal={goal}
        onSetGoal={handleSetGoal}
        onClearGoal={handleClearGoal}
        onClose={handleCloseGoalModal}
      />

      {/* Summary Modal — volle-breedte secties (Figma 43-8278) */}
      <Modal visible={phase === 'summary'} transparent animationType="fade" statusBarTranslucent>
        <View style={summaryStyles.screen}>
          {/* Top: titel + datum + PR-banner */}
          <View style={summaryStyles.topSection}>
            <View style={[summaryStyles.titleBlock, { paddingTop: Math.max(space['28'], insets.top) }]}>
              <Text style={summaryStyles.title}>Samenvatting</Text>
              <Text style={summaryStyles.dateText}>{summaryDateLabel}</Text>
            </View>
            {hasPR && (
              <View style={summaryStyles.prWrapper}>
                <View style={summaryStyles.prBanner}>
                  <Text style={summaryStyles.prEmoji}>🏅</Text>
                  <Text style={summaryStyles.prText}>Nieuw persoonlijk record. Proficiat!</Text>
                </View>
              </View>
            )}
          </View>

          {/* KPI-metrics — volle-breedte bg.raised band */}
          <View style={summaryStyles.kpiBand}>
            <View style={summaryStyles.kpiRow}>
              <KpiSingle
                value={formattedDistance.value}
                unit={formattedDistance.unit}
                label="AFSTAND"
                style={summaryStyles.kpiCell}
              />
              <KpiSingle
                value={formatTimerFull(seconds)}
                unit={seconds >= 3600 ? 'uur' : 'min'}
                label="DUUR"
                style={summaryStyles.kpiCell}
              />
            </View>
            <View style={summaryStyles.kpiBandDivider} />
            <View style={summaryStyles.kpiRow}>
              <KpiSingle
                value={`${Math.round(calories)}${hasProfileWeight ? '' : '*'}`}
                unit="kcal"
                label="ENERGIE"
                style={summaryStyles.kpiCell}
              />
              <KpiSingle
                value={`${Math.round(calories)}${hasProfileWeight ? '' : '*'}`}
                unit="kcal"
                label="ENERGIE"
                style={summaryStyles.kpiCell}
              />
            </View>
          </View>

          {/* Stats-sectie */}
          <View style={summaryStyles.statsSection}>
            <View style={summaryStyles.statsHeader}>
              <View style={summaryStyles.statsLabelCol} />
              <Text style={summaryStyles.statsColLabel}>GEM</Text>
              <Text style={summaryStyles.statsColLabel}>PIEK</Text>
            </View>
            <View style={summaryStyles.statsTable}>
              {[
                { label: 'SPLIT /500M', gem: formatSplit(avgSplit), piek: summaryBestSplit != null ? formatSplit(summaryBestSplit) : '—' },
                { label: 'WATT', gem: `${avgWatts}`, piek: summaryMaxWatts != null ? `${summaryMaxWatts}` : '—' },
                { label: 'SPM', gem: `${correctSpm(avgSpm, spmHalved)}`, piek: summaryMaxSpm != null ? `${correctSpm(summaryMaxSpm, spmHalved)}` : '—' },
                { label: 'BPM', gem: summaryAvgHr != null ? `${summaryAvgHr}` : '—', piek: summaryMaxHr != null ? `${summaryMaxHr}` : '—' },
              ].map((row, i, arr) => (
                <View key={row.label}>
                  <View style={summaryStyles.statsRow}>
                    <Text style={summaryStyles.statsRowLabel}>{row.label}</Text>
                    <Text style={summaryStyles.statsRowValue}>{row.gem}</Text>
                    <Text style={summaryStyles.statsRowValue}>{row.piek}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={summaryStyles.statsRowDivider} />}
                </View>
              ))}
            </View>
          </View>

          {/* Knoppen — onderaan */}
          <View style={[summaryStyles.buttonsArea, { paddingBottom: Math.max(space['28'], insets.bottom) }]}>
            <Button title="Annuleren" onPress={onDiscard} variant="outline" disabled={saving} size="lg" />
            <Button title="Opslaan" onPress={onSave} loading={saving} size="lg" icon="arrow-forward" iconPosition="trailing" />
          </View>
        </View>
      </Modal>

      {/* Goal-reached viering */}
      <MotivationalToast message={toastMsg} onDismiss={dismissToast} />
    </View>
  );
}

const activeStyles = StyleSheet.create({
  // Pill anchored to the top of the left column (design 42:5876).
  doelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: accent.subtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: accent.muted,
    paddingHorizontal: space['16'],
    gap: space['16'],
  },
  doelPillLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  doelPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: fg.quaternary,
  },
  doelPillValue: {
    ...typeStyles.kpiValue,
    color: accent.default,
  },
  // Hero group fills the space below the pill and centres its content.
  heroGroup: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['16'],
  },
  timerText: {
    fontFamily: fontFamily.sourceSerifBold,
    fontSize: fontSize['124'],
    // Geen lineHeight < fontSize: een krappe regelhoogte kapt de serif-toppen af
    // (bovenaan). Natuurlijke regelhoogte bevat de glyph en centreert vanzelf.
    letterSpacing: typeStyles.heroNumeric.letterSpacing,
    color: fg.onAccent,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 2,
    backgroundColor: progressBar.trackColor,
    borderRadius: radii.lg,
  },
  progressFill: {
    height: 2,
    backgroundColor: accent.default,
    borderRadius: radii.lg,
  },
  progressDot: {
    position: 'absolute',
    right: -3,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accent.default,
  },
  subtitleText: {
    ...typeStyles.activeProgress,
    color: fg.onAccent,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['16'],
  },
  subtitleDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: fg.quaternary,
  },
  subtitleRowText: {
    ...typeStyles.activeProgress,
    color: fg.onAccent,
  },
  // Extra 8px above the subtitle → 24px between bar and subtitle (design 42:5900).
  subtitleSpacer: {
    paddingTop: space['8'],
  },
});

const portraitStyles = StyleSheet.create({
  root: {
    flex: 1,
    gap: space['20'],
  },
  // Pill anchored to the top; hero group centred in the remaining space (design 42:5589).
  topSection: {
    flex: 1,
    alignItems: 'center',
  },
  heroGroup: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['28'],
  },
  doelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    backgroundColor: accent.subtle,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: accent.muted,
    paddingHorizontal: space['16'],
    gap: space['16'],
  },
  doelPillLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  doelPillValue: {
    ...typeStyles.kpiValue,
    color: accent.default,
  },
  doelPillDivider: {
    width: 1,
    height: 16,
    backgroundColor: fg.quaternary,
  },
  heroText: {
    fontFamily: fontFamily.sourceSerifBold,
    fontSize: fontSize['124'],
    color: fg.onAccent,
    // Geen lineHeight < fontSize: dat kapt de serif-toppen af (bovenaan).
    letterSpacing: typeStyles.heroNumeric.letterSpacing,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 2,
    backgroundColor: progressBar.trackColor,
    borderRadius: radii.lg,
  },
  progressFill: {
    height: 2,
    borderRadius: radii.lg,
    backgroundColor: accent.default,
  },
  progressDot: {
    position: 'absolute',
    right: -3,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  subtitleText: {
    ...typeStyles.activeProgress,
    color: fg.onAccent,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['16'],
  },
  subtitleDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: fg.quaternary,
  },
  subtitleRowText: {
    ...typeStyles.activeProgress,
    color: fg.onAccent,
  },
  kpiGrid: {
    gap: space['8'],
  },
  kpiRow: {
    height: 48,
    backgroundColor: bg.elevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.default,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space['18'],
  },
  kpiLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  kpiValue: {
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
});

const landscapeStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    gap: space['40'],
  },
  // De kolombreedte wordt in de component gezet als een expliciete, gemeten
  // helft (zie landColStyle): een definitieve breedte die geen enkele engine
  // content-kan-sizen. colGrow is enkel de eerste-frame fallback vóór de meting.
  colGrow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  leftCol: {
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftTop: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
  },
  rightCol: {
    minWidth: 0,
    // Figma: container gap 8, KPI-kaarten flex-vullen de resterende hoogte.
    // (Tijdens een active workout is de tabbar verborgen, dus de volle hoogte
    // is beschikbaar.)
    gap: space['8'],
  },
});

const summaryStyles = StyleSheet.create({
  // Volle-breedte scherm; secties dragen hun eigen padding (Figma 43-8278).
  screen: {
    flex: 1,
    backgroundColor: bg.base,
  },
  // Top: titel + datum + PR-banner (Frame 108)
  topSection: {
    paddingBottom: space['28'],
    gap: space['20'],
  },
  titleBlock: {
    paddingHorizontal: space['20'],
    // paddingTop wordt inline gezet (safe-area top)
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  dateText: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
    textTransform: 'uppercase',
  },
  prWrapper: {
    paddingHorizontal: space['20'],
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: componentRadius.highlightRow,
    padding: space['20'],
    gap: space['8'],
  },
  prEmoji: {
    fontSize: fontSize['14'],
  },
  prText: {
    ...typeStyles.kpiUnit,
    color: status.warning,
  },
  // KPI-metrics — volle-breedte bg.raised band (KPI Row-frame)
  kpiBand: {
    backgroundColor: bg.raised,
    paddingHorizontal: space['20'],
  },
  kpiRow: {
    flexDirection: 'row',
    paddingVertical: space['20'],
    gap: space['20'],
  },
  kpiCell: {
    flex: 1,
  },
  kpiBandDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
  // Stats-sectie (Frame 42 + 49)
  statsSection: {
    paddingHorizontal: space['20'],
    paddingVertical: space['28'],
    gap: space['8'],
  },
  statsHeader: {
    flexDirection: 'row',
    paddingHorizontal: space['16'],
  },
  statsLabelCol: {
    width: 165,
  },
  statsColLabel: {
    flex: 1,
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  statsTable: {
    backgroundColor: bg.raised,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space['16'],
    paddingVertical: space['16'],
  },
  statsRowLabel: {
    width: 165,
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  statsRowValue: {
    flex: 1,
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
  statsRowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: border.default,
  },
  // Knoppen — onderaan (Frame 41)
  buttonsArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space['20'],
    paddingTop: space['28'],
    gap: space['8'],
    // paddingBottom wordt inline gezet (safe-area bottom)
  },
});
