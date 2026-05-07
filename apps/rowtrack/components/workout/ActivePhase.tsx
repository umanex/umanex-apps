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
import type { GoalProgress } from '@/lib/workout-goals';
import { Button, KPI } from '@/components';
import {
  GoalSetupModal,
  MotivationalToast,
  MilestoneOverlay,
} from '@/components/workout';
import type { PaceZoneLevel, SplitEntry } from '@/components/workout';
import { formatTimer, formatSplit, formatDistanceDynamic } from '@/lib/formatters';
import { brand, status as statusColors, text as textColors, fontFamily, background, space, radii, componentRadius, fontSize } from '@/constants';
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
interface ActivePhaseProps {
  phase: Phase;
  metricsState: WorkoutMetricsState;
  bleStatus: ConnectionStatus;
  deviceName: string | null;
  bleError: string | null;
  startScan: () => void;
  goal: WorkoutGoal | null;
  goalProgress: GoalProgress | null;
  goalReached: boolean;
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
  goalProgress,
  goalReached,
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
  hrBpm,
  startHRScan,
  insets,
}: ActivePhaseProps) {
  const { seconds, watts, spm, splitSeconds, distanceMeters, calories } = metricsState;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

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
    const h = String(now.getHours()).padStart(2, '0');
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

  // --- Landscape: top section (timer + progress bar) ---
  function renderTopSection() {
    return (
      <>
        {goal && (
          <Text style={activeStyles.goalLabel}>{buildGoalLabel(goal)}</Text>
        )}
        <Text style={activeStyles.timerText}>{formattedTimer}</Text>
        {goal && goalProgress && (
          <>
            <View style={activeStyles.progressTrack}>
              <View
                style={[
                  activeStyles.progressFill,
                  { width: `${Math.min(goalProgress.percentage, 100)}%` },
                ]}
              />
            </View>
            <Text style={activeStyles.progressPct}>
              {Math.round(goalProgress.percentage)}% voltooid
            </Text>
          </>
        )}
      </>
    );
  }

  // --- Landscape: KPI rows ---
  function renderKPIs(compact: boolean) {
    return (
      <>
        <KPI label="WATT" value={`${avgWatts} W`} compact={compact} />
        <KPI label="SPM" value={`${avgSpm}`} compact={compact} />
        <KPI label="SPLIT" value={formatSplit(avgSplit)} compact={compact} />
        <KPI label="AFSTAND" value={`${formattedDistance.value} ${formattedDistance.unit}`} compact={compact} />
        <KPI label="KCAL" value={`${Math.round(calories)}${hasProfileWeight ? '' : '*'}`} compact={compact} />
        {hrBpm != null && hrBpm > 0 && (
          <KPI label="BPM" value={`${hrBpm}`} compact={compact} />
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

    // Hero + progress fill px + subtitle node — computed per goal type
    let heroText = formattedTimer;
    let progressFillPx = 0;
    let progressBarColor = '#00E5FF';
    let subtitleNode: ReactNode = null;

    switch (goalType) {
      case null: {
        subtitleNode = (
          <Text style={portraitStyles.subtitleText}>
            {`${formattedDistance.value} ${formattedDistance.unit} geroeid`}
          </Text>
        );
        break;
      }
      case 'duration': {
        const target = goal!.target;
        const remaining = Math.max(0, target - seconds);
        const pct = target > 0 ? Math.min(1, seconds / target) : 0;
        heroText = formatTimer(remaining);
        progressFillPx = 300 * pct;
        subtitleNode = (
          <View style={portraitStyles.subtitleRow}>
            <Text style={portraitStyles.subtitleRowText}>{formatTimer(seconds)}</Text>
            <View style={portraitStyles.subtitleDivider} />
            <Text style={portraitStyles.subtitleRowText}>
              {`${Math.round(pct * 100)}% voltooid`}
            </Text>
          </View>
        );
        break;
      }
      case 'distance': {
        const target = goal!.target;
        const remaining = Math.max(0, target - distanceMeters);
        const pct = target > 0 ? Math.min(1, distanceMeters / target) : 0;
        // Hero: remaining in meters, Dutch thousands separator (e.g. "15.000 m")
        const remainM = Math.round(remaining);
        heroText = remainM >= 1000
          ? `${Math.floor(remainM / 1000)}.${String(remainM % 1000).padStart(3, '0')} m`
          : `${remainM} m`;
        progressFillPx = 300 * pct;
        // Subtitle elapsed: comma as decimal separator (e.g. "5,0 km")
        const elapsedStr = distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1).replace('.', ',')} km`
          : `${Math.round(distanceMeters)} m`;
        subtitleNode = (
          <View style={portraitStyles.subtitleRow}>
            <Text style={portraitStyles.subtitleRowText}>{elapsedStr}</Text>
            <View style={portraitStyles.subtitleDivider} />
            <Text style={portraitStyles.subtitleRowText}>
              {`${Math.round(pct * 100)}% voltooid`}
            </Text>
          </View>
        );
        break;
      }
      case 'split': {
        progressFillPx = 300;
        progressBarColor = splitSeconds > 0 && splitSeconds <= goal!.target ? '#4CAF50' : '#FE9429';
        heroText = formatSplit(splitSeconds);
        let splitSubtitle = 'Begin met roeien...';
        if (splitSeconds !== 0) {
          const diff = goal!.target - splitSeconds;
          const absDiff = Math.abs(Math.round(diff));
          splitSubtitle = diff >= 0
            ? `Je bent ${absDiff} sec sneller`
            : `Je bent ${absDiff} sec trager`;
        }
        subtitleNode = (
          <Text style={portraitStyles.subtitleText}>{splitSubtitle}</Text>
        );
        break;
      }
      case 'watts': {
        progressFillPx = 300;
        progressBarColor = watts >= goal!.target ? '#4CAF50' : '#FE9429';
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
        case 'SPLIT': return 'SPLIT/500M';
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
        case 'SPM': return `${avgSpm}`;
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
          {goal && (
            <View style={portraitStyles.doelPill}>
              <Text style={portraitStyles.doelPillText}>DOEL</Text>
              <View style={portraitStyles.doelPillDivider} />
              <Text style={portraitStyles.doelPillText}>{doelTargetLabel}</Text>
            </View>
          )}

          <Text style={portraitStyles.heroText}>{heroText}</Text>

          {goal && (
            <View style={portraitStyles.progressTrack}>
              <View
                style={[
                  portraitStyles.progressFill,
                  { width: progressFillPx, backgroundColor: progressBarColor },
                ]}
              />
            </View>
          )}

          {subtitleNode}
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
                  <Text style={portraitStyles.kpiValue}>{kpiDisplayValue('BPM')}</Text>
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
        <TouchableOpacity style={portraitStyles.stopButton} onPress={onStop} activeOpacity={0.8}>
          <Text style={portraitStyles.stopButtonText}>Stop training</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 8 }]}>
      {/* Milestone overlay */}
      <MilestoneOverlay message={milestoneMsg} onDismiss={dismissMilestone} />

      {/* Connection status overlay */}
      {isConnecting && (
        <View style={styles.connectionOverlay}>
          {bleStatus !== 'error' ? (
            <>
              <ActivityIndicator color={brand.primary} size="large" />
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
              <Ionicons name="warning-outline" size={40} color={textColors.secondary} />
              <Text style={styles.connectionText}>{bleError}</Text>
              <Button title="Opnieuw proberen" onPress={startScan} size="md" variant="ghost" />
            </>
          )}
        </View>
      )}

      {!isConnecting && isLandscape ? (
        /* ===== LANDSCAPE LAYOUT ===== */
        <View style={landscapeStyles.root}>
          {/* Left column: timer + stop button */}
          <View style={landscapeStyles.leftCol}>
            <View style={landscapeStyles.leftTop}>
              {renderTopSection()}
            </View>
            <Button
              title="Stop training"
              variant="destructive"
              size="md"
              onPress={onStop}
              style={{ alignSelf: 'stretch' }}
            />
          </View>

          {/* Right column: KPI list */}
          <View style={landscapeStyles.rightCol}>
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

      {/* Summary Modal */}
      <Modal visible={phase === 'summary'} transparent animationType="fade" statusBarTranslucent>
        <View style={summaryStyles.screen}>
          <View style={summaryStyles.card}>
            <View style={summaryStyles.header}>
              <Text style={summaryStyles.title}>Samenvatting</Text>
              <Text style={summaryStyles.dateText}>{summaryDateLabel}</Text>
            </View>
            {hasPR && (
              <View style={summaryStyles.prBanner}>
                <Text>🏅</Text>
                <Text style={summaryStyles.prText}>Nieuw persoonlijk record. Proficiat!</Text>
              </View>
            )}
            <View style={summaryStyles.kpiRow}>
              <View style={summaryStyles.kpiTile}>
                <Text style={summaryStyles.kpiLabel}>TIJD</Text>
                <Text style={summaryStyles.kpiValue}>{formattedTimer}</Text>
              </View>
              <View style={summaryStyles.kpiTile}>
                <Text style={summaryStyles.kpiLabel}>AFSTAND</Text>
                <Text style={summaryStyles.kpiValue}>{formattedDistance.value}</Text>
                <Text style={summaryStyles.kpiUnit}>{formattedDistance.unit === 'm' ? 'meter' : formattedDistance.unit}</Text>
              </View>
              <View style={summaryStyles.kpiTile}>
                <Text style={summaryStyles.kpiLabel}>KCAL</Text>
                <Text style={summaryStyles.kpiValue}>{`${Math.round(calories)}${hasProfileWeight ? '' : '*'}`}</Text>
              </View>
            </View>
            <View style={summaryStyles.divider} />
            <View style={summaryStyles.statsSection}>
              <View style={summaryStyles.statsHeader}>
                <View style={summaryStyles.statsLabelCol} />
                <Text style={summaryStyles.statsColLabel}>GEM</Text>
                <Text style={summaryStyles.statsColLabel}>PIEK</Text>
              </View>
              <View style={summaryStyles.statsTable}>
                {[
                  { label: 'SPLIT 500/M', gem: formatSplit(avgSplit), piek: summaryBestSplit != null ? formatSplit(summaryBestSplit) : '—' },
                  { label: 'WATT', gem: `${avgWatts}`, piek: summaryMaxWatts != null ? `${summaryMaxWatts}` : '—' },
                  { label: 'SPM', gem: `${avgSpm}`, piek: summaryMaxSpm != null ? `${summaryMaxSpm}` : '—' },
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
            <View style={summaryStyles.buttonsArea}>
              <Button title="Opslaan" onPress={onSave} loading={saving} size="md" />
              <Button title="Annuleren" onPress={onDiscard} variant="destructive" disabled={saving} size="md" />
            </View>
          </View>
        </View>
      </Modal>

      {/* Motivational toast */}
      <MotivationalToast message={toastMsg} onDismiss={dismissToast} isGoalComplete={goalReached} />
    </View>
  );
}

const activeStyles = StyleSheet.create({
  goalLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: '#AAAAAA',
    letterSpacing: 1.5,
  },
  timerText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 48,
    color: '#FFFFFF',
  },
  progressTrack: {
    alignSelf: 'stretch',
    marginHorizontal: 31,
    height: 12,
    backgroundColor: '#1A1F2E',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    backgroundColor: '#00E5FF',
    borderRadius: 6,
  },
  progressPct: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

const portraitStyles = StyleSheet.create({
  root: {
    flex: 1,
    gap: 20,
  },
  topSection: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  doelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doelPillText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: '#AAAAAA',
    letterSpacing: 1,
  },
  doelPillDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#AAAAAA',
  },
  heroText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 64,
    color: '#FFFFFF',
    lineHeight: 72,
  },
  progressTrack: {
    width: 300,
    height: 12,
    backgroundColor: '#1A1F2E',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00E5FF',
  },
  subtitleText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 13,
    color: '#AAAAAA',
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  subtitleDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#47556E',
  },
  subtitleRowText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 16,
    color: '#FFFFFF',
  },
  kpiGrid: {
    gap: 12,
  },
  kpiRow: {
    height: 58,
    backgroundColor: '#1A1F2E',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  kpiLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 16,
    color: '#AAAAAA',
    letterSpacing: 1,
  },
  kpiValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 28,
    color: '#FFFFFF',
  },
  stopButton: {
    height: 52,
    backgroundColor: '#F05454',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 16,
    color: '#FFFFFF',
  },
});

const landscapeStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    gap: 40,
  },
  leftCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftTop: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  rightCol: {
    flex: 1,
    justifyContent: 'space-between',
  },
});

const summaryStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: background.base,
    padding: space['5'],
  },
  card: {
    flex: 1,
    borderRadius: componentRadius.modal,
    overflow: 'hidden',
    gap: space['5'],
  },
  header: {
    gap: space['1'],
  },
  title: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['28'],
    color: textColors.primary,
  },
  dateText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: textColors.secondary,
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: radii.md,
    padding: space['5'],
    gap: space['2'],
  },
  prText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: statusColors.warning,
    lineHeight: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: space['5'],
  },
  kpiTile: {
    flex: 1,
    backgroundColor: background.elevated,
    borderRadius: radii.lg,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space['6'],
    paddingBottom: space['4'],
    paddingHorizontal: space['4'],
    gap: space['2'],
  },
  kpiLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['16'],
    color: textColors.secondary,
    letterSpacing: 1.28,
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: textColors.primary,
    textAlign: 'center',
  },
  kpiUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: textColors.secondary,
  },
  divider: {
    height: 1,
    backgroundColor: textColors.muted,
  },
  statsSection: {
    gap: space['2'],
  },
  statsHeader: {
    flexDirection: 'row',
    paddingLeft: space['4'],
  },
  statsLabelCol: {
    width: 165,
  },
  statsColLabel: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: textColors.secondary,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
  },
  statsTable: {
    backgroundColor: background.elevated,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space['4'],
    paddingVertical: space['4'],
  },
  statsRowLabel: {
    width: 165,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: textColors.secondary,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
  },
  statsRowValue: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['16'],
    color: textColors.primary,
  },
  statsRowDivider: {
    height: 1,
    backgroundColor: textColors.muted,
  },
  buttonsArea: {
    flex: 1,
    justifyContent: 'flex-end',
    gap: space['2'],
  },
});
