import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useDiscoverStore, useAuthStore, useStoryStore } from '../../../lib/store';
import { SwipeCard } from '../../../components/SwipeCard';
import { MatchModal } from '../../../components/MatchModal';
import { StoryCircle } from '../../../components/StoryCircle';
import { CloseIcon, SendIcon, DiscoverIcon, GlobeIcon, PinIcon } from '../../../components/Icons';
import { getCountry } from '../../../constants/countries';
import type { SwipeProfile } from '../../../types';

export default function DiscoverScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { profiles, currentIndex, sendRequest, skip, init, scope, setScope } = useDiscoverStore();
  const currentUser = useAuthStore((s) => s.user);
  const storyGroups = useStoryStore((s) => s.storyGroups);

  const [matchedUser, setMatchedUser] = useState<SwipeProfile | null>(null);
  const [showMatch, setShowMatch] = useState(false);
  const [composing, setComposing] = useState(false);
  const [draftMessage, setDraftMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [scopePickerOpen, setScopePickerOpen] = useState(false);

  const visibleProfiles = profiles.slice(currentIndex, currentIndex + 3);
  const topProfile = visibleProfiles[0];

  // Reload profiles when we run out
  useEffect(() => {
    if (profiles.length > 0 && currentIndex >= profiles.length) {
      init();
    }
  }, [currentIndex, profiles.length]);

  const openCompose = useCallback(() => {
    if (!topProfile) return;
    setDraftMessage('');
    setComposing(true);
  }, [topProfile]);

  const handleSend = useCallback(async () => {
    const content = draftMessage.trim();
    if (!content) return;
    if (sending) return;
    setSending(true);
    try {
      const profile = topProfile;
      const res = await sendRequest(content);
      setSending(false);
      setComposing(false);
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

  const handleSkip = () => {
    skip();
  };

  const handleSelectScope = async (newScope: 'world' | 'country') => {
    setScopePickerOpen(false);
    if (newScope === 'country' && !currentUser?.country) {
      Alert.alert('Set your country', 'Add your country to your profile to use this filter.', [
        { text: 'OK' },
      ]);
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
        >
          {scope === 'country' ? <PinIcon size={14} color={Colors.text} /> : <GlobeIcon size={14} color={Colors.text} />}
          <Text style={styles.scopeText} numberOfLines={1}>{scopeLabel}</Text>
        </TouchableOpacity>
      </View>

      {/* Compact Stories Bar */}
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

      {/* Card Stack */}
      <View style={styles.cardStack}>
        {visibleProfiles.length > 0 ? (
          visibleProfiles.map((profile, i) => {
            const isTop = i === 0;
            if (isTop) {
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={StyleSheet.absoluteFill}
                  activeOpacity={0.95}
                  onPress={openCompose}
                >
                  <SwipeCard profile={profile} isTop />
                </TouchableOpacity>
              );
            }
            return <SwipeCard key={profile.id} profile={profile} stackIndex={i} />;
          }).reverse()
        ) : (
          <View style={styles.empty}>
            <DiscoverIcon size={60} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No more people nearby</Text>
            <Text style={styles.emptyText}>
              {scope === 'country' ? 'Try switching to Worldwide for more matches.' : 'Check back later for new frnds!'}
            </Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={() => init()}>
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Action Buttons — Skip + Send Message */}
      {visibleProfiles.length > 0 && (
        <View style={[styles.actions, { paddingBottom: Math.max(6, insets.bottom) }]}>
          <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={handleSkip} activeOpacity={0.7}>
            <CloseIcon size={26} />
          </TouchableOpacity>
          <TouchableOpacity onPress={openCompose} activeOpacity={0.85} style={styles.sendBtnWrap}>
            <LinearGradient
              colors={[...Gradients.primary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.sendBtn}
            >
              <SendIcon size={20} color="#fff" />
              <Text style={styles.sendBtnText}>Send message</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}

      {/* Compose Modal */}
      <Modal visible={composing} transparent animationType="slide" onRequestClose={() => setComposing(false)}>
        <KeyboardAvoidingView
          style={styles.composeOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={styles.composeBackdrop} activeOpacity={1} onPress={() => setComposing(false)} />
          <View style={styles.composeSheet}>
            <View style={styles.composeHandle} />
            {topProfile && (
              <Text style={styles.composeTitle}>Message {topProfile.displayName.split(' ')[0]}</Text>
            )}
            <Text style={styles.composeHint}>Write the first message they’ll see. They can accept or decline.</Text>
            <TextInput
              style={styles.composeInput}
              placeholder="Hey, I noticed we both…"
              placeholderTextColor={Colors.textMuted}
              value={draftMessage}
              onChangeText={setDraftMessage}
              multiline
              maxLength={500}
              autoFocus
            />
            <View style={styles.composeRow}>
              <Text style={styles.composeCount}>{draftMessage.length}/500</Text>
              <TouchableOpacity
                style={[styles.composeSend, (!draftMessage.trim() || sending) && styles.composeSendDisabled]}
                onPress={handleSend}
                disabled={!draftMessage.trim() || sending}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[...Gradients.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.composeSendInner}
                >
                  <SendIcon size={16} color="#fff" />
                  <Text style={styles.composeSendText}>{sending ? 'Sending…' : 'Send request'}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Scope Picker */}
      <Modal visible={scopePickerOpen} transparent animationType="fade" onRequestClose={() => setScopePickerOpen(false)}>
        <TouchableOpacity style={styles.scopeOverlay} activeOpacity={1} onPress={() => setScopePickerOpen(false)}>
          <View style={styles.scopeSheet}>
            <Text style={styles.scopeSheetTitle}>Search where?</Text>
            <TouchableOpacity
              style={[styles.scopeOption, scope === 'world' && styles.scopeOptionActive]}
              onPress={() => handleSelectScope('world')}
            >
              <Text style={styles.scopeOptionText}>🌍 Worldwide</Text>
              <Text style={styles.scopeOptionHint}>Meet anyone, anywhere</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopeOption, scope === 'country' && styles.scopeOptionActive]}
              onPress={() => handleSelectScope('country')}
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
  cardStack: { flex: 1, marginHorizontal: 10, marginTop: 2, marginBottom: 2 },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
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
  skipBtn: { width: 52, height: 52, backgroundColor: Colors.bgElevated },
  sendBtnWrap: { flex: 1 },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 999,
    paddingHorizontal: 18,
  },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8, marginTop: 16 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: 30 },
  refreshBtn: { marginTop: 20, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 20 },
  refreshText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  composeOverlay: { flex: 1, justifyContent: 'flex-end' },
  composeBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)' },
  composeSheet: {
    backgroundColor: Colors.bgCard,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  composeHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    marginBottom: 14,
  },
  composeTitle: { color: Colors.text, fontSize: 20, fontWeight: '700' },
  composeHint: { color: Colors.textMuted, fontSize: 13, marginTop: 4, marginBottom: 12 },
  composeInput: {
    minHeight: 110,
    maxHeight: 220,
    backgroundColor: Colors.bgInput,
    color: Colors.text,
    padding: 14,
    borderRadius: 14,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  composeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  composeCount: { color: Colors.textMuted, fontSize: 12 },
  composeSend: { borderRadius: 999, overflow: 'hidden' },
  composeSendDisabled: { opacity: 0.5 },
  composeSendInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  composeSendText: { color: '#fff', fontWeight: '700', fontSize: 14 },

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
