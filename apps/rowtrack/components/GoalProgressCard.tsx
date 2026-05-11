import { View, Text, StyleSheet } from 'react-native';
import { bg, fg, accent, border, progressBar, typeStyles, space, radii } from '@/constants';
import { Subtitle } from './Subtitle';
import { Dot } from './Dot';
import type { PeriodGoalMetric, PeriodGoalPeriod, PeriodGoalProgress } from '@/lib/hooks/usePeriodGoal';

type GoalProgressCardProps = {
  progress: PeriodGoalProgress;
  onEdit?: () => void;
};

function periodLabel(period: PeriodGoalPeriod): string {
  return period === 'week' ? 'Weekdoel' : 'Maanddoel';
}

function fmtDistance(meters: number): string {
  if (meters >= 1000) {
    const km = meters / 1000;
    const rounded = Math.round(km * 10) / 10;
    return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded} km`;
  }
  return `${Math.round(meters)} m`;
}

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}u${m > 0 ? ` ${m} min` : ''}`;
  return `${m} min`;
}

function fmtValue(metric: PeriodGoalMetric, value: number): string {
  if (metric === 'distance') return fmtDistance(value);
  if (metric === 'duration') return fmtDuration(value);
  return `${Math.round(value)}`;
}

function fmtRemaining(metric: PeriodGoalMetric, current: number, target: number): string {
  const remaining = Math.max(target - current, 0);
  if (metric === 'distance') return `${fmtDistance(remaining)} resterend`;
  if (metric === 'duration') return `${fmtDuration(remaining)} resterend`;
  return `${Math.round(remaining)} trainingen resterend`;
}

export function GoalProgressCard({ progress, onEdit }: GoalProgressCardProps) {
  const { goal, current, percentage } = progress;
  const pct = Math.round(percentage);
  const fillWidth = `${Math.min(pct, 100)}%` as const;

  return (
    <View style={styles.card}>
      <Subtitle
        label={periodLabel(goal.period)}
        action={onEdit ? { label: 'wijzig', onPress: onEdit } : undefined}
      />

      <View style={styles.valuesRow}>
        <Text style={styles.currentValue}>{fmtValue(goal.metric, current)}</Text>
        <Text style={styles.connector}> van </Text>
        <Text style={styles.targetValue}>{fmtValue(goal.metric, goal.target)}</Text>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.trackOuter}>
          <View style={[styles.trackFill, { width: fillWidth }]}>
            <View style={styles.trackDot} />
          </View>
        </View>
        <View style={styles.statusRow}>
          <Text style={styles.statusPct}>{pct}%</Text>
          <Text style={styles.statusLabel}> voldaan</Text>
          <Dot />
          <Text style={styles.statusRemaining}>{fmtRemaining(goal.metric, current, goal.target)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: bg.elevated,
    padding: space['20'],
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: border.default,
  },

  valuesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space['8'],
    paddingTop: space['20'],
    paddingBottom: space['16'],
  },
  currentValue: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  connector: {
    ...typeStyles.italicConnector,
    color: fg.tertiary,
    paddingBottom: space['4'],
  },
  targetValue: {
    ...typeStyles.sectionValue,
    color: fg.secondary,
  },

  progressSection: {
    gap: space['16'],
  },
  trackOuter: {
    height: 2,
    backgroundColor: progressBar.trackColor,
    borderRadius: radii.xs,
  },
  trackFill: {
    height: 2,
    backgroundColor: accent.default,
    borderRadius: radii.xs,
  },
  trackDot: {
    position: 'absolute',
    right: 0,
    top: -2,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: accent.default,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['6'],
  },
  statusPct: {
    ...typeStyles.italicConnector,
    color: accent.default,
  },
  statusLabel: {
    ...typeStyles.italicConnector,
    color: fg.secondary,
  },
  statusRemaining: {
    ...typeStyles.italicConnector,
    color: fg.secondary,
  },
});
