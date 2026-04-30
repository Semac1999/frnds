import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useChatStore, useDiscoverStore, useRequestStore } from '../../../lib/store';
import { Avatar } from '../../../components/Avatar';
import { SearchIcon, CheckIcon, CloseIcon } from '../../../components/Icons';
import type { ChatPreview, MessageRequest } from '../../../types';

type Tab = 'chats' | 'requests';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const chats = useChatStore((s) => s.chats);
  const matches = useDiscoverStore((s) => s.matches);
  const incoming = useRequestStore((s) => s.incoming);
  const initRequests = useRequestStore((s) => s.init);
  const acceptRequest = useRequestStore((s) => s.accept);
  const declineRequest = useRequestStore((s) => s.decline);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<Tab>('chats');

  useEffect(() => {
    initRequests();
  }, []);

  const filtered = search
    ? chats.filter((c) => c.user.displayName.toLowerCase().includes(search.toLowerCase()))
    : chats;

  const handleAccept = async (req: MessageRequest) => {
    const matchId = await acceptRequest(req.id);
    if (matchId) {
      router.push(`/(tabs)/chat/${req.sender.id}`);
    } else {
      Alert.alert('Could not accept', 'Please try again');
    }
  };

  const handleDecline = (req: MessageRequest) => {
    Alert.alert('Decline request?', `${req.sender.displayName} won't be notified.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => declineRequest(req.id) },
    ]);
  };

  const renderChat = ({ item }: { item: ChatPreview }) => (
    <TouchableOpacity
      style={styles.chatItem}
      activeOpacity={0.7}
      onPress={() => router.push(`/(tabs)/chat/${item.user.id}`)}
    >
      <Avatar initials={item.user.avatar} size={52} showOnline isOnline={item.user.isOnline} photo={item.user.photo} />
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.user.displayName}</Text>
        <Text style={styles.chatLast} numberOfLines={1}>{item.lastMessage}</Text>
      </View>
      <View style={styles.chatMeta}>
        <Text style={styles.chatTime}>{item.lastMessageTime}</Text>
        {item.unreadCount > 0 && <View style={styles.unreadDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderRequest = ({ item }: { item: MessageRequest }) => (
    <View style={styles.requestItem}>
      <Avatar initials={item.sender.avatar} size={52} photo={item.sender.photo} showOnline isOnline={item.sender.isOnline} />
      <View style={styles.requestBody}>
        <Text style={styles.requestName}>{item.sender.displayName}, <Text style={styles.requestAge}>{item.sender.age}</Text></Text>
        <Text style={styles.requestMsg} numberOfLines={3}>{item.content}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity style={[styles.requestBtn, styles.requestBtnAccept]} onPress={() => handleAccept(item)} activeOpacity={0.8}>
          <CheckIcon size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.requestBtn, styles.requestBtnDecline]} onPress={() => handleDecline(item)} activeOpacity={0.8}>
          <CloseIcon size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'chats' && styles.tabActive]}
            onPress={() => setTab('chats')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'chats' && styles.tabTextActive]}>Chats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'requests' && styles.tabActive]}
            onPress={() => { setTab('requests'); initRequests(); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>Requests</Text>
            {incoming.length > 0 && <View style={styles.tabBadgeDot} />}
          </TouchableOpacity>
        </View>

        {tab === 'chats' && (
          <View style={styles.searchBar}>
            <SearchIcon size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search frnds..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
            />
          </View>
        )}
      </View>

      {tab === 'chats' ? (
        <>
          {/* New Matches */}
          {matches.length > 0 && (
            <View style={styles.matchesSection}>
              <Text style={styles.matchesTitle}>NEW MATCHES</Text>
              <FlatList
                horizontal
                data={matches.slice(-6)}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ gap: 12 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.matchItem}
                    onPress={() => router.push(`/(tabs)/chat/${item.id}`)}
                  >
                    <Avatar initials={item.avatar} size={60} borderColor={Colors.accent} gradient={item.gradient} photo={item.photo} />
                    <Text style={styles.matchName}>{item.displayName}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.matchId}
            renderItem={renderChat}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No chats yet — send someone a message!</Text>
              </View>
            }
          />
        </>
      ) : (
        <FlatList
          data={incoming}
          keyExtractor={(item) => item.id}
          renderItem={renderRequest}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No requests yet</Text>
              <Text style={styles.emptyText}>When someone sends you a message it'll show up here.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: Colors.bgElevated,
  },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  tabBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginLeft: 2,
  },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.bgInput, borderRadius: 16, paddingHorizontal: 14, gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, paddingVertical: 12, color: Colors.text, fontSize: 14 },
  matchesSection: { paddingHorizontal: 16, marginBottom: 16 },
  matchesTitle: { fontSize: 12, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 10 },
  matchItem: { alignItems: 'center', gap: 4 },
  matchName: { fontSize: 12, color: Colors.textSecondary },
  list: { paddingBottom: 20 },
  chatItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  chatLast: { fontSize: 13, color: Colors.textMuted },
  chatMeta: { alignItems: 'flex-end', gap: 4 },
  chatTime: { fontSize: 12, color: Colors.textMuted },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptyText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },

  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.bgCard,
    marginHorizontal: 12,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestBody: { flex: 1 },
  requestName: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  requestAge: { fontWeight: '500', color: Colors.textMuted },
  requestMsg: { fontSize: 13, color: Colors.textSecondary, lineHeight: 18 },
  requestActions: { gap: 8 },
  requestBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center',
  },
  requestBtnAccept: { backgroundColor: Colors.green },
  requestBtnDecline: { backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
});
