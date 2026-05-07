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
import { formatDuration, formatDistanceDynamic, formatSplit, formatDateLong } from '@/lib/formatters';
import {
  background,
  brand,
  text as textColors,
  fontFamily,
  fontSize,
  space,
  radii,
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
        <ActivityIndicator color={brand.primary} size="large" />
      </View>
    );
  }

  if (!workout) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="chevron-back" size={24} color={textColors.primary} />
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
          <Ionicons name="chevron-back" size={24} color={brand.primary} />
        </TouchableOpacity>
        <Text style={styles.headerDate}>{formatDateLong(workout.started_at)}</Text>
        {workout.is_pr && (
          <View style={styles.prBadge}>
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
            <View style={styles.kpiTilesRow}>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiTileLabel}>TIJD</Text>
                <Text style={styles.kpiTileValue}>{formatDuration(workout.duration_seconds)}</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiTileLabel}>AFSTAND</Text>
                <Text style={styles.kpiTileValue}>{formatDistanceDynamic(workout.distance_meters).value}</Text>
                <Text style={styles.kpiTileUnit}>{formatDistanceDynamic(workout.distance_meters).unit === 'm' ? 'meter' : 'km'}</Text>
              </View>
              <View style={styles.kpiTile}>
                <Text style={styles.kpiTileLabel}>KCAL</Text>
                <Text style={styles.kpiTileValue}>{workout.calories != null ? `${workout.calories}` : '—'}</Text>
              </View>
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
          icon="trash-outline"
          variant="ghost"
          onPress={confirmDelete}
          loading={deleting}
          disabled={deleting}
          size="md"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: background.base,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space['5'],
    paddingVertical: space['3'],
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDate: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['28'],
    color: textColors.primary,
  },
  prBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: radii.sm,
    paddingHorizontal: space['2'],
    paddingVertical: 4,
  },
  prBadgeText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['13'],
    color: '#FFD700',
    letterSpacing: 0.5,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: background.elevated,
    borderRadius: 12,
    padding: 4,
    marginHorizontal: space['5'],
    marginBottom: 16,
  },

  // Scroll content
  content: {
    paddingHorizontal: space['5'],
    paddingBottom: space['10'],
    gap: space['4'],
  },

  // KPI tiles (3-up row)
  kpiTilesRow: {
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
  kpiTileLabel: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['16'],
    color: textColors.secondary,
    letterSpacing: 1.28,
    textTransform: 'uppercase',
  },
  kpiTileValue: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 22,
    color: textColors.primary,
    textAlign: 'center',
  },
  kpiTileUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: textColors.secondary,
  },

  // Divider
  statsDivider: {
    height: 1,
    backgroundColor: textColors.muted,
  },

  // Stats table (GEM/PIEK)
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

  // Splits table
  splitsTable: {
    backgroundColor: background.elevated,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  splitsHeaderRow: {
    flexDirection: 'row',
    paddingLeft: space['4'],
    paddingVertical: space['2'],
  },
  splitsLabelCol: {
    width: 165,
  },
  splitsColHeader: {
    flex: 1,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: textColors.secondary,
    letterSpacing: 1.12,
    textTransform: 'uppercase',
  },
  splitsDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space['4'],
    paddingVertical: space['4'],
  },
  splitsDistLabel: {
    width: 165,
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['14'],
    color: textColors.secondary,
    textTransform: 'uppercase',
  },
  splitsValue: {
    flex: 1,
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['16'],
    color: textColors.primary,
  },
  splitsRowDivider: {
    height: 1,
    backgroundColor: textColors.muted,
  },
});
