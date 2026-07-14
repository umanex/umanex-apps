import { memo, useEffect, useRef, type ReactNode } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  bg,
  fg,
  overlay,
  typeStyles,
  space,
  componentRadius,
} from '@/constants';

export type BottomSheetProps = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Vaste actie onderaan (buiten de scroll) — blijft altijd zichtbaar, ook bij hoge content zoals een wheel. */
  footer?: ReactNode;
};

const ANIM_MS = 220;

export const BottomSheet = memo(function BottomSheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: 1,
          duration: ANIM_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 1,
          duration: ANIM_MS,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slide.setValue(0);
      fade.setValue(0);
    }
  }, [visible, slide, fade]);

  function handleClose() {
    Keyboard.dismiss();
    onClose();
  }

  const translateY = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, { opacity: fade }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.kbWrap}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.sheet,
              {
                paddingBottom: space['20'] + insets.bottom,
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={styles.header}>
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
              <Pressable
                onPress={handleClose}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.closeBtn,
                  pressed && { opacity: 0.6 },
                ]}
                accessibilityLabel="Sluiten"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={fg.primary} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={styles.bodyContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {children}
            </ScrollView>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: overlay.scrim,
  },
  kbWrap: {
    width: '100%',
  },
  sheet: {
    backgroundColor: bg.elevated,
    borderTopLeftRadius: componentRadius.modal,
    borderTopRightRadius: componentRadius.modal,
    paddingHorizontal: space['32'],
    paddingTop: space['32'],
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space['12'],
    marginBottom: space['16'],
  },
  title: {
    flex: 1,
    ...typeStyles.sectionValue,
    color: fg.primary,
  },
  closeBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bodyScroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  bodyContent: {
    gap: space['16'],
    paddingBottom: space['8'],
  },
  footer: {
    marginTop: space['16'],
  },
});
