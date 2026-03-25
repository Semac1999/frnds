import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useAuthStore, useDiscoverStore } from '../../../lib/store';
import { Avatar } from '../../../components/Avatar';
import { InterestTag } from '../../../components/InterestTag';
import { EditIcon, SettingsIcon } from '../../../components/Icons';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const matches = useDiscoverStore((s) => s.matches);
  const logout = useAuthStore((s) => s.logout);

  const randomStats = useMemo(() => ({
    likes: Math.floor(Math.random() * 50) + 10,
    vibes: Math.floor(Math.random() * 100) + 20,
  }), []);

  if (!user) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Cover */}
      <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.cover, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.settingsBtn} onPress={() => router.push('/(tabs)/profile/settings')}>
          <SettingsIcon size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Avatar & Info */}
      <View style={styles.profileInfo}>
        <View style={styles.avatarWrap}>
          <Avatar initials={user.avatar} size={88} borderColor={Colors.bg} />
        </View>
        <Text style={styles.name}>{user.displayName}, {user.age}</Text>
        <Text style={styles.bio}>{user.bio}</Text>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{matches.length}</Text>
          <Text style={styles.statLabel}>frnds</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{randomStats.likes}</Text>
          <Text style={styles.statLabel}>likes</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{randomStats.vibes}</Text>
          <Text style={styles.statLabel}>vibes</Text>
        </View>
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Vibes</Text>
        <View style={styles.tags}>
          {user.interests.map((tag) => (
            <InterestTag key={tag} label={tag} selected />
          ))}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingsItem}>
            <EditIcon size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsText}>Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem}>
            <Text style={styles.settingsText}>Privacy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => { logout(); router.replace('/(auth)/onboarding'); }}
          >
            <Text style={[styles.settingsText, { color: Colors.red }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  cover: { height: 140 },
  settingsBtn: { position: 'absolute', right: 16, top: 50 },
  profileInfo: { alignItems: 'center', marginTop: -44, paddingHorizontal: 16 },
  avatarWrap: { marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text },
  bio: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 20 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primaryLight },
  statLabel: { fontSize: 13, color: Colors.textMuted },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  settingsList: { gap: 4 },
  settingsItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingHorizontal: 16, backgroundColor: Colors.bgCard, borderRadius: 10 },
  settingsText: { fontSize: 15, color: Colors.text },
});
