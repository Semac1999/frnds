import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useDiscoverStore, useAuthStore, useStoryStore } from '../../../lib/store';
import { SwipeCard } from '../../../components/SwipeCard';
import { MatchModal } from '../../../components/MatchModal';
import { PaywallModal } from '../../../components/PaywallModal';
import { StoryCircle } from '../../../components/StoryCircle';
import { SendIcon, DiscoverIcon, GlobeIcon, PinIcon } from '../../../components/Icons';
import { getCountry } from '../../../constants/countries';
import type { SwipeProfile } from '../../../types';

export default function DiscoverScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
  const insets = useSafeAreaInsets();

  const profiles = useDiscoverStore((s) => s.profiles);
  const currentIndex = useDiscoverStore((s) => s.currentIndex);
  const sendRequest = useDiscoverStore((s) => s.sendRequest);
  const skip = useDiscoverStore((s) => s.skip);
  const goBack = useDiscoverStore((s) => s.goBack);
  const init = useDiscoverStore((s) => s.init);
  const scope = useDiscoverStore((s) => s.scope);
  const setScope = useDiscoverStore((s) => s.setScope);

  const currentUser = useAuthStore((s) => s.user);
  const storyGroups = useStoryStore((s) => s.storyGroups);

  const [matchedUser, setMatchedUser] = useState<SwipeProfile | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);
  const topProfile = visibleProfiles[0];

  // Reload profiles when we run out
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      init();
    }
  }, [currentIndex, profiles.length]);

  // ===== Swipe gestures =====
  const translateX = useSharedValue(0);

  const animateAndSkip = useCallback(() => {
    skip();
    setDraftMessage('');
  }, [skip]);

  const animateAndRewind = useCallback(() => {
    if (!currentUser?.isPremium) {
      setPaywallOpen(true);
      return;
    }
    goBack();
  }, [currentUser?.isPremium, goBack]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-15, 15])
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const dx = e.translationX;
      if (dx < -SWIPE_THRESHOLD) {
        // Left swipe → next profile
        translateX.value = withTiming(-SCREEN_WIDTH * 1.4, { duration: 250 }, () => {
          runOnJS(animateAndSkip)();
          translateX.value = 0;
        });
      } else if (dx > SWIPE_THRESHOLD) {
        // Right swipe → rewind (premium only)
        if (!currentUser?.isPremium) {
          // Animate snap-back, then show paywall
          translateX.value = withSpring(0, { damping: 14, stiffness: 140 });
          runOnJS(setPaywallOpen)(true);
        } else {
          translateX.value = withTiming(SCREEN_WIDTH * 1.4, { duration: 250 }, () => {
            runOnJS(animateAndRewind)();
            translateX.value = 0;
          });
        }
      } else {
        translateX.value = withSpring(0, { damping: 14, stiffness: 140 });
      }
    });

  // Swipe-back hint overlay (right) — fades in when user starts swiping right
  const rewindHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));
  const skipHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));

  // ===== Send message =====
  const handleSend = useCallback(async () => {
    const content = draftMessage.trim();
    if (!content || sending || !topProfile) return;
    setSending(true);
    try {
      const profile = topProfile;
      const res = await sendRequest(content);
      setSending(false);
      setDraftMessage('');
      if (res?.matched && profile) {
        setMatchedUser(profile);
        setShowMatch(true);
      }
    } catch (err: any) {
      setSending(false);
      Alert.alert('Could not send', err?.message || 'Please try again');
    }
  }, [draftMessage, sending, sendRequest, topProfile]);

  // ===== Scope picker =====
  const handleSelectScope = async (newScope: 'world' | 'country') => {
    setScopePickerOpen(false);
    if (newScope === 'country' && !currentUser?.country) {
      Alert.alert('Set your country', 'Add your country to your profile to use this filter.', [{ text: 'OK' }]);
      return;
    }
    if (newScope !== scope) {
      await setScope(newScope);
    }
  };

  const myCountry = getCountry(currentUser?.country);
  const scopeLabel = scope === 'country' && myCountry ? `${myCountry.flag} ${myCountry.name}` : '🌍 Worldwide';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar: scope picker */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.scopeBtn}
          onPress={() => setScopePickerOpen(true)}
          activeOpacity={0.8}
          hitSlop={8}
        >
          {scope === 'country' ? <PinIcon size={14} color={Colors.text} /> : <GlobeIcon size={14} color={Colors.text} />}
          <Text style={styles.scopeText} numberOfLines={1}>{scopeLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Compact stories */}
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

      {/* Card stack — wrapped in pan gesture */}
      <View style={styles.cardStack}>
        {visibleProfiles.length > 0 ? (
          <>
            {/* Background cards (bottom of stack) */}
            {visibleProfiles.slice(1).reverse().map((profile, i) => (
              <SwipeCard key={profile.id} profile={profile} stackIndex={visibleProfiles.length - 1 - i} />
            ))}
            {/* Top card with gesture */}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={StyleSheet.absoluteFill}>
                <SwipeCard profile={topProfile} isTop translateX={translateX} />
                {/* Hint overlays */}
                <Animated.View pointerEvents="none" style={[styles.hint, styles.hintLeft, skipHintStyle]}>
                  <Text style={styles.hintText}>SKIP</Text>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.hint, styles.hintRight, rewindHintStyle]}>
                  <Text style={styles.hintText}>{currentUser?.isPremium ? 'REWIND' : 'frnds+'}</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        ) : (
          <View style={styles.empty}>
            <DiscoverIcon size={60} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No more people nearby</Text>
            <Text style={styles.emptyText}>
              {scope === 'country' ? 'Try Worldwide for more matches.' : 'Check back later for new frnds!'}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => init()}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom: text input replaces the X + Send buttons */}
      {topProfile && (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={80}
        >
          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom + 4, 10) }]}>
            <TextInput
              style={styles.input}
              placeholder={`Message ${topProfile.displayName.split(' ')[0]}…`}
              placeholderTextColor={Colors.textMuted}
              value={draftMessage}
              onChangeText={setDraftMessage}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draftMessage.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draftMessage.trim() || sending}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.sendGradient}
              >
                <SendIcon size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.swipeHint}>← swipe to skip   ·   swipe right to rewind</Text>
        </KeyboardAvoidingView>
      )}

      {/* Scope Picker */}
      <Modal visible={scopePickerOpen} transparent animationType="fade" onRequestClose={() => setScopePickerOpen(false)}>
        <TouchableOpacity style={styles.scopeOverlay} activeOpacity={1} onPress={() => setScopePickerOpen(false)}>
          <View style={styles.scopeSheet}>
            <Text style={styles.scopeSheetTitle}>Search where?</Text>
            <TouchableOpacity
              style={[styles.scopeOption, scope === 'world' && styles.scopeOptionActive]}
              onPress={() => handleSelectScope('world')}
              activeOpacity={0.8}
            >
              <Text style={styles.scopeOptionText}>🌍 Worldwide</Text>
              <Text style={styles.scopeOptionHint}>Meet anyone, anywhere</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeOption, scope === 'country' && styles.scopeOptionActive]}
              onPress={() => handleSelectScope('country')}
              activeOpacity={0.8}
            >
              <Text style={styles.scopeOptionText}>
                {myCountry ? `${myCountry.flag} ${myCountry.name}` : '📍 My country'}
              </Text>
              <Text style={styles.scopeOptionHint}>
                {myCountry ? 'People in your country' : 'Set your country in profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <PaywallModal
        visible={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        title="Unlock Rewind"
        subtitle="Swipe right to revisit profiles you skipped — only with frnds+."
      />

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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 4,
  },
  scopeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 220,
  },
  scopeText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
  storiesBar: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 6,
    alignItems: 'center',
  },
  cardStack: { flex: 1, marginHorizontal: 10, marginTop: 2, marginBottom: 4 },
  hint: {
    position: 'absolute',
    top: 30,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#fff',
    transform: [{ rotate: '-12deg' }],
  },
  hintLeft: { left: 18, borderColor: Colors.red, transform: [{ rotate: '-12deg' }] },
  hintRight: { right: 18, borderColor: Colors.primaryLight, transform: [{ rotate: '12deg' }] },
  hintText: { color: '#fff', fontWeight: '900', fontSize: 22, letterSpacing: 1 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 30 },
  refreshBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20 },
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: Colors.bgInput,
    borderRadius: 22,
    color: Colors.text,
    fontSize: 14,
  },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.4 },
  sendGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeHint: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', backgroundColor: Colors.bgCard, paddingVertical: 4 },

  scopeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scopeSheet: {
    width: '100%',
    backgroundColor: Colors.bgCard,
    borderRadius: 20,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeSheetTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  scopeOption: {
    padding: 14,
    backgroundColor: Colors.bgElevated,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  scopeOptionActive: { borderColor: Colors.primary },
  scopeOptionText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  scopeOptionHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
