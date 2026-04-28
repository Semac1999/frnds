import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Image, Modal, FlatList } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { GradientButton } from '../../components/GradientButton';
import { InterestTag } from '../../components/InterestTag';
import { CameraIcon, PinIcon } from '../../components/Icons';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../../lib/store';
import { COUNTRIES, getCountry } from '../../constants/countries';

const ALL_INTERESTS = ['music', 'gaming', 'sports', 'art', 'travel', 'food', 'movies', 'fitness', 'tech', 'fashion', 'photography', 'animals'];

export default function SignupScreen() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [country, setCountry] = useState<string>('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setPhoto(uri);
    }
  };

  const toggleInterest = (tag: string) => {
    setInterests((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSignup = async () => {
    if (!name.trim() || !username.trim() || !age.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }
    if (!photo) {
      Alert.alert('Add a photo', 'Add a profile photo so people can recognise you. Tap the camera icon at the top.');
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
        username: username.trim().toLowerCase(),
        displayName: name.trim(),
        age: ageNum,
        interests,
        country: country || undefined,
        photo: photo || undefined,
      });

      // Init stores with real backend data
      await Promise.all([
        useDiscoverStore.getState().init(),
        useChatStore.getState().init(),
        useStoryStore.getState().init(),
      ]);

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Signup failed', err.message || 'Could not connect to server. Please try again.');
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

      <GoogleSignInButton mode="signup" />
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or sign up with email</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Profile Photo Picker — required */}
      <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto} activeOpacity={0.7}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photoPreview} />
        ) : (
          <View style={[styles.photoPlaceholder, styles.photoRequired]}>
            <CameraIcon size={32} color={Colors.primaryLight} />
            <Text style={styles.photoTextRequired}>Add Photo</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.photoHelp}>{photo ? 'Tap to change your photo' : 'A profile photo is required'}</Text>

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

      <TouchableOpacity style={styles.countryBtn} onPress={() => setCountryPickerOpen(true)} activeOpacity={0.7}>
        <PinIcon size={16} color={Colors.textMuted} />
        <Text style={[styles.countryText, !country && { color: Colors.textMuted }]}>
          {country
            ? `${getCountry(country)?.flag || ''} ${getCountry(country)?.name || country}`
            : 'Country (optional, lets you filter Discover)'}
        </Text>
      </TouchableOpacity>

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

      <Modal visible={countryPickerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={styles.pickerContainer}>
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
              <Text style={styles.pickerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>Select Country</Text>
            <View style={{ width: 50 }} />
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryRow, country === item.code && styles.countryRowActive]}
                onPress={() => { setCountry(item.code); setCountryPickerOpen(false); }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 24, paddingTop: 60 },
  logo: { fontSize: 48, fontWeight: '900', letterSpacing: -2, textAlign: 'center', marginBottom: 24, color: Colors.primaryLight },
  photoPicker: { alignSelf: 'center', marginBottom: 20 },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center', gap: 4 },
  photoRequired: { borderColor: Colors.primaryLight, backgroundColor: Colors.bgCard },
  photoText: { fontSize: 12, color: Colors.textMuted },
  photoTextRequired: { fontSize: 12, color: Colors.primaryLight, fontWeight: '700' },
  photoHelp: { textAlign: 'center', color: Colors.textMuted, fontSize: 12, marginBottom: 16, marginTop: -8 },
  tabs: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderRadius: Layout.radius, padding: 4, marginBottom: 24 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: '#fff', fontSize: 15, fontWeight: '600' },
  inputGroup: { marginBottom: 14 },
  input: { padding: 14, paddingLeft: 16, backgroundColor: Colors.bgInput, borderWidth: 2, borderColor: Colors.border, borderRadius: Layout.radiusSm, color: Colors.text, fontSize: 15 },
  vibesLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 10, marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 14, paddingLeft: 16,
    backgroundColor: Colors.bgInput,
    borderWidth: 2, borderColor: Colors.border, borderRadius: Layout.radiusSm,
    marginBottom: 14,
  },
  countryText: { color: Colors.text, fontSize: 15, flex: 1 },
  pickerContainer: { flex: 1, backgroundColor: Colors.bg, paddingTop: 16 },
  pickerHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  pickerCancel: { fontSize: 15, color: Colors.textMuted },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  countryRowActive: { backgroundColor: Colors.bgCard },
  countryFlag: { fontSize: 22 },
  countryName: { color: Colors.text, fontSize: 15 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 12 },
});
