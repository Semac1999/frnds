import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../lib/store';

export default function SplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    // Restore saved session in parallel with the splash animation.
    // Always wait at least 800ms so the splash isn't a jarring flash.
    let cancelled = false;
    const start = Date.now();
    const minSplashMs = 800;

    (async () => {
      const ok = await restoreSession();
      const elapsed = Date.now() - start;
      const wait = Math.max(0, minSplashMs - elapsed);

      setTimeout(() => {
        if (cancelled) return;
        if (ok) {
          // Hydrate the rest of the stores in the background, then route in
          Promise.all([
            useDiscoverStore.getState().init(),
            useChatStore.getState().init(),
            useStoryStore.getState().init(),
          ]).catch(() => {});
          router.replace('/(tabs)/discover');
        } else {
          router.replace('/(auth)/onboarding');
        }
      }, wait);
    })();

    return () => { cancelled = true; };
  }, []);

  return (
    <LinearGradient colors={['#6C5CE7', '#a29bfe', '#fd79a8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.container}>
      <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }] }}>
        <Text style={styles.logo}>frnds</Text>
        <Text style={styles.tagline}>meet your people</Text>
      </Animated.View>
      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <Animated.View key={i} style={[styles.dot, { opacity: fadeAnim }]} />
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logo: { fontSize: 64, fontWeight: '900', color: '#fff', letterSpacing: -3, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 30 },
  tagline: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8, fontWeight: '500' },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.7)' },
});
