import { memo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StatusBar,
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { bg, fg, accent, achievement, typeStyles, fontFamily, fontSize, componentRadius } from '@/constants';

const CONFETTI_COLORS = ['#F05454', '#3B82F6', '#22C55E', '#FFD700', '#FF69B4', '#FFFFFF'];
const PARTICLE_COUNT = 60;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

export type MotivationalToastProps = {
  message: string | null;
  onDismiss: () => void;
};

// --- Confetti ---

type Particle = {
  anim: Animated.Value;
  x: number;
  color: string;
  duration: number;
  size: number;
  rotation: number;
};

function useConfetti(active: boolean): Particle[] {
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
      anim: new Animated.Value(0),
      x: Math.random() * SCREEN_WIDTH,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      duration: 1400 + Math.random() * 1200,
      size: 6 + Math.random() * 8,
      rotation: Math.random() * 360,
    })),
  );

  useEffect(() => {
    const particles = particlesRef.current;
    if (!active) {
      particles.forEach((p) => p.anim.setValue(0));
      return;
    }

    particles.forEach((p) => p.anim.setValue(0));

    const animations = particles.map((p) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(p.anim, {
            toValue: 1,
            duration: p.duration,
            useNativeDriver: true,
          }),
          Animated.timing(p.anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ),
    );

    const composite = Animated.stagger(25, animations);
    composite.start();
    return () => composite.stop();
  }, [active]);

  return particlesRef.current;
}

function Confetti({ visible, particles }: { visible: boolean; particles: Particle[] }) {
  if (!visible) return null;

  return (
    <>
      {particles.map((p, i) => {
        const translateY = p.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, SCREEN_HEIGHT + 20],
        });

        return (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.x,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              transform: [
                { translateY },
                { rotate: `${p.rotation}deg` },
              ],
            }}
          />
        );
      })}
    </>
  );
}

// --- Goal-reached celebration toast ---

export const MotivationalToast = memo(function MotivationalToast({
  message,
  onDismiss,
}: MotivationalToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const visible = !!message;
  const confettiParticles = useConfetti(visible);

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    scale.setValue(0.8);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
    // Viering: geen auto-dismiss — de gebruiker sluit af met de knop.
  }, [message]); // opacity, scale are stable refs

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => onDismissRef.current()}
    >
      <StatusBar backgroundColor="rgba(0,0,0,0.85)" barStyle="light-content" />
      <View style={styles.overlay}>
        <Confetti visible={visible} particles={confettiParticles} />

        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => onDismissRef.current()}
        />

        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.trophy}>🏆</Text>
          <Text style={styles.title}>Doel bereikt!</Text>
          {message && <Text style={styles.body}>{message}</Text>}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => onDismissRef.current()}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>Training afsluiten</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: bg.elevated,
    borderWidth: 1,
    borderColor: accent.default,
    borderRadius: componentRadius.modal,
    padding: 32,
    gap: 16,
    alignItems: 'center',
    width: 320,
  },
  trophy: {
    fontSize: fontSize['48'],
  },
  title: {
    fontFamily: fontFamily.bodyBold,
    fontSize: fontSize['24'],
    // Titel-kleur via de achievement-ramp (was hardcoded #FFD700 fel goud;
    // gelijkgetrokken met de crème PR-badge-ramp, beslissing 2026-07-14).
    color: achievement.default,
    textAlign: 'center',
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: fontSize['15'],
    color: fg.tertiary,
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: accent.default,
    height: 48,
    width: 256,
    borderRadius: componentRadius.cardSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    ...typeStyles.buttonPrimary,
    color: fg.onAccent,
  },
});
