import { Text, StyleSheet } from 'react-native';
import { typeStyles } from '@/constants';

type TabLabelProps = {
  label: string;
  focused: boolean;
  color: string;
};

export function TabLabel({ label, focused, color }: TabLabelProps) {
  return (
    <Text style={[focused ? styles.active : styles.inactive, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  active: {
    ...typeStyles.labelGoalPrefix,
  },
  inactive: {
    ...typeStyles.labelMicro,
  },
});
