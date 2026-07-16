import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { supabase } from '@/lib/supabase';
import { reportError } from '@/lib/monitoring';
import type { PeriodGoal, PeriodGoalPeriod, PeriodGoalMetric } from '@/lib/hooks/usePeriodGoal';
import { bg, fg, accent, border, space, radii, fontFamily, fontSize, typeStyles } from '@/constants';

export type GoalSheetProps = {
  visible: boolean;
  /** Huidige (opgeslagen) doel — bron voor de initiële draft; null = nog geen doel. */
  currentGoal: PeriodGoal | null;
  userId: string | undefined;
  onClose: () => void;
  /** Aangeroepen na een succesvolle write, zodat de caller kan refetchen. */
  onSaved: () => void;
};

const PERIODS: PeriodGoalPeriod[] = ['week', 'month'];
const METRICS: PeriodGoalMetric[] = ['distance', 'duration', 'workouts'];

function periodLabel(p: PeriodGoalPeriod): string {
  return p === 'week' ? 'Week' : 'Maand';
}
function metricLabel(m: PeriodGoalMetric): string {
  return m === 'distance' ? 'Afstand' : m === 'duration' ? 'Duur' : 'Sessies';
}
function metricUnit(m: PeriodGoalMetric): string {
  return m === 'distance' ? 'km' : m === 'duration' ? 'min' : 'sessies';
}

/**
 * Doel-instellen-bottomsheet. Zelf-persisterend: schrijft `period_goal_*` rechtstreeks
 * naar `profiles` en roept `onSaved` aan. Gedeeld door home + profiel, zodat de sheet
 * op beide plekken in-place opent zonder duplicatie (en de home niet meer hoeft te
 * redirecten naar het profiel).
 */
export function GoalSheet({ visible, currentGoal, userId, onClose, onSaved }: GoalSheetProps) {
  const [period, setPeriod] = useState<PeriodGoalPeriod | null>(null);
  const [metric, setMetric] = useState<PeriodGoalMetric | null>(null);
  const [target, setTarget] = useState('');
  const [saving, setSaving] = useState(false);

  // Init de draft uit het huidige doel telkens de sheet opent (km/min/count → invoerwaarde).
  useEffect(() => {
    if (!visible) return;
    if (currentGoal) {
      setPeriod(currentGoal.period);
      setMetric(currentGoal.metric);
      const raw = currentGoal.target;
      setTarget(
        currentGoal.metric === 'distance' ? String(raw / 1000)
        : currentGoal.metric === 'duration' ? String(raw / 60)
        : String(raw),
      );
    } else {
      setPeriod(null);
      setMetric(null);
      setTarget('');
    }
    // Init bij openen én wanneer currentGoal ná het openen alsnog binnenkomt (edge: sheet
    // geopend vóór de fetch klaar was). currentGoal is stabiel zolang de sheet open staat
    // (geen refocus/refetch), dus dit klobbert geen edits.
  }, [visible, currentGoal]);

  async function save() {
    if (!userId) return;
    const hasGoal = period && metric && target;
    let stored: number | null = null;
    if (hasGoal) {
      const raw = parseFloat(target);
      if (metric === 'distance') stored = Math.round(raw * 1000);
      else if (metric === 'duration') stored = Math.round(raw * 60);
      else stored = Math.round(raw);
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        period_goal_period: hasGoal ? period : null,
        period_goal_metric: hasGoal ? metric : null,
        period_goal_target: stored,
      })
      .eq('id', userId);
    setSaving(false);

    if (error) {
      reportError(error, { where: 'GoalSheet.save' });
      Alert.alert('Fout', `Opslaan mislukt: ${error.message}`);
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Doel bewerken"
      footer={<Button title="Opslaan" onPress={save} loading={saving} size="md" />}
    >
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>PERIODE</Text>
        <View style={styles.segmentedRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.segmentBtn, period === p && styles.segmentBtnActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, period === p && styles.segmentBtnTextActive]}>
                {periodLabel(p)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>TYPE</Text>
        <View style={styles.segmentedRow}>
          {METRICS.map(m => (
            <TouchableOpacity
              key={m}
              style={[styles.segmentBtn, metric === m && styles.segmentBtnActive]}
              onPress={() => setMetric(m)}
              activeOpacity={0.8}
            >
              <Text style={[styles.segmentBtnText, metric === m && styles.segmentBtnTextActive]}>
                {metricLabel(m)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {metric && (
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>STREEFWAARDE</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.inputFlex}
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={save}
              placeholderTextColor={fg.tertiary}
              placeholder="0"
            />
            <Text style={styles.inputUnit}>{metricUnit(metric)}</Text>
          </View>
        </View>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  fieldGroup: {
    gap: space['8'],
  },
  fieldLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
  },
  // Segmented control — track: bg.base + border.strong, 4px padding (Figma 52:9155).
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: bg.base,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: border.strong,
    padding: space['4'],
  },
  segmentBtn: {
    flex: 1,
    height: space['44'],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentBtnActive: {
    // TODO: accent.selected-token (0.20) ontbreekt nog — zelfde hardcode als Chip/GoalSegments/geslacht.
    backgroundColor: 'rgba(240, 84, 84, 0.20)',
    borderWidth: 1,
    borderColor: accent.default,
    borderRadius: radii.xs, // 4 = track-radius (8) − padding (4): pill nest exact.
  },
  segmentBtnText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.tertiary,
  },
  segmentBtnTextActive: {
    fontFamily: fontFamily.bodySemiBold,
    color: accent.default,
  },
  // Streefwaarde-input — bg.base + border.strong, radius 8 (Figma 52:9892).
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: bg.base,
    borderWidth: 1,
    borderColor: border.strong,
    borderRadius: radii.sm,
    paddingHorizontal: space['16'],
    paddingVertical: space['14'],
    gap: space['20'],
  },
  inputFlex: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['16'],
    color: fg.primary,
  },
  inputUnit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['12'],
    color: fg.secondary,
  },
});
