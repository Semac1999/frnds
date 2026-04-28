import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  emoji: string;
  title: string;
  subtitle: string;
}

interface Props {
  visible: boolean;
  displayName?: string;
  onDone: () => void;
}

export function WelcomeAnimation({ visible, displayName, onDone }: Props) {
  const slides: Slide[] = [
    {
      emoji: '✨',
      title: `Welcome${displayName ? `, ${displayName.split(' ')[0]}` : ''}!`,
      subtitle: 'You just joined frnds. Get ready to meet new people.',
    },
    {
      emoji: '👈',
      title: 'Swipe to skip',
      subtitle: 'Not feeling it? Swipe left to see the next person.',
    },
    {
      emoji: '💜',
      title: 'Send a message',
      subtitle: 'Liked someone? Type a message right under their photo.',
    },
    {
      emoji: '🚀',
      title: 'Let’s go',
      subtitle: 'Your people are waiting.',
    },
  ];

  const [index, setIndex] = useState(0);

  // Animation values for the current slide
  const slideOpacity = useSharedValue(0);
  const slideTranslate = useSharedValue(20);
  const emojiScale = useSharedValue(0.4);
  const emojiRotate = useSharedValue(0);

  // Floating dots/sparkles on first slide
  const sparkle1 = useSharedValue(0);
  const sparkle2 = useSharedValue(0);
  const sparkle3 = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    setIndex(0);
    // Start sparkles loop
    sparkle1.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true);
    sparkle2.value = withDelay(400, withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true));
    sparkle3.value = withDelay(800, withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, [visible]);

  // Animate when slide index changes
  useEffect(() => {
    if (!visible) return;
    // Reset
    slideOpacity.value = 0;
    slideTranslate.value = 20;
    emojiScale.value = 0.4;
    emojiRotate.value = -20;
    // Animate in
    slideOpacity.value = withTiming(1, { duration: 400 });
    slideTranslate.value = withTiming(0, { duration: 400, easing: Easing.out(Easing.cubic) });
    emojiScale.value = withSpring(1, { damping: 10, stiffness: 90 });
    emojiRotate.value = withSpring(0, { damping: 12, stiffness: 90 });
  }, [index, visible]);

  const advance = () => {
    if (index < slides.length - 1) {
      setIndex(index + 1);
    } else {
      // Fade out and finish
      slideOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
        if (finished) runOnJS(onDone)();
      });
    }
  };

  const skip = () => {
    slideOpacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished) runOnJS(onDone)();
    });
  };

  const slideStyle = useAnimatedStyle(() => ({
    opacity: slideOpacity.value,
    transform: [{ translateY: slideTranslate.value }],
  }));
  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }, { rotate: `${emojiRotate.value}deg` }],
  }));
  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: 0.4 + sparkle1.value * 0.6,
    transform: [{ scale: 0.6 + sparkle1.value * 0.6 }, { translateY: -10 - sparkle1.value * 30 }],
  }));
  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: 0.4 + sparkle2.value * 0.6,
    transform: [{ scale: 0.6 + sparkle2.value * 0.5 }, { translateY: -10 - sparkle2.value * 25 }],
  }));
  const sparkle3Style = useAnimatedStyle(() => ({
    opacity: 0.4 + sparkle3.value * 0.6,
    transform: [{ scale: 0.6 + sparkle3.value * 0.7 }, { translateY: -10 - sparkle3.value * 35 }],
  }));

  const slide = slides[index];

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <LinearGradient
        colors={[...Gradients.primary, '#0a0a1a' as any]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Skip in top-right */}
        <TouchableOpacity style={styles.skipBtn} onPress={skip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Floating sparkles around emoji */}
        <View style={styles.sparkleContainer} pointerEvents="none">
          <Animated.Text style={[styles.sparkle, { left: SCREEN_WIDTH * 0.22 }, sparkle1Style]}>✨</Animated.Text>
          <Animated.Text style={[styles.sparkle, { right: SCREEN_WIDTH * 0.22, top: 40 }, sparkle2Style]}>💫</Animated.Text>
          <Animated.Text style={[styles.sparkle, { left: SCREEN_WIDTH * 0.40, top: -20 }, sparkle3Style]}>⭐</Animated.Text>
        </View>

        {/* Animated emoji */}
        <Animated.Text style={[styles.emoji, emojiStyle]}>{slide.emoji}</Animated.Text>

        {/* Slide content */}
        <Animated.View style={[styles.slideContent, slideStyle]}>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
        </Animated.View>

        {/* Progress dots */}
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === index && styles.dotActive,
                i < index && styles.dotPast,
              ]}
            />
          ))}
        </View>

        {/* Action button */}
        <TouchableOpacity style={styles.nextBtn} onPress={advance} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>
            {index === slides.length - 1 ? 'Start meeting people' : 'Next'}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  skipBtn: { position: 'absolute', top: 60, right: 22, padding: 8 },
  skipText: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 14 },
  sparkleContainer: { position: 'absolute', top: '28%', left: 0, right: 0, alignItems: 'center', height: 80 },
  sparkle: { position: 'absolute', fontSize: 26 },
  emoji: { fontSize: 110, marginBottom: 24 },
  slideContent: { alignItems: 'center', maxWidth: 320 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: '#fff', width: 24 },
  dotPast: { backgroundColor: 'rgba(255,255,255,0.6)' },
  nextBtn: {
    marginTop: 28,
    backgroundColor: '#fff',
    paddingHorizontal: 36, paddingVertical: 16,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  nextBtnText: { color: Colors.primary, fontWeight: '900', fontSize: 16, letterSpacing: 0.4 },
});
