import { memo } from 'react';
import { View, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { bg, space, componentRadius } from '@/constants';

export type CardProps = {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}

export const Card = memo(function Card({ children, padding = space['16'], style }: CardProps) {
  return (
    <View style={[styles.card, { padding }, style]}>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.cardSm,
    gap: space['12'],
  },
});
