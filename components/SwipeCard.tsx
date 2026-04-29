import React from 'react';
import { View, Text, StyleSheet, Image, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, SharedValue } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { getCountry } from '../constants/countries';
import type { SwipeProfile } from '../types';

interface Props {
  profile: SwipeProfile;
  isTop?: boolean;
  translateX?: SharedValue<number>;
  stackIndex?: number;
}

export function SwipeCard({ profile, isTop, translateX, stackIndex = 0 }: Props) {
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  const animatedStyle = useAnimatedStyle(() => {
    if (!isTop || !translateX) {
      return {
        transform: [
          { scale: 1 - stackIndex * 0.04 },
          { translateY: stackIndex * 8 },
        ],
      };
    }
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12]);
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const photoUri = profile.photo || profile.avatar;
  const hasPhoto = !!photoUri && (photoUri.startsWith('data:image') || photoUri.startsWith('http') || photoUri.startsWith('file:'));
  const country = getCountry(profile.country);

  return (
    <Animated.View style={[styles.card, animatedStyle, { zIndex: 10 - stackIndex }]}>
      {hasPhoto ? (
        <Image source={{ uri: photoUri }} style={styles.backgroundPhoto} resizeMode="cover" />
      ) : (
        <LinearGradient
          colors={[...profile.gradient]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.background}
        >
          <Text style={styles.avatarText}>{profile.avatar}</Text>
        </LinearGradient>
      )}

      {/* Top fade for header readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Wizz-style top header */}
      {isTop && (
        <View style={styles.headerRow} pointerEvents="none">
          <View style={styles.headerLeft}>
            <Text style={styles.headerName} numberOfLines={1}>
              {profile.displayName.split(' ')[0]}
            </Text>
            <View style={styles.headerMeta}>
              <Text style={styles.headerAge}>{profile.age}</Text>
              {country && <Text style={styles.headerFlag}>{country.flag}</Text>}
              {profile.isOnline && (
                <View style={styles.onlinePill}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>online now</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}

      {/* Bottom fade for the bio readability */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Bio at bottom */}
      <View style={styles.bottomInfo} pointerEvents="none">
        {profile.bio ? (
          <Text style={styles.bio} numberOfLines={3}>{profile.bio}</Text>
        ) : null}
        {profile.interests.length > 0 && (
          <View style={styles.tagsRow}>
            {profile.interests.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: Colors.bgCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 10,
  },
  background: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backgroundPhoto: { flex: 1, width: '100%' },
  avatarText: {
    fontSize: 96,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.22)',
    letterSpacing: 4,
  },
  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },

  // Wizz-style top header
  headerRow: {
    position: 'absolute', top: 14, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  headerLeft: { flex: 1, gap: 2 },
  headerName: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: -0.4 },
  headerMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerAge: { color: '#fff', fontSize: 14, fontWeight: '700' },
  headerFlag: { fontSize: 16 },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#22c55e',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
    marginLeft: 4,
  },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' },
  onlineText: { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 0.2 },

  // Bottom info
  bottomInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingBottom: 22 },
  bio: { color: '#fff', fontSize: 16, lineHeight: 22, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
