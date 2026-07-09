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
import type { WorkoutGoal, GoalType } from '@/lib/workout-goals';
import {
  GOAL_TYPES,
  GOAL_TYPE_ORDER,
  GOAL_INPUT_BOUNDS,
  userInputToTarget,
  targetToUserInput,
} from '@/lib/workout-goals';
import { formatDuration } from '@/lib/formatters';
import {
  bg,
  fg,
  accent,
  border,
  overlay,
  space,
  componentRadius,
  radii,
  typeStyles,
} from '@/constants';

export type GoalSetupModalProps = {
  visible: boolean;
  currentGoal: WorkoutGoal | null;
  onSetGoal: (goal: WorkoutGoal) => void;
  onClearGoal: () => void;
  onClose: () => void;
};

/** Toont de toegestane invoer-range per doeltype, in de eenheid die de
 *  gebruiker herkent (mm:ss voor split, km voor afstand). */
function formatBoundsHint(type: GoalType): string {
  const { min, max } = GOAL_INPUT_BOUNDS[type];
  switch (type) {
    case 'duration':
      return `${min}–${max} min`;
    case 'distance':
      return `${min} m – ${max / 1000} km`;
    case 'split':
      return `${formatDuration(min)} – ${formatDuration(max)} /500m`;
    case 'watts':
      return `${min}–${max} W`;
  }
}

export const GoalSetupModal = memo(function GoalSetupModal({
  visible,
  currentGoal,
  onSetGoal,
  onClearGoal,
  onClose,
}: GoalSetupModalProps) {
  const [selectedType, setSelectedType] = useState<GoalType>('duration');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (visible) {
      if (currentGoal) {
        setSelectedType(currentGoal.type);
        setInputValue(String(targetToUserInput(currentGoal.type, currentGoal.target)));
      } else {
        setSelectedType('duration');
        setInputValue('');
      }
    }
  }, [visible, currentGoal]);

  const config = GOAL_TYPES[selectedType];
  const bounds = GOAL_INPUT_BOUNDS[selectedType];
  const numericValue = parseFloat(inputValue);
  const hasInput = inputValue.trim().length > 0;
  const isValid =
    !isNaN(numericValue) && numericValue >= bounds.min && numericValue <= bounds.max;
  const isOutOfRange = hasInput && !isNaN(numericValue) && !isValid;

  function handleSet() {
    if (!isValid) return;
    onSetGoal({
      type: selectedType,
      target: userInputToTarget(selectedType, numericValue),
    });
  }

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

          {/* Segmented control — icoon-only inactief, icoon+label actief (GoalSegments-taal) */}
          <View style={styles.segmentedControl}>
            {GOAL_TYPE_ORDER.map((type) => {
              const typeConfig = GOAL_TYPES[type];
              const isActive = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.segment, isActive ? styles.segmentActive : styles.segmentInactive]}
                  onPress={() => {
                    setSelectedType(type);
                    setInputValue('');
                  }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={typeConfig.label}
                >
                  <Ionicons
                    name={typeConfig.icon}
                    size={16}
                    color={isActive ? accent.default : fg.secondary}
                  />
                  {isActive && (
                    <Text style={styles.segmentTextActive} numberOfLines={1}>
                      {typeConfig.label}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input */}
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={inputValue}
              onChangeText={setInputValue}
              keyboardType="numeric"
              placeholder={config.placeholder}
              placeholderTextColor={fg.tertiary}
              selectionColor={accent.default}
              returnKeyType="done"
            />
            <Text style={styles.unitLabel}>{config.unit}</Text>
          </View>

          {/* Range-hint — subtiel; accent zodra de waarde buiten de grenzen valt */}
          <Text style={[styles.hint, isOutOfRange && styles.hintError]}>
            {formatBoundsHint(selectedType)}
          </Text>

          {/* Actions */}
          <Button
            title="Stel in"
            onPress={handleSet}
            disabled={!isValid}
            size="lg"
            icon="arrow-forward"
            iconPosition="trailing"
          />
          {currentGoal && (
            <Button title="Wis doel" onPress={onClearGoal} variant="ghost" size="md" />
          )}
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
  segmentedControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['4'],
    backgroundColor: bg.raised,
    borderWidth: 1,
    borderColor: border.strong,
    borderRadius: radii.sm,
    padding: space['4'],
  },
  segment: {
    height: space['44'],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['6'],
    borderRadius: radii.xs,
  },
  segmentInactive: {
    width: space['44'],
  },
  segmentActive: {
    flex: 1,
    paddingHorizontal: space['10'],
    backgroundColor: accent.muted,
    borderWidth: 1,
    borderColor: accent.default,
  },
  segmentTextActive: {
    ...typeStyles.segmentActive,
    color: accent.default,
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
});
