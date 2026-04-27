import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients } from '../constants/colors';

interface Props {
  name: string;
  initials: string;
  seen?: boolean;
  isAdd?: boolean;
  small?: boolean;
  onPress: () => void;
}

export function StoryCircle({ name, initials, seen, isAdd, small, onPress }: Props) {
  const size = small ? 42 : 56;
  const innerRadius = small ? 18 : 25;
  const fontSize = small ? 13 : 18;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.container, small && styles.containerSmall]}>
      {isAdd ? (
        <View style={[styles.addAvatar, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.addPlus, small && { fontSize: 18 }]}>+</Text>
        </View>
      ) : (
        <LinearGradient
          colors={seen ? [Colors.textMuted, Colors.textMuted] : [...Gradients.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.ring, { width: size, height: size, borderRadius: size / 2 }, seen && styles.ringSeen]}
        >
          <View style={[styles.avatarInner, { borderRadius: innerRadius }]}>
            <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
          </View>
        </LinearGradient>
      )}
      <Text style={[styles.name, small && styles.nameSmall]} numberOfLines={1}>{name}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', width: 70, gap: 4 },
  containerSmall: { width: 52, gap: 2 },
  ring: { width: 56, height: 56, borderRadius: 28, padding: 2, alignItems: 'center', justifyContent: 'center' },
  ringSeen: { opacity: 0.5 },
  avatarInner: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: Colors.bgElevated, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '700', color: Colors.text },
  addAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderStyle: 'dashed', borderColor: Colors.textMuted, alignItems: 'center', justifyContent: 'center' },
  addPlus: { fontSize: 24, color: Colors.textMuted },
  name: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', maxWidth: 64 },
  nameSmall: { fontSize: 9, maxWidth: 50 },
});
