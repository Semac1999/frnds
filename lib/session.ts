import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'frnds.auth.token';

/**
 * SecureStore is unavailable on web. Fall back to in-memory there so the
 * app still runs in a browser preview without crashing.
 */
const memoryFallback: { token: string | null } = { token: null };

export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    memoryFallback.token = token;
    try {
      // Best-effort: localStorage if running in a browser
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(TOKEN_KEY, token);
      }
    } catch {}
    return;
  }
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (err) {
    console.warn('saveToken failed:', err);
  }
}

export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(TOKEN_KEY);
      }
    } catch {}
    return memoryFallback.token;
  }
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('loadToken failed:', err);
    return null;
  }
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === 'web') {
    memoryFallback.token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(TOKEN_KEY);
      }
    } catch {}
    return;
  }
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (err) {
    console.warn('clearToken failed:', err);
  }
}
