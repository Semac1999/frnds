import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useDiscoverStore, useChatStore, useAuthStore, useStoryStore } from '../../../lib/store';
import { SwipeCard } from '../../../components/SwipeCard';
import { MatchModal } from '../../../components/MatchModal';
import { StoryCircle } from '../../../components/StoryCircle';
import { CloseIcon, StarIcon, HeartIcon } from '../../../components/Icons';
import type { SwipeProfile } from '../../../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { profiles, currentIndex, swipe, matches } = useDiscoverStore();
  const addChat = useChatStore((s) => s.addChat);
  const currentUser = useAuthStore((s) => s.user);
  const storyGroups = useStoryStore((s) => s.storyGroups);

  const [matchedUser, setMatchedUser] = useState<SwipeProfile | null>(null);
  const [showMatch, setShowMatch] = useState(false);

  const translateX = useSharedValue(0);

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);

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
      {/* Stories Bar */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesBar}>
        <StoryCircle name="Your Story" initials="+" isAdd onPress={() => {}} />
        {storyGroups.map((sg) => (
          <StoryCircle
            key={sg.userId}
            name={sg.userName}
            initials={sg.userAvatar}
            seen={sg.seen}
            onPress={() => router.push(`/stories/${sg.userId}`)}
          />
        ))}
      </ScrollView>

      {/* Card Stack */}
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
            <Text style={styles.emptyIcon}>🔄</Text>
            <Text style={styles.emptyTitle}>No more people nearby</Text>
            <Text style={styles.emptyText}>Check back later for new frnds!</Text>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.nopeBtn]} onPress={() => handleButtonSwipe('pass')} activeOpacity={0.7}>
          <CloseIcon size={24} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.starBtn]} activeOpacity={0.7} onPress={() => handleButtonSwipe('like')}>
          <StarIcon size={20} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.likeBtn]} onPress={() => handleButtonSwipe('like')} activeOpacity={0.7}>
          <HeartIcon size={26} filled />
        </TouchableOpacity>
      </View>

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
  storiesBar: { paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  cardStack: { flex: 1, marginHorizontal: 16, marginTop: 8, maxHeight: 520 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 16 },
  actionBtn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4 },
  nopeBtn: { width: 52, height: 52, backgroundColor: Colors.bgElevated },
  starBtn: { width: 44, height: 44, backgroundColor: Colors.bgElevated },
  likeBtn: { width: 52, height: 52, backgroundColor: Colors.bgElevated },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 60, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
});
