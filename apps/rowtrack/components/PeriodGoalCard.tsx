import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { PeriodGoalProgress } from '@/lib/hooks/usePeriodGoal';
import { bg, fg, accent, status, typeStyles, fontFamily, fontSize, componentRadius, space } from '@/constants';

type PeriodGoalCardProps = {
  progress: PeriodGoalProgress;
  onEdit?: () => void;
};

function fmtGoalValue(metric: string, current: number, target: number): string {
  if (metric === 'distance') {
    return `${(current / 1000).toFixed(1).replace('.', ',')} / ${(target / 1000).toFixed(0)} km`;
  }
  if (metric === 'duration') {
    const fmt = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      if (h > 0) return `${h}u ${m > 0 ? `${m}min` : ''}`.trim();
      return `${m} min`;
    };
    return `${fmt(current)} / ${fmt(target)}`;
  }
  return `${current} / ${target} sessies`;
}

export function PeriodGoalCard({ progress, onEdit }: PeriodGoalCardProps) {
  const { goal, current, percentage } = progress;
  const periodLabel = goal.period === 'week' ? 'DEZE WEEK' : 'DEZE MAAND';
  const valueText = fmtGoalValue(goal.metric, current, goal.target);
  const pct = Math.min(Math.round(percentage), 100);
  const isComplete = pct >= 100;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.periodLabel}>{periodLabel}</Text>
        {onEdit && (
          <TouchableOpacity onPress={onEdit} activeOpacity={0.7}>
            <Text style={styles.editLink}>Bewerken →</Text>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct}%`, backgroundColor: isComplete ? status.success : accent.default },
          ]}
        />
      </View>
      <View style={styles.bottomRow}>
        <Text style={styles.valueText}>{valueText}</Text>
        <Text style={styles.pctText}>{pct}%{isComplete ? ' behaald!' : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.card,
    paddingHorizontal: space['16'],
    paddingVertical: space['12'],
    gap: space['8'],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  periodLabel: {
    ...typeStyles.labelGoalPrefix,
    color: fg.secondary,
  },
  editLink: {
    ...typeStyles.textLink,
    color: accent.default,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: bg.base,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  valueText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['16'],
    color: fg.primary,
  },
  pctText: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['13'],
    color: fg.secondary,
  },
});
