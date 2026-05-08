import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { fg, accent, border, typeStyles, space } from '@/constants';

type SubtitleAction = {
  label: string;
  onPress: () => void;
};

type SubtitleProps = {
  label: string;
  action?: SubtitleAction;
};

export function Subtitle({ label, action }: SubtitleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {action && (
        <TouchableOpacity
          style={styles.actionRow}
          onPress={action.onPress}
          activeOpacity={0.8}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space['16'],
    paddingBottom: space['12'],
    borderBottomWidth: 1,
    borderBottomColor: border.strong,
  },
  label: {
    flex: 1,
    ...typeStyles.labelSection,
    color: fg.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['8'],
  },
  actionLabel: {
    ...typeStyles.labelSection,
    color: accent.default,
  },
  actionArrow: {
    ...typeStyles.labelSection,
    color: accent.default,
  },
});
