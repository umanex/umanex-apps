import { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { fontFamily } from '@/constants';

export type GoalSegmentType = 'Geen' | 'Duur' | 'Afstand' | 'Split' | 'Watt';
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const GOAL_ICONS: Record<GoalSegmentType, IoniconsName> = {
  'Geen':    'infinite-outline',
  'Duur':    'time-outline',
  'Afstand': 'location-outline',
  'Split':   'stopwatch-outline',
  'Watt':    'flash-outline',
};

const SEGMENT_LABELS: Record<GoalSegmentType, string> = {
  'Geen':    'Geen',
  'Duur':    'Duur',
  'Afstand': 'Afstand',
  'Split':   'Split',
  'Watt':    'Watt',
};

const ACCESSIBILITY_LABELS: Record<GoalSegmentType, string> = {
  'Geen':    'Geen doel',
  'Duur':    'Duur, doel',
  'Afstand': 'Afstand, doel',
  'Split':   'Split, doel',
  'Watt':    'Watt, doel',
};

const GOAL_TYPES: GoalSegmentType[] = ['Geen', 'Duur', 'Afstand', 'Split', 'Watt'];

// --- Per-segment button with its own label animation lifecycle ---

interface SegmentButtonProps {
  type: GoalSegmentType;
  isActive: boolean;
  onPress: () => void;
}

function SegmentButton({ type, isActive, onPress }: SegmentButtonProps) {
  // Start fully visible if active on mount, hidden otherwise
  const labelOpacity = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const labelScale   = useRef(new Animated.Value(isActive ? 1 : 0.85)).current;
  const prevActive   = useRef(isActive);

  useEffect(() => {
    if (isActive && !prevActive.current) {
      // Reset to start values so the animation is visible from the beginning
      labelOpacity.setValue(0);
      labelScale.setValue(0.85);
      Animated.parallel([
        Animated.timing(labelOpacity, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.spring(labelScale, {
          toValue: 1,
          stiffness: 387,
          damping: 31,
          mass: 1,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevActive.current = isActive;
  }, [isActive, labelOpacity, labelScale]);

  return (
    <TouchableOpacity
      style={[styles.segment, isActive ? styles.segmentActive : styles.segmentInactive]}
      onPress={onPress}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={ACCESSIBILITY_LABELS[type]}
      accessibilityState={{ selected: isActive }}
    >
      <Ionicons
        name={GOAL_ICONS[type]}
        size={16}
        color={isActive ? '#0A0A0F' : '#94A3B8'}
      />
      {isActive && (
        <Animated.Text
          style={[
            styles.activeLabel,
            { opacity: labelOpacity, transform: [{ scale: labelScale }] },
          ]}
          numberOfLines={1}
        >
          {SEGMENT_LABELS[type]}
        </Animated.Text>
      )}
    </TouchableOpacity>
  );
}

// --- Segmented control ---

interface GoalSegmentsProps {
  selected: GoalSegmentType;
  onChange: (type: GoalSegmentType) => void;
}

export function GoalSegments({ selected, onChange }: GoalSegmentsProps) {
  function handlePress(type: GoalSegmentType) {
    if (type === selected) return;
    Haptics.selectionAsync();
    onChange(type);
  }

  return (
    <View style={styles.container}>
      {GOAL_TYPES.map((type) => (
        <SegmentButton
          key={type}
          type={type}
          isActive={selected === type}
          onPress={() => handlePress(type)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#1A1F2E',
    borderRadius: 10,
    padding: 4,
    alignItems: 'center',
  },
  segment: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 6,
  },
  segmentInactive: {
    width: 44,
  },
  segmentActive: {
    flex: 1,
    paddingHorizontal: 10,
    backgroundColor: '#00E5FF',
  },
  activeLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 13,
    color: '#0A0A0F',
  },
});
