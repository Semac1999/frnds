import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Keyboard,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, runOnJS, withTiming, interpolate } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useDiscoverStore, useAuthStore, useStoryStore } from '../../../lib/store';
import { SwipeCard } from '../../../components/SwipeCard';
import { MatchModal } from '../../../components/MatchModal';
import { PaywallModal } from '../../../components/PaywallModal';
import { WelcomeAnimation } from '../../../components/WelcomeAnimation';
import { StoryCircle } from '../../../components/StoryCircle';
import { SendIcon, DiscoverIcon, GlobeIcon, PinIcon, ChatIcon } from '../../../components/Icons';
import { getCountry } from '../../../constants/countries';
import type { SwipeProfile } from '../../../types';

const QUICK_REPLIES = ['hey 👋', 'cute pic 😍', 'wyd?', 'vibes ✨', 'tell me more'];

export default function DiscoverScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
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
  const justSignedUp = useAuthStore((s) => s.justSignedUp);
  const clearJustSignedUp = useAuthStore((s) => s.clearJustSignedUp);
  const storyGroups = useStoryStore((s) => s.storyGroups);

  const [matchedUser, setMatchedUser] = useState<SwipeProfile | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => { if (justSignedUp) setWelcomeOpen(true); }, [justSignedUp]);

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);
  const topProfile = visibleProfiles[0];

  // Reload profiles when we cycle past the end. Only refetch ONCE per
  // empty state — if the backend keeps returning [], we stop trying so
  // the empty UI stays visible (no infinite loop, no repeating the same
  // people on every cycle).
  const refetchedOnceRef = React.useRef(false);
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      if (!refetchedOnceRef.current) {
        refetchedOnceRef.current = true;
        init();
      }
    } else if (currentIndex === 0) {
      // Reset the flag whenever a fresh batch arrives at index 0
      refetchedOnceRef.current = false;
    }
  }, [currentIndex, profiles.length, init]);

  // ===== Swipe gestures =====
  const translateX = useSharedValue(0);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    skip();
    setDraftMessage('');
  }, [skip]);

  const handleRewind = useCallback(() => {
    if (!currentUser?.isPremium) {
      setPaywallOpen(true);
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    goBack();
  }, [currentUser?.isPremium, goBack]);

  const triggerPaywall = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    setPaywallOpen(true);
  }, []);

  // Pure pan gesture — no minDistance, no race. Activates on any drag.
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = e.translationX;
    })
    .onEnd((e) => {
      const dx = e.translationX;
      const vx = e.velocityX;
      const isLeft = dx < -SWIPE_THRESHOLD || vx < -700;
      const isRight = dx > SWIPE_THRESHOLD || vx > 700;

      if (isLeft) {
        translateX.value = withTiming(-SCREEN_WIDTH * 1.4, { duration: 220 }, () => {
          runOnJS(handleSkip)();
          translateX.value = 0;
        });
      } else if (isRight) {
        if (!currentUser?.isPremium) {
          translateX.value = withSpring(0, { damping: 14, stiffness: 140 });
          runOnJS(triggerPaywall)();
        } else {
          translateX.value = withTiming(SCREEN_WIDTH * 1.4, { duration: 220 }, () => {
            runOnJS(handleRewind)();
            translateX.value = 0;
          });
        }
      } else {
        translateX.value = withSpring(0, { damping: 14, stiffness: 140 });
      }
    });

  // Hint stamps fade with drag
  const skipHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-SWIPE_THRESHOLD, 0], [1, 0]),
  }));
  const rewindHintStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, SWIPE_THRESHOLD], [0, 1]),
  }));

  // The whole top card moves with the gesture — keeps gesture-handler
  // tracking on the same view that's being transformed.
  const cardTransformStyle = useAnimatedStyle(() => {
    const rotate = interpolate(translateX.value, [-SCREEN_WIDTH, 0, SCREEN_WIDTH], [-12, 0, 12]);
    return {
      transform: [
        { translateX: translateX.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  // ===== Send message =====
  const sendNow = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || sending || !topProfile) return;
    setSending(true);
    try {
      const profile = topProfile;
      const res = await sendRequest(content);
      setSending(false);
      setDraftMessage('');
      Keyboard.dismiss();
      if (res?.matched && profile) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setMatchedUser(profile);
        setShowMatch(true);
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }
    } catch (err: any) {
      setSending(false);
      Alert.alert('Could not send', err?.message || 'Please try again');
    }
  }, [sending, sendRequest, topProfile]);

  const handleSendDraft = useCallback(() => sendNow(draftMessage), [draftMessage, sendNow]);

  // ===== Scope picker =====
  const handleSelectScope = async (newScope: 'world' | 'country') => {
    setScopePickerOpen(false);
    if (newScope === 'country' && !currentUser?.country) {
      Alert.alert('Set your country', 'Add your country to your profile to use this filter.', [{ text: 'OK' }]);
      return;
    }
    if (newScope !== scope) await setScope(newScope);
  };

  const myCountry = getCountry(currentUser?.country);
  const scopeLabel = scope === 'country' && myCountry ? `${myCountry.flag} ${myCountry.name}` : '🌍 Worldwide';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Top bar: scope picker */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.scopeBtn} onPress={() => setScopePickerOpen(true)} activeOpacity={0.8} hitSlop={8}>
          {scope === 'country' ? <PinIcon size={14} color={Colors.text} /> : <GlobeIcon size={14} color={Colors.text} />}
          <Text style={styles.scopeText} numberOfLines={1}>{scopeLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Compact stories */}
      {storyGroups.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.storiesBar}>
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

      {/* Card stack */}
      <View style={styles.cardStack}>
        {visibleProfiles.length > 0 ? (
          <>
            {visibleProfiles.slice(1).reverse().map((profile, i) => (
              <SwipeCard key={profile.id} profile={profile} stackIndex={visibleProfiles.length - 1 - i} />
            ))}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[StyleSheet.absoluteFill, cardTransformStyle]}>
                <SwipeCard profile={topProfile} isTop />
                <Animated.View pointerEvents="none" style={[styles.hintStamp, styles.hintLeft, skipHintStyle]}>
                  <Text style={styles.hintText}>SKIP</Text>
                </Animated.View>
                <Animated.View pointerEvents="none" style={[styles.hintStamp, styles.hintRight, rewindHintStyle]}>
                  <Text style={styles.hintText}>{currentUser?.isPremium ? 'REWIND' : 'frnds+'}</Text>
                </Animated.View>
              </Animated.View>
            </GestureDetector>
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>🌍</Text>
            <Text style={styles.emptyTitle}>You've seen everyone</Text>
            <Text style={styles.emptyText}>
              {scope === 'country'
                ? `No more new people in ${getCountry(currentUser?.country)?.name || 'your country'} right now.`
                : "You've gone through everyone on frnds for now. New people join every day — check back soon!"}
            </Text>
            <View style={styles.emptyActions}>
              {scope === 'country' && (
                <TouchableOpacity
                  style={styles.emptyPrimary}
                  onPress={() => setScope('world')}
                  activeOpacity={0.85}
                >
                  <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyPrimaryInner}>
                    <GlobeIcon size={16} color="#fff" />
                    <Text style={styles.emptyPrimaryText}>Search Worldwide</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.emptySecondary} onPress={() => { refetchedOnceRef.current = false; init(); }}>
                <Text style={styles.emptySecondaryText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Quick reply chips + "Send a chat" input (Wizz style) */}
      {topProfile && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.chipsRow}
          >
            {QUICK_REPLIES.map((q) => (
              <TouchableOpacity
                key={q}
                style={styles.chip}
                onPress={() => sendNow(q)}
                disabled={sending}
                activeOpacity={0.85}
              >
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom + 4, 10) }]}>
            <View style={styles.inputIconWrap}>
              <ChatIcon size={20} color={Colors.primaryLight} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Send a chat"
              placeholderTextColor={Colors.textMuted}
              value={draftMessage}
              onChangeText={setDraftMessage}
              maxLength={500}
              returnKeyType="send"
              onSubmitEditing={handleSendDraft}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draftMessage.trim() || sending) && styles.sendBtnDisabled]}
              onPress={handleSendDraft}
              disabled={!draftMessage.trim() || sending}
              activeOpacity={0.85}
            >
              <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendGradient}>
                <SendIcon size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
          if (matchedUser) router.push(`/(tabs)/chat/${matchedUser.id}`);
        }}
        onContinue={() => setShowMatch(false)}
      />

      <WelcomeAnimation
        visible={welcomeOpen}
        displayName={currentUser?.displayName}
        onDone={() => { setWelcomeOpen(false); clearJustSignedUp(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 14, paddingTop: 4, paddingBottom: 4 },
  scopeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.bgElevated, borderRadius: 14,
    borderWidth: 1, borderColor: Colors.border, maxWidth: 220,
  },
  scopeText: { color: Colors.text, fontWeight: '600', fontSize: 12 },
  storiesBar: { paddingHorizontal: 10, paddingVertical: 4, gap: 6, alignItems: 'center' },

  cardStack: { flex: 1, marginHorizontal: 10, marginTop: 2, marginBottom: 4 },
  hintStamp: {
    position: 'absolute', top: 80,
    paddingVertical: 6, paddingHorizontal: 16,
    borderRadius: 10, borderWidth: 4,
  },
  hintLeft: { left: 24, borderColor: Colors.red, transform: [{ rotate: '-12deg' }] },
  hintRight: { right: 24, borderColor: Colors.primaryLight, transform: [{ rotate: '12deg' }] },
  hintText: { color: '#fff', fontWeight: '900', fontSize: 24, letterSpacing: 1.2 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emptyEmoji: { fontSize: 64, marginBottom: 6 },
  emptyTitle: { fontSize: 24, fontWeight: '900', color: Colors.text, marginBottom: 10, marginTop: 8, letterSpacing: -0.4 },
  emptyText: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 320 },
  emptyActions: { marginTop: 24, gap: 10, alignItems: 'center', alignSelf: 'stretch' },
  emptyPrimary: { borderRadius: 999, overflow: 'hidden' },
  emptyPrimaryInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 22, paddingVertical: 12 },
  emptyPrimaryText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  emptySecondary: { paddingVertical: 8, paddingHorizontal: 16 },
  emptySecondaryText: { color: Colors.primaryLight, fontWeight: '700', fontSize: 14 },
  refreshBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20 },
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Quick reply chips
  chipsRow: { paddingHorizontal: 12, paddingTop: 10, gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Input bar (Wizz style)
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 10,
    backgroundColor: Colors.bg,
  },
  inputIconWrap: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.bgElevated,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11,
    backgroundColor: Colors.bgInput, borderRadius: 22,
    color: Colors.text, fontSize: 14,
  },
  sendBtn: { borderRadius: 22, overflow: 'hidden' },
  sendBtnDisabled: { opacity: 0.4 },
  sendGradient: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },

  // Scope sheet
  scopeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  scopeSheet: { width: '100%', backgroundColor: Colors.bgCard, borderRadius: 20, padding: 16, gap: 8, borderWidth: 1, borderColor: Colors.border },
  scopeSheetTitle: { color: Colors.text, fontSize: 18, fontWeight: '700', marginBottom: 6 },
  scopeOption: { padding: 14, backgroundColor: Colors.bgElevated, borderRadius: 14, borderWidth: 2, borderColor: 'transparent' },
  scopeOptionActive: { borderColor: Colors.primary },
  scopeOptionText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  scopeOptionHint: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
