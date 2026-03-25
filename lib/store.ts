import { create } from 'zustand';
import type { User, SwipeProfile, ChatPreview, StoryGroup, Message } from '../types';
import { generateProfiles, generateChats, generateStories, generateMessages, getRandomReply } from './mock-data';
import { api, setToken, getToken, connectSocket, disconnectSocket, getSocket } from './api';

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  loading: boolean;
  error: string | null;
  signup: (data: { email: string; password: string; username: string; displayName: string; age: number; interests: string[] }) => Promise<void>;
  login: (data: { email: string; password: string }) => Promise<void>;
  loginLocal: (user: User) => void;
  logout: () => Promise<void>;
  setOnboarded: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  hasOnboarded: false,
  loading: false,
  error: null,
  signup: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.signup(data);
      setToken(res.token);
      connectSocket(res.token);
      set({ user: res.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      console.warn('API signup failed, using mock fallback:', err.message);
      // Mock fallback
      const user: User = {
        id: 'me',
        username: data.username,
        displayName: data.displayName,
        avatar: data.displayName.substring(0, 2).toUpperCase(),
        bio: 'New to frnds!',
        age: data.age,
        interests: data.interests,
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };
      set({ user, isAuthenticated: true, loading: false });
    }
  },
  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(data);
      setToken(res.token);
      connectSocket(res.token);
      set({ user: res.user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      console.warn('API login failed, using mock fallback:', err.message);
      // Mock fallback
      const username = data.email.split('@')[0] || data.email;
      const user: User = {
        id: 'me',
        username,
        displayName: username,
        avatar: username.substring(0, 2).toUpperCase(),
        bio: 'Back on frnds!',
        age: 21,
        interests: ['music', 'gaming', 'travel'],
        isOnline: true,
        lastSeen: new Date().toISOString(),
      };
      set({ user, isAuthenticated: true, loading: false });
    }
  },
  loginLocal: (user) => set({ user, isAuthenticated: true }),
  logout: async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('API logout failed:', err);
    }
    disconnectSocket();
    setToken(null);
    set({ user: null, isAuthenticated: false });
  },
  setOnboarded: () => set({ hasOnboarded: true }),
  clearError: () => set({ error: null }),
}));

// Discover Store
interface DiscoverState {
  profiles: SwipeProfile[];
  currentIndex: number;
  matches: SwipeProfile[];
  loading: boolean;
  init: () => Promise<void>;
  swipe: (direction: 'like' | 'pass') => Promise<SwipeProfile | null>;
  reset: () => void;
}

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  profiles: [],
  currentIndex: 0,
  matches: [],
  loading: false,
  init: async () => {
    set({ loading: true });
    if (!getToken()) {
      // No auth token = mock mode, skip API
      set({ profiles: generateProfiles(), currentIndex: 0, loading: false });
      return;
    }
    try {
      const res = await api.discover();
      const profiles: SwipeProfile[] = (res.users || res).map((u: any) => ({
        ...u,
        gradient: u.gradient || ['#667eea', '#764ba2'] as const,
      }));
      set({ profiles, currentIndex: 0, loading: false });
    } catch (err) {
      console.warn('API discover failed, using mock fallback:', err);
      set({ profiles: generateProfiles(), currentIndex: 0, loading: false });
    }
  },
  swipe: async (direction) => {
    const { profiles, currentIndex, matches } = get();
    const profile = profiles[currentIndex];
    if (!profile) return null;

    let matched: SwipeProfile | null = null;

    try {
      const res = await api.swipe(profile.id, direction);
      if (res.match) {
        matched = profile;
        set({ matches: [...matches, profile] });
      }
    } catch (err) {
      console.warn('API swipe failed, using mock fallback:', err);
      // Mock fallback: random match on like
      if (direction === 'like' && Math.random() > 0.5) {
        matched = profile;
        set({ matches: [...matches, profile] });
      }
    }

    set({ currentIndex: currentIndex + 1 });
    return matched;
  },
  reset: () => set({ currentIndex: 0 }),
}));

// Chat Store
interface ChatState {
  chats: ChatPreview[];
  messages: Record<string, Message[]>;
  loading: boolean;
  init: () => Promise<void>;
  addChat: (profile: SwipeProfile) => void;
  sendMessage: (matchId: string, content: string) => Promise<void>;
  receiveMessage: (message: Message) => void;
  loadMessages: (matchId: string) => Promise<void>;
  markRead: (matchId: string) => void;
  getTotalUnread: () => number;
}

