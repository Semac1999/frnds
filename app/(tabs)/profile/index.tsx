import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useAuthStore, useDiscoverStore, useChatStore } from '../../../lib/store';
import { api } from '../../../lib/api';
import { Avatar } from '../../../components/Avatar';
import { InterestTag } from '../../../components/InterestTag';
import { EditablePhoto } from '../../../components/EditablePhoto';
import { EditIcon, SettingsIcon, ShieldIcon, LocationIcon, PinIcon, PlusIcon, TrashIcon } from '../../../components/Icons';
import { COUNTRIES, getCountry } from '../../../constants/countries';

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
  const [editCountry, setEditCountry] = useState<string>('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);

  const stats = useMemo(() => ({
    likes: Math.floor(Math.random() * 50) + 10,
    vibes: Math.floor(Math.random() * 100) + 20,
  }), []);

  if (!user) return null;

  const photos = user.photos || [];
  const myCountry = getCountry(user.country);

  const openEdit = () => {
    setEditBio(user.bio);
    setEditInterests([...user.interests]);
    setEditCountry(user.country || '');
    setEditMode(true);
  };

  const saveProfile = async () => {
    try {
      const updated = await api.updateProfile({ bio: editBio, interests: editInterests, country: editCountry });
      loginLocal({ ...user, ...updated, bio: editBio, interests: editInterests, country: editCountry });
    } catch {
      loginLocal({ ...user, bio: editBio, interests: editInterests, country: editCountry });
    }
    setEditMode(false);
  };

  const toggleInterest = (tag: string) => {
    setEditInterests((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const handleDeletePhoto = (index: number) => {
    Alert.alert('Remove photo?', 'This will delete the photo from your profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const updated = await api.deletePhoto(index);
            loginLocal({ ...user, photos: updated?.photos || [] });
          } catch (err: any) {
            Alert.alert('Could not delete', err?.message || 'Try again');
          }
        }
      },
    ]);
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
        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}
        {myCountry && (
          <View style={styles.locationRow}>
            <PinIcon size={14} color={Colors.textMuted} />
            <Text style={styles.locationText}>{myCountry.flag} {myCountry.name}</Text>
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

      {/* Photo gallery */}
      <View style={styles.section}>
        <View style={styles.galleryHeader}>
          <Text style={styles.sectionTitle}>My photos & videos ({photos.length})</Text>
          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={() => router.push('/(tabs)/profile/photo-editor')}
            disabled={photos.length >= 6}
            activeOpacity={0.8}
          >
            <PlusIcon size={16} color="#fff" />
            <Text style={styles.addPhotoText}>Add</Text>
          </TouchableOpacity>
        </View>
        {photos.length === 0 ? (
          <TouchableOpacity
            style={styles.galleryEmpty}
            onPress={() => router.push('/(tabs)/profile/photo-editor')}
            activeOpacity={0.85}
          >
            <PlusIcon size={28} color={Colors.textMuted} />
            <Text style={styles.galleryEmptyText}>Add up to 6 photos with text & stickers</Text>
          </TouchableOpacity>
        ) : (
          <FlatList
            data={photos}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => `p-${i}`}
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
            renderItem={({ item, index }) => (
              <View style={styles.galleryItem}>
                <EditablePhoto value={item} size={120} radius={14} />
                <TouchableOpacity style={styles.galleryDelete} onPress={() => handleDeletePhoto(index)} hitSlop={6}>
                  <TrashIcon size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>

      {/* Interests */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Vibes</Text>
        <View style={styles.tags}>
          {user.interests.length === 0 ? (
            <Text style={styles.muted}>No vibes yet — tap Edit Profile to add some.</Text>
          ) : (
            user.interests.map((tag) => <InterestTag key={tag} label={tag} selected />)
          )}
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
              <Text style={styles.editLabel}>Country</Text>
              <TouchableOpacity style={styles.countryBtn} onPress={() => setCountryPickerOpen(true)} activeOpacity={0.7}>
                <Text style={styles.countryText}>
                  {editCountry ? `${getCountry(editCountry)?.flag || ''} ${getCountry(editCountry)?.name || editCountry}` : 'Select your country'}
                </Text>
                <PinIcon size={16} color={Colors.textMuted} />
              </TouchableOpacity>
              <Text style={styles.charCount}>Used to filter who you see in Discover.</Text>
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

      {/* Country Picker */}
      <Modal visible={countryPickerOpen} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.editContainer, { paddingTop: insets.top + 16 }]}>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
              <Text style={styles.editCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Select Country</Text>
            <View style={{ width: 60 }} />
          </View>
          <FlatList
            data={COUNTRIES}
            keyExtractor={(c) => c.code}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.countryRow, editCountry === item.code && styles.countryRowActive]}
                onPress={() => { setEditCountry(item.code); setCountryPickerOpen(false); }}
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
  cover: { height: 140 },
  settingsBtn: { position: 'absolute', right: 16, top: 50 },
  profileInfo: { alignItems: 'center', marginTop: -44, paddingHorizontal: 16 },
  avatarWrap: { marginBottom: 8 },
  name: { fontSize: 22, fontWeight: '800', color: Colors.text },
  username: { fontSize: 14, color: Colors.textMuted, marginTop: 2 },
  bio: { fontSize: 14, color: Colors.textSecondary, marginTop: 4, textAlign: 'center', maxWidth: 280 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { fontSize: 13, color: Colors.textSecondary },
  stats: { flexDirection: 'row', justifyContent: 'center', gap: 40, paddingVertical: 20 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '800', color: Colors.primaryLight },
  statLabel: { fontSize: 13, color: Colors.textMuted },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  galleryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: 999,
  },
  addPhotoText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  galleryEmpty: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 100, borderRadius: 14, backgroundColor: Colors.bgCard,
    borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed',
  },
  galleryEmptyText: { color: Colors.textMuted, fontSize: 13 },
  galleryItem: { position: 'relative' },
  galleryDelete: {
    position: 'absolute', top: 6, right: 6,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: Colors.textMuted, fontSize: 13 },
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
  countryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgInput, borderRadius: 12, padding: 14,
  },
  countryText: { color: Colors.text, fontSize: 15 },
  countryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border,
  },
  countryRowActive: { backgroundColor: Colors.bgCard },
  countryFlag: { fontSize: 22 },
  countryName: { color: Colors.text, fontSize: 15 },
});
