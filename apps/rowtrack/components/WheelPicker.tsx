import { useRef, useCallback, useEffect } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { fontFamily } from '@/constants';
import type { WheelItem } from '@/lib/formatters';

const ITEM_H = 44;
const VISIBLE = 3;
const HALF = 1;
const PADDING = ITEM_H * HALF;
const PICKER_H = ITEM_H * VISIBLE;

interface WheelPickerProps {
  items: WheelItem[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export function WheelPicker({ items, selectedIndex, onIndexChange }: WheelPickerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const hapticIdx = useRef(-1);
  const syncedIdx = useRef(selectedIndex);
  const initialized = useRef(false);

  const onLayout = useCallback(() => {
    if (initialized.current) return;
    initialized.current = true;
    scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: false });
  }, [selectedIndex]);

  useEffect(() => {
    if (syncedIdx.current !== selectedIndex) {
      syncedIdx.current = selectedIndex;
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_H, animated: true });
    }
  }, [selectedIndex]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    if (idx !== hapticIdx.current && idx >= 0 && idx < items.length) {
      hapticIdx.current = idx;
      Haptics.selectionAsync();
    }
  }, [items.length]);

  const onMomentumScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const idx = Math.max(0, Math.min(raw, items.length - 1));
    syncedIdx.current = idx;
    if (idx !== selectedIndex) onIndexChange(idx);
  }, [items.length, selectedIndex, onIndexChange]);

  return (
    <View style={styles.container}>
      <View style={styles.indicator} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onLayout={onLayout}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        {items.map((item, index) => {
          const isSelected = index === selectedIndex;
          return (
            <View key={index} style={styles.item}>
              <Text style={[styles.itemLabel, isSelected && styles.itemLabelSelected]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_H,
    overflow: 'hidden',
  },
  indicator: {
    position: 'absolute',
    top: PADDING,
    left: 0,
    right: 0,
    height: ITEM_H,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#47556E',
    zIndex: 1,
  },
  listContent: {
    paddingVertical: PADDING,
  },
  item: {
    height: ITEM_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemLabel: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 18,
    color: '#47556E',
  },
  itemLabelSelected: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: 22,
    color: '#F8FAFC',
  },
});
