import { useCallback, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  scrollTo,
  runOnUI,
  runOnJS,
  type SharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { bg, fg, fontFamily, fontSize, radii, space } from '@/constants';
import { wheelItemParts, type WheelItem } from '@/lib/formatters';

const ITEM_H = 50;
const VISIBLE = 5;
const HALF = 2;                       // rows above/below the centre
const PADDING = ITEM_H * HALF;        // 100 — centres the selected row
const PICKER_H = ITEM_H * VISIBLE;    // 250
const PILL_H = 60;
const PILL_TOP = (PICKER_H - PILL_H) / 2; // 95
const FADE_H = ITEM_H * 1.5;
const FADE_OPAQUE = bg.base;
const FADE_CLEAR = 'rgba(21, 23, 28, 0)'; // bg.base (#15171C) at 0 alpha

function triggerHaptic() {
  Haptics.selectionAsync();
}

// --- Row: UI-thread cross-fade of a 34px and a 16px layer, driven by scrollY ---

type WheelRowProps = {
  item: WheelItem;
  index: number;
  scrollY: SharedValue<number>;
};

function WheelRow({ item, index, scrollY }: WheelRowProps) {
  const { value, unit } = wheelItemParts(item);
  const centre = index * ITEM_H;

  const bigStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [centre - ITEM_H, centre, centre + ITEM_H],
      [0, 1, 0],
      Extrapolation.CLAMP,
    ),
  }));
  const smallStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [centre - 2 * ITEM_H, centre - ITEM_H, centre, centre + ITEM_H, centre + 2 * ITEM_H],
      [0.5, 0.75, 0, 0.75, 0.5],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View style={styles.item}>
      <Animated.View style={[styles.layer, smallStyle]}>
        <View style={styles.valueRow}>
          <Text style={styles.smallValue}>{value}</Text>
          {unit ? <Text style={styles.smallUnit}>{unit}</Text> : null}
        </View>
      </Animated.View>
      <Animated.View style={[styles.layer, bigStyle]}>
        <View style={styles.valueRow}>
          <Text style={styles.bigValue}>{value}</Text>
          {unit ? <Text style={styles.bigUnit}>{unit}</Text> : null}
        </View>
      </Animated.View>
    </View>
  );
}

type WheelPickerProps = {
  items: WheelItem[];
  selectedIndex: number;
  onIndexChange: (index: number) => void;
}

export function WheelPicker({ items, selectedIndex, onIndexChange }: WheelPickerProps) {
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollY = useSharedValue(selectedIndex * ITEM_H);
  const lastHaptic = useSharedValue(selectedIndex);
  const syncedIdx = useSharedValue(selectedIndex);
  const initialized = useSharedValue(false);
  // Suppress the per-row haptic while the wheel is moving under program control
  // (chip tap / goal switch); a finger touch re-arms it.
  const suppress = useSharedValue(false);
  const count = items.length;

  const commit = useCallback((idx: number) => {
    if (idx !== selectedIndex) onIndexChange(idx);
  }, [selectedIndex, onIndexChange]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
      const idx = Math.round(e.contentOffset.y / ITEM_H);
      if (idx !== lastHaptic.value) {
        lastHaptic.value = idx;
        if (!suppress.value && idx >= 0 && idx < count) {
          runOnJS(triggerHaptic)();
        }
      }
    },
    onBeginDrag: () => {
      suppress.value = false;
    },
    onMomentumEnd: (e) => {
      const raw = Math.round(e.contentOffset.y / ITEM_H);
      const idx = Math.min(Math.max(raw, 0), count - 1);
      syncedIdx.value = idx;
      runOnJS(commit)(idx);
    },
  }, [count, commit]);

  // Re-sync to the parent's selectedIndex (chip tap / goal switch).
  useEffect(() => {
    if (syncedIdx.value === selectedIndex) return;
    syncedIdx.value = selectedIndex;
    suppress.value = true;
    const y = selectedIndex * ITEM_H;
    runOnUI(() => {
      scrollTo(scrollRef, 0, y, true);
    })();
  }, [selectedIndex, scrollRef, scrollY, suppress, syncedIdx]);

  const onLayout = useCallback(() => {
    if (initialized.value) return;
    initialized.value = true;
    const y = selectedIndex * ITEM_H;
    runOnUI(() => {
      scrollTo(scrollRef, 0, y, false);
    })();
  }, [initialized, scrollRef, selectedIndex]);

  return (
    <View style={styles.container}>
      <View style={styles.pill} pointerEvents="none" />
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        onLayout={onLayout}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        {items.map((item, index) => (
          <WheelRow key={index} item={item} index={index} scrollY={scrollY} />
        ))}
      </Animated.ScrollView>
      <LinearGradient
        colors={[FADE_OPAQUE, FADE_CLEAR]}
        style={[styles.fade, styles.fadeTop]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[FADE_CLEAR, FADE_OPAQUE]}
        style={[styles.fade, styles.fadeBottom]}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: PICKER_H,
    overflow: 'hidden',
  },
  pill: {
    position: 'absolute',
    top: PILL_TOP,
    left: 0,
    right: 0,
    height: PILL_H,
    backgroundColor: bg.raised,
    borderRadius: radii.md,
  },
  listContent: {
    paddingVertical: PADDING,
  },
  fade: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: FADE_H,
  },
  fadeTop: {
    top: 0,
  },
  fadeBottom: {
    bottom: 0,
  },
  item: {
    height: ITEM_H,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['6'],
  },
  bigValue: {
    fontFamily: fontFamily.sourceSerifRegular,
    fontSize: fontSize['34'],
    letterSpacing: -1.02,
    color: fg.primary,
  },
  bigUnit: {
    fontFamily: fontFamily.sourceSerifItalic,
    fontSize: fontSize['16'],
    color: fg.primary,
  },
  smallValue: {
    fontFamily: fontFamily.sourceSerifRegular,
    fontSize: fontSize['16'],
    letterSpacing: -0.4,
    color: fg.secondary,
  },
  smallUnit: {
    fontFamily: fontFamily.sourceSerifItalic,
    fontSize: fontSize['16'],
    color: fg.secondary,
  },
});
