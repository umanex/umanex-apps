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
import { Button, EmptyState, Segment } from '@/components';
import { formatDuration, formatDistanceDynamic, formatSplit, formatDateTitle } from '@/lib/formatters';
import {
  bg,
  fg,
  accent,
  border,
  space,
  typeStyles,
  fontFamily,
  fontSize,
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
        <View style={styles.header}>
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={accent.default} />
        </TouchableOpacity>
        <Text style={styles.headerDate}>{formatDateTitle(workout.started_at)}</Text>
        {workout.is_pr && (
          <View style={styles.prBadge}>
            <Text style={styles.prBadgeEmoji}>🏅</Text>
            <Text style={styles.prBadgeText}>PR</Text>
          </View>
        )}
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {tabs.map(tab => (
          <Segment
            key={tab}
            label={tab}
            active={activeTab === tab}
            onPress={() => setActiveTab(tab)}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Overzicht tab */}
        {activeTab === 'Overzicht' && (
          <>
            <View style={styles.kpiRow}>
              {(() => {
                const dist = formatDistanceDynamic(workout.distance_meters);
                const h = Math.floor(workout.duration_seconds / 3600);
                const m = Math.floor((workout.duration_seconds % 3600) / 60);
                const durVal = h > 0 ? `${h}u${m > 0 ? ` ${m}` : ''}` : `${m}`;
                const durUnit = h > 0 ? '' : 'min';
                return (
                  <>
                    <View style={styles.kpiCell}>
                      <View style={styles.kpiValueRow}>
                        <Text style={styles.kpiNumber}>{dist.value}</Text>
                        <Text style={styles.kpiUnit}>{dist.unit}</Text>
                      </View>
                      <Text style={styles.kpiCellLabel}>{'MAX.\nAFSTAND'}</Text>
                    </View>
                    <View style={styles.kpiCell}>
                      <View style={styles.kpiValueRow}>
                        <Text style={styles.kpiNumber}>{durVal}</Text>
                        {!!durUnit && <Text style={styles.kpiUnit}>{durUnit}</Text>}
                      </View>
                      <Text style={styles.kpiCellLabel}>{'LANGSTE\nDUUR'}</Text>
                    </View>
                    <View style={styles.kpiCell}>
                      <View style={styles.kpiValueRow}>
                        <Text style={styles.kpiNumber}>{workout.best_split != null ? formatSplit(workout.best_split) : '—'}</Text>
                        {workout.best_split != null && <Text style={styles.kpiUnit}>/500m</Text>}
                      </View>
                      <Text style={styles.kpiCellLabel}>{'SNELSTE\nSPLIT'}</Text>
                    </View>
                  </>
                );
              })()}
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsSection}>
              <View style={styles.statsHeader}>
                <View style={styles.statsLabelCol} />
                <Text style={styles.statsColLabel}>GEM</Text>
                <Text style={styles.statsColLabel}>PIEK</Text>
              </View>
              <View style={styles.statsTable}>
                {[
                  { label: 'SPLIT 500/M', gem: workout.avg_split_seconds != null ? formatSplit(workout.avg_split_seconds) : '—', piek: workout.best_split != null ? formatSplit(workout.best_split) : '—' },
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
          <View style={styles.kpiTilesRow}>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiTileLabel}>GEM</Text>
              <Text style={styles.kpiTileValue}>{workout.avg_heart_rate != null ? `${workout.avg_heart_rate}` : '—'}</Text>
            </View>
            <View style={styles.kpiTile}>
              <Text style={styles.kpiTileLabel}>PIEK</Text>
              <Text style={styles.kpiTileValue}>{workout.max_heart_rate != null ? `${workout.max_heart_rate}` : '—'}</Text>
            </View>
          </View>
        )}

        <Button
          title="Training verwijderen"
          variant="primary"
          onPress={confirmDelete}
          loading={deleting}
          disabled={deleting}
          size="lg"
        />
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space['20'],
    paddingVertical: space['12'],
    gap: space['12'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDate: {
    flex: 1,
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['4'],
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: componentRadius.cardSm,
    paddingHorizontal: space['10'],
    paddingVertical: space['4'],
  },
  prBadgeEmoji: {
    fontSize: fontSize['12'],
  },
  prBadgeText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['11'],
    color: '#FFD700',
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: 10,
    padding: 4,
    marginHorizontal: space['20'],
    marginBottom: space['16'],
  },

  // Scroll content
  content: {
    paddingHorizontal: space['20'],
    paddingBottom: space['40'],
    gap: space['20'],
  },

  // KPI inline row (Overzicht tab)
  kpiRow: {
    flexDirection: 'row',
    gap: space['8'],
  },
  kpiCell: {
    flex: 1,
    gap: space['8'],
  },
  kpiValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    overflow: 'hidden',
  },
  kpiNumber: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  kpiUnit: {
    fontFamily: fontFamily.newsreaderItalic,
    fontSize: fontSize['16'],
    lineHeight: fontSize['16'] * 1.3,
    color: fg.secondary,
  },
  kpiCellLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },

  // KPI tiles (Hartslag tab)
  kpiTilesRow: {
    flexDirection: 'row',
    gap: space['20'],
  },
  kpiTile: {
    flex: 1,
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: space['24'],
    paddingBottom: space['16'],
    paddingHorizontal: space['16'],
    gap: space['8'],
  },
  kpiTileLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  kpiTileValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['22'],
    color: fg.primary,
    textAlign: 'center',
  },
  kpiTileUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: fg.secondary,
  },

  // Divider
  statsDivider: {
    height: 1,
    backgroundColor: border.default,
  },

  // Stats table (GEM/PIEK)
  statsSection: {
    gap: space['8'],
  },
  statsHeader: {
    flexDirection: 'row',
    paddingLeft: space['16'],
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
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
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
    color: fg.tertiary,
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
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    overflow: 'hidden',
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
    color: fg.tertiary,
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
