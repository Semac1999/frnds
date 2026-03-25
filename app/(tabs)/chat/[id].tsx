import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Gradients } from '../../../constants/colors';
import { useChatStore, useDiscoverStore } from '../../../lib/store';
import { getSocket } from '../../../lib/api';
import { Avatar } from '../../../components/Avatar';
import { BackIcon, CameraIcon, SendIcon, PhoneIcon } from '../../../components/Icons';
import type { Message } from '../../../types';

export default function ChatConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);

  const chats = useChatStore((s) => s.chats);
  const messages = useChatStore((s) => s.messages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const markRead = useChatStore((s) => s.markRead);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const receiveMessage = useChatStore((s) => s.receiveMessage);
  const profiles = useDiscoverStore((s) => s.profiles);

  const chat = chats.find((c) => c.user.id === id || c.matchId === `match-${id}`);
  const profile = chat?.user || profiles.find((p) => p.id === id);
  const matchId = chat?.matchId || `match-${id}`;
  const chatMessages = messages[matchId] || [];

  const [text, setText] = useState('');

  // Load messages from API and set up socket listeners
  useEffect(() => {
    if (chat) markRead(matchId);

    // Load message history from API
    loadMessages(matchId);

    // Set up socket listeners for this conversation
    const socket = getSocket();
    if (socket) {
      const handleNewMessage = (message: Message) => {
        if (message.matchId === matchId) {
          receiveMessage(message);
          markRead(matchId);
        }
      };

      socket.on('message:new', handleNewMessage);

      return () => {
        socket.off('message:new', handleNewMessage);
      };
    }
  }, [matchId]);

  // Emit typing events
  const handleFocus = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('typing:start', { matchId });
    }
  }, [matchId]);

  const handleBlur = useCallback(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('typing:stop', { matchId });
    }
  }, [matchId]);

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    await sendMessage(matchId, content);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === 'me';
    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    return (
      <View style={[styles.msgRow, isMine && styles.msgRowRight]}>
        {isMine ? (
          <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.bubble, styles.bubbleSent]}>
            <Text style={styles.msgText}>{item.content}</Text>
            <Text style={styles.msgTime}>{time}</Text>
          </LinearGradient>
        ) : (
          <View style={[styles.bubble, styles.bubbleReceived]}>
            <Text style={styles.msgText}>{item.content}</Text>
            <Text style={styles.msgTime}>{time}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <BackIcon size={24} />
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <Avatar initials={profile?.avatar || '?'} size={40} />
          <View>
            <Text style={styles.headerName}>{profile?.displayName || 'User'}</Text>
            <Text style={[styles.headerStatus, { color: profile?.isOnline ? Colors.green : Colors.textMuted }]}>{profile?.isOnline ? 'Online' : 'Offline'}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity hitSlop={8} onPress={() => Alert.alert('Coming soon!', 'Video calling will be available in a future update.')}>
            <CameraIcon size={22} color={Colors.text} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={8} onPress={() => Alert.alert('Coming soon!', 'Voice calling will be available in a future update.')}>
            <PhoneIcon size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {/* Input Bar */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TouchableOpacity hitSlop={8} onPress={() => Alert.alert('Coming soon!', 'Camera feature will be available in a future update.')}>
          <CameraIcon size={22} color={Colors.textMuted} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor={Colors.textMuted}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} activeOpacity={0.7}>
          <LinearGradient colors={[...Gradients.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendGradient}>
            <SendIcon size={18} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: Colors.bgCard, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerUser: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerStatus: { fontSize: 12 },
  headerActions: { flexDirection: 'row', gap: 16 },
  messagesList: { padding: 16, gap: 8, flexGrow: 1 },
  msgRow: { marginBottom: 4 },
  msgRowRight: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', padding: 10, paddingHorizontal: 14, borderRadius: 18 },
  bubbleSent: { borderBottomRightRadius: 6 },
  bubbleReceived: { backgroundColor: Colors.bgElevated, borderBottomLeftRadius: 6 },
  msgText: { fontSize: 15, color: Colors.text, lineHeight: 21 },
  msgTime: { fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2, textAlign: 'right' },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 10, backgroundColor: Colors.bgCard, borderTopWidth: 1, borderTopColor: Colors.border },
  input: { flex: 1, padding: 10, paddingHorizontal: 14, backgroundColor: Colors.bgInput, borderRadius: 20, color: Colors.text, fontSize: 14 },
  sendBtn: {},
  sendGradient: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
