import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import { BottomFade, Button, EmptyState, ErrorState, KpiSingle, Segmented } from '@/components';
import { formatTimerFull, formatDistanceDynamic, formatSplit, formatDateTitle, correctSpm } from '@/lib/formatters';
import { useSpmHalved } from '@/lib/hooks/useSpmHalved';
import { samplesFromTuples } from '@/lib/bestDistanceTime';
import { segmentSplitTimes, fastestSplit, averageSplit, distanceSplits, segmentHeartRates } from '@/lib/workoutSegments';
import {
  bg,
  fg,
  accent,
  achievement,
  border,
  neutral,
  space,
  radii,
  typeStyles,
  componentRadius,
} from '@/constants';
import type { WorkoutDetail } from '@/types/workout';

type DetailTab = 'Overzicht' | 'Splits' | 'Hartslag';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const spmHalved = useSpmHalved();

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('Overzicht');

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const { data, error: queryError } = await supabase
      .from('workouts')
      .select('id, started_at, duration_seconds, distance_meters, avg_watts, avg_spm, avg_split_seconds, calories, max_watts, max_spm, best_split, avg_heart_rate, max_heart_rate, resistance_level, notes, goal_type, goal_target, goal_reached, splits, is_pr, samples, total_strokes')
      .eq('id', id)
      .single();

    // PGRST116 = 0 rijen (verwijderd of RLS-gefilterd) → "niet gevonden", geen fout.
    // Elke andere fout is een echte lees-/netwerkfout (security-audit P2-2).
    if (queryError && queryError.code !== 'PGRST116') {
      reportError(queryError, { where: 'detail.load', id });
      setError(true);
    } else {
      setWorkout((data as WorkoutDetail | null) ?? null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const tabs = useMemo<DetailTab[]>(() => {
    const t: DetailTab[] = ['Overzicht', 'Splits'];
    if (workout?.avg_heart_rate != null || workout?.max_heart_rate != null) {
      t.push('Hartslag');
    }
    return t;
  }, [workout?.avg_heart_rate, workout?.max_heart_rate]);

  // Afgeleide per-segment data uit de {t,d,hr}-samplereeks. Tienden waar de data
  // het toelaat; lege arrays / null → de UI valt terug op opgeslagen integers.
  const samples = useMemo(() => samplesFromTuples(workout?.samples ?? null), [workout?.samples]);
  const splitTenthsByDist = useMemo(() => {
    const m = new Map<number, number>();
    for (const s of segmentSplitTimes(samples, 500)) m.set(s.distance, s.seconds);
    return m;
  }, [samples]);
  const avgSplitSec = useMemo(
    () => (workout ? averageSplit(workout.duration_seconds, workout.distance_meters) : null),
    [workout?.duration_seconds, workout?.distance_meters, workout],
  );
  const fastestSplitSec = useMemo(() => fastestSplit(samples, 500), [samples]);
  const distSplits = useMemo(
    () => (workout ? distanceSplits(samples, workout.duration_seconds, workout.distance_meters) : []),
    [samples, workout],
  );
  const hrSegments = useMemo(() => segmentHeartRates(samples, 500), [samples]);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    setDeleting(false);
    if (error) {
      Alert.alert('Fout', 'Verwijderen mislukt. Probeer opnieuw.');
    } else {
      router.back();
    }
  }, [id, router]);

  const confirmDelete = useCallback(() => {
    Alert.alert(
      'Training verwijderen',
      'Ben je zeker dat je deze training wil verwijderen? Dit kan niet ongedaan gemaakt worden.',
      [
        { text: 'Annuleren', style: 'cancel' },
        { text: 'Verwijderen', style: 'destructive', onPress: handleDelete },
      ],
    );
  }, [handleDelete]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator color={accent.default} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFoundHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={accent.default} />
          </TouchableOpacity>
        </View>
        <ErrorState onRetry={load} size="lg" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.notFoundHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={accent.default} />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Workout niet gevonden"
          size="lg"
        />
      </View>
    );
  }

  const dist = formatDistanceDynamic(workout.distance_meters);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerDate}>{formatDateTitle(workout.started_at)}</Text>
          </TouchableOpacity>
          {workout.is_pr && (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeEmoji}>🏅</Text>
              <Text style={styles.prBadgeText}>PR</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.backLink}>
          <Ionicons name="arrow-back" size={14} color={accent.default} />
          <Text style={styles.backLinkText}>OVERZICHT</Text>
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <Segmented
        variant="band"
        style={styles.tabBar}
        options={tabs.map((tab) => ({ value: tab, label: tab }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      <View style={styles.scrollWrap}>
        <ScrollView contentContainerStyle={styles.content}>
        {/* Overzicht tab */}
        {activeTab === 'Overzicht' && (
          <>
            {/* 2×2 KPI container */}
            <View style={styles.kpiContainer}>
              <View style={[styles.kpiGridRow, styles.kpiGridRowBordered]}>
                <KpiSingle
                  value={formatTimerFull(workout.duration_seconds)}
                  label={'TOTALE\nDUUR'}
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={dist.value}
                  unit={dist.unit}
                  label={'TOTALE\nAFSTAND'}
                  style={styles.kpiCell}
                />
              </View>
              <View style={styles.kpiGridRow}>
                <KpiSingle
                  value={workout.calories != null ? `${workout.calories}` : '—'}
                  unit={workout.calories != null ? 'kcal' : ''}
                  label={'TOTALE\nENERGIE'}
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={workout.total_strokes != null ? `${correctSpm(workout.total_strokes, spmHalved)}` : '—'}
                  unit=""
                  label={'TOTALE\nSLAGEN'}
                  style={styles.kpiCell}
                />
              </View>
            </View>

            {/* Stats table GEM/PIEK */}
            <View style={styles.statsSection}>
              <View style={styles.statsHeader}>
                <View style={styles.statsLabelCol} />
                <Text style={styles.statsColLabel}>GEM</Text>
                <Text style={styles.statsColLabel}>PIEK</Text>
              </View>
              <View style={styles.statsTable}>
                {[
                  { label: 'WATT', gem: workout.avg_watts != null ? `${workout.avg_watts}` : '—', piek: workout.max_watts != null ? `${workout.max_watts}` : '—' },
                  { label: 'SPM', gem: workout.avg_spm != null ? `${correctSpm(workout.avg_spm, spmHalved)}` : '—', piek: workout.max_spm != null ? `${correctSpm(workout.max_spm, spmHalved)}` : '—' },
                  { label: 'BPM', gem: workout.avg_heart_rate != null ? `${workout.avg_heart_rate}` : '—', piek: workout.max_heart_rate != null ? `${workout.max_heart_rate}` : '—' },
                ].map((row, i, arr) => (
                  <View key={row.label}>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsRowLabel}>{row.label}</Text>
                      <Text style={styles.statsRowValue}>{row.gem}</Text>
                      <Text style={styles.statsRowValue}>{row.piek}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.statsRowDivider} />}
                  </View>
                ))}
              </View>
            </View>

            {/* Afstand-splits GEM/BEST (500/1000/2000m, tienden uit samples) */}
            <View style={styles.statsSection}>
              <View style={styles.statsHeader}>
                <View style={styles.statsLabelCol} />
                <Text style={styles.statsColLabel}>GEM</Text>
                <Text style={styles.statsColLabel}>BEST</Text>
              </View>
              <View style={styles.statsTable}>
                {distSplits.map((row, i, arr) => (
                  <View key={row.meters}>
                    <View style={styles.statsRow}>
                      <Text style={styles.statsRowLabel}>{`${row.meters}M`}</Text>
                      <Text style={styles.statsRowValue}>{row.gem != null ? formatSplit(row.gem, false, true) : '—'}</Text>
                      <Text style={styles.statsRowValue}>{row.best != null ? formatSplit(row.best, false, true) : '—'}</Text>
                    </View>
                    {i < arr.length - 1 && <View style={styles.statsRowDivider} />}
                  </View>
                ))}
              </View>
            </View>

          </>
        )}

        {/* Splits tab */}
        {activeTab === 'Splits' && (
          <>
            {/* KPI: gemiddelde + snelste split (tienden waar afleidbaar) */}
            <View style={styles.kpiContainer}>
              <View style={styles.kpiGridRow}>
                <KpiSingle
                  value={
                    avgSplitSec != null ? formatSplit(avgSplitSec, false, true)
                    : workout.avg_split_seconds != null ? formatSplit(workout.avg_split_seconds)
                    : '—'
                  }
                  unit={avgSplitSec != null || workout.avg_split_seconds != null ? '/500m' : ''}
                  label={'GEMIDDELDE\nSPLIT'}
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={
                    fastestSplitSec != null ? formatSplit(fastestSplitSec, false, true)
                    : workout.best_split != null ? formatSplit(workout.best_split)
                    : '—'
                  }
                  unit={fastestSplitSec != null || workout.best_split != null ? '/500m' : ''}
                  label={'SNELSTE\nSPLIT'}
                  style={styles.kpiCell}
                />
              </View>
            </View>

            {workout.splits && workout.splits.length > 0 ? (
              <View style={styles.splitsSection}>
                {/* Kolomheaders buiten de card, zoals op de andere tabs (Overzicht/Hartslag) */}
                <View style={styles.splitsHeaderRow}>
                  <View style={styles.splitsLabelCol} />
                  <Text style={styles.splitsColHeader}>SPLIT</Text>
                  <Text style={styles.splitsColHeader}>WATT</Text>
                </View>
                <View style={styles.splitsTable}>
                  {workout.splits.map((s, i) => {
                    const tenths = splitTenthsByDist.get(s.distance);
                    return (
                      <View key={i}>
                        <View style={styles.splitsDataRow}>
                          <Text style={styles.splitsDistLabel}>{`${s.distance}M`}</Text>
                          <Text style={styles.splitsValue}>
                            {tenths != null ? formatSplit(tenths, false, true) : formatSplit(s.split)}
                          </Text>
                          <Text style={styles.splitsValue}>{s.watts != null ? `${s.watts}` : '—'}</Text>
                        </View>
                        {i < (workout.splits?.length ?? 0) - 1 && <View style={styles.splitsRowDivider} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <EmptyState icon="time-outline" title="Geen splits beschikbaar." />
            )}
          </>
        )}

        {/* Hartslag tab */}
        {activeTab === 'Hartslag' && (
          <>
            <View style={styles.kpiContainer}>
              <View style={styles.kpiGridRow}>
                <KpiSingle
                  value={workout.avg_heart_rate != null ? `${workout.avg_heart_rate}` : '—'}
                  label={'BPM\nGEMIDDELD'}
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={workout.max_heart_rate != null ? `${workout.max_heart_rate}` : '—'}
                  label={'BPM\nMAXIMAAL'}
                  style={styles.kpiCell}
                />
              </View>
            </View>

            {hrSegments.length > 0 ? (
              <View style={styles.statsSection}>
                <View style={styles.statsHeader}>
                  <View style={styles.statsLabelCol} />
                  <Text style={styles.statsColLabel}>GEM</Text>
                  <Text style={styles.statsColLabel}>PIEK</Text>
                </View>
                <View style={styles.statsTable}>
                  {hrSegments.map((row, i, arr) => (
                    <View key={row.distance}>
                      <View style={styles.statsRow}>
                        <Text style={styles.statsRowLabel}>{`${row.distance}M`}</Text>
                        <Text style={styles.statsRowValue}>{row.gem != null ? `${row.gem}` : '—'}</Text>
                        <Text style={styles.statsRowValue}>{row.piek != null ? `${row.piek}` : '—'}</Text>
                      </View>
                      {i < arr.length - 1 && <View style={styles.statsRowDivider} />}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <EmptyState
                icon="pulse-outline"
                title="Geen hartslag-detail per segment. Beschikbaar vanaf je volgende training."
              />
            )}
          </>
        )}

        </ScrollView>
        {/* Fade: lange split-tabel vervaagt mooi richting de vaste knop/tabbar */}
        <BottomFade />
      </View>

      {/* Vaste verwijder-knop onderaan */}
      <View style={[styles.buttonSection, { paddingBottom: Math.max(space['20'], insets.bottom) }]}>
        <Button
          title="Training verwijderen"
          variant="outline"
          onPress={confirmDelete}
          loading={deleting}
          disabled={deleting}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: bg.base,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Not-found state header
  notFoundHeader: {
    paddingHorizontal: space['20'],
    paddingVertical: space['12'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Main header
  header: {
    paddingHorizontal: space['20'],
    paddingTop: space['28'],
    paddingBottom: space['0'],
    gap: space['0'],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerDate: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['4'],
    alignSelf: 'flex-start',
  },
  backLinkText: {
    ...typeStyles.labelGoalPrefix,
    color: accent.default,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['4'],
    backgroundColor: achievement.default,
    borderRadius: radii.full,
    paddingHorizontal: space['10'],
    paddingTop: space['4'],
    paddingBottom: space['2'],
  },
  prBadgeEmoji: {
    fontSize: 12,
  },
  prBadgeText: {
    ...typeStyles.italicConnector,
    color: neutral['600'],
  },

  // Tab bar — positionering; de band-visual (bg.elevated, top/bottom-divider, full-bleed)
  // zit in Segmented variant="band". 28 erboven, flush tegen de KPI Row eronder.
  tabBar: {
    marginTop: space['28'],
  },

  // Scroll content. Sectie-afstanden staan op marginBottom per blok (KPI-band 28 naar
  // de stats-tabellen, 20 tussen de tabellen) i.p.v. een uniforme gap.
  content: {
    flexGrow: 1,
    paddingHorizontal: space['20'],
    paddingBottom: space['40'],
  },

  // 2×2 KPI container (Overzicht + Hartslag tabs) — full-width stripe
  kpiContainer: {
    backgroundColor: bg.raised,
    borderBottomWidth: 1,
    borderColor: border.default,
    marginHorizontal: -space['20'],
    paddingHorizontal: space['20'],
    marginBottom: space['28'],
  },
  kpiGridRow: {
    flexDirection: 'row',
    paddingVertical: space['16'],
    gap: space['20'],
  },
  kpiGridRowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
  },
  kpiCell: {
    flex: 1,
  },

  // Stats table (GEM/PIEK). marginBottom = 20 tussen opeenvolgende tabellen.
  statsSection: {
    gap: space['8'],
    marginBottom: space['20'],
  },
  statsHeader: {
    flexDirection: 'row',
    paddingHorizontal: space['16'],
    paddingBottom: space['8'],
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
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: radii.sm,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space['16'],
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
    height: 1,
    backgroundColor: border.default,
  },

  // Splits table — kolomheaders staan buiten de card (zie splitsHeaderRow),
  // consistent met de stats-tabellen op de andere tabs.
  splitsSection: {
    gap: space['8'],
  },
  splitsTable: {
    backgroundColor: bg.raised,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: componentRadius.cardSm,
    overflow: 'hidden',
  },
  // Scrollbare content-zone (fade positioneert hier absoluut onderaan)
  scrollWrap: {
    flex: 1,
  },
  // Vaste verwijder-knop onder de scroll-zone
  buttonSection: {
    paddingHorizontal: space['20'],
    paddingTop: space['20'],
  },
  splitsHeaderRow: {
    flexDirection: 'row',
    paddingHorizontal: space['16'],
    paddingBottom: space['8'],
  },
  splitsLabelCol: {
    width: 165,
  },
  splitsColHeader: {
    flex: 1,
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  splitsDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space['16'],
    paddingVertical: space['16'],
  },
  splitsDistLabel: {
    width: 165,
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  splitsValue: {
    flex: 1,
    ...typeStyles.kpiValue,
    color: fg.primary,
  },
  splitsRowDivider: {
    height: 1,
    backgroundColor: border.default,
  },
});
