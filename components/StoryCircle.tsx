import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';

interface Props {
  name: string;
  initials: string;
  seen?: boolean;
  isAdd?: boolean;
  onPress: () => void;
}

export function StoryCircle({ name, initials, seen, isAdd, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      {isAdd ? (
        <View style={styles.addAvatar}>
          <Text style={styles.addPlus}>+</Text>
        </View>
      ) : (
        <LinearGradient
          colors={seen ? [Colors.textMuted, Colors.textMuted] : [...Gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, seen && styles.ringSeen]}
        >
          <View style={styles.avatarInner}>
            <Text style={styles.initials}>{initials}</Text>
          </View>
        </LinearGradient>
      )}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 70, gap: 4 },
  ring: { width: 56, height: 56, borderRadius: 28, padding: 3, alignItems: 'center', justifyContent: 'center' },
  ringSeen: { opacity: 0.5 },
  avatarInner: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '700', color: Colors.text },
  addAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontSize: 24, color: Colors.textMuted },
  name: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', maxWidth: 64 },
});
