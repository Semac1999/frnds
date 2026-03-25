import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { GradientButton } from '../../components/GradientButton';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../../lib/store';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please enter your email and password');
      return;
    }

    try {
      await login({ email: email.trim(), password: password.trim() });

      // Init stores (works with both real API and mock fallback)
      await useDiscoverStore.getState().init();
      await useChatStore.getState().init();
      await useStoryStore.getState().init();

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Login failed', err.message || 'Something went wrong');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>frnds</Text>
      <View style={styles.tabs}>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(auth)/signup')}>
          <Text style={styles.tabText}>Sign Up</Text>
        </TouchableOpacity>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>Log In</Text>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 24, paddingTop: 80, justifyContent: 'flex-start' },
  logo: { fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginBottom: 32, color: Colors.primaryLight },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Layout.radius, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  input: { padding: 14, paddingLeft: 16, backgroundColor: Colors.bgInput, borderWidth: 2, borderColor: Colors.border, borderRadius: Layout.radiusSm, color: Colors.text, fontSize: 15 },
});
