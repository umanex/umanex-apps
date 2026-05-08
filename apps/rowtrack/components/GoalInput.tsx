import { View, Text, TextInput, StyleSheet } from 'react-native';
import { bg, fg, accent, componentRadius, fontFamily, fontSize } from '@/constants';

type GoalInputProps = {
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  placeholder?: string;
};

export function GoalInput({ value, onChangeText, unit, placeholder = '0' }: GoalInputProps) {
  return (
    <View style={styles.box}>
      <TextInput
        style={styles.value}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        selectTextOnFocus
        placeholder={placeholder}
        placeholderTextColor={fg.tertiary}
        selectionColor={accent.default}
      />
      <View style={styles.unitWrap}>
        <Text style={styles.unit}>{unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    justifyContent: 'space-between',
  },
  value: {
    flex: 1,
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['36'],
    color: fg.primary,
    textAlign: 'center',
  },
  unitWrap: {
    paddingLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['14'],
    color: fg.secondary,
  },
});
