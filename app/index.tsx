import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../constants/colors';
import { useAuthStore } from '../lib/store';

export default function SplashScreen() {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      if (isAuthenticated) {
        router.replace('/(tabs)/discover');
      } else {
        router.replace('/(auth)/onboarding');
      }
    }, 2000);

    return () => clearTimeout(timer);
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
