import { View, Text, TextInput, StyleSheet } from 'react-native';
import { text as textColors, brand, fontFamily } from '@/constants';

interface GoalInputProps {
  value: string;
  onChangeText: (v: string) => void;
  unit: string;
  placeholder?: string;
}

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
        placeholderTextColor={textColors.muted}
        selectionColor={brand.primary}
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
    backgroundColor: '#1A1F2E',
    borderRadius: 10,
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
    fontSize: 36,
    color: '#F8FAFC',
    textAlign: 'center',
  },
  unitWrap: {
    paddingLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unit: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 14,
    color: '#94A3B8',
  },
});