export const useChatStore = create<ChatState>((set, get) => ({
  chats: [],
  messages: {},
  loading: false,
  init: async () => {
    set({ loading: true });
    if (!getToken()) {
      const discoverProfiles = useDiscoverStore.getState().profiles;
      const chats = generateChats(discoverProfiles);
      const messages: Record<string, Message[]> = {};
      chats.forEach((c) => { messages[c.matchId] = generateMessages(2 + Math.floor(Math.random() * 4)); });
      set({ chats, messages, loading: false });
      return;
    }
    try {
      const res = await api.getMatches();
      const matches = res.matches || res;
      const chats: ChatPreview[] = matches.map((m: any) => ({
        matchId: m.id || m.matchId,
        user: m.user || m,
        lastMessage: m.lastMessage || 'You matched! Say hi',
        lastMessageTime: m.lastMessageTime || 'now',
        unreadCount: m.unreadCount || 0,
      }));
      set({ chats, loading: false });

      // Set up socket listener for new messages
      const socket = getSocket();
      if (socket) {
        socket.off('message:new'); // remove old listener
        socket.on('message:new', (message: Message) => {
          get().receiveMessage(message);
        });
      }
    } catch (err) {
      console.warn('API getMatches failed, using mock fallback:', err);
      // Use mock data with discover profiles as fallback
      const discoverProfiles = useDiscoverStore.getState().profiles;
      const chats = generateChats(discoverProfiles);
      const messages: Record<string, Message[]> = {};
      chats.forEach((c) => {
        messages[c.matchId] = generateMessages(2 + Math.floor(Math.random() * 4));
      });
      set({ chats, messages, loading: false });
    }
  },
  addChat: (profile) => {
    const matchId = `match-${profile.id}`;
    const { chats, messages } = get();
    if (chats.find((c) => c.matchId === matchId)) return;
    set({
      chats: [
        { matchId, user: profile, lastMessage: 'You matched! Say hi', lastMessageTime: 'now', unreadCount: 1 },
        ...chats,
      ],
      messages: { ...messages, [matchId]: [] },
    });
  },
  sendMessage: async (matchId, content) => {
    const { messages, chats } = get();
    const now = new Date();
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      matchId,
      senderId: 'me',
      content,
      type: 'text',
      read: true,
      createdAt: now.toISOString(),
    };

    // Optimistically add message to UI
    const updated = [...(messages[matchId] || []), newMsg];
    const updatedChats = chats.map((c) =>
      c.matchId === matchId ? { ...c, lastMessage: content, lastMessageTime: 'now' } : c
    );
    set({ messages: { ...messages, [matchId]: updated }, chats: updatedChats });

    try {
      const res = await api.sendMessage(matchId, content);
      // Update the message with server-assigned id if returned
      if (res.message?.id) {
        const { messages: current } = get();
        const msgs = (current[matchId] || []).map((m) =>
          m.id === newMsg.id ? { ...m, id: res.message.id } : m
        );
        set({ messages: { ...current, [matchId]: msgs } });
      }
    } catch (err) {
      console.warn('API sendMessage failed, using mock fallback:', err);
      // Simulate reply in mock mode
      setTimeout(() => {
        const reply: Message = {
          id: `msg-${Date.now()}-reply`,
          matchId,
          senderId: 'them',
          content: getRandomReply(),
          type: 'text',
          read: false,
          createdAt: new Date().toISOString(),
        };
        const { messages: current, chats: currentChats } = get();
        set({
          messages: { ...current, [matchId]: [...(current[matchId] || []), reply] },
          chats: currentChats.map((c) =>
            c.matchId === matchId ? { ...c, lastMessage: reply.content, lastMessageTime: 'now' } : c
          ),
        });
      }, 1000 + Math.random() * 2000);
    }
  },
  receiveMessage: (message) => {
    const { messages, chats } = get();
    const matchId = message.matchId;
    const updated = [...(messages[matchId] || []), message];
    const updatedChats = chats.map((c) =>
      c.matchId === matchId
        ? { ...c, lastMessage: message.content, lastMessageTime: 'now', unreadCount: c.unreadCount + 1 }
        : c
    );
    set({ messages: { ...messages, [matchId]: updated }, chats: updatedChats });
  },
  loadMessages: async (matchId) => {
    try {
      const res = await api.getMessages(matchId);
      const msgs: Message[] = res.messages || res;
      const { messages } = get();
      set({ messages: { ...messages, [matchId]: msgs } });
    } catch (err) {
      console.warn('API getMessages failed, keeping existing messages:', err);
      // Keep whatever is already in state (mock or empty)
    }
  },
  markRead: (matchId) => {
    const { chats } = get();
    set({ chats: chats.map((c) => (c.matchId === matchId ? { ...c, unreadCount: 0 } : c)) });
    // Fire and forget API call
    api.markRead(matchId).catch(() => {});
  },
  getTotalUnread: () => get().chats.reduce((sum, c) => sum + c.unreadCount, 0),
}));

// Story Store
interface StoryState {
  storyGroups: StoryGroup[];
  loading: boolean;
  init: () => Promise<void>;
  markSeen: (userId: string) => void;
}

export const useStoryStore = create<StoryState>((set, get) => ({
  storyGroups: [],
  loading: false,
  init: async () => {
    set({ loading: true });
    if (!getToken()) {
      const discoverProfiles = useDiscoverStore.getState().profiles;
      set({ storyGroups: generateStories(discoverProfiles), loading: false });
      return;
    }
    try {
      const res = await api.getStories();
      const storyGroups: StoryGroup[] = res.stories || res;
      set({ storyGroups, loading: false });
    } catch (err) {
      console.warn('API getStories failed, using mock fallback:', err);
      const discoverProfiles = useDiscoverStore.getState().profiles;
      set({ storyGroups: generateStories(discoverProfiles), loading: false });
    }
  },
  markSeen: (userId) => {
    const { storyGroups } = get();
    set({ storyGroups: storyGroups.map((g) => (g.userId === userId ? { ...g, seen: true } : g)) });
    // Fire and forget
    api.viewStory(userId).catch(() => {});
  },
}));
