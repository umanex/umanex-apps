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
  userInputToTarget,
  targetToUserInput,
} from '@/lib/workout-goals';
import {
  bg,
  fg,
  accent,
  border,
  overlay,
  fontFamily,
  fontSize,
  space,
  componentRadius,
  radii,
} from '@/constants';

export type GoalSetupModalProps = {
  visible: boolean;
  currentGoal: WorkoutGoal | null;
  onSetGoal: (goal: WorkoutGoal) => void;
  onClearGoal: () => void;
  onClose: () => void;
};

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
  const numericValue = parseFloat(inputValue);
  const isValid = !isNaN(numericValue) && numericValue > 0;

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
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={fg.secondary} />
            </TouchableOpacity>
          </View>

          {/* Segmented control */}
          <View style={styles.segmentedControl}>
            {GOAL_TYPE_ORDER.map((type) => {
              const typeConfig = GOAL_TYPES[type];
              const isActive = selectedType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.segment, isActive && styles.segmentActive]}
                  onPress={() => {
                    setSelectedType(type);
                    setInputValue('');
                  }}
                >
                  <Ionicons
                    name={typeConfig.icon}
                    size={16}
                    color={isActive ? bg.base : fg.tertiary}
                  />
                  <Text
                    style={[
                      styles.segmentText,
                      isActive && styles.segmentTextActive,
                    ]}
                  >
                    {typeConfig.label}
                  </Text>
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

          {/* Actions */}
          <Button
            title="Stel in"
            onPress={handleSet}
            disabled={!isValid}
            size="lg"
          />
          {currentGoal && (
            <Button
              title="Wis doel"
              onPress={onClearGoal}
              variant="ghost"
              size="md"
            />
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
    fontFamily: fontFamily.displaySemiBold,
    fontSize: fontSize['24'],
    color: fg.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: bg.raised,
    borderRadius: radii.md,
    padding: space.px,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space['4'],
    paddingVertical: space['8'],
    borderRadius: radii.sm,
  },
  segmentActive: {
    backgroundColor: accent.default,
  },
  segmentText: {
    fontFamily: fontFamily.bodySemiBold,
    fontSize: fontSize['12'],
    color: fg.tertiary,
  },
  segmentTextActive: {
    color: bg.base,
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
    fontFamily: fontFamily.monoMedium,
    fontSize: fontSize['36'],
    color: fg.primary,
    textAlign: 'center',
  },
  unitLabel: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: fontSize['16'],
    color: fg.secondary,
    minWidth: 60,
  },
});
