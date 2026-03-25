import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { BackIcon } from '../../../components/Icons';
import { useAuthStore } from '../../../lib/store';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((s) => s.logout);
  const [notifications, setNotifications] = useState(false);
  const [showOnline, setShowOnline] = useState(true);

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            logout();
            router.replace('/(auth)/onboarding');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[{ paddingTop: insets.top + 8, paddingBottom: 40 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <TouchableOpacity style={styles.item}><Text style={styles.itemText}>Edit Profile</Text></TouchableOpacity>
        <TouchableOpacity style={styles.item}><Text style={styles.itemText}>Change Password</Text></TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>PREFERENCES</Text>
        <View style={styles.item}>
          <Text style={styles.itemText}>Notifications</Text>
          <Switch trackColor={{ true: Colors.primary }} value={notifications} onValueChange={setNotifications} />
        </View>
        <View style={styles.item}>
          <Text style={styles.itemText}>Show Online Status</Text>
          <Switch trackColor={{ true: Colors.primary }} value={showOnline} onValueChange={setShowOnline} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ABOUT</Text>
        <View style={styles.item}><Text style={styles.itemText}>Version</Text><Text style={styles.itemValue}>1.0.0</Text></View>
        <TouchableOpacity style={styles.item}><Text style={styles.itemText}>Terms of Service</Text></TouchableOpacity>
        <TouchableOpacity style={styles.item}><Text style={styles.itemText}>Privacy Policy</Text></TouchableOpacity>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.item} onPress={() => { logout(); router.replace('/(auth)/onboarding'); }}>
          <Text style={[styles.itemText, { color: Colors.red }]}>Log Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.item} onPress={handleDeleteAccount}>
          <Text style={[styles.itemText, { color: Colors.red }]}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 24 },
  title: { fontSize: 20, fontWeight: '700', color: Colors.text },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  item: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingHorizontal: 16, backgroundColor: Colors.bgCard, borderRadius: 10, marginBottom: 4 },
  itemText: { fontSize: 15, color: Colors.text },
  itemValue: { fontSize: 14, color: Colors.textMuted },
});
