import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';

interface Props {
  initials: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
  borderColor?: string;
  gradient?: readonly [string, string];
  photo?: string | null;
}

function isPhoto(avatar: string): boolean {
  return avatar.startsWith('data:image') || avatar.startsWith('http') || avatar.startsWith('file:');
}

export function Avatar({ initials, size = 48, showOnline, isOnline, borderColor, gradient, photo }: Props) {
  const fontSize = size * 0.38;
  const hasPhoto = photo || (initials && isPhoto(initials));
  const photoUri = photo || (hasPhoto ? initials : null);

  return (
    <View style={[styles.container, { width: size, height: size }, borderColor ? { borderWidth: 2, borderColor } : null]}>
      {hasPhoto && photoUri ? (
        <Image source={{ uri: photoUri }} style={[styles.photo, { borderRadius: size / 2 }]} />
      ) : (
        <LinearGradient
          colors={[...(gradient || Gradients.primary)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, { borderRadius: size / 2 }]}
        >
          <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
        </LinearGradient>
      )}
      {showOnline && isOnline && <View style={[styles.online, { right: 0, bottom: 0 }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'visible',
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: Colors.text,
    fontWeight: '700',
  },
  online: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.green,
    borderWidth: 2,
    borderColor: Colors.bg,
  },
});
