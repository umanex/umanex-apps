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
import { LinearGradient } from 'expo-linear-gradient';
import type { EdgeInsets } from 'react-native-safe-area-context';
import type { ConnectionStatus, HRStatus } from '@/lib/ble/types';
import type { WorkoutGoal } from '@/lib/workout-goals';
import { Button, KpiSingle } from '@/components';
import {
  GoalSetupModal,
  MotivationalToast,
  MilestoneOverlay,
} from '@/components/workout';
import type { PaceZoneLevel, SplitEntry } from '@/components/workout';
import { formatTimer, formatTimerFull, formatSplit, formatDistanceDynamic, formatMetersDotted, correctSpm } from '@/lib/formatters';
import { useSpmHalved } from '@/lib/hooks/useSpmHalved';
import { bg, fg, accent, border, progressBar, status, buttonTokens, fontFamily, space, radii, componentRadius, fontSize, typeStyles, layout } from '@/constants';
import type { WorkoutMetricsState } from '@/lib/hooks/useWorkoutMetrics';
import { styles } from './workout.styles';

// --- Types ---
type Phase = 'active' | 'summary';

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

  // --- DOEL-pill waarde (nieuw compact/lowercase design) ---
  // Alle doeltypes volgen {waarde} {eenheid} met spatie: "Geen" / "20 min" /
  // "10 km" / "2:20 split" / "180 W". Split neemt de frame-copy over; watts houdt
  // bewust de spatie (Figma toont "180W", 2026-07-14 gelijkgetrokken op het patroon).
  function goalPillValue(): string {
    if (!goal) return 'Geen';
    switch (goal.type) {
      case 'duration': {
        const m = Math.floor(goal.target / 60);
        const s = goal.target % 60;
        return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, '0')} min`;
      }
      case 'distance': {
        if (goal.target >= 1000) {
          const km = goal.target / 1000;
          return Number.isInteger(km) ? `${km} km` : `${km.toFixed(1).replace('.', ',')} km`;
        }
        return `${goal.target} m`;
      }
      case 'split':
        return `${formatSplit(goal.target, true)} split`;
      case 'watts':
        return `${goal.target} W`;
    }
  }

  // --- Hero-getal + subtitle + progress-fill per doeltype (gedeeld portrait/landscape) ---
  type FillKind = 'none' | 'gradient' | 'success' | 'warning';
  function computeGoalView(): { heroLabel: string | null; heroText: string; subLabel: string | null; subtitle: ReactNode; fillPct: number; fillKind: FillKind } {
    const goalType = goal?.type ?? null;
    // Eyebrow-labels maken het hero-getal ondubbelzinnig: bij een doel telt de hero
    // AF (resterend), zonder label leest dat verkeerd (audit F3). Defaults = geen doel.
    let heroLabel: string | null = 'Totale tijd';
    let heroText = formattedTimer;
    let subLabel: string | null = 'Totale afstand';
    let subtitle: ReactNode = null;
    let fillPct = 0;
    let fillKind: FillKind = 'none';

    // Subtitle-rij voor duration/distance: verstreken waarde · divider · "{n}%" (floor).
    const progressRow = (left: string, p: number) => (
      <View style={activeStyles.subtitleRow}>
        <Text style={activeStyles.subtitleText}>{left}</Text>
        <View style={activeStyles.subtitleDivider} />
        <Text style={activeStyles.subtitleText}>{`${Math.floor(p * 100)}%`}</Text>
      </View>
    );

    switch (goalType) {
      case 'duration': {
        const target = goal!.target;
        fillPct = target > 0 ? Math.min(1, seconds / target) : 0;
        fillKind = 'gradient';
        heroLabel = 'Resterende tijd';
        heroText = formatTimer(Math.max(0, target - seconds));
        subLabel = 'Afgelegd';
        subtitle = progressRow(formatTimer(seconds), fillPct);
        break;
      }
      case 'distance': {
        const target = goal!.target;
        fillPct = target > 0 ? Math.min(1, distanceMeters / target) : 0;
        fillKind = 'gradient';
        heroLabel = 'Resterende afstand';
        heroText = formatMetersDotted(Math.max(0, target - distanceMeters));
        subLabel = 'Afgelegd';
        subtitle = progressRow(`${formatMetersDotted(distanceMeters)}m`, fillPct);
        break;
      }
      case 'split': {
        heroLabel = 'Huidige split 500/m';
        subLabel = null;
        heroText = formatSplit(splitSeconds, true);
        fillPct = 1;
        fillKind = splitSeconds > 0 && splitSeconds <= goal!.target ? 'success' : 'warning';
        let sub = 'Begin met roeien...';
        if (splitSeconds !== 0) {
          const diff = goal!.target - splitSeconds;
          const absDiff = Math.abs(Math.round(diff));
          sub = diff >= 0 ? `Je bent ${absDiff} seconden sneller` : `Je bent ${absDiff} seconden trager`;
        }
        subtitle = <Text style={activeStyles.subtitleText}>{sub}</Text>;
        break;
      }
      case 'watts': {
        heroLabel = 'Huidige kracht';
        subLabel = null;
        heroText = `${watts} W`;
        fillPct = 1;
        fillKind = watts >= goal!.target ? 'success' : 'warning';
        let sub = 'Begin met roeien...';
        if (watts !== 0) {
          const diff = watts - goal!.target;
          const absDiff = Math.abs(Math.round(diff));
          sub = diff >= 0 ? `Je levert ${absDiff} W meer` : `Je levert ${absDiff} W minder dan je doel`;
        }
        subtitle = <Text style={activeStyles.subtitleText}>{sub}</Text>;
        break;
      }
      default:
        // Geen doel: hero = verstreken tijd, subtitle = verstreken afstand.
        heroText = formattedTimer;
        subtitle = <Text style={activeStyles.subtitleText}>{`${formatMetersDotted(distanceMeters)}m`}</Text>;
    }
    return { heroLabel, heroText, subLabel, subtitle, fillPct, fillKind };
  }

  // --- Hero-content: eyebrow-label + hero-getal, dan eyebrow-label + subtitle.
  // Gedeeld portrait/landscape (Figma Main KPI: gap 40 tussen groepen, gap 8 binnen).
  // Split/watts hebben geen subtitle-eyebrow (subLabel = null) → enkel coaching-tekst. ---
  function renderHeroContent(gv: ReturnType<typeof computeGoalView>): ReactNode {
    return (
      <>
        <View style={activeStyles.heroGroup}>
          {gv.heroLabel != null && <Text style={activeStyles.heroLabel}>{gv.heroLabel}</Text>}
          <Text style={activeStyles.heroText}>{gv.heroText}</Text>
        </View>
        <View style={activeStyles.heroGroup}>
          {gv.subLabel != null && <Text style={activeStyles.heroLabel}>{gv.subLabel}</Text>}
          {gv.subtitle}
        </View>
      </>
    );
  }

  // --- Header-inhoud: DOEL-pill + compacte Stop-knop (gedeeld) ---
  // De accent-tint zit op de header-band (Figma 290:2746) → de DOEL-pill is
  // outline-only, in beide oriëntaties.
  function headerChildren(): ReactNode {
    return (
      <>
        <View style={activeStyles.doelPill}>
          <Text style={activeStyles.doelPillLabel}>DOEL</Text>
          <View style={activeStyles.doelPillDivider} />
          <Text style={activeStyles.doelPillValue}>{goalPillValue()}</Text>
        </View>
        <Button
          title="Stop"
          variant="primary"
          size="md"
          icon="arrow-forward"
          iconPosition="trailing"
          onPress={onStop}
        />
      </>
    );
  }

  // --- Progress-fill: gradient (duration/distance) of solid success/warning (split/watts) ---
  function barFillInner(fillKind: FillKind, vertical: boolean): ReactNode {
    if (fillKind === 'gradient') {
      return (
        <LinearGradient
          colors={[buttonTokens.primary.gradientFrom, buttonTokens.primary.gradientTo]}
          start={vertical ? { x: 0, y: 1 } : { x: 0, y: 0 }}
          end={vertical ? { x: 0, y: 0 } : { x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
        />
      );
    }
    const color = fillKind === 'success' ? progressBar.successFill : progressBar.warningFill;
    return <View style={[StyleSheet.absoluteFill, { backgroundColor: color }]} />;
  }

  // --- Progress-bar horizontaal (portrait): full-bleed 4px tussen hero-paneel en KPI-lijst ---
  function renderProgressBarH(fillPct: number, fillKind: FillKind): ReactNode {
    return (
      <View style={activeStyles.barTrackH}>
        {fillKind !== 'none' && fillPct > 0 && (
          <View style={[activeStyles.barFillH, { width: `${Math.min(fillPct * 100, 100)}%` }]}>
            {barFillInner(fillKind, false)}
          </View>
        )}
      </View>
    );
  }

  // --- Progress-bar verticaal (landscape): 4px op de kolomscheiding, vult onder→boven ---
  function renderProgressBarV(fillPct: number, fillKind: FillKind): ReactNode {
    return (
      <View style={landscapeStyles.barTrackV}>
        {fillKind !== 'none' && fillPct > 0 && (
          <View style={[landscapeStyles.barFillV, { height: `${Math.min(fillPct * 100, 100)}%` }]}>
            {barFillInner(fillKind, true)}
          </View>
        )}
      </View>
    );
  }

  // --- KPI-lijst: flatte rijen met hairline-divider (gedeeld; fill=true → landscape) ---
  type KPIKey = 'SPLIT' | 'WATT' | 'SPM' | 'BPM' | 'AFSTAND' | 'TIJD' | 'KCAL';
  function renderKpiList(fill: boolean): ReactNode {
    const goalType = goal?.type ?? null;

    let kpiOrder: KPIKey[];
    switch (goalType) {
      case 'distance':
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'TIJD', 'KCAL'];
        break;
      case 'duration':
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      case 'split':
        kpiOrder = ['WATT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      case 'watts':
        kpiOrder = ['SPLIT', 'TIJD', 'SPM', 'BPM', 'AFSTAND', 'KCAL'];
        break;
      default:
        // Geen doel: totale afstand staat al als hero-subtitle → niet dubbel in de lijst.
        kpiOrder = ['SPLIT', 'WATT', 'SPM', 'BPM', 'KCAL'];
    }

    // Natuurlijke casing (design): labels niet uppercase; SPM/BPM blijven acroniemen.
    function kpiLabel(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return 'Split 500/m';
        case 'WATT': return 'Watt';
        case 'SPM': return 'SPM';
        case 'BPM': return 'BPM';
        case 'AFSTAND': return 'Totaal afstand';
        case 'TIJD': return 'Tijd';
        case 'KCAL': return 'Totaal Kcal';
      }
    }

    // Waarden zonder redundante unit (het label draagt de eenheid); Afstand houdt "m".
    function kpiValue(key: KPIKey): string {
      switch (key) {
        case 'SPLIT': return formatSplit(avgSplit, true);
        case 'WATT': return `${avgWatts}`;
        case 'SPM': return `${correctSpm(avgSpm, spmHalved)}`;
        case 'BPM': return hrBpm != null && hrBpm > 0 ? `${hrBpm}` : '—';
        case 'AFSTAND': return `${formatMetersDotted(distanceMeters)}m`;
        case 'TIJD': return formattedTimer;
        case 'KCAL': return `${Math.round(calories)}${hasProfileWeight ? '' : '*'}`;
      }
    }

    return (
      <>
        {kpiOrder.map((key, i) => {
          const rowStyle = [
            activeStyles.kpiRow,
            fill ? activeStyles.kpiRowFill : activeStyles.kpiRowFixed,
            i < kpiOrder.length - 1 && activeStyles.kpiRowDivider,
          ];
          if (key === 'BPM') {
            return (
              <TouchableOpacity key="BPM" style={rowStyle} onPress={startHRScan} activeOpacity={0.8}>
                <Text style={activeStyles.kpiLabel}>BPM</Text>
                {hrStatus === 'scanning' ? (
                  <ActivityIndicator size="small" color={fg.secondary} />
                ) : (
                  <Text style={activeStyles.kpiValue}>{kpiValue('BPM')}</Text>
                )}
              </TouchableOpacity>
            );
          }
          return (
            <View key={key} style={rowStyle}>
              <Text style={activeStyles.kpiLabel}>{kpiLabel(key)}</Text>
              <Text style={activeStyles.kpiValue}>{kpiValue(key)}</Text>
            </View>
          );
        })}
      </>
    );
  }

  // --- Portrait layout ---
  function renderPortrait(): ReactNode {
    const gv = computeGoalView();
    return (
      <View style={portraitStyles.root}>
        {/* Header: DOEL-pill links, compacte Stop-knop rechts */}
        <View
          style={[
            activeStyles.header,
            {
              paddingTop: Math.max(space['28'], insets.top),
              paddingBottom: space['28'],
              paddingHorizontal: padH,
            },
          ]}
        >
          {headerChildren()}
        </View>

        {/* Hero-paneel (bg.elevated), vult de vrije ruimte, content gecentreerd */}
        <View style={[activeStyles.heroPanel, portraitStyles.heroPanel]}>
          {renderHeroContent(gv)}
        </View>

        {/* Progress-bar: full-bleed 4px tussen paneel en KPI-lijst */}
        {renderProgressBarH(gv.fillPct, gv.fillKind)}

        {/* KPI-lijst: flatte rijen */}
        <View
          style={[
            portraitStyles.kpiGrid,
            { paddingHorizontal: padH, paddingBottom: Math.max(space['8'], insets.bottom) },
          ]}
        >
          {renderKpiList(false)}
        </View>
      </View>
    );
  }

  // Full-bleed secties: de container draagt geen horizontale padding meer. Elke
  // sectie (header, KPI-grid) regelt zelf zijn padding + safe-area, zodat het
  // hero-paneel (bg.elevated) en de progress-bar tot de schermrand lopen.
  // padH is symmetrisch (max van beide insets) zodat het 50/50-blok gecentreerd
  // blijft i.p.v. weggeduwd door de notch aan één kant.
  const padH = Math.max(layout.screenHorizontal, insets.left, insets.right);

  return (
    <View style={[styles.container, { paddingHorizontal: 0 }]}>
      {/* Milestone overlay */}
      <MilestoneOverlay message={milestoneMsg} onDismiss={dismissMilestone} />

      {/* Connection status overlay */}
      {isConnecting && (
        <View style={[styles.connectionOverlay, { paddingHorizontal: padH }]}>
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
            // Twee gelijke kolommen met een 4px verticale progress-bar ertussen.
            const next = (e.nativeEvent.layout.width - 4) / 2;
            setLandColWidth(prev => (prev != null && Math.abs(prev - next) < 0.5 ? prev : next));
          }}
        >
          {(() => {
            const gv = computeGoalView();
            return (
              <>
                {/* Links: header (pill + Stop) boven de KPI-lijst (Figma 290:2746) */}
                <View style={[landscapeStyles.metricsCol, landColStyle]}>
                  <View
                    style={[
                      activeStyles.header,
                      {
                        paddingTop: Math.max(space['20'], insets.top),
                        paddingBottom: space['20'],
                        paddingLeft: Math.max(space['20'], insets.left),
                        // Binnenrand naar de progress-bar: 40 (design 290:2746) — geeft de bar ruimte.
                        paddingRight: space['40'],
                      },
                    ]}
                  >
                    {headerChildren()}
                  </View>
                  <View
                    style={[
                      landscapeStyles.kpiList,
                      {
                        paddingLeft: Math.max(space['20'], insets.left),
                        paddingBottom: Math.max(space['8'], insets.bottom),
                      },
                    ]}
                  >
                    {renderKpiList(true)}
                  </View>
                </View>

                {/* Verticale progress-bar op de kolomscheiding */}
                {renderProgressBarV(gv.fillPct, gv.fillKind)}

                {/* Rechts: hero-paneel (bg.elevated) */}
                <View style={[activeStyles.heroPanel, landColStyle, { paddingLeft: space['40'], paddingRight: Math.max(space['20'], insets.right) }]}>
                  {renderHeroContent(gv)}
                </View>
              </>
            );
          })()}
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
  // Header: DOEL-pill links, compacte Stop-knop rechts (top-uitgelijnd).
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space['16'],
    // Accent-band (Figma 290:2746): subtiele accent-tint via accent.muted (12%). De
    // Figma-waarde is 10%, bewust samengevouwen met muted — 2% delta is op donkere bg
    // niet waarneembaar (beslissing 2026-07-14). Sterkere onderrand (border/strong,
    // i.t.t. de border/default hairlines van de KPI-rijen). Gedeeld portrait + landscape.
    backgroundColor: accent.muted,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.strong,
  },
  // DOEL-pill: pill-vorm, hoogte 48, outline-only (de accent-tint zit op de band).
  doelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: accent.muted,
    paddingHorizontal: space['20'],
    gap: space['16'],
  },
  doelPillLabel: {
    fontFamily: fontFamily.albertSansSemiBold,
    fontSize: fontSize['14'],
    letterSpacing: 2.8, // 20% van 14
    color: fg.onAccent,
  },
  doelPillDivider: {
    width: 1,
    height: 16,
    borderRadius: 8,
    backgroundColor: fg.secondary,
  },
  doelPillValue: {
    fontFamily: fontFamily.albertSansRegular,
    fontSize: fontSize['18'],
    letterSpacing: -0.45, // -2.5% van 18
    color: accent.default,
  },
  // Hero-paneel (bg.elevated); flex/stretch worden per oriëntatie toegevoegd.
  heroPanel: {
    backgroundColor: bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['40'],
  },
  // Hero- en subtitle-groep: eyebrow-label boven zijn waarde (Figma Frame 130/132, gap 8).
  heroGroup: {
    alignItems: 'center',
    gap: space['8'],
  },
  // Eyebrow-label boven hero-getal én subtitle: Albert Sans SemiBold 16, 20% tracking, UPPER.
  heroLabel: {
    fontFamily: fontFamily.albertSansSemiBold,
    fontSize: fontSize['16'],
    letterSpacing: 3.2, // 20% van 16
    textTransform: 'uppercase',
    color: fg.onAccent,
  },
  heroText: {
    // Hero-cijfer via de heroNumeric-typeStyle (Albert Sans Bold 114, ls -5.13).
    // Token herbestemd in Tokens Studio 2026-07-14 (was Source Serif 96).
    ...typeStyles.heroNumeric,
    color: fg.onAccent,
  },
  subtitleText: {
    fontFamily: fontFamily.albertSansLight,
    fontSize: fontSize['36'],
    letterSpacing: -0.9, // -2.5% van 36
    color: fg.primary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['20'],
  },
  subtitleDivider: {
    width: 2,
    height: 36,
    borderRadius: 8,
    backgroundColor: fg.tertiary,
  },
  // Progress-bar horizontaal (portrait): full-bleed 4px.
  barTrackH: {
    alignSelf: 'stretch',
    height: 4,
    backgroundColor: progressBar.trackColor,
    overflow: 'hidden',
  },
  barFillH: {
    height: 4,
  },
  // KPI flat-rijen (gedeeld portrait/landscape).
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kpiRowFixed: {
    height: 56,
  },
  kpiRowFill: {
    flex: 1,
    minHeight: 44,
  },
  kpiRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: border.default,
  },
  kpiLabel: {
    fontFamily: fontFamily.albertSansLight,
    fontSize: fontSize['22'],
    letterSpacing: 1.1, // 5% van 22
    color: fg.secondary,
  },
  kpiValue: {
    fontFamily: fontFamily.albertSansMedium,
    fontSize: fontSize['28'],
    letterSpacing: -0.7, // -2.5% van 28
    color: fg.primary,
  },
});

const portraitStyles = StyleSheet.create({
  root: {
    flex: 1,
  },
  // Hero-paneel vult de vrije verticale ruimte en spant de volle breedte.
  heroPanel: {
    flex: 1,
    alignSelf: 'stretch',
  },
  kpiGrid: {
    paddingTop: space['8'],
  },
});

const landscapeStyles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  // Eerste-frame fallback vóór de breedte-meting (zie landColStyle in de component):
  // een definitieve, gemeten kolombreedte die geen enkele engine content-kan-sizen.
  colGrow: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
  },
  // Metrics-kolom (header + KPI-lijst) — links (Figma 290:2746).
  metricsCol: {
    minWidth: 0,
  },
  kpiList: {
    flex: 1,
    // paddingLeft (buitenrand) + paddingBottom worden inline safe-area-aware gezet: de
    // Dynamic Island/notch zit in landscape aan de zijkant, de home-indicator onderaan.
    // paddingRight grenst aan de progress-bar (midden) → 40 (design 290:2746), geeft de bar ruimte.
    paddingRight: space['40'],
  },
  // Verticale progress-bar op de kolomscheiding; fill onderaan verankerd (onder→boven).
  barTrackV: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: progressBar.trackColor,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFillV: {
    width: 4,
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
    backgroundColor: border.strong,
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
    borderWidth: 1,
    borderColor: border.default,
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
