import { memo, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { GoalSegments, type GoalSegmentType } from './GoalSegments';
import type { WorkoutGoal, GoalType } from '@/lib/workout-goals';
import {
  GOAL_TYPES,
  GOAL_INPUT_BOUNDS,
  userInputToTarget,
  targetToUserInput,
} from '@/lib/workout-goals';
import {
  bg,
  fg,
  accent,
  border,
  overlay,
  space,
  componentRadius,
  typeStyles,
} from '@/constants';

export type GoalSetupModalProps = {
  visible: boolean;
  currentGoal: WorkoutGoal | null;
  onSetGoal: (goal: WorkoutGoal) => void;
  onClearGoal: () => void;
  onClose: () => void;
};

// Mapping tussen de doel-domeintypes en de GoalSegments-labels. 'Geen' = doel wissen.
const SEGMENT_BY_GOAL: Record<GoalType, GoalSegmentType> = {
  duration: 'Duur',
  distance: 'Afstand',
  split: 'Split',
  watts: 'Watt',
};
const GOAL_BY_SEGMENT: Record<GoalSegmentType, GoalType | null> = {
  Geen: null,
  Duur: 'duration',
  Afstand: 'distance',
  Split: 'split',
  Watt: 'watts',
};

/** Toont de toegestane invoer-range in de eenheid die het veld ook accepteert
 *  (rauwe seconden voor split, meters voor afstand) — anders zou de hint een
 *  waarde tonen die op het numerieke toetsenbord niet typbaar is (review P2). */
function formatBoundsHint(type: GoalType): string {
  const { min, max } = GOAL_INPUT_BOUNDS[type];
  return `${min}–${max} ${GOAL_TYPES[type].unit}`;
}

export const GoalSetupModal = memo(function GoalSetupModal({
  visible,
  currentGoal,
  onSetGoal,
  onClearGoal,
  onClose,
}: GoalSetupModalProps) {
  const [selectedSegment, setSelectedSegment] = useState<GoalSegmentType>('Geen');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      if (currentGoal) {
        setSelectedSegment(SEGMENT_BY_GOAL[currentGoal.type]);
        setInputValue(String(targetToUserInput(currentGoal.type, currentGoal.target)));
      } else {
        setSelectedSegment('Geen');
        setInputValue('');
      }
    }
  }, [visible, currentGoal]);

  const selectedType = GOAL_BY_SEGMENT[selectedSegment];
  const bounds = selectedType ? GOAL_INPUT_BOUNDS[selectedType] : null;
  const numericValue = parseFloat(inputValue);
  const hasInput = inputValue.trim().length > 0;
  // 'Geen' is altijd geldig (wist het doel); een doeltype vereist een waarde binnen de grenzen.
  const isValid =
    selectedType === null ||
    (!!bounds && !isNaN(numericValue) && numericValue >= bounds.min && numericValue <= bounds.max);
  const isOutOfRange = selectedType !== null && hasInput && !isNaN(numericValue) && !isValid;

  function handleSegmentChange(segment: GoalSegmentType) {
    setSelectedSegment(segment);
    setInputValue('');
  }

  function handleConfirm() {
    if (selectedType === null) {
      onClearGoal();
      return;
    }
    if (!isValid) return;
    onSetGoal({
      type: selectedType,
      target: userInputToTarget(selectedType, numericValue),
    });
  }

  const typeBlock = selectedType ? (
    <>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          keyboardType="numeric"
          placeholder={GOAL_TYPES[selectedType].placeholder}
          placeholderTextColor={fg.tertiary}
          selectionColor={accent.default}
          returnKeyType="done"
        />
        <Text style={styles.unitLabel}>{GOAL_TYPES[selectedType].unit}</Text>
      </View>
      <Text style={[styles.hint, isOutOfRange && styles.hintError]}>
        {formatBoundsHint(selectedType)}
      </Text>
    </>
  ) : (
    <Text style={styles.noGoalNote}>Geen doel voor deze training.</Text>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Stel doel in</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Sluiten" accessibilityRole="button">
              <Ionicons name="close" size={24} color={fg.secondary} />
            </TouchableOpacity>
          </View>

          {/* Doeltype — incl. 'Geen' dat het doel wist (vervangt de aparte Wis-knop) */}
          <GoalSegments selected={selectedSegment} onChange={handleSegmentChange} />

          {typeBlock}

          <Button
            title="Stel in"
            onPress={handleConfirm}
            disabled={!isValid}
            size="lg"
            icon="arrow-forward"
            iconPosition="trailing"
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: overlay.scrim,
    justifyContent: 'center',
    paddingHorizontal: space['16'],
  },
  content: {
    backgroundColor: bg.elevated,
    borderRadius: componentRadius.modal,
    padding: space['24'],
    gap: space['16'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['12'],
  },
  input: {
    flex: 1,
    backgroundColor: bg.raised,
    borderWidth: 1,
    borderColor: border.default,
    borderRadius: componentRadius.input,
    paddingHorizontal: space['16'],
    paddingVertical: space['12'],
    ...typeStyles.heroDisplay,
    lineHeight: undefined,
    color: fg.primary,
    textAlign: 'center',
  },
  unitLabel: {
    ...typeStyles.kpiUnit,
    color: fg.secondary,
    minWidth: 60,
  },
  hint: {
    ...typeStyles.labelGoalPrefix,
    color: fg.tertiary,
    textAlign: 'center',
  },
  hintError: {
    color: accent.default,
  },
  noGoalNote: {
    ...typeStyles.italicConnector,
    color: fg.secondary,
    textAlign: 'center',
    paddingVertical: space['12'],
  },
});
