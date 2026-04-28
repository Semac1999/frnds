import { create } from 'zustand';
import type { User, SwipeProfile, ChatPreview, StoryGroup, Message, MessageRequest } from '../types';
import { generateProfiles, generateChats, generateStories, generateMessages, getRandomReply } from './mock-data';
import { api, setToken, getToken, connectSocket, disconnectSocket, getSocket } from './api';

// Normalize snake_case API responses to camelCase User objects
function normalizeUser(u: any): User {
  if (!u) return u;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName || u.display_name || u.username || '',
    avatar: u.avatar || (u.displayName || u.display_name || '??').substring(0, 2).toUpperCase(),
    photo: u.photo || null,
    photos: u.photos || [],
    bio: u.bio || '',
    age: u.age || 0,
    interests: typeof u.interests === 'string' ? JSON.parse(u.interests) : (u.interests || []),
    country: u.country || '',
    isPremium: !!(u.isPremium ?? u.is_premium),
    isOnline: !!(u.isOnline ?? u.is_online),
    lastSeen: u.lastSeen || u.last_seen || new Date().toISOString(),
    location: u.location,
  };
}

// Auth Store
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  loading: boolean;
  error: string | null;
  signup: (data: { email: string; password: string; username: string; displayName: string; age: number; interests: string[]; country?: string; photo?: string }) => Promise<void>;
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
  signup: async (data: any) => {
    set({ loading: true, error: null });
    try {
      const res = await api.signup(data);
      setToken(res.token);
      connectSocket(res.token);
      const user = normalizeUser(res.user);
      // Upload photo if provided
      if (data.photo) {
        try {
          await api.uploadPhoto(data.photo);
          user.avatar = user.avatar; // keep initials
          user.photo = data.photo;
        } catch (e) {
          console.warn('Photo upload failed:', e);
        }
      }
      set({ user, isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Signup failed. Check your connection.' });
      throw err;
    }
  },
  login: async (data) => {
    set({ loading: true, error: null });
    try {
      const res = await api.login(data);
      setToken(res.token);
      connectSocket(res.token);
      set({ user: normalizeUser(res.user), isAuthenticated: true, loading: false });
    } catch (err: any) {
      set({ loading: false, error: err.message || 'Login failed. Check your credentials.' });
      throw err;
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
  scope: 'world' | 'country';
  init: (opts?: { scope?: 'world' | 'country'; country?: string }) => Promise<void>;
  setScope: (scope: 'world' | 'country') => Promise<void>;
  /** Skip current profile (move on without sending a request). */
  skip: () => void;
  /** Go back to the previously skipped profile. Premium-only. Returns false when nothing to undo. */
  goBack: () => boolean;
  /** True when the previous-card history has at least one entry. */
  canGoBack: () => boolean;
  /** Send DM request to current profile and advance. Returns matchId if auto-matched. */
  sendRequest: (content: string) => Promise<{ matched: boolean; matchId?: string } | null>;
  reset: () => void;
}

const GRADIENTS = [
  ['#667eea', '#764ba2'], ['#2d1b69', '#11998e'], ['#4a1942', '#c74b50'],
  ['#0f3443', '#34e89e'], ['#1a1a2e', '#e94560'], ['#16222a', '#3a6073'],
] as const;

export const useDiscoverStore = create<DiscoverState>((set, get) => ({
  profiles: [],
  currentIndex: 0,
  matches: [],
  loading: false,
  scope: 'world',
  init: async (opts = {}) => {
    const scope = opts.scope ?? get().scope;
    set({ loading: true, scope });
    try {
      const res = await api.discover({ scope, country: opts.country });
      const rawUsers = Array.isArray(res) ? res : (res.users || []);
      const profiles: SwipeProfile[] = rawUsers.map((u: any, i: number) => ({
        ...normalizeUser(u),
        gradient: GRADIENTS[i % GRADIENTS.length],
      }));
      set({ profiles, currentIndex: 0, loading: false });
    } catch (err) {
      console.warn('API discover failed, using mock fallback:', err);
      set({ profiles: generateProfiles(), currentIndex: 0, loading: false });
    }
  },
  setScope: async (scope) => {
    set({ scope });
    await get().init({ scope });
  },
  skip: () => {
    const { currentIndex } = get();
    set({ currentIndex: currentIndex + 1 });
  },
  canGoBack: () => get().currentIndex > 0,
  goBack: () => {
    const { currentIndex } = get();
    if (currentIndex <= 0) return false;
    set({ currentIndex: currentIndex - 1 });
    return true;
  },
  sendRequest: async (content) => {
    const { profiles, currentIndex, matches } = get();
    const profile = profiles[currentIndex];
    if (!profile) return null;

    try {
      const res = await api.sendRequest(profile.id, content);
      // Advance regardless of outcome
      set({ currentIndex: currentIndex + 1 });
      if (res.matched) {
        set({ matches: [...matches, profile] });
        // Refresh chat list so the new match shows up immediately
        try { await useChatStore.getState().init(); } catch {}
        return { matched: true, matchId: res.matchId };
      }
      return { matched: false };
    } catch (err: any) {
      console.warn('sendRequest failed:', err);
      throw err;
    }
  },
  reset: () => set({ currentIndex: 0 }),
}));

// Message Requests Store
interface RequestState {
  incoming: MessageRequest[];
  outgoing: MessageRequest[];
  loading: boolean;
  init: () => Promise<void>;
  accept: (id: string) => Promise<string | null>; // returns matchId
  decline: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  /** Add an outgoing request locally (e.g. after sending). */
  addOutgoingLocal: (req: MessageRequest) => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  incoming: [],
  outgoing: [],
  loading: false,
  init: async () => {
    set({ loading: true });
    try {
      const [incomingRes, outgoingRes] = await Promise.all([
        api.getRequests(),
        api.getSentRequests(),
      ]);
      const incoming: MessageRequest[] = (Array.isArray(incomingRes) ? incomingRes : []).map((r: any) => ({
        id: r.id,
        sender: normalizeUser(r.sender),
        content: r.content,
        status: r.status,
        createdAt: r.createdAt || r.created_at,
      }));
      const outgoing: MessageRequest[] = (Array.isArray(outgoingRes) ? outgoingRes : []).map((r: any) => ({
        id: r.id,
        sender: normalizeUser(r.recipient || r.sender),
        content: r.content,
        status: r.status,
        createdAt: r.createdAt || r.created_at,
      }));
      set({ incoming, outgoing, loading: false });
    } catch (err) {
      console.warn('getRequests failed:', err);
      set({ loading: false });
    }
  },
  accept: async (id) => {
    try {
      const res = await api.acceptRequest(id);
      // Remove from incoming
      set({ incoming: get().incoming.filter((r) => r.id !== id) });
      // Refresh chat list to include the new match
      try { await useChatStore.getState().init(); } catch {}
      return res.matchId || null;
    } catch (err) {
      console.warn('acceptRequest failed:', err);
      return null;
    }
  },
  decline: async (id) => {
    try {
      await api.declineRequest(id);
    } catch (err) {
      console.warn('declineRequest failed:', err);
    }
    set({ incoming: get().incoming.filter((r) => r.id !== id) });
  },
  cancel: async (id) => {
    try {
      await api.cancelRequest(id);
    } catch (err) {
      console.warn('cancelRequest failed:', err);
    }
    set({ outgoing: get().outgoing.filter((r) => r.id !== id) });
  },
  addOutgoingLocal: (req) => set({ outgoing: [req, ...get().outgoing] }),
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
      const matchList = Array.isArray(res) ? res : (res.matches || []);
      const chats: ChatPreview[] = matchList.map((m: any) => ({
        matchId: m.matchId || m.match_id || m.id,
        user: normalizeUser(m.user || m),
        lastMessage: m.lastMessage || m.last_message || 'You matched! Say hi',
        lastMessageTime: m.lastMessageTime || m.last_message_time || 'now',
        unreadCount: m.unreadCount || m.unread_count || 0,
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
