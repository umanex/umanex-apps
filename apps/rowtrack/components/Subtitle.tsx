import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fg, accent, typeStyles, space } from '@/constants';

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
          <Ionicons name="arrow-forward" size={14} color={accent.default} />
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
  },
  label: {
    flex: 1,
    ...typeStyles.labelSection,
    color: fg.secondary,
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
});
