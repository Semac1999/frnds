import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../../../constants/colors';
import { useChatStore, useDiscoverStore } from '../../../lib/store';
import { Avatar } from '../../../components/Avatar';
import { SearchIcon } from '../../../components/Icons';
import type { ChatPreview } from '../../../types';

export default function ChatListScreen() {
  const insets = useSafeAreaInsets();
  const chats = useChatStore((s) => s.chats);
  const matches = useDiscoverStore((s) => s.matches);
  const [search, setSearch] = useState('');

  const filtered = search
    ? chats.filter((c) => c.user.displayName.toLowerCase().includes(search.toLowerCase()))
    : chats;

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
        {item.unreadCount > 0 && (
          <View style={styles.unread}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
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
      </View>

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
            <Text style={styles.emptyText}>No chats yet — start swiping!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 12 },
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
  unread: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  unreadText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: Colors.textMuted },
});
