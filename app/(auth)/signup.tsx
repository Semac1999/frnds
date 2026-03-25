import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { GradientButton } from '../../components/GradientButton';
import { InterestTag } from '../../components/InterestTag';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../../lib/store';

const ALL_INTERESTS = ['music', 'gaming', 'sports', 'art', 'travel', 'food', 'movies', 'fitness', 'tech', 'fashion', 'photography', 'animals'];

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSignup = async () => {
    if (!name.trim() || !username.trim() || !age.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }
    const ageNum = parseInt(age);
    if (ageNum < 13) {
      Alert.alert('Age restriction', 'You must be at least 13 to use frnds');
      return;
    }

    try {
      await signup({
        email: email.trim(),
        password: password.trim(),
        username: username.trim(),
        displayName: name.trim(),
        age: ageNum,
        interests,
      });

      // Init stores (works with both real API and mock fallback)
      await useDiscoverStore.getState().init();
      await useChatStore.getState().init();
      await useStoryStore.getState().init();

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Signup failed', err.message || 'Something went wrong');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.logo}>frnds</Text>

      <View style={styles.tabs}>
        <View style={[styles.tab, styles.tabActive]}>
          <Text style={styles.tabTextActive}>Sign Up</Text>
        </View>
        <TouchableOpacity style={styles.tab} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.tabText}>Log In</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Your name" placeholderTextColor={Colors.textMuted} value={name} onChangeText={setName} />
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Username" placeholderTextColor={Colors.textMuted} value={username} onChangeText={setUsername} autoCapitalize="none" />
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Age" placeholderTextColor={Colors.textMuted} value={age} onChangeText={setAge} keyboardType="number-pad" />
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Email" placeholderTextColor={Colors.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.inputGroup}>
        <TextInput style={styles.input} placeholder="Password" placeholderTextColor={Colors.textMuted} value={password} onChangeText={setPassword} secureTextEntry />
      </View>

      <Text style={styles.vibesLabel}>Pick your vibes:</Text>
      <View style={styles.tags}>
        {ALL_INTERESTS.map((tag) => (
          <InterestTag key={tag} label={tag} selected={interests.includes(tag)} onPress={() => toggleInterest(tag)} />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 20 }} />
      ) : (
        <GradientButton title="Create Account" onPress={handleSignup} style={{ marginTop: 20 }} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginBottom: 32, color: Colors.primaryLight },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Layout.radius, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  input: { padding: 14, paddingLeft: 16, backgroundColor: Colors.bgInput, borderWidth: 2, borderColor: Colors.border, borderRadius: Layout.radiusSm, color: Colors.text, fontSize: 15 },
  vibesLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
