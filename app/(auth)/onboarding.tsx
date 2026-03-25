import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { GradientButton } from '../../components/GradientButton';
import { ChatIcon, DiscoverIcon, HeartIcon } from '../../components/Icons';

const slides = [
  { id: '0', title: 'Welcome to frnds', desc: 'Swipe, match, and vibe with new people near you', Icon: DiscoverIcon },
  { id: '1', title: 'Chat & Snap', desc: 'Send snaps, messages, and share moments with your new frnds', Icon: ChatIcon },
  { id: '2', title: 'Stories & Vibes', desc: 'Share your day and discover what others are up to', Icon: HeartIcon },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const next = () => {
    if (currentIndex < 2) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.replace('/(auth)/signup');
    }
  };

  const slide = slides[currentIndex];

  return (
    <View style={styles.container}>
      <View style={styles.slideArea}>
        <View style={styles.iconWrap}>
          <slide.Icon size={80} color={Colors.primaryLight} />
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>
      </View>
      <View style={styles.dots}>
        {slides.map((_, i) => (
          <View key={i} style={[styles.dot, i === currentIndex && styles.dotActive]} />
        ))}
      </View>
      <View style={styles.buttons}>
        <GradientButton title={currentIndex === 2 ? 'Get Started' : 'Next'} onPress={next} style={styles.btn} />
        <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
          <Text style={styles.skip}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, justifyContent: 'center' },
  slideArea: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, flex: 1 },
  iconWrap: { marginBottom: 24, width: 120, height: 120, borderRadius: 60, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: Colors.primaryLight, marginBottom: 12, textAlign: 'center' },
  desc: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24, maxWidth: 300 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 28, borderRadius: 5 },
  buttons: { paddingHorizontal: 40, paddingBottom: 40, alignItems: 'center' },
  btn: { width: '100%', marginBottom: 16 },
  skip: { color: Colors.textMuted, fontSize: 14 },
});
