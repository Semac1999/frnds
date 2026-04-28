import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert,
  ActivityIndicator, Modal, FlatList, Image, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Colors, Gradients } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { GradientButton } from '../../components/GradientButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { PhotoEditor } from '../../components/PhotoEditor';
import { EditablePhoto } from '../../components/EditablePhoto';
import { BackIcon, PinIcon, GlobeIcon, PlusIcon, TrashIcon, CheckIcon } from '../../components/Icons';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../../lib/store';
import { COUNTRIES, getCountry } from '../../constants/countries';
import { detectCountry } from '../../lib/geo';
import { api } from '../../lib/api';

const STEPS = ['basics', 'location', 'photos'] as const;
type Step = (typeof STEPS)[number];

export default function SignupScreen() {
  const [step, setStep] = useState<Step>('basics');

  // Step 1 — basics
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Step 2 — location
  const [country, setCountry] = useState<string>('');
  const [detectedCity, setDetectedCity] = useState<string>('');
  const [locating, setLocating] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  // Step 3 — photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  const signup = useAuthStore((s) => s.signup);
  const loading = useAuthStore((s) => s.loading);

  // ===== validation =====
  const basicsValid = useMemo(() => {
    const ageNum = parseInt(age, 10);
    return !!(
      name.trim() &&
      username.trim().length >= 3 &&
      age.trim() && ageNum >= 13 && ageNum <= 99 &&
      email.trim().includes('@') &&
      password.length >= 6
    );
  }, [name, username, age, email, password]);

  const locationValid = !!country;
  const photosValid = photos.length >= 1;

  // ===== step nav =====
  const stepIndex = STEPS.indexOf(step);
  const goNext = () => {
    if (step === 'basics') {
      if (!basicsValid) {
        Alert.alert('Hold up', 'Fill all fields. Username 3+ chars. Age 13+. Password 6+ chars.');
        return;
      }
      setStep('location');
    } else if (step === 'location') {
      if (!locationValid) {
        Alert.alert('One sec', 'Pick your country to continue.');
        return;
      }
      setStep('photos');
    } else if (step === 'photos') {
      handleSubmit();
    }
  };

  const goBack = () => {
    if (step === 'basics') return;
    const prev = STEPS[stepIndex - 1];
    setStep(prev);
  };

  // ===== step 2 — geolocation =====
  const handleDetectLocation = useCallback(async () => {
    setLocating(true);
    const detected = await detectCountry();
    setLocating(false);
    if (!detected) {
      Alert.alert(
        'Couldn’t find you',
        'Pick your country manually instead.',
        [{ text: 'OK' }]
      );
      return;
    }
    setCountry(detected.countryCode);
    if (detected.city) setDetectedCity(detected.city);
  }, []);

  // ===== step 3 — photo gallery =====
  const handleAddPhoto = (encoded: string) => {
    setPhotos((prev) => (prev.length >= 6 ? prev : [...prev, encoded]));
    setEditorOpen(false);
  };
  const handleRemovePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  // ===== submit =====
  const handleSubmit = async () => {
    if (!basicsValid) { setStep('basics'); return; }
    if (!locationValid) { setStep('location'); return; }
    if (!photosValid) {
      Alert.alert('Add a photo', 'You need at least one photo to create your profile.');
      return;
    }

    const ageNum = parseInt(age, 10);
    try {
      // First photo becomes the profile photo (avatar)
      const [primaryPhoto, ...extraPhotos] = photos;
      await signup({
        email: email.trim(),
        password: password.trim(),
        username: username.trim().toLowerCase(),
        displayName: name.trim(),
        age: ageNum,
        interests: [],
        country,
        photo: primaryPhoto,
      });

      // Upload extra photos to gallery
      for (const p of extraPhotos) {
        try { await api.addPhoto(p); } catch (e) { console.warn('addPhoto failed', e); }
      }

      await Promise.all([
        useDiscoverStore.getState().init(),
        useChatStore.getState().init(),
        useStoryStore.getState().init(),
      ]);

      router.replace('/(tabs)/discover');
    } catch (err: any) {
      Alert.alert('Signup failed', err?.message || 'Could not connect to server. Please try again.');
    }
  };

  // ===== UI =====
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header: back button + progress dots */}
        <View style={styles.headerRow}>
          {step === 'basics' ? (
            <TouchableOpacity hitSlop={8} onPress={() => router.back()}>
              <BackIcon size={22} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity hitSlop={8} onPress={goBack}>
              <BackIcon size={22} />
            </TouchableOpacity>
          )}
          <View style={styles.progressDots}>
            {STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  i === stepIndex && styles.progressDotActive,
                  i < stepIndex && styles.progressDotPast,
                ]}
              />
            ))}
          </View>
          <View style={{ width: 22 }} />
        </View>

        <Text style={styles.brand}>frnds</Text>

        {step === 'basics' && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
            <Text style={styles.title}>Tell us about you</Text>
            <Text style={styles.sub}>Quick basics — should take 30 seconds.</Text>

            <GoogleSignInButton mode="signup" />
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign up with email</Text>
              <View style={styles.dividerLine} />
            </View>

            <Field label="Your name">
              <TextInput style={styles.input} placeholder="Jamie" placeholderTextColor={Colors.textMuted}
                value={name} onChangeText={setName} />
            </Field>
            <Field label="Username">
              <TextInput style={styles.input} placeholder="jamie22" placeholderTextColor={Colors.textMuted}
                value={username} onChangeText={(t) => setUsername(t.replace(/[^a-z0-9_]/gi, '').toLowerCase())}
                autoCapitalize="none" />
            </Field>
            <Field label="Age">
              <TextInput style={styles.input} placeholder="20" placeholderTextColor={Colors.textMuted}
                value={age} onChangeText={(t) => setAge(t.replace(/[^0-9]/g, '').slice(0, 2))}
                keyboardType="number-pad" />
            </Field>
            <Field label="Email">
              <TextInput style={styles.input} placeholder="you@email.com" placeholderTextColor={Colors.textMuted}
                value={email} onChangeText={setEmail}
                keyboardType="email-address" autoCapitalize="none" />
            </Field>
            <Field label="Password">
              <TextInput style={styles.input} placeholder="6+ characters" placeholderTextColor={Colors.textMuted}
                value={password} onChangeText={setPassword} secureTextEntry />
            </Field>

            <GradientButton title="Next" onPress={goNext} style={{ marginTop: 18 }} />
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.altLink}>
              <Text style={styles.altLinkText}>Already have an account? <Text style={styles.altLinkBold}>Log in</Text></Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {step === 'location' && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
            <Text style={styles.title}>Where are you?</Text>
            <Text style={styles.sub}>We use it to find people near you. We never share your exact location.</Text>

            <View style={styles.locationCard}>
              <View style={styles.locationIconWrap}>
                <PinIcon size={28} color="#fff" />
              </View>
              {country ? (
                <>
                  <Text style={styles.locationDetected}>
                    {getCountry(country)?.flag} {getCountry(country)?.name || country}
                  </Text>
                  {detectedCity ? <Text style={styles.locationCity}>{detectedCity}</Text> : null}
                  <Text style={styles.locationHint}>Looks good? Tap Next.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.locationDetected}>Use my location</Text>
                  <Text style={styles.locationHint}>Tap below — we'll auto-detect your country.</Text>
                </>
              )}
            </View>

            <TouchableOpacity
              onPress={handleDetectLocation}
              activeOpacity={0.85}
              disabled={locating}
              style={{ marginBottom: 12 }}
            >
              <LinearGradient
                colors={[...Gradients.primary]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.detectBtn}
              >
                {locating ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <GlobeIcon size={18} color="#fff" />
                    <Text style={styles.detectBtnText}>{country ? 'Detect again' : 'Use my location'}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.manualPickBtn} onPress={() => setCountryPickerOpen(true)} activeOpacity={0.7}>
              <Text style={styles.manualPickText}>
                {country ? 'Change country' : 'Or pick manually'}
              </Text>
            </TouchableOpacity>

            <GradientButton title="Next" onPress={goNext} style={{ marginTop: 24 }} />
          </Animated.View>
        )}

        {step === 'photos' && (
          <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)}>
            <Text style={styles.title}>Show yourself</Text>
            <Text style={styles.sub}>Pick up to 6 photos. Add stickers, text, vibes — make them yours. Your bio.</Text>

            <View style={styles.photoGrid}>
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = photos[i];
                if (photo) {
                  return (
                    <View key={i} style={styles.photoSlot}>
                      <EditablePhoto value={photo} width={104} height={155} radius={14} />
                      <TouchableOpacity style={styles.photoDelete} onPress={() => handleRemovePhoto(i)} hitSlop={8}>
                        <TrashIcon size={14} color="#fff" />
                      </TouchableOpacity>
                      {i === 0 && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>MAIN</Text>
                        </View>
                      )}
                    </View>
                  );
                }
                const canAdd = i === photos.length;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[styles.photoSlot, styles.photoSlotEmpty, !canAdd && { opacity: 0.5 }]}
                    onPress={canAdd ? () => setEditorOpen(true) : undefined}
                    disabled={!canAdd}
                    activeOpacity={0.85}
                  >
                    <PlusIcon size={28} color={canAdd ? Colors.primaryLight : Colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.photoHint}>
              {photos.length === 0
                ? 'Tap the first slot to add your main photo.'
                : `${photos.length}/6 added — your first photo is your main pic.`}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 28 }} />
            ) : (
              <GradientButton
                title={photos.length === 0 ? 'Add at least 1 photo' : 'Create my account'}
                onPress={goNext}
                style={{ marginTop: 24, opacity: photos.length === 0 ? 0.5 : 1 }}
              />
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* Country picker modal (manual fallback) */}
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
                onPress={() => { setCountry(item.code); setDetectedCity(''); setCountryPickerOpen(false); }}
              >
                <Text style={styles.countryFlag}>{item.flag}</Text>
                <Text style={styles.countryName}>{item.name}</Text>
                {country === item.code && <CheckIcon size={18} color={Colors.primaryLight} />}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Photo editor inline — adds to local photos list */}
      <PhotoEditor
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        onSave={async (encoded) => { handleAddPhoto(encoded); }}
      />
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 22, paddingTop: 50, paddingBottom: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  progressDots: { flexDirection: 'row', gap: 8 },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.border },
  progressDotActive: { backgroundColor: Colors.primaryLight, width: 22 },
  progressDotPast: { backgroundColor: Colors.primary },

  brand: { fontSize: 38, fontWeight: '900', letterSpacing: -1.5, color: Colors.primaryLight, marginBottom: 18 },
  title: { fontSize: 30, fontWeight: '900', color: Colors.text, letterSpacing: -0.5, marginBottom: 4 },
  sub: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, lineHeight: 20 },

  field: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6, letterSpacing: 0.4, textTransform: 'uppercase' },
  input: {
    padding: 14, paddingLeft: 16,
    backgroundColor: Colors.bgInput, borderWidth: 2, borderColor: Colors.border,
    borderRadius: Layout.radiusSm, color: Colors.text, fontSize: 15,
  },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { color: Colors.textMuted, fontSize: 12 },

  altLink: { marginTop: 16, alignItems: 'center' },
  altLinkText: { color: Colors.textMuted, fontSize: 14 },
  altLinkBold: { color: Colors.primaryLight, fontWeight: '700' },

  // Location step
  locationCard: {
    alignItems: 'center', backgroundColor: Colors.bgCard,
    borderRadius: 18, paddingVertical: 28, paddingHorizontal: 20, marginBottom: 16,
    borderWidth: 1, borderColor: Colors.border,
  },
  locationIconWrap: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  locationDetected: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  locationCity: { color: Colors.textSecondary, fontSize: 14, marginTop: 2 },
  locationHint: { color: Colors.textMuted, fontSize: 13, marginTop: 8, textAlign: 'center' },
  detectBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999 },
  detectBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  manualPickBtn: { alignItems: 'center', paddingVertical: 12 },
  manualPickText: { color: Colors.primaryLight, fontSize: 14, fontWeight: '700' },

  // Photos step
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  photoSlot: { width: 104, height: 155, borderRadius: 14, position: 'relative' },
  photoSlotEmpty: {
    backgroundColor: Colors.bgCard, borderWidth: 2, borderStyle: 'dashed',
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
  },
  photoDelete: {
    position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center',
  },
  primaryBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  primaryBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  photoHint: { color: Colors.textMuted, fontSize: 12, marginTop: 8, marginBottom: 4 },

  // Country picker
  pickerContainer: { flex: 1, backgroundColor: Colors.bg, paddingTop: 16 },
  pickerHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  pickerCancel: { fontSize: 15, color: Colors.textMuted },
  countryRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  countryRowActive: { backgroundColor: Colors.bgCard },
  countryFlag: { fontSize: 22 },
  countryName: { color: Colors.text, fontSize: 15, flex: 1 },
});
