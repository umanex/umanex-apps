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
import { BottomFade, Button, EmptyState, KpiSingle, TabItem } from '@/components';
import { formatTimerFull, formatDistanceDynamic, formatSplit, formatDateTitle } from '@/lib/formatters';
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

  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState<DetailTab>('Overzicht');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('workouts')
        .select('id, started_at, duration_seconds, distance_meters, avg_watts, avg_spm, avg_split_seconds, calories, max_watts, max_spm, best_split, avg_heart_rate, max_heart_rate, resistance_level, notes, goal_type, goal_target, goal_reached, splits, is_pr')
        .eq('id', id)
        .single();

      if (!cancelled) {
        setWorkout(data as WorkoutDetail | null);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [id]);

  const tabs = useMemo<DetailTab[]>(() => {
    const t: DetailTab[] = ['Overzicht', 'Splits'];
    if (workout?.avg_heart_rate != null || workout?.max_heart_rate != null) {
      t.push('Hartslag');
    }
    return t;
  }, [workout?.avg_heart_rate, workout?.max_heart_rate]);

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
          <Text style={styles.headerDate}>{formatDateTitle(workout.started_at)}</Text>
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
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <TabItem
            key={tab}
            label={tab}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

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
                  unit={workout.duration_seconds >= 3600 ? 'uur' : 'min'}
                  label="DUUR"
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={dist.value}
                  unit={dist.unit}
                  label="AFSTAND"
                  style={styles.kpiCell}
                />
              </View>
              <View style={styles.kpiGridRow}>
                <KpiSingle
                  value={workout.avg_split_seconds != null ? formatSplit(workout.avg_split_seconds) : '—'}
                  unit={workout.avg_split_seconds != null ? '/500m' : ''}
                  label={'GEMIDDELDE\nSPLIT'}
                  style={styles.kpiCell}
                />
                <KpiSingle
                  value={workout.avg_spm != null ? `${workout.avg_spm}` : '—'}
                  unit={workout.avg_spm != null ? 'spm' : ''}
                  label={'GEMIDDELDE\nSPM'}
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
                  { label: 'SPLIT /500M', gem: workout.avg_split_seconds != null ? formatSplit(workout.avg_split_seconds) : '—', piek: workout.best_split != null ? formatSplit(workout.best_split) : '—' },
                  { label: 'WATT', gem: workout.avg_watts != null ? `${workout.avg_watts}` : '—', piek: workout.max_watts != null ? `${workout.max_watts}` : '—' },
                  { label: 'SPM', gem: workout.avg_spm != null ? `${workout.avg_spm}` : '—', piek: workout.max_spm != null ? `${workout.max_spm}` : '—' },
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

          </>
        )}

        {/* Splits tab */}
        {activeTab === 'Splits' && (
          workout.splits && workout.splits.length > 0 ? (
            <View style={styles.splitsTable}>
              <View style={styles.splitsHeaderRow}>
                <View style={styles.splitsLabelCol} />
                <Text style={styles.splitsColHeader}>SPLIT</Text>
                <Text style={styles.splitsColHeader}>WATT</Text>
              </View>
              {workout.splits.map((s, i) => (
                <View key={i}>
                  <View style={styles.splitsDataRow}>
                    <Text style={styles.splitsDistLabel}>{`${s.distance}M`}</Text>
                    <Text style={styles.splitsValue}>{formatSplit(s.split)}</Text>
                    <Text style={styles.splitsValue}>{s.watts != null ? `${s.watts}` : '—'}</Text>
                  </View>
                  {i < (workout.splits?.length ?? 0) - 1 && <View style={styles.splitsRowDivider} />}
                </View>
              ))}
            </View>
          ) : (
            <EmptyState icon="time-outline" title="Geen splits beschikbaar." />
          )
        )}

        {/* Hartslag tab */}
        {activeTab === 'Hartslag' && (
          <View style={styles.kpiContainer}>
            <View style={styles.kpiGridRow}>
              <KpiSingle
                value={workout.avg_heart_rate != null ? `${workout.avg_heart_rate}` : '—'}
                unit={workout.avg_heart_rate != null ? 'bpm' : ''}
                label={'BPM\nGEMIDDELD'}
                style={styles.kpiCell}
              />
              <KpiSingle
                value={workout.max_heart_rate != null ? `${workout.max_heart_rate}` : '—'}
                unit={workout.max_heart_rate != null ? 'bpm' : ''}
                label={'BPM\nMAXIMAAL'}
                style={styles.kpiCell}
              />
            </View>
          </View>
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
    paddingTop: space['16'],
    paddingBottom: space['12'],
    gap: space['0'],
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerDate: {
    flex: 1,
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

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.strong,
    borderRadius: radii.xs,
    padding: space['4'],
    marginHorizontal: space['20'],
    marginBottom: space['16'],
  },

  // Scroll content
  content: {
    flexGrow: 1,
    paddingHorizontal: space['20'],
    paddingBottom: space['40'],
    gap: space['20'],
  },

  // 2×2 KPI container (Overzicht + Hartslag tabs) — full-width stripe
  kpiContainer: {
    backgroundColor: bg.raised,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: border.default,
    marginHorizontal: -space['20'],
    paddingHorizontal: space['20'],
  },
  kpiGridRow: {
    flexDirection: 'row',
    paddingVertical: space['20'],
  },
  kpiGridRowBordered: {
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
  },
  kpiCell: {
    flex: 1,
    paddingHorizontal: space['4'],
  },

  // Stats table (GEM/PIEK)
  statsSection: {
    gap: space['8'],
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

  // Splits table
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
    paddingLeft: space['16'],
    paddingVertical: space['8'],
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
