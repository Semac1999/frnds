import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Colors } from '../constants/colors';
import { GradientButton } from './GradientButton';
import { Avatar } from './Avatar';
import { HeartIcon, StarIcon } from './Icons';
import type { SwipeProfile, User } from '../types';

interface Props {
  visible: boolean;
  matchedUser: SwipeProfile | null;
  currentUser: User | null;
  onChat: () => void;
  onContinue: () => void;
}

export function MatchModal({ visible, matchedUser, currentUser, onChat, onContinue }: Props) {
  if (!matchedUser || !currentUser) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <StarIcon size={52} color={Colors.primaryLight} />
          </View>
          <Text style={styles.title}>It's a Match!</Text>
          <Text style={styles.subtitle}>You and {matchedUser.displayName} liked each other</Text>
          <View style={styles.avatars}>
            <Avatar initials={currentUser.avatar} size={80} borderColor={Colors.primary} />
            <HeartIcon size={32} color={Colors.accent} filled />
            <Avatar initials={matchedUser.avatar} size={80} gradient={matchedUser.gradient} borderColor={Colors.accent} />
          </View>
          <GradientButton title="Send a Message" onPress={onChat} style={styles.chatBtn} />
          <TouchableOpacity onPress={onContinue}>
            <Text style={styles.continueText}>Keep Swiping</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', padding: 40 },
  iconWrap: { marginBottom: 16 },
  title: { fontSize: 36, fontWeight: '900', color: Colors.primaryLight, marginBottom: 8 },
  subtitle: { fontSize: 16, color: Colors.textSecondary, marginBottom: 24 },
  avatars: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 32 },
  chatBtn: { width: 260, marginBottom: 16 },
  continueText: { color: Colors.textMuted, fontSize: 14 },
});
