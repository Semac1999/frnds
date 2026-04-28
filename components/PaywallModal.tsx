import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';
import { CloseIcon } from './Icons';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful upgrade. */
  onUpgraded?: () => void;
  title?: string;
  subtitle?: string;
}

const FEATURES: { emoji: string; title: string; subtitle: string }[] = [
  { emoji: '↩️', title: 'Rewind', subtitle: 'Swipe right to revisit profiles you skipped' },
  { emoji: '🔥', title: 'Unlimited matches', subtitle: 'Send as many message requests as you want' },
  { emoji: '🌍', title: 'Worldwide search', subtitle: 'Discover people anywhere on the planet' },
  { emoji: '✨', title: 'Boost your profile', subtitle: 'Be seen by more people each week' },
  { emoji: '🚫', title: 'No ads, ever', subtitle: 'A clean, focused experience' },
];

export function PaywallModal({ visible, onClose, onUpgraded, title, subtitle }: Props) {
  const [busy, setBusy] = useState(false);
  const user = useAuthStore((s) => s.user);
  const loginLocal = useAuthStore((s) => s.loginLocal);

  const handleUpgrade = async (plan: 'monthly' | 'yearly') => {
    if (busy || !user) return;
    setBusy(true);
    try {
      // Mock purchase. In production this triggers an IAP flow then sends
      // the receipt to /api/users/me/premium for verification.
      const updated = await api.upgradePremium();
      loginLocal({ ...user, ...(updated || {}), isPremium: true });
      setBusy(false);
      onUpgraded?.();
      onClose();
      Alert.alert('Welcome to frnds+', `You're now a ${plan === 'yearly' ? 'yearly' : 'monthly'} subscriber. Enjoy!`);
    } catch (err: any) {
      setBusy(false);
      Alert.alert('Could not upgrade', err?.message || 'Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={16}>
            <CloseIcon size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.brand}>frnds+</Text>
          <Text style={styles.headline}>{title || 'Unlock Rewind'}</Text>
          <Text style={styles.sub}>{subtitle || 'Swipe right to go back to profiles you skipped — only with frnds+.'}</Text>
        </LinearGradient>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.feature}>
              <Text style={styles.emoji}>{f.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureSub}>{f.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Plans */}
        <View style={styles.plans}>
          <TouchableOpacity
            style={[styles.plan, styles.planRecommended]}
            onPress={() => handleUpgrade('yearly')}
            disabled={busy}
            activeOpacity={0.85}
          >
            <View style={styles.bestBadge}><Text style={styles.bestBadgeText}>Best value · Save 50%</Text></View>
            <Text style={styles.planTitle}>Yearly</Text>
            <Text style={styles.planPrice}>$3.99 / month</Text>
            <Text style={styles.planNote}>Billed $47.88 yearly</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.plan}
            onPress={() => handleUpgrade('monthly')}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={styles.planTitle}>Monthly</Text>
            <Text style={styles.planPrice}>$7.99 / month</Text>
            <Text style={styles.planNote}>Billed monthly</Text>
          </TouchableOpacity>
        </View>

        {busy && (
          <View style={styles.busyOverlay}>
            <ActivityIndicator color={Colors.primaryLight} size="large" />
          </View>
        )}

        <Text style={styles.legal}>Cancel anytime. Restores apply across devices.</Text>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingTop: 40, paddingBottom: 32, paddingHorizontal: 24, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 16, right: 16 },
  brand: { color: '#fff', fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  headline: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 6, textAlign: 'center' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, textAlign: 'center', maxWidth: 320 },

  features: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: Colors.bgCard, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: Colors.border },
  emoji: { fontSize: 26 },
  featureTitle: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  featureSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  plans: { paddingHorizontal: 20, paddingTop: 22, gap: 10 },
  plan: { backgroundColor: Colors.bgElevated, borderRadius: 16, padding: 16, borderWidth: 2, borderColor: Colors.border },
  planRecommended: { borderColor: Colors.primary, backgroundColor: Colors.bgCard },
  bestBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 6 },
  bestBadgeText: { color: '#fff', fontWeight: '800', fontSize: 11, letterSpacing: 0.4 },
  planTitle: { color: Colors.text, fontWeight: '800', fontSize: 17 },
  planPrice: { color: Colors.primaryLight, fontWeight: '800', fontSize: 18, marginTop: 2 },
  planNote: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },

  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  legal: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', padding: 18 },
});
