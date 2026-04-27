import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useDiscoverStore, useChatStore, useAuthStore, useStoryStore } from '../../../lib/store';
import { SwipeCard } from '../../../components/SwipeCard';
import { MatchModal } from '../../../components/MatchModal';
import { StoryCircle } from '../../../components/StoryCircle';
import { CloseIcon, StarIcon, HeartIcon, DiscoverIcon } from '../../../components/Icons';
import type { SwipeProfile } from '../../../types';

export default function DiscoverScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
  const insets = useSafeAreaInsets();
  const { profiles, currentIndex, swipe, matches, init, loading } = useDiscoverStore();
  const addChat = useChatStore((s) => s.addChat);
  const currentUser = useAuthStore((s) => s.user);
  const storyGroups = useStoryStore((s) => s.storyGroups);

  const [matchedUser, setMatchedUser] = useState<SwipeProfile | null>(null);
  const [showMatch, setShowMatch] = useState(false);

  const translateX = useSharedValue(0);

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

  // Reload profiles when we run out
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      init();
    }
  }, [currentIndex, profiles.length]);

  const handleSwipe = useCallback(async (direction: 'like' | 'pass') => {
    const matched = await swipe(direction);
    if (matched) {
      addChat(matched);
      setMatchedUser(matched);
      setShowMatch(true);
    }
  }, [swipe, addChat]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      if (Math.abs(e.translationX) > SWIPE_THRESHOLD) {
        const direction = e.translationX > 0 ? 'like' : 'pass';
        translateX.value = withTiming(e.translationX > 0 ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5, { duration: 300 }, () => {
          runOnJS(handleSwipe)(direction);
          translateX.value = 0;
        });
      } else {
        translateX.value = withSpring(0, { damping: 15, stiffness: 120 });
      }
    });

  const handleButtonSwipe = (direction: 'like' | 'pass') => {
    const target = direction === 'like' ? SCREEN_WIDTH * 1.5 : -SCREEN_WIDTH * 1.5;
    translateX.value = withTiming(target, { duration: 300 }, () => {
      runOnJS(handleSwipe)(direction);
      translateX.value = 0;
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Compact Stories Bar — only 42px circles */}
      {storyGroups.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.storiesBar}
        >
          <StoryCircle name="You" initials="+" isAdd small onPress={() => {}} />
          {storyGroups.map((sg) => (
            <StoryCircle
              key={sg.userId}
              name={sg.userName.split(' ')[0]}
              initials={sg.userAvatar}
              seen={sg.seen}
              small
              onPress={() => router.push(`/stories/${sg.userId}`)}
            />
          ))}
        </ScrollView>
      )}

      {/* Card Stack — takes most of the screen */}
      <View style={styles.cardStack}>
        {visibleProfiles.length > 0 ? (
          visibleProfiles.map((profile, i) => {
            const isTop = i === 0;
            if (isTop) {
              return (
                <GestureDetector key={profile.id} gesture={panGesture}>
                  <View style={StyleSheet.absoluteFill}>
                    <SwipeCard profile={profile} isTop translateX={translateX} />
                  </View>
                </GestureDetector>
              );
            }
            return <SwipeCard key={profile.id} profile={profile} stackIndex={i} />;
          }).reverse()
        ) : (
          <View style={styles.empty}>
            <DiscoverIcon size={60} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No more people nearby</Text>
            <Text style={styles.emptyText}>Check back later for new frnds!</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => init()}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      {visibleProfiles.length > 0 && (
        <View style={[styles.actions, { paddingBottom: Math.max(6, insets.bottom) }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.nopeBtn]} onPress={() => handleButtonSwipe('pass')} activeOpacity={0.7}>
            <CloseIcon size={24} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.starBtn]} activeOpacity={0.7} onPress={() => handleButtonSwipe('like')}>
            <StarIcon size={20} color={Colors.gold} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => handleButtonSwipe('like')} activeOpacity={0.7}>
            <HeartIcon size={26} filled />
          </TouchableOpacity>
        </View>
      )}

      <MatchModal
        visible={showMatch}
        matchedUser={matchedUser}
        currentUser={currentUser}
        onChat={() => {
          setShowMatch(false);
          if (matchedUser) {
            router.push(`/(tabs)/chat/${matchedUser.id}`);
          }
        }}
        onContinue={() => setShowMatch(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  storiesBar: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    alignItems: 'center',
  },
  cardStack: { flex: 1, marginHorizontal: 10, marginTop: 2, marginBottom: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  actionBtn: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  nopeBtn: { width: 52, height: 52, backgroundColor: Colors.bgElevated },
  starBtn: { width: 44, height: 44, backgroundColor: Colors.bgElevated },
  likeBtn: { width: 52, height: 52, backgroundColor: Colors.bgElevated },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  refreshBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20 },
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
