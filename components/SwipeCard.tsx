import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Colors } from '../constants/colors';
import { getCountry } from '../constants/countries';
import { decodeEditedPhoto } from '../lib/photo-format';
import { CloseIcon, MoreIcon } from './Icons';
import { VerifiedBadge } from './VerifiedBadge';
import type { SwipeProfile } from '../types';

interface Props {
  profile: SwipeProfile;
  isTop?: boolean;
  /** Stack position (1, 2, ...) for non-top cards. */
  stackIndex?: number;
  /** Active photo index (parent-controlled so gestures live in the parent). */
  photoIndex?: number;
  /** Top-left X tap. */
  onClose?: () => void;
  /** Top-right ... tap. */
  onMore?: () => void;
}

/**
 * The card no longer owns the swipe transform — the parent GestureDetector
 * does. This keeps gesture-tracking on the same view that's moving and
 * fixes the "swipes don't fire" issue on iOS.
 *
 * The non-top stack scaling/translate is still local because it doesn't
 * interact with the swipe gesture.
 */
export function SwipeCard({ profile, isTop, stackIndex = 0, photoIndex = 0, onClose, onMore }: Props) {
  const country = getCountry(profile.country);

  // Build a flat list of all photos for this profile: main photo first, then gallery
  const photos = useMemo(() => {
    const list: string[] = [];
    if (profile.photo) list.push(profile.photo);
    if (Array.isArray(profile.photos)) list.push(...profile.photos);
    return list;
  }, [profile.photo, profile.photos]);

  const photoIdx = Math.min(Math.max(photoIndex, 0), Math.max(0, photos.length - 1));

  // Stack-only animation (top card stays still here — parent moves it).
  // Each card peeks out a bit on alternating sides so you can see them.
  const stackAnim = useAnimatedStyle(() => {
    if (isTop) return {};
    const peekDirection = stackIndex % 2 === 1 ? -1 : 1;
    return {
      transform: [
        { scale: 1 - stackIndex * 0.04 },
        { translateY: stackIndex * 6 },
        { translateX: stackIndex * 8 * peekDirection },
        { rotate: `${stackIndex * 1.5 * peekDirection}deg` },
      ],
      opacity: 1 - stackIndex * 0.15,
    };
  });

  const currentPhotoRaw = photos[photoIdx] || photos[0] || profile.avatar;
  // Strip any frnds:photo:v1: wrapper to get a real URI for <Image>
  const decoded = decodeEditedPhoto(currentPhotoRaw);
  const photoUri = decoded ? decoded.photo : currentPhotoRaw;
  const hasPhoto = !!photoUri && (
    photoUri.startsWith('data:image') || photoUri.startsWith('http') || photoUri.startsWith('file:')
  );

  return (
    <Animated.View style={[styles.card, stackAnim, { zIndex: 10 - stackIndex }]}>
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

      {/* Progress bars at the very top (Wizz / Stories style). pointerEvents:none
          so they NEVER intercept gestures — the parent owns photo nav now. */}
      {isTop && photos.length > 1 && (
        <View style={styles.progressRow} pointerEvents="none">
          {photos.map((_, i) => (
            <View key={i} style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  i < photoIdx && styles.progressFillPast,
                  i === photoIdx && styles.progressFillActive,
                ]}
              />
            </View>
          ))}
        </View>
      )}

      {/* Top fade for header readability */}
      <LinearGradient
        colors={['rgba(0,0,0,0.55)', 'transparent']}
        style={styles.topGradient}
        pointerEvents="none"
      />

      {/* Wizz-style top header — close left, name center, more right */}
      {isTop && (
        <View style={styles.headerRow}>
          {/* Left: X close (skip) */}
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              hitSlop={12}
              activeOpacity={0.7}
              style={styles.headerIconBtn}
            >
              <CloseIcon size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconBtn} />
          )}

          {/* Middle: name + age + flag + online */}
          <View style={styles.headerMiddle} pointerEvents="none">
            <View style={styles.headerNameRow}>
              <Text style={styles.headerName} numberOfLines={1}>
                {profile.displayName.split(' ')[0]}
              </Text>
              <VerifiedBadge size={14} />
              {profile.isOnline && (
                <View style={styles.onlinePill}>
                  <Text style={styles.onlineText}>is online now</Text>
                </View>
              )}
            </View>
            <View style={styles.headerSubRow}>
              <Text style={styles.headerAge}>{profile.age}</Text>
              {country && <Text style={styles.headerFlag}>{country.flag}</Text>}
              <Text style={styles.headerCity}>{country?.name || ''}</Text>
            </View>
          </View>

          {/* Right: more (...) */}
          {onMore ? (
            <TouchableOpacity
              onPress={onMore}
              hitSlop={12}
              activeOpacity={0.7}
              style={styles.headerIconBtn}
            >
              <MoreIcon size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View style={styles.headerIconBtn} />
          )}
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

  // Progress bars (Stories style)
  progressRow: {
    position: 'absolute', top: 8, left: 10, right: 10,
    flexDirection: 'row', gap: 4,
    zIndex: 5,
  },
  progressTrack: {
    flex: 1, height: 3, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  progressFill: { width: '0%', height: '100%', backgroundColor: '#fff' },
  progressFillActive: { width: '100%' },
  progressFillPast: { width: '100%' },

  topGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 130 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },

  // Header — sits ABOVE the photo (positioned with absolute)
  headerRow: {
    position: 'absolute', top: 22, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    zIndex: 5,
  },
  headerIconBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  headerMiddle: { flex: 1, paddingTop: 4 },
  headerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  headerName: {
    color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: -0.3,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  headerAge: { color: '#fff', fontSize: 13, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  headerFlag: { fontSize: 15 },
  headerCity: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: '600' },
  onlinePill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999,
  },
  onlineText: { color: '#fff', fontSize: 11, fontWeight: '800' },

  // Bottom info
  bottomInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, paddingBottom: 22 },
  bio: { color: '#fff', fontSize: 16, lineHeight: 22, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  tagsRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  tagPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.22)' },
  tagText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
