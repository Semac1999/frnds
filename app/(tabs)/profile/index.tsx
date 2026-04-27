import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useAuthStore, useDiscoverStore, useChatStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import { Avatar } from '../../../components/Avatar';
import { InterestTag } from '../../../components/InterestTag';
import { GradientButton } from '../../../components/GradientButton';
import { EditIcon, SettingsIcon, ShieldIcon, LocationIcon } from '../../../components/Icons';

const ALL_INTERESTS = ['music', 'gaming', 'sports', 'art', 'travel', 'food', 'movies', 'fitness', 'tech', 'fashion', 'photography', 'animals'];

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const matches = useDiscoverStore((s) => s.matches);
  const chats = useChatStore((s) => s.chats);
  const logout = useAuthStore((s) => s.logout);
  const loginLocal = useAuthStore((s) => s.loginLocal);

  const [editMode, setEditMode] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editInterests, setEditInterests] = useState<string[]>([]);

  const stats = useMemo(() => ({
    likes: Math.floor(Math.random() * 50) + 10,
    vibes: Math.floor(Math.random() * 100) + 20,
  }), []);

  if (!user) return null;

  const openEdit = () => {
    setEditBio(user.bio);
    setEditInterests([...user.interests]);
    setEditMode(true);
  };

  const saveProfile = async () => {
    try {
      await api.updateProfile({ bio: editBio, interests: editInterests });
    } catch {}
    loginLocal({ ...user, bio: editBio, interests: editInterests });
    setEditMode(false);
  };

  const toggleInterest = (tag: string) => {
    setEditInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

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
          <Avatar initials={user.avatar} size={88} borderColor={Colors.bg} photo={user.photo} />
        </View>
        <Text style={styles.name}>{user.displayName}, {user.age}</Text>
        <Text style={styles.username}>@{user.username}</Text>
        <Text style={styles.bio}>{user.bio}</Text>
        {user.location && (
          <View style={styles.locationRow}>
            <LocationIcon size={14} color={Colors.textMuted} />
            <Text style={styles.locationText}>{user.location}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{matches.length}</Text>
          <Text style={styles.statLabel}>frnds</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{chats.length}</Text>
          <Text style={styles.statLabel}>chats</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{stats.vibes}</Text>
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

      {/* Menu */}
      <View style={styles.section}>
        <View style={styles.settingsList}>
          <TouchableOpacity style={styles.settingsItem} onPress={openEdit}>
            <EditIcon size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => router.push('/(tabs)/profile/settings')}>
            <SettingsIcon size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsText}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsItem} onPress={() => Alert.alert('Safety', 'Our team reviews all reports within 24 hours. Use the report button in any chat to flag a user.')}>
            <ShieldIcon size={20} color={Colors.textSecondary} />
            <Text style={styles.settingsText}>Safety Center</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsItem}
            onPress={() => { logout(); router.replace('/(auth)/onboarding'); }}
          >
            <Text style={[styles.settingsText, { color: Colors.red }]}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Edit Profile Modal */}
      <Modal visible={editMode} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.editContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditMode(false)}>
              <Text style={styles.editCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={saveProfile}>
              <Text style={styles.editSave}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 20 }}>
            <View>
              <Text style={styles.editLabel}>Bio</Text>
              <TextInput
                style={styles.editInput}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Tell people about yourself..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{editBio.length}/200</Text>
            </View>

            <View>
              <Text style={styles.editLabel}>Your Vibes</Text>
              <View style={styles.tags}>
                {ALL_INTERESTS.map((tag) => (
                  <InterestTag key={tag} label={tag} selected={editInterests.includes(tag)} onPress={() => toggleInterest(tag)} />
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  username: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  bio: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', maxWidth: 280 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  locationText: { fontSize: 13, color: Colors.textMuted },
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
  editContainer: { flex: 1, backgroundColor: Colors.bg },
  editHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  editTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  editCancel: { fontSize: 15, color: Colors.textMuted },
  editSave: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  editLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, marginBottom: 8 },
  editInput: { backgroundColor: Colors.bgInput, borderRadius: 12, padding: 14, color: Colors.text, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 12, color: Colors.textMuted, textAlign: 'right', marginTop: 4 },
});
