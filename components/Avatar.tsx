import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';

interface Props {
  initials: string;
  size?: number;
  /** 'circle' (default) or 'squircle' (rounded-square, Wizz / iOS chat style). */
  shape?: 'circle' | 'squircle';
  showOnline?: boolean;
  isOnline?: boolean;
  borderColor?: string;
  gradient?: readonly [string, string];
  photo?: string | null;
}

function isPhoto(avatar: string): boolean {
  return avatar.startsWith('data:image') || avatar.startsWith('http') || avatar.startsWith('file:');
}

export function Avatar({
  initials, size = 48, shape = 'circle', showOnline, isOnline, borderColor, gradient, photo,
}: Props) {
  const fontSize = size * 0.38;
  const hasPhoto = photo || (initials && isPhoto(initials));
  const photoUri = photo || (hasPhoto ? initials : null);

  // Squircle is iOS / Wizz / TikTok DM style — gentler radius than a square
  const radius = shape === 'squircle' ? Math.round(size * 0.32) : size / 2;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: radius },
        borderColor ? { borderWidth: 2, borderColor } : null,
      ]}
    >
      {hasPhoto && photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.photo, { borderRadius: radius }]} />
      ) : (
        <LinearGradient
          colors={[...(gradient || Gradients.primary)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: radius }]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </LinearGradient>
      )}
      {showOnline && isOnline && <View style={[styles.online, { right: -2, bottom: -2 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'visible',
    position: 'relative',
  },
  photo: { width: '100%', height: '100%' },
  gradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { color: Colors.text, fontWeight: '700' },
  online: {
    position: 'absolute',
    width: 14, height: 14,
    borderRadius: 7,
    backgroundColor: Colors.green,
    borderWidth: 2.5,
    borderColor: Colors.bg,
  },
});
