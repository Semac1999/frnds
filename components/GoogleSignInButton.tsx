import React, { useEffect, useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, View, Alert, ActivityIndicator, Platform } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { setToken, connectSocket } from '../lib/api';
import { useAuthStore, useDiscoverStore, useChatStore, useStoryStore } from '../lib/store';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  mode: 'login' | 'signup';
}

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

/**
 * `Google.useAuthRequest` from expo-auth-session is strict — on iOS it
 * requires `iosClientId`, on Android it requires `androidClientId`. If
 * those aren't set, the hook throws during render. So we check first and
 * only mount the inner component when this platform has a usable client ID.
 */
function isConfiguredForPlatform(): boolean {
  if (Platform.OS === 'ios') return !!IOS_CLIENT_ID;
  if (Platform.OS === 'android') return !!ANDROID_CLIENT_ID;
  return !!WEB_CLIENT_ID;
}

function getMissingPlatformClientId(): string {
  if (Platform.OS === 'ios') return 'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID';
  if (Platform.OS === 'android') return 'EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID';
  return 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID';
}

export function GoogleSignInButton({ mode }: Props) {
  const configured = isConfiguredForPlatform();

  if (!configured) {
    return <ConfigStub mode={mode} />;
  }

  // Safe: configured for this platform → useAuthRequest won't throw
  return <ConfiguredGoogleButton mode={mode} />;
}

function ConfigStub({ mode }: Props) {
  const missing = getMissingPlatformClientId();
  const handlePress = () => {
    Alert.alert(
      'Google sign-in setup needed',
      `Add ${missing} to your .env, then restart Expo with --clear.\n\n` +
      `In Google Cloud Console (https://console.cloud.google.com/apis/credentials):\n` +
      `• iOS client → Bundle ID: host.exp.Exponent (for Expo Go)\n` +
      `• Android client → Package: host.exp.exponent, SHA-1: see expo docs\n\n` +
      `For now, sign up with email or use a demo account.`
    );
  };
  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.8}>
      <GoogleLogo />
      <Text style={styles.text}>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</Text>
    </TouchableOpacity>
  );
}

function ConfiguredGoogleButton({ mode }: Props) {
  const [busy, setBusy] = useState(false);
  const loginLocal = useAuthStore((s) => s.loginLocal);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    const finishAuth = async (idToken: string) => {
      setBusy(true);
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'https://frnds-o4wf.onrender.com';
        const res = await fetch(`${apiUrl}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Google sign-in failed');
        setToken(data.token);
        connectSocket(data.token);
        loginLocal(data.user);
        await Promise.all([
          useDiscoverStore.getState().init(),
          useChatStore.getState().init(),
          useStoryStore.getState().init(),
        ]);
        router.replace('/(tabs)/discover');
      } catch (err: any) {
        Alert.alert('Google sign-in failed', err.message || 'Try again or use email/password.');
      } finally {
        setBusy(false);
      }
    };

    if (response?.type === 'success') {
      const idToken = response.params?.id_token || (response.authentication as any)?.idToken;
      if (idToken) {
        finishAuth(idToken);
      } else {
        Alert.alert('Google sign-in', 'Google did not return an ID token. Check your client IDs.');
      }
    } else if (response?.type === 'error') {
      Alert.alert('Google sign-in failed', response.error?.message || 'Unknown error');
    }
  }, [response]);

  const handlePress = async () => {
    if (!request) return;
    try {
      await promptAsync();
    } catch (err: any) {
      Alert.alert('Google sign-in failed', err.message || 'Try again');
    }
  };

  return (
    <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85} disabled={busy || !request}>
      {busy ? (
        <ActivityIndicator color={Colors.text} />
      ) : (
        <>
          <GoogleLogo />
          <Text style={styles.text}>{mode === 'signup' ? 'Sign up with Google' : 'Continue with Google'}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <Path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <Path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <Path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  text: { color: '#3c4043', fontWeight: '700', fontSize: 15 },
});
