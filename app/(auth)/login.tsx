import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { GradientButton } from '../../components/GradientButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../../lib/store';

const DEMO_USERS = [
  { name: 'Emma Johnson', email: 'emma_j@demo.frnds.app' },
  { name: 'Liam Chen', email: 'liam_chen@demo.frnds.app' },
  { name: 'Sofia Rodriguez', email: 'sofia_r@demo.frnds.app' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const initStores = async () => {
    await Promise.all([
      useDiscoverStore.getState().init(),
      useChatStore.getState().init(),
      useStoryStore.getState().init(),
    ]);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter your email and password');
      return;
    }
    try {
      await login({ email: email.trim().toLowerCase(), password: password.trim() });
      await initStores();
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Login failed', err.message || 'Could not connect to server. Check your credentials.');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    try {
      await login({ email: demoEmail, password: 'demo1234' });
      await initStores();
      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Demo login failed', err.message || 'The server may be waking up — try again in 30s.');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>frnds</Text>
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.tabText}>Sign Up</Text>
        </TouchableOpacity>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>Log In</Text>
        </View>
      </View>

      <GoogleSignInButton mode="login" />

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 8 }} />
      ) : (
        <GradientButton title="Log In" onPress={handleLogin} style={{ marginTop: 8 }} />
      )}

      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>Try a demo account</Text>
        <Text style={styles.demoHint}>Tap to sign in instantly. Password for all demo accounts: demo1234</Text>
        {DEMO_USERS.map((u) => (
          <TouchableOpacity
            key={u.email}
            style={styles.demoBtn}
            onPress={() => handleDemoLogin(u.email)}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.demoBtnName}>{u.name}</Text>
            <Text style={styles.demoBtnEmail}>{u.email}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, paddingTop: 80, paddingBottom: 60 },
  logo: { fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginBottom: 32, color: Colors.primaryLight },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Layout.radius, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
  inputGroup: { marginBottom: 14 },
  input: { padding: 14, paddingLeft: 16, backgroundColor: Colors.bgInput, borderWidth: 2, borderColor: Colors.border, borderRadius: Layout.radiusSm, color: Colors.text, fontSize: 15 },
  demoSection: {
    marginTop: 32, padding: 16, borderRadius: 14,
    backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border,
  },
  demoTitle: { color: Colors.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  demoHint: { color: Colors.textMuted, fontSize: 12, marginBottom: 12 },
  demoBtn: {
    paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: Colors.bgElevated, borderRadius: 10,
    marginBottom: 8,
  },
  demoBtnName: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  demoBtnEmail: { color: Colors.textMuted, fontSize: 12, marginTop: 1 },
});
