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
import { fontFamily } from '@/constants';

const CONFETTI_COLORS = ['#F05454', '#00E5FF', '#22C55E', '#FFD700', '#FF69B4', '#FFFFFF'];
const PARTICLE_COUNT = 60;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

export interface MotivationalToastProps {
  message: string | null;
  onDismiss: () => void;
  isGoalComplete?: boolean;
}

// --- Confetti ---

interface Particle {
  anim: Animated.Value;
  x: number;
  color: string;
  duration: number;
  size: number;
  rotation: number;
}

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

// --- Toast ---

export const MotivationalToast = memo(function MotivationalToast({
  message,
  onDismiss,
  isGoalComplete,
}: MotivationalToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const visible = !!message;
  const showConfetti = !!isGoalComplete && visible;
  const confettiParticles = useConfetti(showConfetti);

  useEffect(() => {
    if (!message) return;

    opacity.setValue(0);
    scale.setValue(0.8);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    // Goal complete: no auto-dismiss, user must press button
    if (!isGoalComplete) {
      const timer = setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }).start(() => onDismissRef.current());
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, isGoalComplete]); // opacity, scale are stable refs

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
        <Confetti visible={showConfetti} particles={confettiParticles} />

        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => onDismissRef.current()}
        />

        <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
          {isGoalComplete && (
            <Text style={styles.trophy}>🏆</Text>
          )}
          <Text style={[styles.title, isGoalComplete && styles.titleGoal]}>
            {isGoalComplete ? 'Doel bereikt!' : (message ?? '')}
          </Text>
          {isGoalComplete && message && (
            <Text style={styles.body}>{message}</Text>
          )}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={() => onDismissRef.current()}
            activeOpacity={0.8}
          >
            <Text style={styles.closeBtnText}>
              {isGoalComplete ? 'Training afsluiten' : 'OK'}
            </Text>
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
    backgroundColor: '#1A1F2E',
    borderWidth: 1,
    borderColor: '#00E5FF',
    borderRadius: 24,
    padding: 32,
    gap: 16,
    alignItems: 'center',
    width: 320,
  },
  trophy: {
    fontSize: 48,
  },
  title: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 24,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  titleGoal: {
    color: '#FFD700',
  },
  body: {
    fontFamily: fontFamily.bodyRegular,
    fontSize: 15,
    color: '#AAAAAA',
    textAlign: 'center',
    lineHeight: 22,
  },
  closeBtn: {
    backgroundColor: '#00E5FF',
    height: 48,
    width: 256,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: fontFamily.bodyBold,
    fontSize: 16,
    color: '#0A0E1A',
  },
});
